import React, { useMemo, useState } from "react";
import type { SupportTicket } from "../../types";
import { Avatar } from "../../../shared/Avatar";
import { SupportTicketStatusBadge } from "./SupportTicketStatusBadge";

type SortConfig = {
  key: keyof SupportTicket;
  direction: "asc" | "desc";
} | null;

interface SupportTicketTableProps {
  tickets: SupportTicket[];
  onSort: (key: keyof SupportTicket) => void;
  sortConfig: SortConfig;
  onViewTicket: (ticket: SupportTicket) => void;
  rowsPerPage?: number;
}

const formatDate = (iso: string | null): string => {
  if (!iso) return "-";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const SortIcon: React.FC<{
  active: boolean;
  direction?: "asc" | "desc";
}> = ({ active, direction }) => {
  if (!active) return <span style={{ color: "#CBD5E1" }}>↕</span>;

  return <span style={{ color: "#0F172A" }}>{direction === "asc" ? "↑" : "↓"}</span>;
};

export const SupportTicketTable: React.FC<SupportTicketTableProps> = ({
  tickets,
  onSort,
  sortConfig,
  onViewTicket,
  rowsPerPage = 10,
}) => {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(tickets.length / rowsPerPage));

  const currentTickets = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return tickets.slice(start, start + rowsPerPage);
  }, [tickets, page, rowsPerPage]);

  React.useEffect(() => {
    setPage(1);
  }, [tickets.length]);

  const headerCell = (
    label: string,
    key?: keyof SupportTicket
  ) => (
    <th
      onClick={key ? () => onSort(key) : undefined}
      style={{
        padding: "14px 16px",
        textAlign: "left",
        fontSize: 12,
        color: "#64748B",
        fontWeight: 800,
        textTransform: "uppercase",
        borderBottom: "1px solid #E2E8F0",
        cursor: key ? "pointer" : "default",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {label}
        {key && (
          <SortIcon
            active={sortConfig?.key === key}
            direction={sortConfig?.direction}
          />
        )}
      </span>
    </th>
  );

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 900,
            fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
          }}
        >
          <thead style={{ background: "#F8FAFC" }}>
            <tr>
              {headerCell("Ticket ID", "ticketId")}
              {headerCell("Requester")}
              {headerCell("User Type")}
              {headerCell("Message", "description")}
              {headerCell("Status", "status")}
              {headerCell("Created", "createdAt")}
              {headerCell("Action")}
            </tr>
          </thead>

          <tbody>
            {currentTickets.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#64748B",
                    fontSize: 14,
                  }}
                >
                  No support tickets found.
                </td>
              </tr>
            ) : (
              currentTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  style={{
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <td
                    style={{
                      padding: "14px 16px",
                      color: "#0F172A",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    #{ticket.ticketId}
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar
                        src={ticket.user?.imageUrl}
                        name={ticket.user?.name ?? "Unknown User"}
                      />

                      <div>
                        <div
                          style={{
                            color: "#0F172A",
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {ticket.user?.name ?? "Unknown User"}
                        </div>

                        <div
                          style={{
                            color: "#64748B",
                            fontSize: 12,
                          }}
                        >
                          {ticket.user?.phone ?? "No phone"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td
                    style={{
                      padding: "14px 16px",
                      color: "#334155",
                      fontSize: 14,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ticket.user?.userType ?? "User"}
                  </td>

                  <td
                    style={{
                      padding: "14px 16px",
                      color: "#334155",
                      fontSize: 14,
                      maxWidth: 280,
                    }}
                  >
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={ticket.description}
                    >
                      {ticket.description || "No message provided."}
                    </div>
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <SupportTicketStatusBadge status={ticket.status} />
                  </td>

                  <td
                    style={{
                      padding: "14px 16px",
                      color: "#334155",
                      fontSize: 14,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(ticket.createdAt)}
                  </td>

                  <td
                    style={{
                      padding: "14px 16px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onViewTicket(ticket)}
                      style={{
                        height: 36,
                        padding: "0 14px",
                        borderRadius: 10,
                        border: "1px solid #E2E8F0",
                        background: "#fff",
                        color: "#2563EB",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderTop: "1px solid #E2E8F0",
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: "#64748B", fontSize: 13 }}>
          Showing {currentTickets.length} of {tickets.length} tickets
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              background: page === 1 ? "#F8FAFC" : "#fff",
              color: page === 1 ? "#CBD5E1" : "#0F172A",
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            Previous
          </button>

          <span style={{ color: "#64748B", fontSize: 13 }}>
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              background: page === totalPages ? "#F8FAFC" : "#fff",
              color: page === totalPages ? "#CBD5E1" : "#0F172A",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// import React, { useEffect, useMemo, useState } from "react";
// import { Avatar } from "../../../shared/Avatar";
// import { IconBtn } from "../../../shared/IconBtn";
// import { PageBtn } from "../../../shared/PageBtn";
// import { SortIcon } from "../../../shared/SortIcon";
// import type { SupportTicket } from "../../types";
// import { SupportTicketStatusBadge } from "./SupportTicketStatusBadge";

// interface SupportTicketTableProps {
//   tickets: SupportTicket[];
//   onSort: (key: keyof SupportTicket) => void;
//   sortConfig?: { key: keyof SupportTicket; direction: "asc" | "desc" } | null;
//   onViewTicket: (ticket: SupportTicket) => void;
//   rowsPerPage?: number;
// }

// const thBase: React.CSSProperties = {
//   padding: "13px 16px",
//   textAlign: "left",
//   borderBottom: "1px solid #E8EDF2",
//   color: "#64748B",
//   fontWeight: 500,
//   fontSize: 13,
//   userSelect: "none",
//   whiteSpace: "nowrap",
// };

// const tdBase: React.CSSProperties = {
//   padding: "14px 16px",
//   borderBottom: "1px solid #F1F5F9",
//   fontSize: 14,
//   verticalAlign: "middle",
// };

// const formatDateTime = (iso: string | null): string => {
//   if (!iso) return "-";
//   const date = new Date(iso);
//   if (Number.isNaN(date.getTime())) return "-";
//   return date.toLocaleString("en-GB", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
// };

// export const SupportTicketTable: React.FC<SupportTicketTableProps> = ({
//   tickets,
//   onSort,
//   sortConfig,
//   onViewTicket,
//   rowsPerPage = 10,
// }) => {
//   const [currentPage, setCurrentPage] = useState(1);

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [tickets.length]);

//   const totalPages = Math.max(1, Math.ceil(tickets.length / rowsPerPage));

//   const paginatedTickets = useMemo(() => {
//     const start = (currentPage - 1) * rowsPerPage;
//     return tickets.slice(start, start + rowsPerPage);
//   }, [tickets, currentPage, rowsPerPage]);

//   const pageNumbers = useMemo(() => {
//     if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
//     if (currentPage <= 3) return [1, 2, 3, 4, 5];
//     if (currentPage >= totalPages - 2) {
//       return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
//     }
//     return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
//   }, [currentPage, totalPages]);

//   const sortTh = (key: keyof SupportTicket, label: string) => (
//     <th style={{ ...thBase, cursor: "pointer" }} onClick={() => onSort(key)}>
//       <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//         {label}
//         <SortIcon
//           active={sortConfig?.key === key}
//           direction={sortConfig?.key === key ? sortConfig.direction : undefined}
//         />
//       </div>
//     </th>
//   );

//   return (
//     <div
//       style={{
//         fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
//         width: "100%",
//         display: "flex",
//         flexDirection: "column",
//         background: "#fff",
//         borderRadius: 16,
//         border: "1px solid #E8EDF2",
//         boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
//         overflow: "hidden",
//       }}
//     >
//       <div style={{ overflowX: "auto", width: "100%" }}>
//         <table
//           style={{
//             width: "100%",
//             borderCollapse: "collapse",
//             minWidth: 980,
//           }}
//         >
//           <thead>
//             <tr style={{ background: "#F8FAFC" }}>
//               <th style={{ ...thBase, width: 72 }}>Sr. No.</th>
//               {sortTh("ticketId", "Ticket Id")}
//               {sortTh("user", "Requester")}
//               {sortTh("description", "Message")}
//               {sortTh("attachmentPath", "Attachment")}
//               {sortTh("status", "Status")}
//               {sortTh("createdAt", "Created On")}
//               {sortTh("updatedAt", "Updated On")}
//               <th style={{ ...thBase, textAlign: "right", paddingRight: 24 }}>
//                 Action
//               </th>
//             </tr>
//           </thead>
//           <tbody>
//             {paginatedTickets.length === 0 ? (
//               <tr>
//                 <td
//                   colSpan={9}
//                   style={{
//                     padding: "48px 0",
//                     textAlign: "center",
//                     color: "#94A3B8",
//                     fontSize: 14,
//                   }}
//                 >
//                   No support tickets found
//                 </td>
//               </tr>
//             ) : (
//               paginatedTickets.map((ticket, index) => {
//                 const globalIndex = (currentPage - 1) * rowsPerPage + index + 1;

//                 return (
//                   <tr
//                     key={ticket.id}
//                     onClick={() => onViewTicket(ticket)}
//                     style={{
//                       background: "#fff",
//                       cursor: "pointer",
//                       transition: "background 0.12s",
//                     }}
//                     onMouseEnter={(event) => {
//                       event.currentTarget.style.background = "#FAFBFC";
//                     }}
//                     onMouseLeave={(event) => {
//                       event.currentTarget.style.background = "#fff";
//                     }}
//                   >
//                     <td style={{ ...tdBase, color: "#475569", fontSize: 13 }}>
//                       {String(globalIndex).padStart(2, "0")}
//                     </td>
//                     <td style={{ ...tdBase, color: "#0F172A", fontWeight: 600 }}>
//                       {ticket.ticketId}
//                     </td>
//                     <td style={tdBase}>
//                       <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                         <Avatar
//                           src={ticket.user?.imageUrl}
//                           name={ticket.user?.name ?? "Unknown User"}
//                           size={32}
//                         />
//                         <div>
//                           <div style={{ color: "#0F172A", fontWeight: 600 }}>
//                             {ticket.user?.name ?? "Unknown User"}
//                           </div>
//                           <div style={{ color: "#64748B", fontSize: 12 }}>
//                             {ticket.user?.userType ?? "User"}
//                           </div>
//                         </div>
//                       </div>
//                     </td>
//                     <td
//                       style={{
//                         ...tdBase,
//                         color: "#334155",
//                         maxWidth: 430,
//                         lineHeight: 1.45,
//                       }}
//                     >
//                       <div
//                         style={{
//                           overflow: "hidden",
//                           display: "-webkit-box",
//                           WebkitLineClamp: 2,
//                           WebkitBoxOrient: "vertical",
//                         }}
//                       >
//                         {ticket.description || "-"}
//                       </div>
//                     </td>
//                     <td style={{ ...tdBase, color: "#334155", whiteSpace: "nowrap" }}>
//                       {ticket.attachmentPath ? (
//                         <span
//                           style={{
//                             display: "inline-flex",
//                             alignItems: "center",
//                             gap: 6,
//                             color: "#2563EB",
//                             fontWeight: 700,
//                           }}
//                         >
//                           <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
//                             <path
//                               d="M5.2 8.4l3.9-3.9a2.1 2.1 0 0 1 3 3l-5 5a3.1 3.1 0 0 1-4.4-4.4l5.3-5.3"
//                               stroke="currentColor"
//                               strokeWidth="1.4"
//                               strokeLinecap="round"
//                               strokeLinejoin="round"
//                             />
//                           </svg>
//                           Attached
//                         </span>
//                       ) : (
//                         <span style={{ color: "#CBD5E1" }}>-</span>
//                       )}
//                     </td>
//                     <td style={tdBase}>
//                       <SupportTicketStatusBadge status={ticket.status} />
//                     </td>
//                     <td style={{ ...tdBase, color: "#334155", whiteSpace: "nowrap" }}>
//                       {formatDateTime(ticket.createdAt)}
//                     </td>
//                     <td style={{ ...tdBase, color: "#334155", whiteSpace: "nowrap" }}>
//                       {formatDateTime(ticket.updatedAt)}
//                     </td>
//                     <td
//                       style={{ ...tdBase, textAlign: "right", paddingRight: 24 }}
//                       onClick={(event) => event.stopPropagation()}
//                     >
//                       <div style={{ display: "flex", justifyContent: "flex-end" }}>
//                         <IconBtn title="View ticket" onClick={() => onViewTicket(ticket)}>
//                           <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
//                             <circle cx="8" cy="8" r="7" stroke="#94A3B8" strokeWidth="1.5" />
//                             <path
//                               d="M8 7v4"
//                               stroke="#94A3B8"
//                               strokeWidth="1.5"
//                               strokeLinecap="round"
//                             />
//                             <circle cx="8" cy="5" r="0.75" fill="#94A3B8" />
//                           </svg>
//                         </IconBtn>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </div>

//       <div
//         style={{
//           padding: "14px 20px",
//           borderTop: "1px solid #F1F5F9",
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           flexWrap: "wrap",
//           gap: 12,
//         }}
//       >
//         <span style={{ fontSize: 13, color: "#64748B" }}>
//           Page {currentPage} of {totalPages}
//         </span>
//         <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
//           <PageBtn
//             label="< Previous"
//             disabled={currentPage === 1}
//             onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
//           />
//           {pageNumbers[0] > 1 && (
//             <>
//               <PageBtn label="1" onClick={() => setCurrentPage(1)} />
//               {pageNumbers[0] > 2 && (
//                 <span style={{ padding: "0 4px", color: "#94A3B8" }}>...</span>
//               )}
//             </>
//           )}
//           {pageNumbers.map((page) => (
//             <PageBtn
//               key={page}
//               label={String(page)}
//               active={page === currentPage}
//               onClick={() => setCurrentPage(page)}
//             />
//           ))}
//           {pageNumbers[pageNumbers.length - 1] < totalPages && (
//             <>
//               {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
//                 <span style={{ padding: "0 4px", color: "#94A3B8" }}>...</span>
//               )}
//               <PageBtn label={String(totalPages)} onClick={() => setCurrentPage(totalPages)} />
//             </>
//           )}
//           <PageBtn
//             label="Next >"
//             disabled={currentPage === totalPages}
//             onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };
