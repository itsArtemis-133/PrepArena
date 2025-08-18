// client/src/pages/TestBridge.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "../api/axiosConfig";

dayjs.extend(relativeTime);

/* -------------------- MERGE + VALIDATION HELPERS -------------------- */
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
  "answersPdfUrl", // include answers PDF
];

const isEmpty = (k, v) => {
  if (v === undefined || v === null) return true;
  if (NUMERIC_KEYS.has(k)) {
    const n = Number(v);
    return !Number.isFinite(n) || n <= 0;
  }
  if (k === "scheduledDate") return !dayjs(v).isValid();
  if (BOOL_KEYS.has(k)) return typeof v !== "boolean";
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

/* -------------------- PAGE -------------------- */
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

  // Completed-window data
  const [lb, setLb] = useState({ loading: true, rows: [], total: 0, page: 1, limit: 25 }); // pagination
  const [solution, setSolution] = useState({ loading: true, available: false, key: {} });
  const [myResult, setMyResult] = useState({ loading: true, available: false, details: [] });

  // Refs
  const fetchedSolutionRef = useRef(false);
  const fetchedMyResultRef = useRef(false);
  const prefetchSnapshotRef = useRef(prefetch);
  const serverSnapshotRef = useRef(null);
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
        }
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
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  // Time windows (safe if some fields missing)
  const start = test?.scheduledDate && dayjs(test.scheduledDate).isValid() ? dayjs(test.scheduledDate) : null;
  const end = start ? start.add(Number(test?.duration || 0), "minute") : null;
  const isUpcoming = start ? now.isBefore(start) : false;
  const isLive = start && end ? now.isAfter(start) && now.isBefore(end) : false;
  const isOver = end ? now.isAfter(end) : false;

  // Fetch SOLUTION once after completion
  useEffect(() => {
    if (!test?._id || !isOver || fetchedSolutionRef.current) return;
    fetchedSolutionRef.current = true;

    (async () => {
      try {
        const S = await axios.get(`/test/${test._id}/solution`);
        setSolution({
          loading: false,
          available: !!S.data?.available,
          key: S.data?.answerKey || {},
        });
      } catch {
        setSolution({ loading: false, available: false, key: {} });
      }
    })();
  }, [isOver, test?._id]);

  // Fetch MY RESULT once after completion (auth required)
  useEffect(() => {
    if (!test?._id || !isOver || fetchedMyResultRef.current) return;
    fetchedMyResultRef.current = true;

    (async () => {
      try {
        const res = await axios.get(`/test/${test._id}/results/me`);
        // expected shape: { available, score, total, attempted, submittedAt, details:[{q, marked, correct, isCorrect}], myAnswers?:{} }
        setMyResult({ loading: false, ...res.data });
      } catch {
        setMyResult({ loading: false, available: false, details: [] });
      }
    })();
  }, [isOver, test?._id]);

  // Fetch LEADERBOARD with pagination after completion
  useEffect(() => {
    if (!test?._id || !isOver) return;
    let cancelled = false;

    setLb((prev) => ({ ...prev, loading: true }));
    (async () => {
      try {
        const L = await axios.get(`/test/${test._id}/leaderboard`, {
          params: { page: lb.page, limit: lb.limit },
        });
        if (cancelled) return;
        setLb({
          loading: false,
          rows: L.data?.results || [],
          total: Number(L.data?.total || 0),
          page: Number(L.data?.page || lb.page),
          limit: Number(L.data?.limit || lb.limit),
        });
      } catch {
        if (!cancelled) setLb((prev) => ({ ...prev, loading: false, rows: [], total: 0 }));
      }
    })();

    return () => { cancelled = true; };
  }, [isOver, test?._id, lb.page, lb.limit]);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareURL);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1400);
    } catch {
      alert("Failed to copy the share link. Please try again.");
    }
  };

  const registerAndMaybeEnter = async () => {
    try {
      await axios.post(`/test/${link}/register`);
      setRegistered(true);
      setTest((t) => ({ ...t, registrationCount: Number(t?.registrationCount || 0) + 1 }));
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

  // ---------- RENDER ----------
  const baseRank = (lb.page - 1) * lb.limit;

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

            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">{fmt(test.title)}</h1>

            {test.description && <p className="text-white/90 max-w-3xl whitespace-pre-wrap">{test.description}</p>}

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
                <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">Description & Syllabus</div>
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

            {/* Completed → Your Result + leaderboard + answers */}
            {isOver && (
              <>
                {/* Your Result */}
                <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Result</div>
                    <RatingBadge testId={test._id} />
                  </div>

                  {myResult.loading ? (
                    <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
                  ) : !myResult.available ? (
                    <div className="text-slate-600 dark:text-slate-400 text-sm">No submission found for your account.</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="rounded-lg border p-3">
                          <div className="text-[11px] text-slate-500">Score</div>
                          <div className="text-base font-semibold">
                            {myResult.score} / {myResult.total}
                          </div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="text-[11px] text-slate-500">Attempted</div>
                          <div className="text-base font-semibold">{myResult.attempted}</div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="text-[11px] text-slate-500">Submitted</div>
                          <div className="text-base font-semibold">
                            {myResult.submittedAt ? dayjs(myResult.submittedAt).format("DD MMM, HH:mm") : "—"}
                          </div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="text-[11px] text-slate-500">Accuracy</div>
                          <div className="text-base font-semibold">
                            {myResult.total ? Math.round((myResult.score / myResult.total) * 100) : 0}%
                          </div>
                        </div>
                      </div>

                      {/* actions row: download my answers */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => downloadMyAnswersCsv(myResult)}
                          className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Download my answers (CSV)
                        </button>
                      </div>

                      {/* Per-question breakdown (collapsible) */}
                      <Breakdown details={myResult.details || []} />
                    </>
                  )}

                  {/* Feedback form */}
                  <div className="mt-6">
                    <FeedbackBox testId={test._id} />
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">Leaderboard</div>
                    {!!test?._id && (
                      <a
                        href={`/api/test/${test._id}/leaderboard.csv`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Download CSV
                      </a>
                    )}
                  </div>

                  {lb.loading ? (
                    <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
                  ) : lb.rows.length === 0 ? (
                    <div className="text-slate-600 dark:text-slate-400">No submissions yet.</div>
                  ) : (
                    <>
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
                                <td className="py-2 pr-4">{baseRank + i + 1}</td>
                                <td className="py-2 pr-4">{r.user?.name || "—"}</td>
                                <td className="py-2 pr-4">
                                  {r.score} / {r.total}
                                </td>
                                <td className="py-2">
                                  {r.submittedAt ? dayjs(r.submittedAt).format("DD MMM, HH:mm") : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {lb.total > lb.limit && (
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <div className="text-slate-600 dark:text-slate-400">
                            Showing {baseRank + 1}–{Math.min(baseRank + lb.rows.length, lb.total)} of {lb.total}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                              disabled={lb.page <= 1}
                              onClick={() => setLb((p) => ({ ...p, page: p.page - 1 }))}
                            >
                              Prev
                            </button>
                            <button
                              className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                              disabled={lb.page * lb.limit >= lb.total}
                              onClick={() => setLb((p) => ({ ...p, page: p.page + 1 }))}
                            >
                              Next
                            </button>
                            <select
                              className="ml-2 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
                              value={lb.limit}
                              onChange={(e) => setLb((p) => ({ ...p, page: 1, limit: Number(e.target.value) }))}
                            >
                              {[10, 25, 50, 100].map((n) => (
                                <option key={n} value={n}>
                                  {n}/page
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Official Answers */}
                <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
                  <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">Official Answers</div>

                  {/* Embed Official Answers PDF first, if present */}
                  {test.answersPdfUrl && (
                    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 dark:border-gray-800">
                      <iframe
                        title="Official Answers PDF"
                        src={`${test.answersPdfUrl}#toolbar=1&navpanes=0`}
                        className="w-full h-[480px]"
                      />
                    </div>
                  )}

                  {/* Then the answer-key grid */}
                  {solution.loading ? (
                    <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
                  ) : !solution.available ? (
                    <div className="text-slate-600 dark:text-slate-400">Solutions not available yet.</div>
                  ) : (
                    <AnswerKeyGrid keyObj={solution.key} />
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
                    {isUpcoming ? start?.format("DD MMM, HH:mm") : isLive ? end?.from(now, true) : isOver ? end?.format("DD MMM, HH:mm") : "—"}
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
                  <ActionButton
                    regLoading={regLoading}
                    registered={registered}
                    isUpcoming={isUpcoming}
                    isLive={isLive}
                    isOver={isOver}
                    start={start}
                    navigate={navigate}
                    link={link}
                    test={test}
                    registerAndMaybeEnter={registerAndMaybeEnter}
                  />
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
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">Anyone with this link can view the Test page.</div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shareURL}
                      className="flex-1 text-xs px-3 py-2 rounded-lg border bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700"
                    />
                    <button onClick={copyShare} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
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
            <pre className="whitespace-pre-wrap">{JSON.stringify(prefetchSnapshotRef.current, null, 2)}</pre>
          </details>

          <details open>
            <summary className="cursor-pointer">Server payload (/test/public/:link)</summary>
            <pre className="whitespace-pre-wrap">{JSON.stringify(serverSnapshotRef.current, null, 2)}</pre>
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
                      <pre className="whitespace-pre-wrap">{JSON.stringify(r.chosen)}</pre>
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

/* -------------------- small UI helpers -------------------- */
function ActionButton({
  regLoading,
  registered,
  isUpcoming,
  isLive,
  isOver,
  start,
  navigate,
  test,
  registerAndMaybeEnter,
}) {
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
}

/** Answer key grid with correct numbering for 0- or 1-indexed keys. */
function AnswerKeyGrid({ keyObj }) {
  const keys = Object.keys(keyObj || {}).sort((a, b) => Number(a) - Number(b));
  const zeroIndexed = keys.includes("0"); // if "0" exists, treat as zero-indexed

  return (
    <div className="grid grid-cols-5 gap-2 text-sm">
      {keys.map((q) => {
        const n = Number(q);
        const display = zeroIndexed ? n + 1 : n; // only +1 when zero-indexed
        return (
          <div
            key={q}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700"
          >
            <span className="font-semibold mr-2">{display}.</span>
            <span>{String(keyObj[q]).toUpperCase()}</span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------- Per-question breakdown + feedback -------------------- */

function Pill({ ok, children }) {
  return (
    <span
      className={`px-2 py-[2px] rounded-full text-xs font-semibold ${
        ok
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      }`}
    >
      {children}
    </span>
  );
}

function Breakdown({ details }) {
  const [expanded, setExpanded] = React.useState(details.length <= 50);
  const shown = expanded ? details : details.slice(0, 50);

  return (
    <div className="mt-4">
      <div className="text-sm font-semibold mb-2">Per-question breakdown</div>
      {details.length === 0 ? (
        <div className="text-slate-500 text-sm">No details available.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {shown.map((row) => (
              <div
                key={row.q}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 font-semibold">{row.q}.</div>
                  <div className="flex gap-3">
                    <span className="text-slate-600 dark:text-slate-400">
                      Marked:{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {row.marked || "—"}
                      </span>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Correct:{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {row.correct || "—"}
                      </span>
                    </span>
                  </div>
                </div>
                <Pill ok={row.isCorrect}>{row.isCorrect ? "✓" : "✗"}</Pill>
              </div>
            ))}
          </div>

          {details.length > 50 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="px-3 py-1 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {expanded ? "Show less" : `Show all ${details.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RatingBadge({ testId }) {
  const [data, setData] = React.useState({ avg: 0, count: 0 });
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await axios.get(`/test/${testId}/feedback`);
        if (!cancel) setData({ avg: res.data?.avg || 0, count: res.data?.count || 0 });
      } catch {
        if (!cancel) setData({ avg: 0, count: 0 });
      }
    })();
    return () => { cancel = true; };
  }, [testId]);
  if (!data.count) return null;
  return (
    <div className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      ★ {data.avg} · {data.count}
    </div>
  );
}

function FeedbackBox({ testId }) {
  const [me, setMe] = React.useState({ loading: true, my: null });
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await axios.get(`/test/${testId}/feedback`);
        if (cancel) return;
        const my = res.data?.my || null;
        setMe({ loading: false, my });
        if (my) {
          setRating(Number(my.rating || 0));
          setComment(my.comment || "");
        }
      } catch {
        if (!cancel) setMe({ loading: false, my: null });
      }
    })();
    return () => { cancel = true; };
  }, [testId]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await axios.post(`/test/${testId}/feedback`, { rating, comment });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 401) alert("Please log in to submit feedback.");
      else if (code === 400) alert("Feedback opens only after the test is completed.");
      else if (code === 403) alert("Only participants can leave feedback.");
      else alert("Failed to save feedback. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const clearRating = async () => {
    // instant UI
    setRating(0);
    try {
      // Preferred: DELETE endpoint
      await axios.delete(`/test/${testId}/feedback`);
    } catch {
      // Fallback: send null rating to clear
      try {
        await axios.post(`/test/${testId}/feedback`, { rating: null, comment });
      } catch (err) {
        const code = err?.response?.status;
        if (code === 401) alert("Please log in to clear feedback.");
        else if (code === 403) alert("Only participants can clear feedback.");
        else alert("Failed to clear feedback. Try again.");
      }
    }
  };

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Rate this test</div>
        {rating > 0 && (
          <button
            type="button"
            onClick={clearRating}
            className="text-xs px-2 py-1 rounded border hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Clear
          </button>
        )}
      </div>

      {me.loading ? (
        <div className="h-10 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = rating >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating((prev) => (prev === n ? 0 : n))} // toggle on same star
                  aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                  aria-pressed={active}
                  className={`w-9 h-9 rounded-full border text-lg leading-9 text-center ${
                    active ? "bg-amber-200 border-amber-400" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {active ? "★" : "☆"}
                </button>
              );
            })}
            <span className="text-xs text-slate-500 ml-1">(click again to clear)</span>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional feedback for the creator…"
            rows={3}
            className="w-full text-sm p-2 rounded border bg-transparent"
          />

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!rating || busy}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : saved ? "Saved ✓" : "Submit feedback"}
            </button>

            {rating === 0 && <span className="text-xs text-slate-500">Select at least 1 star to submit</span>}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------- client-side CSV for "my answers" -------------------- */
function downloadMyAnswersCsv(myResult) {
  // prefer details; if not present fall back to myAnswers if backend provides.
  const rows = (myResult.details || []).slice().sort((a, b) => Number(a.q) - Number(b.q));
  const header = ["Q", "Marked", "Correct", "Result"];
  const lines = [header.join(",")];
  rows.forEach((r) => {
    const cols = [r.q, r.marked || "", r.correct || "", r.isCorrect ? "Correct" : "Wrong"].map((x) =>
      String(x).includes(",") ? `"${String(x).replace(/"/g, '""')}"` : String(x)
    );
    lines.push(cols.join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-answers.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// // client/src/pages/TestBridge.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useLocation, useNavigate, useParams } from "react-router-dom";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";
// import axios from "../api/axiosConfig";

// dayjs.extend(relativeTime);

// // -------------------- MERGE + VALIDATION HELPERS --------------------
// const NUMERIC_KEYS = new Set(["duration", "questionCount"]);
// const BOOL_KEYS = new Set(["isPublic", "isCreator"]);
// const SIMPLE_KEYS = [
//   "title",
//   "description",
//   "subject",
//   "type",
//   "testMode",
//   "duration",
//   "questionCount",
//   "scheduledDate",
//   "status",
//   "isPublic",
//   "pdfUrl",
//   "link",
//   "isCreator",
//   "syllabus",
//   "registrationCount",
//   "answersPdfUrl", // include answers PDF
// ];

// const isEmpty = (k, v) => {
//   if (v === undefined || v === null) return true;
//   if (NUMERIC_KEYS.has(k)) {
//     const n = Number(v);
//     return !Number.isFinite(n) || n <= 0;
//   }
//   if (k === "scheduledDate") {
//     return !dayjs(v).isValid();
//   }
//   if (BOOL_KEYS.has(k)) {
//     return typeof v !== "boolean";
//   }
//   if (typeof v === "string") return v.trim() === "";
//   return false;
// };

// const prefer = (k, prevVal, nextVal) => (isEmpty(k, nextVal) ? prevVal : nextVal);

// function mergeTest(prev = {}, next = {}, debugRows = []) {
//   const merged = { ...prev, ...next };

//   SIMPLE_KEYS.forEach((k) => {
//     const chosen = prefer(k, prev[k], next[k]);
//     if (debugRows) debugRows.push({ field: k, prev: prev[k], next: next[k], chosen });
//     merged[k] = chosen;
//   });

//   const a = prev?.createdBy || {};
//   const b = next?.createdBy || {};
//   const chosenCreatedBy = {
//     _id: prefer("_id", a?._id, b?._id),
//     username: prefer("username", a?.username, b?.username),
//   };
//   if (debugRows) {
//     debugRows.push({ field: "createdBy._id", prev: a?._id, next: b?._id, chosen: chosenCreatedBy._id });
//     debugRows.push({ field: "createdBy.username", prev: a?.username, next: b?.username, chosen: chosenCreatedBy.username });
//   }
//   merged.createdBy = chosenCreatedBy;

//   return merged;
// }

// // UI fmt
// const fmt = (v) => (v === null || v === undefined || v === "" ? "—" : v);
// const fmtMin = (v) => (Number(v) > 0 ? `${Number(v)} min` : "—");

// // -------------------- COMPONENT --------------------
// export default function TestBridge() {
//   const { link } = useParams();
//   const navigate = useNavigate();
//   const location = useLocation();

//   const debugEnabled = new URLSearchParams(location.search).get("debug") === "1";

//   // Prefetch from Dashboard for instant paint
//   const prefetch = location.state?.prefetch || null;

//   // State
//   const [test, setTest] = useState(prefetch); // never set to null later
//   const [loading, setLoading] = useState(!prefetch);
//   const [registered, setRegistered] = useState(false);
//   const [regLoading, setRegLoading] = useState(true);
//   const [copyOk, setCopyOk] = useState(false);
//   const [now, setNow] = useState(dayjs());

//   // Completed-window data
//   const [lb, setLb] = useState({ loading: true, rows: [], total: 0, page: 1, limit: 25 }); // pagination
//   const [solution, setSolution] = useState({ loading: true, available: false, key: {} });
//   const [myResult, setMyResult] = useState({ loading: true, available: false });

//   // Refs
//   const fetchedSolutionRef = useRef(false);
//   const fetchedMyResultRef = useRef(false);
//   const prefetchSnapshotRef = useRef(prefetch);
//   const serverSnapshotRef = useRef(null);
//   const mergeRowsRef = useRef([]);

//   useEffect(() => {
//     const id = setInterval(() => setNow(dayjs()), 30_000);
//     return () => clearInterval(id);
//   }, []);

//   const shareURL = useMemo(() => `${window.location.origin}/test/${link}`, [link]);

//   // Hydrate & merge defensively
//   useEffect(() => {
//     let cancelled = false;

//     (async () => {
//       try {
//         const [tRes, rRes] = await Promise.allSettled([
//           axios.get(`/test/public/${link}`),
//           axios.get(`/test/registered/${link}`),
//         ]);
//         if (cancelled) return;

//         if (tRes.status === "fulfilled") {
//           const serverTest = tRes.value?.data?.test || {};
//           serverSnapshotRef.current = serverTest;

//           const rows = [];
//           const merged = mergeTest(test || {}, serverTest, rows);
//           mergeRowsRef.current = rows;
//           setTest(merged);
//         } // else: keep prefetch

//         setLoading(false);

//         if (rRes.status === "fulfilled") {
//           setRegistered(Boolean(rRes.value?.data?.registered));
//         } else {
//           setRegistered(false);
//         }
//         setRegLoading(false);
//       } catch {
//         if (cancelled) return;
//         setLoading(false);
//         setRegLoading(false);
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [link]);

//   // Time windows (safe if some fields missing)
//   const start = test?.scheduledDate && dayjs(test.scheduledDate).isValid() ? dayjs(test.scheduledDate) : null;
//   const end = start ? start.add(Number(test?.duration || 0), "minute") : null;
//   const isUpcoming = start ? now.isBefore(start) : false;
//   const isLive = start && end ? now.isAfter(start) && now.isBefore(end) : false;
//   const isOver = end ? now.isAfter(end) : false;

//   // Fetch SOLUTION once after completion
//   useEffect(() => {
//     if (!test?._id || !isOver || fetchedSolutionRef.current) return;
//     fetchedSolutionRef.current = true;

//     (async () => {
//       try {
//         const S = await axios.get(`/test/${test._id}/solution`);
//         setSolution({
//           loading: false,
//           available: !!S.data?.available,
//           key: S.data?.answerKey || {},
//         });
//       } catch {
//         setSolution({ loading: false, available: false, key: {} });
//       }
//     })();
//   }, [isOver, test?._id]);

//   // Fetch MY RESULT once after completion (auth required)
//   useEffect(() => {
//     if (!test?._id || !isOver || fetchedMyResultRef.current) return;
//     fetchedMyResultRef.current = true;

//     (async () => {
//       try {
//         const res = await axios.get(`/test/${test._id}/results/me`);
//         setMyResult({ loading: false, ...res.data });
//       } catch {
//         setMyResult({ loading: false, available: false });
//       }
//     })();
//   }, [isOver, test?._id]);

//   // Fetch LEADERBOARD with pagination after completion
//   useEffect(() => {
//     if (!test?._id || !isOver) return;
//     let cancelled = false;

//     setLb((prev) => ({ ...prev, loading: true }));
//     (async () => {
//       try {
//         const L = await axios.get(`/test/${test._id}/leaderboard`, {
//           params: { page: lb.page, limit: lb.limit },
//         });
//         if (cancelled) return;
//         setLb({
//           loading: false,
//           rows: L.data?.results || [],
//           total: Number(L.data?.total || 0),
//           page: Number(L.data?.page || lb.page),
//           limit: Number(L.data?.limit || lb.limit),
//         });
//       } catch {
//         if (!cancelled) setLb((prev) => ({ ...prev, loading: false, rows: [], total: 0 }));
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//   }, [isOver, test?._id, lb.page, lb.limit]);

//   const copyShare = async () => {
//     try {
//       await navigator.clipboard.writeText(shareURL);
//       setCopyOk(true);
//       setTimeout(() => setCopyOk(false), 1400);
//     } catch (err) {
//       console.error("Failed to copy share URL:", err);
//       alert("Failed to copy the share link. Please try again.");
//     }
//   };

//   const registerAndMaybeEnter = async () => {
//     try {
//       await axios.post(`/test/${link}/register`);
//       setRegistered(true);
//       setTest((t) => ({ ...t, registrationCount: Number(t?.registrationCount || 0) + 1 }));
//       // Only auto-navigate while live (never after completion)
//       if (isLive) navigate(`/tests/${test.link}/take`);
//     } catch (err) {
//       const code = err?.response?.status;
//       if (code === 401) navigate(`/login?next=/test/${link}`);
//       else alert("Registration failed. Please try again.");
//     }
//   };

//   // ---------- skeleton / not found ----------
//   if (loading && !test) {
//     return (
//       <div className="min-h-[70vh]">
//         <div className="w-full bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700">
//           <div className="max-w-7xl mx-auto px-4 py-10">
//             <div className="animate-pulse">
//               <div className="h-6 w-24 bg-white/30 rounded mb-3" />
//               <div className="h-8 w-3/4 bg-white/40 rounded mb-2" />
//               <div className="h-4 w-2/3 bg-white/30 rounded" />
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!test) {
//     return (
//       <div className="max-w-3xl mx-auto px-4 py-10">
//         <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
//           <div className="text-lg font-semibold text-red-600">Test not found</div>
//           <p className="text-slate-600 dark:text-slate-300 mt-2">Please check the link and try again.</p>
//         </div>
//       </div>
//     );
//   }

//   // ---------- UI Components ----------
//   const StatusBadge = () => {
//     if (isUpcoming)
//       return (
//         <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-white/20 text-white">
//           Starts in {start.from(now, true)}
//         </span>
//       );
//     if (isLive)
//       return (
//         <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-400/20 text-white">
//           Live • ends {end.from(now, true)}
//         </span>
//       );
//     if (isOver)
//       return (
//         <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-white/20 text-white">
//           Completed
//         </span>
//       );
//     return null;
//   };

//   const Stat = ({ k, v }) => (
//     <div className="rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4">
//       <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</div>
//       <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{v}</div>
//     </div>
//   );

//   // ---------- RENDER ----------
//   const baseRank = (lb.page - 1) * lb.limit;

//   return (
//     <div className="min-h-screen">
//       {/* HERO */}
//       <div className="w-full bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 text-white">
//         <div className="max-w-7xl mx-auto px-4 py-10">
//           <div className="flex flex-col gap-3">
//             <div className="flex items-center gap-2 flex-wrap">
//               <StatusBadge />
//               <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
//                 <span className="opacity-80">Subject:</span>{" "}
//                 <span className="ml-1">{fmt(test.subject)}</span>
//               </div>
//               <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
//                 <span className="opacity-80">Type:</span>{" "}
//                 <span className="ml-1">{fmt(test.type)}</span>
//               </div>
//               <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
//                 <span className="opacity-80">Mode:</span>{" "}
//                 <span className="ml-1">{fmt(test.testMode)}</span>
//               </div>
//               <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
//                 <span className="opacity-80">Duration:</span>{" "}
//                 <span className="ml-1">{fmtMin(test.duration)}</span>
//               </div>
//               <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium">
//                 <span className="opacity-80">Registered:</span>{" "}
//                 <span className="ml-1">{Number(test?.registrationCount || 0)}</span>
//               </div>
//             </div>

//             <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
//               {fmt(test.title)}
//             </h1>

//             {test.description && (
//               <p className="text-white/90 max-w-3xl">{test.description}</p>
//             )}

//             {(test.isPublic || test.isCreator) && (
//               <div className="mt-2 flex items-center gap-3 flex-wrap">
//                 <div className="text-sm bg-white/15 border border-white/20 rounded-lg px-3 py-2 backdrop-blur">
//                   <span className="font-semibold mr-2">Share link:</span>
//                   <code className="text-white/90 break-all">{shareURL}</code>
//                 </div>
//                 <button
//                   onClick={copyShare}
//                   className="px-3 py-2 rounded-lg bg-white text-sky-700 font-semibold hover:bg-slate-100 transition"
//                 >
//                   {copyOk ? "Copied ✓" : "Copy"}
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* BODY */}
//       <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-10">
//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
//           {/* Left */}
//           <div className="lg:col-span-8">
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//               <Stat k="Questions" v={fmt(test.questionCount)} />
//               <Stat k="Duration" v={fmtMin(test.duration)} />
//               <Stat k="Scheduled" v={start ? start.format("DD MMM YYYY, HH:mm") : "—"} />
//               <Stat k="Created by" v={fmt(test?.createdBy?.username)} />
//             </div>

//             {(test.description || test.syllabus) && (
//               <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
//                 <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
//                   Description & Syllabus
//                 </div>
//                 {test.description && (
//                   <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
//                     {test.description}
//                   </p>
//                 )}
//                 {test.syllabus && (
//                   <div className="mt-4">
//                     <div className="font-semibold text-slate-900 dark:text-slate-100">Syllabus</div>
//                     <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{test.syllabus}</p>
//                   </div>
//                 )}
//               </div>
//             )}

//             <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
//               <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">About this test</div>
//               <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300 text-sm">
//                 <li>Link opens in a secure runner with PDF (left) and OMR grid (right).</li>
//                 <li>Timer starts as scheduled and auto-submits when time ends.</li>
//                 <li>If this is a public test, anyone with the link can register.</li>
//               </ul>
//             </div>

//             {/* Completed → Your Result + leaderboard + answers */}
//             {isOver && (
//               <>
//                 {/* Your Result */}
//                 <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
//                   <div className="flex items-center justify-between mb-2">
//                     <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Result</div>
//                     <RatingBadge testId={test._id} />
//                   </div>

//                   {myResult.loading ? (
//                     <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
//                   ) : !myResult.available ? (
//                     <div className="text-slate-600 dark:text-slate-400 text-sm">No submission found for your account.</div>
//                   ) : (
//                     <>
//                       <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
//                         <div className="rounded-lg border p-3">
//                           <div className="text-[11px] text-slate-500">Score</div>
//                           <div className="text-base font-semibold">{myResult.score} / {myResult.total}</div>
//                         </div>
//                         <div className="rounded-lg border p-3">
//                           <div className="text-[11px] text-slate-500">Attempted</div>
//                           <div className="text-base font-semibold">{myResult.attempted}</div>
//                         </div>
//                         <div className="rounded-lg border p-3">
//                           <div className="text-[11px] text-slate-500">Submitted</div>
//                           <div className="text-base font-semibold">
//                             {myResult.submittedAt ? dayjs(myResult.submittedAt).format("DD MMM, HH:mm") : "—"}
//                           </div>
//                         </div>
//                         <div className="rounded-lg border p-3">
//                           <div className="text-[11px] text-slate-500">Accuracy</div>
//                           <div className="text-base font-semibold">
//                             {myResult.total ? Math.round((myResult.score / myResult.total) * 100) : 0}%
//                           </div>
//                         </div>
//                       </div>

//                       {/* Per-question breakdown */}
//                       <Breakdown details={myResult.details || []} />
//                     </>
//                   )}

//                   {/* Feedback form */}
//                   <div className="mt-6">
//                     <FeedbackBox testId={test._id} />
//                   </div>
//                 </div>

//                 {/* Leaderboard */}
//                 <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
//                   <div className="flex items-center justify-between">
//                     <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">Leaderboard</div>
//                     {!!test?._id && (
//                       <a
//                         href={`/api/test/${test._id}/leaderboard.csv`}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="text-sm px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
//                       >
//                         Download CSV
//                       </a>
//                     )}
//                   </div>

//                   {lb.loading ? (
//                     <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
//                   ) : lb.rows.length === 0 ? (
//                     <div className="text-slate-600 dark:text-slate-400">No submissions yet.</div>
//                   ) : (
//                     <>
//                       <div className="overflow-x-auto">
//                         <table className="min-w-full text-sm">
//                           <thead>
//                             <tr className="text-left text-slate-600 dark:text-slate-400">
//                               <th className="py-2 pr-4">Rank</th>
//                               <th className="py-2 pr-4">User</th>
//                               <th className="py-2 pr-4">Score</th>
//                               <th className="py-2">Submitted</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {lb.rows.map((r, i) => (
//                               <tr key={r._id} className="border-t border-slate-200 dark:border-gray-800">
//                                 <td className="py-2 pr-4">{baseRank + i + 1}</td>
//                                 <td className="py-2 pr-4">{r.user?.name || "—"}</td>
//                                 <td className="py-2 pr-4">{r.score} / {r.total}</td>
//                                 <td className="py-2">{r.submittedAt ? dayjs(r.submittedAt).format("DD MMM, HH:mm") : "—"}</td>
//                               </tr>
//                             ))}
//                           </tbody>
//                         </table>
//                       </div>

//                       {/* Pagination */}
//                       {lb.total > lb.limit && (
//                         <div className="mt-3 flex items-center justify-between text-sm">
//                           <div className="text-slate-600 dark:text-slate-400">
//                             Showing {baseRank + 1}–{Math.min(baseRank + lb.rows.length, lb.total)} of {lb.total}
//                           </div>
//                           <div className="flex items-center gap-2">
//                             <button
//                               className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
//                               disabled={lb.page <= 1}
//                               onClick={() => setLb((p) => ({ ...p, page: p.page - 1 }))}
//                             >
//                               Prev
//                             </button>
//                             <button
//                               className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
//                               disabled={lb.page * lb.limit >= lb.total}
//                               onClick={() => setLb((p) => ({ ...p, page: p.page + 1 }))}
//                             >
//                               Next
//                             </button>
//                             <select
//                               className="ml-2 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
//                               value={lb.limit}
//                               onChange={(e) => setLb((p) => ({ ...p, page: 1, limit: Number(e.target.value) }))}
//                             >
//                               {[10, 25, 50, 100].map((n) => (
//                                 <option key={n} value={n}>{n}/page</option>
//                               ))}
//                             </select>
//                           </div>
//                         </div>
//                       )}
//                     </>
//                   )}
//                 </div>

//                 {/* Official Answers */}
//                 <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
//                   <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">Official Answers</div>

//                   {/* Embed Official Answers PDF first, if present */}
//                   {test.answersPdfUrl && (
//                     <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 dark:border-gray-800">
//                       <iframe
//                         title="Official Answers PDF"
//                         src={`${test.answersPdfUrl}#toolbar=1&navpanes=0`}
//                         className="w-full h-[480px]"
//                       />
//                     </div>
//                   )}

//                   {/* Then the answer-key grid */}
//                   {solution.loading ? (
//                     <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
//                   ) : !solution.available ? (
//                     <div className="text-slate-600 dark:text-slate-400">Solutions not available yet.</div>
//                   ) : (
//                     <AnswerKeyGrid keyObj={solution.key} />
//                   )}
//                 </div>
//               </>
//             )}
//           </div>

//           {/* Right: Sticky action card */}
//           <div className="lg:col-span-4">
//             <div className="lg:sticky lg:top-6">
//               <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-5">
//                 <div className="flex items-center justify-between">
//                   <div className="text-sm text-slate-600 dark:text-slate-400">
//                     {isUpcoming ? "Starts" : isLive ? "Ends" : isOver ? "Completed" : "—"}
//                   </div>
//                   <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
//                     {isUpcoming
//                       ? start?.format("DD MMM, HH:mm")
//                       : isLive
//                       ? end?.from(now, true)
//                       : isOver
//                       ? end?.format("DD MMM, HH:mm")
//                       : "—"}
//                   </div>
//                 </div>

//                 <div className="mt-3 border-t border-slate-200 dark:border-gray-800 pt-3 grid grid-cols-3 gap-2 text-center">
//                   <div className="rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2">
//                     <div className="text-[11px] text-slate-500 dark:text-slate-400">Type</div>
//                     <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(test.type)}</div>
//                   </div>
//                   <div className="rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2">
//                     <div className="text-[11px] text-slate-500 dark:text-slate-400">Mode</div>
//                     <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(test.testMode)}</div>
//                   </div>
//                   <div className="rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2">
//                     <div className="text-[11px] text-slate-500 dark:text-slate-400">Duration</div>
//                     <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fmtMin(test.duration)}</div>
//                   </div>
//                 </div>

//                 <div className="mt-4">
//                   <ActionButton
//                     regLoading={regLoading}
//                     registered={registered}
//                     isUpcoming={isUpcoming}
//                     isLive={isLive}
//                     isOver={isOver}
//                     start={start}
//                     navigate={navigate}
//                     link={link}
//                     test={test}
//                     registerAndMaybeEnter={registerAndMaybeEnter}
//                   />
//                 </div>

//                 {registered && (
//                   <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 text-center">
//                     You’re registered for this test.
//                   </div>
//                 )}
//               </div>

//               {(test.isPublic || test.isCreator) && (
//                 <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow p-4">
//                   <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Share</div>
//                   <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
//                     Anyone with this link can view the Test page.
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <input
//                       readOnly
//                       value={shareURL}
//                       className="flex-1 text-xs px-3 py-2 rounded-lg border bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700"
//                     />
//                     <button
//                       onClick={copyShare}
//                       className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
//                     >
//                       {copyOk ? "Copied ✓" : "Copy"}
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* spacer */}
//         <div className="h-10" />
//       </div>

//       {/* DEBUG PANEL (open with ?debug=1) */}
//       {debugEnabled && (
//         <div className="fixed bottom-0 left-0 right-0 max-h-[45vh] overflow-y-auto bg-black/90 text-green-200 text-xs font-mono p-3 z-50 border-t border-green-500/40">
//           <div className="flex items-center gap-3 mb-2">
//             <span className="font-bold">DEBUG</span>
//             <span>link: {link}</span>
//           </div>

//           <details open>
//             <summary className="cursor-pointer">Prefetch (from Dashboard)</summary>
//             <pre className="whitespace-pre-wrap">
//               {JSON.stringify(prefetchSnapshotRef.current, null, 2)}
//             </pre>
//           </details>

//           <details open>
//             <summary className="cursor-pointer">Server payload (/test/public/:link)</summary>
//             <pre className="whitespace-pre-wrap">
//               {JSON.stringify(serverSnapshotRef.current, null, 2)}
//             </pre>
//           </details>

//           <details open>
//             <summary className="cursor-pointer">Merged object (rendered)</summary>
//             <pre className="whitespace-pre-wrap">{JSON.stringify(test, null, 2)}</pre>
//           </details>

//           <details>
//             <summary className="cursor-pointer">Field merge decisions</summary>
//             <table className="w-full text-[10px]">
//               <thead>
//                 <tr className="text-left">
//                   <th className="pr-2">field</th>
//                   <th className="pr-2">prev</th>
//                   <th className="pr-2">next</th>
//                   <th className="pr-2">chosen</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {mergeRowsRef.current.map((r, idx) => (
//                   <tr key={idx} className="align-top">
//                     <td className="pr-2">{r.field}</td>
//                     <td className="pr-2">
//                       <pre className="whitespace-pre-wrap">{JSON.stringify(r.prev)}</pre>
//                     </td>
//                     <td className="pr-2">
//                       <pre className="whitespace-pre-wrap">{JSON.stringify(r.next)}</pre>
//                     </td>
//                     <td className="pr-2">
//                       <pre className="whitespace-pre-wrap">
//                         {JSON.stringify(r.chosen)}
//                       </pre>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </details>
//         </div>
//       )}
//     </div>
//   );
// }

// // ---------- small UI helpers ----------
// function ActionButton({
//   regLoading,
//   registered,
//   isUpcoming,
//   isLive,
//   isOver,
//   start,
//   navigate,
//   test,
//   registerAndMaybeEnter,
// }) {
//   if (regLoading) {
//     return (
//       <button className="w-full py-3 rounded-xl font-semibold bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-slate-300 shadow cursor-wait">
//         Checking…
//       </button>
//     );
//   }

//   if (!registered && isUpcoming) {
//     return (
//       <button
//         onClick={registerAndMaybeEnter}
//         className="w-full py-3 rounded-xl font-semibold bg-blue-600 text-white shadow hover:bg-blue-700 transition"
//       >
//         Register for Test
//       </button>
//     );
//   }
//   if (!registered && isLive) {
//     return (
//       <button
//         onClick={registerAndMaybeEnter}
//         className="w-full py-3 rounded-xl font-semibold bg-emerald-600 text-white shadow hover:bg-emerald-700 transition"
//       >
//         Register & Enter Now
//       </button>
//     );
//   }
//   if (!registered && isOver) {
//     return (
//       <button
//         disabled
//         className="w-full py-3 rounded-xl font-semibold bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-slate-300 shadow cursor-not-allowed"
//       >
//         Test Completed
//       </button>
//     );
//   }
//   if (registered && isLive) {
//     return (
//       <button
//         onClick={() => navigate(`/tests/${test.link}/take`)}
//         className="w-full py-3 rounded-xl font-semibold bg-emerald-600 text-white shadow hover:bg-emerald-700 transition"
//       >
//         Enter Test
//       </button>
//     );
//   }
//   if (registered && (isUpcoming || isOver)) {
//     return (
//       <div className="w-full py-3 rounded-xl bg-green-100 dark:bg-emerald-900/40 text-green-800 dark:text-emerald-300 text-center font-semibold shadow">
//         {isUpcoming ? `Registered • Starts ${start?.format("DD MMM, HH:mm")}` : "Test Completed"}
//       </div>
//     );
//   }
//   return null;
// }

// /** Renders the answer key with correct numbering (0- or 1-indexed inputs). */
// function AnswerKeyGrid({ keyObj }) {
//   const keys = Object.keys(keyObj || {});
//   // Sort numeric-like keys ascending to keep stable order
//   keys.sort((a, b) => Number(a) - Number(b));
//   const zeroIndexed = keys.includes("0"); // if "0" exists, treat as zero-indexed

//   return (
//     <div className="grid grid-cols-5 gap-2 text-sm">
//       {keys.map((q) => {
//         const n = Number(q);
//         const display = zeroIndexed ? n + 1 : n; // only +1 when zero-indexed
//         return (
//           <div
//             key={q}
//             className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700"
//           >
//             <span className="font-semibold mr-2">{display}.</span>
//             <span>{String(keyObj[q]).toUpperCase()}</span>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// /* -------- Per-question breakdown + feedback -------- */

// function Pill({ ok, children }) {
//   return (
//     <span
//       className={`px-2 py-[2px] rounded-full text-xs font-semibold ${
//         ok
//           ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
//           : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
//       }`}
//     >
//       {children}
//     </span>
//   );
// }

// function Breakdown({ details }) {
//   const [expanded, setExpanded] = React.useState(details.length <= 50);
//   const shown = expanded ? details : details.slice(0, 50);

//   return (
//     <div className="mt-4">
//       <div className="text-sm font-semibold mb-2">Per-question breakdown</div>
//       {details.length === 0 ? (
//         <div className="text-slate-500 text-sm">No details available.</div>
//       ) : (
//         <>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
//             {shown.map((row) => (
//               <div
//                 key={row.q}
//                 className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
//               >
//                 <div className="flex items-center gap-3">
//                   <div className="w-8 font-semibold">{row.q}.</div>
//                   <div className="flex gap-3">
//                     <span className="text-slate-600 dark:text-slate-400">
//                       Marked:{" "}
//                       <span className="font-semibold text-slate-900 dark:text-slate-100">
//                         {row.marked || "—"}
//                       </span>
//                     </span>
//                     <span className="text-slate-600 dark:text-slate-400">
//                       Correct:{" "}
//                       <span className="font-semibold text-slate-900 dark:text-slate-100">
//                         {row.correct || "—"}
//                       </span>
//                     </span>
//                   </div>
//                 </div>
//                 <Pill ok={row.isCorrect}>{row.isCorrect ? "✓" : "✗"}</Pill>
//               </div>
//             ))}
//           </div>

//           {details.length > 50 && (
//             <div className="mt-3 text-center">
//               <button
//                 onClick={() => setExpanded((v) => !v)}
//                 className="px-3 py-1 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800"
//               >
//                 {expanded ? "Show less" : `Show all ${details.length}`}
//               </button>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

// function RatingBadge({ testId }) {
//   const [data, setData] = React.useState({ avg: 0, count: 0 });
//   React.useEffect(() => {
//     let cancel = false;
//     (async () => {
//       try {
//         const res = await axios.get(`/test/${testId}/feedback`);
//         if (!cancel) setData({ avg: res.data?.avg || 0, count: res.data?.count || 0 });
//       } catch {
//         if (!cancel) setData({ avg: 0, count: 0 });
//       }
//     })();
//     return () => { cancel = true; };
//   }, [testId]);
//   if (!data.count) return null;
//   return (
//     <div className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
//       ★ {data.avg} · {data.count}
//     </div>
//   );
// }

// function FeedbackBox({ testId }) {
//   const [me, setMe] = React.useState({ loading: true, my: null });
//   const [rating, setRating] = React.useState(0);
//   const [comment, setComment] = React.useState("");
//   const [saved, setSaved] = React.useState(false);
//   const [busy, setBusy] = React.useState(false);

//   React.useEffect(() => {
//     let cancel = false;
//     (async () => {
//       try {
//         const res = await axios.get(`/test/${testId}/feedback`);
//         if (cancel) return;
//         const my = res.data?.my || null;
//         setMe({ loading: false, my });
//         if (my) {
//           setRating(Number(my.rating || 0));
//           setComment(my.comment || "");
//         }
//       } catch {
//         if (!cancel) setMe({ loading: false, my: null });
//       }
//     })();
//     return () => { cancel = true; };
//   }, [testId]);

//   const submit = async () => {
//     if (busy) return;
//     setBusy(true);
//     try {
//       await axios.post(`/test/${testId}/feedback`, { rating, comment });
//       setSaved(true);
//       setTimeout(() => setSaved(false), 1500);
//     } catch (err) {
//       const code = err?.response?.status;
//       if (code === 401) alert("Please log in to submit feedback.");
//       else if (code === 400) alert("Feedback opens only after the test is completed.");
//       else if (code === 403) alert("Only participants can leave feedback.");
//       else alert("Failed to save feedback. Try again.");
//     } finally {
//       setBusy(false);
//     }
//   };
  
//   const clearRating = async () => {
//     setRating(0);
//     // Optimistic UI: also clear comment locally if you want
//     // setComment("");
//     try {
//       // If your backend supports DELETE, this will remove the feedback:
//       await axios.delete?.(`/test/${testId}/feedback`);
//     } catch {
//       // Fallback: send a "null" rating so backend can treat it as cleared
//       try { await axios.post(`/test/${testId}/feedback`, { rating: null, comment }); } catch (err) {
//         const code = err?.response?.status;
//         if (code === 401) alert("Please log in to clear feedback.");
//         else if (code === 403) alert("Only participants can clear feedback.");
//         else alert("Failed to clear feedback. Try again.");
//       }
//     }
//   };
//   return (
//     <div className="rounded-xl border p-4">
//       <div className="flex items-center justify-between mb-2">
//         <div className="text-sm font-semibold">Rate this test</div>
//         {rating > 0 && (
//           <button
//             type="button"
//             onClick={clearRating}
//             className="text-xs px-2 py-1 rounded border hover:bg-slate-50 dark:hover:bg-slate-800"
//           >
//             Clear
//           </button>
//         )}
//       </div>

//       {me.loading ? (
//         <div className="h-10 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
//       ) : (
//         <>
//           <div className="flex items-center gap-2 mb-2">
//             {[1, 2, 3, 4, 5].map((n) => {
//               const active = rating >= n;
//               return (
//                 <button
//                   key={n}
//                   type="button"
//                   onClick={() => setRating((prev) => (prev === n ? 0 : n))} // toggle on same star
//                   aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
//                   aria-pressed={active}
//                   className={`w-9 h-9 rounded-full border text-lg leading-9 text-center ${
//                     active
//                       ? "bg-amber-200 border-amber-400"
//                       : "hover:bg-slate-100 dark:hover:bg-slate-800"
//                   }`}
//                 >
//                   {active ? "★" : "☆"}
//                 </button>
//               );
//             })}
//             <span className="text-xs text-slate-500 ml-1">(click again to clear)</span>
//           </div>

//           <textarea
//             value={comment}
//             onChange={(e) => setComment(e.target.value)}
//             placeholder="Optional feedback for the creator…"
//             rows={3}
//             className="w-full text-sm p-2 rounded border bg-transparent"
//           />

//           <div className="mt-2 flex items-center gap-2">
//             <button
//               type="button"
//               onClick={submit}
//               disabled={!rating || busy}
//               className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
//             >
//               {busy ? "Saving…" : saved ? "Saved ✓" : "Submit feedback"}
//             </button>

//             {rating === 0 && (
//               <span className="text-xs text-slate-500">Select at least 1 star to submit</span>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
