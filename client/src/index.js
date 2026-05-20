import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';
import { API_BASE } from './config';
import { AuthProvider } from './context/AuthContext';

axios.defaults.baseURL = API_BASE;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);