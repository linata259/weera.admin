import React from "react";
import type { NotificationTargetedUser } from "../../pages/Notifications";

interface ToolbarProps {
  searchTerm: string;
  onSearch: (value: string) => void;
  notificationTypeFilter: string;
  onNotificationTypeChange: (value: string) => void;
  notificationTypeOptions: { label: string; value: string }[];
  fixedOnly: boolean;
  onFixedOnlyChange: (value: boolean) => void;
  onCreateNotification: () => void;
  userFilter: NotificationTargetedUser | "all";
  onUserChange: (value: NotificationTargetedUser | "all") => void;
}

interface DropdownProps {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  placeholder: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  onChange,
  placeholder,
}) => (
  <div style={{ position: "relative" }}>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{
        height: 42,
        padding: "0 38px 0 14px",
        borderRadius: 10,
        border: "1px solid #E2E8F0",
        background: "#fff",
        fontSize: 14,
        minWidth: 190,
        outline: "none",
        color: "#0F172A",
        fontFamily: "inherit",
        appearance: "none",
        cursor: "pointer",
      }}
    >
      <option value="all">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      style={{
        position: "absolute",
        right: 14,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
      }}
    >
      <path
        d="M1 1L5 5L9 1"
        stroke="#64748B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export const TableToolbar: React.FC<ToolbarProps> = ({
  searchTerm,
  onSearch,
  notificationTypeFilter,
  onNotificationTypeChange,
  notificationTypeOptions,
  fixedOnly,
  onFixedOnlyChange,
  onCreateNotification,
  userFilter,
  onUserChange,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ position: "relative", width: "min(320px, 100%)" }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <circle cx="7" cy="7" r="5.5" stroke="#94A3B8" strokeWidth="1.5" />
          <path
            d="M11 11l2.5 2.5"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(event) => onSearch(event.target.value)}
          style={{
            padding: "11px 14px 11px 38px",
            borderRadius: 12,
            border: "1px solid #E2E8F0",
            width: "100%",
            outline: "none",
            fontSize: 14,
            background: "#fff",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <Dropdown
          value={notificationTypeFilter}
          options={notificationTypeOptions}
          onChange={onNotificationTypeChange}
          placeholder="Notification Type"
        />

        <Dropdown
          value={userFilter}
          options={[
            { label: "Bidder", value: "Bidder" },
            { label: "Client", value: "Client" },
            { label: "All", value: "All" },
          ]}
          onChange={(value) => onUserChange(value as NotificationTargetedUser | "all")}
          placeholder="Targeted User"
        />

        <button
          type="button"
          onClick={() => onFixedOnlyChange(!fixedOnly)}
          style={{
            height: 42,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: fixedOnly ? "1px solid #FDBA74" : "1px solid #E2E8F0",
            borderRadius: 10,
            background: fixedOnly ? "#FFF7ED" : "#fff",
            color: fixedOnly ? "#EA580C" : "#0F172A",
            padding: "0 14px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2.5a4 4 0 0 0-4 4v2.1L2.8 10v.8h10.4V10L12 8.6V6.5a4 4 0 0 0-4-4Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.7 12.2a1.4 1.4 0 0 0 2.6 0"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          Fixed Notifications
        </button>

        <button
          type="button"
          onClick={onCreateNotification}
          style={{
            height: 42,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "none",
            borderRadius: 10,
            background: "#EA580C",
            color: "#fff",
            padding: "0 16px",
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3.5v9M3.5 8h9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          Create Notification
        </button>

        <button
          type="button"
          aria-label="Column settings"
          style={{
            width: 42,
            height: 42,
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16M15 4v16" />
          </svg>
        </button>
      </div>
    </div>
  );
};
