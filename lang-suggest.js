(function () {
  'use strict';

  var PREF_KEY = 'prob-lang';
  var NAMES = { es: 'Español', en: 'English' };

  function getPref() {
    try { return localStorage.getItem(PREF_KEY); } catch (e) { return null; }
  }

  function setPref(lang) {
    try { localStorage.setItem(PREF_KEY, lang); } catch (e) {}
  }

  var html = document.documentElement;
  var pageLang = html.getAttribute('lang') || 'es';
  var altLang = html.getAttribute('data-alt-lang');
  var altUrl = html.getAttribute('data-alt-lang-url');

  // Sticky redirect: only fires when the user has explicitly picked a
  // language before (localStorage). Bots never set this, so crawlers always
  // see the URL they requested — this cannot confuse indexing.
  var pref = getPref();
  if (pref && altLang && altUrl && pref === altLang && pref !== pageLang) {
    window.location.replace(altUrl);
    return;
  }

  function makeItem(lang, label, href, isCurrent) {
    var item = document.createElement('li');
    item.setAttribute('role', 'none');
    if (isCurrent) {
      var span = document.createElement('span');
      span.className = 'lang-switch-current';
      span.setAttribute('role', 'menuitem');
      span.setAttribute('aria-current', 'true');
      span.textContent = label;
      item.appendChild(span);
    } else {
      var a = document.createElement('a');
      a.href = href;
      a.hreflang = lang;
      a.setAttribute('role', 'menuitem');
      a.textContent = label;
      a.addEventListener('click', function () { setPref(lang); });
      item.appendChild(a);
    }
    return item;
  }

  function buildDropdown() {
    if (!altLang || !altUrl) return;

    var li = document.getElementById('nav-lang-li');
    var isNew = !li;
    if (isNew) {
      li = document.createElement('li');
      li.id = 'nav-lang-li';
    }
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.classList.add('lang-switcher');
    li.innerHTML = '';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-btn lang-switch-btn';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', pageLang === 'es' ? 'Cambiar idioma' : 'Change language');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z"/></svg><span>' + (pageLang === 'es' ? 'ES' : 'EN') + '</span>';

    var menu = document.createElement('ul');
    menu.className = 'lang-switch-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    if (pageLang === 'es') {
      menu.appendChild(makeItem('es', NAMES.es, '#', true));
      menu.appendChild(makeItem(altLang, NAMES[altLang] || altLang, altUrl, false));
    } else {
      menu.appendChild(makeItem('en', NAMES.en, '#', true));
      menu.appendChild(makeItem(altLang, NAMES[altLang] || altLang, altUrl, false));
    }

    function closeMenu() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    function toggleMenu() {
      var willOpen = menu.hidden;
      menu.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMenu();
    });
    document.addEventListener('click', function (e) {
      if (!li.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    li.appendChild(btn);
    li.appendChild(menu);

    if (isNew) {
      var themeLi = document.getElementById('nav-theme-li');
      var navLinks = document.querySelector('.site-nav-links');
      if (themeLi && themeLi.parentNode) {
        themeLi.parentNode.insertBefore(li, themeLi);
      } else if (navLinks) {
        navLinks.appendChild(li);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildDropdown);
  } else {
    buildDropdown();
  }
}());
