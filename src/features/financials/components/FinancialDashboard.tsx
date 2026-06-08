import React, { useEffect, useState } from 'react';
import { fetchFinancialSummary, fetchMonthlyRevenue, fetchPendingWithdrawals } from '../api/financialService';
import { FinancialSummary, MonthlyRevenue, WalletTransaction } from '../types';
import { exportCsv } from '../utils/exportCsv';
import { exportPdf } from '../utils/exportPdf';
import { Avatar } from '../../shared/Avatar'


const ORANGE='#EA580C'; const NAVY='#0F172A'; const SLATE='#64748B'; const BORDER='#E2E8F0'; const BG='#F8FAFC';

const fmtK = (n:number) => n>=1000 ? `${(n/1000).toFixed(1)}K` : n.toFixed(0);
const fmtAmt = (n:number) => `KES ${n.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmt = (iso:string) => new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'});

/* stat card */
const StatCard:React.FC<{icon:React.ReactNode;label:string;value:string;sub:string;accent:string}> = ({icon,label,value,sub,accent}) => (
  <div style={{background:'#fff',border:`1px solid ${BORDER}`,borderRadius:14,padding:'20px 24px',display:'flex',flexDirection:'column',gap:8,position:'relative',overflow:'hidden'}}>
    <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:accent,borderRadius:'14px 14px 0 0'}}/>
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{width:36,height:36,borderRadius:10,background:BG,display:'flex',alignItems:'center',justifyContent:'center'}}>{icon}</div>
      <span style={{fontSize:13,color:SLATE,fontWeight:500}}>{label}</span>
    </div>
    <div style={{fontSize:28,fontWeight:800,color:NAVY,letterSpacing:-0.5}}>{value}</div>
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6l4-4 4 4" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round"/></svg>
      <span style={{fontSize:12,color:'#16A34A',fontWeight:600}}>{sub}</span>
    </div>
  </div>
);

/* dual line chart */
const DualLineChart:React.FC<{data:MonthlyRevenue[];title:string}> = ({data,title}) => {
  if(!data.length) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,color:'#CBD5E1',fontSize:13}}>No data</div>;
  const W=100,H=80;
  const maxR=Math.max(...data.map(d=>d.revenue),1);
  const maxE=Math.max(...data.map(d=>d.escrow),1);
  const mx=Math.max(maxR,maxE,1);
  const pt=(v:number,i:number)=>({x:data.length===1?W/2:(i/(data.length-1))*W,y:H-(v/mx)*(H-10)});
  const revPts=data.map((d,i)=>pt(d.revenue,i));
  const escPts=data.map((d,i)=>pt(d.escrow,i));
  const line=(pts:{x:number;y:number}[])=>pts.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
  const ticks=[0,25,50,75,100].map(pct=>({y:H-(pct/100)*(H-10),label:Math.round((pct/100)*mx)}));
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <span style={{fontSize:14,fontWeight:700,color:NAVY}}>{title}</span>
        <div style={{display:'flex',gap:12}}>
          {[{color:ORANGE,label:'Revenue'},{color:NAVY,label:'Escrow'}].map(({color,label})=>(
            <div key={label} style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:8,height:8,borderRadius:2,background:color}}/>
              <span style={{fontSize:11,color:SLATE}}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{position:'relative',paddingLeft:36,paddingBottom:24}}>
        {ticks.map((t,i)=>(
          <div key={i} style={{position:'absolute',left:0,top:`${(t.y/H)*100}%`,transform:'translateY(-50%)',fontSize:9,color:'#94A3B8',width:32,textAlign:'right'}}>{t.label}</div>
        ))}
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:160,overflow:'visible'}}>
          {ticks.map((t,i)=><line key={i} x1="0" y1={t.y} x2={W} y2={t.y} stroke="#F1F5F9" strokeWidth="0.5"/>)}
          <path d={line(revPts)} fill="none" stroke={ORANGE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d={line(escPts)} fill="none" stroke={NAVY}   strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2"/>
          {revPts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="2" fill={ORANGE}/>)}
          {escPts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="2" fill={NAVY}/>)}
        </svg>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
          {data.map((d,i)=><span key={i} style={{fontSize:9,color:'#94A3B8',flex:1,textAlign:'center'}}>{d.month.toUpperCase()}</span>)}
        </div>
      </div>
    </div>
  );
};

export const FinancialDashboard:React.FC = () => {
  const [summary,setSummary]=useState<FinancialSummary|null>(null);
  const [monthly,setMonthly]=useState<MonthlyRevenue[]>([]);
  const [withdrawals,setWithdrawals]=useState<WalletTransaction[]>([]);
  const [loading,setLoading]=useState(true);
  const [sortKey,setSortKey]=useState<keyof WalletTransaction>('createdAt');
  const [sortDir,setSortDir]=useState<'asc'|'desc'>('desc');
  const [selectedIds,setSelectedIds]=useState<Set<string>>(new Set());

  useEffect(()=>{
    Promise.all([fetchFinancialSummary(),fetchMonthlyRevenue(),fetchPendingWithdrawals()])
      .then(([s,m,w])=>{setSummary(s);setMonthly(m);setWithdrawals(w);})
      .finally(()=>setLoading(false));
  },[]);

  const sorted=[...withdrawals].sort((a,b)=>{
    const av=a[sortKey], bv=b[sortKey];
    if(av==null) return 1; if(bv==null) return -1;
    return sortDir==='asc'?(av<bv?-1:1):(av>bv?-1:1);
  });

  const handleSort=(k:keyof WalletTransaction)=>{
    if(sortKey===k) setSortDir(d=>d==='asc'?'desc':'asc');
    else{setSortKey(k);setSortDir('asc');}
  };

  const exportData=()=>{
    const headers=['Sr.No.','Reference','Bidder','Amount','Request Date','Status'];
    const rows=withdrawals.map((r,i)=>[i+1,r.reference??r.id.slice(0,8),r.userName,r.amount,fmt(r.createdAt),r.status]);
    return {headers,rows};
  };

  if(loading) return <div style={{padding:'48px 0',textAlign:'center',color:SLATE,fontSize:14}}>Loading financials…</div>;

  const th:React.CSSProperties={padding:'12px 16px',textAlign:'left',fontSize:13,fontWeight:600,color:SLATE,borderBottom:`1px solid ${BORDER}`,whiteSpace:'nowrap',background:BG,cursor:'pointer'};
  const td:React.CSSProperties={padding:'14px 16px',fontSize:14,color:NAVY,borderBottom:'1px solid #F1F5F9',verticalAlign:'middle'};

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24,fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>

      {/* stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
        <StatCard accent={NAVY} label="Total Revenue" value={`KES ${fmtK(summary?.totalRevenue??0)}`} sub="Platform earnings" icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke={NAVY} strokeWidth="1.4"/><path d="M8 4v8M5 6h4.5a1.5 1.5 0 010 3H5" stroke={NAVY} strokeWidth="1.4" strokeLinecap="round"/></svg>}/>
        <StatCard accent="#2563EB" label="Funds in Escrow" value={`KES ${fmtK(summary?.fundsInEscrow??0)}`} sub="Held securely" icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="8" rx="2" stroke="#2563EB" strokeWidth="1.4"/><path d="M5 6V5a3 3 0 016 0v1" stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round"/></svg>}/>
        <StatCard accent="#CA8A04" label="Pending Withdrawals" value={String(summary?.pendingWithdrawalsCount??0)} sub={`KES ${fmtK(summary?.pendingWithdrawalsAmount??0)} total`} icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="#CA8A04" strokeWidth="1.4" strokeLinecap="round"/><path d="M2 12h12" stroke="#CA8A04" strokeWidth="1.4" strokeLinecap="round"/></svg>}/>
        <StatCard accent="#16A34A" label="New Deposits (30d)" value={`KES ${fmtK(summary?.newDeposits??0)}`} sub="Last 30 days" icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round"/><path d="M2 12h12" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round"/></svg>}/>
      </div>

      {/* charts */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={{background:'#fff',border:`1px solid ${BORDER}`,borderRadius:14,padding:24}}><DualLineChart data={monthly} title="Revenue Growth"/></div>
        <div style={{background:'#fff',border:`1px solid ${BORDER}`,borderRadius:14,padding:24}}><DualLineChart data={monthly.slice(-6)} title="Revenue Growth (6 mo)"/></div>
      </div>

      {/* pending withdrawals */}
      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <span style={{fontSize:16,fontWeight:700,color:NAVY}}>Pending Withdrawals</span>
          <div style={{display:'flex',gap:8}}>
            <ExportBtn label="CSV" onClick={()=>{const {headers,rows}=exportData();exportCsv('pending_withdrawals',headers,rows);}}/>
            <ExportBtn label="PDF" onClick={()=>{const {headers,rows}=exportData();exportPdf('Pending Withdrawals',headers,rows);}}/>
          </div>
        </div>

        <div style={{border:`1px solid ${BORDER}`,borderRadius:14,overflow:'hidden',background:'#fff'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:640}}>
            <thead>
              <tr>
                <th style={{...th,width:48}}><input type="checkbox" checked={selectedIds.size===sorted.length&&sorted.length>0} onChange={()=>setSelectedIds(prev=>prev.size===sorted.length?new Set():new Set(sorted.map(r=>r.id)))} style={{accentColor:ORANGE}}/></th>
                {[['Sr.No.',''],['reference' as keyof WalletTransaction,'Request Id'],['userName' as keyof WalletTransaction,'Bidder'],['amount' as keyof WalletTransaction,'Amount'],['createdAt' as keyof WalletTransaction,'Request Date'],['status' as keyof WalletTransaction,'Status'],['','Action']].map(([k,l])=>(
                  <th key={String(l)} style={{...th,textAlign:l==='Action'?'right':'left'}} onClick={()=>k&&k!==''&&handleSort(k as keyof WalletTransaction)}>
                    {l}{sortKey===k&&<span style={{marginLeft:4}}>{sortDir==='asc'?'↑':'↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length===0?(
                <tr><td colSpan={8} style={{...td,textAlign:'center',color:'#94A3B8',padding:'48px 0'}}>No pending withdrawals</td></tr>
              ):sorted.map((r,idx)=>(
                <tr key={r.id} style={{transition:'background 0.1s'}} onMouseEnter={e=>e.currentTarget.style.background=BG} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <td style={td}><input type="checkbox" checked={selectedIds.has(r.id)} onChange={()=>setSelectedIds(p=>{const n=new Set(p);n.has(r.id)?n.delete(r.id):n.add(r.id);return n;})} style={{accentColor:ORANGE}}/></td>
                  <td style={{...td,color:'#94A3B8',fontSize:13}}>{String(idx+1).padStart(2,'0')}</td>
                  <td style={{...td,fontSize:12,color:SLATE,fontFamily:'monospace'}}>{r.reference??r.id.slice(0,8).toUpperCase()}</td>
                  <td style={td}><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar src={r.userAvatar} name={r.userName} size={32}/><span>{r.userName}</span></div></td>
                  <td style={{...td,fontWeight:700}}>{fmtAmt(r.amount)}</td>
                  <td style={{...td,color:SLATE,whiteSpace:'nowrap'}}>{fmt(r.createdAt)}</td>
                  <td style={td}><span style={{padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:600,background:'#FEF9C3',color:'#CA8A04'}}>Pending</span></td>
                  <td style={{...td,textAlign:'right'}}>
                    <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${BORDER}`,background:'#fff',fontSize:12,fontWeight:600,color:NAVY,cursor:'pointer',fontFamily:'inherit'}}>Approve</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ExportBtn:React.FC<{label:string;onClick:()=>void}> = ({label,onClick}) => (
  <button onClick={onClick} style={{padding:'7px 14px',border:`1px solid ${BORDER}`,borderRadius:8,background:'#fff',fontSize:13,fontWeight:600,color:NAVY,cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit'}}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 10v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2M8 2v8M5 5l3-3 3 3" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    {label}
  </button>
);