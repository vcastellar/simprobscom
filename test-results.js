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
    function esc(s) {
        return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
    function interval(a, b, d) {
        return '[' + num(a, d) + (EN ? ', ' : '; ') + num(b, d) + ']';
    }
    function link(url, text) {
        return '<a href="' + esc(url) + '">' + esc(text) + '</a>.';
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
        num, auto, sig, prob, pct, esc, interval, link,
        tPower, mdeT, noncentralFCDF, anovaPower, mdeF, render
    };
}(window));
