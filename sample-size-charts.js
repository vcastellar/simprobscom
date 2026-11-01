/*
 * Gráficos compartidos de las calculadoras de tamaño muestral (es/en).
 * Requiere Chart.js 4 cargado antes que este archivo.
 *
 * Dos tipos de gráfico, uno por familia de calculadora:
 *   SampleSizeCharts.precision(opts) → n en función del margen de error, con
 *     una curva para el nivel de confianza elegido y, si quedan dentro de
 *     (0, 100 %), otras dos para ese nivel −5 y +5 puntos.
 *   SampleSizeCharts.power(opts)     → curva de potencia en función de n.
 *   SampleSizeCharts.clear(canvasId) → oculta el gráfico (entrada no válida).
 *
 * El punto calculado se marca y se etiqueta; debajo del gráfico se escribe
 * una frase "¿y si…?" con dos escenarios alternativos. Los colores se leen de
 * las variables CSS del sitio y el gráfico se redibuja al cambiar de tema.
 */
(function () {
  'use strict';

  var IS_EN = document.documentElement.lang === 'en';
  var LOCALE = IS_EN ? 'en-US' : 'es-ES';
  var FONT = "'Inter', 'Inter-fallback', sans-serif";
  var LEVEL_STEP = 0.05; // curvas vecinas: nivel elegido ± 5 puntos
  var registry = {}; // canvasId → { kind, opts, chart }

  var STR = IS_EN ? {
    n: 'Sample size n',
    power: 'Power',
    target: 'Target power',
    confidence: 'confidence',
    insightPrecision: function (c) {
      var parts = [];
      if (c.nHalf != null) parts.push('Halving ' + c.xName + ' (' + c.xName + ' = ' + c.fmt(c.xHalf) + ') would require ' + c.fmtN(c.nHalf) + ' ' + c.unit);
      if (c.nDouble != null) parts.push((parts.length ? 'doubling it' : 'Doubling ' + c.xName) + ' (' + c.xName + ' = ' + c.fmt(c.xDouble) + ') would need only ' + c.fmtN(c.nDouble));
      return parts.length ? parts.join('; ') + '.' : '';
    },
    insightPower: function (c) {
      var parts = [];
      if (c.nLess != null) parts.push('With 20% less sample (n = ' + c.fmtN(c.nLess) + ') power would fall to ' + c.fmtPct(c.pLess, 0));
      if (c.nMore != null) parts.push((parts.length ? 'with' : 'With') + ' 20% more (n = ' + c.fmtN(c.nMore) + ') it would rise to ' + c.fmtPct(c.pMore, 0));
      return parts.length ? parts.join('; ') + '.' : '';
    }
  } : {
    n: 'Tamaño muestral n',
    power: 'Potencia',
    target: 'Potencia objetivo',
    confidence: 'de confianza',
    insightPrecision: function (c) {
      var parts = [];
      if (c.nHalf != null) parts.push('Si ' + c.xName + ' se reduce a la mitad (' + c.xName + ' = ' + c.fmt(c.xHalf) + ') harían falta ' + c.fmtN(c.nHalf) + ' ' + c.unit);
      if (c.nDouble != null) parts.push((parts.length ? 'si se duplica' : 'Si ' + c.xName + ' se duplica') + ' (' + c.xName + ' = ' + c.fmt(c.xDouble) + '), bastarían ' + c.fmtN(c.nDouble));
      return parts.length ? parts.join('; ') + '.' : '';
    },
    insightPower: function (c) {
      var parts = [];
      if (c.nLess != null) parts.push('Con un 20 % menos de muestra (n = ' + c.fmtN(c.nLess) + ') la potencia bajaría al ' + c.fmtPct(c.pLess, 0));
      if (c.nMore != null) parts.push((parts.length ? 'con' : 'Con') + ' un 20 % más (n = ' + c.fmtN(c.nMore) + ') subiría al ' + c.fmtPct(c.pMore, 0));
      return parts.length ? parts.join('; ') + '.' : '';
    }
  };

  // ── Formato ───────────────────────────────────────────────────────────
  function fmtInt(v) {
    return Math.round(v).toLocaleString(LOCALE);
  }
  function fmtNum(v) {
    return Number(v).toLocaleString(LOCALE, { maximumSignificantDigits: 3 });
  }
  function fmtPct(v, decimals) {
    var s = (v * 100).toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return s + (IS_EN ? '%' : ' %');
  }
  // Decimales (0–2) necesarios para escribir un nivel de confianza en %.
  function pctDecimals(level) {
    var p = level * 100;
    if (Math.abs(p - Math.round(p)) < 1e-6) return 0;
    if (Math.abs(p * 10 - Math.round(p * 10)) < 1e-6) return 1;
    return 2;
  }
  function clamp01(v) {
    if (!Number.isFinite(v)) return null;
    return Math.min(1, Math.max(0, v));
  }
  function niceCeil(v) {
    if (!(v > 0)) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] * mag >= v - 1e-9) return steps[i] * mag;
    }
    return 10 * mag;
  }
  function withAlpha(color, alpha) {
    var m = /^#([0-9a-f]{6})$/i.exec(color.trim());
    if (!m) return color;
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  // ── Tema: colores tomados de las variables del sitio ──────────────────
  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) {
      return fallback;
    }
  }
  function palette() {
    var dark = document.documentElement.classList.contains('dark-mode');
    return {
      dark: dark,
      text: cssVar('--text-main', dark ? '#e2e8f0' : '#0f172a'),
      muted: cssVar('--text-muted', dark ? '#94a3b8' : '#64748b'),
      accent: cssVar('--accent', dark ? '#3b82f6' : '#2563eb'),
      surface: dark ? '#1e293b' : '#ffffff',
      grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
      border: dark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.14)',
      ref: dark ? 'rgba(148,163,184,0.75)' : 'rgba(100,116,139,0.75)',
      // Rampa ordinal de un solo tono (menor → mayor confianza). En modo
      // oscuro el extremo más saliente es el claro, por eso va invertida.
      ramp: dark ? ['#1c5cab', '#5598e7', '#b7d3f6'] : ['#86b6ef', '#2a78d6', '#104281']
    };
  }

  // ── Plugin: punto calculado, líneas de referencia y cursor ────────────
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  var annotationPlugin = {
    id: 'ssAnnotations',
    afterDatasetsDraw: function (chart) {
      var a = chart.options.plugins && chart.options.plugins.ssAnnotations;
      if (!a || !a.enabled) return;
      var ctx = chart.ctx;
      var area = chart.chartArea;
      var xs = chart.scales.x;
      var ys = chart.scales.y;
      var px = xs.getPixelForValue(a.x);
      var py = ys.getPixelForValue(a.y);
      if (!Number.isFinite(px) || !Number.isFinite(py)) return;
      py = Math.max(area.top, Math.min(area.bottom, py));

      ctx.save();
      ctx.beginPath();
      ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
      ctx.clip();

      // Líneas de referencia discontinuas
      ctx.strokeStyle = a.refColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      if (a.hLine) {
        var hy = ys.getPixelForValue(a.hLine.y);
        ctx.beginPath();
        ctx.moveTo(area.left, hy);
        ctx.lineTo(a.hLine.full ? area.right : px, hy);
        ctx.stroke();
        if (a.hLine.text) {
          ctx.setLineDash([]);
          ctx.font = '500 11px ' + FONT;
          ctx.fillStyle = a.mutedColor;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(a.hLine.text, area.left + 6, hy - 4);
          ctx.setLineDash([4, 4]);
        }
      }
      ctx.beginPath();
      ctx.moveTo(px, area.bottom);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Marcador con anillo del color de la superficie
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = a.surface;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = a.color;
      ctx.fill();

      // Etiqueta directa del punto
      ctx.font = '600 12px ' + FONT;
      var text = a.label;
      var w = ctx.measureText(text).width + 16;
      var h = 24;
      var lx = px + 12;
      var ly = a.labelBelow ? py + 10 : py - h - 10;
      if (lx + w > area.right) lx = px - 12 - w;
      if (lx < area.left) lx = area.left + 4;
      if (ly < area.top) ly = py + 10;
      if (ly + h > area.bottom) ly = py - h - 10;
      roundRect(ctx, lx, ly, w, h, 6);
      ctx.fillStyle = a.surface;
      ctx.fill();
      ctx.strokeStyle = a.borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = a.textColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, lx + 8, ly + h / 2 + 0.5);
      ctx.restore();
    },
    beforeTooltipDraw: function (chart) {
      var a = chart.options.plugins && chart.options.plugins.ssAnnotations;
      if (!a || !a.enabled) return;
      var active = chart.tooltip && chart.tooltip.getActiveElements ? chart.tooltip.getActiveElements() : [];
      if (!active.length) return;
      var x = active[0].element.x;
      var area = chart.chartArea;
      var ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = a.refColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, area.top);
      ctx.lineTo(x, area.bottom);
      ctx.stroke();
      ctx.restore();
    }
  };

  // ── Opciones comunes ──────────────────────────────────────────────────
  function baseOptions(pal, xTitle, yTitle) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 6, right: 14, bottom: 0, left: 0 } },
      plugins: {
        legend: {
          display: false,
          position: 'top',
          align: 'end',
          labels: {
            color: pal.muted,
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 28,
            boxHeight: 8,
            padding: 16,
            font: { size: 12 }
          }
        },
        tooltip: {
          backgroundColor: pal.surface,
          borderColor: pal.border,
          borderWidth: 1,
          titleColor: pal.text,
          bodyColor: pal.text,
          titleFont: { size: 12, weight: '600' },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          caretSize: 5,
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          boxPadding: 4
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: xTitle, color: pal.muted, font: { size: 12 } },
          ticks: { color: pal.muted, maxTicksLimit: 8, callback: function (v) { return fmtNum(v); } },
          grid: { display: false },
          border: { color: pal.grid }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: yTitle, color: pal.muted, font: { size: 12 } },
          ticks: { color: pal.muted, precision: 0, maxTicksLimit: 7, callback: function (v) { return fmtInt(v); } },
          grid: { color: pal.grid, drawTicks: false },
          border: { display: false }
        }
      }
    };
  }

  // ── Gráfico de precisión: n frente al margen ──────────────────────────
  // Nivel elegido y sus vecinos a ±5 puntos; se descartan los que no son
  // niveles de confianza válidos (≤ 0 % o ≥ 100 %). Orden creciente.
  function roundLevel(v) {
    return Math.round(v * 1e6) / 1e6;
  }
  function chooseLevels(current) {
    var cur = roundLevel(current);
    return [cur - LEVEL_STEP, cur, cur + LEVEL_STEP]
      .map(roundLevel)
      .filter(function (l) { return l > 0 && l < 1; });
  }
  // Color de la rampa según la posición respecto al nivel elegido
  // (0 = menor, 1 = el elegido, 2 = mayor).
  function rampIndex(level, current) {
    if (level < current - 1e-9) return 0;
    if (level > current + 1e-9) return 2;
    return 1;
  }

  function safeN(fn, x, level) {
    var v;
    try { v = fn(x, level); } catch (e) { v = null; }
    return (v == null || !Number.isFinite(v) || v <= 0) ? null : v;
  }

  function buildPrecision(o, pal) {
    var x0 = o.x;
    var xLo = o.xRange ? o.xRange[0] : x0 * 0.5;
    var xHi = o.xRange ? o.xRange[1] : x0 * 2;
    if (o.xMin != null) xLo = Math.max(xLo, o.xMin);
    if (o.xMax != null) xHi = Math.min(xHi, o.xMax);
    if (xLo > x0 * 0.9) xLo = x0 * 0.9;
    if (xHi < x0 * 1.1) xHi = x0 * 1.1;

    var steps = 60;
    var xsGrid = [];
    for (var i = 0; i <= steps; i++) xsGrid.push(xLo + ((xHi - xLo) * i) / steps);

    var levels = chooseLevels(o.confidence);
    var maxAll = 0;
    var datasets = levels.map(function (level) {
      var isCurrent = Math.abs(level - o.confidence) < 1e-6;
      var idx = rampIndex(level, o.confidence);
      var data = xsGrid.map(function (x) {
        var n = safeN(o.nFn, x, level);
        if (n != null && n > maxAll) maxAll = n;
        return { x: x, y: n };
      });
      return {
        label: fmtPct(level, pctDecimals(level)) + ' ' + STR.confidence,
        data: data,
        borderColor: pal.ramp[idx],
        backgroundColor: pal.ramp[idx],
        borderWidth: isCurrent ? 2.5 : 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: pal.ramp[idx],
        pointHoverBorderColor: pal.surface,
        pointHoverBorderWidth: 2,
        tension: 0.25,
        spanGaps: false,
        order: isCurrent ? 0 : 1
      };
    });

    // Eje y: deja ver la curva actual completa (≈4n en x/2) y recorta por
    // arriba las curvas más exigentes para que el punto no quede aplastado.
    var yMax = niceCeil(Math.min(maxAll * 1.05, Math.max(o.n * 4.5, 10)));
    if (yMax < o.n * 1.3) yMax = niceCeil(o.n * 1.3);

    var xName = o.xName || 'E';
    var options = baseOptions(pal, o.xLabel || xName, o.yLabel || STR.n);
    options.plugins.legend.display = true;
    // La curva actual se dibuja encima (order 0) pero leyenda y tooltip van
    // en orden de confianza creciente.
    options.plugins.legend.labels.sort = function (a, b) { return a.datasetIndex - b.datasetIndex; };
    options.plugins.tooltip.itemSort = function (a, b) { return a.datasetIndex - b.datasetIndex; };
    options.scales.x.min = xLo;
    options.scales.x.max = xHi;
    options.scales.y.max = yMax;
    options.plugins.tooltip.callbacks = {
      title: function (items) { return items.length ? xName + ' = ' + fmtNum(items[0].parsed.x) : ''; },
      label: function (item) {
        var y = item.parsed.y;
        return ' ' + item.dataset.label + ': n = ' + (y == null ? '—' : fmtInt(y));
      }
    };
    options.plugins.ssAnnotations = {
      enabled: true,
      x: x0,
      y: o.n,
      label: 'n = ' + fmtInt(o.n),
      hLine: { y: o.n, full: false },
      labelBelow: false,
      color: pal.ramp[1],
      surface: pal.surface,
      refColor: pal.ref,
      borderColor: pal.border,
      textColor: pal.text,
      mutedColor: pal.muted
    };

    // Frase "¿y si…?"
    var xHalf = o.xHalf != null ? o.xHalf : x0 * 0.5;
    var xDouble = o.xDouble != null ? o.xDouble : x0 * 2;
    var okHalf = o.xMin == null || xHalf >= o.xMin;
    var okDouble = o.xMax == null || xDouble <= o.xMax;
    var ctx = {
      xName: xName,
      unit: o.unit || '',
      xHalf: xHalf,
      xDouble: xDouble,
      nHalf: okHalf ? safeN(o.nFn, xHalf, o.confidence) : null,
      nDouble: okDouble ? safeN(o.nFn, xDouble, o.confidence) : null,
      fmt: fmtNum,
      fmtN: fmtInt,
      fmtPct: fmtPct
    };
    var insight = typeof o.insight === 'function' ? o.insight(ctx) : (o.insight === false ? '' : STR.insightPrecision(ctx));

    return { data: { datasets: datasets }, options: options, insight: insight };
  }

  // ── Gráfico de potencia: potencia frente a n ──────────────────────────
  function safePower(fn, m) {
    var v;
    try { v = fn(m); } catch (e) { v = null; }
    return clamp01(v);
  }

  function buildPower(o, pal) {
    var nMin = o.nMin || 2;
    var nHi = Math.max(Math.ceil(o.n * 2), o.n + 12, nMin + 12);
    var step = Math.max(1, Math.ceil((nHi - nMin) / 90));
    var data = [];
    for (var m = nMin; m <= nHi; m += step) data.push({ x: m, y: safePower(o.powerFn, m) });
    if (data[data.length - 1].x !== nHi) data.push({ x: nHi, y: safePower(o.powerFn, nHi) });
    var achieved = safePower(o.powerFn, o.n);

    var options = baseOptions(pal, o.xLabel || STR.n, STR.power);
    options.scales.x.min = nMin;
    options.scales.x.max = nHi;
    options.scales.x.ticks.precision = 0;
    options.scales.x.ticks.callback = function (v) { return Number.isInteger(v) ? fmtInt(v) : ''; };
    options.scales.y.min = 0;
    options.scales.y.max = 1;
    options.scales.y.ticks = { color: pal.muted, stepSize: 0.2, callback: function (v) { return fmtPct(v, 0); } };
    options.plugins.tooltip.callbacks = {
      title: function (items) { return items.length ? 'n = ' + fmtInt(items[0].parsed.x) : ''; },
      label: function (item) {
        var y = item.parsed.y;
        return ' ' + STR.power + ': ' + (y == null ? '—' : fmtPct(y, 1));
      }
    };
    options.plugins.ssAnnotations = {
      enabled: achieved != null,
      x: o.n,
      y: achieved,
      label: 'n = ' + fmtInt(o.n) + ' (' + (achieved == null ? '—' : fmtPct(achieved, 1)) + ')',
      hLine: { y: o.target, full: true, text: STR.target + ': ' + fmtPct(o.target, 0) },
      labelBelow: true,
      color: pal.accent,
      surface: pal.surface,
      refColor: pal.ref,
      borderColor: pal.border,
      textColor: pal.text,
      mutedColor: pal.muted
    };

    var datasets = [{
      label: STR.power,
      data: data,
      borderColor: pal.accent,
      backgroundColor: withAlpha(pal.accent, 0.08),
      fill: 'origin',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: pal.accent,
      pointHoverBorderColor: pal.surface,
      pointHoverBorderWidth: 2,
      tension: 0.2,
      spanGaps: false
    }];

    var nLess = Math.max(nMin, Math.round(o.n * 0.8));
    var nMore = Math.max(o.n + 1, Math.round(o.n * 1.2));
    var ctx = {
      nLess: nLess < o.n ? nLess : null,
      pLess: nLess < o.n ? safePower(o.powerFn, nLess) : null,
      nMore: nMore,
      pMore: safePower(o.powerFn, nMore),
      fmtN: fmtInt,
      fmtPct: fmtPct
    };
    if (ctx.pLess == null) ctx.nLess = null;
    if (ctx.pMore == null) ctx.nMore = null;
    var insight = typeof o.insight === 'function' ? o.insight(ctx) : (o.insight === false ? '' : STR.insightPower(ctx));

    return { data: { datasets: datasets }, options: options, insight: insight };
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────
  function wrapperOf(canvas) {
    return (canvas.closest && canvas.closest('.ss-chart')) || canvas.parentElement;
  }

  function render(kind, o) {
    var canvas = document.getElementById(o.canvas);
    if (!canvas || typeof Chart === 'undefined') return;
    var wrap = wrapperOf(canvas);
    var built;
    try {
      built = kind === 'power' ? buildPower(o, palette()) : buildPrecision(o, palette());
    } catch (e) {
      if (window.console) console.warn('SampleSizeCharts:', e);
      if (wrap) wrap.hidden = true;
      return;
    }
    if (wrap) wrap.hidden = false;

    var entry = registry[o.canvas];
    if (entry && entry.chart) {
      entry.chart.data = built.data;
      entry.chart.options = built.options;
      entry.chart.update();
    } else {
      entry = registry[o.canvas] = {
        chart: new Chart(canvas, { type: 'line', data: built.data, options: built.options, plugins: [annotationPlugin] })
      };
    }
    entry.kind = kind;
    entry.opts = o;

    var note = document.getElementById(o.canvas + 'Note');
    if (note) note.textContent = built.insight || '';
    var base = canvas.getAttribute('data-aria-base');
    if (base == null) {
      base = canvas.getAttribute('aria-label') || '';
      canvas.setAttribute('data-aria-base', base);
    }
    canvas.setAttribute('aria-label', built.insight ? base + '. ' + built.insight : base);
  }

  function clear(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var wrap = wrapperOf(canvas);
    if (wrap) wrap.hidden = true;
    var note = document.getElementById(canvasId + 'Note');
    if (note) note.textContent = '';
  }

  function rerenderAll() {
    Object.keys(registry).forEach(function (id) {
      var entry = registry[id];
      var canvas = document.getElementById(id);
      if (!entry || !entry.opts || !canvas) return;
      var wrap = wrapperOf(canvas);
      if (wrap && wrap.hidden) return;
      render(entry.kind, entry.opts);
    });
  }

  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = FONT;
    Chart.defaults.font.size = 12;
  }

  // Cambio de tema (theme.js alterna la clase dark-mode en <html>)
  if (window.MutationObserver) {
    new MutationObserver(rerenderAll).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  // Repinta los textos cuando termina de cargar la tipografía
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(function () {
      Object.keys(registry).forEach(function (id) {
        if (registry[id].chart) registry[id].chart.update();
      });
    });
  }

  window.SampleSizeCharts = {
    precision: function (opts) { render('precision', opts); },
    power: function (opts) { render('power', opts); },
    clear: clear
  };
}());
