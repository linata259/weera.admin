import React, { useEffect, useMemo, useState } from 'react';
import { fetchTransactions } from '../api/financialService';
import { WalletTransaction } from '../types';
import { exportCsv } from '../utils/exportCsv';
import { exportPdf } from '../utils/exportPdf';
import { Avatar } from '../../shared/Avatar'



// const ORANGE='#EA580C';
 const NAVY='#0F172A'; const SLATE='#64748B'; const BORDER='#E2E8F0'; const BG='#F8FAFC';
const ROWS=10;

const TX_STYLE:Record<string,{label:string;color:string;bg:string}> = {
  deposit:          {label:'Deposit',         color:'#16A34A',bg:'#DCFCE7'},
  withdrawal:       {label:'Withdrawal',       color:'#DC2626',bg:'#FEE2E2'},
  escrow_lock:      {label:'Escrow Lock',      color:'#CA8A04',bg:'#FEF9C3'},
  escrow_release:   {label:'Escrow Release',   color:'#16A34A',bg:'#DCFCE7'},
  escrow_refund:    {label:'Escrow Refund',    color:'#2563EB',bg:'#DBEAFE'},
  milestone_payment:{label:'Milestone',        color:'#16A34A',bg:'#DCFCE7'},
  platform_fee:     {label:'Platform Fee',     color:'#DC2626',bg:'#FEE2E2'},
};
const txS=(t:string)=>TX_STYLE[t]??{label:t.replace(/_/g,' '),color:SLATE,bg:BG};
const stS=(s:string)=>({completed:{color:'#16A34A',bg:'#DCFCE7'},pending:{color:'#CA8A04',bg:'#FEF9C3'},failed:{color:'#DC2626',bg:'#FEE2E2'}}[s]??{color:SLATE,bg:BG});
const fmt=(iso:string)=>new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'});
// const fmtAmt=(n:number)=>`KES ${n.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const isCredit=(t:string)=>['deposit','escrow_release','escrow_refund','milestone_payment'].includes(t);

export const TransactionsTable:React.FC = () => {
  const [rows,setRows]=useState<WalletTransaction[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [typeF,setTypeF]=useState('all');
  const [statusF,setStatusF]=useState('all');
  const [dateFrom,setDateFrom]=useState('');
  const [dateTo,setDateTo]=useState('');
  const [page,setPage]=useState(1);
  const [sortKey,setSortKey]=useState<keyof WalletTransaction>('createdAt');
  const [sortDir,setSortDir]=useState<'asc'|'desc'>('desc');

  useEffect(()=>{fetchTransactions().then(setRows).finally(()=>setLoading(false));},[]);

  const handleSort=(k:keyof WalletTransaction)=>{
    if(sortKey===k) setSortDir(d=>d==='asc'?'desc':'asc');
    else{setSortKey(k);setSortDir('asc');}
  };

  const filtered=useMemo(()=>{
    let list=rows;
    if(search.trim()){const q=search.toLowerCase();list=list.filter(r=>r.userName.toLowerCase().includes(q)||(r.jobTitle??'').toLowerCase().includes(q)||(r.reference??'').toLowerCase().includes(q));}
    if(typeF!=='all') list=list.filter(r=>r.type===typeF);
    if(statusF!=='all') list=list.filter(r=>r.status===statusF);
    if(dateFrom){const f=new Date(dateFrom).getTime();list=list.filter(r=>new Date(r.createdAt).getTime()>=f);}
    if(dateTo){const t=new Date(dateTo).getTime();list=list.filter(r=>new Date(r.createdAt).getTime()<=t);}
    return [...list].sort((a,b)=>{
      const av=a[sortKey],bv=b[sortKey];
      if(av==null) return 1; if(bv==null) return -1;
      return sortDir==='asc'?(av<bv?-1:1):(av>bv?-1:1);
    });
  },[rows,search,typeF,statusF,dateFrom,dateTo,sortKey,sortDir]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/ROWS));
  const paginated=filtered.slice((page-1)*ROWS,page*ROWS);
  const typeOpts=Array.from(new Set(rows.map(r=>r.type))).sort();

  const exportRows=filtered.map((r,i)=>[i+1,r.reference??r.id.slice(0,8),r.type,fmt(r.createdAt),r.userName,r.jobTitle??'—',isCredit(r.type)?`+${r.amount}`:`-${r.amount}`,r.status]);
  const exportHeaders=['Sr.No.','Reference','Type','Date','User','Job','Amount','Status'];

  const th:React.CSSProperties={padding:'12px 16px',textAlign:'left',fontSize:13,fontWeight:600,color:SLATE,borderBottom:`1px solid ${BORDER}`,whiteSpace:'nowrap',background:BG,cursor:'pointer',userSelect:'none'};
  const td:React.CSSProperties={padding:'14px 16px',fontSize:14,color:NAVY,borderBottom:'1px solid #F1F5F9',verticalAlign:'middle'};

  const SortArrow=({k}:{k:keyof WalletTransaction})=>sortKey===k?<span style={{marginLeft:4,fontSize:10}}>{sortDir==='asc'?'↑':'↓'}</span>:null;

  if(loading) return <div style={{padding:'48px 0',textAlign:'center',color:SLATE,fontSize:14}}>Loading transactions…</div>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>

      {/* toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',flex:1}}>
          {/* search */}
          <div style={{position:'relative',flex:'1 1 200px',maxWidth:300}}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
              <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5"/><path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search transactions…"
              style={{width:'100%',boxSizing:'border-box',padding:'9px 12px 9px 34px',border:`1px solid ${BORDER}`,borderRadius:10,fontSize:13,outline:'none',fontFamily:'inherit'}}/>
          </div>
          <select value={typeF} onChange={e=>{setTypeF(e.target.value);setPage(1);}} style={{padding:'9px 14px',border:`1px solid ${BORDER}`,borderRadius:10,fontSize:13,outline:'none',color:NAVY,background:'#fff',fontFamily:'inherit',minWidth:160}}>
            <option value="all">All Types</option>
            {typeOpts.map(t=><option key={t} value={t}>{txS(t).label}</option>)}
          </select>
          <select value={statusF} onChange={e=>{setStatusF(e.target.value);setPage(1);}} style={{padding:'9px 14px',border:`1px solid ${BORDER}`,borderRadius:10,fontSize:13,outline:'none',color:NAVY,background:'#fff',fontFamily:'inherit',minWidth:130}}>
            <option value="all">All Statuses</option>
            {['completed','pending','failed'].map(s=><option key={s} value={s} style={{textTransform:'capitalize'}}>{s}</option>)}
          </select>
          <div style={{display:'flex',alignItems:'center',gap:6,border:`1px solid ${BORDER}`,borderRadius:10,padding:'6px 12px',background:'#fff'}}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="12" rx="2" stroke="#94A3B8" strokeWidth="1.4"/><path d="M1 7h14M5 1v4M11 1v4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(1);}} style={{border:'none',outline:'none',fontSize:12,color:SLATE,fontFamily:'inherit',background:'transparent'}}/>
            <span style={{color:'#CBD5E1'}}>–</span>
            <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(1);}} style={{border:'none',outline:'none',fontSize:12,color:SLATE,fontFamily:'inherit',background:'transparent'}}/>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <ExBtn label="CSV" onClick={()=>exportCsv('transactions',exportHeaders,exportRows)}/>
          <ExBtn label="PDF" onClick={()=>exportPdf('Transaction History',exportHeaders,exportRows)}/>
        </div>
      </div>

      {/* table */}
      <div style={{border:`1px solid ${BORDER}`,borderRadius:14,overflow:'hidden',background:'#fff'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
            <thead>
              <tr>
                <th style={{...th,width:56}}>Sr. No.</th>
                <th style={th} onClick={()=>handleSort('reference')}>Reference <SortArrow k="reference"/></th>
                <th style={th} onClick={()=>handleSort('type')}>Type <SortArrow k="type"/></th>
                <th style={th} onClick={()=>handleSort('createdAt')}>Date <SortArrow k="createdAt"/></th>
                <th style={th} onClick={()=>handleSort('userName')}>User <SortArrow k="userName"/></th>
                <th style={th} onClick={()=>handleSort('jobTitle')}>Project <SortArrow k="jobTitle"/></th>
                <th style={th} onClick={()=>handleSort('amount')}>Amount <SortArrow k="amount"/></th>
                <th style={th} onClick={()=>handleSort('status')}>Status <SortArrow k="status"/></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length===0?(
                <tr><td colSpan={8} style={{...td,textAlign:'center',color:'#94A3B8',padding:'48px 0'}}>No transactions found</td></tr>
              ):paginated.map((r,idx)=>{
                const ts=txS(r.type); const ss=stS(r.status); const credit=isCredit(r.type);
                return (
                  <tr key={r.id} onMouseEnter={e=>e.currentTarget.style.background=BG} onMouseLeave={e=>e.currentTarget.style.background='#fff'} style={{transition:'background 0.1s'}}>
                    <td style={{...td,color:'#94A3B8',fontSize:13}}>{String((page-1)*ROWS+idx+1).padStart(2,'0')}</td>
                    <td style={{...td,fontSize:12,color:SLATE,fontFamily:'monospace'}}>{r.reference??r.id.slice(0,8).toUpperCase()}</td>
                    <td style={td}><span style={{padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:600,background:ts.bg,color:ts.color,whiteSpace:'nowrap'}}>{ts.label}</span></td>
                    <td style={{...td,color:SLATE,whiteSpace:'nowrap'}}>{fmt(r.createdAt)}</td>
                    <td style={td}><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar src={r.userAvatar} name={r.userName} size={30}/><span style={{fontSize:13}}>{r.userName}</span></div></td>
                    <td style={{...td,maxWidth:160,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.jobTitle??r.description??<span style={{color:'#CBD5E1'}}>—</span>}</td>
                    <td style={{...td,fontWeight:700,color:credit?'#16A34A':'#DC2626'}}>{credit?'+':'-'}{r.amount.toFixed(2)}</td>
                    <td style={td}><span style={{padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:600,background:ss.bg,color:ss.color,whiteSpace:'nowrap'}}>{r.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages>1&&(
          <div style={{padding:'14px 20px',borderTop:'1px solid #F1F5F9',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
            <span style={{fontSize:13,color:SLATE}}>Page {page} of {totalPages} — {filtered.length} results</span>
            <div style={{display:'flex',gap:6}}>
              <PBtn label="← Prev" disabled={page===1} onClick={()=>setPage(p=>p-1)}/>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>i+1).map(n=><PBtn key={n} label={String(n)} active={n===page} onClick={()=>setPage(n)}/>)}
              <PBtn label="Next →" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ExBtn:React.FC<{label:string;onClick:()=>void}>=({label,onClick})=>(
  <button onClick={onClick} style={{padding:'7px 14px',border:`1px solid ${BORDER}`,borderRadius:8,background:'#fff',fontSize:13,fontWeight:600,color:NAVY,cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit'}}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 10v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2M8 2v8M5 5l3-3 3 3" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>{label}
  </button>
);
const PBtn:React.FC<{label:string;active?:boolean;disabled?:boolean;onClick:()=>void}>=({label,active,disabled,onClick})=>(
  <button onClick={onClick} disabled={disabled} style={{padding:'6px 12px',borderRadius:8,border:`1px solid ${active?NAVY:BORDER}`,background:active?NAVY:'#fff',color:active?'#fff':disabled?'#CBD5E1':NAVY,fontSize:13,fontWeight:active?700:500,cursor:disabled?'not-allowed':'pointer',fontFamily:'inherit'}}>{label}</button>
);