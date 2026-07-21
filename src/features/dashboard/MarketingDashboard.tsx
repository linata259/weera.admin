import React, { useEffect, useState } from "react";
import {
  FiGlobe, FiUserPlus, FiTrendingUp, FiVolume2, FiMail, FiRadio,
  FiArrowUpRight, FiArrowDownRight,
} from "react-icons/fi";

import { fetchMarketingKpis, MarketingKpis } from "./services/marketingDashboardService";
import { KpiTrend } from "./services/superAdminService";
import { useUserGrowthChart } from "./hooks/useUserGrowthChart";
import { UserGrowthChart } from "./components/UserGrowthChart";
import { useNavbar } from "../../hooks/Navbarcontext";

const ORANGE = "#EA580C";
const TEXT_DARK = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#EEF2F6";
const GREEN = "#16A34A";
const RED = "#DC2626";

const Icon: React.FC<{ icon: (props: any) => any; size?: number; color?: string }> = ({
  icon, size, color,
}) => {
  const Component = icon as React.ComponentType<{ size?: number; color?: string }>;
  return <Component size={size} color={color} />;
};

const card: React.CSSProperties = {
  borderRadius: 16,
  border: `1px solid ${BORDER}`,
  background: "#fff",
  padding: 20,
  boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
  minWidth: 0,
};

const TrendChip: React.FC<{ trend: KpiTrend }> = ({ trend }) => {
  const up = trend.direction === "up";
  const flat = trend.direction === "flat";
  const color = flat ? MUTED : up ? GREEN : RED;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: MUTED }}>
      {!flat && <Icon icon={up ? FiArrowUpRight : FiArrowDownRight} size={13} color={color} />}
      <span style={{ color, fontWeight: 700 }}>
        {flat ? "—" : `${up ? "+" : "-"}${trend.changePercent}%`}
      </span>
      <span>vs last month</span>
    </div>
  );
};

const KpiCard: React.FC<{
  icon: (props: any) => any;
  label: string;
  value: string;
  trend?: KpiTrend;
  sub?: string;
  dim?: boolean; // metric has no data source yet
  loading: boolean;
}> = ({ icon, label, value, trend, sub, dim, loading }) => (
  <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10, opacity: dim ? 0.6 : 1 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: "#FFF4EE",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon icon={icon} size={16} color={ORANGE} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>{label}</span>
    </div>
    {loading ? (
      <div style={{ height: 30, width: "60%", borderRadius: 6, background: "#F1F5F9" }} />
    ) : (
      <div style={{ fontSize: 26, fontWeight: 800, color: dim ? MUTED : TEXT_DARK, letterSpacing: -0.5 }}>
        {value}
      </div>
    )}
    {!loading && (trend ? <TrendChip trend={trend} /> : sub ? (
      <div style={{ fontSize: 12, color: MUTED }}>{sub}</div>
    ) : null)}
  </div>
);

/* traffic sources in the Figma — rendered as a "not connected" panel until
   analytics exist, keeping the same list styling so wiring data in is easy */
const TRAFFIC_SOURCES = [
  { label: "Organic Search", color: "#10B981" },
  { label: "Direct", color: "#2563EB" },
  { label: "Social Media", color: "#F97316" },
  { label: "Referral", color: "#8B5CF6" },
  { label: "Email Campaigns", color: "#F59E0B" },
];

const CAMPAIGN_COLUMNS = ["Campaign", "Type", "Budget", "Spent", "Leads", "Conv.", "ROI", "Status", "Ends"];

export function MarketingDashboardPage() {
  const [kpis, setKpis] = useState<MarketingKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const { setBreadcrumb } = useNavbar();

  const { data: growthData, isLoading: growthLoading } = useUserGrowthChart();

  useEffect(() => {
    setBreadcrumb({ parent: "", current: "Marketing Dashboard" });
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  useEffect(() => {
    fetchMarketingKpis()
      .then(setKpis)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const k = kpis;

  return (
    <div style={{
      width: "100%", display: "flex", flexDirection: "column", gap: 20,
      background: "#F8FAFC", padding: 0,
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
    }}>
      {/* KPI row — same six cards as the design */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
      }}>
        <KpiCard icon={FiGlobe} label="Website Visits MTD" loading={loading}
          value="—" sub="analytics not connected yet" dim />
        <KpiCard icon={FiUserPlus} label="Leads Generated" loading={loading}
          value={k ? k.newUsersMtd.toLocaleString() : ""} trend={k?.newUsersTrend} />
        <KpiCard icon={FiTrendingUp} label="Conversion Rate" loading={loading}
          value="—" sub="needs visit tracking" dim />
        <KpiCard icon={FiVolume2} label="Campaign ROI" loading={loading}
          value="—" sub="no campaigns yet" dim />
        <KpiCard icon={FiMail} label="Email Open Rate" loading={loading}
          value="—" sub="email tracking coming soon" dim />
        <KpiCard icon={FiRadio} label="Social Reach MTD" loading={loading}
          value="—" sub="social not connected yet" dim />
      </div>

      {/* chart + traffic sources */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ ...card, flex: "2 1 420px" }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginRight: "auto" }}>
              Traffic &amp; Lead Generation
            </div>
            <span style={{ fontSize: 11.5, color: MUTED }}>Last 12 months</span>
          </div>
          <div style={{ fontSize: 12, color: MUTED, margin: "2px 0 12px" }}>
            New registrations by user type — site-visit tracking not connected yet
          </div>
          <UserGrowthChart data={growthData} isLoading={growthLoading} />
        </div>

        <div style={{ ...card, flex: "1 1 300px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginBottom: 12 }}>
            Traffic Sources
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: 0.55 }}>
            {TRAFFIC_SOURCES.map((s) => (
              <div key={s.label}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                  <span style={{ color: TEXT_DARK, marginRight: "auto" }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: MUTED }}>—</span>
                </div>
                <div style={{ height: 5, borderRadius: 999, background: "#F1F5F9" }} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 14 }}>
            Populates automatically once web analytics is connected.
          </div>
        </div>
      </div>

      {/* active campaigns */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", padding: "16px 20px",
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginRight: "auto" }}>
            Active Campaigns
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {CAMPAIGN_COLUMNS.map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 20px", fontSize: 11.5,
                    fontWeight: 700, color: MUTED, textTransform: "uppercase",
                    letterSpacing: 0.4, borderBottom: `1px solid ${BORDER}`,
                    whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={CAMPAIGN_COLUMNS.length} style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: TEXT_DARK, marginBottom: 4 }}>
                    No campaigns yet
                  </div>
                  <div style={{ fontSize: 12.5, color: MUTED }}>
                    Campaigns will appear here once campaign tracking is added to the platform.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* upcoming activities */}
      <div style={{ ...card }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT_DARK, marginBottom: 12 }}>
          Upcoming Activities
        </div>
        <div style={{
          border: `1px dashed ${BORDER}`, borderRadius: 12, padding: "28px 20px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: TEXT_DARK, marginBottom: 4 }}>
            Nothing scheduled
          </div>
          <div style={{ fontSize: 12.5, color: MUTED }}>
            Marketing events and deadlines will show here once activity planning is added.
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketingDashboardPage;
