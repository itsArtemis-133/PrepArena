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
  const [submitState, setSubmitState] = useState("idle");
  const [regChecked, setRegChecked] = useState(false);

  // ---- viewport sizing (no hardcoding) ----
  const runnerRef = useRef(null);
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

  // Lock body scroll while runner is mounted
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // ---- data fetching ----
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await axios.get(`/test/public/${link}`);
        if (cancel) return;
        const t = res.data?.test;
        if (!t) { navigate("/not-found"); return; }

        // completed tests cannot be entered
        if (t.window?.isCompleted) {
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
      <div className="app-surface flex items-center justify-center" style={{ height: `calc(100vh - ${headerH}px)` }}>
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

  const handleSubmit = async () => {
    if (!isTestStarted || disableGrid || submitState !== "idle") return;
    setSubmitState("submitting");
    try {
      await axios.post(`/test/${testId}/submit`, { answers });
      setSubmitState("done");
      alert("Test submitted! Your answers have been saved.");
    } catch {
      alert("Failed to submit, please try again.");
      setSubmitState("idle");
    }
  };

  const runnerStyle = { height: `calc(100vh - ${headerH}px)` };

  return (
    <div ref={runnerRef} className="flex min-h-0 overflow-hidden app-surface" style={runnerStyle}>
      {/* Left: PDF Viewer */}
      <div className="w-3/5 border-r flex flex-col min-h-0 overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="flex-1 min-h-0 overflow-hidden">
          <PdfViewer fileUrl={getPdfPath()} />
        </div>
      </div>

      {/* Right: OMR Sheet (only this pane scrolls) */}
      <div className="w-2/5 flex flex-col min-h-0 overflow-hidden">
        {/* Timer (sticky) */}
        <div className="sticky top-0 z-10 card-surface pb-2 pt-6 backdrop-blur-md border-b" style={{ borderColor: "var(--border)" }}>
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
        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
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
        <div className="sticky bottom-0 z-10 card-surface px-6 py-4 border-t backdrop-blur" style={{ borderColor: "var(--border)" }}>
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
    </div>
  );
}
