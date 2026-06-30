import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "services/supabaseClient";
import { User } from "../types";
import { Avatar } from "../../shared/Avatar";

/* ─── types ──────────────────────────────────────────────────── */
interface JobRow {
  id: string;
  title: string;
  amount: number | null;
  status: string;
  date: string | null;
  personName: string;
  personAvatar: string | null;
  isHourly: boolean;
}

type DBProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
};

/* ─── status styles ──────────────────────────────────────────── */
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  completed:                   { bg: "#DCFCE7", color: "#16A34A", label: "Completed"         },
  in_progress:                 { bg: "#DBEAFE", color: "#2563EB", label: "In Progress"        },
  pending_review:              { bg: "#FEF9C3", color: "#CA8A04", label: "Pending Review"     },
  pending:                     { bg: "#FEF9C3", color: "#CA8A04", label: "Pending"            },
  declined_work:               { bg: "#FEE2E2", color: "#DC2626", label: "Declined"           },
  declined:                    { bg: "#FEE2E2", color: "#DC2626", label: "Declined"           },
  assigned:                    { bg: "#EDE9FE", color: "#7C3AED", label: "Assigned"           },
  offer_sent:                  { bg: "#FFEDD5", color: "#EA580C", label: "Offer Sent"         },
  offer_accepted:              { bg: "#DCFCE7", color: "#16A34A", label: "Offer Accepted"     },
  waiting_for_bidder_response: { bg: "#F1F5F9", color: "#64748B", label: "Waiting for Bidder" },
  active:                      { bg: "#DCFCE7", color: "#16A34A", label: "Active"             },
  submitted:                   { bg: "#DBEAFE", color: "#2563EB", label: "Submitted"          },
};

const getBadge = (s: string) =>
  STATUS_STYLE[s?.toLowerCase()] ?? { bg: "#F1F5F9", color: "#64748B", label: s ?? "—" };

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : "—";

/* ─── profile batch fetch ────────────────────────────────────── */
async function fetchProfileMap(ids: string[]): Promise<Map<string, DBProfile>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, image_url")
    .in("id", ids);
  if (error) { console.warn("profiles fetch error:", error); return new Map(); }
  return new Map(((data ?? []) as DBProfile[]).map((p) => [p.id, p]));
}

function profileName(p: DBProfile | undefined): string {
  if (!p) return "—";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
}

/* ─── tokens ─────────────────────────────────────────────────── */
const NAVY   = "#0F172A";
const SLATE  = "#64748B";
const BORDER = "#E2E8F0";
const BG     = "#F8FAFC";
const ORANGE = "#EA580C";
const ROWS   = 10;

/* ─── component ──────────────────────────────────────────────── */
export const CurrentJobsTab: React.FC<{ user: User }> = ({ user }) => {
  const [rows,     setRows]     = useState<JobRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [statusF,  setStatusF]  = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [page,     setPage]     = useState(1);

  const isClient = (user.user_type_names ?? [])
    .some((t) => t.toLowerCase() === "hire talent");
  /* ── fetch ──────────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    setPage(1);

    const load = async () => {
      if (isClient) {
        /* Client: fetch jobs posted by this user */
      

        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select("id, title, budget, status, posted_at, applicants")
          .eq("posted_by_user_id", user.id)
          .order("posted_at", { ascending: false });

        console.log("Client jobs result:", { jobsData, jobsError });

        if (jobsError) { console.error("jobs error:", jobsError); setLoading(false); return; }

        const jobs = jobsData ?? [];

        setRows(jobs.map((j: any): JobRow => ({
          id:           j.id,
          title:        j.title ?? "—",
          amount:       j.budget ?? null,
          status:       j.status ?? "pending",
          date:         j.posted_at ?? null,
          personName:   j.applicants != null
            ? `${j.applicants} applicant${j.applicants !== 1 ? "s" : ""}`
            : "—",
          personAvatar: null,
          isHourly:     false,
        })));

      } else {
        /* Freelancer: bids already have job_title and client_id — no joins needed */
       

        const { data: bidsData, error: bidsError } = await supabase
          .from("bids")
          .select("id, job_id, job_title, price, status, submitted_at, is_hourly, client_id")
          .eq("user_id", user.id)
          .order("submitted_at", { ascending: false });

        
        if (bidsError) { console.error("bids error:", bidsError); setLoading(false); return; }

        const bids = bidsData ?? [];
        if (bids.length === 0) { setRows([]); setLoading(false); return; }

        /* batch fetch client profiles using client_id already on bids */
        const clientIds = Array.from(
          new Set(bids.map((b: any) => b.client_id).filter(Boolean) as string[])
        );
       
        const profileMap = await fetchProfileMap(clientIds);
       

        const mappedRows = bids.map((b: any): JobRow => {
          const p = profileMap.get(b.client_id);
          return {
            id:           b.id,
            title:        b.job_title ?? "—",
            amount:       b.price != null ? parseFloat(b.price) : null,
            status:       b.status ?? "pending",
            date:         b.submitted_at ?? null,
            personName:   profileName(p),
            personAvatar: p?.image_url ?? null,
            isHourly:     b.is_hourly === true,
          };
        });
        setRows(mappedRows);
      }

      setLoading(false);
    };

    load();
  }, [user.id, isClient]);

  /* ── filter ─────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.personName.toLowerCase().includes(q)
      );
    }
    if (statusF !== "all") list = list.filter((r) => r.status.toLowerCase() === statusF);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((r) => r.date && new Date(r.date).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      list = list.filter((r) => r.date && new Date(r.date).getTime() <= to);
    }
    return list;
  }, [rows, search, statusF, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS));
  const paginated  = filtered.slice((page - 1) * ROWS, page * ROWS);
  const statusOpts = Array.from(new Set(rows.map((r) => r.status))).sort();

  const pageNums = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3)              return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [page-2, page-1, page, page+1, page+2];
  })();

  /* ── styles ─────────────────────────────────────────────────── */
  const th: React.CSSProperties = {
    padding: "12px 16px", textAlign: "left", fontSize: 13,
    fontWeight: 600, color: SLATE, borderBottom: `1px solid ${BORDER}`,
    whiteSpace: "nowrap", background: BG,
  };
  const td: React.CSSProperties = {
    padding: "14px 16px", fontSize: 14, color: NAVY,
    borderBottom: "1px solid #F1F5F9", verticalAlign: "middle",
  };

  /* ── loading ─────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ padding: "48px 0", textAlign: "center", color: SLATE, fontSize: 14 }}>
      <div style={{
        width: 28, height: 28,
        border: `3px solid ${BORDER}`, borderTop: `3px solid ${ORANGE}`,
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
        margin: "0 auto 12px",
      }} />
      Loading jobs…
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

        {/* search */}
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5" />
            <path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search jobs…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "9px 12px 9px 34px",
              border: `1px solid ${BORDER}`, borderRadius: 10,
              fontSize: 13, outline: "none", fontFamily: "inherit",
            }}
          />
        </div>

        {/* status filter */}
        <select
          value={statusF}
          onChange={(e) => { setStatusF(e.target.value); setPage(1); }}
          style={{
            padding: "9px 14px", border: `1px solid ${BORDER}`, borderRadius: 10,
            fontSize: 13, outline: "none", color: NAVY,
            background: "#fff", fontFamily: "inherit", minWidth: 140,
          }}
        >
          <option value="all">All Statuses</option>
          {statusOpts.map((s) => (
            <option key={s} value={s}>{getBadge(s).label}</option>
          ))}
        </select>

        {/* date range */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          border: `1px solid ${BORDER}`, borderRadius: 10,
          padding: "6px 12px", background: "#fff",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="12" rx="2" stroke="#94A3B8" strokeWidth="1.4" />
            <path d="M1 7h14M5 1v4M11 1v4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input type="date" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            style={{ border: "none", outline: "none", fontSize: 12, color: SLATE, fontFamily: "inherit", background: "transparent" }}
          />
          <span style={{ color: "#CBD5E1" }}>–</span>
          <input type="date" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            style={{ border: "none", outline: "none", fontSize: 12, color: SLATE, fontFamily: "inherit", background: "transparent" }}
          />
        </div>
      </div>

      {/* table */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 56 }}>Sr. No.</th>
                <th style={th}>Job Title</th>
                <th style={th}>{isClient ? "Applicants" : "Client Name"}</th>
                <th style={th}>{isClient ? "Budget" : "Bid Amount"}</th>
                <th style={th}>Status</th>
                <th style={th}>{isClient ? "Posted Date" : "Date Applied"}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...td, textAlign: "center", color: "#94A3B8", padding: "48px 0" }}>
                    {rows.length === 0 ? "No jobs found" : "No results match your filters"}
                  </td>
                </tr>
              ) : paginated.map((r, idx) => {
                const b = getBadge(r.status);
                return (
                  <tr
                    key={r.id}
                    onMouseEnter={(e) => e.currentTarget.style.background = BG}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                    style={{ transition: "background 0.1s" }}
                  >
                    <td style={{ ...td, color: "#94A3B8", fontSize: 13 }}>
                      {String((page - 1) * ROWS + idx + 1).padStart(2, "0")}
                    </td>
                    <td style={{ ...td, fontWeight: 500, maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.title}
                    </td>
                    <td style={td}>
                      {isClient ? (
                        <span style={{ fontSize: 13, color: SLATE }}>{r.personName}</span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar src={r.personAvatar} name={r.personName} size={32} />
                          <span>{r.personName}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, fontWeight: 600 }}>
                      {r.amount != null
                        ? `Ksh ${Number(r.amount).toFixed(2)}${r.isHourly ? "/hr" : ""}`
                        : "—"}
                    </td>
                    <td style={td}>
                      <span style={{
                        padding: "4px 12px", borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        background: b.bg, color: b.color,
                        whiteSpace: "nowrap", display: "inline-block",
                      }}>
                        {b.label}
                      </span>
                    </td>
                    <td style={{ ...td, color: SLATE, whiteSpace: "nowrap" }}>
                      {fmt(r.date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: "14px 20px", borderTop: "1px solid #F1F5F9",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 10,
          }}>
            <span style={{ fontSize: 13, color: SLATE }}>
              Page {page} of {totalPages} — {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PBtn label="← Previous" disabled={page === 1}        onClick={() => setPage((p) => p - 1)} />
              {pageNums[0] > 1 && (
                <><PBtn label="1" onClick={() => setPage(1)} />
                {pageNums[0] > 2 && <Dot />}</>
              )}
              {pageNums.map((n) => (
                <PBtn key={n} label={String(n)} active={n === page} onClick={() => setPage(n)} />
              ))}
              {pageNums[pageNums.length - 1] < totalPages && (
                <>{pageNums[pageNums.length - 1] < totalPages - 1 && <Dot />}
                <PBtn label={String(totalPages)} onClick={() => setPage(totalPages)} /></>
              )}
              <PBtn label="Next →" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── pagination button ──────────────────────────────────────── */
const PBtn: React.FC<{
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, active, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "6px 12px", borderRadius: 8,
      border: `1px solid ${active ? NAVY : BORDER}`,
      background: active ? NAVY : "#fff",
      color: active ? "#fff" : disabled ? "#CBD5E1" : NAVY,
      fontSize: 13, fontWeight: active ? 700 : 500,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit",
    }}
  >
    {label}
  </button>
);

const Dot = () => <span style={{ color: "#CBD5E1", padding: "0 4px" }}>…</span>;