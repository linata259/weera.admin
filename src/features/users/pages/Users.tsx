import React, { useState, useEffect } from "react";
import { useUsers } from "../hooks/useUsers";
import { fetchUsers } from "../api/userServices";
import { StatusFilter, UserTypeFilter } from "@features/shared/types";
import {
  ALL_EXTRA_COLUMNS,
  TableToolbar,
} from "../components/table/TableToolbar";
import { UserTable } from "../components/table/UserTable";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

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

  /* Computed display helpers */
  name: string;
  location: string;
  location_names: string[];
  user_type_names: string[];
}

/* -------------------------------------------------------------------------- */
/*                              SANITIZE HELPERS                              */
/* -------------------------------------------------------------------------- */

const sanitizeText = (value: string | null): string => {
  if (!value) return "";

  return value
    .replace(/<script.*?>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[<>]/g, "")
    .trim();
};

const sanitizePhone = (value: string | null): string => {
  if (!value) return "";

  return value.replace(/[^\d+]/g, "");
};

const sanitizeImageUrl = (url: string | null): string | null => {
  if (!url) return null;

  const clean = url.trim();

  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://")
  ) {
    return clean;
  }

  return null;
};

/* -------------------------------------------------------------------------- */
/*                                MAIN SCREEN                                 */
/* -------------------------------------------------------------------------- */

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  const [locationFilter, setLocationFilter] =
    useState<string>("all");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [userTypeFilter, setUserTypeFilter] =
    useState<UserTypeFilter>("all");

  const [visibleCols, setVisibleCols] =
    useState<Set<string>>(
      new Set(ALL_EXTRA_COLUMNS.map((c) => c.key))
    );

  const {
    searchTerm,
    setSearchTerm,
    filteredAndSortedUsers: baseFiltered,
    requestSort,
    sortConfig,
  } = useUsers(users);

  /* ---------------------------------------------------------------------- */
  /*                            FETCH + SANITIZE                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    fetchUsers().then((data) => {
      const sanitizedUsers = (data as User[]).map((user) => {
        const safeFirstName = sanitizeText(user.first_name);
        const safeLastName = sanitizeText(user.last_name);

        const safeName =
          `${safeFirstName} ${safeLastName}`.trim() || "Unknown User";

        return {
          ...user,

          first_name: safeFirstName,
          last_name: safeLastName,

          about_me: sanitizeText(user.about_me),

          professional_headline: sanitizeText(
            user.professional_headline
          ),

          phone: sanitizePhone(user.phone),

          image_url: sanitizeImageUrl(user.image_url),

          name: safeName,

          location: sanitizeText(user.location),

          location_names: (user.location_names ?? []).map(
            sanitizeText
          ),

          user_type_names: (
            user.user_type_names ?? []
          ).map(sanitizeText),
        };
      });

      setUsers(sanitizedUsers);
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                                FILTERING                               */
  /* ---------------------------------------------------------------------- */

  const filteredAndSortedUsers = baseFiltered.filter((u) => {
    /* Location filter */

    if (
      locationFilter !== "all" &&
      !(u.location_names ?? []).includes(locationFilter)
    ) {
      return false;
    }

    /* Status filter */

    if (statusFilter !== "all") {
      const s =
        u.location_allowed === true
          ? "active"
          : "active"; // default to active if field is missing, since most users are active

      if (s !== statusFilter) return false;
    }

    /* User type filter */

    if (userTypeFilter !== "all") {
      const typeNames = (u.user_type_names ?? []).map((t) =>
        t.toLowerCase()
      );

      const wantType =
        userTypeFilter === "clients"
          ? "hire talent"
          : "find work";

      if (!typeNames.includes(wantType)) return false;
    }

    return true;
  });

  /* ---------------------------------------------------------------------- */
  /*                             LOCATION OPTIONS                           */
  /* ---------------------------------------------------------------------- */

  const locationOptions = Array.from(
    new Set(
      users
        .flatMap((u) => u.location_names ?? [])
        .filter(Boolean)
    )
  )
    .sort()
    .map((l) => ({
      label: l,
      value: l,
    }));

  /* ---------------------------------------------------------------------- */
  /*                            COLUMN VISIBILITY                           */
  /* ---------------------------------------------------------------------- */

  const toggleColVisibility = (key: string) =>
    setVisibleCols((prev) => {
      const next = new Set(prev);

      next.has(key)
        ? next.delete(key)
        : next.add(key);

      return next;
    });

  const activeColumns = ALL_EXTRA_COLUMNS.filter((c) =>
    visibleCols.has(c.key)
  );

  /* ---------------------------------------------------------------------- */
  /*                                ACTIONS                                 */
  /* ---------------------------------------------------------------------- */

  const handleViewUser = (user: User) => {
    console.log("View user:", user);
  };

  const handleSuspendUser = (user: User) => {
    console.log("Toggle suspend:", user);
  };

  /* ---------------------------------------------------------------------- */
  /*                                  UI                                    */
  /* ---------------------------------------------------------------------- */

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily:
          "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* ----------------------------- TOOLBAR ----------------------------- */}

      <TableToolbar
        // users={users}
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

      {/* ------------------------------ TABLE ------------------------------ */}
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