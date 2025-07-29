// client/src/pages/TestRunner.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import PdfViewer  from '../components/PdfViewer';
import Timer      from '../components/Timer';
import OptionGrid from '../components/OptionGrid';

export default function TestRunner() {
  const { link } = useParams();
  const navigate = useNavigate();
  const [test, setTest]       = useState(null);
  const [answers, setAnswers] = useState({});

  // 1️⃣ Fetch test metadata
  useEffect(() => {
    api.get(`/test/public/${link}`)
       .then(res => setTest(res.data.test))
       .catch(() => navigate('/not-found'));
  }, [link, navigate]);

  // 2️⃣ Submit answers
  const handleSubmit = () => {
    api.post(`/test/${test._id}/submit`, { answers })
       .then(() => navigate(`/results/${test._id}`))
       .catch(err => console.error('Submit error:', err));
  };

  if (!test) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">Loading test…</p>
      </div>
    );
  }

  const { pdfUrl, duration, questionCount } = test;

  return (
    <div className="flex h-screen">
      {/* PDF */}
      <div className="w-3/5 border-r">
        <PdfViewer fileUrl={pdfUrl} />
      </div>

      {/* Timer + OMR */}
      <div className="w-2/5 p-6 flex flex-col">
        <Timer
          duration={duration}       // ← no scheduledDate
          onTimeUp={handleSubmit}
        />

        <OptionGrid
          questionCount={questionCount}
          answers={answers}
          onChange={(qIdx, opt) =>
            setAnswers(prev => ({ ...prev, [qIdx]: opt }))
          }
        />

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
