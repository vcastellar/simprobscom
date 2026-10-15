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

- **Calculadoras inglesas de tamaño muestral** (población finita, correlación, ANOVA, dos proporciones): no cambiar el title hasta disponer del desglose de consultas de cada URL. Títulos candidatos: «Finite Population Sample Size Calculator», «Correlation Sample Size Calculator», «ANOVA Sample Size Calculator», «Two Proportions Sample Size Calculator». En población finita, el title debe seguir indicando que es para una proporción.
- **Tablas Poisson y binomial en inglés:** ambas páginas ya ofrecen dos pestañas, P(X = k) y P(X ≤ k), y sus titles dicen «(Cumulative)». Falta comprobar si las consultas piden más «poisson table» / «binomial table» a secas o la versión acumulada, para decidir si el title debe nombrar las dos.
- **Beta en inglés:** dejar para el final e identificar primero la intención dominante (calculadora, PDF, CDF o uso bayesiano).
