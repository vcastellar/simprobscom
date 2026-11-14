"""Browser regressions for statistical input domains (Spanish and English)."""

import math
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
import shutil
from threading import Thread
import unittest

from playwright.sync_api import sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class InputValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1]
        cls.server = ThreadingHTTPServer(
            ("127.0.0.1", 0), partial(QuietHandler, directory=str(root))
        )
        cls.addClassCleanup(cls.server.server_close)
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.addClassCleanup(cls.thread.join)
        cls.addClassCleanup(cls.server.shutdown)
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"
        cls.playwright = sync_playwright().start()
        cls.addClassCleanup(cls.playwright.stop)
        options = {"headless": True}
        executable = os.environ.get("CHROMIUM_PATH") or shutil.which("chromium")
        if executable:
            options["executable_path"] = executable
        proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
        if proxy:
            options["proxy"] = {"server": proxy, "bypass": "127.0.0.1,localhost"}
        # Optional isolated Chromium trust store, e.g. for a managed proxy CA.
        browser_home = os.environ.get("PROBLAB_BROWSER_HOME")
        if browser_home:
            options["env"] = {**os.environ, "HOME": browser_home}
        cls.browser = cls.playwright.chromium.launch(**options)
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.page = self.browser.new_page()
        self.addCleanup(self.page.close)
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.errors, [], "Unexpected browser JavaScript error")

    def open(self, lang, filename):
        self.page.goto(self.base + lang + filename, wait_until="domcontentloaded")
        self.page.wait_for_function(
            "typeof jStat !== 'undefined' && typeof Chart !== 'undefined'"
        )

    def fill(self, **fields):
        for field, value in fields.items():
            self.page.locator("#" + field).fill(str(value))

    def result(self, selector="#result"):
        return self.page.locator(selector).inner_text()

    def assert_error(self, selector="#result", message=None):
        text = self.result(selector)
        self.assertTrue(text.startswith("Error:"), text)
        if message:
            self.assertIn(message, text)
        self.assertFalse(self.page.evaluate(
            "Array.from(document.querySelectorAll('canvas')).some(c => !!Chart.getChart(c))"
        ), "An invalid result must not retain the previous chart")

    def displayed_number(self, pattern, text):
        match = re.search(pattern, text)
        self.assertIsNotNone(match, text)
        return float(match.group(1).replace(",", ".").replace("−", "-"))

    def assert_chart(self):
        self.assertTrue(self.page.evaluate(
            "Array.from(document.querySelectorAll('canvas')).some(c => !!Chart.getChart(c))"
        ))

    def test_binomial_requires_integer_trials_in_all_modes(self):
        for lang in ("/", "/en/"):
            self.open(lang, "binomial.html")
            for mode in ("pdf", "cdf", "quantile"):
                for n in (10.5, -1, ""):
                    with self.subTest(lang=lang, mode=mode, n=n):
                        self.page.select_option("#calculation", mode)
                        self.fill(param1=10, param2=0.5, xValue=0.5 if mode == "quantile" else 5)
                        self.page.locator(".calculate-btn").click()
                        self.assert_chart()
                        self.fill(param1=n)
                        self.page.locator(".calculate-btn").click()
                        self.assert_error(message="integer" if lang == "/en/" else "entero")
            # Recovery after invalid input and a known exact PMF.
            self.page.select_option("#calculation", "pdf")
            self.fill(param1=10, param2=0.5, xValue=5)
            self.page.locator(".calculate-btn").click()
            value = self.displayed_number(r"P\(X = 5\)\s*=\s*([\d.,]+)", self.result())
            self.assertAlmostEqual(value, math.comb(10, 5) / 2**10, places=5)
            self.assert_chart()

    def test_bernoulli_quantile_probability_domain_and_endpoints(self):
        for lang in ("/", "/en/"):
            self.open(lang, "bernoulli.html")
            self.page.select_option("#calculation", "quantile")
            self.fill(param1=0.5)
            for probability in (-0.1, 1.1, 2, ""):
                with self.subTest(lang=lang, probability=probability):
                    self.fill(xValue=probability)
                    self.page.locator(".calculate-btn").click()
                    self.assert_error(message="0")
            # The closed endpoints remain valid for this bounded distribution.
            for probability, expected in ((0, 0), (0.5, 0), (0.5001, 1), (1, 1)):
                with self.subTest(lang=lang, probability=probability):
                    self.fill(xValue=probability)
                    self.page.locator(".calculate-btn").click()
                    self.assertEqual(self.displayed_number(r"\bx\s*=\s*([\d.,]+)", self.result()), expected)
                    self.assert_chart()

    def test_normal_quantile_requires_open_probability_interval(self):
        for lang in ("/", "/en/"):
            self.open(lang, "normal.html")
            self.page.select_option("#calculation", "quantile")
            self.fill(param1=0, param2=1)
            for probability in (0, 1, -0.1, 1.1, ""):
                with self.subTest(lang=lang, probability=probability):
                    self.fill(xValue=0.975)
                    self.page.locator(".calculate-btn").click()
                    self.assert_chart()
                    self.fill(xValue=probability)
                    self.page.locator(".calculate-btn").click()
                    self.assert_error()
                    if probability in (0, 1):
                        self.assertIn("strictly" if lang == "/en/" else "estrictamente", self.result())
            self.fill(xValue=0.975)
            self.page.locator(".calculate-btn").click()
            value = self.displayed_number(r"\bx\s*=\s*([\d.,]+)", self.result())
            self.assertAlmostEqual(value, 1.959963984540054, places=5)
            self.assert_chart()

    def test_mean_test_does_not_truncate_sample_size(self):
        for lang in ("/", "/en/"):
            self.open(lang, "contraste-hipotesis-una-media.html")
            self.page.select_option("#dispersionType", "sample")
            self.fill(mu0=500, xbar=510, s=20)
            for n in (25.9, 1, ""):
                with self.subTest(lang=lang, n=n):
                    self.fill(n=25)
                    self.page.locator("#calcMeanBtn").click()
                    self.assert_chart()
                    self.fill(n=n)
                    self.page.locator("#calcMeanBtn").click()
                    self.assert_error("#meanResult", "integer" if lang == "/en/" else "entero")
            self.fill(n=25)
            self.page.locator("#calcMeanBtn").click()
            text = self.result("#meanResult")
            self.assertAlmostEqual(self.displayed_number(r"t\s*=\s*([\d.,]+)", text), 2.5)
            self.assertIn("24", text)
            pvalue = self.displayed_number(r"p-(?:valor|value)\s*=\s*([\d.,]+)", text)
            self.assertAlmostEqual(pvalue, 0.019654175116578784, places=5)
            self.assert_chart()

    def test_proportion_intervals_require_integer_counts(self):
        for lang in ("/", "/en/"):
            self.open(lang, "intervalo-confianza-proporcion.html")
            for method in ("clopper", "wilson", "wald"):
                self.page.select_option("#method", method)
                for x, n in ((2.5, 20), (2, 20.5), (2.5, 20.5), (21, 20), (0, 0), ("", 20), (2, "")):
                    with self.subTest(lang=lang, method=method, x=x, n=n):
                        self.fill(x=10, n=20)
                        self.page.locator("#calcBtn").click()
                        self.assert_chart()
                        self.fill(x=x, n=n)
                        self.page.locator("#calcBtn").click()
                        self.assert_error(message="integers" if lang == "/en/" else "enteros")
            self.page.select_option("#method", "clopper")
            for x in (0, 20):
                with self.subTest(lang=lang, boundary_successes=x):
                    self.fill(x=x, n=20)
                    self.page.locator("#calcBtn").click()
                    text = self.result()
                    self.assertFalse(text.startswith("Error:"), text)
                    # Exact Clopper-Pearson limits at 0/n and n/n.
                    bound = 1 - 0.025**(1/20) if x == 0 else 0.025**(1/20)
                    self.assertIn(f"{bound:.4f}".replace(".", ",") if lang == "/" else f"{bound:.4f}", text)
                    self.assert_chart()


if __name__ == "__main__":
    unittest.main()
