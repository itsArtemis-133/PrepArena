import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axiosConfig";

const Badge = ({ children, className = "" }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>{children}</span>
);

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "all";
  const setTab = (id) => {
    const next = new URLSearchParams(params);
    id === "all" ? next.delete("tab") : next.set("tab", id);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/test/public");
        if (!cancelled) setTests(Array.isArray(res.data?.tests) ? res.data.tests : []);
      } catch {
        if (!cancelled) setErr("Could not load tests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const t = Array.isArray(tests) ? tests : [];
    const text = q.trim().toLowerCase();
    const inTab = t.filter((item) => {
      const w = item.window || {};
      if (tab === "upcoming")  return !!w.isUpcoming;
      if (tab === "live")      return !!w.isLive;
      if (tab === "completed") return !!w.isCompleted;
      return true;
    });
    if (!text) return inTab;
    return inTab.filter((item) => {
      const creator = item.createdBy?.username || item.createdBy?.name || "";
      return (
        (item.title || "").toLowerCase().includes(text) ||
        (item.subject || "").toLowerCase().includes(text) ||
        (item.description || "").toLowerCase().includes(text) ||
        creator.toLowerCase().includes(text)
      );
    });
  }, [tests, tab, q]);

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

  const Tab = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-xl font-semibold transition ${
        tab === id ? "bg-blue-600 text-white shadow" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
      }`}
      aria-pressed={tab === id}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="ui-section px-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">UPSC Tests</h1>
            <p className="text-gray-600">Discover curated mocks and practice sets. Filter by status, search by title or creator.</p>
          </div>
          <div className="flex gap-2">
            <Tab id="all" label="All Tests" />
            <Tab id="upcoming" label="Upcoming" />
            <Tab id="live" label="Live Now" />
            <Tab id="completed" label="Completed" />
          </div>
        </div>

        <div className="mt-6">
          <div className="relative md:w-1/2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tests, subjects, or creators…"
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-[rgb(var(--surface-border))] outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="absolute left-4 top-3.5 h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ui-card h-48" />
          ))}
        </div>
      ) : err ? (
        <div className="p-10 text-center text-red-600">{err}</div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-gray-600">No tests match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => {
            const live = t.window?.isLive;
            const upcoming = t.window?.isUpcoming && !live;
            const completed = t.window?.isCompleted;
            return (
              <div key={t.link || t._id} className="ui-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold leading-snug">{t.title || "Untitled test"}</h3>
                  {live && <Badge className="bg-red-50 text-red-700">live</Badge>}
                  {upcoming && !live && <Badge className="bg-blue-50 text-blue-700">upcoming</Badge>}
                  {completed && <Badge className="bg-gray-100 text-gray-700">completed</Badge>}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{t.description || "—"}</p>
                <div className="flex flex-wrap gap-2">
                  {t.subject && <Badge className="bg-blue-50 text-blue-700">{t.subject}</Badge>}
                  {t.type && <Badge className="bg-violet-50 text-violet-700">{" "}{t.type}</Badge>}
                  {t.testMode && <Badge className="bg-amber-50 text-amber-800">{t.testMode}</Badge>}
                </div>
                <div className="text-sm text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
                  <span><span className="font-medium">When:</span> {fmtDate(t.scheduledDate)}</span>
                  <span><span className="font-medium">Duration:</span> {Number(t.duration) ? `${t.duration}m` : "—"}</span>
                  <span><span className="font-medium">Registrations:</span> {t.registrationCount ?? 0}</span>
                </div>
                <div className="pt-1 flex items-center justify-between">
                  <Link to={`/test/${t.link}`} className="px-4 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                    {live ? "Join Now" : "View Details"}
                  </Link>
                  {t.createdBy?.username && <span className="text-xs text-gray-500">By {t.createdBy.username}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
