import React, { useState } from "react";
import axios from "../api/axiosConfig";

// Allowed answer values
const VALID_ANS = ["A", "B", "C", "D"];

export default function AnswerKeyStep({
  questionCount = 100,
  onAnswerKeyReady,
}) {
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [answerKey, setAnswerKey] = useState({});

  // Change handler for answer fields
  const handleChange = (q, val) => {
    val = val.trim().toUpperCase();
    if (val && !VALID_ANS.includes(val)) return;
    setAnswerKey((prev) => {
      const newKey = { ...prev, [q]: val };
      if (onAnswerKeyReady) onAnswerKeyReady(newKey);
      return newKey;
    });
  };

  // Extraction logic
  const handleExtract = async () => {
    if (!file || !questionCount) return setError("Choose a file and set questions!");
    setError(""); setExtracting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("max_q", questionCount);

      const { data } = await axios.post("/test/upload-answers", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Always fill grid 1..N
      let extracted = data.answers || {};
      let fixedKey = {};
      for (let i = 1; i <= questionCount; ++i)
        fixedKey[i] = VALID_ANS.includes((extracted[i] || "").toUpperCase())
          ? (extracted[i] || "").toUpperCase() : "";
      setAnswerKey(fixedKey);
      if (onAnswerKeyReady) onAnswerKeyReady(fixedKey);
    } catch  {
      setError("Extraction failed. Try again or fill manually.");
    }
    setExtracting(false);
  };

  // Styles for inputs and grid
  const inputClass = `
    w-12 h-10 rounded-md border-2 font-bold text-lg
    text-center transition
    bg-white dark:bg-gray-800
    text-gray-900 dark:text-gray-100
    border-gray-300 dark:border-gray-700
    focus:border-blue-500 focus:dark:border-blue-400
    outline-none
    shadow-sm
  `;

  return (
    <div>
      <div className="mb-3 font-semibold text-lg text-gray-900 dark:text-gray-100">
        How many questions?
      </div>
      <input
        type="number"
        value={questionCount}
        readOnly
        className="mb-4 w-28 px-3 py-1 border rounded text-lg bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
      />

      <div className="mb-2 font-semibold text-lg text-gray-900 dark:text-gray-100">
        Upload Answer Key PDF
      </div>
      <div className="flex items-center gap-3 mb-2">
        <input
          type="file"
          accept="application/pdf"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="block text-sm text-gray-700 dark:text-gray-200"
        />
        <button
          onClick={handleExtract}
          className="px-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          disabled={extracting || !file}
        >
          {extracting ? "Extracting..." : "Extract"}
        </button>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-1">
        <b>Disclaimer:</b> Extraction auto-fills as many as possible. Please verify and correct any blank/mismatched answers below!
      </div>
      {error && <div className="mt-2 text-red-600">{error}</div>}

      <div className="mt-4 font-bold text-xl text-gray-900 dark:text-gray-100">Extracted Answer Key:</div>
      <div className="overflow-x-auto pb-1">
        <div className="grid gap-4 grid-cols-5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 pt-2">
          {Array.from({ length: questionCount }, (_, i) => {
            const q = i + 1;
            return (
              <div key={q} className="flex flex-col items-center justify-center p-1">
                <span className="font-semibold mb-1 text-gray-700 dark:text-gray-200">
                  {q}.
                </span>
                <input
                  value={answerKey[q] || ""}
                  maxLength={1}
                  className={inputClass}
                  onChange={e => handleChange(q, e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
