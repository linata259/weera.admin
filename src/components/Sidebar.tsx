// Sidebar.tsx

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  IconLayoutGrid,
  IconUsers,
  IconBriefcase,
  IconCurrencyDollar,
  IconAlertTriangle,
  IconBell,
  IconShield,
  IconChartBar,
  IconSettings,
  IconMessageCircle,
  IconTarget,
  IconChevronDown,
  IconChevronRight,
  IconMapPin,
  IconLifebuoy,
} from "@tabler/icons-react";

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
  mobileOpen?: boolean;       // NEW
  onMobileClose?: () => void; // NEW
}

const WeeraIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <img
    // src="/images/app_icon_fg.png"
    src={`${process.env.PUBLIC_URL}/images/4.png`}
    width={size}
    height={size}
    alt="Weera logo"
    style={{
      objectFit: "contain",
      display: "block",
    }}
  />
);

// Tabler icons' component types resolve to a return type TS won't accept
// directly as a JSX tag under newer @types/react (TS2786). This wrapper casts
// once, in one place, instead of needing `as any` at every icon usage.
const Icon: React.FC<{ icon: (props: any) => any; size?: number }> = ({ icon, size }) => {
  const Component = icon as React.ComponentType<{ size?: number }>;
  return <Component size={size} />;
};

// NEW — maps nav labels to modern line icons; falls back to whatever was
// originally passed in `icon` (e.g. an emoji glyph) for anything unrecognized,
// so this works without needing to touch wherever `features` is built.
const getModernIcon = (label: string): React.ReactNode | null => {
  const l = label.toLowerCase();
  if (l.includes("dashboard")) return <Icon icon={IconLayoutGrid} size={18} />;
  if (l.includes("user")) return <Icon icon={IconUsers} size={18} />;
  if (l.includes("job")) return <Icon icon={IconBriefcase} size={18} />;
  if (l.includes("financ")) return <Icon icon={IconCurrencyDollar} size={18} />;
  if (l.includes("skill")) return <Icon icon={IconTarget} size={18} />;
  if (l.includes("location")) return <Icon icon={IconMapPin} size={18} />;
  if (l.includes("help") || l.includes("support")) return <Icon icon={IconLifebuoy} size={18} />;
  if (l.includes("chat") || l.includes("moderation")) return <Icon icon={IconMessageCircle} size={18} />;
  if (l.includes("dispute")) return <Icon icon={IconAlertTriangle} size={18} />;
  if (l.includes("notification")) return <Icon icon={IconBell} size={18} />;
  if (l.includes("role") || l.includes("permission")) return <Icon icon={IconShield} size={18} />;
  if (l.includes("report")) return <Icon icon={IconChartBar} size={18} />;
  if (l.includes("setting")) return <Icon icon={IconSettings} size={18} />;
  return null;
};

export const Sidebar: React.FC<SidebarProps> = ({
  features,
  collapsed = false,
  onToggle,
  onNavigate,
  mobileOpen = false,   // NEW
  onMobileClose,        // NEW
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    users: true,
  });

  // Icons/labels are black by default, orange on hover, orange while active.
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // NEW — same mobile-detection pattern used elsewhere in the app
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // On mobile the drawer always shows full labels — the icon-only
  // "collapsed" desktop state doesn't apply to a slide-in overlay.
  const effectiveCollapsed = isMobile ? false : collapsed; // NEW
  const width = effectiveCollapsed ? 78 : 280;

  const handleClick = (item: NavItem) => {
    navigate(item.path);
    onNavigate?.(item);
    if (isMobile) onMobileClose?.(); // NEW — auto-close drawer after navigating
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
    <>
      {/* NEW — mobile backdrop, closes the drawer on tap */}
      {isMobile && mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            zIndex: 99,
          }}
        />
      )}

      <aside
        style={{
          width,
          minWidth: width,
          height: "100vh",
          background: "#F8FAFC",
          borderRight: "1px solid #E2E8F0",
          display: "flex",
          flexDirection: "column",
          transition: isMobile ? "transform 0.25s ease" : "all 0.25s ease", // CHANGED
          overflow: "hidden",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 100,
          boxSizing: "border-box",
          // NEW — slide off-canvas on mobile when closed
          transform: isMobile
            ? mobileOpen
              ? "translateX(0)"
              : "translateX(-100%)"
            : "translateX(0)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            height: 64,
            minHeight: 64,
            padding: effectiveCollapsed ? "10px 12px" : "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: effectiveCollapsed ? "center" : "flex-start",
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
            {!effectiveCollapsed ? (
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
                        if (hasChildren && !effectiveCollapsed) {
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
                      onMouseEnter={() => setHoveredId(group.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      title={effectiveCollapsed ? group.label : undefined}
                      style={{
                        width: "100%",
                        height: 52,
                        border: "none",
                        borderRadius: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: effectiveCollapsed ? "center" : "flex-start",
                        gap: 14,
                        padding: effectiveCollapsed ? "0" : "0 16px",
                        background: groupActive ? PRIMARY_LIGHT : "transparent",
                        color: groupActive || hoveredId === group.id ? PRIMARY_TEXT : "#000000",
                        fontWeight: groupActive ? 600 : 500,
                        fontSize: 14,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* ICON — Tabler icons, label-matched */}
                      <span
                        style={{
                          flexShrink: 0,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {getModernIcon(group.label) ?? group.icon}
                      </span>

                      {/* LABEL */}
                      {!effectiveCollapsed && (
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

                          {/* CHEVRON — Tabler icons instead of text glyphs */}
                          {hasChildren && (
                            <span
                              style={{
                                marginLeft: "auto",
                                display: "flex",
                                alignItems: "center",
                                opacity: 0.7,
                              }}
                            >
                              {isOpen ? <Icon icon={IconChevronDown} size={14} /> : <Icon icon={IconChevronRight} size={14} />}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </li>

                  {/* CHILDREN */}
                  {!effectiveCollapsed &&
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
                            onMouseEnter={() => setHoveredId(child.id)}
                            onMouseLeave={() => setHoveredId(null)}
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
                              color: childActive || hoveredId === child.id ? PRIMARY_TEXT : "#000000",
                              fontWeight: childActive ? 600 : 400,
                              fontSize: 13,
                              transition: "all 0.2s ease",
                            }}
                          >
                            {/* Tabler icons, label-matched, falls back to original */}
                            {child.icon && (
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                {getModernIcon(child.label) ?? child.icon}
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
    </>
  );
};

export default Sidebar;