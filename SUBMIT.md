# Submit Parley

## What remains

1. Finish the approved seller-message rehearsal in Parley and record the result. The sandbox buyer has replied; the prepared merchant message passes every policy check. Sending still requires merchant approval.
2. Publish the source as a **public GitHub repository**, including `LICENSE` and the complete setup instructions. Never upload `.env`, local databases, `artifacts/`, or `node_modules/`.
3. Record the working application and upload a **public YouTube video under three minutes**. Use [the recording script](docs/submission/RECORDING.md).
4. Open the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/), join if needed, and create a submission. Paste [the project description](docs/submission/DEVPOST.md), the GitHub URL, and the YouTube URL. Confirm your eligibility, team details, and tool usage, then submit and check for confirmation.

The [official rules](https://paypalaihackathon.devpost.com/rules), checked 4 October 2026, accept complete local setup instructions instead of paid hosting. The deadline is **12 November 2026 at noon PST**, which is midnight at the start of 13 November in Dubai. Submission is free.

## Fast GitHub publishing

Create an empty public repository named `parley` in your GitHub account. Extract the prepared `parley-source.zip`, then upload the **contents of the extracted folder**, not the zip itself. Preserve the `src`, `prisma`, `scripts`, `tests`, and `docs` folders and the root configuration files. For a folder upload, GitHub Desktop is convenient: add the extracted folder as a repository, make its first commit, then publish it with the private option unchecked.

The public README should display the project name, run commands, MIT license, and links to the submission and verification documents. Open the repository while signed out to confirm it is public. Add the final video URL to the repository description or README when available.

## Judge access

Use [JUDGE.md](JUDGE.md) for setup and testing instructions. The default demo is runnable without credentials and is explicitly simulated. Local AI and PayPal sandbox setup are documented separately. A localhost URL is not a public demo URL; use the public repository and its complete instructions in the submission.

## Claims to keep accurate

- Tests verify the implemented controls; they do not establish universal AI accuracy.
- Local model calls are real. Deterministic demo recommendations are fixtures.
- Human-edited responses are labelled as merchant drafts, never as unmodified AI output.
- A seller message is not a refund, settlement, or closed dispute.
- Signed webhook delivery and a real partial-refund offer have not yet been demonstrated. Manual synchronization supports the recorded workflow.
- No measured revenue savings or dispute win-rate improvement is claimed.

The strongest demonstration is a complete, understandable workflow with visible evidence, policy checks, human review, and a truthful provider result.
