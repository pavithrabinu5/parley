# Copy-ready project description

## Project name

Parley — Evidence before action

## Elevator pitch

An AI-assisted workspace that turns PayPal disputes into evidence-linked recommendations, policy-checked decisions, and merchant-approved responses.

## Inspiration

A small merchant facing a dispute has to understand a buyer's complaint, find supporting records, decide what is reasonable, and respond carefully. We wanted to put that work into one clear workspace while keeping the merchant in control of every external action.

## What it does

Parley imports inquiry-stage PayPal disputes and organizes messages, item descriptions, transaction references, and submitted evidence by source. A local AI model proposes a next step, explains uncertainty, and drafts a buyer response.

Before anything can be submitted, deterministic checks evaluate the case state, PayPal's available actions, merchant limits, currency, evidence references, and the proposed amount. The merchant reviews the exact text and action. An unsuitable draft can be replaced with an explicitly labelled merchant-written message; editing requires a new approval.

Approval and execution are separate. Immediately before submission, Parley reads the current case and validates again. It reserves one action per case and reads PayPal afterward to distinguish an acknowledged request from a newly verified response. Its activity log preserves the decision history.

## How we built it

The application uses Next.js, React, TypeScript, Prisma, SQLite, and Zod. PayPal sandbox REST supplies OAuth, dispute reads, supported seller-message and partial-refund-offer endpoints, and webhook signature verification. Ollama runs Qwen3 4B locally for structured recommendations without paid API credits. Optional cloud adapters are explicit choices, never automatic fallbacks.

The model has no execution tools or access to credentials. Policy checks and the execution service determine what may proceed. Signed workspace sessions, origin checks, version-bound approvals, expiry, and duplicate-action protection support the review workflow.

## Challenges we ran into

The real PayPal record exposed details that simplified fixtures missed: action relations used underscore names, and the buyer's detailed item narrative was nested inside transaction item notes. We corrected both and added regression coverage.

Small local models also produced inconsistent wording. Instead of treating valid JSON as sufficient evidence of a sound decision, we made the source material visible and added a merchant editing flow with clear authorship and fresh approval. This is a practical limit of the prototype, and a central reason that human review remains part of the product.

## Accomplishments

We built a coherent merchant workflow from evidence review through controlled execution and provider reconciliation. The current automated suite passes 97 tests, plus type checking, lint, production build, and isolated HTTP end-to-end checks. Actual sandbox purchase, dispute import, buyer/seller message retrieval, and local model inference have been exercised. The credential-free demonstration is runnable from a fresh checkout and clearly labels simulated data.

Consult the repository's current sandbox rehearsal report for the latest live execution result. We distinguish actual provider observations, mocked tests, and simulated demonstrations rather than presenting them as interchangeable proof.

## What we learned

Useful AI in merchant operations needs more than a generated answer. The merchant needs to see where a claim came from, what is missing, what an action would cost, and what the payment provider actually confirmed. Approval must authorize a specific version, and an uncertain network outcome must not lead to an automatic duplicate submission.

## What's next

Evaluate recommendation quality across a broader dispute set, test real signed webhook delivery, validate usefulness with merchants, and expand supported dispute states only after their evidence and execution requirements are tested. Production deployment would also require stronger identity, access management, and operational controls.

## Built with

PayPal Sandbox, PayPal Disputes REST API, Ollama, Qwen3, Next.js, React, TypeScript, Prisma, SQLite, Zod, Vitest.

## Tool disclosure

Codex assisted with implementation, debugging, testing, and documentation. Runtime analysis uses the explicitly selected model provider. Demo mode uses labelled deterministic fixtures. No sponsor-specific prize qualification is claimed for tools not used.
