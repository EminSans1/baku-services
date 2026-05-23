import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

function Register({ t, setViewMode, showToast, lang }) {
  const { loginUser } = useContext(AuthContext);
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast(
        lang === 'az' ? 'Yalnız JPG, PNG və WEBP' : lang === 'en' ? 'Only JPG, PNG, WEBP' : 'Только JPG, PNG, WEBP',
        'error'
      );
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast(
        lang === 'az' ? 'Şəkil 2MB-dan kiçik olmalıdır' : lang === 'en' ? 'Image must be under 2MB' : 'Изображение до 2МБ',
        'error'
      );
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return null;
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    const res = await axios.post('/api/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data?.url || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (password !== confirmPassword) {
      showToast(t('passwordsDontMatch') || 'Passwords do not match!', 'error');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post('/api/auth/register', {
        fullname,
        email,
        phone,
        password
      });

      let user = res.data.user;

      if (avatarFile) {
        try {
          const avatarUrl = await uploadAvatar();
          if (avatarUrl) {
            user = { ...user, avatar_url: avatarUrl };
          }
        } catch (uploadErr) {
          console.error(uploadErr);
          showToast(t('avatarUploadError') || 'Avatar upload failed', 'error');
        }
      }

      loginUser(user);
      showToast(t('registerSuccessToast') || 'Success');
      setViewMode('showcase');
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || t('toastErrorAddAd') || 'Registration failed';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const initials = (fullname || 'U').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="max-w-md mx-auto my-12 bg-[#171817] border border-[#242624] p-8 rounded-2xl shadow-xl">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold font-display text-white mb-1 uppercase tracking-wider">
          {t('registerTitle') || 'Register'}
        </h2>
        <p className="text-xs text-slate-500">
          {t('postNewServiceTitle') ? t('postNewServiceTitle').replace('✨ ', '') : 'Create your provider account'}
        </p>
      </div>

      <div className="flex flex-col items-center mb-6">
        <label className="relative group/avatar cursor-pointer">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#c3d6cc] text-[#111211] font-bold text-2xl flex items-center justify-center font-display uppercase border border-[#242624]">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <span className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center rounded-2xl transition-opacity text-white text-[9px] uppercase tracking-wider font-bold">
            {t('uploadAvatarLabel') || 'Photo'}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </label>
        <p className="text-[10px] text-slate-500 mt-2 text-center">{t('uploadAvatarLabel')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
            {t('fullnameLabel') || 'Full Name'}
          </label>
          <input
            className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all"
            placeholder={t('namePlaceholder')}
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

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
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
            {t('phoneLabel') || 'Phone'}
          </label>
          <input
            type="tel"
            className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all"
            placeholder="+994 (50) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
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
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
            {t('confirmPasswordLabel') || 'Confirm Password'}
          </label>
          <input
            type="password"
            className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#d2e2db] hover:bg-[#c3d6cc] disabled:bg-slate-700 disabled:text-slate-400 text-[#111211] font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
        >
          {loading ? '...' : (t('publish') || 'Register')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setViewMode('login')}
          className="text-xs text-[#c3d6cc] hover:text-white transition-colors"
        >
          {t('haveAccount') || 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}

export default Register;
