import React, { useMemo, useState } from "react";
import { User } from "../pages/Users";

interface Column {
  label: string;
  key: keyof User;
}

interface Props {
  data: User[];
  columns: Column[];
  onSort: (key: keyof User) => void;
  sortConfig?: {
    key: keyof User;
    direction: "asc" | "desc";
  } | null;
  rowsPerPage?: number;
}

export const UserTable: React.FC<Props> = ({
  data,
  columns,
  onSort,
  sortConfig,
  rowsPerPage = 50,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return data.slice(start, end);
  }, [data, currentPage, rowsPerPage]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",              // ✅ takes full available height
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        borderRadius: 14,
        border: "1px solid #E2E8F0",
        overflow: "hidden",
      }}
    >
      {/* TABLE WRAPPER */}
      <div
        style={{
          flex: 1,                   // ✅ pushes pagination to bottom
          overflow: "auto",
          width: "100%",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 700,
          }}
        >
          {/* HEADER */}
          <thead style={{ background: "#F8FAFC" }}>
            <tr>
              {columns.map((column) => {
                const isSorted = sortConfig?.key === column.key;

                return (
                  <th
                    key={String(column.key)}
                    onClick={() => onSort(column.key)}
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      cursor: "pointer",
                      borderBottom: "1px solid #E2E8F0",
                      color: "#334155",
                      fontWeight: 600,
                      fontSize: 14,
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {column.label}
                      {isSorted && (
                        <span style={{ fontSize: 12, color: "#EA580C" }}>
                          {sortConfig?.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {paginatedData.map((user) => (
              <tr
                key={user.id}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#FAFAFA")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#fff")
                }
              >
                <td style={cellStyle}>{user.name}</td>
                <td style={{ ...cellStyle, color: "#475569" }}>
                  {user.email}
                </td>
                <td style={cellStyle}>{user.location}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#64748B",
            }}
          >
            No users found
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {data.length > 0 && (
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            background: "#fff",
          }}
        >
          <span style={{ fontSize: 13, color: "#64748B" }}>
            Showing {(currentPage - 1) * rowsPerPage + 1}–
            {Math.min(currentPage * rowsPerPage, data.length)} of{" "}
            {data.length}
          </span>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              style={buttonStyle(currentPage === 1)}
            >
              Prev
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              const active = page === currentPage;

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: active ? "none" : "1px solid #E2E8F0",
                    background: active ? "#EA580C" : "#fff",
                    color: active ? "#fff" : "#0F172A",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {page}
                </button>
              );
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(p + 1, totalPages))
              }
              style={buttonStyle(currentPage === totalPages)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ===== helpers ===== */

const cellStyle: React.CSSProperties = {
  padding: "16px",
  borderBottom: "1px solid #F1F5F9",
  fontSize: 14,
};

const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  background: disabled ? "#F8FAFC" : "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
});