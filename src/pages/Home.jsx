import { useEffect, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { cachedGet } from "../lib/cache";
import ProductGrid from "../components/ProductGrid";
import Section from "../components/Section";
import Loading from "../components/Loading";
import SEO from "../components/SEO";
import { storePath, useStore } from "../context/StoreContext";
import RefreshButton from "../components/RefreshButton";

const KEYS = (tenant) => ({ settings: `settings:public:${tenant || "domain"}`, categories: `categories:public:${tenant || "domain"}`, collections: `collections:public:home:${tenant || "domain"}`, offers: `products:home:offers:${tenant || "domain"}`, popular: `products:home:popular:${tenant || "domain"}` });

export default function Home() {
  const { tenantSlug, store, loading: storeLoading, isTenantDomain, refreshStore } = useStore();
  const [settings, setSettings] = useState(store?.settings || null);
  const [cats, setCats] = useState([]);
  const [collections, setCollections] = useState([]);
  const [offers, setOffers] = useState([]);
  const [popular, setPopular] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [freshLoading, setFreshLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const keys = KEYS(tenantSlug || window.location.hostname);

  async function load(forceRefresh = false) {
    try {
      const [s, c, col, o, p, r, n] = await Promise.all([
        cachedGet(api, "/settings", { key: keys.settings, forceRefresh, revalidate: true }),
        cachedGet(api, "/categories?active=true&page=1&limit=50", { key: keys.categories, forceRefresh, revalidate: true }),
        cachedGet(api, "/collections?active=true&page=1&limit=50", { key: keys.collections, forceRefresh, revalidate: true }),
        api.get("/products?offer=true&available=true&limit=8&page=1"),
        api.get("/products?demanded=true&available=true&limit=8&page=1"),
        api.get("/products?featured=true&available=true&limit=8&page=1"),
        api.get("/products?newArrival=true&available=true&limit=8&page=1")
      ]);
      setSettings(s.data);
      const configuredCollections = (s.data?.homepage?.featuredCollections || []).map(String);
      const configuredProducts = (s.data?.homepage?.featuredProducts || []).map(String);
      const collectionItems = col.data?.items || col.data || [];
      const featuredItems = r?.data?.items || r?.data || [];
      setCats(c.data?.items || c.data || []);
      setCollections(configuredCollections.length ? collectionItems.filter(x => configuredCollections.includes(String(x._id))).slice(0, 8) : collectionItems.slice(0, 8));
      setOffers(o.data?.items || []);
      setPopular(p.data?.items || []);
      setFeaturedProducts(configuredProducts.length ? featuredItems.filter(x => configuredProducts.includes(String(x._id))) : featuredItems);
      setNewArrivals(n?.data?.items || n?.data || []);
    } catch (e) {
      console.error("Failed to load home page", e);
      if (!settings) setSettings(store?.settings || { shopName: store?.tenant?.name || "Ladies Fashion Store", description: "", heroContent: {}, address: "" });
    }
  }

  useEffect(() => { if (!storeLoading && store) load(false); }, [tenantSlug, storeLoading, store]);
  useEffect(() => { if (store?.settings) setSettings(store.settings); }, [store]);

  if (!settings) return <Loading />;
  const hero = settings.homepage?.hero || settings.heroContent || {};
  const path = (p) => storePath(tenantSlug, p, isTenantDomain);

  return <div>
    <SEO title={`${settings.shopName || "Ladies Fashion Store"} | Ladies Fashion`} description={settings.description || `Explore ${settings.shopName || "our store"} for beautiful ladies fashion, new arrivals and offers.`} image={hero.image?.secureUrl} structuredData={{
      "@type": "WebSite",
      name: settings.shopName || store?.tenant?.name || "Ladies Fashion Store",
      url: window.location.origin + window.location.pathname
    }} />
    <section className="overflow-hidden bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="container-app grid min-h-[430px] items-center gap-8 py-10 sm:py-12 md:grid-cols-2">
        <div>
          <span className="badge bg-white ring-1 ring-black/5">✨ New season styles</span>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl md:text-6xl">{hero.title || "Discover your style"}</h1>
          <p className="mt-4 max-w-xl text-base text-slate-700 sm:text-lg">{hero.description || settings.description || "Beautiful dresses, ethnic wear and everyday fashion."}</p>
          <div className="mt-6 flex flex-wrap gap-2.5"><RefreshButton onClick={async()=>{setRefreshing(true);try{await refreshStore();await load(true);}finally{setRefreshing(false);}}} busy={refreshing}/><Link className="btn-primary" to={path(hero.buttonLink || "/categories")}>{hero.buttonText || "Explore Collection"} <ArrowRight size={18}/></Link><Link className="btn-soft" to={path("/offers")}>Today's Offers</Link></div>
        </div>
        <div className="mx-auto w-full max-w-md">{hero.image?.secureUrl ? <img loading="lazy" src={hero.image.secureUrl} alt={settings.shopName || "Fashion collection"} className="aspect-square w-full rounded-[2.5rem] object-cover shadow-xl"/> : <div className="grid aspect-square place-items-center rounded-[2.5rem] bg-white p-8 shadow-xl">{(settings.branding?.logo?.secureUrl || store?.tenant?.logo?.secureUrl) ? <img src={settings.branding?.logo?.secureUrl || store?.tenant?.logo?.secureUrl} alt={settings.shopName || "Shop"} className="h-full w-full rounded-[2rem] object-contain"/> : <span className="text-7xl">👗</span>}</div>}</div>
      </div>
    </section>

    <section className="py-8 sm:py-10"><div className="container-app">
      <div className="mb-5 flex items-end justify-between gap-3"><div><h2 className="text-2xl font-black md:text-3xl">Shop by Category</h2><p className="mt-1 text-sm text-slate-500">Find your next favourite style</p></div><Link className="text-sm font-bold underline" to={path("/categories")}>See all</Link></div>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0"><div className="flex w-max gap-3">{cats.slice(0, 12).map(c => <Link key={c._id} to={path(`/categories/${c.slug}`)} className="card w-36 shrink-0 overflow-hidden p-3 sm:w-40"><div className="grid aspect-square place-items-center overflow-hidden rounded-2xl bg-slate-100 text-4xl">{c.image?.secureUrl ? <img loading="lazy" src={c.image.secureUrl} className="h-full w-full object-cover" alt=""/> : <div className="h-full w-full p-6"><img src={settings.branding?.logo?.secureUrl || store?.tenant?.logo?.secureUrl || "/icon-192.png"} alt={settings.shopName || "Shop"} className="h-full w-full object-contain"/></div>}</div><div className="mt-2 line-clamp-1 font-bold">{c.name}</div><div className="text-xs text-slate-400">{c.productCount || 0} products</div></Link>)}</div></div>
    </div></section>

    {settings.homepage?.showFeaturedCollections !== false && collections.length > 0 && <section className="py-8 sm:py-10"><div className="container-app">
      <div className="mb-5 flex items-end justify-between gap-3"><div><h2 className="text-2xl font-black md:text-3xl">Curated Collections</h2><p className="mt-1 text-sm text-slate-500">Explore edits for weddings, festivals, seasons and more.</p></div><Link className="text-sm font-bold underline" to={path("/collections")}>See all</Link></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {collections.slice(0, 8).map(c => <Link key={c._id} to={path(`/collections/${c.slug}`)} className="card group overflow-hidden"><div className="aspect-[4/3] overflow-hidden bg-slate-100">{c.image?.secureUrl ? <img loading="lazy" src={c.image.secureUrl} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="grid h-full place-items-center bg-gradient-to-br from-rose-50 to-amber-50 text-4xl">🧵</div>}</div><div className="p-3"><div className="line-clamp-1 font-bold">{c.name}</div><div className="mt-1 text-xs text-slate-400">{c.productCount || 0} styles</div></div></Link>)}
      </div>
    </div></section>}

    {settings.homepage?.banners?.filter(b => b.active !== false && b.image?.secureUrl).length > 0 && <section className="py-8 sm:py-10"><div className="container-app grid gap-4 sm:grid-cols-2">
      {settings.homepage.banners.filter(b => b.active !== false && b.image?.secureUrl).slice(0, 4).map(b => <Link key={b._id} to={path(b.link || "/offers")} className="card group overflow-hidden"><img loading="lazy" src={b.image.secureUrl} alt={b.title || settings.shopName || "Shop"} className="aspect-[16/7] w-full object-cover transition duration-500 group-hover:scale-[1.02]"/>{(b.title || b.description) && <div className="p-4"><div className="font-black">{b.title}</div><div className="mt-1 text-sm text-slate-500">{b.description}</div></div>}</Link>)}
    </div></section>}

    {settings.homepage?.showFeaturedProducts !== false && featuredProducts.length > 0 && <Section title="Featured Products" subtitle="Handpicked styles from this store"><ProductGrid products={featuredProducts}/></Section>}
    {settings.homepage?.showNewArrivals !== false && newArrivals.length > 0 && <Section title="New Arrivals" subtitle="Fresh styles just added"><ProductGrid products={newArrivals}/></Section>}
    {settings.homepage?.showOffers !== false && <Section title="Today's Offers" subtitle="Fresh fashion deals worth checking out" to={path("/offers")}><ProductGrid products={offers}/></Section>}
    <Section title="Most Demanded" subtitle="Popular picks from this store" to={path("/most-demanded")}><ProductGrid products={popular}/></Section>

    <section className="pb-10"><div className="container-app"><div className="card flex flex-col gap-5 bg-slate-950 p-6 text-white sm:p-8 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-black sm:text-3xl">Visit {settings.shopName || "our store"}</h2><p className="mt-2 max-w-2xl text-sm text-white/70">{settings.contact?.address || settings.address || "Store address coming soon."}</p></div><Link className="btn-yellow shrink-0" to={path("/shop")}><MapPin size={18}/> Store Details</Link></div></div></section>
    {store?.tenant?.developerBranding?.enabled !== false && <section className="pb-10"><div className="container-app"><div className="rounded-3xl border bg-white p-4 text-center text-xs text-slate-500 shadow-sm">{store?.tenant?.developerBranding?.text || "Powered by our fashion commerce platform."} {store?.tenant?.developerBranding?.name && <b className="text-slate-700">{store.tenant.developerBranding.name}</b>}</div></div></section>}
  </div>;
}
