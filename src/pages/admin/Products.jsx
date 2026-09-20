import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2, Edit3, SlidersHorizontal, X } from "lucide-react";
import api from "../../lib/api";
import { showAlert } from "../../lib/feedback";
import { cachedGet, cacheClearPrefix, cacheRemove } from "../../lib/cache";
import { money } from "../../lib/utils";
import ConfirmModal from "../../components/ConfirmModal";
import Pagination from "../../components/Pagination";
import RefreshButton from "../../components/RefreshButton";

const PAGE_SIZE = 20;

export default function Products() {
  const [products, setProducts] = useState([]), [q, setQ] = useState(""), [page, setPage] = useState(1);
  const [category, setCategory] = useState(""), [collection, setCollection] = useState(""), [brand, setBrand] = useState("");
  const [size, setSize] = useState(""), [color, setColor] = useState(""), [barcode, setBarcode] = useState("");
  const [available, setAvailable] = useState(""), [offer, setOffer] = useState(""), [newArrival, setNewArrival] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [deleteTarget, setDeleteTarget] = useState(null), [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    if (collection) p.set("collection", collection);
    if (brand.trim()) p.set("brand", brand.trim());
    if (size.trim()) p.set("size", size.trim());
    if (color.trim()) p.set("color", color.trim());
    if (barcode.trim()) p.set("barcode", barcode.trim());
    if (available) p.set("available", available);
    if (offer) p.set("offer", offer);
    if (newArrival) p.set("newArrival", newArrival);
    return p.toString();
  }, [q, category, collection, brand, size, color, barcode, available, offer, newArrival, page]);

  const cacheKey = `products:admin:${query}`;

  async function load(force = false) {
    setLoading(true);
    try {
      const r = await cachedGet(api, `/products/admin/list?${query}`, { key: cacheKey, forceRefresh: force });
      setProducts(r.data.items || []);
      setPagination(r.data.pagination || { page, pages: 1, total: 0 });
    } catch (e) {
      setProducts([]);
      showAlert(e.response?.data?.message || "Could not load products.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const t = setTimeout(() => load(false), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => { setPage(1); }, [q, category, collection, brand, size, color, barcode, available, offer, newArrival]);

  async function del() {
    setDeleting(true);
    try {
      await api.delete(`/products/${deleteTarget._id}`);
      setDeleteTarget(null);
      await cacheClearPrefix("products:"); await cacheClearPrefix("product:");
      await load(true);
    } catch (e) { showAlert(e.response?.data?.message || "Could not delete product."); }
    finally { setDeleting(false); }
  }

  async function refresh() {
    setRefreshing(true);
    try { await cacheRemove(cacheKey); await load(true); }
    finally { setRefreshing(false); }
  }

  const clear = () => { setCategory(""); setCollection(""); setBrand(""); setSize(""); setColor(""); setBarcode(""); setAvailable(""); setOffer(""); setNewArrival(""); };

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black">Products</h1><p className="mt-1 text-sm text-slate-500">Manage fashion products, variants, stock and merchandising.</p></div><div className="flex gap-2"><RefreshButton onClick={refresh} busy={refreshing}/><Link to="/admin/products/new" className="btn-primary"><Plus size={18}/> Add Product</Link></div></div>
    <div className="card mt-6 p-4">
      <div className="flex gap-2"><div className="relative max-w-xl flex-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, SKU or brand..." className="w-full rounded-2xl bg-slate-100 py-3 pl-10 pr-4"/></div><button className="btn-soft" onClick={()=>setShowFilters(v=>!v)}><SlidersHorizontal size={17}/> Filters</button></div>
      {showFilters && <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input" placeholder="Category ID" value={category} onChange={e=>setCategory(e.target.value)}/>
        <input className="input" placeholder="Collection ID" value={collection} onChange={e=>setCollection(e.target.value)}/>
        <input className="input" placeholder="Brand" value={brand} onChange={e=>setBrand(e.target.value)}/>
        <input className="input" placeholder="Size" value={size} onChange={e=>setSize(e.target.value)}/>
        <input className="input" placeholder="Color" value={color} onChange={e=>setColor(e.target.value)}/>
        <input className="input" placeholder="Barcode" value={barcode} onChange={e=>setBarcode(e.target.value)}/>
        <select className="input" value={available} onChange={e=>setAvailable(e.target.value)}><option value="">Availability</option><option value="true">Available</option><option value="false">Unavailable</option></select>
        <select className="input" value={offer} onChange={e=>setOffer(e.target.value)}><option value="">Offer</option><option value="true">Today's offer</option></select>
        <select className="input" value={newArrival} onChange={e=>setNewArrival(e.target.value)}><option value="">New arrival</option><option value="true">New arrivals</option></select>
        <button className="btn-soft justify-center" onClick={clear}><X size={16}/> Clear filters</button>
      </div>}
    </div>

    {loading ? <div className="py-12 text-center text-slate-400">Loading products...</div> : <>
      <div className="mt-6 grid gap-3 md:hidden">{products.map(x => <div className="card p-4" key={x._id}><div className="flex gap-3"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">{x.images?.[0]?.secureUrl ? <img loading="lazy" src={x.images[0].secureUrl} alt="" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-3xl">👗</div>}</div><div className="min-w-0 flex-1"><div className="font-black">{x.name}</div><div className="mt-1 text-xs text-slate-400">{x.sku} · {x.category?.name} · Qty {x.stockQuantity ?? 0}</div><div className="mt-2 font-black">{money(x.sellingPrice)} {x.discountedPrice != null && <span className="text-sm text-slate-400">→ {money(x.discountedPrice)}</span>}</div><div className={`mt-1 text-xs font-bold ${x.isAvailable ? "text-emerald-600" : "text-red-600"}`}>{x.isAvailable ? "Available" : "Out of Stock"}</div></div></div><div className="mt-4 flex gap-2"><Link className="btn-soft flex-1" to={`/admin/products/${x._id}`}><Edit3 size={16}/> Edit</Link><button className="btn-soft p-2 text-red-600" onClick={() => setDeleteTarget(x)}><Trash2 size={17}/></button></div></div>)}</div>
      <div className="card mt-6 hidden overflow-x-auto md:block"><table className="w-full min-w-[1150px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Product","SKU","Category","Qty","Purchase","Selling","Discount","Normal Profit","Discount Profit","Availability","Actions"].map(x=><th className="px-4 py-3 font-bold" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y">{products.map(x=><tr key={x._id}><td className="px-4 py-3 font-bold">{x.name}</td><td className="px-4 py-3">{x.sku}</td><td className="px-4 py-3">{x.category?.name}</td><td className="px-4 py-3 font-bold">{x.stockQuantity ?? 0}</td><td className="px-4 py-3">{money(x.purchasePrice)}</td><td className="px-4 py-3">{money(x.sellingPrice)}</td><td className="px-4 py-3">{x.discountedPrice == null ? "—" : money(x.discountedPrice)}</td><td className="px-4 py-3">{money(x.normalProfit)}</td><td className="px-4 py-3">{x.discountedProfit == null ? "—" : money(x.discountedProfit)}</td><td className="px-4 py-3">{x.isAvailable ? "Available" : "Out of Stock"}</td><td className="px-4 py-3"><div className="flex gap-2"><Link className="btn-soft p-2" to={`/admin/products/${x._id}`}><Edit3 size={16}/></Link><button className="btn-soft p-2 text-red-600" onClick={() => setDeleteTarget(x)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>
      <Pagination page={pagination.page || page} pages={pagination.pages} total={pagination.total} onChange={setPage}/>
    </>}
    <ConfirmModal open={Boolean(deleteTarget)} title="Delete product?" message={deleteTarget ? `Delete “${deleteTarget.name}”? Its product media will also be removed from Cloudinary.` : ""} onConfirm={del} onClose={() => !deleting && setDeleteTarget(null)} busy={deleting}/>
  </div>;
}
