"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { WorkspaceView } from "@/lib/store";
import type { Policy } from "@/lib/domain";
import { cents } from "@/lib/domain";
import { CaseDetail, date, label, money, Status } from "./case-detail";
import { Icon } from "./icons";

async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error ?? "Request failed") as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return data;
}
const nav = [
  { name: "Workspace", icon: "grid" },
  { name: "Approvals", icon: "shield" },
  { name: "Activity log", icon: "activity" },
  { name: "Merchant policy", icon: "lock" },
];
export function Dashboard() {
  const [data, setData] = useState<WorkspaceView | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState("Workspace");
  const [filter, setFilter] = useState("All cases");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signIn, setSignIn] = useState(false);
  const [token, setToken] = useState("");
  const [importId, setImportId] = useState("");
  const load = useCallback(async () => {
    try {
      const next = (await api("/api/workspace")) as WorkspaceView;
      setData(next);
      setSignIn(false);
      setSelected((old) =>
        old && next.cases.some((c) => c.id === old)
          ? old
          : (next.cases[0]?.id ?? null),
      );
    } catch (e) {
      if ((e as Error & { status?: number }).status === 401) setSignIn(true);
      else setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let active = true;
    api("/api/workspace")
      .then((next: WorkspaceView) => {
        if (!active) return;
        setData(next);
        setSelected(next.cases[0]?.id ?? null);
      })
      .catch((e: Error & { status?: number }) => {
        if (!active) return;
        if (e.status === 401) setSignIn(true);
        else setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const cases = data?.cases ?? [];
  const pending = cases.filter((c) => c.recommendation?.status === "PENDING");
  const shown = cases.filter(
    (c) =>
      (view !== "Approvals" ||
        ["PENDING", "APPROVED"].includes(c.recommendation?.status ?? "")) &&
      (filter !== "Needs review" ||
        ["NEEDS_REVIEW", "ANALYSIS_FAILED", "NEEDS_RECONCILIATION"].includes(
          c.status,
        )) &&
      (filter !== "Action recorded" || c.status === "ACTION_RECORDED") &&
      `${c.id} ${c.dispute.disputed_transactions[0]?.buyer?.name ?? ""} ${c.dispute.reason}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const item = shown.find((c) => c.id === selected) ?? shown[0];
  const exposure = cases
    .filter(
      (c) =>
        c.dispute.status !== "RESOLVED" &&
        c.dispute.dispute_amount.currency_code === "USD",
    )
    .reduce((sum, c) => sum + cents(c.dispute.dispute_amount.value), 0);
  const demo = data?.mode === "demo";
  const seed = () =>
    run(async () => {
      const result = await api("/api/demo", "POST");
      setSelected(result.id);
      setView("Workspace");
      setFilter("All cases");
      setNotice(
        "Three simulated cases added. The first has a deterministic recommendation ready to review.",
      );
    });
  const action = (operation: string) => {
    if (!item) return;
    void run(async () => {
      await api(
        `/api/cases/${encodeURIComponent(item.id)}/${operation}`,
        "POST",
        ["approve", "reject", "execute"].includes(operation)
          ? { recommendationId: item.recommendation?.id }
          : undefined,
      );
      setNotice(
        operation === "approve"
          ? "Approval recorded. Review once more, then execute the approved action."
          : operation === "reject"
            ? "Recommendation declined. No action was sent."
            : "Case updated. Check the result and activity log.",
      );
    });
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Parley home">
          <span className="brand-mark">
            p<span>↗</span>
          </span>
          parley<span className="brand-period">.</span>
        </Link>
        <div className="merchant-switch">
          <span className="store-avatar">{demo ? "N" : "M"}</span>
          <div>
            <strong>{demo ? "Northstar Studio" : "Merchant workspace"}</strong>
            <small>
              {demo ? "Demonstration merchant" : "PayPal operations"}
            </small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.name}
              className={view === n.name ? "active" : ""}
              onClick={() => setView(n.name)}
            >
              <Icon name={n.icon} />
              {n.name}
              {n.name === "Approvals" && pending.length > 0 && (
                <span className="nav-count">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-note">
            <Icon name="shield" size={23} />
            <strong>Thoughtful by design.</strong>
            <p>
              AI recommends.
              <br />
              Your policy sets the limits.
              <br />
              You make the call.
            </p>
          </div>
          <button className="guide-link" onClick={() => setView("Demo guide")}>
            <Icon name="book" />
            Demo & setup guide
            <Icon name="arrow" size={15} />
          </button>
          <div className="merchant-user">
            <span className="user-avatar">M</span>
            <div>
              <strong>Merchant</strong>
              <small>Workspace owner</small>
            </div>
            {data?.mode === "sandbox" && (
              <button
                title="Sign out"
                aria-label="Sign out"
                className="icon-button"
                onClick={() =>
                  void run(async () => {
                    await api("/api/session", "DELETE");
                    setData(null);
                  })
                }
              >
                <Icon name="logout" />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            Merchant operations <span>/</span> <strong>{view}</strong>
          </div>
          <div className="topbar-right">
            <span className="paypal-word">PayPal</span>
            <span className={`mode-badge ${demo ? "" : "sandbox"}`}>
              <span className="dot" />
              {data
                ? demo
                  ? "Demo environment"
                  : "Live sandbox"
                : "Connecting"}
            </span>
            <span className="user-avatar small">M</span>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">PAYPAL DISPUTE OPERATIONS</div>
              <h1>
                {view === "Workspace"
                  ? "A little clarity. A better resolution."
                  : view}
              </h1>
              <p>
                Investigate the evidence. Review the recommendation. Keep the
                final say.
              </p>
            </div>
            {data && (
              <button
                className="primary"
                disabled={busy}
                onClick={
                  demo
                    ? () => void seed()
                    : () =>
                        void run(async () => {
                          const result = await api("/api/sync", "POST", {});
                          setNotice(
                            `Synced ${result.count} sandbox disputes.${result.hasMore ? " More exist; import additional cases by ID." : ""}`,
                          );
                        })
                }
              >
                <Icon name={demo ? "plus" : "refresh"} />
                {demo ? "New demo run" : "Sync PayPal"}
              </button>
            )}
          </div>
          {error && (
            <div className="banner error" role="alert">
              <Icon name="alert" />
              <span>{error}</span>
              <button
                className="text-button"
                onClick={() => {
                  setError("");
                  void load();
                }}
              >
                Retry
              </button>
            </div>
          )}
          {notice && (
            <div className="banner success" role="status">
              <Icon name="check" />
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
          {busy && (
            <div className="working" role="status">
              <span className="working-dot" />
              Request in progress. Workflow events are saved as each step
              completes.
            </div>
          )}
          {signIn ? (
            <form
              className="login panel"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api("/api/session", "POST", { token });
                  setToken("");
                });
              }}
            >
              <div className="icon-tile">
                <Icon name="lock" size={24} />
              </div>
              <h2>Your merchant workspace</h2>
              <p>
                Enter the access token configured on this server to view sandbox
                cases and approve actions.
              </p>
              <label htmlFor="access-token">Merchant access token</label>
              <input
                id="access-token"
                type="password"
                autoComplete="current-password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <button className="primary" disabled={busy}>
                Sign in securely
                <Icon name="arrow" />
              </button>
            </form>
          ) : !data ? (
            <div className="panel loading-state" role="status">
              <Icon name="refresh" />
              <h2>Opening your workspace…</h2>
              <p>Loading cases and merchant policy.</p>
            </div>
          ) : (
            <>
              {(view === "Workspace" || view === "Approvals") && (
                <>
                  <section className="overview-banner">
                    <div>
                      <span className="overview-icon">
                        <Icon name="shield" size={26} />
                      </span>
                      <div>
                        <h2>Resolve disputes with context, not guesswork.</h2>
                        <p>
                          {demo
                            ? "Explore a complete approval workflow with labelled, simulated PayPal cases."
                            : "A single place to turn PayPal inquiry records into reviewed, supported actions."}
                        </p>
                      </div>
                    </div>
                    <div className="workflow-mini">
                      <span>Investigate</span>
                      <Icon name="chevron" size={13} />
                      <span>Recommend</span>
                      <Icon name="chevron" size={13} />
                      <strong>You approve</strong>
                    </div>
                  </section>
                  <section className="metrics" aria-label="Case metrics">
                    {[
                      {
                        title: "Active disputes",
                        value: cases.filter(
                          (c) => c.dispute.status !== "RESOLVED",
                        ).length,
                        caption: "Across this environment",
                        icon: "inbox",
                      },
                      {
                        title: "In inquiry",
                        value: cases.filter(
                          (c) =>
                            c.dispute.dispute_life_cycle_stage === "INQUIRY" &&
                            c.dispute.status !== "RESOLVED",
                        ).length,
                        caption: "An opportunity for dialogue",
                        icon: "activity",
                      },
                      {
                        title: "Awaiting approval",
                        value: pending.length,
                        caption: "Ready for your review",
                        icon: "shield",
                      },
                      {
                        title: "Disputed exposure",
                        value: money(exposure),
                        caption: "Open USD cases · not savings",
                        icon: "file",
                      },
                    ].map((m) => (
                      <article key={m.title}>
                        <div>
                          <span>{m.title}</span>
                          <Icon name={m.icon} />
                        </div>
                        <strong>{m.value}</strong>
                        <small>{m.caption}</small>
                      </article>
                    ))}
                  </section>
                  <div className="workspace-heading">
                    <div>
                      <h2>
                        {view === "Approvals"
                          ? "Your approval queue"
                          : "Dispute inbox"}
                        <span>{shown.length}</span>
                      </h2>
                      <p>
                        {demo
                          ? "Seeded data · fixture recommendations · simulated actions"
                          : data.ai}
                      </p>
                    </div>
                    <div className="search">
                      <Icon name="search" size={17} />
                      <input
                        aria-label="Search cases"
                        placeholder="Search cases or buyers"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="inbox-toolbar">
                    <div className="filter-tabs">
                      {["All cases", "Needs review", "Action recorded"].map(
                        (f) => (
                          <button
                            key={f}
                            className={filter === f ? "selected" : ""}
                            onClick={() => setFilter(f)}
                          >
                            {f}
                          </button>
                        ),
                      )}
                    </div>
                    <span>
                      <Icon name="lock" size={13} />
                      Human approval always required
                    </span>
                  </div>
                  {shown.length ? (
                    <div className="workspace-grid">
                      <section className="case-list" aria-label="Dispute inbox">
                        {shown.map((c) => (
                          <button
                            key={c.id}
                            className={`case-row ${item?.id === c.id ? "selected" : ""}`}
                            onClick={() => setSelected(c.id)}
                            aria-pressed={item?.id === c.id}
                          >
                            <div className="case-row-top">
                              <span
                                className={`buyer-avatar color-${c.dispute.dispute_amount.value.length % 3}`}
                              >
                                {(
                                  c.dispute.disputed_transactions[0]?.buyer
                                    ?.name ?? "Buyer"
                                )
                                  .split(" ")
                                  .map((x) => x[0])
                                  .slice(0, 2)
                                  .join("")}
                              </span>
                              <strong>
                                {c.dispute.disputed_transactions[0]?.buyer
                                  ?.name ?? "PayPal buyer"}
                              </strong>
                              <span className="case-amount">
                                {c.dispute.dispute_amount.currency_code ===
                                "USD"
                                  ? "$"
                                  : c.dispute.dispute_amount.currency_code}
                                {c.dispute.dispute_amount.value}
                              </span>
                            </div>
                            <h3>
                              {c.dispute.reason.includes("NOT_AS_DESCRIBED")
                                ? "Item not as described"
                                : c.dispute.reason.includes("NOT_RECEIVED")
                                  ? "Item not received"
                                  : label(c.dispute.reason)}
                            </h3>
                            <p>
                              {c.dispute.disputed_transactions[0]?.items?.[0]
                                ?.item_name ??
                                c.dispute.disputed_transactions[0]?.items?.[0]
                                  ?.name ??
                                c.id}
                            </p>
                            <div className="case-row-bottom">
                              <Status value={c.status} />
                              <Icon name="chevron" size={15} />
                            </div>
                            <small>
                              {c.evidence.length} source records ·{" "}
                              {label(c.dispute.dispute_life_cycle_stage)}
                            </small>
                          </button>
                        ))}
                        <div className="list-footnote">
                          <Icon name="shield" size={16} />
                          <p>
                            {demo
                              ? "This is a demo. Nothing here moves money."
                              : "Every action is checked again before submission."}
                          </p>
                        </div>
                      </section>
                      {item && (
                        <CaseDetail
                          key={`${item.id}:${item.revision}:${item.recommendation?.id}:${data.policy.version}`}
                          item={item}
                          busy={busy}
                          action={action}
                          saveDraft={(message) =>
                            void run(async () => {
                              await api(
                                `/api/cases/${encodeURIComponent(item.id)}/draft`,
                                "POST",
                                {
                                  revision: item.revision,
                                  policyVersion: data.policy.version,
                                  recommendationId:
                                    item.recommendation?.id ?? null,
                                  buyerMessage: message,
                                },
                              );
                              setNotice(
                                "Merchant-written message saved. Review the checks and approve the new version before sending.",
                              );
                            })
                          }
                        />
                      )}
                    </div>
                  ) : (
                    <div className="panel empty-state">
                      <div className="icon-tile">
                        <Icon name="inbox" size={28} />
                      </div>
                      <h2>
                        {cases.length
                          ? "Nothing in this view."
                          : "Your next resolution starts here."}
                      </h2>
                      <p>
                        {cases.length
                          ? "Try another filter or search to find a case."
                          : demo
                            ? "Start a demo run to explore three sample disputes and a complete approval workflow."
                            : "Sync your sandbox disputes or import a specific dispute ID below."}
                      </p>
                      {demo && !cases.length && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => void seed()}
                        >
                          Start the demo
                          <Icon name="arrow" />
                        </button>
                      )}
                    </div>
                  )}
                  {!demo && (
                    <form
                      className="import-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(async () => {
                          await api("/api/sync", "POST", { id: importId });
                          setSelected(importId);
                          setImportId("");
                          setNotice(
                            "Sandbox case imported. Open it and select Investigate case.",
                          );
                        });
                      }}
                    >
                      <label htmlFor="dispute-id">
                        Import a sandbox dispute
                      </label>
                      <input
                        id="dispute-id"
                        placeholder="PP-D-…"
                        value={importId}
                        onChange={(e) => setImportId(e.target.value)}
                        required
                      />
                      <button className="secondary" disabled={busy}>
                        Import by ID
                      </button>
                    </form>
                  )}
                </>
              )}
              {view === "Merchant policy" && (
                <PolicyEditor
                  key={data.policy.version}
                  policy={data.policy}
                  busy={busy}
                  save={(rules) =>
                    void run(async () => {
                      await api("/api/policy", "PUT", {
                        rules,
                        version: data.policy.version,
                      });
                      setNotice(
                        "Policy saved. Previous recommendations need fresh analysis and approval.",
                      );
                    })
                  }
                />
              )}
              {view === "Activity log" && (
                <section className="panel audit-panel">
                  <div className="section-heading">
                    <h2>From evidence to action</h2>
                    <span>Persistent case audit · Dubai time</span>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Case</th>
                          <th>Actor</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cases
                          .flatMap((c) =>
                            c.audit.map((e) => ({ ...e, caseId: c.id })),
                          )
                          .sort((a, b) => b.at.localeCompare(a.at))
                          .map((e) => (
                            <tr key={e.id}>
                              <td>
                                <strong>{label(e.kind)}</strong>
                                <p>{e.detail}</p>
                              </td>
                              <td>
                                <button
                                  className="text-button"
                                  onClick={() => {
                                    setSelected(e.caseId);
                                    setView("Workspace");
                                  }}
                                >
                                  {e.caseId}
                                </button>
                              </td>
                              <td>{e.actor}</td>
                              <td>{date(e.at)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {!cases.length && (
                    <p>No events yet. Import a case or start a demo run.</p>
                  )}
                </section>
              )}
              {view === "Demo guide" && (
                <section className="panel guide">
                  <div className="eyebrow">A 2–3 MINUTE WALKTHROUGH</div>
                  <h2>From a buyer’s question to a reviewed action.</h2>
                  <ol>
                    <li>
                      <strong>Start with the case.</strong> In demo mode, select
                      New demo run. In sandbox, sync an inquiry dispute with a
                      supported action.
                    </li>
                    <li>
                      <strong>Investigate.</strong> Open a case and run
                      analysis. Demo recommendations use deterministic fixtures;
                      sandbox analysis calls the configured AI provider.
                    </li>
                    <li>
                      <strong>Review the evidence.</strong> Distinguish the
                      buyer’s claim from provider records. Inspect missing
                      evidence and risks.
                    </li>
                    <li>
                      <strong>Explain the recommendation.</strong> Show the
                      amount, exact message, merchant policy checks, and PayPal
                      capability check.
                    </li>
                    <li>
                      <strong>Approve, then execute.</strong> These are separate
                      actions. Demo execution is simulated. Sandbox execution
                      calls PayPal.
                    </li>
                    <li>
                      <strong>Inspect the result.</strong> Acknowledgement is
                      not resolution. Read-back verification must find a new
                      matching offer or message. Review the saved activity.
                    </li>
                  </ol>
                  <div className="guide-note">
                    <Icon name="book" />
                    <p>
                      See README.md and DEMO.md in the repository for exact
                      setup commands, sandbox account requirements, credentials,
                      and limitations.
                    </p>
                  </div>
                  <h3>What this prototype does</h3>
                  <p>
                    Single-merchant, USD inquiry operations. Supported actions:
                    partial REFUND offer and buyer message. Evidence submission,
                    claim acceptance, full refunds, return logistics, and
                    production payments remain manual in PayPal.
                  </p>
                </section>
              )}
            </>
          )}
          <footer className="footer">
            <span>
              parley. <span>Better context. Human judgment.</span>
            </span>
            <span>
              <Icon name="lock" size={12} />
              {data
                ? demo
                  ? "Simulation only · No external calls"
                  : "PayPal sandbox · Approval protected"
                : "Merchant workspace"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function PolicyEditor({
  policy,
  busy,
  save,
}: {
  policy: Policy & { version: number };
  busy: boolean;
  save: (p: Policy) => void;
}) {
  const { version, ...initial } = policy;
  const [rules, setRules] = useState<Policy>(initial);
  return (
    <form
      className="panel policy-editor"
      onSubmit={(e) => {
        e.preventDefault();
        save(rules);
      }}
    >
      <div className="section-heading">
        <div>
          <h2>Your rules, enforced in code.</h2>
          <p>
            Policy v{version}. Changing a rule invalidates previous approvals.
          </p>
        </div>
        <Icon name="shield" size={30} />
      </div>
      <div className="policy-grid">
        {[
          {
            key: "maxOfferCents" as const,
            label: "Maximum offer (USD)",
            description: "Absolute limit for every partial refund proposal.",
            scale: 100,
            max: 1000,
            min: 0,
          },
          {
            key: "maxOfferPercent" as const,
            label: "Maximum share of dispute (%)",
            description: "Both the dollar and percentage caps must pass.",
            scale: 1,
            max: 90,
            min: 0,
          },
          {
            key: "escalateAboveCents" as const,
            label: "Specialist review above (USD)",
            description: "Cases above this amount cannot execute here.",
            scale: 100,
            max: 100000,
            min: 1,
          },
          {
            key: "minConfidence" as const,
            label: "Minimum reported confidence (%)",
            description: "A model score, not a prediction of winning.",
            scale: 0.01,
            max: 100,
            min: 50,
          },
        ].map((f) => (
          <label key={f.key}>
            {f.label}
            <input
              type="number"
              required
              min={f.min}
              max={f.max}
              step={f.key.endsWith("Cents") ? "0.01" : "1"}
              value={Math.round((rules[f.key] / f.scale) * 100) / 100}
              onChange={(e) =>
                setRules({
                  ...rules,
                  [f.key]:
                    f.key === "minConfidence"
                      ? Number(e.target.value) * f.scale
                      : Math.round(Number(e.target.value) * f.scale),
                })
              }
            />
            <small>{f.description}</small>
          </label>
        ))}
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={rules.requireShipmentEvidence}
          onChange={(e) =>
            setRules({ ...rules, requireShipmentEvidence: e.target.checked })
          }
        />
        <span>
          <strong>Require submitted shipment evidence</strong>
          <small>
            Blocks actions when no tracking number is present. Submitted
            tracking is not verified delivery.
          </small>
        </span>
      </label>
      <div className="policy-locked">
        <Icon name="lock" />
        <div>
          <strong>Human approval is always required.</strong>
          <p>
            This control cannot be disabled. USD only. Full refunds and
            unauthorized-payment claims are excluded.
          </p>
        </div>
      </div>
      <button className="primary" disabled={busy}>
        Save policy
        <Icon name="check" />
      </button>
    </form>
  );
}
