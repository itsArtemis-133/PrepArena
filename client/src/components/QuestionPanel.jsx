// client/src/components/QuestionPanel.jsx
import React from 'react';

export default function QuestionPanel({ questionCount, currentIndex, onBubbleClick, answers }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {Array.from({ length: questionCount }).map((_, idx) => {
        const isActive   = idx === currentIndex;
        const isAnswered = answers[idx] !== undefined;
        return (
          <button
            key={idx}
            onClick={() => onBubbleClick(idx)}
            className={`h-8 w-8 flex items-center justify-center rounded-full border
              ${isActive
                ? 'bg-indigo-600 text-white border-indigo-600'
                : isAnswered
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-700 border-gray-300'
              }`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}
