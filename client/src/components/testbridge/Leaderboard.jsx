import dayjs from "dayjs";

export default function Leaderboard({ lb, setLb }) {
  const baseRank = (lb.page - 1) * lb.limit;

  if (lb.loading) {
    return <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />;
  }
  if (lb.rows.length === 0) {
    return <div className="text-slate-600 dark:text-slate-400">No submissions yet.</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600 dark:text-slate-400">
              <th className="py-2 pr-4">Rank</th>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Score</th>
              <th className="py-2">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {lb.rows.map((r, i) => (
              <tr key={r._id} className="border-t border-slate-200 dark:border-gray-800">
                <td className="py-2 pr-4">{baseRank + i + 1}</td>
                <td className="py-2 pr-4">{r.user?.name || "—"}</td>
                <td className="py-2 pr-4">
                  {r.score} / {r.total}
                </td>
                <td className="py-2">{r.submittedAt ? dayjs(r.submittedAt).format("DD MMM, HH:mm") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lb.total > lb.limit && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-slate-600 dark:text-slate-400">
            Showing {baseRank + 1}–{Math.min(baseRank + lb.rows.length, lb.total)} of {lb.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
              disabled={lb.page <= 1}
              onClick={() => setLb((p) => ({ ...p, page: p.page - 1 }))}
            >
              Prev
            </button>
            <button
              className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
              disabled={lb.page * lb.limit >= lb.total}
              onClick={() => setLb((p) => ({ ...p, page: p.page + 1 }))}
            >
              Next
            </button>
            <select
              className="ml-2 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent"
              value={lb.limit}
              onChange={(e) => setLb((p) => ({ ...p, page: 1, limit: Number(e.target.value) }))}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
}
