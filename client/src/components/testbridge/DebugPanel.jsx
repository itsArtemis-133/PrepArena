export default function DebugPanel({
  debugEnabled,
  link,
  prefetchSnapshot,
  serverSnapshot,
  mergedTest,
  mergeRows,
}) {
  if (!debugEnabled) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 max-h-[45vh] overflow-y-auto bg-black/90 text-green-200 text-xs font-mono p-3 z-50 border-t border-green-500/40">
      <div className="flex items-center gap-3 mb-2">
        <span className="font-bold">DEBUG</span>
        <span>link: {link}</span>
      </div>

      <details open>
        <summary className="cursor-pointer">Prefetch (from Dashboard)</summary>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(prefetchSnapshot, null, 2)}
        </pre>
      </details>

      <details open>
        <summary className="cursor-pointer">Server payload (/test/public/:link)</summary>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(serverSnapshot, null, 2)}
        </pre>
      </details>

      <details open>
        <summary className="cursor-pointer">Merged object (rendered)</summary>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(mergedTest, null, 2)}
        </pre>
      </details>

      <details>
        <summary className="cursor-pointer">Field merge decisions</summary>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-left">
              <th className="pr-2">field</th>
              <th className="pr-2">prev</th>
              <th className="pr-2">next</th>
              <th className="pr-2">chosen</th>
            </tr>
          </thead>
          <tbody>
            {mergeRows.map((r, idx) => (
              <tr key={idx} className="align-top">
                <td className="pr-2">{r.field}</td>
                <td className="pr-2">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(r.prev)}
                  </pre>
                </td>
                <td className="pr-2">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(r.next)}
                  </pre>
                </td>
                <td className="pr-2">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(r.chosen)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
