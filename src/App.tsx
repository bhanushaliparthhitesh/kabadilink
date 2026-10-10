import {Routes,Route,Navigate,NavLink,Link,useNavigate,useLocation,Outlet} from 'react-router-dom'
import {useDb,api} from './api'
import {HOME} from './config'
import {Landing,SignIn} from './pages/Public'
import {HDash,NewPickup,History,Rewards} from './pages/Household'
import {PickupDetail} from './pages/Detail'
import {COverview,CInventory,RMarket,ROrders,Admin} from './pages/Roles'
import {Notifs,Profile} from './pages/Shared'
import {useClock,ThemeToggle,goSim} from './components/ui'
const NAV:any={household:[['/h','Dashboard'],['/h/new','Schedule'],['/h/pickups','History'],['/h/rewards','Rewards']],collector:[['/c','Overview'],['/c/inventory','Inventory']],recycler:[['/r','Marketplace'],['/r/orders','Orders']],admin:[['/a','Admin']]}
const cls=({isActive}:any)=>isActive?'on':''
function Shell(){
 const db=useDb(),me=db.users.find(u=>u.id===db.session),go=useNavigate(),loc=useLocation(),unread=db.notifs.filter(n=>n.uid===me?.id&&!n.read).length,clock=useClock()
 return <><header className="nav"><Link to="/" className="br"><i className="dot"/>KabadiLink</Link><span className="pill">Mock data · Noida pilot</span>
  <nav className="tabs" aria-label="Main">{me?NAV[me.role].map(([to,l]:any)=><NavLink key={to} to={to} end className={cls}>{l}</NavLink>):<NavLink to="/" end className={cls}>Home</NavLink>}{!me&&<a tabIndex={0} role="button" onClick={()=>goSim(go,loc.pathname==='/')} onKeyDown={e=>e.key==='Enter'&&goSim(go,loc.pathname==='/')}>Simulator</a>}</nav>
  <span className="lv">{me?<><NavLink to="/notifications">🔔 {unread||''}</NavLink> · <NavLink to="/profile">{me.name}</NavLink> · <a tabIndex={0} role="button" onClick={()=>{api.logout();go('/')}}>Sign out</a> · </>:<><NavLink to="/signin">Sign in</NavLink> · </>}live · mock · {clock} <ThemeToggle/></span></header><Outlet/></>
}
const Guard=({role,children}:any)=>{const db=useDb(),me=db.users.find(u=>u.id===db.session)
 if(!me||!me.active)return <Navigate to="/signin" replace/>
 return role&&me.role!==role?<Navigate to={HOME[me.role]} replace/>:children}
const G=(role:string,el:any)=><Guard role={role}>{el}</Guard>
export default function App(){return <Routes><Route element={<Shell/>}>
 <Route index element={<Landing/>}/><Route path="signin" element={<SignIn/>}/>
 <Route path="h" element={G('household',<HDash/>)}/><Route path="h/new" element={G('household',<NewPickup/>)}/><Route path="h/pickups" element={G('household',<History/>)}/><Route path="h/rewards" element={G('household',<Rewards/>)}/>
 <Route path="c" element={G('collector',<COverview/>)}/><Route path="c/inventory" element={G('collector',<CInventory/>)}/>
 <Route path="r" element={G('recycler',<RMarket/>)}/><Route path="r/orders" element={G('recycler',<ROrders/>)}/>
 <Route path="a" element={G('admin',<Admin/>)}/>
 <Route path="pickup/:id" element={G('',<PickupDetail/>)}/><Route path="notifications" element={G('',<Notifs/>)}/><Route path="profile" element={G('',<Profile/>)}/>
 <Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes>}
