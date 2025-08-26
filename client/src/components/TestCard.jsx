import React from "react";
import dayjs from "dayjs";
import RatingPill from "./RatingPill";
import axios from "../api/axiosConfig";
import { useNavigate } from "react-router-dom";

// High-contrast, dark-theme-friendly chips
function Chip({ className = "", children }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 px-2 py-[3px] text-[11px] font-semibold rounded-full " +
        className
      }
    >
      {children}
    </span>
  );
}

function StatusBadge({ start, end, now }) {
  const upcoming = !!(start && now.isBefore(start));
  const live = !!(start && end && now.isAfter(start) && now.isBefore(end));
  const over = !!(end && now.isAfter(end));

  if (live) {
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
  if (upcoming) {
    return (
      <Chip className="bg-blue-600/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-300">
        Upcoming
      </Chip>
    );
  }
  if (over) {
    return (
      <Chip className="bg-slate-600/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-300">
        Completed
      </Chip>
    );
  }
  return null;
}

const fmtMin = (v) => (Number(v) > 0 ? `${Number(v)} min` : "—");

export default function TestCard({
  test,
  registered = false,
  canUnregister = true,
  showCreator = true,
  onRegistered,   // callback(test)
  onUnregistered, // callback(test)
}) {
  const navigate = useNavigate();
  const now = dayjs();

  const start =
    test?.scheduledDate && dayjs(test.scheduledDate).isValid()
      ? dayjs(test.scheduledDate)
      : null;
  const end = start ? start.add(Number(test?.duration || 0), "minute") : null;

  const isUpcoming = !!(start && now.isBefore(start));
  const isLive = !!(start && end && now.isAfter(start) && now.isBefore(end));
  const isOver = !!(end && now.isAfter(end));

  const minsToStart =
    start && now.isBefore(start)
      ? Math.max(0, Math.ceil(start.diff(now, "minute", true)))
      : null;
  const startingSoon = isUpcoming && minsToStart !== null && minsToStart <= 15;

  // Right-side hint (fixed width by keeping it short)
  let rightHint = "—";
  if (isUpcoming && start) rightHint = start.format("DD MMM, HH:mm");
  else if (isLive && end) rightHint = `Ends ${end.format("HH:mm")}`;
  else if (isOver && end) rightHint = `Ended ${end.format("DD MMM")}`;

  // Fetch my score (completed)
  const [myScore, setMyScore] = React.useState(null);
  React.useEffect(() => {
    let cancel = false;
    if (!isOver || !test?._id) return;
    (async () => {
      try {
        const res = await axios.get(`/test/${test._id}/results/me`);
        if (!cancel && res?.data?.available && Number.isFinite(res.data.score)) {
          setMyScore({ score: res.data.score, total: res.data.total });
        }
      } catch {console.error("Could not fetch my score");
      }
    })();
    return () => { cancel = true; };
  }, [isOver, test?._id]);

  const goBridge = () =>
    navigate(`/test/${test.link}`, { state: { prefetch: test } });
  const goRunner = () =>
    navigate(`/tests/${test.link}/take`, { state: { prefetch: test } });

  const [busy, setBusy] = React.useState(false);

  const register = async () => {
    try {
      await axios.post(`/test/${test.link}/register`);
      onRegistered?.(test); // instant UI toggle
      goBridge();
    } catch (err) {
      if (err?.response?.status === 401) navigate(`/login?next=/test/${test.link}`);
      else alert("Registration failed. Please try again.");
    }
  };

  const unregister = async () => {
    if (!canUnregister) return;
    setBusy(true);
    try {
      await axios.post(`/test/${test.link}/unregister`);
      onUnregistered?.(test); // instant UI toggle
    } catch {
      alert("Could not unregister. It may be too close to start time.");
    } finally {
      setBusy(false);
    }
  };

  // Decisions
  const showJoin = registered && (isLive || startingSoon);
  const showRegisteredPill = registered && !showJoin;
  const showRegister = !registered && (isUpcoming || isLive);
  const showDetails = !registered || (registered && !isLive);

  return (
    <div className="group flex h-full flex-col rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-5 shadow-sm transition hover:shadow-md">
      {/* HEADER: chips line with fixed height so titles always align */}
      <div className="flex items-start justify-between">
        <div
          className="
            flex min-h-[28px] max-h-[28px] items-center gap-2 overflow-hidden
            [mask-image:linear-gradient(to_right,black_85%,transparent)]
          "
        >
          <StatusBadge start={start} end={end} now={now} />

          {showRegisteredPill && (
            <Chip className="bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300">
              Registered
            </Chip>
          )}

          {test?.isPublic && (
            <Chip className="bg-violet-600/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300">
              Public
            </Chip>
          )}

          {!registered && isUpcoming && startingSoon && (
            <span className="text-[11px] font-medium text-amber-500 dark:text-amber-300">
              Starts in {minsToStart} min
            </span>
          )}
        </div>

        <div className="ml-3 flex-shrink-0 text-xs text-slate-600 dark:text-slate-400">
          {rightHint}
        </div>
      </div>

      {/* TITLE — fixed 2-line block for uniform height */}
      <div className="mt-2">
        <button onClick={goBridge} className="text-left">
          <h3 className="line-clamp-2 min-h-[48px] text-lg font-bold text-slate-900 dark:text-slate-100 transition-colors group-hover:text-blue-600">
            {test.title || "Untitled Test"}
          </h3>
        </button>
      </div>

      {showCreator && (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">by</span>
          <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {test?.createdBy?.username || "—"}
          </span>
          <RatingPill
            avg={test?.createdBy?.creatorRatingAvg}
            count={test?.createdBy?.creatorRatingCount}
            size="xs"
          />
        </div>
      )}

      {/* STATS */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-slate-200 dark:border-gray-800 p-2">
          <div className="text-[11px] text-slate-500">Duration</div>
          <div className="text-sm font-semibold">{fmtMin(test.duration)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-gray-800 p-2">
          <div className="text-[11px] text-slate-500">Questions</div>
          <div className="text-sm font-semibold">{Number(test.questionCount || 0) || "—"}</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-gray-800 p-2">
          <div className="text-[11px] text-slate-500">Registered</div>
          <div className="text-sm font-semibold">{Number(test.registrationCount || 0)}</div>
        </div>
      </div>

      {/* ACTIONS — with stronger divider */}
      <div className="mt-4 flex h-[46px] items-center justify-between gap-2 border-t border-slate-300/60 dark:border-slate-700 pt-3">
        <div className="text-sm text-slate-700 dark:text-slate-300">
          {isOver && myScore ? (
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Score: {myScore.score}/{myScore.total}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {showJoin && (
            <button
              onClick={isLive ? goRunner : goBridge}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              {isLive ? "Enter" : "Join"}
            </button>
          )}

          {showRegister && (
            <button
              onClick={register}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              {isLive ? "Enter" : "Register"}
            </button>
          )}

          {showDetails && (
            <button
              onClick={goBridge}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50 dark:hover:bg-gray-800"
            >
              {isOver ? "Results" : "View"}
            </button>
          )}

          {registered && (
            <button
              disabled={busy}
              onClick={unregister}
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-red-500 hover:underline disabled:opacity-50"
            >
              {busy ? "…" : "Unregister"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
