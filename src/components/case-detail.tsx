"use client";
import { useState } from "react";
import type { CaseView } from "@/lib/store";
import { MERCHANT_DRAFT_PROVIDER } from "@/lib/domain";
import { Icon } from "./icons";
export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount / 100,
  );
export const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (x) => x.toUpperCase());
export const date = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  });
export function Status({ value }: { value: string }) {
  return (
    <span
      className={`badge ${["PENDING", "AWAITING_APPROVAL", "APPROVED"].includes(value) ? "amber" : ["NEEDS_REVIEW", "BLOCKED", "FAILED", "UNCERTAIN", "UNVERIFIED", "NEEDS_RECONCILIATION", "ANALYSIS_FAILED"].includes(value) ? "red" : "green"}`}
    >
      <span className="dot" />
      {label(value)}
    </span>
  );
}
export function CaseDetail({
  item,
  busy,
  action,
  saveDraft,
}: {
  item: CaseView;
  busy: boolean;
  action: (operation: string) => void;
  saveDraft: (message: string) => void;
}) {
  const [tab, setTab] = useState("Recommendation");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(
    item.recommendation?.payload.buyerMessage ?? "",
  );
  const r = item.recommendation;
  const p = r?.payload;
  const d = item.dispute;
  const merchantDraft = r?.provider === MERCHANT_DRAFT_PROVIDER;
  const blocked =
    r &&
    (!r.validation.allowed ||
      ["BLOCKED", "REJECTED", "STALE"].includes(r.status));
  return (
    <section className="case-panel" aria-label="Selected dispute">
      <div className="case-heading">
        <div>
          <div className="eyebrow">
            CASE WORKSPACE{" "}
            <span>
              {" "}
              / {item.mode === "demo" ? "SIMULATED" : "PAYPAL SANDBOX"}
            </span>
          </div>
          <h2>
            {d.disputed_transactions[0]?.buyer?.name ?? "PayPal buyer"}
            <span>
              {d.dispute_amount.currency_code} {d.dispute_amount.value}
            </span>
          </h2>
          <p>
            {label(d.reason).replace("Merchandise or service", "Item")}{" "}
            <span className="separator">·</span> {d.dispute_id}
          </p>
        </div>
        <Status value={item.status} />
      </div>
      <div className="case-meta">
        <span>
          <Icon name="inbox" size={15} />
          {label(d.dispute_life_cycle_stage)}
        </span>
        <span>
          <Icon name="clock" size={15} />
          Opened {date(d.create_time)}
        </span>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => action("refresh")}
        >
          <Icon name="refresh" size={14} />
          Refresh record
        </button>
      </div>
      <div className="detail-tabs" role="tablist" aria-label="Case sections">
        {["Recommendation", "Evidence", "Activity"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Evidence" && <span>{item.evidence.length}</span>}
            {t === "Activity" && <span>{item.audit.length}</span>}
          </button>
        ))}
      </div>
      {tab === "Recommendation" && (
        <div className="detail-content">
          <div className="buyer-note">
            <div className="section-label">
              <Icon name="file" size={15} />
              THE BUYER’S MESSAGE <span>Unverified claim</span>
            </div>
            <p>
              “
              {d.messages.filter((m) => m.posted_by === "BUYER").at(-1)
                ?.content ??
                "No buyer message is available in the dispute record."}
              ”
            </p>
          </div>
          {!p && (
            <div className="analysis-empty">
              <div className="icon-tile">
                <Icon name="spark" size={25} />
              </div>
              <h3>Bring the case into focus.</h3>
              <p>
                Investigate the record, identify missing evidence, and prepare a
                policy-checked next step.
              </p>
              <button
                className="primary"
                disabled={busy || !!item.action}
                onClick={() => action("analyze")}
              >
                <Icon name="spark" />
                {busy ? "Investigating…" : "Investigate case"}
              </button>
            </div>
          )}
          {p && r && (
            <>
              <div
                className={`recommendation-card ${blocked ? "blocked" : ""}`}
              >
                <div className="recommendation-top">
                  <span className="section-label">
                    <Icon name="spark" size={16} />
                    {merchantDraft
                      ? "MERCHANT-WRITTEN MESSAGE"
                      : r.provider === "DEMO_FIXTURE"
                        ? "DEMO RECOMMENDATION"
                        : "AI RECOMMENDATION"}
                  </span>
                  {!merchantDraft && (
                    <span
                      className="confidence"
                      title="A model-reported score, not a calibrated probability"
                    >
                      {Math.round(p.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <h3>
                  {p.recommendedAction === "MAKE_OFFER"
                    ? `Offer a ${money(p.amountCents)} partial refund`
                    : p.recommendedAction === "SEND_MESSAGE"
                      ? merchantDraft
                        ? "Send your reviewed message"
                        : "Request the missing context"
                      : "Bring in a specialist"}
                </h3>
                <p>{p.summary}</p>
                <div className="recommendation-footer">
                  <Icon name="shield" size={15} />
                  {p.recommendedAction === "MAKE_OFFER"
                    ? "Buyer acceptance required · No return requested"
                    : "No financial transfer proposed"}
                </div>
              </div>
              <section className="why">
                <h3>Why this action?</h3>
                <p>{p.rationale}</p>
                <div className="evidence-chips">
                  {p.evidenceIds.map((id) => (
                    <button key={id} onClick={() => setTab("Evidence")}>
                      <Icon name="file" size={13} />
                      {item.evidence.find((e) => e.id === id)?.label ?? id}
                    </button>
                  ))}
                </div>
              </section>
              <div className="section-heading">
                <h3>Guardrails</h3>
                <span>
                  {r.validation.checks.filter((c) => c.passed).length}/
                  {r.validation.checks.length} checks passed · Policy v
                  {r.policyVersion}
                </span>
              </div>
              <div className="checks">
                {r.validation.checks.map((c) => (
                  <details key={c.name} className={c.passed ? "pass" : "fail"}>
                    <summary>
                      <Icon name={c.passed ? "check" : "alert"} size={15} />
                      {c.name}
                      <span>{c.passed ? "Passed" : "Blocked"}</span>
                    </summary>
                    <p>{c.detail}</p>
                  </details>
                ))}
              </div>
              <details className="risk-box">
                <summary>
                  <Icon name="alert" size={16} />
                  Risks & missing evidence
                  <span>{p.risks.length + p.missingEvidence.length}</span>
                </summary>
                <ul>
                  {[...p.risks, ...p.missingEvidence].map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </details>
              {p.buyerMessage && (
                <section className="draft">
                  <div className="section-heading">
                    <h3>Message for the buyer</h3>
                    <span>Exact text for approval</span>
                  </div>
                  <p>{p.buyerMessage}</p>
                </section>
              )}
              <div className="impact">
                <Icon name="shield" size={17} />
                <p>{p.merchantImpact}</p>
              </div>
              {item.action ? (
                <div className="outcome" role="status">
                  <div className="section-heading">
                    <h3>
                      {item.action.state === "SIMULATED"
                        ? "Demo action recorded"
                        : "PayPal execution"}
                    </h3>
                    <Status value={item.action.state} />
                  </div>
                  <p>
                    {item.action.outcome ??
                      "Execution reserved. Reconcile to inspect the provider result."}
                  </p>
                  <code>{item.action.id}</code>
                  {item.action.httpStatus && (
                    <small>
                      PayPal HTTP {item.action.httpStatus} · Debug ID:{" "}
                      {item.action.debugId ?? "not provided"}
                    </small>
                  )}
                  {item.mode === "sandbox" &&
                    item.action.state !== "VERIFIED" && (
                      <button
                        disabled={busy}
                        className="secondary"
                        onClick={() => action("reconcile")}
                      >
                        <Icon name="refresh" />
                        Reconcile with PayPal
                      </button>
                    )}
                </div>
              ) : (
                <div className="approval-box">
                  <div>
                    <Icon name="lock" size={17} />
                    <strong>
                      {r.status === "APPROVED"
                        ? "Approved by merchant"
                        : blocked
                          ? `Action ${label(r.status).toLowerCase()}`
                          : "You stay in control"}
                    </strong>
                  </div>
                  <p>
                    {r.status === "APPROVED"
                      ? "Approval is recorded. Execute once to submit the exact action shown above."
                      : blocked
                        ? p.nextStep
                        : "Review the evidence, amount, and message. Your explicit approval is required before execution."}
                  </p>
                  <div className="button-row">
                    {r.status === "PENDING" && (
                      <>
                        <button
                          className="secondary"
                          disabled={busy || editing}
                          onClick={() => action("reject")}
                        >
                          Decline
                        </button>
                        <button
                          className="primary"
                          disabled={busy || editing || !r.validation.allowed}
                          onClick={() => action("approve")}
                        >
                          <Icon name="check" />
                          Approve recommendation
                        </button>
                      </>
                    )}
                    {r.status === "APPROVED" && (
                      <button
                        className="primary"
                        disabled={busy || editing}
                        onClick={() => action("execute")}
                      >
                        <Icon name="arrow" />
                        {item.mode === "demo"
                          ? "Simulate approved action"
                          : "Execute in PayPal sandbox"}
                      </button>
                    )}
                    {!["PENDING", "APPROVED"].includes(r.status) && (
                      <button
                        className="secondary"
                        disabled={busy || editing}
                        onClick={() => action("analyze")}
                      >
                        <Icon name="refresh" />
                        Analyze again
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {!item.action && (
            <section className="draft-editor">
              <h3>Write or edit a message</h3>
              <p>
                Replace the proposed action with a merchant-written message. No
                refund will be proposed. Saving creates a new version that needs
                approval.
              </p>
              {!editing ? (
                <button
                  className="secondary"
                  disabled={busy || item.status === "ANALYZING"}
                  onClick={() => setEditing(true)}
                >
                  {p?.buyerMessage ? "Edit as message only" : "Write a message"}
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveDraft(message);
                  }}
                >
                  <label htmlFor="merchant-message">
                    Exact message for the buyer
                  </label>
                  <textarea
                    id="merchant-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    rows={6}
                    required
                    disabled={busy}
                  />
                  <small>
                    {message.length}/2000 characters · Saving does not send
                  </small>
                  <div className="button-row">
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        setMessage(p?.buyerMessage ?? "");
                        setEditing(false);
                      }}
                    >
                      Cancel edit
                    </button>
                    <button
                      className="primary"
                      disabled={busy || !message.trim()}
                    >
                      Save message for review
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
        </div>
      )}
      {tab === "Evidence" && (
        <div className="detail-content">
          <div className="section-heading">
            <h3>Every claim has a source.</h3>
            <span>{item.evidence.length} records</span>
          </div>
          <p className="muted">
            {item.mode === "demo"
              ? "All records below are seeded fixtures."
              : "Retrieved from PayPal sandbox."}{" "}
            Submitted claims are not independently verified. No carrier lookup
            is performed.
          </p>
          <div className="evidence-list">
            {item.evidence.map((e) => (
              <article key={e.id}>
                <div className="section-heading">
                  <h3>
                    <Icon name="file" />
                    {e.label}
                  </h3>
                  <span>{label(e.trust.replaceAll("-", "_"))}</span>
                </div>
                <p>{e.detail}</p>
                <code>{e.source}</code>
                <small>Reference: {e.id}</small>
              </article>
            ))}
          </div>
          <div className="capability-record">
            <h3>PayPal response capabilities</h3>
            <p>Offer types in the retrieved record:</p>
            <code>
              {JSON.stringify(
                d.allowed_response_options?.make_offer?.offer_types ?? [],
              )}
            </code>
            <p>
              Action links:{" "}
              {d.links
                .filter((l) => l.method === "POST")
                .map((l) => l.rel)
                .join(", ") || "None"}
            </p>
            <small>
              Only validated REFUND offers and messages are implemented. Other
              capabilities require manual review.
            </small>
          </div>
        </div>
      )}
      {tab === "Activity" && (
        <div className="detail-content">
          <div className="section-heading">
            <h3>A record of what actually happened.</h3>
            <span>Times in Dubai (UTC+4)</span>
          </div>
          <p className="muted">
            Persisted workflow events.{" "}
            {item.mode === "demo"
              ? "Demo steps are explicitly identified."
              : "No simulated thinking steps."}
          </p>
          <ol className="timeline">
            {item.audit.map((e) => (
              <li key={e.id}>
                <span className="timeline-node">
                  <Icon
                    name={
                      e.kind === "BLOCKED" || e.kind === "FAILED"
                        ? "alert"
                        : "check"
                    }
                    size={13}
                  />
                </span>
                <div>
                  <div className="section-heading">
                    <strong>{label(e.kind)}</strong>
                    <time>{date(e.at)}</time>
                  </div>
                  <span className="timeline-actor">{e.actor}</span>
                  <p>{e.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
