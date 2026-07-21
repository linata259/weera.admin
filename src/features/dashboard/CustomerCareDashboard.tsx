import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiLifeBuoy, FiAlertOctagon, FiMessageSquare, FiFlag, FiUserPlus, FiBell,
  FiArrowUpRight, FiArrowDownRight,
} from "react-icons/fi";

import { supabase } from "services/supabaseClient";
import { fetchSupportTickets } from "../helpSupport/api/supportTicketService";
import { SupportTicket } from "../helpSupport/types";
import { fetchNotifications } from "../notifications/services/notificationService";
import { AdminNotification } from "../notifications/types";
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

/* ── helpers ───────────────────────────────────────────────── */

const PRIORITY_ORDER: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  urgent: { color: RED, bg: "#FEF2F2" },
  high: { color: ORANGE, bg: "#FFF4EE" },
  normal: { color: BLUE, bg: "#EFF6FF" },
  low: { color: MUTED, bg: "#F1F5F9" },
};
const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  open: { color: AMBER, bg: "#FFFBEB" },
  pending: { color: AMBER, bg: "#FFFBEB" },
  in_progress: { color: BLUE, bg: "#EFF6FF" },
  resolved: { color: GREEN, bg: "#F0FDF4" },
  closed: { color: MUTED, bg: "#F1F5F9" },
};
const pStyle = (p: string) => PRIORITY_STYLE[p] ?? PRIORITY_STYLE.normal;
const sStyle = (s: string) => STATUS_STYLE[s] ?? { color: MUTED, bg: "#F1F5F9" };
const isOpen = (s: string) => !["resolved", "closed"].includes(s);

const Badge: React.FC<{ text: string; color: string; bg: string }> = ({ text, color, bg }) => (
  <span style={{
    fontSize: 11.5, fontWeight: 700, color, background: bg,
    borderRadius: 999, padding: "3px 10px", textTransform: "capitalize", whiteSpace: "nowrap",
  }}>
    {text.replace(/_/g, " ")}
  </span>
);

const timeAgo = (iso: string | null): string => {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const safeCount = async (build: (s: typeof supabase) => any): Promise<number> => {
  try {
    const { count, error } = await build(supabase);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
};

const KpiCard: React.FC<{
  icon: (props: any) => any;
  label: string;
  value: string;
  sub?: string;
  trend?: KpiTrend;
  accent?: string;
  loading: boolean;
}> = ({ icon, label, value, sub, trend, accent = ORANGE, loading }) => (
  <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: `${accent}14`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon icon={icon} size={16} color={accent} />
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
    {!loading && (trend ? (
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: MUTED }}>
        {trend.direction !== "flat" && (
          <Icon icon={trend.direction === "up" ? FiArrowUpRight : FiArrowDownRight}
            size={13} color={trend.direction === "up" ? GREEN : RED} />
        )}
        <span style={{ color: trend.direction === "flat" ? MUTED : trend.direction === "up" ? GREEN : RED, fontWeight: 700 }}>
          {trend.direction === "flat" ? "—" : `${trend.direction === "up" ? "+" : "-"}${trend.changePercent}%`}
        </span>
        <span>vs last month</span>
      </div>
    ) : sub ? <div style={{ fontSize: 12, color: MUTED }}>{sub}</div> : null)}
  </div>
);

/* ── page ──────────────────────────────────────────────────── */

export function CustomerCareDashboardPage() {
  const navigate = useNavigate();
  const { setBreadcrumb } = useNavbar();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [flaggedChats, setFlaggedChats] = useState(0);
  const [jobReports, setJobReports] = useState(0);
  const [newUsersMtd, setNewUsersMtd] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBreadcrumb({ parent: "", current: "Customer Care Dashboard" });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  useEffect(() => {
    const monthStart = new Date(
      new Date().getFullYear(), new Date().getMonth(), 1,
    ).toISOString();

    Promise.all([
      fetchSupportTickets().catch(() => [] as SupportTicket[]),
      fetchNotifications().catch(() => [] as AdminNotification[]),
      safeCount((s) => s.from("chat_flags").select("*", { head: true, count: "exact" })
        .in("status", ["pending", "flagged"])),
      safeCount((s) => s.from("job_reports").select("*", { head: true, count: "exact" })
        .eq("status", "pending")),
      safeCount((s) => s.from("profiles").select("*", { head: true, count: "exact" })
        .or("role.is.null,role.neq.admin").gte("created_at", monthStart)),
    ])
      .then(([t, n, chats, reports, users]) => {
        setTickets(t);
        setNotifications(n);
        setFlaggedChats(chats);
        setJobReports(reports);
        setNewUsersMtd(users);
      })
      .finally(() => setLoading(false));
  }, []);

  const openTickets = useMemo(() => tickets.filter((t) => isOpen(t.status)), [tickets]);
  const urgentCount = useMemo(
    () => openTickets.filter((t) => t.priority === "urgent").length,
    [openTickets],
  );
  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  /* ticket summaries */
  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    tickets.forEach((t) => m.set(t.status, (m.get(t.status) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  const byPriority = useMemo(() => {
    const m = new Map<string, number>();
    openTickets.forEach((t) => m.set(t.priority, (m.get(t.priority) ?? 0) + 1));
    return ["urgent", "high", "normal", "low"]
      .map((p) => [p, m.get(p) ?? 0] as const);
  }, [openTickets]);

  /* open tickets sorted highest priority first */
  const priorityList = useMemo(
    () =>
      [...openTickets]
        .sort((a, b) => {
          const diff = (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
          if (diff !== 0) return diff;
          return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
        })
        .slice(0, 10),
    [openTickets],
  );

  const maxPriorityCount = Math.max(1, ...byPriority.map(([, c]) => c));
  const maxStatusCount = Math.max(1, ...byStatus.map(([, c]) => c));

  return (
    <div style={{
      width: "100%", display: "flex", flexDirection: "column", gap: 20,
      background: "#F8FAFC", padding: 0,
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
    }}>
      {/* KPI row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
      }}>
        <KpiCard icon={FiLifeBuoy} label="Open Tickets" loading={loading}
          value={String(openTickets.length)} sub={`${tickets.length} total`} />
        <KpiCard icon={FiAlertOctagon} label="Urgent Tickets" accent={RED} loading={loading}
          value={String(urgentCount)} sub="need attention now" />
        <KpiCard icon={FiMessageSquare} label="Flagged Chats" accent={AMBER} loading={loading}
          value={String(flaggedChats)} sub="awaiting moderation" />
        <KpiCard icon={FiFlag} label="Job Reports" accent={AMBER} loading={loading}
          value={String(jobReports)} sub="pending review" />
        <KpiCard icon={FiUserPlus} label="New Users" accent={BLUE} loading={loading}
          value={newUsersMtd.toLocaleString()} sub="this month" />
        <KpiCard icon={FiBell} label="Notifications" loading={loading}
          value={String(unreadNotifications)} sub="unread" />
      </div>

      {/* summaries + notifications */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ ...card, flex: "1 1 260px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginBottom: 12 }}>
            Tickets by Priority
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {byPriority.map(([p, count]) => {
              const st = pStyle(p);
              return (
                <div key={p}>
                  <div style={{ display: "flex", fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ color: TEXT_DARK, marginRight: "auto", textTransform: "capitalize" }}>{p}</span>
                    <span style={{ color: st.color, fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "#F1F5F9" }}>
                    <div style={{
                      height: 6, borderRadius: 999, background: st.color,
                      width: `${Math.max(4, (count / maxPriorityCount) * 100)}%`,
                      opacity: count === 0 ? 0.2 : 1, transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...card, flex: "1 1 260px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginBottom: 12 }}>
            Tickets by Status
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {byStatus.length === 0 && !loading && (
              <div style={{ fontSize: 12.5, color: MUTED }}>No tickets yet.</div>
            )}
            {byStatus.map(([s, count]) => {
              const st = sStyle(s);
              return (
                <div key={s}>
                  <div style={{ display: "flex", fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ color: TEXT_DARK, marginRight: "auto", textTransform: "capitalize" }}>
                      {s.replace(/_/g, " ")}
                    </span>
                    <span style={{ color: st.color, fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "#F1F5F9" }}>
                    <div style={{
                      height: 6, borderRadius: 999, background: st.color,
                      width: `${Math.max(4, (count / maxStatusCount) * 100)}%`,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...card, flex: "1.4 1 320px", padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "flex", alignItems: "center", padding: "16px 20px",
            borderBottom: `1px solid ${BORDER}`,
          }}>
            <span style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginRight: "auto" }}>
              Notifications
            </span>
            <button onClick={() => navigate("/notifications")} style={{
              background: "none", border: "none", color: ORANGE, fontSize: 12.5,
              fontWeight: 700, cursor: "pointer", padding: 0,
            }}>
              View all →
            </button>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {!loading && notifications.length === 0 && (
              <div style={{ padding: 24, fontSize: 12.5, color: MUTED, textAlign: "center" }}>
                No notifications right now.
              </div>
            )}
            {notifications.slice(0, 8).map((n) => {
              const urgent = n.category === "support_ticket_urgent";
              return (
                <div key={n.id}
                  onClick={() => navigate(n.href)}
                  style={{
                    display: "flex", gap: 10, padding: "12px 20px",
                    borderBottom: "1px solid #F8FAFC", cursor: "pointer",
                    background: n.isRead ? "#fff" : "#FFF9F5",
                  }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                    background: urgent ? RED : n.isRead ? "#CBD5E1" : ORANGE,
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_DARK, display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                      {urgent && <Badge text="urgent" color={RED} bg="#FEF2F2" />}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.body}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* priority queue */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", padding: "16px 20px",
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <div style={{ marginRight: "auto" }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK }}>Priority Queue</div>
            <div style={{ fontSize: 12, color: MUTED }}>Open tickets, highest priority first</div>
          </div>
          <button onClick={() => navigate("/help-support")} style={{
            background: "none", border: "none", color: ORANGE, fontSize: 12.5,
            fontWeight: 700, cursor: "pointer", padding: 0,
          }}>
            View all →
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Ticket", "User", "Category", "Description", "Priority", "Status", "Age"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 20px", fontSize: 11.5, fontWeight: 700,
                    color: MUTED, textTransform: "uppercase", letterSpacing: 0.4,
                    borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && priorityList.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "36px 20px", textAlign: "center", fontSize: 13, color: MUTED }}>
                    No open tickets — all clear.
                  </td>
                </tr>
              )}
              {priorityList.map((t) => {
                const pr = pStyle(t.priority);
                const st = sStyle(t.status);
                return (
                  <tr key={t.id} onClick={() => navigate("/help-support")} style={{ cursor: "pointer" }}>
                    <td style={{ padding: "12px 20px", fontSize: 12.5, color: MUTED, fontFamily: "monospace", borderBottom: "1px solid #F8FAFC" }}>
                      {t.ticketId}
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 500, color: TEXT_DARK, borderBottom: "1px solid #F8FAFC", whiteSpace: "nowrap" }}>
                      {t.user?.name ?? "—"}
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: 12.5, color: "#475569", borderBottom: "1px solid #F8FAFC" }}>
                      {t.category}
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: 12.5, color: MUTED, borderBottom: "1px solid #F8FAFC", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.description}
                    </td>
                    <td style={{ padding: "12px 20px", borderBottom: "1px solid #F8FAFC" }}>
                      <Badge text={t.priority} color={pr.color} bg={pr.bg} />
                    </td>
                    <td style={{ padding: "12px 20px", borderBottom: "1px solid #F8FAFC" }}>
                      <Badge text={t.status} color={st.color} bg={st.bg} />
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: 12.5, color: MUTED, borderBottom: "1px solid #F8FAFC", whiteSpace: "nowrap" }}>
                      {timeAgo(t.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CustomerCareDashboardPage;
