import React from "react";
const OPTION_LABELS = ["A", "B", "C", "D"];

export default function AnswerKeyEditor({ answerKey, setAnswerKey, questionCount }) {
  return (
    <div className="mt-6">
      <h3 className="font-semibold text-lg mb-2">Preview & Edit Answer Key</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.from({ length: questionCount }, (_, idx) => {
          const q = idx + 1;
          return (
            <div key={q} className="flex items-center gap-2 bg-white rounded px-3 py-1 shadow">
              <span className="w-6 text-right font-semibold">{q}.</span>
              {OPTION_LABELS.map(opt => (
                <button
                  type="button"
                  key={opt}
                  className={`mx-1 px-2 py-1 rounded-full border ${
                    answerKey[q] === opt
                      ? "bg-indigo-600 text-white border-indigo-700"
                      : "bg-gray-100 text-gray-800 border-gray-300"
                  }`}
                  onClick={() => setAnswerKey(a => ({ ...a, [q]: opt }))}
                >
                  {opt}
                </button>
              ))}
              <input
                className="ml-2 w-10 px-1 rounded border"
                maxLength={1}
                value={answerKey[q] || ""}
                onChange={e =>
                  setAnswerKey(a => ({
                    ...a,
                    [q]: e.target.value.toUpperCase().replace(/[^A-D]/, "")
                  }))
                }
                placeholder="-"
              />
            </div>
          );
        })}
      </div>
      <div className="text-sm text-gray-600 mt-2">
        Click a bubble or type a letter (A-D) for each answer. Blank = no key.
      </div>
    </div>
  );
}
