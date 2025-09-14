export default function AnswerKeyGrid({ keyObj }) {
  const keys = Object.keys(keyObj || {}).sort((a, b) => Number(a) - Number(b));
  const zeroIndexed = keys.includes("0");

  return (
    <div className="grid grid-cols-5 gap-2 text-sm">
      {keys.map((q) => {
        const n = Number(q);
        const display = zeroIndexed ? n + 1 : n;
        return (
          <div
            key={q}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700"
          >
            <span className="font-semibold mr-2">{display}.</span>
            <span>{String(keyObj[q]).toUpperCase()}</span>
          </div>
        );
      })}
    </div>
  );
}
