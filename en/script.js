let chart;

const distributionLabels = {
    normal: "Normal",
    binomial: "Binomial",
    poisson: "Poisson",
    studentt: "Student's t",
    chisquare: "Chi-square",
    centralf: "Snedecor's F",
    exponential: "Exponential",
    negbin: "Negative binomial",
    geometric: "Geometric",
    uniform: "Uniform",
    gamma: "Gamma",
    beta: "Beta",
    lognormal: "Log-normal",
    weibull: "Weibull",
    hypergeometric: "Hypergeometric",
    bernoulli: "Bernoulli"
};

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

let _mathJaxRafId = null;

function refreshMathJax() {
    if (!window.MathJax || typeof window.MathJax.typesetPromise !== "function") return;
    if (_mathJaxRafId !== null) return;
    _mathJaxRafId = requestAnimationFrame(() => {
        _mathJaxRafId = null;
        window.MathJax.typesetPromise();
    });
}


const distributionDescriptions = {
    normal: "Continuous, symmetric, bell-shaped distribution defined by its mean (μ) and standard deviation (σ).",
    binomial: "Discrete distribution modeling the number of successes in n independent trials with probability p.",
    poisson: "Discrete distribution for counting events in an interval when they occur at a mean rate λ.",
    studentt: "Continuous distribution similar to the normal, with heavier tails, useful for small samples.",
    chisquare: "Continuous distribution of non-negative values, common in goodness-of-fit tests and analysis of variance.",
    centralf: "Continuous distribution that compares two variances and is used in F tests (e.g. ANOVA).",
    exponential: "Continuous distribution for waiting times between events of a Poisson process, with rate λ.",
    negbin: "Discrete distribution modeling the number of failures before reaching r successes with probability p.",
    geometric: "Discrete distribution giving the number of trials until the first success with constant probability p.",
    uniform: "Continuous distribution with constant density over the interval [a, b].",
    gamma: "Continuous positive distribution for aggregated waiting times, parameterized by shape and scale.",
    beta: "Continuous distribution on [0,1], useful for modeling proportions and probabilities.",
    lognormal: "Continuous positive distribution whose logarithmic variable follows a normal distribution.",
    weibull: "Continuous positive distribution used in reliability and lifetime analysis.",
    hypergeometric: "Discrete distribution without replacement for successes in a sample drawn from a finite population.",
    bernoulli: "Discrete binary (0/1) distribution with success probability p."
};

function updateDistributionDescription(dist) {
    const descriptionEl = document.getElementById("distributionDescription");

    if (!descriptionEl) {
        return;
    }

    descriptionEl.textContent = distributionDescriptions[dist] || "";
}

const referenceLinePlugin = {
    id: "referenceLinePlugin",
    afterDatasetsDraw(chartInstance, _, pluginOptions) {
        if (!pluginOptions || !pluginOptions.enabled) {
            return;
        }

        const { xValue, yValue } = pluginOptions;

        if (!Number.isFinite(xValue) || !Number.isFinite(yValue) || yValue < 0) {
            return;
        }

        const xScale = chartInstance.scales.x;
        const yScale = chartInstance.scales.y;

        if (!xScale || !yScale) {
            return;
        }

        const xPixel = xScale.getPixelForValue(xValue);

        if (!Number.isFinite(xPixel)) {
            return;
        }

        const yBase = yScale.getPixelForValue(0);
        const yPixel = yScale.getPixelForValue(yValue);

        const { ctx } = chartInstance;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xPixel, yBase);
        ctx.lineTo(xPixel, yPixel);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#dc2626";
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();
    }
};

function formatAxisValue(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "";
    }

    const normalizedValue = Math.abs(numericValue) < 1e-10 ? 0 : numericValue;
    return Number(normalizedValue.toFixed(4)).toString();
}

const distributionSelect = document.getElementById("distribution");
const calculationSelect = document.getElementById("calculation");
const cdfModeSelect = document.getElementById("cdfMode");

if (distributionSelect) {
    distributionSelect.addEventListener("change", loadParameters);
}

if (calculationSelect) {
    calculationSelect.addEventListener("change", updateCdfControls);
}

if (cdfModeSelect) {
    cdfModeSelect.addEventListener("change", updateCdfControls);
}

function initializeDistributionPage() {
    if (!distributionSelect) {
        return;
    }

    const bodyDataset = document.body ? document.body.dataset : {};
    const params = new URLSearchParams(window.location.search);
    const preferredDistribution = (bodyDataset.defaultDistribution || params.get("dist") || "").toLowerCase();
    const shouldLockDistribution = bodyDataset.lockDistribution === "true";

    if (preferredDistribution && hasOwn(distributionLabels, preferredDistribution)) {
        distributionSelect.value = preferredDistribution;
    }

    if (shouldLockDistribution) {
        const lockedDistribution = distributionSelect.value;

        // A disabled dropdown reads as broken. Hide the <select> (keeping it in
        // the DOM so its value stays readable by the rest of the calculator)
        // and show the distribution as a static title instead.
        distributionSelect.hidden = true;
        distributionSelect.setAttribute("aria-hidden", "true");
        distributionSelect.tabIndex = -1;

        if (hasOwn(distributionLabels, lockedDistribution)) {
            const fixedTitle = document.createElement("p");
            fixedTitle.className = "distribution-fixed";
            fixedTitle.textContent = distributionLabels[lockedDistribution];
            distributionSelect.insertAdjacentElement("afterend", fixedTitle);
        }

        const distInfoEl = document.getElementById("distributionPageInfo");

        if (distInfoEl && hasOwn(distributionLabels, lockedDistribution)) {
            distInfoEl.innerText = `Specific calculator for ${distributionLabels[lockedDistribution]}.`;
        }
    }

    loadParameters();
    updateCdfControls();
}

initializeDistributionPage();


function updateCdfControls() {
    const calc = document.getElementById("calculation").value;
    const cdfModeGroup = document.getElementById("cdfModeGroup");
    const cdfMode = document.getElementById("cdfMode");
    const xValueLabel = document.getElementById("xValueLabel");
    const bValueGroup = document.getElementById("bValueGroup");

    const isCdf = calc === "cdf";

    cdfModeGroup.hidden = !isCdf;

    if (!isCdf) {
        bValueGroup.hidden = true;
        xValueLabel.innerText = calc === "quantile" ? "Probability (between 0 and 1)" : "value of x";
        return;
    }

    if (cdfMode.value === "interval") {
        xValueLabel.innerText = "value of a";
        bValueGroup.hidden = false;
        return;
    }

    xValueLabel.innerText = "value of x";
    bValueGroup.hidden = true;
}

function getCdfValue(dist, value, p1, p2) {
    if (dist === "normal") return jStat.normal.cdf(value, p1, p2);
    if (dist === "binomial") return jStat.binomial.cdf(value, p1, p2);
    if (dist === "poisson") return jStat.poisson.cdf(value, p1);
    if (dist === "studentt") return jStat.studentt.cdf(value, p1);
    if (dist === "chisquare") return jStat.chisquare.cdf(value, p1);
    if (dist === "centralf") return jStat.centralF.cdf(value, p1, p2);
    if (dist === "exponential") return jStat.exponential.cdf(value, p1);
    if (dist === "negbin") return jStat.negbin.cdf(value, p1, p2);
    if (dist === "geometric") return geometricCdf(value, p1);
    if (dist === "uniform") return uniformCdf(value, p1, p2);
    if (dist === "gamma") return jStat.gamma.cdf(value, p1, p2);
    if (dist === "beta") return jStat.beta.cdf(value, p1, p2);
    if (dist === "lognormal") return lognormalCdf(value, p1, p2);
    if (dist === "weibull") return weibullCdf(value, p1, p2);
    if (dist === "hypergeometric") return hypergeometricCdf(value, p1, p2, getHypergeometricKValue());
    if (dist === "bernoulli") return bernoulliCdf(value, p1);
    throw "Unsupported distribution";
}

function resolveCdfResult(dist, cdfMode, x, b, p1, p2) {
    if (cdfMode === "left") {
        return { value: getCdfValue(dist, x, p1, p2), label: `P(X ≤ ${x})` };
    }

    if (cdfMode === "right") {
        if (["binomial", "poisson", "negbin", "geometric", "hypergeometric", "bernoulli"].includes(dist)) {
            const adjusted = x - 1;
            return { value: 1 - getCdfValue(dist, adjusted, p1, p2), label: `P(X ≥ ${x})` };
        }

        return { value: 1 - getCdfValue(dist, x, p1, p2), label: `P(X ≥ ${x})` };
    }

    if (cdfMode === "interval") {
        if (!Number.isFinite(b)) {
            throw "You must provide a valid value for b";
        }

        if (b < x) {
            throw "The interval must satisfy a ≤ b";
        }

        if (["binomial", "poisson", "negbin", "geometric", "hypergeometric", "bernoulli"].includes(dist)) {
            const lower = x - 1;
            return {
                value: getCdfValue(dist, b, p1, p2) - getCdfValue(dist, lower, p1, p2),
                label: `P(${x} ≤ X ≤ ${b})`
            };
        }

        return {
            value: getCdfValue(dist, b, p1, p2) - getCdfValue(dist, x, p1, p2),
            label: `P(${x} ≤ X ≤ ${b})`
        };
    }

    throw "Invalid cumulative probability type";
}

function poissonQuantile(probability, lambda) {
    if (probability < 0 || probability > 1) {
        throw "The quantile requires a value between 0 and 1";
    }

    if (probability === 1) {
        return Infinity;
    }

    let k = 0;
    let cumulative = jStat.poisson.pdf(k, lambda);

    while (cumulative < probability && k < 10000) {
        k += 1;
        cumulative += jStat.poisson.pdf(k, lambda);
    }

    return k;
}

function binomialQuantile(probability, n, p) {
    if (probability < 0 || probability > 1) {
        throw "The quantile requires a value between 0 and 1";
    }

    if (!Number.isInteger(n) || n < 0) {
        throw "n must be a non-negative integer";
    }

    if (probability === 1) {
        return n;
    }

    let k = 0;
    let cumulative = jStat.binomial.pdf(k, n, p);

    while (cumulative < probability && k < n) {
        k += 1;
        cumulative += jStat.binomial.pdf(k, n, p);
    }

    return k;
}

function continuousQuantile(probability, cdfFn, lower, upper) {
    if (probability < 0 || probability > 1) {
        throw "The quantile requires a value between 0 and 1";
    }

    if (probability === 0) {
        return lower;
    }

    if (probability === 1) {
        return upper;
    }

    let left = lower;
    let right = upper;

    for (let i = 0; i < 80; i++) {
        const mid = (left + right) / 2;
        const value = cdfFn(mid);

        if (value < probability) {
            left = mid;
        } else {
            right = mid;
        }
    }

    return (left + right) / 2;
}

function geometricPmf(k, p) {
    if (k < 1 || !Number.isInteger(k)) {
        return 0;
    }

    return Math.pow(1 - p, k - 1) * p;
}

function uniformPdf(x, a, b) {
    if (b <= a) throw "The uniform interval requires b > a";
    if (x < a || x > b) return 0;
    return 1 / (b - a);
}

function uniformCdf(x, a, b) {
    if (b <= a) throw "The uniform interval requires b > a";
    if (x <= a) return 0;
    if (x >= b) return 1;
    return (x - a) / (b - a);
}

function lognormalPdf(x, mu, sigma) {
    if (sigma <= 0) throw "σ must be greater than 0";
    if (x <= 0) return 0;
    const factor = 1 / (x * sigma * Math.sqrt(2 * Math.PI));
    const exponent = -((Math.log(x) - mu) ** 2) / (2 * sigma * sigma);
    return factor * Math.exp(exponent);
}

function lognormalCdf(x, mu, sigma) {
    if (sigma <= 0) throw "σ must be greater than 0";
    if (x <= 0) return 0;
    return jStat.normal.cdf((Math.log(x) - mu) / sigma, 0, 1);
}

function weibullPdf(x, shape, scale) {
    if (shape <= 0 || scale <= 0) throw "Shape and scale must be greater than 0";
    if (x < 0) return 0;
    const xs = x / scale;
    return (shape / scale) * (xs ** (shape - 1)) * Math.exp(-(xs ** shape));
}

function weibullCdf(x, shape, scale) {
    if (shape <= 0 || scale <= 0) throw "Shape and scale must be greater than 0";
    if (x <= 0) return 0;
    return 1 - Math.exp(-((x / scale) ** shape));
}

function bernoulliPmf(x, p) {
    if (x === 1) return p;
    if (x === 0) return 1 - p;
    return 0;
}

function bernoulliCdf(x, p) {
    if (x < 0) return 0;
    if (x < 1) return 1 - p;
    return 1;
}

function combination(n, k) {
    if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < 0 || k > n) {
        return 0;
    }
    return jStat.combination(n, k);
}

function hypergeometricPmf(x, N, K, n) {
    if (![N, K, n].every(Number.isInteger)) throw "N, K and n must be integers";
    if (!(N > 0 && K >= 0 && n >= 0 && K <= N && n <= N)) throw "Invalid hypergeometric parameters";
    if (!Number.isInteger(x)) return 0;
    const minX = Math.max(0, n - (N - K));
    const maxX = Math.min(n, K);
    if (x < minX || x > maxX) return 0;
    const numerator = combination(K, x) * combination(N - K, n - x);
    const denominator = combination(N, n);
    return denominator === 0 ? 0 : numerator / denominator;
}

function hypergeometricCdf(x, N, K, n) {
    const floorX = Math.floor(x);
    const minX = Math.max(0, n - (N - K));
    const maxX = Math.min(n, K);
    if (floorX < minX) return 0;
    if (floorX >= maxX) return 1;
    let cumulative = 0;
    for (let i = minX; i <= floorX; i++) {
        cumulative += hypergeometricPmf(i, N, K, n);
    }
    return cumulative;
}

function hypergeometricQuantile(probability, N, K, n) {
    if (probability < 0 || probability > 1) throw "The quantile requires a value between 0 and 1";
    const minX = Math.max(0, n - (N - K));
    const maxX = Math.min(n, K);
    let cumulative = 0;
    for (let i = minX; i <= maxX; i++) {
        cumulative += hypergeometricPmf(i, N, K, n);
        if (cumulative >= probability) return i;
    }
    return maxX;
}

function getHypergeometricKValue() {
    const kEl = document.getElementById("param3");
    return kEl ? parseFloat(kEl.value) : NaN;
}

function geometricCdf(k, p) {
    if (k < 1) {
        return 0;
    }

    return 1 - Math.pow(1 - p, Math.floor(k));
}

function geometricQuantile(probability, p) {
    if (probability < 0 || probability > 1) {
        throw "The quantile requires a value between 0 and 1";
    }

    if (probability === 1) {
        return Infinity;
    }

    return Math.ceil(Math.log(1 - probability) / Math.log(1 - p));
}

function negativeBinomialQuantile(probability, r, p) {
    if (probability < 0 || probability > 1) {
        throw "The quantile requires a value between 0 and 1";
    }

    if (probability === 1) {
        return Infinity;
    }

    let k = 0;
    let cumulative = jStat.negbin.pdf(k, r, p);

    while (cumulative < probability && k < 10000) {
        k += 1;
        cumulative += jStat.negbin.pdf(k, r, p);
    }

    return k;
}

function loadParameters() {
    const dist = document.getElementById("distribution").value;
    const container = document.getElementById("parameters");

    updateDistributionDescription(dist);

    if (dist === "normal") {
        container.innerHTML = `
            <div class="form-group">
                <label>Mean (μ)</label>
                <input type="number" id="param1" value="0">
            </div>
            <div class="form-group">
                <label>Standard deviation (σ)</label>
                <input type="number" id="param2" value="1" min="0.0001">
            </div>
        `;
    }

    if (dist === "binomial") {
        container.innerHTML = `
            <div class="form-group">
                <label>n</label>
                <input type="number" id="param1" value="10" min="1">
            </div>
            <div class="form-group">
                <label>p (between 0 and 1)</label>
                <input type="number" id="param2" value="0.5" step="0.01" min="0" max="1">
            </div>
        `;
    }

    if (dist === "poisson") {
        container.innerHTML = `
            <div class="form-group">
                <label>λ</label>
                <input type="number" id="param1" value="4" min="0.0001">
            </div>
        `;
    }

    if (dist === "studentt") {
        container.innerHTML = `
            <div class="form-group">
                <label>Degrees of freedom (ν)</label>
                <input type="number" id="param1" value="10" min="1" step="1">
            </div>
        `;
    }

    if (dist === "chisquare") {
        container.innerHTML = `
            <div class="form-group">
                <label>Degrees of freedom (k)</label>
                <input type="number" id="param1" value="8" min="1" step="1">
            </div>
        `;
    }

    if (dist === "centralf") {
        container.innerHTML = `
            <div class="form-group">
                <label>Degrees of freedom (d1)</label>
                <input type="number" id="param1" value="5" min="1" step="1">
            </div>
            <div class="form-group">
                <label>Degrees of freedom (d2)</label>
                <input type="number" id="param2" value="10" min="1" step="1">
            </div>
        `;
    }

    if (dist === "exponential") {
        container.innerHTML = `
            <div class="form-group">
                <label>Rate (λ)</label>
                <input type="number" id="param1" value="1" min="0.0001" step="0.1">
            </div>
        `;
    }

    if (dist === "negbin") {
        container.innerHTML = `
            <div class="form-group">
                <label>r (target successes)</label>
                <input type="number" id="param1" value="5" min="1" step="1">
            </div>
            <div class="form-group">
                <label>p (between 0 and 1)</label>
                <input type="number" id="param2" value="0.4" step="0.01" min="0.0001" max="0.9999">
            </div>
        `;
    }

    if (dist === "geometric") {
        container.innerHTML = `
            <div class="form-group">
                <label>p (between 0 and 1)</label>
                <input type="number" id="param1" value="0.3" step="0.01" min="0.0001" max="0.9999">
            </div>
        `;
    }

    if (dist === "uniform") {
        container.innerHTML = `
            <div class="form-group">
                <label>a (minimum)</label>
                <input type="number" id="param1" value="0">
            </div>
            <div class="form-group">
                <label>b (maximum)</label>
                <input type="number" id="param2" value="1">
            </div>
        `;
    }

    if (dist === "gamma") {
        container.innerHTML = `
            <div class="form-group">
                <label>Shape (k)</label>
                <input type="number" id="param1" value="2" min="0.0001" step="0.1">
            </div>
            <div class="form-group">
                <label>Scale (θ)</label>
                <input type="number" id="param2" value="2" min="0.0001" step="0.1">
            </div>
        `;
    }

    if (dist === "beta") {
        container.innerHTML = `
            <div class="form-group">
                <label>α (alpha)</label>
                <input type="number" id="param1" value="2" min="0.0001" step="0.1">
            </div>
            <div class="form-group">
                <label>β (beta)</label>
                <input type="number" id="param2" value="5" min="0.0001" step="0.1">
            </div>
        `;
    }

    if (dist === "lognormal") {
        container.innerHTML = `
            <div class="form-group">
                <label>μ (log mean)</label>
                <input type="number" id="param1" value="0" step="0.1">
            </div>
            <div class="form-group">
                <label>σ (log st. dev.)</label>
                <input type="number" id="param2" value="0.5" min="0.0001" step="0.1">
            </div>
        `;
    }

    if (dist === "weibull") {
        container.innerHTML = `
            <div class="form-group">
                <label>Shape (k)</label>
                <input type="number" id="param1" value="1.5" min="0.0001" step="0.1">
            </div>
            <div class="form-group">
                <label>Scale (λ)</label>
                <input type="number" id="param2" value="1" min="0.0001" step="0.1">
            </div>
        `;
    }

    if (dist === "hypergeometric") {
        container.innerHTML = `
            <div class="form-group">
                <label>N (population)</label>
                <input type="number" id="param1" value="50" min="1" step="1">
            </div>
            <div class="form-group">
                <label>K (successes in population)</label>
                <input type="number" id="param2" value="15" min="0" step="1">
            </div>
            <div class="form-group">
                <label>n (sample size)</label>
                <input type="number" id="param3" value="10" min="0" step="1">
            </div>
        `;
    }

    if (dist === "bernoulli") {
        container.innerHTML = `
            <div class="form-group">
                <label>p (success = 1)</label>
                <input type="number" id="param1" value="0.5" step="0.01" min="0.0001" max="0.9999">
            </div>
        `;
    }
}

function calculate() {

    const dist = document.getElementById("distribution").value;
    const calc = document.getElementById("calculation").value;
    const x = parseFloat(document.getElementById("xValue").value);
    const b = document.getElementById("bValue") ? parseFloat(document.getElementById("bValue").value) : null;
    const cdfMode = document.getElementById("cdfMode").value;
    const p1 = parseFloat(document.getElementById("param1").value);
    const p2 = document.getElementById("param2") ?
               parseFloat(document.getElementById("param2").value) : null;
    const p3 = document.getElementById("param3") ?
               parseFloat(document.getElementById("param3").value) : null;

    let result = null;

    try {

        if (dist === "normal") {
            if (calc === "pdf") result = jStat.normal.pdf(x, p1, p2);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") {
                if (x < 0 || x > 1) throw "The quantile requires a value between 0 and 1";
                result = jStat.normal.inv(x, p1, p2);
            }
        }

        if (dist === "binomial") {
            if (calc === "pdf") result = jStat.binomial.pdf(x, p1, p2);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") {
                if (x < 0 || x > 1) throw "The quantile requires a value between 0 and 1";
                result = binomialQuantile(x, p1, p2);
            }
        }

        if (dist === "poisson") {
            if (calc === "pdf") result = jStat.poisson.pdf(x, p1);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") {
                if (x < 0 || x > 1) throw "The quantile requires a value between 0 and 1";
                result = poissonQuantile(x, p1);
            }
        }

        if (dist === "studentt") {
            if (calc === "pdf") result = jStat.studentt.pdf(x, p1);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") {
                result = continuousQuantile(x, (v) => jStat.studentt.cdf(v, p1), -100, 100);
            }
        }

        if (dist === "chisquare") {
            if (calc === "pdf") result = jStat.chisquare.pdf(x, p1);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") {
                result = continuousQuantile(x, (v) => jStat.chisquare.cdf(v, p1), 0, Math.max(200, p1 * 15));
            }
        }

        if (dist === "centralf") {
            if (calc === "pdf") result = jStat.centralF.pdf(x, p1, p2);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") {
                result = continuousQuantile(x, (v) => jStat.centralF.cdf(v, p1, p2), 0, 100);
            }
        }

        if (dist === "exponential") {
            if (calc === "pdf") result = jStat.exponential.pdf(x, p1);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") {
                result = jStat.exponential.inv(x, p1);
            }
        }

        if (dist === "negbin") {
            if (calc === "pdf") result = jStat.negbin.pdf(x, p1, p2);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") {
                result = negativeBinomialQuantile(x, p1, p2);
            }
        }

        if (dist === "geometric") {
            if (calc === "pdf") result = geometricPmf(x, p1);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") {
                result = geometricQuantile(x, p1);
            }
        }

        if (dist === "uniform") {
            if (calc === "pdf") result = uniformPdf(x, p1, p2);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") result = p1 + x * (p2 - p1);
        }

        if (dist === "gamma") {
            if (calc === "pdf") result = jStat.gamma.pdf(x, p1, p2);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") result = continuousQuantile(x, (v) => jStat.gamma.cdf(v, p1, p2), 0, Math.max(200, p1 * p2 * 12));
        }

        if (dist === "beta") {
            if (calc === "pdf") result = jStat.beta.pdf(x, p1, p2);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") result = continuousQuantile(x, (v) => jStat.beta.cdf(v, p1, p2), 0, 1);
        }

        if (dist === "lognormal") {
            if (calc === "pdf") result = lognormalPdf(x, p1, p2);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") result = Math.exp(jStat.normal.inv(x, p1, p2));
        }

        if (dist === "weibull") {
            if (calc === "pdf") result = weibullPdf(x, p1, p2);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") result = p2 * ((-Math.log(1 - x)) ** (1 / p1));
        }

        if (dist === "hypergeometric") {
            if (calc === "pdf") result = hypergeometricPmf(x, p1, p2, p3);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") result = hypergeometricQuantile(x, p1, p2, p3);
        }

        if (dist === "bernoulli") {
            if (calc === "pdf") result = bernoulliPmf(x, p1);
            if (calc === "cdf") result = resolveCdfResult(dist, cdfMode, x, b, p1, p2).value;
            if (calc === "quantile") result = x <= 1 - p1 ? 0 : 1;
        }

        if (result === null || isNaN(result)) throw "Invalid values";

        let resultLabel = "Result";

        if (calc === "cdf") {
            resultLabel = resolveCdfResult(dist, cdfMode, x, b, p1, p2).label;
        }

        document.getElementById("result").innerText =
            `${resultLabel}: ${result.toFixed(6)}`;

        drawChart(dist, p1, p2, calc, x, cdfMode, b, calc === "quantile" ? result : null);

    } catch (error) {
        document.getElementById("result").innerText = "Error: " + error;
    }
}


function shouldShadePoint(dist, point, cdfMode, xValue, bValue) {
    if (cdfMode === "left") {
        return point <= xValue;
    }

    if (cdfMode === "right") {
        return point >= xValue;
    }

    if (cdfMode === "interval") {
        return point >= xValue && point <= bValue;
    }

    return false;
}

function shouldShadeQuantilePoint(point, quantileValue) {
    return Number.isFinite(quantileValue) && point <= quantileValue;
}

function drawChart(dist, p1, p2, calc, xValue, cdfMode = "left", bValue = null, quantileValue = null) {

    const ctx = document.getElementById("chart").getContext("2d");

    if (chart) chart.destroy();

    let labels = [];
    let data = [];
    let backgroundColors = [];

    if (dist === "normal") {
        const points = 160;
        const start = p1 - 4 * p2;
        const end = p1 + 4 * p2;
        const range = end - start;

        for (let i = 0; i <= points; i++) {
            const xPoint = Number((start + (i * range) / points).toFixed(4));

            labels.push(xPoint);
            let y = jStat.normal.pdf(xPoint, p1, p2);
            data.push(y);

            if ((calc === "cdf" && shouldShadePoint(dist, xPoint, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(xPoint, quantileValue)))
                backgroundColors.push("rgba(37, 99, 235, 0.3)");
            else
                backgroundColors.push("rgba(37, 99, 235, 0.05)");
        }
    }

    if (dist === "uniform") {
        const points = 120;
        const start = p1 - (p2 - p1) * 0.2;
        const end = p2 + (p2 - p1) * 0.2;
        const range = end - start;

        for (let i = 0; i <= points; i++) {
            const xPoint = Number((start + (i * range) / points).toFixed(4));
            labels.push(xPoint);
            data.push(uniformPdf(xPoint, p1, p2));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, xPoint, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(xPoint, quantileValue)) ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.05)"
            );
        }
    }

    if (dist === "gamma") {
        const points = 220;
        const start = 0;
        const end = Math.max(20, p1 * p2 * 4);
        const range = end - start;

        for (let i = 0; i <= points; i++) {
            const xPoint = Number((start + (i * range) / points).toFixed(4));
            labels.push(xPoint);
            data.push(jStat.gamma.pdf(xPoint, p1, p2));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, xPoint, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(xPoint, quantileValue)) ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.05)"
            );
        }
    }

    if (dist === "beta") {
        const points = 200;
        const start = 0;
        const end = 1;
        const range = end - start;

        for (let i = 0; i <= points; i++) {
            const xPoint = Number((start + (i * range) / points).toFixed(4));
            labels.push(xPoint);
            data.push(jStat.beta.pdf(xPoint, p1, p2));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, xPoint, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(xPoint, quantileValue)) ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.05)"
            );
        }
    }

    if (dist === "lognormal") {
        const points = 220;
        const start = 0.0001;
        const end = Math.max(20, Math.exp(p1 + 4 * p2));
        const range = end - start;

        for (let i = 0; i <= points; i++) {
            const xPoint = Number((start + (i * range) / points).toFixed(4));
            labels.push(xPoint);
            data.push(lognormalPdf(xPoint, p1, p2));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, xPoint, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(xPoint, quantileValue)) ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.05)"
            );
        }
    }

    if (dist === "weibull") {
        const points = 220;
        const start = 0;
        const end = Math.max(15, p2 * 5);
        const range = end - start;

        for (let i = 0; i <= points; i++) {
            const xPoint = Number((start + (i * range) / points).toFixed(4));
            labels.push(xPoint);
            data.push(weibullPdf(xPoint, p1, p2));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, xPoint, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(xPoint, quantileValue)) ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.05)"
            );
        }
    }

    if (dist === "hypergeometric") {
        const N = p1;
        const K = p2;
        const n = getHypergeometricKValue();
        const minX = Math.max(0, n - (N - K));
        const maxX = Math.min(n, K);

        for (let i = minX; i <= maxX; i++) {
            labels.push(i);
            data.push(hypergeometricPmf(i, N, K, n));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, i, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(i, quantileValue)) ? "rgba(37, 99, 235, 0.5)" : "rgba(37, 99, 235, 0.2)"
            );
        }
    }

    if (dist === "bernoulli") {
        for (let i = 0; i <= 1; i++) {
            labels.push(i);
            data.push(bernoulliPmf(i, p1));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, i, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(i, quantileValue)) ? "rgba(37, 99, 235, 0.5)" : "rgba(37, 99, 235, 0.2)"
            );
        }
    }

    if (dist === "binomial") {
        for (let i = 0; i <= p1; i++) {
            labels.push(i);
            let y = jStat.binomial.pdf(i, p1, p2);
            data.push(y);

            if ((calc === "cdf" && shouldShadePoint(dist, i, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(i, quantileValue)))
                backgroundColors.push("rgba(37, 99, 235, 0.5)");
            else
                backgroundColors.push("rgba(37, 99, 235, 0.2)");
        }
    }

    if (dist === "poisson") {
        for (let i = 0; i <= p1*3; i++) {
            labels.push(i);
            let y = jStat.poisson.pdf(i, p1);
            data.push(y);

            if ((calc === "cdf" && shouldShadePoint(dist, i, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(i, quantileValue)))
                backgroundColors.push("rgba(37, 99, 235, 0.5)");
            else
                backgroundColors.push("rgba(37, 99, 235, 0.2)");
        }
    }

    if (dist === "studentt") {
        const points = 200;
        const start = -6;
        const end = 6;
        const range = end - start;

        for (let i = 0; i <= points; i++) {
            const xPoint = Number((start + (i * range) / points).toFixed(4));
            labels.push(xPoint);
            data.push(jStat.studentt.pdf(xPoint, p1));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, xPoint, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(xPoint, quantileValue)) ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.05)"
            );
        }
    }

    if (dist === "chisquare") {
        const points = 200;
        const start = 0;
        const end = Math.max(30, p1 * 3);
        const range = end - start;

        for (let i = 0; i <= points; i++) {
            const xPoint = Number((start + (i * range) / points).toFixed(4));
            labels.push(xPoint);
            data.push(jStat.chisquare.pdf(xPoint, p1));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, xPoint, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(xPoint, quantileValue)) ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.05)"
            );
        }
    }

    if (dist === "centralf") {
        const points = 200;
        const start = 0;
        const end = 10;
        const range = end - start;

        for (let i = 0; i <= points; i++) {
            const xPoint = Number((start + (i * range) / points).toFixed(4));
            labels.push(xPoint);
            data.push(jStat.centralF.pdf(xPoint, p1, p2));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, xPoint, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(xPoint, quantileValue)) ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.05)"
            );
        }
    }

    if (dist === "exponential") {
        const points = 200;
        const start = 0;
        const end = Math.max(10 / p1, 5);
        const range = end - start;

        for (let i = 0; i <= points; i++) {
            const xPoint = Number((start + (i * range) / points).toFixed(4));
            labels.push(xPoint);
            data.push(jStat.exponential.pdf(xPoint, p1));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, xPoint, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(xPoint, quantileValue)) ? "rgba(37, 99, 235, 0.3)" : "rgba(37, 99, 235, 0.05)"
            );
        }
    }

    if (dist === "negbin") {
        const maxX = Math.max(20, Math.ceil((p1 * (1 - p2)) / p2) + 20);

        for (let i = 0; i <= maxX; i++) {
            labels.push(i);
            data.push(jStat.negbin.pdf(i, p1, p2));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, i, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(i, quantileValue)) ? "rgba(37, 99, 235, 0.5)" : "rgba(37, 99, 235, 0.2)"
            );
        }
    }

    if (dist === "geometric") {
        const maxX = Math.max(15, Math.ceil(8 / p1));

        for (let i = 1; i <= maxX; i++) {
            labels.push(i);
            data.push(geometricPmf(i, p1));
            backgroundColors.push(
                (calc === "cdf" && shouldShadePoint(dist, i, cdfMode, xValue, bValue)) ||
                (calc === "quantile" && shouldShadeQuantilePoint(i, quantileValue)) ? "rgba(37, 99, 235, 0.5)" : "rgba(37, 99, 235, 0.2)"
            );
        }
    }

    const discreteDistributions = ["binomial", "poisson", "negbin", "geometric", "hypergeometric", "bernoulli"];
    const isDiscrete = discreteDistributions.includes(dist);
    const referenceXValue = calc === "quantile" ? quantileValue : xValue;
    const shouldShowReferenceLine = (calc === "pdf" || calc === "quantile") && Number.isFinite(referenceXValue);

    const shadedData = data.map((y, index) => {
        const point = labels[index];
        return (calc === "cdf" && shouldShadePoint(dist, point, cdfMode, xValue, bValue)) ||
            (calc === "quantile" && shouldShadeQuantilePoint(point, quantileValue)) ? y : null;
    });
    const plotData = labels.map((xPoint, index) => ({ x: xPoint, y: data[index] }));
    const shadedPlotData = labels.map((xPoint, index) => ({ x: xPoint, y: shadedData[index] }));

    const datasets = isDiscrete
        ? [{
            data: plotData,
            borderColor: "#2563eb",
            backgroundColor: backgroundColors,
            fill: false,
            tension: 0.3
        }]
        : [{
            data: shadedPlotData,
            borderColor: "rgba(37, 99, 235, 0)",
            backgroundColor: "rgba(37, 99, 235, 0.3)",
            fill: "origin",
            pointRadius: 0,
            tension: 0.3
        }, {
            data: plotData,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.05)",
            fill: false,
            pointRadius: 0,
            tension: 0.3
        }];

    const densityAtX = (() => {
        if (!Number.isFinite(referenceXValue)) {
            return null;
        }

        if (dist === "normal") return jStat.normal.pdf(referenceXValue, p1, p2);
        if (dist === "binomial") return jStat.binomial.pdf(referenceXValue, p1, p2);
        if (dist === "poisson") return jStat.poisson.pdf(referenceXValue, p1);
        if (dist === "studentt") return jStat.studentt.pdf(referenceXValue, p1);
        if (dist === "chisquare") return jStat.chisquare.pdf(referenceXValue, p1);
        if (dist === "centralf") return jStat.centralF.pdf(referenceXValue, p1, p2);
        if (dist === "exponential") return jStat.exponential.pdf(referenceXValue, p1);
        if (dist === "negbin") return jStat.negbin.pdf(referenceXValue, p1, p2);
        if (dist === "geometric") return geometricPmf(referenceXValue, p1);
        if (dist === "uniform") return uniformPdf(referenceXValue, p1, p2);
        if (dist === "gamma") return jStat.gamma.pdf(referenceXValue, p1, p2);
        if (dist === "beta") return jStat.beta.pdf(referenceXValue, p1, p2);
        if (dist === "lognormal") return lognormalPdf(referenceXValue, p1, p2);
        if (dist === "weibull") return weibullPdf(referenceXValue, p1, p2);
        if (dist === "hypergeometric") return hypergeometricPmf(referenceXValue, p1, p2, getHypergeometricKValue());
        if (dist === "bernoulli") return bernoulliPmf(referenceXValue, p1);
        return null;
    })();

    chart = new Chart(ctx, {
        type: isDiscrete ? "bar" : "line",
        plugins: [referenceLinePlugin],
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                referenceLinePlugin: {
                    enabled: shouldShowReferenceLine,
                    xValue: referenceXValue,
                    yValue: densityAtX
                }
            },
            scales: {
                x: {
                    type: "linear",
                    offset: false,
                    grid: {
                        offset: false
                    },
                    ticks: {
                        stepSize: 1,
                        autoSkip: true,
                        maxTicksLimit: 14,
                        callback: (value) => formatAxisValue(value)
                    }
                }
            }
        }
    });
}

function updateSampleSizeControls() {
    const typeEl = document.getElementById("sampleSizeType");
    const onePropInputs = document.getElementById("onePropInputs");
    const twoPropInputs = document.getElementById("twoPropInputs");
    const oneMeanInputs = document.getElementById("oneMeanInputs");
    const twoMeanInputs = document.getElementById("twoMeanInputs");

    const twoPropAllocation = document.getElementById("twoPropAllocation");
    const twoPropRatioGroup = document.getElementById("twoPropRatioGroup");
    const twoMeanAllocation = document.getElementById("twoMeanAllocation");
    const twoMeanRatioGroup = document.getElementById("twoMeanRatioGroup");

    if (!typeEl || !onePropInputs || !twoPropInputs || !oneMeanInputs || !twoMeanInputs) {
        return;
    }

    onePropInputs.hidden = typeEl.value !== "oneprop";
    twoPropInputs.hidden = typeEl.value !== "twoprop";
    oneMeanInputs.hidden = typeEl.value !== "onemean";
    twoMeanInputs.hidden = typeEl.value !== "twomean";

    if (twoPropAllocation && twoPropRatioGroup) {
        twoPropRatioGroup.hidden = typeEl.value !== "twoprop" || twoPropAllocation.value !== "custom";
    }

    if (twoMeanAllocation && twoMeanRatioGroup) {
        twoMeanRatioGroup.hidden = typeEl.value !== "twomean" || twoMeanAllocation.value !== "custom";
    }

    renderSampleSizeFormula(typeEl.value);
}

function validateProbability(value, name) {
    if (!Number.isFinite(value) || value <= 0 || value >= 1) {
        throw `${name} must be between 0 and 1 (excluding endpoints)`;
    }
}

function validatePositive(value, name) {
    if (!Number.isFinite(value) || value <= 0) {
        throw `${name} must be greater than 0`;
    }
}

function getStandardNormalQuantile(probability) {
    return jStat.normal.inv(probability, 0, 1);
}

function getAllocationRatio(allocationId, ratioId) {
    const allocationEl = document.getElementById(allocationId);
    const ratioEl = document.getElementById(ratioId);

    if (!allocationEl || allocationEl.value === "equal") {
        return 1;
    }

    const k = ratioEl ? parseFloat(ratioEl.value) : NaN;

    if (!Number.isFinite(k) || k <= 0) {
        throw "The ratio n2/n1 (k) must be greater than 0";
    }

    return k;
}

function calculateSampleSize() {
    const resultEl = document.getElementById("sampleSizeResult");
    const typeEl = document.getElementById("sampleSizeType");

    if (!resultEl || !typeEl) {
        return;
    }

    try {
        if (typeEl.value === "oneprop") {
            const p = parseFloat(document.getElementById("onePropP").value);
            const e = parseFloat(document.getElementById("onePropE").value);
            const confidence = parseFloat(document.getElementById("onePropConfidence").value);

            validateProbability(p, "p");
            validateProbability(e, "E");
            validateProbability(confidence, "The confidence level");

            const alpha = 1 - confidence;
            const z = getStandardNormalQuantile(1 - (alpha / 2));
            const n = Math.ceil((Math.pow(z, 2) * p * (1 - p)) / Math.pow(e, 2));
            renderSampleSizeFormula("oneprop", { z, p, e });

            resultEl.innerText = `Recommended minimum n: ${n} observations (one proportion, ${Math.round(confidence * 100)}% confidence).`;
            return;
        }

        if (typeEl.value === "twoprop") {
            const p1 = parseFloat(document.getElementById("twoPropP1").value);
            const p2 = parseFloat(document.getElementById("twoPropP2").value);
            const alpha = parseFloat(document.getElementById("twoPropAlpha").value);
            const power = parseFloat(document.getElementById("twoPropPower").value);
            const k = getAllocationRatio("twoPropAllocation", "twoPropRatio");

            validateProbability(p1, "p1");
            validateProbability(p2, "p2");
            validateProbability(alpha, "α");
            validateProbability(power, "the power");

            const diff = Math.abs(p1 - p2);
            validatePositive(diff, "|p1 - p2|");

            const zAlpha = getStandardNormalQuantile(1 - (alpha / 2));
            const zBeta = getStandardNormalQuantile(power);
            const pBar = (p1 + (k * p2)) / (1 + k);

            const term1 = zAlpha * Math.sqrt((1 + (1 / k)) * pBar * (1 - pBar));
            const term2 = zBeta * Math.sqrt((p1 * (1 - p1)) + ((p2 * (1 - p2)) / k));

            const n1 = Math.ceil(Math.pow(term1 + term2, 2) / Math.pow(diff, 2));
            const n2 = Math.ceil(k * n1);
            const nTotal = n1 + n2;

            renderSampleSizeFormula("twoprop", { zAlpha, zBeta, pBar, p1, p2, diff, k });

            if (Math.abs(k - 1) < 1e-10) {
                resultEl.innerText = `Minimum n per group: ${n1} (total: ${nTotal}) to detect |p1 - p2| = ${diff.toFixed(3)}.`;
            } else {
                resultEl.innerText = `Minimum n group 1: ${n1}; group 2: ${n2} (k = ${k.toFixed(2)}, total: ${nTotal}) to detect |p1 - p2| = ${diff.toFixed(3)}.`;
            }
            return;
        }

        if (typeEl.value === "onemean") {
            const sigma = parseFloat(document.getElementById("oneMeanSigma").value);
            const e = parseFloat(document.getElementById("oneMeanE").value);
            const confidence = parseFloat(document.getElementById("oneMeanConfidence").value);

            validatePositive(sigma, "σ");
            validatePositive(e, "E");
            validateProbability(confidence, "The confidence level");

            const alpha = 1 - confidence;
            const z = getStandardNormalQuantile(1 - (alpha / 2));
            const n = Math.ceil(Math.pow((z * sigma) / e, 2));

            renderSampleSizeFormula("onemean", { z, sigma, e });
            resultEl.innerText = `Recommended minimum n: ${n} observations (one mean, ${Math.round(confidence * 100)}% confidence).`;
            return;
        }

        if (typeEl.value === "twomean") {
            const sigma1 = parseFloat(document.getElementById("twoMeanSigma1").value);
            const sigma2 = parseFloat(document.getElementById("twoMeanSigma2").value);
            const delta = parseFloat(document.getElementById("twoMeanDelta").value);
            const alpha = parseFloat(document.getElementById("twoMeanAlpha").value);
            const power = parseFloat(document.getElementById("twoMeanPower").value);
            const k = getAllocationRatio("twoMeanAllocation", "twoMeanRatio");

            validatePositive(sigma1, "σ1");
            validatePositive(sigma2, "σ2");
            validatePositive(delta, "Δ");
            validateProbability(alpha, "α");
            validateProbability(power, "the power");

            const zAlpha = getStandardNormalQuantile(1 - (alpha / 2));
            const zBeta = getStandardNormalQuantile(power);

            const n1 = Math.ceil((Math.pow(zAlpha + zBeta, 2) * (Math.pow(sigma1, 2) + (Math.pow(sigma2, 2) / k))) / Math.pow(delta, 2));
            const n2 = Math.ceil(k * n1);
            const nTotal = n1 + n2;

            renderSampleSizeFormula("twomean", { zAlpha, zBeta, sigma1, sigma2, delta, k });

            if (Math.abs(k - 1) < 1e-10) {
                resultEl.innerText = `Minimum n per group: ${n1} (total: ${nTotal}) to detect Δ = ${delta.toFixed(3)}.`;
            } else {
                resultEl.innerText = `Minimum n group 1: ${n1}; group 2: ${n2} (k = ${k.toFixed(2)}, total: ${nTotal}) to detect Δ = ${delta.toFixed(3)}.`;
            }
            return;
        }

        throw "Unsupported calculation type";
    } catch (error) {
        resultEl.innerText = `Error: ${error}`;
    }
}

function initSampleSizeSection() {
    const typeEl = document.getElementById("sampleSizeType");
    const twoPropAllocation = document.getElementById("twoPropAllocation");
    const twoMeanAllocation = document.getElementById("twoMeanAllocation");

    if (!typeEl) {
        return;
    }

    typeEl.addEventListener("change", updateSampleSizeControls);

    if (twoPropAllocation) {
        twoPropAllocation.addEventListener("change", updateSampleSizeControls);
    }

    if (twoMeanAllocation) {
        twoMeanAllocation.addEventListener("change", updateSampleSizeControls);
    }

    updateSampleSizeControls();
}

initSampleSizeSection();

function renderSampleSizeFormula(type, values = null) {
    const formulaEl = document.getElementById("sampleSizeFormula");

    if (!formulaEl) {
        return;
    }

    if (type === "oneprop") {
        if (!values) {
            formulaEl.innerHTML = '<strong>Formula used (one proportion):</strong><p class="formula-line">\\( n = \\frac{Z^2 \\cdot p \\cdot (1-p)}{E^2} \\)</p>';
            refreshMathJax();
            return;
        }

        formulaEl.innerHTML = `<strong>Formula used (one proportion):</strong><p class="formula-line">\\( n = \\frac{Z^2 \\cdot p \\cdot (1-p)}{E^2} \\)</p><p class="formula-line">\\( n = \\frac{${values.z.toFixed(4)}^2 \\cdot ${values.p.toFixed(4)} \\cdot (1-${values.p.toFixed(4)})}{${values.e.toFixed(4)}^2} \\)</p>`;
        refreshMathJax();
        return;
    }

    if (type === "twoprop") {
        const kPreview = values ? values.k : (() => {
            try { return getAllocationRatio("twoPropAllocation", "twoPropRatio"); } catch (_) { return 1; }
        })();

        if (!values) {
            if (Math.abs(kPreview - 1) < 1e-10) {
                formulaEl.innerHTML = '<strong>Formula used (two proportions, n per group):</strong><p class="formula-line">\\( n = \\frac{(Z_{\\alpha/2}\\sqrt{2\\bar{p}(1-\\bar{p})} + Z_\\beta\\sqrt{p_1(1-p_1)+p_2(1-p_2)})^2}{(p_1-p_2)^2} \\)</p>';
            } else {
                formulaEl.innerHTML = `<strong>Formula used (two proportions, unequal groups):</strong><p class="formula-line">\\( n_1 = \\frac{(Z_{\\alpha/2}\\sqrt{(1+1/k)\\bar{p}(1-\\bar{p})} + Z_\\beta\\sqrt{p_1(1-p_1)+\\frac{p_2(1-p_2)}{k}})^2}{(p_1-p_2)^2} \\)</p><p class="formula-line">\\( n_2 = k n_1,\\; \\bar{p}=\\frac{p_1 + kp_2}{1+k},\\; k=${kPreview.toFixed(3)} \\)</p>`;
            }
            refreshMathJax();
            return;
        }

        if (Math.abs(values.k - 1) < 1e-10) {
            formulaEl.innerHTML = `<strong>Formula used (two proportions, n per group):</strong><p class="formula-line">\\( n = \\frac{(Z_{\\alpha/2}\\sqrt{2\\bar{p}(1-\\bar{p})} + Z_\\beta\\sqrt{p_1(1-p_1)+p_2(1-p_2)})^2}{(p_1-p_2)^2} \\)</p><p class="formula-line">\\( n = \\frac{(${values.zAlpha.toFixed(4)}\\sqrt{2\\cdot${values.pBar.toFixed(4)}(1-${values.pBar.toFixed(4)})} + ${values.zBeta.toFixed(4)}\\sqrt{${values.p1.toFixed(4)}(1-${values.p1.toFixed(4)})+${values.p2.toFixed(4)}(1-${values.p2.toFixed(4)})})^2}{(${values.diff.toFixed(4)})^2} \\)</p>`;
        } else {
            formulaEl.innerHTML = `<strong>Formula used (two proportions, unequal groups):</strong><p class="formula-line">\\( n_1 = \\frac{(Z_{\\alpha/2}\\sqrt{(1+1/k)\\bar{p}(1-\\bar{p})} + Z_\\beta\\sqrt{p_1(1-p_1)+\\frac{p_2(1-p_2)}{k}})^2}{(p_1-p_2)^2} \\)</p><p class="formula-line">\\( n_2 = k n_1,\\; \\bar{p}=\\frac{p_1 + kp_2}{1+k} \\)</p>`;
        }
        refreshMathJax();
        return;
    }

    if (type === "onemean") {
        if (!values) {
            formulaEl.innerHTML = '<strong>Formula used (one mean):</strong><p class="formula-line">\\( n = \\left(\\frac{Z \\cdot \\sigma}{E}\\right)^2 \\)</p>';
            refreshMathJax();
            return;
        }

        formulaEl.innerHTML = `<strong>Formula used (one mean):</strong><p class="formula-line">\\( n = \\left(\\frac{Z \\cdot \\sigma}{E}\\right)^2 \\)</p><p class="formula-line">\\( n = \\left(\\frac{${values.z.toFixed(4)} \\cdot ${values.sigma.toFixed(4)}}{${values.e.toFixed(4)}}\\right)^2 \\)</p>`;
        refreshMathJax();
        return;
    }

    if (type === "twomean") {
        const kPreview = values ? values.k : (() => {
            try { return getAllocationRatio("twoMeanAllocation", "twoMeanRatio"); } catch (_) { return 1; }
        })();

        if (!values) {
            if (Math.abs(kPreview - 1) < 1e-10) {
                formulaEl.innerHTML = '<strong>Formula used (difference of means, n per group):</strong><p class="formula-line">\\( n = \\frac{(Z_{\\alpha/2}+Z_\\beta)^2(\\sigma_1^2+\\sigma_2^2)}{\\Delta^2} \\)</p>';
            } else {
                formulaEl.innerHTML = `<strong>Formula used (difference of means, unequal groups):</strong><p class="formula-line">\\( n_1 = \\frac{(Z_{\\alpha/2}+Z_\\beta)^2(\\sigma_1^2+\\sigma_2^2/k)}{\\Delta^2} \\)</p><p class="formula-line">\\( n_2 = k n_1,\\; k=${kPreview.toFixed(3)} \\)</p>`;
            }
            refreshMathJax();
            return;
        }

        if (Math.abs(values.k - 1) < 1e-10) {
            formulaEl.innerHTML = `<strong>Formula used (difference of means, n per group):</strong><p class="formula-line">\\( n = \\frac{(Z_{\\alpha/2}+Z_\\beta)^2(\\sigma_1^2+\\sigma_2^2)}{\\Delta^2} \\)</p><p class="formula-line">\\( n = \\frac{(${values.zAlpha.toFixed(4)}+${values.zBeta.toFixed(4)})^2(${values.sigma1.toFixed(4)}^2+${values.sigma2.toFixed(4)}^2)}{${values.delta.toFixed(4)}^2} \\)</p>`;
        } else {
            formulaEl.innerHTML = `<strong>Formula used (difference of means, unequal groups):</strong><p class="formula-line">\\( n_1 = \\frac{(Z_{\\alpha/2}+Z_\\beta)^2(\\sigma_1^2+\\sigma_2^2/k)}{\\Delta^2} \\)</p><p class="formula-line">\\( n_2 = k n_1 \\)</p><p class="formula-line">\\( n_1 = \\frac{(${values.zAlpha.toFixed(4)}+${values.zBeta.toFixed(4)})^2(${values.sigma1.toFixed(4)}^2+${values.sigma2.toFixed(4)}^2/${values.k.toFixed(4)})}{${values.delta.toFixed(4)}^2} \\)</p>`;
        }
        refreshMathJax();
        return;
    }

    formulaEl.innerHTML = "Formula pending…";
    refreshMathJax();
}
