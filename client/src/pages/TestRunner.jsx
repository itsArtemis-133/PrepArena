import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import OptionGrid from '../components/OptionGrid';
import Timer from '../components/Timer';
import PdfViewer from '../components/PdfViewer';

export default function TestRunner() {
  const { link } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({}); // { 0: 'A', 1: 'C', … }

  // Test status state for timer logic
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [disableGrid, setDisableGrid] = useState(true);

  useEffect(() => {
    axios
      .get(`/api/test/public/${link}`)
      .then(res => setTest(res.data.test))
      .catch(() => navigate('/not-found'));
  }, [link, navigate]);

  if (!test) return <div>Loading…</div>;

  const { pdfUrl, duration, questionCount, scheduledDate } = test;

  const handleSubmit = () => {
    // TODO: POST answers to your /api/test/:id/submit endpoint
    console.log('Submitting answers:', answers);
    // Add submit logic here!
  };

  // Fix for pdfUrl: Allow both relative and already-prefixed URLs.
  const getPdfPath = () => {
    if (!pdfUrl) return '';
    if (pdfUrl.startsWith('/uploads/')) return pdfUrl;
    if (pdfUrl.startsWith('http')) return pdfUrl;
    return `/uploads/${pdfUrl}`;
  };

  return (
    <div className="flex h-screen pt-16">
      {/* Left: PDF Viewer */}
      <div className="w-3/5 border-r bg-gray-50 dark:bg-gray-900 flex flex-col">
        <PdfViewer fileUrl={getPdfPath()} />
      </div>

      {/* Right: OMR Sheet */}
      <div className="
  w-2/5 p-0 flex flex-col h-full
  bg-gradient-to-b from-blue-100/80 via-white to-blue-50
  dark:from-slate-900 dark:via-slate-800 dark:to-slate-900
  border-l border-blue-100 dark:border-slate-800
  shadow-xl
  transition-colors duration-300
">
        {/* Timer */}
        <div className="
          sticky top-0 z-10
          bg-blue-50/80 dark:bg-slate-900/80
          pb-2 pt-6
          backdrop-blur-md
          border-b border-blue-100 dark:border-slate-800
        ">
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
        <div className="
          sticky bottom-0 z-10 px-6 py-4
          bg-blue-50/90 dark:bg-slate-900/90
          border-t border-blue-100 dark:border-slate-800
          backdrop-blur
        ">
          <button
            onClick={handleSubmit}
            disabled={disableGrid}
            className={`w-full py-3 text-lg rounded-xl font-semibold shadow-lg transition-all
              bg-gradient-to-r from-indigo-500 to-blue-400 hover:from-indigo-600 hover:to-blue-500 text-white
              ${disableGrid ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}
            `}
          >
            Submit Test
          </button>
        </div>
      </div>
    </div>
  );
}
