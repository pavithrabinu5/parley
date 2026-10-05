# Sandbox rehearsal status

Updated 4 October 2026. This supplements the original credential-free verification report.

**Latest status:** 97 automated tests, typecheck, lint, production build, and isolated HTTP E2E checks pass. The USD 89 sandbox purchase/capture and USD 35 inquiry are verified. On 4 October the owner manually sent the reviewed seller message in PayPal; a fresh API read confirmed the exact seller message and WAITING_FOR_BUYER_RESPONSE, and Parley imported it. No refund offer is present. This verifies reading an externally sent response, not Parley executing an approved action. Local AI judgment remains unreliable; the actual in-app approval → send → read-back rehearsal and signed webhook delivery remain unverified. The entries below record earlier stages chronologically.

| Check                                                | Observed result                                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PayPal sandbox OAuth                                 | Successful with saved merchant app credentials                                                                                                                |
| Disputes API read                                    | Actual list request succeeded; zero disputes returned                                                                                                         |
| OpenAI                                               | Synthetic generation failed with HTTP 429, credit balance exhausted                                                                                           |
| Gemini                                               | Model listing succeeded; generation on the replacement model failed with HTTP 403, project access denied                                                      |
| Local Ollama                                         | Installed version 0.35.1; downloaded Qwen3 4B; three actual structured recommendations passed validation                                                      |
| Damaged item, USD 89                                 | Proposed USD 35 partial offer; deterministic policy allowed it                                                                                                |
| Missing parcel, USD 124                              | Proposed a message with no refund; deterministic policy allowed it                                                                                            |
| Unauthorized payment, USD 680, injected instructions | Proposed human escalation; deterministic policy blocked execution                                                                                             |
| Test purchase preparation                            | Earlier order lookup returned 404; the fresh USD 89 sandbox order was approved by the buyer                                                                   |
| Buyer approval and capture                           | Verified: buyer approval was read from PayPal, then one capture request succeeded; a subsequent order GET confirmed COMPLETED with a COMPLETED USD 89 capture |
| Real dispute analysis and response                   | Pending                                                                                                                                                       |
| Signed webhook delivery                              | Pending                                                                                                                                                       |

The local configuration now selects Ollama. No further cloud generation calls or paid fallback were used. Local inference took approximately 16–19 seconds per synthetic scenario on this computer. The app is now in sandbox mode with the created dispute imported; demo recommendations remain isolated fixtures.

The live model checks used synthetic cases and the application's actual recommendation and policy-validation functions. They establish successful local inference and the tested execution boundaries, not reliable semantic judgment across arbitrary disputes. Initial text overstated resolution and unsupported facts; revised instructions improved it, but some explanatory text and requested evidence still need merchant review. Confidence is not calibrated. No recommendation was sent to a buyer or used to execute a PayPal dispute action.

The latest `npm run check` passed typecheck, lint, all 81 tests across five files, and the production build. The HTTP E2E suite passed against an isolated database. Eleven added Ollama tests cover the fixed local endpoint/model, absence of cloud credentials and tools, malformed or incomplete output, truncation, unexpected models/tools, unknown evidence references, unavailable service/model, no fallback, and oversized context rejection. These mocked tests supplement the three actual local inference checks.

Order setup uses PayPal Orders v2 separately from Parley's dispute workflow. The current order ID, approval URL, correlation ID, and debug ID are stored in ignored `artifacts/provider-check/sandbox-order.json`; the previous order metadata was archived locally. Credentials were not printed or added to source control. One sandbox capture was performed after buyer approval; order `95122175FV219331A` and capture `1BJ90784TU539931E` were confirmed COMPLETED at 17:56 UTC. No real-money transaction or dispute mutation was performed.

The buyer inquiry has been created and imported. Next: prepare a usable recommendation for merchant approval, then verify one authorized seller response with a fresh PayPal read. The complete PayPal + AI demonstration is not yet verified.

## Actual sandbox dispute imported

The owner created `PP-R-LZQ-10190258` through the buyer Resolution Center. Parley was switched to sandbox mode and its authenticated sync endpoint imported the case successfully. PayPal reports a USD 35 disputed amount (the buyer's requested refund), linked to the completed USD 89 purchase, lifecycle INQUIRY, status UNDER_REVIEW. The returned capability links contain only self/GET; no seller message or offer action is currently exposed.

Actual local Ollama analysis completed through Parley's HTTP workflow and was persisted with provider `OLLAMA:qwen3:4b`. It recommended human review based on the supplied simulated-test note. The deterministic inquiry-status and capability checks blocked execution. No approval, seller message, refund offer, or refund was submitted. The generated draft included an inappropriate suggestion to disregard the test dispute; it remains unsent and is not accepted as a usable buyer response. This confirms authenticated import, actual local inference, audit persistence, and blocking behavior, but does not complete successful seller-action validation.

The USD 35 disputed amount means the existing 40% policy would cap a partial offer at USD 14, even though the original purchase was USD 89. Do not change the policy merely to bypass the rehearsal or describe the buyer's requested USD 35 as an approved offer. Next, inspect the case in the sandbox Resolution Center and refresh its read-only API state once a seller response is available.

## Seller response became available

After the owner opened the business sandbox account, a fresh authenticated read reported WAITING_FOR_SELLER_RESPONSE / INQUIRY. The response includes `send_message` and `make_offer` relations pointing to the expected hyphenated sandbox routes, and explicitly permits REFUND and REFUND_WITH_RETURN offers. This exposed a relation-name compatibility bug: Parley previously recognized only hyphenated relation names. It now recognizes PayPal's underscore relations while continuing to require the exact sandbox origin, same case ID, supported hyphenated endpoint, and POST method. Existing hyphenated fixtures remain compatible. Two regression cases also reject mismatched hosts, cases, methods, relations, and underscore endpoint paths. The full check passed typecheck, lint, 83 tests, and production build; the local server was restarted with the fix.

Reanalysis against the reply-ready record completed, but Qwen3 again recommended manual review because the only returned buyer narrative describes the test setup rather than the simulated damaged item. The inquiry status now passes; the manual-escalation recommendation remains non-executable. No seller action was submitted. A useful scenario-aware recommendation and successful seller-action/read-back rehearsal remain outstanding; the 83 passing tests do not establish model judgment quality.

## Item narrative import corrected, 4 October

Raw PayPal details revealed that the buyer's detailed damaged-item description is stored in `disputed_transactions[].items[].notes`, with the item name in `item_name`. The earlier schema dropped those fields. The importer now preserves item name, description, notes, and reason; the investigator exposes these as provenance-labelled buyer claims, and the inbox displays PayPal's item name. Unknown fields remain excluded. A regression test confirms the narrative is retained and remains untrusted even when it includes malicious instructions.

The revised application context identifies the exclusively sandbox environment without changing policy or execution authority. Initial no-thinking Qwen3 checks still produced unsuitable dismissive wording despite receiving the complete narrative. No such output was approved or sent. A correctly configured USD 680 unauthorized fixture with an injected sandbox/policy-override instruction was blocked by the deterministic human-review threshold, although the generated text was poor. Passing validation is not evidence of sound advice.

Typecheck, lint, 84 tests, production build, and isolated HTTP workflow/E2E checks pass after the import fix. The production server was restarted. A separate local reasoning-mode experiment is being evaluated before any inference-settings change. No seller response or refund has been sent.

## Model evaluation outcome and manual draft

The base model reasoning-mode experiment timed out after 120 seconds; it was not promoted to the application. The official local `qwen3:4b-instruct-2507-q4_K_M` model was downloaded and tested with both the complete current dispute and a USD 680 unauthorized case containing an injected instruction. Its first drafts remained dismissive or inaccurate. Shorter ordered instructions improved the current-case wording but produced a SEND_MESSAGE with an invalid nonzero refund amount; deterministic financial checks rejected it. The unauthorized case was blocked by the human-review threshold. None of these outputs was approved, sent, or stored as an approved application recommendation. The app retains its existing fixed qwen3:4b model and 90-second timeout; the downloaded instruction model remains unused by the app.

The actual import fix is complete and tested. Consecutive PayPal reads were stable. A human-written clarification message is prepared in `docs/rehearsal/SELLER-MESSAGE-DRAFT.md` for explicit merchant approval. It is not model-generated and proposes no refund. The AI-assisted seller-action demonstration remains incomplete; do not report the 84 passing automated tests as evidence of sufficient model judgment.

## Merchant draft editing implemented and verified, 4 October

Parley now supports saving edited or newly written message-only drafts through the authenticated case API and browser editor. Each version has explicit MERCHANT_DRAFT provenance, a DRAFT_SAVED audit record, zero financial amount, and a new approval requirement. Old versions and approvals are preserved for audit but cannot authorize edited content. Stale/concurrent editors, existing submitted actions, ongoing analysis, and client-supplied source/action fields are rejected. Human drafts do not claim model confidence; all other policy and provider capability checks still apply.

Verification passed: typecheck, lint, 97 tests, production build, and expanded isolated HTTP E2E checks. A mocked sandbox integration verifies exact human-authored text through the standard executor and a new matching seller message. Browser review in a separate temporary demo database confirmed save → approve → edit → fresh approval → one simulated execution, including disabling execution while editing. Screenshot: `artifacts/draft-editor-verified.jpg`. This is a simulated browser result, not a live PayPal send.

The main app was restarted with the editor. The actual sandbox case PP-R-LZQ-10190258 was refreshed and an unsent MERCHANT_DRAFT saved; its only failed check is the current WAITING_FOR_BUYER_RESPONSE status. No approval or new message was submitted. The owner must provide the next sandbox buyer reply, then the refreshed case and text must be reviewed and saved again before approval and execution. End-to-end app execution against PayPal remains pending this external step.

## Buyer reply imported and draft ready, 4 October

After the owner sent the sandbox buyer reply, an authenticated refresh returned WAITING_FOR_SELLER_RESPONSE. A fresh MERCHANT_DRAFT version was saved with all policy checks passing and status PENDING. No approval, action, or refund was created. The message is ready for explicit merchant approval, followed by the standard application executor and read-back check.

## Final read-only AI evaluation, 4 October

A further actual Qwen3 4B call against the case containing the new buyer reply completed in 29 seconds. It returned a structurally valid SEND_MESSAGE with zero amount and passed deterministic checks. Human review rejected its wording: it asked again for details already supplied, misstated the escalation threshold in prose, and implied a future USD 35 refund without an approved financial action. This illustrates that structural and policy validation cannot guarantee semantic correctness. The output was retained only as a private evaluation artifact; it did not replace the reviewed merchant draft, receive approval, or send a message. The current submission must demonstrate the merchant review/editing path honestly and must not claim dependable autonomous dispute judgment.
