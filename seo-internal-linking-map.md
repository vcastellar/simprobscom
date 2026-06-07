# Mapa SEO de enlazado interno y autoridad por clúster

Este documento define la arquitectura silo de ProbLab para que la autoridad fluya **Home → hubs de clúster → subpáginas → hub** y para reducir canibalización entre páginas de intención similar.

## CLUSTER: Distribuciones de probabilidad

- **Hub page:** `/distribuciones/`
- **Subpages:** `/normal.html`, `/binomial.html`, `/poisson.html`, `/studentt.html`, `/chisquare.html`, `/centralf.html`, `/exponential.html`, `/uniform.html`, `/gamma.html`, `/beta.html`, `/lognormal.html`, `/weibull.html`, `/negbin.html`, `/geometric.html`, `/hypergeometric.html`, `/bernoulli.html`
- **Issues:** el hub era correcto, pero varios anchors eran demasiado cortos para reforzar intención SEO; `/distribuciones/f.html` es una URL histórica redirigida y no debe competir con `/centralf.html`.
- **Fixes:** usar anchors descriptivos desde el hub hacia cada calculadora; mantener `/distribuciones/f.html` como redirección canonical/noindex hacia `/centralf.html`.
- **Internal linking rules:** Home enlaza a `/distribuciones/`; el hub enlaza a todas las calculadoras; cada calculadora enlaza de vuelta al hub mediante breadcrumb/CTA; las tablas enlazan a la distribución relacionada solo como apoyo contextual.
- **Suggested anchor texts:** “calculadora de distribución normal”, “calculadora de distribución binomial”, “calculadora de distribución de Poisson”, “calculadora de distribución F de Fisher”.
- **Priority:** High

## CLUSTER: Tablas estadísticas

- **Hub page:** `/tablas-estadisticas/`
- **Subpages:** `/tabla-normal.html`, `/tabla-t-student.html`, `/tabla-chi-cuadrado.html`, `/tabla-f-snedecor.html`, `/tabla-binomial.html`, `/tabla-poisson.html`, `/tabla-gamma.html`, `/tabla-beta.html`
- **Issues:** estructura fuerte; el riesgo principal es mezclar la intención de “tabla” con “calculadora de distribución”.
- **Fixes:** mantener el hub como página pilar de tablas y usar enlaces cruzados hacia distribuciones solo cuando ayuden a calcular PDF/CDF/percentiles.
- **Internal linking rules:** Home → `/tablas-estadisticas/`; hub → todas las tablas; tabla → hub; tabla → distribución equivalente solo con anchor secundario.
- **Suggested anchor texts:** “tabla normal estándar”, “tabla t de Student con valores críticos”, “tabla chi-cuadrado de cuantiles”, “tabla F de Snedecor”.
- **Priority:** Medium

## CLUSTER: Intervalos de confianza

- **Hub page:** `/intervalos-confianza/`
- **Subpages:** `/intervalo-confianza-media-sigma-conocida.html`, `/intervalo-confianza-media.html`, `/intervalo-confianza-medias-apareadas.html`, `/intervalo-confianza-proporcion.html`, `/intervalo-confianza-diferencia-medias.html`, `/intervalo-confianza-diferencia-proporciones.html`, `/intervalo-confianza-ratio-proporciones.html`, `/intervalo-confianza-odds-ratio.html`, `/intervalo-confianza-varianza.html`, `/intervalo-confianza-proporcion-poblacion-finita.html`, `/intervalo-confianza-media-poblacion-finita.html`
- **Issues:** hub correcto; `/intervalo-confianza-correlacion.html` es una URL histórica que redirige a una herramienta de correlación y no debe indexarse como IC independiente.
- **Fixes:** reforzar anchors largos desde el hub; marcar la URL histórica como canonical/noindex.
- **Internal linking rules:** Home → hub; hub → todos los IC específicos; cada IC → hub; páginas de tamaño muestral IC enlazan a su IC correspondiente como soporte, no como página pilar.
- **Suggested anchor texts:** “calculadora de intervalo de confianza para una media”, “intervalo de confianza para diferencia de proporciones”, “intervalo de confianza para odds ratio”.
- **Priority:** High

## CLUSTER: Tamaño muestral

- **Hub page:** `/tamano-muestral/`
- **Subpages:** calculadoras de tamaño muestral para IC, contrastes, ANOVA, correlación, Fisher, Shapiro–Wilk, Kolmogorov–Smirnov, odds ratio y población finita.
- **Issues:** el hub es fuerte, pero debe separar claramente intención de estimación con IC frente a potencia/contraste; `/tamano-muestral/tamano-muestral-contraste-una-media.html` es una URL histórica redirigida.
- **Fixes:** anchors descriptivos por objetivo; URL histórica canonical/noindex hacia `/tamano-muestral-contraste-una-media.html`.
- **Internal linking rules:** Home → hub; hub → todas las calculadoras; cada calculadora → hub; páginas de test A/B pueden enlazar a tamaño muestral A/B como herramienta relacionada sin sustituir al hub.
- **Suggested anchor texts:** “calculadora de tamaño muestral para una proporción”, “tamaño muestral para contraste de una media”, “tamaño muestral para ANOVA”.
- **Priority:** High

## CLUSTER: Contrastes de hipótesis

- **Hub page:** `/contrastes-hipotesis/`
- **Subpages:** `/contraste-hipotesis-una-media.html`, `/contraste-hipotesis-dos-medias.html`, `/contraste-hipotesis-medias-apareadas.html`, `/contraste-hipotesis-una-proporcion.html`, `/contraste-hipotesis-dos-proporciones.html`, `/contraste-hipotesis-proporciones-apareadas.html`, `/contraste-hipotesis-correlacion.html`, `/contraste-hipotesis-varianzas.html`, `/contraste-hipotesis-dos-varianzas.html`, `/anova.html`, `/contraste-independencia-chi-cuadrado.html`, `/chi-cuadrado-bondad-ajuste.html`, `/test-exacto-fisher.html`, `/kolmogorov-smirnov-bondad-ajuste.html`, `/shapiro-wilk-normalidad.html`, `/contraste-hipotesis-odds-ratio.html`, `/contraste-hipotesis-no-inferioridad.html`, `/potencia-contraste-una-proporcion.html`, `/potencia-test-ab.html`
- **Issues:** hub era correcto, pero algunos anchors eran genéricos; URLs históricas `/chi-cuadrado-independencia.html`, `/contraste-hipotesis-diferencia-medias.html` y `/odds-ratio.html` podían parecer páginas competidoras.
- **Fixes:** anchors diferenciados desde el hub; URLs históricas canonical/noindex a sus destinos finales.
- **Internal linking rules:** Home → hub; hub → todos los tests; cada test → hub; páginas de distribución normal/t/chi-cuadrado/F se enlazan como apoyo matemático, no como reemplazo del clúster de contrastes.
- **Suggested anchor texts:** “calculadora de contraste de hipótesis para una media”, “test de McNemar para proporciones apareadas”, “chi-cuadrado de independencia”, “test de Shapiro–Wilk de normalidad”.
- **Priority:** High

## CLUSTER: Test A/B

- **Hub page:** `/ab-testing/`
- **Subpages:** `/ab-testing-z-test.html`, `/ab-testing-potencia.html`, `/ab-testing-simulacion.html`, `/ab-testing-bayesiano.html`
- **Issues:** estructura limpia; el riesgo de canibalización está entre el hub “qué es un test A/B” y páginas transaccionales de z-test/potencia.
- **Fixes:** el hub conserva intención informativa amplia; subpáginas usan anchors de herramienta específica.
- **Internal linking rules:** Home → hub; hub → cuatro herramientas; cada herramienta → hub; herramientas de potencia pueden enlazar a tamaño muestral como apoyo.
- **Suggested anchor texts:** “calculadora de test Z para dos conversiones A/B”, “MDE, potencia y tamaño muestral A/B”, “test A/B bayesiano Beta-Binomial”.
- **Priority:** Medium

## CLUSTER: Simulaciones estadísticas

- **Hub page:** `/simulaciones/`
- **Subpages:** `/simulaciones/teorema-central-limite.html`, `/simulaciones/simulador-intervalos-confianza.html`, `/simulaciones/simulador-cadenas-markov.html`, `/simulaciones/simulador-proceso-poisson.html`, `/simulaciones/simulador-paseo-aleatorio.html`, `/simulaciones/simulador-errores-tipo-i-ii.html`, `/simulaciones/simulador-bootstrap.html`
- **Issues:** estructura fuerte y sin huérfanas; los simuladores deben apoyar conceptos, no competir con calculadoras transaccionales.
- **Fixes:** hub marcado como pilar de simulaciones; enlaces cruzados hacia distribuciones, intervalos y contrastes solo como rutas de aprendizaje.
- **Internal linking rules:** Home → hub; hub → todos los simuladores; simulador → hub; enlaces laterales a calculadoras relacionadas cuando la intención sea complementaria.
- **Suggested anchor texts:** “simulador del teorema central del límite”, “simulador de intervalos de confianza”, “simulador de errores tipo I y tipo II”.
- **Priority:** Medium
