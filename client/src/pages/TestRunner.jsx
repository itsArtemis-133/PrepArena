// src/pages/TestRunner.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Document, Page, pdfjs } from 'react-pdf';


// Point to the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const TestRunner = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [pdfUrl, setPdfUrl] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [answers, setAnswers] = useState({});
  const [activeQuestion, setActiveQuestion] = useState(null);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await fetch(`/tests/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Cannot load test');
        const { pdfUrl, questionsCount } = await res.json();
        setPdfUrl(pdfUrl);
        setQuestionsCount(questionsCount);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTest();
  }, [id, token]);

  const onDocumentLoad = ({ numPages }) => setNumPages(numPages);
  const handleAnswer = (q, option) => setAnswers((prev) => ({ ...prev, [q]: option }));
  const zoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
      <div className="w-1/2 flex flex-col p-2">
        <div className="flex gap-2 mb-2">
          <button onClick={zoomOut} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">-</button>
          <button onClick={zoomIn} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">+</button>
        </div>
        <div className="flex-1 overflow-auto border rounded">
          {pdfUrl && (
            <Document file={pdfUrl} onLoadSuccess={onDocumentLoad}>
              {Array.from(new Array(numPages), (el, index) => (
                <Page key={index} pageNumber={index + 1} scale={zoom} />
              ))}
            </Document>
          )}
        </div>
      </div>
      <div className="w-1/2 flex flex-col p-2 border-l">
        <h2 className="text-xl font-bold mb-4">Questions</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: questionsCount }, (_, i) => {
            const q = i + 1;
            const selected = answers[q];
            return (
              <div
                key={q}
                onClick={() => setActiveQuestion(q)}
                className={`w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition ${
                  activeQuestion === q
                    ? 'bg-blue-600 text-white'
                    : selected
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {q}
              </div>
            );
          })}
        </div>
        {activeQuestion && (
          <div>
            <h3 className="font-semibold mb-2">Question {activeQuestion}</h3>
            <div className="grid grid-cols-2 gap-4">
              {['A', 'B', 'C', 'D'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(activeQuestion, opt)}
                  className={`p-4 border rounded transition text-left ${
                    answers[activeQuestion] === opt
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <span className="font-bold mr-2">{opt}.</span> Option text
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
 );
};

export default TestRunner;