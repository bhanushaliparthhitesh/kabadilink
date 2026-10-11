import {useState} from 'react'
import {Link} from 'react-router-dom'
import {CATS,META} from '../config'
import {useDb,api,attempt,nm} from '../api'
import {calc,balanceOf,margin,liability} from '../calc'
import {Bars,HBars,Strip,Panel} from '../components/Charts'
const useMe=()=>{const db=useDb();return {db,me:db.users.find(u=>u.id===db.session)!}}
const KPI=({a}:any)=><Strip items={a}/>
const byDay=(ps:any[])=>{const d=[...new Set(ps.map((p:any)=>p.date))].sort() as string[];return d.map(x=>({label:x.slice(8),values:[ps.filter((p:any)=>p.date===x).length]}))}
const H=({e,t,i}:any)=><><p className="ey">{e}</p><h2>{t} <em>{i}</em></h2></>
function WeighIn({p}:any){
 const {db}=useMe(),[kg,setKg]=useState<any>({...p.est}),c=calc(db.cfg,kg,balanceOf(db.ledger,p.hid))
 return <div className="box" style={{maxWidth:420}}><b>Weigh-in · {p.id}</b>{CATS.map(k=><label key={k} className="row"><span>{META[k].icon} {META[k].name} (kg)</span><input type="number" min="0" step="0.1" value={kg[k]} onChange={e=>setKg({...kg,[k]:+e.target.value})} style={{width:90}}/></label>)}
  <div className="row"><span>Cash to pay</span><b>₹{c.cashTotal}</b></div><div className="row"><span>Points</span><b className="on">{c.total}</b></div>
  <button className="pb" onClick={()=>attempt(()=>api.recordWeighIn(p.id,kg))}>Confirm weigh-in and pay</button></div>
}
export function COverview(){
 const {db,me}=useMe(),[no,setNo]=useState<string[]>([]),mine=db.pickups.filter(p=>p.cid===me.id)
 const reqs=db.pickups.filter(p=>p.status==='Requested'&&!no.includes(p.id)),act=mine.filter(p=>['Accepted','On the way'].includes(p.status)),done=mine.filter(p=>p.status==='Paid')
 const tot=CATS.map(k=>done.reduce((a,p)=>a+(p.act?.[k]||0),0))
 return <div className="pg"><H e="COLLECTOR" t={me.name.split(' ')[0]+"'s"} i="day."/><p><button className="bt2" onClick={()=>api.toggleOnline()}>{me.online?'● Online · go offline':'○ Offline · go online'}</button></p>
  {db.dataSource==='unavailable'&&<div className="as" style={{border:'1px solid #ff5d5d88',margin:'16px 0'}}><b style={{color:'#b3261e'}}>AWS API Unavailable</b><p style={{margin:'6px 0 0'}}>Failed to connect to AWS: {db.lastError||'Service error'}. Demo fallback is currently disabled.</p></div>}
  <KPI a={[['New requests',reqs.length],['Accepted / in progress',act.length],['Completed',done.length],['Cash paid out','₹'+done.reduce((a,p)=>a+(p.payout?.cashTotal||0),0)],['Sales revenue','₹'+db.orders.filter(o=>o.cid===me.id).reduce((a,o)=>a+o.amount,0)],['Collected',tot.reduce((a,b)=>a+b,0)+' kg',tot.join(' / ')+' (plastic / wet / e-waste)']]}/>
  <div className="cols"><Panel title="Collected by material" sub="Kilograms, completed pickups"><HBars max={Math.max(...tot,1)} fmt={n=>n+' kg'} rows={CATS.map((k,i)=>({label:META[k].icon+' '+META[k].name,value:tot[i],color:META[k].color}))}/></Panel>
   <Panel title="Completed pickups per day"><Bars w={380} h={160} data={byDay(done)} fmt={n=>String(Math.round(n))} label="Completed pickups per day"/></Panel></div>
  <h3 style={{margin:'30px 0 12px'}}>Active pickups</h3>{act.length?act.map(p=><div key={p.id} className="as" style={{margin:'8px 0',maxWidth:'none'}}><b><Link to={'/pickup/'+p.id}>{p.id}</Link></b> · {nm(db,p.hid)} · {p.address} · {p.slot} · <span className="tag">{p.status}</span>{(p.isDemo||db.dataSource==='demo')&&<span className="tag" style={{marginLeft:6,color:'var(--o)'}}>Demo</span>}
   {p.status==='Accepted'&&<p><button className="bt2" onClick={()=>attempt(()=>api.markOnTheWay(p.id))}>Mark on the way</button></p>}{p.status==='On the way'&&<WeighIn p={p}/>}</div>):<p><small>Accept a request below to start.</small></p>}
  <h3 style={{margin:'30px 0 12px'}}>Nearby requests</h3>{me.online?(reqs.length?reqs.map(p=><div key={p.id} className="as" style={{margin:'8px 0',maxWidth:'none'}}><b><Link to={'/pickup/'+p.id}>{p.id}</Link></b> · {p.address} · {p.date} {p.slot}{(p.isDemo||db.dataSource==='demo')&&<span className="tag" style={{marginLeft:6,color:'var(--o)'}}>Demo</span>}<br/>{CATS.map(k=>META[k].icon+' '+p.est[k]+' kg').join('  ')}{p.note&&<><br/><small>Note: {p.note}</small></>}
   <p><button className="bt2" onClick={()=>attempt(()=>api.acceptPickup(p.id))}>Accept</button> <button className="bt2" onClick={()=>setNo([...no,p.id])}>Decline</button></p></div>):<p><small>No open requests right now.</small></p>):<p><small>Go online to see requests.</small></p>}
  <h3 style={{margin:'30px 0 12px'}}>Recent activity</h3>{done.slice(-5).reverse().map(p=><div key={p.id} className="row"><span>{p.id} paid · {nm(db,p.hid)}{(p.isDemo||db.dataSource==='demo')&&<span className="tag" style={{marginLeft:6,color:'var(--o)'}}>Demo</span>}</span><b>₹{p.payout?.cashTotal||0}</b></div>)}{!done.length&&<p><small>No completed pickups yet.</small></p>}</div>
}
export function CInventory(){
 const {db,me}=useMe(),ls=db.lots.filter(l=>l.cid===me.id),orders=db.orders.filter(o=>o.cid===me.id)
 return <div className="pg"><H e="INVENTORY" t="Your" i="lots."/><p>Lots are created automatically at weigh-in (plastic and e-waste) and listed to recyclers while Available. Wet waste has no resale value.</p>
  <KPI a={(['plastic','ewaste'] as any).map((k:any)=>[META[k as 'plastic'].name+' available',ls.filter(l=>l.cat===k&&l.status==='Available').reduce((a,l)=>a+l.kg,0)+' kg'])}/>
  <Panel title="Lots by material" sub="Kilograms available vs sold"><Bars w={420} h={170} series={[{name:'Available',color:'var(--g)'},{name:'Sold',color:'var(--o)'}]} data={(['plastic','ewaste'] as const).map(k=>({label:META[k].name,values:[ls.filter(l=>l.cat===k&&l.status==='Available').reduce((a,l)=>a+l.kg,0),ls.filter(l=>l.cat===k&&l.status==='Sold').reduce((a,l)=>a+l.kg,0)]}))} label="Kilograms of lots available and sold by material"/></Panel>
  {ls.length?<div style={{overflowX:'auto'}}><table><thead><tr><th>Lot</th><th>Pickup</th><th>Category</th><th>Kg</th><th>Ask ₹/kg</th><th>Status</th></tr></thead><tbody>{ls.map(l=><tr key={l.id}><td>{l.id}</td><td><Link to={'/pickup/'+l.pid}>{l.pid}</Link></td><td>{META[l.cat].name}</td><td>{l.kg}</td><td>{l.ask}</td><td><span className="tag">{l.status}</span></td></tr>)}</tbody></table></div>:<p>No inventory yet. Complete a weigh-in to create a lot.</p>}
  <h3 style={{margin:'30px 0 12px'}}>Sales history</h3>{orders.map(o=><div key={o.id} className="row"><span>{o.id} · {META[o.cat].name} {o.kg} kg to {nm(db,o.rid)}</span><b>₹{o.amount}</b></div>)}{!orders.length&&<p><small>No sales yet.</small></p>}</div>
}
export function RMarket(){
 const {db}=useMe(),[f,setF]=useState({cat:'All',min:'',loc:'',max:''}),ls=db.lots.filter(l=>l.status==='Available'&&(f.cat==='All'||l.cat===f.cat)&&(!f.min||l.kg>=+f.min)&&(!f.max||l.ask<=+f.max)&&l.loc.toLowerCase().includes(f.loc.toLowerCase()))
 return <div className="pg"><H e="MARKETPLACE" t="Lots ready" i="to buy."/><div className="fg" style={{marginBottom:16}}><select value={f.cat} onChange={e=>setF({...f,cat:e.target.value})}><option>All</option><option value="plastic">Plastic</option><option value="ewaste">E-waste</option></select><input placeholder="Min kg" value={f.min} onChange={e=>setF({...f,min:e.target.value})}/><input placeholder="Max ₹/kg" value={f.max} onChange={e=>setF({...f,max:e.target.value})}/><input placeholder="Location" value={f.loc} onChange={e=>setF({...f,loc:e.target.value})}/></div>
  <Panel title="Available material" sub="Kilograms on the marketplace now"><Bars w={420} h={150} fmt={n=>String(Math.round(n))} data={(['plastic','ewaste'] as const).map(k=>({label:META[k].name,values:[db.lots.filter(l=>l.status==='Available'&&l.cat===k).reduce((a,l)=>a+l.kg,0)]}))} label="Kilograms available by material"/></Panel>
  {ls.length?<div style={{overflowX:'auto'}}><table><thead><tr><th>Lot</th><th>Material</th><th>Kg</th><th>₹/kg</th><th>Total</th><th>Supplier</th><th>Location</th><th>Quality</th><th/></tr></thead><tbody>{ls.map(l=><tr key={l.id}><td>{l.id}</td><td>{META[l.cat].name}</td><td>{l.kg}</td><td>{l.ask}</td><td><b>₹{l.kg*l.ask}</b></td><td>{nm(db,l.cid)}</td><td>{l.loc}</td><td>{l.quality}</td><td><button className="bt2" onClick={()=>confirm('Buy '+l.id+' for ₹'+l.kg*l.ask+'?')&&attempt(()=>api.buyLot(l.id))}>Buy now</button></td></tr>)}</tbody></table></div>:<p>No lots match. Lots appear after collectors complete weigh-ins.</p>}</div>
}
export function ROrders(){
 const {db,me}=useMe(),os=db.orders.filter(o=>o.rid===me.id)
 return <div className="pg"><H e="ORDERS" t="Your" i="purchases."/><KPI a={[['Orders',os.length],['Purchased',os.reduce((a,o)=>a+o.kg,0)+' kg'],['Spent','₹'+os.reduce((a,o)=>a+o.amount,0)],['Available lots now',db.lots.filter(l=>l.status==='Available').length]]}/>
  {os.length>0&&<div className="cols"><Panel title="Spend by material" sub="Rupees"><Bars w={380} h={160} fmt={n=>'₹'+Math.round(n)} data={(['plastic','ewaste'] as const).map(k=>({label:META[k].name,values:[os.filter(o=>o.cat===k).reduce((a,o)=>a+o.amount,0)]}))} label="Spend by material in rupees"/></Panel>
   <Panel title="Spend by supplier" sub="Rupees"><HBars fmt={n=>'₹'+n} rows={[...new Set(os.map(o=>o.cid))].map(c=>({label:nm(db,c),value:os.filter(o=>o.cid===c).reduce((a,o)=>a+o.amount,0),color:'var(--o)'}))}/></Panel></div>}
  {os.length?<table><thead><tr><th>Order</th><th>Lot</th><th>Supplier</th><th>Material</th><th>Kg</th><th>Amount</th><th>Status</th></tr></thead><tbody>{os.map(o=><tr key={o.id}><td>{o.id}</td><td>{o.lotId}</td><td>{nm(db,o.cid)}</td><td>{META[o.cat].name}</td><td>{o.kg}</td><td>₹{o.amount}</td><td><span className="tag">{o.status}</span></td></tr>)}</tbody></table>:<p>No orders yet. Buy a lot from the marketplace.</p>}
  <div className="as"><b>EPR certificates</b><p>Tracking placeholder only. No certificate has been verified, and this prototype makes no EPR compliance claim.</p></div></div>
}
const FIELDS=[['rate.plastic','Plastic buying ₹/kg'],['rate.ewaste','E-waste buying ₹/kg'],['ppk.plastic','Plastic points/kg'],['ppk.wet','Wet waste points/kg'],['ppk.ewaste','E-waste points/kg'],['sell.plastic','Plastic sell ₹/kg'],['sell.ewaste','E-waste sell ₹/kg'],['cost.plastic','Plastic collection ₹/kg'],['cost.ewaste','E-waste collection ₹/kg'],['wetCap','Wet waste daily cap (kg)'],['streakBonus','Streak bonus'],['qualityBonus','Quality bonus'],['pointValue','Reward cost ₹/point'],['tiers.1.mult','Sapling multiplier'],['tiers.2.mult','Tree multiplier'],['tiers.3.mult','Forest multiplier']]
const getp=(o:any,p:string)=>p.split('.').reduce((a,k)=>a[k],o)
export function Admin(){
 const {db}=useMe(),[d,setD]=useState<any>(()=>Object.fromEntries(FIELDS.map(([p])=>[p,getp(db.cfg,p)]))),[q,setQ]=useState(''),[role,setRole]=useState('all')
 const paid=db.pickups.filter(p=>p.status==='Paid'),kg=CATS.map(k=>paid.reduce((a,p)=>a+p.act![k],0)),st:any={};db.pickups.forEach(p=>st[p.status]=(st[p.status]||0)+1)
 const rev=db.orders.reduce((a,o)=>a+o.amount,0),cash=paid.reduce((a,p)=>a+p.payout.cashTotal,0),us=db.users.filter(u=>(role==='all'||u.role===role)&&u.name.toLowerCase().includes(q.toLowerCase()))
 const audit=db.pickups.flatMap(p=>p.events.map((e:any)=>({...e,id:p.id}))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,10)
 return <div className="pg"><H e="ADMIN · DEMO ACCOUNT" t="The numbers that" i="decide it."/><p>Values come from the mock dataset. Prices and costs are placeholders, not real revenue.</p>
  <KPI a={[['Households',db.users.filter(u=>u.role==='household').length],['Collectors',db.users.filter(u=>u.role==='collector').length],['Recyclers',db.users.filter(u=>u.role==='recycler').length],['Pickups',db.pickups.length,paid.length+' completed'],['Collected',kg.reduce((a,b)=>a+b,0)+' kg',kg.join(' / ')+' (plastic / wet / e-waste)']]}/>
  <KPI a={[['Cash paid to households','₹'+cash],['Sales revenue (mock prices)','₹'+rev],['Reward liability','₹'+liability(db.cfg,db.ledger)]]}/>
  <div className="cols"><Panel title="Volume by material" sub="Kilograms collected"><Bars w={380} h={170} fmt={n=>String(Math.round(n))} data={CATS.map((k,i)=>({label:META[k].name,values:[kg[i]]}))} label="Kilograms collected by material"/></Panel>
   <Panel title="Pickups by status"><Bars w={380} h={170} fmt={n=>String(Math.round(n))} data={Object.keys(st).map(x=>({label:x.replace('On the way','Moving'),values:[st[x]]}))} label="Pickups by status"/></Panel></div>
  <div className="cols"><Panel title="Pickups per day"><Bars w={380} h={170} fmt={n=>String(Math.round(n))} data={byDay(db.pickups)} label="Pickups per day"/></Panel>
   <Panel title="Margin per kg (mock)" sub="Sell − buy − collection cost, rupees"><Bars w={380} h={170} series={[{name:'Buy',color:'var(--g)'},{name:'Sell',color:'var(--o)'},{name:'Cost',color:'#8a6a2f'},{name:'Margin',color:'#2F6FD0'}]} data={(['plastic','ewaste'] as const).map(k=>({label:META[k].name,values:[db.cfg.rate[k],db.cfg.sell[k],db.cfg.cost[k],margin(db.cfg,k)]}))} label="Buy, sell, cost and margin per kilogram"/></Panel></div>
  <h3 style={{margin:'30px 0 12px'}}>Rates and points (last saved {db.cfg.updatedAt})</h3><div className="fg">{FIELDS.map(([p,l])=><label key={p}>{l}<br/><input type="number" step="0.1" min="0" value={d[p]} onChange={e=>setD({...d,[p]:e.target.value===''?'':+e.target.value})}/></label>)}</div>
  <p><button className="pb" style={{width:'auto',padding:'11px 22px'}} onClick={()=>confirm('Save these rates? Old pickups keep the rates they were paid at.')&&attempt(()=>api.updateConfig(d))}>Save changes</button></p>
  <h3 style={{margin:'30px 0 12px'}}>Users</h3><div className="ctl" style={{justifyContent:'flex-start'}}><input placeholder="Search name" value={q} onChange={e=>setQ(e.target.value)}/><select value={role} onChange={e=>setRole(e.target.value)}>{['all','household','collector','recycler','admin'].map(r=><option key={r}>{r}</option>)}</select></div>
  <div style={{overflowX:'auto'}}><table><thead><tr><th>Name</th><th>Role</th><th>Area</th><th>Status</th><th/></tr></thead><tbody>{us.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.role}</td><td>{u.area}</td><td>{u.active?'Active':'Suspended'}{u.role==='collector'&&(u.online?' · online':' · offline')}</td><td>{u.role!=='admin'&&<button className="bt2" onClick={()=>api.setActive(u.id)}>{u.active?'Suspend':'Reactivate'}</button>}</td></tr>)}</tbody></table></div>
  <h3 style={{margin:'30px 0 12px'}}>Audit trail (latest events)</h3>{audit.map((e,i)=><div key={i} className="row"><span>{e.id} · {e.s} · {nm(db,e.by)}</span><small>{new Date(e.at).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'})}</small></div>)}
  <p><button className="bt2" onClick={()=>confirm('Reset all demo data?')&&api.resetDemo()}>Reset demo data</button></p></div>
}
