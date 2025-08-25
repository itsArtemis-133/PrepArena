// client/src/pages/TestsHub.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../api/axiosConfig";
import TestCard from "../components/TestCard";

const PAGE_SIZE = 12;

const computeWindow = (t) => {
  const start = t?.scheduledDate && dayjs(t.scheduledDate).isValid()
    ? dayjs(t.scheduledDate)
    : null;
  const end = start ? start.add(Number(t?.duration || 0), "minute") : null;
  const now = dayjs();
  const isUpcoming = !!(start && now.isBefore(start));
  const isLive = !!(start && end && now.isAfter(start) && now.isBefore(end));
  const isCompleted = !!(end && now.isAfter(end));
  return { start, end, now, isUpcoming, isLive, isCompleted };
};

function useQueryState() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = React.useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const get = React.useCallback(
    (key, fallback) => params.get(key) ?? fallback,
    [params]
  );

  const setMany = React.useCallback(
    (obj) => {
      const next = new URLSearchParams(location.search);
      Object.entries(obj).forEach(([k, v]) => {
        const isEmpty =
          v === undefined ||
          v === null ||
          v === "" ||
          (Array.isArray(v) && v.length === 0);
        if (isEmpty) next.delete(k);
        else next.set(k, Array.isArray(v) ? v.join(",") : String(v));
      });
      navigate(
        { pathname: location.pathname, search: `?${next.toString()}` },
        { replace: true }
      );
    },
    [location.pathname, location.search, navigate]
  );

  return { get, setMany };
}

const MultiChip = ({ label, options, value = [], onChange }) => {
  const toggle = (opt) => {
    const next = value.includes(opt)
      ? value.filter((x) => x !== opt)
      : [...value, opt];
    onChange(next);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt || "-"}
            onClick={() => toggle(opt)}
            className={
              "px-2.5 py-1 rounded-full text-xs border transition " +
              (value.includes(opt)
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800")
            }
          >
            {opt || "—"}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function TestsHub() {
  const { get, setMany } = useQueryState();

  const tab = (get("tab", "open") || "open").toLowerCase();
  const page = Math.max(1, parseInt(get("page", "1"), 10) || 1);
  const q = get("q", "");
  const subjectsSel = (get("subjects", "") || "").split(",").filter(Boolean);
  const typesSel = (get("types", "") || "").split(",").filter(Boolean);
  const modesSel = (get("modes", "") || "").split(",").filter(Boolean);

  const [loading, setLoading] = React.useState(true);
  const [raw, setRaw] = React.useState([]); // fetched list for current tab
  const [error, setError] = React.useState("");

  // fetch on tab change
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        let url = "/test/public";
        if (tab === "registered") url = "/test?scope=registered";
        if (tab === "upcoming" || tab === "past") url = "/test?scope=all";

        const res = await api.get(url);
        if (cancel) return;
        const list = res?.data?.tests || [];

        if (tab === "upcoming" || tab === "past") {
          const withFlags = list.map((t) => ({ t, w: computeWindow(t) }));
          const filtered =
            tab === "upcoming"
              ? withFlags
                  .filter((x) => x.w.isUpcoming || x.w.isLive)
                  .map((x) => x.t)
              : withFlags.filter((x) => x.w.isCompleted).map((x) => x.t);
          setRaw(filtered);
        } else {
          setRaw(list);
        }
      } catch (e) {
        if (!cancel)
          setError(
            e?.response?.data?.message || e.message || "Failed to load tests"
          );
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [tab]);

  // option pools
  const pools = React.useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter((x) => x !== undefined)));
    return {
      subjects: uniq(raw.map((t) => t.subject || "")),
      types: uniq(raw.map((t) => t.type || "")),
      modes: uniq(raw.map((t) => t.testMode || t.mode || "")),
    };
  }, [raw]);

  // filtering + search
  const filtered = React.useMemo(() => {
    const norm = (s) => String(s || "").toLowerCase();
    const parts = norm(q).split(/\s+/).filter(Boolean);

    return raw.filter((t) => {
      if (subjectsSel.length && !subjectsSel.includes(t.subject || "")) return false;
      if (typesSel.length && !typesSel.includes(t.type || "")) return false;
      const modeVal = t.testMode || t.mode || "";
      if (modesSel.length && !modesSel.includes(modeVal)) return false;

      if (parts.length) {
        const bag = norm(
          [t.title, t.description, t.subject, t.type, modeVal, t.createdBy?.username].join(
            " "
          )
        );
        for (const p of parts) if (!bag.includes(p)) return false;
      }
      return true;
    });
  }, [raw, q, subjectsSel, typesSel, modesSel]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  // debounced search
  const [searchDraft, setSearchDraft] = React.useState(q);
  React.useEffect(() => setSearchDraft(q), [q]);
  React.useEffect(() => {
  const id = setTimeout(() => setMany({ q: searchDraft, page: 1 }), 350);
  return () => clearTimeout(id);
}, [searchDraft, setMany]);


  const TabButton = ({ id, children }) => (
    <button
      onClick={() => setMany({ tab: id, page: 1 })}
      className={
        "px-3 py-1.5 rounded-xl text-sm border transition " +
        (tab === id
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800")
      }
    >
      {children}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-extrabold">Tests</h1>
        <div className="flex items-center gap-2">
          <TabButton id="open">Open</TabButton>
          <TabButton id="registered">Registered</TabButton>
          <TabButton id="upcoming">Upcoming</TabButton>
          <TabButton id="past">Past</TabButton>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by title, subject, creator…"
            className="w-full lg:w-1/2 px-3 py-2 rounded-xl border bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex flex-col gap-2">
            <MultiChip
              label="Subject"
              options={pools.subjects}
              value={subjectsSel}
              onChange={(v) => setMany({ subjects: v, page: 1 })}
            />
            <MultiChip
              label="Type"
              options={pools.types}
              value={typesSel}
              onChange={(v) => setMany({ types: v, page: 1 })}
            />
            <MultiChip
              label="Mode"
              options={pools.modes}
              value={modesSel}
              onChange={(v) => setMany({ modes: v, page: 1 })}
            />
          </div>
        </div>

        {(subjectsSel.length || typesSel.length || modesSel.length || q) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">Filters:</span>
            {subjectsSel.map((s) => (
              <span
                key={`s-${s}`}
                className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              >
                Subject: {s}
              </span>
            ))}
            {typesSel.map((s) => (
              <span
                key={`t-${s}`}
                className="px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
              >
                Type: {s}
              </span>
            ))}
            {modesSel.map((s) => (
              <span
                key={`m-${s}`}
                className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              >
                Mode: {s}
              </span>
            ))}
            <button
              onClick={() =>
                setMany({ q: "", subjects: [], types: [], modes: [], page: 1 })
              }
              className="ml-auto text-slate-600 dark:text-slate-300 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Content grid */}
      <div className="mt-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-slate-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 text-slate-600 dark:text-slate-400">
            No tests found with current filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {pageItems.map((t) => (
              <TestCard key={t.link || t._id} test={t} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          disabled={current <= 1}
          onClick={() => setMany({ page: current - 1 })}
          className={
            "px-3 py-1.5 rounded-xl border text-sm " +
            (current <= 1
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-slate-50 dark:hover:bg-gray-800")
          }
        >
          Prev
        </button>
        <span className="text-sm text-slate-600 dark:text-slate-300">
          Page {current} of {totalPages}
        </span>
        <button
          disabled={current >= totalPages}
          onClick={() => setMany({ page: current + 1 })}
          className={
            "px-3 py-1.5 rounded-xl border text-sm " +
            (current >= totalPages
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-slate-50 dark:hover:bg-gray-800")
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}
