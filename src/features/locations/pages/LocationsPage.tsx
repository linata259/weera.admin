import React, { useEffect, useMemo, useState } from 'react';
import {
    fetchCounties, fetchSubcounties, fetchWards,
    createCounty, updateCounty, deleteCounty,
    createSubcounty, updateSubcounty, deleteSubcounty,
    createWard, updateWard, deleteWard,
} from '../api/locationsService';
import { County, SubCounty, Ward } from '../types';

const ORANGE = '#EA580C';
const NAVY = '#0F172A';
const SLATE = '#64748B';
const BORDER = '#E2E8F0';

interface RowItem { id: string; name: string; count?: number }

const css = `
.loc-row { display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:10px;
  cursor:pointer; transition:background .12s; border:1px solid transparent; }
.loc-row:hover { background:#F8FAFC; }
.loc-row.selected { background:#FFF7ED; border-color:#FED7AA; }
.loc-row .loc-actions { display:flex; gap:2px; opacity:0; transition:opacity .12s; }
.loc-row:hover .loc-actions, .loc-row.selected .loc-actions { opacity:1; }
.loc-iconbtn { border:none; background:none; cursor:pointer; padding:5px; border-radius:7px;
  display:flex; align-items:center; justify-content:center; }
.loc-iconbtn:hover { background:#EEF2F7; }
.loc-input { height:36px; padding:0 12px; border-radius:10px; border:1px solid ${BORDER};
  font-size:13px; outline:none; font-family:inherit; color:${NAVY}; width:100%; box-sizing:border-box;
  transition:border-color .12s, box-shadow .12s; background:#fff; }
.loc-input:focus { border-color:${ORANGE}; box-shadow:0 0 0 3px rgba(234,88,12,0.10); }
.loc-addbtn { height:36px; width:38px; flex-shrink:0; border-radius:10px; border:none; cursor:pointer;
  font-size:18px; font-weight:600; line-height:1; display:flex; align-items:center; justify-content:center;
  transition:background .12s; }
@keyframes locSpin { to { transform: rotate(360deg) } }
`;

/* ── icons ─────────────────────────────────────────────────── */
const PencilIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
);
const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
);
const ChevronIcon = ({ color = '#CBD5E1' }: { color?: string }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
    </svg>
);
const PinIcon = ({ size = 26, color = '#CBD5E1' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

/* ── column ────────────────────────────────────────────────── */
function Column({
    title, caption, accent, items, selectedId, selectable, onSelect,
    onAdd, onRename, onDelete, addPlaceholder, disabledHint, isLast,
}: {
    title: string;
    caption: string;
    accent: string;
    items: RowItem[];
    selectedId?: string | null;
    selectable?: boolean;
    onSelect?: (id: string) => void;
    onAdd: (name: string) => Promise<void>;
    onRename: (id: string, name: string) => Promise<void>;
    onDelete: (id: string, name: string) => Promise<void>;
    addPlaceholder: string;
    disabledHint?: string;
    isLast?: boolean;
}) {
    const [draft, setDraft] = useState('');
    const [filter, setFilter] = useState('');
    const [busy, setBusy] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState('');

    const visible = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return q ? items.filter(i => i.name.toLowerCase().includes(q)) : items;
    }, [items, filter]);

    const submitAdd = async () => {
        if (!draft.trim() || busy) return;
        setBusy(true);
        await onAdd(draft.trim());
        setDraft('');
        setBusy(false);
    };

    const submitRename = async (id: string) => {
        if (editDraft.trim()) await onRename(id, editDraft.trim());
        setEditingId(null);
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', minWidth: 0,
            borderRight: isLast ? 'none' : `1px solid #F1F5F9`,
        }}>
            {/* header */}
            <div style={{ padding: '18px 18px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: accent, flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: NAVY, letterSpacing: -0.2 }}>{title}</span>
                    <span style={{
                        marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                        color: accent, background: `${accent}14`,
                        borderRadius: 20, padding: '2px 10px',
                    }}>{items.length}</span>
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, paddingLeft: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {caption}
                </div>
            </div>

            {disabledHint ? (
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 10, padding: '20px 24px', textAlign: 'center',
                }}>
                    <PinIcon />
                    <span style={{ color: '#B4BFCC', fontSize: 12.5, lineHeight: 1.5 }}>{disabledHint}</span>
                </div>
            ) : (
                <>
                    {/* add */}
                    <div style={{ display: 'flex', gap: 8, padding: '0 14px 10px' }}>
                        <input
                            className="loc-input"
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && submitAdd()}
                            placeholder={addPlaceholder}
                        />
                        <button
                            className="loc-addbtn"
                            onClick={submitAdd}
                            disabled={!draft.trim() || busy}
                            title="Add"
                            style={{
                                background: draft.trim() ? ORANGE : '#F1F5F9',
                                color: draft.trim() ? '#fff' : '#B4BFCC',
                            }}
                        >
                            +
                        </button>
                    </div>

                    {/* filter (only useful for longer lists) */}
                    {items.length > 7 && (
                        <div style={{ padding: '0 14px 10px', position: 'relative' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B4BFCC" strokeWidth="2.2"
                                style={{ position: 'absolute', left: 26, top: '50%', transform: 'translateY(calc(-50% - 5px))' }}>
                                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                            </svg>
                            <input
                                className="loc-input"
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                placeholder={`Filter ${title.toLowerCase()}…`}
                                style={{ paddingLeft: 32, height: 32, fontSize: 12, background: '#FAFBFC' }}
                            />
                        </div>
                    )}

                    {/* list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 12px', maxHeight: 430 }}>
                        {visible.length === 0 ? (
                            <div style={{ padding: '28px 10px', textAlign: 'center', color: '#C7D0DB', fontSize: 12.5 }}>
                                {filter ? 'No matches.' : 'Nothing here yet — add the first one above.'}
                            </div>
                        ) : visible.map(item => {
                            const selected = selectedId === item.id;
                            const isEditing = editingId === item.id;
                            return (
                                <div
                                    key={item.id}
                                    className={`loc-row${selected ? ' selected' : ''}`}
                                    onClick={() => !isEditing && onSelect?.(item.id)}
                                    style={{ cursor: selectable ? 'pointer' : 'default' }}
                                >
                                    {isEditing ? (
                                        <>
                                            <input
                                                className="loc-input"
                                                autoFocus
                                                value={editDraft}
                                                onChange={e => setEditDraft(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') submitRename(item.id);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                onClick={e => e.stopPropagation()}
                                                style={{ height: 30, fontSize: 12.5 }}
                                            />
                                            <button className="loc-iconbtn" title="Save"
                                                onClick={e => { e.stopPropagation(); submitRename(item.id); }}>
                                                <span style={{ color: '#16A34A', fontSize: 14, fontWeight: 800 }}>✓</span>
                                            </button>
                                            <button className="loc-iconbtn" title="Cancel"
                                                onClick={e => { e.stopPropagation(); setEditingId(null); }}>
                                                <span style={{ color: '#94A3B8', fontSize: 13 }}>✕</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{
                                                flex: 1, minWidth: 0, fontSize: 13,
                                                color: selected ? '#9A3412' : NAVY,
                                                fontWeight: selected ? 700 : 500,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {item.name}
                                            </span>
                                            {item.count !== undefined && item.count > 0 && (
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, color: '#94A3B8',
                                                    background: '#F1F5F9', borderRadius: 20, padding: '1px 8px', flexShrink: 0,
                                                }}>{item.count}</span>
                                            )}
                                            <span className="loc-actions">
                                                <button className="loc-iconbtn" title="Rename"
                                                    onClick={e => { e.stopPropagation(); setEditingId(item.id); setEditDraft(item.name); }}>
                                                    <PencilIcon />
                                                </button>
                                                <button className="loc-iconbtn" title="Delete"
                                                    onClick={e => { e.stopPropagation(); onDelete(item.id, item.name); }}>
                                                    <TrashIcon />
                                                </button>
                                            </span>
                                            {selectable && <ChevronIcon color={selected ? ORANGE : '#D8DFE8'} />}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

/* ── page ──────────────────────────────────────────────────── */
const LocationsPage: React.FC = () => {
    const [counties, setCounties] = useState<County[]>([]);
    const [subcounties, setSubcounties] = useState<SubCounty[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
    const [selectedSubcounty, setSelectedSubcounty] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([fetchCounties(), fetchSubcounties(), fetchWards()])
            .then(([c, s, w]) => {
                setCounties(c); setSubcounties(s); setWards(w);
                if (c.length > 0) setSelectedCounty(c[0].id);
            })
            .finally(() => setLoading(false));
    }, []);

    const countyItems: RowItem[] = useMemo(
        () => counties.map(c => ({ id: c.id, name: c.name, count: subcounties.filter(s => s.county_id === c.id).length })),
        [counties, subcounties],
    );
    const subcountyItems: RowItem[] = useMemo(
        () => subcounties
            .filter(s => s.county_id === selectedCounty)
            .map(s => ({ id: s.id, name: s.name, count: wards.filter(w => w.subcounty_id === s.id).length })),
        [subcounties, wards, selectedCounty],
    );
    const wardItems: RowItem[] = useMemo(
        () => wards.filter(w => w.subcounty_id === selectedSubcounty).map(w => ({ id: w.id, name: w.name })),
        [wards, selectedSubcounty],
    );

    const flash = (msg: string) => { setError(msg); setTimeout(() => setError(null), 4000); };

    /* county handlers */
    const addCounty = async (name: string) => {
        const created = await createCounty(name);
        if (!created) return flash('Could not create county — check permissions.');
        setCounties(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedCounty(created.id);
        setSelectedSubcounty(null);
    };
    const renameCounty = async (id: string, name: string) => {
        if (!(await updateCounty(id, name))) return flash('Rename failed.');
        setCounties(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    };
    const removeCounty = async (id: string, name: string) => {
        const kids = subcounties.filter(s => s.county_id === id).length;
        if (!window.confirm(`Delete "${name}"${kids ? ` and its ${kids} subcounties (and their wards)` : ''}?`)) return;
        if (!(await deleteCounty(id))) return flash('Delete failed — the county may be referenced by jobs.');
        setCounties(prev => prev.filter(c => c.id !== id));
        setSubcounties(prev => prev.filter(s => s.county_id !== id));
        if (selectedCounty === id) { setSelectedCounty(null); setSelectedSubcounty(null); }
    };

    /* subcounty handlers */
    const addSubcounty = async (name: string) => {
        if (!selectedCounty) return;
        const created = await createSubcounty(selectedCounty, name);
        if (!created) return flash('Could not create subcounty.');
        setSubcounties(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedSubcounty(created.id);
    };
    const renameSubcounty = async (id: string, name: string) => {
        if (!(await updateSubcounty(id, name))) return flash('Rename failed.');
        setSubcounties(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    };
    const removeSubcounty = async (id: string, name: string) => {
        const kids = wards.filter(w => w.subcounty_id === id).length;
        if (!window.confirm(`Delete "${name}"${kids ? ` and its ${kids} wards` : ''}?`)) return;
        if (!(await deleteSubcounty(id))) return flash('Delete failed — the subcounty may be referenced by jobs.');
        setSubcounties(prev => prev.filter(s => s.id !== id));
        setWards(prev => prev.filter(w => w.subcounty_id !== id));
        if (selectedSubcounty === id) setSelectedSubcounty(null);
    };

    /* ward handlers */
    const addWard = async (name: string) => {
        if (!selectedSubcounty) return;
        const created = await createWard(selectedSubcounty, name);
        if (!created) return flash('Could not create ward.');
        setWards(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    };
    const renameWard = async (id: string, name: string) => {
        if (!(await updateWard(id, name))) return flash('Rename failed.');
        setWards(prev => prev.map(w => w.id === id ? { ...w, name } : w));
    };
    const removeWard = async (id: string, name: string) => {
        if (!window.confirm(`Delete ward "${name}"?`)) return;
        if (!(await deleteWard(id))) return flash('Delete failed — the ward may be referenced by jobs.');
        setWards(prev => prev.filter(w => w.id !== id));
    };

    const countyName = counties.find(c => c.id === selectedCounty)?.name;
    const subcountyName = subcounties.find(s => s.id === selectedSubcounty)?.name;

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: SLATE, fontFamily: "'Inter', sans-serif" }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTop: `3px solid ${ORANGE}`, borderRadius: '50%', animation: 'locSpin 0.8s linear infinite', margin: '0 auto 12px' }} />
                    Loading locations…
                    <style>{css}</style>
                </div>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: NAVY, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <style>{css}</style>

            {/* breadcrumb path + summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12,
                    padding: '8px 14px', fontSize: 12.5,
                }}>
                    <PinIcon size={14} color={ORANGE} />
                    <span style={{ fontWeight: 700, color: countyName ? NAVY : '#B4BFCC' }}>
                        {countyName ?? 'County'}
                    </span>
                    <ChevronIcon />
                    <span style={{ fontWeight: 700, color: subcountyName ? NAVY : '#B4BFCC' }}>
                        {subcountyName ?? 'Subcounty'}
                    </span>
                    <ChevronIcon />
                    <span style={{ fontWeight: 700, color: '#B4BFCC' }}>Wards</span>
                </div>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                    {counties.length} counties · {subcounties.length} subcounties · {wards.length} wards
                </span>
            </div>

            {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 12, padding: '10px 14px', fontSize: 13 }}>
                    {error}
                </div>
            )}

            {/* miller columns */}
            <div style={{
                background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18,
                boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                overflow: 'hidden', minHeight: 480,
            }}>
                <Column
                    title="Counties"
                    caption="Top-level regions"
                    accent={ORANGE}
                    items={countyItems}
                    selectedId={selectedCounty}
                    selectable
                    onSelect={(id) => { setSelectedCounty(id); setSelectedSubcounty(null); }}
                    onAdd={addCounty}
                    onRename={renameCounty}
                    onDelete={removeCounty}
                    addPlaceholder="Add county…"
                />
                <Column
                    title="Subcounties"
                    caption={countyName ? `Inside ${countyName}` : 'Pick a county'}
                    accent="#0EA5E9"
                    items={subcountyItems}
                    selectedId={selectedSubcounty}
                    selectable
                    onSelect={setSelectedSubcounty}
                    onAdd={addSubcounty}
                    onRename={renameSubcounty}
                    onDelete={removeSubcounty}
                    addPlaceholder="Add subcounty…"
                    disabledHint={selectedCounty ? undefined : 'Select a county on the left to manage its subcounties.'}
                />
                <Column
                    title="Wards"
                    caption={subcountyName ? `Inside ${subcountyName}` : 'Pick a subcounty'}
                    accent="#16A34A"
                    items={wardItems}
                    onAdd={addWard}
                    onRename={renameWard}
                    onDelete={removeWard}
                    addPlaceholder="Add ward…"
                    disabledHint={selectedSubcounty ? undefined : 'Select a subcounty in the middle column to manage its wards.'}
                    isLast
                />
            </div>
        </div>
    );
};

export default LocationsPage;
