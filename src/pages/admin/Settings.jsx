import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Trash2, Palette, Home, Phone, Clock3, FileText, Sparkles } from "lucide-react";
import api from "../../lib/api";
import { cachedGet, cacheRemove, cacheSet } from "../../lib/cache";
import RefreshButton from "../../components/RefreshButton";

const defaults = {
  comingSoon: { enabled: false, title: "Coming Soon", message: "We are getting ready. Subscribe to notifications and we will let you know when we launch." },
  shopName: "Ladies Fashion Store", description: "", address: "", phone: "", whatsapp: "", googleMapsUrl: "", openingHours: "",
  socialLinks: {}, logo: {},
  branding: { logo: {}, favicon: {}, primaryColor: "#111827", secondaryColor: "#f59e0b", accentColor: "#e11d48", font: "Inter", theme: "light" },
  homepage: {
    hero: { title: "Discover your style", description: "", image: {}, buttonText: "Explore Collection", buttonLink: "/categories" },
    banners: [], featuredCollections: [], featuredProducts: [], showNewArrivals: true, showOffers: true, showFeaturedProducts: true, showFeaturedCollections: true
  },
  contact: { phone: "", whatsapp: "", email: "", address: "", googleMapsUrl: "", socialLinks: {} },
  business: { openingHours: "", timezone: "Asia/Kolkata" },
  policies: { terms: "", privacy: "", returnPolicy: "", shippingInformation: "" }
};

function mergeSettings(value = {}) {
  return {
    ...defaults, ...value,
    comingSoon: { ...defaults.comingSoon, ...(value.comingSoon || {}) },
    branding: { ...defaults.branding, ...(value.branding || {}) },
    homepage: { ...defaults.homepage, ...(value.homepage || {}), hero: { ...defaults.homepage.hero, ...(value.homepage?.hero || {}) } },
    contact: { ...defaults.contact, ...(value.contact || {}) },
    business: { ...defaults.business, ...(value.business || {}) },
    policies: { ...defaults.policies, ...(value.policies || {}) }
  };
}

function ImagePicker({ label, preview, onChoose, onRemove, hint }) {
  return <div className="mt-4">
    <div className="mb-2 flex items-center justify-between gap-3">
      <label className="text-sm font-bold">{label}</label>
      {preview && <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={14}/> Remove</button>}
    </div>
    <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
      {preview ? <img loading="lazy" src={preview} alt="" className="aspect-[16/7] w-full object-cover"/> :
        <div className="grid aspect-[16/7] place-items-center text-center text-sm text-slate-500"><ImagePlus size={30}/><p className="mt-1 font-semibold">No image selected</p></div>}
    </div>
    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
      <ImagePlus size={17}/> {preview ? "Change" : "Upload"}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/x-icon" className="hidden" onChange={e => onChoose(e.target.files?.[0])}/>
    </label>
    {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
  </div>;
}

export default function Settings() {
  const [s, setS] = useState(null);
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [files, setFiles] = useState({ logo: null, favicon: null, hero: null, banners: [] });
  const [removals, setRemovals] = useState({ logo: false, favicon: false, hero: false });
  const [previews, setPreviews] = useState({ logo: "", favicon: "", hero: "" });

  async function load(force = false) {
    try {
      const [settings, col, prod] = await Promise.all([
        cachedGet(api, "/settings", { key: "settings:admin", forceRefresh: force, revalidate: true }),
        api.get("/collections?active=true&page=1&limit=100"),
        api.get("/products?available=true&page=1&limit=100")
      ]);
      const next = mergeSettings(settings.data);
      setS(next);
      setPreviews({
        logo: next.branding?.logo?.secureUrl || next.logo?.secureUrl || "",
        favicon: next.branding?.favicon?.secureUrl || "",
        hero: next.homepage?.hero?.image?.secureUrl || next.heroContent?.image?.secureUrl || ""
      });
      setFiles({ logo: null, favicon: null, hero: null, banners: [] });
      setRemovals({ logo: false, favicon: false, hero: false });
      setCollections(col.data?.items || col.data || []);
      setProducts(prod.data?.items || prod.data || []);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load storefront settings.");
    }
  }

  useEffect(() => { load(false); }, []);

  useEffect(() => () => {
    Object.values(previews).forEach(v => { if (v?.startsWith("blob:")) URL.revokeObjectURL(v); });
  }, [previews]);

  function setTop(k, v) { setS(x => ({ ...x, [k]: v })); }
  function setNested(group, k, v) { setS(x => ({ ...x, [group]: { ...(x[group] || {}), [k]: v } })); }
  function setHero(k, v) { setS(x => ({ ...x, homepage: { ...(x.homepage || {}), hero: { ...(x.homepage?.hero || {}), [k]: v } } })); }

  function pick(kind, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose a JPG, PNG, WebP or icon image.");
    if (file.size > 25 * 1024 * 1024) return setError("Each image must be smaller than 25 MB.");
    setError("");
    if (previews[kind]?.startsWith("blob:")) URL.revokeObjectURL(previews[kind]);
    setFiles(x => ({ ...x, [kind]: file }));
    setRemovals(x => ({ ...x, [kind]: false }));
    setPreviews(x => ({ ...x, [kind]: URL.createObjectURL(file) }));
  }

  function toggleId(group, id) {
    setS(x => {
      const arr = Array.isArray(x.homepage?.[group]) ? x.homepage[group].map(String) : [];
      const next = arr.includes(String(id)) ? arr.filter(v => v !== String(id)) : [...arr, String(id)];
      return { ...x, homepage: { ...x.homepage, [group]: next } };
    });
  }

  function addBanners(list) {
    const incoming = Array.from(list || []).filter(f => f.type.startsWith("image/")).slice(0, 10);
    setFiles(x => ({ ...x, banners: [...x.banners, ...incoming].slice(0, 10) }));
  }

  function removeSavedBanner(id) {
    setS(x => ({ ...x, homepage: { ...x.homepage, banners: (x.homepage?.banners || []).filter(b => String(b._id) !== String(id)) } }));
  }

  function removePendingBanner(index) {
    setFiles(x => ({ ...x, banners: x.banners.filter((_, i) => i !== index) }));
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const form = new FormData();
      for (const k of ["shopName", "description"]) form.append(k, s[k] ?? "");
      form.append("comingSoon", JSON.stringify(s.comingSoon || defaults.comingSoon));
      form.append("branding", JSON.stringify({ ...s.branding, logo: undefined, favicon: undefined }));
      form.append("homepage", JSON.stringify(s.homepage));
      form.append("contact", JSON.stringify(s.contact));
      form.append("business", JSON.stringify(s.business));
      form.append("policies", JSON.stringify(s.policies));
      form.append("socialLinks", JSON.stringify(s.contact?.socialLinks || {}));
      form.append("phone", s.contact?.phone || "");
      form.append("whatsapp", s.contact?.whatsapp || "");
      form.append("address", s.contact?.address || "");
      form.append("googleMapsUrl", s.contact?.googleMapsUrl || "");
      form.append("openingHours", s.business?.openingHours || "");
      if (files.logo) form.append("logoImage", files.logo);
      if (files.favicon) form.append("faviconImage", files.favicon);
      if (files.hero) form.append("heroImage", files.hero);
      if (removals.logo && !files.logo) form.append("removeLogo", "true");
      if (removals.favicon && !files.favicon) form.append("removeFavicon", "true");
      if (removals.hero && !files.hero) form.append("removeHeroImage", "true");
      files.banners.forEach(f => form.append("bannerImages", f));

      const r = await api.put("/settings", form);
      const next = mergeSettings(r.data);
      setS(next);
      setFiles({ logo: null, favicon: null, hero: null, banners: [] });
      setRemovals({ logo: false, favicon: false, hero: false });
      setPreviews({ logo: next.branding?.logo?.secureUrl || "", favicon: next.branding?.favicon?.secureUrl || "", hero: next.homepage?.hero?.image?.secureUrl || "" });
      await cacheRemove("settings:admin"); await cacheRemove("settings:public"); await cacheSet("settings:admin", r.data); await cacheSet("settings:public", r.data);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to save storefront settings.");
    } finally { setSaving(false); }
  }

  async function refresh() {
    setRefreshing(true);
    try { await cacheRemove("settings:admin"); await cacheRemove("settings:public"); await load(true); } finally { setRefreshing(false); }
  }

  if (!s) return <div className="p-4">{error || "Loading storefront settings..."}</div>;

  const selectedCollections = new Set((s.homepage.featuredCollections || []).map(String));
  const selectedProducts = new Set((s.homepage.featuredProducts || []).map(String));

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-black">Storefront Customization</h1><p className="mt-1 text-sm text-slate-500">Control branding, homepage merchandising, contact details, business hours and customer-facing policies for this tenant.</p></div>
      <RefreshButton onClick={refresh} busy={refreshing}/>
    </div>
    {error && <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

    <form onSubmit={save} className="mt-6 space-y-6">
      <section className="card border-2 border-amber-200 bg-amber-50/50 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><div className="flex items-center gap-2"><Sparkles size={20}/><h2 className="text-xl font-black">Coming Soon</h2></div><p className="mt-1 text-sm text-slate-600">Keep the public storefront on a simple launch page while people can subscribe to browser notifications. Customers will not be able to browse products until this is disabled.</p></div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold shadow-sm"><input type="checkbox" checked={Boolean(s.comingSoon?.enabled)} onChange={e=>setS(x=>({...x,comingSoon:{...(x.comingSoon||{}),enabled:e.target.checked}}))} className="h-5 w-5"/> Enabled</label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Title<input value={s.comingSoon?.title||""} onChange={e=>setS(x=>({...x,comingSoon:{...(x.comingSoon||{}),title:e.target.value}}))} className="mt-2 w-full rounded-2xl bg-white p-3"/></label>
          <label className="text-sm font-bold sm:col-span-2">Message<textarea value={s.comingSoon?.message||""} onChange={e=>setS(x=>({...x,comingSoon:{...(x.comingSoon||{}),message:e.target.value}}))} rows="3" className="mt-2 w-full rounded-2xl bg-white p-3"/></label>
        </div>
      </section>
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2"><Palette size={20}/><h2 className="text-xl font-black">Branding</h2></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Store Name<input value={s.shopName || ""} onChange={e => setTop("shopName", e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
          <label className="text-sm font-bold">Font<select value={s.branding.font} onChange={e => setNested("branding","font",e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3">{["Inter","Poppins","Montserrat","Playfair Display","Lato","Roboto"].map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="text-sm font-bold">Primary Color<div className="mt-2 flex gap-2"><input type="color" value={s.branding.primaryColor} onChange={e => setNested("branding","primaryColor",e.target.value)} className="h-11 w-14 rounded-xl"/><input value={s.branding.primaryColor} onChange={e => setNested("branding","primaryColor",e.target.value)} className="w-full rounded-2xl bg-slate-100 p-3"/></div></label>
          <label className="text-sm font-bold">Secondary Color<div className="mt-2 flex gap-2"><input type="color" value={s.branding.secondaryColor} onChange={e => setNested("branding","secondaryColor",e.target.value)} className="h-11 w-14 rounded-xl"/><input value={s.branding.secondaryColor} onChange={e => setNested("branding","secondaryColor",e.target.value)} className="w-full rounded-2xl bg-slate-100 p-3"/></div></label>
          <label className="text-sm font-bold">Accent Color<div className="mt-2 flex gap-2"><input type="color" value={s.branding.accentColor} onChange={e => setNested("branding","accentColor",e.target.value)} className="h-11 w-14 rounded-xl"/><input value={s.branding.accentColor} onChange={e => setNested("branding","accentColor",e.target.value)} className="w-full rounded-2xl bg-slate-100 p-3"/></div></label>
          <label className="text-sm font-bold">Theme<select value={s.branding.theme} onChange={e => setNested("branding","theme",e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"><option value="light">Light</option><option value="dark">Dark</option><option value="auto">Auto</option></select></label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ImagePicker label="Store Logo" preview={previews.logo} onChoose={f => pick("logo", f)} onRemove={() => { setFiles(x=>({...x,logo:null})); setPreviews(x=>({...x,logo:""})); setRemovals(x=>({...x,logo:true})); }} hint="Used in the storefront header and tenant branding."/>
          <ImagePicker label="Favicon" preview={previews.favicon} onChoose={f => pick("favicon", f)} onRemove={() => { setFiles(x=>({...x,favicon:null})); setPreviews(x=>({...x, favicon:""})); setRemovals(x=>({...x,favicon:true})); }} hint="Recommended square PNG/WebP or ICO-compatible image."/>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2"><Home size={20}/><h2 className="text-xl font-black">Homepage</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Hero Title<input value={s.homepage.hero.title || ""} onChange={e=>setHero("title",e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
          <label className="text-sm font-bold">Hero Button Text<input value={s.homepage.hero.buttonText || ""} onChange={e=>setHero("buttonText",e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
          <label className="text-sm font-bold sm:col-span-2">Hero Description<textarea value={s.homepage.hero.description || ""} onChange={e=>setHero("description",e.target.value)} rows="3" className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
          <label className="text-sm font-bold">Hero Button Link<input value={s.homepage.hero.buttonLink || ""} onChange={e=>setHero("buttonLink",e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
        </div>
        <ImagePicker label="Hero Image" preview={previews.hero} onChoose={f=>pick("hero",f)} onRemove={()=>{setFiles(x=>({...x,hero:null}));setPreviews(x=>({...x,hero:""}));setRemovals(x=>({...x,hero:true}));}}/>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {[
            ["showFeaturedCollections","Featured Collections"],["showFeaturedProducts","Featured Products"],["showNewArrivals","New Arrivals"],["showOffers","Offers"]
          ].map(([k,l])=><label key={k} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" checked={Boolean(s.homepage[k])} onChange={e=>setS(x=>({...x,homepage:{...x.homepage,[k]:e.target.checked}}))} className="h-4 w-4"/>{l}</label>)}
        </div>
        <div className="mt-6">
          <h3 className="font-black">Featured Collections</h3><p className="mt-1 text-xs text-slate-500">Select the collections shown on the homepage.</p>
          <div className="mt-3 grid max-h-52 gap-2 overflow-auto sm:grid-cols-2">{collections.map(c=><label key={c._id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm"><input type="checkbox" checked={selectedCollections.has(String(c._id))} onChange={()=>toggleId("featuredCollections",c._id)}/><span className="truncate">{c.name}</span></label>)}</div>
        </div>
        <div className="mt-6">
          <h3 className="font-black">Featured Products</h3><p className="mt-1 text-xs text-slate-500">Select products for the homepage merchandising area.</p>
          <div className="mt-3 grid max-h-64 gap-2 overflow-auto sm:grid-cols-2">{products.map(p=><label key={p._id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm"><input type="checkbox" checked={selectedProducts.has(String(p._id))} onChange={()=>toggleId("featuredProducts",p._id)}/><span className="truncate">{p.name} <span className="text-xs text-slate-400">({p.sku})</span></span></label>)}</div>
        </div>
        <div className="mt-6"><h3 className="font-black">Homepage Banners</h3><p className="mt-1 text-xs text-slate-500">Upload promotional banners. Titles and links can be configured in a later merchandising phase.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">{(s.homepage.banners||[]).map(b=><div key={b._id} className="relative overflow-hidden rounded-2xl bg-slate-100"><img loading="lazy" src={b.image?.secureUrl} alt="" className="aspect-[16/7] w-full object-cover"/><button type="button" onClick={()=>removeSavedBanner(b._id)} className="absolute right-2 top-2 rounded-xl bg-white/90 p-2 text-red-600"><Trash2 size={15}/></button></div>)}</div>
          {files.banners.length>0 && <div className="mt-3 grid gap-3 sm:grid-cols-3">{files.banners.map((f,i)=><div key={`${f.name}-${i}`} className="relative overflow-hidden rounded-2xl bg-slate-100"><img loading="lazy" src={URL.createObjectURL(f)} alt="" className="aspect-[16/7] w-full object-cover"/><button type="button" onClick={()=>removePendingBanner(i)} className="absolute right-2 top-2 rounded-xl bg-white/90 p-2 text-red-600"><Trash2 size={15}/></button></div>)}</div>}
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold"><ImagePlus size={17}/> Add Banners<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>addBanners(e.target.files)}/></label>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2"><Phone size={20}/><h2 className="text-xl font-black">Contact & Social Media</h2></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[["phone","Phone"],["whatsapp","WhatsApp"],["email","Email"],["address","Address"],["googleMapsUrl","Google Maps URL"]].map(([k,l])=><label key={k} className="text-sm font-bold">{l}<input value={s.contact[k]||""} onChange={e=>setNested("contact",k,e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>)}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">{["instagram","facebook","youtube","tiktok","x"].map(k=><label key={k} className="text-sm font-bold capitalize">{k} URL<input value={s.contact.socialLinks?.[k]||""} onChange={e=>setNested("contact","socialLinks",{...(s.contact.socialLinks||{}),[k]:e.target.value})} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>)}</div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2"><Clock3 size={20}/><h2 className="text-xl font-black">Business</h2></div>
        <label className="mt-4 block text-sm font-bold">Opening Hours<textarea value={s.business.openingHours||""} onChange={e=>setNested("business","openingHours",e.target.value)} rows="4" placeholder={"Mon-Fri: 10:00 AM - 8:00 PM\nSat-Sun: 11:00 AM - 9:00 PM"} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
        <label className="mt-4 block text-sm font-bold">Timezone<select value={s.business.timezone||"Asia/Kolkata"} onChange={e=>setNested("business","timezone",e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"><option>Asia/Kolkata</option><option>UTC</option><option>Asia/Dubai</option><option>Asia/Riyadh</option></select></label>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2"><FileText size={20}/><h2 className="text-xl font-black">Policies</h2></div>
        {[["terms","Terms & Conditions"],["privacy","Privacy Policy"],["returnPolicy","Return Policy"],["shippingInformation","Shipping Information"]].map(([k,l])=><label key={k} className="mt-4 block text-sm font-bold">{l}<textarea value={s.policies[k]||""} onChange={e=>setNested("policies",k,e.target.value)} rows="5" className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>)}
      </section>

      <button disabled={saving} className="btn-primary w-full sm:w-auto">{saving ? "Saving storefront..." : "Save Storefront Configuration"}</button>
    </form>
  </div>;
}
