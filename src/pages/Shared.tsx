import {useState} from 'react'
import {useDb,api} from '../api'
export function Notifs(){
 const db=useDb(),me=db.users.find(u=>u.id===db.session)!,ns=db.notifs.filter(n=>n.uid===me.id)
 return <div className="pg"><p className="ey">NOTIFICATIONS</p><h2>What <em>happened.</em></h2>{ns.length?<><p><button className="bt2" onClick={()=>api.markRead()}>Mark all as read</button></p>{ns.map(n=><div key={n.id} className="as" style={{margin:'8px 0',maxWidth:'none',opacity:n.read?.6:1}} onClick={()=>api.markRead(n.id)}>{!n.read&&'● '}{n.text}<br/><small>{new Date(n.at).toLocaleString('en-IN')}</small></div>)}</>:<p>No notifications yet. They appear when a pickup, payment, points or order event happens.</p>}</div>
}
export function Profile(){
 const db=useDb(),me=db.users.find(u=>u.id===db.session)!,[f,setF]=useState({name:me.name,phone:me.phone,area:me.area})
 return <div className="pg" style={{maxWidth:560}}><p className="ey">PROFILE · {me.role.toUpperCase()}</p><h2>Your <em>details.</em></h2><div className="as">{(['name','phone','area'] as const).map(k=><p key={k}><label>{k==='area'?'Address / area':k[0].toUpperCase()+k.slice(1)}<br/><input style={{width:'100%'}} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label></p>)}<button className="pb" onClick={()=>{api.updateProfile(f);alert('Saved on this device (mock).')}}>Save profile</button></div>
  <div className="as"><b>Help and support</b><p>help@kabadilink.example (placeholder). Language selection is not built yet.</p></div></div>
}
