import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ListingDetail({ id, t, navigateTo, lang, showToast, getCategoryTranslation }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showContacts, setShowContacts] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/listings/${id}`);
        setListing(res.data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || t('toastErrorLoadAds') || 'Error loading listing');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id, t]);

  const copyToClipboard = (text, typeKey) => {
    navigator.clipboard.writeText(text);
    const label = typeKey === 'email' ? 'Email' : t('phoneLabel') || 'Phone';
    showToast(`${label} copied!`, 'success');
  };

  // Helper to get category illustration
  const getCategoryIllustration = (category) => {
    const normalCategory = category || 'Другое';
    
    // SVG styles
    const svgClass = "w-full h-full object-cover text-[#c3d6cc] opacity-80 transition-transform duration-500 hover:scale-105";

    switch (normalCategory) {
      case 'Ремонт и строительство':
        return (
          <svg className={svgClass} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#171817" />
            <path d="M20 70 L50 30 L80 70 Z" stroke="#c3d6cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M50 30 L50 70" stroke="#c3d6cc" strokeWidth="2" strokeDasharray="3 3" />
            <rect x="42" y="55" width="16" height="15" stroke="#c3d6cc" strokeWidth="2" fill="#111211" />
            <circle cx="28" cy="40" r="3" fill="#c3d6cc" />
            <circle cx="72" cy="40" r="5" fill="#c3d6cc" />
          </svg>
        );
      case 'Репетиторы и обучение':
        return (
          <svg className={svgClass} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#171817" />
            <path d="M30 35 H70 V65 H30 Z" stroke="#c3d6cc" strokeWidth="2" strokeLinejoin="round" />
            <path d="M25 40 L30 35" stroke="#c3d6cc" strokeWidth="2" />
            <path d="M75 40 L70 35" stroke="#c3d6cc" strokeWidth="2" />
            <path d="M25 60 L30 65" stroke="#c3d6cc" strokeWidth="2" />
            <path d="M75 60 L70 65" stroke="#c3d6cc" strokeWidth="2" />
            <circle cx="50" cy="50" r="8" stroke="#c3d6cc" strokeWidth="2" />
            <line x1="50" y1="35" x2="50" y2="42" stroke="#c3d6cc" strokeWidth="2" />
            <line x1="50" y1="58" x2="50" y2="65" stroke="#c3d6cc" strokeWidth="2" />
          </svg>
        );
      case 'IT и фриланс':
        return (
          <svg className={svgClass} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#171817" />
            <rect x="25" y="30" width="50" height="32" rx="3" stroke="#c3d6cc" strokeWidth="2" />
            <path d="M20 68 H80 L75 62 H25 Z" fill="#c3d6cc" />
            <line x1="50" y1="62" x2="50" y2="68" stroke="#c3d6cc" strokeWidth="2" />
            <path d="M40 42 L35 46 L40 50" stroke="#111211" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M60 42 L65 46 L60 50" stroke="#111211" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="52" y1="41" x2="48" y2="51" stroke="#111211" strokeWidth="2" />
          </svg>
        );
      case 'Уборка и клининг':
        return (
          <svg className={svgClass} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#171817" />
            <circle cx="50" cy="50" r="18" stroke="#c3d6cc" strokeWidth="2" strokeDasharray="4 2" />
            <path d="M35 50 C35 41.7157 41.7157 35 50 35 C58.2843 35 65 41.7157 65 50" stroke="#c3d6cc" strokeWidth="2" strokeLinecap="round" />
            <circle cx="42" cy="45" r="2" fill="#c3d6cc" />
            <circle cx="58" cy="45" r="2" fill="#c3d6cc" />
            <path d="M46 54 Q50 57 54 54" stroke="#c3d6cc" strokeWidth="2" strokeLinecap="round" />
            <path d="M72 25 L70 30 L75 29 Z" fill="#c3d6cc" />
            <path d="M25 72 L30 70 L29 75 Z" fill="#c3d6cc" />
          </svg>
        );
      case 'Авто и транспорт':
        return (
          <svg className={svgClass} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#171817" />
            <rect x="25" y="45" width="50" height="18" rx="4" stroke="#c3d6cc" strokeWidth="2" fill="#111211" />
            <path d="M32 45 L38 32 H62 L68 45 Z" stroke="#c3d6cc" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="36" cy="63" r="6" stroke="#c3d6cc" strokeWidth="2" fill="#171817" />
            <circle cx="64" cy="63" r="6" stroke="#c3d6cc" strokeWidth="2" fill="#171817" />
            <circle cx="36" cy="63" r="2" fill="#c3d6cc" />
            <circle cx="64" cy="63" r="2" fill="#c3d6cc" />
          </svg>
        );
      case 'Красота и здоровье':
        return (
          <svg className={svgClass} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#171817" />
            <path d="M50 25 C45 35 30 45 30 55 C30 66 39 75 50 75 C61 75 70 66 70 55 C70 45 55 35 50 25 Z" stroke="#c3d6cc" strokeWidth="2" strokeLinejoin="round" />
            <path d="M50 35 V70" stroke="#c3d6cc" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="50" cy="55" r="6" stroke="#c3d6cc" strokeWidth="2" fill="#171817" />
          </svg>
        );
      default:
        return (
          <svg className={svgClass} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#171817" />
            <circle cx="50" cy="50" r="20" stroke="#c3d6cc" strokeWidth="2" />
            <path d="M50 20 V80 M20 50 H80" stroke="#c3d6cc" strokeWidth="1.5" />
            <path d="M35 35 L65 65 M35 65 L65 35" stroke="#c3d6cc" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-800 rounded mb-8"></div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-64 bg-slate-800 rounded-2xl"></div>
          <div className="space-y-4">
            <div className="h-4 w-24 bg-slate-800 rounded"></div>
            <div className="h-8 w-full bg-slate-800 rounded"></div>
            <div className="h-6 w-32 bg-slate-800 rounded"></div>
            <div className="h-20 w-full bg-slate-800 rounded"></div>
            <div className="h-12 w-full bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-[#171817] border border-[#242624] rounded-2xl">
        <div className="text-rose-400 text-3xl mb-4">⚠️</div>
        <h3 className="text-lg font-bold text-white mb-2">
          {lang === 'ru' ? 'Ошибка загрузки' : lang === 'en' ? 'Failed to Load' : 'Yükləmə xətası'}
        </h3>
        <p className="text-xs text-slate-500 mb-6">{error || 'Listing not found'}</p>
        <button
          onClick={() => navigateTo('/')}
          className="bg-[#d2e2db] hover:bg-[#c3d6cc] text-[#111211] font-bold px-6 py-2.5 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
        >
          {lang === 'ru' ? 'Назад к списку' : lang === 'en' ? 'Back to list' : 'Siyahıya qayıt'}
        </button>
      </div>
    );
  }

  const localizedCategory = getCategoryTranslation(listing.category, lang);
  const formattedDate = new Date(listing.created_at).toLocaleDateString(
    lang === 'az' ? 'az-AZ' : lang === 'ru' ? 'ru-RU' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <div className="max-w-4xl mx-auto my-8 px-4">
      {/* Back Button */}
      <button
        onClick={() => navigateTo('/')}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors mb-6 group cursor-pointer"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>{lang === 'ru' ? 'Назад к объявлениям' : lang === 'en' ? 'Back to listings' : 'Siyahıya qayıt'}</span>
      </button>

      {/* Main Content Card */}
      <div className="grid md:grid-cols-2 gap-8 bg-[#171817] border border-[#242624] p-6 md:p-8 rounded-3xl shadow-xl">
        {/* Left Column: Visual Image Block */}
        <div className="relative aspect-square md:aspect-auto md:h-[380px] rounded-2xl overflow-hidden border border-[#242624] bg-[#111211] flex items-center justify-center">
          {getCategoryIllustration(listing.category)}
          <span className="absolute bottom-4 left-4 bg-[#111211]/90 backdrop-blur border border-[#242624] text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 py-1.5 rounded-full">
            {localizedCategory}
          </span>
        </div>

        {/* Right Column: Information details */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Category and Date Header */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              <span>{localizedCategory}</span>
              <span>{formattedDate}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold font-display text-slate-100 leading-tight">
              {listing.title}
            </h1>

            {/* Price badge */}
            <div className="inline-flex items-baseline gap-1 text-2xl font-black text-[#c3d6cc] font-display">
              <span>{listing.price}</span>
              <span className="text-sm font-semibold tracking-wider text-slate-400">AZN</span>
            </div>

            {/* Description Divider */}
            <div className="border-t border-[#242624]/60 pt-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {lang === 'ru' ? 'Описание услуги' : lang === 'en' ? 'Description' : 'Təsvir'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line bg-[#111211]/40 p-4 rounded-xl border border-[#242624]/30">
                {listing.description}
              </p>
            </div>
          </div>

          {/* Author and Contacts Block */}
          <div className="border-t border-[#242624] pt-5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              {lang === 'ru' ? 'Исполнитель' : lang === 'en' ? 'Provider' : 'Usta'}
            </h3>

            {/* Author Profile card */}
            <div className="flex items-center gap-3 bg-[#111211] p-3 rounded-2xl border border-[#242624]/50 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#c3d6cc] text-[#111211] font-bold text-sm flex items-center justify-center font-display uppercase">
                {listing.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">{listing.name}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">
                  {lang === 'ru' ? 'Проверенный автор' : lang === 'en' ? 'Verified creator' : 'Təsdiqlənmiş istifadəçi'}
                </p>
              </div>
            </div>

            {/* Contacts slide toggle */}
            {!showContacts ? (
              <button
                onClick={() => setShowContacts(true)}
                className="w-full bg-[#d2e2db] hover:bg-[#c3d6cc] text-[#111211] font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-black/10"
              >
                {lang === 'ru' ? 'Показать контакты' : lang === 'en' ? 'Show contacts' : 'Əlaqə məlumatlarını göstər'}
              </button>
            ) : (
              <div className="space-y-2.5 animate-fadeIn">
                {listing.phone && (
                  <div className="flex items-center justify-between bg-[#111211] px-4 py-3 rounded-xl border border-[#242624] text-xs">
                    <span className="text-slate-500">{lang === 'ru' ? 'Телефон:' : lang === 'en' ? 'Phone:' : 'Telefon:'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{listing.phone}</span>
                      <button
                        onClick={() => copyToClipboard(listing.phone, 'phone')}
                        className="text-slate-400 hover:text-[#c3d6cc] transition-colors p-1"
                        title="Copy Phone"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {listing.email && (
                  <div className="flex items-center justify-between bg-[#111211] px-4 py-3 rounded-xl border border-[#242624] text-xs">
                    <span className="text-slate-500">Email:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{listing.email}</span>
                      <button
                        onClick={() => copyToClipboard(listing.email, 'email')}
                        className="text-slate-400 hover:text-[#c3d6cc] transition-colors p-1"
                        title="Copy Email"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {!listing.phone && !listing.email && (
                  <p className="text-center text-slate-500 text-xs py-2">
                    {lang === 'ru' ? 'Контакты не указаны' : lang === 'en' ? 'No contact details available' : 'Əlaqə məlumatı tapılmadı'}
                  </p>
                )}
                <button
                  onClick={() => setShowContacts(false)}
                  className="w-full bg-[#171817] hover:bg-[#111211] border border-[#242624] text-slate-400 hover:text-white text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'ru' ? 'Скрыть контакты' : lang === 'en' ? 'Hide contacts' : 'Əlaqə məlumatlarını gizlə'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListingDetail;
