import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      setUser({ token });
      localStorage.setItem('token', token);
    } else {
      setUser(null);
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = (newToken) => setToken(newToken);
  const logout = () => setToken(null);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
