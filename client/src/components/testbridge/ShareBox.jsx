export default function ShareBox({ show, shareURL, copyOk, onCopy }) {
  if (!show) return null;
  return (
    <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow p-4">
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Share
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
        Anyone with this link can view the Test page.
      </div>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={shareURL}
          className="flex-1 text-xs px-3 py-2 rounded-lg border bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700"
        />
        <button
          onClick={onCopy}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          {copyOk ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}
