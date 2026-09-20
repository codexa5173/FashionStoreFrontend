import { useEffect, useState } from "react";
import api from "../../lib/api";
import { showAlert } from "../../lib/feedback";
import { cachedGet, cacheClearPrefix, cacheRemove } from "../../lib/cache";
import Pagination from "../../components/Pagination";
import RefreshButton from "../../components/RefreshButton";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["", "draft", "scheduled", "sending", "sent", "partial", "failed", "cancelled"];

export default function Notifications() {
  const { admin } = useAuth();
  const [n, setN] = useState([]);
  const [f, setF] = useState({
    title: "", message: "", url: "/", scheduledFor: "", kind: "general"
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [confirm,setConfirm]=useState(null);
  const tenantKey = admin?.tenant?.slug || admin?.tenant?._id || "tenant";
  const cacheKey = `notifications:${tenantKey}:admin:${page}:${status || "all"}`;

  async function load(force = false) {
    try {
      const query = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (status) query.set("status", status);
      const r = await cachedGet(
        api,
        `/notifications?${query.toString()}`,
        { key: cacheKey, forceRefresh: force }
      );
      setN(r.data?.items || r.data || []);
      setPagination(r.data?.pagination || { page, pages: 1, total: r.data?.length || 0 });
    } catch (e) {
      showAlert(e.response?.data?.message || "Could not load notifications.");
    }
  }

  useEffect(() => { load(false); }, [page, status]);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...f,
        scheduledFor: f.scheduledFor ? new Date(f.scheduledFor).toISOString() : null
      };
      const r = await api.post("/notifications", payload);
      if (!payload.scheduledFor) await api.post(`/notifications/${r.data._id}/send`);
      setF({ title: "", message: "", url: "/", scheduledFor: "", kind: "general" });
      await cacheClearPrefix(`notifications:${tenantKey}:`);
      await load(true);
    } catch (e) {
      showAlert(e.response?.data?.message || "Could not create notification.");
    } finally {
      setBusy(false);
    }
  }

  async function sendNow(id) {
    setConfirm({title:"Send notification?",message:"Send this notification to the selected audience now?",action:async()=>{try{await api.post(`/notifications/${id}/send`);await cacheClearPrefix(`notifications:${tenantKey}:`);await load(true)}catch(e){showAlert(e.response?.data?.message||"Could not send notification.")}finally{setConfirm(null)}}});
  }

  async function cancelNotification(id) {
    setConfirm({title:"Cancel notification?",message:"This notification will not be sent.",action:async()=>{try{await api.post(`/notifications/${id}/cancel`);await cacheClearPrefix(`notifications:${tenantKey}:`);await load(true)}catch(e){showAlert(e.response?.data?.message||"Could not cancel notification.")}finally{setConfirm(null)}}});
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await cacheRemove(cacheKey);
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Send immediately or schedule tenant-scoped browser notifications.
          </p>
        </div>
        <RefreshButton onClick={refresh} busy={refreshing} />
      </div>

      <form onSubmit={create} className="card mt-6 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">
            Title
            <input required maxLength={120} value={f.title}
              onChange={e => setF({ ...f, title: e.target.value })}
              className="mt-2 w-full rounded-2xl bg-slate-100 p-3" />
          </label>

          <label className="text-sm font-bold">
            Type
            <select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}
              className="mt-2 w-full rounded-2xl bg-slate-100 p-3">
              <option value="general">General</option>
              <option value="promotion">Promotion</option>
              <option value="offer">Offer</option>
              <option value="new_arrival">New Arrival</option>
              <option value="low_stock">Low Stock</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block text-sm font-bold">
          Message
          <textarea required maxLength={2000} value={f.message}
            onChange={e => setF({ ...f, message: e.target.value })}
            rows="4" className="mt-2 w-full rounded-2xl bg-slate-100 p-3" />
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">
            Destination Path
            <input value={f.url} onChange={e => setF({ ...f, url: e.target.value })}
              placeholder="/offers"
              className="mt-2 w-full rounded-2xl bg-slate-100 p-3" />
          </label>

          <label className="text-sm font-bold">
            Schedule (optional)
            <input type="datetime-local" value={f.scheduledFor}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              onChange={e => setF({ ...f, scheduledFor: e.target.value })}
              className="mt-2 w-full rounded-2xl bg-slate-100 p-3" />
          </label>
        </div>

        <button disabled={busy} className="btn-primary mt-5">
          {busy ? "Saving..." : f.scheduledFor ? "Schedule Notification" : "Create & Send Now"}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select value={status} onChange={e => { setPage(1); setStatus(e.target.value); }}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold">
          {STATUS_OPTIONS.map(x => <option key={x} value={x}>{x || "All statuses"}</option>)}
        </select>
      </div>

      {n.length === 0 ? (
        <div className="mt-6 card p-8 text-center text-slate-400">No notifications found.</div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 md:hidden">
            {n.map(x => (
              <div className="card p-4" key={x._id}>
                <div className="font-black">{x.title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {x.scheduledFor ? `Scheduled ${new Date(x.scheduledFor).toLocaleString()}` : new Date(x.createdAt).toLocaleString()}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-slate-50 p-2"><b>{x.status}</b><div>Status</div></div>
                  <div className="rounded-xl bg-slate-50 p-2"><b>{x.successCount || 0}</b><div>Success</div></div>
                  <div className="rounded-xl bg-slate-50 p-2"><b>{x.failureCount || 0}</b><div>Failed</div></div>
                </div>
                <div className="mt-3 flex gap-2">
                  {["draft", "scheduled", "failed"].includes(x.status) && <button onClick={() => sendNow(x._id)} className="btn-primary text-xs">Send now</button>}
                  {["draft", "scheduled", "failed"].includes(x.status) && <button onClick={() => cancelNotification(x._id)} className="rounded-xl border px-3 py-2 text-xs font-bold">Cancel</button>}
                </div>
              </div>
            ))}
          </div>

          <div className="card mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr>{["Title", "Type", "Status", "Recipients", "Success", "Failure", "Scheduled", "Actions"].map(x =>
                  <th className="px-4 py-3" key={x}>{x}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {n.map(x => (
                  <tr key={x._id}>
                    <td className="px-4 py-3 font-bold">{x.title}</td>
                    <td className="px-4 py-3">{x.kind}</td>
                    <td className="px-4 py-3">{x.status}</td>
                    <td className="px-4 py-3">{x.recipientCount || 0}</td>
                    <td className="px-4 py-3">{x.successCount || 0}</td>
                    <td className="px-4 py-3">{x.failureCount || 0}</td>
                    <td className="px-4 py-3">{x.scheduledFor ? new Date(x.scheduledFor).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {["draft", "scheduled", "failed"].includes(x.status) && <button onClick={() => sendNow(x._id)} className="btn-primary text-xs">Send</button>}
                        {["draft", "scheduled", "failed"].includes(x.status) && <button onClick={() => cancelNotification(x._id)} className="rounded-xl border px-3 py-2 text-xs font-bold">Cancel</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={pagination.page || page} pages={pagination.pages} total={pagination.total} onChange={setPage} />
        </>
      )}
    </div>
    <ConfirmModal open={Boolean(confirm)} title={confirm?.title} message={confirm?.message} confirmText="Continue" danger={confirm?.title?.startsWith("Cancel")} onConfirm={()=>confirm?.action?.()} onClose={()=>setConfirm(null)}/>
    </>
  );
}
