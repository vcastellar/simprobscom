"""Regression checks for beta endpoints and the frozen F-table row labels."""
import math

from scipy.stats import beta

from test_input_validation import BrowserTestCase


class TableLayoutTests(BrowserTestCase):
    def open_table(self, lang, name):
        self.page.goto(self.base + lang + 'tabla-' + name + '.html', wait_until='domcontentloaded')
        self.page.wait_for_function("typeof jStat !== 'undefined'")

    def test_beta_grid_and_endpoint_limits(self):
        for lang in ('/', '/en/'):
            self.open_table(lang, 'beta')
            for kind in ('cdf', 'pdf'):
                self.page.locator('.tab-btn').nth(0 if kind == 'cdf' else 1).click()
                table = self.page.locator('#tbl-' + kind)
                self.assertEqual(table.locator('tbody tr').count(), 21)
                self.assertEqual(table.locator('thead th').count(), 2)
                for a, b in ((2, 2), (.5, .5), (1, 1), (1, 2), (2, 1), (.5, 2), (2, .5), (10, 10)):
                    with self.subTest(lang=lang, kind=kind, alpha=a, beta=b):
                        self.page.select_option('#alpha-' + kind, str(a))
                        self.page.select_option('#beta-' + kind, str(b))
                        cells = table.locator('td[data-x]').evaluate_all(
                            'cs => cs.map(c => ({x:+c.dataset.x, text:c.textContent, exact:window.tableCellExact(c)}))')
                        self.assertEqual([c['x'] for c in cells], [i / 20 for i in range(21)])
                        for cell in cells:
                            expected = beta.cdf(cell['x'], a, b) if kind == 'cdf' else beta.pdf(cell['x'], a, b)
                            if math.isinf(expected):
                                self.assertEqual(cell['text'], '∞')
                                self.assertTrue(math.isinf(cell['exact']))
                            else:
                                self.assertRegex(cell['text'], r'^\d+\.\d{5}$')
                                self.assertAlmostEqual(float(cell['text']), expected, delta=5.1e-6)
                                self.assertAlmostEqual(cell['exact'], expected, delta=1e-14 if cell['x'] in (0, 1) else 1e-7)
                        for x in ('0.00', '1.00'):
                            table.locator('[data-x="' + x + '"]').click()
                            self.assertNotRegex(self.page.locator('#lookup-' + kind).inner_text(), r'NaN|undefined')
                            svg = self.page.locator('#tab-' + kind + ' svg')
                            self.assertNotRegex(svg.inner_html(), r'NaN|Infinity')
                            if kind == 'pdf' and (a, b) == (.5, .5):
                                self.assertIn('∞', self.page.locator('#tab-pdf figcaption').inner_text())

    def test_f_precision_and_opaque_sticky_column(self):
        for lang in ('/', '/en/'):
            self.open_table(lang, 'f-snedecor')
            for text in self.page.locator('table.dist-table td[data-val]').all_text_contents():
                self.assertEqual(len(text.replace('.', '')), 5)
            self.page.evaluate("document.querySelectorAll('[data-prerendered]').forEach(t => delete t.dataset.prerendered); ALPHAS.forEach(a => buildFCritTable('tbl-'+a.key,a.val,a.val));buildFCdfTable(3,20)")
            self.assertTrue(self.page.locator('table.dist-table td[data-val]').evaluate_all(
                'cs => cs.every(c => c.textContent === formatFTableValue(window.tableCellExact(c)))'))
            samples = [0, .853612, .001234, 3.098391, 62.26504, 123.4567, 1234.567,
                       12345.67, 9.99999, 99.9999, 9999.99, 99999.6, 123456.78]
            expected = ['0.0000', '0.8536', '0.0012', '3.0984', '62.265', '123.46', '1234.6',
                        '12346', '10.000', '100.00', '10000', '100000', '123457']
            self.assertEqual(self.page.evaluate('(xs) => xs.map(formatFTableValue)', samples), expected)
            self.assertEqual(self.page.evaluate('formatFTableValue(Infinity)'), '∞')
            for width in (390, 1280):
                self.page.set_viewport_size({'width': width, 'height': 844})
                for dark in (False, True):
                    self.page.evaluate('(dark) => document.documentElement.classList.toggle("dark-mode", dark)', dark)
                    wrap = self.page.locator('#tbl-a10').locator('..')
                    label = self.page.locator('#tbl-a10 tbody tr:nth-child(4) td:first-child')
                    wrap.evaluate('e => e.scrollLeft=0')
                    label.scroll_into_view_if_needed()
                    before = label.bounding_box()['x']
                    wrap.evaluate('e => e.scrollLeft=e.scrollWidth')
                    label.hover()
                    self.assertAlmostEqual(label.bounding_box()['x'], before, delta=1)
                    style = label.evaluate('e => {const s=getComputedStyle(e);return {bg:s.backgroundColor,position:s.position}}')
                    self.assertEqual(style['position'], 'sticky')
                    self.assertTrue(style['bg'].startswith('rgb(') or style['bg'].endswith(', 1)'), style)
                    self.assertTrue(label.evaluate('e => {const r=e.getBoundingClientRect();return document.elementFromPoint(r.right-4,r.top+r.height/2)===e}'))
                    self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), width + 1)
