import React, { useEffect, useMemo, useState } from "react";
import {
  fetchSupportTickets,
  updateSupportTicketStatus,
} from "../api/supportTicketService";
import { SupportTicketDetailPanel } from "../components/table/SupportTicketDetailPanel";
import { SupportTicketTable } from "../components/table/SupportTicketTable";
import { SupportToolbar } from "../components/table/SupportToolbar";
import { useSupportTickets } from "../hooks/useSupportTickets";
import type { SupportTicket } from "../types";

const SUPPORT_NOTES_STORAGE_KEY = "weera_admin_support_ticket_notes";

const statCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  padding: 16,
  minHeight: 92,
  boxSizing: "border-box",
  display: "grid",
  alignContent: "space-between",
};

const loadSavedNotes = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(SUPPORT_NOTES_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const HelpSupport: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    searchTerm,
    setSearchTerm,
    filteredAndSortedTickets: baseFiltered,
    requestSort,
    sortConfig,
  } = useSupportTickets(tickets);

  useEffect(() => {
    setLoading(true);
    fetchSupportTickets(loadSavedNotes())
      .then((data) => {
        setTickets(data);
        setErrorMessage("");
      })
      .catch((error) => {
        console.error("Support tickets fetch failed:", error);
        setErrorMessage("Unable to load support tickets from Supabase.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTickets = baseFiltered.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) {
      return false;
    }

    if (userTypeFilter !== "all" && ticket.user?.userType !== userTypeFilter) {
      return false;
    }

    return true;
  });

  const userTypeOptions = useMemo(() => {
    return Array.from(
      new Set(tickets.map((ticket) => ticket.user?.userType).filter(Boolean))
    )
      .sort()
      .map((value) => ({
        label: value as string,
        value: value as string,
      }));
  }, [tickets]);

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === "open").length;
    const inProgress = tickets.filter((ticket) => ticket.status === "in_progress").length;
    const resolved = tickets.filter((ticket) => ticket.status === "resolved").length;

    return {
      total: tickets.length,
      open,
      inProgress,
      resolved,
    };
  }, [tickets]);

  const handleStatusChange = async (ticket: SupportTicket, status: string) => {
    const updatedAt = new Date().toISOString();
    const previousTickets = tickets;
    const nextTicket = { ...ticket, status, updatedAt };

    setTickets((prev) =>
      prev.map((item) => (item.id === ticket.id ? nextTicket : item))
    );
    setSelectedTicket(nextTicket);

    const saved = await updateSupportTicketStatus(ticket.id, status);

    if (!saved) {
      setTickets(previousTickets);
      setSelectedTicket(ticket);
      setErrorMessage("Unable to update ticket status in Supabase.");
    }
  };

  const handleAdminNotesChange = (ticket: SupportTicket, adminNotes: string) => {
    const savedNotes = {
      ...loadSavedNotes(),
      [ticket.id]: adminNotes,
    };

    localStorage.setItem(SUPPORT_NOTES_STORAGE_KEY, JSON.stringify(savedNotes));

    const nextTicket = { ...ticket, adminNotes };

    setTickets((prev) =>
      prev.map((item) => (item.id === ticket.id ? nextTicket : item))
    );
    setSelectedTicket(nextTicket);
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {[
          { label: "Total Tickets", value: stats.total },
          { label: "Open", value: stats.open },
          { label: "In Progress", value: stats.inProgress },
          { label: "Resolved", value: stats.resolved },
        ].map((stat) => (
          <div key={stat.label} style={statCardStyle}>
            <div style={{ color: "#64748B", fontSize: 13, fontWeight: 700 }}>
              {stat.label}
            </div>
            <div style={{ color: "#0F172A", fontSize: 28, fontWeight: 800 }}>
              {stat.value.toLocaleString("en-US")}
            </div>
          </div>
        ))}
      </div>

      <SupportToolbar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        userTypeFilter={userTypeFilter}
        onUserTypeChange={setUserTypeFilter}
        userTypeOptions={userTypeOptions}
      />

      {errorMessage && (
        <div
          style={{
            padding: 14,
            border: "1px solid #FCA5A5",
            borderRadius: 10,
            color: "#B91C1C",
            background: "#FEF2F2",
            fontSize: 14,
          }}
        >
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E8EDF2",
            borderRadius: 16,
            padding: 48,
            color: "#64748B",
            textAlign: "center",
          }}
        >
          Loading support tickets ...
        </div>
      ) : (
        <SupportTicketTable
          tickets={filteredTickets}
          onSort={requestSort}
          sortConfig={sortConfig}
          onViewTicket={setSelectedTicket}
          rowsPerPage={10}
        />
      )}

      {selectedTicket && (
        <SupportTicketDetailPanel
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={handleStatusChange}
          onAdminNotesChange={handleAdminNotesChange}
        />
      )}
    </div>
  );
};

export default HelpSupport;
