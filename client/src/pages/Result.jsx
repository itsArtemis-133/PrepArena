// client/src/pages/Result.jsx
// A focused “Past results” page that lists completed tests from scope=all.
// Keeps backend flow intact by using /test?scope=all, then filtering client-side.

import React from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../api/axiosConfig";
import TestCard from "../components/TestCard";

const computeWindow = (t) => {
  const start = t?.scheduledDate && dayjs(t.scheduledDate).isValid()
    ? dayjs(t.scheduledDate)
    : null;
  const end = start ? start.add(Number(t?.duration || 0), "minute") : null;
  const now = dayjs();
  return {
    start,
    end,
    now,
    isCompleted: !!(end && now.isAfter(end)),
  };
};

export default function Result() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/test", { params: { scope: "all" } });
        if (cancel) return;
        const list = res?.data?.tests || [];
        const past = list
          .filter((t) => computeWindow(t).isCompleted)
          .sort((a, b) => {
            const ae = computeWindow(a).end?.valueOf() || 0;
            const be = computeWindow(b).end?.valueOf() || 0;
            return be - ae;
          });
        setItems(past);
      } catch (e) {
        if (!cancel) setError(e?.response?.data?.message || e.message || "Failed to load results");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-extrabold">Results</h1>
        <button
          onClick={() => navigate("/tests?tab=past")}
          className="text-sm text-blue-600 hover:underline"
        >
          See in Tests Hub →
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-slate-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 text-slate-600 dark:text-slate-400">
            No results yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((t) => (
              <TestCard key={t.link || t._id} test={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
