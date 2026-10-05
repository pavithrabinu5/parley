# Repository audit and evidence-led decision

Audit date: 2026-10-03, Asia/Dubai.

## Starting state

Inspected all application source (three starter Next.js files), configuration, package/lock files, assets, Git status, research, product specification, architecture, and agent instructions. The source tree was a create-next-app scaffold. No database schema, endpoints, PayPal integration, model calls, tests, or working Parley UI existed. Git had no commits and all project files were untracked, so there was no committed secret history to inspect. The inspected source/configuration contained no concrete credentials; environment variables needed for live calls were absent. Generated instruction/skill folders were preserved.

The installed version is Next.js 16.3.8, not the architecture document's Next.js 15. Its local route, server/client, layout, and CLI guides were read before implementation. Existing Prisma configuration imported a nonexistent `definePrismaConfig`; replaced with the installed `defineConfig`. The previous postinstall attempted skill synchronization and hid failures; replaced with client generation. Initial Prisma empty-file initialization and restricted cache access were addressed for this workspace. The generated migration is preserved.

## Corrections to prior research

| Prior assumption                                          | Verified correction                                                                     | Implementation consequence                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Inquiry resolution prevents card chargebacks              | PayPal lifecycle CHARGEBACK can mean PayPal claim review, not a card-network chargeback | No chargeback/fee prevention claim                                                       |
| Inquiry automation is a market gap                        | Chargeflow advertises inquiry automation and PayPal support                             | Differentiate approval transparency and inspectability; no first-to-market claim         |
| Toolkit disputes are reads only                           | Current agent tool reference also lists `accept_dispute_claim`                          | Toolkit not needed; model receives no tools                                              |
| Request ID makes every POST safely retryable              | PayPal says support is API-specific; Disputes reference does not specify that guarantee | Local unique action reservation; uncertain writes freeze and reconcile                   |
| A weak-tracking case should always offer a partial refund | Action/type availability is per dispute; unsupported offers must not execute            | Check actual links, response types, stage, status; only supported partial REFUND/message |
| HTTP success means resolved or waiting for buyer          | Success is acknowledgement; actual case outcome must be read                            | Separate acknowledgement, verification, and settlement concepts                          |
| AI can independently enforce merchant policy              | Model interpretation is not an authorization boundary                                   | Structured deterministic rules, version binding, mandatory approval                      |
| Webhook signature can be simplified for sandbox           | That would weaken the demonstrated boundary                                             | Actual signature verification in all sandbox webhook requests                            |
| Carrier evidence can be assumed from transaction IDs      | Dispute references do not prove independent transaction or shipment lookup              | Display only returned evidence and missing context                                       |
| Vercel + local SQLite is sufficient                       | Ephemeral local files do not provide durable execution locks                            | Single persistent Node service; no serverless deployment claim                           |

Primary references:

- [PayPal dispute lifecycle](https://developer.paypal.com/disputes/disputes-lifecycle/)
- [Disputes OpenAPI contract](https://developer.paypal.com/api/customer-disputes/v1/schema.json)
- [Make offer](https://developer.paypal.com/api/customer-disputes/v1/disputes-make-offer)
- [Send message](https://developer.paypal.com/api/customer-disputes/v1/disputes-send-message)
- [Accept claim](https://developer.paypal.com/api/customer-disputes/v1/disputes-accept-claim)
- [PayPal idempotency caveat](https://developer.paypal.com/api/rest/reference/idempotency/)
- [Agent tools](https://developer.paypal.com/ai-tools/agent-tools)
- [Chargeflow's own product description](https://www.chargeflow.io/products/automation)

## Product comparison

These are engineering judgments, not empirical market rankings. No competitor inferiority, hackathon win likelihood, or measured impact is asserted.

| Candidate                             | PayPal depth                                 | AI necessity                                  | End-to-end clarity                   | Demo feasibility                      | Differentiation / constraint                                                                       |
| ------------------------------------- | -------------------------------------------- | --------------------------------------------- | ------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Parley: reviewed inquiry response     | Strong: lifecycle, options, writes, webhooks | Useful for ambiguous claims and communication | Strong, merchant decision is visible | Medium: need eligible sandbox dispute | Strong safety demonstration; established competitors exist                                         |
| Spending mandates for shopping agents | Strong: orders/capture                       | Useful for intent/rule interpretation         | Strong                               | Medium-high                           | Good alternative, but policy and purchase catalog add scope; no evidence it is materially stronger |
| Email purchase order to invoice       | Strong: invoicing                            | Useful extraction                             | Very clear                           | High                                  | Easiest demo, smaller decision/safety story                                                        |
| Subscription recovery assistant       | Strong: billing/webhooks                     | Moderate: messaging/prioritization            | Clear with enough lifecycle context  | Medium                                | Harder to compress repeated billing events into a short honest demo                                |
| Shipment evidence packager            | Strong: evidence submission                  | Moderate: summarize/flag gaps                 | Clear                                | Medium                                | Requires actual shipment data and document upload; narrower than current decision workflow         |

**Decision:** retain Parley, narrow its execution scope, combine Strategist and Composer, and make the trust controls the demonstrated value. Its advantage is the coherent evidence-to-action workflow, not an unsupported claim of product originality. No materially stronger alternative emerged from the verified capabilities and implementation constraints.

## PayPal capability inventory

- OAuth client credentials for the merchant app; seller dispute read/update permissions must be enabled. Third-party merchant delegation has extra setup and is not implemented.
- Disputes list/detail are used as source of truth. List sync is capped at one page (50); direct ID import supports additional cases.
- `make-offer`: inquiry only; note and offer_type required, amount included for REFUND. The record must expose the matching action and offer type. Only partial REFUND is implemented. Return and replacement types are explicitly outside scope.
- `send-message`: inquiry only and requires its returned link; request is `{message}`.
- `accept-claim`: verified as a financial mutation that accepts liability; not implemented.
- `provide-evidence`: verified as a dispute operation with requested evidence semantics; not implemented. Evidence in the UI is read context, not an upload integration.
- Events: CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED. Signature POST includes transmission headers, cert URL, configured webhook ID and event. No bypass.
- Sandbox: genuine transactions/disputes and account capabilities needed. Synthetic simulator notifications alone do not prove real lifecycle actions.
- SDK review: PayPal exposes JS/server SDKs and Agent Toolkit/MCP. No claim that the checked SDK covers the needed dispute mutations; official REST contract is the implemented boundary. Toolkit/MCP were evaluated and deliberately omitted.

Further references: [Webhook signature](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post), [event catalog](https://developer.paypal.com/api/rest/webhooks/event-names/), [sandbox setup](https://developer.paypal.com/platforms/disputes/set-up/), [test scenarios](https://developer.paypal.com/disputes/test-go-live/), [Toolkit](https://developer.paypal.com/ai-tools/toolkit/), [MCP](https://developer.paypal.com/ai-tools/mcp-server/), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
