import React, { useEffect, useState, useMemo } from 'react';
import { fetchUsers } from '../api/userServices';
import { User } from '../types';


// ── colour tokens ──────────────────────────────────────────────────────
const ORANGE = '#EA580C';
const NAVY   = '#0F172A';
const SLATE  = '#64748B';
const BORDER = '#E2E8F0';
const SKY    = '#0EA5E9';

// ── types ──────────────────────────────────────────────────────────────
type GrowthPeriod = 'days' | 'weeks' | 'months';

interface GrowthBucket {
  label: string;
  clients: number;
  bidders : number;
}

// ── helpers ────────────────────────────────────────────────────────────
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoWeek(d: Date): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `W${wk}`;
}

function buildGrowthBuckets(users: User[], period: GrowthPeriod): GrowthBucket[] {
  const now = new Date();

  if (period === 'days') {
    // last 14 days
    const buckets: GrowthBucket[] = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (13 - i));
      return {
        label: d.toLocaleString('default', { weekday: 'short', day: 'numeric' }),
        clients: 0,
        bidders : 0,
        _key: startOfDay(d).getTime(),
      } as GrowthBucket & { _key: number };
    });

    users.forEach(u => {
      if (!u.created_at) return;
      const key = startOfDay(new Date(u.created_at)).getTime();
      const b = (buckets as (GrowthBucket & { _key: number })[]).find(b => b._key === key);
      if (!b) return;
      const types = u.user_type_names ?? [];
      if (types.some(t => t === 'hire talent')) b.clients++;
      if (types.some(t => t === 'find work'))   b.bidders ++;
    });

    return buckets;
  }

  if (period === 'weeks') {
    // last 8 weeks
    const map = new Map<string, GrowthBucket>();
    const labels: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const lbl = isoWeek(d);
      if (!map.has(lbl)) {
        map.set(lbl, { label: lbl, clients: 0, bidders : 0 });
        labels.push(lbl);
      }
    }
    users.forEach(u => {
      if (!u.created_at) return;
      const lbl = isoWeek(new Date(u.created_at));
      const b = map.get(lbl);
      if (!b) return;
      const types = u.user_type_names ?? [];
      if (types.some(t => t === 'hire talent')) b.clients++;
      if (types.some(t => t === 'find work'))   b.bidders ++;
    });
    return labels.map(l => map.get(l)!);
  }

  // months – last 6
  const buckets: GrowthBucket[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: d.toLocaleString('default', { month: 'short' }),
      clients: 0,
      bidders : 0,
      _key: `${d.getFullYear()}-${d.getMonth()}`,
    } as GrowthBucket & { _key: string };
  });

  users.forEach(u => {
    if (!u.created_at) return;
    const d = new Date(u.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = (buckets as (GrowthBucket & { _key: string })[]).find(b => b._key === key);
    if (!b) return;
    const types = u.user_type_names ?? [];
    if (types.some(t => t === 'hire talent')) b.clients++;
    if (types.some(t => t === 'find work'))   b.bidders ++;
  });

  return buckets;
}

// ── animated number ────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = Math.ceil(value / 40) || 1;
    const t = setInterval(() => {
      cur += step;
      if (cur >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(cur);
    }, 20);
    return () => clearInterval(t);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

// ── stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: number; sub: string; accent: string }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16,
      padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '16px 16px 0 0' }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 800, color: NAVY, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        <AnimatedNumber value={value} />
      </span>
      <span style={{ fontSize: 12, color: SLATE }}>{sub}</span>
    </div>
  );
}

// ── bar chart ──────────────────────────────────────────────────────────
function BarChart({ data }: { data: GrowthBucket[] }) {
  const max = Math.max(...data.flatMap(d => [d.clients, d.bidders ]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px', overflowX: 'auto' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: '1 0 auto', minWidth: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110 }}>
            <div style={{ width: 12, height: `${Math.max((d.clients / max) * 100, 2)}%`, background: ORANGE, borderRadius: '4px 4px 0 0', transition: 'height 0.8s cubic-bezier(.4,0,.2,1)' }} title={`Clients: ${d.clients}`} />
            <div style={{ width: 12, height: `${Math.max((d.bidders  / max) * 100, 2)}%`, background: NAVY,   borderRadius: '4px 4px 0 0', transition: 'height 0.8s cubic-bezier(.4,0,.2,1)' }} title={`Bidders: ${d.bidders }}`} />
          </div>    
          <span style={{ fontSize: 8, color: SLATE, letterSpacing: 0.2, whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── donut chart ────────────────────────────────────────────────────────
function DonutChart({ clients, bidders, suspended }: { clients: number; bidders: number; suspended: number }) {
  const total = clients + bidders + suspended || 1;
  const r = 52, circ = 2 * Math.PI * r;
  const segments = [
    { value: clients,     color: ORANGE,    label: 'Clients' },
    { value: bidders, color: NAVY,      label: 'Bidders' },
    { value: suspended,   color: '#CBD5E1', label: 'Suspended' },
  ];
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke={BORDER} strokeWidth={18} />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circ;
          const el = (
            <circle key={i} cx={65} cy={65} r={r} fill="none" stroke={seg.color} strokeWidth={18}
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="butt"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px', transition: 'stroke-dasharray 1s ease' }}
            />
          );
          offset += dash;
          return el;
        })}
        <text x={65} y={60} textAnchor="middle" fontSize={20} fontWeight={700} fill={NAVY}>{Math.round((clients / total) * 100)}%</text>
        <text x={65} y={76} textAnchor="middle" fontSize={10} fill={SLATE}>Clients</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: SLATE }}>{seg.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginLeft: 'auto', paddingLeft: 12 }}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── horizontal bar ─────────────────────────────────────────────────────
function HBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: SLATE, width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: BORDER, borderRadius: 99 }}>
        <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, width: 28, textAlign: 'right' }}>{count}</span>
    </div>
  );
}

// ── period dropdown ────────────────────────────────────────────────────
const PERIOD_OPTIONS: { value: GrowthPeriod; label: string }[] = [
  { value: 'days',   label: 'Last 14 Days' },
  { value: 'weeks',  label: 'Last 8 Weeks' },
  { value: 'months', label: 'Last 6 Months' },
];

function PeriodDropdown({ value, onChange }: { value: GrowthPeriod; onChange: (v: GrowthPeriod) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as GrowthPeriod)}
      style={{
        fontSize: 11, fontWeight: 600, color: NAVY,
        background: '#F8FAFC', border: `1px solid ${BORDER}`,
        borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
        outline: 'none', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        paddingRight: 26,
      }}
    >
      {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── main component ─────────────────────────────────────────────────────
const UserAnalytics: React.FC = () => {
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<GrowthPeriod>('months');

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── derived stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let clients = 0, bidders = 0, suspended = 0;
    const locationCount: Record<string, number> = {};
    const skillCount:    Record<string, number> = {};

    users.forEach(u => {
      const types = u.user_type_names ?? [];
      const isClient     = types.some(t => t === 'hire talent');
      const isFreelancer = types.some(t => t === 'find work');

      // suspended: no direct flag on User but we can check suspended_at if present
      // The fetchUsers mapper doesn't expose suspended_at, so we skip it here.
      // If you expose it, add: if (u.suspended_at) suspended++;
      if (isClient)     clients++;
      if (isFreelancer) bidders++;

      // locations – use resolved location_names (array)
      (u.location_names ?? [u.location].filter(Boolean)).forEach(loc => {
        if (loc && loc !== '—') locationCount[loc] = (locationCount[loc] || 0) + 1;
      });

      // skills – skills_id is already resolved to names by fetchUsers
      (u.skills_id ?? []).forEach(skill => {
        if (skill) skillCount[skill] = (skillCount[skill] || 0) + 1;
      });
    });

    const total = users.length;
    const activeRate = total > 0 ? Math.round(((total - suspended) / total) * 100) : 0;

    const topLocations = Object.entries(locationCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return { total, clients, bidders, suspended, activeRate, topLocations, topSkills };
  }, [users]);

  const growthData = useMemo(() => buildGrowthBuckets(users, period), [users, period]);

  const maxLoc   = Math.max(...stats.topLocations.map(l => l.count), 1);
  const maxSkill = Math.max(...stats.topSkills.map(s => s.count), 1);

  // ── loading ──────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: SLATE, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTop: `3px solid ${ORANGE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Loading analytics…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: NAVY }}>

      {/* header */}
      {/* <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: NAVY }}>User Analytics</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: SLATE }}>Real-time snapshot of your platform users</p>
      </div> */}

      {/* stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Users"  value={stats.total}       sub="All registered accounts"     accent={NAVY}      />
        <StatCard label="Clients"      value={stats.clients}     sub="Hire talent accounts"         accent={ORANGE}    />
        <StatCard label="Bidders"  value={stats.bidders } sub="Find work accounts"           accent={SKY}       />
        <StatCard label="Suspended"    value={stats.suspended}   sub={`${stats.activeRate}% active rate`} accent="#CBD5E1" />
      </div>

      {/* charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* growth chart */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Growth Over Time</div>
              <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>New registrations per period</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ color: ORANGE, label: 'Clients' }, { color: NAVY, label: 'Bidders' }].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 11, color: SLATE }}>{label}</span>
                  </div>
                ))}
              </div>
              <PeriodDropdown value={period} onChange={setPeriod} />
            </div>
          </div>
          <BarChart data={growthData} />
        </div>

        {/* donut */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>User Breakdown</div>
          <div style={{ fontSize: 11, color: SLATE, marginBottom: 20 }}>Distribution by type</div>
          <DonutChart clients={stats.clients} bidders={stats.bidders  } suspended={stats.suspended} />
        </div>
      </div>

      {/* bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Top Locations</div>
          <div style={{ fontSize: 11, color: SLATE, marginBottom: 16 }}>Where your users are based</div>
          {stats.topLocations.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.topLocations.map((l, i) => <HBar key={i} label={l.name} count={l.count} max={maxLoc} color={ORANGE} />)}
              </div>
            : <span style={{ fontSize: 13, color: '#CBD5E1' }}>No location data</span>}
        </div>

        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Top Skills</div>
          <div style={{ fontSize: 11, color: SLATE, marginBottom: 16 }}>Most common user skills</div>
          {stats.topSkills.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.topSkills.map((s, i) => <HBar key={i} label={s.name} count={s.count} max={maxSkill} color={NAVY} />)}
              </div>
            : <span style={{ fontSize: 13, color: '#CBD5E1' }}>No skill data</span>}
        </div>
      </div>

    </div>
  );
};

export default UserAnalytics;