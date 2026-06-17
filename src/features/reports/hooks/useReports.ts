import { useMemo, useState } from "react";
import type { ReportRow } from "../types";

type SortDirection = "asc" | "desc";

const getValue = (row: ReportRow, key: string): unknown => {
  return (row as unknown as Record<string, unknown>)[key];
};

export const useReports = <T extends ReportRow>(rows: T[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  } | null>(null);

  const requestSort = (key: string) => {
    let direction: SortDirection = "asc";

    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  const filteredAndSortedRows = useMemo(() => {
    let nextRows = [...rows];
    const query = searchTerm.trim().toLowerCase();

    if (query) {
      nextRows = nextRows.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(query)
      );
    }

    if (sortConfig) {
      nextRows.sort((a, b) => {
        const aValue = getValue(a, sortConfig.key);
        const bValue = getValue(b, sortConfig.key);
        const normalizedA = typeof aValue === "object" ? JSON.stringify(aValue) : aValue;
        const normalizedB = typeof bValue === "object" ? JSON.stringify(bValue) : bValue;

        if (normalizedA === null || normalizedA === undefined) return 1;
        if (normalizedB === null || normalizedB === undefined) return -1;

        if (normalizedA < normalizedB) return sortConfig.direction === "asc" ? -1 : 1;
        if (normalizedA > normalizedB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return nextRows;
  }, [rows, searchTerm, sortConfig]);

  return {
    searchTerm,
    setSearchTerm,
    filteredAndSortedRows,
    requestSort,
    sortConfig,
  };
};
