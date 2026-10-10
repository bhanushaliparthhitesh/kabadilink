import {useState} from 'react'
import type {ReactNode} from 'react'

export interface Series{name:string;color:string}
export interface Datum{label:string;values:number[];hi?:boolean}

// Vertical bar chart drawn in SVG. One series = simple bars; several series = grouped bars.
// Heights are plain attributes (no per-frame transitions) so it can be driven live by the simulator clock.
export function Bars({data,series=[{name:'',color:'var(--g)'}],w=360,h=170,fmt=(n:number)=>String(Math.round(n*10)/10),max,label='Bar chart',legend=true}:{data:Datum[];series?:Series[];w?:number;h?:number;fmt?:(n:number)=>string;max?:number;label?:string;legend?:boolean}){
 const pad={l:30,r:8,t:18,b:24},iw=w-pad.l-pad.r,ih=h-pad.t-pad.b
 const top=max??Math.max(1,...data.flatMap(d=>d.values)),nice=niceMax(top),gw=iw/Math.max(1,data.length),bw=Math.min(34,(gw*.7)/series.length),grp=bw*series.length
 const ticks=[0,.5,1].map(f=>nice*f)
 return <figure className="chart" style={{margin:0}}>
  <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} style={{width:'100%',maxWidth:w,height:'auto',display:'block'}}>
   {ticks.map(t=>{const y=pad.t+ih-t/nice*ih;return <g key={t}><line x1={pad.l} x2={w-pad.r} y1={y} y2={y} stroke="var(--ln)" strokeDasharray={t?'3 4':''}/><text x={pad.l-6} y={y+4} textAnchor="end" className="ax">{fmt(t)}</text></g>})}
   {data.map((d,i)=>{const x0=pad.l+gw*i+(gw-grp)/2
    return <g key={d.label+i}>
     {d.values.map((v,j)=>{const bh=Math.max(0,v/nice*ih),x=x0+j*bw,y=pad.t+ih-bh
      return <g key={j}><rect x={x} y={y} width={Math.max(2,bw-3)} height={bh} rx={4} fill={series[j].color} opacity={d.hi===false?.45:1}><title>{d.label}{series[j].name?' · '+series[j].name:''}: {fmt(v)}</title></rect>
       {v>0&&bw>=16&&<text x={x+(bw-3)/2} y={y-5} textAnchor="middle" className="vl">{fmt(v)}</text>}</g>})}
     <text x={pad.l+gw*i+gw/2} y={h-7} textAnchor="middle" className={'ax'+(d.hi?' hi':'')}>{d.label}</text></g>})}
  </svg>
  {legend&&series.length>1&&<figcaption className="lg">{series.map(s=><span key={s.name}><i style={{background:s.color}}/>{s.name}</span>)}</figcaption>}
 </figure>
}
const niceMax=(m:number)=>{const p=Math.pow(10,Math.floor(Math.log10(m))),f=m/p;return (f<=1?1:f<=2?2:f<=4?4:f<=6?6:f<=8?8:10)*p}

// Horizontal bars as plain HTML rows: label, track, value. Good for lists with long labels.
export function HBars({rows,max,fmt=(n:number)=>String(n)}:{rows:{label:ReactNode;value:number;color?:string;note?:ReactNode}[];max?:number;fmt?:(n:number)=>string}){
 const m=max??Math.max(1,...rows.map(r=>r.value))
 return <div className="hb">{rows.map((r,i)=><div key={i} className="hbr"><span className="hbl">{r.label}</span><span className="hbt"><i style={{width:Math.max(0,Math.min(100,r.value/m*100))+'%',background:r.color||'var(--g)'}}/></span><b className="hbv">{fmt(r.value)}</b>{r.note&&<small className="hbn">{r.note}</small>}</div>)}</div>
}

// Stat strip: big numbers divided by hairlines instead of a row of cards.
export function Strip({items}:{items:[string,ReactNode,string?][]}){
 return <dl className="strip">{items.map(([k,v,s])=><div key={k}><dt>{k}</dt><dd>{v}</dd>{s&&<small>{s}</small>}</div>)}</dl>
}

// A titled panel with a divider layout: used to put charts beside text without wrapping everything in cards.
export function Panel({title,sub,children,wide}:{title:string;sub?:string;children:ReactNode;wide?:boolean}){
 return <section className={'panel'+(wide?' wide':'')}><header><h4>{title}</h4>{sub&&<small>{sub}</small>}</header>{children}</section>
}

export function Tabs({tabs,children}:{tabs:string[];children:(i:number)=>ReactNode}){
 const [i,setI]=useState(0)
 return <div className="tabx"><div role="tablist" className="tabrow">{tabs.map((t,k)=><button key={t} role="tab" aria-selected={k===i} className={k===i?'on':''} onClick={()=>setI(k)}>{t}</button>)}</div><div role="tabpanel" className="tabpane">{children(i)}</div></div>
}
