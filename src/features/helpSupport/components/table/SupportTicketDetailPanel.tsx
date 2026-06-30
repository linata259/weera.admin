import React from "react";
import { Avatar } from "../../../shared/Avatar";
import type { SupportTicket } from "../../types";
import { SupportTicketStatusBadge } from "./SupportTicketStatusBadge";

interface SupportTicketDetailPanelProps {
  ticket: SupportTicket;
  onClose: () => void;
  onStatusChange: (ticket: SupportTicket, status: string) => void;
}

const formatDateTime = (iso: string | null): string => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const SupportTicketDetailPanel: React.FC<SupportTicketDetailPanelProps> = ({
  ticket,
  onClose,
  onStatusChange,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.35)",
        zIndex: 300,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <aside
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          height: "100%",
          background: "#fff",
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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#0F172A" }}>
              Ticket #{ticket.ticketId}
            </h2>
            <div style={{ marginTop: 8 }}>
              <SupportTicketStatusBadge status={ticket.status} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close ticket details"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid #E2E8F0",
              background: "#fff",
              color: "#64748B",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: 22, overflowY: "auto", display: "grid", gap: 22 }}>
          <section style={{ display: "grid", gap: 12 }}>
            <h3 style={{ margin: 0, color: "#0F172A", fontSize: 14 }}>Requester</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar src={ticket.user?.imageUrl} name={ticket.user?.name ?? "Unknown User"} />
              <div>
                <div style={{ color: "#0F172A", fontWeight: 700 }}>
                  {ticket.user?.name ?? "Unknown User"}
                </div>
                <div style={{ color: "#64748B", fontSize: 13 }}>
                  {ticket.user?.userType ?? "User"}
                  {ticket.user?.phone ? ` - ${ticket.user.phone}` : ""}
                </div>
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0, color: "#0F172A", fontSize: 14 }}>Message</h3>
            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 14,
                color: "#334155",
                lineHeight: 1.6,
                background: "#F8FAFC",
                whiteSpace: "pre-wrap",
              }}
            >
              {ticket.description || "No message provided."}
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <div style={{ color: "#64748B", fontSize: 12 }}>Created On</div>
              <div style={{ color: "#0F172A", fontWeight: 700, marginTop: 4 }}>
                {formatDateTime(ticket.createdAt)}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748B", fontSize: 12 }}>Last Updated</div>
              <div style={{ color: "#0F172A", fontWeight: 700, marginTop: 4 }}>
                {formatDateTime(ticket.updatedAt)}
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0, color: "#0F172A", fontSize: 14 }}>Attachment</h3>
            {ticket.attachmentPath ? (
              <a
                href={ticket.attachmentPath}
                target="_blank"
                rel="noreferrer"
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  padding: 12,
                  color: "#2563EB",
                  fontWeight: 700,
                  textDecoration: "none",
                  wordBreak: "break-word",
                  background: "#F8FAFC",
                }}
              >
                {ticket.attachmentPath}
              </a>
            ) : (
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  padding: 12,
                  color: "#94A3B8",
                  background: "#F8FAFC",
                }}
              >
                No attachment
              </div>
            )}
          </section>

          <section style={{ display: "grid", gap: 12 }}>
            <h3 style={{ margin: 0, color: "#0F172A", fontSize: 14 }}>Follow Up</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[
                { label: "Mark Open", value: "open" },
                { label: "In Progress", value: "in_progress" },
                { label: "Pending", value: "pending" },
                { label: "Resolved", value: "resolved" },
                { label: "Closed", value: "closed" },
              ].map((action) => (
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
                    background: ticket.status === action.value ? "#F1F5F9" : "#fff",
                    color: ticket.status === action.value ? "#94A3B8" : "#0F172A",
                    fontWeight: 700,
                    cursor: ticket.status === action.value ? "not-allowed" : "pointer",
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
