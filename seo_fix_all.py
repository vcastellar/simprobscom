#!/usr/bin/env python3
"""
Comprehensive SEO fixes for problabtools.com:
  1. Fix broken canonical URL in tabla-chi-cuadrado.html
  2. Fix titles > 70 chars (title, og:title, twitter:title)
  3. Fix descriptions > 165 chars (meta desc, og:description, twitter:description)
  4. Add BreadcrumbList + WebPage schemas to tabla-*.html pages
  5. Add FAQPage JSON-LD to pages with FAQ content outside seo-support-content
"""

import re
import os
import json
import html as html_module

BASE = "/home/user/simprobs"

# ── helpers ──────────────────────────────────────────────────────────────────

def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()

def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def strip_tags(s):
    s = re.sub(r"<[^>]+>", "", s)
    return html_module.unescape(s).strip()

# ── Fix 1: Canonical URLs ─────────────────────────────────────────────────────

CANONICAL_FIXES = {
    "tabla-chi-cuadrado.html": "https://problabtools.com/tabla-chi-cuadrado.html",
}

def fix_canonical(content, correct_url):
    content = re.sub(
        r'<link rel="canonical" href="[^"]+"',
        f'<link rel="canonical" href="{correct_url}"',
        content
    )
    content = re.sub(
        r'<meta property="og:url" content="[^"]+"',
        f'<meta property="og:url" content="{correct_url}"',
        content
    )
    return content

# ── Fix 2 & 3: Titles and Descriptions ───────────────────────────────────────

# title → (new_title, new_description)  — None means no change
META_FIXES = {
    "index.html": {
        "title": "Calculadoras estadísticas online | ProbLab",
        "desc": "Calculadoras estadísticas gratuitas: distribuciones de probabilidad, tamaños muestrales y contrastes de hipótesis. Con explicación, fórmulas y ejemplos.",
    },
    "contraste-hipotesis-dos-proporciones.html": {
        "title": "Contraste de hipótesis para dos proporciones | ProbLab",
    },
    "contraste-hipotesis-una-proporcion.html": {
        "title": "Contraste de hipótesis para una proporción | ProbLab",
    },
    "intervalo-confianza-media.html": {
        "title": "Intervalo de confianza para la media (t de Student) | ProbLab",
        "desc": "Calculadora del intervalo de confianza para la media con σ desconocida. Usa la distribución t de Student. Fórmula, gráfico y tabla de resultados.",
    },
    "tabla-chi-cuadrado.html": {
        "title": "Tabla Chi-cuadrado: probabilidades y valores críticos | ProbLab",
        "desc": "Tabla de la distribución Chi-cuadrado: densidad f(x,ν), probabilidad acumulada P(X≤x) y valores críticos χ²(p,ν) para cualquier grado de libertad.",
    },
    "tabla-t-student.html": {
        "title": "Tabla t de Student: probabilidades y valores críticos | ProbLab",
        "desc": "Tabla t de Student: densidad f(t,ν), probabilidad acumulada P(T≤t) y valores críticos por grado de libertad y nivel de significación.",
    },
    "tamano-muestral-media-poblacion-finita.html": {
        "title": "Tamaño muestral: media en población finita | ProbLab",
    },
    "tamano-muestral-proporcion-poblacion-finita.html": {
        "title": "Tamaño muestral: proporción en población finita | ProbLab",
    },
    "intervalo-confianza-diferencia-medias.html": {
        "desc": "Calculadora del intervalo de confianza para la diferencia de dos medias independientes. Varianzas iguales o distintas. Fórmula, gráfico y ejemplos.",
    },
    "ab-testing/index.html": {
        "desc": "Herramientas estadísticas para test A/B: contraste Z, análisis bayesiano, cálculo de potencia y simulación de experimentos. Online y gratuitas.",
    },
}

def fix_meta(content, fixes):
    if "title" in fixes:
        new_title = fixes["title"]
        content = re.sub(r"<title>[^<]+</title>", f"<title>{new_title}</title>", content)
        content = re.sub(
            r'<meta property="og:title" content="[^"]+"',
            f'<meta property="og:title" content="{new_title}"',
            content
        )
        content = re.sub(
            r'<meta name="twitter:title" content="[^"]+"',
            f'<meta name="twitter:title" content="{new_title}"',
            content
        )
    if "desc" in fixes:
        new_desc = fixes["desc"]
        content = re.sub(
            r'<meta name="description" content="[^"]+"',
            f'<meta name="description" content="{new_desc}"',
            content
        )
        content = re.sub(
            r'<meta property="og:description" content="[^"]+"',
            f'<meta property="og:description" content="{new_desc}"',
            content
        )
        content = re.sub(
            r'<meta name="twitter:description" content="[^"]+"',
            f'<meta name="twitter:description" content="{new_desc}"',
            content
        )
    return content

# ── Fix 4: Add schemas to tabla-*.html pages ─────────────────────────────────

TABLA_SCHEMAS = {
    "tabla-normal.html": {
        "name": "Tabla distribución Normal estándar — f(z) y Φ(z) | ProbLab",
        "breadcrumb_name": "Tabla Normal estándar",
        "url": "https://problabtools.com/tabla-normal.html",
        "desc": "Tabla completa de la distribución Normal estándar (μ=0, σ=1): función de densidad f(z) y probabilidad acumulada Φ(z) = P(Z≤z), para z de −3.49 a 3.49.",
    },
    "tabla-binomial.html": {
        "name": "Tabla distribución Binomial — P(X=k) y P(X≤k) | ProbLab",
        "breadcrumb_name": "Tabla Binomial",
        "url": "https://problabtools.com/tabla-binomial.html",
        "desc": "Tabla completa de la distribución Binomial: función de masa P(X=k) y distribución acumulada P(X≤k) para distintos valores de n y p.",
    },
    "tabla-chi-cuadrado.html": {
        "name": "Tabla Chi-cuadrado: probabilidades y valores críticos | ProbLab",
        "breadcrumb_name": "Tabla Chi-cuadrado",
        "url": "https://problabtools.com/tabla-chi-cuadrado.html",
        "desc": "Tabla de la distribución Chi-cuadrado: densidad f(x,ν), probabilidad acumulada P(X≤x) y valores críticos χ²(p,ν) para cualquier grado de libertad.",
    },
    "tabla-t-student.html": {
        "name": "Tabla t de Student: probabilidades y valores críticos | ProbLab",
        "breadcrumb_name": "Tabla t de Student",
        "url": "https://problabtools.com/tabla-t-student.html",
        "desc": "Tabla t de Student: densidad f(t,ν), probabilidad acumulada P(T≤t) y valores críticos por grado de libertad y nivel de significación.",
    },
    "tabla-f-snedecor.html": {
        "name": "Tabla distribución F de Snedecor — valores críticos | ProbLab",
        "breadcrumb_name": "Tabla F de Snedecor",
        "url": "https://problabtools.com/tabla-f-snedecor.html",
        "desc": "Tabla completa de la distribución F de Snedecor: valores críticos F(α, ν₁, ν₂) para análisis de varianza y contrastes de razón de varianzas.",
    },
    "tabla-gamma.html": {
        "name": "Tabla distribución Gamma — f(x), P(X≤x) y cuantiles | ProbLab",
        "breadcrumb_name": "Tabla Gamma",
        "url": "https://problabtools.com/tabla-gamma.html",
        "desc": "Tabla completa de la distribución Gamma: función de densidad f(x), distribución acumulada P(X≤x) y cuantiles para distintos parámetros de forma y escala.",
    },
    "tabla-beta.html": {
        "name": "Tabla distribución Beta — f(x), P(X≤x) y cuantiles | ProbLab",
        "breadcrumb_name": "Tabla Beta",
        "url": "https://problabtools.com/tabla-beta.html",
        "desc": "Tabla completa de la distribución Beta: función de densidad f(x), distribución acumulada P(X≤x) y cuantiles para distintos parámetros α y β.",
    },
    "tabla-poisson.html": {
        "name": "Tabla distribución de Poisson — P(X=k) y P(X≤k) | ProbLab",
        "breadcrumb_name": "Tabla Poisson",
        "url": "https://problabtools.com/tabla-poisson.html",
        "desc": "Tabla completa de la distribución de Poisson: función de masa P(X=k) y distribución acumulada P(X≤k) para distintos valores del parámetro λ.",
    },
}

def build_tabla_schema(info):
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Inicio",
                        "item": "https://problabtools.com/"
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Tablas estadísticas",
                        "item": "https://problabtools.com/tablas-estadisticas/"
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": info["breadcrumb_name"],
                        "item": info["url"]
                    }
                ]
            },
            {
                "@type": "WebPage",
                "name": info["name"],
                "url": info["url"],
                "description": info["desc"],
                "inLanguage": "es",
                "isPartOf": {
                    "@type": "WebSite",
                    "name": "ProbLab",
                    "url": "https://problabtools.com/"
                }
            }
        ]
    }
    return (
        '\n    <script type="application/ld+json">\n'
        + json.dumps(schema, ensure_ascii=False, indent=2)
        + "\n    </script>"
    )

def add_tabla_schema(content, info):
    if '"@type": "BreadcrumbList"' in content:
        return content, False
    ld = build_tabla_schema(info)
    new_content = content.replace("</head>", ld + "\n</head>", 1)
    return new_content, new_content != content

# ── Fix 5: FAQPage for pages with FAQ content outside seo-support-content ─────

# Pages whose FAQ content lives in the main body (not in seo-support-content)
FAQ_BODY_PAGES = {
    "chi-cuadrado-bondad-ajuste.html",
    "contraste-hipotesis-varianzas.html",
    "contraste-independencia-chi-cuadrado.html",
    "kolmogorov-smirnov-bondad-ajuste.html",
    "shapiro-wilk-normalidad.html",
    "test-exacto-fisher.html",
}

FAQ_ITEM_RE = re.compile(
    r'<li>\s*<strong>\s*(¿[^<]+)</strong>\s*(.*?)</li>',
    re.DOTALL
)

SEO_OPEN_RE = re.compile(r'<section[^>]+id="seo-support-content"[^>]*>')

def find_seo_section_bounds(content):
    m = SEO_OPEN_RE.search(content)
    if not m:
        return None, None
    open_tag_start = m.start()
    pos = m.end()
    depth = 1
    while pos < len(content) and depth > 0:
        next_open = content.find("<section", pos)
        next_close = content.find("</section>", pos)
        if next_close == -1:
            return None, None
        if next_open != -1 and next_open < next_close:
            depth += 1
            pos = next_open + len("<section")
        else:
            depth -= 1
            if depth == 0:
                return open_tag_start, next_close + len("</section>")
            pos = next_close + len("</section>")
    return None, None

def extract_body_faqs(content):
    """Extract FAQ pairs from the entire page (¿-question items with <strong>)."""
    pairs = []
    for m in FAQ_ITEM_RE.finditer(content):
        question = strip_tags(m.group(1))
        answer = strip_tags(m.group(2))
        if question and answer:
            pairs.append((question, answer))
    return pairs

def build_faqpage_ld(pairs):
    entities = [
        {
            "@type": "Question",
            "name": q,
            "acceptedAnswer": {"@type": "Answer", "text": a},
        }
        for q, a in pairs
    ]
    schema = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": entities}
    return (
        '\n    <script type="application/ld+json">\n'
        + json.dumps(schema, ensure_ascii=False, indent=2)
        + "\n    </script>"
    )

def add_body_faqpage(content):
    if '"@type": "FAQPage"' in content:
        return content, False
    pairs = extract_body_faqs(content)
    if not pairs:
        return content, False
    ld = build_faqpage_ld(pairs)
    new_content = content.replace("</head>", ld + "\n</head>", 1)
    return new_content, new_content != content

# ── main ─────────────────────────────────────────────────────────────────────

def process(filepath):
    relpath = os.path.relpath(filepath, BASE)
    filename = os.path.basename(filepath)
    content = read(filepath)
    changes = []

    # Fix 1: Canonical URL
    if filename in CANONICAL_FIXES:
        new = fix_canonical(content, CANONICAL_FIXES[filename])
        if new != content:
            content = new
            changes.append("canonical URL fixed")

    # Fix 2 & 3: Titles and descriptions
    fix_key = relpath.replace(os.sep, "/")  # normalize for subdir files
    if fix_key in META_FIXES:
        new = fix_meta(content, META_FIXES[fix_key])
        if new != content:
            content = new
            changes.append("title/desc shortened")

    # Fix 4: Add schemas to tabla pages
    if filename in TABLA_SCHEMAS:
        new, changed = add_tabla_schema(content, TABLA_SCHEMAS[filename])
        if changed:
            content = new
            changes.append("BreadcrumbList+WebPage schema added")

    # Fix 5: FAQPage for pages with FAQ in body
    if filename in FAQ_BODY_PAGES:
        new, changed = add_body_faqpage(content)
        if changed:
            content = new
            changes.append("FAQPage JSON-LD added")

    if changes:
        write(filepath, content)
        print(f"  ✓ {relpath}: {', '.join(changes)}")
    else:
        print(f"  - {relpath}: no changes")

def main():
    # Root HTML files
    html_files = sorted(
        os.path.join(BASE, f)
        for f in os.listdir(BASE)
        if f.endswith(".html")
    )
    # Subdirectory index files
    subdirs = ["ab-testing", "distribuciones", "tablas-estadisticas",
               "intervalos-confianza", "tamano-muestral", "contrastes-hipotesis"]
    for sd in subdirs:
        idx = os.path.join(BASE, sd, "index.html")
        if os.path.exists(idx):
            html_files.append(idx)

    print(f"Processing {len(html_files)} files…\n")
    for fp in html_files:
        process(fp)
    print("\nDone.")

if __name__ == "__main__":
    main()
