import { useEffect, useState } from "react";
import { HardDrive, Package, Boxes, Users, ShoppingCart, RefreshCw } from "lucide-react";
import api from "../../lib/api";
import { cachedGet, cacheRemove } from "../../lib/cache";
import RefreshButton from "../../components/RefreshButton";

const labels = {
  products: ["Products", Package],
  variants: ["Variants", Boxes],
  staff: ["Staff", Users],
  customers: ["Customers", Users],
  orders: ["Orders", ShoppingCart]
};

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function Meter({ label, used, limit, Icon, format = v => String(v) }) {
  const unlimited = limit == null || limit < 0;
  const percent = unlimited ? 0 : Math.min(100, limit === 0 ? 100 : (used / limit) * 100);
  return <div className="card p-5">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><Icon size={19}/><span className="font-bold">{label}</span></div>
      <span className="text-sm text-slate-500">{format(used)}{unlimited ? " / Unlimited" : ` / ${format(limit)}`}</span>
    </div>
    {!unlimited && <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${percent >= 90 ? "bg-red-500" : percent >= 75 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${percent}%` }}/></div>}
    <div className="mt-2 text-xs text-slate-400">{unlimited ? "No configured plan limit" : `${Math.round(percent)}% used`}</div>
  </div>;
}

export default function Usage() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load(force = false) {
    const [current, past] = await Promise.all([
      cachedGet(api, "/usage", { key: "usage:current", forceRefresh: force }),
      api.get("/usage/history?limit=12")
    ]);
    setData(current.data);
    setHistory(past.data.history || []);
  }

  useEffect(() => { load(false).catch(console.error); }, []);

  async function refresh() {
    setRefreshing(true);
    try { await cacheRemove("usage:current"); await load(true); } finally { setRefreshing(false); }
  }

  if (!data) return <div>Loading usage...</div>;

  const u = data.usage;
  const l = data.limits;
  const plan = data.plan;
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-black">SaaS Usage</h1><p className="mt-1 text-slate-500">Live tenant resource usage against the current plan.</p></div>
      <RefreshButton onClick={refresh} busy={refreshing}/>
    </div>

    <div className="mt-6 card p-5">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Current Plan</div>
      <div className="mt-1 text-2xl font-black">{plan?.name || "No active plan"}</div>
      <div className="text-sm text-slate-500">Usage period: {u.period} · measured {new Date(u.measuredAt).toLocaleString()}</div>
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(labels).map(([key, [label, Icon]]) => {
        const item = l[key];
        return <Meter key={key} label={label} used={item.used} limit={item.limit} Icon={Icon}/>;
      })}
    </div>

    <div className="mt-7 card overflow-hidden">
      <div className="border-b p-5"><h2 className="font-black">Usage History</h2><p className="text-sm text-slate-500">Monthly usage snapshots retained for the tenant.</p></div>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="px-5 py-3">Period</th><th className="px-5 py-3">Products</th><th className="px-5 py-3">Variants</th><th className="px-5 py-3">Staff</th><th className="px-5 py-3">Customers</th><th className="px-5 py-3">Orders</th></tr></thead>
      <tbody>{history.map(row => <tr className="border-b last:border-0" key={row._id}><td className="px-5 py-3 font-bold">{row.period}</td><td className="px-5 py-3">{row.products}</td><td className="px-5 py-3">{row.variants}</td><td className="px-5 py-3">{row.staff}</td><td className="px-5 py-3">{row.customers}</td><td className="px-5 py-3">{row.orders}</td></tr>)}</tbody></table></div>
    </div>
  </div>;
}
