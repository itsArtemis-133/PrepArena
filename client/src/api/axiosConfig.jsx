// client/src/api/axiosConfig.jsx
import axios from "axios";

function resolveApiBase() {
  const raw =
    (import.meta?.env?.VITE_API_BASE_URL ??
      import.meta?.env?.VITE_API_BASE ??
      "")
      .toString()
      .trim();

  // No env → Proxy mode (/api) — works locally via Vite proxy and (optionally) on Vercel via rewrites
  if (!raw) return "/api";

  // Env present → Direct mode (Cloud Run URL or your own API domain)
  const trimmed = raw.replace(/\/+$/, ""); // strip trailing slashes only
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const baseURL = resolveApiBase();

// Optional: small dev log to surface misconfig fast
if (import.meta.env.DEV) {
  
  console.log(`[axios] baseURL = ${baseURL}`);
}

const api = axios.create({
  baseURL,
  // timeout: 15000, // uncomment if you want to fail fast on misconfig
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

// Optional: normalize API errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // You can handle 401 here (e.g., logout/redirect) if you want
    // if (err?.response?.status === 401) { ... }
    return Promise.reject(err);
  }
);

export default api;
