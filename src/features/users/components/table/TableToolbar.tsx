import { StatusFilter, UserTypeFilter } from "@features/shared/types";
import { Column, User } from "@features/users/types";
import React, { useState } from "react";


export const ALL_EXTRA_COLUMNS: Column[] = [
  { key: "location", label: "Location" },
  { key: "phone",    label: "Phone"    },
];

interface ToolbarProps {
  searchTerm: string;
  onSearch: (value: string) => void;

  locationFilter: string;
  onLocationChange: (value: string) => void;
  locationOptions: { label: string; value: string }[];

  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;

  userTypeFilter: UserTypeFilter;
  onUserTypeChange: (value: UserTypeFilter) => void;

  visibleCols: Set<string>;
  onToggleCol: (key: string) => void;
}

interface DropdownProps {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  placeholder: string;
  isMobile?: boolean;
}

/* ── Dropdown ─────────────────────────────────────────────── */
const Dropdown: React.FC<DropdownProps> = ({ value, options, onChange, placeholder, isMobile }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      padding: "10px 14px", borderRadius: 10, border: "1px solid #E2E8F0",
      background: "#fff", fontSize: 14, minWidth: isMobile ? "48%" : 160,
      outline: "none", color: "#0F172A", fontFamily: "inherit",
    }}
  >
    <option value="all">{placeholder}</option>
    {options.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

/* ── Column visibility popover ────────────────────────────── */
const ColVisPopover: React.FC<{
  visible: Set<string>;
  onChange: (key: string) => void;
  onClose: () => void;
}> = ({ visible, onChange, onClose }) => {
  const cols: Array<keyof User> = ["name", "email", "location", "phone", "professional_headline", "created_at"];

  return (
    <div style={{
      position: "absolute", top: 50, right: 0,
      background: "#fff", border: "1px solid #E2E8F0",
      borderRadius: 12, padding: 14, width: 220,
      zIndex: 50, boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>Columns</strong>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: "#64748B" }}>✕</button>
      </div>
      {cols.map((col) => (
        <label key={col} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer" }}>
          <input type="checkbox" checked={visible.has(col)} onChange={() => onChange(col)} style={{ accentColor: "#EA580C" }} />
          <span style={{ fontSize: 13, textTransform: "capitalize", color: "#334155" }}>
            {(col as string).replace(/_/g, " ")}
          </span>
        </label>
      ))}
    </div>
  );
};

/* ── Main Toolbar ─────────────────────────────────────────── */
export const TableToolbar: React.FC<ToolbarProps> = ({
  searchTerm, onSearch,
  locationFilter, onLocationChange, locationOptions,
  statusFilter, onStatusChange,
  userTypeFilter, onUserTypeChange,
  visibleCols, onToggleCol,
}) => {
  const [showColPicker, setShowColPicker] = useState(false);
  const isMobile = window.innerWidth < 768;

  
  // const typeButtons: UserTypeFilter[] = ["clients", "bidders"];
  const typeButtons: { value: UserTypeFilter; label: string }[] = [
  { value: "clients",     label: "Clients" },
  { value: "bidders", label: "Bidders" },
];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        gap: 16,
      }}>
        {/* Search */}
        <div style={{ position: "relative", width: isMobile ? "100%" : 320 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="7" cy="7" r="5.5" stroke="#94A3B8" strokeWidth="1.5" />
            <path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            style={{
              padding: "11px 14px 11px 38px", borderRadius: 12,
              border: "1px solid #E2E8F0", width: "100%",
              outline: "none", fontSize: 14, background: "#fff",
              boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Dropdown
            value={locationFilter}
            options={locationOptions}
            onChange={onLocationChange}
            placeholder="All Locations"
            isMobile={isMobile}
          />

          <Dropdown
            value={statusFilter}
            options={[
              { label: "Active",    value: "active"    },
              { label: "Suspended", value: "suspended" },
            ]}
            onChange={(v) => onStatusChange(v as StatusFilter)}
            placeholder="All Statuses"
            isMobile={isMobile}
          />

          {/* Client / Freelancer toggle */}
          <div style={{ display: "flex", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden", background: "#fff" }}>
            {typeButtons.map(({ value, label }) => {
  const active = userTypeFilter === value;
  return (
    <button
      key={value}
      onClick={() => onUserTypeChange(active ? "all" : value)}
      style={{
        padding: "10px 18px", border: "none", cursor: "pointer",
        background: active ? "#0F172A" : "#fff",
        color: active ? "#fff" : "#64748B",
        fontWeight: 600, fontSize: 13,
        textTransform: "capitalize", fontFamily: "inherit",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {label}
    </button>
  );
})}
          </div>

          {/* Column picker */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowColPicker((v) => !v)}
              style={{
                width: 42, height: 42, border: "1px solid #E2E8F0",
                borderRadius: 12, background: "#fff", cursor: "pointer",
                fontSize: 16,
              }}
              title="Toggle columns"
            >
              ☰
            </button>
            {showColPicker && (
              <ColVisPopover
                visible={visibleCols}
                onChange={onToggleCol}
                onClose={() => setShowColPicker(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};