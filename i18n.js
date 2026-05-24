(function () {
  'use strict';

  var STORAGE_KEY = 'prob-lang';
  var DEFAULT_LANG = 'es';

  var translations = {
    es: {
      nav_distribuciones: 'Distribuciones',
      nav_tablas: 'Tablas',
      nav_intervalos: 'Intervalos de confianza',
      nav_tamano: 'Tamaño muestral',
      nav_contrastes: 'Contrastes',
      nav_ab: 'Test A/B',
      nav_simulaciones: 'Simulaciones',
      lang_switch_text: 'EN',
      lang_switch_label: 'Switch to English',
      footer_sobre: 'Sobre ProbLab',
      footer_metodologia: 'Metodología',
      footer_aviso: 'Aviso legal',
      footer_privacidad: 'Privacidad',
      footer_cookies: 'Cookies',
      footer_contacto: 'Contacto',
      bc_inicio: 'Inicio',
      bc_distribuciones: 'Distribuciones',
      bc_tablas: 'Tablas estadísticas',
      bc_intervalos: 'Intervalos de confianza',
      bc_tamano: 'Tamaño muestral',
      bc_contrastes: 'Contrastes de hipótesis',
      bc_ab: 'Test A/B',
      bc_simulaciones: 'Simulaciones',
      panel_config: 'Configuración',
      panel_config_info: 'Calculadora enfocada en esta distribución.',
      panel_results_title: 'Resultado y visualización',
      panel_results_sub: 'Calcula PDF/PMF, CDF y percentiles al instante.',
      label_distribucion: 'Distribución',
      label_tipo_calculo: 'Tipo de cálculo',
      label_tipo_prob: 'Tipo de probabilidad acumulada',
      label_x: 'valor de x',
      label_a: 'valor de a',
      label_b_val: 'valor de b',
      label_prob: 'Probabilidad (entre 0 y 1)',
      opt_pdf: 'Función de densidad / probabilidad',
      opt_cdf: 'Probabilidad acumulada',
      opt_quantile: 'Percentil / cuantil',
      cdf_left: 'P(X ≤ x)',
      cdf_right: 'P(X ≥ x)',
      cdf_interval: 'P(a ≤ X ≤ b)',
      btn_calcular: 'Calcular',
      result_pending: 'Resultado pendiente…',
      dist_normal: 'Normal',
      dist_binomial: 'Binomial',
      dist_poisson: 'Poisson',
      dist_studentt: 't de Student',
      dist_chisquare: 'Chi-cuadrado',
      dist_centralf: "Snedecor's F",
      dist_exponential: 'Exponencial',
      dist_negbin: 'Binomial negativa',
      dist_geometric: 'Geométrica',
      dist_uniform: 'Uniforme',
      dist_gamma: 'Gamma',
      dist_beta: 'Beta',
      dist_lognormal: 'Log-normal',
      dist_weibull: 'Weibull',
      dist_hypergeometric: 'Hipergeométrica',
      dist_bernoulli: 'Bernoulli',
      desc_normal: 'Distribución continua, simétrica y con forma de campana, definida por su media (μ) y desviación estándar (σ).',
      desc_binomial: 'Distribución discreta que modela el número de éxitos en n ensayos independientes con probabilidad p.',
      desc_poisson: 'Distribución discreta para contar eventos en un intervalo cuando ocurren a una tasa media λ.',
      desc_studentt: 'Distribución continua similar a la normal, con colas más pesadas, útil para muestras pequeñas.',
      desc_chisquare: 'Distribución continua de valores no negativos, común en pruebas de bondad de ajuste y análisis de varianza.',
      desc_centralf: 'Distribución continua que compara dos varianzas y se usa en pruebas F (por ejemplo, ANOVA).',
      desc_exponential: 'Distribución continua para tiempos de espera entre eventos de un proceso de Poisson, con tasa λ.',
      desc_negbin: 'Distribución discreta que modela el número de fallos antes de alcanzar r éxitos con probabilidad p.',
      desc_geometric: 'Distribución discreta que da el número de ensayos hasta el primer éxito con probabilidad constante p.',
      desc_uniform: 'Distribución continua con densidad constante en el intervalo [a, b].',
      desc_gamma: 'Distribución continua positiva para tiempos de espera agregados, parametrizada por forma y escala.',
      desc_beta: 'Distribución continua en [0,1], útil para modelar proporciones y probabilidades.',
      desc_lognormal: 'Distribución continua positiva cuya variable logarítmica sigue una normal.',
      desc_weibull: 'Distribución continua positiva usada en fiabilidad y análisis de vida útil.',
      desc_hypergeometric: 'Distribución discreta sin reemplazo para éxitos en una muestra extraída de una población finita.',
      desc_bernoulli: 'Distribución discreta binaria (0/1) con probabilidad de éxito p.',
      param_mean: 'Media (μ)',
      param_std: 'Desviación estándar (σ)',
      param_n: 'n',
      param_p: 'p (entre 0 y 1)',
      param_lambda: 'λ',
      param_df_nu: 'Grados de libertad (ν)',
      param_df_k: 'Grados de libertad (k)',
      param_df_d1: 'Grados de libertad (d1)',
      param_df_d2: 'Grados de libertad (d2)',
      param_rate: 'Tasa (λ)',
      param_r_target: 'r (éxitos objetivo)',
      param_a_min: 'a (mínimo)',
      param_b_max: 'b (máximo)',
      param_shape_k: 'Forma (k)',
      param_scale_theta: 'Escala (θ)',
      param_alpha: 'α (alfa)',
      param_beta_p: 'β (beta)',
      param_mu_log: 'μ (media log)',
      param_sigma_log: 'σ (desv. log)',
      param_scale_lambda: 'Escala (λ)',
      param_N_pop: 'N (población)',
      param_K_succ: 'K (éxitos en población)',
      param_n_sample: 'n (tamaño de muestra)',
      param_p_success: 'p (éxito = 1)',
      page_info_specific: 'Calculadora específica para',
    },
    en: {
      nav_distribuciones: 'Distributions',
      nav_tablas: 'Tables',
      nav_intervalos: 'Confidence intervals',
      nav_tamano: 'Sample size',
      nav_contrastes: 'Hypothesis tests',
      nav_ab: 'A/B Testing',
      nav_simulaciones: 'Simulations',
      lang_switch_text: 'ES',
      lang_switch_label: 'Cambiar a español',
      footer_sobre: 'About ProbLab',
      footer_metodologia: 'Methodology',
      footer_aviso: 'Legal notice',
      footer_privacidad: 'Privacy',
      footer_cookies: 'Cookies',
      footer_contacto: 'Contact',
      bc_inicio: 'Home',
      bc_distribuciones: 'Distributions',
      bc_tablas: 'Statistical tables',
      bc_intervalos: 'Confidence intervals',
      bc_tamano: 'Sample size',
      bc_contrastes: 'Hypothesis tests',
      bc_ab: 'A/B Testing',
      bc_simulaciones: 'Simulations',
      panel_config: 'Settings',
      panel_config_info: 'Calculator focused on this distribution.',
      panel_results_title: 'Result and visualization',
      panel_results_sub: 'Calculate PDF/PMF, CDF and percentiles instantly.',
      label_distribucion: 'Distribution',
      label_tipo_calculo: 'Calculation type',
      label_tipo_prob: 'Cumulative probability type',
      label_x: 'x value',
      label_a: 'a value',
      label_b_val: 'b value',
      label_prob: 'Probability (between 0 and 1)',
      opt_pdf: 'Density / probability function',
      opt_cdf: 'Cumulative probability',
      opt_quantile: 'Percentile / quantile',
      cdf_left: 'P(X ≤ x)',
      cdf_right: 'P(X ≥ x)',
      cdf_interval: 'P(a ≤ X ≤ b)',
      btn_calcular: 'Calculate',
      result_pending: 'Pending result…',
      dist_normal: 'Normal',
      dist_binomial: 'Binomial',
      dist_poisson: 'Poisson',
      dist_studentt: "Student's t",
      dist_chisquare: 'Chi-square',
      dist_centralf: "Snedecor's F",
      dist_exponential: 'Exponential',
      dist_negbin: 'Negative binomial',
      dist_geometric: 'Geometric',
      dist_uniform: 'Uniform',
      dist_gamma: 'Gamma',
      dist_beta: 'Beta',
      dist_lognormal: 'Log-normal',
      dist_weibull: 'Weibull',
      dist_hypergeometric: 'Hypergeometric',
      dist_bernoulli: 'Bernoulli',
      desc_normal: 'Continuous, symmetric, bell-shaped distribution defined by its mean (μ) and standard deviation (σ).',
      desc_binomial: 'Discrete distribution modeling the number of successes in n independent trials with probability p.',
      desc_poisson: 'Discrete distribution for counting events in an interval when they occur at average rate λ.',
      desc_studentt: 'Continuous distribution similar to the normal, with heavier tails, useful for small samples.',
      desc_chisquare: 'Continuous distribution of non-negative values, common in goodness-of-fit tests and variance analysis.',
      desc_centralf: 'Continuous distribution comparing two variances, used in F-tests (e.g., ANOVA).',
      desc_exponential: 'Continuous distribution for waiting times between events in a Poisson process, with rate λ.',
      desc_negbin: 'Discrete distribution modeling the number of failures before achieving r successes with probability p.',
      desc_geometric: 'Discrete distribution giving the number of trials until the first success with constant probability p.',
      desc_uniform: 'Continuous distribution with constant density on the interval [a, b].',
      desc_gamma: 'Positive continuous distribution for aggregate waiting times, parameterized by shape and scale.',
      desc_beta: 'Continuous distribution on [0,1], useful for modeling proportions and probabilities.',
      desc_lognormal: 'Positive continuous distribution whose logarithmic variable follows a normal distribution.',
      desc_weibull: 'Positive continuous distribution used in reliability and lifetime analysis.',
      desc_hypergeometric: 'Discrete distribution without replacement for successes in a sample from a finite population.',
      desc_bernoulli: 'Binary discrete distribution (0/1) with success probability p.',
      param_mean: 'Mean (μ)',
      param_std: 'Standard deviation (σ)',
      param_n: 'n',
      param_p: 'p (between 0 and 1)',
      param_lambda: 'λ',
      param_df_nu: 'Degrees of freedom (ν)',
      param_df_k: 'Degrees of freedom (k)',
      param_df_d1: 'Degrees of freedom (d1)',
      param_df_d2: 'Degrees of freedom (d2)',
      param_rate: 'Rate (λ)',
      param_r_target: 'r (target successes)',
      param_a_min: 'a (minimum)',
      param_b_max: 'b (maximum)',
      param_shape_k: 'Shape (k)',
      param_scale_theta: 'Scale (θ)',
      param_alpha: 'α (alpha)',
      param_beta_p: 'β (beta)',
      param_mu_log: 'μ (log mean)',
      param_sigma_log: 'σ (log std)',
      param_scale_lambda: 'Scale (λ)',
      param_N_pop: 'N (population)',
      param_K_succ: 'K (successes in population)',
      param_n_sample: 'n (sample size)',
      param_p_success: 'p (success = 1)',
      page_info_specific: 'Calculator focused on',
    }
  };

  // Detect language from URL path (/en/ prefix = English)
  function isEnUrl() {
    return window.location.pathname.indexOf('/en/') !== -1;
  }

  function getLang() {
    if (isEnUrl()) return 'en';
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; } catch (e) { return DEFAULT_LANG; }
  }

  function setLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  // Returns the site base path ('' for custom domains, '/reponame' for GitHub Pages)
  function getSiteBase() {
    if (window.location.hostname.endsWith('.github.io')) {
      var seg = window.location.pathname.split('/')[1];
      return seg ? '/' + seg : '';
    }
    return '';
  }

  // Build the URL for the opposite language
  function getToggleUrl() {
    var base = getSiteBase();                          // e.g. '' or '/simprobscom'
    var full = window.location.pathname;
    var rel  = full.slice(base.length) || '/';        // path relative to site root

    if (isEnUrl()) {
      // /en/normal.html → /normal.html, /en/ → /
      var spanish = rel.replace('/en/', '/');
      if (spanish === '/index.html') spanish = '/';
      return base + spanish;
    } else {
      // /normal.html → /en/normal.html, / → /en/index.html
      var parts = rel.split('/');
      parts.splice(1, 0, 'en');
      var url = base + parts.join('/');
      if (url.slice(-1) === '/') url += 'index.html';
      return url;
    }
  }

  function t(key) {
    var lang = getLang();
    var dict = translations[lang] || translations[DEFAULT_LANG];
    var val = dict[key];
    if (val !== undefined) return val;
    val = translations[DEFAULT_LANG][key];
    return val !== undefined ? val : key;
  }

  // ── Nav ──────────────────────────────────────────────────────────────────

  var navMap = [
    { pattern: 'distribuciones/', key: 'nav_distribuciones' },
    { pattern: 'tablas-estadisticas/', key: 'nav_tablas' },
    { pattern: 'intervalos-confianza/', key: 'nav_intervalos' },
    { pattern: 'tamano-muestral/', key: 'nav_tamano' },
    { pattern: 'contrastes-hipotesis/', key: 'nav_contrastes' },
    { pattern: 'ab-testing/', key: 'nav_ab' },
    { pattern: 'simulaciones/', key: 'nav_simulaciones' }
  ];

  function translateNav() {
    var links = document.querySelectorAll('.site-nav-links a');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = (a.getAttribute('href') || '').replace(/^\.\.\//, '');
      for (var j = 0; j < navMap.length; j++) {
        if (href.indexOf(navMap[j].pattern) !== -1) {
          a.textContent = t(navMap[j].key);
          break;
        }
      }
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────

  var footerMap = [
    { pattern: 'sobre.html', key: 'footer_sobre' },
    { pattern: 'metodologia.html', key: 'footer_metodologia' },
    { pattern: 'aviso-legal.html', key: 'footer_aviso' },
    { pattern: 'privacidad.html', key: 'footer_privacidad' },
    { pattern: 'cookies.html', key: 'footer_cookies' },
    { pattern: 'mailto:', key: 'footer_contacto' }
  ];

  function translateFooter() {
    var links = document.querySelectorAll('.legal-footer a');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute('href') || '';
      for (var j = 0; j < footerMap.length; j++) {
        if (href.indexOf(footerMap[j].pattern) !== -1) {
          a.textContent = t(footerMap[j].key);
          break;
        }
      }
    }
  }

  // ── Breadcrumbs ──────────────────────────────────────────────────────────

  var bcHrefMap = [
    { pattern: 'distribuciones/', key: 'bc_distribuciones' },
    { pattern: 'tablas-estadisticas/', key: 'bc_tablas' },
    { pattern: 'intervalos-confianza/', key: 'bc_intervalos' },
    { pattern: 'tamano-muestral/', key: 'bc_tamano' },
    { pattern: 'contrastes-hipotesis/', key: 'bc_contrastes' },
    { pattern: 'ab-testing/', key: 'bc_ab' },
    { pattern: 'simulaciones/', key: 'bc_simulaciones' }
  ];

  var bcTextMap = [
    { texts: ['Inicio', 'Home'], key: 'bc_inicio' },
    { texts: ['Distribuciones', 'Distributions'], key: 'bc_distribuciones' },
    { texts: ['Tablas estadísticas', 'Statistical tables'], key: 'bc_tablas' },
    { texts: ['Intervalos de confianza', 'Confidence intervals'], key: 'bc_intervalos' },
    { texts: ['Tamaño muestral', 'Sample size'], key: 'bc_tamano' },
    { texts: ['Contrastes de hipótesis', 'Hypothesis tests'], key: 'bc_contrastes' },
    { texts: ['Test A/B', 'A/B Testing'], key: 'bc_ab' },
    { texts: ['Simulaciones', 'Simulations'], key: 'bc_simulaciones' }
  ];

  function translateBreadcrumbs() {
    var links = document.querySelectorAll('.breadcrumbs a');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = (a.getAttribute('href') || '').replace(/^\.\.\//, '');
      var text = a.textContent.trim();
      var matched = false;

      for (var j = 0; j < bcHrefMap.length; j++) {
        if (href.indexOf(bcHrefMap[j].pattern) !== -1) {
          a.textContent = t(bcHrefMap[j].key);
          matched = true;
          break;
        }
      }
      if (matched) continue;

      for (var k = 0; k < bcTextMap.length; k++) {
        if (bcTextMap[k].texts.indexOf(text) !== -1) {
          a.textContent = t(bcTextMap[k].key);
          break;
        }
      }
    }
  }

  // ── Calculator UI ─────────────────────────────────────────────────────────

  function translateDistributionSelect() {
    var select = document.getElementById('distribution');
    if (!select) return;
    var opts = select.options;
    for (var i = 0; i < opts.length; i++) {
      var key = 'dist_' + opts[i].value;
      opts[i].text = t(key);
    }
  }

  var staticLabelMap = [
    { texts: ['Distribución', 'Distribution'], key: 'label_distribucion' },
    { texts: ['Tipo de cálculo', 'Calculation type'], key: 'label_tipo_calculo' },
    { texts: ['Tipo de probabilidad acumulada', 'Cumulative probability type'], key: 'label_tipo_prob' },
    { texts: ['valor de x', 'x value'], key: 'label_x' },
    { texts: ['valor de b', 'b value'], key: 'label_b_val' }
  ];

  function translateStaticLabels() {
    var labels = document.querySelectorAll('.form-group label');
    for (var i = 0; i < labels.length; i++) {
      var text = labels[i].textContent.trim();
      for (var j = 0; j < staticLabelMap.length; j++) {
        if (staticLabelMap[j].texts.indexOf(text) !== -1) {
          labels[i].textContent = t(staticLabelMap[j].key);
          break;
        }
      }
    }
  }

  function translateCalculationSelect() {
    var sel = document.getElementById('calculation');
    if (!sel) return;
    var opts = sel.options;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === 'pdf') opts[i].text = t('opt_pdf');
      if (opts[i].value === 'cdf') opts[i].text = t('opt_cdf');
      if (opts[i].value === 'quantile') opts[i].text = t('opt_quantile');
    }
  }

  function translateCdfModeSelect() {
    var sel = document.getElementById('cdfMode');
    if (!sel) return;
    var opts = sel.options;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === 'left') opts[i].text = t('cdf_left');
      if (opts[i].value === 'right') opts[i].text = t('cdf_right');
      if (opts[i].value === 'interval') opts[i].text = t('cdf_interval');
    }
  }

  function translateCalculatorMisc() {
    var btn = document.querySelector('.calculate-btn');
    if (btn) btn.textContent = t('btn_calcular');

    var resultBox = document.getElementById('result');
    if (resultBox) {
      var txt = resultBox.textContent.trim();
      if (txt === 'Resultado pendiente…' || txt === 'Pending result…') {
        resultBox.textContent = t('result_pending');
      }
    }

    var panelH2 = document.querySelectorAll('.control-panel .panel-heading h2');
    for (var i = 0; i < panelH2.length; i++) {
      var h = panelH2[i].textContent.trim();
      if (h === 'Configuración' || h === 'Settings') {
        panelH2[i].textContent = t('panel_config');
      }
    }

    var resultsH2 = document.querySelectorAll('.results-panel .panel-heading h2');
    for (var j = 0; j < resultsH2.length; j++) {
      var rh = resultsH2[j].textContent.trim();
      if (rh === 'Resultado y visualización' || rh === 'Result and visualization') {
        resultsH2[j].textContent = t('panel_results_title');
      }
    }

    var resultsSub = document.querySelectorAll('.results-panel .panel-heading p');
    for (var k = 0; k < resultsSub.length; k++) {
      var rs = resultsSub[k].textContent.trim();
      if (rs === 'Calcula PDF/PMF, CDF y percentiles al instante.' || rs === 'Calculate PDF/PMF, CDF and percentiles instantly.') {
        resultsSub[k].textContent = t('panel_results_sub');
      }
    }

    var distInfo = document.getElementById('distributionPageInfo');
    if (distInfo) {
      var infoTxt = distInfo.textContent.trim();
      if (infoTxt === 'Calculadora enfocada en esta distribución.' || infoTxt === 'Calculator focused on this distribution.') {
        distInfo.textContent = t('panel_config_info');
      }
    }
  }

  // ── Language switcher ─────────────────────────────────────────────────────

  var langSwitcherLi = null;

  function updateLangSwitcher() {
    if (!langSwitcherLi) return;
    var btn = langSwitcherLi.querySelector('.lang-btn');
    if (!btn) return;
    btn.textContent = t('lang_switch_text');
    btn.title = t('lang_switch_label');
    btn.setAttribute('aria-label', t('lang_switch_label'));
  }

  function injectLangSwitcher() {
    var nav = document.querySelector('.site-nav-links');
    if (!nav) return;

    var li = document.createElement('li');
    li.style.cssText = 'display:flex;align-items:center;';

    var btn = document.createElement('button');
    btn.className = 'lang-btn theme-btn';
    btn.textContent = t('lang_switch_text');
    btn.title = t('lang_switch_label');
    btn.setAttribute('aria-label', t('lang_switch_label'));

    btn.addEventListener('click', function () {
      var url = getToggleUrl();
      // For Spanish pages: navigate to /en/ version
      // For English pages: navigate back to root Spanish version
      // If no /en/ page exists yet, fall back to localStorage toggle
      if (isEnUrl()) {
        window.location.href = url;
      } else {
        // Check if /en/ version exists by attempting navigation
        // For now navigate optimistically; server will 404 if not translated yet
        window.location.href = url;
      }
    });

    li.appendChild(btn);
    nav.appendChild(li);
    langSwitcherLi = li;
  }

  // ── Apply all translations ────────────────────────────────────────────────

  function applyLang() {
    var lang = getLang();
    document.documentElement.lang = lang;
    translateNav();
    translateFooter();
    translateBreadcrumbs();
    translateDistributionSelect();
    translateStaticLabels();
    translateCalculationSelect();
    translateCdfModeSelect();
    translateCalculatorMisc();
    updateLangSwitcher();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: getLang() } }));
  }

  // ── Public API ────────────────────────────────────────────────────────────

  window.i18n = { t: t, getLang: getLang, applyLang: applyLang };

  function init() {
    injectLangSwitcher();
    applyLang();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
