import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import { Link } from "react-router-dom";

export default function Results() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/test/results/recent", { params: { page, limit } });
        if (cancelled) return;
        setRows(res.data?.results || []);
        setTotal(Number(res.data?.total || 0));
      } catch {
        if (!cancelled) setErr("Failed to load results.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, limit]);

  const maxPage = Math.max(1, Math.ceil(total / limit));
  const fmt = (d) => d ? new Date(d).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  }) : "—";

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="ui-section px-6 py-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Results</h1>
            <p className="text-gray-600">Review your past attempts and track progress over time.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">
              Per page:{" "}
              <select
                value={limit}
                onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}
                className="ml-2 bg-white border border-[rgb(var(--surface-border))] rounded-lg px-2 py-1"
              >
                {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="text-sm text-gray-700">Total: {total}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="ui-card p-8">
          <div className="h-5 w-1/4 bg-gray-200 rounded mb-4" />
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 w-full bg-gray-100 rounded mb-2" />)}
        </div>
      ) : err ? (
        <div className="p-10 text-center text-red-600">{err}</div>
      ) : rows.length === 0 ? (
        <div className="ui-card p-10 text-center text-gray-600">No results yet. <Link to="/tests" className="text-blue-600 font-semibold">Browse tests</Link></div>
      ) : (
        <div className="ui-table overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[rgb(var(--app-bg))]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">Test</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">Score</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">Taken At</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.testLink}-${i}`} className={i % 2 ? "bg-gray-50/70" : "bg-white"}>
                  <td className="px-6 py-4">
                    <Link to={`/test/${r.testLink}`} className="text-blue-700 font-semibold hover:underline">
                      {r.testTitle}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-bold text-blue-700">{r.score}/{r.total}</td>
                  <td className="px-6 py-4">{fmt(r.takenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 rounded-xl bg-gray-200 disabled:opacity-50">Prev</button>
        <div className="text-sm text-gray-700">Page {page} / {maxPage}</div>
        <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage} className="px-4 py-2 rounded-xl bg-gray-200 disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
