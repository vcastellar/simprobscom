(function () {
  'use strict';

  var CLARITY_PROJECT_ID = 'xkb2cubnwc';
  var STORAGE_KEY = 'problab-clarity-consent';
  var inMemoryConsent = null;

  function getStoredConsent() {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return inMemoryConsent;
    }
  }

  function setStoredConsent(value) {
    try {
      sessionStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      inMemoryConsent = value;
      // If sessionStorage is unavailable, keep the user's choice for this page load only.
    }
  }

  function loadClarity() {
    if (window.__problabClarityLoaded) return;
    window.__problabClarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_PROJECT_ID);
  }

  function getText() {
    var isEnglish = document.documentElement.lang && document.documentElement.lang.toLowerCase().indexOf('en') === 0;
    return isEnglish ? {
      title: 'Analytics cookies',
      body: 'We use Microsoft Clarity to understand how the site is used and improve it. It may use cookies and similar technologies. You can accept or reject analytics cookies for this session.',
      accept: 'Accept analytics',
      reject: 'Reject',
      privacy: 'Privacy policy',
      cookies: 'Cookie policy'
    } : {
      title: 'Cookies analíticas',
      body: 'Usamos Microsoft Clarity para entender cómo se utiliza la web y mejorarla. Puede utilizar cookies y tecnologías similares. Puedes aceptar o rechazar las cookies analíticas durante esta sesión.',
      accept: 'Aceptar analítica',
      reject: 'Rechazar',
      privacy: 'Política de privacidad',
      cookies: 'Política de cookies'
    };
  }

  function policyBasePath() {
    var path = window.location.pathname;
    return path.indexOf('/en/') !== -1 ? '/en/' : '/';
  }

  function showBanner() {
    if (document.getElementById('problab-cookie-banner')) return;
    var text = getText();
    var prefix = policyBasePath();
    var banner = document.createElement('div');
    banner.id = 'problab-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', text.title);
    banner.innerHTML = '' +
      '<div class="problab-cookie-card">' +
        '<div class="problab-cookie-copy">' +
          '<strong>' + text.title + '</strong>' +
          '<p>' + text.body + '</p>' +
          '<p class="problab-cookie-links"><a href="' + prefix + 'privacidad.html">' + text.privacy + '</a> · <a href="' + prefix + 'cookies.html">' + text.cookies + '</a></p>' +
        '</div>' +
        '<div class="problab-cookie-actions">' +
          '<button type="button" data-choice="reject">' + text.reject + '</button>' +
          '<button type="button" class="primary" data-choice="accept">' + text.accept + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
    banner.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-choice]');
      if (!button) return;
      var choice = button.getAttribute('data-choice');
      setStoredConsent(choice);
      banner.remove();
      if (choice === 'accept') loadClarity();
    });
  }

  function addStyles() {
    if (document.getElementById('problab-cookie-style')) return;
    var style = document.createElement('style');
    style.id = 'problab-cookie-style';
    style.textContent = '#problab-cookie-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;display:flex;justify-content:center;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.problab-cookie-card{max-width:920px;width:100%;display:flex;gap:18px;align-items:center;justify-content:space-between;padding:18px 20px;border:1px solid rgba(148,163,184,.35);border-radius:18px;background:rgba(255,255,255,.97);box-shadow:0 20px 50px rgba(15,23,42,.22);color:#0f172a}.dark-mode .problab-cookie-card{background:rgba(15,23,42,.97);color:#e5e7eb;border-color:rgba(148,163,184,.3)}.problab-cookie-copy p{margin:.35rem 0 0;line-height:1.45}.problab-cookie-links{font-size:.92rem}.problab-cookie-links a{color:#2563eb}.dark-mode .problab-cookie-links a{color:#93c5fd}.problab-cookie-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}.problab-cookie-actions button{border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#0f172a;padding:10px 14px;font-weight:700;cursor:pointer}.problab-cookie-actions button.primary{border-color:#2563eb;background:#2563eb;color:#fff}.dark-mode .problab-cookie-actions button{background:#1e293b;color:#e5e7eb;border-color:#475569}.dark-mode .problab-cookie-actions button.primary{background:#60a5fa;color:#0f172a;border-color:#60a5fa}@media(max-width:720px){.problab-cookie-card{align-items:flex-start;flex-direction:column}.problab-cookie-actions{width:100%;justify-content:stretch}.problab-cookie-actions button{flex:1}}';
    document.head.appendChild(style);
  }

  function init() {
    var consent = getStoredConsent();
    if (consent === 'accept') {
      loadClarity();
      return;
    }
    if (consent !== 'reject') {
      addStyles();
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
