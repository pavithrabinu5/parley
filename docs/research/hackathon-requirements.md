> **Historical planning, superseded 2026-10-03.** Do not treat claims below as verified implementation or current product positioning. See [audit and corrections](../verification/AUDIT.md), [current architecture](../../ARCHITECTURE.md), and [submission package](../../HACKATHON.md).

# PayPal AI Hackathon 2026 — Official Requirements

**Research date:** 2026-10-03  
**Primary source:** [PayPal AI Hackathon Devpost](https://paypalaihackathon.devpost.com/)

## Finding: Event identity and timeline

| Item | Detail |
|------|--------|
| Name | Build What's Next with PayPal and AI |
| Format | Global, online, public |
| Submission window | Opens Oct 1, 2026; deadline **Nov 12, 2026 @ 12:00pm PST** (also listed as 3:00pm EST) |
| Judging | After submission close; winners announced ~Dec 21, 2026 |
| Prize pool | **$67,500+ cash** (page also mentions $69,750 total including credits) |

**Why it matters:** We have ~6 weeks from today (Oct 3) to ship, document, and record a reliable demo.

**Product implication:** Scope must fit a small team; demo reliability beats feature breadth.

## Finding: Core technical requirements

1. **PayPal:** Integrate PayPal developer platform using **free sandbox** (at minimum one API, SDK, product, or developer capability).
2. **AI:** Meaningfully incorporate an AI tool, model, or platform (any vendor; sponsor tools optional).
3. **Working prototype:** Judges must run or interact with a real build (hosted URL **or** complete repo instructions). Mockups alone fail.
4. **GitHub:** Public repo, open-source license visible, full source + run instructions.
5. **Video:** YouTube, public, **under 3 minutes**, shows product functioning.

**Sources:** Devpost “What to Build” / “What to Submit” sections.

**Why it matters:** Architecture must be clone-and-run friendly; sandbox-first; no fake payments.

**Product implication:** Include `.env.example`, seed demo mode, and hosted deploy path (e.g. Render sponsor credits).

## Finding: Judging criteria (official)

1. **Technological Implementation** — Depth of PayPal + AI; non-trivial working implementation.
2. **Design** — Coherent product experience, not a bare POC.
3. **Potential Impact** — Real problem, real audience, demonstrated fit.
4. **Innovation/Idea** — Novelty vs existing concepts.
5. **Presentation** — Video shows E2E; clear problem / user / why it matters.

**Source:** Devpost “Judging Criteria”.

**Why it matters:** Optimize for one memorable workflow + clear pitch, not feature laundry list.

**Product implication:** Single wow workflow; UI explains agent + PayPal steps.

## Finding: Prize categories aligned with strategy

| Prize | Amount | Relevance |
|-------|--------|-----------|
| 1st / 2nd / 3rd | $12k / $8k / $5k | Overall execution |
| Most Impactful | (listed) | Quantified merchant value |
| Best Demo Delivery | $5k | Reliable live path |
| **Best Use of PayPal + AI** | $5k | Deep platform integration |
| **Best Use of Agentic Commerce** | $5k | Agent + money workflow |

**Source:** Devpost prizes section.

**Product implication:** Project should visibly be **agent-driven commerce/payment operations**, not decorative chat.

## Finding: Eligibility and restrictions

- Age of majority+; standard Devpost country exceptions.
- PayPal employees excluded (standard hackathon rules on full rules page).
- New or existing projects allowed if **meaningful progress during the hackathon period**.

**Product implication:** Greenfield is fine.

## Finding: PayPal-hosted webinars (build hints)

- Oct 6, 7, 12, 13, 2026 — onboarding, APIMatic, dashboards, etc.

**Product implication:** Optional sponsor integrations (AG Grid for dispute analytics UI could help AG Grid prize track).

## Engineering requirements derived from rules

- [ ] Sandbox PayPal credentials via env vars only
- [ ] Real API calls with idempotency (`PayPal-Request-Id` on mutating calls)
- [ ] Open license (MIT/Apache-2.0)
- [ ] README with sandbox setup + demo script
- [ ] ≤3 min demo video script in repo
- [ ] Human-in-the-loop for any money movement (best practice + our security model)
