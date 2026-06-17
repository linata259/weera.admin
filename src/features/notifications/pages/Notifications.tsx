import React, { useEffect, useMemo, useState } from "react";
import { fetchNotifications } from "../api/notificationServices";
import { NotificationFormModal } from "../components/table/NotificationFormModal";
import { NotificationTable } from "../components/table/NotificationTable";
import { TableToolbar } from "../components/table/TableToolbar";
import { useNotifications } from "../hooks/useNotifications";

export type NotificationTargetedUser = "Bidder" | "Client" | "All";
export type NotificationChannel = "Email" | "In-App" | "Push";

export interface NotificationItem {
  id: string;
  notificationType: string;
  description: string;
  targetedUser: NotificationTargetedUser;
  channel: NotificationChannel[];
  createdAt: string;
  fixed: boolean;
}

const sanitizeText = (value: string): string => {
  return value
    .replace(/<script.*?>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[<>]/g, "")
    .trim();
};

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationTypeFilter, setNotificationTypeFilter] = useState("all");
  const [userFilter, setUserFilter] =
    useState<NotificationTargetedUser | "all">("all");
  const [fixedOnly, setFixedOnly] = useState(false);
  const [editingNotification, setEditingNotification] =
    useState<NotificationItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    searchTerm,
    setSearchTerm,
    filteredAndSortedNotifications: baseFiltered,
    requestSort,
    sortConfig,
  } = useNotifications(notifications);

  useEffect(() => {
    fetchNotifications().then((data) => {
      const sanitizedNotifications = data.map((notification) => ({
        ...notification,
        notificationType: sanitizeText(notification.notificationType),
        description: sanitizeText(notification.description),
      }));

      setNotifications(sanitizedNotifications);
    });
  }, []);

  const filteredAndSortedNotifications = baseFiltered.filter((notification) => {
    if (
      notificationTypeFilter !== "all" &&
      notification.notificationType !== notificationTypeFilter
    ) {
      return false;
    }

    if (userFilter !== "all" && notification.targetedUser !== userFilter) {
      return false;
    }

    if (fixedOnly && !notification.fixed) {
      return false;
    }

    return true;
  });

  const notificationTypeOptions = useMemo(() => {
    return Array.from(
      new Set(notifications.map((notification) => notification.notificationType))
    )
      .sort()
      .map((notificationType) => ({
        label: notificationType,
        value: notificationType,
      }));
  }, [notifications]);

  const handleCreateNotification = () => {
    setEditingNotification(null);
    setShowForm(true);
  };

  const handleEditNotification = (notification: NotificationItem) => {
    setEditingNotification(notification);
    setShowForm(true);
  };

  const handleSaveNotification = (notification: NotificationItem) => {
    setNotifications((prev) => {
      const exists = prev.some((item) => item.id === notification.id);

      if (exists) {
        return prev.map((item) =>
          item.id === notification.id ? notification : item
        );
      }

      return [notification, ...prev];
    });
    setShowForm(false);
    setEditingNotification(null);
  };

  const handleDeleteNotification = (notification: NotificationItem) => {
    setNotifications((prev) =>
      prev.filter((item) => item.id !== notification.id)
    );
  };

  const handleViewNotification = (notification: NotificationItem) => {
    console.log("View notification:", notification);
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      <TableToolbar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        notificationTypeFilter={notificationTypeFilter}
        onNotificationTypeChange={setNotificationTypeFilter}
        notificationTypeOptions={notificationTypeOptions}
        fixedOnly={fixedOnly}
        onFixedOnlyChange={setFixedOnly}
        onCreateNotification={handleCreateNotification}
        userFilter={userFilter}
        onUserChange={setUserFilter}
      />

      <NotificationTable
        data={filteredAndSortedNotifications}
        onSort={requestSort}
        sortConfig={sortConfig}
        rowsPerPage={10}
        onViewNotification={handleViewNotification}
        onEditNotification={handleEditNotification}
        onDeleteNotification={handleDeleteNotification}
      />

      {showForm && (
        <NotificationFormModal
          notification={editingNotification}
          onClose={() => {
            setShowForm(false);
            setEditingNotification(null);
          }}
          onSave={handleSaveNotification}
        />
      )}
    </div>
  );
};

export default Notifications;
