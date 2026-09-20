import { Link, NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Package, Tags, Layers, Settings, Send, ShoppingCart, LogOut, Menu, X, RotateCcw, Users, Receipt, Truck, Boxes, UserCog, BarChart3, Wallet, Gauge, CreditCard, Globe2, CloudOff, ShieldCheck, CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { usePwaInstall } from "../hooks/usePwaInstall";
import api from "../lib/api";
import { syncOfflineMutations } from "../lib/offlineQueue";
import { useAuth } from "../context/AuthContext";

const links = [
  ["/admin", "Dashboard", LayoutDashboard, "dashboard.view", null], ["/admin/products", "Products", Package, "products.view", "catalog"],
  ["/admin/orders", "Sales & Bills", Receipt, "sales.view", "pos"], ["/admin/online-orders", "Online Orders", ShoppingCart, "sales.view", "online_orders"], ["/admin/bookings", "Booked Items", CalendarClock, "sales.view", "online_orders"], ["/admin/orders/new", "Create Order", ShoppingCart, "sales.create", "pos"],
  ["/admin/customers", "Customers", Users, "customers.view", "customers"], ["/admin/customers/crm", "Customer CRM", Users, "customers.view", "customers"],
  ["/admin/suppliers", "Suppliers", Truck, "suppliers.view", "suppliers"], ["/admin/purchases", "Purchases", Receipt, "purchases.view", "purchases"],
  ["/admin/inventory", "Inventory", Boxes, "inventory.view", "inventory"], ["/admin/returns", "Return Items", RotateCcw, "returns.view", "inventory"],
  ["/admin/categories", "Categories", Tags, "categories.view", "catalog"], ["/admin/collections", "Collections", Layers, "collections.view", "collections"],
  ["/admin/notifications", "Notifications", Send, "notifications.view", "notifications"], ["/admin/campaigns", "Campaigns", Send, "campaigns.view", "campaigns"],
  ["/admin/settings", "Settings", Settings, "settings.view", null], ["/admin/sizes", "Fashion Sizes", Tags, "settings.view", "sizes"],
  ["/admin/staff", "Staff", UserCog, "staff.view", "staff"], ["/admin/reports", "Reports", BarChart3, "reports.view", "reports"],
  ["/admin/expenses", "Expenses", Wallet, "expenses.view", "expenses"], ["/admin/audit-logs", "Audit Log", Receipt, "audit.view", null],
  ["/admin/usage", "SaaS Usage", Gauge, "usage.view", null], ["/admin/billing", "Billing", CreditCard, "billing.view", null], ["/admin/offline-queue", "Offline Queue", CloudOff, "sales.create", "pwa"], ["/admin/security-audit", "Security Audit", ShieldCheck, "security.audit", "advanced_analytics"], ["/admin/domains", "Domains", Globe2, "domains.view", "domains"]
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { logout, admin } = useAuth();
  const { canInstall, install } = usePwaInstall();
  const [features, setFeatures] = useState(null);
  useEffect(() => {
    const linkId = "admin-tenant-manifest";
    let link = document.getElementById(linkId);
    const tenant = admin?.tenant;
    if (!tenant) {
      link?.remove();
      return;
    }
    const name = tenant.name || "Fashion Store";
    const icon = tenant.logo?.secureUrl || "/icon-192.png";
    const manifest = {
      id: "/admin/",
      name: `${name} Admin`,
      short_name: `${name.slice(0, 24)} Admin`,
      description: `${name} administration dashboard.`,
      start_url: "/admin/",
      scope: "/admin/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#f8fafc",
      theme_color: "#ffd84d",
      lang: "en-IN",
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
  }, [admin?.tenant?.name, admin?.tenant?.logo?.secureUrl]);

  useEffect(() => {
    if (!admin) return;
    api.get("/billing").then(r => setFeatures(r.data?.plan?.features || [])).catch(() => setFeatures(null));
    const ping = () => api.get("/health", { timeout: 10000 }).catch(() => {});
    const sync = () => { if (navigator.onLine) syncOfflineMutations(api).catch(() => {}); };
    ping();
    sync();
    const timer = window.setInterval(ping, 14 * 60 * 1000);
    const syncTimer = window.setInterval(sync, 30 * 1000);
    window.addEventListener("online", sync);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(syncTimer);
      window.removeEventListener("online", sync);
    };
  }, [admin]);
  const allowed = links.filter(([, , , permission, feature]) => (admin?.role === "owner" || admin?.role === "super_admin" || admin?.permissions?.includes("*") || admin?.permissions?.includes(permission)) && (feature == null || features == null || features.includes(feature)));
  return <div className="min-h-screen bg-slate-50"><header className="sticky top-0 z-30 border-b bg-white"><div className="flex h-16 items-center justify-between px-4 md:px-6"><Link to="/admin" className="font-black">Noorie Collection Admin</Link><button className="btn-soft md:hidden" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button><div className="hidden items-center gap-2 md:flex">{canInstall && <button type="button" onClick={install} className="btn-yellow px-3 py-2.5">Add Admin App</button>}<span className="text-sm text-slate-500">{admin?.username}</span><button onClick={logout} className="btn-soft"><LogOut size={17}/> Logout</button></div></div></header><div className="flex"><aside className={`${open ? "block" : "hidden"} fixed inset-y-16 z-20 w-64 overflow-y-auto border-r bg-white p-3 md:sticky md:top-16 md:block md:h-[calc(100vh-4rem)]`}>{canInstall && <button type="button" onClick={install} className="btn-yellow mb-3 w-full">Add Admin App to Home</button>}{allowed.map(([to,label,Icon]) => <NavLink onClick={() => setOpen(false)} key={to} to={to} end={to === "/admin"} className={({isActive}) => `mb-1 flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold ${isActive ? "bg-amber-300" : "hover:bg-slate-50"}`}><Icon size={18}/>{label}</NavLink>)}<button onClick={logout} className="mt-6 flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-red-600 hover:bg-red-50 md:hidden"><LogOut size={18}/> Logout</button></aside><main className="min-w-0 flex-1 p-4 md:p-8"><Outlet/></main></div></div>;
}
