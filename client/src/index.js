import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';
import { API_BASE } from './config';
import { AuthProvider } from './context/AuthContext';

// Send cookies on every request and attach the CSRF double-submit token.
axios.defaults.baseURL = API_BASE;
axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const match = document.cookie.match(/(?:^|; )bbs_csrf=([^;]+)/);
    if (match) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
    }
  }
  return config;
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
