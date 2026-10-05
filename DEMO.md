# Parley: exact demo runbook

## Local fallback: no credentials, no external calls

```sh
npm ci
cp .env.example .env
npm run db:setup
npm run dev
```

Open http://localhost:3000. Select **New demo run**. A new three-case set is added; earlier runs and audits remain intact. Labels must stay visible when recording. Fixture confidence and recommendations are not live AI results.

## 2 minutes 40 seconds

| Time      | Screen/action                                    | Suggested narration                                                                                                                                                                    |
| --------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:20 | Workspace overview                               | “Parley helps PayPal merchants turn a buyer's dispute into a reviewed next step. AI recommends, policy checks, and the merchant decides.”                                              |
| 0:20–0:40 | Alex Morgan, $89 cosmetic-damage example         | “The buyer says one item is damaged and prefers to keep the rest. That is a claim, not verified evidence.”                                                                             |
| 0:40–1:00 | Evidence tab; then Recommendation                | “The investigator preserves sources and missing evidence. In sandbox, a structured model analyzes the record and composes this draft. This fallback uses labelled fixtures.”           |
| 1:00–1:25 | Why this action / guardrails                     | “The $25 partial proposal passes both the $40 cap and 40% cap. PayPal must actually expose the action and REFUND offer type. No full refund or arbitrary financial tool is available.” |
| 1:25–1:50 | Exact buyer message, risks, approve              | “I can see the exact note, unverified claims, and potential cost. Approval is saved against this version of the case and policy.”                                                      |
| 1:50–2:10 | Execute                                          | “Now I submit the approved action. In this demo it is simulated. In sandbox this button makes the actual PayPal REST request.”                                                         |
| 2:10–2:30 | Outcome; Activity tab                            | “Acknowledgement is not resolution. Real execution reads PayPal again. A verified partial offer still needs the buyer's response.”                                                     |
| 2:30–2:40 | Select high-value unauthorized case; investigate | “Unsafe cases are blocked for specialist review. The useful automation is the operational work around a decision, with the merchant retaining control.”                                |

## Real sandbox rehearsal (required before claiming a live end-to-end demo)

1. In PayPal developer dashboard, create/use a merchant sandbox app with Customer disputes enabled and a separate personal buyer. Complete a sandbox transaction and open an inquiry dispute from the buyer. See [official setup](https://developer.paypal.com/platforms/disputes/set-up/) and [test scenarios](https://developer.paypal.com/disputes/test-go-live/).
2. Set `APP_MODE=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `AI_PROVIDER=ollama`, and a random `MERCHANT_ACCESS_TOKEN` in `.env`. Keep `APP_ORIGIN=http://localhost:3000` locally. Open Ollama and run `ollama pull qwen3:4b` once. Restart Parley.
3. Sign in, select Sync PayPal or import the actual dispute ID. Never use `DEMO-*` IDs for live validation.
4. Confirm an actionable inquiry record and inspect its live response capabilities. The app only handles partial `REFUND` proposals and messages. If REFUND is not allowed, use an available send-message scenario. If neither is available, prepare a different genuine sandbox dispute; do not patch the response.
5. Run Investigate case. Confirm provider matches your configured Ollama, Gemini, or OpenAI model, evidence labels are accurate, the proposal passes checks, and the message is appropriate. Model output is variable; rehearse with the actual case. If the model chooses manual review, respect the gate.
6. Approve, then execute. Record the real PayPal HTTP status and debug ID in the app. Inspect PayPal Resolution Center separately. Use Reconcile with PayPal if read-back is delayed. Do not repeatedly POST or clear the unique action record.
7. Show the newly observed offer/message and persisted activity. Only say “verified” if the app reports VERIFIED. If PayPal omits history fields, say “acknowledged, verification pending” and show Resolution Center evidence. Never narrate an offer as a completed refund.

For webhook-triggered investigation: expose an HTTPS origin, set APP_ORIGIN, register `/api/webhooks/paypal`, subscribe to the three customer dispute events, and configure `PAYPAL_WEBHOOK_ID`. Trigger a real dispute event. Signature checking is always active; there is no skip-verification option. The manual sync path is available if delivery is delayed.

## Failure recovery

- Provider timeout/missing key: show the error and retry analysis; no fabricated fallback in sandbox.
- Missing capability/stale approval: refresh, analyze and obtain new approval. Never override policy to make the demo “work.”
- Uncertain execution: reconcile read-only, inspect PayPal manually. This case stays locked against repeat submission.
- Internet unavailable: restart in demo mode and explicitly announce that the remaining demonstration is simulated.
- Fresh fallback: New demo run adds a clean set. Do not delete sandbox records or rewrite their audit history.

## Reproducible validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

No live sandbox/AI rehearsal can be completed without the owner's credentials. This repository supplies runnable demo and transport/integration tests; they are not evidence of a successful real PayPal action.

## Merchant editing walkthrough

When the AI draft is unsuitable, choose **Edit as message only** (or **Write a message**). Review and edit the text, then select **Save message for review**. The replacement is labelled MERCHANT-WRITTEN MESSAGE and proposes no financial transfer. It has a fresh approval requirement. Demonstrate this by approving a draft, editing it, and observing that the old execution button is replaced by a new approval step. Then approve and execute the reviewed version. In demo mode this is simulated; only a successfully verified sandbox run establishes a real app submission.

If the case is WAITING_FOR_BUYER_RESPONSE, a draft may be saved but cannot be approved or sent. The sandbox buyer must reply before the seller-action rehearsal can continue. Refresh and review the new case version before saving and approving again. Do not change the stored PayPal status to make the demonstration proceed.
