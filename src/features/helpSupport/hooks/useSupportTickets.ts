import { useMemo, useState } from "react";
import type { SupportTicket } from "../types";

type SortDirection = "asc" | "desc";

const getValue = (ticket: SupportTicket, key: keyof SupportTicket): unknown => {
  return ticket[key];
};

export const useSupportTickets = (tickets: SupportTicket[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SupportTicket;
    direction: SortDirection;
  } | null>(null);

  const requestSort = (key: keyof SupportTicket) => {
    let direction: SortDirection = "asc";

    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  const filteredAndSortedTickets = useMemo(() => {
    let nextTickets = [...tickets];
    const query = searchTerm.trim().toLowerCase();

    if (query) {
      nextTickets = nextTickets.filter((ticket) =>
        JSON.stringify(ticket).toLowerCase().includes(query)
      );
    }

    if (sortConfig) {
      nextTickets.sort((a, b) => {
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

    return nextTickets;
  }, [tickets, searchTerm, sortConfig]);

  return {
    searchTerm,
    setSearchTerm,
    filteredAndSortedTickets,
    requestSort,
    sortConfig,
  };
};
