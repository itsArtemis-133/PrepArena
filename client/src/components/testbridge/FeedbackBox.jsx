import React from "react";
import axios from "../../api/axiosConfig";

export default function FeedbackBox({ testId }) {
  const [me, setMe] = React.useState({ loading: true, my: null });
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await axios.get(`/test/${testId}/feedback`);
        if (cancel) return;
        const my = res.data?.my || null;
        setMe({ loading: false, my });
        if (my) {
          setRating(Number(my.rating || 0));
          setComment(my.comment || "");
        }
      } catch {
        if (!cancel) setMe({ loading: false, my: null });
      }
    })();
    return () => { cancel = true; };
  }, [testId]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await axios.post(`/test/${testId}/feedback`, { rating, comment });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 401) alert("Please log in to submit feedback.");
      else if (code === 400) alert("Feedback opens only after the test is completed.");
      else if (code === 403) alert("Only participants can leave feedback.");
      else alert("Failed to save feedback. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const clearRating = async () => {
    setRating(0);
    try {
      await axios.delete(`/test/${testId}/feedback`);
    } catch {
      try {
        await axios.post(`/test/${testId}/feedback`, { rating: null, comment });
      } catch (err) {
        const code = err?.response?.status;
        if (code === 401) alert("Please log in to clear feedback.");
        else if (code === 403) alert("Only participants can clear feedback.");
        else alert("Failed to clear feedback. Try again.");
      }
    }
  };

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Rate this test</div>
        {rating > 0 && (
          <button
            type="button"
            onClick={clearRating}
            className="text-xs px-2 py-1 rounded border hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Clear
          </button>
        )}
      </div>

      {me.loading ? (
        <div className="h-10 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = rating >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating((prev) => (prev === n ? 0 : n))}
                  aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                  aria-pressed={active}
                  className={`w-9 h-9 rounded-full border text-lg leading-9 text-center ${
                    active ? "bg-amber-200 border-amber-400" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {active ? "★" : "☆"}
                </button>
              );
            })}
            <span className="text-xs text-slate-500 ml-1">(click again to clear)</span>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional feedback for the creator…"
            rows={3}
            className="w-full text-sm p-2 rounded border bg-transparent"
          />

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!rating || busy}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : saved ? "Saved ✓" : "Submit feedback"}
            </button>

            {rating === 0 && (
              <span className="text-xs text-slate-500">Select at least 1 star to submit</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
