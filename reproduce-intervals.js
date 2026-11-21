(function () {
    'use strict';
    const en = document.documentElement.lang === 'en';
    const literal = (v,r) => Array.isArray(v) ? (r ? 'c('+v.join(', ')+')' : JSON.stringify(v)) : typeof v === 'boolean' ? (r ? (v?'TRUE':'FALSE') : (v?'True':'False')) : JSON.stringify(v);
    function pair(parameters,r,python,note) {
        return {
            note: (en ? 'Reproduces the displayed confidence limits using the same data, confidence level and method. ' : 'Reproduce los límites mostrados con los mismos datos, nivel de confianza y método. ')+(note || ''),
            r: Object.entries(parameters).map(([k,v])=>k+' <- '+literal(v,true)).join('\n')+'\n\nalpha <- 1-confidence\n'+r+'\nresult <- list(estimate=estimate, intervals=intervals)\nprint(result)',
            python: 'from math import sqrt, exp, log\nimport numpy as np\nfrom scipy import stats\n\n'+Object.entries(parameters).map(([k,v])=>k+' = '+literal(v,false)).join('\n')+'\n\nalpha = 1-confidence\n'+python+'\nresult = {"estimate": estimate, "intervals": np.asarray(intervals)}\nprint(result)'
        };
    }
    const rZ = 'critical <- qnorm(1-alpha/2)';
    const pyZ = 'critical = stats.norm.ppf(1-alpha/2)';
    const rSingle = 'intervals <- matrix(c(estimate-margin,estimate+margin),nrow=1)';
    const pySingle = 'intervals = [[estimate-margin,estimate+margin]]';
    const rWilson = `wilson <- function(x,n,z) {
    p <- x/n; denominator <- 1+z^2/n
    center <- (p+z^2/(2*n))/denominator
    half <- z/denominator*sqrt(p*(1-p)/n+z^2/(4*n^2))
    c(max(0,center-half),min(1,center+half))
}`;
    const pyWilson = `def wilson(x,n,z):
    p = x/n
    denominator = 1+z*z/n
    center = (p+z*z/(2*n))/denominator
    half = z/denominator*sqrt(p*(1-p)/n+z*z/(4*n*n))
    return [max(0,center-half),min(1,center+half)]`;
    function generate(kind,o) {
        const confidence = o.conf;
        if (['mean','knownMean','paired','finiteMean'].includes(kind)) {
            const known=kind==='knownMean', finite=kind==='finiteMean', paired=kind==='paired';
            const params={mean:o.mean,sd:o.sd,n:o.n,confidence,...(finite?{population:o.bigN}:{}),...(paired?{direction:o.direction}:{})};
            const rCritical=known?rZ:'df <- n-1\ncritical <- qt(1-alpha/2,df=df)';
            const pyCritical=known?pyZ:'df = n-1\ncritical = stats.t.ppf(1-alpha/2,df=df)';
            let r=`${rCritical}\nestimate <- mean\nse <- sd/sqrt(n)\nmargin <- critical*se\n${rSingle}`;
            let py=`${pyCritical}\nestimate = mean\nse = sd/sqrt(n)\nmargin = critical*se\n${pySingle}`;
            if(finite) {
                r += '\nfpc <- sqrt((population-n)/(population-1))\nintervals <- rbind(corrected=c(estimate-margin*fpc,estimate+margin*fpc),uncorrected=intervals[1,])';
                py += '\nfpc = sqrt((population-n)/(population-1))\nintervals = [[estimate-margin*fpc,estimate+margin*fpc],intervals[0]]';
            }
            const note=known?(en?'Uses the known population standard deviation and a normal critical value.':'Usa la desviación poblacional conocida y el valor crítico normal.') : paired?(en?'Uses summary statistics of the paired differences with the stated direction; no raw observations are invented.':'Usa los estadísticos de las diferencias apareadas con la dirección indicada, sin inventar observaciones.') : finite?(en?'Uses Student t and sqrt((N-n)/(N-1)); also reports the uncorrected interval.':'Usa t de Student y sqrt((N-n)/(N-1)); también devuelve el intervalo sin corrección.') : (en?'Uses the sample standard deviation and Student t with n-1 degrees of freedom.':'Usa la desviación muestral y t de Student con n-1 grados de libertad.');
            return pair(params,r,py,note);
        }
        if(kind==='twoMeans') return pair({mean1:o.xbar1,mean2:o.xbar2,sd1:o.s1,sd2:o.s2,n1:o.n1,n2:o.n2,confidence,method:o.varType},
            `estimate <- mean1-mean2
if (method == "welch") {
    v1 <- sd1^2/n1; v2 <- sd2^2/n2
    se <- sqrt(v1+v2)
    df <- (v1+v2)^2/(v1^2/(n1-1)+v2^2/(n2-1))
} else {
    df <- n1+n2-2
    pooled <- ((n1-1)*sd1^2+(n2-1)*sd2^2)/df
    se <- sqrt(pooled*(1/n1+1/n2))
}
critical <- qt(1-alpha/2,df=df)
margin <- critical*se
${rSingle}`,
            `estimate = mean1-mean2
if method == "welch":
    v1, v2 = sd1**2/n1, sd2**2/n2
    se = sqrt(v1+v2)
    df = (v1+v2)**2/(v1**2/(n1-1)+v2**2/(n2-1))
else:
    df = n1+n2-2
    pooled = ((n1-1)*sd1**2+(n2-1)*sd2**2)/df
    se = sqrt(pooled*(1/n1+1/n2))
critical = stats.t.ppf(1-alpha/2,df=df)
margin = critical*se
${pySingle}`,
            en?'Difference group 1 minus group 2, with the selected Welch or pooled variance method.':'Diferencia grupo 1 menos grupo 2, con el método seleccionado de Welch o varianza agrupada.');
        if(kind==='proportion') return pair({x:o.x,n:o.n,confidence,method:o.method},
            `${rZ}
${rWilson}
estimate <- x/n
margin <- critical*sqrt(estimate*(1-estimate)/n)
wald <- c(max(0,estimate-margin),min(1,estimate+margin))
wilson_ci <- wilson(x,n,critical)
clopper <- c(if (x == 0) 0 else qbeta(alpha/2,x,n-x+1),if (x == n) 1 else qbeta(1-alpha/2,x+1,n-x))
intervals <- switch(method,wald=matrix(wald,nrow=1),wilson=matrix(wilson_ci,nrow=1),clopper=matrix(clopper,nrow=1),both=rbind(Wilson=wilson_ci,Wald=wald,Clopper_Pearson=clopper))`,
            `${pyZ}
${pyWilson}
estimate = x/n
margin = critical*sqrt(estimate*(1-estimate)/n)
wald = [max(0,estimate-margin),min(1,estimate+margin)]
wilson_ci = wilson(x,n,critical)
clopper = [0 if x == 0 else stats.beta.ppf(alpha/2,x,n-x+1),1 if x == n else stats.beta.ppf(1-alpha/2,x+1,n-x)]
intervals = [wilson_ci,wald,clopper] if method == "both" else [{"wald":wald,"wilson":wilson_ci,"clopper":clopper}[method]]`,
            en?'Wald limits are clipped to [0,1]. Clopper–Pearson uses beta quantiles for the exact binomial interval; comparison order: Wilson, Wald, Clopper–Pearson.':'Los límites de Wald se recortan a [0,1]. Clopper–Pearson usa cuantiles de la distribución beta para el intervalo binomial exacto; orden de comparación: Wilson, Wald, Clopper–Pearson.');
        if(kind==='twoProportions') return pair({x1:o.x1,n1:o.n1,x2:o.x2,n2:o.n2,confidence,method:o.method},
            `${rZ}
${rWilson}
p1 <- x1/n1; p2 <- x2/n2; estimate <- p1-p2
margin <- critical*sqrt(p1*(1-p1)/n1+p2*(1-p2)/n2)
wald <- c(max(-1,estimate-margin),min(1,estimate+margin))
w1 <- wilson(x1,n1,critical); w2 <- wilson(x2,n2,critical)
newcombe <- c(max(-1,estimate-sqrt((p1-w1[1])^2+(w2[2]-p2)^2)),min(1,estimate+sqrt((w1[2]-p1)^2+(p2-w2[1])^2)))
intervals <- if (method == "both") rbind(Newcombe_Wilson=newcombe,Wald=wald) else matrix(if (method == "wald") wald else newcombe,nrow=1)`,
            `${pyZ}
${pyWilson}
p1, p2 = x1/n1, x2/n2
estimate = p1-p2
margin = critical*sqrt(p1*(1-p1)/n1+p2*(1-p2)/n2)
wald = [max(-1,estimate-margin),min(1,estimate+margin)]
w1, w2 = wilson(x1,n1,critical),wilson(x2,n2,critical)
newcombe = [max(-1,estimate-sqrt((p1-w1[0])**2+(w2[1]-p2)**2)),min(1,estimate+sqrt((w1[1]-p1)**2+(p2-w2[0])**2))]
intervals = [newcombe,wald] if method == "both" else [wald if method == "wald" else newcombe]`,
            en?'Newcombe–Wilson combines the two separate Wilson intervals with quadratic distances, without continuity correction; comparison order: Newcombe, Wald.':'Newcombe–Wilson combina los intervalos Wilson de cada grupo mediante distancias cuadráticas, sin corrección de continuidad; orden de comparación: Newcombe, Wald.');
        if(kind==='finiteProportion') return pair({x:o.x,n:o.n,population:o.bigN,confidence},
            `${rZ}\nestimate <- x/n\nmargin <- critical*sqrt(estimate*(1-estimate)/n)\nfpc <- sqrt((population-n)/(population-1))\nintervals <- rbind(corrected=c(max(0,estimate-margin*fpc),min(1,estimate+margin*fpc)),uncorrected=c(max(0,estimate-margin),min(1,estimate+margin)))`,
            `${pyZ}\nestimate = x/n\nmargin = critical*sqrt(estimate*(1-estimate)/n)\nfpc = sqrt((population-n)/(population-1))\nintervals = [[max(0,estimate-margin*fpc),min(1,estimate+margin*fpc)],[max(0,estimate-margin),min(1,estimate+margin)]]`,
            en?'Normal Wald approximation with finite population correction and limits clipped to [0,1]; also reports the uncorrected interval.':'Aproximación normal de Wald con corrección por población finita y límites recortados a [0,1]; también devuelve el intervalo sin corrección.');
        if(kind==='variance') return pair({sd:o.s,n:o.n,confidence},
            'df <- n-1\nestimate <- sd^2\nvariance_ci <- df*estimate/c(qchisq(1-alpha/2,df),qchisq(alpha/2,df))\nintervals <- rbind(variance=variance_ci,standard_deviation=sqrt(variance_ci))',
            'df = n-1\nestimate = sd**2\nvariance_ci = df*estimate/stats.chi2.ppf([1-alpha/2,alpha/2],df=df)\nintervals = [variance_ci,np.sqrt(variance_ci)]',
            en?'Chi-square interval under normality. Reports variance first, then standard deviation.':'Intervalo chi-cuadrado bajo normalidad. Devuelve primero la varianza y después la desviación estándar.');
        const odds=kind==='odds';
        const params=odds?{cells:o.raw,confidence,correction:o.correction}:{x1:o.x1Raw,n1:o.n1Raw,x2:o.x2Raw,n2:o.n2Raw,confidence,correction:o.correction};
        return pair(params,
            `${rZ}
${odds?'raw <- cells':'raw <- c(x1,n1-x1,x2,n2-x2)'}
add_half <- correction == "always" || (correction == "auto" && any(raw == 0))
used <- raw+if (add_half) 0.5 else 0
a <- used[1]; b <- used[2]; c <- used[3]; d <- used[4]
${odds?'estimate <- a*d/(b*c)\nse_log <- sqrt(1/a+1/b+1/c+1/d)':'estimate <- (a/(a+b))/(c/(c+d))\nse_log <- sqrt(1/a-1/(a+b)+1/c-1/(c+d))'}
log_ci <- log(estimate)+c(-1,1)*critical*se_log
intervals <- rbind(ratio=exp(log_ci),log_ratio=log_ci)`,
            `${pyZ}
raw = np.asarray(${odds?'cells':'[x1,n1-x1,x2,n2-x2]'},dtype=float)
add_half = correction == "always" or (correction == "auto" and np.any(raw == 0))
a,b,c,d = raw+(0.5 if add_half else 0)
${odds?'estimate = a*d/(b*c)\nse_log = sqrt(1/a+1/b+1/c+1/d)':'estimate = (a/(a+b))/(c/(c+d))\nse_log = sqrt(1/a-1/(a+b)+1/c-1/(c+d))'}
log_ci = log(estimate)+np.array([-1,1])*critical*se_log
intervals = [np.exp(log_ci),log_ci]`,
            en?'Logarithmic normal interval. The selected correction adds 0.5 to all four cells; both original and log-scale limits are returned.':'Intervalo normal logarítmico. La corrección seleccionada añade 0,5 a las cuatro celdas; devuelve límites en escala original y logarítmica.');
    }
    window.ReproduceIntervals = {render(kind,result,o) {
        window.ReproduceCode.show(result,generate(kind,o));
        const root=document.getElementById('reproduce-code');
        root.classList.add('confidence-code');
        root.querySelector('[role=tabpanel]').removeAttribute('tabindex');
        root.querySelector('pre').tabIndex=0;
    }};
}());
