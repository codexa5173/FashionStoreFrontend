import { useState } from "react";
import { Navigate,useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function Login(){
  const{admin,login}=useAuth(); const loc=useLocation(); const superMode=new URLSearchParams(loc.search).get("super")==="1";
  const[u,setU]=useState(""),[p,setP]=useState(""),[tenant,setTenant]=useState(localStorage.getItem("tenantSlug")||""),[e,setE]=useState(""),[busy,setBusy]=useState(false),[show,setShow]=useState(false);
  if(admin)return <Navigate to={admin.role==="super_admin"?"/super-admin":(loc.state?.from||"/admin")} replace/>;
  async function submit(x){x.preventDefault();setE("");setBusy(true);try{await login(u,p,superMode?"":tenant)}catch(err){setE(err.response?.data?.message||"Login failed")}finally{setBusy(false)}}
  return <div className="grid min-h-[75vh] place-items-center px-4"><form onSubmit={submit} className="card w-full max-w-md p-8">
    <div className="text-4xl">{superMode?"🛡️":"🧸"}</div><h1 className="mt-4 text-3xl font-black">{superMode?"SaaS Platform Admin":"JD COLLECTION Admin"}</h1><p className="mt-1 text-slate-500">{superMode?"Manage stores, plans and subscriptions.":"Sign in to manage the product catalogue."}</p>
    {e&&<div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{e}</div>}
    <label className="mt-6 block text-sm font-bold">Username<input required value={u} onChange={e=>setU(e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
    {!superMode&&<label className="mt-4 block text-sm font-bold">Store slug<input value={tenant} onChange={e=>setTenant(e.target.value.toLowerCase())} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="your-store" /></label>}
    <label className="mt-4 block text-sm font-bold">Password
      <div className="relative mt-2"><input required type={show?"text":"password"} value={p} onChange={e=>setP(e.target.value)} className="w-full rounded-2xl bg-slate-100 p-3 pr-12"/>
      <button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500 hover:bg-white" aria-label={show?"Hide password":"Show password"}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
    </label>
    <button disabled={busy} className="btn-primary mt-6 w-full">{busy?"Signing in...":"Sign in"}</button>
  <p className="mt-5 text-center text-sm text-slate-500">{superMode?<Link className="font-bold text-slate-900" to="/admin/login">Store admin login</Link>:"Contact the Platform Admin to register a store."}</p>
  </form></div>
}