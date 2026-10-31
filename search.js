(function () {
  'use strict';

  var TOOLS = [
    // ── Distribuciones ────────────────────────────────────────────────
    { name: 'Normal', full: 'Distribución Normal', cat: 'Distribuciones', url: '/normal.html', tags: 'gaussiana campana z cdf pdf probabilidad continua' },
    { name: 'Binomial', full: 'Distribución Binomial', cat: 'Distribuciones', url: '/binomial.html', tags: 'discreta n p éxitos bernoulli ensayos' },
    { name: 'Poisson', full: 'Distribución Poisson', cat: 'Distribuciones', url: '/poisson.html', tags: 'lambda eventos por unidad discreta llegadas' },
    { name: 't de Student', full: 'Distribución t de Student', cat: 'Distribuciones', url: '/studentt.html', tags: 'student grados libertad pequeña muestra t' },
    { name: 'Chi-cuadrado', full: 'Distribución Chi-cuadrado', cat: 'Distribuciones', url: '/chisquare.html', tags: 'chi cuadrado bondad ajuste independencia' },
    { name: 'F de Fisher-Snedecor', full: 'Distribución F de Fisher-Snedecor', cat: 'Distribuciones', url: '/centralf.html', tags: 'F snedecor anova razón varianzas' },
    { name: 'Exponencial', full: 'Distribución Exponencial', cat: 'Distribuciones', url: '/exponential.html', tags: 'exponencial lambda tiempo entre eventos continua' },
    { name: 'Uniforme', full: 'Distribución Uniforme', cat: 'Distribuciones', url: '/uniform.html', tags: 'uniforme a b continua equiprobable' },
    { name: 'Gamma', full: 'Distribución Gamma', cat: 'Distribuciones', url: '/gamma.html', tags: 'gamma k theta forma escala sumas exponencial' },
    { name: 'Beta', full: 'Distribución Beta', cat: 'Distribuciones', url: '/beta.html', tags: 'beta alfa proporciones bayesiano' },
    { name: 'Lognormal', full: 'Distribución Lognormal', cat: 'Distribuciones', url: '/lognormal.html', tags: 'lognormal logarítmica log normal mu sigma' },
    { name: 'Weibull', full: 'Distribución Weibull', cat: 'Distribuciones', url: '/weibull.html', tags: 'weibull fiabilidad supervivencia k lambda forma' },
    { name: 'Binomial negativa', full: 'Distribución Binomial Negativa', cat: 'Distribuciones', url: '/negbin.html', tags: 'binomial negativa fracasos r p discreta' },
    { name: 'Geométrica', full: 'Distribución Geométrica', cat: 'Distribuciones', url: '/geometric.html', tags: 'geométrica primer éxito p discreta' },
    { name: 'Hipergeométrica', full: 'Distribución Hipergeométrica', cat: 'Distribuciones', url: '/hypergeometric.html', tags: 'hipergeométrica sin reemplazo N K n' },
    { name: 'Bernoulli', full: 'Distribución Bernoulli', cat: 'Distribuciones', url: '/bernoulli.html', tags: 'bernoulli éxito fracaso p dicotómica' },

    // ── Tablas estadísticas ───────────────────────────────────────────
    { name: 'Tabla Normal estándar', full: 'Tabla Normal estándar — f(z) y Φ(z)', cat: 'Tablas estadísticas', url: '/tabla-normal.html', tags: 'tabla z phi cdf normal acumulada' },
    { name: 'Tabla t de Student', full: 'Tabla t de Student — valores críticos', cat: 'Tablas estadísticas', url: '/tabla-t-student.html', tags: 'tabla t student grados libertad críticos' },
    { name: 'Tabla Chi-cuadrado', full: 'Tabla Chi-cuadrado — cuantiles', cat: 'Tablas estadísticas', url: '/tabla-chi-cuadrado.html', tags: 'tabla chi cuadrado cuantiles críticos' },
    { name: 'Tabla F de Snedecor', full: 'Tabla F de Snedecor — valores críticos', cat: 'Tablas estadísticas', url: '/tabla-f-snedecor.html', tags: 'tabla F snedecor anova varianzas críticos' },
    { name: 'Tabla Binomial', full: 'Tabla Binomial — P(X=k) y P(X≤k)', cat: 'Tablas estadísticas', url: '/tabla-binomial.html', tags: 'tabla binomial probabilidad acumulada' },
    { name: 'Tabla Poisson', full: 'Tabla Poisson — P(X=k) y P(X≤k)', cat: 'Tablas estadísticas', url: '/tabla-poisson.html', tags: 'tabla poisson lambda probabilidad' },
    { name: 'Tabla Gamma', full: 'Tabla Gamma — CDF y cuantiles', cat: 'Tablas estadísticas', url: '/tabla-gamma.html', tags: 'tabla gamma cuantiles CDF' },
    { name: 'Tabla Beta', full: 'Tabla Beta — CDF y cuantiles', cat: 'Tablas estadísticas', url: '/tabla-beta.html', tags: 'tabla beta cuantiles CDF bayesiano' },

    // ── Intervalos de confianza ───────────────────────────────────────
    { name: 'IC media (σ conocida)', full: 'Intervalo de confianza para la media (σ conocida)', cat: 'Intervalos de confianza', url: '/intervalo-confianza-media-sigma-conocida.html', tags: 'intervalo confianza media sigma conocida z normal' },
    { name: 'IC media (σ desconocida)', full: 'Intervalo de confianza para la media (σ desconocida)', cat: 'Intervalos de confianza', url: '/intervalo-confianza-media.html', tags: 'intervalo confianza media desviacion t student' },
    { name: 'IC proporción', full: 'Intervalo de confianza para una proporción', cat: 'Intervalos de confianza', url: '/intervalo-confianza-proporcion.html', tags: 'intervalo confianza proporcion p binomial' },
    { name: 'IC diferencia de medias', full: 'Intervalo de confianza para la diferencia de medias', cat: 'Intervalos de confianza', url: '/intervalo-confianza-diferencia-medias.html', tags: 'intervalo diferencia medias dos grupos independientes' },
    { name: 'IC medias apareadas', full: 'Intervalo de confianza para medias apareadas', cat: 'Intervalos de confianza', url: '/intervalo-confianza-medias-apareadas.html', tags: 'intervalo medias apareadas pareadas diferencia' },
    { name: 'IC diferencia de proporciones', full: 'Intervalo de confianza para la diferencia de proporciones', cat: 'Intervalos de confianza', url: '/intervalo-confianza-diferencia-proporciones.html', tags: 'intervalo diferencia proporciones dos grupos' },
    { name: 'IC ratio de proporciones', full: 'Intervalo de confianza para el ratio de proporciones', cat: 'Intervalos de confianza', url: '/intervalo-confianza-ratio-proporciones.html', tags: 'intervalo ratio proporciones riesgo relativo' },
    { name: 'IC odds ratio', full: 'Intervalo de confianza para el odds ratio', cat: 'Intervalos de confianza', url: '/intervalo-confianza-odds-ratio.html', tags: 'intervalo odds ratio caso control' },
    { name: 'IC varianza', full: 'Intervalo de confianza para la varianza', cat: 'Intervalos de confianza', url: '/intervalo-confianza-varianza.html', tags: 'intervalo confianza varianza desviacion tipica chi' },
    { name: 'IC proporción (pob. finita)', full: 'IC para proporción en población finita', cat: 'Intervalos de confianza', url: '/intervalo-confianza-proporcion-poblacion-finita.html', tags: 'intervalo proporcion poblacion finita corrección' },
    { name: 'IC media (pob. finita)', full: 'IC para media en población finita', cat: 'Intervalos de confianza', url: '/intervalo-confianza-media-poblacion-finita.html', tags: 'intervalo media poblacion finita corrección' },

    // ── Contrastes de hipótesis ───────────────────────────────────────
    { name: 'Contraste una media', full: 'Contraste de hipótesis para una media', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-una-media.html', tags: 'contraste media t z una muestra hipótesis p-valor' },
    { name: 'Contraste dos medias independientes', full: 'Contraste para dos medias independientes', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-dos-medias.html', tags: 'contraste dos medias independientes t Welch' },
    { name: 'Contraste medias apareadas', full: 'Contraste para medias apareadas', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-medias-apareadas.html', tags: 'contraste medias apareadas pareadas diferencia t' },
    { name: 'ANOVA de un factor', full: 'ANOVA de un factor', cat: 'Contrastes de hipótesis', url: '/anova.html', tags: 'ANOVA factor varianza k grupos F' },
    { name: 'Contraste una proporción', full: 'Contraste de hipótesis para una proporción', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-una-proporcion.html', tags: 'contraste proporcion z binomial hipótesis' },
    { name: 'Contraste dos proporciones', full: 'Contraste para dos proporciones independientes', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-dos-proporciones.html', tags: 'contraste dos proporciones independientes z' },
    { name: 'Contraste proporciones apareadas (McNemar)', full: 'Contraste para proporciones apareadas — Test de McNemar', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-proporciones-apareadas.html', tags: 'McNemar proporciones apareadas pareadas' },
    { name: 'Contraste sobre varianzas', full: 'Contraste para una o dos varianzas', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-varianzas.html', tags: 'contraste varianza desviacion tipica chi cuadrado dispersion' },
    { name: 'Contraste varianzas (F)', full: 'Contraste para dos varianzas — Test F', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-dos-varianzas.html', tags: 'contraste varianzas F levene homogeneidad' },
    { name: 'Chi-cuadrado de independencia', full: 'Chi-cuadrado de independencia', cat: 'Contrastes de hipótesis', url: '/contraste-independencia-chi-cuadrado.html', tags: 'chi cuadrado independencia tabla contingencia' },
    { name: 'Chi-cuadrado bondad de ajuste', full: 'Chi-cuadrado bondad de ajuste', cat: 'Contrastes de hipótesis', url: '/chi-cuadrado-bondad-ajuste.html', tags: 'chi cuadrado bondad ajuste distribución teórica' },
    { name: 'Test exacto de Fisher', full: 'Test exacto de Fisher', cat: 'Contrastes de hipótesis', url: '/test-exacto-fisher.html', tags: 'Fisher exacto 2x2 tabla contingencia' },
    { name: 'Kolmogorov-Smirnov', full: 'Kolmogorov-Smirnov — bondad de ajuste', cat: 'Contrastes de hipótesis', url: '/kolmogorov-smirnov-bondad-ajuste.html', tags: 'kolmogorov smirnov KS bondad ajuste normalidad' },
    { name: 'Shapiro-Wilk', full: 'Test de normalidad Shapiro-Wilk', cat: 'Contrastes de hipótesis', url: '/shapiro-wilk-normalidad.html', tags: 'shapiro wilk normalidad W estadístico' },
    { name: 'Contraste correlación de Pearson', full: 'Contraste para la correlación de Pearson', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-correlacion.html', tags: 'correlación pearson r contraste hipótesis' },
    { name: 'Contraste no inferioridad', full: 'Contraste de no inferioridad y equivalencia', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-no-inferioridad.html', tags: 'no inferioridad equivalencia delta margen' },
    { name: 'Contraste odds ratio', full: 'Contraste para el odds ratio', cat: 'Contrastes de hipótesis', url: '/contraste-hipotesis-odds-ratio.html', tags: 'odds ratio contraste caso control' },
    { name: 'Potencia contraste una proporción', full: 'Potencia estadística para contraste de una proporción', cat: 'Contrastes de hipótesis', url: '/potencia-contraste-una-proporcion.html', tags: 'potencia error tipo II beta contraste proporcion' },

    // ── Tamaño muestral — IC ──────────────────────────────────────────
    { name: 'Tamaño muestral: Una proporción (IC)', full: 'Tamaño muestral para IC de una proporción', cat: 'Tamaño muestral', url: '/tamano-muestral-una-proporcion.html', tags: 'tamaño muestral proporcion intervalo confianza encuesta margen error' },
    { name: 'Tamaño muestral: Dos proporciones (IC)', full: 'Tamaño muestral para IC de dos proporciones', cat: 'Tamaño muestral', url: '/tamano-muestral-dos-proporciones.html', tags: 'tamaño dos proporciones diferencia IC' },
    { name: 'Tamaño muestral: Diferencia proporciones (IC)', full: 'Tamaño muestral para IC de diferencia de proporciones', cat: 'Tamaño muestral', url: '/tamano-muestral-diferencia-proporciones-ic.html', tags: 'tamaño diferencia proporciones IC intervalo' },
    { name: 'Tamaño muestral: Una media (IC)', full: 'Tamaño muestral para IC de una media', cat: 'Tamaño muestral', url: '/tamano-muestral-una-media.html', tags: 'tamaño media intervalo margen error confianza' },
    { name: 'Tamaño muestral: Dos medias (IC)', full: 'Tamaño muestral para IC de dos medias', cat: 'Tamaño muestral', url: '/tamano-muestral-diferencia-medias.html', tags: 'tamaño diferencia medias IC intervalo' },
    { name: 'Tamaño muestral: Medias apareadas (IC)', full: 'Tamaño muestral para IC de medias apareadas', cat: 'Tamaño muestral', url: '/tamano-muestral-medias-apareadas-ic.html', tags: 'tamaño apareadas IC intervalo' },
    { name: 'Tamaño muestral: Odds ratio (IC)', full: 'Tamaño muestral para IC del odds ratio', cat: 'Tamaño muestral', url: '/tamano-muestral-odds-ratio-ic.html', tags: 'tamaño odds ratio IC intervalo' },
    { name: 'Tamaño muestral: Varianza (IC)', full: 'Tamaño muestral para IC de la varianza', cat: 'Tamaño muestral', url: '/tamano-muestral-varianza-ic.html', tags: 'tamaño varianza IC intervalo' },
    { name: 'Tamaño muestral: Proporción finita (IC)', full: 'Tamaño muestral para proporción en población finita', cat: 'Tamaño muestral', url: '/tamano-muestral-proporcion-poblacion-finita.html', tags: 'tamaño proporcion poblacion finita IC corrección' },
    { name: 'Tamaño muestral: Media finita (IC)', full: 'Tamaño muestral para media en población finita', cat: 'Tamaño muestral', url: '/tamano-muestral-media-poblacion-finita.html', tags: 'tamaño media poblacion finita IC corrección' },

    // ── Tamaño muestral — Contrastes ──────────────────────────────────
    { name: 'Tamaño muestral: Una proporción (H0)', full: 'Tamaño muestral para contraste de una proporción', cat: 'Tamaño muestral', url: '/tamano-muestral-contraste-una-proporcion.html', tags: 'tamaño proporcion contraste hipótesis potencia alfa beta' },
    { name: 'Tamaño muestral: Una media (H0)', full: 'Tamaño muestral para contraste de una media', cat: 'Tamaño muestral', url: '/tamano-muestral-contraste-una-media.html', tags: 'tamaño media contraste potencia alfa beta' },
    { name: 'Tamaño muestral: Medias apareadas (H0)', full: 'Tamaño muestral para contraste de medias apareadas', cat: 'Tamaño muestral', url: '/tamano-muestral-medias-apareadas.html', tags: 'tamaño apareadas contraste potencia' },
    { name: 'Tamaño muestral: Proporciones apareadas (H0)', full: 'Tamaño muestral para proporciones apareadas (McNemar)', cat: 'Tamaño muestral', url: '/tamano-muestral-proporciones-apareadas.html', tags: 'tamaño proporciones apareadas McNemar' },
    { name: 'Tamaño muestral: ANOVA (H0)', full: 'Tamaño muestral para ANOVA', cat: 'Tamaño muestral', url: '/tamano-muestral-anova.html', tags: 'tamaño ANOVA k grupos potencia F' },
    { name: 'Tamaño muestral: Correlación (H0)', full: 'Tamaño muestral para correlación de Pearson', cat: 'Tamaño muestral', url: '/tamano-muestral-correlacion.html', tags: 'tamaño correlacion pearson r potencia' },
    { name: 'Tamaño muestral: No inferioridad (H0)', full: 'Tamaño muestral para no inferioridad y equivalencia', cat: 'Tamaño muestral', url: '/tamano-muestral-no-inferioridad.html', tags: 'no inferioridad equivalencia delta margen tamaño' },
    { name: 'Tamaño muestral: Odds ratio (H0)', full: 'Tamaño muestral para odds ratio (caso-control)', cat: 'Tamaño muestral', url: '/tamano-muestral-odds-ratio.html', tags: 'odds ratio caso control contraste tamaño' },
    { name: 'Tamaño muestral: Una varianza (H0)', full: 'Tamaño muestral para contraste de una varianza', cat: 'Tamaño muestral', url: '/tamano-muestral-una-varianza.html', tags: 'varianza chi cuadrado contraste potencia tamaño' },
    { name: 'Tamaño muestral: Dos varianzas (H0)', full: 'Tamaño muestral para contraste de dos varianzas', cat: 'Tamaño muestral', url: '/tamano-muestral-dos-varianzas.html', tags: 'dos varianzas F contraste tamaño' },
    { name: 'Tamaño muestral: Chi-cuadrado independencia (H0)', full: 'Tamaño muestral para chi-cuadrado de independencia', cat: 'Tamaño muestral', url: '/tamano-muestral-chi-cuadrado-independencia.html', tags: 'chi cuadrado independencia tabla contingencia tamaño' },
    { name: 'Tamaño muestral: Chi-cuadrado bondad (H0)', full: 'Tamaño muestral para chi-cuadrado de bondad de ajuste', cat: 'Tamaño muestral', url: '/tamano-muestral-chi-cuadrado-bondad.html', tags: 'chi cuadrado bondad ajuste tamaño' },
    { name: 'Tamaño muestral: Fisher (H0)', full: 'Tamaño muestral para test exacto de Fisher', cat: 'Tamaño muestral', url: '/tamano-muestral-fisher.html', tags: 'fisher exacto 2x2 tamaño' },
    { name: 'Tamaño muestral: Kolmogorov-Smirnov (H0)', full: 'Tamaño muestral para Kolmogorov-Smirnov', cat: 'Tamaño muestral', url: '/tamano-muestral-kolmogorov-smirnov.html', tags: 'kolmogorov smirnov KS tamaño normalidad' },
    { name: 'Tamaño muestral: Shapiro-Wilk (H0)', full: 'Tamaño muestral para Shapiro-Wilk', cat: 'Tamaño muestral', url: '/tamano-muestral-shapiro-wilk.html', tags: 'shapiro wilk normalidad tamaño' },

    // ── Test A/B ──────────────────────────────────────────────────────
    { name: 'Test A/B frecuentista (Z-test)', full: 'Test A/B frecuentista — Z-test de proporciones', cat: 'Test A/B', url: '/ab-testing-z-test.html', tags: 'ab testing z test frecuentista significación p-valor conversión' },
    { name: 'Test A/B bayesiano (Beta-Binomial)', full: 'Test A/B bayesiano — Beta-Binomial', cat: 'Test A/B', url: '/ab-testing-bayesiano.html', tags: 'bayesiano beta binomial probabilidad superar ab' },
    { name: 'Potencia y MDE para A/B', full: 'Potencia estadística y MDE para test A/B', cat: 'Test A/B', url: '/ab-testing-potencia.html', tags: 'potencia MDE efecto mínimo detectable tamaño muestral ab' },
    { name: 'Simulación de experimentos A/B', full: 'Simulación Monte Carlo de experimentos A/B', cat: 'Test A/B', url: '/ab-testing-simulacion.html', tags: 'simulación monte carlo ab testing experimento' },
    { name: 'Potencia test A/B (avanzado)', full: 'Potencia y error tipo II para test A/B (avanzado)', cat: 'Test A/B', url: '/potencia-test-ab.html', tags: 'potencia error tipo II ab test avanzado' },

    // ── Simulaciones ──────────────────────────────────────────────────
    { name: 'Teorema Central del Límite', full: 'Simulador del Teorema Central del Límite (TCL)', cat: 'Simulaciones', url: '/simulaciones/teorema-central-limite.html', tags: 'TCL teorema central limite distribución muestral media convergencia' },
    { name: 'Simulador de Intervalos de Confianza', full: 'Simulador de Intervalos de Confianza', cat: 'Simulaciones', url: '/simulaciones/simulador-intervalos-confianza.html', tags: 'intervalo confianza simulación frecuencia cobertura' },
    { name: 'Cadenas de Markov', full: 'Simulador de Cadenas de Markov', cat: 'Simulaciones', url: '/simulaciones/simulador-cadenas-markov.html', tags: 'markov cadenas estados transición estacionaria' },
    { name: 'Proceso de Poisson', full: 'Simulador del Proceso de Poisson', cat: 'Simulaciones', url: '/simulaciones/simulador-proceso-poisson.html', tags: 'poisson proceso lambda eventos llegadas' },
    { name: 'Paseo Aleatorio 1D y 2D', full: 'Simulador de Paseo Aleatorio 1D y 2D', cat: 'Simulaciones', url: '/simulaciones/simulador-paseo-aleatorio.html', tags: 'paseo aleatorio random walk 1D 2D difusión browniano' },
    { name: 'Errores Tipo I y Tipo II', full: 'Simulador de Errores Tipo I y Tipo II', cat: 'Simulaciones', url: '/simulaciones/simulador-errores-tipo-i-ii.html', tags: 'errores tipo I II alfa beta potencia hipótesis' },
    { name: 'Bootstrap', full: 'Simulador de Bootstrap', cat: 'Simulaciones', url: '/simulaciones/simulador-bootstrap.html', tags: 'bootstrap remuestreo intervalo confianza empírico' }
  ];

  var SECTIONS = [
    { name: 'Distribuciones de probabilidad', url: '/distribuciones/', icon: '∫', desc: '16 distribuciones', color: '#1d4ed8' },
    { name: 'Tablas estadísticas', url: '/tablas-estadisticas/', icon: '▦', desc: '8 tablas', color: '#15803d' },
    { name: 'Intervalos de confianza', url: '/intervalos-confianza/', icon: '±', desc: '11 calculadoras', color: '#7e22ce' },
    { name: 'Tamaño muestral', url: '/tamano-muestral/', icon: 'n', desc: '25 calculadoras', color: '#c2410c' },
    { name: 'Contrastes de hipótesis', url: '/contrastes-hipotesis/', icon: 'p', desc: '19 contrastes', color: '#b91c1c' },
    { name: 'Test A/B y experimentación', url: '/ab-testing/', icon: 'A/B', desc: '5 herramientas', color: '#0f766e' },
    { name: 'Simulaciones estadísticas', url: '/simulaciones/', icon: '∿', desc: '7 simulaciones', color: '#b45309' }
  ];

  var CAT_STYLES = {
    'Distribuciones':        { bg: 'rgba(37,99,235,0.09)',   color: '#1d4ed8' },
    'Tablas estadísticas':   { bg: 'rgba(22,163,74,0.09)',   color: '#15803d' },
    'Intervalos de confianza': { bg: 'rgba(168,85,247,0.09)', color: '#7e22ce' },
    'Tamaño muestral':       { bg: 'rgba(234,88,12,0.09)',   color: '#c2410c' },
    'Contrastes de hipótesis': { bg: 'rgba(220,38,38,0.09)', color: '#b91c1c' },
    'Test A/B':              { bg: 'rgba(15,118,110,0.09)',  color: '#0f766e' },
    'Simulaciones':          { bg: 'rgba(217,119,6,0.09)',   color: '#b45309' }
  };

  // ── English version ───────────────────────────────────────────────────
  // Pages under /en/ reuse the same index: every tool exists at the same
  // path with an "en/" prefix, so only names, tags and UI text change.
  var IS_EN = document.documentElement.lang === 'en';

  var EN_CATS = {
    'Distribuciones': 'Distributions',
    'Tablas estadísticas': 'Statistical tables',
    'Intervalos de confianza': 'Confidence intervals',
    'Tamaño muestral': 'Sample size',
    'Contrastes de hipótesis': 'Hypothesis tests',
    'Test A/B': 'A/B testing',
    'Simulaciones': 'Simulations'
  };

  // url → [name, full name, tags]
  var EN_TOOLS = {
    '/normal.html': ['Normal', 'Normal distribution', 'gaussian bell curve z cdf pdf probability continuous'],
    '/binomial.html': ['Binomial', 'Binomial distribution', 'discrete n p successes bernoulli trials'],
    '/poisson.html': ['Poisson', 'Poisson distribution', 'lambda events per unit discrete arrivals'],
    '/studentt.html': ["Student's t", "Student's t distribution", 'student degrees of freedom small sample t'],
    '/chisquare.html': ['Chi-square', 'Chi-square distribution', 'chi square chi squared goodness of fit independence'],
    '/centralf.html': ["Fisher-Snedecor's F", "Fisher-Snedecor's F distribution", 'F snedecor anova variance ratio'],
    '/exponential.html': ['Exponential', 'Exponential distribution', 'exponential lambda time between events continuous'],
    '/uniform.html': ['Uniform', 'Uniform distribution', 'uniform a b continuous equiprobable'],
    '/gamma.html': ['Gamma', 'Gamma distribution', 'gamma k theta shape scale sum exponential'],
    '/beta.html': ['Beta', 'Beta distribution', 'beta alpha proportions bayesian'],
    '/lognormal.html': ['Log-normal', 'Log-normal distribution', 'lognormal logarithmic log normal mu sigma'],
    '/weibull.html': ['Weibull', 'Weibull distribution', 'weibull reliability survival k lambda shape'],
    '/negbin.html': ['Negative binomial', 'Negative binomial distribution', 'negative binomial failures r p discrete'],
    '/geometric.html': ['Geometric', 'Geometric distribution', 'geometric first success p discrete'],
    '/hypergeometric.html': ['Hypergeometric', 'Hypergeometric distribution', 'hypergeometric without replacement N K n'],
    '/bernoulli.html': ['Bernoulli', 'Bernoulli distribution', 'bernoulli success failure p binary'],
    '/tabla-normal.html': ['Standard normal table', 'Standard normal table — f(z) and Φ(z)', 'z table phi cdf normal cumulative'],
    '/tabla-t-student.html': ["Student's t table", "Student's t table — critical values", 't table student degrees of freedom critical'],
    '/tabla-chi-cuadrado.html': ['Chi-square table', 'Chi-square table — quantiles', 'chi square table quantiles critical'],
    '/tabla-f-snedecor.html': ["Snedecor's F table", "Snedecor's F table — critical values", 'F table snedecor anova variances critical'],
    '/tabla-binomial.html': ['Binomial table', 'Binomial table — P(X=k) and P(X≤k)', 'binomial table cumulative probability'],
    '/tabla-poisson.html': ['Poisson table', 'Poisson table — P(X=k) and P(X≤k)', 'poisson table lambda probability'],
    '/tabla-gamma.html': ['Gamma table', 'Gamma table — CDF and quantiles', 'gamma table quantiles CDF'],
    '/tabla-beta.html': ['Beta table', 'Beta table — CDF and quantiles', 'beta table quantiles CDF bayesian'],
    '/intervalo-confianza-media-sigma-conocida.html': ['CI mean (known σ)', 'Confidence interval for a mean (known σ)', 'confidence interval mean known sigma z normal'],
    '/intervalo-confianza-media.html': ['CI mean (unknown σ)', 'Confidence interval for a mean (unknown σ)', 'confidence interval mean standard deviation t student'],
    '/intervalo-confianza-proporcion.html': ['CI proportion', 'Confidence interval for a proportion', 'confidence interval proportion p binomial'],
    '/intervalo-confianza-diferencia-medias.html': ['CI difference of means', 'Confidence interval for the difference of means', 'interval difference means two independent groups'],
    '/intervalo-confianza-medias-apareadas.html': ['CI paired means', 'Confidence interval for paired means', 'interval paired means matched difference'],
    '/intervalo-confianza-diferencia-proporciones.html': ['CI difference of proportions', 'Confidence interval for the difference of proportions', 'interval difference proportions two groups'],
    '/intervalo-confianza-ratio-proporciones.html': ['CI ratio of proportions', 'Confidence interval for the ratio of proportions', 'interval ratio proportions relative risk'],
    '/intervalo-confianza-odds-ratio.html': ['CI odds ratio', 'Confidence interval for the odds ratio', 'interval odds ratio case control'],
    '/intervalo-confianza-varianza.html': ['CI variance', 'Confidence interval for the variance', 'confidence interval variance standard deviation chi'],
    '/intervalo-confianza-proporcion-poblacion-finita.html': ['CI proportion (finite pop.)', 'Confidence interval for a proportion in a finite population', 'interval proportion finite population correction'],
    '/intervalo-confianza-media-poblacion-finita.html': ['CI mean (finite pop.)', 'Confidence interval for a mean in a finite population', 'interval mean finite population correction'],
    '/contraste-hipotesis-una-media.html': ['One-mean test', 'Hypothesis test for one mean', 'test mean t z one sample hypothesis p-value'],
    '/contraste-hipotesis-dos-medias.html': ['Two independent means test', 'Hypothesis test for two independent means', 'test two means independent t Welch'],
    '/contraste-hipotesis-medias-apareadas.html': ['Paired means test', 'Hypothesis test for paired means', 'test paired means matched difference t'],
    '/anova.html': ['One-way ANOVA', 'One-way ANOVA', 'ANOVA factor variance k groups F'],
    '/contraste-hipotesis-una-proporcion.html': ['One-proportion test', 'Hypothesis test for one proportion', 'test proportion z binomial hypothesis'],
    '/contraste-hipotesis-dos-proporciones.html': ['Two proportions test', 'Hypothesis test for two independent proportions', 'test two proportions independent z'],
    '/contraste-hipotesis-proporciones-apareadas.html': ['Paired proportions test (McNemar)', 'Paired proportions test — McNemar', 'McNemar paired proportions matched'],
    '/contraste-hipotesis-varianzas.html': ['Variance test', 'Hypothesis test for one or two variances', 'test variance standard deviation chi square dispersion'],
    '/contraste-hipotesis-dos-varianzas.html': ['Two variances test (F)', 'Hypothesis test for two variances — F test', 'test variances F levene homogeneity'],
    '/contraste-independencia-chi-cuadrado.html': ['Chi-square test of independence', 'Chi-square test of independence', 'chi square independence contingency table'],
    '/chi-cuadrado-bondad-ajuste.html': ['Chi-square goodness of fit', 'Chi-square goodness-of-fit test', 'chi square goodness of fit theoretical distribution'],
    '/test-exacto-fisher.html': ["Fisher's exact test", "Fisher's exact test", 'Fisher exact 2x2 contingency table'],
    '/kolmogorov-smirnov-bondad-ajuste.html': ['Kolmogorov-Smirnov', 'Kolmogorov-Smirnov — goodness of fit', 'kolmogorov smirnov KS goodness of fit normality'],
    '/shapiro-wilk-normalidad.html': ['Shapiro-Wilk', 'Shapiro-Wilk normality test', 'shapiro wilk normality W statistic'],
    '/contraste-hipotesis-correlacion.html': ['Pearson correlation test', 'Hypothesis test for the Pearson correlation', 'correlation pearson r test hypothesis'],
    '/contraste-hipotesis-no-inferioridad.html': ['Non-inferiority test', 'Non-inferiority and equivalence test', 'non-inferiority equivalence delta margin'],
    '/contraste-hipotesis-odds-ratio.html': ['Odds ratio test', 'Hypothesis test for the odds ratio', 'odds ratio test case control'],
    '/potencia-contraste-una-proporcion.html': ['Power: one-proportion test', 'Statistical power for a one-proportion test', 'power type II error beta test proportion'],
    '/tamano-muestral-una-proporcion.html': ['Sample size: one proportion (CI)', 'Sample size for the CI of one proportion', 'sample size proportion confidence interval survey margin of error'],
    '/tamano-muestral-dos-proporciones.html': ['Sample size: two proportions (CI)', 'Sample size for the CI of two proportions', 'sample size two proportions difference CI'],
    '/tamano-muestral-diferencia-proporciones-ic.html': ['Sample size: difference of proportions (CI)', 'Sample size for the CI of a difference of proportions', 'sample size difference proportions CI interval'],
    '/tamano-muestral-una-media.html': ['Sample size: one mean (CI)', 'Sample size for the CI of one mean', 'sample size mean interval margin of error confidence'],
    '/tamano-muestral-diferencia-medias.html': ['Sample size: two means (CI)', 'Sample size for the CI of two means', 'sample size difference means CI interval'],
    '/tamano-muestral-medias-apareadas-ic.html': ['Sample size: paired means (CI)', 'Sample size for the CI of paired means', 'sample size paired CI interval'],
    '/tamano-muestral-odds-ratio-ic.html': ['Sample size: odds ratio (CI)', 'Sample size for the CI of the odds ratio', 'sample size odds ratio CI interval'],
    '/tamano-muestral-varianza-ic.html': ['Sample size: variance (CI)', 'Sample size for the CI of the variance', 'sample size variance CI interval'],
    '/tamano-muestral-proporcion-poblacion-finita.html': ['Sample size: proportion, finite pop. (CI)', 'Sample size for a proportion in a finite population', 'sample size proportion finite population CI correction'],
    '/tamano-muestral-media-poblacion-finita.html': ['Sample size: mean, finite pop. (CI)', 'Sample size for a mean in a finite population', 'sample size mean finite population CI correction'],
    '/tamano-muestral-contraste-una-proporcion.html': ['Sample size: one proportion (H0)', 'Sample size for a one-proportion test', 'sample size proportion test hypothesis power alpha beta'],
    '/tamano-muestral-contraste-una-media.html': ['Sample size: one mean (H0)', 'Sample size for a one-mean test', 'sample size mean test power alpha beta'],
    '/tamano-muestral-medias-apareadas.html': ['Sample size: paired means (H0)', 'Sample size for a paired means test', 'sample size paired test power'],
    '/tamano-muestral-proporciones-apareadas.html': ['Sample size: paired proportions (H0)', 'Sample size for paired proportions (McNemar)', 'sample size paired proportions McNemar'],
    '/tamano-muestral-anova.html': ['Sample size: ANOVA (H0)', 'Sample size for ANOVA', 'sample size ANOVA k groups power F'],
    '/tamano-muestral-correlacion.html': ['Sample size: correlation (H0)', 'Sample size for Pearson correlation', 'sample size correlation pearson r power'],
    '/tamano-muestral-no-inferioridad.html': ['Sample size: non-inferiority (H0)', 'Sample size for non-inferiority and equivalence', 'non-inferiority equivalence delta margin sample size'],
    '/tamano-muestral-odds-ratio.html': ['Sample size: odds ratio (H0)', 'Sample size for the odds ratio (case-control)', 'odds ratio case control test sample size'],
    '/tamano-muestral-una-varianza.html': ['Sample size: one variance (H0)', 'Sample size for a one-variance test', 'variance chi square test power sample size'],
    '/tamano-muestral-dos-varianzas.html': ['Sample size: two variances (H0)', 'Sample size for a two-variances test', 'two variances F test sample size'],
    '/tamano-muestral-chi-cuadrado-independencia.html': ['Sample size: chi-square independence (H0)', 'Sample size for the chi-square test of independence', 'chi square independence contingency table sample size'],
    '/tamano-muestral-chi-cuadrado-bondad.html': ['Sample size: chi-square goodness of fit (H0)', 'Sample size for the chi-square goodness-of-fit test', 'chi square goodness of fit sample size'],
    '/tamano-muestral-fisher.html': ["Sample size: Fisher's exact test (H0)", "Sample size for Fisher's exact test", 'fisher exact 2x2 sample size'],
    '/tamano-muestral-kolmogorov-smirnov.html': ['Sample size: Kolmogorov-Smirnov (H0)', 'Sample size for the Kolmogorov-Smirnov test', 'kolmogorov smirnov KS sample size normality'],
    '/tamano-muestral-shapiro-wilk.html': ['Sample size: Shapiro-Wilk (H0)', 'Sample size for the Shapiro-Wilk test', 'shapiro wilk normality sample size'],
    '/ab-testing-z-test.html': ['Frequentist A/B test (Z-test)', 'Frequentist A/B test — Z-test for proportions', 'ab testing z test frequentist significance p-value conversion'],
    '/ab-testing-bayesiano.html': ['Bayesian A/B test (Beta-Binomial)', 'Bayesian A/B test — Beta-Binomial', 'bayesian beta binomial probability to beat ab'],
    '/ab-testing-potencia.html': ['Power and MDE for A/B', 'Statistical power and MDE for A/B tests', 'power MDE minimum detectable effect sample size ab'],
    '/ab-testing-simulacion.html': ['A/B experiment simulation', 'Monte Carlo simulation of A/B experiments', 'simulation monte carlo ab testing experiment'],
    '/potencia-test-ab.html': ['A/B test power (advanced)', 'Power and type II error for A/B tests (advanced)', 'power type II error ab test advanced'],
    '/simulaciones/teorema-central-limite.html': ['Central Limit Theorem', 'Central Limit Theorem (CLT) simulator', 'CLT central limit theorem sampling distribution mean convergence'],
    '/simulaciones/simulador-intervalos-confianza.html': ['Confidence Interval Simulator', 'Confidence interval simulator', 'confidence interval simulation frequency coverage'],
    '/simulaciones/simulador-cadenas-markov.html': ['Markov chains', 'Markov chain simulator', 'markov chains states transition stationary'],
    '/simulaciones/simulador-proceso-poisson.html': ['Poisson process', 'Poisson process simulator', 'poisson process lambda events arrivals'],
    '/simulaciones/simulador-paseo-aleatorio.html': ['1D and 2D random walk', '1D and 2D random walk simulator', 'random walk 1D 2D diffusion brownian'],
    '/simulaciones/simulador-errores-tipo-i-ii.html': ['Type I and Type II errors', 'Type I and Type II error simulator', 'type I II errors alpha beta power hypothesis'],
    '/simulaciones/simulador-bootstrap.html': ['Bootstrap', 'Bootstrap simulator', 'bootstrap resampling confidence interval empirical']
  };

  // url → [name, description]
  var EN_SECTIONS = {
    '/distribuciones/': ['Probability distributions', '16 distributions'],
    '/tablas-estadisticas/': ['Statistical tables', '8 tables'],
    '/intervalos-confianza/': ['Confidence intervals', '11 calculators'],
    '/tamano-muestral/': ['Sample size', '25 calculators'],
    '/contrastes-hipotesis/': ['Hypothesis tests', '19 tests'],
    '/ab-testing/': ['A/B testing and experimentation', '5 tools'],
    '/simulaciones/': ['Statistical simulations', '7 simulations']
  };

  var STR = IS_EN ? {
    dialog: 'Search statistics tools',
    placeholder: 'Search 90+ statistics tools…',
    input: 'Search statistics tool',
    quick: 'Quick access by area',
    results: 'Results',
    of: ' of ',
    none: 'No results for',
    more: ' more — refine your search',
    nav: 'navigate', open: 'open', close: 'close'
  } : {
    dialog: 'Búsqueda de herramientas estadísticas',
    placeholder: 'Buscar entre 90+ herramientas estadísticas…',
    input: 'Buscar herramienta estadística',
    quick: 'Acceso rápido por área',
    results: 'Resultados',
    of: ' de ',
    none: 'Sin resultados para',
    more: ' más — afina la búsqueda',
    nav: 'navegar', open: 'abrir', close: 'cerrar'
  };

  if (IS_EN) {
    TOOLS = TOOLS.map(function (t) {
      var en = EN_TOOLS[t.url];
      if (!en) return t;
      return { name: en[0], full: en[1], cat: t.cat, catLabel: EN_CATS[t.cat], url: t.url, tags: en[2] };
    });
    SECTIONS = SECTIONS.map(function (sec) {
      var en = EN_SECTIONS[sec.url];
      return en ? { name: en[0], url: sec.url, icon: sec.icon, desc: en[1], color: sec.color } : sec;
    });
  }

  function catLabel(tool) {
    return tool.catLabel || tool.cat;
  }

  var modal, inputEl, resultsEl, activeIdx = -1, filtered = [];

  // ── URL helper ────────────────────────────────────────────────────────
  // The browser always resolves script[src] to an absolute URL, so
  // stripping "search.js" from it gives us the absolute site root —
  // regardless of protocol (http/file), port, or server subdirectory.
  var SITE_ROOT = (function () {
    var el = document.currentScript ||
              document.querySelector('script[src$="search.js"]');
    if (el && el.src) {
      return el.src.replace(/search\.js([?#].*)?$/, '');
    }
    // Last-resort fallback: assume same origin, root path
    return window.location.origin + '/';
  }());

  function toUrl(absPath) {
    // absPath starts with '/' (e.g. '/normal.html')
    return SITE_ROOT + (IS_EN ? 'en/' : '') + absPath.slice(1);
  }

  // ── Scoring ───────────────────────────────────────────────────────────
  function score(tool, q) {
    var haystack = (tool.name + ' ' + tool.full + ' ' + catLabel(tool) + ' ' + tool.tags).toLowerCase();
    var words = q.toLowerCase().trim().split(/\s+/);
    var s = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w) continue;
      if (!haystack.includes(w)) return 0;
      if (tool.name.toLowerCase().includes(w)) s += 4;
      else if (tool.full.toLowerCase().includes(w)) s += 2;
      else if (catLabel(tool).toLowerCase().includes(w)) s += 1;
      else s += 0.5;
    }
    return s;
  }

  function runFilter(q) {
    filtered = [];
    for (var i = 0; i < TOOLS.length; i++) {
      var s = score(TOOLS[i], q);
      if (s > 0) filtered.push({ tool: TOOLS[i], s: s });
    }
    filtered.sort(function (a, b) { return b.s - a.s; });
  }

  // ── Rendering ─────────────────────────────────────────────────────────
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function highlight(text, q) {
    var escaped = esc(text);
    var word = (q || '').trim().split(/\s+/)[0];
    if (!word) return escaped;
    try {
      var re = new RegExp('(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return escaped.replace(re, '<mark>$1</mark>');
    } catch (e) {
      return escaped;
    }
  }

  function render(q) {
    var items, html, i, tool, style;

    if (!q || !q.trim()) {
      // Quick access: section links
      html = '<div class="search-group"><div class="search-group-label">' + STR.quick + '</div>';
      for (i = 0; i < SECTIONS.length; i++) {
        var sec = SECTIONS[i];
        html += '<a class="search-item search-item--section" href="' + esc(toUrl(sec.url)) + '" data-idx="' + i + '">' +
          '<span class="search-item-icon" style="color:' + sec.color + '">' + esc(sec.icon) + '</span>' +
          '<span class="search-item-name">' + esc(sec.name) + '</span>' +
          '<span class="search-item-desc">' + esc(sec.desc) + '</span>' +
          '</a>';
      }
      html += '</div>';
      resultsEl.innerHTML = html;
      activeIdx = -1;
      return;
    }

    runFilter(q);

    if (filtered.length === 0) {
      resultsEl.innerHTML = '<div class="search-empty">' + STR.none + ' &ldquo;' + esc(q) + '&rdquo;</div>';
      activeIdx = -1;
      return;
    }

    var shown = filtered.slice(0, 24);
    var extra = filtered.length > 24 ? filtered.length - 24 : 0;
    var label = STR.results + ' (' + (extra ? shown.length + STR.of + filtered.length : shown.length) + ')';

    html = '<div class="search-group"><div class="search-group-label">' + label + '</div>';
    for (i = 0; i < shown.length; i++) {
      tool = shown[i].tool;
      style = CAT_STYLES[tool.cat] || { bg: 'rgba(100,116,139,0.09)', color: '#475569' };
      html += '<a class="search-item" href="' + esc(toUrl(tool.url)) + '" data-idx="' + i + '">' +
        '<span class="search-item-name">' + highlight(tool.full, q) + '</span>' +
        '<span class="search-item-cat" style="background:' + style.bg + ';color:' + style.color + '">' + esc(catLabel(tool)) + '</span>' +
        '</a>';
    }
    if (extra) {
      html += '<div class="search-more">+' + extra + STR.more + '</div>';
    }
    html += '</div>';
    resultsEl.innerHTML = html;
    activeIdx = -1;
  }

  // ── Keyboard navigation ───────────────────────────────────────────────
  function setActive(idx) {
    var items = resultsEl.querySelectorAll('.search-item');
    if (activeIdx >= 0 && items[activeIdx]) items[activeIdx].classList.remove('is-active');
    activeIdx = Math.max(-1, Math.min(idx, items.length - 1));
    if (activeIdx >= 0 && items[activeIdx]) {
      items[activeIdx].classList.add('is-active');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  // ── Open / Close ──────────────────────────────────────────────────────
  function openModal() {
    modal.classList.add('is-open');
    document.body.classList.add('search-open');
    inputEl.value = '';
    render('');
    inputEl.focus();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.classList.remove('search-open');
  }

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    var searchBtn = document.querySelector('.site-nav-links .search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', openModal);
    }

    // Create modal DOM
    modal = document.createElement('div');
    modal.id = 'search-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', STR.dialog);
    modal.innerHTML =
      '<div class="search-backdrop" id="search-backdrop"></div>' +
      '<div class="search-box">' +
        '<div class="search-input-wrap">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input id="search-input" type="text" placeholder="' + STR.placeholder + '" autocomplete="off" spellcheck="false" aria-label="' + STR.input + '">' +
          '<kbd class="search-esc-hint">ESC</kbd>' +
        '</div>' +
        '<div id="search-results" class="search-results" role="listbox"></div>' +
        '<div class="search-help-bar">' +
          '<span><kbd>↑↓</kbd> ' + STR.nav + '</span>' +
          '<span><kbd>↵</kbd> ' + STR.open + '</span>' +
          '<span><kbd>Esc</kbd> ' + STR.close + '</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    inputEl = document.getElementById('search-input');
    resultsEl = document.getElementById('search-results');

    document.getElementById('search-backdrop').addEventListener('click', closeModal);

    inputEl.addEventListener('input', function () {
      render(this.value);
    });

    inputEl.addEventListener('keydown', function (e) {
      var items = resultsEl.querySelectorAll('.search-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(activeIdx + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(activeIdx - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var target = activeIdx >= 0 && items[activeIdx] ? items[activeIdx] : items[0];
        if (target) target.click();
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        modal.classList.contains('is-open') ? closeModal() : openModal();
      } else if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
