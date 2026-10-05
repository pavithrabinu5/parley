import { createHmac, timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { config } from "./config";
import { AppError } from "./errors";
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function sessionCookie() {
  const payload = `${Date.now() + 8 * 3600000}`;
  return `${payload}.${createHmac("sha256", config().token).update(payload).digest("hex")}`;
}
export function requireOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(config().origin).origin)
    throw new AppError(403, "Request origin rejected");
}
export function authorize(request: Request) {
  if (config().mode === "demo") return "Demo merchant";
  if (config().token.length < 32)
    throw new AppError(
      503,
      "Set MERCHANT_ACCESS_TOKEN to at least 32 characters before using sandbox mode",
    );
  const session =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("parley_session="))
      ?.slice(15) ?? "";
  const [expiry, signature] = session.split(".");
  if (
    !expiry ||
    !signature ||
    !/^\d+$/.test(expiry) ||
    Number(expiry) <= Date.now() ||
    Number(expiry) > Date.now() + 8 * 3600000 ||
    !equal(
      signature,
      createHmac("sha256", config().token).update(expiry).digest("hex"),
    )
  )
    throw new AppError(401, "Merchant sign-in required");
  return "Sandbox merchant";
}
export async function readJson(
  request: Request,
  maxBytes = 16384,
): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError(415, "Expected application/json");
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "Missing request body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AppError(413, "Request body too large");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new AppError(400, "Invalid JSON");
  }
}
export async function handle(fn: () => Promise<unknown>) {
  try {
    return Response.json(await fn(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status =
      error instanceof AppError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 500;
    const message =
      error instanceof AppError
        ? error.message
        : error instanceof ZodError
          ? "Data did not match the required schema"
          : "The request could not be completed. Check server configuration and retry safely.";
    // Do not log raw provider bodies, buyer messages, tokens, or model input.
    console.error(
      JSON.stringify({
        event: "request_failed",
        status,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
      }),
    );
    return Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
