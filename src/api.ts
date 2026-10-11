import {useSyncExternalStore} from 'react'
import {CATS,CATALOG,SLOTS,defaultConfig,Cat} from './config'
import {calc,balanceOf} from './calc'
import type {Db,Kg,Pickup,User} from './types'

const KEY = 'kabadilink-db-v1'
const pad = (n: number) => String(n).padStart(2, '0')
const now = () => new Date().toISOString()

export const getApiBaseUrl = () => import.meta.env.VITE_API_BASE_URL || ''
export const isFallbackEnabled = () => {
  const v = import.meta.env.VITE_ENABLE_DEMO_FALLBACK
  return v === 'true' || v === '1' || v === 'yes' || v === 'TRUE'
}

let API = getApiBaseUrl()

export function setApiUrlForTest(url: string) {
  API = url
}

export async function apiCall(path: string, method = 'GET', body?: any, timeoutMs = 8000) {
  if (!API) throw new Error('API URL not configured')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {'Content-Type': 'application/json'},
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

    if (!res.ok) {
      let errMsg = `Request failed with ${res.status}`
      try {
        const text = await res.text()
        if (text) {
          try {
            const errObj = JSON.parse(text)
            errMsg = errObj.error || errObj.message || errMsg
          } catch {
            errMsg = text.length < 100 ? text : errMsg
          }
        }
      } catch {}
      throw new Error(errMsg)
    }

    const text = await res.text()
    if (!text || !text.trim()) return null
    try {
      return JSON.parse(text)
    } catch {
      throw new Error('Invalid JSON response from server')
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

const HN=['Asha Verma','Rohit Sharma','Priya Singh','Aman Gupta','Neha Kapoor','Vikram Rao','Sunita Devi','Karan Malhotra','Pooja Mehta','Rahul Yadav','Anjali Nair','Deepak Chauhan','Meera Iyer','Sanjay Bose','Kavita Joshi','Arjun Khanna','Ritu Agarwal','Manish Tiwari','Divya Reddy','Harsh Vardhan']
const CN=['Ramesh Prasad','Imran Sheikh','Lakshmi Bai','Suresh Kumar','Fatima Khan','Mohan Lal','Geeta Devi','Raju Mandal']
const RN=['GreenLoop Recyclers','Noida PlastiCycle','Delhi E-Cycle Pvt Ltd','Gurugram Reclaim','Yamuna Polymers']
const LOC=['Sector 62, Noida','Sector 18, Noida','Sector 15, Gurugram','DLF Phase 3, Gurugram','Dwarka, Delhi','Saket, Delhi','Lajpat Nagar, Delhi','Indirapuram, Noida']

function sell(d:Db,l:any,rid:string,at:string){l.status='Sold';l.rid=rid;d.orders.unshift({id:'O-'+(500+d.orders.length),lotId:l.id,rid,cid:l.cid,cat:l.cat,kg:l.kg,amount:l.kg*l.ask,at,status:'Completed'})}

function settle(d:Db,p:Pickup,act:Kg,at:string){
 const c=calc(d.cfg,act,balanceOf(d.ledger,p.hid))
 p.act=c.k;p.payout={...c,rates:{...d.cfg.rate},ppk:{...d.cfg.ppk}};p.status='Paid';p.events.push({s:'Weighed',at,by:p.cid},{s:'Paid',at,by:p.cid})
 CATS.forEach(k=>{if(c.k[k]>0)d.ledger.push({id:'T'+d.ledger.length,uid:p.hid,cat:k,pts:c.sub[k],note:p.id+' · '+k+' '+c.k[k]+' kg',at,pid:p.id})})
 if(c.total>c.subtotal)d.ledger.push({id:'T'+d.ledger.length,uid:p.hid,cat:'bonus',pts:c.total-c.subtotal,note:p.id+' · tier and bonuses',at,pid:p.id})
 ;(['plastic','ewaste'] as Cat[]).forEach(k=>{if(c.k[k]>0)d.lots.push({id:'L-'+(200+d.lots.length),pid:p.id,cid:p.cid!,cat:k,kg:c.k[k],ask:d.cfg.sell[k],loc:p.address,status:'Available',quality:'Not graded'})})
}

export function seed():Db{
 const users:User[]=[]
 HN.forEach((n,i)=>users.push({id:'h'+(i+1),name:n,role:'household',area:LOC[i%8],phone:'+91 98'+(10000000+i*79193),active:true}))
 CN.forEach((n,i)=>users.push({id:'c'+(i+1),name:n,role:'collector',area:LOC[i%8],phone:'+91 97'+(20000000+i*61231),active:true,online:i%4!==3}))
 RN.forEach((n,i)=>users.push({id:'r'+(i+1),name:n,role:'recycler',area:LOC[(i*2)%8],phone:'+91 96'+(30000000+i*50123),active:true}))
 users.push({id:'a1',name:'Demo Admin',role:'admin',area:'Delhi',phone:'',active:true})
 const d:Db={cfg:defaultConfig(),users,pickups:[],ledger:[{id:'T0',uid:'h1',cat:'bonus',pts:600,note:'Demo opening balance',at:'2026-09-01T09:00:00.000Z'}],lots:[],orders:[],notifs:[],redemptions:[],session:null,dataSource:'demo',lastError:null}
 for(let i=0;i<50;i++){
  const date='2026-10-'+pad(1+i%10),T=(h:number)=>date+'T'+pad(h)+':00:00.000Z',status=['Paid','Paid','Paid','Requested','Accepted','On the way','Cancelled'][i%7] as any
  const est:Kg={plastic:i%5+1,wet:i%6+1,ewaste:i%3}
  const p:Pickup={id:'KL-DEMO-'+(1001+i),hid:'h'+(i%20+1),date,slot:SLOTS[i%3],address:LOC[i%8],note:i%5===0?'Ring the bell twice':'',est,status:'Requested',events:[{s:'Requested',at:T(8)}],isDemo:true}
  if(status==='Cancelled'){p.status='Cancelled';p.cancelledAfter=1;p.events.push({s:'Cancelled',at:T(9),by:p.hid})}
  else if(status!=='Requested'){p.cid='c'+(i%8+1);p.status='Accepted';p.events.push({s:'Accepted',at:T(9),by:p.cid})
   if(status!=='Accepted'){p.status='On the way';p.events.push({s:'On the way',at:T(10),by:p.cid})}
   if(status==='Paid'){settle(d,p,est,T(11));if(i%4===0)d.lots.filter(l=>l.pid===p.id).forEach(l=>sell(d,l,'r'+(i%5+1),T(15)))}}
  d.pickups.push(p)}
 return d
}

export function ensureDemoDataLoaded(targetDb: Db = db) {
  if (!targetDb.pickups || targetDb.pickups.length === 0 || targetDb.pickups.every(p => !p.isDemo && !p.id.includes('DEMO'))) {
    const s = seed()
    targetDb.pickups = s.pickups
    if (!targetDb.lots || targetDb.lots.length === 0) targetDb.lots = s.lots
    if (!targetDb.orders || targetDb.orders.length === 0) targetDb.orders = s.orders
    if (!targetDb.ledger || targetDb.ledger.length <= 1) targetDb.ledger = s.ledger
  }
}

function load():Db{
  try{
    const s=localStorage.getItem(KEY)
    if(s){
      const d=JSON.parse(s)
      d.dataSource = API ? (isFallbackEnabled() ? 'demo' : 'unavailable') : 'demo'
      return d
    }
  }catch{}
  return seed()
}

export let db:Db=load(),ver=0
const subs=new Set<()=>void>()
export const commit=()=>{ver++;try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}subs.forEach(f=>f())}

export function me() {
  return db.users.find(u => u.id === db.session)
}

export async function syncPickups(): Promise<void> {
  if (!API) {
    db.dataSource = 'demo'
    ensureDemoDataLoaded()
    commit()
    return
  }
  const u = me()
  let url = '/pickups'
  if (u?.role === 'household') url += `?hid=${encodeURIComponent(u.id)}`
  else if (u?.role === 'collector') url += `?cid=${encodeURIComponent(u.id)}`
  try {
    const data = await apiCall(url)
    const items = Array.isArray(data) ? data : (data?.items || data?.pickups || null)
    if (items !== null) {
      db.pickups = items
      db.dataSource = 'api'
      db.lastError = null
      commit()
      return
    }
    db.pickups = []
    db.dataSource = 'api'
    db.lastError = null
    commit()
  } catch (e: any) {
    console.error('Failed to sync pickups from ' + url, e)
    const errMsg = e?.message || 'Failed to fetch pickups'
    db.lastError = errMsg
    if (isFallbackEnabled()) {
      console.warn('Backend unavailable. Falling back to demo data.', e)
      db.dataSource = 'demo'
      ensureDemoDataLoaded()
      commit()
    } else {
      db.pickups = []
      db.dataSource = 'unavailable'
      commit()
    }
  }
}

if (API) {
  syncPickups()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === KEY && e.newValue) {
      try {
        db = JSON.parse(e.newValue)
        ver++
        subs.forEach(f => f())
      } catch {}
    }
  })
}

export const useDb=()=>{useSyncExternalStore(f=>{subs.add(f);return()=>{subs.delete(f)}},()=>ver);return db}
export const attempt=async (f:()=>any)=>{try{await f();return true}catch(e:any){alert(e.message);return false}}
export const nm=(d:Db,id?:string)=>d.users.find(u=>u.id===id)?.name||'Not assigned'
const need=(r:string)=>{const u=me();if(!u||u.role!==r)throw new Error('This action is not available for your account.');return u}
const find=(id:string)=>{const p=db.pickups.find(x=>x.id===id);if(!p)throw new Error('Pickup not found.');return p}
const notify=(uid:string|undefined,text:string)=>{if(uid)db.notifs.unshift({id:'N'+Date.now()+db.notifs.length,uid,text,at:now(),read:false})}
const wetUsed=(hid:string,date:string,ex?:string)=>db.pickups.filter(p=>p.hid===hid&&p.date===date&&p.status!=='Cancelled'&&p.id!==ex).reduce((a,p)=>a+(p.act??p.est).wet,0)

export const api={
 login(id:string){db.session=id;commit();if(API)syncPickups()},
 logout(){db.session=null;commit()},
 async createPickup(f:any){
  const u=need('household'),kg:Kg={plastic:+f.kg.plastic||0,wet:+f.kg.wet||0,ewaste:+f.kg.ewaste||0}
  if(CATS.some(c=>kg[c]<0))throw new Error('Weights cannot be negative.')
  if(kg.plastic+kg.wet+kg.ewaste<=0)throw new Error('Turn on at least one category and enter a weight.')
  if(!f.date||f.date<now().slice(0,10))throw new Error('Choose today or a later date.')
  if(!f.slot||!f.address.trim())throw new Error('Choose a time slot and enter your address.')
  const left=db.cfg.wetCap-wetUsed(u.id,f.date);if(kg.wet>left)throw new Error('Wet waste is limited to '+db.cfg.wetCap+' kg per household per day. You have '+left+' kg left on this date.')
  
  if (API && db.dataSource === 'api') {
    try {
      const p = await apiCall('/pickups', 'POST', { hid: u.id, date: f.date, slot: f.slot, address: f.address, note: f.note||'', kg })
      db.pickups.unshift(p)
      notify(u.id,'Pickup '+p.id+' requested. Collectors nearby can see it now.')
      commit()
      return p.id
    } catch (e: any) {
      if (!isFallbackEnabled()) {
        throw e
      }
      console.warn('Backend failed, creating demo pickup', e)
      db.dataSource = 'demo'
    }
  }

  const p:Pickup={
    id:'KL-DEMO-'+(1001+db.pickups.length),
    hid:u.id,
    date:f.date,
    slot:f.slot,
    address:f.address,
    note:(f.note||'') + ' (Demo · Not saved to AWS)',
    est:kg,
    status:'Requested',
    events:[{s:'Requested',at:now(),by:u.id}],
    isDemo:true
  }
  db.pickups.unshift(p)
  notify(u.id,'Created demo pickup '+p.id+' (Demo · Local only / Not saved to AWS).')
  commit()
  return p.id
 },

 async cancelPickup(id:string){
  const u=need('household'),p=find(id)
  if(p.hid!==u.id||!['Requested','Accepted'].includes(p.status))throw new Error('This pickup can no longer be cancelled.')
  
  if (API && db.dataSource === 'api') {
    try {
      const updated = await apiCall(`/pickups/${id}/status`, 'PATCH', {status: 'Cancelled', actorId: u.id})
      Object.assign(p, updated)
      notify(p.cid,p.id+' was cancelled by the household.')
      commit()
      return
    } catch(e: any) {
      if (!isFallbackEnabled()) {
        throw e
      }
      console.warn('Backend call failed, applying demo fallback for cancelPickup', e)
      db.dataSource = 'demo'
    }
  }

  p.cancelledAfter=p.events.length
  p.status='Cancelled'
  p.events.push({s:'Cancelled',at:now(),by:u.id})
  notify(p.cid,p.id+' was cancelled (Demo · Local only).')
  commit()
 },

 async acceptPickup(id:string){
  const u=need('collector'),p=find(id)
  if(p.status!=='Requested')throw new Error('This request was already claimed or cancelled.')

  if (API && db.dataSource === 'api') {
    try {
      const updated = await apiCall(`/pickups/${id}/status`, 'PATCH', {status: 'Accepted', actorId: u.id})
      Object.assign(p, updated)
      notify(p.hid,u.name+' accepted '+p.id+'.')
      commit()
      return
    } catch (e: any) {
      if (!isFallbackEnabled()) {
        throw e
      }
      console.warn('Backend call failed, applying demo fallback for acceptPickup', e)
      db.dataSource = 'demo'
    }
  }

  p.cid=u.id
  p.status='Accepted'
  p.events.push({s:'Accepted',at:now(),by:u.id})
  notify(p.hid,u.name+' accepted '+p.id+' (Demo · Local only).')
  commit()
 },

 async markOnTheWay(id:string){
  const u=need('collector'),p=find(id)
  if(p.cid!==u.id||p.status!=='Accepted')throw new Error('You cannot update this pickup.')

  if (API && db.dataSource === 'api') {
    try {
      const updated = await apiCall(`/pickups/${id}/status`, 'PATCH', {status: 'On the way', actorId: u.id})
      Object.assign(p, updated)
      notify(p.hid,u.name+' is on the way for '+p.id+'.')
      commit()
      return
    } catch (e: any) {
      if (!isFallbackEnabled()) {
        throw e
      }
      console.warn('Backend call failed, applying demo fallback for markOnTheWay', e)
      db.dataSource = 'demo'
    }
  }

  p.status='On the way'
  p.events.push({s:'On the way',at:now(),by:u.id})
  notify(p.hid,u.name+' is on the way for '+p.id+' (Demo · Local only).')
  commit()
 },

 async recordWeighIn(id:string,kg:any){
  const u=need('collector'),p=find(id)
  if(p.cid!==u.id)throw new Error('You are not assigned to this pickup.')
  if(p.status==='Paid')throw new Error('This pickup is already paid. Nothing was credited twice.')
  if(p.status!=='On the way')throw new Error('Mark the pickup as on the way before weighing.')
  if(CATS.some(c=>+kg[c]<0))throw new Error('Weights cannot be negative.')
  if(+kg.wet+wetUsed(p.hid,p.date,p.id)>db.cfg.wetCap)throw new Error('Wet waste cap of '+db.cfg.wetCap+' kg per day exceeded.')

  if (API && db.dataSource === 'api') {
    try {
      const updated = await apiCall(`/pickups/${id}/weigh-in`, 'PATCH', {collectorId: u.id, kg})
      Object.assign(p, updated)
      if (p.payout) {
        p.payout.total = p.payout.totalPoints || 0
        p.payout.kgTotal = (p.payout.kg?.plastic||0) + (p.payout.kg?.wet||0) + (p.payout.kg?.ewaste||0)
        const actKg = p.act || kg
        if (p.payout.points) {
          CATS.forEach(k=>{if(actKg[k]>0)db.ledger.push({id:'T'+db.ledger.length,uid:p.hid,cat:k,pts:p.payout.points[k],note:p.id+' · '+k+' '+actKg[k]+' kg',at:now(),pid:p.id})})
        }
        ;(['plastic','ewaste'] as Cat[]).forEach(k=>{if(actKg[k]>0)db.lots.push({id:'L-'+(200+db.lots.length),pid:p.id,cid:p.cid!,cat:k,kg:actKg[k],ask:db.cfg.sell[k],loc:p.address,status:'Available',quality:'Not graded'})})
      }
      notify(p.hid,p.id+' is paid: ₹'+(p.payout?.cashTotal||0)+' and '+(p.payout?.total||0)+' Green Points.')
      commit()
      return
    } catch (e: any) {
      if (!isFallbackEnabled()) {
        throw e
      }
      console.warn('Backend call failed, applying demo fallback for recordWeighIn', e)
      db.dataSource = 'demo'
    }
  }

  settle(db,p,kg,now())
  notify(p.hid,p.id+' is paid (Demo · Local only): ₹'+p.payout.cashTotal+' and '+p.payout.total+' Green Points. Not persisted to AWS.')
  commit()
 },

 redeemReward(rid:string){
  const u=need('household'),r=CATALOG.find(x=>x.id===rid)!
  if(balanceOf(db.ledger,u.id)<r.cost)throw new Error('Not enough Green Points for this reward.')
  if(db.redemptions.filter(x=>x.rid===rid).length>=r.stock)throw new Error('This reward is out of stock.')
  db.ledger.push({id:'T'+db.ledger.length,uid:u.id,cat:'redeem',pts:-r.cost,note:'Redeemed '+r.name,at:now()})
  db.redemptions.unshift({id:'RD'+(db.redemptions.length+1),uid:u.id,rid,name:r.name,cost:r.cost,at:now(),status:'Fulfilled (mock)'})
  notify(u.id,'You redeemed '+r.name+' (Demo · Local only).')
  commit()
 },

 scratchCard(pid:string){
  const u=need('household'),p=find(pid)
  if(p.hid!==u.id||p.status!=='Paid'||p.scratched)throw new Error('This scratch card is not available.')
  const pts=10+(+p.id.slice(-2)%4)*5
  p.scratched=true
  db.ledger.push({id:'T'+db.ledger.length,uid:u.id,cat:'scratch',pts,note:'Scratch card for '+p.id+' (mock outcome)',at:now(),pid})
  commit()
  return pts
 },

 buyLot(id:string){
  const u=need('recycler'),l=db.lots.find(x=>x.id===id)
  if(!l||l.status!=='Available')throw new Error('This lot is no longer available.')
  sell(db,l,u.id,now())
  notify(l.cid,'Lot '+l.id+' sold to '+u.name+' for ₹'+l.kg*l.ask+' (Demo · Local only).')
  commit()
 },

 updateConfig(patch:Record<string,number>){
  need('admin')
  Object.entries(patch).forEach(([path,v])=>{if(!(v>=0))throw new Error('Enter valid numbers.')})
  Object.entries(patch).forEach(([path,v])=>{const ks=path.split('.');let o:any=db.cfg;ks.slice(0,-1).forEach(k=>o=o[k]);o[ks[ks.length-1]]=v})
  db.cfg.updatedAt=now().slice(0,10)
  commit()
 },

 toggleOnline(){
  const u=need('collector')
  u.online=!u.online
  commit()
 },

 setActive(id:string){
  need('admin')
  const u=db.users.find(x=>x.id===id)!
  u.active=!u.active
  commit()
 },

 markRead(id?:string){
  const u=me()
  db.notifs.forEach(n=>{if(n.uid===u?.id&&(!id||n.id===id))n.read=true})
  commit()
 },

 updateProfile(p:any){
  const u=me()
  if(u)Object.assign(u,p)
  commit()
 },

 resetDemo(){
  const fresh=seed()
  Object.assign(db,fresh)
  db.pickups=fresh.pickups
  db.lots=fresh.lots
  db.orders=fresh.orders
  db.ledger=fresh.ledger
  db.notifs=fresh.notifs
  db.redemptions=fresh.redemptions
  db.session=null
  db.dataSource='demo'
  db.lastError=null
  commit()
 }
}
