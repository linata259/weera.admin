import React, { useEffect, useState } from "react";
import {
  fetchFinancialSummary,
 
  fetchMonthlyCommission,
 
  fetchMonthlyRevenue,
  fetchPendingWithdrawals,
} from "../api/financialService";
import { FinancialSummary, MonthlyCommission, MonthlyRevenue, WalletTransaction } from "../types";
import { exportCsv } from "../utils/exportCsv";
import { exportPdf } from "../utils/exportPdf";
import { Avatar } from "../../shared/Avatar";

const ORANGE = "#EA580C";
const NAVY = "#0F172A";
const SLATE = "#64748B";
const BORDER = "#E2E8F0";
const BG = "#F8FAFC";

const fmtK = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);
const fmtAmt = (n: number) =>
  `KES ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/* ─── StatCard ─────────────────────────────────────────────── */
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}> = ({ icon, label, value, sub, accent }) => (
  <div
    style={{
      background: "#fff",
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: accent,
        borderRadius: "14px 14px 0 0",
      }}
    />
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 13, color: SLATE, fontWeight: 500 }}>
        {label}
      </span>
    </div>
    <div
      style={{ fontSize: 28, fontWeight: 800, color: NAVY, letterSpacing: -0.5 }}
    >
      {value}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 2v8M2 6l4-4 4 4"
          stroke="#16A34A"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>
        {sub}
      </span>
    </div>
  </div>
);

/* ─── helpers ───────────────────────────────────────────────── */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) * 0.45;
    const cp1y = pts[i].y;
    const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) * 0.45;
    const cp2y = pts[i + 1].y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
}

function areaPath(
  pts: { x: number; y: number }[],
  baseY: number
): string {
  if (pts.length < 2) return "";
  const curve = smoothPath(pts);
  return (
    curve +
    ` L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`
  );
}

type Period = "day" | "week" | "month";

/* ─── DualLineChart ─────────────────────────────────────────── */
export const DualLineChart: React.FC<{
  data: MonthlyRevenue[];
  title: string;
}> = ({ data, title }) => {
  const [period, setPeriod] = useState<Period>("month");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  /* slice data by period */
  const sliced: MonthlyRevenue[] =
    period === "day"
      ? data.slice(-1)
      : period === "week"
      ? data.slice(-4)
      : data;

  if (!sliced.length)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 220,
          color: "#CBD5E1",
          fontSize: 13,
        }}
      >
        No data
      </div>
    );

  /* layout */
  const VW = 520;
  const VH = 220;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 14;
  const PAD_B = 32;
  const CW = VW - PAD_L - PAD_R;
  const CH = VH - PAD_T - PAD_B;

  const maxVal = Math.max(
    ...sliced.map((d) => Math.max(d.revenue, d.escrow)),
    1
  );
  const tickStep =
    maxVal <= 20 ? 5 : maxVal <= 50 ? 10 : maxVal <= 200 ? 25 : maxVal <= 500 ? 50 : 100;
  const yMax = Math.ceil(maxVal / tickStep) * tickStep;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += tickStep) yTicks.push(v);

  const xOf = (i: number) =>
    PAD_L +
    (sliced.length === 1 ? CW / 2 : (i / (sliced.length - 1)) * CW);
  const yOf = (v: number) => PAD_T + CH - (v / yMax) * CH;

  const revPts = sliced.map((d, i) => ({ x: xOf(i), y: yOf(d.revenue) }));
  const escPts = sliced.map((d, i) => ({ x: xOf(i), y: yOf(d.escrow) }));
  const baseY = PAD_T + CH;

  /* tooltip position — convert SVG coords to CSS % */
  const tooltip =
    hoveredIdx !== null
      ? {
          idx: hoveredIdx,
          svgX: xOf(hoveredIdx),
          svgY: Math.min(
            yOf(sliced[hoveredIdx].revenue),
            yOf(sliced[hoveredIdx].escrow)
          ),
          rev: sliced[hoveredIdx].revenue,
          esc: sliced[hoveredIdx].escrow,
          label: sliced[hoveredIdx].month,
        }
      : null;

  const pctX = tooltip ? (tooltip.svgX / VW) * 100 : 0;
  const pctY = tooltip ? (tooltip.svgY / VH) * 100 : 0;

  /* period pill button */
  const PillBtn = ({
    p,
    label,
  }: {
    p: Period;
    label: string;
  }) => (
    <button
      onClick={() => { setPeriod(p); setHoveredIdx(null); }}
      style={{
        padding: "4px 12px",
        borderRadius: 20,
        border: "none",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        background: period === p ? NAVY : "transparent",
        color: period === p ? "#fff" : SLATE,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ position: "relative" }}>
      {/* header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
          {title}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* legend */}
          <div style={{ display: "flex", gap: 14 }}>
            {[
              { color: ORANGE, label: "Revenue" },
              { color: NAVY, label: "Escrow" },
            ].map(({ color, label }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <div
                  style={{
                    width: 20,
                    height: 2.5,
                    borderRadius: 2,
                    background: color,
                  }}
                />
                <span style={{ fontSize: 12, color: SLATE }}>{label}</span>
              </div>
            ))}
          </div>

          {/* period pills */}
          <div
            style={{
              display: "flex",
              gap: 2,
              background: BG,
              borderRadius: 22,
              padding: "3px 4px",
              border: `1px solid ${BORDER}`,
            }}
          >
            <PillBtn p="day" label="Day" />
            <PillBtn p="week" label="Week" />
            <PillBtn p="month" label="Month" />
          </div>
        </div>
      </div>

      {/* chart wrapper — position:relative for tooltip */}
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          style={{ width: "100%", display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`grad-rev-${title.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORANGE} stopOpacity="0.18" />
              <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`grad-esc-${title.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={NAVY} stopOpacity="0.10" />
              <stop offset="100%" stopColor={NAVY} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* y gridlines + labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PAD_L} y1={yOf(tick)}
                x2={VW - PAD_R} y2={yOf(tick)}
                stroke="#F1F5F9" strokeWidth="1"
              />
              <text
                x={PAD_L - 7} y={yOf(tick) + 4}
                textAnchor="end" fontSize="9.5" fill="#94A3B8"
                fontFamily="'DM Sans','Helvetica Neue',sans-serif"
              >
                {tick >= 1000 ? `${(tick / 1000).toFixed(0)}K` : tick}
              </text>
            </g>
          ))}

          {/* x baseline */}
          <line
            x1={PAD_L} y1={baseY}
            x2={VW - PAD_R} y2={baseY}
            stroke="#E2E8F0" strokeWidth="1"
          />

          {/* area fills */}
          <path
            d={areaPath(escPts, baseY)}
            fill={`url(#grad-esc-${title.replace(/\s/g,'')})`}
          />
          <path
            d={areaPath(revPts, baseY)}
            fill={`url(#grad-rev-${title.replace(/\s/g,'')})`}
          />

          {/* lines */}
          <path
            d={smoothPath(escPts)}
            fill="none" stroke={NAVY}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
          <path
            d={smoothPath(revPts)}
            fill="none" stroke={ORANGE}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />

          {/* hover crosshair */}
          {hoveredIdx !== null && (
            <line
              x1={xOf(hoveredIdx)} y1={PAD_T}
              x2={xOf(hoveredIdx)} y2={baseY}
              stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 3"
            />
          )}

          {/* dots */}
          {revPts.map((p, i) => (
            <circle
              key={i} cx={p.x} cy={p.y}
              r={hoveredIdx === i ? 5 : 3}
              fill={ORANGE}
              style={{ transition: "r 0.1s" }}
            />
          ))}
          {escPts.map((p, i) => (
            <circle
              key={i} cx={p.x} cy={p.y}
              r={hoveredIdx === i ? 5 : 3}
              fill={NAVY}
              style={{ transition: "r 0.1s" }}
            />
          ))}

          {/* x labels */}
          {sliced.map((d, i) => (
            <g key={i}>
              <line
                x1={xOf(i)} y1={baseY}
                x2={xOf(i)} y2={baseY + 5}
                stroke="#CBD5E1" strokeWidth="0.8"
              />
              <text
                x={xOf(i)} y={baseY + 18}
                textAnchor="middle" fontSize="9.5" fill="#94A3B8"
                fontWeight="500"
                fontFamily="'DM Sans','Helvetica Neue',sans-serif"
              >
                {d.month.slice(0, 3).toUpperCase()}
              </text>
            </g>
          ))}

          {/* invisible hit areas */}
          {sliced.map((_, i) => (
            <rect
              key={i}
              x={xOf(i) - CW / Math.max(sliced.length * 2, 2)}
              y={PAD_T}
              width={CW / Math.max(sliced.length - 1, 1)}
              height={CH + PAD_B}
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* tooltip */}
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: `clamp(0px, calc(${pctX}% - 70px), calc(100% - 150px))`,
              top: `calc(${pctY}% - 72px)`,
              pointerEvents: "none",
              background: NAVY,
              color: "#fff",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(15,23,42,0.2)",
              minWidth: 140,
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 11,
                color: "#94A3B8",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {tooltip.label}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: ORANGE,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#CBD5E1" }}>Revenue</span>
              <span style={{ marginLeft: "auto", fontWeight: 700 }}>
                {tooltip.rev >= 1000
                  ? `${(tooltip.rev / 1000).toFixed(1)}K`
                  : tooltip.rev}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#94A3B8",
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#CBD5E1" }}>Escrow</span>
              <span style={{ marginLeft: "auto", fontWeight: 700 }}>
                {tooltip.esc >= 1000
                  ? `${(tooltip.esc / 1000).toFixed(1)}K`
                  : tooltip.esc}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── ExportBtn ─────────────────────────────────────────────── */
const ExportBtn: React.FC<{ label: string; onClick: () => void }> = ({
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    style={{
      padding: "7px 14px",
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      background: "#fff",
      fontSize: 13,
      fontWeight: 600,
      color: NAVY,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "inherit",
    }}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M14 10v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2M8 2v8M5 5l3-3 3 3"
        stroke={NAVY}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    {label}
  </button>
);

/* ─── CommissionChart ───────────────────────────────────────── */
const GREEN = "#16A34A";
const GREEN_LIGHT = "#DCFCE7";

export const CommissionChart: React.FC<{
  data: MonthlyCommission[];
}> = ({ data }) => {
  const [period, setPeriod] = useState<Period>("month");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const sliced: MonthlyCommission[] =
    period === "day"
      ? data.slice(-1)
      : period === "week"
      ? data.slice(-4)
      : data;

  if (!sliced.length)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: "#CBD5E1", fontSize: 13 }}>
        No data
      </div>
    );

  const VW = 520;
  const VH = 220;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 14;
  const PAD_B = 32;
  const CW = VW - PAD_L - PAD_R;
  const CH = VH - PAD_T - PAD_B;

  const maxVal = Math.max(...sliced.map((d) => d.commission), 1);
  const tickStep = maxVal <= 20 ? 5 : maxVal <= 50 ? 10 : maxVal <= 200 ? 25 : maxVal <= 500 ? 50 : 100;
  const yMax = Math.ceil(maxVal / tickStep) * tickStep;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += tickStep) yTicks.push(v);

  const xOf = (i: number) =>
    PAD_L + (sliced.length === 1 ? CW / 2 : (i / (sliced.length - 1)) * CW);
  const yOf = (v: number) => PAD_T + CH - (v / yMax) * CH;
  const baseY = PAD_T + CH;

  const pts = sliced.map((d, i) => ({ x: xOf(i), y: yOf(d.commission) }));
  const linePath = smoothPath(pts);
  const fillPath = linePath + ` L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`;

  const tooltip = hoveredIdx !== null ? sliced[hoveredIdx] : null;
  const ttX = hoveredIdx !== null ? (xOf(hoveredIdx) / VW) * 100 : 0;
  const ttY = hoveredIdx !== null ? (yOf(sliced[hoveredIdx].commission) / VH) * 100 : 0;

  const PillBtn = ({ p, label }: { p: Period; label: string }) => (
    <button
      onClick={() => { setPeriod(p); setHoveredIdx(null); }}
      style={{
        padding: "4px 12px", borderRadius: 20, border: "none",
        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        background: period === p ? NAVY : "transparent",
        color: period === p ? "#fff" : SLATE,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ position: "relative" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
            Platform Commission
          </div>
          <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>
            Fee revenue earned by platform
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 20, height: 2.5, borderRadius: 2, background: GREEN }} />
            <span style={{ fontSize: 12, color: SLATE }}>Commission</span>
          </div>
          {/* period pills */}
          <div style={{ display: "flex", gap: 2, background: BG, borderRadius: 22, padding: "3px 4px", border: `1px solid ${BORDER}` }}>
            <PillBtn p="day" label="Day" />
            <PillBtn p="week" label="Week" />
            <PillBtn p="month" label="Month" />
          </div>
        </div>
      </div>

      {/* summary row */}
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        {[
          { label: "Total", value: sliced.reduce((s, d) => s + d.commission, 0) },
          { label: "Avg / mo", value: Math.round(sliced.reduce((s, d) => s + d.commission, 0) / sliced.length) },
          { label: "Peak", value: Math.max(...sliced.map((d) => d.commission)) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: GREEN_LIGHT, borderRadius: 8, padding: "6px 14px", display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 10, color: GREEN, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>
              {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
            </span>
          </div>
        ))}
      </div>

      {/* chart */}
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id="grad-commission" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity="0.22" />
              <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* y gridlines + labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line x1={PAD_L} y1={yOf(tick)} x2={VW - PAD_R} y2={yOf(tick)} stroke="#F1F5F9" strokeWidth="1" />
              <text x={PAD_L - 7} y={yOf(tick) + 4} textAnchor="end" fontSize="9.5" fill="#94A3B8" fontFamily="'DM Sans','Helvetica Neue',sans-serif">
                {tick >= 1000 ? `${(tick / 1000).toFixed(0)}K` : tick}
              </text>
            </g>
          ))}

          {/* x baseline */}
          <line x1={PAD_L} y1={baseY} x2={VW - PAD_R} y2={baseY} stroke="#E2E8F0" strokeWidth="1" />

          {/* area fill */}
          <path d={fillPath} fill="url(#grad-commission)" />

          {/* line */}
          <path d={linePath} fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* crosshair */}
          {hoveredIdx !== null && (
            <line x1={xOf(hoveredIdx)} y1={PAD_T} x2={xOf(hoveredIdx)} y2={baseY} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 3" />
          )}

          {/* dots */}
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={hoveredIdx === i ? 5 : 3} fill={GREEN} style={{ transition: "r 0.1s" }} />
          ))}

          {/* x labels */}
          {sliced.map((d, i) => (
            <g key={i}>
              <line x1={xOf(i)} y1={baseY} x2={xOf(i)} y2={baseY + 5} stroke="#CBD5E1" strokeWidth="0.8" />
              <text x={xOf(i)} y={baseY + 18} textAnchor="middle" fontSize="9.5" fill="#94A3B8" fontWeight="500" fontFamily="'DM Sans','Helvetica Neue',sans-serif">
                {d.month.slice(0, 3).toUpperCase()}
              </text>
            </g>
          ))}

          {/* hit areas */}
          {sliced.map((_, i) => (
            <rect
              key={i}
              x={xOf(i) - CW / Math.max(sliced.length * 2, 2)}
              y={PAD_T}
              width={CW / Math.max(sliced.length - 1, 1)}
              height={CH + PAD_B}
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* tooltip */}
        {tooltip && hoveredIdx !== null && (
          <div style={{
            position: "absolute",
            left: `clamp(0px, calc(${ttX}% - 70px), calc(100% - 150px))`,
            top: `calc(${ttY}% - 72px)`,
            pointerEvents: "none",
            background: NAVY,
            color: "#fff",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(15,23,42,0.2)",
            minWidth: 140,
            zIndex: 10,
          }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {tooltip.month}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, flexShrink: 0 }} />
              <span style={{ color: "#CBD5E1" }}>Commission</span>
              <span style={{ marginLeft: "auto", fontWeight: 700 }}>
                {tooltip.commission >= 1000 ? `${(tooltip.commission / 1000).toFixed(1)}K` : tooltip.commission}
              </span>
            </div>
            {tooltip.feeRate !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#94A3B8", flexShrink: 0 }} />
                <span style={{ color: "#CBD5E1" }}>Fee rate</span>
                <span style={{ marginLeft: "auto", fontWeight: 700 }}>{tooltip.feeRate}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── FinancialDashboard ────────────────────────────────────── */
export const FinancialDashboard: React.FC = () => {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([]);
  const [commission, setCommission] = useState<MonthlyCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof WalletTransaction>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetchFinancialSummary(),
      fetchMonthlyRevenue(),
      fetchMonthlyCommission(),
      fetchPendingWithdrawals(),
    ])
      .then(([s, m, c, w]) => {
        setSummary(s);
        setMonthly(m);
        setCommission(c);
        setWithdrawals(w);
      })
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...withdrawals].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortDir === "asc" ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
  });

  const handleSort = (k: keyof WalletTransaction) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const exportData = () => {
    const headers = ["Sr.No.", "Reference", "Bidder", "Amount", "Request Date", "Status"];
    const rows = withdrawals.map((r, i) => [
      i + 1,
      r.reference ?? r.id.slice(0, 8),
      r.userName,
      r.amount,
      fmt(r.createdAt),
      r.status,
    ]);
    return { headers, rows };
  };

  if (loading)
    return (
      <div style={{ padding: "48px 0", textAlign: "center", color: SLATE, fontSize: 14 }}>
        Loading financials…
      </div>
    );

  const th: React.CSSProperties = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 13,
    fontWeight: 600,
    color: SLATE,
    borderBottom: `1px solid ${BORDER}`,
    whiteSpace: "nowrap",
    background: BG,
    cursor: "pointer",
  };
  const td: React.CSSProperties = {
    padding: "14px 16px",
    fontSize: 14,
    color: NAVY,
    borderBottom: "1px solid #F1F5F9",
    verticalAlign: "middle",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
      }}
    >
      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <StatCard
          accent={NAVY} label="Total Revenue"
          value={`KES ${fmtK(summary?.totalRevenue ?? 0)}`}
          sub="Platform earnings"
          icon={
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke={NAVY} strokeWidth="1.4" />
              <path d="M8 4v8M5 6h4.5a1.5 1.5 0 010 3H5" stroke={NAVY} strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          accent="#2563EB" label="Funds in Escrow"
          value={`KES ${fmtK(summary?.fundsInEscrow ?? 0)}`}
          sub="Held securely"
          icon={
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="6" width="12" height="8" rx="2" stroke="#2563EB" strokeWidth="1.4" />
              <path d="M5 6V5a3 3 0 016 0v1" stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          accent="#CA8A04" label="Pending Withdrawals"
          value={String(summary?.pendingWithdrawalsCount ?? 0)}
          sub={`KES ${fmtK(summary?.pendingWithdrawalsAmount ?? 0)} total`}
          icon={
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 7l3 3 3-3" stroke="#CA8A04" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M2 12h12" stroke="#CA8A04" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          accent="#16A34A" label="New Deposits (30d)"
          value={`KES ${fmtK(summary?.newDeposits ?? 0)}`}
          sub="Last 30 days"
          icon={
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M8 10V2M5 5l3-3 3 3" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M2 12h12" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
          <DualLineChart data={monthly} title="Revenue Growth" />
        </div>
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
          <CommissionChart data={commission} />
        </div>
      </div>

      {/* pending withdrawals */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Pending Withdrawals</span>
          <div style={{ display: "flex", gap: 8 }}>
            <ExportBtn label="CSV" onClick={() => { const { headers, rows } = exportData(); exportCsv("pending_withdrawals", headers, rows); }} />
            <ExportBtn label="PDF" onClick={() => { const { headers, rows } = exportData(); exportPdf("Pending Withdrawals", headers, rows); }} />
          </div>
        </div>

        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 48 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === sorted.length && sorted.length > 0}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        prev.size === sorted.length ? new Set() : new Set(sorted.map((r) => r.id))
                      )
                    }
                    style={{ accentColor: ORANGE }}
                  />
                </th>
                {(
                  [
                    ["", "Sr.No."],
                    ["reference" as keyof WalletTransaction, "Request Id"],
                    ["userName" as keyof WalletTransaction, "Bidder"],
                    ["amount" as keyof WalletTransaction, "Amount"],
                    ["createdAt" as keyof WalletTransaction, "Request Date"],
                    ["status" as keyof WalletTransaction, "Status"],
                    ["", "Action"],
                  ] as [string, string][]
                ).map(([k, l]) => (
                  <th
                    key={l}
                    style={{ ...th, textAlign: l === "Action" ? "right" : "left" }}
                    onClick={() => k && handleSort(k as keyof WalletTransaction)}
                  >
                    {l}
                    {sortKey === k && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...td, textAlign: "center", color: "#94A3B8", padding: "48px 0" }}>
                    No pending withdrawals
                  </td>
                </tr>
              ) : (
                sorted.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{ transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = BG)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() =>
                          setSelectedIds((p) => {
                            const n = new Set(p);
                            n.has(r.id) ? n.delete(r.id) : n.add(r.id);
                            return n;
                          })
                        }
                        style={{ accentColor: ORANGE }}
                      />
                    </td>
                    <td style={{ ...td, color: "#94A3B8", fontSize: 13 }}>{String(idx + 1).padStart(2, "0")}</td>
                    <td style={{ ...td, fontSize: 12, color: SLATE, fontFamily: "monospace" }}>
                      {r.reference ?? r.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar src={r.userAvatar} name={r.userName} size={32} />
                        <span>{r.userName}</span>
                      </div>
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>{fmtAmt(r.amount)}</td>
                    <td style={{ ...td, color: SLATE, whiteSpace: "nowrap" }}>{fmt(r.createdAt)}</td>
                    <td style={td}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "#FEF9C3", color: "#CA8A04" }}>
                        Pending
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", fontSize: 12, fontWeight: 600, color: NAVY, cursor: "pointer", fontFamily: "inherit" }}>
                        Approve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};