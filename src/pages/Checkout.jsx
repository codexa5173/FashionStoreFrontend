import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Minus, Plus, Trash2 } from "lucide-react";
import api from "../lib/api";
import { money } from "../lib/utils";
import { useCart } from "../context/CartContext";
import { storePath, useStore } from "../context/StoreContext";
import SEO from "../components/SEO";

const RETURN_POLICY = "Online orders are not eligible for returns. Please visit the store for assistance.";

export default function Checkout() {
  const { items, subtotal, updateQuantity, removeItem, clear } = useCart();
  const { tenantSlug, store, loading: storeLoading } = useStore();
  const [form, setForm] = useState({ name:"", phone:"", email:"", whatsapp:"", addressLine1:"", addressLine2:"", landmark:"", city:"", state:"", postalCode:"", country:"India", instructions:"", accepted:false });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`noorie:checkout:${tenantSlug || "default"}`) || "null");
      if (saved) setForm(v => ({ ...v, ...saved, accepted:false }));
    } catch {}
  }, [tenantSlug]);

  const set = (key, value) => setForm(v => ({ ...v, [key]: value }));

  async function placeOrder(e) {
    e.preventDefault();
    setError("");
    if (!items.length) return setError("Your cart is empty.");
    if (!form.accepted) return setError("Please accept the Terms, Privacy Policy and online no-return policy.");
    setPlacing(true);
    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    try {
      localStorage.setItem(`noorie:checkout:${tenantSlug || "default"}`, JSON.stringify({ ...form, accepted:false }));
      const r = await api.post("/orders/online", {
        customerName: form.name, customerPhone: form.phone, email: form.email, whatsapp: form.whatsapp,
        delivery: { addressLine1:form.addressLine1, addressLine2:form.addressLine2, landmark:form.landmark, city:form.city, state:form.state, postalCode:form.postalCode, country:form.country, instructions:form.instructions },
        items: items.map(i => ({ product:i.product, variant:i.variant, quantity:i.quantity })),
        paymentMethod: "PENDING", acceptedTerms:true, idempotencyKey
      });
      setResult(r.data.order);
      clear();
    } catch (e) {
      setError(e.response?.data?.message || "Could not place the order. Please try again.");
    } finally { setPlacing(false); }
  }

  if (result) return <div className="container-app py-12"><SEO title={`Order ${result.orderNumber}`} description="Your online order details."/>
    <div className="mx-auto max-w-2xl card p-7 text-center sm:p-10">
      <CheckCircle2 className="mx-auto text-emerald-600" size={58}/>
      <p className="mt-4 text-sm font-bold uppercase tracking-wider text-emerald-700">Order placed</p>
      <h1 className="mt-2 text-3xl font-black">{result.orderNumber}</h1>
      <p className="mt-3 text-slate-600">Keep this Order ID. We will contact you for payment. Once payment is confirmed, processing will start.</p><p className="mt-2 text-sm font-semibold text-rose-700">Online orders cannot be returned or cancelled after submission. For assistance, please visit the store.</p>
      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
        <div className="flex justify-between"><span>Total</span><b>{money(result.finalTotal)}</b></div>
        <div className="mt-2 flex justify-between"><span>Status</span><b className="capitalize">{String(result.fulfillmentStatus).replaceAll("_"," ")}</b></div>
      </div>
      <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-left text-sm text-amber-900"><b>Payment & processing:</b> We will contact you for payment. Your order will begin processing after payment is confirmed.</div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to={result.publicTrackingToken ? storePath(tenantSlug, `/track-order/${result.publicTrackingToken}`, store?.resolution?.source === "custom-domain" || store?.resolution?.source === "subdomain") : storePath(tenantSlug, "/track-order")} className="btn-primary">Track Order</Link>
        <Link to={storePath(tenantSlug, "/categories")} className="btn-soft">Continue Shopping</Link>
      </div>
    </div>
  </div>;

  return <div className="container-app py-7 sm:py-10">
    <SEO title={`Checkout | ${store?.settings?.shopName || "Fashion Store"}`} description="Secure online checkout."/>
    <div className="mb-6"><h1 className="text-3xl font-black">Checkout</h1><p className="mt-2 text-sm text-slate-500">Enter delivery details and place your online order.</p></div>
    {!items.length ? <div className="card p-10 text-center"><p className="text-slate-500">Your cart is empty.</p><Link to={storePath(tenantSlug,"/categories")} className="btn-primary mt-5 inline-flex">Browse Collection</Link></div> :
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <form onSubmit={placeOrder} className="space-y-5">
        <section className="card p-5"><h2 className="text-xl font-black">Customer Details</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className="input" required placeholder="Full name" value={form.name} onChange={e=>set("name",e.target.value)}/>
          <input className="input" required placeholder="Phone number" value={form.phone} onChange={e=>set("phone",e.target.value)}/>
          <input className="input" type="email" placeholder="Email address (optional)" value={form.email} onChange={e=>set("email",e.target.value)}/>
          <input className="input" placeholder="WhatsApp number (optional)" value={form.whatsapp} onChange={e=>set("whatsapp",e.target.value)}/>
        </div></section>
        <section className="card p-5"><h2 className="text-xl font-black">Delivery Details</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className="input sm:col-span-2" required placeholder="Address line 1" value={form.addressLine1} onChange={e=>set("addressLine1",e.target.value)}/>
          <input className="input sm:col-span-2" placeholder="Address line 2 (optional)" value={form.addressLine2} onChange={e=>set("addressLine2",e.target.value)}/>
          <input className="input" placeholder="Landmark (optional)" value={form.landmark} onChange={e=>set("landmark",e.target.value)}/>
          <input className="input" required placeholder="City" value={form.city} onChange={e=>set("city",e.target.value)}/>
          <input className="input" required placeholder="State" value={form.state} onChange={e=>set("state",e.target.value)}/>
          <input className="input" required placeholder="PIN / Postal code" value={form.postalCode} onChange={e=>set("postalCode",e.target.value)}/>
          <input className="input" value={form.country} onChange={e=>set("country",e.target.value)} placeholder="Country"/>
          <textarea className="input sm:col-span-2 min-h-24" placeholder="Delivery instructions (optional)" value={form.instructions} onChange={e=>set("instructions",e.target.value)}/>
        </div></section>
        <section className="card border-amber-200 bg-amber-50 p-5"><h2 className="text-xl font-black">Payment</h2><p className="mt-2 text-sm text-slate-700">Payment options are handled by the shop team after you submit this order. We will contact you for payment. <b>Order processing starts after payment is confirmed.</b></p></section>
        <section className="card border-rose-200 bg-rose-50 p-5"><h2 className="font-black">Before you place the order</h2>
          <label className="mt-3 flex items-start gap-3 text-sm"><input type="checkbox" checked={form.accepted} onChange={e=>set("accepted",e.target.checked)} className="mt-1 h-4 w-4" required/><span>I accept the <Link className="font-bold underline" to={storePath(tenantSlug,"/terms")}>Terms & Conditions</Link>, <Link className="font-bold underline" to={storePath(tenantSlug,"/privacy")}>Privacy Policy</Link>, and understand that <b>online orders are not eligible for returns</b>. For assistance, I can visit the store.</span></label>
          <p className="mt-3 text-xs font-semibold text-slate-700">{RETURN_POLICY}</p><p className="mt-2 text-xs font-semibold text-rose-700">Online orders cannot be cancelled after submission. Please review your items and delivery details before placing the order.</p>
        </section>
        {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        <button disabled={placing || storeLoading} className="btn-primary w-full justify-center py-4 text-base">{placing ? "Placing Order..." : "Place Order"}</button>
      </form>
      <aside className="card h-fit p-5 lg:sticky lg:top-24"><h2 className="text-xl font-black">Your Order</h2><div className="mt-4 space-y-3">
        {items.map(i=><div key={i.key} className="flex gap-3 border-b pb-3"><img loading="lazy" src={i.image || "/placeholder.svg"} alt="" className="h-16 w-16 rounded-xl bg-slate-100 object-cover"/><div className="min-w-0 flex-1"><div className="font-bold">{i.name}</div><div className="text-xs text-slate-500">{[i.size,i.color].filter(Boolean).join(" / ") || i.sku}</div><div className="mt-2 flex items-center gap-2"><button type="button" className="rounded-lg bg-slate-100 p-1" onClick={()=>updateQuantity(i.key,i.quantity-1)}><Minus size={14}/></button><span className="min-w-5 text-center text-sm">{i.quantity}</span><button type="button" className="rounded-lg bg-slate-100 p-1" onClick={()=>updateQuantity(i.key,i.quantity+1)}><Plus size={14}/></button><button type="button" className="ml-auto text-slate-400" onClick={()=>removeItem(i.key)}><Trash2 size={16}/></button></div></div><b>{money(i.unitPrice*i.quantity)}</b></div>)}
      </div><div className="mt-5 flex justify-between border-t pt-4 text-lg"><span>Total</span><b>{money(subtotal)}</b></div></aside>
    </div>}
  </div>;
}
