// client/src/pages/TestsHub.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../api/axiosConfig";
import TestCard from "../components/TestCard";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  CalendarDaysIcon, // Icon for the date
} from "@heroicons/react/24/outline";

const PAGE_SIZE = 12;
const STARTING_SOON_MIN = 15;

// --- Reusable Helper & UI Components (No Changes Here) ---

const computeWindow = (t, now = dayjs()) => {
  const start = t?.scheduledDate && dayjs(t.scheduledDate).isValid() ? dayjs(t.scheduledDate) : null;
  const end = start ? start.add(Number(t?.duration || 0), "minute") : null;
  const isUpcoming = !!(start && now.isBefore(start));
  const isLive = !!(start && end && now.isAfter(start) && now.isBefore(end));
  const isCompleted = !!(end && now.isAfter(end));
  const minsToStart = start && now.isBefore(start) ? Math.max(0, Math.ceil(start.diff(now, "minute", true))) : null;
  const startingSoon = isUpcoming && minsToStart !== null && minsToStart <= STARTING_SOON_MIN;
  return { start, end, isUpcoming, isLive, isCompleted, minsToStart, startingSoon };
};

function Chip({ className = "", children }) {
  return (
    <span className={"inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded-full " + className}>
      {children}
    </span>
  );
}

function StatusBadge({ start, end, now }) {
  const isLive = !!(start && end && now.isAfter(start) && now.isBefore(end));
  const isUpcoming = !!(start && now.isBefore(start));
  const isCompleted = !!(end && now.isAfter(end));

  if (isLive) {
    return (
      <Chip className="bg-red-600/15 text-red-600 dark:bg-red-500/20 dark:text-red-300">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
        </span>
        LIVE
      </Chip>
    );
  }
  if (isUpcoming) {
    return <Chip className="bg-indigo-600/15 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-300">Upcoming</Chip>;
  }
  if (isCompleted) {
    return <Chip className="bg-gray-600/15 text-gray-700 dark:bg-gray-500/25 dark:text-gray-300">Completed</Chip>;
  }
  return null;
}

function useQueryState() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const get = React.useCallback((k, fb) => params.get(k) ?? fb, [params]);
  const setMany = React.useCallback(
    (obj) => {
      const next = new URLSearchParams(location.search);
      Object.entries(obj).forEach(([k, v]) => {
        const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) next.delete(k);
        else next.set(k, Array.isArray(v) ? v.join(",") : String(v));
      });
      navigate({ pathname: location.pathname, search: `?${next.toString()}` }, { replace: true });
    },
    [location.pathname, location.search, navigate]
  );
  return { get, setMany };
}

function DropdownMulti({ label, options, value = [], onChange }) {
  const [open, setOpen] = React.useState(false);
  const toggle = (opt) => {
    const next = value.includes(opt) ? value.filter((x) => x !== opt) : [...value, opt];
    onChange(next);
  };
  const selectedText = value.length ? `${label} (${value.length})` : label;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold text-left flex justify-between items-center"
      >
        <span>{selectedText}</span>
        <ChevronRightIcon className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 shadow-lg p-2">
          <div className="max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">No options</div>
            ) : (
              options.map((opt) => (
                <label key={opt || "-"} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" checked={value.includes(opt)} onChange={() => toggle(opt)} />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt || "—"}</span>
                </label>
              ))
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button className="text-sm text-gray-600 dark:text-gray-300 hover:underline" onClick={() => onChange([])}>Clear</button>
            <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TestActions({ test, tab, onRegistered, onUnregistered }) {
  const navigate = useNavigate();
  const now = dayjs();

  const [alreadySubmitted, setAlreadySubmitted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancel = false;
    if (!test?._id) return;
    (async () => {
      try {
        const res = await api.get(`/test/${test._id}/results/me`);
        if (cancel) return;
        if (res?.data?.available) {
          setAlreadySubmitted(true);
        }
      } catch { /* no-op */ }
    })();
    return () => { cancel = true; };
  }, [test?._id]);

  const goBridge = () => navigate(`/test/${test.link}`, { state: { prefetch: test } });
  const goRunner = () => navigate(`/tests/${test.link}/take`, { state: { prefetch: test } });

  const register = async () => {
    setBusy(true);
    try {
      await api.post(`/test/${test.link}/register`);
      onRegistered?.(test);
      goBridge();
    } catch (err) {
      if (err?.response?.status === 401) navigate(`/login?next=/test/${test.link}`);
      else alert(err?.response?.data?.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  const unregister = async () => {
    setBusy(true);
    try {
      await api.post(`/test/${test.link}/unregister`);
      onUnregistered?.(test, { removeFromList: tab === "upcoming" });
    } catch (e) {
      alert(e?.response?.data?.message || "Could not unregister.");
    } finally {
      setBusy(false);
    }
  };

  const { isUpcoming, isLive, isCompleted, startingSoon } = computeWindow(test, now);
  const registered = !!test.isRegistered;

  const showJoin = registered && (isLive || startingSoon);
  const showRegister = !registered && (isUpcoming || isLive);
  const showDetails = !registered || (registered && !isLive);
  const canShowUnregister = registered && isUpcoming;
  
  return (
    <div className="flex items-center justify-end gap-2 shrink-0">
      {showDetails && (
        <button
          onClick={goBridge}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {isCompleted ? "Results" : "View"}
        </button>
      )}

      {(showJoin || showRegister) && (
        <button
          disabled={busy}
          onClick={alreadySubmitted ? goBridge : isLive ? goRunner : register}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
        >
          {alreadySubmitted
            ? "View Submission"
            : isLive
            ? "Enter"
            : showJoin
            ? "Join"
            : "Register"}
        </button>
      )}
      
      {canShowUnregister && (
        <button
          disabled={busy}
          onClick={unregister}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 hover:underline disabled:opacity-50"
        >
          {busy ? "..." : "Unregister"}
        </button>
      )}
    </div>
  );
}


function TestRow({ test, tab, onRegistered, onUnregistered }) {
  const navigate = useNavigate();
  const now = dayjs();
  const { start, end } = computeWindow(test, now);

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-indigo-500/50 dark:hover:border-indigo-500 transition-colors">
      <div className="flex-1 w-full">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <StatusBadge start={start} end={end} now={now} />
          <button onClick={() => navigate(`/test/${test.link}`, { state: { prefetch: test } })} className="font-bold text-lg text-gray-800 dark:text-gray-100 hover:underline text-left">{test.title || "Untitled"}</button>
          {!!test.isRegistered && !computeWindow(test, now).startingSoon && !computeWindow(test, now).isLive && (
             <Chip className="bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300">Registered</Chip>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {test.subject || "No Subject"} • By {test.createdBy?.username || "—"}
        </p>
      </div>
      <div className="flex items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 shrink-0 flex-wrap">
        {/* --- DATE ADDED HERE --- */}
        <div className="flex items-center gap-1.5" title="Scheduled date">
          <CalendarDaysIcon className="h-4 w-4" />
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {start ? start.format("DD MMM, HH:mm") : "Unscheduled"}
          </span>
        </div>
        {/* --- END OF ADDED DATE --- */}
        <div className="flex items-center gap-1.5">
          <strong className="font-semibold text-gray-700 dark:text-gray-200">{test.duration || '—'}</strong> min
        </div>
        <div className="flex items-center gap-1.5">
          <strong className="font-semibold text-gray-700 dark:text-gray-200">{test.questionCount || '—'}</strong> Qs
        </div>
        <div className="flex items-center gap-1.5">
          <strong className="font-semibold text-gray-700 dark:text-gray-200">{test.registrationCount || 0}</strong> Registered
        </div>
      </div>
      <div className="w-full sm:w-auto pt-4 sm:pt-0 sm:border-0 border-t border-gray-200 dark:border-gray-700">
        <TestActions
          test={test}
          tab={tab}
          onRegistered={onRegistered}
          onUnregistered={onUnregistered}
        />
      </div>
    </div>
  );
}

const TabButton = ({ active, children, onClick }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 ${active ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
    {children}
  </button>
);

const ViewButton = ({ active, children, onClick }) => (
  <button onClick={onClick} className={`p-2 rounded-lg transition-colors duration-300 ${active ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
    {children}
  </button>
);


// --- Main Page Component (No Changes below this line) ---

export default function TestsHub() {
  const { get, setMany } = useQueryState();

  const tab = (get("tab", "open") || "open").toLowerCase();
  const page = Math.max(1, parseInt(get("page", "1"), 10) || 1);
  const q = get("q", "");
  const subjectsSel = (get("subjects", "") || "").split(",").filter(Boolean);
  const typesSel = (get("types", "") || "").split(",").filter(Boolean);
  const modesSel = (get("modes", "") || "").split(",").filter(Boolean);
  const sort = get("sort", "dateSoon");
  
  const defaultView = tab === 'open' ? 'list' : 'grid';
  const view = get('view', defaultView);

  const [loading, setLoading] = React.useState(true);
  const [raw, setRaw] = React.useState([]);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        let url = "/test/public";
        if (tab === "upcoming") url = "/test?scope=registered";
        else if (tab === "created") url = "/test?scope=created";
        else if (tab === "past") url = "/test?scope=all";

        const res = await api.get(url);
        if (cancel) return;
        const list = res?.data?.tests || [];

        if (tab === "upcoming") setRaw(list.filter((t) => { const w = computeWindow(t); return w.isUpcoming || w.isLive; }));
        else if (tab === "past") setRaw(list.filter((t) => computeWindow(t).isCompleted));
        else setRaw(list);
      } catch (e) {
        if (!cancel) setError(e?.response?.data?.message || e.message || "Failed to load tests");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [tab]);

  const pools = React.useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
    return {
      subjects: uniq(raw.map((t) => t.subject || "")),
      types: uniq(raw.map((t) => t.type || "")),
      modes: uniq(raw.map((t) => t.testMode || t.mode || "")),
    };
  }, [raw]);

  const filtered = React.useMemo(() => {
    const norm = (s) => String(s || "").toLowerCase();
    const parts = norm(q).split(/\s+/).filter(Boolean);
    return raw.filter((t) => {
      if (subjectsSel.length && !subjectsSel.includes(t.subject || "")) return false;
      if (typesSel.length && !typesSel.includes(t.type || "")) return false;
      const modeVal = t.testMode || t.mode || "";
      if (modesSel.length && !modesSel.includes(modeVal)) return false;
      if (parts.length) {
        const bag = norm([t.title, t.description, t.subject, t.type, modeVal, t.createdBy?.username].join(" "));
        for (const p of parts) if (!bag.includes(p)) return false;
      }
      return true;
    });
  }, [raw, q, subjectsSel, typesSel, modesSel]);

  const sorted = React.useMemo(() => {
    const arr = filtered.slice();
    const getStart = (t) => t?.scheduledDate && dayjs(t.scheduledDate).isValid() ? dayjs(t.scheduledDate).valueOf() : Number.MAX_SAFE_INTEGER;
    if (sort === "titleAz") arr.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    else if (sort === "titleZa") arr.sort((a, b) => String(b.title || "").localeCompare(String(a.title || "")));
    else if (sort === "dateLate") arr.sort((a, b) => getStart(b) - getStart(a));
    else arr.sort((a, b) => getStart(a) - getStart(b));
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const startIdx = (current - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(startIdx, startIdx + PAGE_SIZE);

  const [searchDraft, setSearchDraft] = React.useState(q);
  React.useEffect(() => setSearchDraft(q), [q]);
  React.useEffect(() => {
    const id = setTimeout(() => setMany({ q: searchDraft, page: 1 }), 350);
    return () => clearTimeout(id);
  }, [searchDraft]);

  const handleRegistered = (t) => {
    const key = t._id || t.link;
    setRaw((prev) => prev.map((x) => x._id === key || x.link === key ? { ...x, isRegistered: true, registrationCount: Number(x.registrationCount || 0) + 1 } : x));
  };
  const handleUnregistered = (t, { removeFromList = false } = {}) => {
    const key = t._id || t.link;
    if (removeFromList) {
      setRaw((prev) => prev.filter((x) => !(x._id === key || x.link === key)));
      return;
    }
    setRaw((prev) => prev.map((x) => x._id === key || x.link === key ? { ...x, isRegistered: false, registrationCount: Math.max(0, Number(x.registrationCount || 0) - 1) } : x));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={view === "list" ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"}>
          {Array.from({ length: view === 'list' ? 6 : 9 }).map((_, i) =>
            view === 'list' ? <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" /> : <div key={i} className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          )}
        </div>
      );
    }
    if (error) {
      return <div className="rounded-2xl border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-900/20 p-8 text-center text-red-700 dark:text-red-400">{error}</div>;
    }
    if (pageItems.length === 0) {
      return <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">No tests found. Try adjusting your filters.</div>;
    }
    if (view === "list") {
      return (
        <div className="space-y-4">
          {pageItems.map((t) => <TestRow key={t.link || t._id} test={t} tab={tab} onRegistered={handleRegistered} onUnregistered={handleUnregistered} />)}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {pageItems.map((t) => <TestCard key={t.link || t._id} test={t} registered={!!t.isRegistered} onRegistered={handleRegistered} onUnregistered={(test) => handleUnregistered(test, { removeFromList: tab === "upcoming" })} />)}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Test Hub</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Find, join, and review public and registered tests.</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <aside className="lg:col-span-1 lg:sticky lg:top-8 space-y-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="Search tests..." className="w-full pl-11 pr-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select className="w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={sort} onChange={(e) => setMany({ sort: e.target.value, page: 1 })}>
            <option value="dateSoon">Sort: Date (Soonest)</option>
            <option value="dateLate">Sort: Date (Latest)</option>
            <option value="titleAz">Sort: Title (A-Z)</option>
            <option value="titleZa">Sort: Title (Z-A)</option>
          </select>
          <DropdownMulti label="Subject" options={pools.subjects} value={subjectsSel} onChange={(v) => setMany({ subjects: v, page: 1 })} />
          <DropdownMulti label="Type" options={pools.types} value={typesSel} onChange={(v) => setMany({ types: v, page: 1 })} />
          <DropdownMulti label="Mode" options={pools.modes} value={modesSel} onChange={(v) => setMany({ modes: v, page: 1 })} />
        </aside>
        <main className="lg:col-span-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded-xl inline-flex items-center gap-1 self-start flex-wrap">
              <TabButton active={tab === "open"} onClick={() => setMany({ tab: "open", page: 1 })}>Public Tests</TabButton>
              <TabButton active={tab === "upcoming"} onClick={() => setMany({ tab: "upcoming", page: 1 })}>My Upcoming</TabButton>
              <TabButton active={tab === "created"} onClick={() => setMany({ tab: "created", page: 1 })}>Created by Me</TabButton>
              <TabButton active={tab === "past"} onClick={() => setMany({ tab: "past", page: 1 })}>My Past Tests</TabButton>
            </div>
            <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl self-start sm:self-center">
              <ViewButton active={view === 'list'} onClick={() => setMany({ view: 'list' })}><ListBulletIcon className="h-5 w-5" /></ViewButton>
              <ViewButton active={view === 'grid'} onClick={() => setMany({ view: 'grid' })}><Squares2X2Icon className="h-5 w-5" /></ViewButton>
            </div>
          </div>
          {renderContent()}
          {pageItems.length > 0 && (
             <div className="mt-8 flex items-center justify-center gap-2">
                <button disabled={current <= 1} onClick={() => setMany({ page: current - 1 })} className="p-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"><ChevronLeftIcon className="h-5 w-5" /></button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Page {current} of {totalPages}</span>
                <button disabled={current >= totalPages} onClick={() => setMany({ page: current + 1 })} className="p-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"><ChevronRightIcon className="h-5 w-5" /></button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}