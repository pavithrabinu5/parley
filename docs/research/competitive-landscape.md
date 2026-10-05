> **Historical planning, superseded 2026-10-03.** Do not treat claims below as verified implementation or current product positioning. See [audit and corrections](../verification/AUDIT.md), [current architecture](../../ARCHITECTURE.md), and [submission package](../../HACKATHON.md).

# Competitive Landscape — AI × Payments × Commerce

**Research date:** 2026-10-03

## Saturated / high-risk hackathon concepts

Teams will likely build (adversary test):

| Pattern | Examples | Judge risk |
|---------|----------|------------|
| AI shopping / checkout agent | Stripe hackathon “FoodAgent”, Prava agentic commerce events | “Another catalog + checkout bot” |
| Invoice reminder chatbot | PayPal MCP invoice demos | “ChatGPT + invoices” |
| Generic payment dashboard | Sponsor webinar “dashboard without dashboard” | Low innovation |
| Multi-agent architecture slides | 12 agents, no real tools | Buzzword failure |
| RAG over docs + PayPal button | Common enterprise hackathon pattern | Anti-generic-AI failure |

**Implication:** Avoid leading with chat UI; lead with **state change on PayPal dispute/transaction**.

## Agentic payments (adjacent, not PayPal-centric)

| Player / event | Focus | Gap for PayPal hackathon |
|----------------|-------|---------------------------|
| Stripe Agentic Payments Hackathon (2025) | Autonomous checkout, reconciliation | PayPal judges want **PayPal** depth |
| Prava agentic commerce (2026) | Agent spend cards, limits | Different rails; trust layer narrative |
| Locus / YC “agent pays human” | Task marketplace | Not merchant operations |

**Sources:** North Star Stripe event; Devfolio Prava hackathon; LinkedIn recap posts.

## Chargeback / dispute automation (direct competitors)

| Company | Positioning | Strength | Weakness vs our angle |
|---------|-------------|----------|------------------------|
| **Chargeflow** | End-to-end AI chargeback automation, 15k+ merchants | Scale, data network | Multi-PSP; post-chargeback centric marketing |
| **Disputed.ai** | Enterprise chargeback AI | Win-rate focus | Not PayPal-first UX |
| **ChargePilot** | AI drafts + human review; PayPal supported | Human review story | Processor-agnostic; template competitor |

**Sources:** chargeflow.io; disputed.ai funding PR; chargepilot.ai

**White space we target:**

1. **PayPal-only** merchant workflow (Disputes v1 + webhooks + shipment/transaction context).
2. **Inquiry-stage negotiation** (`make-offer`, `send-message`) before claim escalation — prevention narrative, not only “fight chargeback.”
3. **Policy-constrained agent execution** with visible audit trail for judges (AI recommends → deterministic policy → human approves → PayPal REST).

## PayPal ecosystem signals

| Signal | Source | Implication |
|--------|--------|-------------|
| Dev Days 2025 winner **CrawlerPal** | PayPal blog | PayPal rewards creative **agent + PayPal API** workflows |
| Official agent toolkit commerce examples | developer.paypal.com | Support, orders, returns agents — disputes underexplored in examples |
| Dedicated prize **Best Use of Agentic Commerce** | Devpost | Agent must **act** on money workflow |

## Devpost / prior PayPal hackathons

- CrawlerPal: paywall AI agent + PayPal APIs (1st Dev Days 2025).
- Many submissions will use MCP invoice/order tools (obvious path).

**Implication:** Win on **dispute inquiry negotiation** + premium ops UI, not on “first MCP invoice bot.”

## Research gaps (honest)

- Full Devpost “Official Rules” PDF not fetched line-by-line; core requirements verified on main Devpost page.
- Some sponsor prize amounts vary between $67.5k and $69.75k — use Devpost as authority at submission time.
