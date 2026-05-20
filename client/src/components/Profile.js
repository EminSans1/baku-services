import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { resolveImageUrl } from '../utils/imageUrl';

function Profile({ user, t, navigateTo, lang, showToast, getCategoryTranslation, getAuthHeaders, openCreateForm }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const { token, loginUser } = useContext(AuthContext);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/listings/my', getAuthHeaders());
      setListings(res.data);
    } catch (err) {
      console.error(err);
      showToast(t('toastErrorLoadAds') || 'Error loading listings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigateTo('/login');
      return;
    }
    fetchMyListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await axios.delete(`/api/listings/${id}`, getAuthHeaders());
      showToast(lang === 'az' ? 'Elan uğurla silindi!' : lang === 'en' ? 'Listing deleted successfully!' : 'Объявление успешно удалено!', 'success');
      setConfirmDeleteId(null);
      // Refresh list
      setListings(listings.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || (lang === 'az' ? 'Silinmə zamanı xəta' : lang === 'en' ? 'Delete failed' : 'Ошибка при удалении');
      showToast(errorMsg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side validations
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast(lang === 'az' ? 'Yalnız JPG, PNG və ya WEBP şəkilləri dəstəklənir.' : lang === 'en' ? 'Only JPG, PNG, and WEBP formats are supported.' : 'Допускаются только JPG, PNG и WEBP форматы.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast(lang === 'az' ? 'Şəkil ölçüsü 2MB-dan çox olmamalıdır.' : lang === 'en' ? 'Image size must not exceed 2MB.' : 'Размер изображения не должен превышать 2МБ.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setAvatarLoading(true);
      const res = await axios.post('/api/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.data && res.data.url) {
        loginUser(token, { ...user, avatar_url: res.data.url });
        showToast(lang === 'az' ? 'Profil şəkli yeniləndi!' : lang === 'en' ? 'Profile picture updated!' : 'Аватар успешно обновлен!', 'success');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || (lang === 'az' ? 'Profil şəkli yüklənərkən xəta baş verdi.' : lang === 'en' ? 'Failed to upload profile picture.' : 'Не удалось загрузить аватар.');
      showToast(errMsg, 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto my-8 px-4">
      {/* Profile Info Header Card */}
      <div className="bg-[#171817] border border-[#242624] p-6 md:p-8 rounded-3xl shadow-xl mb-8 flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex flex-col md:flex-row items-center gap-5">
          <div className="relative group/avatar cursor-pointer">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#c3d6cc] text-[#111211] font-bold text-3xl flex items-center justify-center font-display uppercase shadow-lg shadow-black/20 border border-[#242624]">
              {avatarLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#111211] border-t-transparent" />
              ) : user.avatar_url ? (
                <img 
                  src={resolveImageUrl(user.avatar_url)} 
                  alt={user.fullname} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                user.fullname.split(' ').map(n => n[0]).join('').substring(0, 2)
              )}
            </div>
            {/* Edit / Camera Overlay */}
            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center rounded-2xl transition-opacity cursor-pointer">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                className="hidden" 
                onChange={handleAvatarUpload} 
                disabled={avatarLoading}
              />
            </label>
          </div>
          <div className="text-center md:text-left space-y-1">
            <h1 className="text-2xl font-bold font-display text-slate-100">{user.fullname}</h1>
            <p className="text-xs text-slate-400 font-medium">
              {lang === 'ru' ? 'Пользователь платформы' : lang === 'en' ? 'Platform member' : 'Platforma üzvü'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-550" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-550" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            navigateTo('/');
            setTimeout(() => {
              if (openCreateForm) openCreateForm();
            }, 100);
          }}
          className="bg-[#d2e2db] hover:bg-[#c3d6cc] text-[#111211] font-bold px-6 py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-black/15 w-full md:w-auto"
        >
          {lang === 'ru' ? 'Разместить услугу' : lang === 'en' ? 'Post a service' : 'Elan yerləşdir'}
        </button>
      </div>

      {/* User's Listings Section */}
      <h2 className="text-lg font-bold font-display text-white mb-6 uppercase tracking-wider border-b border-[#242624] pb-2">
        {lang === 'ru' ? 'Мои объявления' : lang === 'en' ? 'My Listings' : 'Mənim elanlarım'}
      </h2>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6 animate-pulse">
          <div className="h-44 bg-slate-800 rounded-2xl"></div>
          <div className="h-44 bg-slate-800 rounded-2xl"></div>
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {listings.map(ad => (
            <div
              key={ad.id}
              className="bg-[#171817] border border-[#242624] rounded-2xl p-6 shadow-md flex flex-col justify-between relative group hover:border-[#353835] transition-colors"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="bg-[#111211] border border-[#242624] text-[9px] uppercase font-bold tracking-wider text-slate-400 px-2.5 py-1 rounded">
                    {getCategoryTranslation(ad.category, lang)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {new Date(ad.created_at).toLocaleDateString(lang === 'az' ? 'az-AZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                
                <h3
                  onClick={() => navigateTo(`/listing/${ad.id}`)}
                  className="text-base font-bold text-white mb-2 cursor-pointer hover:text-[#c3d6cc] transition-colors truncate"
                >
                  {ad.title}
                </h3>
                
                <p className="text-slate-450 text-xs leading-relaxed line-clamp-2 mb-4">
                  {ad.description}
                </p>
              </div>

              <div className="border-t border-[#242624] pt-4 flex justify-between items-center">
                <span className="text-base font-black text-[#c3d6cc] font-display">
                  {ad.price} <span className="text-[10px] font-bold text-slate-450 uppercase">AZN</span>
                </span>

                {confirmDeleteId === ad.id ? (
                  <div className="flex items-center gap-2 animate-fadeIn">
                    <button
                      onClick={() => handleDelete(ad.id)}
                      disabled={deletingId === ad.id}
                      className="bg-rose-900/40 hover:bg-rose-900 border border-rose-800 text-rose-200 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      {deletingId === ad.id ? '...' : (lang === 'ru' ? 'Да' : lang === 'en' ? 'Yes' : 'Bəli')}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="bg-[#111211] border border-[#242624] text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      {lang === 'ru' ? 'Нет' : lang === 'en' ? 'No' : 'Xeyr'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(ad.id)}
                    className="p-2 bg-[#111211] border border-[#242624] hover:border-rose-900/50 hover:bg-rose-950/20 text-slate-450 hover:text-rose-400 rounded-xl transition-all cursor-pointer group"
                    title="Delete listing"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:scale-105" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#171817]/40 border border-[#242624] rounded-3xl p-12 text-center max-w-md mx-auto mt-6">
          <div className="w-16 h-16 bg-[#171817] border border-[#242624] rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl text-slate-500">
            📭
          </div>
          <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">
            {lang === 'ru' ? 'Объявлений пока нет' : lang === 'en' ? 'No Listings Yet' : 'Hələ elan yoxdur'}
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed mb-6">
            {lang === 'ru'
              ? 'Вы еще не опубликовали ни одного объявления. Поделитесь своими услугами прямо сейчас!'
              : lang === 'en'
              ? 'You have not created any listings yet. Post your first service now!'
              : 'Siz hələ heç bir elan yerləşdirməmisiniz. İlk xidmət elanınızı indi paylaşın!'}
          </p>
          <button
            onClick={() => {
              navigateTo('/');
              setTimeout(() => {
                if (openCreateForm) openCreateForm();
              }, 100);
            }}
            className="bg-[#d2e2db] hover:bg-[#c3d6cc] text-[#111211] font-bold px-5 py-2.5 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            {lang === 'ru' ? 'Создать объявление' : lang === 'en' ? 'Create a Listing' : 'İlk elanı yerləşdir'}
          </button>
        </div>
      )}
    </div>
  );
}

export default Profile;
