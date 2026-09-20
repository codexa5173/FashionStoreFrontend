import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Menu, X, Bell, Search, Download, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import api, { setTenantSlug } from "../lib/api";
import { cachedGet } from "../lib/cache";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { storePath, useStore } from "../context/StoreContext";
import { useCart } from "../context/CartContext";

const links = [["/", "Home"], ["/categories", "Categories"], ["/collections", "Collections"], ["/offers", "Offers"], ["/most-demanded", "Popular"], ["/shop", "Shop Details"], ["/my-orders", "My Orders"]];

export default function Layout() {
  const { tenantSlug: paramSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const storeCtx = useStore();
  const tenantSlug = paramSlug || storeCtx.tenantSlug || "";
  const store = storeCtx.store;
  const isTenantDomain = Boolean(storeCtx.isTenantDomain);
  const [open, setOpen] = useState(false);
  const [fallbackSettings, setFallbackSettings] = useState(null);
  const { supported, subscribed, busy, error, toggle } = usePushNotifications();
  const { canInstall, install } = usePwaInstall();
  const { count } = useCart();
  const promptKey = `noorie:notification-prompt:${tenantSlug || window.location.hostname}`;
  const [promptDismissed, setPromptDismissed] = useState(() => { try { return sessionStorage.getItem(promptKey) === "1"; } catch { return false; } });

  useEffect(() => {
    try { setPromptDismissed(sessionStorage.getItem(promptKey) === "1"); } catch { setPromptDismissed(false); }
  }, [promptKey]);

  useEffect(() => {
    if (!tenantSlug) {
      cachedGet(api, "/settings", { key: "settings:public" }).then(r => setFallbackSettings(r.data)).catch(() => {});
    }
  }, [tenantSlug, isTenantDomain]);


  const settings = store?.settings || fallbackSettings || {};
  const shopName = settings.shopName || store?.tenant?.name || "Ladies Fashion Store";
  const branding = settings.branding || {};
  const logo = branding.logo?.secureUrl || settings.logo?.secureUrl || store?.tenant?.logo?.secureUrl;
  const description = settings.description || "Discover beautiful ladies fashion, dresses, new arrivals and everyday styles.";
  const comingSoon = Boolean(settings.comingSoon?.enabled);

  useEffect(() => {
    const homePath = isTenantDomain ? "/" : (tenantSlug ? `/shop/${tenantSlug}` : "/");
    if (comingSoon && location.pathname !== homePath && location.pathname !== "/") navigate(homePath || "/", { replace: true });
  }, [comingSoon, location.pathname, tenantSlug, isTenantDomain]);

  useEffect(() => {
    const linkId = "tenant-manifest";
    document.querySelectorAll('link[rel="manifest"]').forEach((node) => { if (node.id !== linkId) node.remove(); });
    let link = document.getElementById(linkId);
    if (!tenantSlug && !isTenantDomain) {
      link?.remove();
      return;
    }

    const manifestName = settings.shopName || store?.tenant?.name || "Ladies Fashion Store";
    const icon = settings.branding?.favicon?.secureUrl || settings.branding?.logo?.secureUrl || settings.logo?.secureUrl || store?.tenant?.logo?.secureUrl || "/icon-192.png";
    const basePath = isTenantDomain ? "/" : `/shop/${encodeURIComponent(tenantSlug)}/`;
    const manifest = {
      id: basePath,
      name: manifestName,
      short_name: manifestName.slice(0, 32),
      description: settings.description || `Browse ${manifestName} online.`,
      start_url: basePath,
      scope: basePath,
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#fffdf7",
      theme_color: settings.branding?.primaryColor || "#111827",
      lang: "en-IN",
      dir: "ltr",
      categories: ["shopping", "fashion", "lifestyle"],
      prefer_related_applications: false,
      icons: [
        { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" }
      ]
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const url = URL.createObjectURL(blob);
    link ||= Object.assign(document.createElement("link"), { id: linkId, rel: "manifest" });
    link.href = url;
    document.head.appendChild(link);

    return () => {
      URL.revokeObjectURL(url);
      if (link?.id === linkId) link.remove();
    };
  }, [tenantSlug, isTenantDomain, store?.tenant?.name, store?.tenant?.logo?.secureUrl, settings.shopName, settings.description, settings.branding?.primaryColor, settings.branding?.logo?.secureUrl, settings.branding?.favicon?.secureUrl, settings.logo?.secureUrl]);

  const path = (p) => storePath(tenantSlug, p, isTenantDomain);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--store-primary", branding.primaryColor || "#111827");
    root.style.setProperty("--store-secondary", branding.secondaryColor || "#f59e0b");
    root.style.setProperty("--store-accent", branding.accentColor || "#e11d48");
    root.dataset.storeTheme = branding.theme || "light";
    if (branding.font) root.style.setProperty("--store-font", branding.font);
    const faviconUrl = branding.favicon?.secureUrl;
    let link = document.getElementById("tenant-favicon");
    if (!faviconUrl) { link?.remove(); return; }
    link ||= Object.assign(document.createElement("link"), { id: "tenant-favicon", rel: "icon" });
    link.href = faviconUrl;
    document.head.appendChild(link);
    return () => link.remove();
  }, [branding.primaryColor, branding.secondaryColor, branding.accentColor, branding.theme, branding.font, branding.favicon?.secureUrl]);

  const showNotificationPrompt = supported && !subscribed;
  const permissionDenied = typeof Notification !== "undefined" && Notification.permission === "denied";
  const dismissPrompt = () => { try { sessionStorage.setItem(promptKey, "1"); } catch {} setPromptDismissed(true); };

  if (comingSoon) return <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
    <div className="container-app flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-2xl text-center">
        {logo ? <img src={logo} alt={shopName} className="mx-auto mb-6 h-24 w-24 rounded-3xl object-cover shadow-lg"/> : <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl bg-amber-300 text-5xl shadow-lg">👗</div>}
        <span className="badge bg-white ring-1 ring-black/5">✨ We are preparing something special</span>
        <h1 className="mt-5 text-5xl font-black sm:text-6xl">{settings.comingSoon?.title || "Coming Soon"}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">{settings.comingSoon?.message || "We are getting ready. Subscribe to notifications and we will let you know when we launch."}</p>
        {canInstall && <div className="mx-auto mt-5 max-w-md rounded-3xl bg-slate-950 p-5 text-left text-white shadow-xl">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><Download size={20}/></div><div><div className="font-black">Install our app</div><div className="text-xs text-white/60">Install the store on your phone for quicker access.</div></div></div>
          <button type="button" onClick={install} className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">Install App</button>
        </div>}
        <div className="mx-auto mt-7 max-w-md rounded-3xl bg-white p-5 text-left shadow-xl ring-1 ring-black/5">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white"><Bell size={20}/></div><div><div className="font-black">Get launch updates</div><div className="text-xs text-slate-500">Allow notifications so you don't miss the launch.</div></div></div>
          {supported && !subscribed && !permissionDenied ? <button type="button" onClick={toggle} disabled={busy} className="btn-primary mt-4 w-full">{busy ? "Enabling notifications…" : "Enable Notifications"}</button> : permissionDenied ? <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Notifications are blocked. Open this site's browser permissions, allow notifications, then reload this page.</div> : subscribed ? <div className="mt-4 space-y-3"><div className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Notifications are enabled. We will notify you when we launch.</div><button type="button" onClick={toggle} disabled={busy} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{busy ? "Disabling…" : "Disable Notifications"}</button></div> : <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">Push notifications are not supported by this browser.</div>}
        </div>
      </div>
    </div>
  </div>;

  return <>
    {showNotificationPrompt && !promptDismissed && <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50"><div className="container-app flex items-center justify-between gap-3 py-2.5 text-sm"><div className="flex items-center gap-2 font-semibold"><Bell size={17}/><span>Enable notifications to receive new collection and launch updates.</span></div><div className="flex shrink-0 gap-2"><button type="button" onClick={toggle} disabled={busy} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">{busy ? "Enabling…" : "Enable"}</button><button type="button" onClick={dismissPrompt} className="rounded-xl px-2 py-2 text-xs font-bold text-slate-600">Later</button></div></div></div>}
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="container-app flex min-h-16 items-center justify-between gap-2 py-2">
        <Link to={path("/")} className="flex min-w-0 items-center gap-2 font-black text-lg sm:text-xl">
          {logo ? <img loading="lazy" src={logo} alt="" className="h-10 w-10 shrink-0 rounded-2xl object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-300">👗</span>}
          <span className="truncate">{shopName}</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(([to, label]) => <NavLink key={to} to={path(to)} end={to === "/"} className={({isActive}) => `rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? "bg-slate-100" : "hover:bg-slate-50"}`}>{label}</NavLink>)}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">
          {canInstall && <button type="button" onClick={install} className="btn-yellow px-3 py-2.5" title={`Install ${shopName}`}><Download size={18}/><span className="hidden sm:inline">Install App</span></button>}
          {supported && <button type="button" title={subscribed ? "Disable store notifications" : "Enable store notifications"} onClick={toggle} disabled={busy} className="flex items-center gap-2 rounded-2xl bg-slate-100 px-2.5 py-2.5 text-sm font-bold hover:bg-slate-200 disabled:opacity-60"><Bell size={18}/><span className="hidden sm:inline">Notifications</span><span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition ${subscribed ? "bg-slate-950" : "bg-slate-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${subscribed ? "left-6" : "left-1"}`}/></span></button>}
          <Link to={path("/search")} className="btn-soft p-2.5" title="Search"><Search size={18}/></Link>
          <Link to={path("/my-orders")} className="hidden rounded-xl px-3 py-2 text-sm font-bold hover:bg-slate-50 sm:inline">My Orders</Link>
          <Link to={path("/checkout")} className="relative btn-soft p-2.5" title="Cart"><ShoppingBag size={18}/>{count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{count}</span>}</Link>
          <button className="btn-soft p-2.5 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X size={19}/> : <Menu size={19}/>}</button>
        </div>
      </div>
      {error && <div className="container-app pb-2 text-right text-xs font-semibold text-red-600">{error}</div>}
      {open && <div className="container-app border-t pb-3 pt-2 md:hidden">{links.map(([to,label]) => <NavLink onClick={() => setOpen(false)} key={to} to={path(to)} end={to === "/"} className={({isActive}) => `block rounded-xl px-3 py-3 font-semibold ${isActive ? "bg-slate-100" : "hover:bg-slate-50"}`}>{label}</NavLink>)}</div>}
    </header>
    <main><Outlet /></main>
    <footer className="mt-16 border-t bg-white py-8 sm:py-10">
      <div className="container-app grid gap-6 md:grid-cols-4">
        <div><div className="font-black text-xl">{logo ? <img loading="lazy" src={logo} alt="" className="mr-2 inline h-8 w-8 rounded-lg object-cover" /> : "👗"} {shopName}</div><p className="mt-2 text-sm text-slate-500">{description}</p></div>
        <div><h3 className="font-bold">Quick links</h3><div className="mt-2 grid gap-1 text-sm text-slate-600"><Link to={path("/collections")}>Collections</Link><Link to={path("/offers")}>Offers</Link><Link to={path("/most-demanded")}>Popular</Link><Link to={path("/shop")}>Shop Details</Link></div></div>
        <div><h3 className="font-bold">Legal</h3><div className="mt-2 grid gap-1 text-sm text-slate-600"><Link to={path("/terms")}>Terms & Conditions</Link><Link to={path("/privacy")}>Privacy Policy</Link><Link to={path("/return-policy")}>Return Policy</Link><Link to={path("/shipping-information")}>Shipping Information</Link></div></div>
        <div><h3 className="font-bold">Developer</h3><p className="mt-2 text-sm text-slate-500">{store?.tenant?.developerBranding?.text || "Powered by the multi-store fashion platform."}</p>{store?.tenant?.developerBranding?.name && <p className="mt-1 text-sm font-bold text-slate-700">{store.tenant.developerBranding.name}</p>}<div className="mt-2 grid gap-1 text-sm text-slate-600">{store?.tenant?.developerBranding?.email && <a href={`mailto:${store.tenant.developerBranding.email}`}>{store.tenant.developerBranding.email}</a>}{store?.tenant?.developerBranding?.whatsapp && <a href={`https://wa.me/${String(store.tenant.developerBranding.whatsapp).replace(/\D/g,"")}`} target="_blank" rel="noreferrer">WhatsApp Developer</a>}{store?.tenant?.developerBranding?.website && <a href={store.tenant.developerBranding.website} target="_blank" rel="noreferrer">Developer Website</a>}</div></div>
      </div>
      <div className="container-app mt-7 border-t pt-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} {shopName}. All rights reserved.</div>
    </footer>
  </>;
}
