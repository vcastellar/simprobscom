#!/usr/bin/env python3
"""Refresca las fechas <lastmod> de sitemap.xml con la fecha real del último
cambio de cada página (fecha de commit de git) y avisa de páginas .html
publicables que aún no estén en el sitemap.

Diseño intencionado:
- NO reinventa <priority> ni <changefreq>: esos valores están curados a mano
  (home 1.0, hubs 0.9, resto 0.8/0.6) y se conservan intactos.
- Solo actualiza <lastmod>, que es lo único que se queda desactualizado y lo
  que Bing/Google usan para decidir cuándo re-rastrear.

Uso:  python3 generate_sitemap.py          (reescribe sitemap.xml)
      python3 generate_sitemap.py --check  (no escribe; solo informa)

Ejecútalo en cada despliegue para que el sitemap no vuelva a quedarse rancio.
"""
import os
import re
import subprocess
import sys
import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SITEMAP = os.path.join(ROOT, "sitemap.xml")
DOMAIN = "https://problabtools.com/"

# Páginas .html que deben quedar FUERA del sitemap a propósito:
# legales/utilidad + URLs históricas que redirigen (noindex/canonical).
EXCLUDED = {
    "aviso-legal.html", "cookies.html", "privacidad.html", "legal.html",
    "libros.html", "en/cookies.html", "en/privacidad.html",
    "chi-cuadrado-independencia.html", "contraste-hipotesis-diferencia-medias.html",
    "distribuciones/f.html", "intervalo-confianza-correlacion.html",
    "odds-ratio.html", "tamano-muestral/tamano-muestral-contraste-una-media.html",
}


def loc_to_file(loc):
    """Convierte una URL del sitemap en su fichero local."""
    path = loc[len(DOMAIN):] if loc.startswith(DOMAIN) else loc
    if path == "" or path.endswith("/"):
        path += "index.html"
    return path


def file_to_url_path(relpath):
    """Convierte un fichero local en la forma de URL canónica del sitemap."""
    relpath = relpath.replace("\\", "/")
    if relpath == "index.html":
        return ""
    if relpath.endswith("/index.html"):
        return relpath[: -len("index.html")]
    return relpath


def git_lastmod(relpath):
    """Fecha (YYYY-MM-DD) del último commit que tocó el fichero; hoy si no hay."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", relpath],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
        if out:
            return out
    except Exception:
        pass
    return datetime.date.today().isoformat()


def all_html_files():
    files = []
    for base, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d != ".git"]
        for n in names:
            if n.endswith(".html"):
                files.append(os.path.relpath(os.path.join(base, n), ROOT).replace("\\", "/"))
    return files


def main():
    check_only = "--check" in sys.argv
    xml = open(SITEMAP, encoding="utf-8").read()

    sitemap_paths = set()
    updated = [0]

    def repl(block):
        m = re.search(r"<loc>([^<]+)</loc>", block.group(0))
        if not m:
            return block.group(0)
        loc = m.group(1)
        relfile = loc_to_file(loc)
        sitemap_paths.add(file_to_url_path(relfile))
        if not os.path.exists(os.path.join(ROOT, relfile)):
            print(f"  AVISO: {loc} apunta a un fichero inexistente ({relfile})")
            return block.group(0)
        newdate = git_lastmod(relfile)
        def sub_lastmod(mm):
            if mm.group(1) != newdate:
                updated[0] += 1
            return f"<lastmod>{newdate}</lastmod>"
        return re.sub(r"<lastmod>([^<]*)</lastmod>", sub_lastmod, block.group(0))

    new_xml = re.sub(r"<url>.*?</url>", repl, xml, flags=re.S)

    # Avisar de páginas publicables no cubiertas
    covered = sitemap_paths
    missing = []
    for f in all_html_files():
        urlpath = file_to_url_path(f)
        if urlpath in covered or f in EXCLUDED:
            continue
        missing.append(f)
    if missing:
        print("\n  Páginas .html NO incluidas en el sitemap (revisa si deberían estar):")
        for m in sorted(missing):
            print(f"    - {m}")

    if check_only:
        print(f"\n[check] {updated[0]} fecha(s) desactualizada(s); {len(missing)} página(s) sin cubrir.")
        return

    if new_xml != xml:
        with open(SITEMAP, "w", encoding="utf-8") as fh:
            fh.write(new_xml)
        print(f"\nsitemap.xml actualizado: {updated[0]} fecha(s) refrescada(s).")
    else:
        print("\nsitemap.xml ya estaba al día.")


if __name__ == "__main__":
    main()
