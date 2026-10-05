import { afterEach, expect, it, vi } from "vitest";
import {
  authorize,
  readJson,
  requireOrigin,
  sessionCookie,
} from "../src/lib/http";
afterEach(() => vi.unstubAllEnvs());
it("sandbox rejects unauthenticated and forged approval requests", () => {
  vi.stubEnv("APP_MODE", "sandbox");
  vi.stubEnv("MERCHANT_ACCESS_TOKEN", "x".repeat(40));
  expect(() => authorize(new Request("http://localhost:3000"))).toThrow(
    "sign-in",
  );
  expect(() =>
    authorize(
      new Request("http://localhost:3000", {
        headers: { cookie: "parley_session=9999999999999.fake" },
      }),
    ),
  ).toThrow();
  expect(
    authorize(
      new Request("http://localhost:3000", {
        headers: { cookie: `parley_session=${sessionCookie()}` },
      }),
    ),
  ).toBe("Sandbox merchant");
});
it("rejects cross-origin and missing-origin writes", () => {
  expect(() => requireOrigin(new Request("http://localhost:3000"))).toThrow();
  expect(() =>
    requireOrigin(
      new Request("http://localhost:3000", {
        headers: { origin: "https://evil.example" },
      }),
    ),
  ).toThrow();
});
it("enforces streaming body size", async () => {
  await expect(
    readJson(
      new Request("http://localhost:3000", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ large: "x".repeat(100) }),
      }),
      20,
    ),
  ).rejects.toThrow("too large");
});
it("fails closed on a misconfigured access token", () => {
  vi.stubEnv("APP_MODE", "sandbox");
  vi.stubEnv("MERCHANT_ACCESS_TOKEN", "");
  expect(() => authorize(new Request("http://localhost:3000"))).toThrow(
    "32 characters",
  );
});
