export default function ActionButton({
  regLoading,
  registered,
  isUpcoming,
  isLive,
  isOver,
  start,
  navigate,
  test,
  registerAndMaybeEnter,
  unregisterNow,
}) {
  if (regLoading) {
    return (
      <button className="w-full py-3 rounded-xl font-semibold bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-slate-300 shadow cursor-wait">
        Checking…
      </button>
    );
  }

  // Not registered
  if (!registered && isUpcoming) {
    return (
      <button
        onClick={registerAndMaybeEnter}
        className="w-full py-3 rounded-xl font-semibold bg-blue-600 text-white shadow hover:bg-blue-700 transition"
      >
        Register for Test
      </button>
    );
  }
  if (!registered && isLive) {
    return (
      <button
        onClick={registerAndMaybeEnter}
        className="w-full py-3 rounded-xl font-semibold bg-emerald-600 text-white shadow hover:bg-emerald-700 transition"
      >
        Register & Enter Now
      </button>
    );
  }
  if (!registered && isOver) {
    return (
      <button
        disabled
        className="w-full py-3 rounded-xl font-semibold bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-slate-300 shadow cursor-not-allowed"
      >
        Test Completed
      </button>
    );
  }

  // Registered
  if (registered && isLive) {
    return (
      <button
        onClick={() => navigate(`/tests/${test.link}/take`)}
        className="w-full py-3 rounded-xl font-semibold bg-emerald-600 text-white shadow hover:bg-emerald-700 transition"
      >
        Enter Test
      </button>
    );
  }

  // Registered and NOT live and NOT over → show status + Unregister
  if (registered && !isLive && !isOver) {
    return (
      <div className="flex flex-col gap-2">
        <div className="w-full py-3 rounded-xl bg-green-100 dark:bg-emerald-900/40 text-green-800 dark:text-emerald-300 text-center font-semibold shadow">
          Registered • {start ? `Starts ${start.format("DD MMM, HH:mm")}` : "Start TBA"}
        </div>
        <button
          type="button"
          onClick={unregisterNow}
          className="w-full py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
        >
          Unregister
        </button>
      </div>
    );
  }

  // Registered and over → status only
  if (registered && isOver) {
    return (
      <div className="w-full py-3 rounded-xl bg-green-100 dark:bg-emerald-900/40 text-green-800 dark:text-emerald-300 text-center font-semibold shadow">
        Test Completed
      </div>
    );
  }

  return null;
}
