import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import api from "../../lib/api";
import { cachedGet, cacheClearPrefix } from "../../lib/cache";
import { enqueueMutation, isNetworkError, syncOfflineMutations } from "../../lib/offlineQueue";
import { money } from "../../lib/utils";
import ConfirmModal from "../../components/ConfirmModal";

const PAGE_SIZE = 30;

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export default function CreateOrder() {
  const [searchParams] = useSearchParams();
  const onlineMode = searchParams.get("online") === "1" || window.location.pathname.includes("/online-orders/new");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [redeemRate, setRedeemRate] = useState(0);
  const [customerMatches, setCustomerMatches] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [finalTotal, setFinalTotal] = useState("");
  const [finalTotalEdited, setFinalTotalEdited] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentEntries, setPaymentEntries] = useState([{ method: "Cash", amount: "" }]);
  const [idempotencyKey, setIdempotencyKey] = useState(() => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`));
  const [notes, setNotes] = useState("");
  const [delivery, setDelivery] = useState({ addressLine1:"", addressLine2:"", landmark:"", city:"", state:"", postalCode:"", country:"India", instructions:"", email:"" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [alertModal, setAlertModal] = useState({ open: false, title: "", message: "" });
  const tenantKey = String(localStorage.getItem("tenantSlug") || import.meta.env.VITE_TENANT_SLUG || "default").toLowerCase();
  const offlineCartKey = `noorie:offline-pos-cart:${tenantKey}`;

  function showAlert(message, title = "Please check") {
    setAlertModal({ open: true, title, message });
  }

  function closeAlert() {
    setAlertModal({ open: false, title: "", message: "" });
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(offlineCartKey) || "[]");
      if (Array.isArray(saved) && saved.length) setCart(saved);
    } catch {}
  }, [offlineCartKey]);

  useEffect(() => {
    try {
      if (cart.length) localStorage.setItem(offlineCartKey, JSON.stringify(cart));
      else localStorage.removeItem(offlineCartKey);
    } catch {}
  }, [offlineCartKey, cart]);

  async function searchProducts(value = query) {
    setSearching(true);
    try {
      const q = String(value || "").trim();
      const url = `/products/admin/list?page=1&limit=${PAGE_SIZE}${q ? `&q=${encodeURIComponent(q)}` : ""}&available=true`;
      const r = await cachedGet(api, url, { key: `products:admin:offline:${q || "all"}`, allowStale: true });
      setResults(r.data?.items || []);
      if (r.stale) showAlert("You are offline. Showing the last cached product list. New stock changes will be checked when the order syncs.", "Offline mode");
    } catch (e) {
      showAlert(e.response?.data?.message || "Could not search products.", "Search failed");
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => searchProducts(query), query.trim() ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function chooseProduct(product) {
    try {
      const r = await cachedGet(api, `/products/admin/${product._id}`, { key: `product:admin:${product._id}`, allowStale: true });
      setSelectedProduct(r.data || product);
    } catch {
      setSelectedProduct(product);
    }
    setSelectedVariant(null);
    setColor("");
    setSize("");
    setQuantity(1);
  }

  async function searchCustomers(value) {
    const q = String(value || "").trim();
    if (!q) { setCustomerMatches([]); return; }
    setCustomerSearching(true);
    try {
      const r = await api.get(`/customers/search?q=${encodeURIComponent(q)}`);
      setCustomerMatches(r.data?.items || []);
    } catch {
      setCustomerMatches([]);
    } finally { setCustomerSearching(false); }
  }

  async function chooseCustomer(c) {
    setCustomerId(c._id);
    setSelectedCustomer(c);
    setRedeemPoints(0);
    try { const r = await api.get("/loyalty/config"); setRedeemRate(Number(r.data?.redemptionRupeesPerPoint || 0)); } catch { setRedeemRate(0); }
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerMatches([]);
  }

  const activePriceSource = selectedVariant || selectedProduct;
  const productSellingPrice = activePriceSource ? Number(activePriceSource.sellingPrice ?? 0) : 0;
  const productDiscountedPrice = activePriceSource?.discountedPrice != null
    ? Number(activePriceSource.discountedPrice)
    : productSellingPrice;

  function changeAddQuantity(next) {
    const stock = Math.max(1, Number(activePriceSource?.stockQuantity ?? selectedProduct?.stockQuantity ?? 1));
    const value = Math.floor(Number(next));
    setQuantity(Number.isFinite(value) ? Math.max(1, Math.min(stock, value)) : 1);
  }

  function addToCart() {
    if (!selectedProduct) return;
    if (selectedProduct.variantEnabled && !selectedVariant) {
      showAlert("Select a size/color variant before adding this product.", "Variant required");
      return;
    }
    if (!selectedProduct.variantEnabled && selectedProduct.colors?.length && !color) {
      showAlert("Select a color before adding this product.", "Color required");
      return;
    }
    if (!selectedProduct.variantEnabled && selectedProduct.sizes?.length && !size) {
      showAlert("Select a size before adding this product.", "Size required");
      return;
    }

    const qty = Math.floor(Number(quantity));
    const stock = Number(activePriceSource?.stockQuantity ?? selectedProduct.stockQuantity ?? 0);
    if (!Number.isInteger(qty) || qty < 1 || qty > stock) {
      showAlert(`Quantity must be between 1 and ${stock}.`, "Invalid quantity");
      return;
    }

    const key = `${selectedProduct._id}|${selectedVariant?._id || ""}|${color}|${size}`;
    setCart(current => {
      const existing = current.findIndex(x => x.key === key);
      if (existing < 0) {
        return [...current, {
          key,
          product: selectedProduct._id,
          variant: selectedVariant?._id || null,
          name: selectedProduct.name,
          sku: selectedVariant?.sku || selectedProduct.sku,
          color: selectedVariant?.color || color,
          size: selectedVariant?.size || size,
          quantity: qty,
          stockQuantity: stock,
          sellingPrice: productSellingPrice,
          discountedPrice: productDiscountedPrice
        }];
      }
      return current.map((x, i) => i === existing
        ? { ...x, quantity: Math.min(x.quantity + qty, x.stockQuantity) }
        : x
      );
    });
    setSelectedProduct(null);
    setSelectedVariant(null);
    setColor("");
    setSize("");
    setQuantity(1);
  }

  function updateCartQty(key, next) {
    setCart(current => current.map(item => item.key === key
      ? { ...item, quantity: Math.max(1, Math.min(item.stockQuantity, Math.floor(Number(next) || 1))) }
      : item
    ));
  }

  const subtotal = useMemo(
    () => roundMoney(cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0)),
    [cart]
  );

  // Discount already built into the product price: selling price -> discounted price.
  const productDiscount = useMemo(
    () => roundMoney(cart.reduce((sum, item) => {
      return sum + Math.max(0, item.sellingPrice - item.discountedPrice) * item.quantity;
    }, 0)),
    [cart]
  );

  const discountedSubtotal = roundMoney(subtotal - productDiscount);
  const loyaltyDiscountPreview = selectedCustomer ? Math.min(discountedSubtotal, roundMoney(redeemPoints * redeemRate)) : 0;
  const parsedFinal = Number(finalTotal);
  const baseFinal = finalTotal === ""
    ? discountedSubtotal
    : (Number.isFinite(parsedFinal) ? roundMoney(parsedFinal) : 0);
  const effectiveFinal = roundMoney(Math.max(0, baseFinal - loyaltyDiscountPreview));

  // Extra discount is anything reduced after the product's own discounted price.
  const additionalDiscount = roundMoney(Math.max(0, discountedSubtotal - effectiveFinal));
  const totalDiscount = roundMoney(productDiscount + additionalDiscount);

  useEffect(() => {
    if (!cart.length) {
      setFinalTotal("");
      setFinalTotalEdited(false);
      return;
    }

    // Keep the automatic total synced with quantity/cart changes until the
    // admin intentionally edits it. If an edited amount becomes too high
    // after removing items, safely clamp it to the new discounted subtotal.
    setFinalTotal(current => {
      if (!finalTotalEdited) return String(discountedSubtotal);
      const value = Number(current);
      return Number.isFinite(value)
        ? String(roundMoney(Math.min(Math.max(0, value), discountedSubtotal)))
        : String(discountedSubtotal);
    });
  }, [cart.length, discountedSubtotal, finalTotalEdited]);

  useEffect(() => {
    if (paymentEntries.length === 1 && paymentEntries[0].method !== "Credit" && cart.length) {
      setPaymentEntries(current => [{ ...current[0], amount: effectiveFinal }]);
    }
  }, [effectiveFinal, cart.length]);

  function changeFinalTotal(value) {
    setFinalTotalEdited(true);
    setFinalTotal(value);
    if (paymentEntries.length === 1 && paymentEntries[0].method !== "Credit") {
      setPaymentEntries([{ ...paymentEntries[0], amount: value }]);
    }
  }

  function syncPaymentMethod(method) {
    setPaymentMethod(method);
    setPaymentEntries([{ method, amount: method === "Credit" ? 0 : effectiveFinal }]);
  }

  function updatePaymentEntry(index, field, value) {
    setPaymentEntries(current => current.map((entry, i) => i === index ? { ...entry, [field]: field === "amount" ? value : value } : entry));
  }

  function addPaymentEntry() {
    setPaymentEntries(current => [...current, { method: "Cash", amount: "" }]);
  }

  function removePaymentEntry(index) {
    setPaymentEntries(current => current.length <= 1 ? current : current.filter((_, i) => i !== index));
  }

  const paymentReceived = roundMoney(paymentEntries.reduce((sum, p) => sum + (p.method === "Credit" ? 0 : Math.max(0, Number(p.amount) || 0)), 0));
  const paymentDue = roundMoney(Math.max(0, effectiveFinal - paymentReceived));
  const creditAmount = roundMoney(paymentEntries.reduce((sum, p) => sum + (p.method === "Credit" ? Math.max(0, Number(p.amount) || 0) : 0), 0));

  async function createOrder(e) {
    e.preventDefault();
    if (!cart.length) return showAlert("Add at least one product to the cart.", "Cart is empty");

    const total = effectiveFinal;
    if (!Number.isFinite(total) || total < 0 || total > discountedSubtotal) {
      return showAlert(`Final total must be between ₹0 and ${money(discountedSubtotal)}.`, "Invalid final total");
    }

    const cleanedPayments = paymentEntries.map(p => ({
      method: p.method,
      amount: roundMoney(Math.max(0, Number(p.amount) || 0))
    })).filter(p => p.method);

    const received = roundMoney(cleanedPayments.reduce((sum, p) => sum + (p.method === "Credit" ? 0 : p.amount), 0));
    const credit = roundMoney(cleanedPayments.reduce((sum, p) => sum + (p.method === "Credit" ? p.amount : 0), 0));
    const due = roundMoney(Math.max(0, total - received));
    if (received > total) return showAlert("Payment received cannot exceed the invoice total.", "Invalid payment");
    if (due > 0 && !cleanedPayments.some(p => p.method === "Credit")) {
      return showAlert(`There is ${money(due)} still due. Add a Credit payment entry and enter the due amount, or collect the full amount.`, "Balance due");
    }
    if (credit > due) return showAlert(`Credit cannot exceed the balance due of ${money(due)}.`, "Invalid credit");
    if (due > 0 && credit !== due) return showAlert(`Credit should equal the remaining balance of ${money(due)}.`, "Balance due");
    if (due === 0 && credit > 0) return showAlert("Remove Credit because the invoice is fully paid.", "Invalid payment");

    setSaving(true);
    setSuccess(null);
    if (onlineMode) {
      if (String(customerName).trim().length < 2 || String(customerPhone).trim().length < 5) {
        return showAlert("Customer name and phone are required for an online order.", "Customer details required");
      }
      if (!delivery.addressLine1 || !delivery.city || !delivery.state || !delivery.postalCode) {
        return showAlert("Complete the delivery address before creating an online order.", "Delivery address required");
      }
    }

    const payload = {
      customerId: customerId || null,
      customerName,
      customerPhone,
      email: delivery.email,
      paymentMethod: onlineMode ? "COD" : (cleanedPayments.length > 1 ? "Split Payment" : (cleanedPayments[0]?.method || paymentMethod)),
      payments: onlineMode ? [] : cleanedPayments,
      idempotencyKey,
      notes,
      finalTotal: baseFinal,
      loyaltyPoints: onlineMode ? 0 : redeemPoints,
      acceptedTerms: onlineMode ? true : undefined,
      delivery: onlineMode ? delivery : undefined,
      items: cart.map(item => ({
        product: item.product,
        variant: item.variant || null,
        color: item.color,
        size: item.size,
        quantity: item.quantity
      }))
    };
    try {
      if (onlineMode) {
        const r = await api.post("/orders/online/admin", payload);
        setSuccess(r.data);
      } else if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const queued = await enqueueMutation({
          method: "POST",
          url: "/orders",
          data: payload,
          label: `POS order ${customerName || "Walk-in"} · ${money(total)}`,
          idempotencyKey
        });
        setSuccess({ queued: true, orderNumber: `OFFLINE-${queued.id.slice(0, 8).toUpperCase()}`, finalTotal: total, discountAmount: totalDiscount, profit: 0 });
      } else {
        const r = await api.post("/orders", payload);
        await syncOfflineMutations(api).catch(() => {});
        setSuccess(r.data);
      }
      await Promise.all([
        cacheClearPrefix("products:"),
        cacheClearPrefix("product:"),
        cacheClearPrefix("dashboard:")
      ]);
      setCart([]);
      setSelectedProduct(null);
      setQuery("");
      setResults([]);
      setCustomerId("");
      setCustomerMatches([]);
      setCustomerName("");
      setCustomerPhone("");
      setPaymentMethod("Cash");
      setPaymentEntries([{ method: "Cash", amount: "" }]);
      setIdempotencyKey(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
      setNotes("");
      setDelivery({ addressLine1:"", addressLine2:"", landmark:"", city:"", state:"", postalCode:"", country:"India", instructions:"", email:"" });
      setFinalTotal("");
      setFinalTotalEdited(false);
      await searchProducts("");
    } catch (e) {
      if (onlineMode) {
        showAlert(e.response?.data?.message || "Could not create the online order.", "Online order failed");
      } else if (isNetworkError(e)) {
        try {
          const queued = await enqueueMutation({
            method: "POST",
            url: "/orders",
            data: payload,
            label: `POS order ${customerName || "Walk-in"} · ${money(total)}`,
            idempotencyKey
          });
          setSuccess({ queued: true, orderNumber: `OFFLINE-${queued.id.slice(0, 8).toUpperCase()}`, finalTotal: total, discountAmount: totalDiscount, profit: 0 });
          setCart([]);
          setSelectedProduct(null);
          setQuery("");
          setResults([]);
          setCustomerId("");
          setCustomerMatches([]);
          setCustomerName("");
          setCustomerPhone("");
          setPaymentMethod("Cash");
          setPaymentEntries([{ method: "Cash", amount: "" }]);
          setIdempotencyKey(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
          setNotes("");
          setFinalTotal("");
          setFinalTotalEdited(false);
        } catch (queueError) {
          showAlert(queueError?.message || "The connection failed and this order could not be saved locally.", "Offline save failed");
        }
      } else {
        showAlert(e.response?.data?.message || "Could not create order.", "Order could not be created");
      }
      await searchProducts(query);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <h1 className="text-3xl font-black">{onlineMode ? "Create Online Order" : "Create Order"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {onlineMode ? "Create a website-style online order for a customer. Stock is reserved/reduced immediately and payment remains pending until handled by the store." : "Search products, choose variants and quantity, then set the exact sale amount. Product discounts and any extra discount are calculated automatically."}
        </p>
      </div>

      {success && (
        <div className="mt-5 flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 shrink-0" />
          <div>
            <div className="font-black">{success.queued ? `Order ${success.orderNumber} saved offline.` : `${onlineMode ? "Online order" : "Order"} ${success.orderNumber} created successfully.`}</div>
            <div className="mt-1 text-sm">
              Revenue: <b>{money(success.finalTotal)}</b> · Total discount: <b>{money(success.discountAmount || 0)}</b> · {success.queued ? "Will sync when the connection returns." : `Profit: ${money(success.profit || 0)}`}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><div className="font-black">Customer</div><div className="text-xs text-slate-500">Optional for walk-in sales. Select an existing customer to keep purchase history.</div></div>
          {customerId && <button type="button" className="btn-soft" onClick={() => { setCustomerId(""); setCustomerName(""); setCustomerPhone(""); }}>Clear customer</button>}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="relative">
            <input value={customerPhone} onChange={e => { setCustomerPhone(e.target.value); setCustomerId(""); searchCustomers(e.target.value); }} placeholder="Search by phone" className="w-full rounded-2xl bg-slate-100 p-3" />
            {customerMatches.length > 0 && <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-2xl border bg-white p-2 shadow-xl">{customerMatches.map(c => <button type="button" key={c._id} onClick={() => chooseCustomer(c)} className="block w-full rounded-xl p-3 text-left hover:bg-slate-50"><b>{c.name}</b><span className="ml-2 text-xs text-slate-500">{c.phone}</span></button>)}</div>}
          </div>
          <input value={customerName} onChange={e => { setCustomerName(e.target.value); setCustomerId(""); }} placeholder="Customer name" className="w-full rounded-2xl bg-slate-100 p-3" />
        </div>
        {customerSearching && <div className="mt-2 text-xs text-slate-400">Searching customers...</div>}
        {selectedCustomer && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-black">Loyalty balance: {Number(selectedCustomer.loyaltyPointsBalance || 0)} points</div><div className="text-xs text-slate-600">Redeem points as an additional discount on this bill.</div></div><label className="text-sm font-bold">Use points<input type="number" min="0" max={Number(selectedCustomer.loyaltyPointsBalance || 0)} value={redeemPoints} onChange={e=>setRedeemPoints(Math.max(0, Math.min(Number(selectedCustomer.loyaltyPointsBalance || 0), Math.floor(Number(e.target.value)||0))))} className="input mt-1 w-32"/></label></div></div>}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.9fr]">
        <section className="card p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search product name or SKU..."
                className="w-full rounded-2xl bg-slate-100 py-3 pl-10 pr-3"
              />
            </div>
            <button type="button" onClick={() => searchProducts(query)} className="btn-soft" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="mt-4 max-h-[430px] overflow-y-auto rounded-2xl pr-1">
            <div className="grid gap-2 sm:grid-cols-2">
              {results.map(p => (
                <button
                  type="button"
                  key={p._id}
                  onClick={() => chooseProduct(p)}
                  className={`rounded-2xl border p-3 text-left transition hover:shadow ${selectedProduct?._id === p._id ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}
                >
                  <div className="font-black">{p.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{p.sku} · Stock: {p.stockQuantity ?? 0}</div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-2 font-black">
                    {p.discountedPrice != null ? (
                      <><span>{money(p.discountedPrice)}</span><span className="text-xs font-semibold text-slate-400 line-through">{money(p.sellingPrice)}</span></>
                    ) : <span>{money(p.sellingPrice)}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {!searching && !results.length && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">
              No available products found.
            </div>
          )}

          {selectedProduct && (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-black">{selectedProduct.name}</div>
                  <div className="text-sm text-slate-500">
                    {selectedProduct.sku} · {money(productDiscountedPrice)} each · {selectedProduct.stockQuantity ?? 0} in stock
                  </div>
                </div>
                <button type="button" className="btn-soft" onClick={() => setSelectedProduct(null)}>Close</button>
              </div>

              {selectedProduct.variantEnabled && (
                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                  <div className="text-sm font-black">Choose variant</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(selectedProduct.variants || []).filter(v => v.isAvailable && Number(v.stockQuantity) > 0).map(v => (
                      <button type="button" key={v._id} onClick={() => { setSelectedVariant(v); setColor(v.color || ""); setSize(v.size || ""); setQuantity(1); }}
                        className={`rounded-2xl border p-3 text-left ${selectedVariant?._id === v._id ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                        <div className="font-black">{v.size || "One Size"} {v.color ? `· ${v.color}` : ""}</div>
                        <div className="mt-1 text-xs text-slate-500">{v.sku} · {v.stockQuantity} in stock</div>
                        <div className="mt-1 font-black">{money(v.discountedPrice ?? v.sellingPrice)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {!selectedProduct.variantEnabled && selectedProduct.colors?.length > 0 && (
                  <label className="text-sm font-bold">
                    Color
                    <select value={color} onChange={e => setColor(e.target.value)} className="mt-2 w-full rounded-2xl bg-white p-3 ring-1 ring-black/5">
                      <option value="">Select color</option>
                      {selectedProduct.colors.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </label>
                )}

                {selectedProduct.sizes?.length > 0 && (
                  <label className="text-sm font-bold">
                    Size
                    <select value={size} onChange={e => setSize(e.target.value)} className="mt-2 w-full rounded-2xl bg-white p-3 ring-1 ring-black/5">
                      <option value="">Select size</option>
                      {selectedProduct.sizes.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </label>
                )}

                <div>
                  <div className="text-sm font-bold">Quantity</div>
                  <div className="mt-2 flex h-[50px] items-center justify-between rounded-2xl bg-white p-1 ring-1 ring-black/5">
                    <button type="button" onClick={() => changeAddQuantity(quantity - 1)} disabled={quantity <= 1} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 disabled:opacity-30"><Minus size={17} /></button>
                    <input
                      type="number"
                      min="1"
                      max={selectedProduct.stockQuantity ?? 1}
                      step="1"
                      value={quantity}
                      onChange={e => changeAddQuantity(e.target.value)}
                      className="w-14 bg-transparent text-center font-black outline-none"
                    />
                    <button type="button" onClick={() => changeAddQuantity(quantity + 1)} disabled={quantity >= Number(selectedProduct.stockQuantity ?? 1)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 disabled:opacity-30"><Plus size={17} /></button>
                  </div>
                </div>
              </div>

              <button type="button" onClick={addToCart} className="btn-primary mt-4 w-full sm:w-auto">
                <ShoppingCart size={17} /> Add to Cart
              </button>
            </div>
          )}
        </section>

        <form onSubmit={createOrder} className="card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Cart</h2>
            <span className="badge">{cart.reduce((n, x) => n + x.quantity, 0)} items</span>
          </div>

          {cart.length ? (
            <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1">
              {cart.map((item, index) => {
                const lineGross = roundMoney(item.sellingPrice * item.quantity);
                const lineNet = roundMoney(item.discountedPrice * item.quantity);
                const lineDiscount = roundMoney(Math.max(0, lineGross - lineNet));

                return (
                  <div key={item.key} className="group rounded-3xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-black">{item.name}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{item.sku}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCart(c => c.filter(x => x.key !== item.key))}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${item.name}`}
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {(item.color || item.size) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.color && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">Color: {item.color}</span>}
                            {item.size && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">Size: {item.size}</span>}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quantity</div>
                            <div className="mt-1 flex items-center gap-1 rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-200">
                              <button
                                type="button"
                                className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white disabled:opacity-30"
                                disabled={item.quantity <= 1}
                                onClick={() => updateCartQty(item.key, item.quantity - 1)}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={15} />
                              </button>
                              <input
                                value={item.quantity}
                                onChange={e => updateCartQty(item.key, e.target.value)}
                                className="w-10 bg-transparent text-center text-sm font-black outline-none"
                                inputMode="numeric"
                                aria-label={`Quantity for ${item.name}`}
                              />
                              <button
                                type="button"
                                className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white disabled:opacity-30"
                                disabled={item.quantity >= item.stockQuantity}
                                onClick={() => updateCartQty(item.key, item.quantity + 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                          </div>

                          <div className="ml-auto text-right">
                            {lineDiscount > 0 && <div className="text-xs text-slate-400 line-through">{money(lineGross)}</div>}
                            <div className="text-lg font-black">{money(lineNet)}</div>
                            {lineDiscount > 0 && <div className="text-[11px] font-bold text-emerald-600">Save {money(lineDiscount)}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <ShoppingCart className="mx-auto text-slate-300" size={34} />
              <div className="mt-3 font-black text-slate-600">Your cart is empty</div>
              <div className="mt-1 text-sm text-slate-400">Search for a product and add it to start the bill.</div>
            </div>
          )}

          <div className="mt-5 border-t pt-5">
            <div className="flex justify-between text-sm"><span>Subtotal (Selling Price)</span><b>{money(subtotal)}</b></div>
            {productDiscount > 0 && (
              <>
                <div className="mt-2 flex justify-between text-sm text-emerald-700"><span>Product Discount</span><b>− {money(productDiscount)}</b></div>
                <div className="mt-2 flex justify-between text-sm"><span>After Product Discount</span><b>{money(discountedSubtotal)}</b></div>
              </>
            )}

            <label className="mt-4 block text-sm font-black">
              Final Total / Sale Amount
              <input
                required
                type="number"
                min="0"
                max={discountedSubtotal}
                step="0.01"
                value={finalTotal}
                onChange={e => changeFinalTotal(e.target.value)}
                className="mt-2 w-full rounded-2xl bg-slate-100 p-4 text-xl font-black"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Default is the product-discounted total. If you reduce it further, that difference becomes an additional discount.
              </span>
            </label>

            {(productDiscount > 0 || additionalDiscount > 0) && (
              <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
                {productDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700"><span>Product Discount</span><b>− {money(productDiscount)}</b></div>
                )}
                {additionalDiscount > 0 && (
                  <div className="flex justify-between"><span>Additional Discount</span><b>− {money(additionalDiscount)}</b></div>
                )}
                <div className="flex justify-between border-t pt-2 font-black"><span>Total Discount</span><b>− {money(totalDiscount)}</b></div>
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">
              <div className="flex justify-between text-sm text-slate-300"><span>Gross Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="mt-1 flex justify-between text-sm text-slate-300"><span>Total Discount</span><span>− {money(totalDiscount)}</span></div>
              <div className="mt-2 flex justify-between text-lg font-black"><span>Revenue</span><span>{money(effectiveFinal)}</span></div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-black">Payment</div>
                  <div className="text-xs text-slate-500">Enter the amount received. If there is a balance, add Credit and enter the exact due amount.</div>
                </div>
                {paymentEntries.length < 4 && (
                  <button type="button" className="btn-soft" onClick={addPaymentEntry}>+ Split</button>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {paymentEntries.map((entry, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <select
                      value={entry.method}
                      onChange={e => {
                        const method = e.target.value;
                        setPaymentMethod(method);
                        setPaymentEntries(current => current.map((p, i) => i === index
                          ? { ...p, method, amount: method === "Credit" ? paymentDue : (current.length === 1 ? effectiveFinal : p.amount) }
                          : p
                        ));
                      }}
                      className="rounded-2xl bg-slate-100 p-3"
                    >
                      {["Cash", "UPI", "Card", "Bank Transfer", "Credit", "Other"].map(x => <option key={x}>{x}</option>)}
                    </select>
                    <input
                      type="number"
                      min="0"
                      max={effectiveFinal}
                      step="0.01"
                      disabled={false}
                      value={entry.amount}
                      onChange={e => updatePaymentEntry(index, "amount", e.target.value)}
                      placeholder="Amount / credit due"
                      className="rounded-2xl bg-slate-100 p-3"
                    />
                    {paymentEntries.length > 1 && (
                      <button type="button" className="btn-soft" onClick={() => removePaymentEntry(index)}>Remove</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-3">
                  <span className="text-emerald-700">Received</span>
                  <b className="float-right">{money(paymentReceived)}</b>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3">
                  <span className="text-amber-700">Balance / Credit</span>
                  <b className="float-right">{money(paymentDue)}</b>
                </div>
              </div>
            </div>

            {onlineMode&&<div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-4"><div className="font-black text-blue-900">Online delivery details</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Email (optional)<input type="email" className="input mt-1" value={delivery.email} onChange={e=>setDelivery(v=>({...v,email:e.target.value}))}/></label><label className="text-sm font-bold">Postal code<input required className="input mt-1" value={delivery.postalCode} onChange={e=>setDelivery(v=>({...v,postalCode:e.target.value}))}/></label><label className="text-sm font-bold sm:col-span-2">Address line 1<input required className="input mt-1" value={delivery.addressLine1} onChange={e=>setDelivery(v=>({...v,addressLine1:e.target.value}))}/></label><label className="text-sm font-bold">Address line 2<input className="input mt-1" value={delivery.addressLine2} onChange={e=>setDelivery(v=>({...v,addressLine2:e.target.value}))}/></label><label className="text-sm font-bold">Landmark<input className="input mt-1" value={delivery.landmark} onChange={e=>setDelivery(v=>({...v,landmark:e.target.value}))}/></label><label className="text-sm font-bold">City<input required className="input mt-1" value={delivery.city} onChange={e=>setDelivery(v=>({...v,city:e.target.value}))}/></label><label className="text-sm font-bold">State<input required className="input mt-1" value={delivery.state} onChange={e=>setDelivery(v=>({...v,state:e.target.value}))}/></label><label className="text-sm font-bold sm:col-span-2">Delivery instructions<textarea className="input mt-1" value={delivery.instructions} onChange={e=>setDelivery(v=>({...v,instructions:e.target.value}))}/></label></div><p className="mt-3 text-xs font-semibold text-blue-800">Customer contact is recorded by the admin. The order is created as pending payment and stock is reduced immediately.</p></div>}
<label className="mt-3 block text-sm font-bold">Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="Optional order notes" /></label>

            <button disabled={saving || !cart.length} className="btn-primary mt-5 w-full justify-center">
              {saving ? "Creating Order..." : (onlineMode ? "Create Online Order" : "Create Order")}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={alertModal.open}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="Okay"
        onConfirm={closeAlert}
        onClose={closeAlert}
        showCancel={false}
        danger={false}
      />
    </div>
  );
}
