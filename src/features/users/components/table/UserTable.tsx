import React, { useMemo, useState, useEffect } from "react";
import { User } from "../../pages/Users";
import { Column /*, deriveStatus */ } from "../../../shared/types";
import { Avatar } from "../../../shared/Avatar";
// import { StatusBadge } from "../../../shared/StatusBadge";

import { MobileUserCard } from "./MobileUserCard";
import { UserDetailPanel } from "./UserDetailPanel";
import { SortIcon } from "../../../shared/SortIcon";
import { IconBtn } from "../../../shared/IconBtn";
import { PageBtn } from "../../../shared/PageBtn";

interface Props {
  data: User[];
  columns: Column[];
  onSort: (key: keyof User) => void;
  sortConfig?: { key: keyof User; direction: "asc" | "desc" } | null;
  rowsPerPage?: number;
  onViewUser?: (user: User) => void;
  onSuspendUser?: (user: User) => void;
}

/* ─── Style constants ────────────────────────────────────────── */
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
const thInner: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};
const tdBase: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #F1F5F9",
  fontSize: 14,
  verticalAlign: "middle",
};

/* ─── Main ───────────────────────────────────────────────────── */
export const UserTable: React.FC<Props> = ({
  data,
  columns,
  onSort,
  sortConfig,
  rowsPerPage = 10,
  onViewUser,
  onSuspendUser,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, currentPage, rowsPerPage]);

  const allSelected =
    paginatedData.length > 0 &&
    paginatedData.every((u) => selectedIds.has(u.id));

  const toggleAll = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) paginatedData.forEach((u) => next.delete(u.id));
      else paginatedData.forEach((u) => next.add(u.id));
      return next;
    });

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2)
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ];
  }, [currentPage, totalPages]);

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-GB") : null;

  const sortTh = (key: keyof User, label: string) => (
    <th style={{ ...thBase, cursor: "pointer" }} onClick={() => onSort(key)}>
      <div style={thInner}>
        {label}
        <SortIcon
          active={sortConfig?.key === key}
          direction={sortConfig?.key === key ? sortConfig.direction : undefined}
        />
      </div>
    </th>
  );

  return (
    <>
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
        {/* ── MOBILE CARDS ── */}
        {isMobile ? (
          paginatedData.length === 0 ? (
            <div
              style={{
                padding: "48px 0",
                textAlign: "center",
                color: "#94A3B8",
                fontSize: 14,
              }}
            >
              No users found
            </div>
          ) : (
            paginatedData.map((user, idx) => (
              <MobileUserCard
                key={user.id}
                user={user}
                index={(currentPage - 1) * rowsPerPage + idx + 1}
                onClick={() => setSelectedUser(user)}
              />
            ))
          )
        ) : (
          /* ── DESKTOP TABLE ── */
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 760,
              }}
            >
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ ...thBase, width: 48 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      style={{ cursor: "pointer", accentColor: "#EA580C" }}
                    />
                  </th>
                  <th style={{ ...thBase, width: 72 }}>Sr. No.</th>
                  {sortTh("name", "Username")}
                  {columns.map((col) => (
                    <th
                      key={String(col.key)}
                      style={{ ...thBase, cursor: "pointer" }}
                      onClick={() => onSort(col.key)}
                    >
                      <div style={thInner}>
                        {col.label}
                        <SortIcon
                          active={sortConfig?.key === col.key}
                          direction={
                            sortConfig?.key === col.key
                              ? sortConfig.direction
                              : undefined
                          }
                        />
                      </div>
                    </th>
                  ))}
                   {sortTh("professional_headline", "Professional Headline")}
                  {/* Status column commented out until status field exists
                  {sortTh("status", "Status")} */}
                  {sortTh("created_at", "Joined")}
                  {/* {sortTh("updated_at", "Updated")} */}
                  <th style={{ ...thBase, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 6}
                      style={{
                        padding: "48px 0",
                        textAlign: "center",
                        color: "#94A3B8",
                        fontSize: 14,
                      }}
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((user, idx) => {
                    // const status = deriveStatus(user);
                    const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                    const isSelected = selectedIds.has(user.id);

                    return (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        style={{
                          background: isSelected ? "#FFF7ED" : "#fff",
                          transition: "background 0.12s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.background = "#FAFBFC";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isSelected
                            ? "#FFF7ED"
                            : "#fff";
                        }}
                      >
                        <td style={tdBase} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(user.id)}
                            style={{ cursor: "pointer", accentColor: "#EA580C" }}
                          />
                        </td>
                        <td style={{ ...tdBase, color: "#94A3B8", fontSize: 13 }}>
                          {String(globalIdx).padStart(2, "0")}
                        </td>
                        <td style={tdBase}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar src={user.image_url} name={user.name} />
                            <div>
                              <div style={{  fontSize: 14, color: "#0F172A" }}>
                                {user.name || "—"}
                              </div>
                              {/* {user.professional_headline && (
                                <div style={{ fontSize: 8, color: "#94A3B8", marginTop: 1 }}>
                                  {user.professional_headline}
                                </div>
                              )} */}
                            </div>
                          </div>
                        </td>
                        {columns.map((col) => {
                          const val = user[col.key];
                          let display: React.ReactNode = (
                            <span style={{ color: "#CBD5E1" }}>—</span>
                          );
                          if (val !== null && val !== undefined && val !== "") {
                            if (Array.isArray(val))
                              display = val.length ? val.join(", ") : display;
                            else if (typeof val === "boolean")
                              display = val ? "Yes" : "No";
                            else display = String(val);
                          }
                          return (
                            <td key={String(col.key)} style={{ ...tdBase, color: "#475569" }}>
                              {display}
                            </td>
                          );
                        })}

                        {/* </div>
                              {user.professional_headline && (
                                <div style={{ fontSize: 8, color: "#94A3B8", marginTop: 1 }}>
                                  {user.professional_headline}
                                </div> */}

                        {/* Status cell commented out until status field exists */}
                        <td style={tdBase}>
                          {user.professional_headline && (
                                <div style={{ fontSize: 14, color: "#0F172A"  }}>
                                  {user.professional_headline}
                                </div> )}
                          {/* <StatusBadge status={status} /> */}
                        </td>

                        <td style={{ ...tdBase, color: "#475569", whiteSpace: "nowrap" }}>
                          {formatDate(user.created_at) ?? (
                            <span style={{ color: "#CBD5E1" }}>—</span>
                          )}
                        </td>
                        {/* <td style={{ ...tdBase, color: "#475569", whiteSpace: "nowrap" }}>
                          {formatDate(user.updated_at) ?? (
                            <span style={{ color: "#CBD5E1" }}>—</span>
                          )}
                        </td> */}

                        <td
                          style={{ ...tdBase, textAlign: "right" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <IconBtn
                              title="View details"
                              onClick={() => {
                                onViewUser?.(user);
                                setSelectedUser(user);
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" stroke="#94A3B8" strokeWidth="1.5" />
                                <path d="M8 7v4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                                <circle cx="8" cy="5" r="0.75" fill="#94A3B8" />
                              </svg>
                            </IconBtn>
                            <IconBtn
                              title="Suspend user"
                              // title={status === "suspended" ? "Unsuspend user" : "Suspend user"}
                              onClick={() => onSuspendUser?.(user)}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" stroke="#94A3B8" strokeWidth="1.5" />
                                <path d="M3.5 3.5l9 9" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
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
            <span style={{ fontSize: 13, color: "#94A3B8" }}>
              Showing {(currentPage - 1) * rowsPerPage + 1}–
              {Math.min(currentPage * rowsPerPage, data.length)} of {data.length} users
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <PageBtn
                label="←"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              />
              {pageNumbers[0] > 1 && (
                <>
                  <PageBtn label="1" onClick={() => setCurrentPage(1)} />
                  {pageNumbers[0] > 2 && (
                    <span style={{ padding: "0 4px", color: "#94A3B8" }}>…</span>
                  )}
                </>
              )}
              {pageNumbers.map((p) => (
                <PageBtn
                  key={p}
                  label={String(p)}
                  active={p === currentPage}
                  onClick={() => setCurrentPage(p)}
                />
              ))}
              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                    <span style={{ padding: "0 4px", color: "#94A3B8" }}>…</span>
                  )}
                  <PageBtn
                    label={String(totalPages)}
                    onClick={() => setCurrentPage(totalPages)}
                  />
                </>
              )}
              <PageBtn
                label="→"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              />
            </div>
          </div>
        )}
      </div>

      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuspend={(u) => {
            onSuspendUser?.(u);
            setSelectedUser(null);
          }}
        />
      )}
    </>
  );
};