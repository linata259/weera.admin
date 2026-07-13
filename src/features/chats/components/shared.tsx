import React from "react";
import type { ChatParticipant, FlagStatus } from "../types";

export const PRIMARY = "#EA580C";
export const PRIMARY_LIGHT = "#FFF4EE";

export const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  boxSizing: "border-box",
};

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(value: string | null): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(value);
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export const Avatar: React.FC<{
  participant: ChatParticipant | null;
  size?: number;
}> = ({ participant, size = 34 }) => {
  const name = participant?.name ?? "Unknown";
  if (participant?.imageUrl) {
    return (
      <img
        src={participant.imageUrl}
        alt={name}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: PRIMARY_LIGHT,
        color: PRIMARY,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(name) || "?"}
    </div>
  );
};

const FLAG_COLORS: Record<FlagStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: "#FEF3C7", fg: "#B45309", label: "Pending review" },
  reviewed: { bg: "#DCFCE7", fg: "#15803D", label: "Reviewed" },
  dismissed: { bg: "#F1F5F9", fg: "#64748B", label: "Dismissed" },
};

export const FlagStatusBadge: React.FC<{ status: FlagStatus }> = ({ status }) => {
  const c = FLAG_COLORS[status] ?? FLAG_COLORS.pending;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: c.bg,
        color: c.fg,
        whiteSpace: "nowrap",
      }}
    >
      {c.label}
    </span>
  );
};

/** Renders text with the given phone-number substrings highlighted. */
export const HighlightedText: React.FC<{ text: string; matches: string[] }> = ({
  text,
  matches,
}) => {
  if (matches.length === 0) return <>{text}</>;

  // Split on any of the matches, keeping the delimiters.
  const escaped = matches
    .map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(re);

  return (
    <>
      {parts.map((part, i) =>
        matches.includes(part) ? (
          <mark
            key={i}
            style={{
              background: "#FEE2E2",
              color: "#B91C1C",
              fontWeight: 700,
              padding: "1px 4px",
              borderRadius: 4,
            }}
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

export const UserTypePill: React.FC<{ userType: string }> = ({ userType }) => (
  <span
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: "#475569",
      background: "#F1F5F9",
      borderRadius: 6,
      padding: "1px 6px",
    }}
  >
    {userType}
  </span>
);
