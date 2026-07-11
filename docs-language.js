(() => {
  const lang = (document.documentElement.lang || 'en').toLowerCase().slice(0, 2);
  localStorage.setItem('factor0xLang', lang === 'ru' ? 'ru' : 'en');
})();
