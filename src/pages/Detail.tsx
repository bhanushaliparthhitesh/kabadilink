import {Link,useParams} from 'react-router-dom'
import {CATS,META} from '../config'
import {useDb,api,attempt,nm} from '../api'
import Workflow from '../components/Workflow'
import {Bars} from '../components/Charts'
export function PickupDetail(){
 const {id}=useParams(),db=useDb(),me=db.users.find(u=>u.id===db.session)!,p=db.pickups.find(x=>x.id===id)
 const ok=p&&(me.role==='admin'||p.hid===me.id||p.cid===me.id||(me.role==='collector'&&p.status==='Requested'))
 if(!ok)return <div className="pg"><h2>Pickup <em>not found.</em></h2><p>It does not exist, or your account cannot view it.</p></div>
 const c=p.payout,col=db.users.find(u=>u.id===p.cid)
 return <div className="pg"><p className="ey">PICKUP {p.id} · {p.date} · {p.slot}</p><h2>Pickup <em>tracking.</em></h2><Workflow p={p}/>
  <div className="two">
   <div><h3 style={{marginBottom:10}}>Estimate vs weighed</h3><Bars w={400} h={180} series={[{name:'Estimated',color:'var(--ln)'},{name:'Weighed',color:'var(--g)'}]} data={CATS.map(k=>({label:META[k].name,values:[p.est[k],p.act?p.act[k]:0]}))} label="Estimated versus weighed kilograms"/>{!p.act&&<small>Weighed values appear after the weigh-in.</small>}
    <h3 style={{margin:'26px 0 6px'}}>Details</h3><dl className="dl"><dt>Address</dt><dd>{p.address}</dd><dt>Instructions</dt><dd>{p.note||'None'}</dd><dt>Collector</dt><dd>{col?col.name+' · '+col.phone:'Not assigned yet'}</dd></dl>
    <p>{me.id===p.hid&&['Requested','Accepted'].includes(p.status)&&<button className="bt2" onClick={()=>confirm('Cancel this pickup?')&&attempt(()=>api.cancelPickup(p.id))}>Cancel pickup</button>}
    {me.role==='collector'&&p.status==='Requested'&&<button className="bt2" onClick={()=>attempt(()=>api.acceptPickup(p.id))}>Accept</button>}</p></div>
   <div><h3 style={{marginBottom:10}}>Payout and points {c?'(confirmed)':'(not yet confirmed)'}</h3>{c?<><dl className="dl">{CATS.map(k=><><dt key={k}>{META[k].name}</dt><dd>₹{c.cash[k]} · {c.sub[k]} pts</dd></>)}<dt>Tier {c.mult}x, streak, quality</dt><dd>{c.base-c.subtotal}+{c.streak}+{c.quality}</dd><dt>Total</dt><dd className="on">₹{c.cashTotal} · {c.total} pts</dd></dl><small>Rates at the time: plastic ₹{c.rates.plastic}, e-waste ₹{c.rates.ewaste}</small></>:<p>Shown after the collector confirms the weigh-in.</p>}
    <h3 style={{margin:'26px 0 6px'}}>Status history</h3><dl className="dl">{p.events.map((e:any,i:number)=><><dt key={'a'+i}>{e.s} · {nm(db,e.by)}</dt><dd key={'b'+i}>{new Date(e.at).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'})}</dd></>)}</dl></div></div>
  <p><Link to={me.role==='household'?'/h/pickups':'/'+me.role[0]}>← Back</Link></p></div>
}
