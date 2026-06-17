import React, { useEffect, useMemo, useState } from "react";
import { IconBtn } from "../../../shared/IconBtn";
import { PageBtn } from "../../../shared/PageBtn";
import { SortIcon } from "../../../shared/SortIcon";
import type { NotificationItem } from "../../pages/Notifications";
import { NotificationUserBadge } from "./NotificationUserBadge";

interface Props {
  data: NotificationItem[];
  onSort: (key: keyof NotificationItem) => void;
  sortConfig?: {
    key: keyof NotificationItem;
    direction: "asc" | "desc";
  } | null;
  rowsPerPage?: number;
  onViewNotification: (notification: NotificationItem) => void;
  onEditNotification: (notification: NotificationItem) => void;
  onDeleteNotification: (notification: NotificationItem) => void;
}

const thBase: React.CSSProperties = {
  padding: "13px 16px",
  textAlign: "left",
  borderBottom: "1px solid #E8EDF2",
  color: "#64748B",
  fontWeight: 500,
  fontSize: 13,
  userSelect: "none",
  whiteSpace: "nowrap",
};

const thInner: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const tdBase: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #F1F5F9",
  fontSize: 14,
  verticalAlign: "middle",
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const NotificationTable: React.FC<Props> = ({
  data,
  onSort,
  sortConfig,
  rowsPerPage = 10,
  onViewNotification,
  onEditNotification,
  onDeleteNotification,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, currentPage, rowsPerPage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) return [1, 2, 3, 4, 5];

    if (currentPage >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ];
  }, [currentPage, totalPages]);

  const sortTh = (key: keyof NotificationItem, label: string) => (
    <th style={{ ...thBase, cursor: "pointer" }} onClick={() => onSort(key)}>
      <div style={thInner}>
        {label}
        <SortIcon
          active={sortConfig?.key === key}
          direction={sortConfig?.key === key ? sortConfig.direction : undefined}
        />
      </div>
    </th>
  );

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E8EDF2",
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
        overflow: "hidden",
      }}
    >
      {isMobile ? (
        <div style={{ display: "grid" }}>
          {paginatedData.length === 0 ? (
            <div
              style={{
                padding: "48px 0",
                textAlign: "center",
                color: "#94A3B8",
                fontSize: 14,
              }}
            >
              No notifications found
            </div>
          ) : (
            paginatedData.map((notification, index) => (
              <button
                type="button"
                key={notification.id}
                onClick={() => onViewNotification(notification)}
                style={{
                  border: "none",
                  borderBottom: "1px solid #F1F5F9",
                  background: "#fff",
                  padding: 16,
                  textAlign: "left",
                  display: "grid",
                  gap: 10,
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>
                    {String((currentPage - 1) * rowsPerPage + index + 1).padStart(2, "0")}
                  </span>
                  <NotificationUserBadge user={notification.targetedUser} />
                </div>
                <strong style={{ color: "#0F172A", fontSize: 14 }}>
                  {notification.notificationType}
                </strong>
                <span style={{ color: "#475569", fontSize: 13 }}>
                  {notification.description}
                </span>
                <span style={{ color: "#64748B", fontSize: 12 }}>
                  {notification.channel.join(", ")} - {formatDateTime(notification.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1080,
            }}
          >
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={{ ...thBase, width: 72 }}>Sr. No.</th>
                {sortTh("notificationType", "Notification Type")}
                {sortTh("description", "Description")}
                {sortTh("targetedUser", "Targeted User")}
                {sortTh("channel", "Channel")}
                {sortTh("createdAt", "Created On")}
                <th style={{ ...thBase, textAlign: "right", paddingRight: 24 }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "48px 0",
                      textAlign: "center",
                      color: "#94A3B8",
                      fontSize: 14,
                    }}
                  >
                    No notifications found
                  </td>
                </tr>
              ) : (
                paginatedData.map((notification, index) => {
                  const globalIndex = (currentPage - 1) * rowsPerPage + index + 1;

                  return (
                    <tr
                      key={notification.id}
                      onClick={() => onViewNotification(notification)}
                      style={{
                        background: "#fff",
                        transition: "background 0.12s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = "#FAFBFC";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "#fff";
                      }}
                    >
                      <td style={{ ...tdBase, color: "#475569", fontSize: 13 }}>
                        {String(globalIndex).padStart(2, "0")}
                      </td>
                      <td style={{ ...tdBase, color: "#0F172A", fontWeight: 500 }}>
                        {notification.notificationType}
                      </td>
                      <td
                        style={{
                          ...tdBase,
                          color: "#334155",
                          maxWidth: 420,
                          lineHeight: 1.45,
                        }}
                      >
                        {notification.description}
                      </td>
                      <td style={tdBase}>
                        <NotificationUserBadge user={notification.targetedUser} />
                      </td>
                      <td style={{ ...tdBase, color: "#334155", whiteSpace: "nowrap" }}>
                        {notification.channel.join(", ")}
                      </td>
                      <td style={{ ...tdBase, color: "#334155", whiteSpace: "nowrap" }}>
                        {formatDateTime(notification.createdAt)}
                      </td>
                      <td
                        style={{ ...tdBase, textAlign: "right", paddingRight: 24 }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            justifyContent: "flex-end",
                          }}
                        >
                          <IconBtn
                            title="View details"
                            onClick={() => onViewNotification(notification)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="8" r="7" stroke="#94A3B8" strokeWidth="1.5" />
                              <path
                                d="M8 7v4"
                                stroke="#94A3B8"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                              <circle cx="8" cy="5" r="0.75" fill="#94A3B8" />
                            </svg>
                          </IconBtn>
                          <IconBtn
                            title="Edit notification"
                            onClick={() => onEditNotification(notification)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M3.5 11.8l.7-2.9 6.9-6.9a1.5 1.5 0 0 1 2.1 2.1l-6.9 6.9-2.8.8Z"
                                stroke="#94A3B8"
                                strokeWidth="1.4"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M10.2 2.9l2.1 2.1"
                                stroke="#94A3B8"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                            </svg>
                          </IconBtn>
                          <IconBtn
                            title="Delete notification"
                            onClick={() => onDeleteNotification(notification)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M3.5 4.5h9"
                                stroke="#94A3B8"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                              <path
                                d="M6.2 4.5V3.2h3.6v1.3M5 6.5l.4 6.3h5.2l.4-6.3"
                                stroke="#94A3B8"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid #F1F5F9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, color: "#64748B" }}>
          Page {currentPage} of {totalPages}
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <PageBtn
            label="< Previous"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
          />
          {pageNumbers[0] > 1 && (
            <>
              <PageBtn label="1" onClick={() => setCurrentPage(1)} />
              {pageNumbers[0] > 2 && (
                <span style={{ padding: "0 4px", color: "#94A3B8" }}>...</span>
              )}
            </>
          )}
          {pageNumbers.map((page) => (
            <PageBtn
              key={page}
              label={String(page)}
              active={page === currentPage}
              onClick={() => setCurrentPage(page)}
            />
          ))}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span style={{ padding: "0 4px", color: "#94A3B8" }}>...</span>
              )}
              <PageBtn
                label={String(totalPages)}
                onClick={() => setCurrentPage(totalPages)}
              />
            </>
          )}
          <PageBtn
            label="Next >"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
          />
        </div>
      </div>
    </div>
  );
};
