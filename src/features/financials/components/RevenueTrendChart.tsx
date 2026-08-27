import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BG, BORDER, NAVY, ORANGE, SLATE, fmtAmt } from "./shared";

/* ─── Revenue trend chart ─────────────────────────────────────────────────────
 *
 * Its own module so it can be its own chunk. recharts and its dependencies are
 * around 375KB of JavaScript, and while this chart lived inside PlatformRevenue
 * all of that had to arrive before the tab could render a single number. Now
 * the table and totals paint immediately and the chart fills in behind them.
 *
 * Fed by its own twelve-month query rather than by the grid — the grid holds
 * one page, which would have left this drawing 25 rows and calling it a year.
 */

export type TrendPeriod = "day" | "week" | "month";
export interface TrendEvent {
  ts: string;
  type: string;
  amount: number;
}

function startOfWeekPR(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Most recent N buckets containing data, so the chart is never empty just
// because activity is sparse or old.
export function bucketRevenue(rows: TrendEvent[], period: TrendPeriod) {
  const KEEP: Record<TrendPeriod, number> = { day: 14, week: 8, month: 12 };
  const buckets = new Map<string, { label: string; sort: number; revenue: number }>();

  for (const r of rows) {
    const d = new Date(r.ts);
    let key: string;
    let label: string;
    let sort: number;
    if (period === "day") {
      key = d.toISOString().slice(0, 10);
      label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      sort = new Date(key).getTime();
    } else if (period === "week") {
      const ws = startOfWeekPR(d);
      key = ws.toISOString().slice(0, 10);
      label = ws.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      sort = ws.getTime();
    } else {
      key = `${d.getFullYear()}-${d.getMonth()}`;
      label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      sort = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    }
    const b = buckets.get(key);
    if (b) b.revenue += r.amount;
    else buckets.set(key, { label, sort, revenue: r.amount });
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.sort - b.sort)
    .slice(-KEEP[period])
    .map((b) => ({ label: b.label, revenue: Math.round(b.revenue * 100) / 100 }));
}

const RevenueTrendChart: React.FC<{ rows: TrendEvent[]; loading: boolean }> = ({
  rows,
  loading,
}) => {
  const [period, setPeriod] = useState<TrendPeriod>("day");
  const points = useMemo(() => bucketRevenue(rows, period), [rows, period]);

  const trendPct = useMemo(() => {
    if (points.length < 2) return null;
    const prev = points[points.length - 2].revenue;
    const last = points[points.length - 1].revenue;
    if (prev <= 0) return null;
    return Math.round(((last - prev) / prev) * 1000) / 10;
  }, [points]);

  const Pill = ({ p, label }: { p: TrendPeriod; label: string }) => (
    <button
      onClick={() => setPeriod(p)}
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
    <div
      style={{
        background: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ marginRight: "auto" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
            Revenue Trend
          </div>
          <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>
            Money into the platform · last 12 months
            {trendPct != null && (
              <span
                style={{
                  color: trendPct >= 0 ? "#16A34A" : "#DC2626",
                  fontWeight: 700,
                }}
              >
                {" "}
                · {trendPct >= 0 ? "+" : ""}
                {trendPct}% vs previous {period}
              </span>
            )}
          </div>
        </div>
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
          <Pill p="day" label="Daily" />
          <Pill p="week" label="Weekly" />
          <Pill p="month" label="Monthly" />
        </div>
      </div>

      {loading || points.length === 0 ? (
        <div
          style={{
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#CBD5E1",
            fontSize: 13,
          }}
        >
          {loading ? "Loading revenue…" : "No completed revenue transactions yet"}
        </div>
      ) : (
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <AreaChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="prTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ORANGE} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: SLATE }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: SLATE }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)
                }
              />
              <Tooltip formatter={(v: any) => fmtAmt(Number(v))} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={ORANGE}
                strokeWidth={2}
                fill="url(#prTrendFill)"
                dot={{ r: 3, fill: ORANGE }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default RevenueTrendChart;
