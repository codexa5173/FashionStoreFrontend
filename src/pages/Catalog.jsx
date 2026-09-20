import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import api from "../lib/api";
import { cachedGet } from "../lib/cache";
import ProductGrid from "../components/ProductGrid";
import Loading from "../components/Loading";
import Pagination from "../components/Pagination";
import SEO from "../components/SEO";
import { useStore } from "../context/StoreContext";

const PAGE_SIZE = 12;

export default function Catalog({ mode }) {
  const { tenantSlug, store } = useStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const filter = mode === "offers" ? "&offer=true" : mode === "popular" ? "&demanded=true" : "";

  async function loadCategories(force = false) {
    try {
      const r = await cachedGet(api, "/categories?active=true&page=1&limit=100", {
        key: `categories:public:${tenantSlug || "default"}`,
        forceRefresh: force
      });
      setCategories(r.data?.items || r.data || []);
    } catch {}
  }

  const queryString = useMemo(() => {
    const p = new URLSearchParams({
      available: "true", page: String(page), limit: String(PAGE_SIZE), sort
    });
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    if (size.trim()) p.set("size", size.trim());
    if (color.trim()) p.set("color", color.trim());
    if (minPrice !== "") p.set("minPrice", minPrice);
    if (maxPrice !== "") p.set("maxPrice", maxPrice);
    if (mode === "offers") p.set("offer", "true");
    if (mode === "popular") p.set("demanded", "true");
    return p.toString();
  }, [q, category, size, color, minPrice, maxPrice, sort, page, mode]);

  async function loadProducts(force = false) {
    setLoading(true);
    const query = `/products?${queryString}`;
    const key = `products:catalog:${tenantSlug || "default"}:${queryString}`;
    try {
      const r = await api.get(query);
      setProducts(r.data?.items || []);
      setPagination(r.data?.pagination || { page, pages: 1, total: 0 });
    } catch {
      setProducts([]);
      setPagination({ page, pages: 1, total: 0 });
    } finally { setLoading(false); }
  }

  useEffect(() => { loadCategories(false); }, [tenantSlug]);
  useEffect(() => {
    const t = setTimeout(() => loadProducts(false), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [queryString, tenantSlug]);

  useEffect(() => { setPage(1); }, [q, category, size, color, minPrice, maxPrice, sort, mode]);

  const clearFilters = () => {
    setCategory(""); setSize(""); setColor(""); setMinPrice(""); setMaxPrice(""); setSort("-createdAt"); setQ("");
  };

  const hasFilters = q || category || size || color || minPrice || maxPrice || sort !== "-createdAt";

  return <div className="container-app py-7 sm:py-10">
    <SEO title={`${mode === "offers" ? "Today's Offers" : mode === "popular" ? "Most Demanded" : "Search Products"} | ${store?.settings?.shopName || "Ladies Fashion"}`} description="Browse ladies fashion products, offers and popular picks."/>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-black sm:text-4xl">{mode === "offers" ? "Today's Offers" : mode === "popular" ? "Most Demanded" : "Browse Collection"}</h1><p className="mt-2 text-sm text-slate-500 sm:text-base">Search and filter the full catalog.</p></div>
      <button className="btn-soft" onClick={() => setShowFilters(v => !v)}><SlidersHorizontal size={17}/> Filters</button>
    </div>

    <div className="card mt-6 p-3 sm:p-4">
      <div className="relative"><Search className="absolute left-3 top-3.5 text-slate-400" size={18}/><input value={q} onChange={e => setQ(e.target.value)} className="w-full rounded-2xl bg-slate-100 py-3 pl-10 pr-4" placeholder="Search dresses, kurtis, sarees, SKU..."/></div>
      <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${!category ? "bg-slate-950 text-white" : "bg-slate-100"}`} onClick={() => { setCategory(""); setPage(1); }}>All</button>
        {categories.map(c => <button key={c._id} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${category === c._id ? "bg-slate-950 text-white" : "bg-slate-100"}`} onClick={() => { setCategory(c._id); setPage(1); }}>{c.name}</button>)}
      </div>

      {showFilters && <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5">
        <input className="input" placeholder="Size (e.g. M)" value={size} onChange={e => setSize(e.target.value)} />
        <input className="input" placeholder="Color (e.g. Red)" value={color} onChange={e => setColor(e.target.value)} />
        <input className="input" type="number" min="0" placeholder="Min price" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
        <input className="input" type="number" min="0" placeholder="Max price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
        <select className="input" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="-createdAt">Newest</option><option value="name">Name A–Z</option><option value="-name">Name Z–A</option>
          <option value="sellingPrice">Price low → high</option><option value="-sellingPrice">Price high → low</option>
        </select>
        {hasFilters && <button className="btn-soft justify-center sm:col-span-2 lg:col-span-5" onClick={clearFilters}><X size={16}/> Clear filters</button>}
      </div>}
    </div>

    <div className="mt-6">{loading ? <Loading/> : products.length ? <ProductGrid products={products}/> : <div className="card p-12 text-center text-slate-500">No products match these filters.</div>}</div>
    {!loading && <Pagination page={pagination.page || page} pages={pagination.pages} total={pagination.total} onChange={setPage}/>}
  </div>;
}
