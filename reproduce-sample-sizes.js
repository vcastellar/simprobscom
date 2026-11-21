(function () {
    'use strict';
    const en = document.documentElement.lang === 'en';
    const literal = (v, r) => typeof v === 'boolean' ? (r ? (v ? 'TRUE' : 'FALSE') : (v ? 'True' : 'False')) : JSON.stringify(v);
    // Expressions below deliberately follow the calculators' planning formulas,
    // including their approximations, allocation ratios and integer rounding.
    function generate(kind, o) {
        let r = '', py = '', note = en ? 'Uses the same planning formula and rounding as the calculator. ' : 'Usa la misma fórmula de planificación y redondeo que la calculadora. ';
        const line = (name, expr) => {
            r += `${name} <- ${expr}\n`;
            py += `${name} = ${expr.replace(/\^/g, '**').replace(/\bTRUE\b/g, 'True').replace(/\bFALSE\b/g, 'False')}\n`;
        };
        const custom = (a, b) => { r += a + '\n'; py += b + '\n'; };
        const search = (rPower, pyPower, start = 2, limit = 100000) => {
            custom(`power_at <- function(n) { ${rPower} }\nn <- ${start}\nwhile (n <= ${limit} && power_at(n) < power) n <- n+1\nif (n > ${limit}) stop("No solution within search limit")\nachieved_power <- power_at(n)`,
                `def power_at(n):\n${pyPower.split('\n').map(s => '    ' + s).join('\n')}\nn = ${start}\nwhile n <= ${limit} and power_at(n) < power:\n    n += 1\nif n > ${limit}:\n    raise ValueError("No solution within search limit")\nachieved_power = power_at(n)`);
        };
        if ('confidence' in o) line('alpha', '1-confidence');
        if ('alpha' in o || 'confidence' in o) line('z', 'qnorm(1-alpha/2)');
        if ('power' in o) {
            line('za', `qnorm(1-alpha/${o.twoSided === false ? 1 : 2})`);
            line('zb', 'qnorm(power)');
        }
        if (['meanIC','pairedIC','propIC','finiteMean','finiteProp','diffPropIC','orIC'].includes(kind)) {
            if (kind === 'orIC') {
                line('p1', 'OR*p2/(1+(OR-1)*p2)');
                line('n0', 'z^2*(1/(p1*(1-p1))+1/(p2*(1-p2)))/e^2');
            } else {
                const variance = kind === 'propIC' || kind === 'finiteProp' ? 'p*(1-p)' : kind === 'diffPropIC' ? 'p1*(1-p1)+p2*(1-p2)' : 'sigma^2';
                line('n0', `z^2*(${variance})/e^2`);
            }
            line('n', (kind === 'finiteProp' || kind === 'finiteMean' && o.applyFPC) ? 'ceiling(n0/(1+(n0-1)/population))' : 'ceiling(n0)');
            if (['diffPropIC','orIC'].includes(kind)) line('total', '2*n');
            if (kind === 'pairedIC') note += en ? 'n counts pairs; sigma is the SD of differences.' : 'n cuenta pares; sigma es la desviación de las diferencias.';
            if (kind === 'orIC') note += en ? 'Error margin is on the log OR scale.' : 'El margen de error está en escala log OR.';
        } else if (['meanTest','pairedTest','twoMeans','correlation'].includes(kind)) {
            if (kind === 'correlation') line('n', 'ceiling(((za+zb)/atanh(abs(rho)))^2)+3');
            else if (kind === 'twoMeans') {
                line('n', 'ceiling((za+zb)^2*(sigma1^2+sigma2^2/k)/delta^2)');
                line('n2', 'ceiling(k*n)'); line('total', 'n+n2');
            } else line('n', 'ceiling(((za+zb)*sigma/delta)^2)');
            note += en ? 'Normal approximation (Fisher z for correlation), not an exact noncentral t calculation.' : 'Aproximación normal (z de Fisher para correlación), sin cálculo t no central exacto.';
        } else if (kind === 'propTest') {
            const formula = 'ceiling(((za*sqrt(p0*(1-p0))+zb*sqrt(p1*(1-p1)))/delta)^2)';
            custom(`size_at <- function(p1) { p1 <- min(0.9999,max(0.0001,p1)); ${formula} }`,
                `def size_at(p1):\n    p1 = min(0.9999,max(0.0001,p1))\n    return ${formula.replace(/\^/g, '**')}`);
            line('n', o.twoSided ? 'max(size_at(p0+delta),size_at(p0-delta))' : `size_at(p0${o.alternative === 'less' ? '-' : '+'}delta)`);
            note += en ? 'Alternative probabilities are clipped to [0.0001, 0.9999], as in the calculator.' : 'Las probabilidades alternativas se limitan a [0.0001, 0.9999], igual que en la calculadora.';
        } else if (['twoProps','fisher','orTest'].includes(kind)) {
            if (kind === 'orTest') line('p1', 'OR*p2/(1+p2*(OR-1))');
            line('pbar', '(p1+k*p2)/(1+k)');
            line('n0', '(za*sqrt((1+1/k)*pbar*(1-pbar))+zb*sqrt(p1*(1-p1)+p2*(1-p2)/k))^2/(p1-p2)^2');
            line('n', kind === 'fisher' ? 'ceiling(n0/4*(1+sqrt(1+2*(1+1/k)/(n0*abs(p1-p2))))^2)' : 'ceiling(n0)');
            line('n2', 'ceiling(k*n)'); line('total', 'n+n2');
            if (kind === 'fisher') note += en ? 'Fleiss approximation with Casagrande–Pike continuity correction; not exact Fisher power.' : 'Aproximación de Fleiss con corrección de continuidad de Casagrande–Pike; no es potencia exacta de Fisher.';
        } else if (kind === 'pairedProps') {
            line('pd', 'p01+p10'); line('delta', 'abs(p10-p01)');
            line('n', 'ceiling((za*sqrt(pd)+zb*sqrt(pd-delta^2))^2/delta^2)');
        } else if (kind === 'ni') {
            line('denom', o.type === 'ni' ? 'margin+delta' : 'margin-abs(delta)');
            line('za', 'qnorm(1-alpha)');
            line('n', 'max(2,ceiling(2*sigma^2*(za+zb)^2/denom^2))');
            if (o.type !== 'ni') custom(
                'power_at <- function(n) { se <- sigma*sqrt(2/n); max(0,pnorm((margin-delta)/se-za)+pnorm((margin+delta)/se-za)-1) }\nwhile (n < 1e7 && power_at(n) < power) n <- n+1\nif (power_at(n) < power) stop("No solution within search limit")',
                'def power_at(n):\n    se = sigma*sqrt(2/n)\n    return max(0,pnorm((margin-delta)/se-za)+pnorm((margin+delta)/se-za)-1)\nwhile n < 10000000 and power_at(n) < power:\n    n += 1\nif power_at(n) < power:\n    raise ValueError("No solution within search limit")');
            line('total', '2*n');
        } else if (kind === 'chi' || kind === 'sw') {
            if (kind === 'sw') { line('df', '2'); line('component', 'gamma1^2/6+gamma2^2/24'); }
            else line('component', 'w^2');
            search('pchisq(qchisq(1-alpha,df),df,ncp=n*component,lower.tail=FALSE)', 'return stats.ncx2.sf(stats.chi2.ppf(1-alpha,df),df,n*component)', kind === 'sw' ? 3 : 2, kind === 'sw' ? 100000 : 1000000);
            if (kind === 'sw') note += en ? 'Jarque–Bera moment approximation; this does not compute Shapiro–Wilk power.' : 'Aproximación por momentos de Jarque–Bera; no calcula la potencia de Shapiro–Wilk.';
        } else if (kind === 'anova') {
            search('df1 <- groups-1; df2 <- groups*(n-1); pf(qf(1-alpha,df1,df2),df1,df2,ncp=n*groups*f^2,lower.tail=FALSE)', 'df1, df2 = groups-1, groups*(n-1)\nreturn stats.ncf.sf(stats.f.ppf(1-alpha,df1,df2),df1,df2,n*groups*f*f)');
            line('total', 'groups*n');
        } else if (kind === 'varianceIC') {
            custom('ratio_at <- function(n) qchisq(1-alpha/2,n-1)/qchisq(alpha/2,n-1)\nn <- 2\nwhile (n <= 100000 && ratio_at(n) > R) n <- n+1\nif (n > 100000) stop("No solution within search limit")',
                'def ratio_at(n):\n    return stats.chi2.ppf(1-alpha/2,n-1)/stats.chi2.ppf(alpha/2,n-1)\nn = 2\nwhile n <= 100000 and ratio_at(n) > R:\n    n += 1\nif n > 100000:\n    raise ValueError("No solution within search limit")');
        } else if (kind === 'oneVariance' || kind === 'twoVariances') {
            const two = kind === 'twoVariances';
            if (two && o.twoSided && o.R < 1) line('R', '1/R');
            const rCDF = x => two ? `pf(${x},df,df)` : `pchisq(${x},df)`;
            const rSF = x => two ? `pf(${x},df,df,lower.tail=FALSE)` : `pchisq(${x},df,lower.tail=FALSE)`;
            const rQ = x => two ? `qf(${x},df,df)` : `qchisq(${x},df)`;
            const lower = !o.twoSided && o.alternative === 'less';
            const rexpr = o.twoSided ? `${rCDF(rQ('alpha/2')+'/R^2')}+${rSF(rQ('1-alpha/2')+'/R^2')}` : lower ? rCDF(rQ('alpha')+'/R^2') : rSF(rQ('1-alpha')+'/R^2');
            const pyexpr = o.twoSided ? 'dist.cdf(dist.ppf(alpha/2)/R**2)+dist.sf(dist.ppf(1-alpha/2)/R**2)' : lower ? 'dist.cdf(dist.ppf(alpha)/R**2)' : 'dist.sf(dist.ppf(1-alpha)/R**2)';
            search(`df <- n-1; ${rexpr}`, `df = n-1\ndist = ${two ? 'stats.f(df,df)' : 'stats.chi2(df)'}\nreturn ${pyexpr}`);
            if (two) line('total', '2*n');
            note += en ? 'R is a ratio of standard deviations; the variance ratio is R squared.' : 'R es un cociente de desviaciones; el cociente de varianzas es R al cuadrado.';
        } else if (kind === 'ks') {
            // Same limiting Kolmogorov distribution and bisection as the web.
            custom('ks_cdf <- function(x) { j <- 1:100; min(1,max(0,1-2*sum((-1)^(j+1)*exp(-2*j*j*x*x)))) }\nlo <- 0.1; hi <- 4\nfor (i in 1:100) { mid <- (lo+hi)/2; if (1-ks_cdf(mid) > alpha) lo <- mid else hi <- mid }\nk_alpha <- (lo+hi)/2',
                'def ks_cdf(x):\n    return min(1,max(0,1-2*sum((-1)**(j+1)*exp(-2*j*j*x*x) for j in range(1,101))))\nlo, hi = 0.1, 4\nfor i in range(100):\n    mid = (lo+hi)/2\n    if 1-ks_cdf(mid) > alpha:\n        lo = mid\n    else:\n        hi = mid\nk_alpha = (lo+hi)/2');
            search('pnorm(2*(d*sqrt(n)-k_alpha))', 'return pnorm(2*(d*sqrt(n)-k_alpha))', 2, 50000);
            note += en ? 'Uses the Massey lower bound, not exact power for a specified alternative.' : 'Usa la cota inferior de Massey, no la potencia exacta para una alternativa concreta.';
        } else throw new Error('Unknown sample-size method: ' + kind);
        const extras = ['n2', 'total', 'achieved_power'].filter(name => new RegExp('^' + name + ' <-', 'm').test(r));
        const rOutput = ['n=result', ...extras.map(name => name+'='+name)].join(', ');
        const pyOutput = ['"n": result', ...extras.map(name => '"'+name+'": '+name)].join(', ');
        const params = isR => Object.entries(o).map(([k,v]) => k + (isR ? ' <- ' : ' = ') + literal(v,isR)).join('\n');
        return {
            note,
            r: params(true)+'\n\n'+r+'\nresult <- n\nprint(list('+rOutput+'))',
            python: 'from math import sqrt, ceil as ceiling, atanh, exp\nfrom scipy import stats\nqnorm = stats.norm.ppf\npnorm = stats.norm.cdf\n\n'+params(false)+'\n\n'+py+'\nresult = n\nprint({'+pyOutput+'})'
        };
    }
    window.ReproduceSampleSize = {
        generate,
        show(kind, parameters, result) { window.ReproduceCode.show(result, generate(kind, parameters)); }
    };
}());
