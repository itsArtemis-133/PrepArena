import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../hooks/useAuth';

import NoOpenTestsImg     from '../assets/no-open-tests.svg';
import NoUpcomingTestsImg from '../assets/no-upcoming-tests.svg';
import NoResultsImg       from '../assets/no-results.svg';
import DefaultTestImg     from '../assets/default-test.jpeg';
import avatar             from '../assets/avatar.svg';


export default function Dashboard() {
  const { token } = useAuth();
  const [openTests, setOpenTests]         = useState([]);
  const [upcoming, setUpcoming]           = useState([]);
  const [results, setResults]             = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.get('/test/public'),
      // in the Promise.all calls:
      api.get('/test', { params: { status: 'Scheduled', scope: 'all' } }),

      api.get('/test/results/recent'),
      api.get('/announcements'),
    ])
      .then(([openRes, upRes, rRes, aRes]) => {
        setOpenTests(openRes.data.tests || []);
        setUpcoming(upRes.data.tests || []);
        setResults(rRes.data.results || []);
        setAnnouncements(aRes.data.announcements || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const fmt = (date) =>
    new Date(date).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });

  if (loading) {
   return (
     <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <span className="text-gray-500 dark:text-gray-400 text-xl font-semibold animate-pulse">
         Loading dashboard…
       </span>
    </div>
  );
}

  const Placeholder = ({ imgSrc, alt, text }) => (
    <div className="flex flex-col items-center py-12">
      <img src={imgSrc} alt={alt} className="w-40 h-40 mb-4 opacity-80" />
      <p className="text-gray-500 dark:text-gray-400 text-lg">{text}</p>
    </div>
  );

  return (
    <>
      <div className="pt-0 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        {/* Hero */}
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
  <span className="text-[#0F1F33] dark:text-slate-100">Welcome Back, </span>
  <span className="bg-gradient-to-r from-[#FF6B6B] via-[#FFA24C] to-[#FFD93D] bg-clip-text text-transparent">
    Aspirant
  </span>
</h1>

              <p className="mt-2 text-gray-600 dark:text-gray-400 text-lg">
                Your personalized dashboard for UPSC preparation.
              </p>
              <div className="mt-6 flex space-x-4">
                <Link
                  to="/tests/create"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow transition"
                >
                  Give Test
                </Link>
                <Link
                  to="/tests/create"
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-semibold shadow transition"
                >
                  Create Test
                </Link>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <img
                src={avatar}
                alt="Dashboard illustration"
                className="h-32 w-32 rounded-full object-cover shadow-lg border-4 border-blue-100 dark:border-gray-700"
              />
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-6 space-y-16 pb-12">
          {/* 1) Open Tests */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-300">📝</span> Open Tests
            </h2>
            {openTests.length === 0 ? (
              <Placeholder
                imgSrc={NoOpenTestsImg}
                alt="No open tests"
                text="No open tests right now. Check back later!"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {openTests.map((t) => (
                  <Link
                    key={t.link || t._id}
                    to={`/test/${t.link}`}
                    state={{ prefetch: t }}   // <-- pass prefetch to Bridge
                    className="block bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition border border-blue-100 dark:border-gray-700"
                  >
                    <img
                      src={t.thumbnailUrl || DefaultTestImg}
                      alt={t.title}
                      className="h-40 w-full object-cover rounded-t-2xl"
                    />
                    <div className="p-4">
                      <h3 className="text-lg font-bold">{t.title || 'Untitled test'}</h3>
                      <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                        Scheduled for {t.scheduledDate ? fmt(t.scheduledDate) : '—'}
                      </p>
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex gap-3">
                        <span>{t.subject || '—'}</span>
                        <span>•</span>
                        <span>{t.type || '—'}</span>
                        <span>•</span>
                        <span>{Number(t.duration) ? `${t.duration}m` : '—'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 2) Upcoming Tests */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-300">📅</span> Your Upcoming Tests
            </h2>
            {upcoming.length === 0 ? (
              <Placeholder
                imgSrc={NoUpcomingTestsImg}
                alt="No upcoming tests"
                text="You have no scheduled tests."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {upcoming.map((t) => (
                  <Link
                    key={t.link || t._id}
                    to={`/test/${t.link}`}
                    state={{ prefetch: t }}   // <-- pass prefetch to Bridge
                    className="block bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition border border-blue-100 dark:border-gray-700"
                  >
                    <img
                      src={t.thumbnailUrl || DefaultTestImg}
                      alt={t.title}
                      className="h-40 w-full object-cover rounded-t-2xl"
                    />
                    <div className="p-4">
                      <h3 className="text-lg font-bold">{t.title || 'Untitled test'}</h3>
                      <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                        Scheduled for {t.scheduledDate ? fmt(t.scheduledDate) : '—'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 3) Recent Results */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-300">🏆</span> Recent Results
            </h2>
            {results.length === 0 ? (
              <Placeholder
                imgSrc={NoResultsImg}
                alt="No recent results"
                text="You haven’t taken any tests yet."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-blue-100 dark:border-gray-700 shadow">
                <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                  <thead className="bg-blue-50 dark:bg-gray-700">
                    <tr>
                      {['Test Name','Score','Date'].map((col) => (
                        <th
                          key={col}
                          className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr
                        key={r._id}
                        className={
                          i % 2 === 0
                            ? 'bg-white dark:bg-gray-800'
                            : 'bg-blue-50 dark:bg-gray-700'
                        }
                      >
                        <td className="px-6 py-4">{r.testTitle}</td>
                        <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-bold">
                          {r.score}/{r.total}
                        </td>
                        <td className="px-6 py-4">{fmt(r.takenAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 4) Announcements */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-300">📢</span> Announcements
            </h2>
            {announcements.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No announcements.
              </p>
            ) : (
              <ul className="space-y-6">
                {announcements.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-col md:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-blue-100 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="flex-1 p-6">
                      <span className="text-xs font-bold text-blue-600 uppercase">
                        {a.type || 'New'}
                      </span>
                      <h3 className="mt-2 text-lg font-bold">{a.title}</h3>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">
                        {a.text}
                      </p>
                    </div>
                    {a.imageUrl && (
                      <div className="w-full md:w-1/3">
                        <img
                          src={a.imageUrl}
                          alt={a.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
