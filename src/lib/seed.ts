import { randomUUID } from "node:crypto";
import { disputeSchema, type Dispute } from "./domain";
import { saveDispute } from "./store";
import { config } from "./config";
import { AppError } from "./errors";

export function fixtureDispute(suffix = "1042", scenario = 0): Dispute {
  const id = `DEMO-${suffix}`;
  const base = `https://api-m.sandbox.paypal.com/v1/customer/disputes/${id}`;
  return disputeSchema.parse({
    dispute_id: id,
    reason: [
      "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
      "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
      "UNAUTHORISED",
    ][scenario % 3],
    status: "WAITING_FOR_SELLER_RESPONSE",
    dispute_life_cycle_stage: "INQUIRY",
    dispute_amount: {
      value: ["89.00", "124.00", "680.00"][scenario % 3],
      currency_code: "USD",
    },
    create_time: new Date(Date.now() - (scenario + 1) * 86400000).toISOString(),
    update_time: new Date().toISOString(),
    seller_response_due_date: new Date(
      Date.now() + (3 + scenario) * 86400000,
    ).toISOString(),
    disputed_transactions: [
      {
        seller_transaction_id: `DEMO-TXN-${suffix}`,
        buyer: {
          name: ["Alex Morgan", "Jamie Chen", "Taylor Reed"][scenario % 3],
        },
        items: [
          {
            name: [
              "Everyday ceramic set",
              "Linen weekender",
              "Studio desk lamp",
            ][scenario % 3],
          },
        ],
      },
    ],
    messages: [
      {
        posted_by: "BUYER",
        content: [
          "The ceramic set arrived with a chip on one cup. The rest is fine and I would prefer to keep it if we can agree on a partial refund.",
          "My parcel has not arrived. The tracking page hasn't changed for several days. Can you help?",
          "I don't recognize this purchase and did not authorize it.",
        ][scenario % 3],
        time_posted: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    evidences: [],
    links: [
      { rel: "send-message", href: `${base}/send-message`, method: "POST" },
      ...(scenario === 0
        ? [{ rel: "make-offer", href: `${base}/make-offer`, method: "POST" }]
        : []),
    ],
    allowed_response_options: {
      make_offer: { offer_types: scenario === 0 ? ["REFUND"] : [] },
    },
  });
}
export async function seedDemo() {
  if (config().mode !== "demo")
    throw new AppError(403, "Demo seeding is disabled in sandbox mode");
  const run = randomUUID().slice(0, 8);
  const cases = [0, 1, 2].map((i) => fixtureDispute(`${run}-${1042 + i}`, i));
  for (const d of cases) await saveDispute(d, "demo");
  return cases[0].dispute_id;
}
