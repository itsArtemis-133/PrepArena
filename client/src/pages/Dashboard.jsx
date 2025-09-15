// client/src/pages/Dashboard.jsx
import React from "react";
import dayjs from "dayjs";
import api from "../api/axiosConfig";
import TestCard from "../components/TestCard";
import { useNavigate } from "react-router-dom";
import {
  DocumentChartBarIcon,
  UserCircleIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";

import avatarDefault from "../assets/avatar.svg";
import { useMyAvatar } from "../hooks/useMyAvatar";



// Time window helper (unchanged)
const computeWindow = (t) => {
  const start =
    t?.scheduledDate && dayjs(t.scheduledDate).isValid()
      ? dayjs(t.scheduledDate)
      : null;
  const end = start ? start.add(Number(t?.duration || 0), "minute") : null;
  const now = dayjs();
  return {
    start,
    end,
    now,
    isUpcoming: !!(start && now.isBefore(start)),
    isLive: !!(start && end && now.isAfter(start) && now.isBefore(end)),
    isCompleted: !!(end && now.isAfter(end)),
  };
};

// Section header (UI intact)
const SectionHeader = ({ title, icon, onAction, actionLabel }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      {icon}
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
        {title}
      </h2>
    </div>
    {onAction && (
      <button
        onClick={onAction}
        className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        {actionLabel} →
      </button>
    )}
  </div>
);

// Empty state (UI intact)
const EmptyState = ({ message, icon }) => (
  <div className="mt-3 text-center rounded-2xl border-2 border-dashed bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-8">
    {icon}
    <p className="mt-3 font-medium text-gray-500 dark:text-gray-400">
      {message}
    </p>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const { url: myAvatarUrl } = useMyAvatar();

  // Two pools: tests I'm registered for, and all tests I created or registered for
  const [registered, setRegistered] = React.useState([]);
  const [allMine, setAllMine] = React.useState([]);

  // Fetch initial data
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const [reg, all] = await Promise.allSettled([
          api.get("/test", { params: { scope: "registered" } }),
          api.get("/test", { params: { scope: "all" } }),
        ]);
        if (cancel) return;

        if (reg.status === "fulfilled")
          setRegistered(reg.value?.data?.tests || []);
        if (all.status === "fulfilled")
          setAllMine(all.value?.data?.tests || []);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Optimistic update helpers (keep shapes; match by link or _id)
  const keyOf = (t) => t?.link || t?._id || "";

  const applyToArr = (arr, test, updater) => {
    const k = keyOf(test);
    return arr.map((x) => (keyOf(x) === k ? updater(x) : x));
  };

  const handleRegistered = (t) => {
    setRegistered((prev) => {
      const exists = prev.some((x) => keyOf(x) === keyOf(t));
      if (exists) {
        return applyToArr(prev, t, (x) => ({
          ...x,
          isRegistered: true,
          registrationCount: Number(x.registrationCount || 0) + 1,
        }));
      }
      return [
        ...prev,
        {
          ...t,
          isRegistered: true,
          registrationCount: Number(t.registrationCount || 0) + 1,
        },
      ];
    });

    setAllMine((prev) =>
      applyToArr(prev, t, (x) => ({
        ...x,
        isRegistered: true,
        registrationCount: Number(x.registrationCount || 0) + 1,
      }))
    );
  };

  const handleUnregistered = (t) => {
    // ✅ Always remove from registered pool so the card disappears immediately
    setRegistered((prev) => prev.filter((x) => keyOf(x) !== keyOf(t)));

    // Always flip flags in allMine (created/registered superset)
    setAllMine((prev) =>
      applyToArr(prev, t, (x) => ({
        ...x,
        isRegistered: false,
        registrationCount: Math.max(0, Number(x.registrationCount || 0) - 1),
      }))
    );
  };

  // Compute "Your Next Tests": only truly registered & upcoming/live
  const essentials = React.useMemo(() => {
    const withFlags = (arr) => arr.map((t) => ({ t, w: computeWindow(t) }));
    const reg = withFlags(registered);

    const pool = reg
      .filter((x) => x.t?.isRegistered) // only truly registered
      .filter((x) => x.w.isUpcoming || x.w.isLive)
      .sort((a, b) => {
        const aLive = a.w.isLive ? 0 : 1;
        const bLive = b.w.isLive ? 0 : 1;
        if (aLive !== bLive) return aLive - bLive;
        const at = a.w.start ? a.w.start.valueOf() : Infinity;
        const bt = b.w.start ? b.w.start.valueOf() : Infinity;
        return at - bt;
      })
      .map((x) => x.t);

    // Dedupe by link
    const seen = new Set();
    const uniq = [];
    for (const t of pool) {
      const k = keyOf(t);
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(t);
      }
      if (uniq.length >= 4) break;
    }
    return uniq;
  }, [registered]);

  // Latest results: the most recent completed from my superset
  const latestResults = React.useMemo(() => {
    const completed = (allMine || []).filter(
      (t) => computeWindow(t).isCompleted
    );
    return completed
      .sort((a, b) => {
        const ae = computeWindow(a).end?.valueOf() || 0;
        const be = computeWindow(b).end?.valueOf() || 0;
        return be - ae;
      })
      .slice(0, 3);
  }, [allMine]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero / Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8 mb-8 shadow-lg shadow-indigo-500/20">
        <h1 className="text-3xl font-extrabold">Welcome back, Aspirant 👋</h1>
        <p className="mt-1 text-white/80 max-w-2xl">
          This is your mission control. Stay updated on your upcoming tests and
          track your performance.
        </p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left (main) column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Essentials grid */}
          <section>
            <SectionHeader
              title="Your Next Tests"
              icon={<DocumentChartBarIcon className="h-6 w-6 text-indigo-500" />}
              onAction={() => navigate("/tests?tab=upcoming")}
              actionLabel="View all"
            />
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                  />
                ))}
              </div>
            ) : essentials.length === 0 ? (
              <EmptyState
                message="No upcoming tests found. Register for a test to get started!"
                icon={<InboxIcon className="h-12 w-12 mx-auto text-gray-400" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {essentials.map((t) => (
                  <TestCard
                    key={t.link || t._id}
                    test={t}
                    registered={!!t.isRegistered}
                    onRegistered={handleRegistered}
                    onUnregistered={handleUnregistered}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Latest results */}
          <section>
            <SectionHeader
              title="Latest Results"
              icon={<DocumentChartBarIcon className="h-6 w-6 text-indigo-500" />}
              onAction={() => navigate("/tests?tab=past")}
              actionLabel="View all"
            />
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                  />
                ))}
              </div>
            ) : latestResults.length === 0 ? (
              <EmptyState
                message="Your completed test results will appear here."
                icon={<InboxIcon className="h-12 w-12 mx-auto text-gray-400" />}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {latestResults.map((t) => (
                  <div
                    key={t.link || t._id}
                    className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-5 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300"
                  >
                    <div>
                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        Completed
                      </p>
                      <button
                        onClick={() =>
                          navigate(`/test/${t.link}`, { state: { prefetch: t } })
                        }
                        className="mt-1 text-left font-bold text-gray-800 dark:text-gray-200 hover:underline line-clamp-2"
                      >
                        {t.title || "Untitled Test"}
                      </button>
                    </div>
                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      Ended on{" "}
                      {computeWindow(t).end?.format("DD MMM, YYYY") || "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right (sidebar) column */}
        <aside className="lg:col-span-1 space-y-8">
          {/* Profile quick section */}
          <section className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6">
            <div className="flex items-center gap-4">
              <img
                src={myAvatarUrl || avatarDefault}
                alt="User Avatar"
                className="h-16 w-16 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
              />

              
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Your Profile
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Track your progress and manage settings.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/profile")}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-sm transition-colors duration-300 text-gray-900 dark:text-gray-100"
            >
              <UserCircleIcon className="h-5 w-5" />
              <span>Go to Profile</span>
            </button>
          </section>

          {/* Quick Actions */}
          <section className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/tests/create")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-semibold shadow-lg shadow-orange-500/20 hover:scale-105 transition-all duration-300"
              >
                <PlusCircleIcon className="h-6 w-6" />
                <span>Create a New Test</span>
              </button>
              <button
                onClick={() => navigate("/tests")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all duration-300"
              >
                <MagnifyingGlassIcon className="h-6 w-6" />
                <span>Explore All Tests</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

