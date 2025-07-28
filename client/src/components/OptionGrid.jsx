// client/src/components/OptionGrid.jsx
import React from 'react';

const OPTION_LABELS = ['A','B','C','D'];

export default function OptionGrid({ questionCount, answers, onChange }) {
  return (
    <div className="overflow-y-auto max-h-full mt-4">
      {Array.from({ length: questionCount }).map((_, qIdx) => (
        <div
          key={qIdx}
          className="flex items-center py-2 border-b last:border-none"
        >
          {/* Question number */}
          <div className="w-8 text-right pr-4 text-gray-700">
            {qIdx + 1}.
          </div>

          {/* Bubbles */}
          <div className="flex gap-4">
            {OPTION_LABELS.map((opt) => {
              const selected = answers[qIdx] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => onChange(qIdx, opt)}
                  className={`h-6 w-6 flex items-center justify-center rounded-full border
                    ${selected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-gray-300 text-gray-500'
                    }`}
                >
                  {/* Could also omit label if you want blank circles */}
                  <span className="text-xs">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
