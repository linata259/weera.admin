import React, { useState, useCallback, useEffect, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar, { NavItem, NavGroup } from "../components/Sidebar";
import { NavbarProvider } from "../hooks/Navbarcontext";
import { usePermissions } from "../features/rolesPermissions/hooks/usePermissions";


const NAV_FEATURES: NavGroup[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: "⊞" },
  {
    id: "users",
    label: "User Management",
    path: "/users",
    icon: "👥",
    children: [
      { id: "users-analytics", label: "Analytics", path: "/users/analytics" },
      { id: "users", label: "Users", path: "/users" },
    ],
  },
  {
    id: "jobs",
    label: "Job Management",
    path: "/jobs",
    icon: "💼",
    children: [
      { id: "jobs-analytics", label: "Analytics", path: "/jobs/analytics" },
      { id: "jobs", label: "Jobs", path: "/jobs" },
      { id: "reports", label: "Reports", path: "/jobs/reports" },
    ],

  },
  { id: "help-support", label: "Help & Support", path: "/help-support", icon: "?" },
  {
    id: "chats",
    label: "Chat Moderation",
    path: "/chats",
    icon: "💬",
  },

  {
    id: "financials",
    label: "Financials",
    path: "/financials",
    icon: "💰",
  },
  {
    id: "skills",
    label: "Skills",
    path: "/skills",
    icon: "🎯",
  },
  {
    id: "locations",
    label: "Locations",
    path: "/locations",
    icon: "📍",
  },
  {
    id: "notifications",
    label: "Notifications",
    path: "/notifications",
    icon: "🔔",
  },
  {
    id: "roles",
    label: "Roles & Permissions",
    path: "/roles",
    icon: "🛡️",
    children: [
      { id: "roles-users", label: "Admin Users", path: "/roles" },
      { id: "roles-manage", label: "Manage Roles", path: "/roles/manage" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: "⚙️",
  },
];

// ── Role-restricted navigation ────────────────────────────────
// Roles listed here get a reduced sidebar and are redirected away from
// any path outside their allow-list. Roles not listed (Super Admin,
// Admin, legacy admins) see the full NAV_FEATURES.
const ROLE_ACCESS: Record<string, { nav: NavGroup[]; allowed: string[] }> = {
  Finance: {
    nav: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: "⊞" },
      { id: "financials", label: "Financials", path: "/financials", icon: "💰" },
      { id: "users-analytics", label: "User Analytics", path: "/users/analytics", icon: "👥" },
      { id: "jobs-analytics", label: "Job Analytics", path: "/jobs/analytics", icon: "💼" },
    ],
    allowed: ["/dashboard", "/financials", "/users/analytics", "/jobs/analytics"],
  },
  Marketing: {
    // dashboard only for now — more modules will be added later
    nav: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: "⊞" },
    ],
    allowed: ["/dashboard"],
  },
  "Customer Care": {
    nav: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: "⊞" },
      {
        id: "users",
        label: "User Management",
        path: "/users",
        icon: "👥",
        children: [
          { id: "users-analytics", label: "Analytics", path: "/users/analytics" },
          { id: "users", label: "Users", path: "/users" },
        ],
      },
      {
        id: "jobs",
        label: "Job Management",
        path: "/jobs",
        icon: "💼",
        children: [
          { id: "jobs-analytics", label: "Analytics", path: "/jobs/analytics" },
          { id: "jobs", label: "Jobs", path: "/jobs" },
          { id: "reports", label: "Reports", path: "/jobs/reports" },
        ],
      },
      { id: "help-support", label: "Help & Support", path: "/help-support", icon: "?" },
      { id: "chats", label: "Chat Moderation", path: "/chats", icon: "💬" },
      { id: "notifications", label: "Notifications", path: "/notifications", icon: "🔔" },
      { id: "skills", label: "Skills", path: "/skills", icon: "🎯" },
      { id: "locations", label: "Locations", path: "/locations", icon: "📍" },
    ],
    allowed: [
      "/dashboard", "/users", "/jobs", "/help-support", "/chats",
      "/notifications", "/skills", "/locations",
    ],
  },
};

export const AdminLayout: React.FC<React.PropsWithChildren<{}>> = memo(
  ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [openTabs, setOpenTabs] = useState<NavItem[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const { loading: permsLoading, roleName } = usePermissions();
    const roleAccess = roleName ? ROLE_ACCESS[roleName] : undefined;
    const navFeatures = roleAccess ? roleAccess.nav : NAV_FEATURES;

    // hard redirect if a restricted role opens a URL outside its scope
    useEffect(() => {
      if (permsLoading || !roleAccess) return;
      const allowed = roleAccess.allowed.some(
        (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
      );
      if (!allowed) navigate("/dashboard", { replace: true });
    }, [permsLoading, roleAccess, location.pathname, navigate]);

    useEffect(() => {
      const mq = window.matchMedia("(max-width: 768px)");
      setIsMobile(mq.matches);
      const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }, []);

    const sidebarWidth = isMobile ? 0 : collapsed ? 56 : 280;
    const navbarHeight = 64;

    const handleNavigate = useCallback((item: NavItem) => {
      setOpenTabs((prev) => {
        const exists = prev.find((t) => t.id === item.id);
        return exists ? prev : [...prev, item];
      });
    }, []);

    const handleCloseTab = useCallback(
      (id: string) => {
        setOpenTabs((prev) => {
          const idx = prev.findIndex((t) => t.id === id);
          const next = prev.filter((t) => t.id !== id);
          if (next.length > 0) {
            navigate(next[Math.max(0, idx - 1)].path);
          } else {
            navigate("/dashboard");
          }
          return next;
        });
      },
      [navigate],
    );

    const handleToggleCollapse = useCallback(() => setCollapsed((c) => !c), []);
    const handleMobileClose = useCallback(() => setMobileSidebarOpen(false), []);
    const handleMenuClick = useCallback(() => setMobileSidebarOpen(true), []);

    // Don't render ANY page or navigation until the role is resolved —
    // prevents the Super Admin dashboard/sidebar flashing for other roles.
    if (permsLoading) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", background: "#F9FBFC",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "3px solid #E2E8F0", borderTopColor: "#EA580C",
            animation: "weera-perm-spin 0.7s linear infinite",
          }} />
          <style>{`@keyframes weera-perm-spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      );
    }

    return (
      // NavbarProvider wraps everything so any page can push a breadcrumb
      // into the top bar via useNavbar()
      <NavbarProvider>
        <div style={{ minHeight: "100vh", background: "#F9FBFC" }}>
          <Sidebar
            features={navFeatures}
            collapsed={collapsed}
            onToggle={handleToggleCollapse}
            onNavigate={handleNavigate}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={handleMobileClose}
          />
          <Navbar
            sidebarWidth={sidebarWidth}
            openTabs={openTabs}
            onCloseTab={handleCloseTab}
            isMobile={isMobile}
            onMenuClick={handleMenuClick}
          />
          <main
            style={{
              marginLeft: sidebarWidth,
              marginTop: navbarHeight,
              padding: isMobile ? 16 : 24,
              minHeight: `calc(100vh - ${navbarHeight}px)`,
              boxSizing: "border-box",
              transition: "margin-left 0.25s ease",
              overflow: "auto",
            }}
          >
            {children}
          </main>
        </div>
      </NavbarProvider>
    );
  }
);

export default AdminLayout;