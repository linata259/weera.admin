import React from "react";
import { User, deriveStatus } from "../../types";
import { StatusBadge } from "../../../shared/StatusBadge";
import { Avatar } from "../../../shared/Avatar";
import { Ico, IconPageNext, iconSize } from "../../../../components/icons";

interface Props {
  user: User;
  index: number;
  onClick: () => void;
}

export const MobileUserCard: React.FC<Props> = ({ user, index, onClick }) => {
  const status = deriveStatus(user);
  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid #F1F5F9",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        transition: "background 0.12s",
        background: "#fff",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFBFC"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
    >
      <div style={{ fontSize: 12, color: "#94A3B8", width: 28, flexShrink: 0, textAlign: "center" }}>
        {String(index).padStart(2, "0")}
      </div>

      <Avatar src={user.image_url} name={user.name} size={40} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {user.name || "—"}
        </div>
        {user.professional_headline && (
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.professional_headline}
          </div>
        )}
        {user.location && (
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{user.location}</div>
        )}
      </div>

      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <StatusBadge status={status} />
        <Ico icon={IconPageNext} size={iconSize.sm} color="#CBD5E1" />
      </div>
    </div>
  );
};