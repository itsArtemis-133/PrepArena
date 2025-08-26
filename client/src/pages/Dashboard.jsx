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
import avatar from "../assets/avatar.svg"; // Assuming you have a default avatar

// The computeWindow function remains unchanged.
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

// A new component for visually appealing section headers.
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

// A new component for better empty state messages.
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
  const [registered, setRegistered] = React.useState([]);
  const [allMine, setAllMine] = React.useState([]);

  // Data fetching and memoized computations remain unchanged.
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

  const essentials = React.useMemo(() => {
    const withFlags = (arr) => arr.map((t) => ({ t, w: computeWindow(t) }));
    const reg = withFlags(registered);
    const mine = withFlags(
      allMine.filter((x) => String(x?.isCreator) === "true" || x?.isCreator)
    );
    const pool = [...reg, ...mine]
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
    const seen = new Set();
    const uniq = [];
    for (const t of pool) {
      if (!seen.has(t.link)) {
        seen.add(t.link);
        uniq.push(t);
      }
      if (uniq.length >= 4) break;
    }
    return uniq;
  }, [registered, allMine]);

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

      {/* Main dashboard layout: 2 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left (main) column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Essentials grid */}
          <section>
            <SectionHeader
              title="Your Next Tests"
              icon={<DocumentChartBarIcon className="h-6 w-6 text-indigo-500" />}
              onAction={() => navigate("/tests?tab=registered")}
              actionLabel="View all"
            />
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
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
                  <TestCard key={t.link || t._id} test={t} registered />
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
                  <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
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
                  <div key={t.link} className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-5 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
                    <div>
                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        Completed
                      </p>
                      <button
                        onClick={() => navigate(`/test/${t.link}`, { state: { prefetch: t } })}
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
              <img src={avatar} alt="User Avatar" className="h-16 w-16 rounded-full object-cover bg-gray-200" />
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
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-sm transition-colors duration-300"
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


// import React, { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
// import api from '../api/axiosConfig';
// import { useAuth } from '../hooks/useAuth';

// import NoOpenTestsImg     from '../assets/no-open-tests.svg';
// import NoUpcomingTestsImg from '../assets/no-upcoming-tests.svg';
// import NoResultsImg       from '../assets/no-results.svg';
// import DefaultTestImg     from '../assets/default-test.jpeg';
// import avatar             from '../assets/avatar.svg';


// export default function Dashboard() {
//   const { token } = useAuth();
//   const [openTests, setOpenTests]         = useState([]);
//   const [upcoming, setUpcoming]           = useState([]);
//   const [results, setResults]             = useState([]);
//   const [announcements, setAnnouncements] = useState([]);
//   const [loading, setLoading]             = useState(true);

//   useEffect(() => {
//     if (!token) return;
//     setLoading(true);
//     Promise.all([
//       api.get('/test/public'),
//       // in the Promise.all calls:
//       api.get('/test', { params: { status: 'Scheduled', scope: 'all' } }),

//       api.get('/test/results/recent'),
//       api.get('/announcements'),
//     ])
//       .then(([openRes, upRes, rRes, aRes]) => {
//         setOpenTests(openRes.data.tests || []);
//         setUpcoming(upRes.data.tests || []);
//         setResults(rRes.data.results || []);
//         setAnnouncements(aRes.data.announcements || []);
//       })
//       .catch(console.error)
//       .finally(() => setLoading(false));
//   }, [token]);

//   const fmt = (date) =>
//     new Date(date).toLocaleDateString(undefined, {
//       year: 'numeric', month: 'short', day: 'numeric'
//     });

//   if (loading) {
//    return (
//      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
//       <span className="text-gray-500 dark:text-gray-400 text-xl font-semibold animate-pulse">
//          Loading dashboard…
//        </span>
//     </div>
//   );
// }

//   const Placeholder = ({ imgSrc, alt, text }) => (
//     <div className="flex flex-col items-center py-12">
//       <img src={imgSrc} alt={alt} className="w-40 h-40 mb-4 opacity-80" />
//       <p className="text-gray-500 dark:text-gray-400 text-lg">{text}</p>
//     </div>
//   );

//   return (
//     <>
//       <div className="pt-0 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
//         {/* Hero */}
//         <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
//           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//             <div>
//               <h1 className="text-3xl font-extrabold tracking-tight">
//   <span className="text-[#0F1F33] dark:text-slate-100">Welcome Back, </span>
//   <span className="bg-gradient-to-r from-[#FF6B6B] via-[#FFA24C] to-[#FFD93D] bg-clip-text text-transparent">
//     Aspirant
//   </span>
// </h1>

//               <p className="mt-2 text-gray-600 dark:text-gray-400 text-lg">
//                 Your personalized dashboard for UPSC preparation.
//               </p>
//               <div className="mt-6 flex space-x-4">
//                 <Link
//                   to="/tests/create"
//                   className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow transition"
//                 >
//                   Give Test
//                 </Link>
//                 <Link
//                   to="/tests/create"
//                   className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-semibold shadow transition"
//                 >
//                   Create Test
//                 </Link>
//               </div>
//             </div>
//             <div className="flex justify-center md:justify-end">
//               <img
//                 src={avatar}
//                 alt="Dashboard illustration"
//                 className="h-32 w-32 rounded-full object-cover shadow-lg border-4 border-blue-100 dark:border-gray-700"
//               />
//             </div>
//           </div>
//         </div>

//         <main className="max-w-7xl mx-auto px-6 space-y-16 pb-12">
//           {/* 1) Open Tests */}
//           <section>
//             <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
//               <span className="text-blue-600 dark:text-blue-300">📝</span> Open Tests
//             </h2>
//             {openTests.length === 0 ? (
//               <Placeholder
//                 imgSrc={NoOpenTestsImg}
//                 alt="No open tests"
//                 text="No open tests right now. Check back later!"
//               />
//             ) : (
//               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
//                 {openTests.map((t) => (
//                   <Link
//                     key={t.link || t._id}
//                     to={`/test/${t.link}`}
//                     state={{ prefetch: t }}   // <-- pass prefetch to Bridge
//                     className="block bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition border border-blue-100 dark:border-gray-700"
//                   >
//                     <img
//                       src={t.thumbnailUrl || DefaultTestImg}
//                       alt={t.title}
//                       className="h-40 w-full object-cover rounded-t-2xl"
//                     />
//                     <div className="p-4">
//                       <h3 className="text-lg font-bold">{t.title || 'Untitled test'}</h3>
//                       <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
//                         Scheduled for {t.scheduledDate ? fmt(t.scheduledDate) : '—'}
//                       </p>
//                       <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex gap-3">
//                         <span>{t.subject || '—'}</span>
//                         <span>•</span>
//                         <span>{t.type || '—'}</span>
//                         <span>•</span>
//                         <span>{Number(t.duration) ? `${t.duration}m` : '—'}</span>
//                       </div>
//                     </div>
//                   </Link>
//                 ))}
//               </div>
//             )}
//           </section>

//           {/* 2) Upcoming Tests */}
//           <section>
//             <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
//               <span className="text-blue-600 dark:text-blue-300">📅</span> Your Upcoming Tests
//             </h2>
//             {upcoming.length === 0 ? (
//               <Placeholder
//                 imgSrc={NoUpcomingTestsImg}
//                 alt="No upcoming tests"
//                 text="You have no scheduled tests."
//               />
//             ) : (
//               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
//                 {upcoming.map((t) => (
//                   <Link
//                     key={t.link || t._id}
//                     to={`/test/${t.link}`}
//                     state={{ prefetch: t }}   // <-- pass prefetch to Bridge
//                     className="block bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition border border-blue-100 dark:border-gray-700"
//                   >
//                     <img
//                       src={t.thumbnailUrl || DefaultTestImg}
//                       alt={t.title}
//                       className="h-40 w-full object-cover rounded-t-2xl"
//                     />
//                     <div className="p-4">
//                       <h3 className="text-lg font-bold">{t.title || 'Untitled test'}</h3>
//                       <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
//                         Scheduled for {t.scheduledDate ? fmt(t.scheduledDate) : '—'}
//                       </p>
//                     </div>
//                   </Link>
//                 ))}
//               </div>
//             )}
//           </section>

//           {/* 3) Recent Results */}
//           <section>
//             <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
//               <span className="text-blue-600 dark:text-blue-300">🏆</span> Recent Results
//             </h2>
//             {results.length === 0 ? (
//               <Placeholder
//                 imgSrc={NoResultsImg}
//                 alt="No recent results"
//                 text="You haven’t taken any tests yet."
//               />
//             ) : (
//               <div className="overflow-x-auto rounded-xl border border-blue-100 dark:border-gray-700 shadow">
//                 <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
//                   <thead className="bg-blue-50 dark:bg-gray-700">
//                     <tr>
//                       {['Test Name','Score','Date'].map((col) => (
//                         <th
//                           key={col}
//                           className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200"
//                         >
//                           {col}
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {results.map((r, i) => (
//                       <tr
//                         key={r._id}
//                         className={
//                           i % 2 === 0
//                             ? 'bg-white dark:bg-gray-800'
//                             : 'bg-blue-50 dark:bg-gray-700'
//                         }
//                       >
//                         <td className="px-6 py-4">{r.testTitle}</td>
//                         <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-bold">
//                           {r.score}/{r.total}
//                         </td>
//                         <td className="px-6 py-4">{fmt(r.takenAt)}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </section>

//           {/* 4) Announcements */}
//           <section>
//             <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
//               <span className="text-blue-600 dark:text-blue-300">📢</span> Announcements
//             </h2>
//             {announcements.length === 0 ? (
//               <p className="text-gray-500 dark:text-gray-400 text-lg">
//                 No announcements.
//               </p>
//             ) : (
//               <ul className="space-y-6">
//                 {announcements.map((a) => (
//                   <li
//                     key={a.id}
//                     className="flex flex-col md:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-blue-100 dark:border-gray-700 overflow-hidden"
//                   >
//                     <div className="flex-1 p-6">
//                       <span className="text-xs font-bold text-blue-600 uppercase">
//                         {a.type || 'New'}
//                       </span>
//                       <h3 className="mt-2 text-lg font-bold">{a.title}</h3>
//                       <p className="mt-1 text-gray-600 dark:text-gray-400">
//                         {a.text}
//                       </p>
//                     </div>
//                     {a.imageUrl && (
//                       <div className="w-full md:w-1/3">
//                         <img
//                           src={a.imageUrl}
//                           alt={a.title}
//                           className="h-full w-full object-cover"
//                         />
//                       </div>
//                     )}
//                   </li>
//                 ))}
//               </ul>
//             )}
//           </section>
//         </main>
//       </div>
//     </>
//   );
// }
