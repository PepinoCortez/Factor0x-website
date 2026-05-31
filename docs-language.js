(() => {
  const supportedLangs = ['en', 'ru', 'es', 'ar'];
  const params = new URLSearchParams(window.location.search);
  const requestedLang = params.get('lang');
  const storedLang = localStorage.getItem('factor0xLang');
  const lang = supportedLangs.includes(requestedLang)
    ? requestedLang
    : supportedLangs.includes(storedLang)
      ? storedLang
      : document.documentElement.lang || 'en';

  localStorage.setItem('factor0xLang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  const path = window.location.pathname.split('/').pop();
  if (path === 'whitepaper.html' && lang === 'en') {
    window.location.replace(`whitepaper-en.html?lang=${lang}`);
    return;
  }
  if (path === 'whitepaper-en.html' && lang !== 'en') {
    window.location.replace(`whitepaper.html?lang=${lang}`);
    return;
  }
  if (path === 'privacy-policy.html' && lang === 'ru') {
    window.location.replace(`privacy-policy-ru.html?lang=${lang}`);
    return;
  }
  if (path === 'privacy-policy-ru.html' && lang !== 'ru') {
    window.location.replace(`privacy-policy.html?lang=${lang}`);
    return;
  }
  if (path === 'terms-of-service.html' && lang === 'ru') {
    window.location.replace(`terms-of-service-ru.html?lang=${lang}`);
    return;
  }
  if (path === 'terms-of-service-ru.html' && lang !== 'ru') {
    window.location.replace(`terms-of-service.html?lang=${lang}`);
    return;
  }

  const back = document.querySelector('.back');
  if (back) {
    back.href = `index.html?lang=${lang}`;
    back.textContent = {
      en: '← Back to Factor0x',
      ru: '← Назад к Factor0x',
      es: '← Volver a Factor0x',
      ar: '← العودة إلى Factor0x'
    }[lang] || '← Back to Factor0x';
  }

  const originalLang = document.body.dataset.documentLang;
  if (!originalLang || originalLang === lang) return;

  const messages = {
    en: 'This document is currently shown in its original language. A verified translation for the selected language is not available yet.',
    ru: 'Документ сейчас показан на языке оригинала. Заверенный перевод на выбранный язык пока недоступен.',
    es: 'Este documento se muestra en su idioma original. La traducción verificada al idioma seleccionado aún no está disponible.',
    ar: 'يتم عرض هذا المستند بلغته الأصلية حالياً. الترجمة المعتمدة للغة المحددة غير متوفرة بعد.'
  };

  const notice = document.createElement('p');
  notice.className = 'document-language-notice';
  notice.textContent = messages[lang] || messages.en;
  back?.after(notice);
})();
