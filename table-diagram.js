/* table-diagram.js — Diagramas explicativos de las tablas de distribución.
 *
 * Cada página puede tener varias figuras (una por pestaña: acumulada, densidad,
 * valores críticos, cuantiles…). Bajo cada tabla se dibuja la densidad (o las
 * barras de la PMF) resaltando lo que representa el valor de la tabla.
 *
 * Mejora progresiva: usa jStat para las densidades; si jStat no está disponible
 * (p. ej. el CDN falla), las figuras se ocultan y las tablas siguen intactas.
 *
 * Configuración por atributos data-* en cada <figure class="dist-diagram" ...>:
 *   data-dist  : normal | student | chisquare | centralF | beta | gamma | poisson | binomial
 *   data-mode  : left-x | left-val | pdf-point | crit-two | crit-right | bars-pmf | bars-cdf
 *   data-tables: ids de las tablas cuyos clics actualizan la figura
 *   data-*     : "celda virtual" con el estado inicial (mismos atributos que las
 *                celdas reales de esa tabla)
 */
(function () {
    "use strict";
    var figs = document.querySelectorAll(".dist-diagram[data-dist]");
    if (!figs.length) return;
    if (typeof jStat === "undefined") {
        figs.forEach(function (f) { f.style.display = "none"; });
        return;
    }

    // ── Geometría ─────────────────────────────────────────────────────────
    var W = 480, H = 220, padL = 24, padR = 14, padTop = 16, padBottom = 30;
    var plotW = W - padL - padR, baseline = H - padBottom, topY = padTop;

    function num() {
        for (var i = 0; i < arguments.length; i++) {
            var v = parseFloat(arguments[i]);
            if (isFinite(v)) return v;
        }
        return NaN;
    }
    function fmt(v) {
        var n = Number(v);
        if (!isFinite(n)) return String(v);
        return (Math.round(n * 10000) / 10000).toString();
    }
    function safeInv(fn, fallback) {
        try { var v = fn(); return isFinite(v) && v > 0 ? v : fallback; } catch (e) { return fallback; }
    }

    // ── Densidades continuas ──────────────────────────────────────────────
    function densOf(dist, ds) {
        switch (dist) {
            case "normal": return { f: function (v) { return jStat.normal.pdf(v, 0, 1); }, kind: "sym", params: "" };
            case "student": var df = +ds.df; return { f: function (v) { return jStat.studentt.pdf(v, df); }, kind: "sym", params: "ν = " + df };
            case "chisquare": var c = +ds.df; return { f: function (v) { return jStat.chisquare.pdf(v, c); }, kind: "pos", params: "ν = " + c, inv: function (p) { return jStat.chisquare.inv(p, c); } };
            case "centralF": var d1 = +ds.df1, d2 = +ds.df2; return { f: function (v) { return jStat.centralF.pdf(v, d1, d2); }, kind: "pos", params: "gl " + d1 + ", " + d2, inv: function (p) { return jStat.centralF.inv(p, d1, d2); } };
            case "beta": var ba = +ds.alpha, bb = +ds.beta; return { f: function (v) { return jStat.beta.pdf(v, ba, bb); }, kind: "unit", params: "α = " + ba + ", β = " + bb };
            case "gamma": var ga = +ds.alpha, gb = +ds.beta; return { f: function (v) { return jStat.gamma.pdf(v, ga, gb); }, kind: "pos", params: "α = " + ga + ", β = " + gb, inv: function (p) { return jStat.gamma.inv(p, ga, gb); } };
        }
        return null;
    }
    function domainOf(d, x) {
        if (d.kind === "unit") return [0, 1];
        if (d.kind === "sym") { var D = Math.max(4, Math.abs(x) * 1.3); return [-D, D]; }
        return [0, Math.max((x || 1) * 1.6, safeInv(function () { return d.inv(0.997); }, (x || 1) * 2 || 8))];
    }

    // ── PMF discretas ─────────────────────────────────────────────────────
    function pmfOf(dist, ds) {
        if (dist === "poisson") { var l = +ds.lam; return { f: function (k) { return jStat.poisson.pdf(k, l); }, kmax: Math.max(10, Math.ceil(l + 4 * Math.sqrt(l))), params: "λ = " + l }; }
        if (dist === "binomial") { var n = +ds.n, p = +ds.p; return { f: function (k) { return jStat.binomial.pdf(k, n, p); }, kmax: n, params: "n = " + n + ", p = " + p }; }
        return null;
    }

    // ── Dibujo ────────────────────────────────────────────────────────────
    function niceTicks(lo, hi) {
        var span = hi - lo, step = Math.pow(10, Math.floor(Math.log(span) / Math.LN10));
        if (span / step < 3) step /= 2; if (span / step > 8) step *= 2;
        var t = [], start = Math.ceil(lo / step) * step, v;
        for (v = start; v <= hi + 1e-9; v += step) t.push(Math.round(v * 100) / 100);
        return t;
    }
    function axisLine() {
        return '<line class="dg-axis" x1="' + padL + '" y1="' + baseline + '" x2="' + (W - padR) + '" y2="' + baseline + '"/>';
    }
    function vline(x, y) {
        return '<line class="dg-zline" x1="' + x.toFixed(1) + '" y1="' + baseline + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
    }

    function drawCont(body, caption, d, x, spec, label) {
        var dom = domainOf(d, x), lo = dom[0], hi = dom[1], N = 200, i, v, dv, dmax = 0, pts = [];
        for (i = 0; i <= N; i++) { v = lo + (hi - lo) * i / N; dv = d.f(v); if (isFinite(dv)) { pts.push([v, dv]); if (dv > dmax) dmax = dv; } }
        if (dmax <= 0) dmax = 1;
        var px = function (t) { return padL + (t - lo) / (hi - lo) * plotW; };
        var py = function (val) { return baseline - (val / (dmax * 1.12)) * (baseline - topY); };
        var curve = "M" + pts.map(function (p) { return px(p[0]).toFixed(1) + "," + py(p[1]).toFixed(1); }).join(" L");

        function area(a, b) {
            var seg = pts.filter(function (p) { return p[0] >= a - 1e-9 && p[0] <= b + 1e-9; });
            if (!seg.length) return "";
            return '<path class="dg-area" d="M' + px(seg[0][0]).toFixed(1) + "," + baseline +
                " L" + seg.map(function (p) { return px(p[0]).toFixed(1) + "," + py(p[1]).toFixed(1); }).join(" L") +
                " L" + px(seg[seg.length - 1][0]).toFixed(1) + "," + baseline + ' Z"/>';
        }

        var shade = "", marks = "";
        if (spec.mode === "left") { shade = area(lo, x); marks = vline(px(x), py(d.f(x))); }
        else if (spec.mode === "right") { shade = area(x, hi); marks = vline(px(x), py(d.f(x))); }
        else if (spec.mode === "twotail") { shade = area(lo, -x) + area(x, hi); marks = vline(px(-x), py(d.f(-x))) + vline(px(x), py(d.f(x))); }
        else if (spec.mode === "point") {
            marks = vline(px(x), py(d.f(x))) +
                '<circle cx="' + px(x).toFixed(1) + '" cy="' + py(d.f(x)).toFixed(1) + '" r="4" fill="var(--accent)"/>';
        }

        var ticks = "", tk = niceTicks(lo, hi);
        for (i = 0; i < tk.length; i++) ticks += '<text class="dg-tick" x="' + px(tk[i]).toFixed(1) + '" y="' + (baseline + 15) + '" text-anchor="middle">' + tk[i] + "</text>";

        body.innerHTML = shade + axisLine() + ticks + '<path class="dg-curve" d="' + curve + '"/>' + marks;
        if (caption) caption.innerHTML = label + '. <span class="dg-hint">Haz clic en una celda para cambiarlo.</span>';
    }

    function drawDisc(body, caption, pf, k, type, label) {
        var kmax = Math.min(pf.kmax, 40), i, p, pmax = 0, vals = [];
        for (i = 0; i <= kmax; i++) { p = pf.f(i); if (!isFinite(p)) p = 0; vals.push(p); if (p > pmax) pmax = p; }
        if (pmax <= 0) pmax = 1;
        var n = kmax + 1, gap = 2, bw = (plotW / n) - gap; if (bw < 1) bw = plotW / n;
        var barH = function (val) { return (val / (pmax * 1.12)) * (baseline - topY); };
        var bars = "", labelEvery = Math.ceil(n / 12);
        for (i = 0; i <= kmax; i++) {
            var bx = padL + (plotW / n) * i + gap / 2, bh = barH(vals[i]), by = baseline - bh;
            var on = type === "cdf" ? (i <= k) : (i === k);
            bars += '<rect class="dg-bar' + (on ? " dg-bar-on" : "") + '" x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) +
                '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, bh).toFixed(1) + '" rx="1.5"/>';
            if (i % labelEvery === 0) bars += '<text class="dg-tick" x="' + (bx + bw / 2).toFixed(1) + '" y="' + (baseline + 15) + '" text-anchor="middle">' + i + "</text>";
        }
        body.innerHTML = axisLine() + bars;
        if (caption) caption.innerHTML = label + '. <span class="dg-hint">Haz clic en una celda para cambiarlo.</span>';
    }

    // ── Motor por figura ──────────────────────────────────────────────────
    function render(fig, ds) {
        var body = fig.querySelector("[data-dg-body]"), caption = fig.querySelector(".dg-caption");
        if (!body) return;
        var dist = fig.dataset.dist, mode = fig.dataset.mode;

        if (dist === "poisson" || dist === "binomial") {
            var pf = pmfOf(dist, ds); if (!pf) return;
            var k = +ds.k, type = mode === "bars-cdf" ? "cdf" : "pmf", val = ds.val;
            var lbl = type === "cdf"
                ? "suma de barras hasta k = <strong>P(X ≤ " + k + ") = " + val + "</strong> · " + pf.params
                : "barra resaltada = <strong>P(X = " + k + ") = " + val + "</strong> · " + pf.params;
            drawDisc(body, caption, pf, k, type, lbl);
            return;
        }

        var d = densOf(dist, ds); if (!d) return;
        var par = d.params ? " · " + d.params : "";
        if (mode === "left-x") {
            var x = num(ds.t, ds.x, ds.f, ds.z);
            drawCont(body, caption, d, x, { mode: "left" },
                "área a la izquierda = <strong>P(X ≤ " + fmt(x) + ") = " + ds.val + "</strong>" + par);
        } else if (mode === "left-val") {
            var xv = +ds.val, p = ds.p;
            drawCont(body, caption, d, xv, { mode: "left" },
                "área a la izquierda = <strong>P(X ≤ " + fmt(xv) + ") = " + fmt(p) + "</strong>" + par);
        } else if (mode === "pdf-point") {
            var xp = num(ds.t, ds.x, ds.z);
            drawCont(body, caption, d, xp, { mode: "point" },
                "altura de la curva = <strong>f(" + fmt(xp) + ") = " + ds.val + "</strong>" + par);
        } else if (mode === "crit-two") {
            var xt = Math.abs(+ds.val), a1 = ds.a1, a2 = ds.a2;
            drawCont(body, caption, d, xt, { mode: "twotail" },
                "t = " + xt.toFixed(3) + par + ": cada cola tiene α = <strong>" + fmt(a1) +
                "</strong> (una cola); las dos juntas, α = <strong>" + fmt(a2) + "</strong> (dos colas)");
        } else if (mode === "crit-right") {
            var xr = +ds.val, al = ds.alpha;
            drawCont(body, caption, d, xr, { mode: "right" },
                "cola derecha (área) = <strong>α = " + fmt(al) + "</strong> · valor crítico = " + xr.toFixed(3) + par);
        }
    }

    figs.forEach(function (fig) {
        render(fig, fig.dataset); // estado inicial desde la "celda virtual"
        (fig.dataset.tables || "").split(/\s+/).forEach(function (id) {
            var t = document.getElementById(id);
            if (!t) return;
            t.addEventListener("click", function (e) {
                var td = e.target.closest("td[data-val]");
                if (td) render(fig, td.dataset);
            });
        });
    });
})();
