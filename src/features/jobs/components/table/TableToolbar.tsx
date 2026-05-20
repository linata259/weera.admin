import React, { useState } from "react";

export interface JobColumn {
    label: string;
    key: string; // keyof Job ideally
}

export const ALL_EXTRA_JOB_COLUMNS: JobColumn[] = [
    // Examples of extra columns that could be hidden by default
    // { key: "location", label: "Location" },
];

interface ToolbarProps {
    searchTerm: string;
    onSearch: (value: string) => void;

    jobTypeFilter: string;
    onJobTypeChange: (value: string) => void;
    jobTypeOptions: { label: string; value: string }[];

    dateRangeFilter: string;
    onDateRangeChange: (value: string) => void;

    statusFilter: string;
    onStatusChange: (value: string) => void;

    visibleCols?: Set<string>;
    onToggleCol?: (key: string) => void;
}

interface DropdownProps {
    value: string;
    options: { label: string; value: string }[];
    onChange: (value: string) => void;
    placeholder: string;
    isMobile?: boolean;
}

/* ------------------------------ Dropdown ------------------------------ */

const Dropdown: React.FC<DropdownProps> = ({
    value,
    options,
    onChange,
    placeholder,
    isMobile,
}) => {
    return (
        <div style={{ position: "relative" }}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    padding: "10px 14px",
                    paddingRight: "36px", // Space for icon
                    borderRadius: 10,
                    border: "1px solid #E2E8F0",
                    background: "#fff",
                    fontSize: 14,
                    minWidth: isMobile ? "48%" : 160,
                    outline: "none",
                    color: "#0F172A",
                    fontFamily: "inherit",
                    appearance: "none",
                    cursor: "pointer",
                }}
            >
                <option value="all">{placeholder}</option>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
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
                <path d="M1 1L5 5L9 1" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
};

/* ------------------------------ Col Popover ------------------------------ */

const ColVisPopover = ({
    visible,
    onChange,
    onClose,
}: {
    visible: Set<string>;
    onChange: (key: string) => void;
    onClose: () => void;
}) => {
    const columns = ALL_EXTRA_JOB_COLUMNS;

    if (columns.length === 0) return null;

    return (
        <div
            style={{
                position: "absolute",
                top: 50,
                right: 0,
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 14,
                width: 220,
                zIndex: 50,
                boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                }}
            >
                <strong>Columns</strong>
                <button
                    onClick={onClose}
                    style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                    }}
                >
                    ✕
                </button>
            </div>

            {columns.map((col) => (
                <label
                    key={col.key}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 0",
                        cursor: "pointer",
                    }}
                >
                    <input
                        type="checkbox"
                        checked={visible.has(col.key)}
                        onChange={() => onChange(col.key)}
                    />
                    <span style={{ textTransform: "capitalize" }}>{col.label}</span>
                </label>
            ))}
        </div>
    );
};

/* ------------------------------ Main Toolbar ------------------------------ */

export const TableToolbar: React.FC<ToolbarProps> = ({
    searchTerm,
    onSearch,

    jobTypeFilter,
    onJobTypeChange,
    jobTypeOptions,

    dateRangeFilter,
    onDateRangeChange,

    statusFilter,
    onStatusChange,

    visibleCols = new Set(),
    onToggleCol,
}) => {
    const [showColPicker, setShowColPicker] = useState(false);

    // We don't have isMobile logic fully defined, just approximate
    const isMobile = window.innerWidth < 768;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
            }}
        >
            {/* ---------------- Top Row ---------------- */}
            <div
                style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    justifyContent: "space-between",
                    gap: 16,
                }}
            >
                {/* Search */}
                <div
                    style={{
                        position: "relative",
                        width: isMobile ? "100%" : 320,
                    }}
                >
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
                        <circle
                            cx="7"
                            cy="7"
                            r="5.5"
                            stroke="#94A3B8"
                            strokeWidth="1.5"
                        />
                        <path
                            d="M11 11l2.5 2.5"
                            stroke="#94A3B8"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>

                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => onSearch(e.target.value)}
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

                {/* Right controls */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                    }}
                >
                    <Dropdown
                        value={jobTypeFilter}
                        options={jobTypeOptions}
                        onChange={onJobTypeChange}
                        placeholder="Job Categories"
                        isMobile={isMobile}
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
                        isMobile={isMobile}
                    />

                    <Dropdown
                        value={statusFilter}
                        options={[
                            { label: "Active", value: "active" },
                            { label: "Suspended", value: "suspended" },
                            { label: "Pending", value: "pending" },
                            { label: "Assigned", value: "assigned" },
                            { label: "Completed", value: "completed" },
                        ]}
                        onChange={onStatusChange}
                        placeholder="Status"
                        isMobile={isMobile}
                    />

                    {/* Column picker (looks like an icon button) */}
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setShowColPicker((v) => !v)}
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
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                            </svg>
                        </button>

                        {showColPicker && onToggleCol && (
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
