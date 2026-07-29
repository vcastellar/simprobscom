/* table-diagram.js — Diagrama explicativo de las tablas de distribución.
 *
 * Dibuja, bajo la tabla, la densidad (o las barras de la PMF) con el área /
 * barra que representa el valor de la tabla. Es una mejora progresiva: usa
 * jStat para calcular las densidades; si jStat no está disponible (p. ej. el
 * CDN falla), la figura se oculta y la tabla sigue funcionando con normalidad.
 *
 * Configuración por atributos data-* en <figure class="dist-diagram" ...>:
 *   data-dist   : student | chisquare | centralF | beta | gamma | poisson | binomial
 *   data-tables : ids de las tablas cuyos clics actualizan el diagrama
 *   data-*      : una "celda virtual" con el estado inicial (mismos atributos
 *                 que las celdas reales de esa tabla)
 */
(function () {
    "use strict";
    var fig = document.querySelector(".dist-diagram[data-dist]");
    if (!fig) return;
    if (typeof jStat === "undefined") { fig.style.display = "none"; return; }

    var body = fig.querySelector("[data-dg-body]");
    var caption = fig.querySelector(".dg-caption");
    if (!body) return;

    // ── Geometría ─────────────────────────────────────────────────────────
    var W = 480, H = 220, padL = 24, padR = 14, padTop = 16, padBottom = 30;
    var plotW = W - padL - padR, baseline = H - padBottom, topY = padTop;
    var xs = function (t, lo, hi) { return padL + (t - lo) / (hi - lo) * plotW; };

    function fmt(v) {
        var n = Number(v);
        if (!isFinite(n)) return String(v);
        return (Math.round(n * 10000) / 10000).toString();
    }

    // ── Lectores de celda por distribución ────────────────────────────────
    // Devuelven un "estado" que sabe dibujarse.
    var READERS = {
        student: function (d) {
            var df = +d.df, x = +d.val, a2 = d.a2 != null ? +d.a2 : null;
            var D = Math.max(4, Math.abs(x) * 1.3);
            return cont(function (v) { return jStat.studentt.pdf(v, df); }, -D, D,
                { mode: "twotail", x: Math.abs(x) },
                "área de las dos colas (más allá de ±" + Math.abs(x).toFixed(3) +
                ") = <strong>α = " + (a2 != null ? fmt(a2) : "?") + "</strong> · ν = " + df);
        },
        chisquare: function (d) {
            var df = +d.df, x = +d.val, p = d.p != null ? +d.p : null;
            var hi = Math.max(x * 1.5, safeInv(function () { return jStat.chisquare.inv(0.995, df); }, x * 2));
            return cont(function (v) { return jStat.chisquare.pdf(v, df); }, 0, hi,
                { mode: "left", x: x },
                "área a la izquierda = <strong>P(X ≤ " + x.toFixed(3) + ") = " +
                (p != null ? fmt(p) : "?") + "</strong> · ν = " + df);
        },
        centralF: function (d) {
            var df1 = +d.df1, df2 = +d.df2, x = +d.val, a = +d.alpha;
            var hi = Math.max(x * 1.4, safeInv(function () { return jStat.centralF.inv(0.99, df1, df2); }, x * 2));
            return cont(function (v) { return jStat.centralF.pdf(v, df1, df2); }, 0, hi,
                { mode: "right", x: x },
                "cola derecha (área) = <strong>α = " + fmt(a) + "</strong> · F = " +
                x.toFixed(3) + " · gl " + df1 + ", " + df2);
        },
        beta: function (d) {
            var a = +d.alpha, b = +d.beta, x = +d.x, val = d.val;
            return cont(function (v) { return jStat.beta.pdf(v, a, b); }, 0, 1,
                { mode: "left", x: x },
                "área a la izquierda = <strong>P(X ≤ " + x + ") = " + val +
                "</strong> · α = " + a + ", β = " + b);
        },
        gamma: function (d) {
            var a = +d.alpha, b = +d.beta, x = +d.x, val = d.val;
            var hi = Math.max(x * 1.6, safeInv(function () { return jStat.gamma.inv(0.997, a, b); }, a * b * 4 || 8));
            return cont(function (v) { return jStat.gamma.pdf(v, a, b); }, 0, hi,
                { mode: "left", x: x },
                "área a la izquierda = <strong>P(X ≤ " + x + ") = " + val +
                "</strong> · α = " + a + ", β = " + b);
        },
        poisson: function (d) {
            var lam = +d.lam, k = +d.k, val = d.val, type = d.type;
            var kmax = Math.max(10, Math.ceil(lam + 4 * Math.sqrt(lam)), k + 2);
            return disc(function (kk) { return jStat.poisson.pdf(kk, lam); }, kmax, type, k,
                type === "cdf"
                    ? "suma de barras hasta k = <strong>P(X ≤ " + k + ") = " + val + "</strong> · λ = " + lam
                    : "barra resaltada = <strong>P(X = " + k + ") = " + val + "</strong> · λ = " + lam);
        },
        binomial: function (d) {
            var n = +d.n, p = +d.p, k = +d.k, val = d.val, type = d.type;
            return disc(function (kk) { return jStat.binomial.pdf(kk, n, p); }, n, type, k,
                type === "cdf"
                    ? "suma de barras hasta k = <strong>P(X ≤ " + k + ") = " + val + "</strong> · n = " + n + ", p = " + p
                    : "barra resaltada = <strong>P(X = " + k + ") = " + val + "</strong> · n = " + n + ", p = " + p);
        }
    };

    function safeInv(fn, fallback) {
        try { var v = fn(); return isFinite(v) && v > 0 ? v : fallback; } catch (e) { return fallback; }
    }

    // ── Estados dibujables ────────────────────────────────────────────────
    function cont(dens, lo, hi, shade, label) {
        return { kind: "cont", dens: dens, lo: lo, hi: hi, shade: shade, label: label };
    }
    function disc(pmf, kmax, type, k, label) {
        return { kind: "disc", pmf: pmf, kmax: kmax, type: type, k: k, label: label };
    }

    function axis(lo, hi, ticks) {
        var s = '<line class="dg-axis" x1="' + padL + '" y1="' + baseline + '" x2="' + (W - padR) + '" y2="' + baseline + '"/>';
        for (var i = 0; i < ticks.length; i++) {
            var tx = xs(ticks[i], lo, hi).toFixed(1);
            s += '<text class="dg-tick" x="' + tx + '" y="' + (baseline + 15) + '" text-anchor="middle">' + ticks[i] + "</text>";
        }
        return s;
    }
    function niceTicks(lo, hi) {
        var span = hi - lo, step = Math.pow(10, Math.floor(Math.log(span) / Math.LN10));
        if (span / step < 3) step /= 2; if (span / step > 8) step *= 2;
        var t = [], start = Math.ceil(lo / step) * step;
        for (var v = start; v <= hi + 1e-9; v += step) t.push(Math.round(v * 100) / 100);
        return t;
    }

    function drawCont(st) {
        var lo = st.lo, hi = st.hi, N = 200, i, v, d, dmax = 0, pts = [];
        for (i = 0; i <= N; i++) { v = lo + (hi - lo) * i / N; d = st.dens(v); if (isFinite(d)) { pts.push([v, d]); if (d > dmax) dmax = d; } }
        if (dmax <= 0) dmax = 1;
        var ys = function (d) { return baseline - (d / (dmax * 1.12)) * (baseline - topY); };
        var px = function (v) { return xs(v, lo, hi); };
        var curve = "M" + pts.map(function (p) { return px(p[0]).toFixed(1) + "," + ys(p[1]).toFixed(1); }).join(" L");

        function areaPath(a, b) {
            var seg = pts.filter(function (p) { return p[0] >= a - 1e-9 && p[0] <= b + 1e-9; });
            if (!seg.length) return "";
            return "M" + px(seg[0][0]).toFixed(1) + "," + baseline +
                " L" + seg.map(function (p) { return px(p[0]).toFixed(1) + "," + ys(p[1]).toFixed(1); }).join(" L") +
                " L" + px(seg[seg.length - 1][0]).toFixed(1) + "," + baseline + " Z";
        }
        var areas = "", zlines = "", sh = st.shade, x = sh.x;
        if (sh.mode === "left") { areas = areaPath(lo, x); zlines = vline(px(x), ys(st.dens(x))); }
        else if (sh.mode === "right") { areas = areaPath(x, hi); zlines = vline(px(x), ys(st.dens(x))); }
        else if (sh.mode === "twotail") {
            areas = '<path class="dg-area" d="' + areaPath(lo, -x) + '"/><path class="dg-area" d="' + areaPath(x, hi) + '"/>';
            zlines = vline(px(-x), ys(st.dens(-x))) + vline(px(x), ys(st.dens(x)));
        }
        if (sh.mode !== "twotail") areas = '<path class="dg-area" d="' + areas + '"/>';

        body.innerHTML = areas + axis(lo, hi, niceTicks(lo, hi)) +
            '<path class="dg-curve" d="' + curve + '"/>' + zlines;
        if (caption) caption.innerHTML = st.label + '. <span class="dg-hint">Haz clic en una celda para cambiarlo.</span>';
    }

    function vline(x, y) {
        return '<line class="dg-zline" x1="' + x.toFixed(1) + '" y1="' + baseline + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
    }

    function drawDisc(st) {
        var kmax = Math.min(st.kmax, 40), i, pmf, pmax = 0, vals = [];
        for (i = 0; i <= kmax; i++) { pmf = st.pmf(i); if (!isFinite(pmf)) pmf = 0; vals.push(pmf); if (pmf > pmax) pmax = pmf; }
        if (pmax <= 0) pmax = 1;
        var n = kmax + 1, gap = 2, bw = (plotW / n) - gap;
        if (bw < 1) bw = plotW / n;
        var ys = function (d) { return (d / (pmax * 1.12)) * (baseline - topY); };
        var bars = "", labelEvery = Math.ceil(n / 12);
        for (i = 0; i <= kmax; i++) {
            var bx = padL + (plotW / n) * i + gap / 2;
            var bh = ys(vals[i]), by = baseline - bh;
            var on = st.type === "cdf" ? (i <= st.k) : (i === st.k);
            bars += '<rect class="dg-bar' + (on ? " dg-bar-on" : "") + '" x="' + bx.toFixed(1) +
                '" y="' + by.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, bh).toFixed(1) +
                '" rx="1.5"/>';
            if (i % labelEvery === 0)
                bars += '<text class="dg-tick" x="' + (bx + bw / 2).toFixed(1) + '" y="' + (baseline + 15) +
                    '" text-anchor="middle">' + i + "</text>";
        }
        body.innerHTML =
            '<line class="dg-axis" x1="' + padL + '" y1="' + baseline + '" x2="' + (W - padR) + '" y2="' + baseline + '"/>' + bars;
        if (caption) caption.innerHTML = st.label + '. <span class="dg-hint">Haz clic en una celda para cambiarlo.</span>';
    }

    // ── Motor ─────────────────────────────────────────────────────────────
    var read = READERS[fig.dataset.dist];
    if (!read) { fig.style.display = "none"; return; }

    function render(dataset) {
        var st;
        try { st = read(dataset); } catch (e) { return; }
        if (!st) return;
        if (st.kind === "cont") drawCont(st); else drawDisc(st);
    }

    // Estado inicial: la propia figura lleva una "celda virtual" en su dataset
    render(fig.dataset);

    // Actualiza al hacer clic en una celda de las tablas indicadas
    (fig.dataset.tables || "").split(/\s+/).forEach(function (id) {
        var t = document.getElementById(id);
        if (!t) return;
        t.addEventListener("click", function (e) {
            var td = e.target.closest("td[data-val]");
            if (td) render(td.dataset);
        });
    });
})();
