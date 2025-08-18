// client/src/pages/TestRunner.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../api/axiosConfig";
import OptionGrid from "../components/OptionGrid";
import Timer from "../components/Timer";
import PdfViewer from "../components/PdfViewer";

export default function TestRunner() {
  const { link } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [disableGrid, setDisableGrid] = useState(true);
  const [submitState, setSubmitState] = useState("idle"); // idle | submitting | done
  const [regChecked, setRegChecked] = useState(false);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Non-blocking toast
  const [toast, setToast] = useState({ show: false, text: "", tone: "info" }); // tone: info|success|error

  // End-of-test overlay to avoid layout jumps
  const [endOverlay, setEndOverlay] = useState({ show: false, status: "submitting" }); // submitting | done | error

  // ---- viewport sizing (no hardcoding) ----
  const runnerRef = useRef(null);
  const scrollPaneRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);

  const measureHeader = () => {
    const headerEl = document.querySelector("header");
    const h = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 0;
    setHeaderH(h);
  };

  useLayoutEffect(() => {
    measureHeader();
  }, []);

  useEffect(() => {
    measureHeader();
    const ro = new ResizeObserver(measureHeader);
    const headerEl = document.querySelector("header");
    if (headerEl) ro.observe(headerEl);
    const onResize = () => measureHeader();
    window.addEventListener("resize", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Lock body scroll while runner is mounted (apply defensively more than once)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const apply = () => {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      html.style.height = "100%";
      body.style.height = "100%";
    };
    const restore = () => {
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.height = "";
      body.style.height = "";
    };
    apply();

    const onVisibility = () => apply();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      restore();
    };
  }, []);

  // Fullscreen helpers
  useEffect(() => {
    const onFsChange = () => {
      const fsEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(!!fsEl);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  const enterFullscreen = async () => {
    const el = runnerRef.current;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    } catch {
      // no-op
    }
  };
  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    } catch {
      // no-op
    }
  };
  const toggleFullscreen = () => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  };

  // ---- data fetching ----
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await axios.get(`/test/public/${link}`);
        if (cancel) return;
        const t = res.data?.test;
        if (!t) { navigate("/not-found"); return; }

        // hard gate — must be live (not upcoming / not completed)
        const w = t.window || {};
        if (w.isCompleted || !w.isLive) {
          navigate(`/test/${link}`);
          return;
        }
        setTest(t);
      } catch {
        if (!cancel) navigate("/not-found");
      }
    })();
    return () => { cancel = true; };
  }, [link, navigate]);

  // Gate access: must be creator OR registered
  useEffect(() => {
    if (!test) return;
    let cancel = false;
    (async () => {
      try {
        const r = await axios.get(`/test/registered/${link}`);
        if (cancel) return;
        const isReg = Boolean(r.data?.registered);
        const isCreator = Boolean(r.data?.isCreator) || Boolean(test.isCreator);
        if (!isReg && !isCreator) {
          navigate(`/test/${link}`);
          return;
        }
      } catch {
        if (!test.isCreator) navigate(`/test/${link}`);
      } finally {
        if (!cancel) setRegChecked(true);
      }
    })();
    return () => { cancel = true; };
  }, [link, navigate, test]);

  if (!test || !regChecked) {
    return (
      <div
        className="app-surface flex items-center justify-center"
        style={{ height: `calc(100vh - ${headerH}px)` }}
      >
        <div className="card-surface w-64 h-12 animate-pulse" />
      </div>
    );
  }

  const { pdfUrl, duration, questionCount, scheduledDate, _id: testId } = test;

  const getPdfPath = () => {
    if (!pdfUrl) return "";
    if (pdfUrl.startsWith("/uploads/")) return pdfUrl;
    if (pdfUrl.startsWith("http")) return pdfUrl;
    return `/uploads/${pdfUrl}`;
  };

  const showToast = (text, tone = "info", ms = 2200) => {
    setToast({ show: true, text, tone });
    window.clearTimeout((showToast)._t);
    (showToast)._t = window.setTimeout(() => setToast({ show: false, text: "", tone }), ms);
  };

  const handleSubmit = async () => {
    if (!isTestStarted || disableGrid || submitState !== "idle") return;
    setSubmitState("submitting");
    setEndOverlay({ show: true, status: "submitting" }); // smooth overlay, no scroll jump
    try {
      await axios.post(`/test/${testId}/submit`, { answers });
      setSubmitState("done");
      setEndOverlay({ show: true, status: "done" });
      showToast("Test submitted successfully.", "success");
      // Optionally navigate back to Bridge after a brief pause:
      // setTimeout(() => navigate(`/test/${link}`), 900);
    } catch (err) {
      const code = err?.response?.status;
      setEndOverlay({ show: true, status: "error" });
      if (code === 403) {
        showToast("Submission closed: test is not live.", "error", 2800);
      } else {
        showToast("Failed to submit. Please try again.", "error", 2800);
      }
      setSubmitState("idle");
      // Keep overlay visible briefly, then hide so user can retry
      setTimeout(() => setEndOverlay({ show: false, status: "submitting" }), 1200);
    }
  };

  // keep scroll contained within panes; never bubble to body
  const runnerStyle = { height: `calc(100vh - ${headerH}px)` };

  return (
    <div
      ref={runnerRef}
      className="flex min-h-0 overflow-hidden app-surface relative"
      style={{
        ...runnerStyle,
        // Make sure wheel/scroll never escapes into body:
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Fullscreen toggle (floating) */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-20 text-xs px-2 py-1 rounded-lg border shadow-sm bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800"
        title={isFullscreen ? "Exit Full Screen (Esc)" : "Enter Full Screen"}
      >
        {isFullscreen ? "Exit Full Screen" : "Full Screen"}
      </button>

      {/* Left: PDF Viewer */}
      <div
        className="w-3/5 border-r flex flex-col min-h-0 overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          <PdfViewer fileUrl={getPdfPath()} />
        </div>
      </div>

      {/* Right: OMR Sheet (only this pane scrolls) */}
      <div className="w-2/5 flex flex-col min-h-0 overflow-hidden">
        {/* Timer (sticky) */}
        <div
          className="sticky top-0 z-10 card-surface pb-2 pt-6 backdrop-blur-md border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <Timer
            scheduledDate={scheduledDate}
            duration={duration}
            onTimeUp={handleSubmit} // when time ends, show overlay + submit
            isTestStarted={isTestStarted}
            setIsTestStarted={setIsTestStarted}
            disableGrid={disableGrid}
            setDisableGrid={setDisableGrid}
          />
        </div>

        {/* Option grid (scrolls) */}
        <div
          ref={scrollPaneRef}
          className="flex-1 overflow-y-auto px-4 py-2 min-h-0"
          style={{ overscrollBehavior: "contain" }}
        >
          <OptionGrid
            questionCount={questionCount}
            answers={answers}
            disabled={disableGrid}
            onChange={(qIdx, opt) =>
              setAnswers((prev) => {
                const next = { ...prev };
                if (opt === undefined || opt === null || opt === "") {
                  delete next[qIdx]; // toggle off = clear
                } else {
                  next[qIdx] = opt;
                }
                return next;
              })
            }
          />
        </div>

        {/* Submit */}
        <div
          className="sticky bottom-0 z-10 card-surface px-6 py-4 border-t backdrop-blur"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={handleSubmit}
            disabled={disableGrid || submitState !== "idle"}
            className={`w-full py-3 text-lg rounded-xl font-semibold shadow-lg transition-all
              bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white
              ${disableGrid || submitState !== "idle" ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-95"}
            `}
          >
            {submitState === "idle" && "Submit Test"}
            {submitState === "submitting" && "Submitting..."}
            {submitState === "done" && "Submitted!"}
          </button>
        </div>
      </div>

      {/* End overlay (prevents layout jump & accidental scroll) */}
      {endOverlay.show && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border dark:border-gray-800 shadow-xl p-6 max-w-sm w-[92%] text-center">
            {endOverlay.status === "submitting" && (
              <>
                <div className="text-lg font-semibold mb-1">Submitting…</div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">Please wait while we save your answers.</div>
              </>
            )}
            {endOverlay.status === "done" && (
              <>
                <div className="text-lg font-semibold mb-1 text-emerald-600">Submitted!</div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">Your answers have been saved.</div>
                <div className="mt-4 flex gap-2 justify-center">
                  <button
                    onClick={() => navigate(`/test/${link}`)}
                    className="px-4 py-2 rounded-lg border bg-white hover:bg-slate-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    Back to Test
                  </button>
                  <button
                    onClick={() => setEndOverlay({ show: false, status: "submitting" })}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Stay here
                  </button>
                </div>
              </>
            )}
            {endOverlay.status === "error" && (
              <>
                <div className="text-lg font-semibold mb-1 text-red-600">Submission failed</div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">Please try again.</div>
                <div className="mt-4">
                  <button
                    onClick={() => setEndOverlay({ show: false, status: "submitting" })}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed right-4 top-4 z-40 px-4 py-2 rounded-xl shadow-lg text-sm
          ${toast.tone === "success" ? "bg-emerald-600 text-white"
            : toast.tone === "error" ? "bg-red-600 text-white"
            : "bg-slate-900 text-white"}`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
