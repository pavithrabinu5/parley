import { createHash } from "node:crypto";
import { db } from "./db";
import {
  defaultPolicy,
  disputeSchema,
  evidenceFor,
  policySchema,
  recommendationSchema,
  type Dispute,
  type Mode,
  type Validation,
} from "./domain";
import { AppError } from "./errors";
import { config } from "./config";

export const fingerprint = (d: Dispute) =>
  createHash("sha256").update(JSON.stringify(d)).digest("hex");
export const caseKey = (id: string, mode: Mode = config().mode) =>
  `${mode}:${id}`;
export async function getPolicy() {
  const row = await db.merchantPolicy.upsert({
    where: { id: config().mode },
    create: { id: config().mode, rules: JSON.stringify(defaultPolicy) },
    update: {},
  });
  return { ...policySchema.parse(JSON.parse(row.rules)), version: row.version };
}
export async function audit(
  caseId: string | null,
  actor: string,
  kind: string,
  detail: string,
) {
  return db.auditEvent.create({ data: { caseId, actor, kind, detail } });
}
export async function saveDispute(d: Dispute, mode: Mode = config().mode) {
  const id = caseKey(d.dispute_id, mode);
  const hash = fingerprint(d);
  return db.$transaction(async (tx) => {
    const old = await tx.disputeCase.findUnique({ where: { id } });
    if (!old) {
      const row = await tx.disputeCase.create({
        data: { id, mode, snapshot: JSON.stringify(d), fingerprint: hash },
      });
      await tx.auditEvent.create({
        data: {
          caseId: id,
          actor: "Investigator",
          kind: "RECEIVED",
          detail:
            mode === "demo"
              ? "Seeded demonstration case received. All records in this case are simulated."
              : "Dispute retrieved from PayPal sandbox. Submitted evidence retains its original trust level.",
        },
      });
      return row;
    }
    if (old.fingerprint === hash) return old;
    const previous = disputeSchema.parse(JSON.parse(old.snapshot));
    if (
      previous.update_time &&
      d.update_time &&
      Date.parse(d.update_time) < Date.parse(previous.update_time)
    ) {
      throw new AppError(
        409,
        "An older provider snapshot was received. Refresh again before continuing.",
      );
    }
    await tx.recommendation.updateMany({
      where: { caseId: id, status: { in: ["PENDING", "APPROVED"] } },
      data: { status: "STALE" },
    });
    const action = await tx.payPalAction.findUnique({ where: { caseId: id } });
    const row = await tx.disputeCase.update({
      where: { id },
      data: {
        snapshot: JSON.stringify(d),
        fingerprint: hash,
        revision: { increment: 1 },
        ...(!action && old.status !== "ANALYZING" ? { status: "NEW" } : {}),
      },
    });
    await tx.auditEvent.create({
      data: {
        caseId: id,
        actor: "Investigator",
        kind: "REFRESHED",
        detail:
          "Provider record changed. Earlier unexecuted recommendations and approvals are stale.",
      },
    });
    return row;
  });
}
export async function getCase(id: string) {
  const row = await db.disputeCase.findUnique({
    where: { id: caseKey(id) },
    include: {
      recommendations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { approval: true },
      },
      action: true,
      runs: { orderBy: { createdAt: "desc" }, take: 5 },
      audit: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!row) throw new AppError(404, "Case not found in this environment");
  const dispute = disputeSchema.parse(JSON.parse(row.snapshot));
  const latest = row.recommendations[0];
  return {
    id: dispute.dispute_id,
    mode: row.mode,
    status: row.status,
    revision: row.revision,
    dispute,
    evidence: evidenceFor(dispute),
    recommendation: latest
      ? {
          id: latest.id,
          status: latest.status,
          provider: latest.provider,
          createdAt: latest.createdAt.toISOString(),
          policyVersion: latest.policyVersion,
          payload: recommendationSchema.parse(JSON.parse(latest.payload)),
          validation: JSON.parse(latest.checks) as Validation,
          approval: latest.approval
            ? {
                decision: latest.approval.decision,
                actor: latest.approval.actor,
                createdAt: latest.approval.createdAt.toISOString(),
              }
            : null,
        }
      : null,
    action: row.action
      ? {
          id: row.action.id,
          state: row.action.state,
          httpStatus: row.action.httpStatus,
          debugId: row.action.debugId,
          outcome: row.action.outcome,
          createdAt: row.action.createdAt.toISOString(),
        }
      : null,
    runs: row.runs.map((r) => ({
      id: r.id,
      provider: r.provider,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
    audit: row.audit.map((e) => ({
      id: e.id,
      actor: e.actor,
      kind: e.kind,
      detail: e.detail,
      at: e.createdAt.toISOString(),
    })),
  };
}
export async function workspace() {
  const rows = await db.disputeCase.findMany({
    where: { mode: config().mode },
    orderBy: { createdAt: "desc" },
    select: { snapshot: true },
  });
  const cases = await Promise.all(
    rows.map((r) =>
      getCase(disputeSchema.parse(JSON.parse(r.snapshot)).dispute_id),
    ),
  );
  return {
    mode: config().mode,
    ai:
      config().mode === "demo"
        ? "Deterministic fixtures · no model calls"
        : `${config().aiProvider === "ollama" ? "Ollama (local)" : config().aiProvider === "gemini" ? "Gemini" : "OpenAI"} · ${config().aiModel}`,
    policy: await getPolicy(),
    cases,
  };
}
export type CaseView = Awaited<ReturnType<typeof getCase>>;
export type WorkspaceView = Awaited<ReturnType<typeof workspace>>;
