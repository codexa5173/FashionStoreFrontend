import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, RefreshCw, XCircle } from "lucide-react";
import RefreshButton from "../../components/RefreshButton";
import api from "../../lib/api";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const FEATURE_LABELS = { catalog:"Product Catalog", pos:"POS & Billing", customers:"Customers", inventory:"Inventory", purchases:"Purchases", suppliers:"Suppliers", reports:"Reports", expenses:"Expenses", staff:"Staff & Permissions", sizes:"Fashion Sizes", collections:"Collections", online_orders:"Online Orders", notifications:"Notifications", campaigns:"Campaigns", loyalty:"Loyalty", domains:"Custom Domains", pwa:"Offline PWA", seo:"SEO & Discovery", advanced_analytics:"Advanced Analytics" };

export default function Billing() {
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [cycle, setCycle] = useState("monthly");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const [billing, planRes] = await Promise.all([api.get("/billing"), api.get("/billing/plans")]);
    setData(billing.data);
    setPlans(planRes.data.plans || []);
    setCycle(billing.data.subscription?.billingCycle || "monthly");
  }
  useEffect(() => { load().catch(e => setMessage(e.response?.data?.message || "Unable to load billing.")); }, []);

  const currentCode = data?.subscription?.planCode;
  const currentPlan = useMemo(() => plans.find(p => p.code === currentCode) || data?.plan, [plans, currentCode, data]);

  async function action(fn, success) {
    setBusy(true); setMessage("");
    try { await fn(); setMessage(success); await load(); }
    catch (e) { setMessage(e.response?.data?.message || "Billing action failed."); }
    finally { setBusy(false); }
  }

  function showContact(plan) {
    if (plan.code === currentCode) return;
    setMessage(`Contact ${data?.developerBranding?.name || "the platform team"} to upgrade to ${plan.name}.`);
  }

  if (!data) return <div className="card p-8">Loading billing...</div>;
  const sub = data.subscription;

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-black">Subscription & Billing</h1><p className="mt-1 text-sm text-slate-500">Manage your SaaS plan, billing cycle and invoices.</p></div>
      <RefreshButton onClick={() => action(load, "Billing refreshed.")} busy={busy}/>
    </div>

    {message && <div className="mt-5 rounded-2xl border bg-white p-4 text-sm">{message}</div>}

    <div className="mt-6 grid gap-5 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-2">
        <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Current subscription</div><h2 className="mt-2 text-2xl font-black">{currentPlan?.name || currentCode}</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{sub.status}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Billing cycle</div><div className="mt-1 font-black capitalize">{sub.billingCycle}</div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Subscription dates</div><div className="mt-1 font-black">{sub.startedAt ? new Date(sub.startedAt).toLocaleDateString() : "—"} → {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "—"}</div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Provider</div><div className="mt-1 font-black uppercase">{sub.provider}</div></div></div>
        {sub.pendingPlanCode && <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm">Plan change scheduled: <b>{sub.pendingPlanCode}</b> for the next billing period.</div>}
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Subscription changes are handled manually by the platform team. Contact the team below for upgrades, renewals or date changes.</div>
      </div>
      <div className="card p-6"><div className="flex items-center gap-2"><CreditCard size={19}/><h2 className="font-black">Billing cycle</h2></div><div className="mt-4 rounded-2xl bg-slate-100 p-4 text-center text-lg font-black capitalize">{sub.billingCycle || "monthly"}</div><p className="mt-4 text-xs text-slate-500">The platform team controls whether this subscription is monthly or yearly.</p></div>
    </div>

    <div className="mt-7"><h2 className="text-xl font-black">Available plans</h2><div className="mt-4 grid gap-4 lg:grid-cols-3">{plans.map(p=><div key={p.code} className={`card p-6 ${p.code===currentCode?"ring-2 ring-slate-900":""}`}><div className="flex items-center justify-between"><h3 className="text-xl font-black">{p.name}</h3>{p.code===currentCode&&<CheckCircle2 size={19}/>}</div><p className="mt-2 min-h-10 text-sm text-slate-500">{p.description}</p><div className="mt-5 text-3xl font-black">{money(cycle==="yearly"?p.yearlyPrice:p.monthlyPrice)}<span className="text-sm font-semibold text-slate-400">/{cycle}</span></div><ul className="mt-5 space-y-2 text-sm">{Object.entries(p.limits||{}).map(([k,v])=><li key={k} className="flex justify-between"><span className="capitalize text-slate-500">{k.replace(/([A-Z])/g," $1")}</span><b>{v}</b></li>)}</ul><button className="btn-primary mt-6 w-full" disabled={busy||p.code===currentCode} onClick={()=>showContact(p)}>{p.code===currentCode?"Current plan":"Contact Team to Upgrade"}</button></div>)}</div></div>

    <div className="mt-7 grid gap-4 lg:grid-cols-2"><div><h2 className="text-xl font-black">Plan features</h2><div className="mt-4 card p-5"><div className="grid gap-2 sm:grid-cols-2">{(currentPlan?.features || []).map(f=><div key={f} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">✓ {FEATURE_LABELS[f] || f}</div>)}</div>{!(currentPlan?.features || []).length&&<p className="text-sm text-slate-500">No feature restrictions are configured for this plan.</p>}</div></div><div className="card p-5"><h2 className="text-xl font-black">Contact Team</h2><p className="mt-2 text-sm text-slate-500">For upgrades, payment confirmation or plan changes, contact the platform team.</p>{data.developerBranding?.name&&<p className="mt-3 font-bold">{data.developerBranding.name}</p>}<div className="mt-3 flex flex-wrap gap-2">{data.developerBranding?.email&&<a className="btn-soft" href={`mailto:${data.developerBranding.email}`}>Email Team</a>}{data.developerBranding?.whatsapp&&<a className="btn-soft" target="_blank" rel="noreferrer" href={`https://wa.me/${data.developerBranding.whatsapp.replace(/\D/g,"")}`}>WhatsApp Team</a>}{data.developerBranding?.website&&<a className="btn-soft" target="_blank" rel="noreferrer" href={data.developerBranding.website}>Developer Website</a>}</div></div></div><div className="hidden"><div className="mt-4 card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Invoice</th><th className="p-4">Period</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{(data.invoices||[]).map(inv=><tr className="border-t" key={inv._id}><td className="p-4 font-bold">{inv.invoiceNumber}</td><td className="p-4">{new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}</td><td className="p-4 font-black">{money(inv.total)}</td><td className="p-4">{inv.status}</td><td className="p-4"><span className="text-xs font-semibold text-slate-500">Managed by platform team</span></td></tr>)}</tbody></table></div>{!data.invoices?.length&&<div className="p-8 text-center text-sm text-slate-400">No invoices yet.</div>}</div></div>
  </div>;
}
