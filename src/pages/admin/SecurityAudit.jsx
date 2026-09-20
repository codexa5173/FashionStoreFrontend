import { useEffect, useState } from "react";
import api from "../../lib/api";

export default function SecurityAudit() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/security-audit/tenant-isolation");
      setReport(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to run security audit.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black">Security / Tenant Isolation Audit</h1>
          <p className="text-sm text-slate-500">Phase 29 defense-in-depth checks for tenant ownership and cross-tenant leakage.</p>
        </div>
        <button className="btn-soft" onClick={run} disabled={loading}>{loading ? "Running…" : "Run Again"}</button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-slate-500">Passed</div><div className="text-3xl font-black text-emerald-600">{report.summary.pass}</div></div>
            <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-slate-500">Failed</div><div className="text-3xl font-black text-red-600">{report.summary.fail}</div></div>
            <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-slate-500">Informational</div><div className="text-3xl font-black">{report.summary.info}</div></div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-white">
            <div className="border-b p-4 font-bold">Isolation checks</div>
            <div className="divide-y">
              {report.checks.map((check) => (
                <div key={check.name} className="flex flex-col gap-2 p-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-semibold">{check.name}</div>
                    <div className="text-sm text-slate-500">{check.detail}</div>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${check.status === "PASS" ? "bg-emerald-100 text-emerald-700" : check.status === "FAIL" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>{check.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
