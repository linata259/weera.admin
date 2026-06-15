import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar, { NavItem, NavGroup } from "../components/Sidebar";

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
];

export const AdminLayout: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openTabs, setOpenTabs] = useState<NavItem[]>([]);
  const navigate = useNavigate();
  const sidebarWidth = collapsed ? 56 : 280;
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

  return (
    <div style={{ minHeight: "100vh", background: "#F9FBFC" }}>
      <Sidebar
        features={NAV_FEATURES}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onNavigate={handleNavigate}
      />
      <Navbar
        sidebarWidth={sidebarWidth}
        openTabs={openTabs}
        onCloseTab={handleCloseTab}
      />
      <main
        style={{
          marginLeft: sidebarWidth,
          marginTop: navbarHeight,
          padding: 24,
          minHeight: `calc(100vh - ${navbarHeight}px)`,
          boxSizing: "border-box",
          transition: "margin-left 0.25s ease",
          overflow: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;