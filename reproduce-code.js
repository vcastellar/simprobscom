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
    let root, code, notice, status, copyButton, snippets, language = 'r', fingerprint, resultObserver;
    function fields() {
        return JSON.stringify(Array.from(document.querySelectorAll('main input, main select, main textarea')).map(e => [e.id, e.value, e.type === 'checkbox' || e.type === 'radio' ? e.checked : null]));
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
        if (resultObserver) resultObserver.disconnect();
        resultObserver = new MutationObserver(() => {
            if (/^Error:/.test(result.textContent.trim())) clear();
        });
        resultObserver.observe(result, {childList:true, subtree:true, characterData:true});
        root.querySelector('.reproduce-note').textContent = value.note || T.note;
        root.querySelector('.reproduce-dependencies').textContent = value.dependencies || T.dependencies;
        if (root.previousElementSibling !== result) result.after(root);
        snippets = value; fingerprint = fields(); root.hidden = false; notice.hidden = true;
        select(language);
    }
    document.addEventListener('click', e => {
        if (e.target.closest('main .calculate-btn, main .mode-tab')) clear();
    }, true);
    function clear() { if (root) root.hidden = true; snippets = null; }
    for (const event of ['input', 'change']) document.addEventListener(event, e => {
        if (snippets && e.target.closest('main')) notice.hidden = fields() === fingerprint;
    });
    function distribution(o) {
        const configs = {
            normal: ['norm', 'norm', {mu:o.p1, sigma:o.p2}, 'mean = mu, sd = sigma', 'loc=mu, scale=sigma'],
            binomial: ['binom', 'binom', {n:o.p1, p:o.p2}, 'size = n, prob = p', 'n=n, p=p', 0, 'n'],
            poisson: ['pois', 'poisson', {rate:o.p1}, 'lambda = rate', 'mu=rate', 0],
            studentt: ['t', 't', {df:o.p1}, 'df = df', 'df=df'],
            chisquare: ['chisq', 'chi2', {df:o.p1}, 'df = df', 'df=df'],
            centralf: ['f', 'f', {df1:o.p1, df2:o.p2}, 'df1 = df1, df2 = df2', 'dfn=df1, dfd=df2'],
            exponential: ['exp', 'expon', {rate:o.p1}, 'rate = rate', 'scale=1 / rate'],
            negbin: ['nbinom', 'nbinom', {size:o.p1, p:o.p2}, 'size = size, prob = p', 'n=size, p=p', 0],
            geometric: ['geom', 'geom', {p:o.p1}, 'prob = p', 'p=p', 1],
            uniform: ['unif', 'uniform', {a:o.p1, b_max:o.p2}, 'min = a, max = b_max', 'loc=a, scale=b_max - a'],
            gamma: ['gamma', 'gamma', {shape:o.p1, scale:o.p2}, 'shape = shape, scale = scale', 'a=shape, scale=scale'],
            beta: ['beta', 'beta', {shape1:o.p1, shape2:o.p2}, 'shape1 = shape1, shape2 = shape2', 'a=shape1, b=shape2'],
            lognormal: ['lnorm', 'lognorm', {mu:o.p1, sigma:o.p2}, 'meanlog = mu, sdlog = sigma', 's=sigma, scale=exp(mu)'],
            weibull: ['weibull', 'weibull_min', {shape:o.p1, scale:o.p2}, 'shape = shape, scale = scale', 'c=shape, scale=scale'],
            hypergeometric: ['hyper', 'hypergeom', {population:o.p1, successes:o.p2, draws:o.p3}, 'm = successes, n = population - successes, k = draws', 'M=population, n=successes, N=draws', 'max(0, draws - (population - successes))', 'min(draws, successes)'],
            bernoulli: ['binom', 'bernoulli', {p:o.p1}, 'size = 1, prob = p', 'p=p', 0, '1']
        };
        const c = configs[o.dist];
        if (!c) return null;
        const [rname, name, parameters, rparams, params, lower, upper] = c;
        const discrete = lower !== undefined;
        const geometric = o.dist === 'geometric';
        const rArg = arg => geometric ? `(${arg}) - 1` : arg;
        const rCDF = (arg, right=false) => `p${rname}(${rArg(arg)}, ${rparams}${right ? ', lower.tail = FALSE' : ''})`;
        const pyCDF = (arg, right=false) => `${name}.${right ? 'sf' : 'cdf'}(${discrete && (arg === 'x' || arg === 'b') ? 'floor(' + arg + ')' : arg}, ${params})`;
        let r, python;
        if (o.calc === 'pdf') {
            r = `d${rname}(${rArg('x')}, ${rparams})`;
            python = `${name}.${discrete ? 'pmf' : 'pdf'}(x, ${params})`;
        } else if (o.calc === 'quantile') {
            r = `q${rname}(x, ${rparams})${geometric ? ' + 1' : ''}`;
            python = `${name}.ppf(x, ${params})`;
            if (discrete) {
                // Explicit endpoint conventions shared with the calculator.
                r = `if (x == 0) ${lower} else ${r}`;
                python = `${lower} if x == 0 else ${python}`;
                if (o.dist === 'binomial' || o.dist === 'bernoulli') {
                    r = `if (p == 0) 0 else if (x == 1) ${upper} else ${r}`;
                    python = `0 if p == 0 else ${upper} if x == 1 else ${python}`;
                } else if (upper !== undefined) {
                    r = `if (x == 1) ${upper} else ${r}`;
                    python = `${upper} if x == 1 else ${python}`;
                }
            }
        } else if (o.cdfMode === 'right') {
            r = rCDF(discrete ? 'ceiling(x) - 1' : 'x', true);
            python = pyCDF(discrete ? 'ceil(x) - 1' : 'x', true);
        } else if (o.cdfMode === 'interval') {
            r = `${rCDF('b')} - ${rCDF(discrete ? 'ceiling(x) - 1' : 'x')}`;
            python = `${pyCDF('b')} - ${pyCDF(discrete ? 'ceil(x) - 1' : 'x')}`;
        } else {
            r = rCDF('x'); python = pyCDF('x');
        }
        const interval = o.calc === 'cdf' && o.cdfMode === 'interval';
        const rheader = Object.entries(parameters).map(([k,v]) => `${k} <- ${v}`).join('\n');
        const pyheader = Object.entries(parameters).map(([k,v]) => `${k} = ${v}`).join('\n');
        let note = T.note;
        if (geometric) note += en ? ' R counts failures before the first success; the shift by 1 matches the support 1, 2, … used here.' : ' R cuenta fallos antes del primer éxito; el desplazamiento de 1 reproduce el soporte 1, 2, … de esta calculadora.';
        if (discrete && o.calc === 'quantile') note += en ? ' Probability-zero quantiles use the lower endpoint of the calculator support.' : ' Para probabilidad cero se usa el extremo inferior del soporte de la calculadora.';
        return {
            note,
            r: `${rheader}\nx <- ${o.x}${interval ? '\nb <- ' + o.b : ''}\n\nresult <- ${r}\nprint(result)`,
            python: `from scipy.stats import ${name}\nfrom math import ceil, floor, exp\n\n${pyheader}\nx = ${o.x}${interval ? '\nb = ' + o.b : ''}\n\nresult = ${python}\nprint(result)`
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
        show(result, value) { render(result, value); },
        mean(o) { render(document.getElementById('meanResult'), mean(o)); }, clear
    };
}());
