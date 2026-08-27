import React, { useEffect, useState } from "react";
import {
  fetchTransactionsPage,
  fetchTransactionsForExport,
  fetchTransactionsSummary,
  fetchTransactionTypes,
} from "../api/financialService";
import { WalletTransaction } from "../types";
import { exportCsv } from "../utils/exportCsv";
import { exportPdf } from "../utils/exportPdf";
import { Avatar } from "../../shared/Avatar";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { useServerTable } from "../hooks/useServerTable";
import {
  BG,
  DateRangeInput,
  EmptyState,
  ExBtn,
  FilterSelect,
  MobileCardList,
  MUTED,
  NAVY,
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
  fmtDate,
  td,
  th,
} from "./shared";

const TX_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  deposit: { label: "Deposit", color: "#16A34A", bg: "#DCFCE7" },
  withdrawal: { label: "Withdrawal", color: "#DC2626", bg: "#FEE2E2" },
  escrow_lock: { label: "Escrow Lock", color: "#CA8A04", bg: "#FEF9C3" },
  escrow_release: { label: "Escrow Release", color: "#16A34A", bg: "#DCFCE7" },
  escrow_refund: { label: "Escrow Refund", color: "#2563EB", bg: "#DBEAFE" },
  milestone_payment: { label: "Milestone", color: "#16A34A", bg: "#DCFCE7" },
  platform_fee: { label: "Platform Fee", color: "#DC2626", bg: "#FEE2E2" },
};
const txS = (t: string) =>
  TX_STYLE[t] ?? { label: t.replace(/_/g, " "), color: SLATE, bg: BG };

const stS = (s: string) =>
  ({
    completed: { color: "#16A34A", bg: "#DCFCE7" },
    pending: { color: "#CA8A04", bg: "#FEF9C3" },
    failed: { color: "#DC2626", bg: "#FEE2E2" },
  })[s] ?? { color: SLATE, bg: BG };

// money coming INTO the platform is a credit — escrow_lock (client funds
// locked) and platform_fee count as money in; withdrawals/refunds are debits
const CREDIT_TYPES = [
  "deposit",
  "escrow_lock",
  "escrow_release",
  "milestone_payment",
  "platform_fee",
];
const isCredit = (t: string) => CREDIT_TYPES.includes(t);

const EXPORT_HEADERS = [
  "Sr.No.",
  "Reference",
  "Type",
  "Date",
  "User",
  "Job",
  "Amount",
  "Status",
];

const toExportRows = (list: WalletTransaction[]) =>
  list.map((r, i) => [
    i + 1,
    r.reference ?? r.id.slice(0, 8),
    txS(r.type).label,
    fmtDate(r.createdAt),
    r.userName,
    r.jobTitle ?? "—",
    isCredit(r.type) ? `+${r.amount}` : `-${r.amount}`,
    r.status,
  ]);

export const TransactionsTable: React.FC = () => {
  const isMobile = useIsMobile();
  const t = useServerTable<WalletTransaction>(fetchTransactionsPage, {
    defaultSort: "created_at",
  });

  const [typeOpts, setTypeOpts] = useState<string[]>([]);
  const [summary, setSummary] = useState({ credits: 0, debits: 0, pending: 0 });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchTransactionTypes().then(setTypeOpts);
  }, []);

  // The totals answer "what is in this filter", not "what is on this page", so
  // they follow the filters and ignore paging and sorting.
  const filterKey = JSON.stringify({
    search: t.params.search,
    status: t.status,
    type: t.type,
    dateFrom: t.dateFrom,
    dateTo: t.dateTo,
  });
  useEffect(() => {
    let live = true;
    fetchTransactionsSummary({
      ...(JSON.parse(filterKey) as any),
      page: 1,
      pageSize: 1,
    }).then((s) => {
      if (live) setSummary(s);
    });
    return () => {
      live = false;
    };
  }, [filterKey]);

  const runExport = async (kind: "csv" | "pdf") => {
    setExporting(true);
    try {
      const all = await fetchTransactionsForExport(t.params);
      const rows = toExportRows(all);
      if (kind === "csv") exportCsv("transactions", EXPORT_HEADERS, rows);
      else exportPdf("Transaction History", EXPORT_HEADERS, rows);
    } finally {
      setExporting(false);
    }
  };

  const COLS = 8;

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
          label="Money in"
          value={fmtAmt(summary.credits)}
          tone="positive"
          hint="Deposits, escrow and fees"
        />
        <StatCard
          label="Money out"
          value={fmtAmt(summary.debits)}
          tone="danger"
          hint="Withdrawals and refunds"
        />
        <StatCard
          label="Pending"
          value={fmtAmt(summary.pending)}
          tone="warning"
          hint="Not yet settled"
        />
        <StatCard
          label="Transactions"
          value={t.total.toLocaleString("en-US")}
          hint="Matching current filters"
        />
      </StatCardRow>

      <Toolbar
        isMobile={isMobile}
        filters={
          <>
            <SearchInput
              value={t.search}
              onChange={t.setSearch}
              placeholder="Search reference, user, description…"
              isMobile={isMobile}
            />
            <FilterSelect
              value={t.type}
              onChange={t.setType}
              isMobile={isMobile}
              minWidth={160}
            >
              <option value="all">All Types</option>
              {typeOpts.map((o) => (
                <option key={o} value={o}>
                  {txS(o).label}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={t.status}
              onChange={t.setStatus}
              isMobile={isMobile}
              minWidth={130}
            >
              <option value="all">All Statuses</option>
              {["completed", "pending", "failed"].map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
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
              <EmptyState message="No transactions found" />
            ) : (
              t.rows.map((r) => {
                const ts = txS(r.type);
                const ss = stS(r.status);
                const credit = isCredit(r.type);
                return (
                  <RowCard
                    key={r.id}
                    lead={
                      <>
                        <div
                          style={{
                            fontSize: 11,
                            color: MUTED,
                            fontFamily: "monospace",
                          }}
                        >
                          {r.reference ?? r.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <StatusPill
                            label={ts.label}
                            color={ts.color}
                            bg={ts.bg}
                          />
                        </div>
                      </>
                    }
                    trail={
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: credit ? "#16A34A" : "#DC2626",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {credit ? "+" : "-"}
                        {r.amount.toFixed(2)}
                      </div>
                    }
                    person={
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 10 }}
                      >
                        <Avatar src={r.userAvatar} name={r.userName} size={30} />
                        <span style={{ fontSize: 13, color: NAVY }}>
                          {r.userName}
                        </span>
                      </div>
                    }
                    details={[
                      { label: "Project", value: r.jobTitle ?? r.description ?? "—" },
                      { label: "Date", value: fmtDate(r.createdAt) },
                    ]}
                    footer={
                      <StatusPill label={r.status} color={ss.color} bg={ss.bg} />
                    }
                  />
                );
              })
            )}
          </MobileCardList>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}
            >
              <thead>
                <tr>
                  <th style={{ ...th, width: 56 }}>Sr. No.</th>
                  <SortTh
                    label="Reference"
                    col="reference"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <SortTh
                    label="Type"
                    col="type"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <SortTh
                    label="Date"
                    col="created_at"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <th style={th}>User</th>
                  <th style={th}>Project</th>
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
                </tr>
              </thead>
              <tbody>
                {t.loading ? (
                  <SkeletonRows cols={COLS} />
                ) : t.rows.length === 0 ? (
                  <EmptyState message="No transactions found" colSpan={COLS} />
                ) : (
                  t.rows.map((r, idx) => {
                    const ts = txS(r.type);
                    const ss = stS(r.status);
                    const credit = isCredit(r.type);
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
                        <td style={{ ...td, color: MUTED, fontSize: 13 }}>
                          {String(
                            (t.page - 1) * t.pageSize + idx + 1,
                          ).padStart(2, "0")}
                        </td>
                        <td
                          style={{
                            ...td,
                            fontSize: 12,
                            color: SLATE,
                            fontFamily: "monospace",
                          }}
                        >
                          {r.reference ?? r.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td style={td}>
                          <StatusPill label={ts.label} color={ts.color} bg={ts.bg} />
                        </td>
                        <td style={{ ...td, color: SLATE, whiteSpace: "nowrap" }}>
                          {fmtDate(r.createdAt)}
                        </td>
                        <td style={td}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <Avatar
                              src={r.userAvatar}
                              name={r.userName}
                              size={30}
                            />
                            <span style={{ fontSize: 13 }}>{r.userName}</span>
                          </div>
                        </td>
                        <td
                          style={{
                            ...td,
                            maxWidth: 160,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {r.jobTitle ?? r.description ?? (
                            <span style={{ color: "#CBD5E1" }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            ...td,
                            fontWeight: 700,
                            color: credit ? "#16A34A" : "#DC2626",
                          }}
                        >
                          {credit ? "+" : "-"}
                          {r.amount.toFixed(2)}
                        </td>
                        <td style={td}>
                          <StatusPill
                            label={r.status}
                            color={ss.color}
                            bg={ss.bg}
                          />
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

export default TransactionsTable;
