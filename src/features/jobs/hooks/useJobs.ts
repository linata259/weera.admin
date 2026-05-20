// hooks/useJobs.ts

import { useMemo, useState } from "react";
import { Job } from "../pages/Jobs";

type SortDirection = "asc" | "desc";

export const useJobs = (jobs: Job[]) => {
    const [searchTerm, setSearchTerm] = useState("");

    const [sortConfig, setSortConfig] = useState<{
        key: keyof Job;
        direction: SortDirection;
    } | null>(null);

    const requestSort = (key: keyof Job) => {
        let direction: SortDirection = "asc";

        if (
            sortConfig &&
            sortConfig.key === key &&
            sortConfig.direction === "asc"
        ) {
            direction = "desc";
        }

        setSortConfig({ key, direction });
    };

    const filteredAndSortedJobs = useMemo(() => {
        let sortableJobs = [...jobs];

        // SEARCH
        if (searchTerm) {
            sortableJobs = sortableJobs.filter((job) =>
                Object.values(job).some((value) =>
                    String(value)
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                )
            );
        }

        // SORT
        if (sortConfig) {
            sortableJobs.sort((a, b) => {
                const normalizeValue = (value: Job[keyof Job]) => {
                    if (Array.isArray(value)) return value.join(", ");
                    return value;
                };

                const aValue = normalizeValue(a[sortConfig.key]);
                const bValue = normalizeValue(b[sortConfig.key]);

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === "asc"
                        ? -1
                        : 1;
                }

                if (aValue > bValue) {
                    return sortConfig.direction === "asc"
                        ? 1
                        : -1;
                }

                return 0;
            });
        }

        return sortableJobs;
    }, [jobs, searchTerm, sortConfig]);

    return {
        searchTerm,
        setSearchTerm,
        filteredAndSortedJobs,
        requestSort,
        sortConfig,
    };
};
