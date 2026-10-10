import {STAGES,CATS,META} from '../config'
import {useDb,nm} from '../api'
// Read-only workflow viewer: a terminal log on the left, the household's view of the same record on the right.
export function states(p:any,db:any){
 const ls=db.lots.filter((l:any)=>l.pid===p.id),sold=ls.filter((l:any)=>l.status==='Sold').length
 const base=p.status==='Cancelled'?p.cancelledAfter:({Requested:1,Accepted:2,'On the way':3,Weighed:4,Paid:6} as any)[p.status]
 const n=base+(p.status==='Paid'&&sold?(sold===ls.length?2:1):0)
 return STAGES.map((_,i)=>i<n?'done':p.status==='Cancelled'?'cancelled':i===n?'active':'pending')
}
const PILL:any={Paid:['#dff5e8','#1b7a46'],Cancelled:['#fde2e0','#b3261e'],Requested:['#eee','#555']}
export default function Workflow({p}:{p:any}){
 const db=useDb()
 if(!p)return <p><small>No pickup to show yet.</small></p>
 const st=states(p,db),ls=db.lots.filter(l=>l.pid===p.id),ords=db.orders.filter(o=>ls.some(l=>l.id===o.lotId)).sort((a,b)=>a.at.localeCompare(b.at))
 const T=['Requested','Accepted','On the way','Weighed','Paid','Paid'],col=nm(db,p.cid),allSold=ls.length>0&&ords.length===ls.length,k=p.act||p.est
 const when=(i:number)=>{const at=i<6?p.events.find((e:any)=>e.s===T[i])?.at:i===6?ords[0]?.at:allSold?ords[ords.length-1]?.at:undefined;return at?new Date(at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'}
 const chips=(i:number):string[]=>{if(st[i]!=='done')return []
  if(i===0)return CATS.filter(c=>p.est[c]>0).map(c=>'est. '+META[c].name.toLowerCase()+' '+p.est[c]+' kg')
  if(i===1||i===2)return [col]
  if(i===3&&p.act)return CATS.filter(c=>p.act[c]>0).map(c=>META[c].name.toLowerCase()+' '+p.act[c]+' kg')
  if(i===4&&p.payout)return ['₹'+p.payout.cashTotal,p.payout.total+' pts']
  if(i===5)return ls.map(l=>l.id+' · '+l.kg+' kg')
  if(i===6)return ords.map(o=>nm(db,o.rid))
  return i===7?ords.map(o=>o.id):[]}
 const head=p.status==='Cancelled'?'This pickup was cancelled':p.status==='Accepted'?col+' accepted this pickup':p.status==='On the way'?col+' is on the way':allSold?'Your material reached a recycler':p.payout?'₹'+p.payout.cashTotal+' and '+p.payout.total+' points, credited':''
 const pill=PILL[p.status]||['#fdebd8','#b25a12']
 return <div className="wx">
  <div className="tm"><div className="tmh"><i/><i/><i/><b>Pickup {p.id}</b><span>~/kabadilink</span></div>
   <div className="tmb"><div className="pr">Track {p.id} from household request to recycler order.</div>
    {STAGES.map(([n,r],i)=><div key={n} className={'ln '+st[i]}><span className={'dt '+st[i]}/><div><b>{n}</b><div className="sl">{r} · {st[i]==='active'?'in progress':st[i]==='pending'?'pending':st[i]==='cancelled'?'cancelled, did not happen':when(i)}</div>
     {chips(i).map(c=><span key={c} className={'ch'+(i>5?' o':'')}>{c}</span>)}</div></div>)}
    <div className="pr" style={{marginTop:14,marginBottom:0}}/></div></div>
  <div className="bw"><div className="bwh"><i style={{background:'#ff5f57'}}/><i style={{background:'#febc2e'}}/><i style={{background:'#28c840'}}/><span className="ad"><span>🔒 kabadilink.app/pickup/{p.id}</span><span className="lvp" style={{background:pill[0],color:pill[1]}}>{p.status}</span></span></div>
   <div className="bwc">{p.status==='Requested'?<div style={{display:'grid',placeItems:'center',height:'100%',color:'#777',textAlign:'center'}}><div style={{fontSize:34}}>♻️<br/><span style={{fontSize:14}}>Waiting for a collector to accept</span></div></div>
    :<div className="vh"><small>PICKUP {p.id} · {p.date} · {p.slot}</small><h3>{head}</h3>
     {CATS.map(c=><div className="row" key={c}><span>{META[c].icon} {META[c].name}</span><b>{k[c]} kg {p.act?'':'(est.)'}</b></div>)}
     <div className="row"><span>Collector</span><b>{col}</b></div>
     {p.payout?<div className="row"><span>Cash · points</span><b>₹{p.payout.cashTotal} · {p.payout.total}</b></div>:<p style={{fontSize:13,color:'#b9d8c4'}}>Payout is confirmed after weigh-in.</p>}</div>}</div></div></div>
}
