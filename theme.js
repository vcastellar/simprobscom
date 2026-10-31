(function () {
  'use strict';

  var STORAGE_KEY = 'prob-theme';
  var IS_EN = document.documentElement.lang === 'en';

  // ── Tema claro / oscuro ───────────────────────────────────────────────
  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setStored(val) {
    try { localStorage.setItem(STORAGE_KEY, val); } catch (e) {}
  }

  function applyTheme(dark) {
    if (dark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }

  function isDark() {
    return document.documentElement.classList.contains('dark-mode');
  }

  function initTheme() {
    var storedTheme = getStored();

    if (!storedTheme) {
      storedTheme = 'light';
      setStored(storedTheme);
    }

    applyTheme(storedTheme === 'dark');

    var btn = document.querySelector('.site-nav-links .theme-btn');
    if (!btn) return;

    function updateIcon() {
      btn.setAttribute('aria-pressed', isDark() ? 'true' : 'false');
      btn.innerHTML = isDark()
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }

    updateIcon();

    btn.addEventListener('click', function () {
      var nowDark = !isDark();
      applyTheme(nowDark);
      setStored(nowDark ? 'dark' : 'light');
      updateIcon();
    });
  }

  // ── Menú de navegación en pantallas estrechas ─────────────────────────
  // El botón se crea aquí para que todas las páginas lo tengan sin tocar su
  // HTML; el CSS (style_new.css, @media max-width 1100px) hace el resto.
  // Los dos iconos conviven en el botón y se alternan con `hidden`: si se
  // reemplazara el SVG al abrir, el elemento pulsado quedaría fuera del DOM y
  // el detector de clics fuera del menú lo cerraría al instante.
  var ICON_MENU = '<svg class="nav-toggle-open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  var ICON_CLOSE = '<svg class="nav-toggle-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" hidden><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';

  function initNavToggle() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    var inner = nav.querySelector('.site-nav-inner');
    var links = nav.querySelector('.site-nav-links');
    if (!inner || !links || nav.querySelector('.nav-toggle')) return;

    if (!links.id) links.id = 'site-menu';

    var btn = document.createElement('button');
    btn.className = 'nav-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-controls', links.id);
    btn.innerHTML = ICON_MENU + ICON_CLOSE;
    var iconOpen = btn.querySelector('.nav-toggle-open');
    var iconClose = btn.querySelector('.nav-toggle-close');

    function setOpen(open) {
      nav.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open
        ? (IS_EN ? 'Close menu' : 'Cerrar menú')
        : (IS_EN ? 'Open menu' : 'Abrir menú'));
      iconOpen.hidden = open;
      iconClose.hidden = !open;
    }

    function insideNav(e) {
      if (typeof e.composedPath === 'function') {
        return e.composedPath().indexOf(nav) !== -1;
      }
      return nav.contains(e.target);
    }

    setOpen(false);

    btn.addEventListener('click', function () {
      setOpen(!nav.classList.contains('nav-open'));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
        setOpen(false);
        btn.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (nav.classList.contains('nav-open') && !insideNav(e)) {
        setOpen(false);
      }
    });

    // Al volver a una pantalla ancha, el menú desplegable deja de existir.
    var mq = window.matchMedia('(min-width: 1101px)');
    function onChange(e) { if (e.matches) setOpen(false); }
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);

    inner.appendChild(btn);
  }

  // ── Sección activa en la navegación ───────────────────────────────────
  // Marca el enlace cuyo destino coincide con la página actual o con alguna
  // de sus migas de pan (así una calculadora resalta su hub).
  function normalizePath(p) {
    return (p || '').replace(/index\.html$/, '');
  }

  function initActiveLink() {
    var links = document.querySelectorAll('.site-nav-links > li:not([id]) > a');
    if (!links.length) return;

    var current = normalizePath(location.pathname);
    var targets = [current];
    var crumbs = document.querySelectorAll('.breadcrumbs a');
    for (var i = 0; i < crumbs.length; i++) {
      targets.push(normalizePath(crumbs[i].pathname));
    }

    for (var j = 0; j < links.length; j++) {
      var p = normalizePath(links[j].pathname);
      if (targets.indexOf(p) !== -1) {
        links[j].classList.add('is-active');
        if (p === current) links[j].setAttribute('aria-current', 'page');
      }
    }
  }

  // ── Botones del hero de la portada → buscador / asistente ────────────
  function delegateClick(fromSel, toSel) {
    var sources = document.querySelectorAll(fromSel);
    for (var i = 0; i < sources.length; i++) {
      sources[i].addEventListener('click', function () {
        var target = document.querySelector(toSel);
        if (target) target.click();
      });
    }
  }

  function initHeroCtas() {
    delegateClick('.hero-cta-search', '.site-nav-links .search-btn');
    delegateClick('.hero-cta-wizard', '.site-nav-links .wz-nav-btn');
  }

  function init() {
    initTheme();
    initNavToggle();
    initActiveLink();
    initHeroCtas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
