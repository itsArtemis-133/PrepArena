// client/src/components/TestCard.jsx
import React from "react";
import dayjs from "dayjs";
import RatingPill from "./RatingPill";
import axios from "../api/axiosConfig";
import { useNavigate } from "react-router-dom";
import { ClockIcon, QuestionMarkCircleIcon, UsersIcon } from "@heroicons/react/24/outline";
import avatar from "../assets/avatar.svg"; // Default avatar

function Chip({ className = "", children }) {
  return (
    <span className={"inline-flex items-center gap-1 px-2 py-[3px] text-[11px] font-semibold rounded-full " + className}>
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
    return <Chip className="bg-indigo-600/15 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-300">Upcoming</Chip>;
  }
  if (over) {
    return <Chip className="bg-gray-600/15 text-gray-700 dark:bg-gray-500/25 dark:text-gray-300">Completed</Chip>;
  }
  return null;
}

const fmtMin = (v) => (Number(v) > 0 ? `${Number(v)} min` : "—");

export default function TestCard({
  test,
  registered = false,
  canUnregister = true,   // external toggle still respected
  showCreator = true,
  onRegistered,
  onUnregistered,
}) {
  const navigate = useNavigate();
  const now = dayjs();

  const start = test?.scheduledDate && dayjs(test.scheduledDate).isValid() ? dayjs(test.scheduledDate) : null;
  const end = start ? start.add(Number(test?.duration || 0), "minute") : null;

  const isUpcoming = !!(start && now.isBefore(start));
  const isLive = !!(start && end && now.isAfter(start) && now.isBefore(end));
  const isOver = !!(end && now.isAfter(end));

  const minsToStart = start && now.isBefore(start) ? Math.max(0, Math.ceil(start.diff(now, "minute", true))) : null;
  const startingSoon = isUpcoming && minsToStart !== null && minsToStart <= 15;

  let rightHint = "—";
  if (isUpcoming && start) rightHint = start.format("DD MMM, HH:mm");
  else if (isLive && end) rightHint = `Ends ${end.format("HH:mm")}`;
  else if (isOver && end) rightHint = `Ended ${end.format("DD MMM")}`;

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
      } catch {
        console.error("Could not fetch my score");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [isOver, test?._id]);

  const goBridge = () => navigate(`/test/${test.link}`, { state: { prefetch: test } });
  const goRunner = () => navigate(`/tests/${test.link}/take`, { state: { prefetch: test } });

  const [busy, setBusy] = React.useState(false);

  const register = async () => {
    try {
      await axios.post(`/test/${test.link}/register`);
      onRegistered?.(test);
      goBridge();
    } catch (err) {
      if (err?.response?.status === 401) navigate(`/login?next=/test/${test.link}`);
      else alert("Registration failed. Please try again.");
    }
  };

  const unregister = async () => {
    // Client guard to mirror server: only allow while upcoming
    if (!isUpcoming) {
      alert("Cannot unregister after start.");
      return;
    }
    if (!canUnregister) return;

    setBusy(true);
    try {
      await axios.delete(`/test/${test.link}/unregister`);
      onUnregistered?.(test);
    } catch (err) {
      const msg = err?.response?.data?.message || "Could not unregister. It may be too close to start time.";
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  const showJoin = registered && (isLive || startingSoon);
  const showRegisteredPill = registered && !showJoin;
  const showRegister = !registered && (isUpcoming || isLive);
  const showDetails = !registered || (registered && !isLive);

  // ✅ NEW: Only allow showing Unregister when test is upcoming (not live/over)
  const canShowUnregister = registered && canUnregister && isUpcoming;

  return (
    <div className="group flex h-full flex-col rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="p-5 flex-grow flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <StatusBadge start={start} end={end} now={now} />
              {showRegisteredPill && (
                <Chip className="bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300">
                  Registered
                </Chip>
              )}
              {test?.isPublic && (
                <Chip className="bg-violet-600/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300">Public</Chip>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 text-xs text-right text-gray-500 dark:text-gray-400 font-medium">{rightHint}</div>
        </div>

        <div className="mt-3">
          <button onClick={goBridge} className="text-left w-full min-h-[56px]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2">
              {test.title || "Untitled Test"}
            </h3>
          </button>
        </div>

        {showCreator && (
          <div className="mt-3 flex items-center gap-2">
            <img src={avatar} alt="Creator" className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
            <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
              {test?.createdBy?.username || "—"}
            </span>
            <RatingPill avg={test?.createdBy?.creatorRatingAvg} count={test?.createdBy?.creatorRatingCount} size="xs" />
          </div>
        )}

        <div className="flex-grow" />

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <ClockIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtMin(test.duration)}</span>
            <span className="text-gray-500 dark:text-gray-400">Duration</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <QuestionMarkCircleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">{Number(test.questionCount || 0) || "—"}</span>
            <span className="text-gray-500 dark:text-gray-400">Questions</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <UsersIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">{Number(test.registrationCount || 0)}</span>
            <span className="text-gray-500 dark:text-gray-400">Registered</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex items-center justify-between gap-2">
        <div className="text-sm">
          {isOver && myScore ? (
            <span className="font-semibold text-gray-800 dark:text-gray-100">
              Score: {myScore.score}/{myScore.total}
            </span>
          ) : !registered && isUpcoming && startingSoon ? (
            <span className="font-semibold text-amber-600 dark:text-amber-400">Starts in {minsToStart} min</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {showDetails && (
            <button
              onClick={goBridge}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isOver ? "Results" : "View"}
            </button>
          )}

          {(showJoin || showRegister) && (
            <button
              onClick={showJoin ? (isLive ? goRunner : goBridge) : register}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-500/30 transition-colors"
            >
              {isLive ? "Enter" : showJoin ? "Join" : "Register"}
            </button>
          )}

          {/* ✅ Only render Unregister when registered AND upcoming */}
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
      </div>
    </div>
  );
}
