import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import ProductGrid from "../components/ProductGrid";
import Pagination from "../components/Pagination";
import Loading from "../components/Loading";
import SEO from "../components/SEO";
import { useStore, storePath } from "../context/StoreContext";

const PAGE_SIZE = 12;

export default function Category() {
  const { slug } = useParams();
  const { tenantSlug, store } = useStore();
  const [c, setC] = useState(null), [p, setP] = useState([]);
  const [page, setPage] = useState(1), [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  async function load(force = false) {
    setLoading(true);
    try {
      const cr = await api.get("/categories?active=true&page=1&limit=100");
      const cats = cr.data?.items || cr.data || [];
      const x = cats.find(v => v.slug === slug);
      setC(x || null);
      if (!x) return;
      const z = await api.get(`/products?category=${x._id}&available=true&page=${page}&limit=${PAGE_SIZE}`);
      setP(z.data?.items || []);
      setPagination(z.data?.pagination || { page, pages: 1, total: 0 });
    } catch { setC(null); setP([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { setPage(1); }, [slug, tenantSlug]);
  useEffect(() => { load(false); }, [slug, page, tenantSlug]);

  if (loading && !c) return <Loading/>;
  if (!c) return <div className="container-app py-20 text-center"><SEO title="Category | Ladies Fashion" description="Browse ladies fashion products."/>Category not found.</div>;

  const categorySchema = {
    "@type": "CollectionPage",
    name: c.name,
    description: c.description || `Browse ${c.name} ladies fashion.`,
    url: window.location.href.split("#")[0],
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: p.length,
      itemListElement: p.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: `${window.location.origin}${window.location.pathname.split('/categories/')[0]}/products/${item.slug}`
      }))
    }
  };

  return <div className="container-app py-7 sm:py-10"><SEO title={`${c.name} | ${store?.settings?.shopName || "Ladies Fashion"}`} description={c.description || `Browse ${c.name} ladies fashion.`} structuredData={categorySchema}/>
    <div><h1 className="text-3xl font-black sm:text-4xl">{c.name}</h1><p className="mt-2 text-slate-500">{c.description}</p></div>
    <div className="mt-8">{loading ? <Loading/> : <ProductGrid products={p}/>}</div>
    {!loading && <Pagination page={pagination.page || page} pages={pagination.pages} total={pagination.total} onChange={setPage}/>}
  </div>;
}
