export default function StatusBadge({ isUpcoming, isLive, isOver, start, end, now }) {
  if (isUpcoming)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-white/20 text-white">
        Starts in {start.from(now, true)}
      </span>
    );
  if (isLive)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-400/20 text-white">
        Live • ends {end.from(now, true)}
      </span>
    );
  if (isOver)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-white/20 text-white">
        Completed
      </span>
    );
  return null;
}
