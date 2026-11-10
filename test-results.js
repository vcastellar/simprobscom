/* Presentación común del resultado de los contrastes de hipótesis
 * (decisión, p-valor, conclusión, potencia y detalles plegables) y cálculo
 * de la potencia y de la diferencia mínima detectable.
 * Usa jStat. Expone window.TestResult.
 */
(function (global) {
    'use strict';

    const EN = document.documentElement.lang === 'en';
    const LOCALE = EN ? 'en-US' : 'es-ES';
    const TARGET = 0.8; // potencia de referencia

    function num(v, d) {
        return Number(v).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
    }
    function auto(v, maxDigits) {
        const o = Number.isInteger(v) ? {} : { maximumFractionDigits: maxDigits == null ? 4 : maxDigits };
        return Number(v).toLocaleString(LOCALE, o).replace('-', '−');
    }
    function sig(v, digits) {
        return Number(Number(v).toPrecision(digits || 3));
    }
    function prob(v) {
        if (v > 0 && v < 1e-4) return v.toExponential(2).replace('.', EN ? '.' : ',');
        return num(v, 5);
    }
    function pct(v, d) {
        return num(v * 100, d == null ? 0 : d) + (EN ? '%' : ' %');
    }
    // Nivel en porcentaje sin decimales sobrantes: 0,95 → «95 %», 0,975 → «97,5 %».
    function pctLevel(v) {
        return auto(Number((v * 100).toFixed(2)), 2) + (EN ? '%' : ' %');
    }
    function esc(s) {
        return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
    function interval(a, b, d) {
        return '[' + num(a, d) + (EN ? ', ' : '; ') + num(b, d) + ']';
    }
    function link(url, text) {
        return '<a href="' + esc(url) + '">' + esc(text) + '</a>.';
    }

    // Enlace a la calculadora del intervalo de confianza con los mismos datos.
    function ciLink(url, conf) {
        const lvl = auto(Number((conf * 100).toFixed(2))) + (EN ? '%' : ' %');
        return link(url, EN ? 'Open the ' + lvl + ' confidence interval with these data' : 'Abrir el intervalo de confianza al ' + lvl + ' con estos datos');
    }

    // Redondeo hacia arriba a `digits` cifras significativas: al pasar una
    // diferencia mínima a otra calculadora, así no pide más datos de los que hay.
    function sigUp(v, digits) {
        if (!(v > 0)) return v;
        const e = Math.floor(Math.log10(v)) - (digits || 3) + 1;
        const f = Math.pow(10, e);
        return Number((Math.ceil(v / f - 1e-9) * f).toPrecision(digits || 3));
    }

    // Menor x de [lo, hi] que cumple ok(x) (ok monótona); null si ni hi la cumple.
    function solveMin(ok, lo, hi) {
        if (!ok(hi)) return null;
        for (let i = 0; i < 60; i++) {
            const mid = (lo + hi) / 2;
            if (ok(mid)) hi = mid; else lo = mid;
        }
        return hi;
    }

    // Puntos porcentuales: 0,084 → «8,4 puntos».
    function points(v) {
        return num(v * 100, v < 0.01 ? 2 : 1) + (EN ? ' percentage points' : ' puntos');
    }

    // Potencia del contraste chi-cuadrado para un tamaño del efecto w de Cohen.
    function noncentralChi2CDF(x, df, lambda) {
        if (x <= 0) return 0;
        const half = lambda / 2;
        let sum = 0, logW = -half;
        for (let k = 0; k <= 2000; k++) {
            if (k > 0) logW += Math.log(half / k);
            const w = Math.exp(logW);
            sum += w * jStat.chisquare.cdf(x, df + 2 * k);
            if (k > half + 10 && w < 1e-14) break;
            if (half === 0) break;
        }
        return Math.min(1, sum);
    }
    function chi2Power(w, N, df, alpha) {
        return 1 - noncentralChi2CDF(jStat.chisquare.inv(1 - alpha, df), df, N * w * w);
    }

    // Enlace al simulador de errores tipo I y II con el contraste actual:
    // d = diferencia mínima detectable en desviaciones típicas. El simulador
    // solo tiene cola derecha y bilateral; la cola izquierda se muestra reflejada.
    function simLink(d, n, alpha, tail, approx, sigma, h0) {
        const url = 'simulaciones/simulador-errores-tipo-i-ii.html?d=' + sig(d, 4) + '&n=' + n + '&alpha=' + alpha +
            '&tail=' + (tail === 'two' ? 'two' : 'right') + (tail === 'left' ? '&mirror=1' : '') + (approx ? '&approx=' + approx : '') + (sigma > 0 ? '&sigma=' + sig(sigma, 4) : '') + (Number.isFinite(h0) ? '&h0=' + h0 : '');
        return link(url, EN ? 'See α, β and the power of this test in the type I and II error simulator' : 'Ver α, β y la potencia de este contraste en el simulador de errores tipo I y II');
    }

    // Potencia de un contraste t (o z si df no es finito) cuando la diferencia
    // real es de `ncp` errores estándar en el sentido de la alternativa.
    function tPower(ncp, alpha, tail, df) {
        const q = tail === 'two' ? 1 - alpha / 2 : 1 - alpha;
        const zPower = () => {
            const zc = jStat.normal.inv(q, 0, 1);
            const upper = 1 - jStat.normal.cdf(zc - ncp, 0, 1);
            return tail === 'two' ? upper + jStat.normal.cdf(-zc - ncp, 0, 1) : upper;
        };
        if (!Number.isFinite(df)) return zPower();
        const tc = jStat.studentt.inv(q, df);
        let pw = 1 - jStat.noncentralt.cdf(tc, df, ncp);
        if (tail === 'two') pw += jStat.noncentralt.cdf(-tc, df, ncp);
        return Number.isFinite(pw) && pw >= 0 && pw <= 1 ? pw : zPower();
    }

    // Menor diferencia que el contraste detecta con la potencia de referencia.
    function mdeT(se, alpha, tail, df) {
        let lo = 0, hi = 20 * se;
        for (let i = 0; i < 60; i++) {
            const mid = (lo + hi) / 2;
            if (tPower(mid / se, alpha, tail, df) < TARGET) lo = mid; else hi = mid;
        }
        return hi;
    }

    // F no central: suma de Poisson de betas incompletas regularizadas.
    function noncentralFCDF(x, df1, df2, ncp) {
        if (x <= 0) return 0;
        const halfNcp = ncp / 2;
        const betaArg = (df1 * x) / (df1 * x + df2);
        let sum = 0;
        let logW = -halfNcp;
        for (let j = 0; j <= 2000; j++) {
            const w = Math.exp(logW);
            if (j > halfNcp && w < 1e-14) break;
            sum += w * jStat.ibeta(betaArg, (df1 + 2 * j) / 2, df2 / 2);
            if (halfNcp === 0) break;
            logW += Math.log(halfNcp) - Math.log(j + 1);
        }
        return Math.min(Math.max(sum, 0), 1);
    }

    // Potencia del ANOVA de un factor para un tamaño del efecto f de Cohen.
    function anovaPower(f, N, k, alpha) {
        const df1 = k - 1, df2 = N - k;
        const fc = jStat.centralF.inv(1 - alpha, df1, df2);
        return 1 - noncentralFCDF(fc, df1, df2, N * f * f);
    }

    // Menor f de Cohen que el ANOVA detecta con la potencia de referencia.
    function mdeF(N, k, alpha) {
        let lo = 0, hi = 5;
        for (let i = 0; i < 50; i++) {
            const mid = (lo + hi) / 2;
            if (anovaPower(mid, N, k, alpha) < TARGET) lo = mid; else hi = mid;
        }
        return hi;
    }

    function render(el, o) {
        const prev = el.querySelector('details.ci-res-details');
        const wasOpen = !!(prev && prev.open);
        let h = '<div class="ci-res">';
        h += '<div class="ci-res-label">' + esc(o.label) + '</div>';
        h += '<div class="ci-res-main"><span class="ci-res-int">' + esc(o.decision) + '</span> <span class="ci-res-width">' +
            esc((o.pLabel || (EN ? 'p-value' : 'p-valor')) + ' = ' + prob(o.p)) + '</span></div>';
        (o.sec || []).forEach((s) => { h += '<div class="ci-res-sec">' + esc(s) + '</div>'; });
        h += '<div class="ci-res-note ' + (o.ok ? 'ci-res-ok' : 'ci-res-info') + '">' + esc(o.verdict) + '</div>';
        (o.notes || []).forEach((n) => { h += '<div class="ci-res-note ci-res-info">' + n + '</div>'; });
        h += '<details class="ci-res-details"' + (wasOpen ? ' open' : '') + '><summary>' + (EN ? 'Calculation details' : 'Detalles del cálculo') + '</summary><dl>';
        (o.rows || []).forEach(([k, v]) => { h += '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>'; });
        h += '</dl>' + (o.extraHtml || '') + '</details></div>';
        el.innerHTML = h;
    }

    global.TestResult = {
        EN, LOCALE, TARGET,
        num, auto, sig, sigUp, pctLevel, solveMin, points, chi2Power, prob, pct, esc, interval, link, ciLink, simLink,
        tPower, mdeT, noncentralFCDF, anovaPower, mdeF, render
    };
}(window));
