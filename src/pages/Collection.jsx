import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";
import ProductGrid from "../components/ProductGrid";
import Pagination from "../components/Pagination";
import Loading from "../components/Loading";
import SEO from "../components/SEO";
import { storePath, useStore } from "../context/StoreContext";

const PAGE_SIZE = 12;

export default function Collection() {
  const { slug } = useParams();
  const { tenantSlug, store } = useStore();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [slug, tenantSlug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/collections/${encodeURIComponent(slug)}?page=${page}&limit=${PAGE_SIZE}`)
      .then(r => { if (!cancelled) setData(r.data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, page, tenantSlug]);

  if (loading && !data) return <Loading/>;
  if (!data?.collection) {
    return <div className="container-app py-20 text-center"><SEO title="Collection not found"/><h1 className="text-3xl font-black">Collection not found</h1><Link className="btn-primary mt-6 inline-flex" to={storePath(tenantSlug, "/collections")}>Browse Collections</Link></div>;
  }

  const { collection, products, pagination } = data;
  const shop = store?.settings?.shopName || "Ladies Fashion";

  const collectionSchema = {
    "@type": "CollectionPage",
    name: collection.name,
    description: collection.description || `Explore ${collection.name} at ${shop}.`,
    url: window.location.href.split("#")[0],
    ...(collection.image?.secureUrl ? { image: collection.image.secureUrl } : {}),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: `${window.location.origin}${window.location.pathname.split('/collections/')[0]}/products/${item.slug}`
      }))
    }
  };

  return (
    <div className="container-app py-7 sm:py-10">
      <SEO title={`${collection.name} | ${shop}`} description={collection.description || `Explore ${collection.name} at ${shop}.`} image={collection.image?.secureUrl} structuredData={collectionSchema}/>
      <Link to={storePath(tenantSlug, "/collections")} className="text-sm font-bold text-slate-500 hover:underline">← All Collections</Link>
      <div className="mt-5 overflow-hidden rounded-[2rem] bg-slate-950 text-white">
        <div className="grid md:grid-cols-[1.2fr_1fr]">
          <div className="p-7 sm:p-10">
            <span className="badge bg-white/10 text-white ring-1 ring-white/10">Curated collection</span>
            <h1 className="mt-4 text-4xl font-black sm:text-5xl">{collection.name}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">{collection.description || "Explore this curated fashion collection."}</p>
          </div>
          <div className="min-h-56 bg-white/5">
            {collection.image?.secureUrl && <img loading="lazy" src={collection.image.secureUrl} alt="" className="h-full w-full object-cover"/>}
          </div>
        </div>
      </div>
      <div className="mt-8">{loading ? <Loading/> : products.length ? <ProductGrid products={products}/> : <div className="card p-10 text-center text-slate-500">No available products in this collection yet.</div>}</div>
      {!loading && <Pagination page={pagination.page || page} pages={pagination.pages} total={pagination.total} onChange={setPage}/>}
    </div>
  );
}
