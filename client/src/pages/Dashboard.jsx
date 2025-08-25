import React from "react";
import dayjs from "dayjs";
import axios from "../api/axiosConfig";
import TestCard from "../components/TestCard";
import { useNavigate } from "react-router-dom";

const computeWindow = (t) => {
  const start = t?.scheduledDate && dayjs(t.scheduledDate).isValid() ? dayjs(t.scheduledDate) : null;
  const end = start ? start.add(Number(t?.duration || 0), "minute") : null;
  const now = dayjs();
  return {
    start, end, now,
    isUpcoming: !!(start && now.isBefore(start)),
    isLive: !!(start && end && now.isAfter(start) && now.isBefore(end)),
    isCompleted: !!(end && now.isAfter(end)),
  };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [registered, setRegistered] = React.useState([]);
  const [allMine, setAllMine] = React.useState([]);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const [reg, all] = await Promise.allSettled([
          axios.get("/test", { params: { scope: "registered" } }),
          axios.get("/test", { params: { scope: "all" } }),
        ]);
        if (cancel) return;

        if (reg.status === "fulfilled") setRegistered(reg.value?.data?.tests || []);
        if (all.status === "fulfilled") setAllMine(all.value?.data?.tests || []);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Essentials: next 4 tests the user cares about (registered upcoming/live, then created upcoming/live)
  const essentials = React.useMemo(() => {
    const withFlags = (arr) => arr.map(t => ({ t, w: computeWindow(t) }));
    const reg = withFlags(registered);
    const mine = withFlags(allMine.filter(x => String(x?.isCreator) === "true" || x?.isCreator)); // created by me
    const pool = [...reg, ...mine]
      .filter(x => x.w.isUpcoming || x.w.isLive)
      .sort((a, b) => {
        // earliest start first; live before upcoming
        const aLive = a.w.isLive ? 0 : 1;
        const bLive = b.w.isLive ? 0 : 1;
        if (aLive !== bLive) return aLive - bLive;
        const at = a.w.start ? a.w.start.valueOf() : Infinity;
        const bt = b.w.start ? b.w.start.valueOf() : Infinity;
        return at - bt;
      })
      .map(x => x.t);
    // unique by link
    const seen = new Set();
    const uniq = [];
    for (const t of pool) {
      if (!seen.has(t.link)) { seen.add(t.link); uniq.push(t); }
      if (uniq.length >= 4) break;
    }
    return uniq;
  }, [registered, allMine]);

  // Latest Results: completed tests from scope=all (limit 3)
  const latestResults = React.useMemo(() => {
    const completed = (allMine || []).filter(t => computeWindow(t).isCompleted);
    return completed
      .sort((a, b) => {
        const ae = computeWindow(a).end?.valueOf() || 0;
        const be = computeWindow(b).end?.valueOf() || 0;
        return be - ae;
      })
      .slice(0, 3);
  }, [allMine]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero / Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 text-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Welcome back 👋</h1>
            <p className="text-white/90">Here are your next tests and recent results.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/tests")}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100"
            >
              Explore Tests
            </button>
            <button
              onClick={() => navigate("/create-test")}
              className="px-4 py-2 rounded-xl border border-white/40 bg-white/10 hover:bg-white/20"
            >
              Create Test
            </button>
          </div>
        </div>
      </div>

      {/* Essentials grid */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your next tests</h2>
          <button onClick={() => navigate("/tests?tab=registered")} className="text-sm text-blue-600 hover:underline">
            View all →
          </button>
        </div>
        {loading ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : essentials.length === 0 ? (
          <div className="mt-3 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 text-slate-600 dark:text-slate-400">
            No upcoming registrations. Explore open tests to get started.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {essentials.map((t) => (
              <TestCard key={t.link} test={t} registered />
            ))}
          </div>
        )}
      </div>

      {/* Latest results */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest results</h2>
          <button onClick={() => navigate("/tests?tab=past")} className="text-sm text-blue-600 hover:underline">
            View all →
          </button>
        </div>
        {loading ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : latestResults.length === 0 ? (
          <div className="mt-3 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6 text-slate-600 dark:text-slate-400">
            No completed tests yet.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {latestResults.map((t) => (
              <div key={t.link} className="rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-5">
                <div className="text-sm text-slate-500">Completed</div>
                <button
                  onClick={() => navigate(`/test/${t.link}`, { state: { prefetch: t } })}
                  className="mt-1 text-left font-semibold hover:underline"
                >
                  {t.title || "Untitled Test"}
                </button>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  {(() => {
                    const w = computeWindow(t);
                    return w.end ? `Ended ${w.end.format("DD MMM, HH:mm")}` : "—";
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile quick section (lightweight) */}
      <div className="mt-8 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Profile</div>
            <div className="text-slate-600 dark:text-slate-400 text-sm">
              Update your details and track activity.
            </div>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Open profile
          </button>
        </div>
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
