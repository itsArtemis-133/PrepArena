// client/src/api/axiosConfig.jsx
import axios from "axios";

/**
 * Resolve API base:
 * - In dev: defaults to "/api" (works with Vite proxy).
 * - In prod: set VITE_API_BASE_URL to either:
 *   - "https://your-backend-host"      → we append "/api"
 *   - "https://your-backend-host/api"  → we keep as-is
 */
function resolveApiBase() {
  const raw = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE;
  if (!raw || typeof raw !== "string") return "/api";

  const trimmed = raw.replace(/\/+$/, ""); // remove trailing slashes
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const api = axios.create({ baseURL: resolveApiBase() });

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
