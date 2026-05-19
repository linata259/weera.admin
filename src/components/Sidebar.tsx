// Sidebar.tsx

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PRIMARY = "#EA580C";
const PRIMARY_LIGHT = "#FFF4EE";
const PRIMARY_TEXT = "#EA580C";

export type NavItem = {
  id: string;
  label: string;
  path: string;
  icon?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  path: string;
  icon?: string;
  children?: NavItem[];
};

interface SidebarProps {
  features: NavGroup[];
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: (item: NavItem) => void;
}

const WeeraIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <img
    src="/images/app_icon_fg.png"
    width={size}
    height={size}
    alt="Weera logo"
    style={{
      objectFit: "contain",
      display: "block",
    }}
  />
);

export const Sidebar: React.FC<SidebarProps> = ({
  features,
  collapsed = false,
  onToggle,
  onNavigate,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    users: true,
  });

  const width = collapsed ? 78 : 280;

  const handleClick = (item: NavItem) => {
    navigate(item.path);
    onNavigate?.(item);
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isPathActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <aside
      style={{
        width,
        minWidth: width,
        height: "100vh",
        background: "#F8FAFC",
        borderRight: "1px solid #E2E8F0",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.25s ease",
        overflow: "hidden",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 100,
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      {/* HEADER */}
      <div
        style={{
          height: 64,
          minHeight: 64,
          padding: collapsed ? "10px 12px" : "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: "1px solid #E2E8F0",
          boxSizing: "border-box",
        }}
      >
        {/* LOGO BUTTON */}
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            width: "100%",
          }}
        >
          {!collapsed ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* LOGO */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: PRIMARY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 2px 8px ${PRIMARY}35`,
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
              >
                <WeeraIcon size={24} />
              </div>

              {/* LABEL */}
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 1,
                  color: "#0F172A",
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                WEERA
              </span>
            </div>
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: PRIMARY,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                boxShadow: `0 2px 8px ${PRIMARY}35`,
                transition: "all 0.2s ease",
              }}
            >
              <WeeraIcon size={24} />
            </div>
          )}
        </button>
      </div>

      {/* NAVIGATION */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "14px 10px",
        }}
      >
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {features.map((group) => {
            const groupActive = isPathActive(group.path);

            const hasChildren = !!group.children?.length;

            const isOpen = openGroups[group.id];

            return (
              <React.Fragment key={group.id}>
                {/* PARENT ITEM */}
                <li>
                  <button
                    onClick={() => {
                      if (hasChildren && !collapsed) {
                        toggleGroup(group.id);
                      } else {
                        handleClick({
                          id: group.id,
                          label: group.label,
                          path: group.path,
                          icon: group.icon,
                        });
                      }
                    }}
                    title={collapsed ? group.label : undefined}
                    style={{
                      width: "100%",
                      height: 52,
                      border: "none",
                      borderRadius: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: 14,
                      padding: collapsed ? "0" : "0 16px",
                      background: groupActive ? PRIMARY_LIGHT : "transparent",
                      color: groupActive ? PRIMARY_TEXT : "#475569",
                      fontWeight: groupActive ? 600 : 500,
                      fontSize: 14,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* ICON */}
                    <span
                      style={{
                        fontSize: 20,
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      {group.icon}
                    </span>

                    {/* LABEL */}
                    {!collapsed && (
                      <>
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {group.label}
                        </span>

                        {/* CHEVRON */}
                        {hasChildren && (
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: 12,
                              opacity: 0.7,
                            }}
                          >
                            {isOpen ? "▾" : "▸"}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </li>

                {/* CHILDREN */}
                {!collapsed &&
                  hasChildren &&
                  isOpen &&
                  group.children?.map((child) => {
                    const childActive = isPathActive(child.path);

                    return (
                      <li
                        key={child.id}
                        style={{
                          paddingLeft: 18,
                        }}
                      >
                        <button
                          onClick={() => handleClick(child)}
                          style={{
                            width: "100%",
                            height: 44,
                            border: "none",
                            borderRadius: 12,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "0 14px",
                            background: childActive
                              ? PRIMARY_LIGHT
                              : "transparent",
                            color: childActive ? PRIMARY_TEXT : "#64748B",
                            fontWeight: childActive ? 600 : 400,
                            fontSize: 13,
                            transition: "all 0.2s ease",
                          }}
                        >
                          {child.icon && (
                            <span
                              style={{
                                fontSize: 16,
                              }}
                            >
                              {child.icon}
                            </span>
                          )}

                          <span>{child.label}</span>
                        </button>
                      </li>
                    );
                  })}
              </React.Fragment>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
