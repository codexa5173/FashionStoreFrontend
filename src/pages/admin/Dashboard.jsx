import { useEffect, useState } from "react";
import { Package, CheckCircle, AlertCircle, Tag, Flame, Tags, Send, ShoppingCart, IndianRupee, RotateCcw, TrendingUp } from "lucide-react";
import api from "../../lib/api";
import { cachedGet, cacheRemove } from "../../lib/cache";
import { money } from "../../lib/utils";
import RefreshButton from "../../components/RefreshButton";

export default function Dashboard() {
  const [d, setD] = useState(null), [refreshing, setRefreshing] = useState(false), [lastUpdated, setLastUpdated] = useState(null);

  async function load(force = false) {
    try {
      const r = await cachedGet(api, "/admin/dashboard", { key: "dashboard:admin", forceRefresh: force });
      setD(r.data); setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    }
  }

  useEffect(() => { load(false); const timer = window.setInterval(() => load(true), 60 * 1000); return () => window.clearInterval(timer); }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      await cacheRemove("dashboard:admin");
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }

  if (!d) return <div>Loading...</div>;

  const revenue = d.revenue || {};
  const cards = [
    ["Total Products", d.counts.totalProducts, Package],
    ["Available", d.counts.availableProducts, CheckCircle],
    ["Out of Stock", d.counts.outOfStock, AlertCircle],
    ["Today's Offers", d.counts.todaysOffers, Tag],
    ["Most Demanded", d.counts.mostDemanded, Flame],
    ["Categories", d.counts.totalCategories, Tags],
    ["Notifications Sent", d.counts.notificationsSent, Send],
    ["Orders", revenue.orders || 0, ShoppingCart],
    ["Net Revenue", money(revenue.netRevenue || 0), IndianRupee],
    ["Returns", money(revenue.returnedAmount || 0), RotateCcw],
    ["Net Profit", money(revenue.netProfit || 0), TrendingUp],
    ["Today\'s Expenses", money(revenue.expensesToday || 0), IndianRupee]
  ];

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-black">Dashboard</h1><p className="mt-1 text-slate-500">Sales are adjusted automatically when returns are recorded.</p></div>
      <div className="flex items-center gap-3"><div className="text-right text-xs text-slate-400">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} · auto-refresh 60s` : "Loading live metrics..."}</div><RefreshButton onClick={refresh} busy={refreshing} /></div>
    </div>

    <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(([label, v, Icon]) => <div className="card p-5" key={label}>
        <Icon size={20} />
        <div className="mt-4 text-2xl font-black">{v}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>)}
    </div>

    <div className="mt-5 card p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-black">Revenue Summary</h2><p className="text-sm text-slate-500">Gross sales minus recorded returns = net revenue.</p></div>
        <div className="text-right"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Net Revenue</div><div className="text-3xl font-black">{money(revenue.netRevenue || 0)}</div></div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Gross Sales</div><div className="mt-1 font-black">{money(revenue.revenue || 0)}</div></div>
        <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Returned Amount</div><div className="mt-1 font-black">− {money(revenue.returnedAmount || 0)}</div></div>
        <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Total Discounts</div><div className="mt-1 font-black">{money(revenue.discounts || 0)}</div></div>
        <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Net Profit</div><div className="mt-1 font-black">{money(revenue.netProfit || 0)}</div></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-500">
        <span>Product discounts: <b className="text-slate-800">{money(revenue.productDiscounts || 0)}</b></span>
        <span>Additional discounts: <b className="text-slate-800">{money(revenue.additionalDiscounts || 0)}</b></span>
        <span>Return cost restored: <b className="text-slate-800">{money(revenue.returnedCost || 0)}</b></span>
        <span>Profit reversal: <b className="text-slate-800">{money(revenue.returnedProfitImpact || 0)}</b></span><span>Today\'s expenses: <b className="text-slate-800">{money(revenue.expensesToday || 0)}</b></span>
      </div>
    </div>

    <div className="mt-7 grid gap-4 md:grid-cols-2">
      <div className="card p-6"><h2 className="font-black">Inventory purchase value</h2><div className="mt-2 text-3xl font-black">{money(d.financial.inventoryPurchaseValue)}</div><p className="text-sm text-slate-500">Available stock at purchase cost.</p></div>
      <div className="card p-6"><h2 className="font-black">Potential sales value</h2><div className="mt-2 text-3xl font-black">{money(d.financial.potentialSalesValue)}</div><p className="text-sm text-slate-500">Available stock at normal selling prices.</p></div>
      <div className="card p-6"><h2 className="font-black">Estimated normal profit</h2><div className="mt-2 text-3xl font-black">{money(d.financial.normalProfit)}</div></div>
      <div className="card p-6"><h2 className="font-black">Estimated discounted profit</h2><div className="mt-2 text-3xl font-black">{money(d.financial.discountedProfit)}</div></div>
    </div>
  </div>;
}
