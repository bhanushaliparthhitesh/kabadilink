import {useEffect,useState} from 'react'
// Small shared UI helpers: live clock for the nav and the status bars, and the light/dark toggle.
const fmt=()=>new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
export function useClock(){const [t,setT]=useState(fmt);useEffect(()=>{const i=setInterval(()=>setT(fmt()),15000);return()=>clearInterval(i)},[]);return t}
const KEY='kabadilink-theme'
const apply=(t:string|null)=>{const r=document.documentElement;t?r.setAttribute('data-theme',t):r.removeAttribute('data-theme')}
try{apply(localStorage.getItem(KEY))}catch{}
export function ThemeToggle(){
 const [t,setT]=useState<string|null>(()=>{try{return localStorage.getItem(KEY)}catch{return null}})
 const dark=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches
 return <button className="tg" aria-label={dark?'Switch to light theme':'Switch to dark theme'} title="Light / dark" onClick={()=>{const n=dark?'light':'dark';setT(n);apply(n);try{localStorage.setItem(KEY,n)}catch{}}}>◐</button>
}

// Nav "Simulator" link: the simulator lives on the home page, so go home first if needed, then scroll to it.
export function goSim(go:(to:string)=>void,onHome:boolean){
 const scroll=()=>document.getElementById('simulator')?.scrollIntoView({behavior:'smooth',block:'start'})
 if(onHome)scroll();else{go('/');setTimeout(scroll,120)}
}
