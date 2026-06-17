import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { UserGrowthPoint } from '../types';

const ORANGE = '#EA580C';
const TEXT_DARK = '#0F172A';
const BORDER = '#E2E8F0';
const SLATE_LIGHT = '#94A3B8';

interface UserGrowthChartProps {
  data: UserGrowthPoint[];
  isLoading: boolean;
}

interface TooltipPayloadEntry {
  value: number;
  name: string;
}

function GrowthTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        background: '#FFFFFF',
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: TEXT_DARK }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: ORANGE }}>Freelancers: {payload[0]?.value ?? 0}</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: TEXT_DARK }}>Clients: {payload[1]?.value ?? 0}</p>
    </div>
  );
}

export function UserGrowthChart({ data, isLoading }: UserGrowthChartProps) {
  if (isLoading) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: SLATE_LIGHT }}>
        Loading chart…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: SLATE_LIGHT }} axisLine={{ stroke: BORDER }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: SLATE_LIGHT }} axisLine={false} tickLine={false} width={32} />
        <Tooltip content={<GrowthTooltip />} />
        <Line type="monotone" dataKey="freelancers" stroke={ORANGE} strokeWidth={2} dot={false} name="New Freelancers" />
        <Line type="monotone" dataKey="clients" stroke={TEXT_DARK} strokeWidth={2} dot={false} name="New Clients" />
      </LineChart>
    </ResponsiveContainer>
  );
}