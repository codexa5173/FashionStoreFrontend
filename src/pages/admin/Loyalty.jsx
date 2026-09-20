import { useEffect, useState } from "react";
import { Gift, Save, Search, Minus, Plus } from "lucide-react";
import api from "../../lib/api";
import { cachedGet } from "../../lib/cache";
import { money } from "../../lib/utils";

const defaults = {
  enabled: true, pointsPerRupee: 1, redemptionRupeesPerPoint: 0.1,
  minimumRedeemPoints: 100, maximumRedeemPercent: 50, expiryDays: 365
};

export default function Loyalty() {
  const [config, setConfig] = useState(defaults);
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadConfig() {
    try { const r = await cachedGet(api,"/loyalty/config",{key:"loyalty:config:admin",revalidate:true}); setConfig(r.data); } catch {}
  }
  async function searchCustomers() {
    if (!q.trim()) { setCustomers([]); return; }
    try { const r = await api.get(`/customers/search?q=${encodeURIComponent(q)}`); setCustomers(r.data?.items || []); } catch {}
  }
  async function openCustomer(c) {
    setSelected(c); setMessage("");
    try { const r = await api.get(`/loyalty/customers/${c._id}`); setSummary(r.data); } catch (e) { setMessage(e.response?.data?.message || "Could not load loyalty profile."); }
  }
  useEffect(() => { loadConfig(); }, []);
  useEffect(() => { const t = setTimeout(searchCustomers, 250); return () => clearTimeout(t); }, [q]);

  async function save() {
    setBusy(true); setMessage("");
    try { const r = await api.put("/loyalty/config", config); setConfig(r.data); setMessage("Loyalty settings saved."); }
    catch (e) { setMessage(e.response?.data?.message || "Could not save settings."); }
    finally { setBusy(false); }
  }

  async function change(type) {
    const n = Number(points);
    if (!Number.isFinite(n) || n <= 0) return setMessage("Enter valid points.");
    setBusy(true); setMessage("");
    try {
      const path = type === "redeem" ? "redeem" : "adjust";
      await api.post(`/loyalty/customers/${selected._id}/${path}`, { points: type === "redeem" ? n : n, note });
      await openCustomer(selected); setPoints(""); setNote("");
      setMessage(type === "redeem" ? "Points redeemed." : "Points adjusted.");
    } catch (e) { setMessage(e.response?.data?.message || "Could not update points."); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-7xl">
    <div className="flex items-center gap-3"><div className="rounded-2xl bg-slate-900 p-3 text-white"><Gift/></div><div><h1 className="text-3xl font-black">Loyalty & Rewards</h1><p className="text-sm text-slate-500">Reward repeat customers and manage their points safely.</p></div></div>

    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <section className="card p-5">
        <h2 className="text-lg font-black">Program settings</h2>
        <div className="mt-4 grid gap-3">
          <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><span className="font-bold">Program enabled</span><input type="checkbox" checked={!!config.enabled} onChange={e=>setConfig(v=>({...v,enabled:e.target.checked}))}/></label>
          {[
            ["pointsPerRupee","Points per ₹1 sale"],
            ["redemptionRupeesPerPoint","₹ value per point"],
            ["minimumRedeemPoints","Minimum redemption points"],
            ["maximumRedeemPercent","Maximum bill redemption %"],
            ["expiryDays","Points expiry (days)"]
          ].map(([key,label])=><label key={key} className="text-sm font-bold">{label}<input type="number" min="0" step={key==="redemptionRupeesPerPoint"?"0.01":"1"} value={config[key] ?? ""} onChange={e=>setConfig(v=>({...v,[key]:Number(e.target.value)}))} className="mt-1 w-full rounded-2xl bg-slate-100 p-3 font-normal"/></label>)}
          <button className="btn-primary justify-center" disabled={busy} onClick={save}><Save size={17}/>{busy?"Saving...":"Save settings"}</button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-black">Customer rewards</h2>
        <div className="relative mt-4"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search customer by name, phone or email..." className="w-full rounded-2xl bg-slate-100 py-3 pl-10 pr-4"/></div>
        {!!customers.length && <div className="mt-2 overflow-hidden rounded-2xl border">{customers.map(c=><button key={c._id} onClick={()=>openCustomer(c)} className="flex w-full items-center justify-between border-b p-3 text-left last:border-0 hover:bg-slate-50"><span><b>{c.name}</b><span className="ml-2 text-xs text-slate-500">{c.phone}</span></span><span className="text-xs font-bold">{c.loyaltyTier || "BRONZE"}</span></button>)}</div>}

        {summary && <div className="mt-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Balance", summary.customer.loyaltyPointsBalance],
              ["Earned", summary.customer.loyaltyLifetimeEarned],
              ["Redeemed", summary.customer.loyaltyLifetimeRedeemed],
              ["Value", money(summary.redeemableValue)]
            ].map(([k,v])=><div key={k} className="rounded-2xl bg-slate-50 p-4"><div className="text-xs uppercase text-slate-500">{k}</div><div className="mt-1 text-xl font-black">{v}</div></div>)}
          </div>
          <div className="mt-4 rounded-2xl border p-4"><div className="flex items-center justify-between"><b>{summary.customer.name}</b><span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{summary.customer.loyaltyTier}</span></div>
            <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]"><input type="number" min="1" value={points} onChange={e=>setPoints(e.target.value)} placeholder="Points" className="rounded-2xl bg-slate-100 p-3"/><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Reason / note" className="rounded-2xl bg-slate-100 p-3"/><div className="flex gap-2"><button className="btn-soft" disabled={busy} onClick={()=>change("adjust")} title="Add points"><Plus size={16}/></button><button className="btn-soft text-red-600" disabled={busy} onClick={()=>change("redeem")} title="Redeem points"><Minus size={16}/></button></div></div>
          </div>
          <div className="mt-4 max-h-72 overflow-auto rounded-2xl border"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Points</th><th className="p-3">Balance</th><th className="p-3">Note</th></tr></thead><tbody>{summary.transactions.map(t=><tr key={t._id} className="border-t"><td className="p-3">{new Date(t.createdAt).toLocaleDateString()}</td><td className="p-3 font-bold">{t.type}</td><td className={`p-3 font-black ${t.points<0?"text-red-600":"text-emerald-600"}`}>{t.points>0?"+":""}{t.points}</td><td className="p-3">{t.balanceAfter}</td><td className="p-3 text-slate-500">{t.note || t.source}</td></tr>)}</tbody></table></div>
        </div>}
      </section>
    </div>
  </div>;
}
