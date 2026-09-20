import { useEffect, useState } from "react";
import { Store, Users, Package, ShoppingCart, IndianRupee, PauseCircle, Clock3 } from "lucide-react";
import api from "../../lib/api";
import { cachedGet } from "../../lib/cache";
import RefreshButton from "../../components/RefreshButton";

export default function Overview() {
  const [data,setData]=useState(null);
  useEffect(()=>{cachedGet(api,"/super-admin/dashboard",{key:"platform:dashboard",scope:"global"}).then(r=>setData(r.data)).catch(()=>{});},[]);
  if(!data) return <div>Loading platform dashboard...</div>;
  const cards=[
    ["Tenants",data.counts.tenants,Store],["Active",data.counts.active,Store],["Trials",data.counts.trial,Clock3],
    ["Suspended",data.counts.suspended,PauseCircle],["Store Staff",data.counts.admins,Users],["Products",data.counts.products,Package],
    ["Orders",data.counts.orders,ShoppingCart],["Recorded Sales",`₹${Number(data.sales||0).toLocaleString("en-IN")}`,IndianRupee]
  ];
  return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Platform Overview</h1><p className="mt-1 text-slate-500">Manage all fashion stores from one SaaS control panel.</p></div><RefreshButton onClick={()=>cachedGet(api,"/super-admin/dashboard",{key:"platform:dashboard",forceRefresh:true,scope:"global"}).then(r=>setData(r.data))}/></div>
    <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">{cards.map(([label,v,Icon])=><div className="card p-5" key={label}><Icon size={20}/><div className="mt-4 text-2xl font-black">{v}</div><div className="text-sm text-slate-500">{label}</div></div>)}</div>
  </div>;
}
