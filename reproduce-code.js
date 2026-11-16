(function () {
    'use strict';
    const en = document.documentElement.lang === 'en';
    const T = en ? {
        title: 'Reproduce this calculation', note: 'Code uses the data and method of the displayed result.',
        stale: 'Inputs changed. Recalculate to update the result and code.', copy: 'Copy code', copied: 'Copied',
        failed: 'Could not copy. Select the code and copy it manually.', label: 'Programming language',
        dependencies: 'R: base R, no packages required. Python: install scipy (pip install scipy).',
        summary: 'Reproduces the statistic, p-value and decision from the mean, standard deviation and sample size.'
    } : {
        title: 'Reproducir el cálculo', note: 'El código usa los datos y el método del resultado mostrado.',
        stale: 'Has cambiado los datos. Vuelve a calcular para actualizar el resultado y el código.', copy: 'Copiar código', copied: 'Copiado',
        failed: 'No se pudo copiar. Selecciona el código y cópialo manualmente.', label: 'Lenguaje de programación',
        dependencies: 'R: base R, sin paquetes adicionales. Python: instala scipy (pip install scipy).',
        summary: 'Reproduce el estadístico, el valor p y la decisión a partir de la media, la desviación y el tamaño muestral.'
    };
    let root, code, notice, status, copyButton, snippets, language = 'r', fingerprint;
    function fields() {
        return JSON.stringify(Array.from(document.querySelectorAll('main input, main select, main textarea')).map(e => [e.id, e.value]));
    }
    function select(lang, focus) {
        language = lang;
        root.querySelectorAll('[role=tab]').forEach(button => {
            const active = button.dataset.language === lang;
            button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
            if (active && focus) button.focus();
        });
        root.querySelector('[role=tabpanel]').setAttribute('aria-labelledby', 'reproduce-tab-' + lang);
        code.textContent = snippets[lang]; status.textContent = '';
    }
    function render(result, value) {
        if (!root) {
            root = document.createElement('details'); root.className = 'reproduce-code'; root.id = 'reproduce-code';
            root.innerHTML = '<summary></summary><div class="reproduce-body"><p class="reproduce-note"></p><p class="reproduce-stale" hidden></p><div class="reproduce-toolbar"><div role="tablist"><button type="button" role="tab" id="reproduce-tab-r" aria-controls="reproduce-panel" data-language="r">R</button><button type="button" role="tab" id="reproduce-tab-python" aria-controls="reproduce-panel" data-language="python">Python</button></div><button type="button" class="reproduce-copy"></button></div><div role="tabpanel" id="reproduce-panel" tabindex="0"><pre><code></code></pre></div><p class="reproduce-dependencies"></p><p class="reproduce-status" role="status" aria-live="polite"></p></div>';
            result.after(root);
            root.querySelector('summary').textContent = T.title;
            root.querySelector('.reproduce-note').textContent = T.note;
            root.querySelector('[role=tablist]').setAttribute('aria-label', T.label);
            root.querySelector('.reproduce-dependencies').textContent = T.dependencies;
            code = root.querySelector('code'); notice = root.querySelector('.reproduce-stale'); notice.textContent = T.stale;
            status = root.querySelector('.reproduce-status'); copyButton = root.querySelector('.reproduce-copy'); copyButton.textContent = T.copy;
            root.querySelectorAll('[role=tab]').forEach(button => {
                button.addEventListener('click', () => select(button.dataset.language));
                button.addEventListener('keydown', event => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                    event.preventDefault(); select(event.key === 'Home' ? 'r' : event.key === 'End' ? 'python' : language === 'r' ? 'python' : 'r', true);
                });
            });
            copyButton.addEventListener('click', async () => {
                const text = code.textContent;
                try { await navigator.clipboard.writeText(text); status.textContent = T.copied; }
                catch (_) { status.textContent = T.failed; }
            });
        }
        root.querySelector('.reproduce-note').textContent = value.note || T.note;
        snippets = value; fingerprint = fields(); root.hidden = false; notice.hidden = true;
        select(language);
    }
    function clear() { if (root) root.hidden = true; snippets = null; }
    for (const event of ['input', 'change']) document.addEventListener(event, e => {
        if (snippets && e.target.closest('main')) notice.hidden = fields() === fingerprint;
    });
    function distribution(o) {
        if (!['normal', 'binomial'].includes(o.dist)) return null;
        const discrete = o.dist === 'binomial';
        const name = discrete ? 'binom' : 'norm';
        const rname = discrete ? 'binom' : 'norm';
        const rparams = discrete ? 'size = n, prob = p' : 'mean = mu, sd = sigma';
        const params = discrete ? 'n=n, p=p' : 'loc=mu, scale=sigma';
        const rheader = discrete ? `n <- ${o.p1}\np <- ${o.p2}` : `mu <- ${o.p1}\nsigma <- ${o.p2}`;
        const pyheader = discrete ? `n = ${o.p1}\np = ${o.p2}` : `mu = ${o.p1}\nsigma = ${o.p2}`;
        let r, python;
        if (o.calc === 'pdf') {
            r = `d${rname}(x, ${rparams})`; python = `${name}.${discrete ? 'pmf' : 'pdf'}(x, ${params})`;
        } else if (o.calc === 'quantile') {
            r = `q${rname}(x, ${rparams})`; python = `${name}.ppf(x, ${params})`;
            // Explicit endpoints: both engines then follow the calculator's bounded-support convention.
            if (discrete) {
                r = `if (p == 0) 0 else ${r}`;
                python = `0.0 if x == 0 or p == 0 else ${python}`;
            }
        } else if (o.cdfMode === 'right') {
            r = `p${rname}(${discrete ? 'ceiling(x) - 1' : 'x'}, ${rparams}, lower.tail = FALSE)`;
            python = `${name}.sf(${discrete ? 'ceil(x) - 1' : 'x'}, ${params})`;
        } else if (o.cdfMode === 'interval') {
            r = `p${rname}(b, ${rparams}) - p${rname}(${discrete ? 'ceiling(x) - 1' : 'x'}, ${rparams})`;
            python = `${name}.cdf(b, ${params}) - ${name}.cdf(${discrete ? 'ceil(x) - 1' : 'x'}, ${params})`;
        } else {
            r = `p${rname}(x, ${rparams})`; python = `${name}.cdf(x, ${params})`;
        }
        const interval = o.calc === 'cdf' && o.cdfMode === 'interval';
        return {
            note: discrete && o.calc === 'quantile' ? T.note + (en ? ' At probability zero, the quantile convention is 0; when p = 0, X is always 0.' : ' En probabilidad cero se usa el cuantil 0; cuando p = 0, X siempre es 0.') : T.note,
            r: `${rheader}\nx <- ${o.x}${interval ? '\nb <- ' + o.b : ''}\n\nresult <- ${r}\nprint(result)`,
            python: `from scipy.stats import ${name}${discrete ? '\nfrom math import ceil' : ''}\n\n${pyheader}\nx = ${o.x}${interval ? '\nb = ' + o.b : ''}\n\nresult = ${python}\nprint(result)`
        };
    }
    function mean(o) {
        const comment = en ? '# Summary statistics' : '# Estadísticos resumen';
        const deviation = o.isT ? (en ? 'Sample standard deviation (t test)' : 'Desviación muestral (contraste t)') : (en ? 'Known population standard deviation (z test)' : 'Desviación poblacional conocida (contraste z)');
        const rdist = o.isT ? `pt(VALUE, df = n - 1)` : 'pnorm(VALUE)';
        const rp = o.tail === 'two' ? '2 * ' + rdist.replace('VALUE', '-abs(statistic)') : rdist.replace('VALUE', o.tail === 'right' ? '-statistic' : 'statistic');
        const pyp = o.tail === 'two' ? '2 * distribution.sf(abs(statistic))' : o.tail === 'right' ? 'distribution.sf(statistic)' : 'distribution.cdf(statistic)';
        return {
            note: T.note + " " + T.summary,
            r: `${comment}\nmu0 <- ${o.mu0}\nxbar <- ${o.xbar}\ns <- ${o.s}  # ${deviation}\nn <- ${o.n}\nalpha <- ${o.alpha}\n\nse <- s / sqrt(n)\nstatistic <- (xbar - mu0) / se\np_value <- ${rp}\nresult <- list(\n    statistic = statistic,\n    p_value = p_value,\n    reject = p_value < alpha${o.isT ? ',\n    df = n - 1' : ''}\n)\nprint(result)`,
            python: `from math import sqrt\nfrom scipy.stats import ${o.isT ? 't' : 'norm'}\n\n${comment}\nmu0 = ${o.mu0}\nxbar = ${o.xbar}\ns = ${o.s}  # ${deviation}\nn = ${o.n}\nalpha = ${o.alpha}\n\nse = s / sqrt(n)\nstatistic = (xbar - mu0) / se\ndistribution = ${o.isT ? 't(df=n - 1)' : 'norm()'}\np_value = ${pyp}\nresult = {\n    "statistic": statistic,\n    "p_value": p_value,\n    "reject": bool(p_value < alpha)${o.isT ? ',\n    "df": n - 1' : ''}\n}\nprint(result)`
        };
    }
    window.ReproduceCode = {
        distribution(o) { const value = distribution(o); if (value) render(document.getElementById('result'), value); else clear(); },
        mean(o) { render(document.getElementById('meanResult'), mean(o)); }, clear
    };
}());
