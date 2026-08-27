import React, { useEffect, useState } from "react";
import {
  fetchEscrowPage,
  fetchEscrowForExport,
  fetchEscrowStatuses,
  fetchEscrowSummary,
} from "../api/financialService";
import { EscrowTransaction } from "../types";
import { exportCsv } from "../utils/exportCsv";
import { exportPdf } from "../utils/exportPdf";
import { Avatar } from "../../shared/Avatar";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { useServerTable } from "../hooks/useServerTable";
import {
  BG,
  BORDER,
  DateRangeInput,
  EmptyState,
  ExBtn,
  FilterSelect,
  MobileCardList,
  MUTED,
  NAVY,
  ORANGE,
  Pagination,
  RowCard,
  SearchInput,
  SkeletonCards,
  SkeletonRows,
  SLATE,
  SortTh,
  StatCard,
  StatCardRow,
  StatusPill,
  TableCard,
  Toolbar,
  fmtAmt,
  fmtDateTime,
  td,
  th,
} from "./shared";

const ESC_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  held: { label: "Pending", color: "#CA8A04", bg: "#FEF9C3" },
  released: { label: "Completed", color: "#16A34A", bg: "#DCFCE7" },
  refunded: { label: "Refunded", color: "#2563EB", bg: "#DBEAFE" },
  disputed: { label: "Disputed", color: "#DC2626", bg: "#FEE2E2" },
  cancelled: { label: "Cancelled", color: "#DC2626", bg: "#FEE2E2" },
};
const escS = (s: string) =>
  ESC_STYLE[s.toLowerCase()] ?? { label: s, color: SLATE, bg: BG };

const EXPORT_HEADERS = [
  "Sr.No.",
  "Project",
  "Client",
  "Bidder",
  "Amount",
  "Service Fee",
  "Total",
  "Status",
  "Created",
  "Released",
];

const toExportRows = (list: EscrowTransaction[]) =>
  list.map((r, i) => [
    i + 1,
    r.jobTitle ?? "—",
    r.clientName,
    r.bidderName,
    fmtAmt(r.amount),
    fmtAmt(r.serviceFee),
    fmtAmt(r.totalCharged),
    escS(r.status).label,
    fmtDateTime(r.createdAt),
    r.releasedAt ? fmtDateTime(r.releasedAt) : "—",
  ]);

export const EscrowManagement: React.FC = () => {
  const isMobile = useIsMobile();
  const t = useServerTable<EscrowTransaction>(fetchEscrowPage, {
    defaultSort: "created_at",
  });

  const [statusOpts, setStatusOpts] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    released: 0,
    held: 0,
    refunded: 0,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchEscrowStatuses().then(setStatusOpts);
    fetchEscrowSummary().then(setSummary);
  }, []);

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const allSelected =
    t.rows.length > 0 && t.rows.every((r) => selectedIds.has(r.id));

  const runExport = async (kind: "csv" | "pdf") => {
    setExporting(true);
    try {
      const all = await fetchEscrowForExport(t.params);
      const rows = toExportRows(all);
      if (kind === "csv") exportCsv("escrow_transactions", EXPORT_HEADERS, rows);
      else exportPdf("Escrow Management", EXPORT_HEADERS, rows);
    } finally {
      setExporting(false);
    }
  };

  const COLS = 9;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "'Inter','Helvetica Neue',sans-serif",
      }}
    >
      <StatCardRow>
        <StatCard
          label="Total escrow"
          value={fmtAmt(summary.total)}
          hint="Last 12 months"
        />
        <StatCard
          label="Held"
          value={fmtAmt(summary.held)}
          tone="warning"
          hint="Awaiting release"
        />
        <StatCard
          label="Released"
          value={fmtAmt(summary.released)}
          tone="positive"
          hint="Paid to freelancers"
        />
        <StatCard
          label="Refunded"
          value={fmtAmt(summary.refunded)}
          tone="info"
          hint="Returned to clients"
        />
      </StatCardRow>

      <Toolbar
        isMobile={isMobile}
        filters={
          <>
            <SearchInput
              value={t.search}
              onChange={t.setSearch}
              placeholder="Search client, bidder, project…"
              isMobile={isMobile}
            />
            <FilterSelect
              value={t.status}
              onChange={t.setStatus}
              isMobile={isMobile}
              minWidth={130}
            >
              <option value="all">All Statuses</option>
              {statusOpts.map((s) => (
                <option key={s} value={s}>
                  {escS(s).label}
                </option>
              ))}
            </FilterSelect>
            <DateRangeInput
              from={t.dateFrom}
              to={t.dateTo}
              onFrom={t.setDateFrom}
              onTo={t.setDateTo}
              isMobile={isMobile}
            />
          </>
        }
        actions={
          <>
            <ExBtn
              label={exporting ? "Preparing…" : "CSV"}
              disabled={exporting}
              onClick={() => runExport("csv")}
            />
            <ExBtn
              label="PDF"
              disabled={exporting}
              onClick={() => runExport("pdf")}
            />
          </>
        }
      />

      <TableCard>
        {isMobile ? (
          <MobileCardList>
            {t.loading ? (
              <SkeletonCards />
            ) : t.rows.length === 0 ? (
              <EmptyState message="No escrow transactions found" />
            ) : (
              t.rows.map((r) => {
                const ss = escS(r.status);
                return (
                  <RowCard
                    key={r.id}
                    highlighted={selectedIds.has(r.id)}
                    lead={
                      <div
                        style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleOne(r.id)}
                          style={{ marginTop: 3, cursor: "pointer", accentColor: ORANGE }}
                        />
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: NAVY,
                            lineHeight: 1.3,
                          }}
                        >
                          {r.jobTitle ?? (
                            <span style={{ color: "#CBD5E1" }}>Untitled project</span>
                          )}
                        </div>
                      </div>
                    }
                    trail={
                      <StatusPill label={ss.label} color={ss.color} bg={ss.bg} />
                    }
                    person={
                      <div
                        style={{ display: "flex", flexDirection: "column", gap: 8 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontSize: 11,
                              color: MUTED,
                              textTransform: "uppercase",
                              width: 50,
                            }}
                          >
                            Client
                          </span>
                          <Avatar src={r.clientAvatar} name={r.clientName} size={26} />
                          <span style={{ fontSize: 13, color: NAVY }}>
                            {r.clientName}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontSize: 11,
                              color: MUTED,
                              textTransform: "uppercase",
                              width: 50,
                            }}
                          >
                            Bidder
                          </span>
                          <Avatar src={r.bidderAvatar} name={r.bidderName} size={26} />
                          <span style={{ fontSize: 13, color: NAVY }}>
                            {r.bidderName}
                          </span>
                        </div>
                      </div>
                    }
                    details={[
                      {
                        label: "Amount",
                        value: (
                          <span style={{ fontWeight: 700 }}>{fmtAmt(r.amount)}</span>
                        ),
                      },
                      {
                        label: "Updated",
                        value: fmtDateTime(r.releasedAt ?? r.createdAt),
                      },
                    ]}
                  />
                );
              })
            )}
          </MobileCardList>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}
            >
              <thead>
                <tr>
                  <th style={{ ...th, width: 48 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() =>
                        setSelectedIds(() =>
                          allSelected ? new Set() : new Set(t.rows.map((r) => r.id)),
                        )
                      }
                      style={{ accentColor: ORANGE }}
                    />
                  </th>
                  <th style={{ ...th, width: 56 }}>Sr. No.</th>
                  <th style={th}>Project Title</th>
                  <th style={th}>Client</th>
                  <th style={th}>Bidder</th>
                  <SortTh
                    label="Amount"
                    col="amount"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <SortTh
                    label="Status"
                    col="status"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <SortTh
                    label="Created"
                    col="created_at"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <th style={{ ...th, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {t.loading ? (
                  <SkeletonRows cols={COLS} />
                ) : t.rows.length === 0 ? (
                  <EmptyState
                    message="No escrow transactions found"
                    colSpan={COLS}
                  />
                ) : (
                  t.rows.map((r, idx) => {
                    const ss = escS(r.status);
                    return (
                      <tr
                        key={r.id}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = BG;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#fff";
                        }}
                        style={{ transition: "background 0.1s" }}
                      >
                        <td style={td}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleOne(r.id)}
                            style={{ accentColor: ORANGE }}
                          />
                        </td>
                        <td style={{ ...td, color: MUTED, fontSize: 13 }}>
                          {String((t.page - 1) * t.pageSize + idx + 1).padStart(
                            2,
                            "0",
                          )}
                        </td>
                        <td
                          style={{
                            ...td,
                            maxWidth: 180,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontWeight: 500,
                          }}
                        >
                          {r.jobTitle ?? <span style={{ color: "#CBD5E1" }}>—</span>}
                        </td>
                        <td style={td}>
                          <div
                            style={{ display: "flex", alignItems: "center", gap: 8 }}
                          >
                            <Avatar
                              src={r.clientAvatar}
                              name={r.clientName}
                              size={30}
                            />
                            <span style={{ fontSize: 13 }}>{r.clientName}</span>
                          </div>
                        </td>
                        <td style={td}>
                          <div
                            style={{ display: "flex", alignItems: "center", gap: 8 }}
                          >
                            <Avatar
                              src={r.bidderAvatar}
                              name={r.bidderName}
                              size={30}
                            />
                            <span style={{ fontSize: 13 }}>{r.bidderName}</span>
                          </div>
                        </td>
                        <td style={{ ...td, fontWeight: 700 }}>
                          {fmtAmt(r.amount)}
                        </td>
                        <td style={td}>
                          <StatusPill
                            label={ss.label}
                            color={ss.color}
                            bg={ss.bg}
                          />
                        </td>
                        <td
                          style={{
                            ...td,
                            color: SLATE,
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                        >
                          {fmtDateTime(r.releasedAt ?? r.createdAt)}
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <button
                            aria-label="Row actions"
                            style={{
                              width: 28,
                              height: 28,
                              border: `1px solid ${BORDER}`,
                              borderRadius: 6,
                              background: "#fff",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="3" r="1" fill={SLATE} />
                              <circle cx="7" cy="7" r="1" fill={SLATE} />
                              <circle cx="7" cy="11" r="1" fill={SLATE} />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={t.page}
          pageSize={t.pageSize}
          totalItems={t.total}
          onPage={t.setPage}
          onPageSize={t.setPageSize}
          busy={t.refreshing}
        />
      </TableCard>
    </div>
  );
};

export default EscrowManagement;
