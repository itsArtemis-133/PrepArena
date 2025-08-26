import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../api/axiosConfig";
import TestCard from "../components/TestCard";

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

const TabButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={
      "px-3 py-1.5 rounded-xl text-sm border transition " +
      (active
        ? "bg-blue-600 text-white border-blue-600 shadow"
        : "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800")
    }
  >
    {children}
  </button>
);

/* Dropdown multi-select with checkboxes (prevents tag flood) */
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
        className="px-3 py-2 rounded-xl border bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-sm"
      >
        {selectedText}
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-56 rounded-xl border bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-700 shadow-lg p-2">
          <div className="max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-2 py-1 text-sm text-slate-500">No options</div>
            ) : (
              options.map((opt) => (
                <label
                  key={opt || "-"}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={value.includes(opt)}
                    onChange={() => toggle(opt)}
                  />
                  <span className="text-sm">{opt || "—"}</span>
                </label>
              ))
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              className="text-sm text-slate-600 dark:text-slate-300 hover:underline"
              onClick={() => onChange([])}
            >
              Clear
            </button>
            <button
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestsHub() {
  const { get, setMany } = useQueryState();
  const navigate = useNavigate();

  // Tabs: Open (table), Upcoming (grid), Past (grid)
  const tab = (get("tab", "open") || "open").toLowerCase();
  const page = Math.max(1, parseInt(get("page", "1"), 10) || 1);
  const q = get("q", "");
  const subjectsSel = (get("subjects", "") || "").split(",").filter(Boolean);
  const typesSel = (get("types", "") || "").split(",").filter(Boolean);
  const modesSel = (get("modes", "") || "").split(",").filter(Boolean);
  const sort = get("sort", "dateSoon"); // dateSoon | dateLate | titleAz | titleZa

  const [loading, setLoading] = React.useState(true);
  const [raw, setRaw] = React.useState([]);
  const [error, setError] = React.useState("");

  const [registeredSet, setRegisteredSet] = React.useState(() => new Set());

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");

        let url = "/test/public";
        if (tab === "upcoming" || tab === "past") url = "/test?scope=all";

        const res = await api.get(url);
        if (cancel) return;
        const list = res?.data?.tests || [];

        if (tab === "upcoming" || tab === "past") {
          const withFlags = list.map((t) => ({ t, w: computeWindow(t) }));
          const filtered =
            tab === "upcoming"
              ? withFlags.filter((x) => x.w.isUpcoming || x.w.isLive).map((x) => x.t)
              : withFlags.filter((x) => x.w.isCompleted).map((x) => x.t);
          setRaw(filtered);
        } else {
          setRaw(list);
        }
      } catch (e) {
        if (!cancel) setError(e?.response?.data?.message || e.message || "Failed to load tests");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [tab]);

  // Registered pool
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await api.get("/test", { params: { scope: "registered" } });
        if (cancel) return;
        const tests = res?.data?.tests || [];
        const s = new Set(tests.map((x) => x.link || x._id));
        setRegisteredSet(s);
      } catch {
        if (!cancel) setRegisteredSet(new Set());
      }
    })();
    return () => { cancel = true; };
  }, []);

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

    if (sort === "titleAz") {
      arr.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    } else if (sort === "titleZa") {
      arr.sort((a, b) => String(b.title || "").localeCompare(String(a.title || "")));
    } else if (sort === "dateLate") {
      arr.sort((a, b) => getStart(b) - getStart(a));
    } else {
      arr.sort((a, b) => getStart(a) - getStart(b)); // dateSoon default
    }
    return arr;
  }, [filtered, sort]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const startIdx = (current - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(startIdx, startIdx + PAGE_SIZE);

  // search debounce
  const [searchDraft, setSearchDraft] = React.useState(q);
  React.useEffect(() => setSearchDraft(q), [q]);
  React.useEffect(() => {
    const id = setTimeout(() => setMany({ q: searchDraft, page: 1 }), 350);
    return () => clearTimeout(id);
  }, [searchDraft]);

  // Register/unregister callbacks
  const handleRegistered = (t) => {
    const key = t.link || t._id;
    setRegisteredSet((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setRaw((prev) =>
      prev.map((x) =>
        (x.link || x._id) === key
          ? { ...x, registrationCount: Number(x.registrationCount || 0) + 1 }
          : x
      )
    );
  };

  const handleUnregistered = (t) => {
    const key = t.link || t._id;
    setRegisteredSet((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setRaw((prev) =>
      prev.map((x) =>
        (x.link || x._id) === key
          ? { ...x, registrationCount: Math.max(0, Number(x.registrationCount || 0) - 1) }
          : x
      )
    );
  };

  const goView = (t) => navigate(`/test/${t.link}`, { state: { prefetch: t } });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-extrabold">Tests</h1>
        <div className="flex items-center gap-2">
          <TabButton active={tab === "open"} onClick={() => setMany({ tab: "open", page: 1 })}>Open</TabButton>
          <TabButton active={tab === "upcoming"} onClick={() => setMany({ tab: "upcoming", page: 1 })}>Upcoming</TabButton>
          <TabButton active={tab === "past"} onClick={() => setMany({ tab: "past", page: 1 })}>Past</TabButton>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-4">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
          <div className="flex-1">
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search by title, subject, creator…"
              className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DropdownMulti
              label="Subject"
              options={pools.subjects}
              value={subjectsSel}
              onChange={(v) => setMany({ subjects: v, page: 1 })}
            />
            <DropdownMulti
              label="Type"
              options={pools.types}
              value={typesSel}
              onChange={(v) => setMany({ types: v, page: 1 })}
            />
            <DropdownMulti
              label="Mode"
              options={pools.modes}
              value={modesSel}
              onChange={(v) => setMany({ modes: v, page: 1 })}
            />

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Sort</span>
              <select
                className="px-2 py-1.5 rounded-xl border bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-sm"
                value={sort}
                onChange={(e) => setMany({ sort: e.target.value, page: 1 })}
              >
                <option value="dateSoon">Date · Soonest</option>
                <option value="dateLate">Date · Latest</option>
                <option value="titleAz">Title · A→Z</option>
                <option value="titleZa">Title · Z→A</option>
              </select>
            </div>
          </div>
        </div>

        {(subjectsSel.length || typesSel.length || modesSel.length || q) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">Filters:</span>
            {[...subjectsSel.map((s) => ["Subject", s]), ...typesSel.map((s) => ["Type", s]), ...modesSel.map((s) => ["Mode", s])].map(([k, v]) => (
              <span
                key={`${k}-${v}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-700/70 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
              >
                <span className="opacity-70">{k}:</span>
                <span className="font-medium">{v}</span>
                <button
                  onClick={() => {
                    if (k === "Subject") setMany({ subjects: subjectsSel.filter((x) => x !== v), page: 1 });
                    if (k === "Type") setMany({ types: typesSel.filter((x) => x !== v), page: 1 });
                    if (k === "Mode") setMany({ modes: modesSel.filter((x) => x !== v), page: 1 });
                  }}
                  className="ml-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 px-1"
                  aria-label="Remove"
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              onClick={() => setMany({ q: "", subjects: [], types: [], modes: [], page: 1 })}
              className="ml-auto text-slate-600 dark:text-slate-300 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-4">
        {loading ? (
          <div className={tab === "open" ? "space-y-2" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"}>
            {Array.from({ length: tab === "open" ? 6 : 8 }).map((_, i) =>
              tab === "open" ? (
                <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-gray-800 animate-pulse" />
              ) : (
                <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
              )
            )}
          </div>
        ) : error ? (
          <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 text-slate-600 dark:text-slate-400">
            No tests found with current filters.
          </div>
        ) : tab === "open" ? (
          // Re-grouped columns for OPEN; removed Status; add action-side border
          <div className="overflow-x-auto rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800">
                <tr className="text-left text-slate-700 dark:text-slate-300">
                  <th className="px-4 py-3">Title / Subject</th>
                  <th className="px-4 py-3">Type / Mode</th>
                  <th className="px-4 py-3">Duration / Schedule</th>
                  <th className="px-4 py-3">Creator / Rating</th>
                  <th className="px-4 py-3 text-right border-l border-slate-200 dark:border-slate-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t, i) => {
                  const key = t.link || t._id;
                  const reg = registeredSet.has(key) || !!t.isCreator || !!t.isRegistered || !!t.registered;
                  const { isUpcoming, isLive, minsToStart } = computeWindow(t);
                  const startingSoon = isUpcoming && minsToStart !== null && minsToStart <= STARTING_SOON_MIN;

                  return (
                    <tr key={key} className={i % 2 ? "bg-white dark:bg-gray-900" : "bg-slate-50/40 dark:bg-gray-800/40"}>
                      <td className="px-4 py-3 align-top">
                        <button onClick={() => goView(t)} className="font-semibold hover:underline block text-left">
                          {t.title || "Untitled Test"}
                        </button>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t.subject || "—"}</div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div>{t.type || "—"}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t.testMode || t.mode || "—"}</div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div>{Number(t.duration) ? `${t.duration} min` : "—"}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {t.scheduledDate && dayjs(t.scheduledDate).isValid()
                            ? dayjs(t.scheduledDate).format("DD MMM, HH:mm")
                            : "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="truncate">{t?.createdBy?.username || "—"}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {Number.isFinite(t?.createdBy?.creatorRatingAvg) && Number(t?.createdBy?.creatorRatingCount) > 0
                            ? `★ ${Math.round(t.createdBy.creatorRatingAvg * 10) / 10} · ${t.createdBy.creatorRatingCount}`
                            : "New"}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-right border-l border-slate-200 dark:border-slate-800">
                        <OpenRowActions
                          t={t}
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
          // GRID
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {pageItems.map((t) => {
              const key = t.link || t._id;
              const registered = registeredSet.has(key) || !!t.isCreator || !!t.isRegistered || !!t.registered;
              return (
                <TestCard
                  key={key}
                  test={t}
                  registered={registered}
                  onRegistered={handleRegistered}
                  onUnregistered={handleUnregistered}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          disabled={current <= 1}
          onClick={() => setMany({ page: current - 1 })}
          className={"px-3 py-1.5 rounded-xl border text-sm " + (current <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-gray-800")}
        >
          Prev
        </button>
        <span className="text-sm text-slate-700 dark:text-slate-300">
          Page {current} of {totalPages}
        </span>
        <button
          disabled={current >= totalPages}
          onClick={() => setMany({ page: current + 1 })}
          className={"px-3 py-1.5 rounded-xl border text-sm " + (current >= totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-gray-800")}
        >
          Next
        </button>
      </div>
    </div>
  );

  // function goView(t) {
  //   navigate(`/test/${t.link}`, { state: { prefetch: t } });
  // }
}

/* ------------------- Actions cell for OPEN table ------------------- */
function OpenRowActions({ t, registered, startingSoon, isLive, onRegistered, onUnregistered }) {
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
      else alert("Registration failed. Please try again.");
    }
  };

  const unregister = async () => {
    setBusy(true);
    try {
      await api.post(`/test/${t.link}/unregister`);
      onUnregistered?.(t);
    } catch {
      alert("Could not unregister. It may be too close to start time.");
    } finally {
      setBusy(false);
    }
  };

  // Decisions
  const showJoin = registered && (isLive || startingSoon);
  const showRegisteredPill = registered && !showJoin;

  return (
    <div className="inline-flex items-center gap-2">
      {showJoin && (
        <button
          onClick={isLive ? goRunner : goBridge}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
        >
          {isLive ? "Enter" : "Join"}
        </button>
      )}

      {!registered && (
        <button
          onClick={register}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
        >
          {isLive ? "Enter" : "Register"}
        </button>
      )}

      <button
        onClick={goBridge}
        className="px-3 py-1.5 rounded-lg border text-xs hover:bg-slate-50 dark:hover:bg-gray-800"
      >
        View
      </button>

      {showRegisteredPill && (
        <span className="px-2 py-1 text-[11px] rounded-full bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300">
          Registered
        </span>
      )}

      {registered && (
        <button
          disabled={busy}
          onClick={unregister}
          className="text-xs text-slate-600 dark:text-slate-300 hover:text-red-500 hover:underline disabled:opacity-50"
        >
          {busy ? "…" : "Unregister"}
        </button>
      )}
    </div>
  );
}
