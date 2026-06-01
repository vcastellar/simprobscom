(function () {
  'use strict';

  // ── Decision tree ─────────────────────────────────────────────────────
  var NODES = {
    root: {
      q: '¿Qué quieres hacer?',
      opts: [
        { l: 'Calcular probabilidades de una distribución', d: 'P(X≤x), percentiles, PDF, CDF', i: '∫', next: 'dist' },
        { l: 'Consultar una tabla estadística', d: 'Valores críticos de Z, t, chi², F, binomial…', i: '▦', url: '/tablas-estadisticas/', name: 'Tablas estadísticas' },
        { l: 'Determinar el tamaño muestral', d: 'Cuántas observaciones necesita mi estudio', i: 'n', next: 'sample_goal' },
        { l: 'Analizar datos que ya tengo', d: 'Intervalos de confianza o contrastes de hipótesis', i: 'σ', next: 'analyze_goal' },
        { l: 'Diseñar o analizar un test A/B', d: 'Significación, potencia, bayesiano o simulación', i: 'A/B', url: '/ab-testing/', name: 'Herramientas para test A/B' },
        { l: 'Aprender con simulaciones interactivas', d: 'TCL, Markov, bootstrap, errores tipo I/II…', i: '∿', url: '/simulaciones/', name: 'Simulaciones estadísticas' }
      ]
    },

    dist: {
      q: '¿Qué distribución necesitas?',
      opts: [
        { l: 'Normal', d: 'Variable continua simétrica (gaussiana)', url: '/normal.html', name: 'Distribución Normal' },
        { l: 'Binomial', d: 'Número de éxitos en n ensayos', url: '/binomial.html', name: 'Distribución Binomial' },
        { l: 'Poisson', d: 'Número de eventos en un intervalo fijo', url: '/poisson.html', name: 'Distribución Poisson' },
        { l: 't de Student', d: 'Media muestral con varianza desconocida', url: '/studentt.html', name: 'Distribución t de Student' },
        { l: 'Chi-cuadrado / F de Snedecor', d: 'Para varianzas, bondad de ajuste o ANOVA', url: '/distribuciones/', name: 'Ver distribuciones chi² y F' },
        { l: 'Otra distribución', d: 'Exponencial, Gamma, Beta, Weibull, Lognormal…', url: '/distribuciones/', name: 'Catálogo de distribuciones' }
      ]
    },

    sample_goal: {
      q: '¿Para qué objetivo necesitas el tamaño muestral?',
      opts: [
        { l: 'Estimar con un intervalo de confianza', d: 'Quiero acotar el margen de error', next: 'sample_ic_param' },
        { l: 'Contrastar una hipótesis', d: 'Quiero detectar una diferencia con cierta potencia', next: 'sample_h0_n' },
        { l: 'Test A/B', d: 'Experimento con variante control y tratamiento', url: '/ab-testing-potencia.html', name: 'Tamaño muestral para test A/B' }
      ]
    },

    sample_ic_param: {
      q: '¿Qué parámetro quieres estimar?',
      opts: [
        { l: 'Una proporción', d: 'Encuesta, tasa de conversión, porcentaje', url: '/tamano-muestral-una-proporcion.html', name: 'Tamaño muestral: una proporción (IC)' },
        { l: 'Una media', d: 'Variable continua en una sola muestra', url: '/tamano-muestral-una-media.html', name: 'Tamaño muestral: una media (IC)' },
        { l: 'Diferencia entre dos grupos', d: 'Comparar dos grupos independientes', next: 'sample_ic_two' },
        { l: 'Población finita', d: 'El tamaño total de la población es conocido', next: 'sample_ic_finite' }
      ]
    },

    sample_ic_two: {
      q: '¿Qué tipo de variable comparas?',
      opts: [
        { l: 'Proporciones', url: '/tamano-muestral-dos-proporciones.html', name: 'Tamaño muestral: dos proporciones (IC)' },
        { l: 'Medias', url: '/tamano-muestral-diferencia-medias.html', name: 'Tamaño muestral: diferencia de medias (IC)' },
        { l: 'Medias apareadas', url: '/tamano-muestral-medias-apareadas-ic.html', name: 'Tamaño muestral: medias apareadas (IC)' },
        { l: 'Odds ratio', url: '/tamano-muestral-odds-ratio-ic.html', name: 'Tamaño muestral: odds ratio (IC)' }
      ]
    },

    sample_ic_finite: {
      q: '¿Qué tipo de variable?',
      opts: [
        { l: 'Proporción', url: '/tamano-muestral-proporcion-poblacion-finita.html', name: 'Tamaño muestral: proporción (pob. finita)' },
        { l: 'Media', url: '/tamano-muestral-media-poblacion-finita.html', name: 'Tamaño muestral: media (pob. finita)' }
      ]
    },

    sample_h0_n: {
      q: '¿Cuántas muestras o grupos?',
      opts: [
        { l: 'Una sola muestra', next: 'sample_h0_one' },
        { l: 'Dos grupos independientes', next: 'sample_h0_two' },
        { l: 'Dos muestras apareadas', next: 'sample_h0_paired' },
        { l: 'Más de dos grupos (ANOVA)', url: '/tamano-muestral-anova.html', name: 'Tamaño muestral para ANOVA' }
      ]
    },

    sample_h0_one: {
      q: '¿Qué tipo de variable?',
      opts: [
        { l: 'Media', url: '/tamano-muestral-contraste-una-media.html', name: 'Tamaño muestral: una media (H0)' },
        { l: 'Proporción', url: '/tamano-muestral-contraste-una-proporcion.html', name: 'Tamaño muestral: una proporción (H0)' },
        { l: 'Varianza', url: '/tamano-muestral-una-varianza.html', name: 'Tamaño muestral: una varianza (H0)' },
        { l: 'Correlación de Pearson', url: '/tamano-muestral-correlacion.html', name: 'Tamaño muestral: correlación (H0)' }
      ]
    },

    sample_h0_two: {
      q: '¿Qué tipo de variable?',
      opts: [
        { l: 'Proporciones', url: '/tamano-muestral-dos-proporciones.html', name: 'Tamaño muestral: dos proporciones (H0)' },
        { l: 'Medias', url: '/tamano-muestral-contraste-una-media.html', name: 'Tamaño muestral: diferencia de medias (H0)' },
        { l: 'Varianzas', url: '/tamano-muestral-dos-varianzas.html', name: 'Tamaño muestral: dos varianzas (H0)' },
        { l: 'Odds ratio', url: '/tamano-muestral-odds-ratio.html', name: 'Tamaño muestral: odds ratio (H0)' },
        { l: 'No inferioridad / equivalencia', url: '/tamano-muestral-no-inferioridad.html', name: 'Tamaño muestral: no inferioridad (H0)' }
      ]
    },

    sample_h0_paired: {
      q: '¿Qué tipo de variable?',
      opts: [
        { l: 'Medias apareadas', url: '/tamano-muestral-medias-apareadas.html', name: 'Tamaño muestral: medias apareadas (H0)' },
        { l: 'Proporciones apareadas (McNemar)', url: '/tamano-muestral-proporciones-apareadas.html', name: 'Tamaño muestral: proporciones apareadas (H0)' }
      ]
    },

    analyze_goal: {
      q: '¿Qué tipo de análisis necesitas?',
      opts: [
        { l: 'Intervalo de confianza', d: 'Rango de valores plausibles para el parámetro', next: 'ic_param' },
        { l: 'Contraste de hipótesis', d: 'P-valor, región crítica, decisión estadística', next: 'h0_samples' },
        { l: 'Verificar normalidad', d: 'Comprobar si los datos siguen una distribución normal', next: 'normality' }
      ]
    },

    ic_param: {
      q: '¿Qué parámetro quieres estimar?',
      opts: [
        { l: 'Media', next: 'ic_mean' },
        { l: 'Proporción', next: 'ic_prop' },
        { l: 'Diferencia entre dos grupos', next: 'ic_two' },
        { l: 'Varianza u odds ratio', next: 'ic_other' }
      ]
    },

    ic_mean: {
      q: '¿Conoces la desviación típica poblacional (σ)?',
      opts: [
        { l: 'Sí, σ es conocida', url: '/intervalo-confianza-media-sigma-conocida.html', name: 'IC para la media (σ conocida)' },
        { l: 'No, uso la desviación muestral s', url: '/intervalo-confianza-media.html', name: 'IC para la media (σ desconocida)' },
        { l: 'Población finita', url: '/intervalo-confianza-media-poblacion-finita.html', name: 'IC para la media (pob. finita)' }
      ]
    },

    ic_prop: {
      q: '¿La población es finita (tamaño conocido)?',
      opts: [
        { l: 'No, o es muy grande', url: '/intervalo-confianza-proporcion.html', name: 'IC para una proporción' },
        { l: 'Sí, tamaño conocido', url: '/intervalo-confianza-proporcion-poblacion-finita.html', name: 'IC para proporción (pob. finita)' }
      ]
    },

    ic_two: {
      q: '¿Qué tipo de comparación?',
      opts: [
        { l: 'Diferencia de medias', url: '/intervalo-confianza-diferencia-medias.html', name: 'IC para la diferencia de medias' },
        { l: 'Medias apareadas', url: '/intervalo-confianza-medias-apareadas.html', name: 'IC para medias apareadas' },
        { l: 'Diferencia de proporciones', url: '/intervalo-confianza-diferencia-proporciones.html', name: 'IC para la diferencia de proporciones' },
        { l: 'Ratio de proporciones (riesgo relativo)', url: '/intervalo-confianza-ratio-proporciones.html', name: 'IC para el ratio de proporciones' }
      ]
    },

    ic_other: {
      q: '¿Qué parámetro?',
      opts: [
        { l: 'Varianza', url: '/intervalo-confianza-varianza.html', name: 'IC para la varianza' },
        { l: 'Odds ratio', url: '/intervalo-confianza-odds-ratio.html', name: 'IC para el odds ratio' }
      ]
    },

    h0_samples: {
      q: '¿Cuántas muestras o grupos tienes?',
      opts: [
        { l: 'Una sola muestra', next: 'h0_one' },
        { l: 'Dos grupos independientes', next: 'h0_two' },
        { l: 'Dos muestras relacionadas (apareadas)', next: 'h0_paired' },
        { l: 'Más de dos grupos', url: '/anova.html', name: 'ANOVA de un factor' },
        { l: 'Tabla de contingencia (variables categóricas)', next: 'h0_contingency' }
      ]
    },

    h0_one: {
      q: '¿Qué tipo de variable?',
      opts: [
        { l: 'Media', url: '/contraste-hipotesis-una-media.html', name: 'Contraste para una media' },
        { l: 'Proporción', url: '/contraste-hipotesis-una-proporcion.html', name: 'Contraste para una proporción' },
        { l: 'Varianza', url: '/contraste-hipotesis-varianzas.html', name: 'Contraste para una varianza' },
        { l: 'Correlación de Pearson', url: '/contraste-hipotesis-correlacion.html', name: 'Contraste de correlación de Pearson' }
      ]
    },

    h0_two: {
      q: '¿Qué tipo de variable?',
      opts: [
        { l: 'Medias', url: '/contraste-hipotesis-dos-medias.html', name: 'Contraste para dos medias independientes' },
        { l: 'Proporciones', url: '/contraste-hipotesis-dos-proporciones.html', name: 'Contraste para dos proporciones' },
        { l: 'Varianzas (test F)', url: '/contraste-hipotesis-dos-varianzas.html', name: 'Contraste para dos varianzas' },
        { l: 'Odds ratio', url: '/contraste-hipotesis-odds-ratio.html', name: 'Contraste para el odds ratio' },
        { l: 'No inferioridad / equivalencia', url: '/contraste-hipotesis-no-inferioridad.html', name: 'Contraste de no inferioridad' }
      ]
    },

    h0_paired: {
      q: '¿Qué tipo de variable?',
      opts: [
        { l: 'Medias apareadas', url: '/contraste-hipotesis-medias-apareadas.html', name: 'Contraste para medias apareadas' },
        { l: 'Proporciones apareadas (McNemar)', url: '/contraste-hipotesis-proporciones-apareadas.html', name: 'Test de McNemar' }
      ]
    },

    h0_contingency: {
      q: '¿Qué quieres analizar?',
      opts: [
        { l: 'Independencia entre dos variables', url: '/contraste-independencia-chi-cuadrado.html', name: 'Chi-cuadrado de independencia' },
        { l: 'Tabla 2×2 con frecuencias bajas', url: '/test-exacto-fisher.html', name: 'Test exacto de Fisher' },
        { l: 'Proporciones apareadas', url: '/contraste-hipotesis-proporciones-apareadas.html', name: 'Test de McNemar' },
        { l: 'Bondad de ajuste a una distribución teórica', url: '/chi-cuadrado-bondad-ajuste.html', name: 'Chi-cuadrado de bondad de ajuste' }
      ]
    },

    normality: {
      q: '¿Cuántas observaciones tienes aproximadamente?',
      opts: [
        { l: 'Menos de 50', d: 'Shapiro-Wilk es el más potente para muestras pequeñas', url: '/shapiro-wilk-normalidad.html', name: 'Test de Shapiro-Wilk' },
        { l: '50 o más', d: 'Kolmogorov-Smirnov es adecuado para muestras grandes', url: '/kolmogorov-smirnov-bondad-ajuste.html', name: 'Test de Kolmogorov-Smirnov' },
        { l: 'No estoy seguro', d: 'Shapiro-Wilk es la opción habitual en la práctica', url: '/shapiro-wilk-normalidad.html', name: 'Test de Shapiro-Wilk' }
      ]
    }
  };

  // ── URL helper (mirrors search.js) ────────────────────────────────────
  var SITE_ROOT = (function () {
    var el = document.currentScript ||
              document.querySelector('script[src$="wizard.js"]');
    if (el && el.src) {
      return el.src.replace(/wizard\.js([?#].*)?$/, '');
    }
    return window.location.origin + '/';
  }());

  function toUrl(absPath) {
    return SITE_ROOT + absPath.slice(1);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── State ─────────────────────────────────────────────────────────────
  var modal, contentEl;
  var stack = []; // [{nodeId, label}]

  // ── Rendering ─────────────────────────────────────────────────────────
  function renderNode(nodeId) {
    var node = NODES[nodeId];
    if (!node) return;

    var breadcrumb = '';
    if (stack.length > 0) {
      breadcrumb = '<div class="wz-breadcrumb">' +
        stack.map(function (s) { return '<span>' + esc(s.label) + '</span>'; }).join('<span class="wz-bc-sep">›</span>') +
        '</div>';
    }

    var opts = '';
    node.opts.forEach(function (opt, i) {
      var isTerminal = !!opt.url;
      opts += '<button class="wz-opt" data-idx="' + i + '" type="button">' +
        (opt.i ? '<span class="wz-opt-icon">' + esc(opt.i) + '</span>' : '') +
        '<span class="wz-opt-body">' +
          '<span class="wz-opt-label">' + esc(opt.l) + '</span>' +
          (opt.d ? '<span class="wz-opt-desc">' + esc(opt.d) + '</span>' : '') +
        '</span>' +
        (isTerminal ? '<span class="wz-opt-arrow">→</span>' : '<span class="wz-opt-arrow wz-opt-arrow--next">›</span>') +
        '</button>';
    });

    contentEl.innerHTML =
      '<div class="wz-header">' +
        '<span class="wz-title">¿Qué herramienta necesito?</span>' +
        '<button class="wz-close" type="button" aria-label="Cerrar">✕</button>' +
      '</div>' +
      (breadcrumb ? '<div class="wz-trail">' + breadcrumb + '</div>' : '') +
      '<div class="wz-body">' +
        '<p class="wz-question">' + esc(node.q) + '</p>' +
        '<div class="wz-opts">' + opts + '</div>' +
      '</div>' +
      (stack.length > 0 ?
        '<div class="wz-footer"><button class="wz-back" type="button">← Atrás</button></div>' : '');

    contentEl.querySelector('.wz-close').addEventListener('click', closeModal);

    if (stack.length > 0) {
      contentEl.querySelector('.wz-back').addEventListener('click', function () {
        var prev = stack.pop();
        renderNode(prev.nodeId);
      });
    }

    contentEl.querySelectorAll('.wz-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.idx, 10);
        var opt = node.opts[idx];
        if (opt.url) {
          closeModal();
          window.location.href = toUrl(opt.url);
        } else if (opt.next) {
          stack.push({ nodeId: nodeId, label: opt.l });
          renderNode(opt.next);
        }
      });
    });
  }

  // ── Open / close ──────────────────────────────────────────────────────
  function openModal() {
    stack = [];
    renderNode('root');
    modal.classList.add('is-open');
    document.body.classList.add('search-open');
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.classList.remove('search-open');
  }

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    var wzBtn = document.querySelector('.site-nav-links .wz-nav-btn');
    if (wzBtn) {
      wzBtn.addEventListener('click', openModal);
    }

    // ── Modal ──
    modal = document.createElement('div');
    modal.id = 'wizard-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Asistente de selección de herramienta');

    contentEl = document.createElement('div');
    contentEl.className = 'wz-box';
    modal.appendChild(contentEl);

    var backdrop = document.createElement('div');
    backdrop.className = 'wz-backdrop';
    backdrop.addEventListener('click', closeModal);
    modal.insertBefore(backdrop, contentEl);

    document.body.appendChild(modal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
