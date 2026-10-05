> **Historical planning, superseded 2026-10-03.** Do not treat claims below as verified implementation or current product positioning. See [audit and corrections](../verification/AUDIT.md), [current architecture](../../ARCHITECTURE.md), and [submission package](../../HACKATHON.md).

# PayPal Platform Capabilities (Verified)

**Research date:** 2026-10-03

## AI / agent integration surfaces

| Capability | Source | Verified use |
|------------|--------|--------------|
| **PayPal Agent Toolkit** (`@paypal/agent-toolkit`, `paypal-agent-toolkit`) | [Agent toolkit quickstart](https://developer.paypal.com/ai-tools/toolkit) (updated June 4, 2026) | TypeScript/Python; LangChain, OpenAI Agents SDK, Vercel AI SDK, MCP, Bedrock, CrewAI |
| **PayPal MCP Server** (`@paypal/mcp`, `npx -y @paypal/mcp`) | [MCP quickstart](https://developer.paypal.com/ai-tools/mcp-server) | Function-calling tools for invoices, orders, disputes (list/get), refunds, etc. |
| **Remote MCP** | docs.paypal.ai | Sandbox: `https://mcp.sandbox.paypal.com/sse` or `/http` |

**Why it matters:** We can use toolkit for agent tools **and** direct REST for actions not exposed in MCP (e.g. dispute `make-offer`).

**Product implication:** Agent layer uses toolkit where possible; dedicated PayPal service for dispute actions with strict policy gates.

## Agent toolkit — enabled action groups (configurable)

From official quickstart configuration pattern:

- **Invoices:** create, list, send, reminder, cancel, QR
- **Orders:** create, get
- **Disputes:** list, get
- **Subscriptions / products / shipment:** various

**Source:** [Agent toolkit quickstart](https://developer.paypal.com/ai-tools/toolkit)

**Implication:** Dispute **response** actions (provide-evidence, make-offer, accept-claim) require **REST** integration beyond list/get.

## Disputes API v1 (structurally important)

**Base:** `https://api-m.sandbox.paypal.com/v1/customer/disputes`

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/customer/disputes` | List disputes |
| `GET /v1/customer/disputes/{id}` | Detail + `allowed_response_options` + evidence requests |
| `POST .../provide-evidence` | Submit proof (tracking, refund IDs, documents) |
| `POST .../make-offer` | **INQUIRY stage only** — merchant offer (refund types, replacement, etc.) |
| `POST .../accept-claim` | Accept liability; PayPal refunds buyer |
| `POST .../send-message` | Message other party |
| Sandbox-only | `require-evidence`, `adjudicate` for testing |

**Sources:**

- [Disputes v1 reference](https://developer.paypal.com/api/customer-disputes/v1/)
- [Use Disputes API](https://developer.paypal.com/api/disputes)
- [Make offer](https://developer.paypal.com/api/customer-disputes/v1/disputes-make-offer)

**Why it matters:** Lifecycle-aware automation (inquiry vs claim) is PayPal-native and hard to replicate on Stripe alone.

**Product implication:** Core product orchestrates **INQUIRY** negotiation and **claim-stage** evidence when appropriate.

## Webhooks (event-driven agents)

Dispute events (official webhook catalog):

- `CUSTOMER.DISPUTE.CREATED`
- `CUSTOMER.DISPUTE.UPDATED`
- `CUSTOMER.DISPUTE.RESOLVED`

Invoicing, orders, captures, subscriptions also available.

**Source:** [Webhook event names](https://developer.paypal.com/api/rest/webhooks/event-names)

**Implication:** Agent pipeline triggered by webhook + polling fallback for demo reliability.

## Sandbox testing

- Buyer creates dispute via sandbox.paypal.com → **Report a problem**
- Webhook simulator available for instant events
- Dispute sandbox test flows documented in [Test and go live](https://developer.paypal.com/disputes/test-go-live)

**Source:** PayPal AI toolkit test-accounts guidance (GitHub `paypal/ai-toolkit`)

## Security / API hygiene (official)

- OAuth2 client credentials; sandbox vs production separation
- `PayPal-Request-Id` on POST/PUT for idempotency
- Webhook signature verification required for production patterns

**Source:** [Making REST API requests](https://developer.paypal.com/api/make-api-requests/)

## PayPal-native test (selected product)

**Could the project exist unchanged without PayPal?**  
For our selected direction: **No** — dispute lifecycle, inquiry `make-offer`, evidence types, and merchant resolution center workflow are PayPal-specific platform semantics.
