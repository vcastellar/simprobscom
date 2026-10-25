#!/usr/bin/env python3
"""Genera el índice del asistente RAG (rag/index-es.json y rag/index-en.json).

Recorre las páginas .html publicables, extrae el texto explicativo de <main>
(sin la interfaz de la calculadora ni las tablas numéricas), lo trocea por
secciones h2/h3 y precalcula los términos de cada trozo para la búsqueda BM25
que hace api/rag.php.

IMPORTANTE: tokenize() debe comportarse igual que rag_tokenize() en
api/rag.php; si cambias una, cambia la otra.

Uso:  python3 rag/build_index.py

Ejecútalo en cada despliegue (junto a generate_sitemap.py) para que el
asistente responda con el contenido actual de la web.
"""
import json
import os
import re
import sys
import unicodedata
from collections import Counter

from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "rag")
DOMAIN = "https://problabtools.com/"

# Páginas sin contenido estadístico o que solo redirigen.
EXCLUDED = {
    "aviso-legal.html", "cookies.html", "privacidad.html", "legal.html",
    "libros.html", "asistente.html", "sobre.html",
    "chi-cuadrado-independencia.html", "contraste-hipotesis-diferencia-medias.html",
    "intervalo-confianza-correlacion.html", "odds-ratio.html",
}

MAX_CHARS = 1400   # tamaño máximo de un trozo
MIN_CHARS = 200    # trozos más cortos se unen al siguiente de la misma página
STEM_LEN = 6

STOPWORDS = set("""
a al algo ante como con contra cual cuales cuando de del desde donde e el ella
ellos en entre era es esa ese eso esta este esto estos estas fue ha hay la las
le les lo los mas me mi mas muy ni no nos o os otra otro para pero por porque
que quien se sea ser si sin sobre son su sus tambien te tiene tu un una uno unos
unas y ya yo cual puedo puede debo hacer hago como cuanto cuantos
the of and or to in on for is are be by with as at from that this it an
which what how when can do does i my me we you your our its was were has have
""".split())


def normalize(text):
    text = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def tokenize(text):
    tokens = []
    # "p-valor", "p valor", "p-value" → un solo término.
    text = re.sub(r"\bp[\s-]+(valor|value)", r"p\1", normalize(text))
    for tok in re.findall(r"[a-z0-9]+", text):
        if tok in STOPWORDS or (len(tok) < 2 and not tok.isdigit()):
            continue
        # Raíz por truncado: "interpreto"/"interpretar" o "normal"/"normality"
        # comparten sus 6 primeras letras.
        tokens.append(tok[:STEM_LEN])
    return tokens


def clean_text(text):
    return re.sub(r"\s+", " ", text).strip()


def page_url(relpath):
    if relpath == "index.html":
        return DOMAIN
    if relpath.endswith("/index.html"):
        return DOMAIN + relpath[: -len("index.html")]
    return DOMAIN + relpath


def extract_chunks(relpath):
    with open(os.path.join(ROOT, relpath), encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    robots = soup.find("meta", attrs={"name": "robots"})
    if robots and "noindex" in robots.get("content", ""):
        return []

    h1 = soup.find("h1")
    title = clean_text(h1.get_text(" ")) if h1 else clean_text(soup.title.get_text()) if soup.title else relpath
    desc_tag = soup.find("meta", attrs={"name": "description"})
    description = clean_text(desc_tag.get("content", "")) if desc_tag else ""

    main = soup.find("main") or soup.body
    if main is None:
        return []
    # Fuera: interfaz de la calculadora, tablas numéricas y elementos no textuales.
    for sel in ["script", "style", "noscript", "svg", "canvas", "table", "form",
                "input", "select", "button", "textarea", ".app-shell",
                ".related-tools", ".control-panel", ".results-panel"]:
        for el in main.select(sel):
            el.decompose()

    url = page_url(relpath)
    sections = [{"section": "Summary" if relpath.startswith("en/") else "Resumen", "parts": [description] if description else []}]
    for el in main.find_all(["h2", "h3", "h4", "p", "li", "dt", "dd", "summary", "blockquote", "figcaption"]):
        if el.name in ("h2", "h3", "h4"):
            sections.append({"section": clean_text(el.get_text(" ")), "parts": []})
            continue
        # Evita duplicar texto de <li> que contienen <p> (o viceversa).
        if el.find_parent(["li", "p", "dd", "blockquote"]) is not None:
            continue
        text = clean_text(el.get_text(" "))
        if text:
            sections[-1]["parts"].append(text)

    chunks = []
    pending = None
    for sec in sections:
        if not sec["parts"]:
            continue
        # Divide secciones largas por párrafos.
        buf = []
        size = 0
        groups = []
        for part in sec["parts"]:
            if buf and size + len(part) > MAX_CHARS:
                groups.append(buf)
                buf, size = [], 0
            buf.append(part)
            size += len(part) + 1
        if buf:
            groups.append(buf)
        for g in groups:
            chunk = {"section": sec["section"], "text": " ".join(g)}
            if pending is not None:
                if len(pending["text"]) + len(chunk["text"]) <= MAX_CHARS:
                    chunk = {"section": pending["section"] + " · " + chunk["section"],
                             "text": pending["text"] + " " + chunk["text"]}
                else:
                    chunks.append(pending)
                pending = None
            if len(chunk["text"]) < MIN_CHARS:
                pending = chunk
            else:
                chunks.append(chunk)
    if pending is not None:
        chunks.append(pending)

    return [{"url": url, "title": title, "section": c["section"], "text": c["text"]} for c in chunks]


def list_pages(lang):
    pages = []
    base = os.path.join(ROOT, "en") if lang == "en" else ROOT
    for dirpath, dirnames, filenames in os.walk(base):
        rel_dir = os.path.relpath(dirpath, ROOT).replace("\\", "/")
        if rel_dir == ".":
            rel_dir = ""
        top = rel_dir.split("/")[0]
        if top.startswith(".") or top in ("rag", "api", "img") or (lang == "es" and top == "en"):
            dirnames[:] = []
            continue
        for name in sorted(filenames):
            if not name.endswith(".html"):
                continue
            rel = f"{rel_dir}/{name}" if rel_dir else name
            name_key = rel[3:] if lang == "en" else rel
            if name_key in EXCLUDED:
                continue
            pages.append(rel)
    return sorted(pages)


def build(lang):
    chunks = []
    for rel in list_pages(lang):
        chunks.extend(extract_chunks(rel))

    df = Counter()
    lengths = []
    for i, c in enumerate(chunks):
        c["id"] = i
        # El título de la página pesa doble: suele nombrar el concepto exacto.
        tokens = tokenize(c["title"]) * 2 + tokenize(c["section"] + " " + c["text"])
        tf = Counter(tokens)
        c["tf"] = dict(tf)
        c["len"] = len(tokens)
        lengths.append(len(tokens))
        df.update(tf.keys())

    index = {
        "lang": lang,
        "n": len(chunks),
        "avgdl": (sum(lengths) / len(lengths)) if lengths else 0,
        "df": dict(df),
        "chunks": chunks,
    }
    out = os.path.join(OUT_DIR, f"index-{lang}.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    pages = len({c["url"] for c in chunks})
    print(f"{out}: {len(chunks)} trozos de {pages} páginas ({os.path.getsize(out) // 1024} KB)")


if __name__ == "__main__":
    for lang in ("es", "en"):
        build(lang)
    sys.exit(0)
