// client/src/components/OptionGrid.jsx
import React from "react";

const OPTION_LABELS = ["A", "B", "C", "D"];

export default function OptionGrid({
  questionCount,
  answers,
  onChange,
  disabled = false,
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-blue-700 dark:text-indigo-300">
        Answer Sheet
      </h2>
      <div className="flex flex-col gap-2">
        {Array.from({ length: questionCount }, (_, i) => {
          const qIndex = i + 1; // ✅ 1-indexed
          const selected = answers[qIndex];
          return (
            <div
              key={qIndex}
              className={`flex items-center justify-between rounded-xl border 
                border-blue-100 dark:border-slate-800 px-4 py-2 
                bg-white/80 dark:bg-slate-900/80
                shadow-sm hover:shadow transition
              `}
            >
              <span className="font-semibold text-lg text-slate-800 dark:text-slate-100">
                {qIndex}.
              </span>

              <div className="flex gap-6">
                {OPTION_LABELS.map((label) => {
                  const isChecked = selected === label;
                  return (
                    <span
                      key={label}
                      role="radio"
                      aria-checked={isChecked}
                      tabIndex={disabled ? -1 : 0}
                      title={isChecked ? "Click again to clear" : "Select option"}
                      onClick={() => {
                        if (disabled) return;
                        onChange &&
                          onChange(qIndex, isChecked ? undefined : label);
                      }}
                      onKeyDown={(e) => {
                        if (disabled) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onChange &&
                            onChange(qIndex, isChecked ? undefined : label);
                        }
                      }}
                      className={`
                        flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-base
                        transition-all duration-150 select-none cursor-pointer
                        ${disabled ? "opacity-60 cursor-not-allowed" : ""}
                        ${
                          isChecked
                            ? "border-indigo-500 dark:border-indigo-300 bg-indigo-500 dark:bg-indigo-400 text-white shadow ring-2 ring-indigo-300 dark:ring-indigo-500"
                            : "border-blue-400 dark:border-gray-600 bg-white dark:bg-slate-800 text-blue-800 dark:text-gray-200"
                        }
                      `}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
