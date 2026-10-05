import { z } from "zod";
import {
  actionBody,
  actionRelation,
  disputeSchema,
  type Dispute,
  type Recommendation,
} from "./domain";
import { AppError } from "./errors";

const BASE = "https://api-m.sandbox.paypal.com";
export class PayPalError extends AppError {
  constructor(
    public upstreamStatus: number,
    public debugId: string | null,
  ) {
    super(
      502,
      `PayPal request failed (${upstreamStatus}). Check sandbox permissions and the request in PayPal. No mutation is automatically retried.`,
    );
  }
}
export class PayPalClient {
  private token?: { value: string; expires: number };
  constructor(private fetcher: typeof fetch = fetch) {}
  private async accessToken() {
    if (this.token && this.token.expires > Date.now()) return this.token.value;
    const { PAYPAL_CLIENT_ID: id, PAYPAL_CLIENT_SECRET: secret } = process.env;
    if (!id || !secret)
      throw new AppError(
        503,
        "PayPal sandbox credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
      );
    const response = await this.fetcher(`${BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok)
      throw new PayPalError(
        response.status,
        response.headers.get("paypal-debug-id"),
      );
    const data = z
      .object({ access_token: z.string(), expires_in: z.number() })
      .parse(await response.json());
    this.token = {
      value: data.access_token,
      expires: Date.now() + Math.max(0, data.expires_in - 60) * 1000,
    };
    return this.token.value;
  }
  private async request(
    path: string,
    method = "GET",
    body?: unknown,
    requestId?: string,
    refresh = true,
  ): Promise<{ data: unknown; status: number; debugId: string | null }> {
    const token = await this.accessToken();
    const response = await this.fetcher(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
      redirect: "error",
    });
    // Retry token expiry only for reads. The dispute POST idempotency contract is unconfirmed.
    if (response.status === 401) {
      this.token = undefined;
      if (method === "GET" && refresh)
        return this.request(path, method, body, requestId, false);
    }
    if (!response.ok)
      throw new PayPalError(
        response.status,
        response.headers.get("paypal-debug-id"),
      );
    const text = await response.text();
    return {
      data: text ? (JSON.parse(text) as unknown) : null,
      status: response.status,
      debugId: response.headers.get("paypal-debug-id"),
    };
  }
  async getDispute(id: string): Promise<Dispute> {
    if (!/^[A-Za-z0-9-]{1,255}$/.test(id))
      throw new AppError(400, "Invalid dispute ID");
    const result = disputeSchema.parse(
      (await this.request(`/v1/customer/disputes/${id}`)).data,
    );
    if (result.dispute_id !== id)
      throw new AppError(502, "PayPal returned a different dispute ID");
    return result;
  }
  async listDisputes() {
    const data = (await this.request("/v1/customer/disputes?page_size=50"))
      .data;
    return z
      .object({
        items: z.array(z.object({ dispute_id: z.string() })).default([]),
        links: z.array(z.object({ rel: z.string() })).default([]),
      })
      .parse(data);
  }
  // Only the approved executor receives access to this method; the LLM receives no tools.
  async execute(r: Recommendation, requestId: string) {
    if (!/^[A-Za-z0-9-]{1,255}$/.test(r.caseId))
      throw new AppError(400, "Invalid dispute ID");
    return this.request(
      `/v1/customer/disputes/${r.caseId}/${actionRelation(r)}`,
      "POST",
      actionBody(r),
      requestId,
      false,
    );
  }
  async verifyWebhook(headers: Headers, event: unknown) {
    const names = [
      "paypal-auth-algo",
      "paypal-cert-url",
      "paypal-transmission-id",
      "paypal-transmission-sig",
      "paypal-transmission-time",
    ];
    if (names.some((n) => !headers.get(n)) || !process.env.PAYPAL_WEBHOOK_ID)
      return false;
    let certificate: URL;
    try {
      certificate = new URL(headers.get("paypal-cert-url")!);
    } catch {
      return false;
    }
    if (
      certificate.protocol !== "https:" ||
      ![
        "api.paypal.com",
        "api.sandbox.paypal.com",
        "api-m.paypal.com",
        "api-m.sandbox.paypal.com",
      ].includes(certificate.hostname) ||
      !certificate.pathname.startsWith("/v1/notifications/certs/")
    )
      return false;
    const result = await this.request(
      "/v1/notifications/verify-webhook-signature",
      "POST",
      {
        auth_algo: headers.get(names[0]),
        cert_url: certificate.href,
        transmission_id: headers.get(names[2]),
        transmission_sig: headers.get(names[3]),
        transmission_time: headers.get(names[4]),
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: event,
      },
    );
    return (
      z.object({ verification_status: z.string() }).parse(result.data)
        .verification_status === "SUCCESS"
    );
  }
}
export const paypal = new PayPalClient();

// A 2xx acknowledgement is not proof of resolution. Require a NEW, matching record.
export function verifyOutcome(
  before: Dispute,
  after: Dispute,
  r: Recommendation,
): boolean {
  if (before.dispute_id !== after.dispute_id) return false;
  if (r.recommendedAction === "MAKE_OFFER") {
    const old = new Set(
      (before.offer?.history ?? []).map((h) => JSON.stringify(h)),
    );
    return (after.offer?.history ?? []).some(
      (h) =>
        !old.has(JSON.stringify(h)) &&
        h.actor === "SELLER" &&
        h.event_type === "PROPOSED" &&
        h.offer_type === r.offerType &&
        h.offer_amount?.currency_code === r.currency &&
        h.offer_amount?.value === (r.amountCents / 100).toFixed(2) &&
        h.notes === r.buyerMessage,
    );
  }
  if (r.recommendedAction === "SEND_MESSAGE") {
    const old = new Set(before.messages.map((m) => JSON.stringify(m)));
    return after.messages.some(
      (m) =>
        !old.has(JSON.stringify(m)) &&
        m.posted_by === "SELLER" &&
        m.content === r.buyerMessage,
    );
  }
  return false;
}
