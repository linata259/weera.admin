import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Column, User } from "../types";
import { fetchUsers } from "../api/userServices";
import { TableToolbar } from "../components/table/TableToolbar";
import { UserTable } from "../components/table/UserTable";
import { ExportReportModal } from "../components/ExportReportModal"; // NEW

/* ── sanitise helpers (keep XSS out of rendered values) ─────── */
const sanitizeText = (v: string | null | undefined): string => {
  if (!v) return "";
  return v.replace(/<script.*?>.*?<\/script>/gi, "").replace(/<[^>]+>/g, "").replace(/[<>]/g, "").trim();
};
const sanitizePhone = (v: string | null | undefined): string =>
  v ? v.replace(/[^\d+]/g, "") : "";
const sanitizeImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const c = url.trim();
  return c.startsWith("http://") || c.startsWith("https://") ? c : null;
};

/* ── columns shown in the extra-columns area of the table ───── */
const COLUMNS: Column[] = [
  { key: "phone",    label: "Phone"    },
  { key: "email",    label: "Email"    },
  { key: "location", label: "Location" },
];

/* ────────────────────────────────────────────────────────────── */
const UsersPage: React.FC = () => {
  const [users,      setUsers]      = useState<User[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter,  setLocationFilter]  = useState("all");
  const [userTypeFilter,  setUserTypeFilter]  = useState<"all" | "clients" | "bidders">("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: "asc" | "desc" } | null>(null);
  const [showExport, setShowExport] = useState(false); // NEW

  /* ── fetch ───────────────────────────────────────────────── */
  useEffect(() => {
    fetchUsers()
      .then((data) => {
        const clean = data.map((u) => ({
          ...u,
          first_name:            sanitizeText(u.first_name),
          last_name:             sanitizeText(u.last_name),
          about_me:              sanitizeText(u.about_me),
          professional_headline: sanitizeText(u.professional_headline),
          phone:                 sanitizePhone(u.phone) || null,
          image_url:             sanitizeImageUrl(u.image_url),
          name:                  sanitizeText(u.name) || "Unknown User",
          location:              sanitizeText(u.location),
          location_names:        (u.location_names ?? []).map(sanitizeText),
          user_type_names:       (u.user_type_names ?? []).map(sanitizeText),
        }));
        setUsers(clean);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── sort ────────────────────────────────────────────────── */
  const handleSort = useCallback((key: keyof User) => {
    setSortConfig((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }, []);

  /* ── filter + sort pipeline ──────────────────────────────── */
  const filteredUsers = useMemo(() => {
    let list = users;

    /* search */
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          (u as any).email?.toLowerCase().includes(q) ||
          u.phone?.includes(q) ||
          u.professional_headline?.toLowerCase().includes(q)
      );
    }

    /* location */
    if (locationFilter !== "all") {
      list = list.filter((u) => (u.location_names ?? []).includes(locationFilter));
    }

    /* user type */
    if (userTypeFilter !== "all") {
      const want = userTypeFilter === "clients" ? "hire talent" : "find work";
      list = list.filter((u) =>
        (u.user_type_names ?? []).map((t) => t.toLowerCase()).includes(want)
      );
    }

    /* sort */
    if (sortConfig) {
      list = [...list].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sortConfig.key as string];
        const bv = (b as unknown as Record<string, unknown>)[sortConfig.key as string];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "string" && typeof bv === "string")
          return sortConfig.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortConfig.direction === "asc" ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
      });
    }

    return list;
  }, [users, searchTerm, locationFilter, userTypeFilter, sortConfig]);

  /* ── location options for toolbar dropdown ───────────────── */
  const locationOptions = useMemo(() =>
    Array.from(new Set(users.flatMap((u) => u.location_names ?? []).filter(Boolean)))
      .sort()
      .map((l) => ({ label: l, value: l })),
    [users]
  );

  /* ── suspend / unsuspend ─────────────────────────────────── */
  const handleSuspendUser = useCallback((user: User) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? { ...u, is_active: u.is_active === false ? true : false }
          : u
      )
    );
    // TODO: persist to Supabase: supabase.from('profiles').update({ is_active: ... }).eq('id', user.id)
  }, []);

  /* ── loading state ───────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontFamily: "'DM Sans', sans-serif", color: "#64748B" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTop: "3px solid #EA580C", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          Loading users…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      {/* NEW — export trigger */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowExport(true)}
          style={{
            padding: "10px 18px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff",
            fontSize: 14, fontWeight: 600, color: "#0F172A", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5v9M4.5 7l3.5 3.5L11.5 7" stroke="#EA580C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2.5 12.5v1a1 1 0 001 1h9a1 1 0 001-1v-1" stroke="#EA580C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export Report
        </button>
      </div>

      <TableToolbar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        locationOptions={locationOptions}
        locationFilter={locationFilter}
        onLocationChange={setLocationFilter}
        statusFilter="all"
        onStatusChange={() => {}}
        userTypeFilter={userTypeFilter}
        onUserTypeChange={setUserTypeFilter}
        visibleCols={new Set(COLUMNS.map((c) => c.key as string))}
        onToggleCol={() => {}}
      />

      <UserTable
        data={filteredUsers}
        columns={COLUMNS}
        onSort={handleSort}
        sortConfig={sortConfig}
        rowsPerPage={10}
        onSuspendUser={handleSuspendUser}
      />

      {/* NEW */}
      {showExport && (
        <ExportReportModal
          users={users}
          locationOptions={locationOptions}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
};

export default UsersPage;