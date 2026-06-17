import React from "react";
import type { NotificationTargetedUser } from "../../pages/Notifications";

const styles: Record<NotificationTargetedUser, React.CSSProperties> = {
  Bidder: {
    background: "#EEF2FF",
    color: "#4F46E5",
  },
  Client: {
    background: "#ECFCCB",
    color: "#65A30D",
  },
  All: {
    background: "#FFF7ED",
    color: "#EA580C",
  },
};

export const NotificationUserBadge: React.FC<{ user: NotificationTargetedUser }> = ({
  user,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 48,
      padding: "4px 9px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1,
      ...styles[user],
    }}
  >
    {user}
  </span>
);
