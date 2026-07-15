#!/usr/bin/env python3
"""
Submit every URL in sitemap.xml to IndexNow (used by Bing, Yandex, Seznam...).
Run after publishing changes to sitemap.xml, or any time you want to nudge
Bing to recrawl the site. Requires no third-party packages.

Usage: python3 indexnow_submit.py
"""

import json
import os
import re
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
HOST = "problabtools.com"
KEY = "54df809747fcae276eecb7d00a95a7cc"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
ENDPOINT = "https://api.indexnow.org/indexnow"

def sitemap_urls():
    with open(os.path.join(BASE, "sitemap.xml"), encoding="utf-8") as f:
        content = f.read()
    return re.findall(r"<loc>(.*?)</loc>", content)

def submit(urls):
    payload = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT, data=payload, method="POST",
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        print(f"IndexNow response: {resp.status} {resp.reason}")

if __name__ == "__main__":
    urls = sitemap_urls()
    print(f"Submitting {len(urls)} URLs to IndexNow...")
    submit(urls)
