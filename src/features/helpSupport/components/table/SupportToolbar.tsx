import React from "react";
import {
  Ico,
  IconChevronDownControl,
  IconSearchControl,
  IconSettingsNav,
  iconSize,
} from "../../../../components/icons";

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
    <Ico
      icon={IconChevronDownControl}
      size={iconSize.sm}
      color="#64748B"
      style={{
        position: "absolute",
        right: 14,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
      }}
    />
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
      <Ico
        icon={IconSearchControl}
        size={iconSize.md}
        color="#94A3B8"
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
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
        <Ico icon={IconSettingsNav} size={iconSize.lg} color="#64748B" />
      </button>
    </div>
  </div>
);
