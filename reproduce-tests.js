(function () {
    'use strict';
    const en = document.documentElement.lang === 'en';
    const get = id => document.getElementById(id)?.value;
    const num = (...ids) => { const id = ids.find(id => document.getElementById(id)); return Number(get(id)); };
    const rv = value => Array.isArray(value) ? (value.some(Array.isArray) ? `list(${value.map(rv).join(', ')})` : `c(${value.map(rv).join(', ')})`) : typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : typeof value === 'string' ? JSON.stringify(value) : Number.isFinite(value) ? String(value) : value === Infinity ? 'Inf' : value === -Infinity ? '-Inf' : 'NaN';
    const pv = value => Array.isArray(value) ? `[${value.map(pv).join(', ')}]` : typeof value === 'boolean' ? (value ? 'True' : 'False') : typeof value === 'string' ? JSON.stringify(value) : Number.isFinite(value) ? String(value) : `float("${value === Infinity ? 'inf' : value === -Infinity ? '-inf' : 'nan'}")`;
    const coreNote = en ? 'Reproduces the main statistic, p-value and decision using the method selected in the calculator.' : 'Reproduce el estadístico principal, el valor p y la decisión con el método seleccionado en la calculadora.';
    function pair(parameters, r, python, note=coreNote, custom=false) {
        const rhead = Object.entries(parameters).map(([k,v]) => `${k} <- ${rv(v)}`).join('\n');
        const pyhead = Object.entries(parameters).map(([k,v]) => `${k} = ${pv(v)}`).join('\n');
        const rend = custom ? '\nprint(result)' : '\nresult <- list(statistic = statistic, p_value = p_value, reject = p_value < alpha)\nprint(result)';
        const pyend = custom ? '\nprint(result)' : '\nresult = {"statistic": statistic, "p_value": p_value, "reject": bool(p_value < alpha)}\nprint(result)';
        return {note, r: `${rhead}\n\n${r}${rend}`, python: `from math import sqrt, log, exp, ceil, floor, atanh, cos, pi\nimport numpy as np\nfrom scipy import stats\n\n${pyhead}\n\n${python}${pyend}`};
    }
    function tails(rdist='pnorm', rargs='', pydist='stats.norm()') {
        const rcall = x => `${rdist}(${x}${rargs ? ', ' + rargs : ''})`;
        return [
            `p_value <- if (tail == "two") 2 * ${rcall('-abs(statistic)')} else if (tail == "right") ${rcall('-statistic')} else ${rcall('statistic')}`,
            `distribution = ${pydist}\np_value = 2 * distribution.sf(abs(statistic)) if tail == "two" else distribution.sf(statistic) if tail == "right" else distribution.cdf(statistic)`
        ];
    }
    function generate(kind, o) {
        const alpha = o.alpha ?? num('alpha');
        const tail = o.tail ?? get('tail');
        const nt = tails();
        const tt = tails('pt','df = df','stats.t(df=df)');
        if (kind === 'paired') return pair({dbar:o.dbar, sd:o.sd, n:num('n'), mu0:o.mud0, alpha, tail},
            `df <- floor(n + 0.5) - 1\nstatistic <- (dbar - mu0) / (sd / sqrt(n))\n${tt[0]}`,
            `df = floor(n + 0.5) - 1\nstatistic = (dbar - mu0) / (sd / sqrt(n))\n${tt[1]}`);
        if (kind === 'twoMeans') return pair({mean1:o.mean1,mean2:o.mean2,s1:o.sd1,s2:o.sd2,n1:o.n1,n2:o.n2,alpha,tail},
            `v1 <- s1^2 / n1\nv2 <- s2^2 / n2\ndf <- (v1 + v2)^2 / (v1^2 / (n1 - 1) + v2^2 / (n2 - 1))\nstatistic <- (mean1 - mean2) / sqrt(v1 + v2)\n${tt[0]}`,
            `v1 = s1**2 / n1\nv2 = s2**2 / n2\ndf = (v1 + v2)**2 / (v1**2 / (n1 - 1) + v2**2 / (n2 - 1))\nstatistic = (mean1 - mean2) / sqrt(v1 + v2)\n${tt[1]}`,
            coreNote + (en ? ' Welch t test, without assuming equal variances.' : ' Contraste t de Welch, sin suponer varianzas iguales.'));
        if (kind === 'oneProp') return pair({p0:o.p0, phat:o.phat,n:o.n,alpha,tail},
            `statistic <- (phat - p0) / sqrt(p0 * (1 - p0) / n)\n${nt[0]}`,
            `statistic = (phat - p0) / sqrt(p0 * (1 - p0) / n)\n${nt[1]}`,
            coreNote + (en ? ' Normal approximation with standard error under H₀, without continuity correction.' : ' Aproximación normal con error estándar bajo H₀, sin corrección de continuidad.'));
        if (kind === 'twoProp') return pair({x1:o.x1,n1:o.n1,x2:o.x2,n2:o.n2,alpha,tail},
            `pooled <- (x1 + x2) / (n1 + n2)\nstatistic <- (x1/n1 - x2/n2) / sqrt(pooled * (1-pooled) * (1/n1 + 1/n2))\n${nt[0]}`,
            `pooled = (x1 + x2) / (n1 + n2)\nstatistic = (x1/n1 - x2/n2) / sqrt(pooled * (1-pooled) * (1/n1 + 1/n2))\n${nt[1]}`);
        if (kind === 'oneVariance' || kind === 'twoVariances') {
            const one = kind === 'oneVariance';
            const params = one ? {n:o.df+1,s2:o.s2,sigma0_squared:o.sigma0sq,alpha,tail} : {n1:o.df1+1,n2:o.df2+1,s1_squared:num('sampleVariance1','s1sq'),s2_squared:num('sampleVariance2','s2sq'),alpha,tail};
            const rbody = one ? 'df <- n - 1\nstatistic <- df * s2 / sigma0_squared\nlo <- pchisq(statistic, df)\nhi <- pchisq(statistic, df, lower.tail = FALSE)' : 'df1 <- n1 - 1\ndf2 <- n2 - 1\nstatistic <- s1_squared / s2_squared\nlo <- pf(statistic, df1, df2)\nhi <- pf(statistic, df1, df2, lower.tail = FALSE)';
            const pybody = one ? 'df = n - 1\nstatistic = df * s2 / sigma0_squared\ndistribution = stats.chi2(df=df)' : 'df1 = n1 - 1\ndf2 = n2 - 1\nstatistic = s1_squared / s2_squared\ndistribution = stats.f(dfn=df1, dfd=df2)';
            return pair(params, rbody+'\np_value <- if (tail == "two") min(1, 2 * min(lo, hi)) else if (tail == "right") hi else lo', pybody+'\nlo, hi = distribution.cdf(statistic), distribution.sf(statistic)\np_value = min(1, 2 * min(lo, hi)) if tail == "two" else hi if tail == "right" else lo');
        }
        if (kind === 'correlation') {
            const zero = o.useT;
            return pair({r:o.r,n:num('n'),rho0:o.rho0,alpha,tail},
                zero ? `df <- floor(n + 0.5) - 2\nstatistic <- r * sqrt(df / (1-r^2))\n${tt[0]}` : `statistic <- (atanh(r) - atanh(rho0)) * sqrt(n - 3)\n${nt[0]}`,
                zero ? `df = floor(n + 0.5) - 2\nstatistic = r * sqrt(df / (1-r*r))\n${tt[1]}` : `statistic = (atanh(r) - atanh(rho0)) * sqrt(n - 3)\n${nt[1]}`,
                coreNote + (zero ? (en ? ' Pearson t test for ρ₀ = 0.' : ' Contraste t de Pearson para ρ₀ = 0.') : (en ? ' Fisher z approximation for nonzero ρ₀.' : ' Aproximación z de Fisher para ρ₀ distinto de cero.')));
        }
        if (kind === 'odds') return pair({a:o.a,b:o.b,c:o.c,d:o.d,alpha,tail},
            `odds_ratio <- (a*d)/(b*c)\nstatistic <- log(odds_ratio) / sqrt(1/a + 1/b + 1/c + 1/d)\n${nt[0]}`,
            `odds_ratio = (a*d)/(b*c)\nstatistic = log(odds_ratio) / sqrt(1/a + 1/b + 1/c + 1/d)\n${nt[1]}`,
            coreNote + (en ? ' Wald test on log(OR); no added-cell correction.' : ' Contraste de Wald sobre log(OR), sin añadir correcciones a las celdas.'));
        if (kind === 'fisher') return pair({a:o.a,b:o.b,c:o.c,d:o.d,alpha,alternative:({two:'two.sided',right:'greater',left:'less'})[tail]},
            'table <- matrix(c(a,b,c,d), nrow=2, byrow=TRUE)\nfit <- fisher.test(table, alternative=alternative)\nstatistic <- (a*d)/(b*c)\np_value <- fit$p.value',
            'table = [[a,b],[c,d]]\nfit = stats.fisher_exact(table, alternative="two-sided" if alternative == "two.sided" else alternative)\nstatistic = (a*d)/(b*c) if b*c != 0 else (float("inf") if a*d > 0 else float("nan"))\np_value = fit.pvalue',
            coreNote + (en ? ' Exact Fisher p-value; the reported OR is the sample ratio ad/bc, rather than R’s conditional estimate.' : ' Valor p exacto de Fisher; el OR mostrado es ad/bc muestral, no la estimación condicional de R.'));
        if (kind === 'mcnemar') return pair({b:o.b,c:o.c,correction:o.cc,alpha},
            'statistic <- (abs(b-c) - as.integer(correction))^2 / (b+c)\np_value <- pchisq(statistic, df=1, lower.tail=FALSE)\np_exact <- min(1, 2*pbinom(min(b,c), size=b+c, prob=0.5))',
            'statistic = (abs(b-c) - int(correction))**2 / (b+c)\np_value = stats.chi2.sf(statistic, df=1)\np_exact = min(1, 2*stats.binom.cdf(min(b,c), n=b+c, p=.5))',
            coreNote + (en ? ' Uses the calculator’s continuity-correction formula; p_exact also gives the two-tailed binomial comparison.' : ' Usa la fórmula de corrección de continuidad de la calculadora; p_exact ofrece además la comparación binomial bilateral.'));
        if (kind === 'ni') {
            const prop=o.varType==='prop';
            const params=prop ? {p1:o.p1,p2:o.p2,n1:o.n1,n2:o.n2,margin:o.delta,method:o.testType,direction:o.direction,alpha} : {mean1:o.xbar1,mean2:o.xbar2,s1:o.s1,s2:o.s2,n1:o.n1,n2:o.n2,margin:o.delta,method:o.testType,direction:o.direction,alpha};
            const rstart=prop ? 'difference <- p1 - p2\nse <- sqrt(p1*(1-p1)/n1 + p2*(1-p2)/n2)' : 'difference <- mean1 - mean2\nse <- sqrt(s1^2/n1 + s2^2/n2)';
            const pystart=prop ? 'difference = p1 - p2\nse = sqrt(p1*(1-p1)/n1 + p2*(1-p2)/n2)' : 'difference = mean1 - mean2\nse = sqrt(s1**2/n1 + s2**2/n2)';
            return pair(params,rstart+'\nz1 <- (difference + margin)/se\nz2 <- (margin - difference)/se\np1_value <- pnorm(z1, lower.tail=FALSE)\np2_value <- pnorm(z2, lower.tail=FALSE)\nstatistic <- if (method == "tost") c(z1,z2) else if (direction == "ni") z1 else z2\np_value <- if (method == "tost") max(p1_value,p2_value) else if (direction == "ni") p1_value else p2_value',
                pystart+'\nz1 = (difference + margin)/se\nz2 = (margin - difference)/se\np1_value, p2_value = stats.norm.sf(z1), stats.norm.sf(z2)\nstatistic = [z1,z2] if method == "tost" else z1 if direction == "ni" else z2\np_value = max(p1_value,p2_value) if method == "tost" else p1_value if direction == "ni" else p2_value',
                coreNote + (en ? ' Normal approximation for non-inferiority, non-superiority or equivalence (TOST), using the selected margin.' : ' Aproximación normal para no inferioridad, no superioridad o equivalencia (TOST), con el margen elegido.'));
        }
        if (kind === 'anova') return pair({groups:o.samples,alpha},
            'values <- unlist(groups)\ngroup <- factor(rep(seq_along(groups), lengths(groups)))\nfit <- summary(aov(values ~ group))[[1]]\nstatistic <- fit[1, "F value"]\np_value <- fit[1, "Pr(>F)"]',
            'fit = stats.f_oneway(*groups)\nstatistic, p_value = fit.statistic, fit.pvalue',coreNote+(en ? ' Classical one-way ANOVA with equal variances.' : ' ANOVA clásico de un factor con igualdad de varianzas.'));
        if (kind === 'gof') return pair({observed:o.observed, probabilities:o.probs,alpha},
            'fit <- chisq.test(observed, p=probabilities, rescale.p=TRUE)\nstatistic <- unname(fit$statistic)\np_value <- fit$p.value',
            'expected = np.asarray(probabilities) / sum(probabilities) * sum(observed)\nfit = stats.chisquare(observed, f_exp=expected)\nstatistic, p_value = fit.statistic, fit.pvalue');
        if (kind === 'independence') return pair({observed:o.O,correction:o.yates,alpha},
            'table <- do.call(rbind, observed)\nfit <- chisq.test(table, correct=correction)\nstatistic <- unname(fit$statistic)\np_value <- fit$p.value',
            'fit = stats.chi2_contingency(observed, correction=correction)\nstatistic, p_value = fit.statistic, fit.pvalue',coreNote+(en ? ' Yates correction only when selected for a 2×2 table.' : ' Corrección de Yates solo si está seleccionada en una tabla 2×2.'));
        return special(kind,o,{get,num,alpha});
    }
    // Further generators are kept below to share the same snapshot and UI contract.
    function special(kind,o,{get,num,alpha}) {
        if (kind === 'ks') {
            const type=get('distType');
            const parameters={data:o.data,alpha};
            let rcdf,pycdf;
            if(type==='normal') {Object.assign(parameters,{mu:num('paramMu'),sigma:num('paramSigma')});rcdf='pnorm(x, mean=mu, sd=sigma)';pycdf='stats.norm.cdf(x, loc=mu, scale=sigma)';}
            else if(type==='uniform') {Object.assign(parameters,{a:num('paramA'),b:num('paramB')});rcdf='punif(x, min=a, max=b)';pycdf='stats.uniform.cdf(x, loc=a, scale=b-a)';}
            else {Object.assign(parameters,{rate:num('paramLambda')});rcdf='pexp(x, rate=rate)';pycdf='stats.expon.cdf(x, scale=1/rate)';}
            return pair(parameters,`cdf <- function(x) ${rcdf}\nfit <- ks.test(data, cdf, exact=FALSE)\nstatistic <- unname(fit$statistic)\np_value <- fit$p.value`,
                `cdf = lambda x: ${pycdf}\nfit = stats.kstest(data, cdf, method="asymp")\nstatistic, p_value = fit.statistic, fit.pvalue`,
                coreNote+(en ? ' One-sample KS with fully specified parameters and an asymptotic p-value, as in the calculator.' : ' KS de una muestra con parámetros completamente especificados y valor p asintótico, como en la calculadora.'));
        }
        if (kind === 'powerAB' || kind === 'powerProp') {
            const ab=kind==='powerAB', design=o.mode==='n';
            const params={p0:o.p0,p1:o.p1,alpha:o.alpha,alternative:o.alternative,...(design?{target_power:o.targetPower}:{n:o.n})};
            const rscale=ab ? 'pooled <- (p0+p1)/2\nnull_scale <- sqrt(2*pooled*(1-pooled))\nalt_scale <- sqrt(p0*(1-p0)+p1*(1-p1))' : 'null_scale <- sqrt(p0*(1-p0))\nalt_scale <- sqrt(p1*(1-p1))';
            const pyscale=ab ? 'pooled = (p0+p1)/2\nnull_scale = sqrt(2*pooled*(1-pooled))\nalt_scale = sqrt(p0*(1-p0)+p1*(1-p1))' : 'null_scale = sqrt(p0*(1-p0))\nalt_scale = sqrt(p1*(1-p1))';
            const rfun=`${rscale}\ncritical <- qnorm(1-alpha/ifelse(alternative == "two-sided",2,1))\npower_at <- function(m) {\n    upper <- pnorm(((p1-p0)*sqrt(m)-critical*null_scale)/alt_scale)\n    lower <- pnorm((-(p1-p0)*sqrt(m)-critical*null_scale)/alt_scale)\n    if (alternative == "two-sided") upper+lower else if (alternative == "less") lower else upper\n}`;
            const pyfun=`${pyscale}\ncritical = stats.norm.ppf(1-alpha/(2 if alternative == "two-sided" else 1))\ndef power_at(m):\n    upper = stats.norm.cdf(((p1-p0)*sqrt(m)-critical*null_scale)/alt_scale)\n    lower = stats.norm.cdf((-(p1-p0)*sqrt(m)-critical*null_scale)/alt_scale)\n    return upper+lower if alternative == "two-sided" else lower if alternative == "less" else upper`;
            return pair(params,rfun+(design?'\nn <- ceiling(((critical*null_scale + qnorm(target_power)*alt_scale)/abs(p1-p0))^2)':'')+`\npower <- power_at(n)\nresult <- list(n=n, power=power)`,
                pyfun+(design?'\nn = ceil(((critical*null_scale + stats.norm.ppf(target_power)*alt_scale)/abs(p1-p0))**2)':'')+`\npower = power_at(n)\nresult = {"n": n, "power": power}`,
                en ? 'Reproduces the normal approximation used for power and sample size, including the chosen alternative. n is per group in A/B designs.' : 'Reproduce la aproximación normal de potencia y tamaño muestral, con la alternativa elegida. En A/B, n corresponde a cada grupo.',true);
        }
        if(kind==='shapiro') {
            const params={data:o.sample,B:o.B,seed:o.seed,alpha};
            const rbody=`# Royston coefficients; W depends on shape, not location or scale.
sw_statistic <- function(x) {
    x <- sort(x); n <- length(x); m <- floor(n/2)
    span <- max(x)-min(x)
    if (is.finite(span)) x <- (x-min(x))/span else { x <- x/2; x <- (x-min(x))/(max(x)-min(x)) }
    if (n == 3) a <- sqrt(0.5) else {
        scores <- qnorm((seq.int(m+1+n%%2,n)-0.375)/(n+0.25))
        total <- 2*sum(scores^2); u <- 1/sqrt(n)
        poly <- function(c,x) sum(c*x^(seq_along(c)-1))
        a <- numeric(m)
        a[1] <- scores[m]/sqrt(total) + poly(c(0,.221157,-.147981,-2.07119,4.434685,-2.706056),u)
        first <- 2
        if (n > 5) {
            a[2] <- scores[m-1]/sqrt(total) + poly(c(0,.042981,-.293762,-1.752461,5.682633,-3.582633),u)
            phi <- (total-2*scores[m]^2-2*scores[m-1]^2)/(1-2*a[1]^2-2*a[2]^2)
            first <- 3
        } else phi <- (total-2*scores[m]^2)/(1-2*a[1]^2)
        if (first <= m) for (i in seq.int(first,m)) a[i] <- scores[m+1-i]/sqrt(max(phi,1e-10))
    }
    min(1, sum(a*(rev(x)[seq_len(m)]-x[seq_len(m)]))^2/sum((x-mean(x))^2))
}
set.seed(seed %% .Machine$integer.max)
statistic <- sw_statistic(data)
simulated <- replicate(B, sw_statistic(rnorm(length(data))))
p_value <- (sum(simulated <= statistic)+1)/(B+1)`;
            const pybody=`# Royston coefficients for the Monte Carlo statistic.
def sw_statistic(x):
    x = np.sort(np.asarray(x, dtype=float)); n = len(x); m = n//2
    span = x[-1]-x[0]
    if np.isfinite(span):
        x = (x-x[0])/span
    else:
        x = x/2; x = (x-x[0])/(x[-1]-x[0])
    if n == 3:
        a = np.array([sqrt(.5)])
    else:
        scores = stats.norm.ppf((np.arange(m+1+n%2,n+1)-.375)/(n+.25))
        total = 2*np.sum(scores**2); u = 1/sqrt(n)
        poly = lambda c,x: sum(v*x**i for i,v in enumerate(c))
        a = np.zeros(m)
        a[0] = scores[-1]/sqrt(total)+poly([0,.221157,-.147981,-2.07119,4.434685,-2.706056],u)
        first = 1
        if n > 5:
            a[1] = scores[-2]/sqrt(total)+poly([0,.042981,-.293762,-1.752461,5.682633,-3.582633],u)
            phi = (total-2*scores[-1]**2-2*scores[-2]**2)/(1-2*a[0]**2-2*a[1]**2)
            first = 2
        else:
            phi = (total-2*scores[-1]**2)/(1-2*a[0]**2)
        for i in range(first,m):
            a[i] = scores[-1-i]/sqrt(max(phi,1e-10))
    return min(1, np.sum(a*(x[::-1][:m]-x[:m]))**2/np.sum((x-np.mean(x))**2))
rng = np.random.default_rng(seed)
statistic = sw_statistic(data)
simulated = [sw_statistic(rng.normal(size=len(data))) for _ in range(B)]
p_value = (sum(w <= statistic for w in simulated)+1)/(B+1)`;
            return pair(params,rbody,pybody,en ? 'Shapiro–Wilk with the same Monte Carlo procedure, B and sample. R and Python use native normal generators, so simulated p-values may differ from the web even with the same seed. R shapiro.test() alone uses an analytic p-value instead.' : 'Shapiro–Wilk con el mismo procedimiento Monte Carlo, B y muestra. R y Python usan sus generadores normales nativos: los valores p simulados pueden diferir de la web incluso con la misma semilla. shapiro.test() de R por sí solo utiliza un valor p analítico.');
        }
        return null;
    }

    window.ReproduceTests = {render(kind,id,o) {
        const value=generate(kind,o);
        if(value) window.ReproduceCode.show(document.getElementById(id),value);
    }};
}());
