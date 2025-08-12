import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';
import OptionGrid from '../components/OptionGrid';
import Timer from '../components/Timer';
import PdfViewer from '../components/PdfViewer';

export default function TestRunner() {
  const { link } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [disableGrid, setDisableGrid] = useState(true);
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | done
  const [regChecked, setRegChecked] = useState(false);    // finished access check

  // Fetch test details by link
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await axios.get(`/test/public/${link}`);
        if (!cancel) setTest(res.data.test);
      } catch {
        if (!cancel) navigate('/not-found');
      }
    })();
    return () => { cancel = true; };
  }, [link, navigate]);

  // Gate access: must be creator OR registered; otherwise bounce to Bridge
  useEffect(() => {
    if (!test) return; // wait for test to load
    let cancel = false;
    (async () => {
      try {
        const r = await axios.get(`/test/registered/${link}`);
        if (cancel) return;
        const isReg = Boolean(r.data?.registered);
        if (!isReg && !test.isCreator) {
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
    return <div className="text-center mt-12">Loading…</div>;
  }

  const { pdfUrl, duration, questionCount, scheduledDate, _id: testId } = test;

  // Robust path for both local and remote PDFs
  const getPdfPath = () => {
    if (!pdfUrl) return '';
    if (pdfUrl.startsWith('/uploads/')) return pdfUrl;
    if (pdfUrl.startsWith('http')) return pdfUrl;
    return `/uploads/${pdfUrl}`;
  };

  // Submit logic
  const handleSubmit = async () => {
    if (!isTestStarted || disableGrid || submitState !== 'idle') return;
    setSubmitState('submitting');
    try {
      await axios.post(`/test/${testId}/submit`, { answers });
      setSubmitState('done');
      alert('Test submitted! Your answers have been saved.');
      // navigate(`/results/${testId}`);
    } catch {
      alert('Failed to submit, please try again.');
      setSubmitState('idle');
    }
  };

  return (
    <div className="flex h-screen pt-16">
      {/* Left: PDF Viewer */}
      <div className="w-3/5 border-r bg-gray-50 dark:bg-gray-900 flex flex-col">
        <PdfViewer fileUrl={getPdfPath()} />
      </div>

      {/* Right: OMR Sheet */}
      <div
        className="
          w-2/5 p-0 flex flex-col h-full
          bg-gradient-to-b from-blue-100/80 via-white to-blue-50
          dark:from-slate-900 dark:via-slate-800 dark:to-slate-900
          border-l border-blue-100 dark:border-slate-800
          shadow-xl transition-colors duration-300
        "
      >
        {/* Timer */}
        <div
          className="
            sticky top-0 z-10
            bg-blue-50/80 dark:bg-slate-900/80
            pb-2 pt-6
            backdrop-blur-md
            border-b border-blue-100 dark:border-slate-800
          "
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

        {/* Option grid */}
        <div className="flex-1 overflow-y-auto px-4 py-1">
          <OptionGrid
            questionCount={questionCount}
            answers={answers}
            disabled={disableGrid}
            onChange={(qIdx, opt) =>
              setAnswers(prev => ({ ...prev, [qIdx]: opt }))
            }
          />
        </div>

        {/* Submit button fixed at bottom */}
        <div
          className="
            sticky bottom-0 z-10 px-6 py-4
            bg-blue-50/90 dark:bg-slate-900/90
            border-t border-blue-100 dark:border-slate-800
            backdrop-blur
          "
        >
          <button
            onClick={handleSubmit}
            disabled={disableGrid || submitState !== 'idle'}
            className={`w-full py-3 text-lg rounded-xl font-semibold shadow-lg transition-all
              bg-gradient-to-r from-indigo-500 to-blue-400 hover:from-indigo-600 hover:to-blue-500 text-white
              ${disableGrid || submitState !== 'idle'
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-[1.02] active:scale-95'}
            `}
          >
            {submitState === 'idle' && 'Submit Test'}
            {submitState === 'submitting' && 'Submitting...'}
            {submitState === 'done' && 'Submitted!'}
          </button>
        </div>
      </div>
    </div>
  );
}
