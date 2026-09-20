import { useEffect, useState } from "react";
import { Globe2, CheckCircle2, Copy, Plus, ShieldCheck, Star, Trash2 } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";

export default function Domains() {
  const { admin } = useAuth();
  const canManage = admin?.role === "owner" || admin?.role === "super_admin" || admin?.permissions?.includes("domains.manage");
  const [domains, setDomains] = useState([]);
  const [hostname, setHostname] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [disableTarget,setDisableTarget]=useState(null);

  const load = () => {
    setLoading(true);
    api.get("/tenants/domains/list")
      .then(r => setDomains(r.data.domains || []))
      .catch(e => setError(e.response?.data?.message || "Unable to load domains."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function add() {
    if (!hostname.trim()) return;
    setBusy("add"); setError(""); setMessage("");
    try {
      const r = await api.post("/tenants/domains", { hostname: hostname.trim(), type: "custom" });
      setHostname("");
      const v = r.data.verification;
      setMessage(v ? `Domain added. Create TXT ${v.host} = ${v.value}, then verify.` : "Domain added.");
      load();
    } catch (e) { setError(e.response?.data?.message || "Unable to add domain."); }
    finally { setBusy(""); }
  }

  async function verify(id) {
    setBusy(id); setError(""); setMessage("");
    try { await api.post(`/tenants/domains/${id}/verify`); setMessage("Domain verified and activated."); load(); }
    catch (e) { setError(e.response?.data?.message || "Domain verification failed."); }
    finally { setBusy(""); }
  }

  async function primary(id) {
    setBusy(id); setError("");
    try { await api.post(`/tenants/domains/${id}/primary`); load(); }
    catch (e) { setError(e.response?.data?.message || "Unable to set primary domain."); }
    finally { setBusy(""); }
  }

  async function disable(id) {
    setBusy(id); setError("");
    try { await api.post(`/tenants/domains/${id}/disable`); setDisableTarget(null); load(); }
    catch (e) { setError(e.response?.data?.message || "Unable to disable domain."); }
    finally { setBusy(""); }
  }

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-black">Domains</h1>
      <p className="mt-1 text-sm text-slate-500">Connect a custom storefront domain while keeping your existing /shop/slug URL.</p>
    </div>

    {canManage && <section className="card">
      <div className="flex items-center gap-3"><Globe2 size={20}/><div><h2 className="font-black">Add custom domain</h2><p className="text-sm text-slate-500">Example: shop.example.com or example.com</p></div></div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input className="input flex-1" value={hostname} onChange={e => setHostname(e.target.value)} placeholder="yourbrand.com" />
        <button className="btn-primary" disabled={busy==="add"} onClick={add}><Plus size={17}/>{busy==="add" ? "Adding..." : "Add domain"}</button>
      </div>
      <p className="mt-3 text-xs text-slate-500">After adding a custom domain, point DNS to your deployed frontend/API setup and add the generated TXT verification record.</p>
    </section>}

    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

    <section className="card bg-gradient-to-br from-slate-950 to-slate-800 text-white"><h2 className="font-black">How custom domains work</h2><div className="mt-4 grid gap-3 text-sm md:grid-cols-3"><div className="rounded-2xl bg-white/10 p-4"><b>1. Add</b><p className="mt-1 text-white/70">Enter your brand domain.</p></div><div className="rounded-2xl bg-white/10 p-4"><b>2. DNS</b><p className="mt-1 text-white/70">Point the domain to your deployed storefront and add the TXT verification record.</p></div><div className="rounded-2xl bg-white/10 p-4"><b>3. Verify</b><p className="mt-1 text-white/70">Verify it here, then choose it as your primary store address.</p></div></div></section>

    <section className="card">
      <h2 className="font-black">Connected domains</h2>
      {loading ? <p className="mt-4 text-sm text-slate-500">Loading...</p> :
        domains.length === 0 ? <p className="mt-4 text-sm text-slate-500">No custom domains connected yet.</p> :
        <div className="mt-4 grid gap-3">
          {domains.map(d => <div key={d._id} className="rounded-2xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-bold">{d.hostname}{d.isPrimary && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800"><Star size={11} className="mr-1 inline"/>Primary</span>}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">{d.type} · {d.status}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {d.status === "pending" && canManage && <button className="btn-soft" disabled={busy===d._id} onClick={() => verify(d._id)}><ShieldCheck size={16}/>Verify DNS</button>}
                {d.status === "active" && !d.isPrimary && canManage && <button className="btn-soft" disabled={busy===d._id} onClick={() => primary(d._id)}><CheckCircle2 size={16}/>Set primary</button>}
                {d.status !== "disabled" && canManage && <button className="btn-soft text-red-600" disabled={busy===d._id} onClick={() => setDisableTarget(d)}><Trash2 size={16}/>Disable</button>}
                <button className="btn-soft" onClick={() => navigator.clipboard?.writeText(d.hostname)} title="Copy hostname"><Copy size={16}/></button>
              </div>
            </div>
          </div>)}
        </div>}
    </section>
  <ConfirmModal open={Boolean(disableTarget)} title="Disable domain?" message={disableTarget ? `Disable ${disableTarget.hostname}? Customers will no longer resolve this domain to the store.` : ""} confirmText="Disable domain" danger busy={Boolean(busy)} onConfirm={()=>disable(disableTarget?._id)} onClose={()=>!busy&&setDisableTarget(null)}/>
  </div>;
}
