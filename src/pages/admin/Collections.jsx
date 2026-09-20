import { useEffect, useMemo, useState } from "react";
import { Edit3, ImagePlus, Trash2, X, Search, GripVertical } from "lucide-react";
import api from "../../lib/api";
import { cachedGet, cacheClearPrefix, cacheRemove } from "../../lib/cache";
import ConfirmModal from "../../components/ConfirmModal";
import RefreshButton from "../../components/RefreshButton";

const empty = { name: "", description: "", isActive: true, sortOrder: 0, image: null, productIds: [] };

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [info, setInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(force = false) {
    try {
      const [cr, pr] = await Promise.all([
        cachedGet(api, "/collections?active=false&page=1&limit=100", { key: "collections:admin:all", forceRefresh: force }),
        cachedGet(api, "/products/admin/list?page=1&limit=100", { key: "products:admin:collections", forceRefresh: force })
      ]);
      setCollections(cr.data?.items || []);
      setProducts(pr.data?.items || []);
    } catch (e) {
      setInfo({ title: "Could not load collections", message: e.response?.data?.message || "Please try again." });
    }
  }

  useEffect(() => { load(false); }, []);

  function reset() {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setForm(empty); setEditing(null); setFile(null); setPreview(""); setProductSearch("");
  }

  function chooseFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(f); setPreview(URL.createObjectURL(f)); e.target.value = "";
  }

  function startEdit(c) {
    setEditing(c._id);
    setForm({
      name: c.name || "",
      description: c.description || "",
      isActive: c.isActive !== false,
      sortOrder: c.sortOrder || 0,
      image: c.image || null,
      productIds: (c.products || []).map(p => p._id)
    });
    setFile(null);
    setPreview(c.image?.secureUrl || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleProduct(id) {
    setForm(f => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter(x => x !== id)
        : [...f.productIds, id]
    }));
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setInfo({ title: "Collection name required", message: "Enter a collection name." });
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description || "");
      fd.append("isActive", String(form.isActive));
      fd.append("sortOrder", String(form.sortOrder || 0));
      fd.append("productIds", JSON.stringify(form.productIds || []));
      if (file) fd.append("image", file);
      if (editing && !form.image && !file) fd.append("removeImage", "true");

      await (editing ? api.put(`/collections/${editing}`, fd) : api.post("/collections", fd));
      await cacheClearPrefix("collections:");
      await cacheClearPrefix("products:");
      await cacheClearPrefix("product:");
      reset();
      await load(true);
    } catch (e) {
      setInfo({ title: "Could not save collection", message: e.response?.data?.message || "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setSaving(true);
    try {
      await api.delete(`/collections/${deleteTarget._id}`);
      setDeleteTarget(null);
      await cacheClearPrefix("collections:");
      await cacheClearPrefix("products:");
      await cacheClearPrefix("product:");
      await load(true);
    } catch (e) {
      setInfo({ title: "Could not delete collection", message: e.response?.data?.message || "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await cacheRemove("collections:admin:all");
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(q));
  }, [products, productSearch]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Collections</h1>
          <p className="mt-1 text-sm text-slate-500">Create merchandising collections and assign products to them.</p>
        </div>
        <RefreshButton onClick={refresh} busy={refreshing} />
      </div>

      <form onSubmit={save} className="card mt-6 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">{editing ? "Edit Collection" : "Add Collection"}</h2>
          {editing && <button type="button" className="btn-soft p-2" onClick={reset}><X size={18}/></button>}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">
            Collection Name
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="e.g. Eid Collection" required />
          </label>
          <label className="text-sm font-bold">
            Sort Order
            <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" />
          </label>
        </div>

        <label className="mt-4 block text-sm font-bold">
          Description
          <textarea rows="3" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" />
        </label>

        <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold">
          <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="h-5 w-5" />
          Show collection publicly
        </label>

        <div className="mt-4 rounded-3xl border border-dashed p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black">Collection Image</h3>
              <p className="mt-1 text-xs text-slate-500">Used on the storefront collection cards.</p>
            </div>
            <label className="btn-soft cursor-pointer">
              <ImagePlus size={17}/> {preview ? "Change image" : "Choose image"}
              <input hidden type="file" accept="image/*" onChange={chooseFile}/>
            </label>
          </div>
          {preview && (
            <div className="relative mt-4 w-48 overflow-hidden rounded-2xl bg-slate-100">
              <img loading="lazy" src={preview} alt="Collection preview" className="aspect-[4/3] w-full object-cover"/>
              <button type="button" onClick={() => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); setFile(null); setPreview(""); setForm(f => ({ ...f, image: null })); }} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-red-600 text-white"><X size={16}/></button>
            </div>
          )}
        </div>

        <section className="mt-5 rounded-3xl bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Assign Products</h2>
              <p className="mt-1 text-xs text-slate-500">{form.productIds.length} product(s) selected. A product can belong to multiple collections.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-3 text-slate-400" size={17}/>
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search product or SKU" className="w-full rounded-2xl bg-white py-2.5 pl-9 pr-3 ring-1 ring-black/5"/>
            </div>
          </div>

          <div className="mt-4 grid max-h-96 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map(p => (
              <label key={p._id} className={`flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-3 ring-1 ${form.productIds.includes(p._id) ? "ring-amber-300" : "ring-black/5"}`}>
                <input type="checkbox" checked={form.productIds.includes(p._id)} onChange={() => toggleProduct(p._id)} className="h-5 w-5"/>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.sku} · {p.category?.name || "No category"}</div>
                </div>
                {form.productIds.includes(p._id) && <GripVertical size={16} className="text-amber-500"/>}
              </label>
            ))}
            {!filteredProducts.length && <div className="col-span-full rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">No products found.</div>}
          </div>
        </section>

        <button disabled={saving} className="btn-primary mt-5 w-full sm:w-auto">{saving ? "Saving..." : editing ? "Save Collection" : "Create Collection"}</button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map(c => (
          <div className="card overflow-hidden" key={c._id}>
            <div className="aspect-[16/9] bg-slate-100">
              {c.image?.secureUrl ? <img loading="lazy" src={c.image.secureUrl} alt="" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-5xl">🧵</div>}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black">{c.name}</div>
                  <div className="mt-1 text-sm text-slate-400">{c.productCount || 0} products · {c.isActive ? "Public" : "Hidden"}</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">#{c.sortOrder || 0}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{c.description || "No description."}</p>
              <div className="mt-4 flex gap-2">
                <button className="btn-soft flex-1" onClick={() => startEdit(c)}><Edit3 size={16}/> Edit</button>
                <button className="btn-soft p-2 text-red-600" onClick={() => setDeleteTarget(c)}><Trash2 size={17}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!collections.length && <div className="card mt-6 p-10 text-center text-slate-500">No collections yet. Start with New Arrivals, Festive, Wedding, or your own collection.</div>}

      <ConfirmModal open={Boolean(deleteTarget)} title="Delete collection?" message={deleteTarget ? `Delete “${deleteTarget.name}”? Products will remain in your catalog and will simply be removed from this collection.` : ""} onConfirm={confirmDelete} onClose={() => !saving && setDeleteTarget(null)} busy={saving}/>
      <ConfirmModal open={Boolean(info)} title={info?.title || "Information"} message={info?.message || ""} confirmText="Okay" onConfirm={() => setInfo(null)} onClose={() => setInfo(null)} showCancel={false} danger={false}/>
    </div>
  );
}
