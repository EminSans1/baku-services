import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On boot, ask the server who we are. The session lives in an httpOnly cookie
  // and is invisible to JS, so localStorage is never used for auth state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prime the CSRF cookie before any state-changing request.
        await axios.get('/api/csrf-token');
      } catch (_) { /* non-fatal */ }
      try {
        const res = await axios.get('/api/auth/me');
        if (!cancelled && res.data && res.data.user) {
          setUser(res.data.user);
        }
      } catch (_) {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loginUser = useCallback((newUser) => {
    setUser(newUser);
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (_) { /* ignore network errors during logout */ }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};
