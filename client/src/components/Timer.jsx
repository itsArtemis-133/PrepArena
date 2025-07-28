// client/src/components/Timer.jsx
import React, { useEffect, useState } from 'react';

export default function Timer({ scheduledDate, duration, onTimeUp }) {
  // compute initial ms remaining
  const computeRemaining = () => {
    if (scheduledDate) {
      const endTs = new Date(scheduledDate).getTime() + duration * 60 * 1000;
      return endTs - Date.now();
    }
    return duration * 60 * 1000;
  };

  const [remaining, setRemaining] = useState(computeRemaining());

  useEffect(() => {
    const ticker = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1000) {
          clearInterval(ticker);
          onTimeUp?.();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [onTimeUp]);

  const formatMS = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="text-lg font-mono text-indigo-600">
      {formatMS(remaining)}
    </div>
  );
}
