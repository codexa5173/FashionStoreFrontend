import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { cachedGet } from "../lib/cache";
import Loading from "../components/Loading";
import SEO from "../components/SEO";
import { storePath, useStore } from "../context/StoreContext";
import RefreshButton from "../components/RefreshButton";

export default function Collections() {
  const { tenantSlug, store } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cachedGet(api, "/collections?active=true&page=1&limit=100", { key: `collections:public:all:${tenantSlug || window.location.hostname}`, revalidate: true })
      .then(r => setItems(r.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  const shop = store?.settings?.shopName || "Ladies Fashion";
  return (
    <div className="container-app py-7 sm:py-10">
      <SEO title={`Collections | ${shop}`} description={`Explore fashion collections from ${shop}.`} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-black sm:text-4xl">Collections</h1>
        <p className="mt-2 text-slate-500">Explore curated fashion edits for every occasion.</p></div><RefreshButton busy={refreshing} onClick={async()=>{setRefreshing(true);try{const r=await cachedGet(api, "/collections?active=true&page=1&limit=100", { key: `collections:public:all:${tenantSlug || window.location.hostname}`, forceRefresh:true });setItems(r.data?.items||[]);}finally{setRefreshing(false);}}}/></div>
      {loading ? <div className="py-12"><Loading/></div> : items.length ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(c => (
            <Link key={c._id} to={storePath(tenantSlug, `/collections/${c.slug}`)} className="card group overflow-hidden">
              <div className="aspect-[16/10] bg-slate-100">
                {c.image?.secureUrl ? <img loading="lazy" src={c.image.secureUrl} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="grid h-full place-items-center bg-gradient-to-br from-rose-50 to-amber-50 text-6xl">🧵</div>}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black">{c.name}</h2>
                  <span className="text-xs font-bold text-slate-400">{c.productCount || 0} styles</span>
                </div>
                {c.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{c.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card mt-8 p-10 text-center text-slate-500">No collections are available yet.</div>
      )}
    </div>
  );
}
