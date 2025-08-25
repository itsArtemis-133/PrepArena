import React from "react";
import dayjs from "dayjs";
import axios from "../api/axiosConfig";
import TestCard from "../components/TestCard";

const PAGE_SIZE = 12;

const computeWindow = (t) => {
  const start = t?.scheduledDate && dayjs(t.scheduledDate).isValid() ? dayjs(t.scheduledDate) : null;
  const end = start ? start.add(Number(t?.duration || 0), "minute") : null;
  const now = dayjs();
  return {
    start,
    end,
    isUpcoming: !!(start && now.isBefore(start)),
    isLive: !!(start && end && now.isAfter(start) && now.isBefore(end)),
    isCompleted: !!(end && now.isAfter(end)),
  };
};

export default function TestsHub() {
  const [tab, setTab] = React.useState("open"); // open | registered | upcoming | past
  const [q, setQ] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [type, setType] = React.useState("");
  const [mode, setMode] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  const [openTests, setOpenTests] = React.useState([]);        // /test/public
  const [registeredTests, setRegisteredTests] = React.useState([]); // /test?scope=registered
  const [allMine, setAllMine] = React.useState([]);            // /test?scope=all (for upcoming/past)

  const [subjects, setSubjects] = React.useState([]);
  const [types, setTypes] = React.useState([]);
  const [modes, setModes] = React.useState([]);

  // initial fetch
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const [pub, reg, all] = await Promise.allSettled([
          axios.get("/test/public"),
          axios.get("/test", { params: { scope: "registered" } }),
          axios.get("/test", { params: { scope: "all" } }),
        ]);
        if (cancel) return;

        if (pub.status === "fulfilled") setOpenTests(pub.value?.data?.tests || []);
        if (reg.status === "fulfilled") setRegisteredTests(reg.value?.data?.tests || []);
        if (all.status === "fulfilled") setAllMine(all.value?.data?.tests || []);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // derive filter values
  React.useEffect(() => {
    const pool = [...openTests, ...registeredTests, ...allMine];
    const S = new Set(), T = new Set(), M = new Set();
    pool.forEach(t => {
      if (t.subject) S.add(t.subject);
      if (t.type) T.add(t.type);
      if (t.testMode) M.add(t.testMode);
    });
    setSubjects(Array.from(S).sort());
    setTypes(Array.from(T).sort());
    setModes(Array.from(M).sort());
  }, [openTests, registeredTests, allMine]);

  // choose dataset by tab
  const dataset = React.useMemo(() => {
    if (tab === "open") return openTests;
    if (tab === "registered") return registeredTests;
    // upcoming / past from allMine (created+registered)
    const filt = allMine.filter(Boolean);
    if (tab === "upcoming") return filt.filter(t => computeWindow(t).isUpcoming || computeWindow(t).isLive);
    if (tab === "past") return filt.filter(t => computeWindow(t).isCompleted);
    return [];
  }, [tab, openTests, registeredTests, allMine]);

  // search + filters
  const filtered = React.useMemo(() => {
    const qn = q.trim().toLowerCase();
    return dataset.filter(t => {
      if (qn) {
        const blob = [
          t.title, t.description, t.subject, t.type, t.testMode,
          t?.createdBy?.username
        ].filter(Boolean).join(" ").toLowerCase();
        if (!blob.includes(qn)) return false;
      }
      if (subject && t.subject !== subject) return false;
      if (type && t.type !== type) return false;
      if (mode && t.testMode !== mode) return false;
      return true;
    });
  }, [dataset, q, subject, type, mode]);

  // pagination
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  React.useEffect(() => setPage(1), [tab, q, subject, type, mode]);

  const onUnregistered = (t) => {
    // locally drop from registered list when user unregisters
    setRegisteredTests(prev => prev.filter(x => x.link !== t.link));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Tests Hub</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Search, filter, and explore tests.</p>
        </div>
        <div className="flex gap-2">
          {["open", "registered", "upcoming", "past"].map(key => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 rounded-xl text-sm border ${tab === key ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              {key === "open" ? "Open" :
               key === "registered" ? "Registered" :
               key === "upcoming" ? "Open/Upcoming" : "Past"}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800"
          placeholder="Search by title, subject, type, creator…"
        />
        <select
          className="px-3 py-2 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="px-3 py-2 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All types</option>
          {types.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="px-3 py-2 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="">All modes</option>
          {modes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : pageRows.length === 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6">
            <div className="text-slate-600 dark:text-slate-400">No tests match your filters.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pageRows.map((t) => (
              <TestCard
                key={t.link}
                test={t}
                registered={tab === "registered"}
                canUnregister={tab === "registered"}
                onUnregistered={onUnregistered}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Prev
          </button>
          <div className="px-3 py-1 text-sm">
            Page {page} of {pageCount}
          </div>
          <button
            className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
            disabled={page >= pageCount}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
