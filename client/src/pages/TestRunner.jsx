// client/src/pages/TestRunner.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
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

  // PDF (secured) state
  const [pdfBlobUrl, setPdfBlobUrl] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

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

  // Prevent auto-scroll to submit button
  const isSubmittingRef = useRef(false);

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

  // Lock body scroll while runner is mounted
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

  // Gate access: must be creator OR registered, AND not already submitted
  useEffect(() => {
    if (!test) return;
    let cancel = false;
    (async () => {
      try {
        const r = await axios.get(`/test/registered/${link}`);
        if (cancel) return;
        const isReg = Boolean(r.data?.registered);
        const isCreator = Boolean(r.data?.isCreator) || Boolean(test.isCreator);
        const hasSubmitted = Boolean(r.data?.hasSubmitted);
        
        // If user has already submitted and is not the creator, redirect to bridge
        if (hasSubmitted && !isCreator) {
          showToast("You have already submitted this test.", "info", 3000);
          navigate(`/test/${link}`);
          return;
        }
        
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
  }, [link, navigate, test, showToast]);

  // derive testId once we have test
  const testId = useMemo(() => (test?._id || test?.id || ""), [test]);

  // Load answers from localStorage when test starts
  useEffect(() => {
    if (!testId) return;
    const storageKey = `test_answers_${testId}`;
    try {
      const savedAnswers = localStorage.getItem(storageKey);
      if (savedAnswers) {
        const parsed = JSON.parse(savedAnswers);
        setAnswers(parsed);
      }
    } catch (error) {
      console.warn("Failed to load saved answers:", error);
    }
  }, [testId]);

  // Save answers to localStorage whenever they change
  useEffect(() => {
    if (!testId || !isTestStarted) return;
    const storageKey = `test_answers_${testId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch (error) {
      console.warn("Failed to save answers:", error);
    }
  }, [answers, testId, isTestStarted]);

  // Clear saved answers after successful submission
  const clearSavedAnswers = () => {
    if (!testId) return;
    const storageKey = `test_answers_${testId}`;
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn("Failed to clear saved answers:", error);
    }
  };

  // Securely fetch the PDF (auth-protected route) and create a blob URL
  useEffect(() => {
    if (!regChecked || !testId) return;
    let isUnmounted = false;
    let objectUrl = "";

    async function fetchPdf() {
      setPdfLoading(true);
      setPdfError("");
      try {
        const res = await axios.get(`/test/${testId}/pdf`, { responseType: "blob" });
        objectUrl = URL.createObjectURL(res.data);
        if (!isUnmounted) setPdfBlobUrl(objectUrl);
      } catch  {
        if (!isUnmounted) {
          setPdfError("Failed to load question paper. Please refresh or try again.");
          setPdfBlobUrl("");
        }
      } finally {
        if (!isUnmounted) setPdfLoading(false);
      }
    }

    fetchPdf();
    return () => {
      isUnmounted = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [regChecked, testId]);

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

  const { duration, questionCount, scheduledDate, _id: tId } = test;

  const showToast = useCallback((text, tone = "info", ms = 2200) => {
    setToast({ show: true, text, tone });
    window.clearTimeout((showToast)._t);
    (showToast)._t = window.setTimeout(() => setToast({ show: false, text: "", tone }), ms);
  }, []);

  const handleSubmit = async () => {
    if (!isTestStarted || disableGrid || submitState !== "idle") return;
    isSubmittingRef.current = true; // Prevent auto-scroll during submission
    setSubmitState("submitting");
    setEndOverlay({ show: true, status: "submitting" }); // smooth overlay, no scroll jump
    try {
      await axios.post(`/test/${tId}/submit`, { answers });
      setSubmitState("done");
      setEndOverlay({ show: true, status: "done" });
      clearSavedAnswers(); // Clear localStorage after successful submission
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
      setTimeout(() => setEndOverlay({ show: false, status: "submitting" }), 1200);
    } finally {
      isSubmittingRef.current = false;
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
          {/* Show loader / error states, else render PdfViewer with blob URL */}
          {pdfLoading && (
            <div className="p-4 text-sm text-gray-600">Loading question paper…</div>
          )}
          {pdfError && (
            <div className="p-4 text-sm text-red-600">{pdfError}</div>
          )}
          {!pdfLoading && !pdfError && pdfBlobUrl && (
            <PdfViewer fileUrl={pdfBlobUrl} />
          )}
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
            onTimeUp={handleSubmit}
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
          style={{ 
            overscrollBehavior: "contain",
            scrollBehavior: "auto" // Prevent smooth scrolling that might cause unwanted movement
          }}
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
            onFocus={(e) => {
              // Prevent automatic scroll to submit button
              if (isSubmittingRef.current) {
                e.target.blur();
              }
            }}
          >
            {submitState === "idle" && "Submit Test"}
            {submitState === "submitting" && "Submitting..."}
            {submitState === "done" && "Submitted!"}
          </button>
        </div>
      </div>

      {/* End overlay */}
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
