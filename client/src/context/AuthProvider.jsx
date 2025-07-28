import React, { useState, useEffect } from 'react';
import AuthContext from './AuthContext';

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    // initialize from localStorage if present
    return localStorage.getItem('token');
  });

  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  // example effect if you ever want to sync with an API on mount
  useEffect(() => {
    // could verify token here…
  }, []);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
