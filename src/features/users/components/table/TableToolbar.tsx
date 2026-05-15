import React, { useRef, useEffect, useState } from "react";
import { User } from "../../pages/Users";
import { StatusFilter, UserTypeFilter } from "../../../shared/types";


/* ── Types ───────────────────────────────────────────────────── */
export const ALL_EXTRA_COLUMNS = [
  { label: "Location", key: "location" as const },
  { label: "Phone",    key: "phone"    as const },
] satisfies { label: string; key: keyof User }[];

interface Props {
  searchTerm: string;
  onSearch: (v: string) => void;
  locationOptions: { label: string; value: string }[];
  locationFilter: string;
  onLocationChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  userTypeFilter: UserTypeFilter;
  onUserTypeChange: (v: UserTypeFilter) => void;
  visibleCols: Set<string>;
  onToggleCol: (key: string) => void;
}

/* ── Column-visibility popover ───────────────────────────────── */
const ColVisPopover: React.FC<{
  visible: Set<string>;
  onChange: (key: string) => void;
  onClose: () => void;
}> = ({ visible, onChange, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
      background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
      boxShadow: "0 8px 24px rgba(15,23,42,0.10)", padding: "8px 0", minWidth: 180,
    }}>
      <p style={{ margin: 0, padding: "6px 14px 10px", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.8 }}>
        Show / hide columns
      </p>
      {ALL_EXTRA_COLUMNS.map((col) => (
        <label key={col.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", cursor: "pointer", fontSize: 14, color: "#334155" }}>
          <input type="checkbox" checked={visible.has(col.key)} onChange={() => onChange(col.key)}
            style={{ accentColor: "#EA580C", cursor: "pointer" }} />
          {col.label}
        </label>
      ))}
    </div>
  );
};

/* ── Dropdown ────────────────────────────────────────────────── */
const Dropdown: React.FC<{
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ value, options, onChange, placeholder }) => (
  <div style={{ position: "relative" }}>
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      appearance: "none", WebkitAppearance: "none",
      padding: "9px 36px 9px 14px",
      border: "1px solid #E2E8F0", borderRadius: 10,
      background: "#fff", fontSize: 14, color: value === "all" ? "#94A3B8" : "#0F172A",
      cursor: "pointer", outline: "none", minWidth: 140, fontFamily: "inherit",
    }}>
      <option value="all">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
      <path d="M3 5l4 4 4-4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

/* ── Main ────────────────────────────────────────────────────── */
export const TableToolbar: React.FC<Props> = ({
  searchTerm, onSearch,
  locationOptions, locationFilter, onLocationChange,
  statusFilter, onStatusChange,
  userTypeFilter, onUserTypeChange,
  visibleCols, onToggleCol,
}) => {
  const [showColPicker, setShowColPicker] = useState(false);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>

      {/* Search */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <circle cx="7" cy="7" r="5.5" stroke="#94A3B8" strokeWidth="1.5" />
          <path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text" placeholder="Search" value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          style={{
            padding: "9px 14px 9px 36px", borderRadius: 10, border: "1px solid #E2E8F0",
            width: 240, maxWidth: "100%", outline: "none", fontSize: 14,
            color: "#0F172A", fontFamily: "inherit", background: "#fff",
          }}
        />
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

        <Dropdown value={locationFilter} options={locationOptions} onChange={onLocationChange} placeholder="Location" />

        <Dropdown
          value={statusFilter}
          options={[
            { label: "Active",    value: "active" },
            { label: "Suspended", value: "suspended" },
            { label: "Pending",   value: "pending" },
          ]}
          onChange={(v) => onStatusChange(v as StatusFilter)}
          placeholder="Status"
        />

        {/* Clients / Bidders toggle */}
        <div style={{ display: "flex", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden", background: "#fff" }}>
          {(["clients", "bidders"] as UserTypeFilter[]).map((val) => {
            const active = userTypeFilter === val;
            return (
              <button key={val} onClick={() => onUserTypeChange(active ? "all" : val)} style={{
                padding: "9px 18px", border: "none", cursor: "pointer",
                background: active ? "#0F172A" : "#fff",
                color: active ? "#fff" : "#64748B",
                fontWeight: 600, fontSize: 14, fontFamily: "inherit",
                transition: "background 0.15s, color 0.15s",
                textTransform: "capitalize",
              }}>
                {val.charAt(0).toUpperCase() + val.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Column visibility */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowColPicker((v) => !v)} title="Show / hide columns" style={{
            width: 40, height: 40, border: "1px solid #E2E8F0", borderRadius: 10,
            background: showColPicker ? "#F8FAFC" : "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2"  y="2" width="4" height="14" rx="1.5" stroke="#64748B" strokeWidth="1.5" />
              <rect x="8"  y="2" width="4" height="14" rx="1.5" stroke="#64748B" strokeWidth="1.5" />
              <rect x="14" y="2" width="2" height="14" rx="1"   stroke="#64748B" strokeWidth="1.5" />
            </svg>
          </button>
          {showColPicker && (
            <ColVisPopover visible={visibleCols} onChange={onToggleCol} onClose={() => setShowColPicker(false)} />
          )}
        </div>
      </div>
    </div>
  );
};