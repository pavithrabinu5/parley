import { z } from "zod";

export const modeSchema = z.enum(["demo", "sandbox"]);
export type Mode = z.infer<typeof modeSchema>;
export const moneySchema = z.object({
  value: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
  currency_code: z.string().regex(/^[A-Z]{3}$/),
});
export const disputeSchema = z.object({
  dispute_id: z.string().regex(/^[A-Za-z0-9-]{1,255}$/),
  reason: z.string(),
  status: z.string(),
  dispute_life_cycle_stage: z.string(),
  dispute_amount: moneySchema,
  create_time: z.string(),
  update_time: z.string().optional(),
  seller_response_due_date: z.string().optional(),
  disputed_transactions: z
    .array(
      z.object({
        seller_transaction_id: z.string().optional(),
        buyer: z.object({ name: z.string().optional() }).optional(),
        items: z
          .array(
            z.object({
              name: z.string().optional(),
              item_name: z.string().optional(),
              item_description: z.string().optional(),
              notes: z.string().optional(),
              reason: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .default([]),
  messages: z
    .array(
      z.object({
        posted_by: z.string().optional(),
        content: z.string(),
        time_posted: z.string().optional(),
      }),
    )
    .default([]),
  evidences: z
    .array(
      z.object({
        evidence_type: z.string(),
        evidence_info: z
          .object({
            tracking_info: z
              .array(
                z.object({
                  carrier_name: z.string().optional(),
                  tracking_number: z.string().optional(),
                }),
              )
              .optional(),
          })
          .optional(),
        notes: z.string().optional(),
        source: z.string().optional(),
      }),
    )
    .default([]),
  links: z
    .array(
      z.object({
        rel: z.string(),
        href: z.string(),
        method: z.string().optional(),
      }),
    )
    .default([]),
  allowed_response_options: z
    .object({
      make_offer: z
        .object({ offer_types: z.array(z.string()).default([]) })
        .optional(),
    })
    .optional(),
  offer: z
    .object({
      offer_type: z.string().optional(),
      seller_offered_amount: moneySchema.optional(),
      history: z
        .array(
          z.object({
            actor: z.string().optional(),
            event_type: z.string().optional(),
            offer_type: z.string().optional(),
            offer_amount: moneySchema.optional(),
            offer_time: z.string().optional(),
            notes: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});
export type Dispute = z.infer<typeof disputeSchema>;
export const policySchema = z
  .object({
    maxOfferCents: z.number().int().min(0).max(100000),
    maxOfferPercent: z.number().int().min(0).max(90),
    escalateAboveCents: z.number().int().min(100).max(10000000),
    minConfidence: z.number().min(0.5).max(1),
    currency: z.literal("USD"),
    requireShipmentEvidence: z.boolean(),
    humanApprovalRequired: z.literal(true),
  })
  .strict();
export type Policy = z.infer<typeof policySchema>;
export const defaultPolicy: Policy = {
  maxOfferCents: 4000,
  maxOfferPercent: 40,
  escalateAboveCents: 30000,
  minConfidence: 0.75,
  currency: "USD",
  requireShipmentEvidence: false,
  humanApprovalRequired: true,
};
export const messageDraftSchema = z
  .object({
    revision: z.number().int().positive(),
    policyVersion: z.number().int().positive(),
    recommendationId: z.string().min(1).max(100).nullable(),
    buyerMessage: z.string().trim().min(1).max(2000),
  })
  .strict();
export type MessageDraftInput = z.infer<typeof messageDraftSchema>;
export const MERCHANT_DRAFT_PROVIDER = "MERCHANT_DRAFT";
export const recommendationSchema = z
  .object({
    caseId: z.string(),
    recommendedAction: z.enum([
      "MAKE_OFFER",
      "SEND_MESSAGE",
      "ESCALATE_TO_HUMAN",
    ]),
    offerType: z.enum(["REFUND"]).nullable(),
    amountCents: z.number().int().min(0).max(10000000),
    currency: z.literal("USD"),
    confidence: z.number().min(0).max(1),
    summary: z.string().min(1).max(700),
    rationale: z.string().min(1).max(1600),
    evidenceIds: z.array(z.string()).max(30),
    missingEvidence: z.array(z.string().max(300)).max(10),
    merchantImpact: z.string().max(500),
    risks: z.array(z.string().max(400)).max(10),
    buyerMessage: z.string().max(2000),
    nextStep: z.string().max(500),
  })
  .strict();
export type Recommendation = z.infer<typeof recommendationSchema>;
export type Evidence = {
  id: string;
  label: string;
  detail: string;
  source: string;
  trust:
    | "provider-record"
    | "buyer-claim"
    | "merchant-submitted"
    | "unverified-source";
};
export type Check = { name: string; passed: boolean; detail: string };
export type Validation = { allowed: boolean; checks: Check[] };
export function cents(value: string): number {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value))
    throw new Error("Invalid two-decimal money value");
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export const dollars = (value: number) => (value / 100).toFixed(2);
export function evidenceFor(d: Dispute): Evidence[] {
  const evidence: Evidence[] = [
    {
      id: "dispute",
      label: "Dispute record",
      detail: `${d.reason} · ${d.dispute_amount.currency_code} ${d.dispute_amount.value} · ${d.dispute_life_cycle_stage}`,
      source: `PayPal dispute ${d.dispute_id}`,
      trust: "provider-record",
    },
  ];
  for (const [i, t] of d.disputed_transactions.entries()) {
    if (t.seller_transaction_id)
      evidence.push({
        id: `transaction-${i}`,
        label: "Linked transaction",
        detail: t.seller_transaction_id,
        source: `disputed_transactions[${i}].seller_transaction_id`,
        trust: "provider-record",
      });
    for (const [j, item] of (t.items ?? []).entries()) {
      if (Object.values(item).some(Boolean))
        evidence.push({
          id: `item-${i}-${j}`,
          label: "Disputed item description",
          detail: JSON.stringify(item).slice(0, 6000),
          source: `disputed_transactions[${i}].items[${j}] (submitted dispute details)`,
          trust: "buyer-claim",
        });
    }
  }
  for (const [i, m] of d.messages.entries())
    evidence.push({
      id: `message-${i}`,
      label: m.posted_by === "BUYER" ? "Buyer statement" : "Dispute message",
      detail: m.content.slice(0, 6000),
      source: `messages[${i}]`,
      trust:
        m.posted_by === "ARBITER"
          ? "provider-record"
          : m.posted_by === "SELLER"
            ? "merchant-submitted"
            : "buyer-claim",
    });
  for (const [i, e] of d.evidences.entries())
    evidence.push({
      id: `evidence-${i}`,
      label: e.evidence_type.replaceAll("_", " "),
      detail: JSON.stringify({
        information: e.evidence_info ?? {},
        notes: e.notes ?? "",
        submittedBy: e.source ?? "unknown",
      }).slice(0, 6000),
      source: `evidences[${i}] (provider record; not independently carrier-verified)`,
      trust:
        e.source === "SUBMITTED_BY_SELLER"
          ? "merchant-submitted"
          : e.source === "SUBMITTED_BY_BUYER"
            ? "buyer-claim"
            : "unverified-source",
    });
  return evidence;
}
export const actionRelation = (r: Recommendation) =>
  r.recommendedAction === "MAKE_OFFER" ? "make-offer" : "send-message";
// Do not fetch arbitrary provider/model URLs. Require the exact sandbox route.
export function supports(d: Dispute, rel: string): boolean {
  // PayPal uses underscore relation names with hyphenated endpoint paths.
  const providerRelation =
    rel === "make-offer"
      ? "make_offer"
      : rel === "send-message"
        ? "send_message"
        : undefined;
  if (!providerRelation) return false;
  const path = `/v1/customer/disputes/${encodeURIComponent(d.dispute_id)}/${rel}`;
  return d.links.some(
    (l) =>
      (l.rel === providerRelation || l.rel === rel) &&
      l.method?.toUpperCase() === "POST" &&
      [
        "https://api-m.sandbox.paypal.com",
        "https://api.sandbox.paypal.com",
      ].some((origin) => l.href === `${origin}${path}`),
  );
}
export function validateRecommendation(
  d: Dispute,
  r: Recommendation,
  p: Policy,
  source: "model" | "merchant" = "model",
): Validation {
  const ids = new Set(evidenceFor(d).map((e) => e.id));
  const offer = r.recommendedAction === "MAKE_OFFER";
  const checks: Check[] = [
    {
      name: "Case identity",
      passed: r.caseId === d.dispute_id,
      detail: "Recommendation belongs to this dispute.",
    },
    {
      name: "Inquiry stage",
      passed:
        d.dispute_life_cycle_stage === "INQUIRY" &&
        ["OPEN", "WAITING_FOR_SELLER_RESPONSE"].includes(d.status),
      detail: `PayPal reports ${d.dispute_life_cycle_stage} / ${d.status}.`,
    },
    {
      name: "Currency",
      passed:
        d.dispute_amount.currency_code === p.currency &&
        r.currency === p.currency,
      detail: "This prototype supports USD actions only.",
    },
    {
      name: "Human review threshold",
      passed:
        cents(d.dispute_amount.value) <= p.escalateAboveCents &&
        !/UNAUTHORI[ZS]ED/.test(d.reason),
      detail: `Cases over $${dollars(p.escalateAboveCents)} and unauthorized-payment claims require specialist review.`,
    },
    {
      name: "Confidence",
      passed: source === "merchant" || r.confidence >= p.minConfidence,
      detail:
        source === "merchant"
          ? "Merchant-written message; no model confidence is claimed. All other checks still apply."
          : `Model-reported confidence ${Math.round(r.confidence * 100)}%; policy minimum ${Math.round(p.minConfidence * 100)}%. Not a calibrated probability.`,
    },
    {
      name: "Evidence provenance",
      passed:
        r.evidenceIds.length > 0 && r.evidenceIds.every((id) => ids.has(id)),
      detail:
        "Every cited evidence ID must exist in the retrieved record. Claims still require merchant review.",
    },
    {
      name: "Shipment requirement",
      passed:
        !p.requireShipmentEvidence ||
        d.evidences.some(
          (e) =>
            e.source === "SUBMITTED_BY_SELLER" &&
            e.evidence_info?.tracking_info?.some((t) => t.tracking_number),
        ),
      detail: p.requireShipmentEvidence
        ? "Merchant policy requires submitted tracking."
        : "Shipment evidence is optional under merchant policy.",
    },
    {
      name: "PayPal capability",
      passed:
        r.recommendedAction !== "ESCALATE_TO_HUMAN" &&
        supports(d, actionRelation(r)) &&
        (!offer ||
          (r.offerType === "REFUND" &&
            !!d.allowed_response_options?.make_offer?.offer_types.includes(
              r.offerType,
            ))),
      detail: offer
        ? "Requires a make-offer link and REFUND in live allowed_response_options.make_offer.offer_types."
        : "Requires an inquiry-stage send-message link. Escalation is manual.",
    },
    {
      name: "Financial limits",
      passed: offer
        ? r.amountCents > 0 &&
          r.amountCents <= p.maxOfferCents &&
          r.amountCents * 100 <=
            cents(d.dispute_amount.value) * p.maxOfferPercent &&
          r.amountCents < cents(d.dispute_amount.value)
        : r.amountCents === 0 && r.offerType === null,
      detail: `Maximum $${dollars(p.maxOfferCents)} and ${p.maxOfferPercent}% of the disputed amount; full refunds are outside this prototype.`,
    },
    {
      name: "Buyer communication",
      passed:
        r.recommendedAction === "ESCALATE_TO_HUMAN" ||
        r.buyerMessage.trim().length > 0,
      detail: "Merchant reviews the exact note before approval.",
    },
  ];
  return { allowed: checks.every((c) => c.passed), checks };
}
export function actionBody(r: Recommendation) {
  if (r.recommendedAction === "MAKE_OFFER" && r.offerType === "REFUND")
    return {
      note: r.buyerMessage,
      offer_type: r.offerType,
      offer_amount: {
        value: dollars(r.amountCents),
        currency_code: r.currency,
      },
    };
  if (r.recommendedAction === "SEND_MESSAGE")
    return { message: r.buyerMessage };
  throw new Error("This action cannot be executed");
}
