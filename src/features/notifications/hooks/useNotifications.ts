import { useMemo, useState } from "react";
import type { NotificationItem } from "../pages/Notifications";

type SortDirection = "asc" | "desc";

export const useNotifications = (notifications: NotificationItem[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof NotificationItem;
    direction: SortDirection;
  } | null>(null);

  const requestSort = (key: keyof NotificationItem) => {
    let direction: SortDirection = "asc";

    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  const filteredAndSortedNotifications = useMemo(() => {
    let sortableNotifications = [...notifications];
    const query = searchTerm.trim().toLowerCase();

    if (query) {
      sortableNotifications = sortableNotifications.filter((notification) =>
        Object.values(notification).some((value) =>
          String(Array.isArray(value) ? value.join(", ") : value)
            .toLowerCase()
            .includes(query)
        )
      );
    }

    if (sortConfig) {
      sortableNotifications.sort((a, b) => {
        const normalizeValue = (value: NotificationItem[keyof NotificationItem]) => {
          if (Array.isArray(value)) return value.join(", ");
          return value;
        };

        const aValue = normalizeValue(a[sortConfig.key]);
        const bValue = normalizeValue(b[sortConfig.key]);

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }

        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }

        return 0;
      });
    }

    return sortableNotifications;
  }, [notifications, searchTerm, sortConfig]);

  return {
    searchTerm,
    setSearchTerm,
    filteredAndSortedNotifications,
    requestSort,
    sortConfig,
  };
};
