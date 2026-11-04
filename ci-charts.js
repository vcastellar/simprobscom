/*
 * Gráfico compartido de las calculadoras de intervalos de confianza (es/en).
 * Requiere Chart.js 4 cargado antes que este archivo.
 *
 *   CICharts.intervals(opts) → una barra horizontal por nivel de confianza
 *     (90, 95 y 99 % y el elegido, resaltado) en las unidades del parámetro,
 *     con la estimación puntual y, si procede, el valor de referencia.
 *   CICharts.note(opts)      → solo la frase "¿y si…?" sobre el tamaño
 *     muestral, para las calculadoras que conservan su propio gráfico.
 *   CICharts.clear(canvasId) → borra el gráfico y la frase (entrada no válida).
 *   CICharts.clearNote(canvasId) → borra solo la frase.
 *
 * opts de intervals():
 *   canvas      id del <canvas>; la frase va en el elemento id + 'Note'.
 *   estimate    estimación puntual.
 *   confidence  nivel elegido por el usuario (0–1).
 *   interval    function (conf, f) → [lo, hi]: intervalo al nivel conf con
 *               los tamaños muestrales multiplicados por f.
 *   method      nombre del método principal (p. ej. 'Wilson'), opcional.
 *   compare     { label, interval } opcional: otro método, mostrado solo al
 *               nivel elegido para compararlo con el principal.
 *   reference   valor de referencia (0 en diferencias, 1 en cocientes).
 *   referenceLabel  texto de la línea de referencia.
 *   log         eje logarítmico (odds ratio, cocientes).
 *   xMin, xMax  límites naturales del parámetro (p. ej. 0 y 1).
 *   xLabel      título del eje.
 *   topAxis     { label, map, inverse } opcional: segundo eje arriba (p. ej.
 *               σ = √σ²), con marcas en valores redondos de la magnitud.
 *   sizeLabel   function (f) → texto del tamaño muestral escalado por f.
 *   maxFactor   factor máximo admisible (población finita: N / n).
 */
(function () {
  'use strict';

  var IS_EN = document.documentElement.lang === 'en';
  var LOCALE = IS_EN ? 'en-US' : 'es-ES';
  var FONT = "'Inter', 'Inter-fallback', sans-serif";
  var STD_LEVELS = [0.90, 0.95, 0.99];
  var registry = {}; // canvasId → { kind, opts, chart }

  var STR = IS_EN ? {
    ci: 'CI',
    chosen: 'chosen',
    estimate: 'Estimate',
    note: function (c) {
      var parts = [];
      if (c.w2 != null) parts.push('With twice the sample (' + c.size2 + '), the width of the ' + c.conf + ' interval would drop from ' + c.w1 + ' to ' + c.w2 + '.');
      if (c.sizeHalf != null) parts.push('Halving it would take a sample of ' + c.sizeHalf + '.');
      return parts.join(' ');
    },
    summary: function (label, lo, hi) { return label + ': [' + lo + ', ' + hi + ']'; }
  } : {
    ci: 'IC',
    chosen: 'elegido',
    estimate: 'Estimación',
    note: function (c) {
      var parts = [];
      if (c.w2 != null) parts.push('Con el doble de muestra (' + c.size2 + '), la amplitud del intervalo al ' + c.conf + ' bajaría de ' + c.w1 + ' a ' + c.w2 + '.');
      if (c.sizeHalf != null) parts.push('Para reducirla a la mitad haría falta una muestra de ' + c.sizeHalf + '.');
      return parts.join(' ');
    },
    summary: function (label, lo, hi) { return label + ': [' + lo + ', ' + hi + ']'; }
  };

  // ── Formato ───────────────────────────────────────────────────────────
  function pctDecimals(level) {
    var p = level * 100;
    if (Math.abs(p - Math.round(p)) < 1e-6) return 0;
    if (Math.abs(p * 10 - Math.round(p * 10)) < 1e-6) return 1;
    return 2;
  }
  function fmtPct(level) {
    var d = pctDecimals(level);
    var s = (level * 100).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
    return s + (IS_EN ? '%' : ' %');
  }
  // Decimales según la amplitud: unas tres cifras significativas de la amplitud.
  function decimalsFor(width) {
    if (!(width > 0) || !Number.isFinite(width)) return 2;
    return Math.max(0, Math.min(6, 2 - Math.floor(Math.log10(width))));
  }
  function fmtFixed(v, d) {
    return Number(v).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtAxis(v) {
    return Number(v).toLocaleString(LOCALE, { maximumSignificantDigits: 4 });
  }
  // Paso "redondo" (1, 2, 2,5 o 5 × 10^k) para unas `target` divisiones.
  function niceStep(span, target) {
    var raw = span / (target || 6);
    if (!(raw > 0) || !Number.isFinite(raw)) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] * mag >= raw - 1e-12) return steps[i] * mag;
    }
    return 10 * mag;
  }
  // Valores 1, 2 y 5 × 10^k para los límites del eje logarítmico.
  function niceLogFloor(v) {
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var m = v / mag;
    return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * mag;
  }
  function niceLogCeil(v) {
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var m = v / mag;
    if (m <= 1 + 1e-12) return mag;
    return (m <= 2 ? 2 : m <= 5 ? 5 : 10) * mag;
  }
  // Marcas del eje logarítmico: 1, 2 y 5 × 10^k dentro del rango.
  function logTicks(lo, hi) {
    var out = [];
    for (var k = Math.floor(Math.log10(lo)) - 1; k <= Math.ceil(Math.log10(hi)) + 1; k++) {
      [1, 2, 5].forEach(function (m) {
        var v = m * Math.pow(10, k);
        if (v >= lo * (1 - 1e-9) && v <= hi * (1 + 1e-9)) out.push({ value: v });
      });
    }
    return out;
  }

  // ── Tema ──────────────────────────────────────────────────────────────
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
      text: cssVar('--text-main', dark ? '#e2e8f0' : '#0f172a'),
      muted: cssVar('--text-muted', dark ? '#94a3b8' : '#64748b'),
      surface: dark ? '#1e293b' : '#ffffff',
      grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
      chosen: dark ? '#5598e7' : '#2a78d6',
      other: dark ? '#2f5f97' : '#a9c8f0',
      compare: dark ? '#64748b' : '#94a3b8',
      ref: dark ? '#f87171' : '#dc2626'
    };
  }

  // ── Datos ─────────────────────────────────────────────────────────────
  function safeInterval(fn, conf, f) {
    var r;
    try { r = fn(conf, f); } catch (e) { r = null; }
    if (!r || !Number.isFinite(r[0]) || !Number.isFinite(r[1]) || r[1] < r[0]) return null;
    return r;
  }

  function buildRows(o) {
    var levels = STD_LEVELS.slice();
    var chosen = o.confidence;
    if (!levels.some(function (l) { return Math.abs(l - chosen) < 1e-9; })) levels.push(chosen);
    levels.sort(function (a, b) { return a - b; });

    var prefix = o.method ? o.method : STR.ci;
    var rows = [];
    if (o.compare) {
      var cr = safeInterval(o.compare.interval, chosen, 1);
      if (cr) rows.push({ label: o.compare.label + ' ' + fmtPct(chosen), lo: cr[0], hi: cr[1], kind: 'compare' });
    }
    levels.forEach(function (l) {
      var r = safeInterval(o.interval, l, 1);
      if (!r) return;
      var isChosen = Math.abs(l - chosen) < 1e-9;
      rows.push({ label: prefix + ' ' + fmtPct(l), lo: r[0], hi: r[1], kind: isChosen ? 'chosen' : 'other' });
    });
    return rows;
  }

  // Frase "¿y si…?": amplitud con el doble de muestra y muestra para
  // reducirla a la mitad. widthFn(f) devuelve la amplitud o null.
  function precisionNote(widthFn, o) {
    var w1 = widthFn(1);
    if (!(w1 > 0) || !Number.isFinite(w1)) return '';
    var maxF = o.maxFactor != null ? o.maxFactor : 400;
    maxF = Math.min(maxF, 400);
    var d = decimalsFor(w1);
    var c = { conf: fmtPct(o.confidence), w1: fmtFixed(w1, d), w2: null, size2: null, sizeHalf: null };
    if (maxF >= 2) {
      var w2 = widthFn(2);
      if (w2 != null && Number.isFinite(w2)) {
        c.w2 = fmtFixed(w2, d);
        c.size2 = o.sizeLabel(2);
      }
    }
    // Búsqueda del factor que reduce la amplitud a la mitad.
    var target = w1 / 2;
    var wMax = widthFn(maxF);
    if (wMax != null && wMax <= target) {
      var lo = 1, hi = maxF;
      for (var i = 0; i < 60; i++) {
        var mid = (lo + hi) / 2;
        var wm = widthFn(mid);
        if (wm != null && wm <= target) hi = mid; else lo = mid;
      }
      c.sizeHalf = o.sizeLabel(hi);
    }
    return c.w2 == null && c.sizeHalf == null ? '' : STR.note(c);
  }

  // ── Plugin: referencia, cifras de los extremos y estimación ───────────
  var plugin = {
    id: 'ciAnnotations',
    afterDatasetsDraw: function (chart) {
      var a = chart.options.plugins && chart.options.plugins.ciAnnotations;
      if (!a) return;
      var ctx = chart.ctx;
      var area = chart.chartArea;
      var xs = chart.scales.x;
      var ys = chart.scales.y;
      ctx.save();

      // Línea de referencia
      if (a.reference != null) {
        var rx = xs.getPixelForValue(a.reference);
        if (rx >= area.left && rx <= area.right) {
          ctx.strokeStyle = a.refColor;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(rx, area.top);
          ctx.lineTo(rx, area.bottom);
          ctx.stroke();
          ctx.setLineDash([]);
          if (a.referenceLabel) {
            ctx.font = '600 11px ' + FONT;
            ctx.fillStyle = a.refColor;
            ctx.textBaseline = 'top';
            var tw = ctx.measureText(a.referenceLabel).width;
            var left = rx + 6 + tw <= area.right;
            ctx.textAlign = left ? 'left' : 'right';
            ctx.fillText(a.referenceLabel, left ? rx + 6 : rx - 6, area.top + 2);
          }
        }
      }

      // Barras, cifras de los extremos y estimación
      a.rows.forEach(function (r, i) {
        var y = ys.getPixelForValue(i);
        var x1 = xs.getPixelForValue(r.lo);
        var x2 = xs.getPixelForValue(r.hi);
        var color = r.kind === 'chosen' ? a.chosen : (r.kind === 'compare' ? a.compare : a.other);
        var h = r.kind === 'chosen' ? 12 : 8;
        ctx.fillStyle = color;
        var w = Math.max(2, x2 - x1);
        var rad = Math.min(h / 2, w / 2);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x1, y - h / 2, w, h, rad); else ctx.rect(x1, y - h / 2, w, h);
        ctx.fill();

        ctx.font = (r.kind === 'chosen' ? '700 12px ' : '500 11px ') + FONT;
        ctx.fillStyle = r.kind === 'chosen' ? a.text : a.muted;
        ctx.textBaseline = 'bottom';
        var loTxt = fmtFixed(r.lo, a.decimals);
        var hiTxt = fmtFixed(r.hi, a.decimals);
        var ty = y - h / 2 - 4;
        var loW = ctx.measureText(loTxt).width;
        var hiW = ctx.measureText(hiTxt).width;
        if (x2 - x1 >= (loW + hiW) / 2 + 10) {
          ctx.textAlign = 'center';
          ctx.fillText(loTxt, Math.max(area.left + loW / 2, x1), ty);
          ctx.fillText(hiTxt, Math.min(area.right - hiW / 2, x2), ty);
        } else {
          // Intervalo muy estrecho: ambas cifras juntas sobre la barra.
          ctx.textAlign = 'center';
          ctx.fillText(loTxt + ' – ' + hiTxt, (x1 + x2) / 2, ty);
        }

        // Estimación puntual: círculo con anillo del color de la superficie.
        var ex = xs.getPixelForValue(a.estimate);
        if (ex >= area.left - 1 && ex <= area.right + 1) {
          ctx.beginPath();
          ctx.arc(ex, y, r.kind === 'chosen' ? 7 : 5.5, 0, Math.PI * 2);
          ctx.fillStyle = a.surface;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = a.text;
          ctx.stroke();
        }
      });
      ctx.restore();
    }
  };

  // ── Construcción del gráfico ──────────────────────────────────────────
  function buildIntervals(o, pal) {
    var rows = buildRows(o);
    if (!rows.length) throw new Error('sin intervalos válidos');
    var chosenRow = rows.filter(function (r) { return r.kind === 'chosen'; })[0] || rows[rows.length - 1];
    var decimals = decimalsFor(chosenRow.hi - chosenRow.lo);

    // Rango del eje: todos los intervalos, la estimación y la referencia.
    var vals = [o.estimate];
    rows.forEach(function (r) { vals.push(r.lo, r.hi); });
    if (o.reference != null) vals.push(o.reference);
    // Límites redondeados hacia fuera a valores "redondos".
    var lo, hi;
    if (o.log) {
      var pos = vals.filter(function (v) { return v > 0; });
      lo = niceLogFloor(Math.min.apply(null, pos) * 0.97);
      hi = niceLogCeil(Math.max.apply(null, pos) * 1.03);
    } else {
      var vmin = Math.min.apply(null, vals), vmax = Math.max.apply(null, vals);
      var span = vmax - vmin || Math.abs(vmax) * 0.2 || 1;
      var step = niceStep(span, 6);
      lo = Math.floor((vmin - span * 0.04) / step) * step;
      hi = Math.ceil((vmax + span * 0.04) / step) * step;
      if (o.xMin != null) lo = Math.max(lo, o.xMin);
      if (o.xMax != null) hi = Math.min(hi, o.xMax);
    }

    var tickFont = function (ctx) {
      var r = rows[ctx.tick && ctx.tick.value];
      return { size: 12, weight: r && r.kind === 'chosen' ? '700' : '500' };
    };
    var scales = {
      x: {
        type: o.log ? 'logarithmic' : 'linear',
        min: lo,
        max: hi,
        title: { display: !!o.xLabel, text: o.xLabel || '', color: pal.muted, font: { size: 12 } },
        afterBuildTicks: o.log ? function (axis) { axis.ticks = logTicks(lo, hi); } : undefined,
        ticks: { color: pal.muted, maxTicksLimit: 8, autoSkip: !o.log, callback: function (v) { return fmtAxis(v); } },
        grid: { color: pal.grid, drawTicks: false },
        border: { color: pal.grid }
      },
      y: {
        type: 'linear',
        min: -0.7,
        max: rows.length - 0.3,
        afterBuildTicks: function (axis) {
          axis.ticks = rows.map(function (_, i) { return { value: i }; });
        },
        ticks: {
          autoSkip: false,
          color: function (ctx) { var r = rows[ctx.tick && ctx.tick.value]; return r && r.kind === 'chosen' ? pal.text : pal.muted; },
          font: tickFont,
          callback: function (v) {
            var r = rows[v];
            if (!r) return '';
            return r.kind === 'chosen' ? r.label + ' (' + STR.chosen + ')' : r.label;
          }
        },
        grid: { display: false },
        border: { display: false }
      }
    };
    if (o.topAxis) {
      // Marcas en valores redondos de la magnitud transformada (p. ej. σ),
      // colocadas en su posición del eje inferior (σ²).
      var tLo = o.topAxis.map(lo), tHi = o.topAxis.map(hi);
      var tStep = niceStep(tHi - tLo, 6);
      var topTicks = [];
      for (var t = Math.ceil(tLo / tStep - 1e-9) * tStep; t <= tHi + 1e-9; t += tStep) {
        topTicks.push({ value: o.topAxis.inverse(t) });
      }
      scales.x2 = {
        type: o.log ? 'logarithmic' : 'linear',
        position: 'top',
        display: true,
        min: lo,
        max: hi,
        afterBuildTicks: function (axis) { axis.ticks = topTicks.slice(); },
        title: { display: true, text: o.topAxis.label, color: pal.muted, font: { size: 12 } },
        ticks: { color: pal.muted, autoSkip: false, callback: function (v) { return fmtAxis(Math.round(o.topAxis.map(v) * 1e9) / 1e9); } },
        grid: { display: false },
        border: { color: pal.grid }
      };
    }

    var options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: { top: o.reference != null ? 22 : 10, right: 16, left: 4, bottom: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        ciAnnotations: {
          rows: rows,
          estimate: o.estimate,
          reference: o.reference,
          referenceLabel: o.referenceLabel,
          decimals: decimals,
          chosen: pal.chosen,
          other: pal.other,
          compare: pal.compare,
          refColor: pal.ref,
          text: pal.text,
          muted: pal.muted,
          surface: pal.surface
        }
      },
      scales: scales
    };

    // Conjunto de datos invisible: solo fija las escalas.
    var data = {
      datasets: [{
        data: rows.map(function (r, i) { return { x: r.lo, y: i }; }).concat(rows.map(function (r, i) { return { x: r.hi, y: i }; })),
        pointRadius: 0,
        showLine: false
      }]
    };
    if (o.topAxis) {
      data.datasets.push({ data: [], xAxisID: 'x2', pointRadius: 0, showLine: false });
    }

    var widthFn = function (f) {
      var r = safeInterval(o.interval, o.confidence, f);
      return r ? r[1] - r[0] : null;
    };
    var note = o.sizeLabel ? precisionNote(widthFn, o) : '';
    var summary = STR.summary(chosenRow.label, fmtFixed(chosenRow.lo, decimals), fmtFixed(chosenRow.hi, decimals));
    return { data: data, options: options, note: note, summary: summary };
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────
  function setNote(canvasId, text) {
    var note = document.getElementById(canvasId + 'Note');
    if (note) note.textContent = text || '';
  }

  function setAria(canvas, extra) {
    var base = canvas.getAttribute('data-aria-base');
    if (base == null) {
      base = canvas.getAttribute('aria-label') || '';
      canvas.setAttribute('data-aria-base', base);
    }
    canvas.setAttribute('aria-label', extra ? base + '. ' + extra : base);
  }

  function renderIntervals(o) {
    var canvas = document.getElementById(o.canvas);
    if (!canvas || typeof Chart === 'undefined') return;
    var built;
    try {
      built = buildIntervals(o, palette());
    } catch (e) {
      if (window.console) console.warn('CICharts:', e);
      clear(o.canvas);
      return;
    }
    var entry = registry[o.canvas];
    if (entry && entry.chart) {
      entry.chart.data = built.data;
      entry.chart.options = built.options;
      entry.chart.update();
    } else {
      entry = registry[o.canvas] = {
        chart: new Chart(canvas, { type: 'scatter', data: built.data, options: built.options, plugins: [plugin] })
      };
    }
    entry.kind = 'intervals';
    entry.opts = o;
    setNote(o.canvas, built.note);
    setAria(canvas, built.summary + (built.note ? '. ' + built.note : ''));
  }

  function renderNote(o) {
    var widthFn = function (f) {
      var w;
      try { w = o.width(f); } catch (e) { w = null; }
      return w != null && Number.isFinite(w) ? w : null;
    };
    setNote(o.canvas, precisionNote(widthFn, o));
  }

  function clear(canvasId) {
    var entry = registry[canvasId];
    if (entry && entry.chart) {
      entry.chart.destroy();
      entry.chart = null;
    }
    delete registry[canvasId];
    setNote(canvasId, '');
    var canvas = document.getElementById(canvasId);
    if (canvas) setAria(canvas, '');
  }

  function rerenderAll() {
    Object.keys(registry).forEach(function (id) {
      var entry = registry[id];
      if (entry && entry.kind === 'intervals' && entry.opts) renderIntervals(entry.opts);
    });
  }

  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = FONT;
  }
  // Cambio de tema (theme.js alterna la clase dark-mode en <html>)
  if (window.MutationObserver) {
    new MutationObserver(rerenderAll).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(function () {
      Object.keys(registry).forEach(function (id) {
        if (registry[id].chart) registry[id].chart.update();
      });
    });
  }

  window.CICharts = {
    intervals: renderIntervals,
    note: renderNote,
    clear: clear,
    clearNote: function (canvasId) { setNote(canvasId, ''); }
  };
}());
