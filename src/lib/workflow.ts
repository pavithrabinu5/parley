import { randomUUID } from "node:crypto";
import { db } from "./db";
import { config } from "./config";
import {
  actionBody,
  disputeSchema,
  policySchema,
  recommendationSchema,
  validateRecommendation,
  messageDraftSchema,
  MERCHANT_DRAFT_PROVIDER,
  type MessageDraftInput,
  type Dispute,
} from "./domain";
import {
  audit,
  caseKey,
  fingerprint,
  getCase,
  getPolicy,
  saveDispute,
} from "./store";
import { demoRecommendation, generateRecommendation } from "./ai";
import { paypal, PayPalError, verifyOutcome } from "./paypal";
import { AppError } from "./errors";

export async function refreshCase(id: string) {
  if (config().mode === "sandbox")
    await saveDispute(await paypal.getDispute(id));
  return getCase(id);
}
export async function saveMessageDraft(
  id: string,
  input: MessageDraftInput,
  actor: string,
) {
  const draft = messageDraftSchema.parse(input);
  const current = await refreshCase(id);
  const policy = await getPolicy();
  const payload = recommendationSchema.parse({
    caseId: id,
    recommendedAction: "SEND_MESSAGE",
    offerType: null,
    amountCents: 0,
    currency: "USD",
    confidence: 0,
    summary:
      "Merchant-written message for the buyer. No financial transfer proposed.",
    rationale:
      "The merchant reviewed or replaced the earlier draft. This text was not validated for factual accuracy by an AI model; review it against the case evidence before approving.",
    evidenceIds: ["dispute"],
    missingEvidence: [],
    merchantImpact:
      "This action sends a message only. It does not issue a refund or resolve the dispute.",
    risks: [
      "The merchant is responsible for the accuracy and commitments in this message.",
    ],
    buyerMessage: draft.buyerMessage,
    nextStep:
      "Merchant review and a new explicit approval are required before sending this exact message.",
  });
  const validation = validateRecommendation(
    current.dispute,
    payload,
    policy,
    "merchant",
  );
  await db.$transaction(async (tx) => {
    const row = await tx.disputeCase.findUniqueOrThrow({
      where: { id: caseKey(id) },
      include: {
        action: true,
        recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const livePolicy = await tx.merchantPolicy.findUniqueOrThrow({
      where: { id: config().mode },
    });
    if (row.action || row.status === "ANALYZING")
      throw new AppError(
        409,
        "A submitted action or running analysis prevents draft editing",
      );
    if (
      row.revision !== draft.revision ||
      row.fingerprint !== fingerprint(current.dispute) ||
      (row.recommendations[0]?.id ?? null) !== draft.recommendationId ||
      livePolicy.version !== draft.policyVersion ||
      policy.version !== draft.policyVersion
    )
      throw new AppError(
        409,
        "Case, draft, or policy changed. Refresh and review before saving again.",
      );
    await tx.recommendation.updateMany({
      where: {
        caseId: row.id,
        status: { in: ["PENDING", "APPROVED", "BLOCKED"] },
      },
      data: { status: "STALE" },
    });
    const created = await tx.recommendation.create({
      data: {
        caseId: row.id,
        fingerprint: row.fingerprint,
        policyVersion: policy.version,
        payload: JSON.stringify(payload),
        checks: JSON.stringify(validation),
        provider: MERCHANT_DRAFT_PROVIDER,
        status: validation.allowed ? "PENDING" : "BLOCKED",
        createdAt: new Date(
          Math.max(
            Date.now(),
            (row.recommendations[0]?.createdAt.getTime() ?? 0) + 1,
          ),
        ),
      },
    });
    await tx.disputeCase.update({
      where: { id: row.id },
      data: {
        status: validation.allowed ? "AWAITING_APPROVAL" : "NEEDS_REVIEW",
      },
    });
    await tx.auditEvent.create({
      data: {
        caseId: row.id,
        actor,
        kind: "DRAFT_SAVED",
        detail: `Merchant-written message ${created.id} saved${draft.recommendationId ? `, replacing ${draft.recommendationId}` : ""}. Previous approvals cannot authorize it. No message sent. ${
          validation.allowed
            ? "New approval required."
            : "Execution blocked: " +
              validation.checks
                .filter((c) => !c.passed)
                .map((c) => c.name)
                .join(", ") +
              "."
        }`,
      },
    });
  });
  return getCase(id);
}
export async function analyze(id: string) {
  const current = await refreshCase(id);
  if (current.action)
    throw new AppError(
      409,
      "A submitted action exists. Reconcile it before further manual work in PayPal.",
    );
  const key = caseKey(id);
  const claim = await db.disputeCase.updateMany({
    where: {
      id: key,
      action: { is: null },
      OR: [
        { status: { not: "ANALYZING" } },
        { updatedAt: { lt: new Date(Date.now() - 120000) } },
      ],
    },
    data: { status: "ANALYZING" },
  });
  if (!claim.count)
    throw new AppError(
      409,
      "Analysis is already running or an action has already been reserved",
    );
  const provider =
    config().mode === "demo"
      ? "DEMO_FIXTURE"
      : `${config().aiProvider.toUpperCase()}:${config().aiModel}`;
  const run = await db.agentRun.create({
    data: { caseId: key, provider, status: "RUNNING" },
  });
  try {
    const policy = await getPolicy();
    await audit(
      key,
      "Investigator",
      "CONTEXT",
      `${current.evidence.length} provenance-labelled records normalized. Transaction IDs come from the dispute; no independent order or carrier lookup is claimed.`,
    );
    await audit(
      key,
      "Strategist + Composer",
      "ANALYSIS_STARTED",
      provider === "DEMO_FIXTURE"
        ? "Deterministic fixture analysis started. No AI request is made in demo mode."
        : "Structured AI request started. Case content is untrusted; the model has no execution tools.",
    );
    const recommendation =
      config().mode === "demo"
        ? demoRecommendation(current.dispute, policy)
        : await generateRecommendation(current.dispute, policy);
    const validation = validateRecommendation(
      current.dispute,
      recommendation,
      policy,
    );
    await db.$transaction(async (tx) => {
      const row = await tx.disputeCase.findUniqueOrThrow({
        where: { id: key },
      });
      const livePolicy = await tx.merchantPolicy.findUniqueOrThrow({
        where: { id: config().mode },
      });
      if (
        row.fingerprint !== fingerprint(current.dispute) ||
        livePolicy.version !== policy.version
      )
        throw new AppError(
          409,
          "Case or policy changed during analysis. Analyze again.",
        );
      await tx.recommendation.updateMany({
        where: { caseId: key, status: { in: ["PENDING", "APPROVED"] } },
        data: { status: "STALE" },
      });
      await tx.recommendation.create({
        data: {
          caseId: key,
          fingerprint: row.fingerprint,
          policyVersion: policy.version,
          payload: JSON.stringify(recommendation),
          checks: JSON.stringify(validation),
          provider,
          status: validation.allowed ? "PENDING" : "BLOCKED",
        },
      });
      await tx.disputeCase.update({
        where: { id: key },
        data: {
          status: validation.allowed ? "AWAITING_APPROVAL" : "NEEDS_REVIEW",
        },
      });
      await tx.agentRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", endedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: {
          caseId: key,
          actor: "Policy engine",
          kind: validation.allowed ? "APPROVAL_REQUESTED" : "BLOCKED",
          detail: validation.allowed
            ? "Structured recommendation validated against evidence, merchant policy, and PayPal capabilities. Merchant approval required."
            : `Execution blocked: ${validation.checks
                .filter((c) => !c.passed)
                .map((c) => c.name)
                .join(", ")}.`,
        },
      });
    });
  } catch (error) {
    await db.agentRun.update({
      where: { id: run.id },
      data: { status: "FAILED", endedAt: new Date() },
    });
    await db.disputeCase.update({
      where: { id: key },
      data: { status: "ANALYSIS_FAILED" },
    });
    await audit(
      key,
      "Strategist",
      "FAILED",
      "Analysis failed or output was rejected. No financial action was taken. Retry or review manually.",
    );
    if (error instanceof AppError) throw error;
    throw new AppError(
      502,
      "Analysis failed, timed out, or returned invalid data. No action was taken.",
    );
  }
  return getCase(id);
}

export async function decide(
  id: string,
  recommendationId: string,
  decision: "APPROVED" | "REJECTED",
  actor: string,
) {
  const current = await refreshCase(id);
  const p = await getPolicy();
  await db.$transaction(async (tx) => {
    const row = await tx.recommendation.findUnique({
      where: { id: recommendationId },
    });
    const record = await tx.disputeCase.findUniqueOrThrow({
      where: { id: caseKey(id) },
    });
    const policy = await tx.merchantPolicy.findUniqueOrThrow({
      where: { id: config().mode },
    });
    if (
      !row ||
      row.caseId !== record.id ||
      row.status !== "PENDING" ||
      current.recommendation?.id !== row.id ||
      record.status === "ANALYZING"
    )
      throw new AppError(
        409,
        "This recommendation is no longer awaiting approval",
      );
    if (
      row.fingerprint !== fingerprint(current.dispute) ||
      row.fingerprint !== record.fingerprint ||
      policy.version !== p.version ||
      row.policyVersion !== policy.version ||
      Date.now() - row.createdAt.getTime() > 1800000
    )
      throw new AppError(
        409,
        "Recommendation is stale. Analyze again before approving.",
      );
    const r = recommendationSchema.parse(JSON.parse(row.payload));
    if (
      decision === "APPROVED" &&
      !validateRecommendation(
        current.dispute,
        r,
        p,
        row.provider === MERCHANT_DRAFT_PROVIDER ? "merchant" : "model",
      ).allowed
    )
      throw new AppError(409, "Policy or PayPal capability blocks this action");
    await tx.approval.create({ data: { recommendationId, decision, actor } });
    await tx.recommendation.update({
      where: { id: recommendationId },
      data: { status: decision },
    });
    await tx.disputeCase.update({
      where: { id: record.id },
      data: { status: decision === "APPROVED" ? "APPROVED" : "NEEDS_REVIEW" },
    });
    await tx.auditEvent.create({
      data: {
        caseId: record.id,
        actor,
        kind: decision,
        detail: `Merchant ${decision.toLowerCase()} the immutable recommendation ${recommendationId}, including its exact amount and buyer note.`,
      },
    });
  });
  return getCase(id);
}

export async function execute(id: string, recommendationId: string) {
  const existing = await db.payPalAction.findUnique({
    where: { caseId: caseKey(id) },
  });
  if (existing) return getCase(id);
  const current = await refreshCase(id);
  const p = await getPolicy();
  const row = await db.recommendation.findUnique({
    where: { id: recommendationId },
    include: { approval: true },
  });
  if (
    !row ||
    row.caseId !== caseKey(id) ||
    row.status !== "APPROVED" ||
    row.approval?.decision !== "APPROVED"
  )
    throw new AppError(403, "Explicit merchant approval is required");
  const r = recommendationSchema.parse(JSON.parse(row.payload));
  if (
    row.fingerprint !== fingerprint(current.dispute) ||
    row.policyVersion !== p.version ||
    Date.now() - row.createdAt.getTime() > 1800000 ||
    !validateRecommendation(
      current.dispute,
      r,
      p,
      row.provider === MERCHANT_DRAFT_PROVIDER ? "merchant" : "model",
    ).allowed
  )
    throw new AppError(
      409,
      "Approved recommendation is stale or no longer allowed. Analyze and approve again.",
    );
  const actionId = randomUUID();
  // A unique caseId plus an atomic state transition prevents concurrent double sends.
  const reserved = await db.$transaction(async (tx) => {
    if (await tx.payPalAction.findUnique({ where: { caseId: row.caseId } }))
      return false;
    const policy = await tx.merchantPolicy.findUniqueOrThrow({
      where: { id: config().mode },
    });
    const claim = await tx.disputeCase.updateMany({
      where: {
        id: row.caseId,
        fingerprint: row.fingerprint,
        status: "APPROVED",
      },
      data: { status: "EXECUTING" },
    });
    if (!claim.count || policy.version !== row.policyVersion)
      throw new AppError(409, "Case or policy changed before execution");
    const rec = await tx.recommendation.updateMany({
      where: { id: recommendationId, status: "APPROVED" },
      data: { status: "EXECUTING" },
    });
    if (!rec.count)
      throw new AppError(409, "Approval has already been consumed");
    await tx.payPalAction.create({
      data: {
        id: actionId,
        caseId: row.caseId,
        recommendationId,
        state: "EXECUTING",
        requestBody: JSON.stringify({
          body: actionBody(r),
          before: current.dispute,
        }),
      },
    });
    await tx.auditEvent.create({
      data: {
        caseId: row.caseId,
        actor: "Executor",
        kind: "EXECUTION_RESERVED",
        detail: `Execution ${actionId} reserved before network dispatch. This case cannot be submitted twice through Parley.`,
      },
    });
    return true;
  });
  if (!reserved) return getCase(id);
  try {
    if (config().mode === "demo") {
      const after: Dispute = structuredClone(current.dispute);
      after.update_time = new Date().toISOString();
      if (r.recommendedAction === "MAKE_OFFER") {
        after.status = "WAITING_FOR_BUYER_RESPONSE";
        after.offer = {
          offer_type: "REFUND",
          seller_offered_amount: {
            currency_code: "USD",
            value: (r.amountCents / 100).toFixed(2),
          },
          history: [
            {
              actor: "SELLER",
              event_type: "PROPOSED",
              offer_type: "REFUND",
              offer_amount: {
                currency_code: "USD",
                value: (r.amountCents / 100).toFixed(2),
              },
              offer_time: after.update_time,
              notes: r.buyerMessage,
            },
          ],
        };
        after.links = [];
      } else
        after.messages.push({
          posted_by: "SELLER",
          content: r.buyerMessage,
          time_posted: after.update_time,
        });
      await saveDispute(after);
      await finish(
        actionId,
        row.caseId,
        "SIMULATED",
        "Demo action and matching result simulated. No PayPal API called. An offer is not a resolution.",
      );
    } else {
      const result = await paypal.execute(r, actionId);
      await db.payPalAction.update({
        where: { id: actionId },
        data: {
          state: "ACKNOWLEDGED",
          httpStatus: result.status,
          debugId: result.debugId,
        },
      });
      await audit(
        row.caseId,
        "PayPal sandbox",
        "ACKNOWLEDGED",
        `PayPal returned HTTP ${result.status}. Reading the dispute to verify the specific action; resolution is not assumed.`,
      );
      await reconcile(id);
    }
  } catch (error) {
    await db.payPalAction.update({
      where: { id: actionId },
      data: {
        ...(error instanceof PayPalError
          ? { httpStatus: error.upstreamStatus, debugId: error.debugId }
          : {}),
        state: "UNCERTAIN",
        outcome:
          "The result is uncertain or could not be verified. Do not resubmit. Use read-only reconciliation and the PayPal Resolution Center.",
      },
    });
    await db.disputeCase.update({
      where: { id: row.caseId },
      data: { status: "NEEDS_RECONCILIATION" },
    });
    await audit(
      row.caseId,
      "Executor",
      "UNCERTAIN",
      "Network or provider failure. Submission is locked; automatic POST retries are disabled. Read-only reconciliation is available.",
    );
  }
  return getCase(id);
}
async function finish(
  actionId: string,
  caseId: string,
  state: string,
  outcome: string,
) {
  await db.$transaction(async (tx) => {
    await tx.payPalAction.update({
      where: { id: actionId },
      data: { state, outcome },
    });
    await tx.disputeCase.update({
      where: { id: caseId },
      data: {
        status:
          state === "VERIFIED" || state === "SIMULATED"
            ? "ACTION_RECORDED"
            : "NEEDS_RECONCILIATION",
      },
    });
    await tx.auditEvent.create({
      data: {
        caseId,
        actor: state === "SIMULATED" ? "Demo simulator" : "Verifier",
        kind: state,
        detail: outcome,
      },
    });
  });
}
export async function reconcile(id: string) {
  const action = await db.payPalAction.findUnique({
    where: { caseId: caseKey(id) },
    include: { recommendation: true },
  });
  if (!action) throw new AppError(404, "No action to reconcile");
  if (["VERIFIED", "SIMULATED"].includes(action.state)) return getCase(id);
  if (config().mode !== "sandbox")
    throw new AppError(409, "Only sandbox actions can be reconciled");
  const before = disputeSchema.parse(JSON.parse(action.requestBody).before);
  const after = await paypal.getDispute(id);
  const r = recommendationSchema.parse(
    JSON.parse(action.recommendation.payload),
  );
  await saveDispute(after);
  const verified = verifyOutcome(before, after, r);
  await finish(
    action.id,
    action.caseId,
    verified ? "VERIFIED" : "UNVERIFIED",
    verified
      ? `A new matching ${r.recommendedAction === "MAKE_OFFER" ? "offer" : "message"} was read back from PayPal. Current dispute status: ${after.status}. This confirms the action, not settlement or a refund.`
      : `PayPal status: ${after.status}. No new matching action record found yet. Read again later or inspect the Resolution Center; never automatically resubmit.`,
  );
  return getCase(id);
}
export async function updatePolicy(input: unknown, version: number) {
  const rules = policySchema.parse(input);
  await db.$transaction(async (tx) => {
    const updated = await tx.merchantPolicy.updateMany({
      where: { id: config().mode, version },
      data: { rules: JSON.stringify(rules), version: { increment: 1 } },
    });
    if (!updated.count)
      throw new AppError(
        409,
        "Policy changed in another session. Reload before saving.",
      );
    await tx.recommendation.updateMany({
      where: {
        dispute: { mode: config().mode },
        status: { in: ["PENDING", "APPROVED"] },
      },
      data: { status: "STALE" },
    });
    await tx.disputeCase.updateMany({
      where: {
        mode: config().mode,
        status: { in: ["APPROVED", "AWAITING_APPROVAL"] },
      },
      data: { status: "NEW" },
    });
    await tx.auditEvent.create({
      data: {
        actor: "Merchant",
        kind: "POLICY_UPDATED",
        detail: `Policy version ${version + 1} saved for ${config().mode}. Prior approvals invalidated.`,
      },
    });
  });
  return getPolicy();
}
