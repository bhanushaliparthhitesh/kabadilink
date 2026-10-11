import type {Cat} from './config'
export type Role='household'|'collector'|'recycler'|'admin'
export type Status='Requested'|'Accepted'|'On the way'|'Weighed'|'Paid'|'Cancelled'
export type DataSource='api'|'demo'|'unavailable'
export type Kg=Record<Cat,number>
export interface User{id:string;name:string;role:Role;area:string;phone:string;active:boolean;online?:boolean}
export interface Ev{s:string;at:string;by?:string}
export interface Pickup{id:string;hid:string;cid?:string;date:string;slot:string;address:string;note:string;est:Kg;act?:Kg;status:Status;events:Ev[];payout?:any;cancelledAfter?:number;scratched?:boolean;isDemo?:boolean}
export interface Ledger{id:string;uid:string;cat:string;pts:number;note:string;at:string;pid?:string}
export interface Lot{id:string;pid:string;cid:string;cat:Cat;kg:number;ask:number;loc:string;status:'Available'|'Sold';quality:string;rid?:string}
export interface Order{id:string;lotId:string;rid:string;cid:string;cat:Cat;kg:number;amount:number;at:string;status:string}
export interface Notif{id:string;uid:string;text:string;at:string;read:boolean}
export interface Db{cfg:any;users:User[];pickups:Pickup[];ledger:Ledger[];lots:Lot[];orders:Order[];notifs:Notif[];redemptions:any[];session:string|null;dataSource:DataSource;lastError?:string|null}

