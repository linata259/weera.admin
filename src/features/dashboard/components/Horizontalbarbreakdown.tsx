import type { BreakdownSlice } from '../types';

const TEXT_DARK = '#0F172A';
const SLATE_LIGHT = '#94A3B8';
const SHADES = ['#EA580C', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5'];

interface HorizontalBarBreakdownProps {
  data: BreakdownSlice[];
  isLoading: boolean;
}

export function HorizontalBarBreakdown({ data, isLoading }: HorizontalBarBreakdownProps) {
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

  const maxPercent = Math.max(...data.map((slice) => slice.percent), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.map((slice, index) => (
        <div key={slice.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, color: TEXT_DARK }}>{slice.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(slice.percent / maxPercent) * 100}%`,
                  background: SHADES[index % SHADES.length],
                  borderRadius: 4,
                }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_DARK, width: 38, textAlign: 'right' }}>
              {slice.percent}%
            </span>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: SLATE_LIGHT, marginTop: 2 }}>
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}