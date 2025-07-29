// client/src/components/Timer.jsx
import React, { useEffect, useState } from 'react';

export default function Timer({ duration, onTimeUp }) {
  // Always start at full duration (minutes→ms)
  const initialMs = duration * 60 * 1000;
  const [remaining, setRemaining] = useState(initialMs);

  useEffect(() => {
    // Every second, decrement
    const ticker = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(ticker);
          onTimeUp?.();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [duration, onTimeUp]);

  const formatMS = ms => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="text-lg font-mono text-indigo-600">
      {formatMS(remaining)}
    </div>
  );
}
