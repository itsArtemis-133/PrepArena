// client/src/pages/TestRunner.jsx
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
  };

  return (
    <div className="flex h-screen pt-16">
      {/* Left: PDF Viewer */}
      <div className="w-3/5 border-r">
        <PdfViewer fileUrl={
  pdfUrl.startsWith('/uploads/') ? pdfUrl : `/uploads/${pdfUrl}`
} />
      </div>

      {/* Right: OMR Sheet */}
      <div className="w-2/5 p-6 flex flex-col">
        {/* Timer */}
        <Timer
          scheduledDate={scheduledDate}
          duration={duration}
          onTimeUp={handleSubmit}
        />

        {/* Option grid */}
        <OptionGrid
          questionCount={questionCount}
          answers={answers}
          onChange={(qIdx, opt) =>
            setAnswers(prev => ({ ...prev, [qIdx]: opt }))
          }
        />

        {/* Submit button fixed at bottom */}
        <button
          onClick={handleSubmit}
          className="mt-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Submit Test
        </button>
      </div>
    </div>
  );
}
