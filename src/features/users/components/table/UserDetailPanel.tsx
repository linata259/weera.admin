import React, { useEffect, useState } from "react";
import { User, deriveStatus } from "../../types";
import { StatusBadge } from "../../../shared/StatusBadge";
import { Avatar } from "../../../shared/Avatar";
import { CurrentJobsTab } from "../currentjobs";
import { FinancialTab } from "../Financialtab";


interface Props {
  user: User;
  onClose: () => void;
  onSuspend?: (user: User) => void;
}

const USER_TYPE_LABEL: Record<string, string> = {
  "find work": "Freelancer",
  "hire talent": "Client",
};

type Tab = "basic" | "jobs" | "financial";

const ORANGE = "#EA580C";
const NAVY = "#0F172A";
const SLATE = "#64748B";
const BORDER = "#E2E8F0";
const BG = "#F8FAFC";

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      fontSize: 11,
      fontWeight: 700,
      color: SLATE,
      textTransform: "uppercase",
      letterSpacing: 0.9,
    }}
  >
    {children}
  </span>
);
const Value: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: 14, color: NAVY, fontWeight: 500 }}>{children}</span>
);
const EmptyValue: React.FC = () => (
  <span style={{ fontSize: 14, color: "#CBD5E1" }}>—</span>
);
const InfoField: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <Label>{label}</Label>
    {value ? <Value>{value}</Value> : <EmptyValue />}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div
    style={{
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      overflow: "hidden",
      background: "#fff",
    }}
  >
    <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: NAVY,
          textTransform: "uppercase",
          letterSpacing: 0.7,
        }}
      >
        {title}
      </span>
    </div>
    <div style={{ padding: "18px 20px" }}>{children}</div>
  </div>
);

const Chip: React.FC<{ label: string; accent?: boolean }> = ({
  label,
  accent,
}) => (
  <span
    style={{
      padding: "5px 14px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 500,
      background: accent ? "#FFF7ED" : "#F1F5F9",
      color: accent ? ORANGE : "#475569",
      border: `1px solid ${accent ? "#FDBA74" : BORDER}`,
      display: "inline-block",
    }}
  >
    {label}
  </span>
);

interface PortfolioItem {
  title: string;
  link: string;
}
interface UserExtended extends User {
  email?: string;
  hourly_rate?: string | number;
  availability?: string;
  timezone?: string;
  total_worked_hours?: string | number;
  total_worked_projects?: string | number;
  total_earned?: string | number;
  preferred_project_types?: string[];
  portfolio_items?: PortfolioItem[];
  reviews?: { average: number; count: number };
}

const BasicInfoTab: React.FC<{ user: UserExtended }> = ({ user }) => {
  const types = (user.user_type_names ?? [])
    .map((t: string) => USER_TYPE_LABEL[t.toLowerCase()] ?? t)
    .join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section title="Basic Info">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "18px 32px",
          }}
        >
          <InfoField label="Mobile No." value={user.phone ?? undefined} />
          <InfoField label="Email" value={user.email} />
          <InfoField
            label="Location"
            value={
              (user.location_names ?? []).join(", ") ||
              user.location ||
              undefined
            }
          />
          <InfoField label="User Type" value={types || undefined} />
          <InfoField
            label="Joined"
            value={
              user.created_at
                ? new Date(user.created_at).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : undefined
            }
          />
          <InfoField
            label="Location Allowed"
            value={
              user.location_allowed === true
                ? "Yes"
                : user.location_allowed === false
                  ? "No"
                  : undefined
            }
          />
        </div>
      </Section>

      {user.about_me && (
        <Section title="About">
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#334155",
              lineHeight: 1.75,
            }}
          >
            {user.about_me}
          </p>
        </Section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Section title="Skills">
          {(user.skills_id ?? []).length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(user.skills_id ?? []).map((s: string, i: number) => (
                <Chip key={i} label={s} />
              ))}
            </div>
          ) : (
            <EmptyValue />
          )}
        </Section>
        <Section title="Preferred Project Types">
          {(user.preferred_project_types ?? []).length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(user.preferred_project_types ?? []).map(
                (t: string, i: number) => (
                  <Chip key={i} label={t} accent />
                ),
              )}
            </div>
          ) : (
            <EmptyValue />
          )}
        </Section>
      </div>

      <Section title="Certifications">
        {(user.certifications ?? []).length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(user.certifications ?? []).map((c: string, i: number) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  background: BG,
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: ORANGE,
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: 14, color: NAVY }}>{c}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyValue />
        )}
      </Section>

      {(user.hourly_rate || user.availability || user.timezone) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          {user.hourly_rate && (
            <Section title="Hourly Rate">
              <Value>{`$${user.hourly_rate}/Hour`}</Value>
            </Section>
          )}
          {user.availability && (
            <Section title="Availability">
              <Value>{user.availability}</Value>
            </Section>
          )}
          {user.timezone && (
            <Section title="Time Zone">
              <Value>{user.timezone}</Value>
            </Section>
          )}
        </div>
      )}

      {(user.portfolio_items ?? []).length > 0 && (
        <Section
          title={`Portfolio Items (${(user.portfolio_items ?? []).length})`}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {(user.portfolio_items ?? []).map(
              (item: PortfolioItem, i: number) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 16px",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    background: BG,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: SLATE,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      marginBottom: 4,
                    }}
                  >
                    Project Title
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: NAVY,
                      marginBottom: 8,
                    }}
                  >
                    {item.title}
                  </div>
                  {item.link && (
                    <>
                      <div
                        style={{
                          fontSize: 11,
                          color: SLATE,
                          textTransform: "uppercase",
                          letterSpacing: 0.6,
                          marginBottom: 3,
                        }}
                      >
                        Link
                      </div>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 13, color: ORANGE }}
                      >
                        {item.link}
                      </a>
                    </>
                  )}
                </div>
              ),
            )}
          </div>
        </Section>
      )}

      {(user.profile_attachments ?? []).length > 0 && (
        <Section title="Attachments">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(user.profile_attachments ?? []).map((att: string, i: number) => (
              <a
                key={i}
                href={att}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13,
                  color: ORANGE,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M14 10v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2M8 2v8M5 5l3-3 3 3"
                    stroke={ORANGE}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {att}
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};


/* ─── MAIN PANEL ─────────────────────────────────────────────── */
export const UserDetailPanel: React.FC<Props> = ({
  user,
  onClose,
  onSuspend,
}) => {
  const [tab, setTab] = useState<Tab>("basic");
  const status = deriveStatus(user);
  const extUser = user as UserExtended;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const types = (user.user_type_names ?? [])
    .map((t: string) => USER_TYPE_LABEL[t.toLowerCase()] ?? t)
    .join(", ");

  const TABS = [
    { id: "basic" as Tab, label: "Basic Info" },
    { id: "jobs" as Tab, label: "Current Jobs" },
    { id: "financial" as Tab, label: "Financial Status" },
  ];

  const totalWorked = (() => {
    const h = extUser.total_worked_hours;
    const p = extUser.total_worked_projects;
    if (h && p) return `${h} Hrs / ${p} Projects`;
    if (h) return `${h} Hrs`;
    if (p) return `${p} Projects`;
    return null;
  })();

  interface SidebarStat {
    label: string;
    value: string;
  }
  const sidebarStats: SidebarStat[] = [
    { label: "Total Worked", value: totalWorked ?? "" },
    {
      label: "Total Earned",
      value: extUser.total_earned ? `$${extUser.total_earned}` : "",
    },
    {
      label: "Reviews",
      value: extUser.reviews
        ? `${extUser.reviews.average}/5 (${extUser.reviews.count} Reviews)`
        : "",
    },
    {
      label: "Joined WEERA",
      value: user.created_at
        ? new Date(user.created_at).getFullYear().toString()
        : "",
    },
  ].filter((s): s is SidebarStat => Boolean(s.value));

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.35)",
          backdropFilter: "blur(2px)",
          zIndex: 100,
          animation: "fadeIn 0.18s ease",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          left: "max(280px, calc(100vw - 1640px))",
          background: "#fff",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.22s ease",
          fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            height: 56,
            padding: "0 28px",
            flexShrink: 0,
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: SLATE,
            }}
          >
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 3L5 8l5 5"
                  stroke={SLATE}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span>User Management</span>
            <span style={{ color: "#CBD5E1" }}>/</span>
            <span style={{ color: NAVY, fontWeight: 600 }}>User Info</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left sidebar */}
          <div
            style={{
              width: 280,
              flexShrink: 0,
              borderRight: `1px solid ${BORDER}`,
              display: "flex",
              flexDirection: "column",
              background: BG,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                padding: "28px 24px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <Avatar src={user.image_url} name={user.name} size={80} />
              <div
                style={{
                  marginTop: 14,
                  fontSize: 16,
                  fontWeight: 700,
                  color: NAVY,
                }}
              >
                {user.name || "—"}
              </div>
              {user.professional_headline && (
                <div
                  style={{
                    fontSize: 12,
                    color: SLATE,
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  {user.professional_headline}
                </div>
              )}
              {types && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    color: ORANGE,
                    background: "#FFF7ED",
                    border: "1px solid #FDBA74",
                    borderRadius: 20,
                    padding: "4px 12px",
                  }}
                >
                  {types}
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <StatusBadge status={status} />
              </div>
            </div>

            {sidebarStats.length > 0 && (
              <div
                style={{
                  padding: "18px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                {sidebarStats.map((s, i) => (
                  <div key={i}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: SLATE,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        marginBottom: 3,
                      }}
                    >
                      {s.label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ flex: 1 }} />
            <div
              style={{
                padding: "18px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <button
                onClick={() => onSuspend?.(user)}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "1.5px solid #FEE2E2",
                  background: "#FFF5F5",
                  color: "#DC2626",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {status === "suspended" ? "Unsuspend User" : "Suspend User"}
              </button>
              <button
                onClick={onClose}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: NAVY,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Close
              </button>
            </div>
          </div>

          {/* Right: tabs + content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: BG,
            }}
          >
            {/* Tab bar */}
            <div
              style={{
                background: "#fff",
                borderBottom: `1px solid ${BORDER}`,
                padding: "0 28px",
                display: "flex",
                gap: 0,
                flexShrink: 0,
              }}
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: "16px 22px",
                    border: "none",
                    background: "none",
                    fontSize: 14,
                    fontWeight: tab === t.id ? 700 : 500,
                    color: tab === t.id ? ORANGE : SLATE,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    borderBottom:
                      tab === t.id
                        ? `2.5px solid ${ORANGE}`
                        : "2.5px solid transparent",
                    marginBottom: -1,
                    transition: "color 0.15s",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
              {tab === "basic" && <BasicInfoTab user={extUser} />}
              {tab === "jobs" && <CurrentJobsTab user={user} />}
              {tab === "financial" && <FinancialTab user={extUser} />}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
    </>
  );
};
