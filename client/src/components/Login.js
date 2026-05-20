import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

function Login({ t, setViewMode, showToast }) {
  const { loginUser } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', { email, password });
      loginUser(res.data.token, res.data.user);
      showToast(t('loginSuccessToast') || 'Success');
      setViewMode('showcase');
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || t('toastErrorLogin') || 'Login failed';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-[#171817] border border-[#242624] p-8 rounded-2xl shadow-xl">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold font-display text-white mb-1 uppercase tracking-wider">
          {t('loginTitle') || 'Login'}
        </h2>
        <p className="text-xs text-slate-500">
          {t('enterAdminPassword') ? t('enterAdminPassword').replace('admin ', '') : 'Enter email and password'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
            {t('emailLabel') || 'Email'}
          </label>
          <input
            type="email"
            className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
            {t('passwordLabel') || 'Password'}
          </label>
          <input
            type="password"
            className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#d2e2db] hover:bg-[#c3d6cc] disabled:bg-slate-700 disabled:text-slate-400 text-[#111211] font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
        >
          {loading ? '...' : (t('loginBtn') || 'Login')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setViewMode('register')}
          className="text-xs text-[#c3d6cc] hover:text-white transition-colors"
        >
          {t('noAccount') || "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
}

export default Login;
