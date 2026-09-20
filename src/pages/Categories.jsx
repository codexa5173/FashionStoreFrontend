import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { cachedGet } from "../lib/cache";
import Pagination from "../components/Pagination";
import SEO from "../components/SEO";
import ShopLogoPlaceholder from "../components/ShopLogoPlaceholder";
import { storePath, useStore } from "../context/StoreContext";

const PAGE_SIZE = 20;

export default function Categories() {
  const { tenantSlug, store } = useStore();
  const [cats, setCats] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load(force = false) {
    setLoading(true);
    const key = `categories:public:${page}`;
    try {
      const r = await cachedGet(api, `/categories?active=true&page=${page}&limit=${PAGE_SIZE}`, { key, forceRefresh: force, revalidate: true });
      setCats(r.data?.items || r.data || []);
      setPagination(r.data?.pagination || { page, pages: 1, total: r.data?.length || 0 });
    } catch { setCats([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(false); }, [page]);

  return <div className="container-app py-7 sm:py-10"><SEO title={`Categories | ${store?.settings?.shopName || "Ladies Fashion"}`} description="Browse ladies fashion products by category."/>
    <div><h1 className="text-3xl font-black sm:text-4xl">Categories</h1><p className="mt-2 text-slate-500">Explore the collection by category.</p></div>
    {loading ? <div className="py-12 text-center text-slate-400">Loading categories...</div> : <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">{cats.map(c => <Link key={c._id} to={storePath(tenantSlug, `/categories/${c.slug}`)} className="card overflow-hidden p-3 hover:-translate-y-0.5 sm:p-4"><div className="grid aspect-square place-items-center rounded-2xl bg-slate-100 text-4xl">{c.image?.secureUrl ? <img loading="lazy" src={c.image.secureUrl} className="h-full w-full object-cover" alt=""/> : <ShopLogoPlaceholder/>}</div><div className="mt-3 font-bold">{c.name}</div><div className="text-xs text-slate-400">{c.productCount} products</div></Link>)}</div>}
    {!loading && <Pagination page={pagination.page || page} pages={pagination.pages} total={pagination.total} onChange={setPage}/>}
  </div>;
}
