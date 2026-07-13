import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChatStats } from "../types";
import { PRIMARY, cardStyle } from "./shared";

interface Props {
  stats: ChatStats;
}

const StatCard: React.FC<{
  label: string;
  value: number;
  accent?: string;
  hint?: string;
}> = ({ label, value, accent = "#0F172A", hint }) => (
  <div style={{ ...cardStyle, padding: 18, display: "grid", alignContent: "space-between", minHeight: 96 }}>
    <div style={{ color: "#64748B", fontSize: 13, fontWeight: 700 }}>{label}</div>
    <div style={{ color: accent, fontSize: 30, fontWeight: 800 }}>
      {value.toLocaleString("en-US")}
    </div>
    {hint && <div style={{ color: "#94A3B8", fontSize: 12 }}>{hint}</div>}
  </div>
);

const TYPE_COLORS = ["#EA580C", "#2563EB", "#7C3AED", "#059669", "#64748B"];

export const OverviewTab: React.FC<Props> = ({ stats }) => {
  const chartData = stats.messagesPerDay.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard label="Conversations" value={stats.totalConversations} />
        <StatCard
          label="Total Messages"
          value={stats.totalMessages}
          // hint="within analysed history"
        />
        <StatCard
          label="Active (7 days)"
          value={stats.activeConversations}
          accent="#059669"
        />
        <StatCard
          label="Flagged Messages"
          value={stats.flaggedMessages}
          accent="#B91C1C"
          hint={`${stats.pendingFlags} pending review`}
        />
        <StatCard
          label="Blocked Chats"
          value={stats.blockedConversations}
          accent="#7C3AED"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 16,
        }}
      >
        {/* Messages over time */}
        <div style={{ ...cardStyle, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", marginBottom: 4 }}>
            Message activity
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
            Daily messages and phone-sharing flags (last 30 days)
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="flagGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Messages"
                  stroke={PRIMARY}
                  fill="url(#msgGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="flagged"
                  name="Flagged"
                  stroke="#DC2626"
                  fill="url(#flagGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Message types */}
        <div style={{ ...cardStyle, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", marginBottom: 4 }}>
            Message types
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
            Breakdown by content type
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart
                data={stats.messagesByType}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 0, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="type"
                  tick={{ fontSize: 12, fill: "#475569" }}
                  width={60}
                />
                <Tooltip />
                <Bar dataKey="count" name="Messages" radius={[0, 6, 6, 0]}>
                  {stats.messagesByType.map((_, i) => (
                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
