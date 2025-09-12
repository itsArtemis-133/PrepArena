// client/src/pages/TestRunner.jsx
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
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
  const [submitState, setSubmitState] = useState("idle");
  const [regChecked, setRegChecked] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // PDF
  const [pdfBlobUrl, setPdfBlobUrl] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  // fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // toast + overlay
  const [toast, setToast] = useState({ show: false, text: "", tone: "info" });
  const [endOverlay, setEndOverlay] = useState({
    show: false,
    status: "submitting",
  });

  const runnerRef = useRef(null);
  const scrollPaneRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);

  /** ---- header height ---- */
  const measureHeader = () => {
    const headerEl = document.querySelector("header");
    setHeaderH(headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 0);
  };
  useLayoutEffect(() => measureHeader(), []);
  useEffect(() => {
    measureHeader();
    const ro = new ResizeObserver(measureHeader);
    const headerEl = document.querySelector("header");
    if (headerEl) ro.observe(headerEl);
    window.addEventListener("resize", measureHeader);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureHeader);
    };
  }, []);

  /** ---- disable body scroll ---- */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = body.style.overflow = "hidden";
    html.style.height = body.style.height = "100%";
    return () => {
      html.style.overflow = body.style.overflow = "";
      html.style.height = body.style.height = "";
    };
  }, []);

  /** ---- fullscreen ---- */
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        )
      );
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);
  const toggleFullscreen = () => {
    const el = runnerRef.current;
    if (!el) return;
    if (isFullscreen) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  /** ---- storage helpers ---- */
  const getStorageKey = useCallback((testId) => `test_answers_${testId}`, []);
  const getSubmissionKey = useCallback((testId) => `test_submitted_${testId}`, []);

  const saveAnswersToStorage = useCallback(
  (testId, answersObj) => {
    try {
      localStorage.setItem(getStorageKey(testId), JSON.stringify(answersObj));
    } catch (err) {
      console.warn("Failed to save answers:", err);
    }
  },
  [getStorageKey]
);
  const loadAnswersFromStorage = useCallback(
    (testId) => {
      try {
        const saved = localStorage.getItem(getStorageKey(testId));
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    },
    [getStorageKey]
  );
  const markAsSubmitted = useCallback(
    (testId) => {
      try {
        localStorage.setItem(getSubmissionKey(testId), "true");
        setIsSubmitted(true);
      } catch (err) {
        console.warn("Failed to mark as submitted:", err);
      }
    },
    [getSubmissionKey]
  );
  const checkIfSubmitted = useCallback(
    (testId) => {
      try {
        return localStorage.getItem(getSubmissionKey(testId)) === "true";
      } catch {
        return false;
      }
    },
    [getSubmissionKey]
  );
  const clearTestData = useCallback(
    (testId) => {
      try {
        localStorage.removeItem(getStorageKey(testId));
        localStorage.removeItem(getSubmissionKey(testId));
      } catch (err) {
        console.warn("Failed to clear test data:", err);
      }
    },
    [getStorageKey, getSubmissionKey]
  );

  /** ---- fetch test ---- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await axios.get(`/test/public/${link}`);
        if (cancel) return;
        const t = res.data?.test;
        if (!t) {
          navigate("/not-found");
          return;
        }
        setTest(t);
      } catch {
        if (!cancel) navigate("/not-found");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [link, navigate]);

  /** ---- check registration ---- */
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
    return () => {
      cancel = true;
    };
  }, [link, navigate, test]);

  const testId = useMemo(() => test?._id || test?.id || "", [test]);

  /** ---- check backend if already submitted ---- */
  useEffect(() => {
    if (!testId) return;
    (async () => {
      try {
        const res = await axios.get(`/test/${testId}/results/me`);
        if (res.data?.available) {
          setIsSubmitted(true);
          setDisableGrid(true);
          setSubmitState("done");
          setEndOverlay({ show: true, status: "done" });
          const restored = {};
          res.data.details.forEach((d) => {
            if (d.marked) restored[d.q] = d.marked;
          });
          setAnswers(restored);
        }
      } catch (err) {
        console.warn("Could not fetch my score:", err);
      }
    })();
  }, [testId]);

  /** ---- restore local answers ---- */
  useEffect(() => {
    if (!testId) return;
    if (checkIfSubmitted(testId)) {
      setIsSubmitted(true);
      setDisableGrid(true);
      setSubmitState("done");
      setEndOverlay({ show: true, status: "done" });
      return;
    }
    const saved = loadAnswersFromStorage(testId);
    if (Object.keys(saved).length > 0) setAnswers(saved);
  }, [testId, checkIfSubmitted, loadAnswersFromStorage]);

  /** ---- auto-save ---- */
  useEffect(() => {
    if (!testId || isSubmitted) return;
    const timeout = setTimeout(() => {
      saveAnswersToStorage(testId, answers);
    }, 400);
    return () => clearTimeout(timeout);
  }, [answers, testId, isSubmitted, saveAnswersToStorage]);

  /** ---- fetch PDF ---- */
  useEffect(() => {
    if (!regChecked || !testId) return;
    let isUnmounted = false;
    let objectUrl = "";
    async function fetchPdf() {
      setPdfLoading(true);
      try {
        const res = await axios.get(`/test/${testId}/pdf`, {
          responseType: "blob",
        });
        objectUrl = URL.createObjectURL(res.data);
        if (!isUnmounted) setPdfBlobUrl(objectUrl);
      } catch {
        if (!isUnmounted) {
          setPdfError("Failed to load question paper.");
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

  /** ---- submit ---- */
  const handleSubmit = async () => {
    if (isSubmitted) {
      showToast("You have already submitted this test.", "error");
      return; // 🚨 no duplicate submissions
    }
    if (!isTestStarted || disableGrid || submitState !== "idle") return;
    setSubmitState("submitting");
    setEndOverlay({ show: true, status: "submitting" });
    try {
      await axios.post(`/test/${testId}/submit`, { answers });
      setSubmitState("done");
      setEndOverlay({ show: true, status: "done" });
      showToast("Test submitted successfully.", "success");
      markAsSubmitted(testId);
      clearTestData(testId);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 409) {
        markAsSubmitted(testId);
        setSubmitState("done");
        setEndOverlay({ show: true, status: "done" });
        showToast("Already submitted.", "error");
      } else if (code === 403) {
        showToast("Submission closed: test not live.", "error");
      } else {
        setEndOverlay({ show: true, status: "error" });
        showToast("Failed to submit.", "error");
      }
      setSubmitState("idle");
    }
  };

  /** ---- toast ---- */
  const showToast = (text, tone = "info", ms = 2200) => {
    setToast({ show: true, text, tone });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(
      () => setToast({ show: false, text: "", tone }),
      ms
    );
  };

  /** ---- layout ---- */
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

  const { duration, questionCount, scheduledDate } = test;

  return (
    <div
      ref={runnerRef}
      className="flex min-h-0 overflow-hidden app-surface relative"
      style={{ height: `calc(100vh - ${headerH}px)`, overscrollBehavior: "contain" }}
    >
      {/* fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-20 text-xs px-2 py-1 rounded-lg border shadow-sm bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800"
      >
        {isFullscreen ? "Exit Full Screen" : "Full Screen"}
      </button>

      {/* left: PDF */}
      <div className="w-3/5 border-r flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          {pdfLoading && <div className="p-4 text-sm">Loading…</div>}
          {pdfError && <div className="p-4 text-sm text-red-600">{pdfError}</div>}
          {!pdfLoading && !pdfError && pdfBlobUrl && <PdfViewer fileUrl={pdfBlobUrl} />}
        </div>
      </div>

      {/* right: OMR */}
      <div className="w-2/5 flex flex-col min-h-0 overflow-hidden">
        <div className="sticky top-0 z-10 card-surface pb-2 pt-6 border-b">
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
        <div
          ref={scrollPaneRef}
          className="flex-1 overflow-y-auto px-4 py-2 min-h-0"
          style={{ overscrollBehavior: "contain" }}
        >
          <OptionGrid
            questionCount={questionCount}
            answers={answers}
            disabled={disableGrid || isSubmitted}
            onChange={(qIdx, opt) => {
              if (isSubmitted) return;
              setAnswers((prev) => {
                const next = { ...prev };
                if (!opt) delete next[qIdx];
                else next[qIdx] = opt;
                return next;
              });
            }}
          />
        </div>
        <div className="sticky bottom-0 z-10 card-surface px-6 py-4 border-t">
          <button
            onClick={handleSubmit}
            disabled={disableGrid || submitState !== "idle" || isSubmitted}
            className={`w-full py-3 text-lg rounded-xl font-semibold shadow-lg transition-all
              ${
                isSubmitted
                  ? "bg-green-600 text-white cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600"
              }
              ${
                disableGrid || submitState !== "idle" || isSubmitted
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-[1.02] active:scale-95"
              }`}
          >
            {isSubmitted
              ? "Already Submitted"
              : submitState === "idle"
              ? "Submit Test"
              : submitState === "submitting"
              ? "Submitting..."
              : "Submitted!"}
          </button>
        </div>
      </div>

      {/* overlay */}
      {endOverlay.show && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border shadow-xl p-6 max-w-sm w-[92%] text-center">
            {endOverlay.status === "submitting" && <div>Submitting…</div>}
            {endOverlay.status === "done" && (
              <>
                <div className="text-lg font-semibold mb-1 text-emerald-600">
                  Test Submitted!
                </div>
                <div className="text-slate-600 text-sm mb-4">
                  Your answers have been saved. You cannot re-enter this test.  
                  Please wait until the test ends.
                </div>
                <button
                  onClick={() => navigate(`/test/${link}`)}
                  className="px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700"
                >
                  Back to TestBridge
                </button>
              </>
            )}
            {endOverlay.status === "error" && (
              <div className="text-red-600">Submission Failed. Try again.</div>
            )}
          </div>
        </div>
      )}

      {/* toast */}
      {toast.show && (
        <div
          className={`fixed right-4 top-4 z-40 px-4 py-2 rounded-xl shadow-lg text-sm
          ${
            toast.tone === "success"
              ? "bg-emerald-600 text-white"
              : toast.tone === "error"
              ? "bg-red-600 text-white"
              : "bg-slate-900 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
