export default function StatCard({ label, children }) {
  return (
    <div className="h-full rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4 flex flex-col justify-between">
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}
