// hooks/useUsers.ts

import { useMemo, useState } from "react";
import { User } from "../pages/Users";

type SortDirection = "asc" | "desc";

export const useUsers = (users: User[]) => {
  const [searchTerm, setSearchTerm] = useState("");

  const [sortConfig, setSortConfig] = useState<{
    key: keyof User;
    direction: SortDirection;
  } | null>(null);

  const requestSort = (key: keyof User) => {
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

  const filteredAndSortedUsers = useMemo(() => {
    let sortableUsers = [...users];

    // SEARCH
    if (searchTerm) {
      sortableUsers = sortableUsers.filter((user) =>
        Object.values(user).some((value) =>
          String(value)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    }

    // SORT
    if (sortConfig) {
      sortableUsers.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue == null) return 1;
        if (bValue == null) return -1;

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

    return sortableUsers;
  }, [users, searchTerm, sortConfig]);

  return {
    searchTerm,
    setSearchTerm,
    filteredAndSortedUsers,
    requestSort,
    sortConfig,
  };
};