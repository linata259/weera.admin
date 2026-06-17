import React, { useEffect, useState } from "react";
import type {
  NotificationChannel,
  NotificationItem,
  NotificationTargetedUser,
} from "../../pages/Notifications";

interface Props {
  notification?: NotificationItem | null;
  onClose: () => void;
  onSave: (notification: NotificationItem) => void;
}

const channelOptions: NotificationChannel[] = ["Email", "In-App", "Push"];
const targetedUserOptions: NotificationTargetedUser[] = ["Bidder", "Client", "All"];

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 14,
  color: "#0F172A",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 7,
  color: "#475569",
  fontSize: 13,
  fontWeight: 700,
};

export const NotificationFormModal: React.FC<Props> = ({
  notification,
  onClose,
  onSave,
}) => {
  const [notificationType, setNotificationType] = useState("");
  const [description, setDescription] = useState("");
  const [targetedUser, setTargetedUser] =
    useState<NotificationTargetedUser>("Bidder");
  const [channel, setChannel] = useState<NotificationChannel[]>(["Push"]);
  const [fixed, setFixed] = useState(false);

  useEffect(() => {
    if (!notification) {
      setNotificationType("");
      setDescription("");
      setTargetedUser("Bidder");
      setChannel(["Push"]);
      setFixed(false);
      return;
    }

    setNotificationType(notification.notificationType);
    setDescription(notification.description);
    setTargetedUser(notification.targetedUser);
    setChannel(notification.channel);
    setFixed(notification.fixed);
  }, [notification]);

  const toggleChannel = (value: NotificationChannel) => {
    setChannel((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((item) => item !== value);
        return next.length ? next : prev;
      }

      return [...prev, value];
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const now = new Date().toISOString();

    onSave({
      id: notification?.id ?? `notification-${Date.now()}`,
      notificationType: notificationType.trim(),
      description: description.trim(),
      targetedUser,
      channel,
      fixed,
      createdAt: notification?.createdAt ?? now,
    });
  };

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
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #E2E8F0",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
          overflow: "hidden",
          fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, color: "#0F172A" }}>
            {notification ? "Edit Notification" : "Create Notification"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 32,
              height: 32,
              border: "1px solid #E2E8F0",
              borderRadius: "50%",
              background: "#fff",
              color: "#64748B",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 16 }}>
          <label style={labelStyle}>
            Notification Type
            <input
              value={notificationType}
              onChange={(event) => setNotificationType(event.target.value)}
              required
              style={fieldStyle}
              placeholder="New Message"
            />
          </label>

          <label style={labelStyle}>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={4}
              style={{ ...fieldStyle, resize: "vertical" }}
              placeholder="Alerts a user when..."
            />
          </label>

          <label style={labelStyle}>
            Targeted User
            <select
              value={targetedUser}
              onChange={(event) =>
                setTargetedUser(event.target.value as NotificationTargetedUser)
              }
              style={fieldStyle}
            >
              {targetedUserOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div style={labelStyle}>
            Channel
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {channelOptions.map((option) => (
                <label
                  key={option}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 12px",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={channel.includes(option)}
                    onChange={() => toggleChannel(option)}
                    style={{ accentColor: "#EA580C" }}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              color: "#475569",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={fixed}
              onChange={(event) => setFixed(event.target.checked)}
              style={{ accentColor: "#EA580C" }}
            />
            Fixed notification
          </label>
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 40,
              padding: "0 16px",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              background: "#fff",
              color: "#334155",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              height: 40,
              padding: "0 16px",
              border: "none",
              borderRadius: 10,
              background: "#EA580C",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Save Notification
          </button>
        </div>
      </form>
    </div>
  );
};
