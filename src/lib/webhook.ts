import { z } from "zod";
import { db } from "./db";
import { config } from "./config";
import { paypal } from "./paypal";
import { caseKey, saveDispute } from "./store";
import { analyze } from "./workflow";
import { AppError } from "./errors";
const eventSchema = z.object({
  id: z.string().min(1).max(255),
  event_type: z.enum([
    "CUSTOMER.DISPUTE.CREATED",
    "CUSTOMER.DISPUTE.UPDATED",
    "CUSTOMER.DISPUTE.RESOLVED",
  ]),
  resource: z.object({ dispute_id: z.string().regex(/^[A-Za-z0-9-]{1,255}$/) }),
});
export async function processWebhook(headers: Headers, raw: unknown) {
  if (config().mode !== "sandbox")
    throw new AppError(403, "PayPal webhook ingestion requires sandbox mode");
  if (!(await paypal.verifyWebhook(headers, raw)))
    throw new AppError(401, "Webhook signature could not be verified");
  const event = eventSchema.parse(raw);
  const eventId = `sandbox:${event.id}`;
  const acquired = await db.$transaction(async (tx) => {
    const old = await tx.webhookEvent.findUnique({ where: { id: eventId } });
    if (old?.state === "PROCESSED") return "duplicate";
    if (old && old.state === "PROCESSING" && old.leaseUntil > new Date())
      return "busy";
    if (old)
      await tx.webhookEvent.update({
        where: { id: eventId },
        data: {
          state: "PROCESSING",
          attempts: { increment: 1 },
          leaseUntil: new Date(Date.now() + 180000),
        },
      });
    else
      await tx.webhookEvent.create({
        data: {
          id: eventId,
          eventType: event.event_type,
          caseId: event.resource.dispute_id,
          state: "PROCESSING",
          leaseUntil: new Date(Date.now() + 180000),
        },
      });
    return "acquired";
  });
  if (acquired === "duplicate") return { received: true, duplicate: true };
  if (acquired === "busy")
    throw new AppError(503, "Webhook is processing; delivery can be retried");
  try {
    const d = await paypal.getDispute(event.resource.dispute_id);
    const record = await saveDispute(d);
    const action = await db.payPalAction.findUnique({
      where: { caseId: caseKey(d.dispute_id) },
    });
    if (
      !action &&
      ["NEW", "ANALYSIS_FAILED"].includes(record.status) &&
      d.dispute_life_cycle_stage === "INQUIRY" &&
      ["OPEN", "WAITING_FOR_SELLER_RESPONSE"].includes(d.status)
    )
      await analyze(d.dispute_id);
    await db.webhookEvent.update({
      where: { id: eventId },
      data: { state: "PROCESSED" },
    });
    return { received: true, duplicate: false };
  } catch (error) {
    await db.webhookEvent.update({
      where: { id: eventId },
      data: { state: "FAILED" },
    });
    throw error;
  }
}
