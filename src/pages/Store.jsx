import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import ShopLogoPlaceholder from "../components/ShopLogoPlaceholder";
import Loading from "../components/Loading";
import { storePath, useStore } from "../context/StoreContext";

export default function Store() {
  const { tenantSlug, store, loading, error } = useStore();
  if (loading) return <Loading />;
  if (error || !store) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-3xl font-black">Store not found</h1><p className="mt-2 text-slate-500">{error || "This store is unavailable."}</p></div>;
  const s = store.settings || {};
  const name = s.shopName || store.tenant.name;
  const logo = s.logo?.secureUrl || store.tenant.logo?.secureUrl;
  return <main className="mx-auto max-w-5xl px-4 py-12">
    <SEO title={`${name} | Store Details`} description={s.description || `Visit ${name} for ladies fashion.`} image={logo} />
    <section className="card overflow-hidden p-8 md:p-12">
      {logo ? <img loading="lazy" src={logo} alt={name} className="h-20 w-20 rounded-2xl object-cover" /> : <ShopLogoPlaceholder className="h-20 w-20"/>}
      <h1 className="mt-5 text-4xl font-black">{name}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">{s.description || "Discover beautiful ladies fashion, new arrivals and everyday styles."}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link to={storePath(tenantSlug, "/categories")} className="btn-primary">Open Collection</Link>
        <Link to={storePath(tenantSlug, "/offers")} className="btn-soft">View Offers</Link>
      </div>
      <div className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
        {s.address && <div><strong>Address</strong><p className="mt-1 text-slate-500">{s.address}</p></div>}
        {s.phone && <div><strong>Phone</strong><p className="mt-1 text-slate-500">{s.phone}</p></div>}
        {s.openingHours && <div><strong>Opening Hours</strong><p className="mt-1 text-slate-500">{s.openingHours}</p></div>}
        {s.whatsapp && <div><strong>WhatsApp</strong><p className="mt-1 text-slate-500">{s.whatsapp}</p></div>}
      </div>
    </section>
  </main>;
}
