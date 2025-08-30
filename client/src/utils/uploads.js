// client/src/utils/uploads.js
/**
 * Build a full URL for files served from the backend's /uploads.
 * Usage later: toUploadUrl(test.pdfUrl)
 */

function resolveUploadsBase() {
  // Prefer explicit uploads base, else derive from VITE_API_BASE
  const raw =
    (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_BASE || "").trim();
  if (!raw) return ""; // dev: relative works with proxy

  // Remove trailing slashes
  let base = raw.replace(/\/+$/, "");

  // If they gave .../api, strip /api to get service root
  if (base.endsWith("/api")) base = base.slice(0, -4);

  return `${base}/uploads`;
}

/**
 * Convert a stored path (e.g., "/uploads/xyz.pdf") into an absolute URL in prod.
 * If it's already absolute (starts with http), it's returned unchanged.
 */
export function toUploadUrl(p) {
  if (!p) return p;
  // Already absolute?
  if (/^https?:\/\//i.test(p)) return p;

  // If it's a bare "/uploads/..." path, prepend backend host in prod
  if (p.startsWith("/uploads")) {
    const base = resolveUploadsBase();
    if (!base) return p; // dev: Vite proxy + same origin works
    // Avoid duplicating "/uploads"
    return `${base}${p.replace(/^\/uploads/, "")}`;
  }

  // Fallback: return as-is
  return p;
}
