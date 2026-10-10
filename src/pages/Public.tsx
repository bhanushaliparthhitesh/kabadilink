import {useState} from 'react'
import {Link,useNavigate,useSearchParams} from 'react-router-dom'
import {CATS,META,HOME} from '../config'
import {useDb,api} from '../api'
import Workflow from '../components/Workflow'
import Simulator from './Simulator'
import {goSim} from '../components/ui'
import {Bars,Strip,Panel,Tabs} from '../components/Charts'
const FAQ=[['How is my waste weighed?','The collector weighs plastic, wet waste and e-waste separately at your door.'],['When do I get paid?','At weigh-in. Plastic and e-waste pay cash; all three earn Green Points.'],['Why is wet waste points only?','It has no resale value, so it goes to compost or biogas.'],['Do points expire?','Not decided yet in this prototype.']]
const GUIDE:Record<string,{lead:string;bag:string;ok:string[];no:string[]}>={
 'Plastic':{lead:'Bottles and packaging sell at full rate when they are clean and dry.',bag:'Blue bag',ok:['Rinse and dry bottles and tubs','Flatten them to save space','Take caps off so they sell at full rate','Keep clean plastic in its own bag'],no:['Mix in food-soiled packaging','Add thermocol or chip packets','Bag it together with wet waste']},
 'Wet waste':{lead:'Food scraps only. It earns points, not cash, and goes to compost or biogas.',bag:'Green bag',ok:['Peels, leftovers and tea leaves','Drain liquids before bagging','Use a lined bin and tie the bag daily'],no:['Add plastic bags, glass or metal','Go over 10 kg per household per day','Include bones in bulk']},
 'E-waste':{lead:'Chargers, cables and old phones carry the highest rate per kg.',bag:'Orange bag',ok:['Tape battery terminals','Bag batteries separately','Keep devices whole and unopened'],no:['Crush or open devices','Leave leaking batteries loose','Mix it with wet waste']}}
const STEPS=[['STEP 1 · SEGREGATE','Sort three ways','Plastic, wet waste and e-waste each get their own bag.'],['STEP 2 · SCHEDULE','Pick a slot','Enter the estimated weight and a time when you are home.'],['STEP 3 · WEIGH AND PAY','Weighed at your door','Cash for plastic and e-waste, points for all three.'],['STEP 4 · RECYCLE','Reaches recyclers','Collectors sell lots to recyclers by the kg.']]
const WHO:[string,boolean[]][]=[['Request a pickup',[1,0,0,0]],['Accept and drive to the house',[0,1,0,0]],['Weigh at the door and pay',[0,1,0,0]],['List material as lots',[0,1,0,0]],['Buy lots by the kg',[0,0,1,0]],['Earn Green Points',[1,0,0,0]],['Set rates and tiers',[0,0,0,1]]] as any
const Yes=({v}:{v:boolean})=>v?<span className="y" aria-label="Yes">●</span>:<span className="n" aria-label="No">–</span>
const ROLES=[['household','Households','Schedule a pickup','Sort, request, get paid.'],['collector','Collectors','Accept requests','Weigh at the door.'],['recycler','Recyclers','Buy lots','Source segregated material by the kg.']]
export function Landing(){
 const db=useDb(),go=useNavigate(),signedIn=!!db.users.find(u=>u.id===db.session),c=db.cfg,paid=db.pickups.filter(p=>p.status==='Paid'),kg=CATS.map(k=>paid.reduce((a,p)=>a+p.act![k],0)),sample=paid[0]
 const tk=CATS.map(k=>META[k].name+(c.rate[k]?' ₹'+c.rate[k]+'/kg':' points only')+' · '+c.ppk[k]+' pts/kg').concat(c.tiers.map((t:any)=>t.name+' '+t.min+'+')).join('   ·   ')
 const days=[...new Set(db.pickups.map(p=>p.date))].sort().slice(-10),perDay=days.map(d=>({label:d.slice(8),values:[db.pickups.filter(p=>p.date===d&&p.status!=='Cancelled').length]}))
 const maxCash=Math.max(...CATS.map(k=>c.rate[k])),maxPts=Math.max(...CATS.map(k=>c.ppk[k]))
 return <>
 <section className="hero"><p className="ey">WASTE, PRICED BY THE KG</p><h1>Turn your waste <em>into cash.</em></h1><p className="sub">Households earn cash for recyclable plastic and e-waste, and Green Points for sorting responsibly. Collectors weigh at the door; recyclers buy the lots.</p>
  <div className="ctl"><Link className="bt" to="/signin?role=household">Schedule a Pickup</Link>{!signedIn&&<button className="bt2" onClick={()=>goSim(go,true)}>▶ Watch a pickup happen</button>}<a className="bt2" href="#how">Explore how it works</a><Link className="bt2" to="/signin">Sign in</Link></div></section>
 <div className="tick"><div>{tk}   ·   {tk}   ·   </div></div>
 {!signedIn&&<Simulator/>}

 <section className="sec"><p className="ey">LIVE RATES · UPDATED {c.updatedAt}</p><h2>What we <em>pay.</em></h2>
  <div className="two"><div><table className="rb"><thead><tr><th>Material</th><th>Cash per kg</th><th>Points per kg</th><th>5 kg earns</th></tr></thead><tbody>
    {CATS.map(k=><tr key={k}><td><b>{META[k].icon} {META[k].name}</b></td><td><span className="ib"><i style={{width:c.rate[k]/maxCash*100+'%',background:META[k].color}}/></span>{c.rate[k]?'₹'+c.rate[k]:'Points only'}</td><td><span className="ib"><i style={{width:c.ppk[k]/maxPts*100+'%',background:META[k].color}}/></span>{c.ppk[k]}</td><td>{c.rate[k]?'₹'+c.rate[k]*5+' + ':''}{c.ppk[k]*5} pts</td></tr>)}</tbody></table>
   <p><small>Wet waste has no resale value, so it earns points only (up to {c.wetCap} kg per household per day).</small></p></div>
   <div><Panel title="Where each kilo goes" sub="Rupees per kg, plastic and e-waste (placeholder prices)"><Bars w={380} h={190} series={[{name:'We pay you',color:'var(--g)'},{name:'Recycler pays',color:'var(--o)'},{name:'Collection cost',color:'#8a6a2f'}]} data={(['plastic','ewaste'] as const).map(k=>({label:META[k].name,values:[c.rate[k],c.sell[k],c.cost[k]]}))} label="Rupees per kilogram: what households are paid, what recyclers pay, and collection cost"/></Panel></div></div></section>

 <section className="sec" id="how"><p className="ey">HOW IT WORKS</p><h2>Four steps, <em>one loop.</em></h2>
  <div className="rail">{STEPS.map((s,i)=><div key={s[0]} className="rs"><i>{i+1}</i><div><small>{s[0].split(' · ')[1]}</small><h3>{s[1]}</h3><p>{s[2]}</p></div></div>)}</div>
  {!signedIn&&<p style={{marginTop:30}}><button className="bt2" onClick={()=>goSim(go,true)}>See the loop play out on two phones</button></p>}</section>

 <section className="sec"><p className="ey">THE WORKFLOW</p><h2>From doorstep to <em>recycler.</em></h2><div style={{marginTop:30}}><Workflow p={sample}/></div><p><small>Showing demo pickup {sample?.id} from the mock dataset.</small></p></section>

 <section className="sec"><p className="ey">IMPACT · DEMO DATA</p><h2>Sorted waste, <em>so far.</em></h2>
  <Strip items={[['Collected',kg.reduce((a,b)=>a+b,0)+' kg','Across completed pickups'],['Households',db.users.filter(u=>u.role==='household').length],['Active collectors',db.users.filter(u=>u.role==='collector'&&u.online).length],['Completed pickups',paid.length],['Societies (demo)',3,'Monthly challenge: cleanest segregation wins a tree']]}/>
  <div className="cols"><Panel title="Collected by material" sub="Kilograms, completed pickups"><Bars w={380} h={190} fmt={n=>String(Math.round(n))} data={CATS.map((k,i)=>({label:META[k].name,values:[kg[i]]}))} label="Kilograms collected by material"/></Panel>
   <Panel title="Pickups per day" sub="Requests that were not cancelled"><Bars w={380} h={190} fmt={n=>String(Math.round(n))} data={perDay} label="Pickups per day"/></Panel></div></section>

 <section className="sec"><p className="ey">SEGREGATION GUIDE</p><h2>Three bags, <em>three rules.</em></h2>
  <Tabs tabs={Object.keys(GUIDE)}>{i=>{const g=GUIDE[Object.keys(GUIDE)[i]];return <><div className="do"><h5>{g.bag.toUpperCase()} · DO</h5><p style={{marginTop:0}}>{g.lead}</p><ul>{g.ok.map(x=><li key={x}>{x}</li>)}</ul></div><div className="dont"><h5>DON'T</h5><ul>{g.no.map(x=><li key={x}>{x}</li>)}</ul></div></>}}</Tabs></section>

 <section className="sec"><p className="ey">WHO DOES WHAT</p><h2>Four roles, <em>one record.</em></h2>
  <div style={{maxWidth:820,margin:'26px auto 0',overflowX:'auto'}}><table className="mx"><thead><tr><th>Action</th><th>Household</th><th>Collector</th><th>Recycler</th><th>Admin</th></tr></thead><tbody>{WHO.map(r=><tr key={r[0]}><td>{r[0]}</td>{r[1].map((v,i)=><td key={i}><Yes v={!!v}/></td>)}</tr>)}</tbody></table></div></section>

 <section className="sec"><p className="ey">QUESTIONS</p><h2>Before you <em>schedule.</em></h2><div style={{maxWidth:720,margin:'24px auto 0'}}>{FAQ.map(q=><details key={q[0]}><summary>{q[0]}</summary><p>{q[1]}</p></details>)}</div></section>

 <section className="sec"><p className="ey">JOIN IN</p><h2>Pick your <em>side.</em></h2><div className="roles">{ROLES.map(r=><div key={r[0]} className="rr"><h3>{r[1]}</h3><p><b>{r[2]}.</b> {r[3]}</p><Link className="bt2" to={'/signin?role='+r[0]}>Continue</Link></div>)}</div></section>
 <footer><b>Contact and support</b><br/>help@kabadilink.example · +91 00000 00000 (placeholders)<p>Privacy · Terms · Solid Waste Management Rules (policy pages not written yet)<br/>KabadiLink prototype. All numbers are demo values to validate in the pilot.</p></footer></>
}
export function SignIn(){
 const db=useDb(),go=useNavigate(),[q]=useSearchParams(),[role,setRole]=useState(q.get('role')||'household'),[uid,setUid]=useState('')
 const list=db.users.filter(u=>u.role===role),pick=uid&&list.some(u=>u.id===uid)?uid:list[0].id
 return <section className="sec" style={{maxWidth:560}}><p className="ey">SIGN IN · DEMO ACCOUNTS</p><h2>Who are you <em>today?</em></h2>
  <div className="ctl">{['household','collector','recycler'].map(r=><button key={r} className="bt2" style={role===r?{background:'var(--card)'}:{}} onClick={()=>setRole(r)}>{r[0].toUpperCase()+r.slice(1)}</button>)}</div>
  <div className="as"><label>Demo user<br/><select value={pick} onChange={e=>setUid(e.target.value)} style={{width:'100%',marginTop:6}}>{list.map(u=><option key={u.id} value={u.id}>{u.name} · {u.area}</option>)}</select></label>
   <p><button className="pb" onClick={()=>{api.login(pick);go(HOME[role])}}>Sign in</button></p>
   <small>No password needed. This is a mock sign-in; real sign-in would use Cognito (see src/api.ts).</small></div>
  <p><small>Admin access is not part of public role selection.</small> <button className="bt2" onClick={()=>{api.login('a1');go('/a')}}>Demo admin account</button></p></section>
}
