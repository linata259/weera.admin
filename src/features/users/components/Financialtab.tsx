import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "services/supabaseClient";
import { User } from "../types";

/* ─── types ──────────────────────────────────────────────────── */
interface WalletSummary {
  available: number;
  pending: number;
  totalEarned: number;
  currency: string;
}

interface MonthlyEarning {
  month: string;
  amount: number;
}

interface TxRow {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  jobTitle: string | null;
  createdAt: string;
}

/* ─── tokens ─────────────────────────────────────────────────── */
const ORANGE = "#EA580C";
const NAVY   = "#0F172A";
const SLATE  = "#64748B";
const BORDER = "#E2E8F0";
const BG     = "#F8FAFC";
const ROWS   = 10;

/* ─── transaction type label + color ────────────────────────── */
const TX_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  deposit:          { label: "Deposit",          color: "#16A34A", bg: "#DCFCE7" },
  withdrawal:       { label: "Withdrawal",        color: "#DC2626", bg: "#FEE2E2" },
  escrow_lock:      { label: "Escrow Lock",       color: "#CA8A04", bg: "#FEF9C3" },
  escrow_release:   { label: "Escrow Release",    color: "#16A34A", bg: "#DCFCE7" },
  escrow_refund:    { label: "Escrow Refund",     color: "#2563EB", bg: "#DBEAFE" },
  milestone_payment:{ label: "Milestone Payment", color: "#16A34A", bg: "#DCFCE7" },
  platform_fee:     { label: "Platform Fee",      color: "#DC2626", bg: "#FEE2E2" },
};
const txStyle = (t: string) =>
  TX_STYLE[t] ?? { label: t.replace(/_/g, " "), color: SLATE, bg: BG };

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  completed: { color: "#16A34A", bg: "#DCFCE7" },
  pending:   { color: "#CA8A04", bg: "#FEF9C3" },
  failed:    { color: "#DC2626", bg: "#FEE2E2" },
};
const stStyle = (s: string) => STATUS_STYLE[s] ?? { color: SLATE, bg: BG };

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtAmt = (n: number, currency = "KES") =>
  `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─── Donut chart ────────────────────────────────────────────── */
const DonutChart: React.FC<{ available: number; pending: number; total: number; currency: string }> = ({
  available, pending, total, currency,
}) => {
  const r = 54, circ = 2 * Math.PI * r;
  const avPct = total > 0 ? (available / total) : 0;
  const pePct = total > 0 ? (pending   / total) : 0;
  const avDash = avPct * circ;
  const peDash = pePct * circ;
  const avOffset = 0;
  const peOffset = avDash;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ position: "relative", width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* track */}
          <circle cx="70" cy="70" r={r} fill="none" stroke="#F1F5F9" strokeWidth="16" />
          {/* available */}
          <circle cx="70" cy="70" r={r} fill="none" stroke={ORANGE} strokeWidth="16"
            strokeDasharray={`${avDash} ${circ - avDash}`}
            strokeDashoffset={-avOffset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "70px 70px", transition: "stroke-dasharray 1s ease" }}
          />
          {/* pending */}
          <circle cx="70" cy="70" r={r} fill="none" stroke="#FDBA74" strokeWidth="16"
            strokeDasharray={`${peDash} ${circ - peDash}`}
            strokeDashoffset={-peOffset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "70px 70px", transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 10, color: SLATE, fontWeight: 600 }}>Total Earned</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: NAVY, marginTop: 2 }}>
            {fmtAmt(total, currency)}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        {[
          { label: "Available Balance", value: available, color: ORANGE },
          { label: "Pending Balance",   value: pending,   color: "#FDBA74" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
              <span style={{ fontSize: 12, color: SLATE }}>{label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{fmtAmt(value, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Line chart ─────────────────────────────────────────────── */
const LineChart: React.FC<{ data: MonthlyEarning[]; title: string }> = ({ data, title }) => {
  if (data.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "#CBD5E1", fontSize: 13 }}>
      No data
    </div>
  );

  const W = 100, H = 80;
  const max = Math.max(...data.map(d => d.amount), 1);
  const pts = data.map((d, i) => ({
    x: data.length === 1 ? W / 2 : (i / (data.length - 1)) * W,
    y: H - (d.amount / max) * (H - 10),
  }));

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  /* y-axis ticks */
  const ticks = [0, 25, 50, 75, 100].map(pct => ({
    y: H - (pct / 100) * (H - 10),
    label: Math.round((pct / 100) * max),
  }));

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 12 }}>{title}</div>
      <div style={{ position: "relative", paddingLeft: 32, paddingBottom: 20 }}>
        {/* y-axis labels */}
        {ticks.map((t, i) => (
          <div key={i} style={{
            position: "absolute", left: 0,
            top: `${(t.y / H) * 100}%`,
            transform: "translateY(-50%)",
            fontSize: 9, color: "#94A3B8", width: 28, textAlign: "right",
          }}>
            {t.label}
          </div>
        ))}

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 140, overflow: "visible" }}>
          {/* grid lines */}
          {ticks.map((t, i) => (
            <line key={i} x1="0" y1={t.y} x2={W} y2={t.y} stroke="#F1F5F9" strokeWidth="0.5" />
          ))}
          {/* area fill */}
          <path d={area} fill={`${ORANGE}15`} />
          {/* line */}
          <path d={path} fill="none" stroke={ORANGE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* dots */}
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill={ORANGE} />
          ))}
        </svg>

        {/* x-axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {data.map((d, i) => (
            <span key={i} style={{ fontSize: 9, color: "#94A3B8", flex: 1, textAlign: "center" }}>
              {d.month.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── main component ─────────────────────────────────────────── */
export const FinancialTab: React.FC<{ user: User }> = ({ user }) => {
  const [summary,  setSummary]  = useState<WalletSummary | null>(null);
  const [monthly,  setMonthly]  = useState<MonthlyEarning[]>([]);
  const [txRows,   setTxRows]   = useState<TxRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [typeF,    setTypeF]    = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [page,     setPage]     = useState(1);

  /* ── fetch ──────────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    const load = async () => {
         const { data: { session } } = await supabase.auth.getSession();
  console.log("Session user ID:", session?.user?.id);
  console.log("Expected admin ID:", 'b1057e1a-419d-4a20-bb9b-84c9678e157e');
  console.log("Is admin session:", session?.user?.id === 'b1057e1a-419d-4a20-bb9b-84c9678e157e');
  /* wallet */
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("balance, escrow_balance, currency")
    .eq("user_id", user.id)
    .maybeSingle();

  console.log("=== FinancialTab ===");
  console.log("user.id:", user.id);
  console.log("wallet data:", wallet);
  console.log("wallet error:", walletError);

  /* all transactions */
  const { data: txData, error: txError } = await supabase
    .from("wallet_transactions")
    .select("id, type, amount, status, description, related_job_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  console.log("txData count:", txData?.length);
  console.log("txData error:", txError);
  console.log("txData sample:", txData?.[0]);

      const txs = txData ?? [];

      /* total earned = sum of credit types */
      const creditTypes = ["deposit", "escrow_release", "escrow_refund", "milestone_payment"];
      const totalEarned = txs
        .filter((t: any) => creditTypes.includes(t.type))
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount ?? "0"), 0);

      setSummary({
        available:   parseFloat(wallet?.balance         ?? "0"),
        pending:     parseFloat(wallet?.escrow_balance  ?? "0"),
        totalEarned: wallet ? totalEarned : 0,
        currency:    wallet?.currency ?? "KES",
      });

      /* monthly — group by month */
      const monthMap: Record<string, number> = {};
      txs
        .filter((t: any) => creditTypes.includes(t.type))
        .forEach((t: any) => {
          const key = new Date(t.created_at).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
          monthMap[key] = (monthMap[key] ?? 0) + parseFloat(t.amount ?? "0");
        });

      /* sort chronologically */
      const monthlyData: MonthlyEarning[] = Object.entries(monthMap)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => {
          const da = new Date(`01 ${a.month}`);
          const db = new Date(`01 ${b.month}`);
          return da.getTime() - db.getTime();
        });
      setMonthly(monthlyData);

      /* fetch job titles for transactions that have related_job_id */
      const jobIds = Array.from(new Set(
        txs.map((t: any) => t.related_job_id).filter(Boolean) as string[]
      ));
      const jobMap = new Map<string, string>();
      if (jobIds.length > 0) {
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id, title")
          .in("id", jobIds);
        (jobs ?? []).forEach((j: any) => jobMap.set(j.id, j.title));
      }

      setTxRows(txs.map((t: any): TxRow => ({
        id:          t.id,
        type:        t.type,
        amount:      parseFloat(t.amount ?? "0"),
        status:      t.status,
        description: t.description ?? null,
        jobTitle:    t.related_job_id ? (jobMap.get(t.related_job_id) ?? null) : null,
        createdAt:   t.created_at,
      })));

      setLoading(false);
    };
    load();
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── filter ─────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = txRows;
    if (typeF !== "all") list = list.filter(r => r.type === typeF);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter(r => new Date(r.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      list = list.filter(r => new Date(r.createdAt).getTime() <= to);
    }
    return list;
  }, [txRows, typeF, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS));
  const paginated  = filtered.slice((page - 1) * ROWS, page * ROWS);
  const typeOpts   = Array.from(new Set(txRows.map(r => r.type))).sort();

  const pageNums = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3)              return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [page-2, page-1, page, page+1, page+2];
  })();

  const th: React.CSSProperties = {
    padding: "12px 16px", textAlign: "left", fontSize: 13,
    fontWeight: 600, color: SLATE, borderBottom: `1px solid ${BORDER}`,
    whiteSpace: "nowrap", background: BG,
  };
  const td: React.CSSProperties = {
    padding: "14px 16px", fontSize: 14, color: NAVY,
    borderBottom: "1px solid #F1F5F9", verticalAlign: "middle",
  };

  if (loading) return (
    <div style={{ padding: "48px 0", textAlign: "center", color: SLATE, fontSize: 14 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${BORDER}`, borderTop: `3px solid ${ORANGE}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
      Loading financials…
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (!summary && txRows.length === 0) return (
    <div style={{ padding: "48px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
      No financial data available for this user
    </div>
  );

  const currency = summary?.currency ?? "KES";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>

      {/* ── top row: donut + 2 line charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 1fr", gap: 16 }}>

        {/* donut */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px 20px" }}>
          {summary ? (
            <DonutChart
              available={summary.available}
              pending={summary.pending}
              total={summary.totalEarned || summary.available + summary.pending}
              currency={currency}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#CBD5E1", fontSize: 13 }}>
              No wallet data
            </div>
          )}
        </div>

        {/* line chart 1 — all time monthly */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px" }}>
          <LineChart data={monthly} title="Earning Over Time" />
        </div>

        {/* line chart 2 — last 6 months */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px" }}>
          <LineChart data={monthly.slice(-6)} title="Earning Over Time (6 mo)" />
        </div>
      </div>

      {/* ── transaction history ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Transaction History</span>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* type filter */}
            <select value={typeF} onChange={e => { setTypeF(e.target.value); setPage(1); }}
              style={{ padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: "none", color: NAVY, background: "#fff", fontFamily: "inherit", minWidth: 160 }}>
              <option value="all">Transaction Type</option>
              {typeOpts.map(t => <option key={t} value={t}>{txStyle(t).label}</option>)}
            </select>

            {/* date range */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "6px 12px", background: "#fff" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="12" rx="2" stroke="#94A3B8" strokeWidth="1.4" />
                <path d="M1 7h14M5 1v4M11 1v4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                style={{ border: "none", outline: "none", fontSize: 12, color: SLATE, fontFamily: "inherit", background: "transparent" }} />
              <span style={{ color: "#CBD5E1" }}>–</span>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                style={{ border: "none", outline: "none", fontSize: 12, color: SLATE, fontFamily: "inherit", background: "transparent" }} />
            </div>
          </div>
        </div>

        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", background: "#fff" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 56 }}>Sr. No.</th>
                  <th style={th}>Type</th>
                  <th style={th}>Date</th>
                  <th style={th}>Project Title</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...td, textAlign: "center", color: "#94A3B8", padding: "48px 0" }}>
                      {txRows.length === 0 ? "No transactions found" : "No results match your filters"}
                    </td>
                  </tr>
                ) : paginated.map((r, idx) => {
                  const ts = txStyle(r.type);
                  const ss = stStyle(r.status);
                  const isCredit = ["deposit", "escrow_release", "escrow_refund", "milestone_payment"].includes(r.type);
                  return (
                    <tr key={r.id}
                      onMouseEnter={e => e.currentTarget.style.background = BG}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                      style={{ transition: "background 0.1s" }}
                    >
                      <td style={{ ...td, color: "#94A3B8", fontSize: 13 }}>
                        {String((page - 1) * ROWS + idx + 1).padStart(2, "0")}
                      </td>
                      <td style={td}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: ts.bg, color: ts.color, whiteSpace: "nowrap" }}>
                          {ts.label}
                        </span>
                      </td>
                      <td style={{ ...td, color: SLATE, whiteSpace: "nowrap" }}>{fmt(r.createdAt)}</td>
                      <td style={{ ...td, maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.jobTitle ?? r.description ?? <span style={{ color: "#CBD5E1" }}>—</span>}
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: isCredit ? "#16A34A" : "#DC2626" }}>
                        {isCredit ? "+" : "-"}{fmtAmt(r.amount, currency)}
                      </td>
                      <td style={td}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: "nowrap" }}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ padding: "14px 20px", borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 13, color: SLATE }}>
                Page {page} of {totalPages} — {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <PBtn label="← Prev" disabled={page === 1} onClick={() => setPage(p => p - 1)} />
                {pageNums[0] > 1 && <><PBtn label="1" onClick={() => setPage(1)} />{pageNums[0] > 2 && <Dot />}</>}
                {pageNums.map(n => <PBtn key={n} label={String(n)} active={n === page} onClick={() => setPage(n)} />)}
                {pageNums[pageNums.length-1] < totalPages && <>{pageNums[pageNums.length-1] < totalPages-1 && <Dot />}<PBtn label={String(totalPages)} onClick={() => setPage(totalPages)} /></>}
                <PBtn label="Next →" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PBtn: React.FC<{ label: string; active?: boolean; disabled?: boolean; onClick: () => void }> = ({ label, active, disabled, onClick }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: "6px 12px", borderRadius: 8,
    border: `1px solid ${active ? NAVY : BORDER}`,
    background: active ? NAVY : "#fff",
    color: active ? "#fff" : disabled ? "#CBD5E1" : NAVY,
    fontSize: 13, fontWeight: active ? 700 : 500,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  }}>{label}</button>
);

const Dot = () => <span style={{ color: "#CBD5E1", padding: "0 4px" }}>…</span>;