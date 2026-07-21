import React, { useEffect, useState } from "react";
import {
  fetchFinancialSummary,
  fetchMonthlyCommission,
  fetchMonthlyRevenue,
  fetchPendingRefunds,          // replaces fetchPendingWithdrawals
  fetchCommissionEvents,
  CommissionEvent,
  fetchRevenueEvents,
  RevenueEvent,
} from "../api/financialService";
import { FinancialSummary, MonthlyCommission, MonthlyRevenue, RefundRequest } from "../types";
import { exportCsv } from "../utils/exportCsv";
import { exportPdf } from "../utils/exportPdf";
import { Avatar } from "../../shared/Avatar";

// ── Add RefundRequest to your ../types file if not already there:
// export interface RefundRequest {
//   id: string;
//   reference?: string;
//   clientName: string;
//   clientAvatar?: string | null;
//   freelancerName: string;
//   jobTitle: string;
//   amount: number;
//   reason: 'cancelled' | 'dispute' | 'work_rejected' | 'other';
//   requestedAt: string;
//   status: 'pending';
// }

const ORANGE = "#EA580C";
const NAVY   = "#0F172A";
const SLATE  = "#64748B";
const BORDER = "#E2E8F0";
const BG     = "#F8FAFC";
const RED    = "#DC2626";

const fmtK = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);
const fmtAmt = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

const REASON_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  cancelled:     { label: "Job Cancelled",  bg: "#FEF9C3", color: "#CA8A04" },
  dispute:       { label: "Dispute",        bg: "#FEE2E2", color: RED       },
  work_rejected: { label: "Work Rejected",  bg: "#FEE2E2", color: RED       },
  other:         { label: "Other",          bg: "#F1F5F9", color: SLATE     },
};

function reasonBadge(reason: string) {
  const cfg = REASON_LABELS[reason] ?? REASON_LABELS.other;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/* ─── StatCard ─────────────────────────────────────────────── */
const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub: string; accent: string;
}> = ({ icon, label, value, sub, accent }) => (
  <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "14px 14px 0 0" }} />
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, color: SLATE, fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, color: NAVY, letterSpacing: -0.5 }}>{value}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 2v8M2 6l4-4 4 4" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>{sub}</span>
    </div>
  </div>
);

/* ─── helpers ───────────────────────────────────────────────── */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) * 0.45;
    const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) * 0.45;
    d += ` C ${cp1x} ${pts[i].y}, ${cp2x} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
}

function areaPath(pts: { x: number; y: number }[], baseY: number): string {
  if (pts.length < 2) return "";
  return smoothPath(pts) + ` L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`;
}

type Period = "hour" | "day" | "week" | "month";

/* ─── DualLineChart ─────────────────────────────────────────── */

// money-in vs payouts, bucketed at the chosen granularity; shows the most
// recent N buckets that contain data so no period ever renders empty
const REV_IN_TYPES = ["deposit", "escrow_lock", "milestone_payment"];

function bucketRevenueDual(
  events: RevenueEvent[],
  period: Period,
): MonthlyRevenue[] {
  const KEEP: Record<Period, number> = { hour: 24, day: 14, week: 8, month: 12 };
  const buckets = new Map<string, { label: string; sort: number; revenue: number; escrow: number }>();

  for (const e of events) {
    const d = new Date(e.ts);
    let key: string, label: string, sort: number;
    if (period === "day") {
      key = d.toISOString().slice(0, 10);
      label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      sort = new Date(key).getTime();
    } else if (period === "week") {
      const ws = startOfWeek(d);
      key = ws.toISOString().slice(0, 10);
      label = ws.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      sort = ws.getTime();
    } else {
      key = `${d.getFullYear()}-${d.getMonth()}`;
      label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      sort = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    }
    const b = buckets.get(key) ?? { label, sort, revenue: 0, escrow: 0 };
    if (REV_IN_TYPES.includes(e.type)) b.revenue += e.amount;
    else b.escrow += e.amount; // escrow_release + withdrawal = payouts
    buckets.set(key, b);
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.sort - b.sort)
    .slice(-KEEP[period])
    .map((b) => ({
      month: b.label,
      revenue: Math.round(b.revenue * 100) / 100,
      escrow: Math.round(b.escrow * 100) / 100,
    }));
}

export const DualLineChart: React.FC<{ data: MonthlyRevenue[]; title: string }> = ({ data, title }) => {
  const [period, setPeriod] = useState<Period>("month");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [events, setEvents] = useState<RevenueEvent[] | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchRevenueEvents().then(setEvents).catch(() => setEvents([]));
  }, []);

  // prefer raw events (real per-period bucketing); fall back to monthly prop
  const sliced = events && events.length
    ? bucketRevenueDual(events, period)
    : data;

  if (!sliced.length)
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: "#CBD5E1", fontSize: 13 }}>No data</div>;

  const VW = 520, VH = 220, PAD_L = 48, PAD_R = 16, PAD_T = 14, PAD_B = 32;
  const CW = VW - PAD_L - PAD_R, CH = VH - PAD_T - PAD_B;
  const maxVal = Math.max(...sliced.map(d => Math.max(d.revenue, d.escrow)), 1);
  const tickStep = maxVal <= 20 ? 5 : maxVal <= 50 ? 10 : maxVal <= 200 ? 25 : maxVal <= 500 ? 50 : 100;
  const yMax = Math.ceil(maxVal / tickStep) * tickStep;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += tickStep) yTicks.push(v);

  const xOf = (i: number) => PAD_L + (sliced.length === 1 ? CW / 2 : (i / (sliced.length - 1)) * CW);
  const yOf = (v: number) => PAD_T + CH - (v / yMax) * CH;
  const baseY = PAD_T + CH;

  const revPts = sliced.map((d, i) => ({ x: xOf(i), y: yOf(d.revenue) }));
  const escPts = sliced.map((d, i) => ({ x: xOf(i), y: yOf(d.escrow) }));

  const tooltip = hoveredIdx !== null ? {
    idx: hoveredIdx, svgX: xOf(hoveredIdx),
    svgY: Math.min(yOf(sliced[hoveredIdx].revenue), yOf(sliced[hoveredIdx].escrow)),
    rev: sliced[hoveredIdx].revenue, esc: sliced[hoveredIdx].escrow, label: sliced[hoveredIdx].month,
  } : null;

  const PillBtn = ({ p, label }: { p: Period; label: string }) => (
    <button onClick={() => { setPeriod(p); setHoveredIdx(null); }}
      style={{ padding: "4px 12px", borderRadius: 20, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: period === p ? NAVY : "transparent", color: period === p ? "#fff" : SLATE, transition: "all 0.15s" }}>
      {label}
    </button>
  );

  const titleKey = title.replace(/\s/g, '');

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{title}</span>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 14 }}>
            {[{ color: ORANGE, label: "Revenue" }, { color: NAVY, label: "Payouts" }].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 2.5, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 12, color: SLATE }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 2, background: BG, borderRadius: 22, padding: "3px 4px", border: `1px solid ${BORDER}` }}>
            <PillBtn p="day" label="Day" /><PillBtn p="week" label="Week" /><PillBtn p="month" label="Month" />
          </div>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id={`grad-rev-${titleKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORANGE} stopOpacity="0.18" /><stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`grad-esc-${titleKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={NAVY} stopOpacity="0.10" /><stop offset="100%" stopColor={NAVY} stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line x1={PAD_L} y1={yOf(tick)} x2={VW - PAD_R} y2={yOf(tick)} stroke="#F1F5F9" strokeWidth="1" />
              <text x={PAD_L - 7} y={yOf(tick) + 4} textAnchor="end" fontSize="9.5" fill="#94A3B8" fontFamily="'Inter','Helvetica Neue',sans-serif">
                {tick >= 1000 ? `${(tick / 1000).toFixed(0)}K` : tick}
              </text>
            </g>
          ))}
          <line x1={PAD_L} y1={baseY} x2={VW - PAD_R} y2={baseY} stroke="#E2E8F0" strokeWidth="1" />
          <path d={areaPath(escPts, baseY)} fill={`url(#grad-esc-${titleKey})`} />
          <path d={areaPath(revPts, baseY)} fill={`url(#grad-rev-${titleKey})`} />
          <path d={smoothPath(escPts)} fill="none" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={smoothPath(revPts)} fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {hoveredIdx !== null && <line x1={xOf(hoveredIdx)} y1={PAD_T} x2={xOf(hoveredIdx)} y2={baseY} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 3" />}
          {revPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hoveredIdx === i ? 5 : 3} fill={ORANGE} style={{ transition: "r 0.1s" }} />)}
          {escPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hoveredIdx === i ? 5 : 3} fill={NAVY} style={{ transition: "r 0.1s" }} />)}
          {sliced.map((d, i) => (
            <g key={i}>
              <line x1={xOf(i)} y1={baseY} x2={xOf(i)} y2={baseY + 5} stroke="#CBD5E1" strokeWidth="0.8" />
              <text x={xOf(i)} y={baseY + 18} textAnchor="middle" fontSize="9.5" fill="#94A3B8" fontWeight="500" fontFamily="'Inter','Helvetica Neue',sans-serif">
                {d.month.toUpperCase()}
              </text>
            </g>
          ))}
          {sliced.map((_, i) => (
            <rect key={i} x={xOf(i) - CW / Math.max(sliced.length * 2, 2)} y={PAD_T} width={CW / Math.max(sliced.length - 1, 1)} height={CH + PAD_B} fill="transparent" style={{ cursor: "crosshair" }} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} />
          ))}
        </svg>

        {tooltip && (
          <div style={{ position: "absolute", left: `clamp(0px, calc(${(tooltip.svgX / VW) * 100}% - 70px), calc(100% - 150px))`, top: `calc(${(tooltip.svgY / VH) * 100}% - 72px)`, pointerEvents: "none", background: NAVY, color: "#fff", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.2)", minWidth: 140, zIndex: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>{tooltip.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: ORANGE, flexShrink: 0 }} />
              <span style={{ color: "#CBD5E1" }}>Revenue</span>
              <span style={{ marginLeft: "auto", fontWeight: 700 }}>{tooltip.rev >= 1000 ? `${(tooltip.rev / 1000).toFixed(1)}K` : tooltip.rev}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#94A3B8", flexShrink: 0 }} />
              <span style={{ color: "#CBD5E1" }}>Payouts</span>
              <span style={{ marginLeft: "auto", fontWeight: 700 }}>{tooltip.esc >= 1000 ? `${(tooltip.esc / 1000).toFixed(1)}K` : tooltip.esc}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── ExportBtn ─────────────────────────────────────────────── */
const ExportBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button onClick={onClick} style={{ padding: "7px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff", fontSize: 13, fontWeight: 600, color: NAVY, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M14 10v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2M8 2v8M5 5l3-3 3 3" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    {label}
  </button>
);

/* ─── CommissionChart ───────────────────────────────────────── */
const GRN = "#16A34A";
const GREEN_LIGHT = "#DCFCE7";

type ChartPoint = { label: string; commission: number };

const PERIOD_UNIT: Record<Period, string> = { hour: "hr", day: "day", week: "wk", month: "mo" };
const REFRESH_MS = 15000; // live poll interval

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Bucket timestamped commission events into the selected granularity.
// Shows the most recent N buckets that contain data (rather than a hard
// time window), so every granularity has something to display even when
// activity is sparse or old.
function bucketCommission(events: CommissionEvent[], period: Period): ChartPoint[] {
  const KEEP: Record<Period, number> = { hour: 24, day: 14, week: 8, month: 12 };
  const buckets = new Map<string, { label: string; sort: number; total: number }>();
  const push = (key: string, label: string, sort: number, amt: number) => {
    const b = buckets.get(key);
    if (b) b.total += amt;
    else buckets.set(key, { label, sort, total: amt });
  };

  for (const e of events) {
    const d = new Date(e.ts);
    const t = d.getTime();
    if (period === "hour") {
      push(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`,
        `${String(d.getHours()).padStart(2, "0")}:00`, t, e.amount);
    } else if (period === "day") {
      push(d.toISOString().slice(0, 10),
        d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), t, e.amount);
    } else if (period === "week") {
      const ws = startOfWeek(d);
      push(ws.toISOString().slice(0, 10),
        ws.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), ws.getTime(), e.amount);
    } else {
      push(`${d.getFullYear()}-${d.getMonth()}`,
        d.toLocaleDateString("en-GB", { month: "short" }),
        new Date(d.getFullYear(), d.getMonth(), 1).getTime(), e.amount);
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.sort - b.sort)
    .slice(-KEEP[period]) // most recent N buckets with data
    .map((b) => ({ label: b.label, commission: Math.round(b.total) }));
}

export const CommissionChart: React.FC<{ data: MonthlyCommission[] }> = ({ data }) => {
  const [period, setPeriod] = useState<Period>("month");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [events, setEvents] = useState<CommissionEvent[] | null>(null);
  const [live, setLive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const isMobile = useIsMobile();

  // Fetch events on mount, then poll while "live" is on.
  useEffect(() => {
    let active = true;
    const load = () =>
      fetchCommissionEvents()
        .then((ev) => { if (active) { setEvents(ev); setUpdatedAt(new Date()); } })
        .catch(() => {});
    load();
    if (!live) return () => { active = false; };
    const id = setInterval(load, REFRESH_MS);
    return () => { active = false; clearInterval(id); };
  }, [live]);

  // Prefer live event buckets; fall back to the monthly prop if no events exist.
  const points: ChartPoint[] = events && events.length
    ? bucketCommission(events, period)
    : data.map((d) => ({ label: d.month, commission: d.commission }));

  const loading = events === null && !data.length;

  const PillBtn = ({ p, label }: { p: Period; label: string }) => (
    <button onClick={() => { setPeriod(p); setHoveredIdx(null); }}
      style={{ padding: "4px 12px", borderRadius: 20, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: period === p ? NAVY : "transparent", color: period === p ? "#fff" : SLATE, transition: "all 0.15s" }}>
      {label}
    </button>
  );

  const Header = (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Platform Commission</div>
          <button onClick={() => setLive(v => !v)} title={live ? "Live — click to pause" : "Paused — click to resume"}
            style={{ display: "flex", alignItems: "center", gap: 5, border: `1px solid ${live ? "#BBF7D0" : BORDER}`, background: live ? GREEN_LIGHT : "#fff", color: live ? GRN : SLATE, borderRadius: 20, padding: "2px 9px", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: live ? GRN : "#94A3B8", animation: live ? "commission-pulse 1.4s ease-in-out infinite" : "none" }} />
            {live ? "Live" : "Paused"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>
          Fee revenue earned by platform{updatedAt ? ` · updated ${updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: GRN }} />
          <span style={{ fontSize: 12, color: SLATE }}>Commission</span>
        </div>
        <div style={{ display: "flex", gap: 2, background: BG, borderRadius: 22, padding: "3px 4px", border: `1px solid ${BORDER}` }}>
          <PillBtn p="hour" label="Hour" /><PillBtn p="day" label="Day" /><PillBtn p="week" label="Week" /><PillBtn p="month" label="Month" />
        </div>
      </div>
    </div>
  );

  if (loading)
    return <div style={{ position: "relative" }}>{Header}<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: "#CBD5E1", fontSize: 13 }}>Loading…</div></div>;

  if (!points.length)
    return <div style={{ position: "relative" }}>{Header}<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: "#CBD5E1", fontSize: 13 }}>No commission activity in this period</div></div>;

  const VW = 520, VH = 220, PAD_L = 48, PAD_R = 16, PAD_T = 14, PAD_B = 32;
  const CW = VW - PAD_L - PAD_R, CH = VH - PAD_T - PAD_B;
  const maxVal = Math.max(...points.map(d => d.commission), 1);
  const tickStep = maxVal <= 20 ? 5 : maxVal <= 50 ? 10 : maxVal <= 200 ? 25 : maxVal <= 500 ? 50 : maxVal <= 2000 ? 250 : maxVal <= 10000 ? 1000 : 5000;
  const yMax = Math.ceil(maxVal / tickStep) * tickStep;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += tickStep) yTicks.push(v);

  const yOf = (v: number) => PAD_T + CH - (v / yMax) * CH;
  const baseY = PAD_T + CH;

  // ── bar geometry ──
  const bandW = CW / points.length;
  const barW = Math.min(bandW * 0.62, 46);
  const cxOf = (i: number) => PAD_L + bandW * (i + 0.5);
  const labelEvery = Math.ceil(points.length / 8); // thin labels when crowded

  const tooltip = hoveredIdx !== null ? points[hoveredIdx] : null;
  const ttX = hoveredIdx !== null ? (cxOf(hoveredIdx) / VW) * 100 : 0;
  const ttY = hoveredIdx !== null ? (yOf(points[hoveredIdx].commission) / VH) * 100 : 0;

  const total = points.reduce((s, d) => s + d.commission, 0);
  const unit = PERIOD_UNIT[period];

  return (
    <div style={{ position: "relative" }}>
      <style>{`@keyframes commission-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.7); } }`}</style>
      {Header}

      <div style={{ display: "flex", gap: isMobile ? 10 : 20, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Total",           value: total },
          { label: `Avg / ${unit}`,   value: Math.round(total / points.length) },
          { label: "Peak",            value: Math.max(...points.map(d => d.commission)) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: GREEN_LIGHT, borderRadius: 8, padding: "6px 14px", display: "flex", flexDirection: "column", gap: 1, flex: isMobile ? "1 1 30%" : undefined }}>
            <span style={{ fontSize: 10, color: GRN, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>{value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}</span>
          </div>
        ))}
      </div>

      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id="grad-commission" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GRN} stopOpacity="1" /><stop offset="100%" stopColor={GRN} stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line x1={PAD_L} y1={yOf(tick)} x2={VW - PAD_R} y2={yOf(tick)} stroke="#F1F5F9" strokeWidth="1" />
              <text x={PAD_L - 7} y={yOf(tick) + 4} textAnchor="end" fontSize="9.5" fill="#94A3B8" fontFamily="'Inter','Helvetica Neue',sans-serif">
                {tick >= 1000 ? `${(tick / 1000).toFixed(0)}K` : tick}
              </text>
            </g>
          ))}
          <line x1={PAD_L} y1={baseY} x2={VW - PAD_R} y2={baseY} stroke="#E2E8F0" strokeWidth="1" />

          {/* bars */}
          {points.map((d, i) => {
            const h = Math.max(baseY - yOf(d.commission), 0);
            const x = cxOf(i) - barW / 2;
            const y = yOf(d.commission);
            const active = hoveredIdx === i;
            const r = Math.min(6, barW / 2, h);
            return (
              <rect
                key={i}
                x={x} y={y} width={barW} height={h} rx={r} ry={r}
                fill="url(#grad-commission)"
                opacity={hoveredIdx === null || active ? 1 : 0.4}
                style={{ transition: "opacity 0.12s, height 0.3s ease, y 0.3s ease" }}
              />
            );
          })}

          {/* x-axis labels (thinned when crowded) */}
          {points.map((d, i) => (i % labelEvery === 0 || i === points.length - 1) ? (
            <text key={`lbl-${i}`} x={cxOf(i)} y={baseY + 18} textAnchor="middle" fontSize="9.5" fill="#94A3B8" fontWeight="500" fontFamily="'Inter','Helvetica Neue',sans-serif">
              {d.label}
            </text>
          ) : null)}

          {/* hover hit-areas */}
          {points.map((_, i) => (
            <rect key={`hit-${i}`} x={cxOf(i) - bandW / 2} y={PAD_T} width={bandW} height={CH + PAD_B} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} />
          ))}
        </svg>
        {tooltip && hoveredIdx !== null && (
          <div style={{ position: "absolute", left: `clamp(0px, calc(${ttX}% - 70px), calc(100% - 150px))`, top: `calc(${ttY}% - 62px)`, pointerEvents: "none", background: NAVY, color: "#fff", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.2)", minWidth: 140, zIndex: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>{tooltip.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: GRN, flexShrink: 0 }} />
              <span style={{ color: "#CBD5E1" }}>Commission</span>
              <span style={{ marginLeft: "auto", fontWeight: 700 }}>{tooltip.commission >= 1000 ? `${(tooltip.commission / 1000).toFixed(1)}K` : tooltip.commission}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── action button pair ────────────────────────────────────── */
const ApproveBtn: React.FC<{ onClick?: () => void; block?: boolean }> = ({ onClick, block }) => (
  <button onClick={onClick} style={{ padding: block ? "10px 0" : "6px 12px", width: block ? "100%" : undefined, borderRadius: 8, border: "none", background: "#DCFCE7", fontSize: 12, fontWeight: 600, color: "#16A34A", cursor: "pointer", fontFamily: "inherit" }}>
    Approve
  </button>
);
const DeclineBtn: React.FC<{ onClick?: () => void; block?: boolean }> = ({ onClick, block }) => (
  <button onClick={onClick} style={{ padding: block ? "10px 0" : "6px 12px", width: block ? "100%" : undefined, borderRadius: 8, border: "none", background: "#FEE2E2", fontSize: 12, fontWeight: 600, color: RED, cursor: "pointer", fontFamily: "inherit" }}>
    Decline
  </button>
);

/* ─── FinancialDashboard ────────────────────────────────────── */
export const FinancialDashboard: React.FC = () => {
  const [summary, setSummary]         = useState<FinancialSummary | null>(null);
  const [monthly, setMonthly]         = useState<MonthlyRevenue[]>([]);
  const [commission, setCommission]   = useState<MonthlyCommission[]>([]);
  const [refunds, setRefunds]         = useState<RefundRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [sortKey, setSortKey]         = useState<keyof RefundRequest>("requestedAt");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  useEffect(() => {
    Promise.all([
      fetchFinancialSummary(),
      fetchMonthlyRevenue(),
      fetchMonthlyCommission(),
      fetchPendingRefunds(),
    ])
      .then(([s, m, c, r]) => {
        setSummary(s);
        setMonthly(m);
        setCommission(c);
        setRefunds(r);
      })
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...refunds].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortDir === "asc" ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
  });

  const handleSort = (k: keyof RefundRequest) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const toggleOne  = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll  = () => setSelectedIds(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map(r => r.id)));

  const exportData = () => ({
    headers: ["Sr.No.", "Reference", "Client", "Freelancer", "Job", "Amount", "Reason", "Date"],
    rows: refunds.map((r, i) => [
      i + 1,
      r.reference ?? r.id.slice(0, 8).toUpperCase(),
      r.clientName,
      r.freelancerName,
      r.jobTitle,
      r.amount,
      REASON_LABELS[r.reason]?.label ?? r.reason,
      fmt(r.requestedAt),
    ]),
  });

  if (loading)
    return <div style={{ padding: "48px 0", textAlign: "center", color: SLATE, fontSize: 14 }}>Loading financials…</div>;

  const th: React.CSSProperties = {
    padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: SLATE,
    borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", background: BG, cursor: "pointer",
  };
  const td: React.CSSProperties = {
    padding: "14px 16px", fontSize: 14, color: NAVY, borderBottom: "1px solid #F1F5F9", verticalAlign: "middle",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>

      {/* ── stat cards ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 12 : 16 }}>
        <StatCard accent={NAVY} label="Total Revenue"
          value={`KES ${fmtK(summary?.totalRevenue ?? 0)}`} sub="Platform earnings"
          icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke={NAVY} strokeWidth="1.4" /><path d="M8 4v8M5 6h4.5a1.5 1.5 0 010 3H5" stroke={NAVY} strokeWidth="1.4" strokeLinecap="round" /></svg>}
        />
        <StatCard accent="#2563EB" label="Funds in Escrow"
          value={`KES ${fmtK(summary?.fundsInEscrow ?? 0)}`} sub="Held securely"
          icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="8" rx="2" stroke="#2563EB" strokeWidth="1.4" /><path d="M5 6V5a3 3 0 016 0v1" stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" /></svg>}
        />
        {/* ── CHANGED: was Pending Withdrawals, now Pending Refunds ── */}
        <StatCard accent={RED} label="Pending Refunds"
          value={String(refunds.length)}
          sub={`KES ${fmtK(refunds.reduce((s, r) => s + r.amount, 0))} total`}
          icon={
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 8a6 6 0 1 0 6-6" stroke={RED} strokeWidth="1.4" strokeLinecap="round" />
              <path d="M2 4v4h4"           stroke={RED} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard accent="#16A34A" label="New Deposits (30d)"
          value={`KES ${fmtK(summary?.newDeposits ?? 0)}`} sub="Last 30 days"
          icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round" /><path d="M2 12h12" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round" /></svg>}
        />
      </div>

      {/* ── charts ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? 16 : 24 }}>
          <DualLineChart data={monthly} title="Revenue Growth" />
        </div>
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? 16 : 24 }}>
          <CommissionChart data={commission} />
        </div>
      </div>

      {/* ── CHANGED: Pending Refunds table (was Pending Withdrawals) ── */}
      <div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", marginBottom: 14, gap: 10 }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Pending Refunds</span>
            <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>Escrow amounts awaiting return to clients</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <ExportBtn label="CSV" onClick={() => { const { headers, rows } = exportData(); exportCsv("pending_refunds", headers, rows); }} />
            <ExportBtn label="PDF" onClick={() => { const { headers, rows } = exportData(); exportPdf("Pending Refunds", headers, rows); }} />
          </div>
        </div>

        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", background: "#fff" }}>
          {isMobile ? (
            /* ── MOBILE cards ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
              {sorted.length === 0
                ? <div style={{ textAlign: "center", color: "#94A3B8", padding: "32px 0", fontSize: 14 }}>No pending refunds</div>
                : sorted.map(r => {
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <div key={r.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, background: isSelected ? "#FFF7ED" : "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} style={{ marginTop: 3, cursor: "pointer", accentColor: ORANGE }} />
                          <div>
                            <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "monospace" }}>{r.reference ?? r.id.slice(0, 8).toUpperCase()}</div>
                            <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, marginTop: 2 }}>{fmtAmt(r.amount)}</div>
                          </div>
                        </div>
                        {reasonBadge(r.reason)}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar src={r.clientAvatar} name={r.clientName} size={30} />
                        <div>
                          <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>Client</div>
                          <div style={{ fontSize: 13, color: NAVY }}>{r.clientName}</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase" }}>Freelancer</div>
                          <div style={{ color: "#475569", fontSize: 13 }}>{r.freelancerName}</div>
                        </div>
                        <div>
                          <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase" }}>Requested</div>
                          <div style={{ color: "#475569", fontSize: 13 }}>{fmt(r.requestedAt)}</div>
                        </div>
                      </div>

                      <div>
                        <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase" }}>Job</div>
                        <div style={{ color: "#475569", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.jobTitle}</div>
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <ApproveBtn block onClick={() => {}} />
                        <DeclineBtn block onClick={() => {}} />
                      </div>
                    </div>
                  );
                })
              }
            </div>
          ) : (
            /* ── DESKTOP table ── */
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 48 }}>
                    <input type="checkbox" checked={selectedIds.size === sorted.length && sorted.length > 0} onChange={toggleAll} style={{ accentColor: ORANGE }} />
                  </th>
                  {(
                    [
                      ["",              "Sr.No."     ],
                      ["reference",     "Ref ID"     ],
                      ["clientName",    "Client"     ],
                      ["freelancerName","Freelancer"  ],
                      ["jobTitle",      "Job"        ],
                      ["amount",        "Amount"     ],
                      ["reason",        "Reason"     ],
                      ["requestedAt",   "Date"       ],
                      ["",              "Actions"    ],
                    ] as [string, string][]
                  ).map(([k, l]) => (
                    <th key={l} style={{ ...th, textAlign: l === "Actions" ? "right" : "left" }}
                      onClick={() => k && handleSort(k as keyof RefundRequest)}>
                      {l}
                      {sortKey === k && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0
                  ? <tr><td colSpan={10} style={{ ...td, textAlign: "center", color: "#94A3B8", padding: "48px 0" }}>No pending refunds</td></tr>
                  : sorted.map((r, idx) => (
                    <tr key={r.id} style={{ transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = BG)}
                      onMouseLeave={e => (e.currentTarget.style.background = selectedIds.has(r.id) ? "#FFF7ED" : "#fff")}>
                      <td style={td}>
                        <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleOne(r.id)} style={{ accentColor: ORANGE }} />
                      </td>
                      <td style={{ ...td, color: "#94A3B8", fontSize: 13 }}>{String(idx + 1).padStart(2, "0")}</td>
                      <td style={{ ...td, fontSize: 12, color: SLATE, fontFamily: "monospace" }}>
                        {r.reference ?? r.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar src={r.clientAvatar} name={r.clientName} size={32} />
                          <span>{r.clientName}</span>
                        </div>
                      </td>
                      <td style={{ ...td, color: SLATE }}>{r.freelancerName}</td>
                      <td style={{ ...td, fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.jobTitle}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{fmtAmt(r.amount)}</td>
                      <td style={td}>{reasonBadge(r.reason)}</td>
                      <td style={{ ...td, color: SLATE, whiteSpace: "nowrap" }}>{fmt(r.requestedAt)}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <ApproveBtn />
                          <DeclineBtn />
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};