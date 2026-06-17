import React, { useEffect, useMemo, useState } from "react";
import { Avatar } from "../../../shared/Avatar";
import { PageBtn } from "../../../shared/PageBtn";
import { SortIcon } from "../../../shared/SortIcon";
import type { ReportRow, ReportUser } from "../../types";
import { ReportStatusBadge } from "./ReportStatusBadge";

export interface ReportColumn<T extends ReportRow> {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  render?: (row: T) => React.ReactNode;
}

interface ReportTableProps<T extends ReportRow> {
  rows: T[];
  columns: ReportColumn<T>[];
  onSort: (key: string) => void;
  sortConfig?: { key: string; direction: "asc" | "desc" } | null;
  rowsPerPage?: number;
  emptyLabel: string;
}

const thBase: React.CSSProperties = {
  padding: "13px 16px",
  textAlign: "left",
  borderBottom: "1px solid #E8EDF2",
  color: "#64748B",
  fontWeight: 500,
  fontSize: 13,
  userSelect: "none",
  whiteSpace: "nowrap",
};

const tdBase: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #F1F5F9",
  fontSize: 14,
  verticalAlign: "middle",
};

export const formatDateTime = (iso: string | null): string => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

export const UserCell: React.FC<{ user: ReportUser | null }> = ({ user }) => {
  if (!user) return <span style={{ color: "#CBD5E1" }}>-</span>;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Avatar src={user.imageUrl} name={user.name} size={32} />
      <span style={{ color: "#0F172A", fontWeight: 600, whiteSpace: "nowrap" }}>
        {user.name}
      </span>
    </div>
  );
};

export const StatusCell: React.FC<{ status: string }> = ({ status }) => (
  <ReportStatusBadge status={status} />
);

export const ReportTable = <T extends ReportRow>({
  rows,
  columns,
  onSort,
  sortConfig,
  rowsPerPage = 10,
  emptyLabel,
}: ReportTableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows.length]);

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, currentPage, rowsPerPage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E8EDF2",
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto", width: "100%" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1050,
          }}
        >
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              <th style={{ ...thBase, width: 48 }}>
                <input type="checkbox" style={{ cursor: "pointer", accentColor: "#EA580C" }} />
              </th>
              <th style={{ ...thBase, width: 72 }}>Sr. No.</th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    ...thBase,
                    textAlign: column.align ?? "left",
                    cursor: "pointer",
                  }}
                  onClick={() => onSort(column.key)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        column.align === "right"
                          ? "flex-end"
                          : column.align === "center"
                            ? "center"
                            : "flex-start",
                      gap: 6,
                    }}
                  >
                    {column.label}
                    <SortIcon
                      active={sortConfig?.key === column.key}
                      direction={sortConfig?.key === column.key ? sortConfig.direction : undefined}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  style={{
                    padding: "48px 0",
                    textAlign: "center",
                    color: "#94A3B8",
                    fontSize: 14,
                  }}
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => {
                const globalIndex = (currentPage - 1) * rowsPerPage + index + 1;

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: "#fff",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "#FAFBFC";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = "#fff";
                    }}
                  >
                    <td style={tdBase}>
                      <input type="checkbox" style={{ cursor: "pointer", accentColor: "#EA580C" }} />
                    </td>
                    <td style={{ ...tdBase, color: "#475569", fontSize: 13 }}>
                      {String(globalIndex).padStart(2, "0")}
                    </td>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        style={{
                          ...tdBase,
                          color: "#334155",
                          textAlign: column.align ?? "left",
                          whiteSpace: column.key.toLowerCase().includes("date") ? "nowrap" : undefined,
                        }}
                      >
                        {column.render ? column.render(row) : String((row as unknown as Record<string, unknown>)[column.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid #F1F5F9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, color: "#64748B" }}>
          Page {currentPage} of {totalPages}
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <PageBtn
            label="< Previous"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
          />
          {pageNumbers[0] > 1 && (
            <>
              <PageBtn label="1" onClick={() => setCurrentPage(1)} />
              {pageNumbers[0] > 2 && (
                <span style={{ padding: "0 4px", color: "#94A3B8" }}>...</span>
              )}
            </>
          )}
          {pageNumbers.map((page) => (
            <PageBtn
              key={page}
              label={String(page)}
              active={page === currentPage}
              onClick={() => setCurrentPage(page)}
            />
          ))}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span style={{ padding: "0 4px", color: "#94A3B8" }}>...</span>
              )}
              <PageBtn label={String(totalPages)} onClick={() => setCurrentPage(totalPages)} />
            </>
          )}
          <PageBtn
            label="Next >"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
          />
        </div>
      </div>
    </div>
  );
};
