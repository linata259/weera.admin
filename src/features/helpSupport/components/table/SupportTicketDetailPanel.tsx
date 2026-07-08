import React from "react";
import { Avatar } from "../../../shared/Avatar";
import type { SupportTicket } from "../../types";
import { SupportTicketStatusBadge } from "./SupportTicketStatusBadge";

interface SupportTicketDetailPanelProps {
  ticket: SupportTicket;
  onClose: () => void;
  onStatusChange: (ticket: SupportTicket, status: string) => void;
  onAdminNotesChange: (ticket: SupportTicket, adminNotes: string) => void;
}

const statusActions = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

const priorityStyles: Record<string, React.CSSProperties> = {
  urgent: { background: "#FEE2E2", color: "#B91C1C" },
  high: { background: "#FFEDD5", color: "#C2410C" },
  normal: { background: "#DBEAFE", color: "#1D4ED8" },
  low: { background: "#DCFCE7", color: "#15803D" },
};

const formatDateTime = (iso: string | null): string => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatLabel = (value: string): string =>
  value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const Badge: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "5px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

const Section: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section style={{ display: "grid", gap: 10 }}>
    <h3 style={{ margin: 0, color: "#0F172A", fontSize: 14, fontWeight: 800 }}>
      {title}
    </h3>
    {children}
  </section>
);

const InfoItem: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div
    style={{
      border: "1px solid #E2E8F0",
      borderRadius: 10,
      padding: 12,
      minWidth: 0,
      background: "#fff",
    }}
  >
    <div style={{ color: "#64748B", fontSize: 12, fontWeight: 700 }}>{label}</div>
    <div
      style={{
        color: "#0F172A",
        fontSize: 14,
        fontWeight: 800,
        marginTop: 5,
        wordBreak: "break-word",
      }}
    >
      {value}
    </div>
  </div>
);

export const SupportTicketDetailPanel: React.FC<SupportTicketDetailPanelProps> = ({
  ticket,
  onClose,
  onStatusChange,
  onAdminNotesChange,
}) => {
  const priorityStyle = priorityStyles[ticket.priority] ?? {
    background: "#F1F5F9",
    color: "#475569",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.38)",
        zIndex: 300,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <aside
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(620px, 100%)",
          height: "100%",
          background: "#F8FAFC",
          borderLeft: "1px solid #E2E8F0",
          boxShadow: "-24px 0 60px rgba(15, 23, 42, 0.18)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        }}
      >
        <div
          style={{
            padding: "20px 22px",
            borderBottom: "1px solid #E2E8F0",
            background: "#fff",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#64748B", fontSize: 12, fontWeight: 800 }}>
              SUPPORT TICKET
            </div>
            <h2 style={{ margin: "5px 0 0", fontSize: 20, color: "#0F172A" }}>
              #{ticket.ticketId}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <SupportTicketStatusBadge status={ticket.status} />
              <Badge style={priorityStyle}>{formatLabel(ticket.priority)}</Badge>
              <Badge style={{ background: "#F1F5F9", color: "#475569" }}>
                {ticket.category}
              </Badge>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close ticket details"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid #E2E8F0",
              background: "#fff",
              color: "#64748B",
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: 22, overflowY: "auto", display: "grid", gap: 18 }}>
          <Section title="Requester">
            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 14,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Avatar src={ticket.user?.imageUrl} name={ticket.user?.name ?? "Unknown User"} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "#0F172A", fontWeight: 800 }}>
                  {ticket.user?.name ?? "Unknown User"}
                </div>
                <div style={{ color: "#64748B", fontSize: 13, marginTop: 3 }}>
                  {ticket.user?.userType ?? "User"}
                  {ticket.user?.phone ? ` - ${ticket.user.phone}` : ""}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Ticket Details">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <InfoItem label="Category" value={ticket.category} />
              <InfoItem label="Priority" value={formatLabel(ticket.priority)} />
              <InfoItem label="Created" value={formatDateTime(ticket.createdAt)} />
              <InfoItem label="Updated" value={formatDateTime(ticket.updatedAt)} />
            </div>
          </Section>

          <Section title="Message">
            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 14,
                color: "#334155",
                lineHeight: 1.6,
                background: "#fff",
                whiteSpace: "pre-wrap",
              }}
            >
              {ticket.description || "No message provided."}
            </div>
          </Section>

          <Section title="Attachment">
            {ticket.attachmentUrl ? (
              <a
                href={ticket.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  border: "1px solid #BFDBFE",
                  borderRadius: 12,
                  padding: 12,
                  color: "#1D4ED8",
                  fontWeight: 800,
                  textDecoration: "none",
                  wordBreak: "break-word",
                  background: "#EFF6FF",
                }}
              >
                Open attachment
              </a>
            ) : (
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  padding: 12,
                  color: "#94A3B8",
                  background: "#fff",
                }}
              >
                No attachment
              </div>
            )}
          </Section>

          <Section title="Workflow">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {statusActions.map((action) => (
                <button
                  key={action.value}
                  type="button"
                  onClick={() => onStatusChange(ticket, action.value)}
                  disabled={ticket.status === action.value}
                  style={{
                    height: 38,
                    padding: "0 13px",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    background: ticket.status === action.value ? "#E2E8F0" : "#fff",
                    color: ticket.status === action.value ? "#94A3B8" : "#0F172A",
                    fontWeight: 800,
                    cursor: ticket.status === action.value ? "not-allowed" : "pointer",
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Admin Notes">
            <textarea
              value={ticket.adminNotes}
              onChange={(event) => onAdminNotesChange(ticket, event.target.value)}
              placeholder="Add private context for follow-up"
              rows={5}
              style={{
                width: "100%",
                resize: "vertical",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 12,
                color: "#0F172A",
                background: "#fff",
                font: "inherit",
                fontSize: 14,
                lineHeight: 1.5,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ color: "#64748B", fontSize: 12 }}>
              Notes are saved in this browser until an `admin_notes` column is added.
            </div>
          </Section>
        </div>
      </aside>
    </div>
  );
};
