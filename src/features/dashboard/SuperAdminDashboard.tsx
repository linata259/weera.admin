import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  FiDollarSign, FiUsers, FiBriefcase, FiActivity, FiAlertCircle, FiLock,
  FiTrendingUp, FiPercent, FiArrowUpRight, FiArrowDownRight,
} from "react-icons/fi";

import { fetchSuperAdminData, SuperAdminData, KpiTrend } from "./services/superAdminService";
import { useUserGrowthChart } from "./hooks/useUserGrowthChart";
import { UserGrowthChart } from "./components/UserGrowthChart";
import { useRecentActivity } from "./hooks/useRecentActivity";
import { ActivityFeed } from "./components/ActivityFeed";
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

/* react-icons TS2786 workaround (same pattern as Sidebar) */
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
  return `KSh ${Math.round(v).toLocaleString()}`;
};

const fmtNum = (v: number): string => v.toLocaleString();

/* ── KPI card ──────────────────────────────────────────────── */

const TrendChip: React.FC<{ trend: KpiTrend; suffix?: string }> = ({
  trend, suffix = "vs last month",
}) => {
  const up = trend.direction === "up";
  const flat = trend.direction === "flat";
  const color = flat ? MUTED : up ? GREEN : RED;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: MUTED }}>
      {!flat && (
        <span style={{ display: "flex", alignItems: "center", color }}>
          <Icon icon={up ? FiArrowUpRight : FiArrowDownRight} size={13} color={color} />
        </span>
      )}
      <span style={{ color, fontWeight: 700 }}>
        {flat ? "—" : `${up ? "+" : "-"}${trend.changePercent}%`}
      </span>
      <span>{suffix}</span>
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
      <div
        style={{
          width: 32, height: 32, borderRadius: 8, background: "#FFF4EE",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
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

/* ── System status ─────────────────────────────────────────── */

const STATUS_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  Operational: { dot: GREEN, text: GREEN, bg: "#F0FDF4" },
  Degraded: { dot: AMBER, text: AMBER, bg: "#FFFBEB" },
  Down: { dot: RED, text: RED, bg: "#FEF2F2" },
};

/* ── Page ──────────────────────────────────────────────────── */

export function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SuperAdminData | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: growthData, isLoading: growthLoading } = useUserGrowthChart();
  const { activity, isLoading: activityLoading } = useRecentActivity(6);
  const { setBreadcrumb } = useNavbar();

  // page title lives in the navbar instead of on the page
  useEffect(() => {
    setBreadcrumb({ parent: "", current: "Super Admin Dashboard" });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  useEffect(() => {
    fetchSuperAdminData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const k = data?.kpis;
  // const today = new Date().toLocaleDateString("en-GB", {
  //   day: "numeric", month: "short", year: "numeric",
  // });

  return (
    <div
      style={{
        width: "100%", display: "flex", flexDirection: "column", gap: 20,
        background: "#F8FAFC", padding: 0,
        fontFamily: "'Inter','Helvetica Neue',sans-serif",
      }}
    >
      {/* header */}
      {/* <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ marginRight: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT_DARK }}>
              Super Admin Dashboard
            </h1>
            <span
              style={{
                fontSize: 11, fontWeight: 700, color: ORANGE, background: "#FFF4EE",
                border: "1px solid #FDBA8C", borderRadius: 999, padding: "3px 10px",
              }}
            >
              Super Admin
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>
            Full platform visibility &amp; control
          </p>
        </div>
        <span
          style={{
            fontSize: 13, color: MUTED, border: `1px solid ${BORDER}`,
            background: "#fff", borderRadius: 8, padding: "8px 14px",
          }}
        >
          Today, {today}
        </span>
      </div> */}

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
        }}
      >
        <KpiCard icon={FiDollarSign} label="Total Revenue" loading={loading}
          value={k ? fmtMoney(k.totalRevenue) : ""} trend={k?.revenueTrend} />
        <KpiCard icon={FiPercent} label="Platform Fees" loading={loading}
          value={k ? fmtMoney(k.platformFees) : ""} trend={k?.feesTrend} />
        <KpiCard icon={FiUsers} label="Total Users" loading={loading}
          value={k ? fmtNum(k.totalUsers) : ""} trend={k?.usersTrend} />
        <KpiCard icon={FiBriefcase} label="Total Jobs" loading={loading}
          value={k ? fmtNum(k.totalJobs) : ""} trend={k?.jobsTrend} />
        <KpiCard icon={FiTrendingUp} label="Total Bids" loading={loading}
          value={k ? fmtNum(k.totalBids) : ""} trend={k?.bidsTrend} />
        <KpiCard icon={FiActivity} label="Platform Health" loading={loading}
          value={k ? `${k.healthScore}%` : ""} sub="live service checks" />
        <KpiCard icon={FiAlertCircle} label="Open Issues" loading={loading}
          value={k ? fmtNum(k.openIssues) : ""} sub="reports + open tickets" />
        <KpiCard icon={FiLock} label="Funds in Escrow" loading={loading}
          value={k ? fmtMoney(k.fundsInEscrow) : ""} sub="currently locked" />
      </div>

      {/* charts + system status */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ ...card, flex: "2 1 340px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginBottom: 4 }}>
            Revenue Trend
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>Last 12 months</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={data?.revenueTrend ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke={BLUE} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="payouts" name="Payouts" stroke={PINK} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...card, flex: "2 1 340px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginBottom: 4 }}>
            User Growth
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>New registrations</div>
          <UserGrowthChart data={growthData} isLoading={growthLoading} />
        </div>

        <div style={{ ...card, flex: "1 1 240px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginBottom: 12 }}>
            System Status
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(data?.systemStatus ?? []).map((s) => {
              const c = STATUS_COLORS[s.status];
              return (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: TEXT_DARK, marginRight: "auto" }}>{s.name}</span>
                  <span
                    style={{
                      fontSize: 11, fontWeight: 700, color: c.text, background: c.bg,
                      borderRadius: 999, padding: "2px 10px",
                    }}
                    title={s.latencyMs != null ? `${s.latencyMs} ms` : undefined}
                  >
                    {s.status}
                  </span>
                </div>
              );
            })}
            {loading && (
              <div style={{ fontSize: 12.5, color: MUTED }}>Running checks…</div>
            )}
          </div>
        </div>
      </div>

      {/* activity + top issues */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ ...card, flex: "3 1 380px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginBottom: 12 }}>
            Recent Admin Activity
          </div>
          <ActivityFeed
            items={activity}
            isLoading={activityLoading}
            onItemClick={(item) => {
              if (item.type === "job_posted" && item.referenceId) {
                navigate(`/jobs?highlight=${item.referenceId}`);
              }
            }}
          />
        </div>

        <div style={{ ...card, flex: "2 1 320px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginRight: "auto" }}>
              Top Issues by Module
            </span>
            <button
              onClick={() => navigate("/help-support")}
              style={{
                background: "none", border: "none", color: ORANGE, fontSize: 12.5,
                fontWeight: 700, cursor: "pointer", padding: 0,
              }}
            >
              View all →
            </button>
          </div>
          {(() => {
            const issues = data?.topIssues ?? [];
            const max = Math.max(1, ...issues.map((i) => i.count));
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {issues.map((i) => (
                  <div key={i.module}>
                    <div style={{ display: "flex", fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ color: TEXT_DARK, marginRight: "auto" }}>{i.module}</span>
                      <span style={{ color: i.critical ? RED : MUTED, fontWeight: 700 }}>
                        {i.count} {i.critical ? "critical" : "open"}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "#F1F5F9" }}>
                      <div
                        style={{
                          height: 6, borderRadius: 999,
                          width: `${Math.max(3, (i.count / max) * 100)}%`,
                          background: i.critical ? RED : ORANGE,
                          opacity: i.count === 0 ? 0.25 : 1,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
                {loading && <div style={{ fontSize: 12.5, color: MUTED }}>Loading…</div>}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboardPage;
