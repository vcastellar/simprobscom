(function () {
    'use strict';
    const en = document.documentElement.lang === 'en';
    const pageKind = document.currentScript.dataset.simulation;
    const modulus = 4294967296;

    // One explicit stream shared by JavaScript and the displayed R/Python code.
    function generator(seed) {
        let state = seed;
        return {
            snapshot: () => state,
            random() {
                state = (1664525 * state + 1013904223) % modulus;
                return (state + 0.5) / modulus; // Strictly between zero and one.
            },
            normal(mu=0, sigma=1) {
                return mu + sigma * Math.sqrt(-2 * Math.log(this.random())) * Math.cos(2 * Math.PI * this.random());
            },
            exponential(rate=1) { return -Math.log(this.random()) / rate; },
            poisson(rate) {
                const limit = Math.exp(-rate);
                let product = 1, k = 0;
                do { k++; product *= this.random(); } while (product > limit);
                return k - 1;
            },
            binomial(n, p) {
                let successes = 0;
                for (let i = 0; i < n; i++) if (this.random() < p) successes++;
                return successes;
            },
            chisquare(df) {
                let sum = 0;
                for (let i = 0; i < df; i++) sum += this.normal() ** 2;
                return sum;
            }
        };
    }
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
    const rRandom = `# Portable LCG: the same uniform stream as the web simulator.
state <- seed
uniform <- function() {
    state <<- (1664525 * state + 1013904223) %% 4294967296
    (state + 0.5) / 4294967296
}`;
    const pyRandom = `# Portable LCG: the same uniform stream as the web simulator.
state = seed
def uniform():
    global state
    state = (1664525 * state + 1013904223) % 4294967296
    return (state + 0.5) / 4294967296`;
    const rNormal = 'normal <- function() sqrt(-2 * log(uniform())) * cos(2 * pi * uniform())';
    const pyNormal = 'def normal():\n    return sqrt(-2 * log(uniform())) * cos(2 * pi * uniform())';
    function pair(parameters, r, python, note='', random=true) {
        const common = random
            ? (en ? 'Uses the displayed run’s seed and the same random generator to reproduce its numerical results (up to floating-point rounding).' : 'Usa la semilla de la ejecución mostrada y el mismo generador aleatorio para reproducir sus resultados numéricos (salvo redondeo).')
            : (en ? 'Reproduces the analytical probabilities; this simulator does not draw random samples.' : 'Reproduce las probabilidades analíticas; este simulador no extrae muestras aleatorias.');
        return {
            note: common + (note ? ' ' + note : ''),
            r: Object.entries(parameters).map(([k,v]) => `${k} <- ${rValue(v)}`).join('\n') + '\n\n' + (random ? rRandom+'\n\n' : '') + r + '\nprint(result)',
            python: 'from math import sqrt, log, cos, pi, floor, ceil\nimport numpy as np\nfrom scipy import stats\n\n' + Object.entries(parameters).map(([k,v]) => `${k} = ${pyValue(v)}`).join('\n') + '\n\n' + (random ? pyRandom+'\n\n' : '') + python + '\nprint(result)'
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
        if (kind === 'walk1d') return pair({seed:o.seed,n:o.n,p:o.p,paths:o.nPaths},
            `walks <- lapply(seq_len(paths), function(k) c(0, cumsum(replicate(n, if (uniform() < p) 1 else -1))))
finals <- vapply(walks, function(w) tail(w, 1), numeric(1))
result <- list(mean=mean(finals), sd=sqrt(mean((finals-mean(finals))^2)), minimum=min(finals), maximum=max(finals), theoretical_mean=n*(2*p-1), theoretical_sd=sqrt(4*n*p*(1-p)))`,
            `walks = [np.r_[0, np.cumsum([1 if uniform() < p else -1 for _ in range(n)])] for _ in range(paths)]
finals = np.array([w[-1] for w in walks])
result = {"mean": np.mean(finals), "sd": np.std(finals, ddof=0), "minimum": np.min(finals), "maximum": np.max(finals), "theoretical_mean": n*(2*p-1), "theoretical_sd": sqrt(4*n*p*(1-p))}`,
            en ? 'The empirical standard deviation uses divisor paths, as in the simulator.' : 'La desviación empírica usa el divisor número de trayectorias, como en el simulador.');
        if (kind === 'walk2d') return pair({seed:o.seed,n:o.n,paths:o.nPaths},
            `directions <- rbind(c(1,0), c(-1,0), c(0,1), c(0,-1))
walks <- lapply(seq_len(paths), function(k) {
    moves <- directions[replicate(n, floor(4*uniform())+1), , drop=FALSE]
    rbind(c(0,0), cbind(cumsum(moves[,1]), cumsum(moves[,2])))
})
distances <- lapply(walks, function(w) sqrt(rowSums(w^2)))
finals <- vapply(distances, function(d) tail(d,1), numeric(1))
returns <- if (paths == 1) sum(distances[[1]][-1] == 0) else NA
result <- list(mean_distance=mean(finals), mean_squared_distance=mean(finals^2), maximum_distance=max(unlist(distances)), returns=returns, theoretical_squared_distance=n)`,
            `directions = np.array([[1,0], [-1,0], [0,1], [0,-1]])
walks = []
for _ in range(paths):
    moves = directions[[floor(4*uniform()) for _ in range(n)]]
    walks.append(np.vstack(([0,0], np.cumsum(moves, axis=0))))
distances = [np.sqrt(np.sum(w*w, axis=1)) for w in walks]
finals = np.array([d[-1] for d in distances])
returns = int(np.sum(distances[0][1:] == 0)) if paths == 1 else None
result = {"mean_distance": np.mean(finals), "mean_squared_distance": np.mean(finals**2), "maximum_distance": max(np.max(d) for d in distances), "returns": returns, "theoretical_squared_distance": n}`);
        if (kind === 'markov') return pair({seed:o.seed,transition:o.matrix,initial:o.initState,steps:o.nSteps},
            `P <- do.call(rbind, transition)
states <- nrow(P)
current <- initial + 1  # Input states are numbered from zero in Python/the web.
history <- integer(steps+1); history[1] <- current
for (i in seq_len(steps)) {
    u <- uniform(); cumulative <- cumsum(P[current,])
    match <- which(u < cumulative)
    if (length(match)) current <- match[1]
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
    u = uniform()
    cumulative = 0.0
    for j in range(states):
        cumulative += P[current,j]
        if u < cumulative:
            current = j
            break
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
        gap <- -log(uniform())/rate
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
        gap = -log(uniform())/rate
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
        const expressions = {
            normal: ['normal()', 'normal()'],
            uniform: ['uniform()', 'uniform()'],
            exponential: ['-log(uniform())', '-log(uniform())'],
            bernoulli: ['as.numeric(uniform() < 0.3)', 'int(uniform() < 0.3)'],
            poisson: ['poisson()', 'poisson()'],
            chisquare: ['sum(replicate(3, normal()^2))', 'sum(normal()**2 for _ in range(3))']
        };
        const [rExpr,pyExpr] = expressions[o.dist];
        const rPoisson = o.dist === 'poisson' ? `\npoisson <- function() {
    product <- 1; k <- 0
    repeat { k <- k+1; product <- product*uniform(); if (product <= exp(-3)) break }
    k-1
}` : '';
        const pyPoisson = o.dist === 'poisson' ? `\ndef poisson():
    product, k = 1.0, 0
    while True:
        k += 1
        product *= uniform()
        if product <= np.exp(-3):
            return k-1` : '';
        return pair({seed:o.seed,distribution:o.dist,n:o.n,simulations:o.numSims,true_mean:o.trueMu,true_variance:o.trueVar,true_skewness:o.trueSkew},
            `${rNormal}${rPoisson}
draw <- function() ${rExpr}
original_size <- min(simulations*max(n,10), 50000)
original_sample <- replicate(original_size, draw())
sample_means <- replicate(simulations, mean(replicate(n, draw())))
centered <- sample_means-mean(sample_means)
m2 <- mean(centered^2)
skewness <- if (m2 > 0) mean(centered^3)/m2^1.5 else 0
result <- list(mean=mean(sample_means), sd=sd(sample_means), variance=var(sample_means), skewness=skewness, theoretical_mean=true_mean, theoretical_sd=sqrt(true_variance/n), theoretical_variance=true_variance/n, theoretical_skewness=true_skewness/sqrt(n))`,
            `${pyNormal}${pyPoisson}
def draw():
    return ${pyExpr}
original_size = min(simulations*max(n,10), 50000)
original_sample = np.array([draw() for _ in range(original_size)])
sample_means = np.array([sum(draw() for _ in range(n))/n for _ in range(simulations)])
centered = sample_means-np.mean(sample_means)
m2 = np.mean(centered**2)
skewness = np.mean(centered**3)/m2**1.5 if m2 > 0 else 0
result = {"mean": np.mean(sample_means), "sd": np.std(sample_means, ddof=1), "variance": np.var(sample_means, ddof=1), "skewness": skewness, "theoretical_mean": true_mean, "theoretical_sd": sqrt(true_variance/n), "theoretical_variance": true_variance/n, "theoretical_skewness": true_skewness/sqrt(n)}`,
            en ? 'Generates the original-distribution histogram sample first, followed by the sample means, in the same order as the web.' : 'Genera primero la muestra del histograma original y después las medias muestrales, en el mismo orden que la web.');
    }
    function bootstrap(o) {
        const rStatistic = ({mean:'mean(x)',median:'median(x)',sd:'sd(x)'})[o.stat];
        const pyStatistic = ({mean:'np.mean(x)',median:'np.median(x)',sd:'np.std(x, ddof=1)'})[o.stat];
        return pair({seed:o.seed,data:o.sample,B:o.B,confidence:o.confLevel,statistic_name:o.stat},
            `statistic <- function(x) ${rStatistic}
n <- length(data)
replicates <- replicate(B, statistic(data[replicate(n, floor(n*uniform())+1)]))
ordered <- sort(replicates)
alpha <- 1-confidence
ci <- c(ordered[floor(alpha/2*B)+1], ordered[ceiling((1-alpha/2)*B)])
result <- list(estimate=statistic(data), standard_error=sd(replicates), ci=ci)`,
            `data = np.asarray(data)
def statistic(x):
    return ${pyStatistic}
n = len(data)
replicates = np.array([statistic(data[[floor(n*uniform()) for _ in range(n)]]) for _ in range(B)])
ordered = np.sort(replicates)
alpha = 1-confidence
ci = [ordered[floor(alpha/2*B)], ordered[ceil((1-alpha/2)*B)-1]]
result = {"estimate": statistic(data), "standard_error": np.std(replicates, ddof=1), "ci": ci}`,
            en ? 'Preserves the displayed sample. The seed starts at resampling. Percentile bounds use the same order-statistic indices as the calculator, without quantile interpolation.' : 'Conserva la muestra mostrada. La semilla corresponde al inicio del remuestreo. Los límites percentiles usan los mismos índices de orden que la calculadora, sin interpolar cuantiles.');
    }
    function intervals(o) {
        const mean = o.mode === 'media';
        const params = {seed:o.seed,method:o.params.method,n:o.params.n,confidence:o.params.conf,repetitions:o.params.numIntervals,...(mean?{mu:o.params.mu,sigma:o.params.sigma}:{p:o.params.p})};
        const rbody = mean ? `${rNormal}
critical <- if (method == "t") qt((1+confidence)/2, df=n-1) else qnorm((1+confidence)/2)
intervals <- t(replicate(repetitions, {
    x <- replicate(n, mu+sigma*normal())
    estimate <- mean(x)
    s <- sqrt(max(0, sum(x*x)-n*estimate^2)/(n-1))
    margin <- critical*(if (method == "t") s else sigma)/sqrt(n)
    c(estimate-margin, estimate+margin, estimate)
}))
truth <- mu` : `alpha <- 1-confidence
z <- qnorm(1-alpha/2)
intervals <- t(replicate(repetitions, {
    successes <- sum(replicate(n, uniform() < p))
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
        const pybody = mean ? `${pyNormal}
critical = stats.t.ppf((1+confidence)/2, df=n-1) if method == "t" else stats.norm.ppf((1+confidence)/2)
intervals = []
for _ in range(repetitions):
    x = [mu+sigma*normal() for _ in range(n)]
    estimate = sum(x)/n
    s = sqrt(max(0, sum(v*v for v in x)-n*estimate**2)/(n-1))
    margin = critical*(s if method == "t" else sigma)/sqrt(n)
    intervals.append([estimate-margin, estimate+margin, estimate])
truth = mu` : `alpha = 1-confidence
z = stats.norm.ppf(1-alpha/2)
intervals = []
for _ in range(repetitions):
    successes = sum(uniform() < p for _ in range(n))
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
        snapshot: () => active.snapshot(),
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
                window.ReproduceCode.show(document.getElementById(id),value);
                const root = document.getElementById('reproduce-code');
                root.classList.add('simulation-code');
                root.querySelector('[role=tabpanel]').removeAttribute('tabindex');
                root.querySelector('pre').tabIndex = 0;
            }
        }
    };
}());
