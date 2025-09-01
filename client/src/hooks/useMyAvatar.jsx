// client/src/hooks/useMyAvatar.js
import { useEffect, useRef, useState } from "react";
import axios from "../api/axiosConfig";
import { useAuth } from "./useAuth";

/**
 * Gets the current user's avatar as a blob URL from /auth/avatar/me (protected).
 * Returns { url, reload }.
 */
export function useMyAvatar() {
  const { token } = useAuth();
  const [url, setUrl] = useState(null);
  const prevUrlRef = useRef(null);

  const load = async () => {
    if (!token) {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
      setUrl(null);
      return;
    }
    try {
      const res = await axios.get(`/auth/avatar/me?ts=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(res.data);
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = blobUrl;
      setUrl(blobUrl);
    } catch {
      // fallback to null (use default svg)
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
      setUrl(null);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { url, reload: load };
}
