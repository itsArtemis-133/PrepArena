export const fmt = (v) =>
  v === null || v === undefined || v === "" ? "—" : v;

export const fmtMin = (v) =>
  Number(v) > 0 ? `${Number(v)} min` : "—";
