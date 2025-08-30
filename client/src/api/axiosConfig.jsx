// client/src/api/axiosConfig.jsx
import axios from "axios";

/**
 * Resolve API base:
 * - Proxy mode (recommended on Vercel): if no env is set, use "/api" so vercel.json rewrites to backend.
 * - Direct mode (optional): if VITE_API_BASE_URL/VITE_API_BASE is set, normalize and ensure it ends with "/api".
 */
function resolveApiBase() {
  const raw =
    (import.meta?.env?.VITE_API_BASE_URL ??
      import.meta?.env?.VITE_API_BASE ??
      "")
      .toString()
      .trim();

  // No env → Proxy mode via vercel.json
  if (!raw) return "/api";

  // Env present → Direct mode
  const trimmed = raw.replace(/\/+$/, ""); // strip trailing slashes
  return trimmed.toLowerCase().endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const api = axios.create({
  baseURL: resolveApiBase(),
  // You can add a short timeout to surface misconfig early (optional):
  // timeout: 15000,
});

// Attach auth token automatically
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token") || null;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
