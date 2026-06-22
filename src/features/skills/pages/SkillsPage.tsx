/* ─── src/features/skills/pages/SkillsPage.tsx ──────────────── */
import React, { useEffect, useMemo, useState } from 'react';
import {
  createCategory, createSkill,
  deleteCategory, deleteSkill,
  fetchCategories, fetchSkills,
  updateCategory, updateSkill,
} from '../api/skillsService';
import { JobCategory, Skill } from '../types';

/* ── design tokens ──────────────────────────────────────────── */
const ORANGE = '#EA580C';
const NAVY   = '#0F172A';
const SLATE  = '#64748B';
const BORDER = '#E2E8F0';
const BG     = '#F8FAFC';
const RED    = '#DC2626';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/* ── Modal ──────────────────────────────────────────────────── */
const Modal: React.FC<{
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmColor?: string;
  loading?: boolean;
  children: React.ReactNode;
}> = ({ title, onClose, onConfirm, confirmLabel = 'Save', confirmColor = NAVY, loading = false, children }) => (
  <>
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.35)',
      backdropFilter: 'blur(2px)', zIndex: 200,
    }} />
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%,-50%)',
      background: '#fff', borderRadius: 16, zIndex: 201,
      width: 'min(440px, 92vw)',
      boxShadow: '0 20px 60px rgba(15,23,42,0.18)',
      fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
    }}>
      <div style={{
        padding: '18px 24px', borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{title}</span>
        <button onClick={onClose} style={{
          width: 30, height: 30, borderRadius: 8,
          border: `1px solid ${BORDER}`, background: '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke={SLATE} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
      <div style={{
        padding: '14px 24px', borderTop: `1px solid ${BORDER}`,
        display: 'flex', gap: 10, justifyContent: 'flex-end',
      }}>
        <button onClick={onClose} style={{
          padding: '9px 20px', borderRadius: 10,
          border: `1px solid ${BORDER}`, background: '#fff',
          fontSize: 14, fontWeight: 600, color: SLATE,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>Cancel</button>
        <button onClick={onConfirm} disabled={loading} style={{
          padding: '9px 20px', borderRadius: 10,
          border: 'none', background: confirmColor,
          fontSize: 14, fontWeight: 600, color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
        }}>{loading ? 'Saving…' : confirmLabel}</button>
      </div>
    </div>
  </>
);

/* ── ConfirmDelete ───────────────────────────────────────────── */
const ConfirmDelete: React.FC<{
  label: string; onClose: () => void; onConfirm: () => void; loading: boolean;
}> = ({ label, onClose, onConfirm, loading }) => (
  <Modal title="Confirm Delete" onClose={onClose} onConfirm={onConfirm}
    confirmLabel="Delete" confirmColor={RED} loading={loading}>
    <p style={{ margin: 0, fontSize: 14, color: SLATE, lineHeight: 1.6 }}>
      Are you sure you want to delete{' '}
      <strong style={{ color: NAVY }}>{label}</strong>?{' '}
      This action cannot be undone.
    </p>
  </Modal>
);

/* ── Field ───────────────────────────────────────────────────── */
const Field: React.FC<{
  label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label style={{ fontSize: 12, fontWeight: 600, color: SLATE, display: 'block', marginBottom: 6 }}>
      {label}
    </label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '10px 14px', borderRadius: 10,
        border: `1px solid ${BORDER}`, fontSize: 14,
        color: NAVY, outline: 'none', fontFamily: 'inherit',
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = ORANGE)}
      onBlur={(e)  => (e.currentTarget.style.borderColor = BORDER)}
    />
  </div>
);

/* ── IconBtn ─────────────────────────────────────────────────── */
const IconBtn: React.FC<{
  onClick: () => void; title: string; color: string; children: React.ReactNode;
}> = ({ onClick, title, color, children }) => (
  <button onClick={onClick} title={title} style={{
    width: 30, height: 30, borderRadius: 8,
    border: `1px solid ${BORDER}`, background: '#fff',
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color,
  }}
    onMouseEnter={(e) => (e.currentTarget.style.background = BG)}
    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
  >{children}</button>
);

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M11.5 2.5a2.121 2.121 0 013 3L5 15l-4 1 1-4L11.5 2.5z"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Pagination ──────────────────────────────────────────────── */
const Pagination: React.FC<{
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}> = ({ page, totalPages, pageSize, totalItems, onPage, onPageSize }) => {
  /* build page number buttons: always show first, last, current ±1 */
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  const btnBase: React.CSSProperties = {
    minWidth: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`,
    background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 8px', fontFamily: 'inherit', color: NAVY, transition: 'all 0.15s',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12, padding: '14px 20px',
      borderTop: `1px solid ${BORDER}`, background: BG,
    }}>
      {/* left: rows per page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: SLATE }}>Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          style={{
            padding: '5px 10px', borderRadius: 8, border: `1px solid ${BORDER}`,
            fontSize: 13, color: NAVY, background: '#fff',
            cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
          }}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: SLATE }}>
          {totalItems === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)}`}
          {' '}of {totalItems}
        </span>
      </div>

      {/* right: page buttons */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 4 }}>
          {/* prev */}
          <button
            onClick={() => onPage(page - 1)} disabled={page === 1}
            style={{ ...btnBase, opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} style={{ ...btnBase, cursor: 'default', border: 'none', color: SLATE }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p as number)}
                style={{
                  ...btnBase,
                  background: page === p ? ORANGE : '#fff',
                  color: page === p ? '#fff' : NAVY,
                  border: page === p ? `1px solid ${ORANGE}` : `1px solid ${BORDER}`,
                }}
                onMouseEnter={(e) => { if (page !== p) e.currentTarget.style.background = BG; }}
                onMouseLeave={(e) => { if (page !== p) e.currentTarget.style.background = '#fff'; }}
              >
                {p}
              </button>
            )
          )}

          {/* next */}
          <button
            onClick={() => onPage(page + 1)} disabled={page === totalPages}
            style={{ ...btnBase, opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M5 2l5 5-5 5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
type Tab = 'skills' | 'categories';

type SkillModal  = { type: 'create' } | { type: 'edit'; item: Skill }       | { type: 'delete'; item: Skill };
type CatModal    = { type: 'create' } | { type: 'edit'; item: JobCategory }  | { type: 'delete'; item: JobCategory };

const SkillsPage: React.FC = () => {
  const [tab,        setTab]        = useState<Tab>('skills');
  const [skills,     setSkills]     = useState<Skill[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState('');
  const [isMobile,   setIsMobile]   = useState(false); // NEW

  /* pagination state — separate per tab */
  const [skillPage,     setSkillPage]     = useState(1);
  const [skillPageSize, setSkillPageSize] = useState(25);
  const [catPage,       setCatPage]       = useState(1);
  const [catPageSize,   setCatPageSize]   = useState(25);

  const [skillModal, setSkillModal] = useState<SkillModal | null>(null);
  const [catModal,   setCatModal]   = useState<CatModal   | null>(null);
  const [formName,   setFormName]   = useState('');

  // NEW — same mobile-detection pattern used elsewhere in the app
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* load */
  useEffect(() => {
    Promise.all([fetchSkills(), fetchCategories()])
      .then(([s, c]) => { setSkills(s); setCategories(c); })
      .finally(() => setLoading(false));
  }, []);

  /* reset to page 1 when search changes */
  useEffect(() => { setSkillPage(1); setCatPage(1); }, [search]);

  /* filtered lists */
  const filteredSkills = useMemo(() => {
    const q = search.toLowerCase();
    return skills.filter((s) => s.name.toLowerCase().includes(q));
  }, [skills, search]);

  const filteredCats = useMemo(() => {
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  /* paginated slices */
  const pagedSkills = useMemo(() => {
    const start = (skillPage - 1) * skillPageSize;
    return filteredSkills.slice(start, start + skillPageSize);
  }, [filteredSkills, skillPage, skillPageSize]);

  const pagedCats = useMemo(() => {
    const start = (catPage - 1) * catPageSize;
    return filteredCats.slice(start, start + catPageSize);
  }, [filteredCats, catPage, catPageSize]);

  const skillTotalPages = Math.max(1, Math.ceil(filteredSkills.length / skillPageSize));
  const catTotalPages   = Math.max(1, Math.ceil(filteredCats.length   / catPageSize));

  /* open helpers */
  const openCreate = () => {
    setFormName('');
    tab === 'skills' ? setSkillModal({ type: 'create' }) : setCatModal({ type: 'create' });
  };
  const openEditSkill = (item: Skill) => { setFormName(item.name); setSkillModal({ type: 'edit', item }); };
  const openEditCat   = (item: JobCategory) => { setFormName(item.name); setCatModal({ type: 'edit', item }); };

  /* skill CRUD */
  const handleSkillSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    if (skillModal?.type === 'create') {
      const created = await createSkill(formName);
      if (created) setSkills((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    } else if (skillModal?.type === 'edit') {
      const ok = await updateSkill(skillModal.item.id, formName);
      if (ok) setSkills((prev) =>
        prev.map((s) => s.id === skillModal.item.id ? { ...s, name: formName.trim() } : s)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setSaving(false);
    setSkillModal(null);
  };

  const handleSkillDelete = async () => {
    if (skillModal?.type !== 'delete') return;
    setSaving(true);
    const ok = await deleteSkill(skillModal.item.id);
    if (ok) setSkills((prev) => prev.filter((s) => s.id !== skillModal.item.id));
    setSaving(false);
    setSkillModal(null);
  };

  /* category CRUD */
  const handleCatSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    if (catModal?.type === 'create') {
      const created = await createCategory(formName);
      if (created) setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    } else if (catModal?.type === 'edit') {
      const ok = await updateCategory(catModal.item.id, formName);
      if (ok) setCategories((prev) =>
        prev.map((c) => c.id === catModal.item.id ? { ...c, name: formName.trim() } : c)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setSaving(false);
    setCatModal(null);
  };

  const handleCatDelete = async () => {
    if (catModal?.type !== 'delete') return;
    setSaving(true);
    const ok = await deleteCategory(catModal.item.id);
    if (ok) setCategories((prev) => prev.filter((c) => c.id !== catModal.item.id));
    setSaving(false);
    setCatModal(null);
  };

  /* table styles */
  const th: React.CSSProperties = {
    padding: '11px 16px', textAlign: 'left', fontSize: 11,
    fontWeight: 700, color: SLATE, borderBottom: `1px solid ${BORDER}`,
    background: BG, whiteSpace: 'nowrap',
    textTransform: 'uppercase', letterSpacing: 0.6,
  };
  const td: React.CSSProperties = {
    padding: '13px 16px', fontSize: 14, color: NAVY,
    borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle',
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading)
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: SLATE, fontSize: 14,
        fontFamily: "'DM Sans',sans-serif" }}>
        Loading…
      </div>
    );

  /* current tab helpers */
  const isSkills      = tab === 'skills';
  const activeList    = isSkills ? pagedSkills    : pagedCats;
  const filteredCount = isSkills ? filteredSkills.length : filteredCats.length;
  const totalCount    = isSkills ? skills.length  : categories.length;
  const currentPage   = isSkills ? skillPage      : catPage;
  const currentSize   = isSkills ? skillPageSize  : catPageSize;
  const totalPages    = isSkills ? skillTotalPages : catTotalPages;
  const globalOffset  = (currentPage - 1) * currentSize; // for row numbering

  const handlePage     = (p: number) => isSkills ? setSkillPage(p)     : setCatPage(p);
  const handlePageSize = (n: number) => {
    if (isSkills) { setSkillPageSize(n); setSkillPage(1); }
    else          { setCatPageSize(n);   setCatPage(1); }
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* page header — CHANGED: stacks on mobile, button goes full width */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: NAVY }}>Skills & Categories</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: SLATE }}>
            Manage skills and job categories used across the platform
          </p>
        </div>
        <button onClick={openCreate} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none',
          background: ORANGE, color: '#fff', fontWeight: 700,
          fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {isSkills ? 'Add Skill' : 'Add Category'}
        </button>
      </div>

      {/* stat chips */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Skills',  value: skills.length,     color: ORANGE },
          { label: 'Categories',    value: categories.length, color: '#2563EB' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
            flex: isMobile ? '1 1 45%' : undefined,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 13, color: SLATE, fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{value}</span>
          </div>
        ))}
      </div>

      {/* card */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>

        {/* tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, padding: '0 20px' }}>
          {(['skills', 'categories'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); }} style={{
              padding: '14px 20px', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? ORANGE : SLATE,
              borderBottom: tab === t ? `2px solid ${ORANGE}` : '2px solid transparent',
              marginBottom: -1, textTransform: 'capitalize', transition: 'all 0.15s',
            }}>
              {t === 'skills' ? `Skills (${skills.length})` : `Categories (${categories.length})`}
            </button>
          ))}
        </div>

        {/* toolbar — CHANGED: stacks on mobile */}
        <div style={{
          padding: '12px 20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10,
          alignItems: isMobile ? 'stretch' : 'center', borderBottom: `1px solid ${BORDER}`, background: BG,
        }}>
          <div style={{ position: 'relative', flex: isMobile ? 'unset' : 1, maxWidth: isMobile ? '100%' : 320 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke={SLATE} strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke={SLATE} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tab}…`}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 12px 8px 34px', borderRadius: 10,
                border: `1px solid ${BORDER}`, fontSize: 13,
                color: NAVY, fontFamily: 'inherit', background: '#fff', outline: 'none',
              }}
            />
          </div>
          <span style={{ fontSize: 13, color: SLATE, marginLeft: isMobile ? 0 : 'auto' }}>
            {filteredCount} of {totalCount}
          </span>
        </div>

        {/* table / cards */}
        {isMobile ? (
          /* ── MOBILE: stacked cards — NEW ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
            {activeList.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0', fontSize: 14 }}>
                {search ? `No ${tab} match your search.` : `No ${tab} yet — add one above.`}
              </div>
            ) : isSkills ? (
              (activeList as Skill[]).map((item) => (
                <div key={item.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: NAVY, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>Added {fmtDate(item.created_at)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <IconBtn onClick={() => openEditSkill(item)} title="Edit" color={SLATE}><EditIcon /></IconBtn>
                    <IconBtn onClick={() => setSkillModal({ type: 'delete', item })} title="Delete" color={RED}><TrashIcon /></IconBtn>
                  </div>
                </div>
              ))
            ) : (
              (activeList as JobCategory[]).map((item) => (
                <div key={item.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: NAVY, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>Added {fmtDate(item.created_at)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <IconBtn onClick={() => openEditCat(item)} title="Edit" color={SLATE}><EditIcon /></IconBtn>
                    <IconBtn onClick={() => setCatModal({ type: 'delete', item })} title="Delete" color={RED}><TrashIcon /></IconBtn>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── DESKTOP TABLE ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 52, textAlign: 'center' }}>#</th>
                  <th style={th}>Name</th>
                  <th style={th}>Added</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeList.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ ...td, textAlign: 'center', color: '#94A3B8', padding: '48px 0' }}>
                      {search
                        ? `No ${tab} match your search.`
                        : `No ${tab} yet — add one above.`}
                    </td>
                  </tr>
                ) : isSkills ? (
                  (activeList as Skill[]).map((item, idx) => (
                    <tr key={item.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = BG)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                      style={{ transition: 'background 0.1s' }}>
                      <td style={{ ...td, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                        {String(globalOffset + idx + 1).padStart(2, '0')}
                      </td>
                      <td style={td}>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                      </td>
                      <td style={{ ...td, color: SLATE, fontSize: 13 }}>{fmtDate(item.created_at)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <IconBtn onClick={() => openEditSkill(item)} title="Edit" color={SLATE}><EditIcon /></IconBtn>
                          <IconBtn onClick={() => setSkillModal({ type: 'delete', item })} title="Delete" color={RED}><TrashIcon /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  (activeList as JobCategory[]).map((item, idx) => (
                    <tr key={item.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = BG)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                      style={{ transition: 'background 0.1s' }}>
                      <td style={{ ...td, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                        {String(globalOffset + idx + 1).padStart(2, '0')}
                      </td>
                      <td style={td}>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                      </td>
                      <td style={{ ...td, color: SLATE, fontSize: 13 }}>{fmtDate(item.created_at)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <IconBtn onClick={() => openEditCat(item)} title="Edit" color={SLATE}><EditIcon /></IconBtn>
                          <IconBtn onClick={() => setCatModal({ type: 'delete', item })} title="Delete" color={RED}><TrashIcon /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          pageSize={currentSize}
          totalItems={filteredCount}
          onPage={handlePage}
          onPageSize={handlePageSize}
        />
      </div>

      {/* ── skill modals ─────────────────────────────────────── */}
      {(skillModal?.type === 'create' || skillModal?.type === 'edit') && (
        <Modal
          title={skillModal.type === 'create' ? 'Add Skill' : 'Edit Skill'}
          onClose={() => setSkillModal(null)} onConfirm={handleSkillSave} loading={saving}
        >
          <Field label="Skill Name" value={formName} onChange={setFormName}
            placeholder="e.g. React, Plumbing, Graphic Design" />
        </Modal>
      )}
      {skillModal?.type === 'delete' && (
        <ConfirmDelete label={skillModal.item.name}
          onClose={() => setSkillModal(null)} onConfirm={handleSkillDelete} loading={saving} />
      )}

      {/* ── category modals ──────────────────────────────────── */}
      {(catModal?.type === 'create' || catModal?.type === 'edit') && (
        <Modal
          title={catModal.type === 'create' ? 'Add Category' : 'Edit Category'}
          onClose={() => setCatModal(null)} onConfirm={handleCatSave} loading={saving}
        >
          <Field label="Category Name" value={formName} onChange={setFormName}
            placeholder="e.g. Technology, Construction, Design" />
        </Modal>
      )}
      {catModal?.type === 'delete' && (
        <ConfirmDelete label={catModal.item.name}
          onClose={() => setCatModal(null)} onConfirm={handleCatDelete} loading={saving} />
      )}
    </div>
  );
};

export default SkillsPage;