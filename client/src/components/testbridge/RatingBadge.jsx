import React from "react";
import axios from "../../api/axiosConfig";

export default function RatingBadge({ testId }) {
  const [data, setData] = React.useState({ avg: 0, count: 0 });

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await axios.get(`/test/${testId}/feedback`);
        const avg = res?.data?.summary?.avg ?? 0;
        const count = res?.data?.summary?.count ?? 0;
        if (!cancel) setData({ avg, count });
      } catch {
        if (!cancel) setData({ avg: 0, count: 0 });
      }
    })();
    return () => { cancel = true; };
  }, [testId]);

  if (!data.count) return null;
  const display = (Math.round(Number(data.avg) * 10) / 10).toFixed(1);
  return (
    <div className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      ★ {display} · {data.count}
    </div>
  );
}
