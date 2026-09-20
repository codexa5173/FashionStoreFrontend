import { useEffect, useState } from "react";
import { Users, Crown, UserRoundX, Repeat2, UserPlus, HeartPulse, RefreshCw, MessageCircle } from "lucide-react";
import api from "../../lib/api";
import { cachedGet, cacheRemove } from "../../lib/cache";
import { money } from "../../lib/utils";
import RefreshButton from "../../components/RefreshButton";

const segmentMeta = {
  new: ["New", UserPlus],
  returning: ["Returning", Repeat2],
  loyal: ["Loyal", HeartPulse],
  vip: ["VIP", Crown],
  at_risk: ["At Risk", UserRoundX],
  inactive: ["Inactive", Users]
};

function date(v) { return v ? new Date(v).toLocaleDateString() : "—"; }
function whatsapp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
}

export default function CustomerCRM() {
  const [d, setD] = useState(null);
  const [days, setDays] = useState(365);
  const [refreshing, setRefreshing] = useState(false);
  const [segment, setSegment] = useState(null);

  async function load(force = false) {
    const key = `customer-crm:${days}`;
    const r = await cachedGet(api, `/customers/crm/overview?days=${days}`, { key, forceRefresh: force });
    setD(r.data);
  }

  useEffect(() => { load(false).catch(console.error); }, [days]);

  async function refresh() {
    setRefreshing(true);
    try {
      await cacheRemove(`customer-crm:${days}`);
      await load(true);
    } finally { setRefreshing(false); }
  }

  if (!d) return <div className="p-6">Loading Customer CRM...</div>;
  const s = d.summary || {};
  const visible = segment ? (d.segmentCustomers?.[segment] || []) : [];
  const segments = d.segments || {};

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-black">Customer CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Understand customer value, loyalty and follow-up opportunities.</p>
      </div>
      <div className="flex items-center gap-2">
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
          <option value="90">Last 90 days</option><option value="180">Last 180 days</option><option value="365">Last 12 months</option><option value="730">Last 24 months</option>
        </select>
        <RefreshButton onClick={refresh} busy={refreshing} />
      </div>
    </div>

    <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[
        ["Customers", s.totalCustomers, Users],
        ["With purchases", s.customersWithOrders, HeartPulse],
        ["Repeat rate", `${s.repeatRate || 0}%`, Repeat2],
        ["Lifetime revenue", money(s.lifetimeRevenue || 0), Crown]
      ].map(([label, value, Icon]) => <div className="card p-5" key={label}><Icon size={20}/><div className="mt-3 text-2xl font-black">{value}</div><div className="text-sm text-slate-500">{label}</div></div>)}
    </div>

    <div className="mt-4 grid gap-4 md:grid-cols-3">
      <div className="card p-5"><div className="text-xs uppercase text-slate-400">Active customers</div><div className="mt-2 text-2xl font-black">{s.activeCustomers || 0}</div></div>
      <div className="card p-5"><div className="text-xs uppercase text-slate-400">Average customer value</div><div className="mt-2 text-2xl font-black">{money(s.averageCustomerValue || 0)}</div></div>
      <div className="card p-5"><div className="text-xs uppercase text-slate-400">Period revenue</div><div className="mt-2 text-2xl font-black">{money(s.periodRevenue || 0)}</div></div>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(segmentMeta).map(([key, [label, Icon]]) => <button key={key} onClick={() => setSegment(segment === key ? null : key)} className={`card p-5 text-left transition ${segment === key ? "ring-2 ring-amber-300" : ""}`}>
        <div className="flex items-center justify-between"><Icon size={20}/><span className="text-2xl font-black">{segments[key] || 0}</span></div>
        <div className="mt-3 font-bold">{label}</div>
        <div className="text-xs text-slate-500">Click to inspect</div>
      </button>)}
    </div>

    {segment && <div className="mt-6 card overflow-hidden">
      <div className="flex items-center justify-between p-5"><div><h2 className="font-black">{segmentMeta[segment]?.[0]} customers</h2><p className="text-sm text-slate-500">Open the customer record from the Customers page for full history.</p></div><button className="btn-soft" onClick={() => setSegment(null)}>Close</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Customer</th><th className="p-4">Orders</th><th className="p-4">Spent</th><th className="p-4">Last purchase</th><th className="p-4"></th></tr></thead><tbody>{visible.map(c => <tr className="border-t" key={c._id}><td className="p-4"><b>{c.name}</b><div className="text-xs text-slate-500">{c.phone}</div></td><td className="p-4">{c.orders || 0}</td><td className="p-4 font-bold">{money(c.spent || 0)}</td><td className="p-4">{date(c.lastPurchaseAt)}</td><td className="p-4 text-right"><a className="btn-soft inline-flex" href={whatsapp(c.phone)} target="_blank" rel="noreferrer"><MessageCircle size={16}/></a></td></tr>)}</tbody></table></div>
      {!visible.length && <div className="p-8 text-center text-sm text-slate-400">No customers in this segment.</div>}
    </div>}

    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="card overflow-hidden">
        <div className="p-5"><h2 className="font-black">At-risk customers</h2><p className="text-sm text-slate-500">No purchase for more than 60 days, but not yet inactive for 180 days.</p></div>
        <div className="divide-y">{(d.atRisk || []).slice(0, 8).map(c => <div className="flex items-center justify-between gap-3 p-4" key={c._id}><div><b>{c.name}</b><div className="text-xs text-slate-500">{c.phone} · Last {date(c.lastPurchaseAt)}</div></div><div className="text-right"><b>{money(c.spent || 0)}</b><div className="text-xs text-slate-400">{c.orders || 0} orders</div></div></div>)}</div>
        {!d.atRisk?.length && <div className="p-8 text-center text-sm text-slate-400">No at-risk customers.</div>}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5"><h2 className="font-black">VIP customers</h2><p className="text-sm text-slate-500">Customers with ₹50,000+ lifetime spend or 10+ completed orders.</p></div>
        <div className="divide-y">{(d.vip || []).slice(0, 8).map(c => <div className="flex items-center justify-between gap-3 p-4" key={c._id}><div><b>{c.name}</b><div className="text-xs text-slate-500">{c.phone}</div></div><div className="text-right"><b>{money(c.spent || 0)}</b><div className="text-xs text-slate-400">{c.orders || 0} orders</div></div></div>)}</div>
        {!d.vip?.length && <div className="p-8 text-center text-sm text-slate-400">No VIP customers yet.</div>}
      </div>
    </div>

    <div className="mt-6 card overflow-hidden">
      <div className="p-5"><h2 className="font-black">Top products bought by customers</h2><p className="text-sm text-slate-500">Based on customer-linked sales during the selected period.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Product</th><th className="p-4">Quantity</th><th className="p-4">Revenue</th></tr></thead><tbody>{(d.topProducts || []).map(p => <tr className="border-t" key={String(p.productId)}><td className="p-4 font-bold">{p.name}</td><td className="p-4">{p.quantity}</td><td className="p-4 font-bold">{money(p.revenue || 0)}</td></tr>)}</tbody></table></div>
    </div>
  </div>;
}
