// client/src/pages/TestBridge.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "../api/axiosConfig";

dayjs.extend(relativeTime);

// -------------------- MERGE + VALIDATION HELPERS --------------------
const NUMERIC_KEYS = new Set(["duration", "questionCount"]);
const BOOL_KEYS = new Set(["isPublic", "isCreator"]);
const SIMPLE_KEYS = [
  "title",
  "description",
  "subject",
  "type",
  "testMode",
  "duration",
  "questionCount",
  "scheduledDate",
  "status",
  "isPublic",
  "pdfUrl",
  "link",
  "isCreator",
  "syllabus",
  "registrationCount",
];

const isEmpty = (k, v) => {
  if (v === undefined || v === null) return true;
  if (NUMERIC_KEYS.has(k)) {
    const n = Number(v);
    return !Number.isFinite(n) || n <= 0;
  }
  if (k === "scheduledDate") {
    return !dayjs(v).isValid();
  }
  if (BOOL_KEYS.has(k)) {
    return typeof v !== "boolean";
  }
  if (typeof v === "string") return v.trim() === "";
  return false;
};

const prefer = (k, prevVal, nextVal) => (isEmpty(k, nextVal) ? prevVal : nextVal);

function mergeTest(prev = {}, next = {}, debugRows = []) {
  const merged = { ...prev, ...next };

  SIMPLE_KEYS.forEach((k) => {
    const chosen = prefer(k, prev[k], next[k]);
    if (debugRows) debugRows.push({ field: k, prev: prev[k], next: next[k], chosen });
    merged[k] = chosen;
  });

  const a = prev?.createdBy || {};
  const b = next?.createdBy || {};
  const chosenCreatedBy = {
    _id: prefer("_id", a?._id, b?._id),
    username: prefer("username", a?.username, b?.username),
  };
  if (debugRows) {
    debugRows.push({ field: "createdBy._id", prev: a?._id, next: b?._id, chosen: chosenCreatedBy._id });
    debugRows.push({ field: "createdBy.username", prev: a?.username, next: b?.username, chosen: chosenCreatedBy.username });
  }
  merged.createdBy = chosenCreatedBy;

  return merged;
}

// UI fmt
const fmt = (v) => (v === null || v === undefined || v === "" ? "—" : v);
const fmtMin = (v) => (Number(v) > 0 ? `${Number(v)} min` : "—");

// -------------------- COMPONENT --------------------
export default function TestBridge() {
  const { link } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const debugEnabled = new URLSearchParams(location.search).get("debug") === "1";

  // Prefetch from Dashboard for instant paint
  const prefetch = location.state?.prefetch || null;

  // State
  const [test, setTest] = useState(prefetch); // never set to null later
  const [loading, setLoading] = useState(!prefetch);
  const [registered, setRegistered] = useState(false);
  const [regLoading, setRegLoading] = useState(true);
  const [copyOk, setCopyOk] = useState(false);
  const [now, setNow] = useState(dayjs());

  // Completion extras
  const [lb, setLb] = useState({ loading: true, rows: [] });
  const [solution, setSolution] = useState({ loading: true, available: false, key: {} });
  const fetchedPostRef = useRef(false);

  // Debug refs
  const serverSnapshotRef = useRef(null);
  const prefetchSnapshotRef = useRef(prefetch);
  const mergeRowsRef = useRef([]);

  useEffect(() => {
    const id = setInterval(() => setNow(dayjs()), 30_000);
    return () => clearInterval(id);
  }, []);

  const shareURL = useMemo(() => `${window.location.origin}/test/${link}`, [link]);

  // Hydrate & merge defensively
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [tRes, rRes] = await Promise.allSettled([
          axios.get(`/test/public/${link}`),
          axios.get(`/test/registered/${link}`),
        ]);
        if (cancelled) return;

        if (tRes.status === "fulfilled") {
          const serverTest = tRes.value?.data?.test || {};
          serverSnapshotRef.current = serverTest;

          const rows = [];
          const merged = mergeTest(test || {}, serverTest, rows);
          mergeRowsRef.current = rows;
          setTest(merged);
        } // else: keep prefetch

        setLoading(false);

        if (rRes.status === "fulfilled") {
          setRegistered(Boolean(rRes.value?.data?.registered));
        } else {
          setRegistered(false);
        }
        setRegLoading(false);
      } catch {
        if (cancelled) return;
        setLoading(false);
        setRegLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  // Time windows (safe if some fields missing)
  const start = test?.scheduledDate && dayjs(test.scheduledDate).isValid() ? dayjs(test.scheduledDate) : null;
  const end = start ? start.add(Number(test?.duration || 0), "minute") : null;
  const isUpcoming = start ? now.isBefore(start) : false;
  const isLive = start && end ? now.isAfter(start) && now.isBefore(end) : false;
  const isOver = end ? now.isAfter(end) : false;

  // Fetch leaderboard + solution once when completed
  useEffect(() => {
    if (!test?._id || !isOver || fetchedPostRef.current) return;
    fetchedPostRef.current = true;

    (async () => {
      try {
        const [L, S] = await Promise.allSettled([
          axios.get(`/test/${test._id}/leaderboard`),
          axios.get(`/test/${test._id}/solution`),
        ]);
        setLb({
          loading: false,
          rows: L.status === "fulfilled" ? (L.value.data?.results || []) : [],
        });
        setSolution({
          loading: false,
          available: S.status === "fulfilled" ? !!S.value.data?.available : false,
          key: S.status === "fulfilled" ? (S.value.data?.answerKey || {}) : {},
        });
      } catch {
        setLb({ loading: false, rows: [] });
        setSolution({ loading: false, available: false, key: {} });
      }
    })();
  }, [isOver, test?._id]);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareURL);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1400);
    } catch (err) {
      console.error("Failed to copy share URL:", err);
      alert("Failed to copy the share link. Please try again.");
    }
  };

  const registerAndMaybeEnter = async () => {
    try {
      await axios.post(`/test/${link}/register`);
      setRegistered(true);
      setTest((t) => ({ ...t, registrationCount: Number(t?.registrationCount || 0) + 1 }));
      // Only auto-navigate while live (never after completion)
      if (isLive) navigate(`/tests/${test.link}/take`);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 401) navigate(`/login?next=/test/${link}`);
      else alert("Registration failed. Please try again.");
    }
  };

  // ---------- skeleton / not found ----------
  if (loading && !test) {
    return (
      <div className="min-h-[70vh]">
        <div className="w-full bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="animate-pulse">
              <div className="h-6 w-24 bg-white/30 rounded mb-3" />
              <div className="h-8 w-3/4 bg-white/40 rounded mb-2" />
              <div className="h-4 w-2/3 bg-white/30 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
          <div className="text-lg font-semibold text-red-600">Test not found</div>
          <p className="text-slate-600 dark:text-slate-300 mt-2">Please check the link and try again.</p>
        </div>
      </div>
    );
  }

  // ---------- UI Components ----------
  const StatusBadge = () => {
    if (isUpcoming)
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-white/20 text-white">
          Starts in {start.from(now, true)}
        </span>
      );
    if (isLive)
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-400/20 text-white">
          Live • ends {end.from(now, true)}
        </span>
      );
    if (isOver)
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-white/20 text-white">
          Completed
        </span>
      );
    return null;
  };

  const Stat = ({ k, v }) => (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</div>
      <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{v}</div>
    </div>
  );

  const ActionButton = () => {
    // Always hold CTA while registration state is unknown (prevents flicker)
    if (regLoading) {
      return (
        <button className="w-full py-3 rounded-xl font-semibold bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-slate-300 shadow cursor-wait">
          Checking…
        </button>
      );
    }

    if (!registered && isUpcoming) {
      return (
        <button
          onClick={registerAndMaybeEnter}
          className="w-full py-3 rounded-xl font-semibold bg-blue-600 text-white shadow hover:bg-blue-700 transition"
        >
          Register for Test
        </button>
      );
    }
    if (!registered && isLive) {
      return (
        <button
          onClick={registerAndMaybeEnter}
          className="w-full py-3 rounded-xl font-semibold bg-emerald-600 text-white shadow hover:bg-emerald-700 transition"
        >
          Register & Enter Now
        </button>
      );
    }
    if (!registered && isOver) {
      return (
        <button
          disabled
          className="w-full py-3 rounded-xl font-semibold bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-slate-300 shadow cursor-not-allowed"
        >
          Test Completed
        </button>
      );
    }
    if (registered && isLive) {
      return (
        <button
          onClick={() => navigate(`/tests/${test.link}/take`)}
          className="w-full py-3 rounded-xl font-semibold bg-emerald-600 text-white shadow hover:bg-emerald-700 transition"
        >
          Enter Test
        </button>
      );
    }
    if (registered && (isUpcoming || isOver)) {
      return (
        <div className="w-full py-3 rounded-xl bg-green-100 dark:bg-emerald-900/40 text-green-800 dark:text-emerald-300 text-center font-semibold shadow">
          {isUpcoming ? `Registered • Starts ${start?.format("DD MMM, HH:mm")}` : "Test Completed"}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <div className="w-full bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge />
              <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
                <span className="opacity-80">Subject:</span>{" "}
                <span className="ml-1">{fmt(test.subject)}</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
                <span className="opacity-80">Type:</span>{" "}
                <span className="ml-1">{fmt(test.type)}</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
                <span className="opacity-80">Mode:</span>{" "}
                <span className="ml-1">{fmt(test.testMode)}</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
                <span className="opacity-80">Duration:</span>{" "}
                <span className="ml-1">{fmtMin(test.duration)}</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
                <span className="opacity-80">Registered:</span>{" "}
                <span className="ml-1">{Number(test?.registrationCount || 0)}</span>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
              {fmt(test.title)}
            </h1>

            {test.description && (
              <p className="text-white/90 max-w-3xl">{test.description}</p>
            )}

            {(test.isPublic || test.isCreator) && (
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <div className="text-sm bg-white/15 border border-white/20 rounded-lg px-3 py-2 backdrop-blur">
                  <span className="font-semibold mr-2">Share link:</span>
                  <code className="text-white/90 break-all">{shareURL}</code>
                </div>
                <button
                  onClick={copyShare}
                  className="px-3 py-2 rounded-lg bg-white text-sky-700 font-semibold hover:bg-slate-100 transition"
                >
                  {copyOk ? "Copied ✓" : "Copy"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat k="Questions" v={fmt(test.questionCount)} />
              <Stat k="Duration" v={fmtMin(test.duration)} />
              <Stat k="Scheduled" v={start ? start.format("DD MMM YYYY, HH:mm") : "—"} />
              <Stat k="Created by" v={fmt(test?.createdBy?.username)} />
            </div>

            {(test.description || test.syllabus) && (
              <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
                <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
                  Description & Syllabus
                </div>
                {test.description && (
                  <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{test.description}</p>
                )}
                {test.syllabus && (
                  <div className="mt-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Syllabus</div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{test.syllabus}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
              <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">About this test</div>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                <li>Link opens in a secure runner with PDF (left) and OMR grid (right).</li>
                <li>Timer starts as scheduled and auto-submits when time ends.</li>
                <li>If this is a public test, anyone with the link can register.</li>
              </ul>
            </div>

            <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
              <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">Guidelines</div>
              <ol className="list-decimal pl-5 space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                <li>Ensure a stable internet connection.</li>
                <li>Do not refresh during the live test unless instructed.</li>
                <li>Once submitted, answers cannot be changed.</li>
              </ol>
            </div>

            {/* Completed → leaderboard + answers */}
            {isOver && (
              <>
                <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
                  <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">Leaderboard</div>
                  {lb.loading ? (
                    <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
                  ) : lb.rows.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-400">No submissions yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-600 dark:text-slate-400">
                            <th className="py-2 pr-4">Rank</th>
                            <th className="py-2 pr-4">User</th>
                            <th className="py-2 pr-4">Score</th>
                            <th className="py-2">Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lb.rows.map((r, i) => (
                            <tr key={r._id} className="border-t border-slate-200 dark:border-gray-800">
                              <td className="py-2 pr-4">{i + 1}</td>
                              <td className="py-2 pr-4">{r.user?.name || "—"}</td>
                              <td className="py-2 pr-4">{r.score} / {r.total}</td>
                              <td className="py-2">{dayjs(r.submittedAt).format("DD MMM, HH:mm")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
                  <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">Official Answers</div>
                  {solution.loading ? (
                    <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
                  ) : !solution.available ? (
                    <div className="text-slate-600 dark:text-slate-400">Solutions not available yet.</div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2 text-sm">
                      {Object.keys(solution.key).map((q) => (
                        <div key={q} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700">
                          <span className="font-semibold mr-2">{Number(q) + 1}.</span>
                          <span>{String(solution.key[q]).toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right: Sticky action card */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-6">
              <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {isUpcoming ? "Starts" : isLive ? "Ends" : isOver ? "Completed" : "—"}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {isUpcoming
                      ? start?.format("DD MMM, HH:mm")
                      : isLive
                      ? end?.from(now, true)
                      : isOver
                      ? end?.format("DD MMM, HH:mm")
                      : "—"}
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-200 dark:border-gray-800 pt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Type</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(test.type)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Mode</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(test.testMode)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Duration</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmtMin(test.duration)}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <ActionButton />
                </div>

                {registered && (
                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 text-center">
                    You’re registered for this test.
                  </div>
                )}
              </div>

              {(test.isPublic || test.isCreator) && (
                <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow p-4">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Share</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Anyone with this link can view the Test page.
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shareURL}
                      className="flex-1 text-xs px-3 py-2 rounded-lg border bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700"
                    />
                    <button
                      onClick={copyShare}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                    >
                      {copyOk ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* spacer */}
        <div className="h-10" />
      </div>

      {/* DEBUG PANEL (open with ?debug=1) */}
      {debugEnabled && (
        <div className="fixed bottom-0 left-0 right-0 max-h-[45vh] overflow-y-auto bg-black/90 text-green-200 text-xs font-mono p-3 z-50 border-t border-green-500/40">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-bold">DEBUG</span>
            <span>link: {link}</span>
          </div>

          <details open>
            <summary className="cursor-pointer">Prefetch (from Dashboard)</summary>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(prefetchSnapshotRef.current, null, 2)}
            </pre>
          </details>

          <details open>
            <summary className="cursor-pointer">Server payload (/test/public/:link)</summary>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(serverSnapshotRef.current, null, 2)}
            </pre>
          </details>

          <details open>
            <summary className="cursor-pointer">Merged object (rendered)</summary>
            <pre className="whitespace-pre-wrap">{JSON.stringify(test, null, 2)}</pre>
          </details>

          <details>
            <summary className="cursor-pointer">Field merge decisions</summary>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-left">
                  <th className="pr-2">field</th>
                  <th className="pr-2">prev</th>
                  <th className="pr-2">next</th>
                  <th className="pr-2">chosen</th>
                </tr>
              </thead>
              <tbody>
                {mergeRowsRef.current.map((r, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="pr-2">{r.field}</td>
                    <td className="pr-2">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(r.prev)}</pre>
                    </td>
                    <td className="pr-2">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(r.next)}</pre>
                    </td>
                    <td className="pr-2">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(r.chosen)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
    </div>
  );
}
