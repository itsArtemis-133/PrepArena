import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axiosConfig";
import { useAuth } from "../hooks/useAuth";

const Section = ({ title, icon, to, children }) => (
  <section className="ui-section p-6">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <span className="text-blue-600">{icon}</span>{title}
      </h2>
      {to && (
        <Link to={to} className="text-sm px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
          View All
        </Link>
      )}
    </div>
    {children}
  </section>
);

const TestCard = ({ t }) => {
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
  return (
    <Link to={`/test/${t.link}`} state={{ prefetch: t }} className="ui-card block overflow-hidden rounded-2xl transition p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug line-clamp-2">{t.title || "Untitled test"}</h3>
        {t.window?.isLive && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700">LIVE</span>}
        {t.window?.isUpcoming && !t.window?.isLive && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">UPCOMING</span>}
        {t.window?.isCompleted && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">DONE</span>}
      </div>
      <p className="mt-1 text-sm text-blue-600">{t.scheduledDate ? `Scheduled • ${fmt(t.scheduledDate)}` : "—"}</p>
      <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
        {t.subject && <span>{t.subject}</span>}
        {t.type && <><span>•</span><span>{t.type}</span></>}
        {Number(t.duration) ? <><span>•</span><span>{t.duration}m</span></> : null}
      </div>
    </Link>
  );
};

export default function Dashboard() {
  const { token } = useAuth();
  const [allTests, setAllTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const OPEN_LIMIT = 4, UPC_LIMIT = 4, RES_LIMIT = 3;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/test/public"),
      api.get("/test/results/recent", { params: { limit: 10 } }),
    ])
      .then(([testsRes, resultsRes]) => {
        setAllTests(testsRes?.data?.tests || []);
        setResults(resultsRes?.data?.results || []);
      })
      .catch(() => { setAllTests([]); setResults([]); })
      .finally(() => setLoading(false));
  }, [token]);

  const openTests = allTests || [];
  const upcoming  = openTests.filter((t) => t.window?.isUpcoming);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center text-gray-500">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Hero (simple & solid) */}
      <div className="ui-section px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome back to <span className="text-blue-600">PrepArena</span></h1>
            <p className="mt-2 text-gray-600 text-lg">Track your progress and find your next challenge.</p>
            <div className="mt-6 flex gap-3">
              <Link to="/tests?tab=live" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow">Join a Test</Link>
              <Link to="/tests" className="px-5 py-2 bg-white border border-[rgb(var(--surface-border))] text-gray-800 rounded-xl font-semibold shadow hover:bg-gray-50">Browse Tests</Link>
            </div>
          </div>
        </div>
      </div>

      <Section title="Open Tests" icon="📝" to="/tests?tab=all">
        {openTests.length === 0 ? (
          <div className="py-10 text-center text-gray-600">No open tests right now.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {openTests.slice(0, OPEN_LIMIT).map((t) => <TestCard key={t.link || t._id} t={t} />)}
          </div>
        )}
      </Section>

      <Section title="Your Upcoming Tests" icon="📅" to="/tests?tab=upcoming">
        {upcoming.length === 0 ? (
          <div className="py-10 text-center text-gray-600">You have no scheduled tests.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {upcoming.slice(0, UPC_LIMIT).map((t) => <TestCard key={t.link || t._id} t={t} />)}
          </div>
        )}
      </Section>

      <Section title="Recent Results" icon="📊" to="/results">
        {results.length === 0 ? (
          <div className="py-10 text-center text-gray-600">No results yet.</div>
        ) : (
          <div className="ui-table overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className="bg-[rgb(var(--app-bg))]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">Taken At</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, RES_LIMIT).map((r, i) => (
                  <tr key={r._id || `${r.testLink}-${i}`} className={i % 2 ? "bg-gray-50/70" : "bg-white"}>
                    <td className="px-6 py-4">
                      <Link to={`/test/${r.testLink}`} className="text-blue-700 font-semibold hover:underline">
                        {r.testTitle}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-700">{r.score}/{r.total}</td>
                    <td className="px-6 py-4">
                      {new Date(r.takenAt).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
