import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { UserGrowthPoint } from '../types';

const ORANGE = '#EA580C';
const DARK_BROWN = '#92400E';
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
  color: string;
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
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: TEXT_DARK }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ margin: '2px 0 0', fontSize: 12, color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-start', paddingLeft: 4, marginBottom: 8 }}>
      {payload.map((entry) => (
        <div key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: entry.color }} />
          <span style={{ fontSize: 12, color: SLATE_LIGHT, fontFamily: "'Inter', sans-serif" }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function UserGrowthChart({ data, isLoading }: UserGrowthChartProps) {
  if (isLoading) {
    return (
      <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: SLATE_LIGHT }}>
        Loading chart…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: SLATE_LIGHT, fontFamily: 'Inter, sans-serif' }}
          axisLine={{ stroke: BORDER }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: SLATE_LIGHT, fontFamily: 'Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip content={<GrowthTooltip />} />
        <Legend content={<CustomLegend />} verticalAlign="top" />
        <Line
          type="monotone"
          dataKey="freelancers"
          stroke={ORANGE}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: ORANGE }}
          name="New Freelancers"
        />
        <Line
          type="monotone"
          dataKey="clients"
          stroke={DARK_BROWN}
          strokeWidth={2.5}
          strokeDasharray="6 3"
          dot={false}
          activeDot={{ r: 4, fill: DARK_BROWN }}
          name="New Clients"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}