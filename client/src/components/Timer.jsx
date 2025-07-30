import React, { useEffect, useRef, useState } from "react";

// Helper for circular progress ring
function ProgressCircle({ percent, radius = 36, stroke = 6 }) {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <svg height={radius * 2} width={radius * 2} className="block">
      <circle
        stroke="#e5e7eb"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="url(#timer-gradient)"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference + " " + circumference}
        style={{ strokeDashoffset, transition: "stroke-dashoffset 1s linear" }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <defs>
        <linearGradient id="timer-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Timer({
  scheduledDate,
  duration,
  onTimeUp,
  //isTestStarted,
  setIsTestStarted,
  //disableGrid,
  setDisableGrid,
}) {
  // Compute start and end timestamps
  const startTs = scheduledDate ? new Date(scheduledDate).getTime() : Date.now();
  const endTs = startTs + duration * 60 * 1000;

  // State
  const [now, setNow] = useState(Date.now());
  const [status, setStatus] = useState("waiting"); // waiting | running | done

  // For sticky/floating
  const stickyRef = useRef();

  // Timer logic
  useEffect(() => {
    let interval;
    function tick() {
      const curr = Date.now();
      setNow(curr);

      if (curr < startTs) {
        setStatus("waiting");
        setIsTestStarted?.(false);
        setDisableGrid?.(true);
      } else if (curr < endTs) {
        setStatus("running");
        setIsTestStarted?.(true);
        setDisableGrid?.(false);
      } else {
        setStatus("done");
        setIsTestStarted?.(false);
        setDisableGrid?.(true);
        if (onTimeUp) onTimeUp();
        clearInterval(interval);
      }
    }
    tick();
    interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTs, endTs, onTimeUp, setIsTestStarted, setDisableGrid]);

  // Remaining for display and percent for ring
  const msUntilStart = Math.max(0, startTs - now);
  const msLeft = Math.max(0, endTs - now);
  const total = endTs - startTs;
  const percent =
    status === "running" ? msLeft / total : status === "done" ? 0 : 1;

  // Format
  const formatMS = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Sticky/floating effect
  useEffect(() => {
    const el = stickyRef.current;
    if (el) el.style.position = "sticky";
    if (el) el.style.top = "12px";
  }, []);

  return (
    <div ref={stickyRef} className="z-20 flex flex-col items-center select-none">
      <div className="relative flex flex-col items-center w-fit mx-auto">
        {/* Progress Ring */}
        <div className="absolute top-1 left-1">
          <ProgressCircle percent={percent} />
        </div>
        {/* Timer Value */}
        <span
          className={`text-3xl font-mono font-extrabold px-10 py-2 rounded-xl
            shadow
            ${
              status === "done"
                ? "bg-gradient-to-r from-red-500 to-pink-400 text-white animate-pulse"
                : status === "waiting"
                ? "bg-gradient-to-r from-yellow-300 to-yellow-500 text-gray-800"
                : "bg-gradient-to-r from-indigo-500 to-blue-400 text-white animate-pulse"
            }
          `}
          style={{
            letterSpacing: "0.12em",
            minWidth: "6.5em",
            display: "inline-block",
            margin: "0 auto",
          }}
        >
          {status === "waiting"
            ? `Starts in ${formatMS(msUntilStart)}`
            : status === "running"
            ? `⏰ ${formatMS(msLeft)}`
            : "Time's Up!"}
        </span>
      </div>
    </div>
  );
}
