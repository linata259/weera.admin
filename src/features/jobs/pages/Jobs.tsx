import React, { useMemo, useState, useEffect } from "react";
import { useJobs } from "../hooks/useJobs";
import { fetchJobs } from "../api/jobServices";
import { TableToolbar } from "../components/table/TableToolbar";
import { JobTable } from "../components/table/JobTable";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface Job {
    id: string;
    jobId: string;
    title: string;
    jobType: string;
    categories: string[];
    status: string;
    applicants: number;
    posted_at: string | null;
    description: string;
    specifications: string[];
    attachments: string[];
    location: string;

    posted_by_user_id: string | null;
    posted_by_name: string;
    posted_by_image: string | null;
}

/* -------------------------------------------------------------------------- */
/*                              SANITIZE HELPERS                              */
/* -------------------------------------------------------------------------- */

const sanitizeText = (value: string | null): string => {
    if (!value) return "";

    return value
        .replace(/<script.*?>.*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/[<>]/g, "")
        .trim();
};

const sanitizeImageUrl = (url: string | null): string | null => {
    if (!url) return null;
    const clean = url.trim();
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
        return clean;
    }
    return null;
};

const sanitizeUrl = (url: string): string | null => {
    const clean = url.trim();
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
        return clean;
    }
    return null;
};

const isWithinDays = (iso: string | null, startDaysAgo: number, endDaysAgo = 0) => {
    if (!iso) return false;

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return false;

    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - startDaysAgo);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(now.getDate() - endDaysAgo);
    end.setHours(23, 59, 59, 999);

    return date >= start && date <= end;
};

const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
};

const formatNumber = (value: number) => value.toLocaleString("en-US");

const iconBoxStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748B",
    flexShrink: 0,
};

const StatIcon: React.FC<{ type: "total" | "active" | "completed" | "applicants" }> = ({ type }) => {
    if (type === "active") {
        return (
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <path d="M3.5 6.8h10v6.1a1.1 1.1 0 0 1-1.1 1.1H4.6a1.1 1.1 0 0 1-1.1-1.1V6.8Z" stroke="currentColor" strokeWidth="1.3" />
                <path d="M6.2 6.8V4.9a2.3 2.3 0 0 1 4.6 0v1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M6 9.7h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
        );
    }

    if (type === "completed") {
        return (
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <path d="M5.2 2.5h5.2l2.1 2.1v9.1a1.1 1.1 0 0 1-1.1 1.1H5.2a1.1 1.1 0 0 1-1.1-1.1V3.6a1.1 1.1 0 0 1 1.1-1.1Z" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 9.1l1.2 1.2 2.4-2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (type === "applicants") {
        return (
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <circle cx="8.5" cy="5.4" r="2.2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M4.5 14.1a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
        );
    }

    return (
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <circle cx="8.5" cy="5.3" r="2.1" stroke="currentColor" strokeWidth="1.3" />
            <path d="M4.5 14a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M13.4 6.9v3.2M11.8 8.5H15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    );
};

const JobSummaryCard: React.FC<{
    label: string;
    value: string;
    change: number;
    icon: "total" | "active" | "completed" | "applicants";
}> = ({ label, value, change, icon }) => {
    const positive = change >= 0;

    return (
        <div
            style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: 16,
                minHeight: 110,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={iconBoxStyle}>
                    <StatIcon type={icon} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                    {label}
                </div>
            </div>

            <div>
                <div style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 800, color: "#0F172A" }}>
                    {value}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            borderRadius: 20,
                            background: positive ? "#DCFCE7" : "#FEE2E2",
                            color: positive ? "#15803D" : "#DC2626",
                            fontSize: 11,
                            fontWeight: 700,
                        }}
                    >
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            style={{ transform: positive ? "none" : "rotate(180deg)" }}
                        >
                            <path d="M5 2v6M5 2L2.8 4.2M5 2l2.2 2.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {Math.abs(change)}%
                    </span>
                    <span style={{ fontSize: 12, color: "#64748B" }}>vs last week</span>
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/*                                MAIN SCREEN                                 */
/* -------------------------------------------------------------------------- */

const Jobs: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);

    const [dateRangeFilter, setDateRangeFilter] =
        useState<string>("all");

    const [statusFilter, setStatusFilter] =
        useState<string>("all");

    const [jobTypeFilter, setJobTypeFilter] =
        useState<string>("all");

    const {
        searchTerm,
        setSearchTerm,
        filteredAndSortedJobs: baseFiltered,
        requestSort,
        sortConfig,
    } = useJobs(jobs);

    /* ---------------------------------------------------------------------- */
    /*                            FETCH + SANITIZE                            */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        fetchJobs().then((data) => {
            const sanitizedJobs = (data as Job[]).map((job) => {
                const categories = Array.isArray(job.categories)
                    ? job.categories.map(sanitizeText).filter(Boolean)
                    : [];

                return {
                    ...job,
                    title: sanitizeText(job.title),
                    jobType: sanitizeText(job.jobType),
                    categories,
                    status: sanitizeText(job.status),
                    description: sanitizeText(job.description),
                    specifications: Array.isArray(job.specifications)
                        ? job.specifications.map(sanitizeText).filter(Boolean)
                        : [],
                    attachments: Array.isArray(job.attachments)
                        ? job.attachments
                            .map(sanitizeUrl)
                            .filter((url): url is string => Boolean(url))
                        : [],
                    location: sanitizeText(job.location),
                    posted_by_name: sanitizeText(job.posted_by_name),
                    posted_by_image: sanitizeImageUrl(job.posted_by_image),
                };
            });

            setJobs(sanitizedJobs);
        });
    }, []);

    /* ---------------------------------------------------------------------- */
    /*                                FILTERING                               */
    /* ---------------------------------------------------------------------- */

    const filteredAndSortedJobs = baseFiltered.filter((j) => {
        /* Status filter */
        if (statusFilter !== "all" && j.status !== statusFilter) {
            return false;
        }

        /* Job category filter */
        if (jobTypeFilter !== "all" && !j.categories.includes(jobTypeFilter)) {
            return false;
        }

        return true;
    });

    const stats = useMemo(() => {
        const activeJobs = jobs.filter((job) => job.status.toLowerCase() === "active");
        const completedJobs = jobs.filter((job) => job.status.toLowerCase() === "completed");
        const totalApplicants = jobs.reduce((sum, job) => sum + job.applicants, 0);
        const averageApplicants = jobs.length
            ? Math.round(totalApplicants / jobs.length)
            : 0;

        const currentWeekJobs = jobs.filter((job) => isWithinDays(job.posted_at, 7));
        const previousWeekJobs = jobs.filter((job) => isWithinDays(job.posted_at, 14, 8));

        const currentWeekActive = currentWeekJobs.filter((job) => job.status.toLowerCase() === "active").length;
        const previousWeekActive = previousWeekJobs.filter((job) => job.status.toLowerCase() === "active").length;
        const currentWeekCompleted = currentWeekJobs.filter((job) => job.status.toLowerCase() === "completed").length;
        const previousWeekCompleted = previousWeekJobs.filter((job) => job.status.toLowerCase() === "completed").length;

        const currentWeekAverageApplicants = currentWeekJobs.length
            ? Math.round(currentWeekJobs.reduce((sum, job) => sum + job.applicants, 0) / currentWeekJobs.length)
            : 0;
        const previousWeekAverageApplicants = previousWeekJobs.length
            ? Math.round(previousWeekJobs.reduce((sum, job) => sum + job.applicants, 0) / previousWeekJobs.length)
            : 0;

        return {
            total: jobs.length,
            active: activeJobs.length,
            completed: completedJobs.length,
            averageApplicants,
            totalChange: getChangePercent(currentWeekJobs.length, previousWeekJobs.length),
            activeChange: getChangePercent(currentWeekActive, previousWeekActive),
            completedChange: getChangePercent(currentWeekCompleted, previousWeekCompleted),
            applicantChange: getChangePercent(currentWeekAverageApplicants, previousWeekAverageApplicants),
        };
    }, [jobs]);

    /* ---------------------------------------------------------------------- */
    /*                            FILTER OPTIONS                           */
    /* ---------------------------------------------------------------------- */

    const jobCategoryOptions = Array.from(
        new Set(
            jobs
                .flatMap((j) => j.categories)
                .filter((t) => t && t !== "General")
        )
    )
        .sort()
        .map((l) => ({
            label: l,
            value: l,
        }));

    /* ---------------------------------------------------------------------- */
    /*                                ACTIONS                                 */
    /* ---------------------------------------------------------------------- */

    const handleViewJob = (job: Job) => {
        console.log("View job:", job);
    };

    const handleSuspendJob = (job: Job, reason?: string) => {
        console.log("Toggle suspend:", job, "Reason:", reason);
    };

    /* ---------------------------------------------------------------------- */
    /*                                  UI                                    */
    /* ---------------------------------------------------------------------- */

    return (
        <div
            style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                fontFamily:
                    "'DM Sans', 'Helvetica Neue', sans-serif",
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                }}
            >
                <JobSummaryCard
                    label="Total Jobs"
                    value={formatNumber(stats.total)}
                    change={stats.totalChange}
                    icon="total"
                />
                <JobSummaryCard
                    label="Active Jobs"
                    value={formatNumber(stats.active)}
                    change={stats.activeChange}
                    icon="active"
                />
                <JobSummaryCard
                    label="Completed"
                    value={formatNumber(stats.completed)}
                    change={stats.completedChange}
                    icon="completed"
                />
                <JobSummaryCard
                    label="Avg Applicant"
                    value={formatNumber(stats.averageApplicants)}
                    change={stats.applicantChange}
                    icon="applicants"
                />
            </div>

            <TableToolbar
                searchTerm={searchTerm}
                onSearch={setSearchTerm}
                jobTypeFilter={jobTypeFilter}
                onJobTypeChange={setJobTypeFilter}
                jobTypeOptions={jobCategoryOptions}
                dateRangeFilter={dateRangeFilter}
                onDateRangeChange={setDateRangeFilter}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
            />

            <JobTable
                data={filteredAndSortedJobs}
                columns={[]}
                onSort={requestSort}
                sortConfig={sortConfig as any}
                onViewJob={handleViewJob}
                onSuspendJob={handleSuspendJob}
                rowsPerPage={10}
            />
        </div>
    );
};

export default Jobs;
