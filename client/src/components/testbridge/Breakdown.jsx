import React from "react";
function Pill({ ok, children }) {
  return (
    <span
      className={`px-2 py-[2px] rounded-full text-xs font-semibold ${
        ok
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      }`}
    >
      {children}
    </span>
  );
}

export default function Breakdown({ details }) {
  const [expanded, setExpanded] = React.useState(details.length <= 50);
  const shown = expanded ? details : details.slice(0, 50);

  return (
    <div className="mt-4">
      <div className="text-sm font-semibold mb-2">Per-question breakdown</div>
      {details.length === 0 ? (
        <div className="text-slate-500 text-sm">No details available.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {shown.map((row) => (
              <div
                key={row.q}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 font-semibold">{row.q}.</div>
                  <div className="flex gap-3">
                    <span className="text-slate-600 dark:text-slate-400">
                      Marked:{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {row.marked || "—"}
                      </span>
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Correct:{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {row.correct || "—"}
                      </span>
                    </span>
                  </div>
                </div>
                <Pill ok={row.isCorrect}>{row.isCorrect ? "✓" : "✗"}</Pill>
              </div>
            ))}
          </div>

          {details.length > 50 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="px-3 py-1 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {expanded ? "Show less" : `Show all ${details.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
