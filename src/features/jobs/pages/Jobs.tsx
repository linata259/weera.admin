import React, { useState, useEffect } from "react";
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

    const handleSuspendJob = (job: Job) => {
        console.log("Toggle suspend:", job);
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
