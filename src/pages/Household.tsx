import {useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {CATS,META,SLOTS,CATALOG} from '../config'
import {useDb,api,attempt,nm} from '../api'
import {calc,balanceOf,tierOf,nextTier} from '../calc'
import Workflow from '../components/Workflow'
import {Bars,HBars,Strip,Panel} from '../components/Charts'
const useMe=()=>{const db=useDb();return {db,me:db.users.find(u=>u.id===db.session)!}}
export function HDash(){
 const {db,me}=useMe(),mine=db.pickups.filter(p=>p.hid===me.id),paid=mine.filter(p=>p.status==='Paid'),bal=balanceOf(db.ledger,me.id),act=mine.find(p=>['Requested','Accepted','On the way'].includes(p.status))
 const kg=CATS.map(k=>paid.reduce((a,p)=>a+p.act![k],0)),recent=paid.slice(-8)
 return <div className="pg"><p className="ey">HOUSEHOLD</p><h2>Namaste, <em>{me.name.split(' ')[0]}.</em></h2>
  <Strip items={[['Green Points',bal,tierOf(db.cfg,bal).name+' tier'],['Cash earned','₹'+paid.reduce((a,p)=>a+p.payout.cashTotal,0)],['Recyclable weight',paid.reduce((a,p)=>a+p.payout.kgTotal,0)+' kg'],['Pickups',mine.length,paid.length+' completed'],['Active pickup',act?act.status:'None']]}/>
  <div className="cols"><Panel title="What you have sorted" sub="Kilograms by material, completed pickups"><HBars max={Math.max(...kg,1)} fmt={n=>n+' kg'} rows={CATS.map((k,i)=>({label:META[k].icon+' '+META[k].name,value:kg[i],color:META[k].color}))}/></Panel>
   <Panel title="Points per pickup" sub="Your last completed pickups"><Bars w={380} h={170} data={recent.map(p=>({label:p.id.slice(-2),values:[p.payout.total]}))} fmt={n=>String(Math.round(n))} label="Green Points earned per pickup"/></Panel></div>
  <h3 style={{margin:'30px 0 12px'}}>{act?'Active pickup '+act.id:'No active pickup'}</h3>{act?<Workflow p={act}/>:<p>Nothing scheduled. <Link className="bt2" to="/h/new">Schedule a pickup</Link></p>}</div>
}
export function NewPickup(){
 const {db,me}=useMe(),go=useNavigate(),bal=balanceOf(db.ledger,me.id),c=db.cfg
 const [on,setOn]=useState<any>({plastic:true,wet:true,ewaste:false}),[kg,setKg]=useState<any>({plastic:3,wet:5,ewaste:1}),[f,setF]=useState({date:new Date().toISOString().slice(0,10),slot:SLOTS[0],address:me.area,note:''}),[files,setFiles]=useState<any>({})
 const eff:any={};CATS.forEach(k=>eff[k]=on[k]?+kg[k]||0:0)
 const r=calc(c,eff,bal)
 return <div className="pg"><p className="ey">SCHEDULE</p><h2>Request a <em>pickup.</em></h2><div className="wf"><div>
  {CATS.map(k=><div key={k} className="cc" style={{border:'2px solid '+META[k].color,borderRadius:16,padding:14,marginBottom:12}}>
   <label><input type="checkbox" checked={on[k]} onChange={e=>setOn({...on,[k]:e.target.checked})}/> <b>{META[k].icon} {META[k].name}</b> <small>{k==='wet'?c.ppk[k]+' pts/kg · points only · max '+c.wetCap+' kg/day':'₹'+c.rate[k]+'/kg · '+c.ppk[k]+' pts/kg'}</small></label>
   {on[k]&&<div className="st"><input type="range" min="0" max={k==='wet'?c.wetCap:30} step="0.5" value={kg[k]} onChange={e=>setKg({...kg,[k]:+e.target.value})}/><input type="number" min="0" step="0.5" value={kg[k]} onChange={e=>setKg({...kg,[k]:+e.target.value})} style={{width:80}}/> kg
    <small>≈ {k==='wet'?'no cash':'₹'+r.cash[k]} · {r.sub[k]} pts</small></div>}
   {k==='ewaste'&&<small className="wr">Keep batteries in a separate bag. Do not crush or open devices.</small>}
   {on[k]&&<div><small>Photos (names only; upload needs the backend): </small><input type="file" accept="image/*" multiple onChange={e=>setFiles({...files,[k]:Array.from(e.target.files||[]).map((x:any)=>x.name)})}/>{/* backend here (S3 presigned upload for waste photos) */}</div>}</div>)}
  <div className="fg"><label>Date<br/><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></label><label>Time slot<br/><select value={f.slot} onChange={e=>setF({...f,slot:e.target.value})}>{SLOTS.map(s=><option key={s}>{s}</option>)}</select></label></div>
  <p><label>Address<br/><input style={{width:'100%'}} value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></label></p><p><label>Instructions (optional)<br/><textarea style={{width:'100%'}} value={f.note} onChange={e=>setF({...f,note:e.target.value})}/></label></p></div>
  <div className="cd" style={{alignSelf:'start',position:'sticky',top:90}}><small>ESTIMATE · NOT CONFIRMED UNTIL WEIGH-IN</small>
   {CATS.map(k=><div className="row" key={k}><span>{META[k].name}</span><b>{r.k[k]} kg · {r.sub[k]} pts</b></div>)}
   <div className="row"><span>Total weight</span><b>{r.kgTotal} kg</b></div><div className="row"><span>Plastic payout</span><b>₹{r.cash.plastic}</b></div><div className="row"><span>E-waste payout</span><b>₹{r.cash.ewaste}</b></div><div className="row"><span>Total cash</span><b>₹{r.cashTotal}</b></div>
   <div className="row"><span>{r.subtotal} × {r.mult}x tier</span><b>{r.base}</b></div><div className="row"><span>Streak and quality bonus</span><b>+{r.streak+r.quality}</b></div><div className="row"><span>Estimated points</span><b className="on">{r.total}</b></div>
   <button className="pb" onClick={async()=>{let id='';if(await attempt(async()=>{id=await api.createPickup({...f,kg:eff})}))go('/pickup/'+id)}}>Request pickup</button></div></div></div>
}
export function History(){
 const {db,me}=useMe(),[st,setSt]=useState('All'),[cat,setCat]=useState('All'),[from,setFrom]=useState('')
 const rows=db.pickups.filter(p=>p.hid===me.id&&(st==='All'||p.status===st)&&(cat==='All'||(p.act||p.est)[cat as any]>0)&&(!from||p.date>=from))
 return <div className="pg"><p className="ey">HISTORY</p><h2>Your <em>pickups.</em></h2><div className="ctl" style={{justifyContent:'flex-start'}}>
  <select value={st} onChange={e=>setSt(e.target.value)}>{['All','Requested','Accepted','On the way','Paid','Cancelled'].map(s=><option key={s}>{s}</option>)}</select>
  <select value={cat} onChange={e=>setCat(e.target.value)}><option>All</option>{CATS.map(k=><option key={k} value={k}>{META[k].name}</option>)}</select><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div>
  {rows.length?<div style={{overflowX:'auto'}}><table><thead><tr><th>ID</th><th>Date and slot</th><th>Collector</th><th>Estimated kg</th><th>Actual kg</th><th>Cash</th><th>Points</th><th>Status</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}>
   <td><Link to={'/pickup/'+p.id}>{p.id}</Link></td><td>{p.date} · {p.slot}</td><td>{nm(db,p.cid)}</td><td>{CATS.map(k=>p.est[k]).join(' / ')}</td><td>{p.act?CATS.map(k=>p.act![k]).join(' / '):'—'}</td><td>{p.payout?'₹'+p.payout.cashTotal:'—'}</td><td>{p.payout?p.payout.total:'—'}</td><td><span className="tag">{p.status}</span></td></tr>)}</tbody></table></div>:<p>No pickups match these filters.</p>}
  <small>Weights are plastic / wet / e-waste.</small></div>
}
export function Rewards(){
 const {db,me}=useMe(),[f,setF]=useState('all'),bal=balanceOf(db.ledger,me.id),t=tierOf(db.cfg,bal),nx=nextTier(db.cfg,bal),led=db.ledger.filter(l=>l.uid===me.id&&(f==='all'||l.cat===f)).slice().reverse()
 const mine=db.pickups.filter(p=>p.hid===me.id&&p.status==='Paid'),earned=db.ledger.filter(l=>l.uid===me.id&&l.pts>0).reduce((a,l)=>a+l.pts,0),tot:any={};CATS.forEach(k=>tot[k]=mine.reduce((a,p)=>a+p.act![k],0))
 const BAD=[['Plastic Warrior','plastic',20],['Compost Champion','wet',20],['E-waste Hero','ewaste',5]] as any
 const cards=mine.filter(p=>!p.scratched)
 return <div className="pg"><p className="ey">GREEN POINTS</p><h2>Your <em>rewards.</em></h2>
  <Strip items={[[t.name+' tier · '+t.mult+'x',bal+' pts',nx?(nx.min-bal)+' points to '+nx.name:'Top tier reached'],['Earned',earned],['Redeemed',earned-bal],['Pickups completed',mine.length]]}/>
  <div className="bar" style={{height:10,marginBottom:6}}><i style={{width:nx?Math.min(100,(bal-t.min)/(nx.min-t.min)*100)+'%':'100%'}}/></div>
  <div className="cols"><Panel title="By material" sub="Total kilograms"><HBars max={Math.max(...CATS.map(k=>tot[k]),1)} fmt={n=>n+' kg'} rows={CATS.map(k=>({label:META[k].icon+' '+META[k].name,value:tot[k],color:META[k].color}))}/></Panel>
   <Panel title="Badges" sub="Progress to each badge">{BAD.map((b:any)=><p key={b[0]} style={{margin:'6px 0'}}>{tot[b[1]]>=b[2]?'🏅':'🔒'} {b[0]} <small>({Math.min(tot[b[1]],b[2])}/{b[2]} kg)</small><span className="bar" style={{display:'block',marginTop:4}}><i style={{width:Math.min(100,tot[b[1]]/b[2]*100)+'%'}}/></span></p>)}</Panel></div>
  <h3 style={{margin:'30px 0 12px'}}>Scratch cards</h3>{cards.length?cards.map(p=><button key={p.id} className="bt2" style={{marginRight:8}} onClick={()=>attempt(()=>alert('Mock outcome: +'+api.scratchCard(p.id)+' points'))}>Scratch {p.id}</button>):<p><small>Complete a pickup to earn a scratch card. Outcomes are mock values.</small></p>}
  <h3 style={{margin:'30px 0 12px'}}>Rewards catalog</h3><div style={{overflowX:'auto'}}><table><thead><tr><th>Reward</th><th>Type</th><th>Needs</th><th>Left</th><th>Cost</th><th/></tr></thead><tbody>{CATALOG.map(r=><tr key={r.id}><td><b>{r.name}</b><br/><small>{r.desc}</small></td><td>{r.kind}</td><td>{r.req}</td><td>{r.stock}</td><td><b>{r.cost} pts</b></td><td><button className="bt2" onClick={()=>confirm('Redeem '+r.name+' for '+r.cost+' points?')&&attempt(()=>api.redeemReward(r.id))}>Redeem</button></td></tr>)}</tbody></table></div>
  <h3 style={{margin:'30px 0 12px'}}>Redemption history</h3>{db.redemptions.filter(r=>r.uid===me.id).map(r=><div key={r.id} className="row"><span>{r.name} · {r.status}</span><b>−{r.cost}</b></div>)}{!db.redemptions.some(r=>r.uid===me.id)&&<p><small>Nothing redeemed yet.</small></p>}
  <h3 style={{margin:'30px 0 12px'}}>Points ledger</h3><select value={f} onChange={e=>setF(e.target.value)}><option value="all">All</option>{[...CATS,'bonus','scratch','redeem'].map(k=><option key={k}>{k}</option>)}</select>
  {led.map(l=><div key={l.id} className="row"><span>{new Date(l.at).toLocaleDateString('en-IN')} · {l.note}</span><b className={l.pts<0?'wr':'on'}>{l.pts>0?'+':''}{l.pts}</b></div>)}{!led.length&&<p><small>No entries for this filter.</small></p>}</div>
}
