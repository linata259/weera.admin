/* ─── Shared building blocks for the Financials tabs ──────────────────────────
 *
 * Pagination, the export button, the toolbar controls and the summary-card
 * strip were copy-pasted into all four tabs — four slightly diverging copies
 * of the same 80 lines. They live here once now, so the tabs look the same
 * because they *are* the same components, not because four files happen to
 * agree.
 */
import React, { useEffect, useState } from "react";

export const ORANGE = "#EA580C";
export const NAVY = "#0F172A";
export const SLATE = "#64748B";
export const BORDER = "#E2E8F0";
export const BG = "#F8FAFC";
export const GREEN = "#16A34A";
export const RED = "#DC2626";
export const MUTED = "#94A3B8";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const fmtAmt = (n: number) =>
  `KES ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Debounce a value so typing in a search box doesn't fire a query per keystroke. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Summary cards ──────────────────────────────────────────────────────────
 * One card design for every tab. `tone` tints only the value, never the card
 * body — four differently-coloured filled boxes in a row read as an alert
 * strip, not a summary.
 */
export interface StatCardProps {
  label: string;
  value: string | number;
  /** Small line under the value — a count, a share, a qualifier. */
  hint?: string;
  tone?: "default" | "positive" | "warning" | "danger" | "info";
}

const TONE_COLOR: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: NAVY,
  positive: GREEN,
  warning: "#CA8A04",
  danger: RED,
  info: "#2563EB",
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  hint,
  tone = "default",
}) => (
  <div
    style={{
      background: "#fff",
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: "14px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0,
    }}
  >
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: SLATE,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 20,
        fontWeight: 700,
        color: TONE_COLOR[tone],
        lineHeight: 1.2,
        overflowWrap: "anywhere",
      }}
    >
      {value}
    </span>
    {hint && <span style={{ fontSize: 12, color: MUTED }}>{hint}</span>}
  </div>
);

/** Auto-fitting grid — no breakpoint logic needed, it reflows on its own. */
export const StatCardRow: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: 12,
    }}
  >
    {children}
  </div>
);

/* ── Toolbar controls ───────────────────────────────────────────────────── */

export const ExBtn: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: boolean;
}> = ({ label, onClick, disabled, icon = true }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "7px 14px",
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      background: "#fff",
      fontSize: 13,
      fontWeight: 600,
      color: NAVY,
      cursor: disabled ? "wait" : "pointer",
      opacity: disabled ? 0.6 : 1,
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "inherit",
      whiteSpace: "nowrap",
    }}
  >
    {icon && (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M14 10v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2M8 2v8M5 5l3-3 3 3"
          stroke={NAVY}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
    {label}
  </button>
);

export const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  isMobile: boolean;
}> = ({ value, onChange, placeholder, isMobile }) => (
  <div
    style={{
      position: "relative",
      flex: isMobile ? "unset" : "1 1 200px",
      width: isMobile ? "100%" : undefined,
      maxWidth: isMobile ? "100%" : 300,
    }}
  >
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      style={{
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
      }}
    >
      <circle cx="7" cy="7" r="5" stroke={MUTED} strokeWidth="1.5" />
      <path d="M11 11l2.5 2.5" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "9px 12px 9px 34px",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        fontSize: 13,
        outline: "none",
        fontFamily: "inherit",
      }}
    />
  </div>
);

export const FilterSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  isMobile: boolean;
  minWidth?: number;
  children: React.ReactNode;
}> = ({ value, onChange, isMobile, minWidth = 140, children }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      padding: "9px 14px",
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      fontSize: 13,
      outline: "none",
      color: NAVY,
      background: "#fff",
      fontFamily: "inherit",
      width: isMobile ? "100%" : undefined,
      minWidth: isMobile ? undefined : minWidth,
    }}
  >
    {children}
  </select>
);

export const DateRangeInput: React.FC<{
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  isMobile: boolean;
}> = ({ from, to, onFrom, onTo, isMobile }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      padding: "6px 12px",
      background: "#fff",
      width: isMobile ? "100%" : undefined,
      boxSizing: "border-box",
    }}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="12" rx="2" stroke={MUTED} strokeWidth="1.4" />
      <path d="M1 7h14M5 1v4M11 1v4" stroke={MUTED} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
    <input
      type="date"
      value={from}
      onChange={(e) => onFrom(e.target.value)}
      style={{
        border: "none",
        outline: "none",
        fontSize: 12,
        color: SLATE,
        fontFamily: "inherit",
        background: "transparent",
        flex: isMobile ? 1 : undefined,
        minWidth: 0,
      }}
    />
    <span style={{ color: "#CBD5E1" }}>–</span>
    <input
      type="date"
      value={to}
      onChange={(e) => onTo(e.target.value)}
      style={{
        border: "none",
        outline: "none",
        fontSize: 12,
        color: SLATE,
        fontFamily: "inherit",
        background: "transparent",
        flex: isMobile ? 1 : undefined,
        minWidth: 0,
      }}
    />
  </div>
);

/** The filters-left / actions-right bar every tab opens with. */
export const Toolbar: React.FC<{
  isMobile: boolean;
  filters: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ isMobile, filters, actions }) => (
  <div
    style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "stretch" : "center",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "space-between",
    }}
  >
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: 10,
        flexWrap: "wrap",
        flex: 1,
      }}
    >
      {filters}
    </div>
    {actions && (
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: isMobile ? "flex-end" : undefined,
          flexWrap: "wrap",
        }}
      >
        {actions}
      </div>
    )}
  </div>
);

/* ── Pagination ─────────────────────────────────────────────────────────── */

export const Pagination: React.FC<{
  page: number;
  pageSize: number;
  totalItems: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
  busy?: boolean;
}> = ({ page, pageSize, totalItems, onPage, onPageSize, busy }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    )
      pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  const btn: React.CSSProperties = {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    background: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 8px",
    fontFamily: "inherit",
    color: NAVY,
  };

  const first = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  return (
    <div
      style={{
        padding: "14px 20px",
        borderTop: "1px solid #F1F5F9",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        background: BG,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: SLATE }}>Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          style={{
            padding: "5px 10px",
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            fontSize: 13,
            color: NAVY,
            background: "#fff",
            cursor: "pointer",
            fontFamily: "inherit",
            outline: "none",
          }}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: SLATE }}>
          {totalItems === 0 ? "0" : `${first}–${last}`} of{" "}
          {totalItems.toLocaleString("en-US")}
          {busy && <span style={{ color: MUTED }}> · updating…</span>}
        </span>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
            style={{
              ...btn,
              opacity: page === 1 ? 0.4 : 1,
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M9 2L4 7l5 5"
                stroke={NAVY}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {pages.map((p, i) =>
            p === "…" ? (
              <span
                key={`e${i}`}
                style={{ ...btn, cursor: "default", border: "none", color: SLATE }}
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p as number)}
                style={{
                  ...btn,
                  background: page === p ? ORANGE : "#fff",
                  color: page === p ? "#fff" : NAVY,
                  border: `1px solid ${page === p ? ORANGE : BORDER}`,
                }}
              >
                {p}
              </button>
            ),
          )}

          <button
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
            style={{
              ...btn,
              opacity: page === totalPages ? 0.4 : 1,
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 2l5 5-5 5"
                stroke={NAVY}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Table shell ────────────────────────────────────────────────────────── */

export const TableCard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      overflow: "hidden",
      background: "#fff",
    }}
  >
    {children}
  </div>
);

export const th: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 600,
  color: SLATE,
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: "nowrap",
  background: BG,
  userSelect: "none",
};

export const td: React.CSSProperties = {
  padding: "14px 16px",
  fontSize: 14,
  color: NAVY,
  borderBottom: "1px solid #F1F5F9",
  verticalAlign: "middle",
};

export const EmptyState: React.FC<{ message: string; colSpan?: number }> = ({
  message,
  colSpan,
}) =>
  colSpan ? (
    <tr>
      <td
        colSpan={colSpan}
        style={{ ...td, textAlign: "center", color: MUTED, padding: "48px 0" }}
      >
        {message}
      </td>
    </tr>
  ) : (
    <div style={{ textAlign: "center", color: MUTED, padding: "32px 0", fontSize: 14 }}>
      {message}
    </div>
  );

/** Skeleton rows — shown while a page loads so the table never collapses to nothing. */
export const SkeletonRows: React.FC<{ rows?: number; cols: number }> = ({
  rows = 6,
  cols,
}) => (
  <>
    <style>{`@keyframes weera-pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }`}</style>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r}>
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c} style={td}>
            <div
              style={{
                height: 12,
                borderRadius: 6,
                background: "#EEF2F6",
                animation: "weera-pulse 1.2s ease-in-out infinite",
              }}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/** Mobile equivalent of SkeletonRows. */
export const SkeletonCards: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <>
    <style>{`@keyframes weera-pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }`}</style>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {[70, 45, 60].map((w, j) => (
          <div
            key={j}
            style={{
              height: 12,
              width: `${w}%`,
              borderRadius: 6,
              background: "#EEF2F6",
              animation: "weera-pulse 1.2s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    ))}
  </>
);

/** Sortable column header. Only DB-backed columns get one. */
export const SortTh: React.FC<{
  label: string;
  col: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (col: string) => void;
  style?: React.CSSProperties;
}> = ({ label, col, sortKey, sortDir, onSort, style }) => (
  <th
    style={{ ...th, cursor: "pointer", ...style }}
    onClick={() => onSort(col)}
  >
    {label}
    {sortKey === col && (
      <span style={{ marginLeft: 4, fontSize: 10 }}>
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    )}
  </th>
);

export const StatusPill: React.FC<{
  label: string;
  color: string;
  bg: string;
}> = ({ label, color, bg }) => (
  <span
    style={{
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: bg,
      color,
      whiteSpace: "nowrap",
      textTransform: "capitalize",
    }}
  >
    {label}
  </span>
);

/* ── Mobile row card ────────────────────────────────────────────────────── */

/** The stacked card each table falls back to on small screens.
 *  One layout for all four tabs: title block + amount, a person row, then a
 *  two-column detail grid and an optional footer. */
export const RowCard: React.FC<{
  lead: React.ReactNode;
  trail?: React.ReactNode;
  person?: React.ReactNode;
  details?: { label: string; value: React.ReactNode }[];
  note?: React.ReactNode;
  footer?: React.ReactNode;
  highlighted?: boolean;
}> = ({ lead, trail, person, details, note, footer, highlighted }) => (
  <div
    style={{
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: 16,
      background: highlighted ? "#FFF7ED" : "#fff",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <div style={{ minWidth: 0 }}>{lead}</div>
      {trail && <div style={{ textAlign: "right", flexShrink: 0 }}>{trail}</div>}
    </div>

    {person}

    {details && details.length > 0 && (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          fontSize: 13,
        }}
      >
        {details.map((d) => (
          <div key={d.label} style={{ minWidth: 0 }}>
            <div
              style={{
                color: MUTED,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {d.label}
            </div>
            <div style={{ color: "#475569", overflowWrap: "anywhere" }}>
              {d.value}
            </div>
          </div>
        ))}
      </div>
    )}

    {note}

    {footer && (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          borderTop: "1px solid #F1F5F9",
          paddingTop: 10,
          marginTop: 4,
        }}
      >
        {footer}
      </div>
    )}
  </div>
);

export const MobileCardList: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 12,
      padding: 16,
    }}
  >
    {children}
  </div>
);
