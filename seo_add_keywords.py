#!/usr/bin/env python3
"""
Añade <meta name="keywords"> a todas las páginas HTML de problabtools.com.
Si la página ya tiene el tag, lo omite.
"""

import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))

# keywords por archivo
KEYWORDS: dict[str, list[str]] = {
    # ── Portada ────────────────────────────────────────────────────────────────
    "index.html": [
        "calculadora estadística online",
        "estadística online gratis",
        "herramientas estadísticas",
        "calculadora probabilidad",
        "distribuciones de probabilidad online",
        "tamaño muestral calculadora",
        "contraste de hipótesis online",
        "prueba de hipótesis calculadora",
        "intervalo de confianza calculadora",
        "tablas estadísticas online",
        "estadística para estudiantes",
        "ProbLab",
    ],

    # ── Distribuciones ─────────────────────────────────────────────────────────
    "normal.html": [
        "distribución normal calculadora",
        "campana de Gauss",
        "calcular probabilidad normal",
        "tabla distribución normal online",
        "curva normal online",
        "distribución gaussiana",
        "percentil distribución normal",
        "probabilidad acumulada normal",
        "calcular z estadística",
    ],
    "binomial.html": [
        "distribución binomial calculadora",
        "probabilidad binomial online",
        "calcular binomial",
        "ensayos de Bernoulli",
        "distribución binomial fórmula",
        "probabilidad acumulada binomial",
    ],
    "poisson.html": [
        "distribución Poisson calculadora",
        "probabilidad Poisson online",
        "proceso de Poisson",
        "distribución de Poisson fórmula",
        "calcular Poisson",
        "tiempo entre eventos Poisson",
    ],
    "studentt.html": [
        "distribución t de Student calculadora",
        "tabla t Student online",
        "distribución t calculadora",
        "cuantiles t Student",
        "probabilidad t de Student",
        "t de Student fórmula",
    ],
    "chisquare.html": [
        "distribución chi cuadrado calculadora",
        "chi-cuadrado online",
        "tabla chi cuadrado",
        "probabilidad chi cuadrado",
        "cuantiles chi cuadrado",
        "distribución chi-cuadrado fórmula",
    ],
    "centralf.html": [
        "distribución F de Fisher calculadora",
        "distribución F Snedecor",
        "tabla F online",
        "probabilidad distribución F",
        "cuantiles F de Snedecor",
        "distribución F ANOVA",
    ],
    "exponential.html": [
        "distribución exponencial calculadora",
        "probabilidad exponencial online",
        "tiempo entre eventos distribución exponencial",
        "distribución exponencial fórmula",
        "calcular distribución exponencial",
    ],
    "geometric.html": [
        "distribución geométrica calculadora",
        "probabilidad geométrica online",
        "primer éxito distribución geométrica",
        "distribución geométrica fórmula",
    ],
    "hypergeometric.html": [
        "distribución hipergeométrica calculadora",
        "probabilidad sin reemplazo",
        "distribución hipergeométrica fórmula",
        "muestreo sin reemplazo estadística",
    ],
    "gamma.html": [
        "distribución gamma calculadora",
        "función gamma estadística",
        "distribución gamma fórmula",
        "probabilidad distribución gamma",
    ],
    "beta.html": [
        "distribución beta calculadora",
        "distribución beta probabilidad",
        "variables acotadas distribución beta",
        "distribución beta fórmula",
    ],
    "lognormal.html": [
        "distribución lognormal calculadora",
        "distribución log-normal online",
        "probabilidad lognormal",
        "distribución lognormal fórmula",
        "variables positivas distribución",
    ],
    "negbin.html": [
        "distribución binomial negativa calculadora",
        "binomial negativa online",
        "número de fracasos distribución",
        "distribución binomial negativa fórmula",
    ],
    "weibull.html": [
        "distribución Weibull calculadora",
        "análisis de fiabilidad Weibull",
        "distribución Weibull fórmula",
        "probabilidad Weibull online",
        "tiempo de fallo Weibull",
    ],
    "uniform.html": [
        "distribución uniforme calculadora",
        "distribución uniforme continua",
        "probabilidad uniforme online",
        "distribución uniforme fórmula",
    ],
    "bernoulli.html": [
        "distribución Bernoulli calculadora",
        "ensayo de Bernoulli",
        "probabilidad éxito fracaso",
        "distribución Bernoulli fórmula",
    ],

    # ── Tablas estadísticas ───────────────────────────────────────────────────
    "tabla-normal.html": [
        "tabla distribución normal z",
        "tabla campana de Gauss",
        "valores z distribución normal",
        "tabla probabilidades normal estándar",
        "tabla z estadística",
    ],
    "tabla-t-student.html": [
        "tabla t de Student estadística",
        "valores críticos t Student",
        "tabla t bilateral unilateral",
        "grados de libertad t Student",
    ],
    "tabla-chi-cuadrado.html": [
        "tabla chi cuadrado estadística",
        "valores críticos chi cuadrado",
        "tabla chi-cuadrado grados de libertad",
    ],
    "tabla-f-snedecor.html": [
        "tabla F de Snedecor",
        "tabla distribución F estadística",
        "valores críticos F ANOVA",
        "tabla F grados de libertad",
    ],
    "tabla-binomial.html": [
        "tabla distribución binomial",
        "probabilidades acumuladas binomial",
        "tabla binomial estadística",
    ],
    "tabla-poisson.html": [
        "tabla distribución Poisson",
        "probabilidades Poisson acumuladas",
        "tabla Poisson lambda",
    ],
    "tabla-beta.html": [
        "tabla distribución beta",
        "cuantiles distribución beta",
        "tabla beta estadística",
    ],
    "tabla-gamma.html": [
        "tabla distribución gamma",
        "cuantiles distribución gamma",
        "tabla gamma estadística",
    ],

    # ── Tamaños muestrales ────────────────────────────────────────────────────
    "tamano-muestral-una-proporcion.html": [
        "calculadora tamaño muestral proporción",
        "calcular tamaño de muestra proporción",
        "muestra mínima para estimar proporción",
        "margen de error encuesta",
        "tamaño muestral estadística",
        "muestra aleatoria simple proporción",
    ],
    "tamano-muestral-una-media.html": [
        "calculadora tamaño muestral media",
        "calcular muestra para estimar media",
        "tamaño muestral desviación estándar",
        "muestra mínima estimación media",
        "precisión estadística tamaño muestra",
    ],
    "tamano-muestral-diferencia-medias.html": [
        "tamaño muestral dos medias independientes",
        "calcular muestra comparar medias",
        "tamaño muestral ensayo clínico",
        "potencia estadística diferencia medias",
        "muestra para detectar diferencias",
    ],
    "tamano-muestral-dos-proporciones.html": [
        "tamaño muestral dos proporciones",
        "calcular muestra comparar proporciones",
        "muestra para diferencia de proporciones",
        "potencia test dos proporciones",
    ],
    "tamano-muestral-medias-apareadas.html": [
        "tamaño muestral medias apareadas",
        "muestra para diferencias apareadas",
        "diseño apareado tamaño muestral",
        "muestras dependientes tamaño muestra",
    ],
    "tamano-muestral-proporciones-apareadas.html": [
        "tamaño muestral proporciones apareadas",
        "McNemar tamaño muestral",
        "proporciones dependientes tamaño muestra",
        "discordancias tamaño muestral",
    ],
    "tamano-muestral-media-poblacion-finita.html": [
        "tamaño muestral población finita media",
        "corrección población finita estadística",
        "muestra finita estimación media",
    ],
    "tamano-muestral-proporcion-poblacion-finita.html": [
        "tamaño muestral proporción población finita",
        "corrección finita proporción",
        "muestra finita estimación proporción",
    ],

    # ── Intervalos de confianza ───────────────────────────────────────────────
    "intervalo-confianza-media.html": [
        "intervalo de confianza media calculadora",
        "calcular intervalo de confianza media",
        "IC media sigma desconocida",
        "intervalo de confianza t Student",
        "intervalo confianza media muestra pequeña",
    ],
    "intervalo-confianza-media-sigma-conocida.html": [
        "intervalo de confianza media sigma conocida",
        "IC media desviación típica conocida",
        "intervalo de confianza z",
        "calcular IC media poblacional",
    ],
    "intervalo-confianza-proporcion.html": [
        "intervalo de confianza proporción calculadora",
        "calcular IC proporción",
        "intervalo de Wilson proporción",
        "intervalo de confianza Wald",
        "IC proporción muestral",
    ],
    "intervalo-confianza-diferencia-medias.html": [
        "intervalo de confianza diferencia medias",
        "IC dos medias independientes",
        "calcular IC diferencia de medias",
        "intervalo confianza comparar medias",
    ],
    "intervalo-confianza-varianza.html": [
        "intervalo de confianza varianza calculadora",
        "IC varianza chi-cuadrado",
        "intervalo confianza desviación típica",
        "calcular IC varianza poblacional",
    ],

    # ── Contrastes de hipótesis ───────────────────────────────────────────────
    "contraste-hipotesis-una-media.html": [
        "contraste hipótesis una media",
        "prueba de hipótesis media",
        "test t una muestra",
        "calcular p-valor media",
        "nivel de significancia media",
        "región de rechazo media",
        "error tipo I tipo II estadística",
    ],
    "contraste-hipotesis-dos-medias.html": [
        "contraste hipótesis dos medias",
        "prueba de hipótesis dos muestras",
        "test t dos muestras independientes",
        "comparar medias estadística",
        "calcular p-valor dos medias",
        "diferencia de medias significativa",
    ],
    "contraste-hipotesis-una-proporcion.html": [
        "contraste hipótesis proporción",
        "prueba de hipótesis proporción",
        "test proporciones estadística",
        "calcular p-valor proporción",
        "contraste una proporción z test",
    ],
    "contraste-hipotesis-dos-proporciones.html": [
        "contraste hipótesis dos proporciones",
        "prueba de hipótesis dos proporciones",
        "comparar proporciones estadística",
        "calcular p-valor dos proporciones",
        "test chi cuadrado proporciones",
    ],
    "contraste-hipotesis-varianzas.html": [
        "contraste hipótesis varianzas",
        "prueba de hipótesis varianzas",
        "test F varianzas",
        "comparar varianzas estadística",
        "test de Levene alternativa",
    ],
    "contraste-independencia-chi-cuadrado.html": [
        "test independencia chi cuadrado",
        "prueba independencia chi-cuadrado",
        "chi cuadrado independencia calculadora",
        "tabla de contingencia chi cuadrado",
        "asociación entre variables categóricas",
    ],
    "chi-cuadrado-bondad-ajuste.html": [
        "chi cuadrado bondad de ajuste",
        "goodness of fit chi square",
        "prueba bondad de ajuste chi-cuadrado",
        "ajuste distribución teórica",
    ],
    "kolmogorov-smirnov-bondad-ajuste.html": [
        "test Kolmogorov-Smirnov",
        "prueba de normalidad KS",
        "bondad de ajuste Kolmogorov-Smirnov",
        "test normalidad online",
    ],
    "shapiro-wilk-normalidad.html": [
        "test Shapiro-Wilk",
        "prueba normalidad Shapiro-Wilk",
        "test de normalidad online",
        "calcular W Shapiro-Wilk",
        "comprobar normalidad datos",
    ],
    "test-exacto-fisher.html": [
        "test exacto de Fisher",
        "prueba exacta Fisher estadística",
        "tablas 2x2 estadística",
        "Fisher exact test calculadora",
        "odds ratio tabla contingencia",
    ],
    "anova.html": [
        "ANOVA calculadora online",
        "análisis de varianza ANOVA",
        "test F ANOVA",
        "comparar grupos estadística",
        "ANOVA un factor online",
        "suma de cuadrados ANOVA",
        "eta cuadrado tamaño efecto",
    ],

    # ── A/B testing ───────────────────────────────────────────────────────────
    "ab-testing-z-test.html": [
        "calculadora AB testing",
        "test A/B estadístico",
        "significancia estadística A/B test",
        "z test proporciones AB",
        "calcular significancia AB testing",
        "p-valor A/B test",
    ],
    "ab-testing-bayesiano.html": [
        "A/B testing bayesiano calculadora",
        "estadística bayesiana AB test",
        "probabilidad de ganador AB test",
        "test bayesiano conversión",
        "A/B testing sin p-valor",
    ],
    "ab-testing-simulacion.html": [
        "simulación A/B testing",
        "simulador experimento estadístico",
        "Monte Carlo A/B test",
        "simular resultados AB testing",
    ],
    "ab-testing-potencia.html": [
        "potencia estadística A/B testing",
        "calcular potencia test AB",
        "error tipo II AB testing",
        "tamaño muestral potencia AB",
        "diseño experimento AB testing",
    ],
}

# keywords comunes a todas las páginas
COMMON = [
    "ProbLab",
    "estadística online",
    "calculadora estadística",
]


def read(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


def write(path: str, content: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def build_keywords_tag(filename: str) -> str:
    specific = KEYWORDS.get(filename, [])
    combined = specific + [k for k in COMMON if k not in specific]
    return f'    <meta name="keywords" content="{", ".join(combined)}">'


def process(filepath: str) -> bool:
    filename = os.path.basename(filepath)
    content = read(filepath)

    if 'name="keywords"' in content:
        print(f"  - {filename}: ya tiene keywords, omitido")
        return False

    tag = build_keywords_tag(filename)
    # Insertar justo después de <meta name="description" ...>
    new_content = re.sub(
        r'(<meta name="description"[^>]*>)',
        r'\1\n' + tag,
        content,
        count=1,
    )
    if new_content == content:
        print(f"  ? {filename}: no se encontró description tag, omitido")
        return False

    write(filepath, new_content)
    print(f"  ✓ {filename}")
    return True


def main() -> None:
    html_files = sorted(
        os.path.join(BASE, f)
        for f in os.listdir(BASE)
        if f.endswith(".html")
    )
    print(f"Procesando {len(html_files)} archivos…\n")
    changed = sum(process(fp) for fp in html_files)
    print(f"\nListo. {changed} archivos actualizados.")


if __name__ == "__main__":
    main()
