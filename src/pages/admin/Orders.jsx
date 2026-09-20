import { useEffect, useState } from "react";
import { Eye, MessageCircle, Printer, Search, CalendarDays } from "lucide-react";
import Pagination from "../../components/Pagination";
import api from "../../lib/api";
import { showAlert } from "../../lib/feedback";
import { money } from "../../lib/utils";



function whatsappOrder(order) {
  const lines = [
    `Invoice: ${order.orderNumber}`,
    `Customer: ${order.customerName || "Walk-in Customer"}`,
    "",
    ...(order.items || []).map(i => `${i.name}${i.size || i.color ? ` (${[i.size, i.color].filter(Boolean).join(" / ")})` : ""} x ${i.quantity} = ${money(i.lineTotal)}`),
    "",
    `Total: ${money(order.finalTotal)}`,
    `Paid: ${money(order.paidAmount ?? order.finalTotal)}`,
    `Balance: ${money(order.dueAmount ?? 0)}`,
    `Payment: ${order.paymentMethod || "Cash"}`
  ];
  const phone = String(order.customerPhone || "").replace(/\D/g, "");
  const url = `https://wa.me/${phone ? (phone.length === 10 ? "91" + phone : phone) : ""}?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function printOrder(order) {
  const rows = (order.items || []).map(i => `<tr><td>${i.name}${i.size || i.color ? ` (${[i.size,i.color].filter(Boolean).join(" / ")})` : ""}</td><td>${i.quantity}</td><td>${money(i.lineTotal)}</td></tr>`).join("");
  const html = `<!doctype html><html><head><title>Invoice ${order.orderNumber}</title><style>body{font-family:Arial,sans-serif;padding:28px;max-width:720px;margin:auto}h1{margin:0 0 4px}small{color:#666}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:700;text-align:right;margin-top:20px}</style></head><body><h1>Invoice</h1><small>${order.orderNumber} · ${new Date(order.createdAt).toLocaleString()}</small><p><b>${order.customerName || "Walk-in Customer"}</b>${order.customerPhone ? `<br>${order.customerPhone}` : ""}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total: ${money(order.finalTotal)}</div><p>Payment: ${order.paymentMethod} · Status: ${order.paymentStatus || "paid"}<br>Paid: ${money(order.paidAmount ?? order.finalTotal)} · Balance: ${money(order.dueAmount ?? 0)}</p>${order.notes ? `<p>Notes: ${order.notes}</p>` : ""}<script>window.onload=()=>{window.print();}</script></body></html>`;
  const w = window.open("", "_blank", "width=800,height=800");
  if (w) { w.document.write(html); w.document.close(); }
}

export default function Orders() {
  const [items,setItems]=useState([]), [q,setQ]=useState(""), [selected,setSelected]=useState(null), [summary,setSummary]=useState({});
  const [page,setPage]=useState(1), [pagination,setPagination]=useState({pages:1,total:0}), [allDates,setAllDates]=useState(false);
  const [paymentMethod,setPaymentMethod]=useState("Cash"), [paymentAmount,setPaymentAmount]=useState(""), [paymentReference,setPaymentReference]=useState(""), [paymentSaving,setPaymentSaving]=useState(false);
  async function load() {
    const r=await api.get("/orders",{params:{page,limit:20,all:allDates?1:0,q}});
    const data=r.data?.items||[];
    setItems(data); setSummary(r.data?.summary||{}); setPagination(r.data?.pagination||{pages:1,total:0});
  }
  useEffect(()=>{setPage(1);},[q,allDates]);
  useEffect(()=>{load().catch(()=>{});},[q,page,allDates]);

  async function collectPayment() {
    const amount = Number(paymentAmount);
    if (!selected || !Number.isFinite(amount) || amount <= 0) return;
    setPaymentSaving(true);
    try {
      const r = await api.post(`/orders/${selected._id}/payments`, {
        method: paymentMethod,
        amount,
        reference: paymentReference
      });
      setSelected(r.data);
      setPaymentAmount("");
      setPaymentReference("");
      await load();
    } catch (e) {
      showAlert(e.response?.data?.message || "Could not record payment.");
    } finally {
      setPaymentSaving(false);
    }
  }
  return <div className="mx-auto max-w-7xl">
    <div><h1 className="text-3xl font-black">Sales & Bills</h1><p className="mt-1 text-sm text-slate-500">View completed sales and print customer invoices.</p></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-4">
      <div className="card p-4"><div className="text-xs text-slate-500">Orders</div><div className="mt-1 text-2xl font-black">{summary.orders||0}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-500">Revenue</div><div className="mt-1 text-2xl font-black">{money(summary.netRevenue||0)}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-500">Discounts</div><div className="mt-1 text-2xl font-black">{money(summary.discounts||0)}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-500">Profit</div><div className="mt-1 text-2xl font-black">{money(summary.netProfit||0)}</div></div>
    </div>
    <div className="mt-5 card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="relative flex-1"><CalendarDays size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="w-full rounded-2xl bg-slate-100 py-3 pl-10 pr-4" value={allDates?"All sales":"Last 7 days"} readOnly /></div><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={allDates} onChange={e=>setAllDates(e.target.checked)}/> Fetch older sales</label></div><div className="relative mt-3"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search invoice, customer or phone..." className="w-full rounded-2xl bg-slate-100 py-3 pl-10 pr-4"/></div></div>
    <Pagination page={page} pages={pagination.pages||1} total={pagination.total||0} onChange={setPage}/>
    <div className="mt-5 card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Invoice</th><th className="p-4">Customer</th><th className="p-4">Items</th><th className="p-4">Payment</th><th className="p-4">Total</th><th className="p-4">Date</th><th className="p-4"></th></tr></thead><tbody>{items.map(o=><tr key={o._id} className="border-t"><td className="p-4 font-black">{o.orderNumber}</td><td className="p-4">{o.customerName||"Walk-in"}<div className="text-xs text-slate-500">{o.customerPhone}</div></td><td className="p-4">{o.items?.reduce((n,i)=>n+i.quantity,0)}</td><td className="p-4">{o.paymentMethod}</td><td className="p-4 font-black">{money(o.finalTotal)}</td><td className="p-4 text-slate-500">{new Date(o.createdAt).toLocaleString()}</td><td className="p-4"><div className="flex justify-end gap-2"><button className="btn-soft" onClick={()=>setSelected(o)}><Eye size={16}/></button><button className="btn-soft" title="Print / Save PDF" onClick={()=>printOrder(o)}><Printer size={16}/></button><button className="btn-soft" title="WhatsApp bill" onClick={()=>whatsappOrder(o)}><MessageCircle size={16}/></button></div></td></tr>)}</tbody></table></div>{!items.length&&<div className="p-10 text-center text-sm text-slate-400">No sales found.</div>}</div><Pagination page={page} pages={pagination.pages||1} total={pagination.total||0} onChange={setPage}/>
    {selected&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={()=>setSelected(null)}><div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6" onClick={e=>e.stopPropagation()}><div className="flex justify-between"><div><h2 className="text-2xl font-black">{selected.orderNumber}</h2><p className="text-sm text-slate-500">{selected.customerName||"Walk-in"} · {selected.customerPhone}</p></div><div className="flex gap-2"><button className="btn-soft" onClick={()=>printOrder(selected)}><Printer size={17}/> Print / PDF</button><button className="btn-soft" onClick={()=>whatsappOrder(selected)}><MessageCircle size={17}/> WhatsApp</button></div></div><div className="mt-5 space-y-2">{selected.items.map((i,n)=><div key={n} className="flex justify-between rounded-2xl bg-slate-50 p-3"><span>{i.name} {i.size||i.color ? `· ${[i.size,i.color].filter(Boolean).join(" / ")}`:""} × {i.quantity}</span><b>{money(i.lineTotal)}</b></div>)}</div><div className="mt-5 border-t pt-4 space-y-2 text-right">
          <div className="text-sm">Payment: <b>{selected.paymentMethod}</b></div>
          <div className="text-sm">Paid: <b>{money(selected.paidAmount ?? selected.finalTotal)}</b></div>
          <div className="text-sm text-amber-700">Balance: <b>{money(selected.dueAmount ?? 0)}</b></div>
          <div className="text-xl font-black">Total {money(selected.finalTotal)}</div>
          {(Number(selected.dueAmount || 0) > 0) && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left">
            <div className="font-black text-amber-900">Collect outstanding payment</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="rounded-xl bg-white p-2">
                {["Cash","UPI","Card","Bank Transfer","Other"].map(x=><option key={x}>{x}</option>)}
              </select>
              <input type="number" min="0.01" max={selected.dueAmount} step="0.01" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} placeholder="Amount" className="rounded-xl bg-white p-2"/>
              <input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Reference (optional)" className="rounded-xl bg-white p-2"/>
            </div>
            <button type="button" disabled={paymentSaving} onClick={collectPayment} className="btn-primary mt-2">{paymentSaving ? "Saving..." : "Record Payment"}</button>
          </div>}
          {(selected.payments || []).length > 0 && <div className="mt-2 text-left rounded-2xl bg-slate-50 p-3 text-sm">
            <div className="font-black">Payment breakdown</div>
            {selected.payments.map((p,i)=><div key={i} className="mt-1 flex justify-between"><span>{p.method}</span><b>{money(p.amount)}</b></div>)}
          </div>}
        </div></div></div>}
  </div>;
}
