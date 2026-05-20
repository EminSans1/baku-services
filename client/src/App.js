import React, { useEffect, useState, useCallback, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import ListingDetail from './components/ListingDetail';
import Profile from './components/Profile';
import ImageUploader from './components/ImageUploader';
import { parseAdImages, resolveImageUrl } from './utils/imageUrl';

const CATEGORIES = [
  'Ремонт и строительство',
  'Репетиторы и обучение',
  'IT и фриланс',
  'Уборка и клининг',
  'Авто и транспорт',
  'Красота и здоровье',
  'Другое'
];

const PRODUCT_CATEGORIES = [
  'Электроника',
  'Одежда и аксессуары',
  'Дом и сад',
  'Мебель и интерьер',
  'Авто и запчасти',
  'Хобби и спорт',
  'Книги и обучение',
  'Другое'
];

const TRANSLATIONS = {
  az: {
    showcase: 'Vitrin',
    adminPanel: 'İdarəetmə paneli',
    boardActiveNotice: '🔒 Yeni elanların yerləşdirilməsi müvəqqəti olaraq admin tərəfindən dayandırılıb.',
    postNewServiceTitle: '✨ Yeni xidmət paylaş',
    yourName: 'Adınız',
    namePlaceholder: 'Məsələn, Elçin',
    category: 'Kateqoriya',
    serviceTitle: 'Xidmətin adı',
    servicePlaceholder: 'Məsələn, Paltaryuyan maşınların təmiri',
    price: 'Qiymət',
    detailedDescription: 'Ətraflı təsvir',
    descPlaceholder: 'Bacarıqlarınızı, qiymətlərinizi, şərtlərinizi və əlaqə məlumatlarınızı təsvir edin...',
    cancel: 'Ləğv et',
    publish: 'Paylaş',
    findMasterPlaceholder: 'Usta və ya xidmət tap...',
    sortBy: 'Sıralama:',
    sortNewest: 'Yeni elanlar',
    sortOldest: 'Köhnə elanlar',
    sortPriceAsc: 'Qiymət: Azdan çoxa',
    sortPriceDesc: 'Qiymət: Çoxdan aza',
    allCategories: 'Bütün kateqoriyalar',
    listingsInBaku: 'Bakıda elanlar',
    totalResults: 'Ümumi nəticə',
    provider: 'İcraçı',
    nothingFound: 'Heç nə tapılmadı',
    nothingFoundDesc: 'Axtarışı dəqiqləşdirməyə çalışın və ya digər kateqoriyanı seçin.',
    resetFilters: 'Filtrləri sıfırla',
    overview: 'İcmal',
    categoryPopularity: 'Kateqoriyaların populyarlığı',
    activeListingsBySegment: 'Seqmentlər üzrə aktiv elanların sayı',
    allServices: 'Bütün xidmətlər',
    boardStatus: 'Lövhənin vəziyyəti',
    listingSubmission: 'Elan yerləşdirilməsi',
    openForPosting: 'Paylaşıma açıqdır',
    suspendedByAdmin: 'Admin tərəfindən dayandırılıb',
    totalOffers: 'Ümumi təkliflər',
    bulletinBoard: 'Elan lövhəsi',
    activeListingsInDb: 'bazadakı aktiv elanlar',
    recentListings: 'Son elanlar',
    lastPublishedServices: 'Son paylaşılan xidmətlər',
    averagePrice: 'Orta qiymət',
    averageCostPerService: 'Ustanın orta çeki',
    priceDynamics: 'Qiymət dinamikası',
    contentModeration: 'Məzmuna nəzarət',
    fullListingsDesc: 'Düzəliş etmək və silmək imkanı ilə bazadakı bütün təkliflərin siyahısı',
    fastSearchDb: 'Bazadan sürətli axtarış...',
    actions: 'Əməliyyatlar',
    editShort: 'Red.',
    deleteShort: 'Sil',
    editListingTitle: 'Elanın redaktə edilməsi',
    editListingParams: 'Elan parametrlərinə düzəliş edilməsi',
    save: 'Yadda saxla',
    controlPanel: 'İdarəetmə paneli',
    enterAdminPassword: 'Səlahiyyətləndirmə üçün admin şifrəsini daxil edin',
    passwordLabel: 'Şifrə',
    loginBtn: 'Daxil ol',
    deleteConfirm: 'Bu elanı silmək istədiyinizdən əminsiniz?',
    toastAddSuccess: 'Elan uğurla əlavə edildi!',
    toastEditSuccess: 'Elan uğurla dəyişdirildi!',
    toastDeleteSuccess: 'Elan uğurla silindi',
    toastLoginSuccess: 'Admin olaraq uğurla daxil oldunuz',
    toastLogoutSuccess: 'Admin rejimindən çıxdınız',
    toastToggleBoard: 'Elanların paylanması aktivləşdirildi',
    toastToggleBoardOff: 'Elanların paylanması dayandırıldı',
    doubleClickTitle: 'Giriş üçün ikiqat klikləyin',
    toastAdminActivatedDoubleClick: 'Admin rejimi ikiqat kliklə aktivləşdirildi',
    toastErrorLoadAds: 'Elanlar yüklənərkən xəta baş verdi',
    toastErrorAddAd: 'Elan əlavə edilərkən xəta baş verdi',
    toastErrorEditAd: 'Düzəliş edilərkən xəta baş verdi',
    toastErrorDeleteAd: 'Elan silinərkən xəta baş verdi',
    toastErrorToggleBoard: 'Lövhə statusunu dəyişərkən xəta baş verdi',
    toastErrorLogin: 'Yanlış admin şifrəsi',
    postServiceBtn: 'Elan yerləşdir',
    hideFormBtn: 'Formu gizlə',
    boardOpenBadge: 'Elanlar açıqdır',
    postingDisabledBadge: 'Paylaşımlar dayandırılıb',
    logoutBtn: 'Çıxış',
    averageAzn: 'AZN / xidmət',
    recentTitle: 'Son elanlar',
    id: 'ID',
    titleHeader: 'Xidmət / Başlıq',
    categoryHeader: 'Kateqoriya',
    authorHeader: 'İcraçı',
    priceHeader: 'Qiymət',
    actionsHeader: 'Əməliyyatlar',
    loginTitle: 'Giriş',
    registerTitle: 'Qeydiyyat',
    fullnameLabel: 'Tam adınız',
    emailLabel: 'E-poçt',
    phoneLabel: 'Telefon nömrəsi',
    confirmPasswordLabel: 'Şifrənin təsdiqi',
    haveAccount: 'Artıq hesabınız var? Daxil olun',
    noAccount: 'Hesabınız yoxdur? Qeydiyyatdan keçin',
    loginSuccessToast: 'Uğurla daxil oldunuz!',
    registerSuccessToast: 'Qeydiyyat uğurla tamamlandı!',
    logoutSuccessToast: 'Hesabdan çıxış edildi',
    passwordsDontMatch: 'Şifrələr uyğun gəlmir!',
    authRequiredNotice: 'Elan yerləşdirmək üçün hesabınıza daxil olmalısınız.',
    loginButtonHeader: 'Giriş',
    registerButtonHeader: 'Qeydiyyat',
    logoutButtonHeader: 'Çıxış',
    servicesTab: 'Xidmətlər',
    marketplaceTab: 'Baraxolka',
    typeLabel: 'Elanın növü',
    conditionLabel: 'Vəziyyəti',
    conditionNew: 'Yeni',
    conditionUsed: 'İşlənmiş',
    tradePossibleLabel: 'Barter mümkündür',
    priceTypeLabel: 'Qiymət növü',
    priceFixed: 'Sabit qiymət',
    priceNegotiable: 'Razılaşma yolu ilə',
    postNewProductTitle: '🛍️ Yeni məhsul yerləşdir',
    titlePlaceholderProduct: 'Məsələn, iPhone 14 Pro, əla vəziyyətdə',
    descPlaceholderProduct: 'Məhsulu təsvir edin: vəziyyəti, dəsti, zəmanəti və əlaqə məlumatları...',
    uploadAdImages: 'Şəkilləri yüklə',
    uploadAdImagesLimit: 'Ən çoxu 5 şəkil (JPG, PNG, WEBP, hər biri < 5MB)',
    typeService: 'Xidmət',
    typeProduct: 'Məhsul',
    filterAllTypes: 'Hamısı',
    avatarUploadSuccess: 'Profil şəkli yeniləndi!',
    avatarUploadError: 'Profil şəkli yüklənərkən xəta',
    uploadAvatarLabel: 'Profil şəkli (istəyə görə)'
  },
  en: {
    showcase: 'Showcase',
    adminPanel: 'Admin Panel',
    boardActiveNotice: '🔒 Posting new listings has been temporarily suspended by the administrator.',
    postNewServiceTitle: '✨ Post a New Service',
    yourName: 'Your Name',
    namePlaceholder: 'e.g. John Doe',
    category: 'Category',
    serviceTitle: 'Service Title',
    servicePlaceholder: 'e.g. Washing machine repair',
    price: 'Price',
    detailedDescription: 'Detailed Description',
    descPlaceholder: 'Describe your skills, prices, terms, and contact info...',
    cancel: 'Cancel',
    publish: 'Publish',
    findMasterPlaceholder: 'Find a master or service...',
    sortBy: 'Sort by:',
    sortNewest: 'Newest listings',
    sortOldest: 'Oldest listings',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    allCategories: 'All Categories',
    listingsInBaku: 'Listings in Baku',
    totalResults: 'Total results',
    provider: 'Provider',
    nothingFound: 'Nothing found',
    nothingFoundDesc: 'Try adjusting your search or select a different category.',
    resetFilters: 'Reset filters',
    overview: 'Overview',
    categoryPopularity: 'Category Popularity',
    activeListingsBySegment: 'Active listings by segment',
    allServices: 'All Services',
    boardStatus: 'Board Status',
    listingSubmission: 'Listing Submission',
    openForPosting: 'Open for posting',
    suspendedByAdmin: 'Suspended by admin',
    totalOffers: 'Total Offers',
    bulletinBoard: 'Bulletin Board',
    activeListingsInDb: 'active listings in database',
    recentListings: 'Recent Listings',
    lastPublishedServices: 'Last published services',
    averagePrice: 'Average Price',
    averageCostPerService: 'Average cost per service',
    priceDynamics: 'Price Dynamics',
    contentModeration: 'Content Moderation',
    fullListingsDesc: 'Full list of database listings with options to edit and delete',
    fastSearchDb: 'Fast search in database...',
    actions: 'Actions',
    editShort: 'Edit',
    deleteShort: 'Delete',
    editListingTitle: 'Edit Listing',
    editListingParams: 'Editing listing parameters',
    save: 'Save',
    controlPanel: 'Control Panel',
    enterAdminPassword: 'Enter administrator password for authorization',
    passwordLabel: 'Password',
    loginBtn: 'Login',
    deleteConfirm: 'Are you sure you want to delete this listing?',
    toastAddSuccess: 'Listing added successfully!',
    toastEditSuccess: 'Listing updated successfully!',
    toastDeleteSuccess: 'Listing deleted successfully',
    toastLoginSuccess: 'Successfully logged in as administrator',
    toastLogoutSuccess: 'Logged out of admin mode',
    toastToggleBoard: 'Listing submission enabled',
    toastToggleBoardOff: 'Listing submission disabled',
    doubleClickTitle: 'Double click to login',
    toastAdminActivatedDoubleClick: 'Admin mode activated via double click',
    toastErrorLoadAds: 'Error loading listings',
    toastErrorAddAd: 'Error adding listing',
    toastErrorEditAd: 'Error editing listing',
    toastErrorDeleteAd: 'Error deleting listing',
    toastErrorToggleBoard: 'Error changing board status',
    toastErrorLogin: 'Incorrect admin password',
    postServiceBtn: 'Post Service',
    hideFormBtn: 'Hide Form',
    boardOpenBadge: 'Board open',
    postingDisabledBadge: 'Posting disabled',
    logoutBtn: 'Logout',
    averageAzn: 'AZN / service',
    recentTitle: 'Recent Listings',
    id: 'ID',
    titleHeader: 'Service / Title',
    categoryHeader: 'Category',
    authorHeader: 'Provider',
    priceHeader: 'Price',
    actionsHeader: 'Actions',
    loginTitle: 'Login',
    registerTitle: 'Register',
    fullnameLabel: 'Full Name',
    emailLabel: 'Email',
    phoneLabel: 'Phone Number',
    confirmPasswordLabel: 'Confirm Password',
    haveAccount: 'Already have an account? Login',
    noAccount: "Don't have an account? Register",
    loginSuccessToast: 'Logged in successfully!',
    registerSuccessToast: 'Registered successfully!',
    logoutSuccessToast: 'Logged out successfully',
    passwordsDontMatch: 'Passwords do not match!',
    authRequiredNotice: 'You must be logged in to post a listing.',
    loginButtonHeader: 'Login',
    registerButtonHeader: 'Register',
    logoutButtonHeader: 'Logout',
    servicesTab: 'Services',
    marketplaceTab: 'Marketplace',
    typeLabel: 'Listing Type',
    conditionLabel: 'Condition',
    conditionNew: 'New',
    conditionUsed: 'Used',
    tradePossibleLabel: 'Swap possible',
    priceTypeLabel: 'Price Type',
    priceFixed: 'Fixed Price',
    priceNegotiable: 'Negotiable',
    postNewProductTitle: '🛍️ Post a New Product',
    titlePlaceholderProduct: 'e.g. iPhone 14 Pro, excellent condition',
    descPlaceholderProduct: 'Describe the product: condition, set, warranty, contact info...',
    uploadAdImages: 'Upload images',
    uploadAdImagesLimit: 'Up to 5 images (JPG, PNG, WEBP, each < 5MB)',
    typeService: 'Service',
    typeProduct: 'Product',
    filterAllTypes: 'All types',
    avatarUploadSuccess: 'Profile picture updated!',
    avatarUploadError: 'Failed to upload profile picture',
    uploadAvatarLabel: 'Profile photo (optional)'
  },
  ru: {
    showcase: 'Витрина',
    adminPanel: 'Панель управления',
    boardActiveNotice: '🔒 Публикация новых объявлений временно приостановлена администратором.',
    postNewServiceTitle: '✨ Опубликовать новую услугу',
    yourName: 'Ваше имя',
    namePlaceholder: 'Например, Эльчин',
    category: 'Категория',
    serviceTitle: 'Название услуги',
    servicePlaceholder: 'Например, Ремонт стиральных машин',
    price: 'Цена',
    detailedDescription: 'Подробное описание',
    descPlaceholder: 'Опишите ваши навыки, цены, условия и контактную информацию...',
    cancel: 'Отмена',
    publish: 'Опубликовать',
    findMasterPlaceholder: 'Найти мастера или услугу...',
    sortBy: 'Сортировка:',
    sortNewest: 'Новые объявления',
    sortOldest: 'Старые объявления',
    sortPriceAsc: 'Цены: по возрастанию',
    sortPriceDesc: 'Цены: по убыванию',
    allCategories: 'Все категории',
    listingsInBaku: 'Объявления в Баку',
    totalResults: 'Всего результатов',
    provider: 'Исполнитель',
    nothingFound: 'Ничего не найдено',
    nothingFoundDesc: 'Попробуйте скорректировать запрос или выбрать другую категорию.',
    resetFilters: 'Сбросить фильтры',
    overview: 'Обзор',
    categoryPopularity: 'Популярность категорий',
    activeListingsBySegment: 'Количество активных объявлений по сегментам',
    allServices: 'Всего услуг',
    boardStatus: 'Состояние доски',
    listingSubmission: 'Подача объявлений',
    openForPosting: 'Открыта для публикации',
    suspendedByAdmin: 'Отключена администратором',
    totalOffers: 'Всего предложений',
    bulletinBoard: 'Доска объявлений',
    activeListingsInDb: 'активных объявлений в базе',
    recentListings: 'Свежие объявления',
    lastPublishedServices: 'Последние опубликованные услуги',
    averagePrice: 'Средняя стоимость',
    averageCostPerService: 'Средний чек мастера',
    priceDynamics: 'Динамика цен',
    contentModeration: 'Управление контентом',
    fullListingsDesc: 'Полный список всех предложений в базе с возможностью редактирования и удаления',
    fastSearchDb: 'Быстрый поиск в базе...',
    actions: 'Действия',
    editShort: 'Ред.',
    deleteShort: 'Удалить',
    editListingTitle: 'Редактирование объявления',
    editListingParams: 'Редактирование параметров объявления',
    save: 'Сохранить',
    controlPanel: 'Панель управления',
    enterAdminPassword: 'Введите пароль администратора для авторизации',
    passwordLabel: 'Пароль',
    loginBtn: 'Войти',
    deleteConfirm: 'Вы уверены, что хотите удалить это объявление?',
    toastAddSuccess: 'Объявление успешно добавлено!',
    toastEditSuccess: 'Объявление успешно изменено!',
    toastDeleteSuccess: 'Объявление успешно удалено',
    toastLoginSuccess: 'Вы успешно вошли как администратор',
    toastLogoutSuccess: 'Вы вышли из режима администратора',
    toastToggleBoard: 'Публикация объявлений включена',
    toastToggleBoardOff: 'Публикация объявлений отключена',
    doubleClickTitle: 'Двойной клик для входа',
    toastAdminActivatedDoubleClick: 'Режим администратора активирован по двойному клику',
    toastErrorLoadAds: 'Ошибка при загрузке объявлений',
    toastErrorAddAd: 'Ошибка при добавлении объявления',
    toastErrorEditAd: 'Ошибка при редактировании',
    toastErrorDeleteAd: 'Ошибка при удалении объявления',
    toastErrorToggleBoard: 'Ошибка при переключении статуса доски',
    toastErrorLogin: 'Неверный пароль администратора',
    postServiceBtn: 'Разместить услугу',
    hideFormBtn: 'Скрыть форму',
    boardOpenBadge: 'Доска открыта',
    postingDisabledBadge: 'Публикация отключена',
    logoutBtn: 'Выйти из админки',
    averageAzn: 'AZN / услуга',
    recentTitle: 'Свежие объявления',
    id: 'ID',
    titleHeader: 'Услуга / Заголовок',
    categoryHeader: 'Категория',
    authorHeader: 'Исполнитель',
    priceHeader: 'Стоимость',
    actionsHeader: 'Действия',
    loginTitle: 'Вход',
    registerTitle: 'Регистрация',
    fullnameLabel: 'Полное имя',
    emailLabel: 'Электронная почта',
    phoneLabel: 'Номер телефона',
    confirmPasswordLabel: 'Подтвердите пароль',
    haveAccount: 'Уже есть аккаунт? Войдите',
    noAccount: 'Нет аккаунта? Зарегистрируйтесь',
    loginSuccessToast: 'Вы успешно вошли!',
    registerSuccessToast: 'Регистрация успешно завершена!',
    logoutSuccessToast: 'Вы успешно вышли из аккаунта',
    passwordsDontMatch: 'Пароли не совпадают!',
    authRequiredNotice: 'Для размещения объявления необходимо войти в аккаунт.',
    loginButtonHeader: 'Войти',
    registerButtonHeader: 'Регистрация',
    logoutButtonHeader: 'Выйти',
    servicesTab: 'Услуги',
    marketplaceTab: 'Барахолка',
    typeLabel: 'Тип объявления',
    conditionLabel: 'Состояние',
    conditionNew: 'Новое',
    conditionUsed: 'Б/У',
    tradePossibleLabel: 'Возможен обмен',
    priceTypeLabel: 'Тип цены',
    priceFixed: 'Фиксированная',
    priceNegotiable: 'Договорная',
    postNewProductTitle: '🛍️ Разместить новый товар',
    titlePlaceholderProduct: 'Например, iPhone 14 Pro, в отличном состоянии',
    descPlaceholderProduct: 'Опишите товар: состояние, комплект, гарантия, контакты...',
    uploadAdImages: 'Загрузить фотографии',
    uploadAdImagesLimit: 'До 5 изображений (JPG, PNG, WEBP, каждое < 5МБ)',
    typeService: 'Услуга',
    typeProduct: 'Товар',
    filterAllTypes: 'Все типы',
    avatarUploadSuccess: 'Аватар успешно обновлён!',
    avatarUploadError: 'Не удалось загрузить аватар',
    uploadAvatarLabel: 'Фото профиля (необязательно)'
  }
};

const getCategoryTranslation = (categoryName, lang) => {
  const mapping = {
    'Все': { az: 'Hamısı', en: 'All', ru: 'Все' },
    'Ремонт и строительство': { az: 'Təmir və tikinti', en: 'Repair & Construction', ru: 'Ремонт и строительство' },
    'Репетиторы и обучение': { az: 'Repetitor və təhsil', en: 'Tutors & Education', ru: 'Репетиторы и обучение' },
    'IT и фриланс': { az: 'İT və frilans', en: 'IT & Freelance', ru: 'IT и фриланс' },
    'Уборка и клининг': { az: 'Təmizlik xidməti', en: 'Cleaning & Housekeeping', ru: 'Уборка и клининг' },
    'Авто и транспорт': { az: 'Avto və nəqliyyat', en: 'Auto & Transport', ru: 'Авто и транспорт' },
    'Красота и здоровье': { az: 'Gözəllik və sağlamlıq', en: 'Beauty & Health', ru: 'Красота и здоровье' },
    'Другое': { az: 'Digər', en: 'Other', ru: 'Другое' },
    'Электроника': { az: 'Elektronika', en: 'Electronics', ru: 'Электроника' },
    'Одежда и аксессуары': { az: 'Geyim və aksesuarlar', en: 'Clothing & Accessories', ru: 'Одежда и аксессуары' },
    'Дом и сад': { az: 'Ev və bağ', en: 'Home & Garden', ru: 'Дом и сад' },
    'Хобби и спорт': { az: 'Hobbi və idman', en: 'Hobby & Sport', ru: 'Хобби и спорт' },
    'Книги и обучение': { az: 'Kitab və təhsil', en: 'Books & Learning', ru: 'Книги и обучение' },
    'Мебель и интерьер': { az: 'Mebel və interyer', en: 'Furniture & Interior', ru: 'Мебель и интерьер' },
    'Авто и запчасти': { az: 'Avto və ehtiyat hissələri', en: 'Auto & Parts', ru: 'Авто и запчасти' }
  };
  return mapping[categoryName]?.[lang] || categoryName;
};

const getCategoryShortName = (categoryName, lang) => {
  const mapping = {
    'Ремонт и строительство': { az: 'Təmir', en: 'Repair', ru: 'Ремонт' },
    'Репетиторы и обучение': { az: 'Təhsil', en: 'Tutors', ru: 'Учеба' },
    'IT и фриланс': { az: 'IT', en: 'IT', ru: 'IT' },
    'Уборка и клининг': { az: 'Təmizlik', en: 'Cleaning', ru: 'Клининг' },
    'Авто и транспорт': { az: 'Avto', en: 'Auto', ru: 'Авто' },
    'Красота и здоровье': { az: 'Gözəllik', en: 'Beauty', ru: 'Красота' },
    'Другое': { az: 'Digər', en: 'Other', ru: 'Другое' },
    'Электроника': { az: 'Elektronika', en: 'Electronics', ru: 'Электроника' },
    'Одежда и аксессуары': { az: 'Geyim', en: 'Clothing', ru: 'Одежда' },
    'Дом и сад': { az: 'Ev', en: 'Home', ru: 'Дом' },
    'Хобби и спорт': { az: 'Hobbi', en: 'Hobby', ru: 'Хобби' },
    'Книги и обучение': { az: 'Kitablar', en: 'Books', ru: 'Книги' }
  };
  return mapping[categoryName]?.[lang] || categoryName;
};

const categoryStyles = {
  'Ремонт и строительство': {
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    iconText: '🔨',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    )
  },
  'Репетиторы и обучение': {
    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    iconText: '🎓',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  },
  'IT и фриланс': {
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    iconText: '💻',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  'Уборка и клининг': {
    color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    iconText: '✨',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    )
  },
  'Авто и транспорт': {
    color: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    iconText: '🚗',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    )
  },
  'Красота и здоровье': {
    color: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
    iconText: '💖',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )
  },
  'Другое': {
    color: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    iconText: '📌',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  'Электроника': {
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    iconText: '⚡',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  'Одежда и аксессуары': {
    color: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
    iconText: '👕',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 8h-4.9c-.3 0-.6-.1-.8-.3l-2.6-2.6c-.4-.4-1-.4-1.4 0L8.7 7.7c-.2.2-.5.3-.8.3H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2z" />
      </svg>
    )
  },
  'Дом и сад': {
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    iconText: '🏡',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  'Хобби и спорт': {
    color: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    iconText: '⚽',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  'Книги и обучение': {
    color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    iconText: '📚',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  },
  'Мебель и интерьер': {
    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    iconText: '🛋️',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 10h16v6H4z M6 10V7h12v3" />
      </svg>
    )
  },
  'Авто и запчасти': {
    color: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    iconText: '🚗',
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z M5 11h14l-1-5H6l-1 5z" />
      </svg>
    )
  }
};

function App() {
  const { user, logoutUser } = useContext(AuthContext);
  const [ads, setAds] = useState([]);
  const [form, setForm] = useState({
    name: '',
    title: '',
    category: 'Ремонт и строительство',
    price: '',
    description: '',
    type: 'service',
    condition: 'new',
    trade_possible: false,
    price_type: 'fixed',
    images: []
  });
  const [typeFilter, setTypeFilter] = useState('all');
  const [adminTypeFilter, setAdminTypeFilter] = useState('all');
  const [adminStats, setAdminStats] = useState({ services: 0, products: 0 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [sortBy, setSortBy] = useState('newest');
  const [notification, setNotification] = useState(null);

  // Translation state (defaulting to 'az' - Azerbaijani)
  const [lang, setLang] = useState(() => localStorage.getItem('baku_lang') || 'az');

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('baku_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync theme with system changes if the user hasn't set an explicit preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('baku_theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('baku_theme', nextTheme);
  };

  const t = useCallback((key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['ru']?.[key] || key;
  }, [lang]);

  const navigateTo = useCallback((path) => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new Event('popstate'));
  }, []);

  // View state: 'showcase', 'admin', 'detail', etc.
  const [viewMode, setViewModeState] = useState('showcase');
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginStep, setLoginStep] = useState(1);
  const [admin2faCode, setAdmin2faCode] = useState('');
  const [boardActive, setBoardActive] = useState(true);

  const setViewMode = useCallback((mode) => {
    if (mode === 'showcase') navigateTo('/');
    else if (mode === 'admin') navigateTo('/idare-paneli');
    else if (mode === 'login') navigateTo('/login');
    else if (mode === 'register') navigateTo('/register');
    else if (mode === 'profile') navigateTo('/profile');
    else setViewModeState(mode);
  }, [navigateTo]);

  // Custom router logic
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path === '/idare-paneli') {
        const token = localStorage.getItem('baku_admin_token');
        if (!token) {
          setLoginStep(1);
          setAdminPassword('');
          setAdmin2faCode('');
          setIsLoginModalOpen(true);
          setViewModeState('showcase');
        } else {
          setViewModeState('admin');
        }
      } else if (path === '/login') {
        setViewModeState('login');
      } else if (path === '/register') {
        setViewModeState('register');
      } else if (path === '/profile') {
        setViewModeState('profile');
      } else if (path.startsWith('/listing/')) {
        const match = path.match(/^\/listing\/(\d+)/);
        if (match) {
          setSelectedAdId(parseInt(match[1]));
          setViewModeState('detail');
        } else {
          setViewModeState('showcase');
        }
      } else {
        setViewModeState('showcase');
      }
    };

    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Editing state
  const [editingAd, setEditingAd] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const adminToken = localStorage.getItem('baku_admin_token');
    if (adminToken) {
      return { headers: { Authorization: `Bearer ${adminToken}` } };
    }
    const userToken = localStorage.getItem('baku_user_token');
    if (userToken) {
      return { headers: { Authorization: `Bearer ${userToken}` } };
    }
    return {};
  }, []);

  const fetchAds = useCallback(async () => {
    try {
      const res = await axios.get('/api/ads');
      setAds(res.data);
    } catch (err) {
      console.error(err);
      showToast(t('toastErrorLoadAds'), 'error');
    }
  }, [showToast, t]);

  const fetchBoardStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/board-status');
      setBoardActive(res.data.active);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchAdminStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/stats', getAuthHeaders());
      setAdminStats(res.data);
    } catch (err) {
      console.error('Admin stats error:', err);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchAds();
    fetchBoardStatus();
    const token = localStorage.getItem('baku_admin_token');
    if (token) {
      setIsAdmin(true);
      fetchAdminStats();
    }
  }, [fetchAds, fetchBoardStatus, fetchAdminStats]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminStats();
    }
  }, [isAdmin, ads.length, fetchAdminStats]);

  // Keyboard shortcut listener to toggle admin modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'x' || e.code === 'KeyX' || e.key === 'ч' || e.key === 'Ч')) {
        e.preventDefault();
        setLoginStep(1);
        setAdminPassword('');
        setAdmin2faCode('');
        setIsLoginModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (user) {
        payload.name = user.fullname;
      }
      await axios.post('/api/ads', payload, getAuthHeaders());
      setForm({
        name: '',
        title: '',
        category: 'Ремонт и строительство',
        price: '',
        description: '',
        type: 'service',
        condition: 'new',
        trade_possible: false,
        price_type: 'fixed',
        images: []
      });
      setIsFormOpen(false);
      fetchAds();
      showToast(t('toastAddSuccess'));
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || t('toastErrorAddAd');
      showToast(errorMsg, 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: editingAd.title,
        category: editingAd.category,
        price: editingAd.price,
        description: editingAd.description,
        type: editingAd.type,
        condition: editingAd.condition,
        trade_possible: editingAd.trade_possible,
        price_type: editingAd.price_type,
        images: parseAdImages(editingAd.images),
        name: editingAd.name
      };
      await axios.put(`/api/ads/${editingAd.id}`, payload, getAuthHeaders());
      setEditingAd(null);
      fetchAds();
      showToast(t('toastEditSuccess'));
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || t('toastErrorEditAd');
      showToast(errorMsg, 'error');
    }
  };

  const deleteAd = async (id) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await axios.delete(`/api/ads/${id}`, getAuthHeaders());
      fetchAds();
      showToast(t('toastDeleteSuccess'));
    } catch (err) {
      console.error(err);
      showToast(t('toastErrorDeleteAd'), 'error');
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (loginStep === 1) {
      try {
        const res = await axios.post('/api/admin/verify-password', { password: adminPassword });
        if (res.data.success) {
          setLoginStep(2);
        }
      } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.error || t('toastErrorLogin');
        showToast(errorMsg, 'error');
      }
    } else {
      try {
        const res = await axios.post('/api/admin/login', { password: adminPassword, code: admin2faCode });
        if (res.data.success) {
          localStorage.setItem('baku_admin_token', res.data.token);
          setIsAdmin(true);
          fetchAdminStats();
          setIsLoginModalOpen(false);
          setAdminPassword('');
          setAdmin2faCode('');
          setLoginStep(1);
          setViewMode('admin');
          showToast(t('toastLoginSuccess'));
        }
      } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.error || t('toastErrorLogin');
        showToast(errorMsg, 'error');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('baku_admin_token');
    setIsAdmin(false);
    setViewMode('showcase');
    showToast(t('toastLogoutSuccess'));
  };

  const toggleBoardStatus = async (checked) => {
    try {
      const res = await axios.post('/api/admin/toggle-board', { active: checked }, getAuthHeaders());
      setBoardActive(res.data.active);
      showToast(res.data.active ? t('toastToggleBoard') : t('toastToggleBoardOff'));
    } catch (err) {
      console.error(err);
      showToast(t('toastErrorToggleBoard'), 'error');
    }
  };

  const sortAds = (list) => list.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    }
    if (sortBy === 'price-asc') {
      return parseFloat(a.price || 0) - parseFloat(b.price || 0);
    }
    if (sortBy === 'price-desc') {
      return parseFloat(b.price || 0) - parseFloat(a.price || 0);
    }
    return 0;
  });

  const filteredAds = sortAds(ads
    .filter(ad => {
      const matchesSearch = 
        ad.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Все' || ad.category === selectedCategory;
      const matchesType = typeFilter === 'all' || ad.type === typeFilter;
      return matchesSearch && matchesCategory && matchesType;
    }));

  const adminFilteredAds = sortAds(ads
    .filter(ad => {
      const matchesSearch =
        ad.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Все' || ad.category === selectedCategory;
      const matchesAdminType = adminTypeFilter === 'all' || ad.type === adminTypeFilter;
      return matchesSearch && matchesCategory && matchesAdminType;
    }));

  // Calculate statistics for the admin dashboard
  const getCategoryStats = () => {
    const counts = {};
    const ALL_CATS = Array.from(new Set([...CATEGORIES, ...PRODUCT_CATEGORIES]));
    ALL_CATS.forEach(cat => { counts[cat] = 0; });
    ads.forEach(ad => {
      if (counts[ad.category] !== undefined) {
        counts[ad.category]++;
      } else {
        counts['Другое']++;
      }
    });

    const maxCount = Math.max(...Object.values(counts), 1);
    
    return ALL_CATS.map(cat => ({
      category: cat,
      count: counts[cat],
      percentage: (counts[cat] / maxCount) * 100,
      icon: categoryStyles[cat]?.iconText || '📌',
      shortName: getCategoryShortName(cat, lang)
    }));
  };

  const servicesCount = adminStats.services ?? ads.filter(ad => ad.type === 'service' || !ad.type).length;
  const productsCount = adminStats.products ?? ads.filter(ad => ad.type === 'product').length;
  const servicesAds = ads.filter(ad => ad.type === 'service' || !ad.type);
  const productsAds = ads.filter(ad => ad.type === 'product');

  const servicesAveragePrice = servicesAds.filter(ad => ad.price_type !== 'negotiable').length > 0
    ? Math.round(servicesAds.filter(ad => ad.price_type !== 'negotiable').reduce((sum, ad) => sum + parseFloat(ad.price || 0), 0) / servicesAds.filter(ad => ad.price_type !== 'negotiable').length)
    : 0;

  const productsAveragePrice = productsAds.filter(ad => ad.price_type !== 'negotiable').length > 0
    ? Math.round(productsAds.filter(ad => ad.price_type !== 'negotiable').reduce((sum, ad) => sum + parseFloat(ad.price || 0), 0) / productsAds.filter(ad => ad.price_type !== 'negotiable').length)
    : 0;

  return (
    <div className="min-h-screen bg-[#111211] text-[#e2e8f0] font-sans selection:bg-[#c3d6cc] selection:text-[#111211] pb-16">
      
      {/* Top Navigation Bar matching reference */}
      <header className="border-b border-[#242624] bg-[#111211]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Top Line: Logo/Title & Mobile Controls */}
          <div className="flex items-center justify-between w-full md:w-auto">
            {/* Logo Image & Name with secret Double Click */}
            <div className="flex items-center gap-3 select-none">
              <img 
                src="/logo.png" 
                alt="Baku Services" 
                className="h-10 md:h-12 w-auto object-contain rounded-lg border border-[#242624]" 
              />
              <div className="cursor-pointer" onClick={() => setViewMode('showcase')}>
                <h1 className="text-sm font-bold tracking-tight text-white font-display leading-tight">
                  Baku Services
                </h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-0.5">{t('bulletinBoard')}</p>
              </div>
            </div>

            {/* Mobile-only Top Right controls: Language & Profile */}
            <div className="flex items-center gap-2 md:hidden">
              {/* Language Selector */}
              <div className="flex items-center bg-[#171817] border border-[#242624] p-0.5 rounded-lg text-[9px] font-bold uppercase">
                {['az', 'en', 'ru'].map(l => (
                  <button
                    key={l}
                    onClick={() => {
                      setLang(l);
                      localStorage.setItem('baku_lang', l);
                    }}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      lang === l ? 'bg-[#d2e2db] text-[#111211]' : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-lg bg-[#171817] border border-[#242624] flex items-center justify-center text-xs hover:bg-[#242624] transition-all"
                title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              
              {/* User Icon/Login button */}
              {user ? (
                <button
                  onClick={() => setViewMode('profile')}
                  className="w-8 h-8 rounded-lg bg-[#242624] border border-[#c3d6cc]/40 flex items-center justify-center text-xs text-white"
                >
                  👤
                </button>
              ) : (
                !isAdmin && (
                  <button
                    onClick={() => setViewMode('login')}
                    className="px-3 py-1.5 bg-[#d2e2db] text-[#111211] text-[10px] font-bold rounded-lg transition-all"
                  >
                    {t('loginButtonHeader')}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Desktop-only Navigation & Header Controls */}
          <div className="hidden md:flex items-center gap-6">
            {/* Menu Items */}
            <nav className="flex items-center gap-1 bg-[#171817] border border-[#242624] p-1 rounded-xl">
              <button
                onClick={() => setViewMode('showcase')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'showcase'
                    ? 'bg-[#d2e2db] text-[#111211]'
                    : 'text-[#c3d6cc] hover:text-white'
                }`}
              >
                {t('showcase')}
              </button>
              {isAdmin && (
                <button
                  onClick={() => setViewMode('admin')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    viewMode === 'admin'
                      ? 'bg-[#d2e2db] text-[#111211]'
                      : 'text-[#c3d6cc] hover:text-white'
                  }`}
                >
                  <span>{t('adminPanel')}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </button>
              )}
            </nav>

            {/* Language Switcher & Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-[#171817] border border-[#242624] p-1 rounded-xl">
                {['az', 'en', 'ru'].map(l => (
                  <button
                    key={l}
                    onClick={() => {
                      setLang(l);
                      localStorage.setItem('baku_lang', l);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${
                      lang === l ? 'bg-[#d2e2db] text-[#111211]' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-xl bg-[#171817] border border-[#242624] flex items-center justify-center text-xs hover:bg-[#242624] transition-all cursor-pointer"
                title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>

              {/* Indicator Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#171817] border border-[#242624] rounded-xl text-[10px] font-bold uppercase tracking-wider text-[#c3d6cc]">
                <span className={`w-1.5 h-1.5 rounded-full ${boardActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span>{boardActive ? t('boardOpenBadge') : t('postingDisabledBadge')}</span>
              </div>

              {/* Post Service button */}
              {viewMode === 'showcase' && (
                <button
                  onClick={() => setIsFormOpen(!isFormOpen)}
                  className={`flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 border border-[#242624] ${
                    isFormOpen
                      ? 'bg-[#242624] text-[#e2e8f0]'
                      : 'bg-[#d2e2db] text-[#111211] hover:bg-[#c3d6cc]'
                  }`}
                >
                  {isFormOpen ? t('hideFormBtn') : t('postServiceBtn')}
                </button>
              )}

              {/* Session Buttons */}
              {user ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setViewMode('profile')}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 border rounded-xl transition-all cursor-pointer ${
                      viewMode === 'profile'
                        ? 'bg-[#242624] border-[#c3d6cc] text-white'
                        : 'bg-[#171817] border-[#242624] hover:bg-[#242624] text-[#c3d6cc] hover:text-white'
                    }`}
                  >
                    👤 {user.fullname.split(' ')[0]}
                  </button>
                  <button
                    onClick={logoutUser}
                    className="px-4 py-2 border border-[#242624] bg-[#171817] hover:bg-[#242624] text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {t('logoutButtonHeader')}
                  </button>
                </div>
              ) : (
                !isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('login')}
                      className="px-4 py-2 border border-[#242624] bg-[#171817] hover:bg-[#242624] text-[#c3d6cc] text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      {t('loginButtonHeader')}
                    </button>
                    <button
                      onClick={() => setViewMode('register')}
                      className="px-4 py-2 bg-[#d2e2db] hover:bg-[#c3d6cc] text-[#111211] text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      {t('registerButtonHeader')}
                    </button>
                  </div>
                )
              )}

              {isAdmin && (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-rose-950/40 bg-rose-950/10 hover:bg-rose-950/30 text-rose-450 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {t('logoutBtn')}
                </button>
              )}
            </div>
          </div>

          {/* Mobile-only Navigation Tabs Row */}
          <div className="flex md:hidden items-center justify-between w-full pt-1 border-t border-[#242624]/40 mt-1">
            <nav className="flex items-center gap-1 bg-[#171817] border border-[#242624] p-0.5 rounded-lg w-full">
              <button
                onClick={() => setViewMode('showcase')}
                className={`flex-1 text-center py-2 text-[11px] font-bold rounded-md transition-all ${
                  viewMode === 'showcase'
                    ? 'bg-[#d2e2db] text-[#111211]'
                    : 'text-[#c3d6cc]'
                }`}
              >
                {t('showcase')}
              </button>
              {user && (
                <button
                  onClick={() => setViewMode('profile')}
                  className={`flex-1 text-center py-2 text-[11px] font-bold rounded-md transition-all ${
                    viewMode === 'profile'
                      ? 'bg-[#d2e2db] text-[#111211]'
                      : 'text-[#c3d6cc]'
                  }`}
                >
                  {lang === 'ru' ? 'Кабинет' : lang === 'en' ? 'Profile' : 'Kabinet'}
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setViewMode('admin')}
                  className={`flex-1 text-center py-2 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                    viewMode === 'admin'
                      ? 'bg-[#d2e2db] text-[#111211]'
                      : 'text-[#c3d6cc]'
                  }`}
                >
                  <span>{t('adminPanel')}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </button>
              )}
              {user && (
                <button
                  onClick={logoutUser}
                  className="px-3 py-2 text-[11px] font-bold text-slate-500 rounded-md"
                >
                  {lang === 'ru' ? 'Выйти' : lang === 'en' ? 'Logout' : 'Çıxış'}
                </button>
              )}
              {!user && !isAdmin && (
                <>
                  <button
                    onClick={() => setViewMode('login')}
                    className={`flex-1 text-center py-2 text-[11px] font-bold rounded-md transition-all ${
                      viewMode === 'login'
                        ? 'bg-[#d2e2db] text-[#111211]'
                        : 'text-[#c3d6cc]'
                    }`}
                  >
                    {t('loginButtonHeader')}
                  </button>
                  <button
                    onClick={() => setViewMode('register')}
                    className={`flex-1 text-center py-2 text-[11px] font-bold rounded-md transition-all ${
                      viewMode === 'register'
                        ? 'bg-[#d2e2db] text-[#111211]'
                        : 'text-[#c3d6cc]'
                    }`}
                  >
                    {t('registerButtonHeader')}
                  </button>
                </>
              )}
              {isAdmin && (
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-[11px] font-bold text-rose-400 rounded-md"
                >
                  {t('logoutBtn')}
                </button>
              )}
            </nav>
          </div>

        </div>

      </header>

      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 transform translate-y-0 ${
          notification.type === 'error' 
            ? 'bg-rose-950/90 border-rose-800 text-rose-200' 
            : 'bg-[#171817] border-emerald-800 text-emerald-300'
        }`}>
          <span className="text-lg">{notification.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="text-xs font-medium">{notification.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 mt-8">

        {/* DETAILED LISTING VIEW */}
        {viewMode === 'detail' && (
          <ListingDetail 
            id={selectedAdId}
            t={t}
            navigateTo={navigateTo}
            lang={lang}
            showToast={showToast}
            getCategoryTranslation={getCategoryTranslation}
          />
        )}

        {/* PROFILE VIEW */}
        {viewMode === 'profile' && (
          <Profile 
            user={user}
            t={t}
            navigateTo={navigateTo}
            lang={lang}
            showToast={showToast}
            getCategoryTranslation={getCategoryTranslation}
            getAuthHeaders={getAuthHeaders}
            openCreateForm={() => setIsFormOpen(true)}
          />
        )}

        {/* SHOWCASE VIEW */}
        {viewMode === 'showcase' && (
          <>
            {/* Post ad disabled warning */}
            {!boardActive && (
              <div className="bg-rose-950/20 border border-rose-900/50 p-4 rounded-xl mb-6 text-center text-xs text-rose-300 font-medium">
                {t('boardActiveNotice')}
              </div>
            )}

            {/* Collapsible Ad Creation Form */}
            <div className={`transition-all duration-300 overflow-hidden ${
              isFormOpen ? 'max-h-[850px] opacity-100 mb-8' : 'max-h-0 opacity-0 pointer-events-none'
            }`}>
              <div className="bg-[#171817] border border-[#242624] p-6 rounded-2xl shadow-xl max-w-2xl mx-auto">
                <h2 className="text-lg font-bold font-display text-white mb-5 flex items-center gap-2">
                  <span>✨</span> {t('postNewServiceTitle')}
                </h2>
                {!user && !isAdmin ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-xs mb-5 font-medium">
                      {t('authRequiredNotice')}
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setViewMode('login')}
                        className="px-5 py-2.5 bg-[#d2e2db] hover:bg-[#c3d6cc] text-[#111211] text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        {t('loginButtonHeader')}
                      </button>
                      <button
                        onClick={() => setViewMode('register')}
                        className="px-5 py-2.5 border border-[#242624] bg-[#111211] hover:bg-[#242624] text-[#c3d6cc] text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        {t('registerButtonHeader')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type Selector */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('typeLabel')}</label>
                      <div className="flex bg-[#111211] border border-[#242624] p-1 rounded-xl w-fit">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, type: 'service', category: 'Ремонт и строительство' })}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            form.type === 'service'
                              ? 'bg-[#d2e2db] text-[#111211]'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {t('typeService')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, type: 'product', category: 'Электроника' })}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            form.type === 'product'
                              ? 'bg-amber-500 text-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {t('typeProduct')}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('yourName')}</label>
                        <input
                          className={`w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all ${
                            user ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          placeholder={t('namePlaceholder')}
                          value={user ? user.fullname : form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          disabled={!!user}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('category')}</label>
                        <select
                          className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 outline-none transition-all cursor-pointer"
                          value={form.category}
                          onChange={e => setForm({ ...form, category: e.target.value })}
                        >
                          {(form.type === 'product' ? PRODUCT_CATEGORIES : CATEGORIES).map(cat => (
                            <option key={cat} value={cat} className="bg-[#171817] text-slate-100">
                              {getCategoryTranslation(cat, lang)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {form.type === 'product' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#111211]/30 p-4 border border-[#242624] rounded-2xl">
                        {/* Condition Selector */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('conditionLabel')}</label>
                          <div className="flex bg-[#111211] border border-[#242624] p-1 rounded-xl w-fit">
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, condition: 'new' })}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                form.condition === 'new'
                                  ? 'bg-[#d2e2db] text-[#111211]'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {t('conditionNew')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, condition: 'used' })}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                form.condition === 'used'
                                  ? 'bg-amber-600/80 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {t('conditionUsed')}
                            </button>
                          </div>
                        </div>

                        {/* Price Type Selector */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('priceTypeLabel')}</label>
                          <div className="flex bg-[#111211] border border-[#242624] p-1 rounded-xl w-fit">
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, price_type: 'fixed' })}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                form.price_type === 'fixed'
                                  ? 'bg-[#d2e2db] text-[#111211]'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {t('priceFixed')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, price_type: 'negotiable', price: '' })}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                form.price_type === 'negotiable'
                                  ? 'bg-slate-700 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {t('priceNegotiable')}
                            </button>
                          </div>
                        </div>

                        {/* Trade Possible Switch */}
                        <div className="flex flex-col justify-center">
                          <span className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('tradePossibleLabel')}</span>
                          <label className="relative inline-flex items-center cursor-pointer mt-1 select-none">
                            <input
                              type="checkbox"
                              checked={form.trade_possible}
                              onChange={e => setForm({ ...form, trade_possible: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#111211] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#d2e2db] after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600/30 border border-[#242624]"></div>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                          {form.type === 'product'
                            ? (lang === 'az' ? 'Məhsulun adı' : lang === 'en' ? 'Product Name' : 'Название товара')
                            : t('serviceTitle')}
                        </label>
                        <input
                          className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                          placeholder={form.type === 'product' ? t('titlePlaceholderProduct') : t('servicePlaceholder')}
                          value={form.title}
                          onChange={e => setForm({ ...form, title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('price')} (AZN)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            className={`w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl pl-4 pr-12 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all ${
                              form.price_type === 'negotiable' ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            placeholder="30"
                            value={form.price_type === 'negotiable' ? '' : form.price}
                            onChange={e => setForm({ ...form, price: e.target.value })}
                            disabled={form.price_type === 'negotiable'}
                            required={form.price_type !== 'negotiable'}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                            AZN
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('detailedDescription')}</label>
                      <textarea
                        className="w-full h-32 bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all resize-none"
                        placeholder={form.type === 'product' ? t('descPlaceholderProduct') : t('descPlaceholder')}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        required
                      />
                    </div>

                    <ImageUploader
                      images={form.images || []}
                      onChange={(images) => setForm({ ...form, images })}
                      t={t}
                      getAuthHeaders={getAuthHeaders}
                      showToast={showToast}
                      lang={lang}
                    />

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-5 py-2.5 rounded-xl border border-[#242624] hover:bg-[#242624] text-slate-350 text-xs font-bold transition-all"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        type="submit"
                        className="bg-[#d2e2db] hover:bg-[#c3d6cc] text-[#111211] font-bold px-6 py-2.5 rounded-xl transition-all text-xs cursor-pointer"
                      >
                        {t('publish')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Filter and search bar in Dark/Green reference style */}
            <section className="bg-[#171817] border border-[#242624] p-5 rounded-2xl mb-8 space-y-4">
              {/* Type Filter Toggles */}
              <div className="flex bg-[#111211] border border-[#242624] p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('all');
                    setSelectedCategory('Все');
                  }}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    typeFilter === 'all'
                      ? 'bg-[#d2e2db] text-[#111211]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'az' ? 'Hamısı' : lang === 'en' ? 'All' : 'Все'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('service');
                    setSelectedCategory('Все');
                  }}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    typeFilter === 'service'
                      ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'az' ? 'Xidmətlər' : lang === 'en' ? 'Services' : 'Услуги'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('product');
                    setSelectedCategory('Все');
                  }}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    typeFilter === 'product'
                      ? 'bg-amber-600/30 text-amber-400 border border-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'az' ? 'Baraxolka' : lang === 'en' ? 'Marketplace' : 'Барахолка'}
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                    placeholder={t('findMasterPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('sortBy')}</span>
                  <select
                    className="bg-[#111211] border border-[#242624] rounded-xl px-3 py-2 text-xs text-[#c3d6cc] outline-none transition-all cursor-pointer focus:border-[#c3d6cc]"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="newest">{t('sortNewest')}</option>
                    <option value="oldest">{t('sortOldest')}</option>
                    <option value="price-asc">{t('sortPriceAsc')}</option>
                    <option value="price-desc">{t('sortPriceDesc')}</option>
                  </select>
                </div>
              </div>

              {/* Categories Navigation */}
              <div className="flex overflow-x-auto gap-2 pt-3 border-t border-[#242624]/60 scrollbar-none flex-nowrap -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap">
                <button
                  onClick={() => setSelectedCategory('Все')}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedCategory === 'Все'
                      ? 'bg-[#d2e2db] border-[#c3d6cc] text-[#111211]'
                      : 'bg-[#111211] border-[#242624] text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {getCategoryTranslation('Все', lang)}
                </button>
                {(() => {
                  const catsToShow = typeFilter === 'service' 
                    ? CATEGORIES 
                    : typeFilter === 'product' 
                      ? PRODUCT_CATEGORIES 
                      : Array.from(new Set([...CATEGORIES, ...PRODUCT_CATEGORIES]));
                  return catsToShow.map(cat => {
                    const isSelected = selectedCategory === cat;
                    const info = categoryStyles[cat] || categoryStyles['Другое'];
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center ${
                          isSelected
                            ? 'bg-[#d2e2db] border-[#c3d6cc] text-[#111211]'
                            : 'bg-[#111211] border-[#242624] text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {!isSelected && <span className="mr-1.5">{info.iconText}</span>}
                        <span>{getCategoryTranslation(cat, lang)}</span>
                      </button>
                    );
                  });
                })()}
              </div>
            </section>

            {/* Ads Count */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold uppercase tracking-wider text-white">
                {t('listingsInBaku')}
              </h2>
              <span className="text-[10px] bg-[#171817] border border-[#242624] px-3 py-1.5 rounded-full text-slate-400 font-bold uppercase tracking-wider">
                {t('totalResults')}: <strong className="text-[#c3d6cc]">{filteredAds.length}</strong>
              </span>
            </div>

            {/* Showcase Ads Grid */}
            {filteredAds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAds.map(ad => {
                  const info = categoryStyles[ad.category] || categoryStyles['Другое'];
                  let dateStr = 'Recent';
                  if (ad.created_at) {
                    try {
                      const date = new Date(ad.created_at.replace(' ', 'T'));
                      if (!isNaN(date.getTime())) {
                        dateStr = date.toLocaleDateString(lang === 'az' ? 'az-AZ' : lang === 'en' ? 'en-US' : 'ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        });
                      }
                    } catch (e) {}
                  }

                  const parsedImages = parseAdImages(ad.images);

                  return (
                    <div 
                      key={ad.id} 
                      className="group bg-[#171817] border border-[#242624] hover:border-slate-700 rounded-2xl p-6 shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                      onClick={() => navigateTo('/listing/' + ad.id)}
                    >
                      <div>
                        {/* Listing Image Cover & Badges */}
                        <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-[#242624] bg-[#111211] mb-5 flex items-center justify-center group-hover:border-slate-700 transition-all duration-300">
                          {parsedImages && parsedImages.length > 0 ? (
                            <img 
                              src={resolveImageUrl(parsedImages[0])} 
                              alt={ad.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-650 opacity-40">
                              <span className="text-3xl mb-1">{info.iconText}</span>
                              <span className="text-[10px] uppercase tracking-wider">{getCategoryTranslation(ad.category, lang)}</span>
                            </div>
                          )}
                          
                          {/* Top-Left Category & Type Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${info.color}`}>
                              {getCategoryTranslation(ad.category, lang)}
                            </span>
                            
                            {/* Type Badge */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                              ad.type === 'product'
                                ? 'bg-amber-600/80 text-white border-amber-500/35'
                                : 'bg-emerald-600/30 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {ad.type === 'product' ? t('typeProduct') : t('typeService')}
                            </span>
                          </div>
                          
                          {/* Top-Right Condition & Trade badges */}
                          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-10">
                            {/* Condition Badge (Product only) */}
                            {ad.type === 'product' && ad.condition && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                                ad.condition === 'new'
                                  ? 'bg-emerald-650 text-white border-emerald-500/40'
                                  : 'bg-[#242624] text-slate-300 border-[#303330]'
                              }`}>
                                {ad.condition === 'new' ? t('conditionNew') : t('conditionUsed')}
                              </span>
                            )}
                            
                            {/* Swap / Barter Badge */}
                            {ad.type === 'product' && ad.trade_possible && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-indigo-650 text-white border border-indigo-500/40" title={t('tradePossibleLabel')}>
                                🔁 {lang === 'az' ? 'Barter' : lang === 'en' ? 'Swap' : 'Обмен'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Header Details */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {dateStr}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-white mb-2.5 group-hover:text-[#c3d6cc] transition-colors">
                          {ad.title}
                        </h3>

                        {/* Description */}
                        <p className="text-slate-400 text-xs leading-relaxed mb-6 whitespace-pre-line line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                          {ad.description}
                        </p>
                      </div>

                      {/* Pricing and Author info */}
                      <div className="border-t border-[#242624] pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#111211] border border-[#242624] flex items-center justify-center text-[10px] font-bold text-[#c3d6cc] uppercase">
                            {ad.name ? ad.name.slice(0, 2) : 'A'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-300 leading-tight">{ad.name}</p>
                            <p className="text-[9px] text-slate-550 leading-tight">{t('provider')}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 block leading-tight font-bold uppercase tracking-wider">{t('price')}</span>
                          {ad.price_type === 'negotiable' ? (
                            <span className="text-xs font-bold text-[#c3d6cc] uppercase tracking-wider block mt-1">
                              {t('priceNegotiable')}
                            </span>
                          ) : (
                            <span className="text-base font-extrabold text-[#c3d6cc] font-display">
                              {ad.price} <span className="text-xs font-bold">AZN</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#171817]/40 border border-[#242624] rounded-2xl p-12 text-center max-w-md mx-auto mt-12">
                <div className="w-14 h-14 bg-[#171817] border border-[#242624] rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
                  🔍
                </div>
                <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">{t('nothingFound')}</h3>
                <p className="text-slate-500 text-xs">
                  {t('nothingFoundDesc')}
                </p>
                {(searchQuery || selectedCategory !== 'Все') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('Все');
                    }}
                    className="mt-5 text-[#c3d6cc] hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    {t('resetFilters')}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* LOGIN VIEW */}
        {viewMode === 'login' && (
          <Login t={t} setViewMode={setViewMode} showToast={showToast} />
        )}

        {/* REGISTER VIEW */}
        {viewMode === 'register' && (
          <Register t={t} setViewMode={setViewMode} showToast={showToast} lang={lang} />
        )}

        {/* ADMIN DASHBOARD VIEW */}
        {viewMode === 'admin' && isAdmin && (
          <div className="space-y-8">
            
            {/* Admin Panel Header */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white font-display">{t('overview')}</h2>
              <p className="text-xs text-slate-500 font-medium">{t('fullListingsDesc')}</p>
            </div>

            {/* Grid of Cards matching reference image layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Total energy consumption (Category distribution) -> spans 2 cols on md */}
              <div className="md:col-span-2 bg-[#171817] border border-[#242624] p-6 rounded-2xl flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider">{t('categoryPopularity')}</h3>
                    <p className="text-[10px] text-slate-500">{t('activeListingsBySegment')}</p>
                  </div>
                  <button className="text-[10px] bg-[#242624] text-[#c3d6cc] px-2.5 py-1 rounded-lg border border-slate-800">
                    {t('allServices')}
                  </button>
                </div>
                
                {/* CSS Bar Chart */}
                <div className="flex items-end justify-between h-40 gap-3 pt-4 border-t border-[#242624]/60">
                  {getCategoryStats().map(stat => (
                    <div key={stat.category} className="flex flex-col items-center flex-1 group">
                      <div className="w-full bg-[#111211] rounded-t-lg relative h-32 flex items-end overflow-hidden">
                        <div 
                          style={{ height: `${stat.percentage}%` }}
                          className="w-full bg-[#c3d6cc] rounded-t-lg transition-all duration-500 hover:bg-[#d2e2db]"
                        />
                        {/* Hover count indicator */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-xs font-bold text-white">
                          {stat.count}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 mt-2 truncate w-full text-center" title={getCategoryTranslation(stat.category, lang)}>
                        {stat.icon} {stat.shortName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Green connections (Platform control & toggle) -> 1 col */}
              <div className="bg-[#171817] border border-[#242624] p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider">{t('boardStatus')}</h3>
                    <button className="text-slate-500 hover:text-slate-300 text-xs">•••</button>
                  </div>

                  <div className="flex items-center justify-between bg-[#111211] border border-[#242624] p-3.5 rounded-xl mb-5">
                    <div>
                      <p className="text-xs font-bold text-[#c3d6cc]">{t('listingSubmission')}</p>
                      <p className="text-[9px] text-slate-500 font-medium">
                        {boardActive ? t('openForPosting') : t('suspendedByAdmin')}
                      </p>
                    </div>
                    {/* Toggle switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={boardActive} 
                        onChange={(e) => toggleBoardStatus(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-[#242624] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#111211] after:content-[''] after:absolute after:top-[2.5px] after:left-[2px] after:bg-[#111211] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c3d6cc]"></div>
                    </label>
                  </div>
                </div>

                {/* Wireframe neon model area */}
                <div className="relative h-24 bg-[#111211] border border-[#242624] rounded-xl overflow-hidden flex items-center justify-center p-3">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/10 to-transparent pointer-events-none" />
                  <div className="w-full h-full border border-[#242624] rounded-lg relative overflow-hidden flex flex-col justify-between p-2">
                    <div className="flex justify-between items-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${boardActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      <span className="text-[8px] font-mono text-slate-600">SECURE CONNECT</span>
                    </div>
                    <svg className="absolute inset-0 w-full h-full text-slate-800/10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M0,20 L100,20 M0,40 L100,40 M0,60 L100,60 M0,80 L100,80" stroke="currentColor" strokeWidth="0.5" />
                      <path d="M20,0 L20,100 M40,0 L40,100 M60,0 L60,100 M80,0 L80,100" stroke="currentColor" strokeWidth="0.5" />
                    </svg>
                    <span className="text-[9px] font-mono font-bold text-[#c3d6cc] self-end bg-[#171817] px-1.5 py-0.5 rounded border border-[#242624]">
                      PLATFORM: {boardActive ? 'ACTIVE' : 'LOCKED'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ACCESS MODE</span>
                  <span className="text-xs font-bold text-[#c3d6cc]">FULL ACCESS</span>
                </div>
              </div>

            </div>

            {/* Second row of dashboard stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 3: Tracking (Pale green card) */}
              <div className="bg-[#d2e2db] text-[#111211] p-6 rounded-2xl flex flex-col justify-between h-44 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#111211]/80">{t('totalOffers')}</span>
                  <span className="text-xs font-bold text-[#111211]/70">{ads.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="border-r border-[#111211]/15 pr-2">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-[#111211]/50">{t('typeService')}</p>
                    <p className="text-2xl font-extrabold font-display leading-tight">{servicesCount}</p>
                  </div>
                  <div className="pl-1">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-[#111211]/50">{t('typeProduct')}</p>
                    <p className="text-2xl font-extrabold font-display leading-tight">{productsCount}</p>
                  </div>
                </div>
                <p className="text-[9px] font-bold text-[#111211]/50 mt-1 uppercase tracking-wider">{t('activeListingsInDb')}</p>
              </div>

              {/* Card 4: Detailed report (Last uploaded list) */}
              <div className="bg-[#171817] border border-[#242624] p-6 rounded-2xl flex flex-col justify-between h-44">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="text-white font-bold text-xs uppercase tracking-wider">{t('recentTitle')}</h3>
                    <p className="text-[9px] text-slate-500">{t('lastPublishedServices')}</p>
                  </div>
                  <span className="text-[9px] text-slate-400">Baku</span>
                </div>
                <div className="space-y-2 overflow-y-auto pr-1 flex-1 mt-1 scrollbar-thin">
                  {ads.slice(0, 3).map(ad => (
                    <div 
                      key={ad.id} 
                      className="flex justify-between items-center bg-[#111211]/60 border border-[#242624] px-3 py-1.5 rounded-xl cursor-pointer hover:bg-[#111211] transition-colors"
                      onClick={() => navigateTo('/listing/' + ad.id)}
                    >
                      <div className="truncate flex-1 pr-2">
                        <p className="text-xs text-white font-bold truncate">{ad.title}</p>
                        <p className="text-[9px] text-slate-550">{ad.name}</p>
                      </div>
                      <span className="text-xs font-bold text-[#c3d6cc]">
                        {ad.price} AZN
                      </span>
                    </div>
                  ))}
                  {ads.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No ads found</p>
                  )}
                </div>
              </div>

              {/* Card 5: Average Price widget */}
              <div className="bg-[#171817] border border-[#242624] p-6 rounded-2xl flex flex-col justify-between h-44">
                <div>
                  <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-0.5">{t('averagePrice')}</h3>
                  <p className="text-[9px] text-slate-500">Split average metrics per segment</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 my-2">
                  <div className="border-r border-[#242624] pr-2">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{t('typeService')}</p>
                    <p className="text-lg font-extrabold text-[#c3d6cc] font-display leading-tight">{servicesAveragePrice} <span className="text-[10px] font-bold text-slate-500">AZN</span></p>
                  </div>
                  <div className="pl-1">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{t('typeProduct')}</p>
                    <p className="text-lg font-extrabold text-amber-400 font-display leading-tight">{productsAveragePrice} <span className="text-[10px] font-bold text-slate-500">AZN</span></p>
                  </div>
                </div>

                <div className="border-t border-[#242624]/60 pt-3 flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t('priceDynamics')}</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c3d6cc] border-2 border-[#171817]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  </div>
                </div>
              </div>

            </div>

            {/* Moderation section (Edit / Delete table) */}
            <section className="bg-[#171817] border border-[#242624] rounded-2xl overflow-hidden mt-8">
              <div className="p-6 border-b border-[#242624]">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider">{t('contentModeration')}</h3>
                <p className="text-xs text-slate-500">{t('fullListingsDesc')}</p>
              </div>

              {/* Interactive filters for administration */}
              <div className="p-4 bg-[#111211]/40 border-b border-[#242624] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <input
                  className="w-full sm:w-72 bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                  placeholder={t('fastSearchDb')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />

                <select
                  className="bg-[#111211] border border-[#242624] rounded-xl px-3 py-2 text-xs text-[#c3d6cc] outline-none cursor-pointer"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="Все">{getCategoryTranslation('Все', lang)}</option>
                  {Array.from(new Set([...CATEGORIES, ...PRODUCT_CATEGORIES])).map(cat => (
                    <option key={cat} value={cat}>{getCategoryTranslation(cat, lang)}</option>
                  ))}
                </select>

                <select
                  className="bg-[#111211] border border-[#242624] rounded-xl px-3 py-2 text-xs text-[#c3d6cc] outline-none cursor-pointer"
                  value={adminTypeFilter}
                  onChange={e => setAdminTypeFilter(e.target.value)}
                >
                  <option value="all">{t('filterAllTypes')}</option>
                  <option value="service">{t('typeService')}</option>
                  <option value="product">{t('typeProduct')}</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#242624] text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">{t('id')}</th>
                      <th className="py-4 px-6">{t('titleHeader')}</th>
                      <th className="py-4 px-6">{t('typeLabel')}</th>
                      <th className="py-4 px-6">{t('categoryHeader')}</th>
                      <th className="py-4 px-6">{t('authorHeader')}</th>
                      <th className="py-4 px-6 text-right">{t('priceHeader')}</th>
                      <th className="py-4 px-6 text-center">{t('actionsHeader')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242624]/60 text-xs">
                    {adminFilteredAds.map(ad => (
                      <tr key={ad.id} className="hover:bg-[#111211]/30 transition-colors">
                        <td className="py-4 px-6 font-mono text-[10px] text-slate-500">#{ad.id}</td>
                        <td className="py-4 px-6 font-bold text-white max-w-xs truncate" title={ad.title}>
                          {ad.title}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase tracking-wider ${
                            ad.type === 'product'
                              ? 'bg-amber-600/30 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-600/30 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {ad.type === 'product' ? t('typeProduct') : t('typeService')}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-0.5 bg-[#242624] text-[#c3d6cc] rounded text-[10px] font-semibold border border-slate-800">
                            {getCategoryTranslation(ad.category, lang)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-350">{ad.name}</td>
                        <td className="py-4 px-6 text-right font-bold text-emerald-400 font-display">
                          {ad.price_type === 'negotiable' ? t('priceNegotiable') : `${ad.price} AZN`}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditingAd({ ...ad, images: parseAdImages(ad.images) })}
                              className="px-2.5 py-1.5 border border-[#242624] bg-[#111211] hover:bg-[#242624] text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                              {t('editShort')}
                            </button>
                            <button
                              onClick={() => deleteAd(ad.id)}
                              className="px-2.5 py-1.5 border border-rose-950/40 bg-rose-950/10 hover:bg-rose-950/30 text-rose-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                              {t('deleteShort')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {adminFilteredAds.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-8 px-6 text-center text-slate-500 font-medium">
                          No ads found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

      </main>

      {/* ADMIN LOGIN MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#171817] border border-[#242624] p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-base font-bold text-white mb-1 uppercase tracking-wider">{t('controlPanel')}</h3>
            
            {loginStep === 1 ? (
              <>
                <p className="text-xs text-slate-500 mb-5">{t('enterAdminPassword')}</p>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{t('passwordLabel')}</label>
                    <input
                      type="password"
                      className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#d2e2db] hover:bg-[#c3d6cc] text-[#111211] font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider"
                  >
                    {lang === 'ru' ? 'Далее' : lang === 'en' ? 'Next' : 'Növbəti'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-5">
                  {lang === 'ru' ? 'Введите двухфакторный код подтверждения' : lang === 'en' ? 'Enter two-factor authentication code' : 'İki-faktorlu təsdiqləmə kodunu daxil edin'}
                </p>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      {lang === 'ru' ? 'Код 2FA' : lang === 'en' ? '2FA Code' : '2FA Kodu'}
                    </label>
                    <input
                      type="text"
                      className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all"
                      placeholder="8844"
                      value={admin2faCode}
                      onChange={e => setAdmin2faCode(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#d2e2db] hover:bg-[#c3d6cc] text-[#111211] font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider"
                  >
                    {t('loginBtn')}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ADMIN EDIT AD MODAL */}
      {editingAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#171817] border border-[#242624] p-6 rounded-2xl w-full max-w-lg shadow-2xl relative">
            <button 
              onClick={() => setEditingAd(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-base font-bold text-white mb-1 uppercase tracking-wider">{t('editListingTitle')}</h3>
            <p className="text-xs text-slate-500 mb-5">{t('editListingParams')} #{editingAd.id}</p>

            <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Type Selector */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('typeLabel')}</label>
                <div className="flex bg-[#111211] border border-[#242624] p-1 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setEditingAd({ ...editingAd, type: 'service', category: 'Ремонт и строительство' })}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      editingAd.type === 'service'
                        ? 'bg-[#d2e2db] text-[#111211]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('typeService')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAd({ ...editingAd, type: 'product', category: 'Электроника' })}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      editingAd.type === 'product'
                        ? 'bg-amber-500 text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('typeProduct')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('yourName')}</label>
                  <input
                    className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all"
                    placeholder={t('yourName')}
                    value={editingAd.name}
                    onChange={e => setEditingAd({ ...editingAd, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('category')}</label>
                  <select
                    className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 outline-none transition-all cursor-pointer"
                    value={editingAd.category}
                    onChange={e => setEditingAd({ ...editingAd, category: e.target.value })}
                  >
                    {(editingAd.type === 'product' ? PRODUCT_CATEGORIES : CATEGORIES).map(cat => (
                      <option key={cat} value={cat} className="bg-[#171817] text-slate-100">
                        {getCategoryTranslation(cat, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editingAd.type === 'product' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#111211]/30 p-4 border border-[#242624] rounded-2xl">
                  {/* Condition Selector */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('conditionLabel')}</label>
                    <div className="flex bg-[#111211] border border-[#242624] p-1 rounded-xl w-fit">
                      <button
                        type="button"
                        onClick={() => setEditingAd({ ...editingAd, condition: 'new' })}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          editingAd.condition === 'new'
                            ? 'bg-[#d2e2db] text-[#111211]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t('conditionNew')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAd({ ...editingAd, condition: 'used' })}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          editingAd.condition === 'used'
                            ? 'bg-amber-600/80 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t('conditionUsed')}
                      </button>
                    </div>
                  </div>

                  {/* Price Type Selector */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('priceTypeLabel')}</label>
                    <div className="flex bg-[#111211] border border-[#242624] p-1 rounded-xl w-fit">
                      <button
                        type="button"
                        onClick={() => setEditingAd({ ...editingAd, price_type: 'fixed' })}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          editingAd.price_type === 'fixed'
                            ? 'bg-[#d2e2db] text-[#111211]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t('priceFixed')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAd({ ...editingAd, price_type: 'negotiable', price: '' })}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          editingAd.price_type === 'negotiable'
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t('priceNegotiable')}
                      </button>
                    </div>
                  </div>

                  {/* Trade Possible Switch */}
                  <div className="flex flex-col justify-center">
                    <span className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('tradePossibleLabel')}</span>
                    <label className="relative inline-flex items-center cursor-pointer mt-1 select-none">
                      <input
                        type="checkbox"
                        checked={editingAd.trade_possible || false}
                        onChange={e => setEditingAd({ ...editingAd, trade_possible: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#111211] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#d2e2db] after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600/30 border border-[#242624]"></div>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    {editingAd.type === 'product'
                      ? (lang === 'az' ? 'Məhsulun adı' : lang === 'en' ? 'Product Name' : 'Название товара')
                      : t('serviceTitle')}
                  </label>
                  <input
                    className="w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all"
                    placeholder={editingAd.type === 'product' ? t('titlePlaceholderProduct') : t('servicePlaceholder')}
                    value={editingAd.title}
                    onChange={e => setEditingAd({ ...editingAd, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('price')} (AZN)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      className={`w-full bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl pl-4 pr-12 py-3 text-sm text-slate-100 placeholder-slate-650 outline-none transition-all ${
                        editingAd.price_type === 'negotiable' ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                      placeholder="30"
                      value={editingAd.price_type === 'negotiable' ? '' : editingAd.price}
                      onChange={e => setEditingAd({ ...editingAd, price: e.target.value })}
                      disabled={editingAd.price_type === 'negotiable'}
                      required={editingAd.price_type !== 'negotiable'}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      AZN
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{t('detailedDescription')}</label>
                <textarea
                  className="w-full h-32 bg-[#111211] border border-[#242624] focus:border-[#c3d6cc] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-655 outline-none transition-all resize-none"
                  placeholder={editingAd.type === 'product' ? t('descPlaceholderProduct') : t('descPlaceholder')}
                  value={editingAd.description}
                  onChange={e => setEditingAd({ ...editingAd, description: e.target.value })}
                  required
                />
              </div>

              <ImageUploader
                images={parseAdImages(editingAd.images)}
                onChange={(images) => setEditingAd({ ...editingAd, images })}
                t={t}
                getAuthHeaders={getAuthHeaders}
                showToast={showToast}
                lang={lang}
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAd(null)}
                  className="px-5 py-2.5 rounded-xl border border-[#242624] hover:bg-[#242624] text-slate-350 text-xs font-bold transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-[#d2e2db] hover:bg-[#c3d6cc] text-[#111211] font-bold px-6 py-2.5 rounded-xl transition-all text-xs"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;