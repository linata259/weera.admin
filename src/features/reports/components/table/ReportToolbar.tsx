import React from "react";

interface ReportToolbarProps {
  searchTerm: string;
  onSearch: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  secondaryFilter: string;
  onSecondaryFilterChange: (value: string) => void;
  secondaryPlaceholder: string;
  secondaryOptions: { label: string; value: string }[];
  dateRangeFilter: string;
  onDateRangeChange: (value: string) => void;
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

export const ReportToolbar: React.FC<ReportToolbarProps> = ({
  searchTerm,
  onSearch,
  statusFilter,
  onStatusChange,
  secondaryFilter,
  onSecondaryFilterChange,
  secondaryPlaceholder,
  secondaryOptions,
  dateRangeFilter,
  onDateRangeChange,
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
          value={statusFilter}
          options={[
            { label: "Completed", value: "completed" },
            { label: "Pending", value: "pending" },
            { label: "Cancelled", value: "cancelled" },
            { label: "In Transit", value: "in_transit" },
            { label: "Active", value: "active" },
          ]}
          onChange={onStatusChange}
          placeholder="Status"
        />
        <Dropdown
          value={secondaryFilter}
          options={secondaryOptions}
          onChange={onSecondaryFilterChange}
          placeholder={secondaryPlaceholder}
        />
        <Dropdown
          value={dateRangeFilter}
          options={[
            { label: "Last 7 Days", value: "7d" },
            { label: "Last 30 Days", value: "30d" },
            { label: "This Year", value: "1y" },
          ]}
          onChange={onDateRangeChange}
          placeholder="Date Range"
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
};
