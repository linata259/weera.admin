import React, { useMemo, useState, useEffect } from "react";
import { User, Column, deriveStatus } from "../../types";
import { Avatar } from "../../../shared/Avatar";
import { StatusBadge } from "../../../shared/StatusBadge";
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

const ORANGE = "#EA580C";
const NAVY   = "#0F172A";
const SLATE  = "#64748B";
const BORDER = "#E8EDF2";

const thBase: React.CSSProperties = {
  padding: "13px 16px",
  textAlign: "left",
  borderBottom: `1px solid ${BORDER}`,
  color: SLATE,
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

const MobileDetailView: React.FC<{
  user: User;
  onBack: () => void;
  onSuspend?: (user: User) => void;
}> = ({ user, onBack, onSuspend }) => {
  const status = deriveStatus(user);
  const BG = "#F8FAFC";

  const types = (user.user_type_names ?? [])
    .map((t: string) =>
      t.toLowerCase() === "find work" ? "Bidder" :
      t.toLowerCase() === "hire talent" ? "Client" : t
    )
    .join(", ");

  return (
    <div style={{
      background: BG,
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Back bar */}
      <div style={{
        padding: "0 16px",
        height: 52,
        background: "#fff",
        borderBottom: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            color: NAVY,
            padding: "6px 0",
            fontFamily: "inherit",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <span style={{ fontSize: 13, color: SLATE }}>User Profile</span>
      </div>

      {/* Avatar hero */}
      <div style={{
        background: "#fff",
        padding: "24px 20px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <Avatar src={user.image_url} name={user.name} size={72} />
        <div style={{ marginTop: 12, fontSize: 17, fontWeight: 700, color: NAVY }}>{user.name || "—"}</div>
        {user.professional_headline && (
          <div style={{ fontSize: 13, color: SLATE, marginTop: 3 }}>{user.professional_headline}</div>
        )}
        {types && (
          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: ORANGE, background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: 20, padding: "3px 12px" }}>
            {types}
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Info rows */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Basic info card */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: BG, borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.8 }}>Basic Info</span>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Phone",    value: user.phone },
              { label: "Email",    value: (user as any).email },
              { label: "Location", value: (user.location_names ?? []).join(", ") || user.location },
              { label: "Joined",   value: user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : null },
            ].map(({ label, value }) => value ? (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: SLATE, textTransform: "uppercase", letterSpacing: 0.7, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, color: NAVY, fontWeight: 500, textAlign: "right" }}>{value}</span>
              </div>
            ) : null)}
          </div>
        </div>

        {/* About */}
        {user.about_me && (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: BG, borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.8 }}>About</span>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.65 }}>{user.about_me}</p>
            </div>
          </div>
        )}

        {/* Skills */}
        {(user.skills_id ?? []).length > 0 && (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: BG, borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.8 }}>Skills</span>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(user.skills_id ?? []).map((s: string, i: number) => (
                <span key={i} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: BG, color: "#475569", border: `1px solid ${BORDER}` }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {(user.certifications ?? []).length > 0 && (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: BG, borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.8 }}>Certifications</span>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {(user.certifications ?? []).map((c: string, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: ORANGE, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: 13, color: NAVY }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {(user.profile_attachments ?? []).length > 0 && (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: BG, borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.8 }}>Attachments</span>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              {(user.profile_attachments ?? []).map((att: string, i: number) => (
                <a key={i} href={att} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: ORANGE, wordBreak: "break-all" }}>{att}</a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
          <button
            onClick={() => onSuspend?.(user)}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid #FEE2E2", background: "#FFF5F5", color: "#DC2626", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
          >
            {status === "suspended" ? "Unsuspend User" : "Suspend User"}
          </button>
          <button
            onClick={onBack}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: NAVY, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main ────────────────────────────────────────────────────── */
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
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  const formatDate = (iso: string | null | undefined): string | null => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("en-GB");
  };

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

  /* ── Mobile: show detail view instead of table when a user is selected ── */
  if (isMobile && selectedUser) {
    return (
      <MobileDetailView
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
        onSuspend={(u) => { onSuspendUser?.(u); setSelectedUser(null); }}
      />
    );
  }

  return (
    <>
      <div style={{
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 16,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
        overflow: "hidden",
      }}>

        {/* ── MOBILE CARDS ── */}
        {isMobile ? (
          paginatedData.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
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
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ ...thBase, width: 48 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer", accentColor: ORANGE }} />
                  </th>
                  <th style={{ ...thBase, width: 72 }}>Sr. No.</th>
                  {sortTh("name", "Username")}
                  {columns.map((col) => (
                    <th
                      key={String(col.key)}
                      style={{ ...thBase, cursor: "pointer" }}
                      onClick={() => onSort(col.key as keyof User)}
                    >
                      <div style={thInner}>
                        {col.label}
                        <SortIcon
                          active={sortConfig?.key === col.key}
                          direction={sortConfig?.key === col.key ? sortConfig.direction : undefined}
                        />
                      </div>
                    </th>
                  ))}
                  {sortTh("professional_headline", "Professional Headline")}
                  {sortTh("created_at", "Joined")}
                  <th style={{ ...thBase, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 6} style={{ padding: "48px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((user, idx) => {
                    const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                    const isSelected = selectedIds.has(user.id);

                    return (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        style={{ background: isSelected ? "#FFF7ED" : "#fff", transition: "background 0.12s", cursor: "pointer" }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#FAFBFC"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "#FFF7ED" : "#fff"; }}
                      >
                        <td style={tdBase} onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOne(user.id)} style={{ cursor: "pointer", accentColor: ORANGE }} />
                        </td>
                        <td style={{ ...tdBase, color: "#94A3B8", fontSize: 13 }}>
                          {String(globalIdx).padStart(2, "0")}
                        </td>
                        <td style={tdBase}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar src={user.image_url} name={user.name} />
                            <div style={{ fontSize: 14, color: NAVY }}>{user.name || "—"}</div>
                          </div>
                        </td>

                        {columns.map((col) => {
                          const record = user as unknown as Record<string, unknown>;
                          const val = record[col.key as string];
                          let display: React.ReactNode = <span style={{ color: "#CBD5E1" }}>—</span>;
                          if (val !== null && val !== undefined && val !== "") {
                            if (Array.isArray(val))
                              display = val.length ? val.join(", ") : display;
                            else if (typeof val === "boolean")
                              display = val ? "Yes" : "No";
                            else
                              display = String(val);
                          }
                          return (
                            <td key={String(col.key)} style={{ ...tdBase, color: "#475569" }}>{display}</td>
                          );
                        })}

                        <td style={tdBase}>
                          {user.professional_headline
                            ? <div style={{ fontSize: 14, color: NAVY }}>{user.professional_headline}</div>
                            : <span style={{ color: "#CBD5E1" }}>—</span>
                          }
                        </td>

                        <td style={{ ...tdBase, color: "#475569", whiteSpace: "nowrap" }}>
                          {formatDate(user.created_at) ?? <span style={{ color: "#CBD5E1" }}>—</span>}
                        </td>

                        <td style={{ ...tdBase, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <IconBtn title="View details" onClick={() => { onViewUser?.(user); setSelectedUser(user); }}>
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" stroke="#94A3B8" strokeWidth="1.5" />
                                <path d="M8 7v4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                                <circle cx="8" cy="5" r="0.75" fill="#94A3B8" />
                              </svg>
                            </IconBtn>
                            <IconBtn title="Suspend user" onClick={() => onSuspendUser?.(user)}>
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
          <div style={{ padding: "14px 20px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#94A3B8" }}>
              Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, data.length)} of {data.length} users
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <PageBtn label="←" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} />
              {pageNumbers[0] > 1 && (
                <>
                  <PageBtn label="1" onClick={() => setCurrentPage(1)} />
                  {pageNumbers[0] > 2 && <span style={{ padding: "0 4px", color: "#94A3B8" }}>…</span>}
                </>
              )}
              {pageNumbers.map((p) => (
                <PageBtn key={p} label={String(p)} active={p === currentPage} onClick={() => setCurrentPage(p)} />
              ))}
              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span style={{ padding: "0 4px", color: "#94A3B8" }}>…</span>}
                  <PageBtn label={String(totalPages)} onClick={() => setCurrentPage(totalPages)} />
                </>
              )}
              <PageBtn label="→" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} />
            </div>
          </div>
        )}
      </div>

      {/* Desktop only: slide-in drawer */}
      {!isMobile && selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuspend={(u) => { onSuspendUser?.(u); setSelectedUser(null); }}
        />
      )}
    </>
  );
};