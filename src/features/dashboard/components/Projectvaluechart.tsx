import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProjectValuePoint } from '../types';
import { formatCompactNumber, formatCurrency } from '../Formatters';

const ORANGE = '#EA580C';
const DARK_BROWN = '#92400E';
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
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: TEXT_DARK }}>{label}</p>
      {hasSplit ? (
        <>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: ORANGE }}>Fixed: {formatCurrency(point.fixedAverage ?? 0)}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: DARK_BROWN }}>Hourly: {formatCurrency(point.hourlyAverage ?? 0)}</p>
        </>
      ) : (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: ORANGE }}>Average: {formatCurrency(point.averageValue)}</p>
      )}
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

export function ProjectValueChart({ data, isLoading }: ProjectValueChartProps) {
  if (isLoading) {
    return (
      <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: SLATE_LIGHT }}>
        Loading chart…
      </div>
    );
  }

  const hasSplit = data.some((point) => point.fixedAverage !== undefined || point.hourlyAverage !== undefined);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: SLATE_LIGHT, fontFamily: 'Inter, sans-serif' }}
          axisLine={{ stroke: BORDER }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(value: number) => formatCompactNumber(value)}
          tick={{ fontSize: 11, fill: SLATE_LIGHT, fontFamily: 'Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<ValueTooltip />} />
        <Legend content={<CustomLegend />} verticalAlign="top" />
        {hasSplit ? (
          <>
            <Line
              type="monotone"
              dataKey="fixedAverage"
              stroke={ORANGE}
              strokeWidth={2.5}
              dot={{ r: 3, fill: ORANGE, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: ORANGE }}
              name="Fixed Price Value"
            />
            <Line
              type="monotone"
              dataKey="hourlyAverage"
              stroke={DARK_BROWN}
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: DARK_BROWN, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: DARK_BROWN }}
              name="Hourly Based"
            />
          </>
        ) : (
          <Line
            type="monotone"
            dataKey="averageValue"
            stroke={ORANGE}
            strokeWidth={2.5}
            dot={{ r: 3, fill: ORANGE, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: ORANGE }}
            name="Fixed Price Value"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}