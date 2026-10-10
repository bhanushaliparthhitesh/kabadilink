import {createContext,useContext,useEffect,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import {CATS,META} from '../config'
import {useDb} from '../api'
import {tierOf} from '../calc'
import {Bars,HBars,Strip,Panel} from '../components/Charts'
import RouteMap,{pointAt} from '../components/RouteMap'
import {useClock} from '../components/ui'
import {CH,CAPTIONS,LOG,TOTAL,PID,EST,ACT,WEEK,derive,ramp} from '../sim'
import type {S} from '../sim'

const ShowBk=createContext(true)
const Bk=({children}:{children:ReactNode})=>useContext(ShowBk)?<code className="bk">backend here ({children})</code>:null
const rs=(n:number)=>'₹'+Math.round(n).toLocaleString('en-IN')
const mmss=(t:number)=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')
const INSTR=['Head north on the Gate 2 road','Turn right at the crossing','Turn left toward Sector 62','Turn right on the main road','Turn left at the park','Arrive at Asha\'s home']

/* ---------- phone shell ---------- */
function Phone({clock,banner,children,tabs,active}:{clock:string;banner:string[]|null;children:ReactNode;tabs:string[];active:number}){
 return <div className="sm-ph"><div className="sm-isl"/><div className="sm-sb"><b>{clock}</b><span>5G ▮▮▮</span></div>
  {banner&&<div className="sm-nb" key={banner[0]} role="status"><i className="sm-ni">K</i><div><b>{banner[0]}</b><span>{banner[1]}</span></div><small>now</small></div>}
  <div className="sm-scr">{children}</div>
  <nav className="sm-tb" aria-hidden="true">{tabs.map((t,i)=><span key={t} className={i===active?'on':''}>{t}</span>)}</nav></div>
}
const Act=({hint,onClick,children,ghost}:{hint?:boolean;onClick:()=>void;children:ReactNode;ghost?:boolean})=>
 <button className={(ghost?'sm-btn ghost':'sm-btn')+(hint?' hint':'')} onClick={onClick} aria-disabled={!hint}>{children}</button>

const Steps=({n,labels}:{n:number;labels:string[]})=><ol className="sm-ol">{labels.map((l,i)=><li key={l} className={i<n-1?'d':i===n-1?'now':''}>{l}</li>)}</ol>

/* ---------- household phone ---------- */
function Household({s,clock,act}:{s:S;clock:string;act:()=>void}){
 const cfg=useDb().cfg,tier=tierOf(cfg,s.pts)
 const stepN=({idle:0,form:0,requested:1,accepted:2,onway:3,arrived:3,paid:4} as any)[s.hh]
 return <Phone clock={clock} banner={s.bannerHH} tabs={['Home','Schedule','History','Rewards']} active={s.hh==='form'?1:0}>
  <h4 className="sm-h">Namaste, Asha</h4>
  <div className="sm-card"><small>{tier.name} · Noida Sector 62</small><div className="sm-big">{s.pts} pts</div><small>Wallet {rs(s.wallet)}</small>
   <div className="bar sm-tier" title={'Progress to Tree tier'}><i style={{width:s.tierPct+'%'}}/></div></div>
  {s.hh==='idle'&&<><p className="sm-b">No active pickup</p><small>Sort plastic, wet waste and e-waste into three bags, then ask for a pickup.</small>
   <Act hint={s.hint.hhOpen} onClick={act}>Request a pickup</Act>
   <p className="sm-cap">Your weekly recyclables (kg)</p><Bars w={340} h={140} data={[['W1',9],['W2',12],['W3',8],['W4',14]].map(d=>({label:d[0] as string,values:[d[1] as number]}))} label="Weekly recyclables in kg"/>
   <Bk>getBalance: points, wallet</Bk></>}
  {s.hh==='form'&&<><p className="sm-b">Request a pickup</p>
   {CATS.map(k=>{const f=s.form[k];return <div key={k} className={'sm-row'+(f.on?' on':'')} style={{borderLeftColor:META[k].color}}>
     <span className={'sm-chk'+(f.on?' on':'')}>{f.on?'✓':''}</span><span className="sm-rn">{META[k].icon} {META[k].name}<small>{k==='wet'?'points only':'₹'+cfg.rate[k]+'/kg'}</small></span>
     <span className="sm-kg">{f.on?f.kg:0}<small> kg</small></span></div>})}
   <div className="sm-row plain"><span className="sm-rn">Today · 4–6 PM<small>Sector 62, Noida</small></span></div>
   <div className="sm-est"><span>Estimate</span><b>{rs(s.estimate.cashTotal)} · {s.estimate.total} pts</b></div>
   <Act hint={s.hint.hhReq} onClick={act}>Request pickup</Act><Bk>createPickup: save, alert collectors</Bk></>}
  {s.hh==='requested'&&<><div className="sm-radar" role="img" aria-label="Searching for collectors nearby"><i/><i/><i/><b>♻</b></div>
   <p className="sm-b" style={{textAlign:'center'}}>Looking for a collector</p><small style={{display:'block',textAlign:'center'}}>3 collectors notified within 2 km · {PID}</small>
   <Steps n={stepN} labels={['Requested','Accepted','On the way','Weighed and paid']}/><Bk>SNS: push to nearby collectors</Bk></>}
  {s.hh==='accepted'&&<><CollectorRow sub="Accepted · starting the trip soon"/><Steps n={stepN} labels={['Requested','Accepted','On the way','Weighed and paid']}/>
   <div className="sm-est"><span>Share this code at the door</span><b className="mono">4 8 2 1</b></div><Bk>acceptPickup: notify household</Bk></>}
  {s.hh==='onway'&&<><RouteMap progress={s.progress} who="household" height={236}/><div className="sm-eta"><b>Arriving in {Math.max(1,Math.ceil(7*(1-s.progress)))} min</b><small>{(1.6*(1-s.progress)).toFixed(1)} km away</small></div>
   <div className="bar"><i style={{width:s.progress*100+'%'}}/></div><CollectorRow compact sub="On the way · UP16 AB 2847"/><Bk>getCollectorLocation: live position</Bk></>}
  {s.hh==='arrived'&&<><p className="sm-b">Ramesh is at your door</p><small>Weighing each bag. Nothing is final until he confirms.</small>
   <div style={{margin:'12px 0'}}><HBars max={4} fmt={n=>n.toFixed(1)+' kg'} rows={CATS.map(k=>({label:META[k].icon+' '+META[k].name,value:s.read[k],color:META[k].color}))}/></div>
   <div className="sm-est"><span>So far</span><b>{rs(s.live.cashTotal)} · {s.live.total} pts</b></div><Bk>recordWeighIn: pending confirm</Bk></>}
  {s.hh==='paid'&&<><div className="sm-ok"><b>{rs(s.cash)} added to your wallet</b><span>+{s.final.total} Green Points · Sapling {s.final.mult}x plus bonuses</span></div>
   <p className="sm-cap">Estimated vs weighed (kg)</p><Bars w={340} h={150} series={[{name:'Estimated',color:'var(--ln)'},{name:'Weighed',color:'var(--g)'}]} data={CATS.map(k=>({label:META[k].name,values:[EST[k],ACT[k]]}))} label="Estimated versus weighed kilograms"/>
   <div className="sm-est"><span>Scratch card unlocked</span><b>🎟 Tap to reveal</b></div><Bk>scratchCard: server-side outcome</Bk></>}
 </Phone>
}
function CollectorRow({sub,compact}:{sub:string;compact?:boolean}){
 return <div className={'sm-who'+(compact?' c':'')}><i>R</i><div><b>Ramesh Prasad</b><small>{sub}</small>{!compact&&<small>★ 4.8 · 214 pickups · UP16 AB 2847</small>}</div><span className="sm-call" aria-hidden="true">Call</span></div>
}

/* ---------- collector phone ---------- */
function Collector({s,clock,act}:{s:S;clock:string;act:()=>void}){
 const wk=[...WEEK,['Sat',s.today] as [string,number]],p=pointAt(s.progress),sale=s.sale
 return <Phone clock={clock} banner={s.bannerCol} tabs={['Overview','Requests','Inventory','Profile']} active={['scan','alert'].includes(s.col)?1:s.col==='paid'||s.col==='sold'?2:0}>
  <h4 className="sm-h">Ramesh <span className="sm-on">● Online</span></h4>
  <div className="sm-card"><small>Today</small><div className="sm-big">{rs(s.today)}</div><small>{s.pickups} pickups</small></div>
  {['scan','paid','sold'].includes(s.col)&&<><Bk>getEarnings: earnings chart</Bk><Bars w={340} h={s.col==='scan'?132:112} data={wk.map((d,i)=>({label:d[0],values:[d[1]],hi:i===6}))} fmt={n=>n>=1000?(n/1000).toFixed(1)+'k':String(Math.round(n))} label="Earnings over the last seven days in rupees"/></>}
  {s.col==='scan'&&<><p className="sm-b">Nearby requests</p><small className="sm-scan"><i/><i/><i/> Scanning within 3 km</small><Bk>getNearbyRequests: SNS push + list</Bk></>}
  {s.col==='alert'&&<><p className="sm-b">Nearby requests</p>
   <div className="sm-req"><div><b>Asha V.</b><span className="tag">0.8 km</span></div><small>Sector 62 · Today 4–6 PM</small>
    <div className="sm-chips">{CATS.map(k=><span key={k}>{META[k].icon} {EST[k]} kg</span>)}</div>
    <div className="sm-est" style={{margin:'10px 0'}}><span>Estimated payout</span><b>{rs(14*EST.plastic+40*EST.ewaste)} cash</b></div>
    <div className="sm-two"><Act ghost onClick={()=>{}}>Decline</Act><Act hint={s.hint.colAccept} onClick={act}>Accept</Act></div></div><Bk>acceptPickup: conditional write</Bk></>}
  {s.col==='accepted'&&<><p className="sm-b">Active pickup · {PID}</p><RouteMap progress={0} who="collector" height={170}/>
   <div className="sm-est"><span>Asha V. · 1.6 km · ~7 min</span><b>{rs(s.estimate.cashTotal)}</b></div><Act hint={s.hint.colStart} onClick={act}>Start trip</Act><Bk>markOnTheWay: notify household</Bk></>}
  {s.col==='onway'&&<><div className="sm-turn"><i>↱</i><div><b>{INSTR[p.seg]}</b><small>{p.seg===5?'Almost there':p.rem+' m'}</small></div></div>
   <RouteMap progress={s.progress} who="collector" height={250}/><div className="sm-eta"><b>{Math.max(1,Math.ceil(7*(1-s.progress)))} min</b><small>{(1.6*(1-s.progress)).toFixed(1)} km to Asha</small></div><Bk>navigation: route and live ping</Bk></>}
  {s.col==='weigh'&&<><p className="sm-b">Weigh-in · {PID}</p>
   {CATS.map(k=><div key={k} className="sm-scale"><span>{META[k].icon} {META[k].name}<small>est. {EST[k]} kg</small></span><b className="mono">{s.read[k].toFixed(1)}<small> kg</small></b></div>)}
   <div className="sm-est"><span>Cash to pay · points</span><b>{rs(s.live.cashTotal)} · {s.live.total}</b></div>
   <Act hint={s.hint.colConfirm} onClick={act}>Confirm weigh-in and pay</Act><Bk>recordWeighIn: one transaction</Bk></>}
  {(s.col==='paid'||s.col==='sold')&&<><div className="sm-ok"><b>{s.col==='sold'?'Sold for '+rs(sale)+' · margin '+rs(s.margin):'Paid '+rs(s.cash)+' to Asha'}</b><span>{s.col==='sold'?'GreenLoop Recyclers bought both lots':'Lots added to your inventory'}</span></div>
   <p className="sm-cap">Inventory</p>
   {[['L-201','plastic',ACT.plastic],['L-202','ewaste',ACT.ewaste]].map(l=><div key={l[0] as string} className="sm-lot"><span>{l[0]} · {META[l[1] as 'plastic'].name} {l[2]} kg</span><span className={'tag'+(s.col==='sold'?' sold':'')}>{s.col==='sold'?'Sold':'Listed'}</span></div>)}
   <Bk>createLots, listLots</Bk></>}
 </Phone>
}

/* ---------- recycler and admin consoles ---------- */
function Win({url,children,pill}:{url:string;children:ReactNode;pill?:string}){
 return <div className="win"><div className="winh"><i/><i/><i/><span className="winu">🔒 {url}</span>{pill&&<span className="tag">{pill}</span>}</div><div className="winb">{children}</div></div>
}
function Recycler({s,act}:{s:S;act:()=>void}){
 const rows=[['L-198','Plastic',12,22,'Sector 18, Noida'],['L-199','E-waste',4,70,'Indirapuram, Noida'],['L-200','Plastic',8.5,22,'Sector 15, Gurugram']]
 const mine=[['L-201','Plastic',ACT.plastic,22,'Sector 62, Noida'],['L-202','E-waste',ACT.ewaste,70,'Sector 62, Noida']]
 const total=s.sale
 return <Win url="kabadilink.app/r" pill="GreenLoop Recyclers"><div className="winc">
  <div style={{overflowX:'auto'}}><table><thead><tr><th>Lot</th><th>Material</th><th>Kg</th><th>₹/kg</th><th>Location</th><th>Status</th></tr></thead><tbody>
   {rows.map(r=><tr key={r[0] as string}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td><span className="tag">Available</span></td></tr>)}
   {s.listed&&mine.map(r=><tr key={r[0] as string} className={s.sold?'':'new'}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td><span className={'tag'+(s.sold?' sold':' fresh')}>{s.sold?'Bought by you':'New'}</span></td></tr>)}
  </tbody></table></div>
  <div className="winf"><Act hint={s.hint.recBuy} onClick={act}>{s.sold?'Order '+s.order+' · '+rs(total)+' · Completed':'Buy Asha\'s two lots · '+rs(total)}</Act></div>
  <Bk>purchaseLot: conditional update so a lot sells once</Bk>
  <p className="sm-cap" style={{marginTop:16}}>Available material (kg)</p>
  <Bars w={460} h={150} data={[{label:'Plastic',values:[s.avail.plastic]},{label:'E-waste',values:[s.avail.ewaste]}]} label="Available plastic and e-waste in kilograms"/></div></Win>
}
function Admin({s}:{s:S}){
 const st=Object.entries(s.status)
 return <Win url="kabadilink.app/a" pill="Demo admin"><div className="winc">
  <Strip items={[['Pickups',s.total],['Completed',s.status.Paid],['Cash out',rs(1840+(s.paid?s.cash:0))],['Revenue',rs(2960+(s.sold?s.sale:0))]]}/>
  <div className="cols"><Panel title="Pickups by status"><Bars w={260} h={150} data={st.map(d=>({label:d[0].replace('On the way','Moving'),values:[d[1]]}))} label="Pickups by status"/></Panel>
   <Panel title="Collected so far (kg)"><Bars w={260} h={150} data={CATS.map(k=>({label:META[k].name,values:[s.kg[k]]}))} fmt={n=>String(Math.round(n))} label="Kilograms collected by category"/></Panel></div>
  <Bk>getStats: dashboards read the same tables</Bk></div></Win>
}

/* ---------- run of show + backend log ---------- */
function RunOfShow({t,go}:{t:number;go:(i:number)=>void}){
 const cur=CH.findIndex(c=>t>=c.start&&t<c.end)
 return <div style={{overflowX:'auto'}}><table className="ros"><thead><tr><th>#</th><th>Step</th><th>Who</th><th>Backend call</th></tr></thead><tbody>
  {CH.map((c,i)=><tr key={c.label} className={i===cur?'now':t>=c.end?'done':''} onClick={()=>go(i)} tabIndex={0} onKeyDown={e=>e.key==='Enter'&&go(i)} aria-current={i===cur}><td>{i+1}</td><td><b>{c.label}</b><small style={{display:'block'}}>{c.what}</small></td><td>{c.who}</td><td><code>{c.api}</code></td></tr>)}
 </tbody></table></div>
}
function Terminal({t}:{t:number}){
 const ref=useRef<HTMLDivElement>(null),rows=LOG.filter(l=>l[0]<=t)
 useEffect(()=>{const e=ref.current;if(e)e.scrollTop=e.scrollHeight},[rows.length])
 return <div className="tm"><div className="tmh"><i/><i/><i/><b>Backend event stream</b><span>{PID}</span></div>
  <div className="tmb sm-log" ref={ref}>{rows.length?rows.map((l,i)=><div key={i} className="sm-ll"><span className="sm-t">{mmss(l[0])}</span><b>{l[1]}</b><span>{l[2]}</span></div>):<span className="sm-t">Waiting for the first event…</span>}</div></div>
}

/* ---------- page ---------- */
export default function Simulator(){
 const db=useDb(),clock=useClock()
 const [t,setT]=useState(0),[playing,setPlaying]=useState(false),[stopAt,setStopAt]=useState<number|null>(null),[speed,setSpeed]=useState(1),[bk,setBk]=useState(true),[view,setView]=useState<'household'|'collector'>('household')
 const raf=useRef(0),last=useRef(0),tRef=useRef(0),stop=useRef<number|null>(null),spd=useRef(1)
 stop.current=stopAt;spd.current=speed
 useEffect(()=>{
  if(!playing)return
  last.current=performance.now()
  const tick=(now:number)=>{
   const dt=Math.min(.1,(now-last.current)/1000);last.current=now
   const lim=stop.current??TOTAL;let n=tRef.current+dt*spd.current
   if(n>=lim){n=lim;tRef.current=n;setT(n);setPlaying(false);return}
   tRef.current=n;setT(n);raf.current=requestAnimationFrame(tick)}
  raf.current=requestAnimationFrame(tick)
  return()=>cancelAnimationFrame(raf.current)},[playing])
 const seek=(n:number)=>{tRef.current=n;setT(n)}
 const s=derive(t,db.cfg),nextIdx=CH.findIndex(c=>c.end>t+.01),finished=nextIdx<0
 const step=()=>{if(playing)return;if(finished){seek(0);setStopAt(CH[0].end);setPlaying(true);return};setStopAt(CH[nextIdx].end);setPlaying(true)}
 const playAll=()=>{if(playing){setPlaying(false);return};if(finished)seek(0);setStopAt(null);setPlaying(true)}
 const reset=()=>{setPlaying(false);seek(0);setStopAt(null)}
 const jump=(i:number)=>{setPlaying(false);seek(CH[i].start+.01);setStopAt(null)}
 const cap=[...CAPTIONS].reverse().find(c=>t>=c[0])?.[1]||CAPTIONS[0][1]
 const cur=Math.max(0,CH.findIndex(c=>t>=c.start&&t<c.end)),chap=CH[finished?CH.length-1:cur]
 const actor=['Household','Collector','Collector','Collector','Collector','Household','Recycler'][finished?6:cur]
 useEffect(()=>{if(playing){if(['Household'].includes(actor)&&view!=='household')setView('household');if(actor==='Collector'&&view!=='collector')setView('collector')}},[actor,playing])
 return <ShowBk.Provider value={bk}><div className="sm">
  <section id="simulator" className="hero" style={{paddingBottom:0}}><p className="ey">THE SIMULATOR</p><h2 className="h1like">Two phones, <em>one pickup.</em></h2>
   <p className="sub">Press play and watch one pickup travel from the household phone to the collector, and on to a recycler. Every screen reads the same state.</p>
   <div className="ctl"><button className="bt" onClick={step} disabled={playing} aria-live="polite">{playing?'Running: '+chap.label:finished?'Replay from the start':'Step '+(nextIdx+1)+': '+CH[nextIdx].label}</button>
    <button className="bt2" onClick={playAll}>{playing&&stopAt===null?'❚❚ Pause':'▶ Play the whole story'}</button>
    <button className="bt2" onClick={reset}>Reset</button><button className="bt2" onClick={()=>setBk(!bk)} aria-pressed={!bk}>{bk?'Hide':'Show'} backend markers</button></div></section>
  <p className="sm-capt" aria-live="polite"><span>{mmss(t)}</span>{cap}</p>
  <div className="sm-seg" role="tablist" aria-label="Phone to show"><button className={view==='household'?'on':''} onClick={()=>setView('household')}>Household</button><button className={view==='collector'?'on':''} onClick={()=>setView('collector')}>Collector</button></div>
  <div className="pp sm-pp"><div className={'sm-col'+(view==='household'?'':' off')}><p className="lb">HOUSEHOLD · Asha</p><Household s={s} clock={clock} act={step}/></div>
   <div className={'sm-col'+(view==='collector'?'':' off')}><p className="lb">COLLECTOR · Ramesh</p><Collector s={s} clock={clock} act={step}/></div></div>

  <div className="sm-bar" role="group" aria-label="Playback">
   <button className="sm-pl" onClick={playAll} aria-label={playing&&stopAt===null?'Pause':'Play'}>{playing&&stopAt===null?'❚❚':'▶'}</button>
   <span className="mono sm-tm">{mmss(t)} / {mmss(TOTAL)}</span>
   <div className="sm-track">{CH.map((c,i)=><button key={c.label} className="sm-seg1" style={{flex:c.end-c.start}} title={c.label} aria-label={'Jump to step '+(i+1)+': '+c.label} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setPlaying(false);setStopAt(null);seek(c.start+(c.end-c.start)*clampf((e.clientX-r.left)/r.width))}}><i style={{width:ramp(t,c.start,c.end)*100+'%'}}/></button>)}</div>
   <button className="bt2 sm-sp" onClick={()=>setSpeed(speed===1?2:speed===2?.5:1)} aria-label={'Playback speed '+speed+'x'}>{speed}×</button></div>

  <section className="sec sm-wide"><p className="ey">THE OTHER ROLES</p><h2>Same state, <em>different screens.</em></h2>
   <div className="sm-cons"><div><p className="lb">RECYCLER · GreenLoop</p><Recycler s={s} act={step}/></div><div><p className="lb">ADMIN · live operations</p><Admin s={s}/></div></div></section>
  <section className="sec sm-wide"><p className="ey">RUN OF SHOW</p><h2>Seven steps, <em>seven calls.</em></h2>
   <div className="sm-two2"><RunOfShow t={t} go={jump}/><Terminal t={t}/></div>
   <p><small>Rates and points come from the same calc.ts and config.ts the real pages use ({db.cfg.rate.plastic} ₹/kg plastic, {db.cfg.rate.ewaste} ₹/kg e-waste). Nothing here is written to your demo data.</small></p></section>
 </div></ShowBk.Provider>
}
const clampf=(x:number)=>Math.min(1,Math.max(0,x))
