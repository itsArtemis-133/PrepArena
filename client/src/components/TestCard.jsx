import React from "react";
import dayjs from "dayjs";
import RatingPill from "./RatingPill";
import axios from "../api/axiosConfig";
import { useNavigate } from "react-router-dom";

function StatusBadge({ start, end, now }) {
  if (start && now.isBefore(start)) {
    return <span className="inline-flex items-center gap-1 px-2 py-[2px] text-[11px] rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">Upcoming</span>;
  }
  if (start && end && now.isAfter(start) && now.isBefore(end)) {
    return <span className="inline-flex items-center gap-1 px-2 py-[2px] text-[11px] rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">Live</span>;
  }
  if (end && now.isAfter(end)) {
    return <span className="inline-flex items-center gap-1 px-2 py-[2px] text-[11px] rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Completed</span>;
  }
  return null;
}

const fmtMin = (v) => (Number(v) > 0 ? `${Number(v)} min` : "—");

export default function TestCard({
  test,
  now = dayjs(),
  compact = false,
  showCreator = true,
  canUnregister = false,
  registered = false,
  onUnregistered,
}) {
  const navigate = useNavigate();
  const start = test?.scheduledDate && dayjs(test.scheduledDate).isValid() ? dayjs(test.scheduledDate) : null;
  const end = start ? start.add(Number(test?.duration || 0), "minute") : null;
  const isUpcoming = !!(start && now.isBefore(start));
  const isLive = !!(start && end && now.isAfter(start) && now.isBefore(end));
  const isOver = !!(end && now.isAfter(end));

  const go = () => navigate(`/test/${test.link}`, { state: { prefetch: test } });

  const register = async () => {
    try {
      await axios.post(`/test/${test.link}/register`);
      go();
    } catch (err) {
      const code = err?.response?.status;
      if (code === 401) navigate(`/login?next=/test/${test.link}`);
      else alert("Registration failed. Please try again.");
    }
  };

  const unregister = async () => {
    try {
      await axios.post(`/test/${test.link}/unregister`);
      if (onUnregistered) onUnregistered(test);
    } catch  {
      alert("Could not unregister. It may be too close to start time.");
    }
  };

  return (
    <div className={`group rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow transition ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusBadge start={start} end={end} now={now} />
          {test?.isPublic && (
            <span className="inline-flex items-center gap-1 px-2 py-[2px] text-[11px] rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200">
              Public
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {isUpcoming && start ? start.format("DD MMM, HH:mm") : isLive && end ? `Ends ${end.from(now, true)}` : isOver && end ? end.format("DD MMM, HH:mm") : "—"}
        </div>
      </div>

      <div className="mt-2">
        <button onClick={go} className="text-left text-lg font-semibold text-slate-900 dark:text-slate-100 hover:underline">
          {test.title || "Untitled Test"}
        </button>
      </div>

      {/* tags row (subject / type / mode) */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        {test.subject && <span className="px-2 py-[2px] rounded bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300">#{test.subject}</span>}
        {test.type && <span className="px-2 py-[2px] rounded bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300">#{test.type}</span>}
        {test.testMode && <span className="px-2 py-[2px] rounded bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300">#{test.testMode}</span>}
      </div>

      {/* creator line */}
      {showCreator && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-300">by</span>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{test?.createdBy?.username || "—"}</span>
          <RatingPill
            avg={test?.createdBy?.creatorRatingAvg}
            count={test?.createdBy?.creatorRatingCount}
            size="xs"
          />
        </div>
      )}

      {/* meta row */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-slate-200 dark:border-gray-800 py-2">
          <div className="text-[11px] text-slate-500">Duration</div>
          <div className="text-sm font-semibold">{fmtMin(test.duration)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-gray-800 py-2">
          <div className="text-[11px] text-slate-500">Questions</div>
          <div className="text-sm font-semibold">{Number(test.questionCount || 0) || "—"}</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-gray-800 py-2">
          <div className="text-[11px] text-slate-500">Registered</div>
          <div className="text-sm font-semibold">{Number(test.registrationCount || 0)}</div>
        </div>
      </div>

      {/* actions */}
      <div className="mt-3 flex items-center gap-2">
        {registered ? (
          isLive ? (
            <button onClick={go} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
              Enter
            </button>
          ) : (
            <>
              <button onClick={go} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                View
              </button>
              {canUnregister && isUpcoming && (
                <button onClick={unregister} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                  Unregister
                </button>
              )}
            </>
          )
        ) : isUpcoming || isLive ? (
          <>
            <button onClick={register} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              {isLive ? "Register & Enter" : "Register"}
            </button>
            <button onClick={go} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              Details
            </button>
          </>
        ) : (
          <button onClick={go} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
            Results
          </button>
        )}
      </div>
    </div>
  );
}
