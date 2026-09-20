import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, RefreshCw } from "lucide-react";
import RefreshButton from "../../components/RefreshButton";
import api from "../../lib/api";
import Pagination from "../../components/Pagination";

const PAGE_SIZE = 30;
const ACTIONS = ["", "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "ACTION"];

export default function AuditLogs() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, actions: [], entities: [], actors: [] });
  const [filters, setFilters] = useState({ q: "", action: "", entity: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const [logs, stats] = await Promise.all([
        api.get("/audit-logs", { params }),
        api.get("/audit-logs/summary")
      ]);
      setItems(logs.data?.items || []);
      setPages(logs.data?.pagination?.pages || 1);
      setTotal(logs.data?.pagination?.total || 0);
      setSummary(stats.data || {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 150);
    return () => clearTimeout(timer);
  }, [page, filters.q, filters.action, filters.entity, filters.from, filters.to]);

  const topEntities = useMemo(() => summary.entities || [], [summary.entities]);
  const update = (key, value) => { setPage(1); setFilters(v => ({ ...v, [key]: value })); };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={25} />
            <h1 className="text-3xl font-black">Audit Log</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Tenant-scoped history of administrative changes and actions.</p>
        </div>
        <RefreshButton onClick={load} busy={loading}/>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5"><div className="text-sm text-slate-500">Total events</div><div className="mt-2 text-2xl font-black">{summary.total || 0}</div></div>
        {(summary.actions || []).slice(0, 3).map(x => (
          <div className="card p-5" key={x._id}><div className="text-sm text-slate-500">{x._id}</div><div className="mt-2 text-2xl font-black">{x.count}</div></div>
        ))}
      </div>

      <div className="card mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <label className="md:col-span-2 relative">
            <Search size={17} className="absolute left-3 top-10 text-slate-400" />
            <span className="text-sm font-semibold">Search</span>
            <input className="input mt-1 pl-10" placeholder="User, entity, ID or route" value={filters.q} onChange={e => update("q", e.target.value)} />
          </label>
          <label><span className="text-sm font-semibold">Action</span><select className="input mt-1" value={filters.action} onChange={e => update("action", e.target.value)}>{ACTIONS.map(x => <option key={x} value={x}>{x || "All actions"}</option>)}</select></label>
          <label><span className="text-sm font-semibold">Entity</span><input className="input mt-1" placeholder="Product" value={filters.entity} onChange={e => update("entity", e.target.value)} /></label>
          <label><span className="text-sm font-semibold">From</span><input type="date" className="input mt-1" value={filters.from} onChange={e => update("from", e.target.value)} /></label>
          <label><span className="text-sm font-semibold">To</span><input type="date" className="input mt-1" value={filters.to} onChange={e => update("to", e.target.value)} /></label>
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>{["Time", "User", "Action", "Entity", "Entity ID", "Status", "Route", "IP"].map(x => <th key={x} className="p-4">{x}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {items.map(x => (
              <tr key={x._id}>
                <td className="p-4 whitespace-nowrap">{new Date(x.createdAt).toLocaleString()}</td>
                <td className="p-4"><div className="font-bold">{x.actorUsername || "System"}</div><div className="text-xs text-slate-400">{x.actorRole || "—"}</div></td>
                <td className="p-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black">{x.action}</span></td>
                <td className="p-4 font-semibold">{x.entity}</td>
                <td className="p-4 max-w-[180px] truncate text-slate-500">{x.entityId || "—"}</td>
                <td className="p-4">{x.statusCode}</td>
                <td className="p-4 max-w-[260px] truncate text-slate-500">{x.path}</td>
                <td className="p-4 text-slate-500">{x.ip || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !items.length && <div className="p-10 text-center text-sm text-slate-400">No audit events match these filters.</div>}
        {loading && <div className="p-6 text-center text-sm text-slate-400">Loading audit history...</div>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>Top entities:</span>
        {topEntities.slice(0, 8).map(x => <span key={x._id} className="rounded-full bg-slate-100 px-3 py-1">{x._id}: {x.count}</span>)}
      </div>

      <Pagination page={page} pages={pages} total={total} onChange={setPage} />
    </div>
  );
}
