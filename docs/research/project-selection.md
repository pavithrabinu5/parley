> **Historical planning, superseded 2026-10-03.** Do not treat claims below as verified implementation or current product positioning. See [audit and corrections](../verification/AUDIT.md), [current architecture](../../ARCHITECTURE.md), and [submission package](../../HACKATHON.md).

# Project Selection

**Date:** 2026-10-03  
**Selected product:** **Parley**

## One-sentence pitch

**Parley** is a policy-guarded AI agent team that investigates PayPal buyer disputes and negotiates inquiry-stage resolutions before they become chargebacks.

## Decision matrix (internal scoring 1–5, higher better)

| Criterion | Parley | Mandate | PO-to-Pay | Sub Rescue |
|-----------|--------|---------|-----------|------------|
| PayPal integration depth | 5 | 4 | 4 | 4 |
| AI necessity | 5 | 4 | 3 | 3 |
| Agentic value | 5 | 5 | 2 | 3 |
| Originality | 4 | 3 | 2 | 2 |
| Business impact clarity | 5 | 3 | 4 | 4 |
| Demo reliability | 3 | 5 | 4 | 3 |
| Technical feasibility | 4 | 5 | 5 | 4 |
| Judge memorability | 4 | 4 | 2 | 3 |
| Anti-generic-AI pass | 4 | 4 | 2 | 3 |
| **Weighted total** | **42** | **38** | **28** | **31** |

Weights favor PayPal depth, impact, and differentiation over pure demo ease.

## Mitigation for Parley demo risk (score 3)

1. **Demo mode** with seeded dispute + simulated webhook payload matching PayPal schema.
2. **Live sandbox path** documented for judges with PayPal test accounts.
3. **Webhook simulator** + polling fallback.
4. Single golden-path scenario rehearsed for video.

## Red-team summary (pre-build)

| Attack | Response |
|--------|----------|
| “Just Chargeflow for PayPal” | Lead with **inquiry negotiation** + merchant NL policy + approval gate + PayPal-only lifecycle UX |
| “AI unnecessary” | Unstructured buyer messages + multi-signal strategy (refund vs fight vs offer) |
| “PayPal superficial” | Webhook-driven workflow; real `make-offer` / `provide-evidence` / `accept-claim` |
| “Fake agents” | Separate tools per role; structured JSON decisions; audit log |
| “LLM controls money” | **Blocked** — policy engine + human approval required for execution |

## Final pivot check

Knowing PayPal prizes **agentic commerce** and **PayPal+AI**, and that invoice bots will be common, **Parley** remains the strongest executable differentiation within hackathon time.

**Commit to execution.**
