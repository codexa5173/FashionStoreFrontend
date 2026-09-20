import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api, { setTenantSlug } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ shopName: "", slug: "", username: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (admin) return <Navigate to="/admin" replace />;

  const update = (key, value) => setForm(v => ({ ...v, [key]: value }));
  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const r = await api.post("/auth/register", form);
      if (r.data.admin?.tenant?.slug) setTenantSlug(r.data.admin.tenant.slug);
      window.location.href = "/admin";
    } catch (err) {
      setError(err.response?.data?.message || "Could not create your store.");
    } finally { setBusy(false); }
  }

  return <div className="grid min-h-[80vh] place-items-center px-4 py-10">
    <form onSubmit={submit} className="card w-full max-w-lg p-8">
      <div className="text-4xl">👗</div>
      <h1 className="mt-4 text-3xl font-black">Create your fashion store</h1>
      <p className="mt-1 text-slate-500">Start a 14-day trial and get your own store workspace.</p>
      {error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <label className="mt-6 block text-sm font-bold">Shop name
        <input required value={form.shopName} onChange={e => update("shopName", e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="Aarohi Fashion" />
      </label>
      <label className="mt-4 block text-sm font-bold">Store URL slug
        <input value={form.slug} onChange={e => update("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="aarohi-fashion" />
        <span className="mt-1 block text-xs font-normal text-slate-500">Your public store: /shop/{form.slug || "your-store"}</span>
      </label>
      <label className="mt-4 block text-sm font-bold">Owner username
        <input required value={form.username} onChange={e => update("username", e.target.value.toLowerCase())} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="owner" />
      </label>
      <label className="mt-4 block text-sm font-bold">Password
        <div className="relative mt-2">
          <input required minLength={8} type={show ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)} className="w-full rounded-2xl bg-slate-100 p-3 pr-12" />
          <button type="button" onClick={() => setShow(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
        </div>
      </label>
      <button disabled={busy} className="btn-primary mt-6 w-full">{busy ? "Creating store..." : "Create store"}</button>
      <p className="mt-5 text-center text-sm text-slate-500">Already have a store? <Link className="font-bold text-slate-900" to="/admin/login">Sign in</Link></p>
    </form>
  </div>;
}
