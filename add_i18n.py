#!/usr/bin/env python3
"""Injects i18n.js into all HTML files, before the theme.js script tag."""

import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def process_file(filepath):
    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    # Already has i18n.js?
    if 'i18n.js' in content:
        return False

    # Determine relative path prefix based on depth
    rel = os.path.relpath(filepath, ROOT)
    depth = rel.count(os.sep)
    prefix = '../' * depth  # empty string for root, '../' for one level deep

    i18n_tag = f'<script src="{prefix}i18n.js"></script>\n'

    # Insert before the theme.js <script> tag
    # Handles both "theme.js" and "theme.js?v=..."
    pattern = re.compile(r'(<script\s+src="' + re.escape(prefix) + r'theme\.js[^"]*"></script>)')
    if not pattern.search(content):
        print(f'  SKIP (no theme.js found): {rel}')
        return False

    new_content = pattern.sub(i18n_tag + r'\1', content, count=1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return True


def main():
    processed = 0
    skipped = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # Skip hidden directories and Python virtual envs
        dirnames[:] = [d for d in dirnames if not d.startswith('.') and d != '__pycache__']
        for filename in filenames:
            if not filename.endswith('.html'):
                continue
            filepath = os.path.join(dirpath, filename)
            changed = process_file(filepath)
            rel = os.path.relpath(filepath, ROOT)
            if changed:
                print(f'  OK: {rel}')
                processed += 1
            else:
                skipped += 1

    print(f'\nDone: {processed} files updated, {skipped} skipped.')


if __name__ == '__main__':
    main()
