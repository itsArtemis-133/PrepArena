import React, { useEffect, useMemo, useState } from "react";
import AuthContext from "./AuthContext";

/**
 * AuthProvider responsibilities:
 * - Rehydrate token on boot (prevents "collapse" after hard refresh).
 * - Expose isAuth/loading/login/logout.
 * - Optional: validate token on boot (disabled by default for snappy UX).
 * - Sync auth across tabs (storage events).
 *
 * No changes needed in main/App. ProtectedRoute can read { isAuth, loading }.
 */
export default function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // optional profile if you fetch it later

  // Toggle this to true if you want to call /api/auth/me on boot.
  const VALIDATE_ON_BOOT = false;

  // Rehydrate once on mount
  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      if (stored) setToken(stored);
    } catch {
      /* ignore storage errors */
    }
    setLoading(false);

    // If you want validation on boot, do it here (kept off for speed)
    // if (VALIDATE_ON_BOOT && stored) { ... }
   
  }, []);

  // Cross-tab sync (login/logout reflects across tabs)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "token") {
        setToken(e.newValue || null);
        if (!e.newValue) setUser(null);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const login = (newToken, { remember = true, profile = null } = {}) => {
    setToken(newToken);
    if (profile) setUser(profile);
    try {
      // Store in chosen bucket
      if (remember) {
        localStorage.setItem("token", newToken);
        sessionStorage.removeItem("token");
      } else {
        sessionStorage.setItem("token", newToken);
        localStorage.removeItem("token");
      }
    } catch {
      /* ignore storage errors */
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    } catch {
      /* ignore */
    }
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuth: !!token,
      loading,
      login,
      logout,
      setUser, // optional helper if you fetch profile later
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
