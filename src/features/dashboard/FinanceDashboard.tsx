import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  FiDollarSign, FiPercent, FiAlertCircle, FiDownload, FiLock,
  FiArrowUpRight, FiArrowDownRight,
} from "react-icons/fi";

import {
  fetchFinanceDashboardData, FinanceDashboardData, TransactionRow,
} from "./services/financeDashboardService";
import { KpiTrend } from "./services/superAdminService";
import { useNavbar } from "../../hooks/Navbarcontext";

const ORANGE = "#EA580C";
const TEXT_DARK = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#EEF2F6";
const GREEN = "#16A34A";
const RED = "#DC2626";
const AMBER = "#D97706";
const BLUE = "#2563EB";
const PINK = "#EC4899";

const Icon: React.FC<{ icon: (props: any) => any; size?: number; color?: string }> = ({
  icon, size, color,
}) => {
  const Component = icon as React.ComponentType<{ size?: number; color?: string }>;
  return <Component size={size} color={color} />;
};

const card: React.CSSProperties = {
  borderRadius: 16,
  border: `1px solid ${BORDER}`,
  background: "#fff",
  padding: 20,
  boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
  minWidth: 0,
};

const fmtMoney = (v: number): string => {
  if (v >= 1_000_000) return `KSh ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KSh ${(v / 1_000).toFixed(1)}K`;
  return `KSh ${(Math.round(v * 100) / 100).toLocaleString()}`;
};

const TrendChip: React.FC<{ trend: KpiTrend }> = ({ trend }) => {
  const up = trend.direction === "up";
  const flat = trend.direction === "flat";
  const color = flat ? MUTED : up ? GREEN : RED;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: MUTED }}>
      {!flat && <Icon icon={up ? FiArrowUpRight : FiArrowDownRight} size={13} color={color} />}
      <span style={{ color, fontWeight: 700 }}>
        {flat ? "—" : `${up ? "+" : "-"}${trend.changePercent}%`}
      </span>
      <span>vs last month</span>
    </div>
  );
};

const KpiCard: React.FC<{
  icon: (props: any) => any;
  label: string;
  value: string;
  trend?: KpiTrend;
  sub?: string;
  loading: boolean;
}> = ({ icon, label, value, trend, sub, loading }) => (
  <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: "#FFF4EE",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon icon={icon} size={16} color={ORANGE} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>{label}</span>
    </div>
    {loading ? (
      <div style={{ height: 30, width: "60%", borderRadius: 6, background: "#F1F5F9" }} />
    ) : (
      <div style={{ fontSize: 26, fontWeight: 800, color: TEXT_DARK, letterSpacing: -0.5 }}>
        {value}
      </div>
    )}
    {!loading && (trend ? <TrendChip trend={trend} /> : sub ? (
      <div style={{ fontSize: 12, color: MUTED }}>{sub}</div>
    ) : null)}
  </div>
);

/* ── Transactions table ────────────────────────────────────── */

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
];

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  escrow_lock: "Escrow Lock",
  escrow_release: "Escrow Release",
  withdrawal: "Withdrawal",
  milestone_payment: "Milestone Payment",
  platform_fee: "Platform Fee",
};

const MONEY_IN = ["deposit", "escrow_lock", "milestone_payment", "platform_fee"];

const normStatus = (s: string): "completed" | "pending" | "failed" | "other" => {
  const v = s.toLowerCase();
  if (["completed", "complete", "success", "succeeded"].includes(v)) return "completed";
  if (["pending", "processing", "in_progress"].includes(v)) return "pending";
  if (["failed", "declined", "error", "cancelled", "canceled"].includes(v)) return "failed";
  return "other";
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = normStatus(status);
  const map = {
    completed: { bg: "#F0FDF4", color: GREEN },
    pending: { bg: "#FFFBEB", color: AMBER },
    failed: { bg: "#FEF2F2", color: RED },
    other: { bg: "#F1F5F9", color: MUTED },
  }[s];
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 700, color: map.color, background: map.bg,
      borderRadius: 999, padding: "3px 10px", textTransform: "capitalize",
    }}>
      {status || "—"}
    </span>
  );
};

/* ── Page ──────────────────────────────────────────────────── */

export function FinanceDashboardPage() {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { setBreadcrumb } = useNavbar();

  // page title lives in the navbar instead of on the page
  useEffect(() => {
    setBreadcrumb({ parent: "", current: "Finance Dashboard" });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  useEffect(() => {
    fetchFinanceDashboardData()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e?.message ?? "Failed to load financial data"))
      .finally(() => setLoading(false));
  }, []);

  const k = data?.kpis;

  const filteredTx = useMemo(() => {
    let tx: TransactionRow[] = data?.transactions ?? [];
    if (statusTab !== "all") tx = tx.filter((t) => normStatus(t.status) === statusTab);
    if (typeFilter !== "all") tx = tx.filter((t) => t.type === typeFilter);
    return tx.slice(0, 25);
  }, [data, statusTab, typeFilter]);

  const availableTypes = useMemo(() => {
    const set = new Set((data?.transactions ?? []).map((t) => t.type));
    return Array.from(set);
  }, [data]);

  const maxStatusAmount = Math.max(1, ...(data?.statusBreakdown ?? []).map((s) => s.amount));

  return (
    <div style={{
      width: "100%", display: "flex", flexDirection: "column", gap: 20,
      background: "#F8FAFC", padding: 0,
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
    }}>
      {error && (
        <div style={{
          borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2",
          padding: "12px 16px", fontSize: 13, color: "#B91C1C",
        }}>
          {error}
        </div>
      )}

      {/* KPI row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 14,
      }}>
        <KpiCard icon={FiLock} label="Funds in Escrow" loading={loading}
          value={k ? fmtMoney(k.fundsInEscrow) : ""} sub="currently locked" />
        <KpiCard icon={FiDollarSign} label="Total Revenue" loading={loading}
          value={k ? fmtMoney(k.totalRevenue) : ""} sub="all-time money in" />
        <KpiCard icon={FiPercent} label="Platform Fees (10%)" loading={loading}
          value={k ? fmtMoney(k.platformFees) : ""} sub="earned commission" />
        <KpiCard icon={FiAlertCircle} label="Failed Payments" loading={loading}
          value={k ? String(k.failedPayments) : ""} sub="all transactions" />
        <KpiCard icon={FiDownload} label="Pending Withdrawals" loading={loading}
          value={k ? String(k.pendingWithdrawalsCount) : ""}
          sub={k ? `${fmtMoney(k.pendingWithdrawalsAmount)} total` : undefined} />
      </div>

      {/* revenue trend + status breakdown */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ ...card, flex: "2 1 380px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginBottom: 4 }}>
            Revenue Trend
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
            Money in vs payouts — last 12 months
          </div>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={data?.revenueTrend ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                <Line type="monotone" dataKey="revenue" name="Money in" stroke={BLUE} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="payouts" name="Payouts" stroke={PINK} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...card, flex: "1 1 300px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginBottom: 12 }}>
            Payment Status Breakdown
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(data?.statusBreakdown ?? []).map((s) => (
              <div key={s.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                  <span style={{ color: TEXT_DARK, marginRight: "auto" }}>
                    {s.label} <span style={{ color: MUTED }}>({s.count})</span>
                  </span>
                  <span style={{ fontWeight: 700, color: TEXT_DARK }}>{fmtMoney(s.amount)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "#F1F5F9" }}>
                  <div style={{
                    height: 6, borderRadius: 999, background: s.color,
                    width: `${Math.max(3, (s.amount / maxStatusAmount) * 100)}%`,
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
            ))}
            {loading && <div style={{ fontSize: 12.5, color: MUTED }}>Loading…</div>}
          </div>
        </div>
      </div>

      {/* transactions */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10,
          padding: "16px 20px", borderBottom: `1px solid ${BORDER}`,
        }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginRight: "auto" }}>
            Transactions
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {STATUS_TABS.map((t) => (
              <button key={t.key} onClick={() => setStatusTab(t.key)} style={{
                border: "none", borderRadius: 999, padding: "6px 14px", fontSize: 12.5,
                fontWeight: 700, cursor: "pointer",
                background: statusTab === t.key ? ORANGE : "#F1F5F9",
                color: statusTab === t.key ? "#fff" : "#475569",
              }}>
                {t.label}
              </button>
            ))}
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{
            border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 10px",
            fontSize: 12.5, color: "#475569", background: "#fff",
          }}>
            <option value="all">All types</option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Type", "Status", "Date", "Amount"].map((h) => (
                  <th key={h} style={{
                    textAlign: h === "Amount" ? "right" : "left",
                    padding: "10px 20px", fontSize: 11.5, fontWeight: 700, color: MUTED,
                    textTransform: "uppercase", letterSpacing: 0.4,
                    borderBottom: `1px solid ${BORDER}`,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTx.map((t) => {
                const moneyIn = MONEY_IN.includes(t.type);
                return (
                  <tr key={t.id}>
                    <td style={{ padding: "12px 20px", fontSize: 13, color: TEXT_DARK, borderBottom: "1px solid #F8FAFC", fontWeight: 500 }}>
                      {TYPE_LABELS[t.type] ?? t.type}
                    </td>
                    <td style={{ padding: "12px 20px", borderBottom: "1px solid #F8FAFC" }}>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: 12.5, color: MUTED, borderBottom: "1px solid #F8FAFC" }}>
                      {new Date(t.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td style={{
                      padding: "12px 20px", fontSize: 13, fontWeight: 700, textAlign: "right",
                      color: moneyIn ? GREEN : RED, borderBottom: "1px solid #F8FAFC",
                    }}>
                      {moneyIn ? "+" : "-"}{fmtMoney(t.amount)}
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredTx.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 24, textAlign: "center", fontSize: 13, color: MUTED }}>
                    No transactions match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FinanceDashboardPage;
