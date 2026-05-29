const { Ad, User, sequelize } = require('./db');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // 1. Delete all existing ads
    console.log('Deleting existing ads...');
    const deletedCount = await Ad.destroy({ where: {} });
    console.log(`Deleted ${deletedCount} existing ads.`);

    // 2. Find or create mock users to author the listings
    console.log('Finding or creating premium mock users...');
    
    // Developer user
    const [userDev] = await User.findOrCreate({
      where: { email: 'ruslan.aliyev.dev@gmail.com' },
      defaults: {
        fullname: 'Руслан Алиев',
        phone: '+9945028319470',
        password: 'mockpassword123',
        avatar_url: null
      }
    });

    // Interior designer user
    const [userDesign] = await User.findOrCreate({
      where: { email: 'aysel.mammadova.design@gmail.com' },
      defaults: {
        fullname: 'Айсель Мамедова',
        phone: '+9945571940283',
        password: 'mockpassword123',
        avatar_url: null
      }
    });

    // Tech seller user
    const [userTech] = await User.findOrCreate({
      where: { email: 'ilgar.hasanov.tech@mail.ru' },
      defaults: {
        fullname: 'Ильгар Гасанов',
        phone: '+9947036251842',
        password: 'mockpassword123',
        avatar_url: null
      }
    });

    // Auto seller user
    const [userAuto] = await User.findOrCreate({
      where: { email: 'dmitry.petrov.auto@yandex.ru' },
      defaults: {
        fullname: 'Дмитрий Петров',
        phone: '+9945124673051',
        password: 'mockpassword123',
        avatar_url: null
      }
    });

    // 3. Create high-quality mock ads
    console.log('Inserting high-quality mock listings...');

    const mockAds = [
      {
        name: userDev.fullname,
        title: 'Разработка современных веб-сайтов и веб-приложений под ключ',
        category: 'IT и фриланс',
        price: '1200',
        description: 'Профессиональная разработка веб-сайтов на React, Next.js, Node.js. Создаю быстрые, адаптивные и оптимизированные для SEO решения. В стоимость входит: проектирование интерфейса, адаптивная верстка, интеграция платежных систем, базовая SEO-оптимизация и перенос на ваш хостинг. Опыт работы более 6 лет. Гарантия качества и соблюдение согласованных сроков!',
        user_id: userDev.id,
        type: 'service',
        condition: null,
        trade_possible: false,
        price_type: 'fixed',
        images: JSON.stringify(['https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80']),
        views: 142
      },
      {
        name: userDesign.fullname,
        title: 'Дизайн интерьера квартир и коммерческих помещений',
        category: 'Ремонт и строительство',
        price: '30',
        description: 'Создаю уникальные и функциональные дизайн-проекты в современных стилях (минимализм, скандинавский, лофт, неоклассика). Разработка полного пакета чертежей для строителей, фотореалистичная 3D-визуализация каждого помещения, детальный подбор отделочных материалов, мебели и освещения. Авторский надзор на всех этапах реализации. Индивидуальный подход к вашему бюджету! Цена указана за кв. м.',
        user_id: userDesign.id,
        type: 'service',
        condition: null,
        trade_possible: false,
        price_type: 'negotiable',
        images: JSON.stringify(['https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80']),
        views: 98
      },
      {
        name: userTech.fullname,
        title: 'MacBook Pro 16" M3 Max / 36GB / 1TB Space Black',
        category: 'Электроника',
        price: '4800',
        description: 'В идеальном косметическом и техническом состоянии (как новый). Полный оригинальный комплект (коробка, зарядное устройство MagSafe 3 мощностью 140W, кабель в оплетке). Батарея 98% емкости, всего 45 циклов перезарядки. Без царапин, сколов и потертостей, экран под защитной пленкой с первого дня. Использовался исключительно дома для работы с графикой. Любые проверки приветствуются!',
        user_id: userTech.id,
        type: 'product',
        condition: 'new',
        trade_possible: false,
        price_type: 'fixed',
        images: JSON.stringify(['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80']),
        views: 215
      },
      {
        name: userAuto.fullname,
        title: 'Оригинальные диски Vossen HF-3 R20 с летней резиной',
        category: 'Авто и запчасти',
        price: '2600',
        description: 'Продаю комплект оригинальных литых дисков Vossen HF-3 (разболтовка 5x112, разноширокие). Состояние идеальное, без бордюрной болезни, трещин и каких-либо сварок. Профессионально окрашены в фирменный цвет Gloss Black. Обуты в летнюю премиальную резину Michelin Pilot Sport 4S с отличным остатком протектора (около 6.5 мм). Стояли на Mercedes E-Class. Возможен разумный торг или обмен на диски R19 с вашей доплатой.',
        user_id: userAuto.id,
        type: 'product',
        condition: 'used',
        trade_possible: true,
        price_type: 'fixed',
        images: JSON.stringify(['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80']),
        views: 74
      }
    ];

    for (const adData of mockAds) {
      const createdAd = await Ad.create(adData);
      console.log(`Created ad "${createdAd.title}" (ID: ${createdAd.id})`);
    }

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await sequelize.close();
  }
}

run();
