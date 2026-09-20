import { useEffect, useState } from "react";
import { Edit3, ImagePlus, Trash2, X } from "lucide-react";
import api from "../../lib/api";
import { cachedGet, cacheClearPrefix, cacheRemove } from "../../lib/cache";
import ConfirmModal from "../../components/ConfirmModal";
import Pagination from "../../components/Pagination";
import RefreshButton from "../../components/RefreshButton";

const empty = { name: "", description: "", isActive: true, sortOrder: 0, image: null };
const PAGE_SIZE = 20;

export default function Categories() {
  const [categories, setCategories] = useState([]), [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [form, setForm] = useState(empty), [file, setFile] = useState(null), [preview, setPreview] = useState("");
  const [editing, setEditing] = useState(null), [saving, setSaving] = useState(false), [deleteTarget, setDeleteTarget] = useState(null), [refreshing, setRefreshing] = useState(false);
  const [info, setInfo] = useState(null);

  const cacheKey = `categories:admin:${page}`;

  async function load(force = false) {
    try {
      const r = await cachedGet(api, `/categories?active=false&page=${page}&limit=${PAGE_SIZE}`, { key: cacheKey, forceRefresh: force });
      setCategories(r.data?.items || r.data || []);
      setPagination(r.data?.pagination || { page, pages: 1, total: r.data?.length || 0 });
    } catch (e) { setInfo({ title: "Could not load categories", message: e.response?.data?.message || "Please try again." }); }
  }
  useEffect(() => { load(false); }, [page]);

  function reset() {
    if (file && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setForm(empty); setFile(null); setPreview(""); setEditing(null);
  }
  function chooseFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(f); setPreview(URL.createObjectURL(f)); e.target.value = "";
  }
  function startEdit(c) {
    setEditing(c._id); setForm({ name:c.name||"", description:c.description||"", isActive:c.isActive!==false, sortOrder:c.sortOrder||0, image:c.image||null });
    setFile(null); setPreview(c.image?.secureUrl||""); window.scrollTo({top:0,behavior:"smooth"});
  }
  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) { setInfo({ title: "Category name required", message: "Enter a category name before saving." }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim()); fd.append("description", form.description||""); fd.append("isActive", String(form.isActive)); fd.append("sortOrder", String(form.sortOrder||0));
      if (file) fd.append("image", file); if (editing && !form.image && !file) fd.append("removeImage","true");
      await (editing ? api.put(`/categories/${editing}`,fd) : api.post("/categories",fd));
      await cacheClearPrefix("categories:"); await cacheClearPrefix("products:"); await cacheClearPrefix("product:");
      reset(); await load(true);
    } catch(e) { setInfo({ title: "Could not save category", message: e.response?.data?.message || "Please try again." }); } finally { setSaving(false); }
  }
  function removePreview() {
    if (file && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(null); setPreview(""); setForm(f=>({...f,image:null}));
  }
  async function confirmDelete() {
    setSaving(true);
    try { await api.delete(`/categories/${deleteTarget._id}`); setDeleteTarget(null); await cacheClearPrefix("categories:"); await cacheClearPrefix("products:"); await cacheClearPrefix("product:"); await load(true); }
    catch(e) { setInfo({ title: "Could not delete category", message: e.response?.data?.message || "Please try again." }); }
    finally { setSaving(false); }
  }
  async function refresh() {
    setRefreshing(true);
    try {
      await cacheRemove(cacheKey);
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black">Categories</h1><p className="mt-1 text-sm text-slate-500">Create, edit, activate, reorder, and manage category images.</p></div><RefreshButton onClick={refresh} busy={refreshing}/></div>
    <form onSubmit={save} className="card mt-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">{editing ? "Edit Category" : "Add Category"}</h2>{editing && <button type="button" className="btn-soft p-2" onClick={reset} title="Cancel edit"><X size={18}/></button>}</div>
      <div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Category Name<input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" required/></label><label className="text-sm font-bold">Sort Order<input type="number" value={form.sortOrder} onChange={e=>setForm(f=>({...f,sortOrder:e.target.value}))} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label></div>
      <label className="mt-4 block text-sm font-bold">Description<textarea rows="3" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
      <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e=>setForm(f=>({...f,isActive:e.target.checked}))} className="h-5 w-5"/> Show this category publicly</label>
      <div className="mt-4 rounded-3xl border border-dashed p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Category Image</h3><p className="mt-1 text-xs text-slate-500">Upload a new image to replace the old one.</p></div><label className="btn-soft cursor-pointer"><ImagePlus size={17}/> {preview?"Change image":"Choose image"}<input hidden type="file" accept="image/*" onChange={chooseFile}/></label></div>{preview&&<div className="relative mt-4 w-40 overflow-hidden rounded-2xl bg-slate-100"><img loading="lazy" src={preview} alt="Category preview" className="aspect-square w-full object-cover"/><button type="button" onClick={removePreview} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-red-600 text-white"><X size={16}/></button></div>}</div>
      <button disabled={saving} className="btn-primary mt-5 w-full sm:w-auto">{saving?"Saving...":editing?"Save Category":"Add Category"}</button>
    </form>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories.map(c=><div className="card overflow-hidden" key={c._id}><div className="aspect-[16/9] bg-slate-100">{c.image?.secureUrl?<img loading="lazy" src={c.image.secureUrl} alt="" className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-5xl">🧩</div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{c.name}</div><div className="mt-1 text-sm text-slate-400">{c.productCount} products · {c.isActive?"Public":"Hidden"}</div></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">#{c.sortOrder||0}</span></div><div className="mt-4 flex gap-2"><button className="btn-soft flex-1" onClick={()=>startEdit(c)}><Edit3 size={16}/> Edit</button><button className="btn-soft p-2 text-red-600" onClick={()=>setDeleteTarget(c)}><Trash2 size={17}/></button></div></div></div>)}</div>
    <Pagination page={pagination.page||page} pages={pagination.pages} total={pagination.total} onChange={setPage}/>
    <ConfirmModal open={Boolean(deleteTarget)} title="Delete category?" message={deleteTarget?`Delete “${deleteTarget.name}”? Categories containing products cannot be deleted until those products are moved or removed.`:""} onConfirm={confirmDelete} onClose={()=>!saving&&setDeleteTarget(null)} busy={saving}/>
    <ConfirmModal open={Boolean(info)} title={info?.title || "Information"} message={info?.message || ""} confirmText="Okay" onConfirm={()=>setInfo(null)} onClose={()=>setInfo(null)} showCancel={false} danger={false}/>
  </div>;
}
