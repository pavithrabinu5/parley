> **Historical planning, superseded 2026-10-03.** Do not treat claims below as verified implementation or current product positioning. See [audit and corrections](../verification/AUDIT.md), [current architecture](../../ARCHITECTURE.md), and [submission package](../../HACKATHON.md).

# Opportunity Analysis — 18 Project Candidates

**Research date:** 2026-10-03  
Each candidate evaluated for hackathon fit (not all built).

---

## 1. Parley — Inquiry-stage dispute negotiation agent

| Dimension | Summary |
|-----------|---------|
| **Problem** | SMB PayPal merchants miss inquiry windows; disputes escalate to costly chargebacks. |
| **User** | PayPal business sellers, marketplace micro-merchants |
| **Existing** | Chargeflow, ChargePilot, manual Resolution Center |
| **Weakness** | Tools fight chargebacks; merchants bad at **early negotiation** |
| **AI role** | Interpret buyer claim vs fulfillment/transaction context |
| **Agent role** | Investigate → strategize → draft offer/message → execute after approval |
| **PayPal role** | Disputes API, webhooks, make-offer, provide-evidence, accept-claim |
| **Innovation** | Policy-bound **parley** at INQUIRY, not generic chargeback bot |
| **Demo** | Webhook → agent plan → merchant approves → PayPal offer submitted |
| **Business value** | Avoid chargeback fees + protect seller metrics |
| **Risk** | Seen as “another Chargeflow” if pitched wrong |

---

## 2. Mandate — Natural-language spending rules for AI shopping agents

| Dimension | Summary |
|-----------|---------|
| **Problem** | Autonomous agents need guardrails before spending user money |
| **User** | Developers deploying commerce agents |
| **Existing** | Prava, Stripe agent hackathon projects |
| **Weakness** | PayPal-specific mandate + approval story weak vs Stripe mindshare |
| **AI** | Parse NL budgets/vendors |
| **Agent** | Policy agent + payment agent |
| **PayPal** | Orders, captures |
| **Innovation** | Good for Agentic Commerce prize |
| **Risk** | Crowded narrative in 2025–2026 agentic payment events |

---

## 3. PO-to-Pay — Email PO → PayPal invoice agent

| Dimension | Summary |
|-----------|---------|
| **Problem** | B2B orders trapped in email |
| **User** | Small wholesalers |
| **Weakness** | Feels like “ChatGPT + invoice API” |
| **PayPal** | Invoicing |
| **Risk** | High generic-AI score |

---

## 4. Subscription Rescue — Failed billing recovery agent

| Dimension | Summary |
|-----------|---------|
| **Problem** | Involuntary churn on failed payments |
| **User** | Subscription merchants |
| **PayPal** | Subscriptions webhooks, billing |
| **Risk** | Many billing recovery SaaS products |

---

## 5. Shipment Proof Autopilot — ITEM_NOT_RECEIVED evidence only

| Dimension | Summary |
|-----------|---------|
| **Problem** | Merchants lose INR disputes lacking tracking proof |
| **User** | Physical goods sellers |
| **PayPal** | Shipment tracking + provide-evidence |
| **Innovation** | Narrow but deep |
| **Risk** | Too small scope for overall prize; good feature not product |

---

## 6. CrawlerPal-like paywall agent (clone)

| **Risk** | **Reject** — already won Dev Days; instant generic |

---

## 7. Creator milestone escrow via PayPal invoices

| Dimension | Summary |
|-----------|---------|
| **Problem** | Freelance milestone disputes |
| **PayPal** | Invoices, partial payments |
| **AI** | Deliverable vs spec check |
| **Risk** | Hard demo verification; scope creep |

---

## 8. Marketplace payout splitter after AI moderation

| Dimension | Summary |
|-----------|---------|
| **PayPal** | Payouts / multiparty |
| **Risk** | Platform onboarding complexity |

---

## 9. Dispute prompt-injection red-team demo only

| **Reject** | Security demo, not product |

---

## 10. AI procurement from approved vendor catalog

| **Reject** | Generic agentic shopping |

---

## 11. Cross-border invoice compliance copilot

| **Reject** | Low demo wow; regulatory depth |

---

## 12. PayPal webhook ops copilot for non-technical merchants

| Dimension | Summary |
|-----------|---------|
| **Problem** | Merchants don’t understand dispute webhooks |
| **Weakness** | Infra tool, weak end-user story |

---

## 13. Partial refund optimizer (accept-claim PARTIAL_REFUND)

| Dimension | Summary |
|-----------|---------|
| **Note** | Subsumed by Parley strategy agent |

---

## 14. Digital goods streamer chargeback defense

| Dimension | Summary |
|-----------|---------|
| **Niche** | Strong vertical story |
| **Risk** | Smaller TAM narrative for judges |

---

## 15. Agentic BNPL qualification / recovery

| **Reject** | BNPL access unclear in sandbox; buzzword |

---

## 16. Charity conditional release (impact report → payout)

| Dimension | Summary |
|-----------|---------|
| **PayPal** | Payouts |
| **Risk** | Hard to verify impact credibly in hackathon |

---

## 17. Fraudulent invoice detection before send

| Dimension | Summary |
|-----------|---------|
| **PayPal** | Invoicing |
| **Risk** | Feels like ML classifier bolt-on |

---

## 18. Reconciliation agent (email refunds ↔ PayPal captures)

| Dimension | Summary |
|-----------|---------|
| **Problem** | Real for ops teams |
| **Risk** | Low visual demo pop vs dispute negotiation |

---

## Comparative notes (internal)

**Strongest finalists after adversary test:** Parley (#1), Mandate (#2), Milestone escrow (#7).

**Parley wins on:** PayPal structural necessity, measurable merchant impact, differentiated **inquiry negotiation** story, aligns with disputes API depth judges expect from PayPal platform.

**Mandate loses on:** Narrative overlap with 2025 Stripe/agentic commerce winners unless PayPal-specific features dominate.

**Decision:** Proceed with **Parley** (see `project-selection.md`).
