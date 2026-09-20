import { ExternalLink, MessageCircle, Phone } from "lucide-react";
import Loading from "../components/Loading";
import SEO from "../components/SEO";
import ShopLogoPlaceholder from "../components/ShopLogoPlaceholder";
import { useStore } from "../context/StoreContext";

export default function Shop() {
  const { store, loading, error } = useStore();
  if (loading && !store) return <Loading />;
  if (error && !store) return <div className="container-app py-20 text-center">{error}</div>;
  const s = store?.settings || {};
  const name = s.shopName || store?.tenant?.name || "Ladies Fashion Store";
  const contact = s.contact || {};
  const business = s.business || {};
  const policies = s.policies || {};
  return <div className="container-app py-7 sm:py-10">
    <SEO title={`${name} | Shop Details`} description={s.description || `Contact and visit ${name}.`} image={s.logo?.secureUrl || store?.tenant?.logo?.secureUrl}/>
    <div><h1 className="text-3xl font-black sm:text-4xl">Shop Details</h1></div>
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <div className="card p-5 sm:p-7"><h2 className="text-2xl font-black">{name}</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">{s.description || ""}</p><dl className="mt-6 grid gap-4 text-sm"><div><dt className="font-bold">Address</dt><dd className="text-slate-500">{contact.address || s.address || "—"}</dd></div><div><dt className="font-bold">Opening hours</dt><dd className="text-slate-500">{business.openingHours || s.openingHours || "—"}</dd></div><div><dt className="font-bold">Phone</dt><dd className="text-slate-500">{contact.phone || s.phone || "—"}</dd></div></dl><div className="mt-6 flex flex-wrap gap-2">{(contact.googleMapsUrl || s.googleMapsUrl) && <a className="btn-primary" href={contact.googleMapsUrl || s.googleMapsUrl} target="_blank" rel="noreferrer"><ExternalLink size={17}/> Directions</a>}{(contact.whatsapp || s.whatsapp) && <a className="btn-soft" href={`https://wa.me/${(contact.whatsapp || s.whatsapp).replace(/\D/g,"")}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/> WhatsApp</a>}{(contact.phone || s.phone) && <a className="btn-soft" href={`tel:${contact.phone || s.phone}`}><Phone size={17}/> Call</a>}</div></div>
      <div className="card flex min-h-64 items-center justify-center p-7 text-center"><div><ShopLogoPlaceholder className="mx-auto h-24 w-24"/><h2 className="mt-4 text-2xl font-black">Visit {name}</h2><p className="mt-2 text-slate-500">Browse the collection online, then visit the shop for your purchase.</p></div></div>
    </div>
    {(policies.returnPolicy || policies.shippingInformation) && <div className="mt-5 grid gap-5 md:grid-cols-2">
      {policies.returnPolicy && <div className="card p-5"><h2 className="text-xl font-black">Return Policy</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{policies.returnPolicy}</p></div>}
      {policies.shippingInformation && <div className="card p-5"><h2 className="text-xl font-black">Shipping Information</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{policies.shippingInformation}</p></div>}
    </div>}
  </div>;
}
