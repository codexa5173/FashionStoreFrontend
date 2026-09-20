import { useEffect, useState } from "react";
import api from "../../lib/api";
import { cachedGet, cacheRemove } from "../../lib/cache";

export default function Billing() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { cachedGet(api,"/billing/platform",{key:"platform:billing",scope:"global"}).then(r => setRows(r.data.subscriptions || [])).catch(e => setError(e.response?.data?.message || "Unable to load subscriptions.")); }, []);
  return <div><h1 className="text-3xl font-black">Billing</h1><p className="mt-1 text-sm text-slate-500">Platform-wide subscription status and billing cycles.</p>{error&&<div className="mt-5 card p-4 text-sm">{error}</div>}<div className="mt-6 card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Tenant</th><th className="p-4">Plan</th><th className="p-4">Cycle</th><th className="p-4">Status</th><th className="p-4">Period end</th><th className="p-4">Provider</th></tr></thead><tbody>{rows.map(r=><tr className="border-t" key={r.id}><td className="p-4 font-bold">{r.tenant?.name||"Unknown"}<div className="text-xs font-normal text-slate-500">/{r.tenant?.slug||"—"}</div></td><td className="p-4">{r.planCode}</td><td className="p-4 capitalize">{r.billingCycle}</td><td className="p-4">{r.status}</td><td className="p-4">{r.currentPeriodEnd?new Date(r.currentPeriodEnd).toLocaleDateString():"—"}</td><td className="p-4 uppercase">{r.provider}</td></tr>)}</tbody></table></div>{!rows.length&&!error&&<div className="p-8 text-center text-sm text-slate-400">No subscription records yet.</div>}</div></div>;
}
