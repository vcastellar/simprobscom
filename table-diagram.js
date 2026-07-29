/* table-diagram.js — Diagramas explicativos de las tablas de distribución.
 *
 * Cada página puede tener varias figuras (una por pestaña: acumulada, densidad,
 * valores críticos, cuantiles…). Bajo cada tabla se dibuja la densidad (o las
 * barras de la PMF) resaltando lo que representa el valor de la tabla.
 *
 * Reacciona a dos cosas:
 *   · clic en una celda  → toma el punto y los parámetros de esa celda.
 *   · cambio de un selector de parámetro (df, n, α, β…) → actualiza el
 *     parámetro y RECALCULA con jStat el valor para el nuevo parámetro.
 *
 * Mejora progresiva: usa jStat; si no está disponible, las figuras se ocultan
 * y las tablas siguen intactas.
 *
 * Config por atributos data-* en cada <figure class="dist-diagram" ...>:
 *   data-dist   : normal|student|chisquare|centralF|beta|gamma|poisson|binomial
 *   data-mode   : left-x|left-val|pdf-point|crit-two|crit-right|bars-pmf|bars-cdf
 *   data-tables : ids de tablas cuyos clics actualizan la figura
 *   data-params : "selectorId:attr …" selectores de parámetro que la actualizan
 *   data-*      : "celda virtual" con el estado inicial
 */
(function () {
    "use strict";
    var figs = document.querySelectorAll(".dist-diagram[data-dist]");
    if (!figs.length) return;
    if (typeof jStat === "undefined") {
        figs.forEach(function (f) { f.style.display = "none"; });
        return;
    }

    // ── Textos (ES / EN) ──────────────────────────────────────────────────
    var STR = {
        es: {
            hint: "Cambia una celda o un parámetro para verlo.",
            leftArea: function (x, v, par) { return "área a la izquierda = <strong>P(X ≤ " + x + ") = " + v + "</strong>" + par; },
            height: function (x, v, par) { return "altura de la curva = <strong>f(" + x + ") = " + v + "</strong>" + par; },
            twoTail: function (x, a1, a2, par) { return "t = " + x + par + ": cada cola tiene α = <strong>" + a1 + "</strong> (una cola); las dos juntas, α = <strong>" + a2 + "</strong> (dos colas)"; },
            rightTail: function (x, al, par) { return "cola derecha (área) = <strong>α = " + al + "</strong> · valor crítico = " + x + par; },
            barPmf: function (k, v, par) { return "barra resaltada = <strong>P(X = " + k + ") = " + v + "</strong> · " + par; },
            barCdf: function (k, v, par) { return "suma de barras hasta k = <strong>P(X ≤ " + k + ") = " + v + "</strong> · " + par; },
            fdf: function (d1, d2) { return "gl " + d1 + ", " + d2; }
        },
        en: {
            hint: "Click a cell or change a parameter to see it.",
            leftArea: function (x, v, par) { return "area to the left = <strong>P(X ≤ " + x + ") = " + v + "</strong>" + par; },
            height: function (x, v, par) { return "curve height = <strong>f(" + x + ") = " + v + "</strong>" + par; },
            twoTail: function (x, a1, a2, par) { return "t = " + x + par + ": each tail has α = <strong>" + a1 + "</strong> (one tail); both together, α = <strong>" + a2 + "</strong> (two tails)"; },
            rightTail: function (x, al, par) { return "right tail (area) = <strong>α = " + al + "</strong> · critical value = " + x + par; },
            barPmf: function (k, v, par) { return "highlighted bar = <strong>P(X = " + k + ") = " + v + "</strong> · " + par; },
            barCdf: function (k, v, par) { return "sum of bars up to k = <strong>P(X ≤ " + k + ") = " + v + "</strong> · " + par; },
            fdf: function (d1, d2) { return "df " + d1 + ", " + d2; }
        }
    };
    var L = STR[(document.documentElement.lang || "es").slice(0, 2) === "en" ? "en" : "es"];

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
    function copyDs(ds) { var o = {}, k; for (k in ds) o[k] = ds[k]; return o; }

    // ── Estadística continua (pdf / cdf / inv) ────────────────────────────
    function statOf(dist, ds) {
        switch (dist) {
            case "normal": return { pdf: function (v) { return jStat.normal.pdf(v, 0, 1); }, cdf: function (v) { return jStat.normal.cdf(v, 0, 1); }, inv: function (p) { return jStat.normal.inv(p, 0, 1); }, kind: "sym", params: "" };
            case "student": var df = +ds.df; return { pdf: function (v) { return jStat.studentt.pdf(v, df); }, cdf: function (v) { return jStat.studentt.cdf(v, df); }, inv: function (p) { return jStat.studentt.inv(p, df); }, kind: "sym", params: "ν = " + df };
            case "chisquare": var c = +ds.df; return { pdf: function (v) { return jStat.chisquare.pdf(v, c); }, cdf: function (v) { return jStat.chisquare.cdf(v, c); }, inv: function (p) { return jStat.chisquare.inv(p, c); }, kind: "pos", params: "ν = " + c };
            case "centralF": var d1 = +ds.df1, d2 = +ds.df2; return { pdf: function (v) { return jStat.centralF.pdf(v, d1, d2); }, cdf: function (v) { return jStat.centralF.cdf(v, d1, d2); }, inv: function (p) { return jStat.centralF.inv(p, d1, d2); }, kind: "pos", params: L.fdf(d1, d2) };
            case "beta": var ba = +ds.alpha, bb = +ds.beta; return { pdf: function (v) { return jStat.beta.pdf(v, ba, bb); }, cdf: function (v) { return jStat.beta.cdf(v, ba, bb); }, inv: function (p) { return jStat.beta.inv(p, ba, bb); }, kind: "unit", params: "α = " + ba + ", β = " + bb };
            case "gamma": var ga = +ds.alpha, gb = +ds.beta; return { pdf: function (v) { return jStat.gamma.pdf(v, ga, gb); }, cdf: function (v) { return jStat.gamma.cdf(v, ga, gb); }, inv: function (p) { return jStat.gamma.inv(p, ga, gb); }, kind: "pos", params: "α = " + ga + ", β = " + gb };
        }
        return null;
    }
    function domainOf(d, x) {
        if (d.kind === "unit") return [0, 1];
        if (d.kind === "sym") { var D = Math.max(4, Math.abs(x) * 1.3); return [-D, D]; }
        return [0, Math.max((x || 1) * 1.6, safeInv(function () { return d.inv(0.997); }, (x || 1) * 2 || 8))];
    }

    // ── PMF discreta (pmf / cdf) ──────────────────────────────────────────
    function pmfOf(dist, ds) {
        if (dist === "poisson") { var l = +ds.lam; return { f: function (k) { return jStat.poisson.pdf(k, l); }, cdf: function (k) { return jStat.poisson.cdf(k, l); }, kmax: Math.max(10, Math.ceil(l + 4 * Math.sqrt(l))), params: "λ = " + l }; }
        if (dist === "binomial") { var n = +ds.n, p = +ds.p; return { f: function (k) { return jStat.binomial.pdf(k, n, p); }, cdf: function (k) { return jStat.binomial.cdf(k, n, p); }, kmax: n, params: "n = " + n + ", p = " + p }; }
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
    function axisLine() { return '<line class="dg-axis" x1="' + padL + '" y1="' + baseline + '" x2="' + (W - padR) + '" y2="' + baseline + '"/>'; }
    function vline(x, y) { return '<line class="dg-zline" x1="' + x.toFixed(1) + '" y1="' + baseline + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>'; }

    function drawCont(body, caption, d, x, spec, label) {
        var dom = domainOf(d, x), lo = dom[0], hi = dom[1], N = 200, i, v, dv, dmax = 0, pts = [];
        for (i = 0; i <= N; i++) { v = lo + (hi - lo) * i / N; dv = d.pdf(v); if (isFinite(dv)) { pts.push([v, dv]); if (dv > dmax) dmax = dv; } }
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
        if (spec.mode === "left") { shade = area(lo, x); marks = vline(px(x), py(d.pdf(x))); }
        else if (spec.mode === "right") { shade = area(x, hi); marks = vline(px(x), py(d.pdf(x))); }
        else if (spec.mode === "twotail") { shade = area(lo, -x) + area(x, hi); marks = vline(px(-x), py(d.pdf(-x))) + vline(px(x), py(d.pdf(x))); }
        else if (spec.mode === "point") { marks = vline(px(x), py(d.pdf(x))) + '<circle cx="' + px(x).toFixed(1) + '" cy="' + py(d.pdf(x)).toFixed(1) + '" r="4" fill="var(--accent)"/>'; }

        var ticks = "", tk = niceTicks(lo, hi);
        for (i = 0; i < tk.length; i++) ticks += '<text class="dg-tick" x="' + px(tk[i]).toFixed(1) + '" y="' + (baseline + 15) + '" text-anchor="middle">' + tk[i] + "</text>";

        body.innerHTML = shade + axisLine() + ticks + '<path class="dg-curve" d="' + curve + '"/>' + marks;
        if (caption) caption.innerHTML = label + '. <span class="dg-hint">' + L.hint + '</span>';
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
        if (caption) caption.innerHTML = label + '. <span class="dg-hint">' + L.hint + '</span>';
    }

    // ── Recalcula el valor dependiente cuando cambia un parámetro ─────────
    function recompute(fig, s) {
        var dist = fig.dataset.dist, mode = fig.dataset.mode;
        if (dist === "poisson" || dist === "binomial") {
            var pf = pmfOf(dist, s), k = +s.k;
            if (k > pf.kmax) { k = pf.kmax; s.k = k; }
            s.val = (mode === "bars-cdf" ? pf.cdf(k) : pf.f(k)).toFixed(4);
            return;
        }
        var st = statOf(dist, s);
        if (mode === "left-x") { s.val = st.cdf(num(s.t, s.x, s.f, s.z)).toFixed(4); }
        else if (mode === "pdf-point") { s.val = st.pdf(num(s.t, s.x, s.z)).toFixed(4); }
        else if (mode === "left-val") { s.val = fmt(st.inv(+s.p)); }
        // crit-two / crit-right: sus tablas no tienen selectores de parámetro
    }

    // ── Render de una figura a partir de un estado ────────────────────────
    function render(fig, ds) {
        var body = fig.querySelector("[data-dg-body]"), caption = fig.querySelector(".dg-caption");
        if (!body) return;
        var dist = fig.dataset.dist, mode = fig.dataset.mode;

        if (dist === "poisson" || dist === "binomial") {
            var pf = pmfOf(dist, ds); if (!pf) return;
            var k = +ds.k, type = mode === "bars-cdf" ? "cdf" : "pmf", val = ds.val;
            var lbl = type === "cdf" ? L.barCdf(k, val, pf.params) : L.barPmf(k, val, pf.params);
            drawDisc(body, caption, pf, k, type, lbl);
            return;
        }

        var d = statOf(dist, ds); if (!d) return;
        var par = d.params ? " · " + d.params : "";
        if (mode === "left-x") {
            var x = num(ds.t, ds.x, ds.f, ds.z);
            drawCont(body, caption, d, x, { mode: "left" }, L.leftArea(fmt(x), ds.val, par));
        } else if (mode === "left-val") {
            var xv = +ds.val;
            drawCont(body, caption, d, xv, { mode: "left" }, L.leftArea(fmt(xv), fmt(ds.p), par));
        } else if (mode === "pdf-point") {
            var xp = num(ds.t, ds.x, ds.z);
            drawCont(body, caption, d, xp, { mode: "point" }, L.height(fmt(xp), ds.val, par));
        } else if (mode === "crit-two") {
            var xt = Math.abs(+ds.val);
            drawCont(body, caption, d, xt, { mode: "twotail" }, L.twoTail(xt.toFixed(3), fmt(ds.a1), fmt(ds.a2), par));
        } else if (mode === "crit-right") {
            var xr = +ds.val;
            drawCont(body, caption, d, xr, { mode: "right" }, L.rightTail(xr.toFixed(3), fmt(ds.alpha), par));
        }
    }

    // ── Enganche por figura ───────────────────────────────────────────────
    figs.forEach(function (fig) {
        var state = copyDs(fig.dataset);
        function draw() { render(fig, state); }
        draw();

        // Clic en celda: toma punto + parámetros de la celda
        (fig.dataset.tables || "").split(/\s+/).forEach(function (id) {
            var t = document.getElementById(id);
            if (!t) return;
            t.addEventListener("click", function (e) {
                var td = e.target.closest("td[data-val]");
                if (td) { state = copyDs(td.dataset); draw(); }
            });
        });

        // Cambio de selector de parámetro: actualiza el parámetro y recalcula
        (fig.dataset.params || "").split(/\s+/).forEach(function (pair) {
            if (!pair) return;
            var kv = pair.split(":"), sel = document.getElementById(kv[0]), attr = kv[1];
            if (!sel || !attr) return;
            sel.addEventListener("change", function () {
                state[attr] = sel.value;
                recompute(fig, state);
                draw();
            });
        });
    });
})();
