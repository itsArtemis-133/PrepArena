import dayjs from "dayjs";
import Breakdown from "./Breakdown";
import FeedbackBox from "./FeedbackBox";
import downloadMyAnswersCsv from "../../utils/downloadMyAnswersCsv";

export default function MyResultCard({ myResult, testId }) {
  return (
    <div className="mt-6 rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Your Result
      </div>

      {myResult.loading ? (
        <div className="h-12 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
      ) : !myResult.available ? (
        <div className="text-slate-600 dark:text-slate-400 text-sm">
          No submission found for your account.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <div className="text-[11px] text-slate-500">Score</div>
              <div className="text-base font-semibold">
                {myResult.score} / {myResult.total}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[11px] text-slate-500">Attempted</div>
              <div className="text-base font-semibold">{myResult.attempted}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[11px] text-slate-500">Submitted</div>
              <div className="text-base font-semibold">
                {myResult.submittedAt
                  ? dayjs(myResult.submittedAt).format("DD MMM, HH:mm")
                  : "—"}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-[11px] text-slate-500">Accuracy</div>
              <div className="text-base font-semibold">
                {myResult.total
                  ? Math.round((myResult.score / myResult.total) * 100)
                  : 0}
                %
              </div>
            </div>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => downloadMyAnswersCsv(myResult)}
              className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Download my answers (CSV)
            </button>
          </div>

          <Breakdown details={myResult.details || []} />
        </>
      )}

      <div className="mt-6">
        <FeedbackBox testId={testId} />
      </div>
    </div>
  );
}
