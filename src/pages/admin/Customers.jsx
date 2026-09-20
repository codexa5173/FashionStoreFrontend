import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2, X, Eye, MessageCircle, Tag, UsersRound, Gift } from "lucide-react";
import api from "../../lib/api";
import { cachedGet, cacheClearPrefix } from "../../lib/cache";
import ConfirmModal from "../../components/ConfirmModal";
import { money } from "../../lib/utils";
import { Link } from "react-router-dom";

const empty = { name: "", phone: "", whatsapp: "", email: "", address: "", notes: "", tags: [], followUpAt: "", followUpNote: "", birthday: "", anniversary: "" };

export default function Customers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [show, setShow] = useState(false);
  const [alert, setAlert] = useState({ open: false, title: "", message: "", id: null });
  const [detail, setDetail] = useState(null);

  async function load() {
    setBusy(true);
    try {
      const r = await cachedGet(api,`/customers?q=${encodeURIComponent(q)}&page=1&limit=100`,{key:`customers:admin:${q}`,revalidate:true});
      setItems(r.data?.items || []);
    } catch (e) {
      setAlert({ open: true, title: "Could not load customers", message: e.response?.data?.message || "Please try again.", id: null });
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]);

  function openNew() { setEditing(null); setForm(empty); setShow(true); }
  function openEdit(c) {
    setEditing(c._id);
    setForm({ name: c.name || "", phone: c.phone || "", whatsapp: c.whatsapp || "", email: c.email || "", address: c.address || "", notes: c.notes || "", tags: c.tags || [], followUpAt: c.followUpAt ? new Date(c.followUpAt).toISOString().slice(0, 16) : "", followUpNote: c.followUpNote || "", birthday: c.birthday ? new Date(c.birthday).toISOString().slice(0,10) : "", anniversary: c.anniversary ? new Date(c.anniversary).toISOString().slice(0,10) : "" });
    setShow(true);
  }

  async function save(e) {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) await api.put(`/customers/${editing}`, form);
      else await api.post("/customers", form);
      await cacheClearPrefix("customers:"); await cacheClearPrefix("customer:");
      setShow(false); setForm(empty); setEditing(null); await load();
    } catch (e) {
      setAlert({ open: true, title: "Could not save customer", message: e.response?.data?.message || "Please check the details.", id: null });
    } finally { setBusy(false); }
  }

  async function openDetail(id) {
    try {
      const r = await cachedGet(api,`/customers/${id}`,{key:`customer:admin:${id}`,revalidate:true});
      setDetail(r.data);
    } catch (e) {
      setAlert({ open: true, title: "Could not load customer", message: e.response?.data?.message || "Please try again.", id: null });
    }
  }

  function whatsappUrl(phone) {
    const digits = String(phone || "").replace(/\\D/g, "");
    return digits ? `https://wa.me/${digits}` : "#";
  }

  async function remove() {
    const id = alert.id;
    try { await api.delete(`/customers/${id}`); await cacheClearPrefix("customers:"); await cacheClearPrefix("customer:"); setAlert({ open: false, title: "", message: "", id: null }); await load(); }
    catch (e) { setAlert({ open: true, title: "Cannot delete customer", message: e.response?.data?.message || "Please try again.", id }); }
  }

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black">Customers</h1><p className="mt-1 text-sm text-slate-500">Customer profiles and purchase history for this store.</p></div>
      <div className="flex gap-2"><Link className="btn-soft" to="/admin/customers/crm"><UsersRound size={18}/> CRM</Link><Link className="btn-soft" to="/admin/loyalty"><Gift size={18}/> Loyalty</Link><button className="btn-primary" onClick={openNew}><Plus size={18}/> Add Customer</button></div>
    </div>

    <div className="mt-6 card p-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone or email..." className="w-full rounded-2xl bg-slate-100 py-3 pl-10 pr-4"/>
      </div>
    </div>

    <div className="mt-5 card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Customer</th><th className="p-4">Phone</th><th className="p-4">Orders</th><th className="p-4">Spent</th><th className="p-4">Due</th><th className="p-4">Returns</th><th className="p-4">Last Purchase</th><th className="p-4"></th></tr></thead>
          <tbody>
            {items.map(c => <tr key={c._id} className="border-t">
              <td className="p-4"><div className="font-black">{c.name}</div>{c.email && <div className="text-xs text-slate-500">{c.email}</div>}</td>
              <td className="p-4">{c.phone}</td>
              <td className="p-4">{c.totalOrders || 0}</td>
              <td className="p-4 font-black">{money(c.totalSpent || 0)}</td>
              <td className="p-4 font-black text-amber-700">{money(c.dueAmount || 0)}</td>
              <td className="p-4">{money(c.totalReturnAmount || 0)}</td>
              <td className="p-4 text-slate-500">{c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString() : "—"}</td>
              <td className="p-4"><div className="flex justify-end gap-2"><button className="btn-soft" title="View customer" onClick={() => openDetail(c._id)}><Eye size={16}/></button><button className="btn-soft" title="WhatsApp" onClick={() => window.open(whatsappUrl(c.whatsapp || c.phone), "_blank")}><MessageCircle size={16}/></button><button className="btn-soft" onClick={() => openEdit(c)}><Pencil size={16}/></button><button className="btn-soft text-red-600" onClick={() => setAlert({ open: true, title: "Delete customer?", message: `${c.name} will be removed if they have no sales history.`, id: c._id })}><Trash2 size={16}/></button></div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!busy && !items.length && <div className="p-10 text-center text-sm text-slate-400">No customers found.</div>}
      {busy && <div className="p-6 text-center text-sm text-slate-400">Loading...</div>}
    </div>

    {show && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <form onSubmit={save} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black">{editing ? "Edit Customer" : "Add Customer"}</h2><button type="button" onClick={() => setShow(false)}><X/></button></div>
        <div className="mt-5 grid gap-3">
          <input required value={form.name} onChange={e => setForm(v => ({...v,name:e.target.value}))} placeholder="Customer name" className="rounded-2xl bg-slate-100 p-3"/>
          <input required value={form.phone} onChange={e => setForm(v => ({...v,phone:e.target.value}))} placeholder="Phone number" className="rounded-2xl bg-slate-100 p-3"/>
          <input value={form.whatsapp} onChange={e => setForm(v => ({...v,whatsapp:e.target.value}))} placeholder="WhatsApp number (optional)" className="rounded-2xl bg-slate-100 p-3"/>
          <input type="email" value={form.email} onChange={e => setForm(v => ({...v,email:e.target.value}))} placeholder="Email (optional)" className="rounded-2xl bg-slate-100 p-3"/>
          <input value={(form.tags || []).join(", ")} onChange={e => setForm(v => ({...v,tags:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)}))} placeholder="Tags: VIP, Regular, Festival Buyer" className="rounded-2xl bg-slate-100 p-3"/>
          <textarea value={form.address} onChange={e => setForm(v => ({...v,address:e.target.value}))} placeholder="Address (optional)" rows="2" className="rounded-2xl bg-slate-100 p-3"/>
          <textarea value={form.notes} onChange={e => setForm(v => ({...v,notes:e.target.value}))} placeholder="Notes (optional)" rows="2" className="rounded-2xl bg-slate-100 p-3"/>\n          <div className="grid grid-cols-2 gap-3"><input type="date" value={form.birthday} onChange={e => setForm(v => ({...v,birthday:e.target.value}))} placeholder="Birthday" className="rounded-2xl bg-slate-100 p-3"/><input type="date" value={form.anniversary} onChange={e => setForm(v => ({...v,anniversary:e.target.value}))} placeholder="Anniversary" className="rounded-2xl bg-slate-100 p-3"/></div><div className="grid grid-cols-2 gap-3"><input type="datetime-local" value={form.followUpAt} onChange={e => setForm(v => ({...v,followUpAt:e.target.value}))} className="rounded-2xl bg-slate-100 p-3"/><input value={form.followUpNote} onChange={e => setForm(v => ({...v,followUpNote:e.target.value}))} placeholder="Follow-up note" className="rounded-2xl bg-slate-100 p-3"/></div>
        </div>
        <button disabled={busy} className="btn-primary mt-5 w-full justify-center">{busy ? "Saving..." : editing ? "Save Changes" : "Create Customer"}</button>
      </form>
    </div>}

    {detail && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto my-8 w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-2xl font-black">{detail.customer?.name}</h2><p className="text-sm text-slate-500">{detail.customer?.phone}{detail.customer?.whatsapp ? ` · WhatsApp ${detail.customer.whatsapp}` : ""}</p></div>
          <button onClick={() => setDetail(null)}><X/></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[["Orders", detail.customer?.computed?.orderCount || 0],["Spent", money(detail.customer?.computed?.grossSpent || 0)],["Paid", money(detail.customer?.computed?.paid || 0)],["Due", money(detail.customer?.computed?.due || 0)],["Returns", money(detail.customer?.computed?.returns || 0)]].map(([k,v]) => <div key={k} className="rounded-2xl bg-slate-50 p-4"><div className="text-xs uppercase text-slate-500">{k}</div><div className="mt-1 text-lg font-black">{v}</div></div>)}
        </div>
        {!!detail.customer?.tags?.length && <div className="mt-5 flex flex-wrap gap-2">{detail.customer.tags.map(t => <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold"><Tag className="mr-1 inline" size={13}/>{t}</span>)}</div>}
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Due</th><th className="p-3">Status</th></tr></thead><tbody>{(detail.orders || []).map(o => <tr key={o._id} className="border-t"><td className="p-3 font-bold">{o.orderNumber}</td><td className="p-3">{new Date(o.createdAt).toLocaleDateString()}</td><td className="p-3">{o.items?.reduce((n,i)=>n+(i.quantity||0),0)}</td><td className="p-3 font-bold">{money(o.finalTotal)}</td><td className="p-3">{money(o.dueAmount || 0)}</td><td className="p-3">{o.paymentStatus}</td></tr>)}</tbody></table></div>
      </div>
    </div>}

    <ConfirmModal open={alert.open} title={alert.title} message={alert.message} confirmText="Delete" onConfirm={remove} onClose={() => setAlert({ open:false,title:"",message:"",id:null })} danger/>
  </div>;
}
