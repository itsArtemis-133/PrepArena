export default function downloadMyAnswersCsv(myResult) {
  const rows = (myResult.details || [])
    .slice()
    .sort((a, b) => Number(a.q) - Number(b.q));

  const header = ["Q", "Marked", "Correct", "Result"];
  const lines = [header.join(",")];

  rows.forEach((r) => {
    const cols = [
      r.q,
      r.marked || "",
      r.correct || "",
      r.isCorrect ? "Correct" : "Wrong",
    ].map((x) =>
      String(x).includes(",") ? `"${String(x).replace(/"/g, '""')}"` : String(x)
    );
    lines.push(cols.join(","));
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-answers.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
