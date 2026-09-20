import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2, Wallet, X } from "lucide-react";
import RefreshButton from "../../components/RefreshButton";
import api from "../../lib/api";
import { money } from "../../lib/utils";
import ConfirmModal from "../../components/ConfirmModal";

const CATEGORIES = ["Rent","Electricity","Salary","Transport","Packaging","Marketing","Internet","Maintenance","Miscellaneous"];
const METHODS = ["Cash","UPI","Card","Bank Transfer","Credit","Other"];

function iso(d) { return d.toISOString().slice(0, 10); }
function defaultDates() {
  const end = new Date(), start = new Date();
  start.setDate(end.getDate() - 29);
  return { start: iso(start), end: iso(end) };
}
const empty = { category: "Miscellaneous", amount: "", description: "", date: iso(new Date()), paymentMethod: "Cash" };

export default function Expenses() {
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState({ items: [], total: 0, summary: { total: 0, count: 0 }, categories: [] });
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [show, setShow] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState({ open: false, id: null, title: "", message: "" });

  async function load() {
    setLoading(true); setError("");
    try {
      const r = await api.get("/expenses", {
        params: { ...dates, page: 1, limit: 100, q, category, paymentMethod }
      });
      setData(r.data || {});
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load expenses.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [dates.start, dates.end, q, category, paymentMethod]);

  function openNew() {
    setEditing(null);
    setForm({ ...empty, date: iso(new Date()) });
    setShow(true);
  }

  function openEdit(x) {
    setEditing(x._id);
    setForm({
      category: x.category || "Miscellaneous",
      amount: x.amount ?? "",
      description: x.description || "",
      date: x.date ? iso(new Date(x.date)) : iso(new Date()),
      paymentMethod: x.paymentMethod || "Cash"
    });
    setShow(true);
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (editing) await api.put(`/expenses/${editing}`, form);
      else await api.post("/expenses", form);
      setShow(false); setEditing(null); setForm(empty);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Unable to save expense.");
    } finally { setSaving(false); }
  }

  async function remove() {
    try {
      await api.delete(`/expenses/${confirm.id}`);
      setConfirm({ open: false, id: null, title: "", message: "" });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Unable to delete expense.");
      setConfirm({ open: false, id: null, title: "", message: "" });
    }
  }

  const categoryTotal = useMemo(() => data.categories || [], [data]);

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-black">Expenses</h1>
        <p className="mt-1 text-sm text-slate-500">Track operating expenses and understand your real net profit.</p>
      </div>
      <button className="btn-primary" onClick={openNew}><Plus size={18}/> Add Expense</button>
    </div>

    <div className="mt-6 card p-4">
      <div className="grid gap-3 md:grid-cols-5">
        <label className="text-sm font-semibold">From<input type="date" className="input mt-1" value={dates.start} onChange={e => setDates(x => ({...x, start: e.target.value}))}/></label>
        <label className="text-sm font-semibold">To<input type="date" className="input mt-1" value={dates.end} onChange={e => setDates(x => ({...x, end: e.target.value}))}/></label>
        <input className="input self-end" placeholder="Search category or description" value={q} onChange={e => setQ(e.target.value)}/>
        <select className="input self-end" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select>
        <select className="input self-end" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option value="">All payments</option>{METHODS.map(x=><option key={x}>{x}</option>)}</select>
      </div>
    </div>

    {error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="card p-5"><Wallet size={20}/><div className="mt-3 text-2xl font-black">{money(data.summary?.total || 0)}</div><div className="text-sm text-slate-500">Expenses in selected period</div></div>
      <div className="card p-5"><div className="text-sm text-slate-500">Expense entries</div><div className="mt-2 text-2xl font-black">{data.summary?.count || 0}</div></div>
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-3">
      <div className="card overflow-hidden lg:col-span-2">
        <div className="flex items-center justify-between border-b p-4"><h2 className="font-black">Expense Ledger</h2><RefreshButton onClick={load} busy={loading}/></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Date</th><th className="p-4">Category</th><th className="p-4">Description</th><th className="p-4">Payment</th><th className="p-4">Amount</th><th className="p-4"></th></tr></thead>
            <tbody>
              {data.items?.map(x => <tr key={x._id} className="border-t">
                <td className="p-4">{new Date(x.date).toLocaleDateString()}</td>
                <td className="p-4 font-semibold">{x.category}</td>
                <td className="p-4 text-slate-500">{x.description || "—"}</td>
                <td className="p-4">{x.paymentMethod}</td>
                <td className="p-4 font-black">{money(x.amount)}</td>
                <td className="p-4"><div className="flex justify-end gap-2"><button className="btn-soft" onClick={() => openEdit(x)}><Pencil size={15}/></button><button className="btn-soft text-red-600" onClick={() => setConfirm({open:true,id:x._id,title:"Delete expense?",message:`Delete ${x.category} expense of ${money(x.amount)}?`})}><Trash2 size={15}/></button></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        {!loading && !data.items?.length && <div className="p-10 text-center text-sm text-slate-400">No expenses found for the selected filters.</div>}
        {loading && <div className="p-6 text-center text-sm text-slate-400">Loading...</div>}
      </div>

      <div className="card p-5">
        <h2 className="font-black">By Category</h2>
        <div className="mt-4 space-y-3">
          {categoryTotal.map(x => <div key={x.category} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>{x.category}</span><b>{money(x.amount)}</b></div>)}
          {!categoryTotal.length && <p className="text-sm text-slate-500">No category totals yet.</p>}
        </div>
      </div>
    </div>

    {show && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <form onSubmit={save} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black">{editing ? "Edit Expense" : "Add Expense"}</h2><button type="button" onClick={() => setShow(false)}><X/></button></div>
        <div className="mt-5 grid gap-3">
          <label className="text-sm font-semibold">Category<select className="input mt-1" value={form.category} onChange={e => setForm(v=>({...v,category:e.target.value}))}>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="text-sm font-semibold">Amount<input required min="0.01" step="0.01" type="number" className="input mt-1" value={form.amount} onChange={e => setForm(v=>({...v,amount:e.target.value}))}/></label>
          <label className="text-sm font-semibold">Date<input required type="date" className="input mt-1" value={form.date} onChange={e => setForm(v=>({...v,date:e.target.value}))}/></label>
          <label className="text-sm font-semibold">Payment Method<select className="input mt-1" value={form.paymentMethod} onChange={e => setForm(v=>({...v,paymentMethod:e.target.value}))}>{METHODS.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="text-sm font-semibold">Description<textarea className="input mt-1" rows="3" value={form.description} onChange={e => setForm(v=>({...v,description:e.target.value}))} placeholder="Optional note"/></label>
        </div>
        <button disabled={saving} className="btn-primary mt-5 w-full justify-center">{saving ? "Saving..." : editing ? "Save Changes" : "Add Expense"}</button>
      </form>
    </div>}

    <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} confirmText="Delete" onConfirm={remove} onClose={() => setConfirm({open:false,id:null,title:"",message:""})} danger/>
  </div>;
}
