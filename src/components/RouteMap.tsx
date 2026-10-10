// Stylised map of a Noida sector. No tiles, no network: everything is SVG, so the truck position
// is a pure function of `progress` (0..1) and the simulator can scrub it like a video.
// backend here (Amazon Location Service: route + live collector position replace ROUTE and the progress prop)
const ROUTE:[number,number][]=[[34,226],[34,168],[112,168],[112,112],[206,112],[206,58],[296,58]]
const segs=ROUTE.slice(1).map((p,i)=>Math.hypot(p[0]-ROUTE[i][0],p[1]-ROUTE[i][1]))
export const ROUTE_LEN=segs.reduce((a,b)=>a+b,0)
export const ROUTE_KM=1.6
export function pointAt(p:number){
 let d=Math.max(0,Math.min(1,p))*ROUTE_LEN,i=0
 while(i<segs.length-1&&d>segs[i]){d-=segs[i];i++}
 const a=ROUTE[i],b=ROUTE[i+1],f=segs[i]?d/segs[i]:0
 // seg = which leg of the route we are on, rem = metres left on that leg (1.6 km total)
 return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,ang:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI,seg:i,rem:Math.round((segs[i]-d)/ROUTE_LEN*ROUTE_KM*1000)}
}
const BLOCKS=[[10,10,70,36],[90,10,60,36],[160,10,90,30],[270,12,70,22],[10,60,60,36],[84,58,70,36],[170,64,60,30],[10,110,80,34],[130,126,60,32],[222,76,50,26],[226,126,50,32],[290,90,50,40],[290,150,50,30],[50,184,46,36],[130,184,100,36],[250,184,90,36],[130,222,60,22],[210,226,130,20]]
export default function RouteMap({progress,arrived,who='household',height=250}:{progress:number;arrived?:boolean;who?:'household'|'collector';height?:number}){
 const t=pointAt(progress),done=progress*ROUTE_LEN,pts=ROUTE.map(p=>p.join(',')).join(' ')
 const km=(ROUTE_KM*(1-progress)),mins=Math.max(0,Math.ceil(7*(1-progress)))
 return <div className="map" style={{height}}>
  <svg viewBox="0 0 360 250" preserveAspectRatio="xMidYMid slice" role="img" aria-label={who==='household'?'Map: collector truck approaching your home':'Map: route to the household'}>
   <rect width="360" height="250" fill="var(--mapland)"/>
   {BLOCKS.map((b,i)=><rect key={i} x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx="6" fill="var(--mapblock)"/>)}
   <rect x="232" y="20" width="52" height="40" rx="12" fill="var(--mappark)"/><text x="258" y="44" textAnchor="middle" className="mt">Park</text>
   <path d="M0 150 C80 138 140 160 200 150 S320 130 360 142" fill="none" stroke="var(--mapwater)" strokeWidth="9" strokeLinecap="round" opacity=".8"/>
   {/* roads: a wide white base under the route, a few cross streets */}
   {[[0,168,360,168],[0,112,360,112],[0,58,360,58],[34,0,34,250],[112,0,112,250],[206,0,206,250],[296,0,296,250]].map((r,i)=><line key={i} x1={r[0]} y1={r[1]} x2={r[2]} y2={r[3]} stroke="var(--maproad)" strokeWidth={i<3?11:9}/>)}
   <path d="M0 214 L360 190" stroke="var(--mapmetro)" strokeWidth="3" strokeDasharray="7 5" fill="none"/><circle cx="186" cy="199" r="5" fill="var(--w)" stroke="var(--mapmetro)" strokeWidth="2.5"/><text x="186" y="188" textAnchor="middle" className="mt">Sector 62 metro</text>
   <text x="70" y="236" className="mt">Sector 63</text><text x="262" y="102" className="mt">Sector 62</text>
   {/* route: faint full path, solid travelled part */}
   <polyline points={pts} fill="none" stroke="var(--g)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" opacity=".28" strokeDasharray="1 9"/>
   <polyline points={pts} fill="none" stroke="var(--g)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={`${done} ${ROUTE_LEN}`}/>
   {/* destination: home pin */}
   <g transform="translate(296 58)"><circle r="16" fill="var(--o)" opacity=".18" className={arrived?'':'pulse'}/><circle r="9" fill="var(--o)" stroke="#fff" strokeWidth="2.5"/><path d="M-4 1 L0 -3.5 L4 1 V4.5 H-4Z" fill="#fff"/></g>
   <text x="296" y="35" textAnchor="middle" className="mt strong">Asha's home</text>
   {/* origin */}
   <circle cx="34" cy="226" r="5" fill="var(--w)" stroke="var(--g)" strokeWidth="3"/><text x="44" y="240" className="mt">Ramesh starts here</text>
   {/* truck, drawn top-down so it can rotate with the road */}
   <g transform={`translate(${t.x} ${t.y}) rotate(${t.ang})`} style={{filter:'drop-shadow(0 2px 3px #0005)'}}>
    <rect x="-13" y="-7" width="17" height="14" rx="3" fill="#2F6FD0"/><rect x="4" y="-6" width="9" height="12" rx="3" fill="#1d1d1b"/><rect x="9" y="-4.5" width="3" height="9" rx="1" fill="#bfe3ff"/>
    <rect x="-10" y="-8.5" width="5" height="3" rx="1" fill="#111"/><rect x="-10" y="5.5" width="5" height="3" rx="1" fill="#111"/><rect x="4" y="-8.5" width="5" height="3" rx="1" fill="#111"/><rect x="4" y="5.5" width="5" height="3" rx="1" fill="#111"/></g>
  </svg>
  <div className="mchip">{arrived?<b>Arrived</b>:progress<=0?<b>Ready to start</b>:<><b>{mins} min</b> · {km.toFixed(1)} km away</>}</div>
 </div>
}
