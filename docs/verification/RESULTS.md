# Verification report

Updated 4 October 2026; original local verification was on 3 October. This report distinguishes executable integration code from live provider validation.

Subsequent credentialed checks are recorded in [Sandbox rehearsal status](SANDBOX-REHEARSAL.md). PayPal authentication, dispute listing, and local Ollama inference now pass. The latest full check passes 97 tests plus typecheck, lint, and production build; the HTTP E2E suite also passes. The complete PayPal dispute rehearsal remains pending. The test count below reflects the latest full check; dependency and initial browser audit notes describe the original run.

## Automated checks

| Command                       | Result                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `npm run typecheck`           | Passed; Next.js route types and TypeScript                                     |
| `npm run lint`                | Passed                                                                         |
| `npm test`                    | 97 tests passed across five files                                              |
| `npm run build`               | Passed; Prisma generation and Next.js 16.3.8 production Webpack build          |
| `npm run test:e2e`            | Passed against a production HTTP server and isolated temporary SQLite database |
| `npm audit --omit=dev --json` | Zero reported runtime dependency vulnerabilities at verification time          |

`npm run check` executes the first four checks together. The E2E script initializes migrations, starts the production server on port 3107, runs the demo workflow, and restarts in sandbox mode to verify authentication and environment isolation. It does not contact PayPal or OpenAI. The local environment required elevated permission to bind a listening port and access the npm audit service; the resulting checks succeeded.

## What the tests establish

- Integer monetary limits, percentage limits, USD-only actions, high-value/unauthorized escalation, inquiry lifecycle gates, capability links and allowed offer types.
- Structured model response validation, unknown evidence rejection, refusal/incomplete/provider error handling, missing credentials, and no fixture fallback in sandbox.
- Untrusted case content is separated from instructions, secrets are absent from model inputs, no tools are supplied, and deterministic policy cannot be changed through model output. These are boundary tests, not a claim of perfect semantic prompt-injection immunity.
- Real SQLite persistence, separate approval and execution, rejected/expired/cross-case approvals, policy/snapshot invalidation, concurrent execution reservation, and older snapshot rejection.
- Bounded sandbox transport, expired-token read recovery, no mutation retry, invalid webhook signatures, replay deduplication, retry after failed processing, and uncertain-outcome locking.
- Read-back requires a newly observed matching offer or seller message. An unchanged record or status-only change is insufficient proof.
- Signed-session authentication, forged-session rejection, exact-origin CSRF enforcement, streaming body size limits, and demo/sandbox isolation.

PayPal transport and OpenAI responses are mocked in automated integration tests. They validate our contract and control flow, not remote account permissions or actual provider behavior.

## Browser review

The production application was reviewed in the Codex browser at desktop (1440 × 1000) and mobile (390 × 844) sizes. Neither viewport had horizontal document overflow. Checks covered empty state, seeded cases, evidence/recommendation/activity tabs, separate approval and simulated execution, outcome display, policy editing and approval invalidation, and the blocked high-value case. The temporary viewport override was reset after review.

The demo uses deterministic, labelled fixtures. Browser review is not a comprehensive accessibility audit or a live payment test.

## Dependency and secret review

Unused dependencies were removed. Prisma's development configuration dependencies were updated through scoped overrides to patched Effect and deepmerge-ts releases; client generation, migration setup, and the complete build/tests pass with those overrides.

The full development dependency audit still reports the unpatched [braces stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), propagated through the Next.js ESLint plugin's glob dependencies. It affects development/lint tooling and is excluded from the zero-vulnerability runtime audit. No buyer content is passed to these glob tools. This remaining advisory is disclosed rather than hidden by an incompatible framework downgrade. Recheck before release as upstream fixes become available.

The repository had no commits at audit time, so no committed history existed to inspect. Application source and configuration contained no concrete credentials. `.gitignore` excludes local environment files (except the placeholder `.env.example`), private key files, databases and journals, and generated build/test artifacts. Server credential environment names were checked against the generated browser JavaScript and were not found. No real secrets were provisioned during this task.

## Remaining external validation

1. PayPal credentials, the inquiry, and no-credit local Ollama inference are configured. The buyer has replied and the prepared merchant message passes policy checks. In-app approval, sending, and read-back remain pending merchant approval. No OpenAI credits are required.
2. A registered sandbox webhook ID and reachable HTTPS endpoint are needed to test genuine signed event delivery.
3. Record a real supported action, preserve its PayPal debug ID and read-back outcome, and corroborate it in the sandbox Resolution Center. Never call an acknowledged or simulated action verified.
4. Public repository publishing, video upload, entrant eligibility confirmation, and Devpost submission remain external steps. No deployment or publication was performed.

The locally runnable prototype and fallback are verified. A successful real PayPal + AI golden demo is **not yet verified**.
