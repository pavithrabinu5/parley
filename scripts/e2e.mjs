import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
const dir = mkdtempSync(join(tmpdir(), "parley-e2e-"));
const port = Number(process.env.E2E_PORT ?? 3107),
  base = `http://localhost:${port}`;
const env = {
  ...process.env,
  APP_MODE: "demo",
  DATABASE_URL: `file:${join(dir, "test.db")}`,
  APP_ORIGIN: base,
};
const setup = spawnSync(process.execPath, ["scripts/db-setup.mjs"], {
  env,
  encoding: "utf8",
});
if (setup.status !== 0) throw new Error(setup.stderr + setup.stdout);
let log = "";
let server;
async function start(mode) {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: {
        ...env,
        APP_MODE: mode,
        MERCHANT_ACCESS_TOKEN: "test-only-merchant-key-".repeat(3),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (b) => {
    log += b.toString();
  });
  server.stderr.on("data", (b) => {
    log += b.toString();
  });
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error("Server failed to start: " + log);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const closed = new Promise((resolve) => server.once("exit", resolve));
  server.kill("SIGTERM");
  await closed;
  server = undefined;
}
async function request(path, method = "GET", body, extra = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      origin: base,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  };
}
try {
  await start("demo");
  let result = await request("/api/workspace");
  assert.equal(result.status, 200);
  assert.equal(result.data.cases.length, 0);
  const seed = await request("/api/demo", "POST");
  assert.equal(seed.status, 200);
  const id = seed.data.id;
  result = await request("/api/workspace");
  assert.equal(result.data.cases.length, 3);
  let item = (await request(`/api/cases/${id}`)).data;
  const recommendationId = item.recommendation.id;
  assert.equal(item.recommendation.provider, "DEMO_FIXTURE");
  assert.equal(item.recommendation.validation.allowed, true);
  assert.equal(
    (await request(`/api/cases/${id}/execute`, "POST", { recommendationId }))
      .status,
    403,
  );
  assert.equal(
    (
      await request(
        `/api/cases/${id}/approve`,
        "POST",
        { recommendationId },
        { origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await request(`/api/cases/${id}/approve`, "POST", { recommendationId }))
      .status,
    200,
  );
  result = await request(`/api/cases/${id}/execute`, "POST", {
    recommendationId,
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.action.state, "SIMULATED");
  const actionId = result.data.action.id;
  result = await request(`/api/cases/${id}/execute`, "POST", {
    recommendationId,
  });
  assert.equal(result.data.action.id, actionId);
  item = (await request(`/api/cases/${id}`)).data;
  assert.equal(item.dispute.status, "WAITING_FOR_BUYER_RESPONSE");
  assert.equal(
    item.audit.filter((e) => e.kind === "EXECUTION_RESERVED").length,
    1,
  );
  const ws = (await request("/api/workspace")).data;
  const high = ws.cases.find((c) => c.dispute.reason === "UNAUTHORISED");
  result = await request(`/api/cases/${high.id}/analyze`, "POST");
  assert.equal(result.data.recommendation.status, "BLOCKED");
  assert.equal(
    (
      await request(`/api/cases/${high.id}/approve`, "POST", {
        recommendationId: result.data.recommendation.id,
      })
    ).status,
    409,
  );
  const editable = ws.cases.find(
    (c) => c.dispute.reason === "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
  );
  const draftBody = {
    revision: editable.revision,
    policyVersion: ws.policy.version,
    recommendationId: editable.recommendation?.id ?? null,
    buyerMessage: "Could you confirm your delivery address?",
  };
  assert.equal(
    (
      await request(`/api/cases/${editable.id}/draft`, "POST", draftBody, {
        origin: "https://evil.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/api/cases/${editable.id}/draft`, "POST", {
        ...draftBody,
        provider: "MERCHANT_DRAFT",
      })
    ).status,
    400,
  );
  result = await request(`/api/cases/${editable.id}/draft`, "POST", draftBody);
  assert.equal(result.status, 200);
  assert.equal(result.data.recommendation.provider, "MERCHANT_DRAFT");
  let editedId = result.data.recommendation.id;
  assert.equal(
    (
      await request(`/api/cases/${editable.id}/execute`, "POST", {
        recommendationId: editedId,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/api/cases/${editable.id}/approve`, "POST", {
        recommendationId: editedId,
      })
    ).status,
    200,
  );
  result = await request(`/api/cases/${editable.id}/draft`, "POST", {
    ...draftBody,
    recommendationId: editedId,
    buyerMessage: "Could you confirm whether the parcel has arrived?",
  });
  assert.equal(result.status, 200);
  assert.equal(
    (
      await request(`/api/cases/${editable.id}/execute`, "POST", {
        recommendationId: editedId,
      })
    ).status,
    403,
  );
  editedId = result.data.recommendation.id;
  assert.equal(
    (
      await request(`/api/cases/${editable.id}/approve`, "POST", {
        recommendationId: editedId,
      })
    ).status,
    200,
  );
  result = await request(`/api/cases/${editable.id}/execute`, "POST", {
    recommendationId: editedId,
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.action.state, "SIMULATED");
  assert.equal(
    result.data.dispute.messages.at(-1).content,
    "Could you confirm whether the parcel has arrived?",
  );
  await stop();
  await start("sandbox");
  assert.equal((await request("/api/workspace")).status, 401);
  assert.equal(
    (await request(`/api/cases/${editable.id}/draft`, "POST", draftBody))
      .status,
    401,
  );
  assert.equal(
    (await request("/api/session", "POST", { token: "incorrect" })).status,
    401,
  );
  const login = await request("/api/session", "POST", {
    token: "test-only-merchant-key-".repeat(3),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  assert.ok(login.headers.get("set-cookie").includes("HttpOnly"));
  result = await request("/api/workspace", "GET", undefined, { cookie });
  assert.equal(result.status, 200);
  assert.equal(result.data.cases.length, 0);
  assert.equal(
    (await request("/api/demo", "POST", undefined, { cookie })).status,
    403,
  );
  assert.equal(
    (await request(`/api/cases/${id}`, "GET", undefined, { cookie })).status,
    404,
  );
  console.log(
    "PASS: production HTTP golden workflow, approval bypass, CSRF, duplicate execution, specialist block, merchant drafts with fresh approval, authenticated sandbox and mode isolation.",
  );
} finally {
  await stop();
  rmSync(dir, { recursive: true, force: true });
}
