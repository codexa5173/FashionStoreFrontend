import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Store, CreditCard, LogOut, Receipt, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function SuperAdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const links = [
    ["/super-admin", "Overview", LayoutDashboard],
    ["/super-admin/tenants", "Tenants", Store],
    ["/super-admin/plans", "Plans", CreditCard],
    ["/super-admin/billing", "Billing", Receipt]
  ];
  async function signOut() {
    await logout();
    navigate("/admin/login?super=1", { replace: true });
  }
  return <div className="min-h-screen bg-slate-50">
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white"><Shield size={18}/></div><div><div className="font-black">Fashion SaaS</div><div className="text-xs text-slate-500">Platform Admin</div></div></div>
        <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:inline">{admin?.username}</span><button onClick={signOut} className="btn-soft"><LogOut size={17}/> Logout</button></div>
      </div>
    </header>
    <div className="flex">
      <aside className="hidden w-64 shrink-0 border-r bg-white p-3 md:block md:min-h-[calc(100vh-4rem)]">
        {links.map(([to,label,Icon]) => <NavLink key={to} to={to} end={to==="/super-admin"} className={({isActive})=>`mb-1 flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold ${isActive?"bg-slate-900 text-white":"hover:bg-slate-50"}`}><Icon size={18}/>{label}</NavLink>)}
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8"><Outlet/></main>
    </div>
  </div>;
}
