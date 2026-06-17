import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProjectValuePoint } from '../types';
import { formatCompactNumber, formatCurrency } from '../Formatters';

const ORANGE = '#EA580C';
const BLUE = '#2563EB';
const TEXT_DARK = '#0F172A';
const BORDER = '#E2E8F0';
const SLATE_LIGHT = '#94A3B8';

interface ProjectValueChartProps {
  data: ProjectValuePoint[];
  isLoading: boolean;
}

interface TooltipPayload {
  payload: ProjectValuePoint;
}

function ValueTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const hasSplit = point.fixedAverage !== undefined || point.hourlyAverage !== undefined;

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
      {hasSplit ? (
        <>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: ORANGE }}>Fixed: {formatCurrency(point.fixedAverage ?? 0)}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: BLUE }}>Hourly: {formatCurrency(point.hourlyAverage ?? 0)}</p>
        </>
      ) : (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: ORANGE }}>Average: {formatCurrency(point.averageValue)}</p>
      )}
    </div>
  );
}

export function ProjectValueChart({ data, isLoading }: ProjectValueChartProps) {
  if (isLoading) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: SLATE_LIGHT }}>
        Loading chart…
      </div>
    );
  }

  const hasSplit = data.some((point) => point.fixedAverage !== undefined || point.hourlyAverage !== undefined);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: SLATE_LIGHT }} axisLine={{ stroke: BORDER }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={(value: number) => formatCompactNumber(value)} tick={{ fontSize: 11, fill: SLATE_LIGHT }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<ValueTooltip />} />
        {hasSplit ? (
          <>
            <Line type="monotone" dataKey="fixedAverage" stroke={ORANGE} strokeWidth={2} dot={false} name="Fixed Price Value" />
            <Line type="monotone" dataKey="hourlyAverage" stroke={BLUE} strokeWidth={2} dot={false} name="Hourly Based" />
          </>
        ) : (
          <Line type="monotone" dataKey="averageValue" stroke={ORANGE} strokeWidth={2} dot={false} name="Average Project Value" />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}