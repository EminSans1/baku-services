import React, { useState } from 'react';
import axios from 'axios';
import { resolveImageUrl } from '../utils/imageUrl';

function ImageUploader({
  images = [],
  onChange,
  maxImages = 5,
  t,
  getAuthHeaders,
  showToast,
  lang
}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      const msg = lang === 'az'
        ? `Maksimum ${maxImages} şəkil yükləyə bilərsiniz`
        : lang === 'en'
          ? `You can upload up to ${maxImages} images`
          : `Можно загрузить не более ${maxImages} изображений`;
      showToast(msg, 'error');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        showToast(
          lang === 'az' ? 'Yalnız JPG, PNG və WEBP' : lang === 'en' ? 'Only JPG, PNG, WEBP' : 'Только JPG, PNG, WEBP',
          'error'
        );
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(
          lang === 'az' ? 'Hər şəkil 5MB-dan kiçik olmalıdır' : lang === 'en' ? 'Each image must be under 5MB' : 'Каждое изображение до 5МБ',
          'error'
        );
        return;
      }
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    setIsUploading(true);
    try {
      const res = await axios.post('/api/upload/ad-image', formData, {
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.success && res.data.urls) {
        onChange([...images, ...res.data.urls]);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Error uploading image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (indexToRemove) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
        {t('uploadAdImages')} ({images.length}/{maxImages})
      </label>
      <div className="grid grid-cols-5 gap-2.5 mt-2">
        {images.map((img, idx) => (
          <div key={`${img}-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-[#242624] bg-[#111211]">
            <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-all cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <label className="relative flex flex-col items-center justify-center aspect-square rounded-xl border border-dashed border-[#242624] bg-[#111211]/30 hover:bg-[#111211]/50 text-slate-500 hover:text-[#c3d6cc] transition-all cursor-pointer">
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Add</span>
              </>
            )}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        )}
      </div>
      <p className="text-[10px] text-slate-500 mt-2">{t('uploadAdImagesLimit')}</p>
    </div>
  );
}

export default ImageUploader;
