export default function CreatorReputation({ avg = 0, count = 0 }) {
  if (!count || !avg) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-[2px] text-[11px] bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300">
        New
      </span>
    );
  }
  const display = (Math.round(avg * 10) / 10).toFixed(1);
  return (
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-[2px] text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      <span aria-hidden>★</span>
      <span>{display}</span>
      <span className="opacity-70">· {count}</span>
    </span>
  );
}
