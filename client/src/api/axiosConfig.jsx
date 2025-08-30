// client/src/api/axiosConfig.jsx
import axios from "axios";

/**
 * Resolve API base:
 * - In dev, keep '/api' (works with Vite proxy).
 * - In prod, set VITE_API_BASE to either:
 *   - 'https://your-backend-host'  (we'll append '/api')
 *   - or 'https://your-backend-host/api' (we'll use as-is)
 */
function resolveApiBase() {
  const raw = import.meta.env.VITE_API_BASE;
  if (!raw || typeof raw !== "string") return "/api";

  const trimmed = raw.replace(/\/+$/, ""); // remove trailing slashes
  if (trimmed.endsWith("/api")) return trimmed; // already includes /api
  return `${trimmed}/api`;
}

const api = axios.create({ baseURL: resolveApiBase() });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
