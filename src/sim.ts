import {calc} from './calc'
// The whole simulator is a pure function of time: derive(t) returns one shared state that every screen reads.
// That is what lets the page behave like a video (play, pause, scrub, replay) while phones stay in sync.
export const clamp=(x:number,a=0,b=1)=>Math.min(b,Math.max(a,x))
export const ramp=(t:number,a:number,b:number)=>clamp((t-a)/(b-a))
export const ease=(x:number)=>x*x*(3-2*x)
const half=(x:number)=>Math.round(x*2)/2,tenth=(x:number)=>Math.round(x*10)/10

export const TOTAL=48
export const PID='KL-1051'
export const EST={plastic:3,wet:2,ewaste:1}
export const ACT={plastic:3.5,wet:2,ewaste:1.5}
export const BASE={pts:620,today:1240,pickups:14}
export const WEEK=[['Sun',820],['Mon',980],['Tue',1120],['Wed',860],['Thu',1310],['Fri',1050]] as [string,number][]

export interface Chapter{start:number;end:number;label:string;who:string;api:string;what:string}
export const CH:Chapter[]=[
 {start:0,end:6,label:'Household requests a pickup',who:'Household',api:'createPickup',what:'Asha picks her categories and rough weights and taps Request. The request is saved and nearby collectors are alerted.'},
 {start:6,end:9.5,label:'Collector gets the alert',who:'Collector',api:'SNS push + getNearbyRequests',what:'Ramesh\'s phone buzzes. The request shows distance, estimated weight and expected payout.'},
 {start:9.5,end:13,label:'Collector accepts',who:'Collector',api:'acceptPickup',what:'Ramesh taps Accept. A conditional write means only one collector can claim it, and Asha is told straight away.'},
 {start:13,end:27,label:'Truck drives to the house',who:'Collector',api:'markOnTheWay + location stream',what:'Ramesh starts the trip. Asha follows the truck on the map and both phones show the same position and ETA.'},
 {start:27,end:35,label:'Weigh-in at the door',who:'Collector',api:'recordWeighIn',what:'Each bag goes on the scale. The payout and points update with every kilo.'},
 {start:35,end:41,label:'Payout and points land',who:'System',api:'ledger + createLots',what:'Cash and Green Points are credited in one transaction. Plastic and e-waste become lots for recyclers.'},
 {start:41,end:48,label:'Recycler buys the lot',who:'Recycler',api:'purchaseLot',what:'GreenLoop buys both lots. Ramesh is paid for the material and the loop closes.'}]

export const CAPTIONS:[number,string][]=[
 [0,'Asha has sorted her waste into three bags and opens KabadiLink.'],
 [0.9,'She switches on what she has and sets rough weights. The estimate updates as she goes.'],
 [5.2,'She taps Request pickup. createPickup saves it and alerts collectors within 2 km.'],
 [6.5,'Ramesh\'s phone buzzes with a new request: 0.8 km away, about 6 kg.'],
 [11,'Ramesh taps Accept. Asha sees his name on her phone a moment later.'],
 [13.6,'Ramesh starts the trip. Watch the truck: both phones see the same position.'],
 [26,'The truck has arrived. The weigh-in starts.'],
 [27.6,'Each bag goes on the scale. The payout updates with every kilo.'],
 [35.6,'Ramesh confirms. Cash goes to Asha\'s wallet and points are credited at her Sapling rate.'],
 [38.6,'Plastic and e-waste are listed as lots, and recyclers can see them.'],
 [44,'GreenLoop buys both lots. Ramesh is paid and the loop closes.']]

export const LOG:[number,string,string][]=[
 [0.9,'app','Asha opens Schedule'],
 [5.5,'POST /pickups','createPickup → '+PID+' saved (DynamoDB)'],
 [5.6,'SNS','push to 3 online collectors within 2 km'],
 [6.5,'push','delivered to Ramesh\'s phone'],
 [11.3,'POST /pickups/accept','conditional write: first collector wins'],
 [11.5,'SNS','notify Asha: Ramesh accepted'],
 [14,'POST /pickups/on-the-way','status → On the way'],
 [16,'location','ping 1 · 1.3 km left'],[18,'location','ping 2 · 0.9 km left'],[20,'location','ping 3 · 0.6 km left'],[22,'location','ping 4 · 0.4 km left'],[24,'location','ping 5 · 0.1 km left'],
 [26,'geofence','collector within 50 m of Asha'],
 [36,'POST /weigh-in','recordWeighIn: one transaction, idempotency key set'],
 [36.1,'ledger','credit points and cash payout row'],
 [36.5,'lots','L-201 plastic and L-202 e-waste listed'],
 [44.4,'POST /lots/purchase','conditional update: lot sells once'],
 [44.6,'SNS','notify Ramesh: lots sold']]

const BANNER_HH:[number,number,string,string][]=[[11.6,13.8,'Ramesh accepted your request','He will start the trip shortly.'],[14.2,17.2,'Ramesh is on the way','About 7 minutes away.'],[26,28.6,'Ramesh has arrived','Keep your bags ready at the door.']]
const BANNER_HH2:[number,number,string,string][]=[[36.2,39.8,'Paid and credited','Cash and Green Points are in your wallet.']]

export function derive(t:number,cfg:any){
 const form={plastic:{on:t>=1,kg:half(ramp(t,1.2,2.4)*EST.plastic)},wet:{on:t>=2.6,kg:half(ramp(t,2.8,3.4)*EST.wet)},ewaste:{on:t>=3.6,kg:half(ramp(t,3.8,4.3)*EST.ewaste)}}
 const fk={plastic:form.plastic.on?form.plastic.kg:0,wet:form.wet.on?form.wet.kg:0,ewaste:form.ewaste.on?form.ewaste.kg:0}
 const estimate=calc(cfg,fk,BASE.pts),final=calc(cfg,ACT,BASE.pts)
 const read={plastic:tenth(ramp(t,27.6,29.6)*ACT.plastic),wet:tenth(ramp(t,29.8,31)*ACT.wet),ewaste:tenth(ramp(t,31.2,32.6)*ACT.ewaste)}
 const live=calc(cfg,read,BASE.pts)
 const paid=t>=36,listed=t>=36.5,sold=t>=44.4
 const sale=Math.round(cfg.sell.plastic*ACT.plastic+cfg.sell.ewaste*ACT.ewaste),margin=sale-final.cashTotal
 const pts=BASE.pts+(paid?Math.round(ease(ramp(t,36.2,38.4))*final.total):0),wallet=paid?Math.round(ease(ramp(t,36.2,38))*final.cashTotal):0
 const today=BASE.today+(sold?Math.round(ease(ramp(t,44.6,45.6))*margin):0)
 const progress=t<14?0:ease(ramp(t,14,26)),arrived=t>=26
 const hh=t<0.9?'idle':t<5.5?'form':t<11.3?'requested':t<14?'accepted':t<26?'onway':t<36?'arrived':'paid'
 const col=t<6.7?'scan':t<11.3?'alert':t<14?'accepted':t<26?'onway':t<36?'weigh':t<44.4?'paid':'sold'
 const status={Requested:4,Accepted:5,'On the way':4,Paid:27,Cancelled:10} as Record<string,number>
 if(t>=5.5&&t<11.3)status.Requested++;else if(t>=11.3&&t<14)status.Accepted++;else if(t>=14&&t<36)status['On the way']++;else if(t>=36)status.Paid++
 const kg={plastic:412+(paid?ACT.plastic:0),wet:530+(paid?ACT.wet:0),ewaste:88+(paid?ACT.ewaste:0)}
 const avail={plastic:20.5+(listed&&!sold?ACT.plastic:0),ewaste:4+(listed&&!sold?ACT.ewaste:0)}
 const win=(a:[number,number,string,string][])=>a.find(b=>t>=b[0]&&t<b[1])
 const bh=win([...BANNER_HH,...BANNER_HH2]),bc=t>=6.5&&t<9.8?[6.5,0,'New pickup request','0.8 km away · Sector 62 · about 6 kg']:t>=44.6&&t<47.8?[44.6,0,'Lots sold to GreenLoop','₹'+sale+' received · margin ₹'+margin]:null
 const hint={hhOpen:t>=0.2&&t<0.9,hhReq:t>=4.4&&t<5.5,colAccept:t>=9&&t<11.3,colStart:t>=12.6&&t<14,colConfirm:t>=34.2&&t<36,recBuy:t>=40&&t<44.4}
 return {t,form,estimate,final,read,live,paid,listed,sold,sale,margin,pts,wallet,today,progress,arrived,hh,col,status,kg,avail,hint,
  pickups:BASE.pickups+(paid?1:0),total:50+(t>=5.5?1:0),bannerHH:bh?[bh[2],bh[3]]:null,bannerCol:bc?[bc[2] as string,bc[3] as string]:null,
  cash:final.cashTotal,order:'O-512',tierPct:clamp((pts-500)/(2000-500))*100}
}
export type S=ReturnType<typeof derive>
