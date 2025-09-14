import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "../api/axiosConfig";

import { fmt, fmtMin } from "../utils/format";
import { mergeTest } from "../utils/testMerge";

// Components
import ActionButton from "../components/testbridge/ActionButton";
import StatusBadge from "../components/testbridge/StatusBadge";
import StatCard from "../components/testbridge/StatCard";
import AnswerKeyGrid from "../components/testbridge/AnswerKeyGrid";
import CreatorReputation from "../components/testbridge/CreatorReputation";
import RatingBadge from "../components/testbridge/RatingBadge";
import FeedbackBox from "../components/testbridge/FeedbackBox";
import Leaderboard from "../components/testbridge/Leaderboard";
import DownloadsBox from "../components/testbridge/DownloadsBox";
import ShareBox from "../components/testbridge/ShareBox";
import DebugPanel from "../components/testbridge/DebugPanel";
import MyResultCard from "../components/testbridge/MyResultCard";

dayjs.extend(relativeTime);

export default function TestBridge() {
  const { link } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const debugEnabled = new URLSearchParams(location.search).get("debug") === "1";

  const prefetch = location.state?.prefetch || null;

  // State
  const [test, setTest] = useState(prefetch);
  const [loading, setLoading] = useState(!prefetch);
  const [registered, setRegistered] = useState(false);
  const [regLoading, setRegLoading] = useState(true);
  const [copyOk, setCopyOk] = useState(false);
  const [now, setNow] = useState(dayjs());

  // Completed-window data
  const [lb, setLb] = useState({ loading: true, rows: [], total: 0, page: 1, limit: 25 });
  const [solution, setSolution] = useState({ loading: true, available: false, key: {} });
  const [myResult, setMyResult] = useState({ loading: true, available: false, details: [] });

  // Refs for debugging
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

  // Fetch test & registration
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
        if (!cancelled) {
          setLoading(false);
          setRegLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  // Time windows
  const start =
    test?.scheduledDate && dayjs(test.scheduledDate).isValid()
      ? dayjs(test.scheduledDate)
      : null;
  const end = start ? start.add(Number(test?.duration || 0), "minute") : null;
  const isUpcoming = start ? now.isBefore(start) : false;
  const isLive = start && end ? now.isAfter(start) && now.isBefore(end) : false;
  const isOver = end ? now.isAfter(end) : false;

  // Fetch solution/results/leaderboard only after completion
  useEffect(() => {
    if (!test?._id || !isOver || fetchedSolutionRef.current) return;
    fetchedSolutionRef.current = true;
    axios
      .get(`/test/${test._id}/solution`)
      .then((res) =>
        setSolution({
          loading: false,
          available: !!res.data?.available,
          key: res.data?.answerKey || {},
        })
      )
      .catch(() => setSolution({ loading: false, available: false, key: {} }));
  }, [isOver, test?._id]);

  useEffect(() => {
    if (!test?._id || !isOver || fetchedMyResultRef.current) return;
    fetchedMyResultRef.current = true;
    axios
      .get(`/test/${test._id}/results/me`)
      .then((res) => setMyResult({ loading: false, ...res.data }))
      .catch(() => setMyResult({ loading: false, available: false, details: [] }));
  }, [isOver, test?._id]);

  useEffect(() => {
    if (!test?._id || !isOver) return;
    let cancelled = false;
    setLb((prev) => ({ ...prev, loading: true }));
    axios
      .get(`/test/${test._id}/leaderboard`, { params: { page: lb.page, limit: lb.limit } })
      .then((res) => {
        if (!cancelled) {
          setLb({
            loading: false,
            rows: res.data?.results || [],
            total: Number(res.data?.total || 0),
            page: Number(res.data?.page || lb.page),
            limit: Number(res.data?.limit || lb.limit),
          });
        }
      })
      .catch(() => !cancelled && setLb((p) => ({ ...p, loading: false, rows: [], total: 0 })));
    return () => {
      cancelled = true;
    };
  }, [isOver, test?._id, lb.page, lb.limit]);

  // Actions
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
      setTest((t) => ({
        ...t,
        registrationCount: Number(t?.registrationCount || 0) + 1,
      }));
      if (isLive) navigate(`/tests/${test.link}/take`);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 401) navigate(`/login?next=/test/${link}`);
      else alert("Registration failed. Please try again.");
    }
  };

  const unregisterNow = async () => {
    try {
      await axios.delete(`/test/${link}/unregister`);
      setRegistered(false);
      setTest((t) => ({
        ...t,
        registrationCount: Math.max(0, Number(t?.registrationCount || 0) - 1),
      }));
    } catch (err) {
      const msg = err?.response?.data?.message || "Unable to unregister.";
      if (err?.response?.status === 401) navigate(`/login?next=/test/${link}`);
      else alert(msg);
    }
  };

  // Protected downloads (S3 stays hidden behind server routes)
  const downloadFromRoute = async (route, fname) => {
    try {
      const res = await axios.get(route, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      alert("Download failed. Please try again.");
    }
  };
  const downloadQuestionPdf = () =>
    downloadFromRoute(`/test/${test._id}/pdf`, `${fmt(test.title)} - Question Paper.pdf`);
  const downloadAnswersPdf = () =>
    downloadFromRoute(
      `/test/${test._id}/answers-pdf`,
      `${fmt(test.title)} - Official Answers.pdf`
    );

  // Render
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
          <p className="text-slate-600 dark:text-slate-300 mt-2">
            Please check the link and try again.
          </p>
        </div>
      </div>
    );
  }

  const hasAnswersPdf = Boolean(test.answersPdfFilename) || Boolean(test.answersPdfUrl);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <div className="w-full bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                isUpcoming={isUpcoming}
                isLive={isLive}
                isOver={isOver}
                start={start}
                end={end}
                now={now}
              />
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
            {/* Aligned stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-stretch">
              <StatCard label="Questions">{fmt(test.questionCount)}</StatCard>
              <StatCard label="Scheduled">
                {start ? start.format("DD MMM YYYY, HH:mm") : "—"}
              </StatCard>
              <StatCard label="Created by">
                <div className="flex items-center gap-2">
                  <span>{fmt(test?.createdBy?.username)}</span>
                  <CreatorReputation
                    avg={test?.createdBy?.creatorRatingAvg}
                    count={test?.createdBy?.creatorRatingCount}
                  />
                </div>
              </StatCard>
            </div>

            {(test.description || test.syllabus) && (
              <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
                <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
                  Description & Syllabus
                </div>
                {test.description && (
                  <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                    {test.description}
                  </p>
                )}
                {test.syllabus && (
                  <div className="mt-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Syllabus
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {test.syllabus}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
              <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
                About this test
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                <li>
                  Link opens in a secure runner with PDF (left) and OMR grid (right).
                </li>
                <li>Timer starts as scheduled and auto-submits when time ends.</li>
                <li>If this is a public test, anyone with the link can register.</li>
              </ul>
            </div>

            {/* Completed window */}
            {isOver && (
              <>
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Post-test
                  </div>
                  <RatingBadge testId={test._id} />
                </div>

                <MyResultCard myResult={myResult} testId={test._id} />

                {/* Leaderboard */}
                <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
                      Leaderboard
                    </div>
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

                  <Leaderboard lb={lb} setLb={setLb} />
                </div>

                {/* Official Answers grid (if available) */}
                <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
                  <div className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
                    Official Answers
                  </div>
                  {solution.loading ? (
                    <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
                  ) : !solution.available ? (
                    <div className="text-slate-600 dark:text-slate-400">
                      Solutions not available yet.
                    </div>
                  ) : (
                    <AnswerKeyGrid keyObj={solution.key} />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right */}
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
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {fmt(test.type)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Mode</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {fmt(test.testMode)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Duration</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {fmtMin(test.duration)}
                    </div>
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
                    test={test}
                    registerAndMaybeEnter={registerAndMaybeEnter}
                    unregisterNow={unregisterNow}
                  />
                </div>

                {registered && (
                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 text-center">
                    You’re registered for this test.
                  </div>
                )}
              </div>

              <DownloadsBox
                isOver={isOver}
                hasAnswersPdf={hasAnswersPdf}
                onDownloadQuestion={downloadQuestionPdf}
                onDownloadAnswers={downloadAnswersPdf}
              />

              <ShareBox
                show={test.isPublic || test.isCreator}
                shareURL={shareURL}
                copyOk={copyOk}
                onCopy={copyShare}
              />
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>

      <DebugPanel
        debugEnabled={debugEnabled}
        link={link}
        prefetchSnapshot={prefetchSnapshotRef.current}
        serverSnapshot={serverSnapshotRef.current}
        mergedTest={test}
        mergeRows={mergeRowsRef.current}
      />
    </div>
  );
}
