import { afterEach, describe, expect, it, vi } from "vitest";
import { PayPalClient, verifyOutcome } from "../src/lib/paypal";
import { fixtureDispute } from "../src/lib/seed";
import { demoRecommendation } from "../src/lib/ai";
import { defaultPolicy } from "../src/lib/domain";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllEnvs());
function client(responses: Response[]) {
  vi.stubEnv("PAYPAL_CLIENT_ID", "test-client");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-secret");
  const fetcher = vi.fn(async () => responses.shift()!);
  return { client: new PayPalClient(fetcher), fetcher };
}
describe("PayPal transport", () => {
  it("uses sandbox OAuth and validates detail payload", async () => {
    const d = fixtureDispute();
    const { client: c, fetcher } = client([
      json({ access_token: "test-token", expires_in: 3600 }),
      json(d),
    ]);
    expect(await c.getDispute(d.dispute_id)).toEqual(d);
    expect(fetcher.mock.calls).toHaveLength(2);
  });
  it("refreshes expired tokens for a read only", async () => {
    const d = fixtureDispute();
    const { client: c, fetcher } = client([
      json({ access_token: "one", expires_in: 3600 }),
      json({}, 401),
      json({ access_token: "two", expires_in: 3600 }),
      json(d),
    ]);
    await c.getDispute(d.dispute_id);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it.each([401, 422, 500])(
    "never retries a mutation after HTTP %s",
    async (status) => {
      const r = demoRecommendation(fixtureDispute(), defaultPolicy);
      const { client: c, fetcher } = client([
        json({ access_token: "one", expires_in: 3600 }),
        json({}, status),
      ]);
      await expect(c.execute(r, "request-id")).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );
  it("does not retry timed-out mutations", async () => {
    vi.stubEnv("PAYPAL_CLIENT_ID", "x");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "y");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "one", expires_in: 3600 }))
      .mockRejectedValueOnce(new Error("timeout"));
    await expect(
      new PayPalClient(fetcher).execute(
        demoRecommendation(fixtureDispute(), defaultPolicy),
        "id",
      ),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("rejects bad signature without processing", async () => {
    const { client: c, fetcher } = client([]);
    expect(await c.verifyWebhook(new Headers(), {})).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires SUCCESS from signature verification", async () => {
    vi.stubEnv("PAYPAL_WEBHOOK_ID", "hook");
    const { client: c } = client([
      json({ access_token: "one", expires_in: 3600 }),
      json({ verification_status: "FAILURE" }),
    ]);
    const h = new Headers({
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url":
        "https://api.sandbox.paypal.com/v1/notifications/certs/test",
      "paypal-transmission-id": "x",
      "paypal-transmission-sig": "y",
      "paypal-transmission-time": "2026-10-03T00:00:00Z",
    });
    expect(await c.verifyWebhook(h, {})).toBe(false);
  });
});
describe("read-back verification", () => {
  it("does not treat an unchanged record or mere status change as confirmation", () => {
    const d = fixtureDispute();
    const r = demoRecommendation(d, defaultPolicy);
    expect(verifyOutcome(d, d, r)).toBe(false);
    expect(
      verifyOutcome(d, { ...d, status: "WAITING_FOR_BUYER_RESPONSE" }, r),
    ).toBe(false);
  });
  it("requires a new matching offer with the exact note and amount", () => {
    const d = fixtureDispute();
    const r = demoRecommendation(d, defaultPolicy);
    const after = structuredClone(d);
    after.offer = {
      history: [
        {
          actor: "SELLER",
          event_type: "PROPOSED",
          offer_type: "REFUND",
          offer_amount: { value: "25.00", currency_code: "USD" },
          notes: r.buyerMessage,
        },
      ],
    };
    expect(verifyOutcome(d, after, r)).toBe(true);
    expect(verifyOutcome(after, after, r)).toBe(false);
    after.offer.history![0].offer_amount!.value = "35.00";
    expect(verifyOutcome(d, after, r)).toBe(false);
  });
  it("requires a new SELLER message", () => {
    const d = fixtureDispute("message", 1);
    const r = demoRecommendation(d, defaultPolicy);
    const after = structuredClone(d);
    after.messages.push({ posted_by: "BUYER", content: r.buyerMessage });
    expect(verifyOutcome(d, after, r)).toBe(false);
    after.messages.at(-1)!.posted_by = "SELLER";
    expect(verifyOutcome(d, after, r)).toBe(true);
    expect(verifyOutcome(after, after, r)).toBe(false);
  });
});
