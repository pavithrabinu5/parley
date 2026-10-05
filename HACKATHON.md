# Parley — submission package

## Verified event requirements (2026-10-04)

Deadline: **12 November 2026, noon PST (20:00 UTC; midnight starting 13 November in Dubai)**. Judging: December 1–15; winners expected around December 21. Rules specify an October 1 opening, while PayPal's event listing also displays October 2; use the rules for dates. Entrants must check their own eligibility and exclusions. [Official rules](https://paypalaihackathon.devpost.com/rules), [PayPal event listing](https://developer.paypal.com/community/events/).

Meaningful PayPal sandbox integration and meaningful AI are required. Submit a working build or complete runnable instructions, public GitHub source with an open-source license, tool usage description, and a publicly visible YouTube demo under three minutes. Judging covers implementation, design, impact, innovation, and presentation. Overall awards are $12k/$8k/$5k; relevant special awards include PayPal + AI, Agentic Commerce, Demo Delivery, and Impact ($5k each). Sponsor tools are optional. The page lists $67,500 cash and $69,750 total with other prizes. [Organizer's overview](https://paypalaihackathon.devpost.com/).

For the shortest route to submission, use [SUBMIT.md](SUBMIT.md), [the copy-ready Devpost description](docs/submission/DEVPOST.md), and [judge instructions](JUDGE.md).

## Final title

**Parley — Evidence before action**

## One-line pitch

Parley investigates PayPal disputes, explains a policy-checked response, and executes only the action a merchant explicitly approves.

## Short description

A merchant workspace for inquiry-stage PayPal disputes. Parley turns buyer messages and source-labelled records into structured recommendations, checks merchant limits and PayPal capabilities, and separates approval, execution, and verification in an auditable workflow.

## Full description

A buyer's dispute can leave a small merchant juggling a payment record, an ambiguous complaint, missing evidence, and an urgent response. Parley brings that work into a single reviewable case.

The investigator retrieves the PayPal dispute and preserves the provenance of each transaction reference, message, and submitted evidence item. A structured AI analyst evaluates the record, identifies uncertainty, proposes a supported next step, and drafts the buyer communication. It cannot call PayPal or modify merchant policy.

A deterministic engine checks the case identity, inquiry state, currency, case value, confidence threshold, evidence references, shipment requirement, PayPal capabilities, financial limits, and draft availability. The merchant sees the exact action, amount, message, rationale, risks, and missing evidence before approving. Execution then reads the current PayPal record and validates again.

The backend reserves one action per case before sending a request. After submission it reads PayPal again, distinguishing acknowledgement from verified action and from dispute resolution. Uncertain outcomes remain locked against repeat submission. Case changes and policy changes invalidate earlier approvals.

The prototype implements partial refund offers and buyer messages for USD inquiry cases. A clearly labelled deterministic demo works without credentials. Sandbox mode contains the actual OAuth, dispute, webhook, AI, and execution integrations and never silently substitutes fixtures. PayPal OAuth, dispute retrieval, and import of an externally sent seller message have been verified. Local AI calls work but draft quality remains unreliable. Merchants can now edit or replace a draft with an explicitly labelled message-only version, which requires fresh approval and uses the same guarded execution flow. A successful in-app approval, execution, and verification rehearsal is still required before submission. Local Ollama with Qwen3 4B is the default provider and requires no API credits. Gemini and OpenAI remain explicit optional providers.

## Problem and solution

**Audience:** small PayPal merchants without a dedicated dispute operations team.

**Problem hypothesis:** gathering context and selecting an appropriate response takes attention, and a wrong response can create financial exposure. This is not yet validated through merchant interviews.

**Solution demonstrated in labelled fixtures:** a complete case workflow that preserves evidence provenance and ties a specific merchant-approved recommendation to one controlled submission attempt. Actual sandbox checks verify import and local inference; the manually sent seller response does not establish execution through Parley.

## AI explanation

One provider-selected structured-output call (local Ollama by default, Gemini/OpenAI optional) combines the Strategist and Composer. It interprets unstructured buyer language in context, identifies ambiguity, evaluates a supported resolution, and produces concise rationale and a buyer draft. The deterministic investigator supplies context. In demo mode, recommendations are explicitly fixtures, not claimed model results. AI usefulness should be demonstrated with two differing real sandbox narratives, not merely a model badge.

## PayPal explanation

Direct sandbox REST: client-credentials OAuth, list disputes, show dispute details, `make-offer`, `send-message`, and verify webhook signature. The app receives the three customer dispute webhook events. Transaction IDs and submitted tracking are read from the dispute response. No Orders API, carrier API, Toolkit, MCP, production payments, evidence upload, or claim-acceptance usage is claimed.

## Innovation

The distinctive submission story is an inspectable chain from evidence to policy to explicit approval to provider confirmation. Capability-aware decisions and uncertain-outcome handling are visible product features. Inquiry automation itself is not new: established vendors already offer it. Parley does not claim to be the first dispute agent or outperform those vendors.

## Impact

Intended impact: reduce merchant effort assembling context and reduce unsafe or unsupported responses. The demo shows a concrete task completed, not a measured business result. No claim of reduced fees, prevented card chargebacks, recovered revenue, or improved win rate is supported yet.

## Technical highlights

- TypeScript/Next.js 16 merchant application with SQLite/Prisma persistence.
- Zod-validated structured recommendations and bounded monetary action schema.
- No execution tools or policy-write tools exposed to the model.
- Dynamic PayPal action links and offer types, never invented capabilities.
- Versioned policies, fingerprint-bound approvals, expiry, and execution revalidation.
- Unique durable action reservation; no automatic dispute POST retries.
- Read-back comparison against a saved pre-action record.
- Signed sessions, CSRF checks, verified webhooks, replay handling, safe errors.
- Automated safety and integration tests; isolated production HTTP demo test.

## Demo script

Use the exact 2:40 sequence in [DEMO.md](DEMO.md): case → evidence → recommendation → checks → merchant approval → execution → result → activity → blocked high-value case. For the final recording prefer the real sandbox path and retain environment labels. Show any pending verification honestly. Keep the fallback clearly labelled.

## Partner technology decision

Reviewed organizer-listed sponsors: AG Grid, APIMatic, Astropods, Bryntum, Channel3, Elastic, KERNEL, Postman, Render, Zapier. A small inbox does not justify another grid, retrieval engine, automation platform, or browser agent. Direct schemas and tests fit the scope better. Render could host the single persistent Node service; deployment is not performed or claimed. No sponsor-prize qualification is claimed without using that sponsor's technology.

## Submission checklist

- [x] Source, MIT license, environment template, architecture, setup/run instructions.
- [x] Runnable deterministic fallback and implemented sandbox/AI paths.
- [x] Submission description, technical explanation, and timed script.
- [x] Configure sandbox credentials and run actual local AI inference.
- [x] Import the real sandbox dispute and subsequent buyer reply.
- [ ] Complete the approved in-app seller send and read-back rehearsal.
- [ ] Record the successful real action and provider verification evidence.
- [x] Publish public GitHub repository: [pavithrabinu5/parley](https://github.com/pavithrabinu5/parley).
- [ ] Record/upload public YouTube video; enter its link.
- [ ] Confirm entrant eligibility and submit the Devpost form before the deadline.

Do not mark this submission-ready until the unchecked external steps are complete.
