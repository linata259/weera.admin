import type { Job } from "../pages/Jobs";

/**
 * Job lifecycle helpers.
 *
 * The Weera app posts jobs with `expires_at = posted_at + 7 days`.
 * When a client reposts an expired job, the app resets `expires_at`
 * to `now + 7 days` and the status back to `pending` — so a job whose
 * (expires_at − 7d) is meaningfully later than posted_at was reposted.
 */

export const EXPIRY_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Tolerance between posted_at and (expires_at − 7d) before we call it a repost. */
const REPOST_EPSILON_MS = 60 * 60 * 1000; // 1 hour

/** Statuses that can still expire (job never got worked on). */
const EXPIRABLE = new Set(["pending", "active", "waiting_for_bidder_response"]);

/** When the job was last (re)posted: expires_at − 7d if that is later than posted_at. */
export function getRepostedAt(job: Pick<Job, "posted_at" | "expires_at">): string | null {
    if (!job.expires_at || !job.posted_at) return null;
    const repostMs = new Date(job.expires_at).getTime() - EXPIRY_DAYS * DAY_MS;
    const postedMs = new Date(job.posted_at).getTime();
    if (repostMs - postedMs > REPOST_EPSILON_MS) {
        return new Date(repostMs).toISOString();
    }
    return null;
}

export function isJobReposted(job: Pick<Job, "posted_at" | "expires_at">): boolean {
    return getRepostedAt(job) !== null;
}

/** True when the job is expired — flagged by the app, or past its expiry window. */
export function isJobExpired(
    job: Pick<Job, "status" | "posted_at" | "expires_at">,
    now: number = Date.now(),
): boolean {
    const s = (job.status || "").toLowerCase();
    if (s === "expired") return true;
    if (!EXPIRABLE.has(s)) return false;

    const expiryMs = job.expires_at
        ? new Date(job.expires_at).getTime()
        : job.posted_at
            ? new Date(job.posted_at).getTime() + EXPIRY_DAYS * DAY_MS
            : null;

    return expiryMs !== null && expiryMs < now;
}

/** The status to display/filter on — surfaces implicit expiry. */
export function effectiveStatus(job: Pick<Job, "status" | "posted_at" | "expires_at">): string {
    return isJobExpired(job) ? "expired" : (job.status || "pending").toLowerCase();
}

/** The date the job actually expired (only meaningful when isJobExpired). */
export function getExpiredAt(job: Pick<Job, "status" | "posted_at" | "expires_at">): string | null {
    if (!isJobExpired(job)) return null;
    if (job.expires_at) return job.expires_at;
    if (job.posted_at) {
        return new Date(new Date(job.posted_at).getTime() + EXPIRY_DAYS * DAY_MS).toISOString();
    }
    return null;
}

/** Whole days until expiry (negative = days since it expired). Null when not applicable. */
export function daysUntilExpiry(
    job: Pick<Job, "status" | "posted_at" | "expires_at">,
    now: number = Date.now(),
): number | null {
    const s = (job.status || "").toLowerCase();
    if (!EXPIRABLE.has(s) && s !== "expired") return null;

    const expiryMs = job.expires_at
        ? new Date(job.expires_at).getTime()
        : job.posted_at
            ? new Date(job.posted_at).getTime() + EXPIRY_DAYS * DAY_MS
            : null;
    if (expiryMs === null) return null;

    return Math.floor((expiryMs - now) / DAY_MS);
}

/** Age in days since the job was last (re)posted. */
export function ageInDays(
    job: Pick<Job, "posted_at" | "expires_at">,
    now: number = Date.now(),
): number | null {
    const anchor = getRepostedAt(job) ?? job.posted_at;
    if (!anchor) return null;
    return (now - new Date(anchor).getTime()) / DAY_MS;
}
