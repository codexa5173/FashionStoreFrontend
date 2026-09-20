import { useEffect, useState } from "react";
import api from "../../lib/api";

const TYPES = ["", "PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "DAMAGED", "LOST", "TRANSFER"];

export default function Inventory() {
  const [d, setD] = useState(null);
  const [ledger, setLedger] = useState({ items: [], pagination: {} });
  const [threshold, setThreshold] = useState(5);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("stock");
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [summary,setSummary]=useState({products:0,units:0,low:0,out:0,value:0});

  const load = async () => {
    const r = await api.get(`/stock/low?threshold=${threshold}`);
    setD(r.data);
    try {
      const pr = await api.get("/products/admin/list?page=1&limit=100");
      const rows = pr.data?.items || [];
      const units = rows.reduce((n,x)=>n+Number(x.stockQuantity||0),0);
      const value = rows.reduce((n,x)=>n+Number(x.stockQuantity||0)*Number(x.purchasePrice||0),0);
      setSummary({products:pr.data?.pagination?.total||rows.length,units,low:(r.data?.products?.length||0)+(r.data?.variants?.length||0),out:rows.filter(x=>Number(x.stockQuantity||0)<=0).length,value});
    } catch {}
  };

  const loadLedger = async () => {
    setLoadingLedger(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (type) params.set("type", type);
      const r = await api.get(`/stock/ledger?${params.toString()}`);
      setLedger(r.data);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => { load(); }, [threshold]);
  useEffect(() => { if (tab === "ledger") loadLedger(); }, [tab, page, type]);

  const movementClass = (n) => Number(n) >= 0 ? "text-emerald-700" : "text-rose-700";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Inventory</h1><p className="mt-1 text-sm text-slate-500">Live stock health, inventory ledger and variant-aware movements.</p></div>
        <div className="flex rounded-2xl bg-slate-100 p-1">
          <button className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "stock" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setTab("stock")}>Stock</button>
          <button className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "ledger" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setTab("ledger")}>Inventory Ledger</button>
        </div>
      </div>

      {tab === "stock" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="card p-4"><div className="text-xs text-slate-400">Products</div><div className="mt-1 text-2xl font-black">{summary.products}</div></div><div className="card p-4"><div className="text-xs text-slate-400">Units in stock</div><div className="mt-1 text-2xl font-black">{summary.units}</div></div><div className="card p-4"><div className="text-xs text-slate-400">Low / out</div><div className="mt-1 text-2xl font-black">{summary.low} / {summary.out}</div></div><div className="card p-4"><div className="text-xs text-slate-400">Stock cost value</div><div className="mt-1 text-2xl font-black">₹{summary.value.toLocaleString("en-IN",{maximumFractionDigits:0})}</div></div></div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <label className="text-sm font-semibold">Low stock ≤
              <input className="input ml-2 w-24" type="number" min="0" value={threshold} onChange={e => setThreshold(e.target.value)} />
            </label>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold">Low Stock Products</h2>
            {d?.products?.length ? (
              <div className="space-y-2">{d.products.map(x =>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3" key={x._id}>
                  <span><b>{x.name}</b><small className="ml-2 text-slate-500">{x.sku}</small></span>
                  <span className="font-black">{x.stockQuantity}</span>
                </div>
              )}</div>
            ) : <p className="text-slate-500">No low-stock simple products.</p>}

            <h2 className="mb-4 mt-8 font-bold">Low Stock Variants</h2>
            {d?.variants?.length ? d.variants.map(x =>
              <div className="mb-2 flex justify-between rounded-2xl bg-slate-50 p-3" key={x._id}>
                <span><b>{x.productId?.name}</b> · {x.size || "One Size"} {x.color && `· ${x.color}`}</span>
                <strong>{x.stockQuantity}</strong>
              </div>
            ) : <p className="text-slate-500">No low-stock variants.</p>}
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="font-bold">Inventory Movement Ledger</h2>
              <p className="text-sm text-slate-500">Every purchase, sale, return and stock adjustment is recorded here.</p>
            </div>
            <select className="input w-44" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
              <option value="">All movements</option>
              {TYPES.slice(1).map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>

          {loadingLedger ? <div className="p-8 text-center text-slate-500">Loading ledger…</div> :
            ledger.items?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Variant</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Before</th><th className="px-5 py-3">Change</th><th className="px-5 py-3">After</th><th className="px-5 py-3">Reference</th></tr>
                  </thead>
                  <tbody>
                    {ledger.items.map(x =>
                      <tr key={x._id} className="border-t">
                        <td className="px-5 py-3 whitespace-nowrap">{new Date(x.createdAt).toLocaleString()}</td>
                        <td className="px-5 py-3"><b>{x.productName}</b><div className="text-xs text-slate-500">{x.sku}</div></td>
                        <td className="px-5 py-3">{x.variant ? "Variant" : "Simple product"}</td>
                        <td className="px-5 py-3 font-semibold">{x.type}</td>
                        <td className="px-5 py-3">{x.quantityBefore}</td>
                        <td className={`px-5 py-3 font-black ${movementClass(x.quantityChange)}`}>{Number(x.quantityChange) > 0 ? "+" : ""}{x.quantityChange}</td>
                        <td className="px-5 py-3 font-bold">{x.quantityAfter}</td>
                        <td className="px-5 py-3 text-xs text-slate-500">{x.referenceType}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : <div className="p-10 text-center text-slate-500">No inventory movements recorded yet.</div>}

          {ledger.pagination?.pages > 1 && (
            <div className="flex items-center justify-between border-t p-4 text-sm">
              <span>Page {ledger.pagination.page} of {ledger.pagination.pages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} className="rounded-xl border px-3 py-2 disabled:opacity-40" onClick={() => setPage(p => p - 1)}>Previous</button>
                <button disabled={page >= ledger.pagination.pages} className="rounded-xl border px-3 py-2 disabled:opacity-40" onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
