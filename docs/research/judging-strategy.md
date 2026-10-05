> **Historical planning, superseded 2026-10-03.** Do not treat claims below as verified implementation or current product positioning. See [audit and corrections](../verification/AUDIT.md), [current architecture](../../ARCHITECTURE.md), and [submission package](../../HACKATHON.md).

# Judging Strategy

**Target hackathon:** PayPal AI Hackathon 2026  
**Product:** Parley

## Criteria → evidence map

| Official criterion | What judges should see | How we prove it |
|--------------------|------------------------|-----------------|
| **Technological Implementation** | Real PayPal sandbox calls, webhook handling, agent tool use | Audit trail + API logs; REST dispute actions; toolkit for read paths |
| **Design** | Premium merchant ops UI: dispute inbox, agent timeline, approval drawer | Polished Next.js UI; empty/loading/error states |
| **Potential Impact** | SMB merchants lose margin to escalated disputes | Explain inquiry window + fee avoidance; demo math labeled “illustrative” |
| **Innovation/Idea** | Inquiry **parley** not post-chargeback dashboard | Copy + workflow name; compare to Resolution Center manual flow |
| **Presentation** | 60s problem, 90s live workflow, 30s impact | `docs/demo/demo-script.md` |

## Prize category targeting

| Prize | Story |
|-------|-------|
| Best Use of PayPal + AI | Disputes v1 lifecycle + webhooks + agent toolkit |
| Best Use of Agentic Commerce | Agents negotiate payment outcomes (offers/refunds/evidence) |
| Best Demo Delivery | Golden path + demo mode reliability |
| Most Impactful | Merchant time saved + escalation prevented |

## 60-second judge memory test

| Question | Answer |
|----------|--------|
| What does it do? | AI agents investigate PayPal disputes and recommend/execute approved resolutions. |
| Who needs it? | PayPal sellers without a chargeback team. |
| Why AI? | Interprets messy buyer claims and chooses among PayPal-allowed responses. |
| Why PayPal? | Uses inquiry offers, evidence types, and webhooks native to PayPal disputes. |
| What’s unusual? | **Negotiate before chargeback** with policy-bound agents, not a chatbot. |
| What happened in demo? | Dispute opened → agents analyzed → merchant approved → PayPal offer sent. |

## Presentation dual explanations

| Technical | Judge-facing |
|-----------|--------------|
| Event-driven orchestration with tool-constrained agents and deterministic policy enforcement | When a buyer opens a dispute, specialized AI agents review the case, propose a fair resolution, and only after you approve, Parley talks to PayPal for you |

## Devpost narrative hooks

- Inspiration: PayPal Resolution Center is powerful but slow for solo merchants.
- Built with: Next.js, PayPal Disputes API, Agent Toolkit, OpenAI structured outputs.
- Honest limitation: Not a substitute for legal advice; human approval required.

## Demo judge checklist

- [ ] PayPal logo / sandbox badge visible
- [ ] Agent steps visible (not black box)
- [ ] Before/after dispute status
- [ ] No copyrighted music in video
- [ ] Under 3 minutes
