import React, { useEffect, useState } from 'react';

export default function Timer({
  scheduledDate,
  duration,
  onTimeUp,
  //isTestStarted,
  setIsTestStarted,
  //disableGrid,
  setDisableGrid,
}) {
  // Parse test start & end
  const testStart = new Date(scheduledDate).getTime();
  const testEnd = testStart + duration * 60 * 1000;

  // Which phase? "waiting" | "running" | "done"
  const getPhase = () => {
    const now = Date.now();
    if (now < testStart) return 'waiting';
    if (now < testEnd) return 'running';
    return 'done';
  };

  const [phase, setPhase] = useState(getPhase());
  const [remaining, setRemaining] = useState(
    phase === 'waiting' ? testStart - Date.now() : testEnd - Date.now()
  );

  // Timer loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentPhase = getPhase();
      setPhase(currentPhase);

      if (currentPhase === 'waiting') {
        setRemaining(testStart - now);
        setIsTestStarted(false);
        setDisableGrid(true);
      } else if (currentPhase === 'running') {
        setRemaining(testEnd - now);
        setIsTestStarted(true);
        setDisableGrid(false);
      } else if (currentPhase === 'done') {
        setRemaining(0);
        setIsTestStarted(false);
        setDisableGrid(true);
        onTimeUp?.(); // trigger auto-submit once
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [scheduledDate, duration]);

  // Time formatting
  const formatMS = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {phase === 'waiting' && (
        <div className="bg-yellow-100 text-yellow-900 rounded-lg px-5 py-2 text-xl font-bold mb-2 shadow animate-pulse">
          Test starts in: <span className="font-mono">{formatMS(remaining)}</span>
        </div>
      )}
      {phase === 'running' && (
        <div className="bg-indigo-100 text-indigo-900 rounded-lg px-5 py-2 text-xl font-bold mb-2 shadow">
          Time Left: <span className="font-mono">{formatMS(remaining)}</span>
        </div>
      )}
      {phase === 'done' && (
        <div className="bg-rose-400 text-white rounded-lg px-7 py-3 text-3xl font-extrabold mb-2 shadow-lg animate-pulse">
          Time's Up!
        </div>
      )}
    </div>
  );
}
