import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, Trash2, Wifi } from "lucide-react";
import api from "../../lib/api";
import { clearResolvedMutations, listMutations, removeMutation, syncOfflineMutations, updateMutation } from "../../lib/offlineQueue";
import { money } from "../../lib/utils";
import ConfirmModal from "../../components/ConfirmModal";

function formatDate(value) {
  try { return new Date(value).toLocaleString(); } catch { return ""; }
}

export default function OfflineQueue() {
  const [rows, setRows] = useState([]);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [discardTarget,setDiscardTarget]=useState(null);

  const load = useCallback(async () => setRows(await listMutations()), []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    setMessage("");
    try {
      const result = await syncOfflineMutations(api, { onProgress: load });
      await load();
      setMessage(result.conflicts
        ? `${result.synced} synced. ${result.conflicts} item(s) need attention because the server rejected them.`
        : result.synced ? `${result.synced} queued change(s) synced successfully.` : "Nothing needed syncing.");
    } catch (e) {
      setMessage(e?.message || "Sync could not be completed.");
    } finally { setSyncing(false); }
  }, [load]);

  useEffect(() => {
    load();
    const onOnline = () => { setOnline(true); sync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = window.setInterval(() => { if (navigator.onLine) sync(); }, 30000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(timer);
    };
  }, [load, sync]);

  async function retry(row) {
    await updateMutation(row.id, { status: "retry", lastError: "" });
    await load();
    sync();
  }

  async function discard(row) {
    await removeMutation(row.id);
    setDiscardTarget(null);
    await load();
  }

  const pending = rows.filter(x => ["queued", "retry", "syncing"].includes(x.status));
  const conflicts = rows.filter(x => x.status === "conflict");

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-black">Offline Queue</h1>
        <p className="mt-1 text-sm text-slate-500">POS changes are stored on this device and replayed in order when the connection returns.</p>
      </div>
      <div className="flex gap-2">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {online ? <Wifi size={16}/> : <CloudOff size={16}/>} {online ? "Online" : "Offline"}
        </span>
        <button className="btn-primary" disabled={!online || syncing} onClick={sync}><RefreshCw size={16} className={syncing ? "animate-spin" : ""}/> {syncing ? "Syncing..." : "Sync now"}</button>
      </div>
    </div>

    {message && <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm font-semibold">{message}</div>}

    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <div className="card p-5"><div className="text-xs uppercase tracking-wide text-slate-500">Pending</div><div className="mt-1 text-3xl font-black">{pending.length}</div></div>
      <div className="card p-5"><div className="text-xs uppercase tracking-wide text-slate-500">Conflicts</div><div className="mt-1 text-3xl font-black">{conflicts.length}</div></div>
      <div className="card p-5"><div className="text-xs uppercase tracking-wide text-slate-500">Device queue</div><div className="mt-1 text-sm font-bold">Tenant-scoped IndexedDB</div></div>
    </div>

    <div className="mt-6 space-y-3">
      {!rows.length && <div className="card p-10 text-center text-sm text-slate-500"><CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={32}/>No offline changes are waiting.</div>}
      {rows.map(row => <div key={row.id} className={`card p-4 ${row.status === "conflict" ? "border-red-200 bg-red-50/50" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-black">{row.status === "conflict" ? <AlertTriangle size={18} className="text-red-600"/> : <CloudOff size={18} className="text-slate-500"/>}{row.label}</div>
            <div className="mt-1 text-xs text-slate-500">{formatDate(row.createdAt)} · attempts {row.attempts || 0} · {row.method} {row.url}</div>
            {row.data?.finalTotal != null && <div className="mt-2 text-sm font-semibold">Total: {money(row.data.finalTotal)}</div>}
            {row.lastError && <div className="mt-2 rounded-xl bg-white p-3 text-sm text-red-700"><b>Conflict / error:</b> {row.lastError}</div>}
          </div>
          <div className="flex shrink-0 gap-2">
            {["conflict","retry"].includes(row.status) && <button className="btn-soft" onClick={() => retry(row)}>Retry</button>}
            <button className="btn-soft text-red-600" onClick={() => setDiscardTarget(row)}><Trash2 size={16}/> Discard</button>
          </div>
        </div>
      </div>)}
    </div>

    <button className="mt-5 text-xs font-semibold text-slate-400 underline" onClick={async () => { await clearResolvedMutations(); await load(); }}>Clear completed sync records</button>
    <ConfirmModal open={Boolean(discardTarget)} title="Discard offline change?" message="This queued change cannot be recovered after it is discarded." confirmText="Discard" danger onConfirm={()=>discard(discardTarget)} onClose={()=>setDiscardTarget(null)}/>
  </div>;
}
