import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Minus, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import api from "../../lib/api";
import { cacheClearPrefix } from "../../lib/cache";
import { money } from "../../lib/utils";
import ConfirmModal from "../../components/ConfirmModal";
import Pagination from "../../components/Pagination";

const PAGE_SIZE = 20;

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export default function Returns() {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cart, setCart] = useState([]);
  const [returnAmount, setReturnAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ amount: 0, cost: 0, profitImpact: 0, returns: 0 });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  async function searchOrders(value = query) {
    setSearching(true);
    try {
      const q = String(value || "").trim();
      const r = await api.get(`/orders/returnable?limit=30${q ? `&q=${encodeURIComponent(q)}` : ""}`);
      setOrders(r.data?.items || []);
    } catch (e) {
      setInfo({ title: "Search failed", message: e.response?.data?.message || "Could not find returnable orders." });
    } finally {
      setSearching(false);
    }
  }

  async function loadHistory() {
    try {
      const r = await api.get(`/returns?page=${page}&limit=${PAGE_SIZE}`);
      setHistory(r.data?.items || []);
      setPagination(r.data?.pagination || { page, pages: 1, total: 0 });
      setSummary(r.data?.summary || { amount: 0, cost: 0, profitImpact: 0, returns: 0 });
    } catch (e) {
      setInfo({ title: "Could not load returns", message: e.response?.data?.message || "Please try again." });
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => searchOrders(query), query.trim() ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => { loadHistory(); }, [page]);

  function chooseOrder(order) {
    setSelectedOrder(order);
    setCart([]);
    setReturnAmount("");
  }

  function addItem(item) {
    const max = Number(item.remainingQuantity || 0);
    if (max < 1) return;

    setCart(current => {
      const existing = current.find(x => x.orderItemIndex === item.orderItemIndex);
      if (existing) {
        return current.map(x => x.orderItemIndex === item.orderItemIndex
          ? { ...x, quantity: Math.min(max, x.quantity + 1) }
          : x);
      }
      return [...current, {
        orderItemIndex: item.orderItemIndex,
        product: item.product,
        variant: item.variant,
        name: item.name,
        sku: item.sku,
        color: item.color || "",
        size: item.size || "",
        maxQuantity: max,
        quantity: 1,
        refundUnitPrice: Number(item.unitPrice ?? item.discountedPrice ?? 0),
        purchasePrice: Number(item.purchasePrice ?? 0)
      }];
    });
  }

  function updateQty(index, next) {
    setCart(current => current.map(item => item.orderItemIndex === index
      ? { ...item, quantity: Math.max(1, Math.min(item.maxQuantity, Math.floor(Number(next) || 1))) }
      : item));
  }

  const calculatedAmount = useMemo(
    () => roundMoney(cart.reduce((sum, item) => sum + item.refundUnitPrice * item.quantity, 0)),
    [cart]
  );

  const totalCost = useMemo(
    () => roundMoney(cart.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0)),
    [cart]
  );

  useEffect(() => {
    setReturnAmount(cart.length ? String(calculatedAmount) : "");
  }, [cart.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function removeItem(index) {
    setCart(current => current.filter(item => item.orderItemIndex !== index));
  }

  function requestReturn() {
    if (!selectedOrder) {
      return setInfo({ title: "Select an order", message: "Choose a paid order before adding return items." });
    }
    if (!cart.length) {
      return setInfo({ title: "Cart is empty", message: "Add at least one item from the selected order." });
    }

    const total = roundMoney(Number(returnAmount));
    if (!Number.isFinite(total) || total < 0 || total > calculatedAmount) {
      return setInfo({
        title: "Invalid return amount",
        message: `Return amount must be between ${money(0)} and ${money(calculatedAmount)}.`
      });
    }
    setConfirmOpen(true);
  }

  async function submitReturn() {
    const total = roundMoney(Number(returnAmount));
    setSaving(true);

    try {
      const r = await api.post("/returns", {
        orderId: selectedOrder._id,
        items: cart.map(item => ({
          orderItemIndex: item.orderItemIndex,
          quantity: item.quantity
        })),
        returnAmount: total,
        reason,
        notes
      });

      setConfirmOpen(false);
      setInfo({
        title: `Return ${r.data.returnNumber} recorded`,
        message: `${r.data.orderNumber} · ${cart.reduce((n, x) => n + x.quantity, 0)} item(s) restored. Historical sale value returned: ${money(r.data.returnAmount)}.`
      });

      setCart([]);
      setSelectedOrder(null);
      setReturnAmount("");
      setReason("");
      setNotes("");

      await Promise.all([
        cacheClearPrefix("products:"),
        cacheClearPrefix("product:"),
        cacheClearPrefix("dashboard:")
      ]);

      await Promise.all([loadHistory(), searchOrders(query)]);
    } catch (e) {
      setConfirmOpen(false);
      setInfo({
        title: "Return failed",
        message: e.response?.data?.message || "Could not record the return."
      });
    } finally {
      setSaving(false);
    }
  }

  const additionalAdjustment = roundMoney(Math.max(0, calculatedAmount - Number(returnAmount || 0)));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Return Items</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select a paid order, choose exact sold variants, and return only quantities that have not already been returned.
          </p>
        </div>
        <div className="badge"><RotateCcw size={15}/> {summary.returns} returns</div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="text-sm text-slate-500">Returned Amount</div><div className="mt-2 text-2xl font-black">{money(summary.amount)}</div></div>
        <div className="card p-5"><div className="text-sm text-slate-500">Returned Cost</div><div className="mt-2 text-2xl font-black">{money(summary.cost)}</div></div>
        <div className="card p-5"><div className="text-sm text-slate-500">Profit Reversal</div><div className="mt-2 text-2xl font-black">{money(summary.profitImpact)}</div></div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="card p-4 sm:p-6">
          <div className="font-black">Find a sale</div>
          <div className="mt-1 text-xs text-slate-500">Search by invoice number, customer name, or phone.</div>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search invoice, customer or phone..."
                className="w-full rounded-2xl bg-slate-100 py-3 pl-10 pr-3"
              />
            </div>
            <button type="button" onClick={() => searchOrders(query)} className="btn-soft" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1">
            {orders.map(order => (
              <button
                type="button"
                key={order._id}
                onClick={() => chooseOrder(order)}
                className={`w-full rounded-2xl border p-4 text-left transition hover:shadow ${
                  selectedOrder?._id === order._id ? "border-slate-900 bg-slate-50" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-black">{order.orderNumber}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {order.customerName || "Walk-in"} {order.customerPhone ? `· ${order.customerPhone}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black">{money(order.finalTotal)}</div>
                    <div className="text-xs text-slate-500">
                      {order.items.reduce((n, item) => n + Number(item.remainingQuantity || 0), 0)} item(s) returnable
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!searching && !orders.length && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">
              No returnable paid orders found.
            </div>
          )}

          {selectedOrder && (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-black">{selectedOrder.orderNumber}</div>
                  <div className="text-sm text-slate-500">
                    {selectedOrder.customerName || "Walk-in"} · Original total {money(selectedOrder.finalTotal)}
                  </div>
                </div>
                <button type="button" className="btn-soft" onClick={() => { setSelectedOrder(null); setCart([]); }}>
                  Close
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {selectedOrder.items.map(item => {
                  const inCart = cart.find(x => x.orderItemIndex === item.orderItemIndex);
                  return (
                    <div key={item.orderItemIndex} className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-black">{item.name}</div>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-slate-500">
                            <span>{item.sku}</span>
                            {item.color && <span className="rounded-full bg-slate-50 px-2 py-0.5">Color: {item.color}</span>}
                            {item.size && <span className="rounded-full bg-slate-50 px-2 py-0.5">Size: {item.size}</span>}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            Sold {item.quantity} · Already returned {item.returnedQuantity} · Remaining {item.remainingQuantity} · {money(item.unitPrice)} each
                          </div>
                        </div>
                        <button
                          type="button"
                          className={inCart ? "btn-soft" : "btn-primary"}
                          onClick={() => inCart ? removeItem(item.orderItemIndex) : addItem(item)}
                        >
                          {inCart ? "Remove" : "Add Return"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">Return Cart</h2>
            <span className="badge">{cart.reduce((n, x) => n + x.quantity, 0)} items</span>
          </div>

          {cart.length ? (
            <div className="mt-4 max-h-[390px] space-y-3 overflow-y-auto pr-1">
              {cart.map((item, index) => (
                <div key={item.orderItemIndex} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black">{index + 1}. {item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.sku} {item.size || item.color ? `· ${[item.size, item.color].filter(Boolean).join(" / ")}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Historical sale price {money(item.refundUnitPrice)} each · Max {item.maxQuantity}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.orderItemIndex)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={17}/>
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-xl bg-white p-1 ring-1 ring-black/5">
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30"
                        disabled={item.quantity <= 1}
                        onClick={() => updateQty(item.orderItemIndex, item.quantity - 1)}
                      >
                        <Minus size={15}/>
                      </button>
                      <input
                        value={item.quantity}
                        onChange={e => updateQty(item.orderItemIndex, e.target.value)}
                        className="w-10 bg-transparent text-center text-sm font-black outline-none"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30"
                        disabled={item.quantity >= item.maxQuantity}
                        onClick={() => updateQty(item.orderItemIndex, item.quantity + 1)}
                      >
                        <Plus size={15}/>
                      </button>
                    </div>
                    <div className="text-right font-black">{money(item.refundUnitPrice * item.quantity)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-400">
              Select a sold item from an order.
            </div>
          )}

          <div className="mt-5 border-t pt-5">
            <div className="flex justify-between text-sm">
              <span>Historical sale value</span>
              <b>{money(calculatedAmount)}</b>
            </div>

            <label className="mt-4 block text-sm font-black">
              Total Return Amount
              <input
                type="number"
                min="0"
                max={calculatedAmount}
                step="0.01"
                value={returnAmount}
                onChange={e => setReturnAmount(e.target.value)}
                className="mt-2 w-full rounded-2xl bg-slate-100 p-4 text-xl font-black"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                The default uses the exact historical sale price. You can reduce the refund amount if needed.
              </span>
            </label>

            {additionalAdjustment > 0 && (
              <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                Return adjustment: <b>{money(additionalAdjustment)}</b>
              </div>
            )}

            <label className="mt-3 block text-sm font-bold">
              Reason
              <input value={reason} onChange={e => setReason(e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="Customer return, wrong item, etc."/>
            </label>

            <label className="mt-3 block text-sm font-bold">
              Notes
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" className="mt-2 w-full rounded-2xl bg-slate-100 p-3" placeholder="Optional notes"/>
            </label>

            <button
              type="button"
              disabled={!selectedOrder || !cart.length || saving}
              onClick={requestReturn}
              className="btn-primary mt-5 w-full justify-center"
            >
              {saving ? "Recording Return..." : "Record Return"}
            </button>
          </div>
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="p-5">
          <h2 className="text-xl font-black">Return History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Return", "Order", "Date", "Items", "Customer", "Amount", "Cost", "Profit Reversal"].map(x => (
                  <th key={x} className="px-4 py-3 font-bold">{x}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map(r => (
                <tr key={r._id}>
                  <td className="px-4 py-3 font-bold">{r.returnNumber}</td>
                  <td className="px-4 py-3 font-bold">{r.orderId?.orderNumber || "Legacy"}</td>
                  <td className="px-4 py-3">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.items?.reduce((n, x) => n + x.quantity, 0)}</td>
                  <td className="px-4 py-3">{r.customerName || "—"}</td>
                  <td className="px-4 py-3 font-black">{money(r.returnAmount)}</td>
                  <td className="px-4 py-3">{money(r.totalCost)}</td>
                  <td className="px-4 py-3">{money(r.profitImpact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page || page} pages={pagination.pages} total={pagination.total} onChange={setPage}/>
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="Record this return?"
        message={`Restore ${cart.reduce((n, x) => n + x.quantity, 0)} item(s) from ${selectedOrder?.orderNumber || "the selected order"} and reverse ${money(Number(returnAmount || 0))} from revenue?`}
        confirmText="Record Return"
        onConfirm={submitReturn}
        onClose={() => !saving && setConfirmOpen(false)}
        busy={saving}
        busyText="Recording..."
        danger={false}
      />

      <ConfirmModal
        open={Boolean(info)}
        title={info?.title || "Information"}
        message={info?.message || ""}
        confirmText="Okay"
        onConfirm={() => setInfo(null)}
        onClose={() => setInfo(null)}
        showCancel={false}
        danger={false}
      />
    </div>
  );
}
