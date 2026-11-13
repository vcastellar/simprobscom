/* Valores recibidos por la URL desde otra página (por ejemplo, desde una tabla
 * estadística). UrlPrefill.apply rellena los campos indicados; UrlPrefill.note
 * muestra encima del formulario qué valores se han traído y de dónde.
 * Expone window.UrlPrefill.
 */
(function (global) {
    'use strict';

    const EN = document.documentElement.lang === 'en';
    const LOCALE = EN ? 'en-US' : 'es-ES';

    function params() {
        try { return new URLSearchParams(location.search); } catch (e) { return null; }
    }

    // fields: { parámetro: id del campo }. Los valores de un <select> solo se
    // aceptan si coinciden con una de sus opciones.
    function apply(fields) {
        const q = params();
        const done = {};
        if (!q) return done;
        Object.keys(fields).forEach((key) => {
            const el = document.getElementById(fields[key]);
            if (!el || !q.has(key)) return;
            const raw = q.get(key);
            if (el.tagName === 'SELECT') {
                if ([].some.call(el.options, (o) => o.value === raw)) { el.value = raw; done[key] = raw; }
                return;
            }
            const v = parseFloat(raw);
            if (Number.isFinite(v)) { el.value = v; done[key] = v; }
        });
        return done;
    }

    const SOURCES = EN
        ? { 'tabla-t': 'the Student\'s t table', 'tabla-normal': 'the standard normal table', 'tabla-chi': 'the chi-square table' }
        : { 'tabla-t': 'la tabla t de Student', 'tabla-normal': 'la tabla normal', 'tabla-chi': 'la tabla chi-cuadrado' };
    const TAILS = EN
        ? { two: 'two-tailed', right: 'right-tailed', left: 'left-tailed' }
        : { two: 'bilateral', right: 'cola derecha', left: 'cola izquierda' };
    const DISP = EN
        ? { sample: 't-test (σ unknown)', population: 'z-test (σ known)' }
        : { sample: 'test t (σ desconocida)', population: 'test z (σ conocida)' };

    function num(v) {
        return Number(v).toLocaleString(LOCALE, { maximumFractionDigits: 4 });
    }

    // Resumen legible de los valores traídos, en el orden en que suelen leerse.
    function summary(q) {
        const out = [];
        const n = parseFloat(q.get('n'));
        if (n > 0) out.push('n = ' + num(n));
        const conf = parseFloat(q.get('conf'));
        if (conf > 0 && conf < 1) out.push((EN ? 'confidence level ' : 'nivel de confianza ') + num(conf * 100) + (EN ? '%' : ' %'));
        const alpha = parseFloat(q.get('alpha'));
        if (alpha > 0 && alpha < 1) out.push('α = ' + num(alpha));
        if (TAILS[q.get('tail')]) out.push(TAILS[q.get('tail')]);
        if (DISP[q.get('disp')]) out.push(DISP[q.get('disp')]);
        const k = parseInt(q.get('k'), 10);
        if (k > 1) out.push(k + (EN ? ' categories' : ' categorías'));
        const r = parseInt(q.get('rows'), 10), c = parseInt(q.get('cols'), 10);
        if (r > 1 && c > 1) out.push((EN ? 'a ' : 'tabla ') + r + ' × ' + c + (EN ? ' table' : ''));
        return out;
    }

    // Aviso sobre el formulario que contiene el campo anchorId. Solo aparece si la
    // URL dice de dónde vienen los valores (parámetro from).
    function note(anchorId) {
        const q = params();
        if (!q || !SOURCES[q.get('from')]) return;
        const items = summary(q);
        if (!items.length) return;
        const anchor = document.getElementById(anchorId);
        const card = anchor && anchor.closest('.card');
        if (!card) return;
        const p = document.createElement('p');
        p.className = 'example-hint url-prefill-note';
        p.textContent = (EN ? 'Values brought from ' : 'Valores traídos de ') + SOURCES[q.get('from')] + ': ' + items.join(', ') + '. ' +
            (EN ? 'The other fields hold example data: replace them with yours.' : 'Los demás campos tienen datos de ejemplo: sustitúyelos por los tuyos.');
        const heading = card.querySelector('.panel-heading');
        if (heading) heading.insertAdjacentElement('afterend', p);
        else card.insertBefore(p, card.firstChild);
    }

    global.UrlPrefill = { apply, note, params };
}(window));
