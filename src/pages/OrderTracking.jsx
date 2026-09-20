import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Search, PackageSearch, Copy, ExternalLink } from "lucide-react";
import api from "../lib/api";
import { money } from "../lib/utils";
import { useStore } from "../context/StoreContext";
import SEO from "../components/SEO";

const statuses = ["pending","confirmed","processing","packed","shipped","out_for_delivery","delivered"];

export default function OrderTracking() {
  const { store } = useStore();
  const { token } = useParams();
  const [form, setForm] = useState({ orderNumber: "", phone: "" });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.post("/orders/track", { token })
      .then(r => setOrder(r.data.order))
      .catch(e => setError(e.response?.data?.message || "Order not found."))
      .finally(() => setLoading(false));
  }, [token]);

  async function search(e) {
    e.preventDefault(); setError(""); setOrder(null); setLoading(true);
    try { const r = await api.post("/orders/track", form); setOrder(r.data.order); }
    catch(e) { setError(e.response?.data?.message || "Order not found."); }
    finally { setLoading(false); }
  }

  const courierAssigned = Boolean(order?.deliveryTracking?.trackingId);
  async function copyTrackingId() { if (!order?.deliveryTracking?.trackingId) return; try { await navigator.clipboard.writeText(order.deliveryTracking.trackingId); } catch {} }
  return <div className="container-app py-10">
    <SEO title={`Track Order | ${store?.settings?.shopName || "Fashion Store"}`} description="Track your online order."/>
    <div className="mx-auto max-w-3xl">
      <div className="text-center"><PackageSearch className="mx-auto" size={48}/><h1 className="mt-4 text-3xl font-black">Track Your Order</h1><p className="mt-2 text-slate-500">Use the secure Track Order link from My Orders. For manual lookup, enter the Order ID and phone number.</p></div>
      {!token && <form onSubmit={search} className="card mt-7 p-5"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input className="input" required placeholder="Order ID e.g. NC-ONL-..." value={form.orderNumber} onChange={e=>setForm(v=>({...v,orderNumber:e.target.value}))}/><input className="input" required placeholder="Phone number" value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/><button className="btn-primary justify-center" disabled={loading}><Search size={17}/>{loading ? "Searching..." : "Track"}</button></div>{error&&<p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}</form>}
      {order && <div className="card mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-400">Order ID</p><h2 className="text-2xl font-black">{order.orderNumber}</h2></div>{!courierAssigned && <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold capitalize">{String(order.fulfillmentStatus).replaceAll("_"," ")}</span>}</div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><div><div className="text-xs font-bold text-slate-400">Delivery</div><p className="mt-1 text-sm">{[order.delivery?.addressLine1,order.delivery?.addressLine2,order.delivery?.landmark,order.delivery?.city,order.delivery?.state,order.delivery?.postalCode,order.delivery?.country].filter(Boolean).join(", ")}</p></div><div><div className="text-xs font-bold text-slate-400">Contact</div><p className="mt-1 text-sm">{order.customerName}<br/>{order.customerPhone}{order.contact?.email&&<><br/>{order.contact.email}</>}</p></div></div>
        {!courierAssigned ? <div className="mt-7"><div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">The shop is preparing your order. Courier tracking will become the delivery-status source once a tracking ID is assigned.</div><div className="mt-4 grid grid-cols-7 gap-1">{statuses.map((st,i)=>{const current=statuses.indexOf(order.fulfillmentStatus); const done=current>=i; return <div key={st} className="text-center"><div className={`mx-auto h-3 w-3 rounded-full ${done?"bg-slate-950":"bg-slate-200"}`}/><div className="mt-2 text-[10px] capitalize text-slate-500">{st.replaceAll("_"," ")}</div></div>})}</div></div> : <div className="mt-7 rounded-2xl bg-emerald-50 p-4"><div className="text-xs font-bold uppercase text-emerald-700">Courier Tracking</div><div className="mt-1 flex flex-wrap items-center gap-2"><b className="font-black">{order.deliveryTracking.trackingId}</b><button type="button" className="btn-soft px-3 py-2 text-sm" onClick={copyTrackingId}><Copy size={15}/> Copy tracking ID</button></div>{order.deliveryTracking.courierName&&<div className="mt-1 text-sm text-slate-600">{order.deliveryTracking.courierName}</div>}{order.deliveryTracking.trackingUrl&&<a className="btn-primary mt-3 inline-flex" href={order.deliveryTracking.trackingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Open courier tracking</a>}<p className="mt-2 text-xs font-semibold text-emerald-800">This tracking link is provided by the courier and opens on the courier website. It is not connected to this store URL.</p><p className="mt-1 text-xs font-semibold text-emerald-800">Use this Tracking ID on the courier website if the courier provides a separate tracking search. You can also copy it and send it to the customer on WhatsApp.</p></div>}
        <div className="mt-6 border-t pt-4">{order.items?.map((i,n)=><div key={n} className="flex justify-between py-2 text-sm"><span>{i.name} × {i.quantity} {i.size||i.color?`(${[i.size,i.color].filter(Boolean).join(" / ")})`:""}</span><b>{money(i.lineTotal)}</b></div>)}<div className="mt-2 flex justify-between border-t pt-3 text-lg font-black"><span>Total</span><span>{money(order.finalTotal)}</span></div></div>
        <p className="mt-5 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-slate-700">Online orders cannot be returned or cancelled after submission. {order.returnPolicy?.snapshot || "For assistance, please visit the store."}</p>
      </div>}
    </div>
  </div>;
}
