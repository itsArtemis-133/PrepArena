// client/src/pages/TestsHub.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../api/axiosConfig";
import TestCard from "../components/TestCard";
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const PAGE_SIZE = 12;
const STARTING_SOON_MIN = 15;

const computeWindow = (t, now = dayjs()) => {
  const start = t?.scheduledDate && dayjs(t.scheduledDate).isValid() ? dayjs(t.scheduledDate) : null;
  const end = start ? start.add(Number(t?.duration || 0), "minute") : null;
  const isUpcoming = !!(start && now.isBefore(start));
  const isLive = !!(start && end && now.isAfter(start) && now.isBefore(end));
  const isCompleted = !!(end && now.isAfter(end));
  const minsToStart = start && now.isBefore(start) ? Math.max(0, Math.ceil(start.diff(now, "minute", true))) : null;
  return { start, end, isUpcoming, isLive, isCompleted, minsToStart };
};

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
        className="px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold w-full text-left flex justify-between items-center"
      >
        <span>{selectedText}</span>
        <ChevronRightIcon className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-56 rounded-xl border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 shadow-lg p-2">
          <div className="max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">No options</div>
            ) : (
              options.map((opt) => (
                <label
                  key={opt || "-"}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    checked={value.includes(opt)}
                    onChange={() => toggle(opt)}
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt || "—"}</span>
                </label>
              ))
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button className="text-sm text-gray-600 dark:text-gray-300 hover:underline" onClick={() => onChange([])}>
              Clear
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OpenRowActions({ t, registered, startingSoon, isLive, onRegistered, onUnregistered, tab }) {
  const navigate = useNavigate();
  const goBridge = () => navigate(`/test/${t.link}`, { state: { prefetch: t } });
  const goRunner = () => navigate(`/tests/${t.link}/take`, { state: { prefetch: t } });
  const [busy, setBusy] = React.useState(false);

  const register = async () => {
    try {
      await api.post(`/test/${t.link}/register`);
      onRegistered?.(t);
      goBridge();
    } catch (err) {
      if (err?.response?.status === 401) navigate(`/login?next=/test/${t.link}`);
      else alert(err?.response?.data?.message || "Registration failed. Please try again.");
    }
  };

  const unregister = async () => {
    setBusy(true);
    try {
      // IMPORTANT: server expects POST (not DELETE)
      await api.post(`/test/${t.link}/unregister`);
      onUnregistered?.(t, { removeFromList: tab === "upcoming" });
    } catch (e) {
      const msg = e?.response?.data?.message || "Could not unregister.";
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  const { isCompleted } = computeWindow(t);
  const showJoin = registered && (isLive || startingSoon);
  const showRegisteredPill = registered && !showJoin;
  const canShowUnregister = registered && !isCompleted;

  return (
    <div className="flex items-center justify-end gap-2">
      {showRegisteredPill && (
        <span className="px-2 py-1 text-[11px] font-semibold rounded-full bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300">
          Registered
        </span>
      )}
      <button
        onClick={goBridge}
        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        View
      </button>
      {(showJoin || !registered) && (
        <button
          onClick={showJoin ? (isLive ? goRunner : goBridge) : register}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
        >
          {isLive ? "Enter" : showJoin ? "Join" : "Register"}
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

const TabButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 ${
      active ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
    }`}
  >
    {children}
  </button>
);

export default function TestsHub() {
  const { get, setMany } = useQueryState();
  const navigate = useNavigate();

  const tab = (get("tab", "open") || "open").toLowerCase();
  const page = Math.max(1, parseInt(get("page", "1"), 10) || 1);
  const q = get("q", "");
  const subjectsSel = (get("subjects", "") || "").split(",").filter(Boolean);
  const typesSel = (get("types", "") || "").split(",").filter(Boolean);
  const modesSel = (get("modes", "") || "").split(",").filter(Boolean);
  const sort = get("sort", "dateSoon");

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
        if (tab === "upcoming") url = "/test?scope=registered"; // only signed-up tests
        else if (tab === "created") url = "/test?scope=created"; // created by me
        else if (tab === "past") url = "/test?scope=all"; // filter completed below

        const res = await api.get(url);
        if (cancel) return;
        const list = res?.data?.tests || [];

        if (tab === "upcoming") {
          setRaw(list.filter((t) => {
            const w = computeWindow(t);
            return w.isUpcoming || w.isLive;
          }));
        } else if (tab === "past") {
          setRaw(list.filter((t) => computeWindow(t).isCompleted));
        } else {
          setRaw(list);
        }
      } catch (e) {
        if (!cancel) setError(e?.response?.data?.message || e.message || "Failed to load tests");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
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
    const getStart = (t) =>
      t?.scheduledDate && dayjs(t.scheduledDate).isValid()
        ? dayjs(t.scheduledDate).valueOf()
        : Number.MAX_SAFE_INTEGER;
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

  // Optimistic handlers — keep UI snappy and consistent
  const handleRegistered = (t) => {
    const key = t._id || t.link;
    setRaw((prev) =>
      prev.map((x) =>
        x._id === key || x.link === key
          ? { ...x, isRegistered: true, registrationCount: Number(x.registrationCount || 0) + 1 }
          : x
      )
    );
  };

  const handleUnregistered = (t, { removeFromList = false } = {}) => {
    const key = t._id || t.link;
    // If we're in "My Upcoming", remove the item entirely from the list after unregistration.
    if (removeFromList) {
      setRaw((prev) => prev.filter((x) => !(x._id === key || x.link === key)));
      return;
    }
    // Otherwise, just flip the flag and decrement count.
    setRaw((prev) =>
      prev.map((x) =>
        x._id === key || x.link === key
          ? { ...x, isRegistered: false, registrationCount: Math.max(0, Number(x.registrationCount || 0) - 1) }
          : x
      )
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Test Hub</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Find, join, and review public and registered tests.</p>
        <div className="mt-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl inline-flex items-center gap-1">
          <TabButton active={tab === "open"} onClick={() => setMany({ tab: "open", page: 1 })}>
            Public Tests
          </TabButton>
          <TabButton active={tab === "upcoming"} onClick={() => setMany({ tab: "upcoming", page: 1 })}>
            My Upcoming
          </TabButton>
          <TabButton active={tab === "created"} onClick={() => setMany({ tab: "created", page: 1 })}>
            Created by Me
          </TabButton>
          <TabButton active={tab === "past"} onClick={() => setMany({ tab: "past", page: 1 })}>
            My Past Tests
          </TabButton>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        <div className="md:col-span-3 relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by title, subject, creator…"
            className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="md:col-span-1">
          <select
            className="w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={sort}
            onChange={(e) => setMany({ sort: e.target.value, page: 1 })}
          >
            <option value="dateSoon">Sort: Date (Soonest)</option>
            <option value="dateLate">Sort: Date (Latest)</option>
            <option value="titleAz">Sort: Title (A-Z)</option>
            <option value="titleZa">Sort: Title (Z-A)</option>
          </select>
        </div>
        <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DropdownMulti label="Subject" options={pools.subjects} value={subjectsSel} onChange={(v) => setMany({ subjects: v, page: 1 })} />
          <DropdownMulti label="Type" options={pools.types} value={typesSel} onChange={(v) => setMany({ types: v, page: 1 })} />
          <DropdownMulti label="Mode" options={pools.modes} value={modesSel} onChange={(v) => setMany({ modes: v, page: 1 })} />
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className={tab === "open" ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"}>
            {Array.from({ length: tab === "open" ? 6 : 8 }).map((_, i) =>
              tab === "open" ? (
                <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ) : (
                <div key={i} className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              )
            )}
          </div>
        ) : error ? (
          <div className="rounded-2xl border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-900/20 p-8 text-center text-red-700 dark:text-red-400">{error}</div>
        ) : pageItems.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            No tests found. Try adjusting your filters.
          </div>
        ) : tab === "open" ? (
          <div className="overflow-x-auto rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr className="text-left text-gray-600 dark:text-gray-300 font-semibold">
                  <th className="px-6 py-4">Title / Subject</th>
                  <th className="px-6 py-4">Schedule</th>
                  <th className="px-6 py-4">Creator</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t) => {
                  const key = t.link || t._id;
                  const reg = !!t.isRegistered; // rely on backend
                  const { isUpcoming, isLive, minsToStart } = computeWindow(t);
                  const startingSoon = isUpcoming && minsToStart !== null && minsToStart <= STARTING_SOON_MIN;
                  return (
                    <tr key={key} className="border-t border-gray-200 dark:border-gray-800">
                      <td className="px-6 py-4 align-top">
                        <button
                          onClick={() => navigate(`/test/${t.link}`, { state: { prefetch: t } })}
                          className="font-bold text-gray-800 dark:text-gray-100 hover:underline block text-left"
                        >
                          {t.title || "Untitled"}
                        </button>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.subject || "—"}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {t.scheduledDate ? dayjs(t.scheduledDate).format("DD MMM, HH:mm") : "—"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.duration ? `${t.duration} min` : "—"}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {t?.createdBy?.username || "—"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Rating:{" "}
                          {Number.isFinite(t?.createdBy?.creatorRatingAvg)
                            ? `★ ${Math.round(t.createdBy.creatorRatingAvg * 10) / 10}`
                            : "New"}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <OpenRowActions
                          t={t}
                          tab={tab}
                          registered={reg}
                          startingSoon={startingSoon}
                          isLive={isLive}
                          onRegistered={handleRegistered}
                          onUnregistered={handleUnregistered}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pageItems.map((t) => {
              const key = t.link || t._id;
              return (
                <TestCard
                  key={key}
                  test={t}
                  registered={!!t.isRegistered}
                  onRegistered={handleRegistered}
                  onUnregistered={(test) => handleUnregistered(test, { removeFromList: tab === "upcoming" })}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        <button
          disabled={current <= 1}
          onClick={() => setMany({ page: current - 1 })}
          className="p-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Page {current} of {totalPages}
        </span>
        <button
          disabled={current >= totalPages}
          onClick={() => setMany({ page: current + 1 })}
          className="p-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
