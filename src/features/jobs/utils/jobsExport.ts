// src/features/jobs/utils/jobsExport.ts
import type { Job, BidRecord } from "../pages/Jobs";

export interface JobsExportFilters {
    status: string;   // "all" or a job/bid status
    category: string; // jobs only: "all" or category name
    dateFrom: string; // yyyy-mm-dd or ""
    dateTo: string;
}

export const humanize = (s: string): string =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : s;

const BID_STATUS_LABEL: Record<string, string> = {
    pending:                     'Pending',
    waiting_for_bidder_response: 'Waiting on bidder',
    offer_sent:                  'Offer sent',
    offer_accepted:              'Offer accepted',
    assigned:                    'Assigned',
    in_progress:                 'In progress',
    pending_review:              'In review',
    completed:                   'Completed',
    declined_work:               'Declined',
    rejected:                    'Rejected',
    withdrawn:                   'Withdrawn',
};
export const bidStatusLabel = (s: string) => BID_STATUS_LABEL[s] ?? humanize(s);

const fmtDate = (iso?: string | null): string =>
    iso ? new Date(iso).toLocaleDateString("en-GB") : "-";

const inRange = (iso: string | null | undefined, from: string, to: string): boolean => {
    if (!from && !to) return true;
    if (!iso) return false;
    const d = new Date(iso);
    if (from && d < new Date(from)) return false;
    if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
    }
    return true;
};

export const bidTitle = (b: BidRecord): string => b.job_title || b.jobs?.title || "";

export const fmtMoney = (amount: number | null | undefined, currency = "KES"): string =>
    amount == null ? "-" : `${currency} ${Number(amount).toLocaleString("en-KE")}`;

export const filterJobsForExport = (jobs: Job[], f: JobsExportFilters): Job[] =>
    jobs.filter(
        (j) =>
            (f.status === "all" || j.status === f.status) &&
            (f.category === "all" || j.categories.includes(f.category)) &&
            inRange(j.posted_at, f.dateFrom, f.dateTo)
    );

export const filterBidsForExport = (bids: BidRecord[], f: JobsExportFilters): BidRecord[] =>
    bids.filter((b) => (f.status === "all" || b.status === f.status) && inRange(b.submitted_at, f.dateFrom, f.dateTo));

export const JOB_EXPORT_HEADERS = ["Job ID", "Title", "Categories", "Posted By", "Status", "Location", "Budget", "Proposals", "Posted"];

export const jobExportRow = (j: Job): string[] => [
    j.jobId,
    j.title || "-",
    j.categories.join(", ") || "-",
    j.posted_by_name || "-",
    humanize(j.status),
    j.location || "-",
    fmtMoney(j.budget),
    String(j.applicants ?? 0),
    fmtDate(j.posted_at),
];

export const BID_EXPORT_HEADERS = ["Job Title", "Bidder", "Amount", "Counter Offer", "Type", "Status", "Client Rating", "Submitted"];

export const bidExportRow = (b: BidRecord): string[] => [
    bidTitle(b) || "-",
    b.bidder_name || "-",
    fmtMoney(b.price, b.currency),
    b.counter_offer != null ? fmtMoney(b.counter_offer, b.currency) : "-",
    b.is_hourly ? "Hourly" : "Fixed",
    bidStatusLabel(b.status),
    b.client_rating != null ? b.client_rating.toFixed(1) : "-",
    fmtDate(b.submitted_at),
];

export const summarizeFilters = (f: JobsExportFilters, kind: "jobs" | "bids"): string => {
    const label = kind === "bids" ? bidStatusLabel : humanize;
    const parts = [`Status: ${f.status === "all" ? "All" : label(f.status)}`];
    if (kind === "jobs") parts.push(`Category: ${f.category === "all" ? "All" : f.category}`);
    parts.push(`Date range: ${f.dateFrom || f.dateTo ? `${f.dateFrom || "any"} to ${f.dateTo || "any"}` : "All time"}`);
    return parts.join("  |  ");
};
