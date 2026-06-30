import React, { useState, useCallback, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar, { NavItem, NavGroup } from "../components/Sidebar";
import { NavbarProvider } from "../hooks/Navbarcontext";


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
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: "⚙️",
  },
];

export const AdminLayout: React.FC<React.PropsWithChildren<{}>> = memo(
  ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [openTabs, setOpenTabs] = useState<NavItem[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const navigate = useNavigate();

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

    return (
      // NavbarProvider wraps everything so any page can push a breadcrumb
      // into the top bar via useNavbar()
      <NavbarProvider>
        <div style={{ minHeight: "100vh", background: "#F9FBFC" }}>
          <Sidebar
            features={NAV_FEATURES}
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