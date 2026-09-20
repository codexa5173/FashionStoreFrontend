import { useEffect, useState } from "react";
import api from "../../lib/api";
import { showAlert } from "../../lib/feedback";
import { cachedGet, cacheClearPrefix } from "../../lib/cache";
import Pagination from "../../components/Pagination";
import { useAuth } from "../../context/AuthContext";

const PAGE_SIZE = 20;
const SEGMENTS = ["all","new","returning","loyal","vip","at_risk","inactive"];

export default function Campaigns() {
  const { admin } = useAuth();
  const tenantKey = admin?.tenant?.slug || admin?.tenant?._id || "tenant";
  const [items,setItems]=useState([]), [page,setPage]=useState(1), [pagination,setPagination]=useState({pages:1,total:0});
  const [form,setForm]=useState({name:"",title:"",message:"",url:"/",kind:"promotion",segment:"all",loyaltyTier:"",tag:"",scheduledFor:""});
  const [busy,setBusy]=useState(false);
  const load=async(force=false)=>{
    const r=await cachedGet(api,`/campaigns?page=${page}&limit=${PAGE_SIZE}`,{key:`campaigns:${tenantKey}:${page}`,forceRefresh:force});
    setItems(r.data?.items||[]); setPagination(r.data?.pagination||{pages:1,total:0});
  };
  useEffect(()=>{load()},[page]);
  async function create(e){
    e.preventDefault(); setBusy(true);
    try{
      const r=await api.post("/campaigns",{name:form.name,title:form.title,message:form.message,url:form.url,kind:form.kind,
        audience:{segment:form.segment,loyaltyTier:form.loyaltyTier,tag:form.tag},
        scheduledFor:form.scheduledFor?new Date(form.scheduledFor).toISOString():null});
      if(!form.scheduledFor) await api.post(`/campaigns/${r.data._id}/send`);
      setForm({name:"",title:"",message:"",url:"/",kind:"promotion",segment:"all",loyaltyTier:"",tag:"",scheduledFor:""});
      await cacheClearPrefix(`campaigns:${tenantKey}:`); await load(true);
    }catch(e){showAlert(e.response?.data?.message||"Could not create campaign.")}finally{setBusy(false)}
  }
  async function action(id,type){try{await api.post(`/campaigns/${id}/${type}`);await cacheClearPrefix(`campaigns:${tenantKey}:`);await load(true)}catch(e){showAlert(e.response?.data?.message||"Action failed.")}}
  return <div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-black">Retention Campaigns</h1>
    <p className="mt-1 text-sm text-slate-500">Target CRM segments, loyalty tiers and customer tags with scheduled push campaigns.</p>
    <form onSubmit={create} className="card mt-6 p-4 sm:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        {["name","title"].map(k=><label key={k} className="text-sm font-bold">{k==="name"?"Campaign name":"Notification title"}<input required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>)}
      </div>
      <label className="mt-4 block text-sm font-bold">Message<textarea required rows="4" maxLength="2000" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="text-sm font-bold">Campaign type<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3">{["promotion","offer","new_arrival","win_back","birthday","anniversary","loyalty","referral"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-sm font-bold">Audience<select value={form.segment} onChange={e=>setForm({...form,segment:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3">{SEGMENTS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-sm font-bold">Loyalty tier<select value={form.loyaltyTier} onChange={e=>setForm({...form,loyaltyTier:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"><option value="">Any tier</option>{["BRONZE","SILVER","GOLD","PLATINUM"].map(x=><option key={x}>{x}</option>)}</select></label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="text-sm font-bold">Customer tag<input value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="vip"/></label>
        <label className="text-sm font-bold">Destination<input value={form.url} onChange={e=>setForm({...form,url:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
        <label className="text-sm font-bold">Schedule<input type="datetime-local" value={form.scheduledFor} min={new Date(Date.now()+60000).toISOString().slice(0,16)} onChange={e=>setForm({...form,scheduledFor:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
      </div>
      <button disabled={busy} className="btn-primary mt-5">{busy?"Saving...":form.scheduledFor?"Schedule Campaign":"Create & Send"}</button>
    </form>
    <div className="card mt-6 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Campaign","Type","Audience","Status","Recipients","Success","Failed","Actions"].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y">{items.map(x=><tr key={x._id}><td className="px-4 py-3 font-bold">{x.name}</td><td className="px-4 py-3">{x.kind}</td><td className="px-4 py-3">{x.audience?.segment||"all"}</td><td className="px-4 py-3">{x.status}</td><td className="px-4 py-3">{x.recipientCount||0}</td><td className="px-4 py-3">{x.successCount||0}</td><td className="px-4 py-3">{x.failureCount||0}</td><td className="px-4 py-3 flex gap-2">{["draft","scheduled","failed"].includes(x.status)&&<><button className="btn-primary text-xs" onClick={()=>action(x._id,"send")}>Send</button><button className="rounded-xl border px-3 py-2 text-xs font-bold" onClick={()=>action(x._id,"cancel")}>Cancel</button></>}</td></tr>)}</tbody></table></div>
    <Pagination page={pagination.page||page} pages={pagination.pages||1} total={pagination.total||0} onChange={setPage}/>
  </div>
}
