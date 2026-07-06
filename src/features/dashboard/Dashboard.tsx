import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { DashboardStatId, DateRangeOption } from "./types";

import { DashboardHeader } from "./components/DashboardHeader";
import { StatCard } from "./components/StatCard";
import { UserGrowthChart } from "./components/UserGrowthChart";
import { ActivityFeed } from "./components/ActivityFeed";

import { useDashboardStats } from "./hooks/useDashboardStats";
import { useAppHealth } from "./hooks/useAppHealth";
import { HealthOverview } from "./components/HealthOverview";
import { useUserGrowthChart } from "./hooks/useUserGrowthChart";
import { useRecentActivity } from "./hooks/useRecentActivity";
import { useTopJobLocations } from "./hooks/Usetopjoblocations";
import { useTopJobCategories } from "./hooks/Usetopjobcategories";
import { useProjectValueChart } from "./hooks/Useprojectvaluechart";
import { ProjectValueChart } from "./components/Projectvaluechart";
import { DonutBreakdown } from "./components/Donutbreakdown";
import { HorizontalBarBreakdown } from "./components/Horizontalbarbreakdown";

const ORANGE = "#EA580C";
const BLUE = "#2563EB";
const AMBER = "#D97706";
const TEXT_DARK = "#0F172A";
const BG_PAGE = "#F8FAFC";
const AMBER_BG = "#FFFBEB";
const AMBER_BORDER = "#FDE68A";
const AMBER_TEXT = "#92400E";

const STAT_ACCENTS: Record<DashboardStatId, string> = {
  totalActiveUsers: BLUE,
  newJobsPosted: ORANGE,
  totalFundsInEscrow: ORANGE,
  pendingWithdrawals: AMBER,
};

const skeletonAnimationCss = `
@keyframes dashboardSkeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid #EEF2F6",
        background: "#FFFFFF",
        padding: 22,
        flex: 1,
        minWidth: 0,
        boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: ORANGE, flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, letterSpacing: -0.2 }}>
          {title}
        </h2>
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

export function DashboardPage() {
  const [range, setRange] = useState<DateRangeOption>("30d");
  const navigate = useNavigate();

  const {
    stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useDashboardStats(range);
  const { data: growthData, isLoading: growthLoading } = useUserGrowthChart();
  const { data: locationsData, isLoading: locationsLoading } =
    useTopJobLocations(range, 4);
  const { data: categoriesData, isLoading: categoriesLoading } =
    useTopJobCategories(range, 3);
  const { chartData: valueData, isLoading: valueLoading } =
    useProjectValueChart(range);
  const {
    activity,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useRecentActivity(8);
  const { health, isLoading: healthLoading, refetch: refetchHealth } = useAppHealth();

  const handleRefresh = () => {
    refetchStats();
    refetchActivity();
    refetchHealth();
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        background: BG_PAGE,
        padding: 24,
        fontFamily: "'Inter','Helvetica Neue',sans-serif",
      }}
    >
      <style>{skeletonAnimationCss}</style>

      <DashboardHeader
        range={range}
        onRangeChange={setRange}
        onRefresh={handleRefresh}
        isRefreshing={statsLoading || activityLoading}
      />

      {statsError && (
        <div
          style={{
            borderRadius: 8,
            border: `1px solid ${AMBER_BORDER}`,
            background: AMBER_BG,
            padding: "12px 16px",
            fontSize: 13,
            color: AMBER_TEXT,
          }}
        >
          Couldn't load stats: {statsError}
        </div>
      )}

      {/* Row 1 — four stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {statsLoading || !stats
          ? Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                style={{
                  height: 112,
                  borderRadius: 16,
                  background: "#F1F5F9",
                  animation: "dashboardSkeletonPulse 1.5s ease-in-out infinite",
                }}
              />
            ))
          : (
              Object.values(stats) as Array<(typeof stats)[DashboardStatId]>
            )
              // Funds figures (escrow / withdrawals) live in the Financials tab
              .filter((stat) => stat.id !== "totalFundsInEscrow" && stat.id !== "pendingWithdrawals")
              .map((stat) => (
              <StatCard
                key={stat.id}
                stat={stat}
                accentColor={STAT_ACCENTS[stat.id as DashboardStatId]}
              />
            ))}
      </div>

      {/* Platform health — live monitor across all modules */}
      <HealthOverview health={health} isLoading={healthLoading} />

      {/* Row 2 — growth chart, locations, categories */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ flex: "2 1 360px", minWidth: 0 }}>
          <Card title="User Growth Chart">
            <UserGrowthChart data={growthData} isLoading={growthLoading} />
          </Card>
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <Card title="Top Job Locations">
            <HorizontalBarBreakdown
              data={locationsData}
              isLoading={locationsLoading}
            />
          </Card>
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <Card title="Top Job Categories">
            <DonutBreakdown
              data={categoriesData}
              isLoading={categoriesLoading}
            />
          </Card>
        </div>
      </div>

      {/* Row 3 — project value, recent actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ flex: "2 1 480px", minWidth: 0 }}>
          <Card title="Average Project Value">
            <ProjectValueChart data={valueData} isLoading={valueLoading} />
          </Card>
        </div>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <Card title="Recent Actions">
            <ActivityFeed
              items={activity}
              isLoading={activityLoading}
              // onItemClick={(item) => {
              //   if (item.jobId) navigate(`/jobs?highlight=${item.jobId}`);
              // }}
              onItemClick={(item) => {
                if (item.type === "job_posted" && item.referenceId) {
                  navigate(`/jobs?highlight=${item.referenceId}`);
                }
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
