import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
vi.hoisted(() => {
  process.env.DATABASE_URL = `file:/tmp/parley-workflow-${process.pid}-${Date.now()}.db`;
  process.env.APP_MODE = "demo";
});
import { db } from "../src/lib/db";
import {
  analyze,
  decide,
  execute,
  updatePolicy,
  saveMessageDraft,
} from "../src/lib/workflow";
import { saveDispute, getCase, getPolicy, caseKey } from "../src/lib/store";
import { fixtureDispute } from "../src/lib/seed";
import { defaultPolicy } from "../src/lib/domain";
import { paypal } from "../src/lib/paypal";
import * as ai from "../src/lib/ai";
import { processWebhook } from "../src/lib/webhook";
const dbPath = process.env.DATABASE_URL!.slice(5);
beforeAll(async () => {
  const dir = readdirSync(resolve("prisma/migrations")).find((f) =>
    f.endsWith("_init"),
  )!;
  const sql = readFileSync(
    resolve("prisma/migrations", dir, "migration.sql"),
    "utf8",
  );
  for (const statement of sql.split(";").filter((s) => s.trim()))
    await db.$executeRawUnsafe(statement);
});
beforeEach(async () => {
  vi.restoreAllMocks();
  process.env.APP_MODE = "demo";
  await db.auditEvent.deleteMany();
  await db.payPalAction.deleteMany();
  await db.approval.deleteMany();
  await db.recommendation.deleteMany();
  await db.agentRun.deleteMany();
  await db.disputeCase.deleteMany();
  await db.webhookEvent.deleteMany();
  await db.merchantPolicy.deleteMany();
});
afterAll(async () => {
  await db.$disconnect();
  for (const suffix of ["", "-journal", "-wal", "-shm"])
    rmSync(dbPath + suffix, { force: true });
});
async function ready() {
  const d = fixtureDispute();
  await saveDispute(d);
  const c = await analyze(d.dispute_id);
  return { d, c, id: d.dispute_id, rec: c.recommendation!.id };
}
describe("persisted workflow", () => {
  it("runs the complete golden demo with separate approval and execution", async () => {
    const { id, rec } = await ready();
    await expect(execute(id, rec)).rejects.toThrow("approval");
    await decide(id, rec, "APPROVED", "Test merchant");
    const done = await execute(id, rec);
    expect(done.action?.state).toBe("SIMULATED");
    expect(done.dispute.status).toBe("WAITING_FOR_BUYER_RESPONSE");
    expect(done.audit.some((e) => e.kind === "APPROVED")).toBe(true);
    await execute(id, rec);
    expect(await db.payPalAction.count()).toBe(1);
  });
  it("reserves at most one action under simultaneous execution requests", async () => {
    const { id, rec } = await ready();
    await decide(id, rec, "APPROVED", "Test merchant");
    await Promise.allSettled([
      execute(id, rec),
      execute(id, rec),
      execute(id, rec),
    ]);
    expect(await db.payPalAction.count()).toBe(1);
    expect(
      (await getCase(id)).audit.filter((e) => e.kind === "EXECUTION_RESERVED"),
    ).toHaveLength(1);
  });
  it("invalidates approvals when the policy changes", async () => {
    const { id, rec } = await ready();
    await decide(id, rec, "APPROVED", "Test");
    const p = await getPolicy();
    await updatePolicy({ ...defaultPolicy, maxOfferCents: 1000 }, p.version);
    await expect(execute(id, rec)).rejects.toThrow();
    expect(await db.payPalAction.count()).toBe(0);
  });
  it("invalidates approvals when the dispute changes", async () => {
    const { d, id, rec } = await ready();
    await decide(id, rec, "APPROVED", "Test");
    d.status = "RESOLVED";
    await saveDispute(d);
    await expect(execute(id, rec)).rejects.toThrow();
    expect(await db.payPalAction.count()).toBe(0);
  });
  it("rejects a declined recommendation", async () => {
    const { id, rec } = await ready();
    await decide(id, rec, "REJECTED", "Test");
    await expect(execute(id, rec)).rejects.toThrow();
  });
  it("does not let an older provider snapshot reopen a resolved case", async () => {
    const d = fixtureDispute();
    d.update_time = "2026-10-03T10:00:00Z";
    d.status = "RESOLVED";
    await saveDispute(d);
    await expect(
      saveDispute({
        ...d,
        status: "OPEN",
        update_time: "2026-10-03T09:00:00Z",
      }),
    ).rejects.toThrow("older provider snapshot");
    const current = await getCase(d.dispute_id);
    expect(current.dispute.status).toBe("RESOLVED");
    expect(current.dispute.update_time).toBe("2026-10-03T10:00:00Z");
  });
  it("rejects cross-case approval", async () => {
    const { rec } = await ready();
    const d = fixtureDispute("OTHER");
    await saveDispute(d);
    await expect(
      decide(d.dispute_id, rec, "APPROVED", "Test"),
    ).rejects.toThrow();
  });
  it("expires old recommendations", async () => {
    const { id, rec } = await ready();
    await db.recommendation.update({
      where: { id: rec },
      data: { createdAt: new Date(Date.now() - 1900000) },
    });
    await expect(decide(id, rec, "APPROVED", "Test")).rejects.toThrow("stale");
  });
  it("persists provider failures without a fabricated fallback", async () => {
    process.env.APP_MODE = "sandbox";
    const d = fixtureDispute();
    vi.spyOn(paypal, "getDispute").mockResolvedValue(d);
    vi.spyOn(ai, "generateRecommendation").mockRejectedValue(
      new Error("provider timeout"),
    );
    await saveDispute(d);
    await expect(analyze(d.dispute_id)).rejects.toThrow("Analysis failed");
    expect((await getCase(d.dispute_id)).status).toBe("ANALYSIS_FAILED");
    expect(await db.recommendation.count()).toBe(0);
  });
  it("locks an uncertain sandbox mutation and never retries it", async () => {
    process.env.APP_MODE = "sandbox";
    const d = fixtureDispute();
    vi.spyOn(paypal, "getDispute").mockResolvedValue(d);
    vi.spyOn(ai, "generateRecommendation").mockResolvedValue(
      ai.demoRecommendation(d, defaultPolicy),
    );
    const send = vi
      .spyOn(paypal, "execute")
      .mockRejectedValue(new Error("timeout after remote accept"));
    await saveDispute(d);
    const c = await analyze(d.dispute_id);
    await decide(d.dispute_id, c.recommendation!.id, "APPROVED", "Test");
    await execute(d.dispute_id, c.recommendation!.id);
    await execute(d.dispute_id, c.recommendation!.id);
    expect(send).toHaveBeenCalledTimes(1);
    expect((await getCase(d.dispute_id)).action?.state).toBe("UNCERTAIN");
  });
  it("keeps demo records inaccessible in sandbox", async () => {
    const { id } = await ready();
    process.env.APP_MODE = "sandbox";
    await expect(getCase(id)).rejects.toThrow("not found");
  });
});
describe("webhook processing", () => {
  it("verifies signatures, deduplicates deliveries and never executes", async () => {
    process.env.APP_MODE = "sandbox";
    const d = fixtureDispute();
    vi.spyOn(paypal, "verifyWebhook").mockResolvedValue(true);
    vi.spyOn(paypal, "getDispute").mockResolvedValue(d);
    const generate = vi
      .spyOn(ai, "generateRecommendation")
      .mockResolvedValue(ai.demoRecommendation(d, defaultPolicy));
    const send = vi.spyOn(paypal, "execute");
    const event = {
      id: "WH-1",
      event_type: "CUSTOMER.DISPUTE.CREATED",
      resource: { dispute_id: d.dispute_id },
    };
    expect(await processWebhook(new Headers(), event)).toEqual({
      received: true,
      duplicate: false,
    });
    expect(await processWebhook(new Headers(), event)).toEqual({
      received: true,
      duplicate: true,
    });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    expect(
      (await db.webhookEvent.findUnique({ where: { id: "sandbox:WH-1" } }))
        ?.state,
    ).toBe("PROCESSED");
  });
  it("does not persist an invalid webhook", async () => {
    process.env.APP_MODE = "sandbox";
    vi.spyOn(paypal, "verifyWebhook").mockResolvedValue(false);
    await expect(processWebhook(new Headers(), {})).rejects.toThrow(
      "signature",
    );
    expect(await db.webhookEvent.count()).toBe(0);
  });
  it("allows a failed webhook to be retried safely", async () => {
    process.env.APP_MODE = "sandbox";
    const d = fixtureDispute();
    vi.spyOn(paypal, "verifyWebhook").mockResolvedValue(true);
    const fetch = vi
      .spyOn(paypal, "getDispute")
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(d);
    vi.spyOn(ai, "generateRecommendation").mockResolvedValue(
      ai.demoRecommendation(d, defaultPolicy),
    );
    const event = {
      id: "WH-2",
      event_type: "CUSTOMER.DISPUTE.CREATED",
      resource: { dispute_id: d.dispute_id },
    };
    await expect(processWebhook(new Headers(), event)).rejects.toThrow();
    await processWebhook(new Headers(), event);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(
      await db.recommendation.count({
        where: { caseId: caseKey(d.dispute_id) },
      }),
    ).toBe(1);
  });
});

describe("merchant-written messages", () => {
  async function inputFor(
    id: string,
    buyerMessage = "Could you describe which item is damaged?",
  ) {
    const current = await getCase(id);
    return {
      revision: current.revision,
      policyVersion: (await getPolicy()).version,
      recommendationId: current.recommendation?.id ?? null,
      buyerMessage,
    };
  }
  it("saves without AI, requires approval, and sends only the reviewed message", async () => {
    const d = fixtureDispute();
    await saveDispute(d);
    const draft = await saveMessageDraft(
      d.dispute_id,
      await inputFor(d.dispute_id),
      "Test merchant",
    );
    expect(draft.recommendation?.provider).toBe("MERCHANT_DRAFT");
    expect(draft.recommendation?.payload.confidence).toBe(0);
    expect(draft.recommendation?.validation.allowed).toBe(true);
    expect(draft.recommendation?.payload.amountCents).toBe(0);
    expect(draft.recommendation?.payload.offerType).toBeNull();
    expect(await db.agentRun.count()).toBe(0);
    expect(await db.payPalAction.count()).toBe(0);
    const id = draft.recommendation!.id;
    await expect(execute(d.dispute_id, id)).rejects.toThrow("approval");
    await decide(d.dispute_id, id, "APPROVED", "Test merchant");
    const done = await execute(d.dispute_id, id);
    expect(done.action?.state).toBe("SIMULATED");
    expect(done.dispute.messages.at(-1)?.content).toBe(
      draft.recommendation?.payload.buyerMessage,
    );
    expect(
      done.audit.some(
        (e) => e.kind === "DRAFT_SAVED" && e.actor === "Test merchant",
      ),
    ).toBe(true);
    await expect(
      saveMessageDraft(d.dispute_id, await inputFor(d.dispute_id), "Test"),
    ).rejects.toThrow("submitted action");
  });
  it("uses the normal sandbox executor and verifies the exact human-written message", async () => {
    process.env.APP_MODE = "sandbox";
    const d = fixtureDispute();
    const read = vi.spyOn(paypal, "getDispute").mockResolvedValue(d);
    const generate = vi.spyOn(ai, "generateRecommendation");
    const send = vi.spyOn(paypal, "execute").mockImplementation(async (r) => {
      read.mockResolvedValue({
        ...d,
        update_time: new Date().toISOString(),
        messages: [
          ...d.messages,
          {
            posted_by: "SELLER",
            content: r.buyerMessage,
            time_posted: new Date().toISOString(),
          },
        ],
      });
      return { data: null, status: 200, debugId: "test-debug" };
    });
    await saveDispute(d);
    const draft = await saveMessageDraft(
      d.dispute_id,
      await inputFor(d.dispute_id),
      "Test merchant",
    );
    expect(send).not.toHaveBeenCalled();
    await decide(
      d.dispute_id,
      draft.recommendation!.id,
      "APPROVED",
      "Test merchant",
    );
    const done = await execute(d.dispute_id, draft.recommendation!.id);
    expect(done.action?.state).toBe("VERIFIED");
    expect(generate).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].buyerMessage).toBe(
      draft.recommendation!.payload.buyerMessage,
    );
    await execute(d.dispute_id, draft.recommendation!.id);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("creates immutable revisions and invalidates earlier approvals", async () => {
    const { id, rec } = await ready();
    await decide(id, rec, "APPROVED", "Test");
    const original = await db.recommendation.findUniqueOrThrow({
      where: { id: rec },
    });
    const revised = await saveMessageDraft(id, await inputFor(id), "Test");
    expect(revised.recommendation?.id).not.toBe(rec);
    expect(revised.recommendation?.approval).toBeNull();
    expect(revised.recommendation?.status).toBe("PENDING");
    expect(
      (await db.recommendation.findUniqueOrThrow({ where: { id: rec } }))
        .payload,
    ).toBe(original.payload);
    expect(await db.approval.count()).toBe(1);
    await expect(execute(id, rec)).rejects.toThrow("approval");
    await expect(execute(id, revised.recommendation!.id)).rejects.toThrow(
      "approval",
    );
  });
  it.each(["revision", "policy", "recommendation"])(
    "rejects a stale %s editor",
    async (field) => {
      const { id } = await ready();
      const input = await inputFor(id);
      if (field === "revision") input.revision += 1;
      if (field === "policy") input.policyVersion += 1;
      if (field === "recommendation")
        input.recommendationId = "another-case-or-version";
      await expect(saveMessageDraft(id, input, "Test")).rejects.toThrow(
        "changed",
      );
      expect(await db.recommendation.count()).toBe(1);
    },
  );
  it("allows only one save from concurrent editors of the same version", async () => {
    const { id } = await ready();
    const input = await inputFor(id);
    const results = await Promise.allSettled([
      saveMessageDraft(id, input, "A"),
      saveMessageDraft(id, input, "B"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.recommendation.count()).toBe(2);
  });
  it.each(["unauthorized", "waiting", "capability", "currency", "tracking"])(
    "preserves the %s block for human drafts",
    async (kind) => {
      const d =
        kind === "unauthorized" ? fixtureDispute("HIGH", 2) : fixtureDispute();
      if (kind === "waiting") d.status = "WAITING_FOR_BUYER_RESPONSE";
      if (kind === "capability") d.links = [];
      if (kind === "currency") d.dispute_amount.currency_code = "EUR";
      await saveDispute(d);
      if (kind === "tracking")
        await updatePolicy(
          { ...defaultPolicy, requireShipmentEvidence: true },
          (await getPolicy()).version,
        );
      const draft = await saveMessageDraft(
        d.dispute_id,
        await inputFor(d.dispute_id),
        "Test",
      );
      expect(draft.recommendation?.status).toBe("BLOCKED");
      await expect(
        decide(d.dispute_id, draft.recommendation!.id, "APPROVED", "Test"),
      ).rejects.toThrow();
      expect(await db.payPalAction.count()).toBe(0);
    },
  );
  it("does not accept an empty message or client-supplied action authority", async () => {
    const { id } = await ready();
    await expect(
      saveMessageDraft(id, await inputFor(id, "   "), "Test"),
    ).rejects.toThrow();
    await expect(
      saveMessageDraft(
        id,
        {
          ...(await inputFor(id)),
          provider: "MERCHANT_DRAFT",
          amountCents: 3500,
        } as never,
        "Test",
      ),
    ).rejects.toThrow();
  });
});
