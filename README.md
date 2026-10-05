# Parley

**Evidence-grounded PayPal dispute recommendations. Your policy. Your approval.**

Parley gives a small merchant a workspace to investigate an inquiry dispute, understand a proposed response, and submit an explicitly approved PayPal action. It handles partial refund proposals and buyer messages. It does not promise to prevent card chargebacks, win disputes, or save a quantified amount.

[Judge quickstart](JUDGE.md) · [Submission checklist](SUBMIT.md) · [Copy-ready project description](docs/submission/DEVPOST.md)

## Run the demo

Requires Node.js 22+ and npm. Tested with Node 25.6.1. No external credentials are needed for demo mode.

```sh
npm ci
cp .env.example .env
npm run db:setup
npm run dev
```

Open http://localhost:3000 and select **New demo run**. Three labelled simulated cases are added. The first has a deterministic recommendation ready for review. Explore Evidence and Activity, approve, then simulate the action. Demo mode never calls PayPal or AI providers. Each run adds cases without deleting earlier audit history.

For a production build:

```sh
npm run build
npm start
```

The build uses Next.js's documented Webpack option because Turbopack's CSS worker cannot bind its internal port in the restricted build environment used during development. No fonts or assets need to be fetched during builds.

## What is implemented

- Responsive merchant workspace with inbox search, filters, approval queue, open-case metrics, evidence provenance, exact buyer draft, policy editor, and persisted activity.
- PayPal sandbox OAuth, dispute list/detail reads, partial `REFUND` offers, `send-message`, and signature-verified dispute webhooks.
- Deterministic investigator; one structured local Ollama (or explicitly selected Gemini/OpenAI) Strategist + Composer call. No arbitrary tool execution or decorative multi-agent layer.
- Zod output validation and ten deterministic checks; capability links and allowed offer types are inspected on the actual record.
- Separate human approval and execution, snapshot and policy binding, 30-minute recommendation expiry, duplicate-action protection, read-back verification.
- SQLite via Prisma migrations; durable webhook deduplication and processing leases.
- Explicit simulated/real provider labels and states for acknowledged, unverified, uncertain, and verified actions.

## Environment

| Variable                | Required        | Meaning                                                                                              |
| ----------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| `APP_MODE`              | Always          | `demo` (default) or `sandbox`; invalid values fail closed                                            |
| `DATABASE_URL`          | Recommended     | SQLite URL, e.g. `file:./parley.db`; relative to `prisma/`                                           |
| `APP_ORIGIN`            | Writes          | Exact browser origin, defaults to `http://localhost:3000`; used for CSRF protection                  |
| `MERCHANT_ACCESS_TOKEN` | Sandbox         | Random secret of at least 32 characters; sign-in credential and cookie HMAC key                      |
| `PAYPAL_CLIENT_ID`      | Sandbox         | Merchant sandbox app client ID                                                                       |
| `PAYPAL_CLIENT_SECRET`  | Sandbox         | Matching secret with Customer disputes access                                                        |
| `PAYPAL_WEBHOOK_ID`     | Webhooks        | ID of the app's actual registered sandbox webhook                                                    |
| `AI_PROVIDER`           | Optional        | `ollama` (default), `gemini`, or `openai`; no provider fallback                                      |
| `GEMINI_API_KEY`        | Gemini analysis | Google AI Studio key; use a project without billing for free-tier testing                            |
| `GEMINI_MODEL`          | Optional        | Default `gemini-3.5-flash-lite`                                                                      |
| `OPENAI_API_KEY`        | OpenAI only     | OpenAI API credential with billing/model access                                                      |
| `OPENAI_MODEL`          | Optional        | Responses structured-output model; default `gpt-4.1-mini`; choose a model accessible to your account |

Generate an access token with `openssl rand -hex 32`. Put secrets in `.env`, never in a browser bundle or source control. Sandbox requires sign-in; the signed cookie is HttpOnly, SameSite=Strict, eight hours, and Secure when the configured origin is HTTPS. Only one merchant/account is supported. Demo and sandbox records and policies are isolated by mode.

## No-cost AI setup

Local Ollama is the default provider. Install [Ollama for macOS](https://ollama.com/download/mac), open it, and run:

```sh
ollama pull qwen3:4b
```

Set `AI_PROVIDER=ollama`. The 2.5 GB Qwen3 4B model runs on your own computer and needs no API key or credits. Keep Ollama running while using Parley. The application calls only `http://127.0.0.1:11434/api/chat`, uses a fixed local model, disables thinking output, and validates structured JSON. Local inference has a 90-second timeout and a conservative context-size limit; oversized cases require manual review. There is no automatic model download or cloud fallback during analysis. PayPal sandbox still needs an internet connection and its own credentials. Demo mode still uses deterministic fixtures; sandbox mode uses the selected actual model.

Gemini is optional. Create a key in [Google AI Studio](https://aistudio.google.com/api-keys) using a project whose billing tier is **Free**, then set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and `GEMINI_MODEL=gemini-3.5-flash-lite` in `.env`. Do not enable billing for a no-cost rehearsal. Google's published free tier has rate/availability limits; the app cannot inspect or enforce your Google project's billing status. If quota runs out, analysis fails rather than calling a different provider. No OpenAI key is needed for this path. Keep case data synthetic: Google says free-tier inputs/outputs may be used to improve its products. See [pricing](https://ai.google.dev/gemini-api/docs/pricing).

To explicitly choose OpenAI instead, set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and optionally `OPENAI_MODEL`. A missing provider setting defaults to local Ollama; an invalid provider is rejected.

## Real sandbox setup

1. Create a PayPal developer sandbox merchant app and personal buyer account. Enable **Customer disputes** for the merchant app. See [official account setup](https://developer.paypal.com/platforms/disputes/set-up/).
2. Complete a sandbox purchase between those accounts, then create a dispute as the buyer in the sandbox Resolution Center. For the partial-offer scenario, use a genuine supported inquiry case. Follow [PayPal's sandbox test guide](https://developer.paypal.com/disputes/test-go-live/); event actions can take a few minutes to become available.
3. Configure the variables above, set `APP_MODE=sandbox`, and restart the app. Sign in with your merchant access token. Sync PayPal (first 50 cases) or import a known dispute ID.
4. Inspect the record's `INQUIRY` stage, actionable status, exact `make-offer` POST link, and `allowed_response_options.make_offer.offer_types`. Only use `REFUND` if the actual response includes it. Otherwise use a supported message or manual review. Parley does not force an unsupported scenario.
5. Select **Investigate case**, review the real model recommendation, approve, then execute. If outcome is uncertain/unverified, reconcile read-only. Do not delete action rows or resubmit outside the app without checking PayPal.
6. For webhook-driven investigation, expose a stable HTTPS endpoint and register `/api/webhooks/paypal` for `CUSTOMER.DISPUTE.CREATED`, `.UPDATED`, and `.RESOLVED`. Store that webhook's ID. Real deliveries are verified through PayPal before persistence. Simulator payloads are not an end-to-end proof of actual dispute processing.

This implementation is merchant-owned OAuth, not multi-merchant partner delegation. No `PayPal-Auth-Assertion` or seller onboarding is implemented. It cannot call PayPal production: the hostname is fixed to the sandbox.

## AI and trust boundaries

The investigator reads and normalizes the dispute. Transaction IDs and shipment evidence come from that record, not independent Orders or carrier calls. Every evidence item retains provenance and a trust label. A buyer statement and merchant-submitted tracking remain claims.

Sandbox analysis uses the selected provider. Local Ollama uses native structured JSON with `z.toJSONSchema`, a fixed loopback endpoint and the Qwen3 4B model. Gemini uses Google's documented OpenAI-compatible endpoint with `zodResponseFormat`; the SDK sends the Gemini key only to Google. OpenAI uses Responses with `zodTextFormat` and `store: false`. All providers use a fixed instruction, a separate untrusted case input, and no tools. The result contains the action, amount, confidence, rationale, evidence IDs, missing evidence, risks, impact, buyer draft, and next step. Case identity and evidence references are checked again in code. The model does not generate executable URLs, policy checks, or authority to send money. Confidence is model-reported, not calibrated. Unknown evidence references are rejected; semantic truth of a cited claim still requires merchant review.

Provider failures, refusals, malformed outputs, and incomplete responses fail closed. Sandbox never falls back to a demo recommendation. Case content stays on this computer for local Ollama inference. Explicitly selected cloud providers receive case content; use synthetic sandbox data for this prototype.

## Financial execution

Both a dollar cap and percentage cap apply. Only USD partial refunds strictly below the dispute amount are implemented. Unauthorized-payment cases, high values, non-inquiry states, unsupported types, missing required tracking, or low model confidence block AI-recommended execution. Approval is mandatory and cannot be disabled.

The **Write or edit a message** editor can replace an AI draft with a message-only merchant draft. Saving records source `MERCHANT_DRAFT`, preserves prior versions, invalidates previous approvals, and requires fresh approval before execution. It cannot set an offer or refund amount. Model confidence is not claimed or required for merchant-written messages; case, currency, value, capability, evidence, and other safety checks still apply. Concurrent or stale edits are rejected. No editing is allowed after a submission attempt.

Approval records bind the immutable recommendation, snapshot fingerprint, and policy version. Execution fetches current sandbox state and validates again. A database transaction reserves a unique action per case before dispatch. An uncertain network result stays locked. `PayPal-Request-Id` is sent for correlation, **not treated as a documented idempotency guarantee for dispute actions**. There are no automatic mutation retries. This intentionally conservative prototype permits only one submission attempt per case; subsequent actions use manual PayPal review.

A 2xx response means acknowledged, not resolved. Verification requires a new matching seller offer history entry or seller message in a subsequent GET. If PayPal omits the required history/note fields, the result remains unverified. A verified partial offer still awaits the buyer; it is not a confirmed refund or settlement.

## Testing

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Unit/integration tests cover policy, structured data, injection boundaries, PayPal contracts, auth, stale approval, races, database persistence, webhook replay, and uncertain execution. E2E launches the production server against an isolated temporary database on port 3107 and checks the HTTP golden workflow plus auth and mode isolation. It makes no external PayPal/AI calls. Set `E2E_PORT` if needed. See [verification report](docs/verification/RESULTS.md) for actual outcomes and browser checks.

## Deployment

Use a single long-running Node service with persistent disk. Run `npm ci`, `npm run db:setup`, `npm run build`, then `npm start`. Mount a private persistent volume and set `DATABASE_URL=file:/absolute/mounted/path/parley.db`. Configure HTTPS and `APP_ORIGIN` to the public origin. Keep the service reachable for webhook retries. Rate-limit the public ingress and sign-in endpoint at your reverse proxy. Do not deploy this SQLite setup to ephemeral/serverless instances or multiple replicas. For `AI_PROVIDER=ollama`, Ollama and the model must run on the same host as the Node service; a remote hosted app cannot call your laptop through its own localhost. Provision suitable memory/storage or explicitly choose an accessible cloud provider. No deployment has been performed.

PostgreSQL migration requires changing Prisma's datasource, generating new migrations, and validating transaction/concurrency semantics. Current models use explicit relations, unique constraints, integer money, and portable JSON strings; existing SQLite migrations are not PostgreSQL migrations.

## Limitations

- PayPal sandbox OAuth and dispute listing have passed credentialed checks. Local Ollama recommendations have passed three synthetic scenario checks; execution of a real sandbox dispute action through Parley remains unverified; a manually sent seller message was confirmed through the API and imported; see [rehearsal status](docs/verification/SANDBOX-REHEARSAL.md).
- Single merchant, USD, two inquiry actions. No claim acceptance, evidence upload, full refund, return/replacement handling, production payments, independent fulfillment lookup, or Toolkit/MCP integration.
- Synchronous webhook workflow, bounded network timeouts, durable retries; no background queue. A long workflow may trigger a retry, which is deduplicated.
- Local audit events are append-only through application APIs, not cryptographically tamper-proof against a database administrator.
- No calibrated confidence, measured win-rate, savings, or merchant interview validation.
- Shared demo sessions can add cases/change the demo policy. Sandbox auth has one owner credential; edge rate limiting is needed for public hosting.

[Architecture](ARCHITECTURE.md) · [Demo](DEMO.md) · [Hackathon and submission copy](HACKATHON.md) · [Audit and corrections](docs/verification/AUDIT.md)
