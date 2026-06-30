import React from "react";

interface SupportToolbarProps {
  searchTerm: string;
  onSearch: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  userTypeFilter: string;
  onUserTypeChange: (value: string) => void;
  userTypeOptions: { label: string; value: string }[];
}

const Dropdown: React.FC<{
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, options, onChange, placeholder }) => (
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
        color: "#0F172A",
        minWidth: 170,
        fontSize: 14,
        outline: "none",
        appearance: "none",
        cursor: "pointer",
        fontFamily: "inherit",
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

export const SupportToolbar: React.FC<SupportToolbarProps> = ({
  searchTerm,
  onSearch,
  statusFilter,
  onStatusChange,
  userTypeFilter,
  onUserTypeChange,
  userTypeOptions,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    }}
  >
    <div style={{ position: "relative", width: "min(340px, 100%)" }}>
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
        placeholder="Search tickets"
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

    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <Dropdown
        value={statusFilter}
        onChange={onStatusChange}
        placeholder="Status"
        options={[
          { label: "Open", value: "open" },
          { label: "Pending", value: "pending" },
          { label: "In Progress", value: "in_progress" },
          { label: "Resolved", value: "resolved" },
          { label: "Closed", value: "closed" },
        ]}
      />
      <Dropdown
        value={userTypeFilter}
        onChange={onUserTypeChange}
        placeholder="User Type"
        options={userTypeOptions}
      />
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
