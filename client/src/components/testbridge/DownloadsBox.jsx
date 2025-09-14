export default function DownloadsBox({
  isOver,
  hasAnswersPdf,
  onDownloadQuestion,
  onDownloadAnswers,
}) {
  if (!isOver) return null;
  return (
    <div className="mt-4 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow p-4">
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Downloads
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
        Download the original PDFs for review.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onDownloadQuestion}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Download Question Paper (PDF)
        </button>

        {hasAnswersPdf && (
          <button
            type="button"
            onClick={onDownloadAnswers}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Download Official Answers (PDF)
          </button>
        )}
      </div>
    </div>
  );
}
