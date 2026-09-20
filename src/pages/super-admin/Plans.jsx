import { useEffect,useState } from "react";
import api from "../../lib/api";
import { cachedGet, cacheRemove } from "../../lib/cache";
import RefreshButton from "../../components/RefreshButton";

export default function Plans(){
 const [plans,setPlans]=useState([]),[catalog,setCatalog]=useState({}),[busy,setBusy]=useState("");
 async function load(force=false){const r=await cachedGet(api,"/super-admin/plans",{key:"platform:plans",forceRefresh:force,scope:"global",revalidate:true});setPlans(r.data.plans||[]);setCatalog(r.data.featureCatalog||{})}
 useEffect(()=>{load()},[]);
 function toggle(p,key){setPlans(xs=>xs.map(x=>x.code===p.code?{...x,features:(x.features||[]).includes(key)?x.features.filter(f=>f!==key):[...(x.features||[]),key]}:x))}
 async function save(p){setBusy(p.code);try{await api.patch(`/super-admin/plans/${p.code}`,{name:p.name,description:p.description,monthlyPrice:Number(p.monthlyPrice),yearlyPrice:Number(p.yearlyPrice),limits:p.limits,active:p.active,features:p.features});await cacheRemove("platform:plans",{scope:"global"});await load(true)}finally{setBusy("")}}
 return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">SaaS Plans</h1><p className="mt-1 text-slate-500">Every plan uses a fixed feature catalog. A disabled feature is blocked server-side for every tenant using that plan.</p></div><RefreshButton onClick={()=>load(true)} /></div><div className="mt-7 grid gap-5 xl:grid-cols-3">{plans.map(p=><div className="card p-5 sm:p-6" key={p.code}>
 <div className="flex items-center justify-between"><h2 className="text-xl font-black">{p.name}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{p.code}</span></div>
 <label className="mt-5 block text-sm font-bold">Plan name<input className="input mt-2" value={p.name} onChange={e=>setPlans(xs=>xs.map(x=>x.code===p.code?{...x,name:e.target.value}:x))}/></label>
 <label className="mt-3 block text-sm font-bold">Description<textarea className="input mt-2" value={p.description||""} onChange={e=>setPlans(xs=>xs.map(x=>x.code===p.code?{...x,description:e.target.value}:x))}/></label>
 <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm font-bold">Monthly ₹<input type="number" className="input mt-2" value={p.monthlyPrice} onChange={e=>setPlans(xs=>xs.map(x=>x.code===p.code?{...x,monthlyPrice:e.target.value}:x))}/></label><label className="text-sm font-bold">Yearly ₹<input type="number" className="input mt-2" value={p.yearlyPrice} onChange={e=>setPlans(xs=>xs.map(x=>x.code===p.code?{...x,yearlyPrice:e.target.value}:x))}/></label></div>
 <div className="mt-4 grid grid-cols-2 gap-3">{["products","variants","staff","customers","suppliers"].map(k=><label key={k} className="text-sm font-bold capitalize">{k}<input type="number" className="input mt-2" value={p.limits?.[k]??0} onChange={e=>setPlans(xs=>xs.map(x=>x.code===p.code?{...x,limits:{...x.limits,[k]:Number(e.target.value)}}:x))}/></label>)}</div>
 <div className="mt-5"><h3 className="font-black">Feature access</h3><p className="mt-1 text-xs text-slate-500">Toggle the exact capabilities this plan provides.</p><div className="mt-3 grid gap-2">{Object.entries(catalog).map(([key,meta])=><label key={key} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${p.features?.includes(key)?"border-emerald-300 bg-emerald-50":"bg-slate-50"}`}><input type="checkbox" className="mt-1 h-4 w-4" checked={p.features?.includes(key)||false} onChange={()=>toggle(p,key)}/><span><b>{meta.label}</b><span className="block text-xs text-slate-500">{meta.description}</span><span className="mt-1 inline-block text-[10px] font-black uppercase tracking-wider text-slate-400">{key}</span></span></label>)}</div></div>
 <label className="mt-4 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={p.active} onChange={e=>setPlans(xs=>xs.map(x=>x.code===p.code?{...x,active:e.target.checked}:x))}/> Active</label>
 <button className="btn-primary mt-5 w-full" disabled={busy===p.code} onClick={()=>save(p)}>{busy===p.code?"Saving...":"Save plan"}</button>
 </div>)}</div></div>
}
