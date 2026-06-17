import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { BreakdownSlice } from '../types';

const TEXT_DARK = '#0F172A';
const SLATE_LIGHT = '#94A3B8';
const SHADES = ['#EA580C', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5'];

interface DonutBreakdownProps {
  data: BreakdownSlice[];
  isLoading: boolean;
}

interface TooltipPayloadEntry {
  payload: BreakdownSlice;
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid #E2E8F0',
        background: '#FFFFFF',
        padding: '6px 10px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
        fontSize: 12,
        color: TEXT_DARK,
      }}
    >
      {slice.name}: {slice.percent}%
    </div>
  );
}

export function DonutBreakdown({ data, isLoading }: DonutBreakdownProps) {
  if (isLoading) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: SLATE_LIGHT }}>
        Loading…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: SLATE_LIGHT }}>
        No data yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 140, height: 140, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="name" innerRadius={38} outerRadius={64} paddingAngle={2}>
              {data.map((slice, index) => (
                <Cell key={slice.id} fill={SHADES[index % SHADES.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((slice, index) => (
          <div key={slice.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ width: 8, height: 8, borderRadius: '50%', background: SHADES[index % SHADES.length], flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: TEXT_DARK }}>{slice.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_DARK }}>{slice.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}