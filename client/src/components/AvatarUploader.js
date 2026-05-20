import React, { useState } from 'react';
import axios from 'axios';
import { resolveImageUrl } from '../utils/imageUrl';

function AvatarUploader({ avatarUrl, fullname, onUploaded, token, showToast, lang, t }) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !token) return;

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

    const formData = new FormData();
    formData.append('avatar', file);

    setLoading(true);
    try {
      const res = await axios.post('/api/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data?.url) {
        onUploaded(res.data.url);
        showToast(t('avatarUploadSuccess') || 'Avatar updated!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || t('avatarUploadError') || 'Upload failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initials = (fullname || 'U').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="relative group/avatar cursor-pointer mx-auto">
      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#c3d6cc] text-[#111211] font-bold text-2xl flex items-center justify-center font-display uppercase border border-[#242624]">
        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#111211] border-t-transparent" />
        ) : avatarUrl ? (
          <img src={resolveImageUrl(avatarUrl)} alt={fullname} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center rounded-2xl transition-opacity cursor-pointer">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
          disabled={loading || !token}
        />
      </label>
    </div>
  );
}

export default AvatarUploader;
