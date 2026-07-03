(function () {
  'use strict';

  var STORAGE_KEY = 'prob-lang-suggest-dismissed';

  function dismissed(url) {
    try { return localStorage.getItem(STORAGE_KEY) === url; } catch (e) { return false; }
  }

  function dismiss(url) {
    try { localStorage.setItem(STORAGE_KEY, url); } catch (e) {}
  }

  function init() {
    var html = document.documentElement;
    var pageLang = html.getAttribute('lang') || 'es';
    var altLang = html.getAttribute('data-alt-lang');
    var altUrl = html.getAttribute('data-alt-lang-url');
    if (!altLang || !altUrl) return;

    var browserLang = (navigator.language || navigator.userLanguage || '').slice(0, 2).toLowerCase();
    if (browserLang !== altLang) return;
    if (dismissed(altUrl)) return;

    var texts = {
      es: { msg: 'It looks like you prefer English.', link: 'Switch to English', close: 'Dismiss' },
      en: { msg: 'Parece que prefieres español.', link: 'Ver en español', close: 'Cerrar' }
    };
    var t = texts[pageLang === 'es' ? 'es' : 'en'];
    if (!t) return;

    var banner = document.createElement('div');
    banner.className = 'lang-suggest-banner';
    banner.setAttribute('role', 'note');

    var msg = document.createElement('span');
    msg.textContent = t.msg + ' ';
    var link = document.createElement('a');
    link.href = altUrl;
    link.textContent = t.link;
    msg.appendChild(link);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', t.close);
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function () {
      dismiss(altUrl);
      banner.remove();
    });

    banner.appendChild(msg);
    banner.appendChild(closeBtn);

    var nav = document.querySelector('.site-nav');
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(banner, nav.nextSibling);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
