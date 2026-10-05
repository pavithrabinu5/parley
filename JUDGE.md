# Run and evaluate Parley

Parley is a desktop-browser merchant workspace for PayPal inquiry disputes. It runs as a local Node.js application. No paid hosting or AI credits are needed for the default demo or local AI option.

## Start a clean demo

Install Node.js 22 or newer. From a fresh checkout:

```sh
npm ci
cp .env.example .env
npm run db:setup
npm run build
npm start
```

Open `http://localhost:3000` and select **New demo run**. These commands assume a fresh checkout: do not overwrite an existing configured `.env`.

## Three-minute evaluation

1. Select the damaged-item case. Inspect **Evidence** and the source-labelled buyer claims.
2. Review the recommendation, proposed amount, buyer message, risks, and policy checks.
3. Approve the recommendation. Approval alone does not submit an action.
4. Choose **Edit as message only**, change the message, and save it for review. Observe that a new approval is required and the draft is labelled merchant-written.
5. Approve the new version, then execute the simulated action. Inspect the outcome and activity log. The case cannot be submitted twice.
6. Select the high-value unauthorized case and investigate it. Observe the blocked financial action and specialist-review path.

Demo recommendations and outcomes are explicitly simulated. They demonstrate the product workflow without external credentials; they are not evidence of live model inference or PayPal execution.

## Actual AI and PayPal sandbox

Follow [README.md](README.md#real-sandbox-setup). Use your own PayPal developer sandbox merchant app and buyer account. Install Ollama and download `qwen3:4b`; set `AI_PROVIDER=ollama` and `APP_MODE=sandbox`. Configure the merchant credentials and a random workspace access token, then restart the app. Sandbox mode never silently substitutes demo fixtures.

Import an eligible inquiry, investigate it with the actual local model, review the model output, and edit if needed. Approval and execution are distinct. Only the exact approved recommendation may execute, and a fresh PayPal read verifies the resulting message or offer. Acknowledgement and verified submission are distinct from dispute resolution.

Model wording is not consistently reliable. Source evidence and explicit merchant review are essential. The integration is sandbox-only, supports one merchant, and does not provide production financial services.

## Verification

```sh
npm run check
npm run test:e2e
```

The last full run passed **97 tests across five files**, TypeScript, lint, production build, and isolated HTTP end-to-end checks. Those tests use mocked providers or deterministic demo data. Actual provider observations and outstanding limitations are in [the sandbox rehearsal report](docs/verification/SANDBOX-REHEARSAL.md).
