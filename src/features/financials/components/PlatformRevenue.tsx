import React, { lazy, useEffect, useMemo, useState } from "react";
import {
  RevenueRow,
  fetchRevenuePage,
  fetchRevenueForExport,
  fetchRevenueTotal,
  fetchRevenueTrend,
} from "../api/financialService";
import { exportCsv } from "../utils/exportCsv";
import { exportPdf } from "../utils/exportPdf";
import { Avatar } from "../../shared/Avatar";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { useServerTable } from "../hooks/useServerTable";
import { LazyChart } from "../../../components/LazyBoundary";
import {
  BG,
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

/* Several transaction types are the same thing to an accountant. The label is
 * what the filter offers; the types behind it are what the query asks for. */
const REVENUE_SOURCE: Record<string, string> = {
  platform_fee: "Service Fee",
  deposit: "Connects Sale",
  escrow_release: "Service Fee",
  milestone_payment: "Service Fee",
  escrow_lock: "Escrow Hold",
  withdrawal: "Withdrawal",
  escrow_refund: "Refund",
};
const revSource = (t: string) => REVENUE_SOURCE[t] ?? t.replace(/_/g, " ");

const SOURCE_LABELS = Array.from(new Set(Object.values(REVENUE_SOURCE))).sort();
const typesForSource = (label: string): string[] | null =>
  label === "all"
    ? null
    : Object.entries(REVENUE_SOURCE)
        .filter(([, v]) => v === label)
        .map(([k]) => k);

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  completed: { color: "#16A34A", bg: "#DCFCE7" },
  pending: { color: "#CA8A04", bg: "#FEF9C3" },
  failed: { color: "#DC2626", bg: "#FEE2E2" },
};
const stStyle = (s: string) => STATUS_STYLE[s] ?? { color: SLATE, bg: BG };

/* The trend chart is its own chunk — it is the only thing on this tab that
 * needs recharts, so the table and totals no longer wait for it. */
const RevenueTrendChart = lazy(() => import("./RevenueTrendChart"));
type TrendEvent = { ts: string; type: string; amount: number };

const EXPORT_HEADERS = [
  "Sr.No.",
  "Transaction Id",
  "Date & Time",
  "Revenue Source",
  "Amount",
  "User",
  "Description",
  "Status",
];

const toExportRows = (list: RevenueRow[]) =>
  list.map((r, i) => [
    i + 1,
    r.reference,
    fmtDateTime(r.createdAt),
    revSource(r.type),
    fmtAmt(r.amount),
    r.userName,
    r.description ?? "—",
    r.status,
  ]);

export const PlatformRevenue: React.FC = () => {
  const isMobile = useIsMobile();
  const [source, setSource] = useState("all");
  const [trend, setTrend] = useState<TrendEvent[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const sourceTypes = useMemo(() => typesForSource(source), [source]);

  // Recreated only when the source filter changes, so the table hook isn't
  // told its query changed on every render.
  const fetcher = useMemo(
    () => (p: any) => fetchRevenuePage({ ...p, sourceTypes }),
    [sourceTypes],
  );

  const t = useServerTable<RevenueRow>(fetcher, { defaultSort: "created_at" });

  useEffect(() => {
    fetchRevenueTrend()
      .then(setTrend)
      .finally(() => setTrendLoading(false));
  }, []);

  const filterKey = JSON.stringify({
    search: t.params.search,
    status: t.status,
    dateFrom: t.dateFrom,
    dateTo: t.dateTo,
    sourceTypes,
  });
  useEffect(() => {
    let live = true;
    fetchRevenueTotal({
      ...(JSON.parse(filterKey) as any),
      page: 1,
      pageSize: 1,
    }).then((v) => {
      if (live) setTotalRevenue(v);
    });
    return () => {
      live = false;
    };
  }, [filterKey]);

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
      const all = await fetchRevenueForExport({ ...t.params, sourceTypes });
      const rows = toExportRows(all);
      if (kind === "csv") exportCsv("platform_revenue", EXPORT_HEADERS, rows);
      else exportPdf("Weera Platform Revenue Report", EXPORT_HEADERS, rows);
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
      <LazyChart height={280}>
        <RevenueTrendChart rows={trend} loading={trendLoading} />
      </LazyChart>

      <StatCardRow>
        <StatCard
          label="Total revenue"
          value={fmtAmt(totalRevenue)}
          tone="positive"
          hint="Matching current filters"
        />
        <StatCard
          label="Transactions"
          value={t.total.toLocaleString("en-US")}
          hint="Matching current filters"
        />
        <StatCard
          label="Source"
          value={source === "all" ? "All sources" : source}
          hint={
            t.dateFrom || t.dateTo
              ? `${t.dateFrom || "—"} → ${t.dateTo || "—"}`
              : "All dates"
          }
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
            <FilterSelect
              value={source}
              onChange={setSource}
              isMobile={isMobile}
              minWidth={160}
            >
              <option value="all">All Sources</option>
              {SOURCE_LABELS.map((s) => (
                <option key={s} value={s}>
                  {s}
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
              <EmptyState message="No revenue data found" />
            ) : (
              t.rows.map((r) => {
                const ss = stStyle(r.status);
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
                          style={{
                            marginTop: 3,
                            cursor: "pointer",
                            accentColor: ORANGE,
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: MUTED,
                              fontFamily: "monospace",
                            }}
                          >
                            {r.reference}
                          </div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: NAVY,
                              marginTop: 2,
                            }}
                          >
                            {fmtAmt(r.amount)}
                          </div>
                        </div>
                      </div>
                    }
                    trail={
                      <StatusPill label={r.status} color={ss.color} bg={ss.bg} />
                    }
                    person={
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar src={r.userAvatar} name={r.userName} size={30} />
                        <span style={{ fontSize: 13, color: NAVY }}>{r.userName}</span>
                      </div>
                    }
                    details={[
                      { label: "Source", value: revSource(r.type) },
                      { label: "Date", value: fmtDateTime(r.createdAt) },
                    ]}
                    note={
                      <div>
                        <div
                          style={{
                            color: MUTED,
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                          }}
                        >
                          Description
                        </div>
                        <div style={{ color: "#475569", fontSize: 13 }}>
                          {r.description ?? "Fee on completed project"}
                        </div>
                      </div>
                    }
                  />
                );
              })
            )}
          </MobileCardList>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}
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
                  <SortTh
                    label="Transaction Id"
                    col="reference"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <SortTh
                    label="Date & Time"
                    col="created_at"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <SortTh
                    label="Revenue Source"
                    col="type"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <SortTh
                    label="Amount"
                    col="amount"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <th style={th}>User</th>
                  <th style={th}>Description</th>
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
                  <EmptyState message="No revenue data found" colSpan={COLS} />
                ) : (
                  t.rows.map((r, idx) => {
                    const ss = stStyle(r.status);
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
                            fontSize: 12,
                            color: SLATE,
                            fontFamily: "monospace",
                          }}
                        >
                          {r.reference}
                        </td>
                        <td
                          style={{
                            ...td,
                            color: SLATE,
                            whiteSpace: "nowrap",
                            fontSize: 13,
                          }}
                        >
                          {fmtDateTime(r.createdAt)}
                        </td>
                        <td style={{ ...td, fontWeight: 500 }}>{revSource(r.type)}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{fmtAmt(r.amount)}</td>
                        <td style={td}>
                          <div
                            style={{ display: "flex", alignItems: "center", gap: 10 }}
                          >
                            <Avatar src={r.userAvatar} name={r.userName} size={30} />
                            <span style={{ fontSize: 13 }}>{r.userName}</span>
                          </div>
                        </td>
                        <td
                          style={{
                            ...td,
                            color: SLATE,
                            maxWidth: 200,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontSize: 13,
                          }}
                        >
                          {r.description ?? "Fee on completed project"}
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

export default PlatformRevenue;
