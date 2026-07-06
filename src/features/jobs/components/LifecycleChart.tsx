import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

// Four clearly distinct colours — blue / green / purple / red
const BLUE = "#2563EB";
const NAVY = "#0F172A";
const SLATE = "#64748B";
const GREEN = "#16A34A";
const PURPLE = "#7C3AED";
const RED = "#DC2626";

export interface LifecyclePoint {
    label: string;
    newJobs: number;
    reposted: number;
    expired: number;
    active: number;
}

const SERIES: { key: keyof Omit<LifecyclePoint, "label">; name: string; color: string }[] = [
    { key: "newJobs", name: "New Jobs", color: BLUE },
    { key: "active", name: "Still Active", color: GREEN },
    { key: "reposted", name: "Reposted", color: PURPLE },
    { key: "expired", name: "Expired", color: RED },
];

function LifecycleTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: "10px 14px",
                boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                fontFamily: "'Inter', sans-serif",
            }}
        >
            <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{label}</div>
            {payload.map((p: any) => (
                <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: SLATE }}>{p.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginLeft: "auto", paddingLeft: 14 }}>
                        {p.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

function LifecycleLegend() {
    return (
        <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
            {SERIES.map((s) => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 18, height: 3, borderRadius: 2, background: s.color }} />
                    <span style={{ fontSize: 11, color: SLATE }}>{s.name}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * Job lifecycle chart — bids as soft bars in the background,
 * job series as smooth animated lines/area on top.
 */
export function LifecycleChart({ data }: { data: LifecyclePoint[] }) {
    const empty = data.every(
        (d) => !d.newJobs && !d.reposted && !d.expired && !d.active,
    );
    if (data.length === 0 || empty) {
        return (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#CBD5E1", fontSize: 13 }}>
                No activity for this period
            </div>
        );
    }

    return (
        <div>
            <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                    <defs>
                        <linearGradient id="lcNewJobs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={BLUE} stopOpacity={0.20} />
                            <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#94A3B8" }}
                        axisLine={{ stroke: "#E2E8F0" }}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: "#94A3B8" }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<LifecycleTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                    <Legend content={<LifecycleLegend />} />

                    {/* New jobs — gradient area */}
                    <Area
                        type="monotone"
                        dataKey="newJobs"
                        name="New Jobs"
                        stroke={BLUE}
                        strokeWidth={2.5}
                        fill="url(#lcNewJobs)"
                        dot={false}
                        activeDot={{ r: 4.5, strokeWidth: 2, stroke: "#fff" }}
                        animationDuration={900}
                    />

                    {/* Still-active jobs */}
                    <Line
                        type="monotone"
                        dataKey="active"
                        name="Still Active"
                        stroke={GREEN}
                        strokeWidth={2.2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                        animationDuration={900}
                    />

                    {/* Reposted — dashed */}
                    <Line
                        type="monotone"
                        dataKey="reposted"
                        name="Reposted"
                        stroke={PURPLE}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                        animationDuration={900}
                    />

                    {/* Expired */}
                    <Line
                        type="monotone"
                        dataKey="expired"
                        name="Expired"
                        stroke={RED}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                        animationDuration={900}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
