import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import api from "../../lib/api";
import { cachedGet, cacheClearPrefix } from "../../lib/cache";
import ConfirmModal from "../../components/ConfirmModal";

const DEFAULT_MEASUREMENTS = ["Bust", "Waist", "Hip", "Length", "Shoulder", "Sleeve"];

function emptyChart() {
  return { name:"", description:"", sizes:[], measurements:DEFAULT_MEASUREMENTS.map(label => ({label,unit:"in",values:{}})), isActive:true, sortOrder:0 };
}

export default function Sizes() {
  const [sizes,setSizes]=useState([]);
  const [charts,setCharts]=useState([]);
  const [tab,setTab]=useState("sizes");
  const [sizeForm,setSizeForm]=useState({name:"",key:"",sortOrder:0,isActive:true});
  const [chart,setChart]=useState(emptyChart());
  const [editingSize,setEditingSize]=useState(null);
  const [editingChart,setEditingChart]=useState(null);
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function load(){
    try {
      const [sr,cr]=await Promise.all([
        cachedGet(api,"/sizes?active=false",{key:"sizes:admin"}),
        cachedGet(api,"/size-charts?active=false",{key:"size-charts:admin"})
      ]);
      setSizes(sr.data?.items||[]);
      setCharts(cr.data?.items||[]);
    } catch(e) { setMessage(e.response?.data?.message||"Could not load size settings."); }
  }
  useEffect(()=>{load();},[]);

  const activeSizes=useMemo(()=>sizes.filter(s=>s.isActive),[sizes]);

  function resetSize(){setEditingSize(null);setSizeForm({name:"",key:"",sortOrder:0,isActive:true});}
  function editSize(s){setEditingSize(s._id);setSizeForm({name:s.name||"",key:s.key||"",sortOrder:s.sortOrder||0,isActive:s.isActive!==false});}
  async function saveSize(e){
    e.preventDefault(); setBusy(true); setMessage("");
    try{
      await (editingSize ? api.put(`/sizes/${editingSize}`,sizeForm) : api.post("/sizes",sizeForm));
      resetSize(); await load(); await cacheClearPrefix("sizes:"); await cacheClearPrefix("products:");
    }catch(e){setMessage(e.response?.data?.message||"Could not save size.");}
    finally{setBusy(false);}
  }

  function resetChart(){setEditingChart(null);setChart(emptyChart());}
  function editChart(c){
    setEditingChart(c._id);
    setChart({
      name:c.name||"",description:c.description||"",sizes:c.sizes||[],
      measurements:(c.measurements||[]).map(m=>({label:m.label||"",unit:m.unit||"in",values:m.values||{}})),
      isActive:c.isActive!==false,sortOrder:c.sortOrder||0
    });
    setTab("charts");
  }
  function toggleChartSize(key){
    setChart(c=>({...c,sizes:c.sizes.includes(key)?c.sizes.filter(x=>x!==key):[...c.sizes,key]}));
  }
  function updateMeasurement(i,key,value){
    setChart(c=>({...c,measurements:c.measurements.map((m,idx)=>idx===i?{...m,[key]:value}:m)}));
  }
  function updateMeasurementValue(i,size,value){
    setChart(c=>({...c,measurements:c.measurements.map((m,idx)=>idx===i?{...m,values:{...m.values,[size]:value}}:m)}));
  }
  function addMeasurement(){setChart(c=>({...c,measurements:[...c.measurements,{label:"",unit:"in",values:{}}]}));}
  function removeMeasurement(i){setChart(c=>({...c,measurements:c.measurements.filter((_,idx)=>idx!==i)}));}
  async function saveChart(e){
    e.preventDefault();
    if(!chart.sizes.length){setMessage("Select at least one configured size.");return;}
    if(!chart.name.trim()){setMessage("Enter a size chart name.");return;}
    setBusy(true);setMessage("");
    try{
      const payload={...chart,name:chart.name.trim(),sizes:chart.sizes.map(x=>x.toUpperCase())};
      await (editingChart?api.put(`/size-charts/${editingChart}`,payload):api.post("/size-charts",payload));
      resetChart();await load();await cacheClearPrefix("sizes:");await cacheClearPrefix("product:");
    }catch(e){setMessage(e.response?.data?.message||"Could not save size chart.");}
    finally{setBusy(false);}
  }

  async function removeTarget(){
    if(!deleteTarget)return;
    setBusy(true);
    try{
      await api.delete(`/${deleteTarget.type==="size"?"sizes":"size-charts"}/${deleteTarget.item._id}`);
      setDeleteTarget(null); await load(); await cacheClearPrefix("sizes:"); await cacheClearPrefix("product:");
    }catch(e){setMessage(e.response?.data?.message||"Could not delete.");}
    finally{setBusy(false);}
  }

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-black">Fashion Sizes</h1><p className="mt-1 text-sm text-slate-500">Configure tenant-specific clothing sizes and reusable measurement charts.</p></div>
      <div className="flex rounded-2xl bg-slate-100 p-1">
        <button className={`rounded-xl px-4 py-2 text-sm font-bold ${tab==="sizes"?"bg-white shadow":""}`} onClick={()=>setTab("sizes")}>Sizes</button>
        <button className={`rounded-xl px-4 py-2 text-sm font-bold ${tab==="charts"?"bg-white shadow":""}`} onClick={()=>setTab("charts")}>Size Charts</button>
      </div>
    </div>
    {message && <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{message}</div>}

    {tab==="sizes" ? <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={saveSize} className="card p-5">
        <h2 className="text-xl font-black">{editingSize?"Edit Size":"Add Size"}</h2>
        <label className="mt-4 block text-sm font-bold">Display Name<input value={sizeForm.name} onChange={e=>setSizeForm({...sizeForm,name:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="Medium" required/></label>
        <label className="mt-4 block text-sm font-bold">Key<input value={sizeForm.key} onChange={e=>setSizeForm({...sizeForm,key:e.target.value.toUpperCase()})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="M" required/></label>
        <label className="mt-4 block text-sm font-bold">Sort Order<input type="number" value={sizeForm.sortOrder} onChange={e=>setSizeForm({...sizeForm,sortOrder:Number(e.target.value)||0})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" min="0"/></label>
        <label className="mt-4 flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={sizeForm.isActive} onChange={e=>setSizeForm({...sizeForm,isActive:e.target.checked})} className="h-5 w-5"/> Active</label>
        <div className="mt-5 flex gap-2"><button disabled={busy} className="btn-primary">{editingSize?"Update":"Add"} Size</button>{editingSize&&<button type="button" className="btn-soft" onClick={resetSize}>Cancel</button>}</div>
      </form>
      <div className="card overflow-hidden">
        <div className="border-b p-5"><h2 className="font-black">Configured Sizes</h2><p className="text-xs text-slate-500">{activeSizes.length} active size{activeSizes.length===1?"":"s"}</p></div>
        <div className="divide-y">
          {sizes.map(s=><div key={s._id} className="flex items-center gap-3 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 font-black">{s.key}</div>
            <div className="min-w-0 flex-1"><div className="font-bold">{s.name}</div><div className="text-xs text-slate-400">Order {s.sortOrder} · {s.isActive?"Active":"Inactive"}</div></div>
            <button className="btn-soft p-2" onClick={()=>editSize(s)}><Pencil size={16}/></button>
            <button className="btn-soft p-2 text-red-600" onClick={()=>setDeleteTarget({type:"size",item:s})}><Trash2 size={16}/></button>
          </div>)}
          {!sizes.length&&<div className="p-8 text-center text-sm text-slate-500">No sizes configured.</div>}
        </div>
      </div>
    </div> : <form onSubmit={saveChart} className="mt-6 card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{editingChart?"Edit Size Chart":"Create Size Chart"}</h2><p className="text-sm text-slate-500">A chart can be reused by many products.</p></div>{editingChart&&<button type="button" className="btn-soft" onClick={resetChart}>New Chart</button>}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold">Chart Name<input value={chart.name} onChange={e=>setChart({...chart,name:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="Women's Kurti Standard" required/></label>
        <label className="text-sm font-bold">Sort Order<input type="number" value={chart.sortOrder} onChange={e=>setChart({...chart,sortOrder:Number(e.target.value)||0})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
      </div>
      <label className="mt-4 block text-sm font-bold">Description<textarea value={chart.description} onChange={e=>setChart({...chart,description:e.target.value})} rows="2" className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="How customers should use this chart."/></label>
      <div className="mt-5"><h3 className="font-black">Sizes in this chart</h3><div className="mt-3 flex flex-wrap gap-2">{activeSizes.map(s=><button type="button" key={s._id} onClick={()=>toggleChartSize(s.key)} className={`rounded-xl border px-3 py-2 text-sm font-bold ${chart.sizes.includes(s.key)?"border-slate-950 bg-slate-950 text-white":"bg-white"}`}>{chart.sizes.includes(s.key)&&<Check className="mr-1 inline" size={14}/>} {s.key}</button>)}</div></div>
      <div className="mt-6 overflow-x-auto"><div className="mb-3 flex items-center justify-between"><h3 className="font-black">Measurements</h3><button type="button" className="btn-soft" onClick={addMeasurement}><Plus size={16}/> Add Measurement</button></div>
        <table className="min-w-[760px] w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Measurement</th><th className="p-2">Unit</th>{chart.sizes.map(s=><th className="p-2" key={s}>{s}</th>)}<th/></tr></thead>
        <tbody>{chart.measurements.map((m,i)=><tr key={i} className="border-b"><td className="p-2"><input value={m.label} onChange={e=>updateMeasurement(i,"label",e.target.value)} className="w-40 rounded-xl bg-slate-100 p-2" placeholder="Bust"/></td><td className="p-2"><input value={m.unit} onChange={e=>updateMeasurement(i,"unit",e.target.value)} className="w-16 rounded-xl bg-slate-100 p-2"/></td>{chart.sizes.map(sz=><td className="p-2" key={sz}><input value={m.values?.[sz]||""} onChange={e=>updateMeasurementValue(i,sz,e.target.value)} className="w-20 rounded-xl bg-slate-100 p-2" placeholder="-"/></td>)}<td className="p-2"><button type="button" onClick={()=>removeMeasurement(i)} className="btn-soft p-2 text-red-600"><Trash2 size={15}/></button></td></tr>)}</tbody></table>
      </div>
      <label className="mt-5 flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={chart.isActive} onChange={e=>setChart({...chart,isActive:e.target.checked})} className="h-5 w-5"/> Active</label>
      <div className="mt-5 flex gap-2"><button disabled={busy} className="btn-primary">{editingChart?"Update":"Create"} Size Chart</button>{editingChart&&<button type="button" className="btn-soft" onClick={resetChart}>Cancel</button>}</div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">{charts.map(c=><div key={c._id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{c.name}</h3><p className="text-xs text-slate-500">{(c.sizes||[]).join(" · ")} · {c.isActive?"Active":"Inactive"}</p></div><div className="flex gap-1"><button type="button" className="btn-soft p-2" onClick={()=>editChart(c)}><Pencil size={15}/></button><button type="button" className="btn-soft p-2 text-red-600" onClick={()=>setDeleteTarget({type:"chart",item:c})}><Trash2 size={15}/></button></div></div></div>)}</div>
    </form>}
    <ConfirmModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.type==="size"?"size":"size chart"}?`} message="Products using a deleted size chart will keep their other size information, but the chart reference will be removed." confirmLabel="Delete" onCancel={()=>setDeleteTarget(null)} onConfirm={removeTarget}/>
  </div>;
}
