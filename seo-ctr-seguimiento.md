# Seguimiento SEO: optimización de CTR en páginas prioritarias

Registro de qué se cambia, cuándo y con qué situación de partida, para poder medir el efecto de cada cambio en Search Console.

## Situación de partida

Fuente: export de Google Search Console, del 13/07/2026 al 12/10/2026 (92 días). Las diez URLs suman 107.008 impresiones y unos 1.090 clics.

| Prioridad | Página | Impresiones | CTR | Posición | Estado |
|---|---|---:|---:|---:|---|
| 1 | `/tabla-normal.html` | 43.777 | 1,31 % | 7,28 | Lote 1: cambiado (title, description y contenido) |
| 2 | `/en/tamano-muestral-proporcion-poblacion-finita.html` | 11.068 | 0,34 % | 8,57 | Pendiente: faltan las consultas de la URL |
| 3 | `/en/tamano-muestral-correlacion.html` | 8.296 | 0,54 % | 6,74 | Pendiente: faltan las consultas de la URL |
| 4 | `/en/tamano-muestral-anova.html` | 7.704 | 0,55 % | 7,01 | Pendiente: faltan las consultas de la URL |
| 5 | `/tabla-t-student.html` | 9.754 | 1,26 % | 8,53 | Lote 1: cambiado (solo contenido; title sin cambios) |
| 6 | `/tabla-chi-cuadrado.html` | 6.781 | 1,08 % | 8,49 | Lote 1: cambiado (description y contenido; title sin cambios) |
| 7 | `/en/tabla-poisson.html` | 6.629 | 1,36 % | 8,02 | Pendiente |
| 8 | `/en/tamano-muestral-dos-proporciones.html` | 4.174 | 0,36 % | 9,44 | Pendiente: faltan las consultas de la URL |
| 9 | `/en/tabla-binomial.html` | 3.902 | 1,79 % | 10,48 | Pendiente |
| 10 | `/en/beta.html` | 4.923 | 0,75 % | 11,54 | Pendiente: primero identificar la intención dominante |

Antes de comparar, guardar para cada URL el desglose de **consultas, país y dispositivo** del periodo base (Rendimiento → Páginas → URL → Consultas / Países / Dispositivos).

## Lote 1: tablas españolas

Fecha de despliegue: anotar la fecha en que se publique en producción.

### `/tabla-normal.html`

- **Title:** «Tabla de la distribución Normal estándar (Z) | ProbLab» → «Tabla normal Z: distribución, probabilidades y ejemplos | ProbLab».
- **Description:** nueva, centrada en las probabilidades acumuladas positivas y negativas y en los ejemplos resueltos.
- **H1:** sin cambios.
- **Contenido:** nueva sección «Cómo calcular probabilidades con la tabla normal», situada después de la tabla, con P(Z ≤ z), P(Z > z), P(a < Z < b) y la tipificación de una N(μ, σ). Nueva pregunta frecuente sobre P(a < Z < b), también en el JSON-LD.
- **Hipótesis:** captar consultas sobre probabilidades e intervalos («cómo usar la tabla normal», «P(Z>z)», «probabilidad entre dos valores»).

### `/tabla-t-student.html`

- **Title y description:** sin cambios, porque ya responden bien a la consulta.
- **Contenido:** nueva sección «Una cola o dos colas: ejemplo con ν = 20 y α = 0,05» (2,086 bilateral y 1,725 unilateral).
- **Hipótesis:** responder mejor a «tabla t student dos colas» y variantes. Si el CTR sube, debería deberse al snippet o a la posición, no al title.

### `/tabla-chi-cuadrado.html`

- **Title:** sin cambios.
- **Description:** ahora menciona el nivel α y la cola derecha o izquierda.
- **Tabla:** cada cabecera p muestra además el α equivalente («cola dcha.: α = 0,05» bajo p = 0,95). Al pulsar una celda de cola derecha también se muestra P(X > χ²).
- **Contenido:** nueva sección «Cómo encontrar un valor crítico de chi-cuadrado», con los grados de libertad por tipo de contraste, un ejemplo de independencia y otro de intervalo para la varianza, y una advertencia sobre las tablas de cola derecha frente a las acumuladas. Nuevo bloque de preguntas frecuentes, también en el JSON-LD.
- **Hipótesis:** reducir la confusión entre las convenciones α y p, que es la causa más probable de rebote desde consultas de «valor crítico».

## Cómo evaluar

1. Comparar periodos completos de 28 días después del despliegue con los 28 días equivalentes anteriores, sin incluir días parciales.
2. Separar España, Latinoamérica y los mercados en inglés.
3. Distinguir la mejora de CTR de la mejora de posición: si la posición media cambia más de ~1 puesto, el aumento de clics no se puede atribuir al snippet.
4. Vigilar la variación de consultas: si aparecen consultas más genéricas, las impresiones pueden subir y el CTR bajar sin que la página empeore.
5. Usar como meta orientativa un +20 % de clics en el conjunto de las diez URLs (de ~1.090 a ~1.308 en 92 días), no como predicción.

## Lotes siguientes

- **Calculadoras inglesas de tamaño muestral** (población finita, correlación, ANOVA, dos proporciones): hechas en el lote 2, con el informe de consultas de todo el sitio porque no se disponía del desglose por URL. Nota original: no cambiar el title hasta disponer del desglose de consultas de cada URL. Títulos candidatos: «Finite Population Sample Size Calculator», «Correlation Sample Size Calculator», «ANOVA Sample Size Calculator», «Two Proportions Sample Size Calculator». En población finita, el title debe seguir indicando que es para una proporción.
- **Tablas Poisson y binomial en inglés:** ambas páginas ya ofrecen dos pestañas, P(X = k) y P(X ≤ k), y sus titles dicen «(Cumulative)». Falta comprobar si las consultas piden más «poisson table» / «binomial table» a secas o la versión acumulada, para decidir si el title debe nombrar las dos.
- **Beta en inglés:** incluida en el lote 2 con un title de calculadora (PDF, CDF y cuantiles). Nota original: dejar para el final e identificar primero la intención dominante (calculadora, PDF, CDF o uso bayesiano).

## Lote 2: páginas en inglés (title y description)

Fecha de despliegue: 02/11/2026.

Solo cambian el `<title>`, la meta description y sus copias en Open Graph y Twitter. No cambian el H1, el contenido ni las URLs. Se descartó traducir las URLs al inglés: la sección `/en/` ya aporta un tercio de los clics y posiciona bien con las URLs actuales, y el problema es el CTR.

**Situación de partida:** export de Search Console del 01/08/2026 al 31/10/2026 (92 días). Las quince URLs suman 98.439 impresiones y 722 clics (CTR 0,73 %).

| Página | Impresiones | Clics | CTR | Posición | Title nuevo |
|---|---:|---:|---:|---:|---|
| `/en/tabla-normal.html` | 15.130 | 61 | 0,40 % | 12,46 | Z Table: Standard Normal Distribution Table \| ProbLab |
| `/en/tamano-muestral-proporcion-poblacion-finita.html` | 11.835 | 47 | 0,40 % | 8,25 | Finite Population Sample Size Calculator (Proportion) |
| `/en/tabla-poisson.html` | 8.635 | 120 | 1,39 % | 7,65 | Poisson Distribution Table (Cumulative) – Free & Printable |
| `/en/tamano-muestral-correlacion.html` | 8.605 | 61 | 0,71 % | 6,46 | Sample Size Calculator for Correlation (Pearson r) \| ProbLab |
| `/en/tabla-t-student.html` | 8.013 | 27 | 0,34 % | 28,01 | t Table: Student's t Distribution Critical Values \| ProbLab |
| `/en/tamano-muestral-anova.html` | 7.809 | 53 | 0,68 % | 6,68 | ANOVA Sample Size Calculator (Cohen's f, Power) \| ProbLab |
| `/en/beta.html` | 5.478 | 51 | 0,93 % | 10,79 | Beta Distribution Calculator: PDF, CDF & Quantiles \| ProbLab |
| `/en/tabla-binomial.html` | 5.225 | 91 | 1,74 % | 9,56 | Binomial Distribution Table (Cumulative) – Free & Printable |
| `/en/normal.html` | 5.144 | 36 | 0,70 % | 19,62 | Normal Distribution Calculator: Probability & Percentiles |
| `/en/uniform.html` | 4.341 | 15 | 0,35 % | 8,80 | Uniform Distribution Calculator: PDF, CDF & Quantiles |
| `/en/studentt.html` | 3.903 | 29 | 0,74 % | 10,03 | Student's t Distribution Calculator: p-Values & Critical t |
| `/en/tamano-muestral-dos-proporciones.html` | 3.903 | 18 | 0,46 % | 9,14 | Sample Size Calculator for Two Proportions \| ProbLab |
| `/en/gamma.html` | 3.799 | 58 | 1,53 % | 9,19 | Gamma Distribution Calculator: PDF, CDF & Quantiles |
| `/en/shapiro-wilk-normalidad.html` | 3.640 | 45 | 1,24 % | 12,15 | Shapiro-Wilk Test Calculator (Normality, W & p-Value) |
| `/en/binomial.html` | 2.979 | 10 | 0,34 % | 17,48 | Binomial Distribution Calculator: P(X = k), P(X ≤ k) |

**Criterios:**

- El title empieza por el término que más se busca en inglés según el informe de consultas («z table», «t table», «poisson table», «… calculator») y se mantiene en unos 60 caracteres. Cuando la marca no cabe, se quita; Google suele añadir el nombre del sitio.
- La description (unos 130–160 caracteres) dice qué valores da la página y qué se puede hacer con ellos (CSV, impresión, gráfico, curva de potencia), sin prometer nada que la página no tenga.

**Hipótesis:** subir el CTR de las páginas que ya están entre las posiciones 6 y 10 (Poisson, correlación, ANOVA, población finita, binomial, uniforme). En las que están peor posicionadas (`tabla-t-student`, `normal`, `binomial`), un cambio de snippet tendrá poco efecto si no mejora la posición.

**Evaluación:** a las 4–6 semanas del despliegue, con el método de «Cómo evaluar», filtrando por los mercados en inglés (Estados Unidos, India, Reino Unido, Canadá, Australia, Filipinas). Meta orientativa: pasar del 0,73 % a un 1,0–1,2 % de CTR en el conjunto, a posición similar.
