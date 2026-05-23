#!/usr/bin/env python3
"""
SEO optimizations for problabtools.com:
  #2 – Add FAQPage JSON-LD to pages with FAQ content
  #3 – Fix h2→h3 inside #seo-support-content
  #6 – Add 'Distribuciones' breadcrumb level to distribution pages
  #7 – Remove fake SearchAction from index.html WebSite schema
"""

import re
import os
import html
import json

BASE = "/home/user/simprobs"

DIST_PAGES = {
    "bernoulli.html", "beta.html", "binomial.html", "centralf.html",
    "chisquare.html", "exponential.html", "gamma.html", "geometric.html",
    "hypergeometric.html", "lognormal.html", "negbin.html", "normal.html",
    "poisson.html", "studentt.html", "uniform.html", "weibull.html",
}

# ── helpers ──────────────────────────────────────────────────────────────────

def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()

def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def strip_tags(s):
    """Remove HTML tags and unescape entities."""
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()

# ── #7: remove SearchAction from index.html ──────────────────────────────────

def fix_search_action(content):
    """Remove potentialAction block from the WebSite schema."""
    pattern = r',\s*"potentialAction":\s*\{[^}]+\}'
    new_content = re.sub(pattern, "", content)
    return new_content, new_content != content

# ── #6: add Distribuciones breadcrumb level ───────────────────────────────────

DIST_CRUMB = '{"@type": "ListItem", "position": 2, "name": "Distribuciones", "item": "https://problabtools.com/distribuciones/"}'

def fix_breadcrumb(content):
    """
    Turn 2-item breadcrumb (Inicio → Page) into 3-item
    (Inicio → Distribuciones → Page) for distribution pages.
    """
    # Match the 2-item itemListElement array
    pattern = (
        r'("itemListElement":\s*\[)\s*'
        r'(\{"@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://problabtools\.es/"\}),\s*'
        r'(\{"@type": "ListItem", "position": 2, "name": "[^"]+", "item": "https://problabtools\.es/[^"]+\.html"\})\s*'
        r'(\])'
    )
    def replacer(m):
        # Bump original item 2 → position 3
        item3 = m.group(3).replace('"position": 2', '"position": 3')
        return (
            m.group(1) + "\n"
            f'            {m.group(2)},\n'
            f'            {DIST_CRUMB},\n'
            f'            {item3}\n'
            f'          {m.group(4)}'
        )
    new_content = re.sub(pattern, replacer, content)
    return new_content, new_content != content

# ── section extractor (handles nested <section> tags) ────────────────────────

SEO_OPEN_RE = re.compile(r'<section[^>]+id="seo-support-content"[^>]*>')

def find_seo_section(content):
    """
    Return (start, inner_start, inner_end, end) indices of the outer
    #seo-support-content section, correctly handling nested <section> tags.
    Returns None if not found.
    """
    m = SEO_OPEN_RE.search(content)
    if not m:
        return None
    open_tag_start = m.start()
    inner_start = m.end()
    depth = 1
    pos = inner_start
    while pos < len(content) and depth > 0:
        next_open = content.find("<section", pos)
        next_close = content.find("</section>", pos)
        if next_close == -1:
            return None
        if next_open != -1 and next_open < next_close:
            depth += 1
            pos = next_open + len("<section")
        else:
            depth -= 1
            if depth == 0:
                inner_end = next_close
                end = next_close + len("</section>")
                return (open_tag_start, inner_start, inner_end, end)
            pos = next_close + len("</section>")
    return None

# ── #3: h2 → h3 inside #seo-support-content ──────────────────────────────────

def fix_headings(content):
    loc = find_seo_section(content)
    if not loc:
        return content, False
    open_tag_start, inner_start, inner_end, end = loc
    inner = content[inner_start:inner_end]
    new_inner = re.sub(r'<h2\b', '<h3', inner)
    new_inner = re.sub(r'</h2>', '</h3>', new_inner)
    if new_inner == inner:
        return content, False
    new_content = content[:inner_start] + new_inner + content[inner_end:]
    return new_content, True

# ── #2: add FAQPage JSON-LD ──────────────────────────────────────────────────

FAQ_ITEM_RE = re.compile(
    r'<li>\s*<strong>\s*(¿[^<]+)</strong>\s*(.*?)</li>',
    re.DOTALL
)

def extract_faqs(content):
    """
    Extract FAQ Q&A pairs from the #seo-support-content section.
    Only picks up items whose question starts with ¿.
    """
    loc = find_seo_section(content)
    if not loc:
        return []
    _, inner_start, inner_end, _ = loc
    section = content[inner_start:inner_end]
    pairs = []
    for item in FAQ_ITEM_RE.finditer(section):
        question = strip_tags(item.group(1))
        answer = strip_tags(item.group(2))
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

def already_has_faqpage(content):
    return '"@type": "FAQPage"' in content

def add_faqpage(content):
    pairs = extract_faqs(content)
    if not pairs or already_has_faqpage(content):
        return content, False
    ld = build_faqpage_ld(pairs)
    new_content = content.replace("</head>", ld + "\n</head>", 1)
    return new_content, new_content != content

# ── main ─────────────────────────────────────────────────────────────────────

def process(filepath):
    filename = os.path.basename(filepath)
    content = read(filepath)
    changes = []

    # #7 only on index.html
    if filename == "index.html":
        content, changed = fix_search_action(content)
        if changed:
            changes.append("#7 SearchAction removed")

    # #6 only on distribution pages with 2-level breadcrumbs
    if filename in DIST_PAGES:
        content, changed = fix_breadcrumb(content)
        if changed:
            changes.append("#6 breadcrumb 3-level added")

    # #3 on all pages with seo-support-content
    if 'id="seo-support-content"' in content:
        content, changed = fix_headings(content)
        if changed:
            changes.append("#3 h2→h3 in seo-support-content")

    # #2 on all pages with seo-support-content
    if 'id="seo-support-content"' in content:
        content, changed = add_faqpage(content)
        if changed:
            changes.append("#2 FAQPage JSON-LD added")

    if changes:
        write(filepath, content)
        print(f"  ✓ {filename}: {', '.join(changes)}")
    else:
        print(f"  - {filename}: no changes")

def main():
    html_files = sorted(
        os.path.join(BASE, f)
        for f in os.listdir(BASE)
        if f.endswith(".html")
    )
    print(f"Processing {len(html_files)} files…\n")
    for fp in html_files:
        process(fp)
    print("\nDone.")

if __name__ == "__main__":
    main()
