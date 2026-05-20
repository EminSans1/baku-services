import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('baku_user_token');
    const savedUser = localStorage.getItem('baku_user_profile');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        
        // Set axios default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } catch (e) {
        localStorage.removeItem('baku_user_token');
        localStorage.removeItem('baku_user_profile');
      }
    }
    setLoading(false);
  }, []);

  const loginUser = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('baku_user_token', newToken);
    localStorage.setItem('baku_user_profile', JSON.stringify(newUser));
    
    // Set axios default authorization header
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  }, []);

  const logoutUser = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('baku_user_token');
    localStorage.removeItem('baku_user_profile');
    
    // Clear axios default authorization header
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};
