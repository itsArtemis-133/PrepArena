import React, { useState } from "react";
import axios from "../api/axiosConfig";

// Allowed answer values
const VALID_ANS = ["A", "B", "C", "D"];

export default function AnswerKeyStep({
  questionCount = 100, // from parent (number of questions)
  onAnswerKeyReady,
}) {
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [answerKey, setAnswerKey] = useState({}); // { 1: "A", ... }

  // Helper: grid input change
  const handleChange = (q, val) => {
    val = val.trim().toUpperCase();
    if (val && !VALID_ANS.includes(val)) return;
    setAnswerKey((prev) => {
      const newKey = { ...prev, [q]: val };
      onAnswerKeyReady && onAnswerKeyReady(newKey);
      return newKey;
    });
  };

  // Upload & extract
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
      onAnswerKeyReady && onAnswerKeyReady(fixedKey);
    } catch  {
      setError("Extraction failed. Try again or fill manually.");
    }
    setExtracting(false);
  };

  // Render grid for 1…N, editable
  return (
    <div>
      <div className="mb-2 font-semibold text-lg">How many questions?</div>
      <input
        type="number"
        value={questionCount}
        readOnly // locked, must be passed by parent/configure step
        className="mb-4 w-28 px-3 py-1 border rounded text-lg"
      />

      <div className="mb-2 font-semibold text-lg">Upload Answer Key PDF</div>
      <input
        type="file"
        accept="application/pdf"
        onChange={e => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={handleExtract}
        className="ml-4 px-6 py-2 bg-blue-600 text-white rounded font-semibold"
        disabled={extracting || !file}
      >
        {extracting ? "Extracting..." : "Extract"}
      </button>

      <div className="text-sm text-gray-500 mt-2">
        <b>Disclaimer:</b> Extraction auto-fills as many as possible. Please verify and correct any blank/mismatched answers below!
      </div>

      {error && <div className="mt-2 text-red-600">{error}</div>}

      <div className="mt-4 font-bold text-xl">Extracted Answer Key:</div>
      <div className="grid grid-cols-5 md:grid-cols-7 gap-3 mt-2">
        {Array.from({ length: questionCount }, (_, i) => {
          const q = i + 1;
          return (
            <div key={q} className="flex items-center gap-2">
              <span className="font-bold">{q}.</span>
              <input
                value={answerKey[q] || ""}
                maxLength={1}
                className="w-10 px-2 py-1 border rounded text-center font-mono bg-white shadow"
                onChange={e => handleChange(q, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
