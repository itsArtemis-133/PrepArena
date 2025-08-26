import React, { useState } from "react";
import axios from "../api/axiosConfig";
import { DocumentMagnifyingGlassIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

const VALID_ANS = ["A", "B", "C", "D"];

export default function AnswerKeyStep({
  questionCount,
  onAnswerKeyReady,
  answerKey,
  setAnswerKey
}) {
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (q, val) => {
    val = val.trim().toUpperCase();
    if (val && !VALID_ANS.includes(val)) return;
    const newKey = { ...answerKey, [q]: val };
    setAnswerKey(newKey);
    if (onAnswerKeyReady) onAnswerKeyReady(newKey);
  };

  const handleExtract = async () => {
    if (!file || !questionCount) {
      setError("Please choose a file to extract answers from.");
      return;
    }
    setError("");
    setExtracting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("max_q", questionCount);

      const { data } = await axios.post("/test/upload-answers", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      let extracted = data.answers || {};
      let fixedKey = {};
      for (let i = 1; i <= questionCount; ++i) {
        const ans = (extracted[i] || "").toUpperCase();
        fixedKey[i] = VALID_ANS.includes(ans) ? ans : "";
      }
      setAnswerKey(fixedKey);
      if (onAnswerKeyReady) onAnswerKeyReady(fixedKey);

    } catch {
      setError("Extraction failed. Please verify the PDF or fill manually.");
    }
    setExtracting(false);
  };

  const inputClass = `
    w-12 h-12 rounded-lg border-2 font-bold text-lg text-center transition
    bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100
    border-gray-300 dark:border-gray-600
    focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
    outline-none shadow-sm placeholder-gray-400
  `;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
        <label htmlFor="key-upload" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Option 1: Extract from PDF
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <input
            id="key-upload"
            type="file"
            accept="application/pdf"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="block text-sm text-gray-600 dark:text-gray-300
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:text-sm file:font-semibold
                       file:bg-indigo-50 file:text-indigo-700
                       hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900"
          />
          <button
            onClick={handleExtract}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
            disabled={extracting || !file || !questionCount}
          >
            <DocumentMagnifyingGlassIcon className="h-5 w-5 mr-2" />
            {extracting ? "Extracting..." : "Extract"}
          </button>
        </div>
      </div>

      <div className="flex items-start p-3 text-sm text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-900/50 rounded-lg border border-sky-200 dark:border-sky-800">
        <InformationCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <strong>Heads up:</strong> PDF extraction is a helper tool. Please review all answers below and manually correct any that are blank or incorrect.
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}

      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Option 2: Manually Enter/Verify Answers
        </h3>
        <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700/50 rounded-lg bg-gray-50/50 dark:bg-transparent overflow-x-auto">
          {questionCount > 0 ? (
            <div className="grid gap-x-4 gap-y-5 grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {Array.from({ length: questionCount }, (_, i) => {
                const q = i + 1;
                return (
                  <div key={q} className="flex flex-col items-center">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                      Q.{q}
                    </span>
                    <input
                      value={answerKey[q] || ""}
                      maxLength={1}
                      className={inputClass}
                      onChange={e => handleChange(q, e.target.value)}
                      placeholder="-"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="text-center py-8 text-gray-500">Please set the number of questions to begin.</div>
          )}
        </div>
      </div>
    </div>
  );
}