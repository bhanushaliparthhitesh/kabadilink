import {CATS} from './config'
// Shared calculation service: every page uses these, nothing recomputes rates on its own.
export const tierOf=(cfg:any,bal:number)=>[...cfg.tiers].reverse().find((t:any)=>bal>=t.min)||cfg.tiers[0]
export const nextTier=(cfg:any,bal:number)=>cfg.tiers.find((t:any)=>t.min>bal)
export const balanceOf=(ledger:any[],uid:string)=>ledger.filter(l=>l.uid===uid).reduce((a,l)=>a+l.pts,0)
export function calc(cfg:any,kg:any,balance:number,bonus=true){
 const k:any={},sub:any={},cash:any={};let subtotal=0,cashTotal=0,kgTotal=0
 CATS.forEach(c=>{k[c]=Math.max(0,+kg[c]||0)});k.wet=Math.min(k.wet,cfg.wetCap)
 CATS.forEach(c=>{sub[c]=k[c]*cfg.ppk[c];cash[c]=c==='wet'?0:k[c]*cfg.rate[c];subtotal+=sub[c];cashTotal+=cash[c];kgTotal+=k[c]})
 const mult=tierOf(cfg,balance).mult,base=Math.round(subtotal*mult),streak=bonus&&subtotal?cfg.streakBonus:0,quality=bonus&&subtotal?cfg.qualityBonus:0
 return {k,sub,cash,subtotal,cashTotal,kgTotal,mult,base,streak,quality,total:base+streak+quality}
}
export const margin=(cfg:any,c:'plastic'|'ewaste')=>cfg.sell[c]-cfg.rate[c]-cfg.cost[c]
export const liability=(cfg:any,ledger:any[])=>Math.round(ledger.reduce((a,l)=>a+l.pts,0)*cfg.pointValue)
