import React, { useCallback, useEffect, useState } from "react";
import {
  fetchWithdrawalQueuePage,
  fetchWithdrawalsForExport,
  fetchWithdrawalSummary,
  dispatchWithdrawalNow,
  retryWithdrawal,
} from "../api/financialService";
import { WithdrawalRequest, WithdrawalStatus } from "../types";
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
  GREEN,
  MobileCardList,
  MUTED,
  NAVY,
  ORANGE,
  Pagination,
  RED,
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

// Mirrors withdrawal_requests' status CHECK constraint: queued → processing
// → dispatched → completed, or failed / cancelled off that path.
const WD_STYLE: Record<WithdrawalStatus, { label: string; color: string; bg: string }> =
  {
    queued: { label: "Queued", color: "#CA8A04", bg: "#FEF9C3" },
    processing: { label: "Processing", color: "#2563EB", bg: "#DBEAFE" },
    dispatched: { label: "Dispatched", color: "#7C3AED", bg: "#EDE9FE" },
    completed: { label: "Completed", color: "#16A34A", bg: "#DCFCE7" },
    failed: { label: "Failed", color: "#DC2626", bg: "#FEE2E2" },
    cancelled: { label: "Cancelled", color: "#64748B", bg: "#F1F5F9" },
  };
const wdS = (s: string) =>
  WD_STYLE[s as WithdrawalStatus] ?? { label: s, color: SLATE, bg: BG };

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// hours_until_due is a float from the view (extract(epoch from ...)/3600).
// Negative means it's past due and just waiting for the worker's next pass.
function dueLabel(
  status: WithdrawalStatus,
  hours: number,
  scheduledFor: string,
): string {
  if (status !== "queued" && status !== "processing") return fmtTime(scheduledFor);
  if (hours <= 0) return "Due now";
  if (hours < 1) return `In ${Math.round(hours * 60)}m`;
  if (hours < 24) return `In ${Math.round(hours)}h`;
  return `In ${Math.round(hours / 24)}d`;
}

/* ── Send-now action ───────────────────────────────────────────
   This runs the real dispatch, not a reschedule.

   admin_release_withdrawal_now only moves scheduled_for to now(), which does
   nothing at all to a row that is already overdue — and those are precisely
   the rows someone opens this tab to rescue. So it calls
   process-withdrawal-queue for this single request instead: same claim, same
   dispatch, same notifications the cron worker would have sent.

   'processing' deliberately gets no button. Such a row is either in a worker's
   hands this second or was stranded by one that died mid-dispatch, and nothing
   visible here distinguishes them. Re-sending the first pays twice; the second
   needs the IntaSend dashboard checked first. */
const ReleaseBtn: React.FC<{
  row: WithdrawalRequest;
  busy: boolean;
  onSend: (row: WithdrawalRequest) => void;
  onRetry: (row: WithdrawalRequest) => void;
}> = ({ row, busy, onSend, onRetry }) => {
  if (row.status === "processing") {
    return (
      <span style={{ fontSize: 12, color: SLATE, whiteSpace: "nowrap" }}>
        With the worker
      </span>
    );
  }

  // A failed request has already been reversed — the money is sitting in the
  // freelancer's balance right now. So this button does not re-send anything;
  // it asks the database to build a fresh withdrawal in its place.
  if (row.status === "failed") {
    if (row.alreadyRetried) {
      return (
        <span style={{ fontSize: 12, color: SLATE, whiteSpace: "nowrap" }}>
          Retried
        </span>
      );
    }
    return (
      <button
        disabled={busy}
        onClick={() => onRetry(row)}
        title="Create a new withdrawal to replace this failed one"
        style={{
          padding: "6px 12px",
          borderRadius: 8,
          border: `1px solid ${NAVY}`,
          background: busy ? "#F1F5F9" : "#fff",
          color: NAVY,
          fontSize: 12,
          fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        {busy ? "Retrying…" : "Retry"}
      </button>
    );
  }

  if (row.status !== "queued") {
    return <span style={{ color: "#CBD5E1", fontSize: 13 }}>—</span>;
  }

  // Due is the ordinary case and gets the solid button. Early is a real
  // decision — it spends float that has not cleared yet — so it stays an
  // outline and says so on the label rather than hiding behind one word.
  const due = row.hoursUntilDue <= 0;

  return (
    <button
      disabled={busy}
      onClick={() => onSend(row)}
      title={
        due
          ? "Dispatch this payout now"
          : "This money has not finished clearing with IntaSend yet"
      }
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        border: `1px solid ${ORANGE}`,
        background: busy ? "#FFF7ED" : due ? ORANGE : "#fff",
        color: busy ? ORANGE : due ? "#fff" : ORANGE,
        fontSize: 12,
        fontWeight: 700,
        cursor: busy ? "wait" : "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {busy ? "Sending…" : due ? "Send now" : "Send early"}
    </button>
  );
};

const EXPORT_HEADERS = [
  "Sr.No.",
  "Reference",
  "User",
  "Phone",
  "Gross",
  "Fee",
  "Net",
  "Status",
  "Scheduled For",
  "Requested",
];

const toExportRows = (list: WithdrawalRequest[]) =>
  list.map((r, i) => [
    i + 1,
    r.reference,
    r.userName,
    r.phoneNumber,
    r.amount,
    r.feeAmount,
    r.netAmount,
    wdS(r.status).label,
    fmtDate(r.scheduledFor),
    fmtDate(r.requestedAt),
  ]);

export const WithdrawalsTable: React.FC = () => {
  const isMobile = useIsMobile();
  const t = useServerTable<WithdrawalRequest>(fetchWithdrawalQueuePage, {
    defaultSort: "requested_at",
  });

  const [summary, setSummary] = useState({
    queued: { count: 0, amount: 0 },
    processing: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
  });
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const loadSummary = useCallback(() => {
    fetchWithdrawalSummary().then(setSummary);
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  const { reload } = t;
  const refreshAll = useCallback(() => {
    reload();
    loadSummary();
  }, [reload, loadSummary]);

  const handleSend = async (row: WithdrawalRequest) => {
    const due = row.hoursUntilDue <= 0;

    const prompt = due
      ? `Send ${fmtAmt(row.netAmount)} to ${row.userName} (${row.phoneNumber}) now?\n\n` +
        `Reference ${row.reference}. This dispatches the payout immediately.`
      : `${row.reference} has not finished clearing yet — it is due ${dueLabel(
          row.status,
          row.hoursUntilDue,
          row.scheduledFor,
        ).toLowerCase()}.\n\n` +
        `Sending ${fmtAmt(row.netAmount)} now pays it out of float that other ` +
        `users' cleared deposits are backing, and it may be refused by IntaSend. Continue?`;

    if (!window.confirm(prompt)) return;

    setSendingId(row.id);
    const result = await dispatchWithdrawalNow(row.id);
    setSendingId(null);

    if (result.ok) {
      setToast({
        ok: true,
        text: `${row.reference} sent — ${fmtAmt(row.netAmount)} on its way to ${row.phoneNumber}.`,
      });
    } else if (result.outcome === "requeued") {
      // Not a failure the admin caused, and the money is still held and still
      // scheduled. Say what the provider said and that it will retry itself.
      setToast({
        ok: false,
        text: `${row.reference} could not go out yet: ${result.reason ?? result.error}. It stays queued and the worker will retry.`,
      });
    } else if (result.outcome === "failed") {
      setToast({
        ok: false,
        text: `${row.reference} failed: ${result.reason ?? result.error}. The full amount is back in the user's balance and no fee was charged.`,
      });
    } else {
      setToast({ ok: false, text: result.error ?? "Could not send this withdrawal." });
    }

    // Reload either way — status, attempts and failure_reason have all moved.
    refreshAll();
  };

  const handleRetry = async (row: WithdrawalRequest) => {
    if (
      !window.confirm(
        `Retry ${row.reference} for ${row.userName}?\n\n` +
          `This does NOT re-send the old payout — that one was already reversed, ` +
          `and ${fmtAmt(row.amount)} is sitting in their balance right now. ` +
          `It creates a NEW withdrawal for the same amount, debits their balance ` +
          `again, and queues it.\n\n` +
          `If you are not certain the original never reached their phone, check ` +
          `IntaSend first.`,
      )
    )
      return;

    setRetryingId(row.id);
    const result = await retryWithdrawal(row.id);
    setRetryingId(null);

    if (result.ok) {
      setToast({
        ok: true,
        text: `Retry queued as ${result.reference} — it will dispatch on the next worker run.`,
      });
    } else {
      // These come straight from the RPC and are already written to be read by
      // a person: already retried, payout exists at the provider, balance no
      // longer covers it.
      setToast({ ok: false, text: result.error ?? "Could not retry this withdrawal." });
    }
    refreshAll();
  };

  const runExport = async (kind: "csv" | "pdf") => {
    setExporting(true);
    try {
      const all = await fetchWithdrawalsForExport(t.params);
      const rows = toExportRows(all);
      if (kind === "csv") exportCsv("pending-withdrawals", EXPORT_HEADERS, rows);
      else exportPdf("Pending Withdrawals", EXPORT_HEADERS, rows);
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
      {toast && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            background: toast.ok ? "#DCFCE7" : "#FEE2E2",
            color: toast.ok ? GREEN : RED,
          }}
        >
          {toast.text}
        </div>
      )}

      <StatCardRow>
        <StatCard
          label="Queued"
          value={summary.queued.count}
          tone="warning"
          hint={fmtAmt(summary.queued.amount)}
        />
        <StatCard
          label="Processing"
          value={summary.processing.count}
          tone="info"
          hint={fmtAmt(summary.processing.amount)}
        />
        <StatCard
          label="Failed"
          value={summary.failed.count}
          tone="danger"
          hint={fmtAmt(summary.failed.amount)}
        />
        <StatCard
          label="In this view"
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
              placeholder="Search reference, user, phone…"
              isMobile={isMobile}
            />
            <FilterSelect
              value={t.status}
              onChange={t.setStatus}
              isMobile={isMobile}
              minWidth={160}
            >
              <option value="all">All Statuses</option>
              {(Object.keys(WD_STYLE) as WithdrawalStatus[]).map((s) => (
                <option key={s} value={s}>
                  {WD_STYLE[s].label}
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
            <ExBtn label="Refresh" icon={false} onClick={refreshAll} />
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
              <EmptyState message="No withdrawal requests found" />
            ) : (
              t.rows.map((r) => {
                const ss = wdS(r.status);
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
                          {r.reference}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <StatusPill label={ss.label} color={ss.color} bg={ss.bg} />
                        </div>
                      </>
                    }
                    trail={
                      <>
                        <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>
                          {fmtAmt(r.netAmount)}
                        </div>
                        <div style={{ fontSize: 11, color: SLATE }}>
                          gross {fmtAmt(r.amount)}
                        </div>
                      </>
                    }
                    person={
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar src={r.userAvatar} name={r.userName} size={30} />
                        <span style={{ fontSize: 13, color: NAVY }}>{r.userName}</span>
                      </div>
                    }
                    details={[
                      { label: "Phone", value: r.phoneNumber },
                      {
                        label:
                          r.status === "queued" || r.status === "processing"
                            ? "Due"
                            : "Scheduled",
                        value: dueLabel(r.status, r.hoursUntilDue, r.scheduledFor),
                      },
                    ]}
                    note={
                      r.failureReason ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: RED,
                            background: "#FEF2F2",
                            borderRadius: 8,
                            padding: "6px 10px",
                          }}
                        >
                          {r.failureReason}
                        </div>
                      ) : undefined
                    }
                    footer={
                      <ReleaseBtn
                        row={r}
                        busy={sendingId === r.id || retryingId === r.id}
                        onSend={handleSend}
                        onRetry={handleRetry}
                      />
                    }
                  />
                );
              })
            )}
          </MobileCardList>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}
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
                  <th style={th}>User</th>
                  <th style={th}>Phone</th>
                  <SortTh
                    label="Net Amount"
                    col="net_amount"
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
                    label="Due"
                    col="scheduled_for"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <SortTh
                    label="Requested"
                    col="requested_at"
                    sortKey={t.sortKey}
                    sortDir={t.sortDir}
                    onSort={t.toggleSort}
                  />
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {t.loading ? (
                  <SkeletonRows cols={COLS} />
                ) : t.rows.length === 0 ? (
                  <EmptyState
                    message="No withdrawal requests found"
                    colSpan={COLS}
                  />
                ) : (
                  t.rows.map((r, idx) => {
                    const ss = wdS(r.status);
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
                        <td style={td}>
                          <div
                            style={{ display: "flex", alignItems: "center", gap: 10 }}
                          >
                            <Avatar src={r.userAvatar} name={r.userName} size={30} />
                            <span style={{ fontSize: 13 }}>{r.userName}</span>
                          </div>
                        </td>
                        <td style={{ ...td, color: SLATE }}>{r.phoneNumber}</td>
                        <td style={td}>
                          <div style={{ fontWeight: 700, color: NAVY }}>
                            {fmtAmt(r.netAmount)}
                          </div>
                          <div style={{ fontSize: 11, color: MUTED }}>
                            gross {fmtAmt(r.amount)} · fee {fmtAmt(r.feeAmount)}
                          </div>
                        </td>
                        <td style={td}>
                          <StatusPill label={ss.label} color={ss.color} bg={ss.bg} />
                          {r.failureReason && (
                            <div
                              style={{
                                fontSize: 11,
                                color: RED,
                                marginTop: 4,
                                maxWidth: 180,
                              }}
                            >
                              {r.failureReason}
                            </div>
                          )}
                          {r.attempts > 1 && (
                            <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>
                              {r.attempts} attempts
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                          {dueLabel(r.status, r.hoursUntilDue, r.scheduledFor)}
                        </td>
                        <td style={{ ...td, color: SLATE, whiteSpace: "nowrap" }}>
                          {fmtDate(r.requestedAt)}
                        </td>
                        <td style={td}>
                          <ReleaseBtn
                            row={r}
                            busy={sendingId === r.id || retryingId === r.id}
                            onSend={handleSend}
                            onRetry={handleRetry}
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

export default WithdrawalsTable;
