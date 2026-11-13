/* Panel «¿Para qué necesitas este valor?» de las tablas estadísticas.
 *
 * Al pulsar una celda, aparece un panel fijo en la parte inferior con el valor
 * exacto y enlaces a las calculadoras en las que se usa, con los grados de
 * libertad, el nivel y el tipo de contraste ya rellenos. Los clics en esos
 * enlaces se registran como eventos de GoatCounter.
 *
 * Usa jStat. Expone window.TableLinks.
 */
(function (global) {
    'use strict';

    const EN = document.documentElement.lang === 'en';
    const LOCALE = EN ? 'en-US' : 'es-ES';

    function num(v, d) {
        return Number(v).toLocaleString(LOCALE, { maximumFractionDigits: d == null ? 4 : d }).replace('-', '−');
    }
    function fixed(v, d) {
        return Number(v).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
    }
    function pct(v) {
        return num(Number((v * 100).toFixed(2)), 2) + (EN ? '%' : ' %');
    }
    // Probabilidad: 4 decimales, o notación científica si es muy pequeña.
    function prob(v) {
        if (v > 0 && v < 1e-4) return v.toExponential(2).replace('.', EN ? '.' : ',');
        return fixed(v, 4);
    }
    function esc(s) {
        return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }
    function url(page, q) {
        const s = Object.keys(q).filter((k) => q[k] != null).map((k) => k + '=' + encodeURIComponent(q[k])).join('&');
        return page + (s ? '?' + s : '');
    }
    function tailText(tail) {
        return EN ? { two: 'two-tailed', right: 'right-tailed', left: 'left-tailed' }[tail]
            : { two: 'bilateral', right: 'cola derecha', left: 'cola izquierda' }[tail];
    }
    // Tabla r × c (r ≤ c ≤ 8) con (r − 1)(c − 1) = ν, lo más cuadrada posible.
    function tableShape(df) {
        for (let a = Math.floor(Math.sqrt(df)); a >= 1; a--) {
            if (df % a === 0 && df / a + 1 <= 8) return [a + 1, df / a + 1];
        }
        return null;
    }

    // ── Panel ─────────────────────────────────────────────────────────────

    const CSS = '.tl-panel{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);width:min(760px,calc(100% - 24px));max-height:70vh;overflow-y:auto;box-sizing:border-box;background:#fff;border:1px solid rgba(79,70,229,.25);border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.2);padding:12px 44px 12px 16px;z-index:200;font-size:.9rem;line-height:1.45;color:#1e293b}' +
        '.tl-panel p{margin:0}.tl-value{color:#312e81}.tl-text{margin-top:4px!important}' +
        '.tl-title{margin-top:10px!important;font-size:.76rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em}' +
        '.tl-links{list-style:none;margin:4px 0 0;padding:0;display:grid;gap:3px}.tl-links a{color:#2563eb;font-weight:600;text-decoration:none}.tl-links a:hover,.tl-links a:focus-visible{text-decoration:underline}' +
        '.tl-note{margin-top:8px!important;font-size:.78rem;color:#64748b}' +
        '.tl-close{position:absolute;top:4px;right:6px;border:0;background:transparent;font-size:1.5rem;line-height:1;color:#64748b;cursor:pointer;padding:6px 10px;border-radius:8px}.tl-close:hover{background:rgba(100,116,139,.12)}' +
        'body.tl-open{padding-bottom:45vh}' +
        'html.dark-mode .tl-panel{background:#0f172a;border-color:rgba(147,197,253,.3);color:#e2e8f0;box-shadow:0 12px 32px rgba(0,0,0,.5)}html.dark-mode .tl-value{color:#c7d2fe}html.dark-mode .tl-links a{color:#93c5fd}html.dark-mode .tl-title,html.dark-mode .tl-note,html.dark-mode .tl-close{color:#94a3b8}' +
        '@media (max-width:600px){.tl-panel{bottom:8px;font-size:.84rem;padding:10px 40px 10px 12px}.tl-links{gap:6px}.tl-note{display:none}}' +
        '@media print{.tl-panel{display:none!important}}';
    let panel = null;
    function ensurePanel() {
        if (panel) return panel;
        const st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);
        panel = document.createElement('aside');
        panel.className = 'tl-panel';
        panel.setAttribute('aria-live', 'polite');
        panel.setAttribute('aria-label', EN ? 'What this value is used for' : 'Para qué se usa este valor');
        panel.hidden = true;
        panel.innerHTML = '<button type="button" class="tl-close" aria-label="' + (EN ? 'Close' : 'Cerrar') + '">×</button><div class="tl-body"></div>';
        panel.querySelector('.tl-close').addEventListener('click', hide);
        panel.addEventListener('click', (e) => {
            const a = e.target.closest('a[data-ev]');
            if (!a) return;
            try {
                if (global.goatcounter && global.goatcounter.count) {
                    global.goatcounter.count({ path: 'tabla-enlace/' + a.dataset.ev, title: a.textContent, event: true });
                }
            } catch (err) { /* la medición nunca debe impedir la navegación */ }
        });
        document.body.appendChild(panel);
        // Al cambiar de pestaña, el valor mostrado deja de corresponder a lo visible.
        document.querySelectorAll('.tab-btn').forEach((b) => b.addEventListener('click', hide));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
        return panel;
    }
    function hide() {
        if (panel) panel.hidden = true;
        document.body.classList.remove('tl-open');
    }
    function show(o) {
        if (!o) { hide(); return; }
        const p = ensurePanel();
        let h = '<p class="tl-value">' + o.value + '</p>';
        if (o.pvalue) h += '<p class="tl-text">' + o.pvalue + '</p>';
        if (o.links && o.links.length) {
            h += '<p class="tl-title">' + (EN ? 'What do you need it for?' : '¿Para qué lo necesitas?') + '</p><ul class="tl-links">';
            o.links.forEach((l) => { h += '<li><a href="' + esc(l.href) + '" data-ev="' + esc(l.ev) + '">' + esc(l.text) + ' →</a></li>'; });
            h += '</ul>';
        }
        if (o.note) h += '<p class="tl-note">' + o.note + '</p>';
        p.querySelector('.tl-body').innerHTML = h;
        p.hidden = false;
        document.body.classList.add('tl-open');
    }

    // ── Normal estándar: celda de Φ(z) ─────────────────────────────────────
    function normalCdf(z) {
        const phi = jStat.normal.cdf(z, 0, 1);
        const tail = jStat.normal.cdf(-Math.abs(z), 0, 1);
        const links = [];
        const az = Math.abs(z);
        if (az >= 0.5) {
            const conf = Number((2 * jStat.normal.cdf(az, 0, 1) - 1).toFixed(4));
            links.push({
                ev: 'normal/ic-media-sigma',
                href: url('intervalo-confianza-media-sigma-conocida.html', { conf: conf, from: 'tabla-normal' }),
                text: EN ? 'Confidence interval for the mean (σ known) at ' + pct(conf) + ', which uses z = ' + fixed(az, 2)
                    : 'Intervalo de confianza para la media (σ conocida) al ' + pct(conf) + ', que usa z = ' + fixed(az, 2)
            });
        }
        links.push({
            ev: 'normal/contraste-z',
            href: url('contraste-hipotesis-una-media.html', { disp: 'population', from: 'tabla-normal' }),
            text: EN ? 'z-test for a mean, with your data' : 'Contraste z de una media, con tus datos'
        });
        links.push({
            ev: 'normal/calculadora',
            href: 'normal.html',
            text: EN ? 'Probabilities of any normal N(μ, σ), without standardising' : 'Probabilidades de cualquier normal N(μ, σ), sin tipificar'
        });
        const zs = fixed(z, 2);
        return {
            value: 'z = ' + zs + ': <strong>Φ(z) = P(Z ≤ ' + zs + ') = ' + prob(phi) + '</strong> · P(Z &gt; ' + zs + ') = ' + prob(1 - phi),
            pvalue: EN ? 'If z is your test statistic: p-value = <strong>' + prob(2 * tail) + '</strong> two-tailed, ' + prob(tail) + ' one-tailed.'
                : 'Si z es el estadístico de tu contraste: p-valor = <strong>' + prob(2 * tail) + '</strong> bilateral, ' + prob(tail) + ' unilateral.',
            links: links
        };
    }

    // ── t de Student ──────────────────────────────────────────────────────
    const T_NOTE = EN ? 'Degrees of freedom: ν = n − 1 with one sample or with n paired observations; ν = n₁ + n₂ − 2 when comparing two means with equal variances.'
        : 'Grados de libertad: ν = n − 1 con una muestra o con n pares de datos apareados; ν = n₁ + n₂ − 2 al comparar dos medias con varianzas iguales.';

    // Celda de valores críticos: a1 = área de una cola, a2 = de las dos; mode = 'two' | 'one'.
    function tCrit(df, a1, a2, mode) {
        const t = jStat.studentt.inv(1 - a1, df);
        const n = df + 1;
        const alpha = mode === 'two' ? a2 : a1;
        const tail = mode === 'two' ? 'two' : 'right';
        const links = [];
        const conf = Number((1 - a2).toFixed(4));
        if (conf >= 0.8 && n <= 1001) {
            links.push({
                ev: 't/ic-media',
                href: url('intervalo-confianza-media.html', { n: n, conf: conf, from: 'tabla-t' }),
                text: EN ? 'Confidence interval at ' + pct(conf) + ' for the mean with n = ' + n + ' observations'
                    : 'Intervalo de confianza al ' + pct(conf) + ' para la media con n = ' + n + ' datos'
            });
        }
        if (alpha <= 0.2 && n <= 1001) {
            links.push({
                ev: 't/contraste-media',
                href: url('contraste-hipotesis-una-media.html', { n: n, alpha: alpha, tail: tail, disp: 'sample', from: 'tabla-t' }),
                text: EN ? 't-test for a mean with n = ' + n + ' and α = ' + num(alpha) + ', ' + tailText(tail)
                    : 'Contraste t de una media con n = ' + n + ' y α = ' + num(alpha) + ', ' + tailText(tail)
            });
            links.push({
                ev: 't/contraste-apareadas',
                href: url('contraste-hipotesis-medias-apareadas.html', { n: n, alpha: alpha, tail: tail, from: 'tabla-t' }),
                text: EN ? 'Paired-means test with ' + n + ' pairs and α = ' + num(alpha)
                    : 'Contraste de medias apareadas con ' + n + ' pares y α = ' + num(alpha)
            });
        }
        return {
            value: 'ν = ' + df + ', α = ' + num(alpha) + ' (' + (mode === 'two' ? (EN ? 'two tails' : 'dos colas') : (EN ? 'one tail' : 'una cola')) + '): <strong>t = ' + fixed(t, 4) + '</strong>',
            links: links,
            note: T_NOTE
        };
    }

    // Celda de la distribución acumulada P(T ≤ t).
    function tCdf(t, df) {
        const cdf = jStat.studentt.cdf(t, df);
        const tail = jStat.studentt.cdf(-Math.abs(t), df);
        const n = df + 1;
        const ts = fixed(t, 2);
        return {
            value: 'ν = ' + df + ', t = ' + ts + ': <strong>P(T ≤ ' + ts + ') = ' + prob(cdf) + '</strong> · P(T &gt; ' + ts + ') = ' + prob(1 - cdf),
            pvalue: EN ? 'If t is your test statistic: p-value = <strong>' + prob(2 * tail) + '</strong> two-tailed, ' + prob(tail) + ' one-tailed.'
                : 'Si t es el estadístico de tu contraste: p-valor = <strong>' + prob(2 * tail) + '</strong> bilateral, ' + prob(tail) + ' unilateral.',
            links: n <= 1001 ? [{
                ev: 't/contraste-media-cdf',
                href: url('contraste-hipotesis-una-media.html', { n: n, disp: 'sample', from: 'tabla-t' }),
                text: EN ? 'Run the full t-test for a mean with n = ' + n + ' observations' : 'Hacer el contraste t de una media completo con n = ' + n + ' datos'
            }, {
                ev: 't/ic-media-cdf',
                href: url('intervalo-confianza-media.html', { n: n, from: 'tabla-t' }),
                text: EN ? 'Confidence interval for the mean with n = ' + n + ' observations' : 'Intervalo de confianza para la media con n = ' + n + ' datos'
            }] : [],
            note: T_NOTE
        };
    }

    // ── Chi-cuadrado ──────────────────────────────────────────────────────
    const CHI_NOTE = EN ? 'Degrees of freedom: ν = k − 1 in goodness of fit (k categories), (r − 1)(c − 1) in independence (r × c table) and n − 1 in the test for one variance.'
        : 'Grados de libertad: ν = k − 1 en bondad de ajuste (k categorías), (r − 1)(c − 1) en independencia (tabla r × c) y n − 1 en el contraste de una varianza.';

    function independenceLink(df, alpha) {
        const shape = tableShape(df);
        return {
            ev: 'chi/independencia',
            href: url('contraste-independencia-chi-cuadrado.html', { alpha: alpha, rows: shape && shape[0], cols: shape && shape[1], from: 'tabla-chi' }),
            text: (EN ? 'Chi-square test of independence' : 'Contraste chi-cuadrado de independencia') +
                (shape ? (EN ? ' for a ' + shape[0] + ' × ' + shape[1] + ' table' : ' en una tabla ' + shape[0] + ' × ' + shape[1]) : '') +
                (alpha ? ' (α = ' + num(alpha) + ')' : '')
        };
    }
    function gofLink(df, alpha) {
        return {
            ev: 'chi/bondad',
            href: url('chi-cuadrado-bondad-ajuste.html', { alpha: alpha, k: df + 1, from: 'tabla-chi' }),
            text: (EN ? 'Goodness-of-fit test with ' + (df + 1) + ' categories' : 'Contraste de bondad de ajuste con ' + (df + 1) + ' categorías') +
                (alpha ? ' (α = ' + num(alpha) + ')' : '')
        };
    }

    // Celda de valores críticos: p = P(X ≤ χ²).
    function chiCrit(df, p) {
        const x = jStat.chisquare.inv(p, df);
        const upper = p >= 0.5;
        const alpha = Number((upper ? 1 - p : p).toFixed(4));
        const n = df + 1;
        const links = [];
        if (upper) links.push(gofLink(df, alpha), independenceLink(df, alpha));
        links.push({
            ev: 'chi/contraste-varianza',
            href: url('contraste-hipotesis-varianzas.html', { testType: 'one', n: n, alpha: alpha, tail: upper ? 'right' : 'left', from: 'tabla-chi' }),
            text: EN ? 'Test for one variance with n = ' + n + ' and α = ' + num(alpha) + ', ' + tailText(upper ? 'right' : 'left')
                : 'Contraste de una varianza con n = ' + n + ' y α = ' + num(alpha) + ', ' + tailText(upper ? 'right' : 'left')
        });
        const conf = Number((1 - 2 * alpha).toFixed(4));
        if (conf >= 0.8) {
            links.push({
                ev: 'chi/ic-varianza',
                href: url('intervalo-confianza-varianza.html', { n: n, conf: conf, from: 'tabla-chi' }),
                text: EN ? 'Confidence interval at ' + pct(conf) + ' for the variance with n = ' + n + ' (uses this value and the one for p = ' + num(1 - p) + ')'
                    : 'Intervalo de confianza al ' + pct(conf) + ' para la varianza con n = ' + n + ' (usa este valor y el de p = ' + num(1 - p) + ')'
            });
        }
        return {
            value: 'ν = ' + df + ', P(X ≤ χ²) = ' + num(p) + ': <strong>χ² = ' + fixed(x, 4) + '</strong> · ' +
                (EN ? 'right tail' : 'cola derecha') + ' P(X &gt; χ²) = ' + num(1 - p),
            links: links,
            note: CHI_NOTE
        };
    }

    // Celda de la distribución acumulada P(X ≤ x).
    function chiCdf(x, df) {
        const cdf = jStat.chisquare.cdf(x, df);
        const xs = fixed(x, 2);
        return {
            value: 'ν = ' + df + ', x = ' + xs + ': <strong>P(X ≤ ' + xs + ') = ' + prob(cdf) + '</strong> · P(X &gt; ' + xs + ') = ' + prob(1 - cdf),
            pvalue: EN ? 'If χ² = ' + xs + ' is the statistic of a goodness-of-fit or independence test, its p-value is the right tail: <strong>' + prob(1 - cdf) + '</strong>.'
                : 'Si χ² = ' + xs + ' es el estadístico de un contraste de bondad de ajuste o de independencia, su p-valor es la cola derecha: <strong>' + prob(1 - cdf) + '</strong>.',
            links: [gofLink(df, null), independenceLink(df, null)],
            note: CHI_NOTE
        };
    }

    global.TableLinks = { show, hide, normalCdf, tCrit, tCdf, chiCrit, chiCdf };
}(window));
