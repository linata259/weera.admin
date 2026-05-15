import React, { useState, useEffect } from "react";
import { useUsers } from "../hooks/useUsers";
import { fetchUsers } from "../api/userServices";
import { StatusFilter, UserTypeFilter } from "@features/shared/types";
import { ALL_EXTRA_COLUMNS, TableToolbar } from "../components/table/TableToolbar";
import { UserTable } from "../components/table/UserTable";
// import { UserTable, TableToolbar, ALL_EXTRA_COLUMNS } from "../components/table";
// import type { StatusFilter, UserTypeFilter } from "../components/table";

export interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  about_me: string | null;
  professional_headline: string | null;
  location_allowed: boolean | null;
  certifications: string[];
  location_id: string[];
  user_type_id: string[];
  skills_id: string[];
  profile_attachments: string[];
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Computed display helpers
  name: string;
  location: string;
  location_names: string[];
  user_type_names: string[];
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>("all");
  const [visibleCols,    setVisibleCols]    = useState<Set<string>>(
    new Set(ALL_EXTRA_COLUMNS.map((c) => c.key))
  );

  const { searchTerm, setSearchTerm, filteredAndSortedUsers: baseFiltered, requestSort, sortConfig } = useUsers(users);

  useEffect(() => {
    fetchUsers().then((data) => setUsers(data as User[]));
  }, []);

  const filteredAndSortedUsers = baseFiltered.filter((u) => {
    if (locationFilter !== "all" && !(u.location_names ?? []).includes(locationFilter)) return false;
    if (statusFilter !== "all") {
      const s = u.location_allowed === true ? "active" : u.location_allowed === false ? "suspended" : "pending";
      if (s !== statusFilter) return false;
    }
    if (userTypeFilter !== "all") {
      const typeNames = (u.user_type_names ?? []).map((t) => t.toLowerCase());
      const wantType  = userTypeFilter === "clients" ? "hire talent" : "find work";
      if (!typeNames.includes(wantType)) return false;
    }
    return true;
  });

  const locationOptions = Array.from(
    new Set(users.flatMap((u) => u.location_names ?? []).filter(Boolean))
  ).sort().map((l) => ({ label: l, value: l }));

  const toggleColVisibility = (key: string) =>
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const activeColumns = ALL_EXTRA_COLUMNS.filter((c) => visibleCols.has(c.key));

  const handleViewUser    = (user: User) => console.log("View user:", user);
  const handleSuspendUser = (user: User) => console.log("Toggle suspend:", user);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>

      <TableToolbar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        locationOptions={locationOptions}
        locationFilter={locationFilter}
        onLocationChange={setLocationFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        userTypeFilter={userTypeFilter}
        onUserTypeChange={setUserTypeFilter}
        visibleCols={visibleCols}
        onToggleCol={toggleColVisibility}
      />

      <UserTable
        data={filteredAndSortedUsers}
        columns={activeColumns}
        onSort={requestSort}
        sortConfig={sortConfig}
        onViewUser={handleViewUser}
        onSuspendUser={handleSuspendUser}
        rowsPerPage={10}
      />
    </div>
  );
};

export default Users;