"""Execute the code shown by the R/Python pilot, and check its interaction."""

from contextlib import redirect_stdout
from io import StringIO
import math
import os
import re
import shutil
import subprocess

from test_input_validation import BrowserTestCase


class ReproduceCodeTests(BrowserTestCase):
    def snippets(self):
        self.page.locator('#reproduce-code summary').click()
        snippets = {}
        for language in ['r', 'python']:
            self.page.locator(f'#reproduce-tab-{language}').click()
            snippets[language] = self.page.locator('#reproduce-code code').inner_text()
        return snippets

    def execute_python(self, code, mean=False):
        namespace = {}
        with redirect_stdout(StringIO()):
            exec(code, namespace)
        return float(namespace['p_value' if mean else 'result'])

    def execute_r(self, code, mean=False):
        executable = os.environ.get('PROBLAB_RSCRIPT') or shutil.which('Rscript')
        if not executable:
            self.skipTest('Set PROBLAB_RSCRIPT or install R to execute the R snippets')
        result = 'result$p_value' if mean else 'result'
        completed = subprocess.run([executable, '--vanilla', '-e',
            'options(digits=17)\n' + code + '\ncat("\\nRESULT=", ' + result + ')'],
            capture_output=True, text=True, timeout=30, check=True)
        match = re.search(r'RESULT=\s*([-+\d.eE]+)', completed.stdout)
        self.assertIsNotNone(match, completed.stdout + completed.stderr)
        return float(match.group(1))

    def distribution_cases(self):
        return [
            ('normal.html', 'pdf', 'left', 178, None, 170, 8, 0.03024634056489292),
            ('normal.html', 'cdf', 'left', 178, None, 170, 8, 0.8413447460685429),
            ('normal.html', 'cdf', 'right', 178, None, 170, 8, 0.15865525393145707),
            ('normal.html', 'cdf', 'interval', 162, 178, 170, 8, 0.6826894921370859),
            ('normal.html', 'quantile', 'left', 0.95, None, 170, 8, 183.15882901561178),
            ('binomial.html', 'pdf', 'left', 5, None, 10, .5, .24609375),
            ('binomial.html', 'cdf', 'right', 5, None, 10, .5, .623046875),
            ('binomial.html', 'cdf', 'interval', 2.2, 5.8, 10, .5, .568359375),
            ('binomial.html', 'quantile', 'left', 0, None, 10, .5, 0),
            ('binomial.html', 'quantile', 'left', 1, None, 10, 0, 0),
            ('binomial.html', 'quantile', 'left', 0, None, 10, 1, 0),
        ]

    def check_distributions(self, execute):
        for lang in ['/', '/en/']:
            for file, mode, tail, x, b, p1, p2, expected in self.distribution_cases():
                with self.subTest(lang=lang, file=file, mode=mode, tail=tail):
                    self.open(lang, file)
                    self.page.select_option('#calculation', mode)
                    if mode == 'cdf':
                        self.page.select_option('#cdfMode', tail)
                    self.fill(param1=p1, param2=p2, xValue=x)
                    if b is not None:
                        self.fill(bValue=b)
                    self.page.locator('.calculate-btn').click()
                    self.assertFalse(self.result().startswith('Error:'))
                    displayed = self.displayed_number(r'(?:f\([^)]*\)|P\([^)]*\)|\bx)\s*=\s*([−\-\d.,]+)', self.result())
                    self.assertAlmostEqual(displayed, expected, delta=1e-5)
                    snippets = self.snippets()
                    value = execute(snippets['r' if execute == self.execute_r else 'python'])
                    self.assertTrue(math.isclose(value, expected, rel_tol=1e-10, abs_tol=1e-12), (value, expected))

    def test_python_distribution_snippets(self):
        self.check_distributions(self.execute_python)

    def test_r_distribution_snippets(self):
        self.check_distributions(self.execute_r)

    def check_mean(self, execute):
        for lang in ['/', '/en/']:
            for dispersion, tail, xbar, expected in [
                ('sample', 'two', 510, .019654175116578784),
                ('population', 'two', 510, .012419330651552265),
                ('population', 'right', 510, .006209665325776132),
                ('population', 'left', 490, .006209665325776132),
            ]:
                with self.subTest(lang=lang, dispersion=dispersion, tail=tail):
                    self.open(lang, 'contraste-hipotesis-una-media.html')
                    self.page.select_option('#dispersionType', dispersion)
                    self.page.select_option('#tail', tail)
                    self.fill(mu0=500, xbar=xbar, s=20, n=25)
                    self.page.locator('#calcMeanBtn').click()
                    snippets = self.snippets()
                    value = execute(snippets['r' if execute == self.execute_r else 'python'], mean=True)
                    self.assertTrue(math.isclose(value, expected, rel_tol=1e-10), (value, expected))

    def test_python_mean_snippets(self):
        self.check_mean(self.execute_python)

    def test_r_mean_snippets(self):
        self.check_mean(self.execute_r)

    def test_snapshot_tabs_copy_and_invalid_result(self):
        self.open('/', 'normal.html')
        self.page.select_option('#calculation', 'cdf')
        self.fill(param1=0, param2=1, xValue=0)
        self.page.locator('.calculate-btn').click()
        self.snippets()
        code = self.page.locator('#reproduce-code code').inner_text()
        self.fill(xValue=1)
        self.assertTrue(self.page.locator('.reproduce-stale').is_visible())
        self.assertEqual(code, self.page.locator('#reproduce-code code').inner_text())
        self.page.locator('.calculate-btn').click()
        self.assertFalse(self.page.locator('.reproduce-stale').is_visible())
        self.page.locator('#reproduce-tab-python').focus()
        self.page.keyboard.press('ArrowLeft')
        self.assertEqual(self.page.locator('#reproduce-tab-r').get_attribute('aria-selected'), 'true')
        self.page.context.grant_permissions(['clipboard-read', 'clipboard-write'])
        self.page.locator('.reproduce-copy').click()
        self.page.wait_for_function("document.querySelector('.reproduce-status').textContent === 'Copiado'")
        self.assertEqual(self.page.evaluate('navigator.clipboard.readText()'), self.page.locator('#reproduce-code code').inner_text())
        self.fill(param2=0)
        self.page.locator('.calculate-btn').click()
        self.assertFalse(self.page.locator('#reproduce-code').is_visible())
        self.fill(param2=1)
        self.page.locator('.calculate-btn').click()
        self.assertTrue(self.page.locator('#reproduce-code').is_visible())

    def test_mobile_panel_fits_viewport(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.open('/', 'contraste-hipotesis-una-media.html')
        self.page.locator('#reproduce-code summary').click()
        self.page.locator('#reproduce-tab-python').click()
        rect = self.page.locator('#reproduce-code').bounding_box()
        self.assertLessEqual(rect['x'] + rect['width'], 390)
        self.assertTrue(self.page.locator('#reproduce-code code').is_visible())
