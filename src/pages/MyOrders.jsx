import { useState } from "react";
import { Link } from "react-router-dom";
import { PackageSearch, Search } from "lucide-react";
import api from "../lib/api";
import { money } from "../lib/utils";
import { storePath, useStore } from "../context/StoreContext";

export default function MyOrders() {
  const { tenantSlug, store, isTenantDomain } = useStore();
  const [orderNumber, setOrderNumber] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const path = (p) => storePath(tenantSlug, p, isTenantDomain);

  async function search(e) {
    e.preventDefault();
    setError(""); setOrders([]);
    if (!orderNumber.trim()) return setError("Enter your Order ID.");
    setLoading(true);
    try {
      const r = await api.post("/orders/my-orders", { orderNumber: orderNumber.trim() });
      const found = r.data?.orders || [];
      setOrders(found);
      if (!found.length) setError("No online order was found for that Order ID. Check the number and try again.");
    } catch (e) { setError(e.response?.data?.message || "Could not find the order."); }
    finally { setLoading(false); }
  }

  return <div className="container-app py-8 sm:py-12">
    <div className="mx-auto max-w-4xl">
      <div className="text-center"><PackageSearch className="mx-auto" size={44}/><h1 className="mt-3 text-3xl font-black">My Orders</h1><p className="mt-2 text-sm text-slate-500">Enter your Order ID to find your online order. Each result has one Track Order button.</p></div>
      <form onSubmit={search} className="card mx-auto mt-6 flex flex-col gap-3 p-5 sm:flex-row">
        <input className="input flex-1" required placeholder="Order ID e.g. NC-ONL-20260920-ABC123" value={orderNumber} onChange={e=>setOrderNumber(e.target.value)}/>
        <button className="btn-primary justify-center" disabled={loading}><Search size={17}/>{loading ? "Finding..." : "Find order"}</button>
      </form>
      {error && <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900"><b>How to track:</b> enter your Order ID, find your order, then tap <b>Track Order</b>. If a courier tracking ID has been assigned, the tracking page will show the courier link and tracking code.</div><div className="mt-6 grid gap-4">{orders.map(o=><div className="card p-5" key={o.id || o._id || o.orderNumber}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase text-slate-400">Order ID</div><h2 className="text-xl font-black">{o.orderNumber}</h2><div className="mt-1 text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()}</div></div>{!o.deliveryTracking?.trackingId && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">{String(o.fulfillmentStatus).replaceAll("_"," ")}</span>}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><div><div className="text-xs text-slate-400">Customer</div><div className="font-bold">{o.customerName}</div></div><div><div className="text-xs text-slate-400">Items</div><div className="font-bold">{o.items?.reduce((n,i)=>n+i.quantity,0) || 0} items</div></div><div><div className="text-xs text-slate-400">Total</div><div className="font-black">{money(o.finalTotal)}</div></div></div>
        <Link className="btn-primary mt-5 w-full justify-center sm:w-auto" to={o.publicTrackingToken ? path(`/track-order/${o.publicTrackingToken}`) : path(`/track-order?orderNumber=${encodeURIComponent(o.orderNumber)}`)}>Track order</Link>
      </div>)}</div>
    </div>
  </div>;
}
