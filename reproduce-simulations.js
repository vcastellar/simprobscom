(function () {
    'use strict';
    const en = document.documentElement.lang === 'en';
    const pageKind = document.currentScript.dataset.simulation;
    const modulus = 4294967296;

    const generator = ProbLabRandom.create;
    let active = generator(0);
    function begin(buttonId) {
        window.ReproduceCode.clear();
        const input = document.getElementById(buttonId).closest('.ss-controls').querySelector('.simulation-seed-input');
        const seed = input.value === '' ? crypto.getRandomValues(new Uint32Array(1))[0] : Number(input.value);
        const valid = Number.isInteger(seed) && seed >= 0 && seed < modulus;
        input.setCustomValidity(valid ? '' : (en ? 'Enter an integer from 0 to 4294967295.' : 'Introduce un entero entre 0 y 4294967295.'));
        if (!valid) { input.reportValidity(); return null; }
        active = generator(seed);
        return seed;
    }
    document.addEventListener('DOMContentLoaded', () => {
        if (pageKind === 'errors') return; // This simulator evaluates normal probabilities analytically.
        document.querySelectorAll('main .ss-controls').forEach(controls => {
            const button = controls.querySelector('.calculate-btn');
            if (!button) return;
            const field = document.createElement('div');
            field.className = 'form-group simulation-seed';
            const id = 'simulationSeed-' + button.id;
            field.innerHTML = '<label></label><input class="simulation-seed-input" type="number" min="0" max="4294967295" step="1" inputmode="numeric"><p class="simulation-seed-hint"></p>';
            const label = field.querySelector('label'), input = field.querySelector('input'), hint = field.querySelector('p');
            label.htmlFor = input.id = id;
            label.textContent = en ? 'Random seed (optional)' : 'Semilla aleatoria (opcional)';
            hint.id = id + '-hint'; input.setAttribute('aria-describedby', hint.id);
            hint.textContent = en ? 'Leave blank for a new simulation. Use the same seed and parameters to repeat it.' : 'Déjala vacía para una simulación nueva. Usa la misma semilla y los mismos parámetros para repetirla.';
            input.addEventListener('input', () => input.setCustomValidity(''));
            (button.parentElement.classList.contains('btn-row') ? button.parentElement : button).before(field);
        });
    });
    document.addEventListener('click', e => {
        if (e.target.closest('main .preset-tab')) window.ReproduceCode.clear();
    }, true);

    function parameterValue(value, r, depth=0) {
        if (!Array.isArray(value)) {
            if (value === null) return r ? 'NULL' : 'None';
            if (typeof value === 'boolean') return r ? (value ? 'TRUE' : 'FALSE') : (value ? 'True' : 'False');
            return typeof value === 'string' ? JSON.stringify(value) : String(value);
        }
        const nested = value.some(Array.isArray);
        const open = r ? (nested ? 'list(' : 'c(') : '[';
        const close = r ? ')' : ']';
        const values = value.map(v => parameterValue(v,r,depth+1));
        if (!nested && value.length <= 5) return open+values.join(', ')+close;
        const lines = [];
        const width = nested ? 1 : 3;
        for (let i=0; i<values.length; i+=width) lines.push(values.slice(i,i+width).join(', '));
        const indent = '    '.repeat(depth+1);
        return open+'\n'+indent+lines.join(',\n'+indent)+'\n'+'    '.repeat(depth)+close;
    }
    const rValue = v => parameterValue(v,true);
    const pyValue = v => parameterValue(v,false);
    const rRandom = 'set.seed(seed %% .Machine$integer.max)';
    const pyRandom = 'rng = np.random.default_rng(seed)';
    function pair(parameters, r, python, note='', random=true) {
        const common = random
            ? (en ? 'Reproduces the simulation procedure and parameters. Results and plots may differ between the web, R and Python because their random generators and sampling algorithms differ. A fixed seed repeats a run within the same environment.' : 'Reproduce el procedimiento y los parámetros de la simulación. Los resultados y los gráficos pueden variar entre la web, R y Python porque sus generadores y algoritmos aleatorios son diferentes. Una semilla fija permite repetir la ejecución dentro del mismo entorno.')
            : (en ? 'Reproduces the analytical probabilities; this simulator does not draw random samples.' : 'Reproduce las probabilidades analíticas; este simulador no extrae muestras aleatorias.');
        return {
            note: common + (note ? ' ' + note : ''),
            r: Object.entries(parameters).map(([k,v]) => `${k} <- ${rValue(v)}`).join('\n') + '\n\n' + (random ? rRandom+'\n\n' : '') + r + '\nprint(result)',
            python: 'from math import sqrt, floor, ceil\nimport numpy as np\nfrom scipy import stats\n\n' + Object.entries(parameters).map(([k,v]) => `${k} = ${pyValue(v)}`).join('\n') + '\n\n' + (random ? pyRandom+'\n\n' : '') + python + '\nprint(result)'
        };
    }
    function generate(kind, o) {
        if (kind === 'errors') return pair({d:o.d,n:o.n,alpha:o.alpha,alternative:o.testType},
            `delta <- d * sqrt(n)
critical <- qnorm(1 - alpha / ifelse(alternative == "right", 1, 2))
beta <- if (alternative == "right") pnorm(critical, mean=delta) else pnorm(critical, mean=delta) - pnorm(-critical, mean=delta)
result <- list(alpha=alpha, beta=beta, power=1-beta, delta=delta, critical=critical)`,
            `delta = d * sqrt(n)
critical = stats.norm.ppf(1 - alpha / (1 if alternative == "right" else 2))
beta = stats.norm.cdf(critical, loc=delta) if alternative == "right" else stats.norm.cdf(critical, loc=delta) - stats.norm.cdf(-critical, loc=delta)
result = {"alpha": alpha, "beta": beta, "power": 1-beta, "delta": delta, "critical": critical}`, '', false);
        if (kind === 'walk1d') return pair({seed:o.seed,n:o.n,p:o.p,paths:o.nPaths,show_bands:o.bands,show_mean:o.showMean},
            `walks <- lapply(seq_len(paths), function(k) c(0, cumsum(sample(c(-1,1),size=n,replace=TRUE,prob=c(1-p,p)))))
finals <- vapply(walks, function(w) tail(w, 1), numeric(1))
result <- list(mean=mean(finals), sd=sqrt(mean((finals-mean(finals))^2)), minimum=min(finals), maximum=max(finals), theoretical_mean=n*(2*p-1), theoretical_sd=sqrt(4*n*p*(1-p)))`,
            `walks = [np.r_[0, np.cumsum(rng.choice([-1,1],size=n,p=[1-p,p]))] for _ in range(paths)]
finals = np.array([w[-1] for w in walks])
result = {"mean": np.mean(finals), "sd": np.std(finals, ddof=0), "minimum": np.min(finals), "maximum": np.max(finals), "theoretical_mean": n*(2*p-1), "theoretical_sd": sqrt(4*n*p*(1-p))}`,
            en ? 'The empirical standard deviation uses divisor paths, as in the simulator.' : 'La desviación empírica usa el divisor número de trayectorias, como en el simulador.');
        if (kind === 'walk2d') return pair({seed:o.seed,n:o.n,paths:o.nPaths,show_circle:o.showC},
            `directions <- rbind(c(1,0), c(-1,0), c(0,1), c(0,-1))
walks <- lapply(seq_len(paths), function(k) {
    moves <- directions[sample.int(4,size=n,replace=TRUE), , drop=FALSE]
    rbind(c(0,0), cbind(cumsum(moves[,1]), cumsum(moves[,2])))
})
distances <- lapply(walks, function(w) sqrt(rowSums(w^2)))
finals <- vapply(distances, function(d) tail(d,1), numeric(1))
returns <- if (paths == 1) sum(distances[[1]][-1] == 0) else NA
result <- list(mean_distance=mean(finals), mean_squared_distance=mean(finals^2), maximum_distance=max(unlist(distances)), returns=returns, theoretical_squared_distance=n)`,
            `directions = np.array([[1,0], [-1,0], [0,1], [0,-1]])
walks = []
for _ in range(paths):
    moves = directions[rng.integers(0,4,size=n)]
    walks.append(np.vstack(([0,0], np.cumsum(moves, axis=0))))
distances = [np.sqrt(np.sum(w*w, axis=1)) for w in walks]
finals = np.array([d[-1] for d in distances])
returns = int(np.sum(distances[0][1:] == 0)) if paths == 1 else None
result = {"mean_distance": np.mean(finals), "mean_squared_distance": np.mean(finals**2), "maximum_distance": max(np.max(d) for d in distances), "returns": returns, "theoretical_squared_distance": n}`);
        if (kind === 'markov') return pair({seed:o.seed,transition:o.matrix,initial:o.initState,steps:o.nSteps,state_names:o.names},
            `P <- do.call(rbind, transition)
states <- nrow(P)
current <- initial + 1  # Input states are numbered from zero in Python/the web.
history <- integer(steps+1); history[1] <- current
for (i in seq_len(steps)) {
    current <- sample.int(states,size=1,prob=P[current,])
    history[i+1] <- current
}
empirical <- tabulate(history, nbins=states)/(steps+1)
stationary <- rep(1/states, states)
for (iteration in seq_len(10000)) {
    next_p <- as.vector(stationary %*% P)
    difference <- sum(abs(next_p-stationary))
    stationary <- next_p
    if (difference < 1e-9) break
}
result <- list(empirical=empirical, stationary=stationary, max_difference=max(abs(empirical-stationary)))`,
            `P = np.asarray(transition, dtype=float)
states = len(P)
current = initial
history = [current]
for _ in range(steps):
    current = int(rng.choice(states,p=P[current]/P[current].sum()))
    history.append(current)
empirical = np.bincount(history, minlength=states)/(steps+1)
stationary = np.full(states, 1/states)
for _ in range(10000):
    next_p = stationary @ P
    difference = np.sum(np.abs(next_p-stationary))
    stationary = next_p
    if difference < 1e-9:
        break
result = {"empirical": empirical, "stationary": stationary, "max_difference": np.max(np.abs(empirical-stationary))}`,
            en ? 'Includes the initial state in occupation frequencies. The stationary comparison uses the calculator’s iteration from a uniform distribution, with the same tolerance and iteration limit.' : 'Incluye el estado inicial en las frecuencias de ocupación. La comparación estacionaria usa la iteración de la calculadora desde una distribución uniforme, con la misma tolerancia y límite de iteraciones.');
        if (kind.startsWith('poisson')) return poisson(kind,o);
        if (kind === 'clt') return clt(o);
        if (kind === 'bootstrap') return bootstrap(o);
        if (kind === 'intervals') return intervals(o);
        return null;
    }

    function poisson(kind,o) {
        const rbody = `process <- function() {
    time <- 0; events <- numeric(0); gaps <- numeric(0)
    repeat {
        gap <- rexp(1,rate=rate)
        gaps <- c(gaps, gap)
        time <- time + gap
        if (time > horizon) break
        events <- c(events, time)
    }
    list(events=events, gaps=gaps)
}
runs <- lapply(seq_len(repetitions), function(i) process())
counts <- vapply(runs, function(run) length(run$events), numeric(1))`;
        const pybody = `def process():
    time = 0.0
    events, gaps = [], []
    while True:
        gap = rng.exponential(scale=1/rate)
        gaps.append(gap)
        time += gap
        if time > horizon:
            break
        events.append(time)
    return {"events": events, "gaps": gaps}
runs = [process() for _ in range(repetitions)]
counts = np.array([len(run["events"]) for run in runs])`;
        const rresult = kind === 'poissonGaps'
            ? '\ngaps <- unlist(lapply(runs, function(run) run$gaps))\nresult <- list(mean=mean(gaps), median=median(gaps), sample_size=length(gaps), theoretical_mean=1/rate, theoretical_median=log(2)/rate)'
            : kind === 'poissonCounts' ? '\nresult <- list(mean=mean(counts), variance=var(counts), theoretical_mean=rate*horizon, theoretical_variance=rate*horizon)'
            : '\nresult <- list(mean=mean(counts), counts=counts, theoretical_mean=rate*horizon)';
        const pyresult = kind === 'poissonGaps'
            ? '\ngaps = np.array([gap for run in runs for gap in run["gaps"]])\nresult = {"mean": np.mean(gaps), "median": np.median(gaps), "sample_size": len(gaps), "theoretical_mean": 1/rate, "theoretical_median": log(2)/rate}'
            : kind === 'poissonCounts' ? '\nresult = {"mean": np.mean(counts), "variance": np.var(counts, ddof=1), "theoretical_mean": rate*horizon, "theoretical_variance": rate*horizon}'
            : '\nresult = {"mean": np.mean(counts), "counts": counts, "theoretical_mean": rate*horizon}';
        return pair({seed:o.seed,rate:o.lambda,horizon:o.T,repetitions:o.repetitions},rbody+rresult,pybody+pyresult,
            kind === 'poissonGaps' ? (en ? 'Includes the complete last waiting time that crosses the horizon, as in the simulator.' : 'Incluye la última espera completa que cruza el horizonte, como en el simulador.') : '');
    }
    function clt(o) {
        const draws = {
            normal: ['rnorm(SIZE)', 'rng.normal(size=SIZE)'],
            uniform: ['runif(SIZE)', 'rng.uniform(size=SIZE)'],
            exponential: ['rexp(SIZE)', 'rng.exponential(size=SIZE)'],
            bernoulli: ['rbinom(SIZE,1,.3)', 'rng.binomial(1,.3,size=SIZE)'],
            poisson: ['rpois(SIZE,3)', 'rng.poisson(3,size=SIZE)'],
            chisquare: ['rchisq(SIZE,3)', 'rng.chisquare(3,size=SIZE)']
        };
        const [rDraw,pyDraw] = draws[o.dist];
        return pair({seed:o.seed,distribution:o.dist,n:o.n,simulations:o.numSims,true_mean:o.trueMu,true_variance:o.trueVar,true_skewness:o.trueSkew},
            `original_size <- min(simulations*max(n,10),50000)
original_sample <- ${rDraw.replace('SIZE','original_size')}
sample_means <- replicate(simulations,mean(${rDraw.replace('SIZE','n')}))
centered <- sample_means-mean(sample_means)
m2 <- mean(centered^2)
skewness <- if (m2 > 0) mean(centered^3)/m2^1.5 else 0
result <- list(mean=mean(sample_means), sd=sd(sample_means), variance=var(sample_means), skewness=skewness, theoretical_mean=true_mean, theoretical_sd=sqrt(true_variance/n), theoretical_variance=true_variance/n, theoretical_skewness=true_skewness/sqrt(n))`,
            `original_size = min(simulations*max(n,10),50000)
original_sample = ${pyDraw.replace('SIZE','original_size')}
sample_means = ${pyDraw.replace('SIZE','(simulations,n)')}.mean(axis=1)
centered = sample_means-np.mean(sample_means)
m2 = np.mean(centered**2)
skewness = np.mean(centered**3)/m2**1.5 if m2 > 0 else 0
result = {"mean": np.mean(sample_means), "sd": np.std(sample_means, ddof=1), "variance": np.var(sample_means, ddof=1), "skewness": skewness, "theoretical_mean": true_mean, "theoretical_sd": sqrt(true_variance/n), "theoretical_variance": true_variance/n, "theoretical_skewness": true_skewness/sqrt(n)}`);
    }
    function bootstrap(o) {
        const rStatistic = ({mean:'mean(x)',median:'median(x)',sd:'sd(x)'})[o.stat];
        const pyStatistic = ({mean:'np.mean(x)',median:'np.median(x)',sd:'np.std(x, ddof=1)'})[o.stat];
        return pair({seed:o.seed,data:o.sample,B:o.B,confidence:o.confLevel,statistic_name:o.stat,distribution:o.dist},
            `statistic <- function(x) ${rStatistic}
n <- length(data)
replicates <- replicate(B, statistic(sample(data,size=n,replace=TRUE)))
ordered <- sort(replicates)
alpha <- 1-confidence
ci <- c(ordered[floor(alpha/2*B)+1], ordered[ceiling((1-alpha/2)*B)])
result <- list(estimate=statistic(data), standard_error=sd(replicates), ci=ci)`,
            `data = np.asarray(data)
def statistic(x):
    return ${pyStatistic}
n = len(data)
replicates = np.array([statistic(rng.choice(data,size=n,replace=True)) for _ in range(B)])
ordered = np.sort(replicates)
alpha = 1-confidence
ci = [ordered[floor(alpha/2*B)], ordered[ceil((1-alpha/2)*B)-1]]
result = {"estimate": statistic(data), "standard_error": np.std(replicates, ddof=1), "ci": ci}`,
            en ? 'Preserves the displayed sample; resampling uses the native generator of each language. Percentile bounds use the same order-statistic indices as the calculator, without quantile interpolation.' : 'Conserva la muestra mostrada; el remuestreo utiliza el generador nativo de cada lenguaje. Los límites percentiles usan los mismos índices de orden que la calculadora, sin interpolar cuantiles.');
    }
    function intervals(o) {
        const mean = o.mode === 'media';
        const params = {seed:o.seed,method:o.params.method,n:o.params.n,confidence:o.params.conf,repetitions:o.params.numIntervals,...(mean?{mu:o.params.mu,sigma:o.params.sigma}:{p:o.params.p})};
        const rbody = mean ? `critical <- if (method == "t") qt((1+confidence)/2, df=n-1) else qnorm((1+confidence)/2)
intervals <- t(replicate(repetitions, {
    x <- rnorm(n,mean=mu,sd=sigma)
    estimate <- mean(x)
    s <- sqrt(max(0, sum(x*x)-n*estimate^2)/(n-1))
    margin <- critical*(if (method == "t") s else sigma)/sqrt(n)
    c(estimate-margin, estimate+margin, estimate)
}))
truth <- mu` : `alpha <- 1-confidence
z <- qnorm(1-alpha/2)
intervals <- t(replicate(repetitions, {
    successes <- rbinom(1,size=n,prob=p)
    estimate <- successes/n
    if (method == "clopper") {
        lo <- if (successes == 0) 0 else qbeta(alpha/2, successes, n-successes+1)
        hi <- if (successes == n) 1 else qbeta(1-alpha/2, successes+1, n-successes)
    } else {
        if (method == "wilson") {
            denominator <- 1+z^2/n
            center <- (estimate+z^2/(2*n))/denominator
            margin <- z/denominator*sqrt(estimate*(1-estimate)/n+z^2/(4*n^2))
        } else {
            center <- estimate
            margin <- z*sqrt(estimate*(1-estimate)/n)
        }
        lo <- max(0,center-margin); hi <- min(1,center+margin)
    }
    c(lo,hi,estimate)
}))
truth <- p`;
        const pybody = mean ? `critical = stats.t.ppf((1+confidence)/2, df=n-1) if method == "t" else stats.norm.ppf((1+confidence)/2)
intervals = []
for _ in range(repetitions):
    x = rng.normal(mu,sigma,size=n)
    estimate = sum(x)/n
    s = sqrt(max(0, sum(v*v for v in x)-n*estimate**2)/(n-1))
    margin = critical*(s if method == "t" else sigma)/sqrt(n)
    intervals.append([estimate-margin, estimate+margin, estimate])
truth = mu` : `alpha = 1-confidence
z = stats.norm.ppf(1-alpha/2)
intervals = []
for _ in range(repetitions):
    successes = rng.binomial(n,p)
    estimate = successes/n
    if method == "clopper":
        lo = 0 if successes == 0 else stats.beta.ppf(alpha/2, successes, n-successes+1)
        hi = 1 if successes == n else stats.beta.ppf(1-alpha/2, successes+1, n-successes)
    else:
        if method == "wilson":
            denominator = 1+z**2/n
            center = (estimate+z**2/(2*n))/denominator
            margin = z/denominator*sqrt(estimate*(1-estimate)/n+z**2/(4*n**2))
        else:
            center = estimate
            margin = z*sqrt(estimate*(1-estimate)/n)
        lo, hi = max(0,center-margin), min(1,center+margin)
    intervals.append([lo,hi,estimate])
truth = p`;
        return pair(params,rbody+`
covered <- sum(intervals[,1] <= truth & truth <= intervals[,2])
result <- list(covered=covered, coverage=covered/repetitions, mean_width=mean(intervals[,2]-intervals[,1]))`,
            pybody+`
intervals = np.asarray(intervals)
covered = int(np.sum((intervals[:,0] <= truth) & (truth <= intervals[:,1])))
result = {"covered": covered, "coverage": covered/repetitions, "mean_width": np.mean(intervals[:,1]-intervals[:,0])}`,
            en ? 'Uses the selected z, t, Wald, Wilson or Clopper–Pearson method. Wald intervals are clipped to [0,1], as in the simulator.' : 'Usa el método seleccionado: z, t, Wald, Wilson o Clopper–Pearson. Los intervalos Wald se recortan a [0,1], como en el simulador.');
    }

    window.ReproduceSimulations = {
        begin, generator,
        random: () => active.random(),
        uniform: (a,b) => a+(b-a)*active.random(),
        normal: (mu=0,sigma=1) => active.normal(mu,sigma),
        lognormal: (mu,sigma) => Math.exp(active.normal(mu,sigma)),
        exponential: rate => active.exponential(rate),
        poisson: rate => active.poisson(rate),
        binomial: (n,p) => active.binomial(n,p),
        chisquare: df => active.chisquare(df),
        render(kind,id,o) {
            const value = generate(kind,o);
            if (value) {
                const plots = window.ReproduceSimulationPlots(kind,o);
                const heading = en ? '# Plots from the same simulation data' : '# Gráficos con los datos de la misma simulación';
                value.r += '\n\n'+heading+'\n'+plots.r;
                value.python = value.python.replace('from scipy import stats', 'from scipy import stats\nimport matplotlib.pyplot as plt')+'\n\n'+heading+'\n'+plots.python+'\nplt.show()';
                value.note += en ? ' Plots use the samples and results of this code.' : ' Los gráficos utilizan las muestras y los resultados de este código.';
                value.dependencies = en
                    ? 'R: base R, no packages required. Python: install scipy and matplotlib (pip install scipy matplotlib).'
                    : 'R: base R, sin paquetes adicionales. Python: instala scipy y matplotlib (pip install scipy matplotlib).';
                window.ReproduceCode.show(document.getElementById(id),value);
                const root = document.getElementById('reproduce-code');
                root.classList.add('simulation-code');
                root.querySelector('[role=tabpanel]').removeAttribute('tabindex');
                root.querySelector('pre').tabIndex = 0;
            }
        }
    };
}());
