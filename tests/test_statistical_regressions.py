"""Numerical reference and end-to-end regressions for the statistical audit."""

import json
import math
from pathlib import Path
import re

from test_input_validation import BrowserTestCase


REFERENCES = json.loads(Path(__file__).with_name("statistical_references.json").read_text())


class StatisticalRegressionTests(BrowserTestCase):
    def assert_relative(self, actual, expected, tolerance=1e-8):
        self.assertTrue(math.isfinite(actual), actual)
        self.assertLessEqual(abs(actual - expected), abs(expected) * tolerance + 5e-324)

    def test_shapiro_invariant_to_scale_and_location(self):
        sample = list(range(1, 10)) + [100]
        for lang in ("/", "/en/"):
            self.open(lang, "shapiro-wilk-normalidad.html")
            samples = [sample, [v * 1e-10 for v in sample],
                       [v * 1e-300 for v in sample], [v * 1e100 for v in sample],
                       [v + 1e12 for v in sample]]
            values = self.page.evaluate("samples => samples.map(computeShapiroW)", samples)
            for value in values:
                self.assert_relative(value, 0.4485215411935256)
            outcomes = []
            for values in samples[:2]:
                self.fill(sampleData=" ".join(map(str, values)), mcIter=1000, mcSeed=12345)
                self.page.locator("#calcShapiroBtn").click()
                outcomes.append(self.result("#shapiroResult"))
                self.assert_chart()
            self.assertEqual(outcomes[0], outcomes[1])
            self.fill(sampleData="5 5 5 5 5")
            self.page.locator("#calcShapiroBtn").click()
            # A constant sample cannot support a Shapiro-Wilk conclusion.
            self.assertIn("constant" if lang == "/en/" else "constante", self.result("#shapiroResult"))
            self.assertFalse(self.page.evaluate("!!Chart.getChart(document.querySelector('canvas'))"))
            self.assertEqual(self.page.locator("#shapiroNotes").inner_text(), "")

    def test_fisher_pvalues_match_references_including_extreme_tails(self):
        for lang in ("/", "/en/"):
            self.open(lang, "test-exacto-fisher.html")
            actual = self.page.evaluate(
                "refs => refs.map(r => computeFisher(...r.cells, r.tail).pValue)", REFERENCES["fisher"])
            for value, reference in zip(actual, REFERENCES["fisher"]):
                with self.subTest(lang=lang, reference=reference):
                    self.assert_relative(value, reference["expected"])
            self.fill(cellA=100, cellB=1, cellC=1, cellD=100)
            self.page.locator("#calcFisherBtn").click()
            self.assertRegex(self.result("#fisherResult"), r"5[,.]66e-56")

    def test_fisher_zero_cells_and_fractional_counts(self):
        for lang in ("/", "/en/"):
            self.open(lang, "test-exacto-fisher.html")
            for cells, expected in [([10, 5, 0, 10], math.inf), ([10, 0, 0, 10], math.inf),
                                    ([0, 5, 10, 10], 0), ([0, 0, 10, 10], math.nan)]:
                with self.subTest(lang=lang, cells=cells):
                    self.fill(**dict(zip(["cellA", "cellB", "cellC", "cellD"], cells)))
                    self.page.locator("#calcFisherBtn").click()
                    actual = self.page.evaluate("cells => computeFisher(...cells, 'two').or", cells)
                    if math.isnan(expected):
                        self.assertTrue(math.isnan(actual))
                        self.assertIn("OR = —", self.result("#fisherResult"))
                    else:
                        self.assertEqual(actual, expected)
                        if math.isinf(expected):
                            self.assertIn("OR = ∞", self.result("#fisherResult"))
            self.fill(cellA=1.9, cellB=9, cellC=11, cellD=3)
            self.page.locator("#calcFisherBtn").click()
            self.assert_error("#fisherResult")

    def test_quantiles_expand_brackets_and_match_distribution_support(self):
        for lang in ("/", "/en/"):
            for reference in REFERENCES["quantiles"]:
                with self.subTest(lang=lang, reference=reference):
                    self.open(lang, reference["file"])
                    self.page.select_option("#calculation", "quantile")
                    self.fill(param1=reference["p1"], xValue=reference["probability"])
                    if "p2" in reference:
                        self.fill(param2=reference["p2"])
                    self.page.locator(".calculate-btn").click()
                    displayed = self.displayed_number(r"\bx\s*=\s*([−\-\d.,]+)", self.result())
                    self.assert_relative(displayed, reference["expected"], tolerance=1e-5)
                    self.assert_chart()
            # True support endpoints, not finite initial search brackets.
            for filename, low, high in [("studentt.html", -math.inf, math.inf),
                                        ("centralf.html", 0, math.inf),
                                        ("beta.html", 0, 1)]:
                self.open(lang, filename)
                for probability, expected in [(0, low), (1, high)]:
                    self.page.select_option("#calculation", "quantile")
                    self.fill(xValue=probability)
                    self.page.locator(".calculate-btn").click()
                    text = self.result()
                    self.assertFalse(text.startswith("Error:"), text)
                    if math.isinf(expected):
                        self.assertIn("∞", text)
                    else:
                        self.assertEqual(self.displayed_number(r"\bx\s*=\s*([\d.,]+)", text), expected)

    def test_unilateral_ab_requires_improvement_and_verifies_power(self):
        for lang in ("/", "/en/"):
            self.open(lang, "potencia-test-ab.html")
            self.fill(pwPA=0.2, pwPB=0.1)
            self.page.select_option("#pwTail", "greater")
            self.page.locator("#calcPwBtn").click()
            self.assert_error("#pwResult")
            self.page.locator('.mode-tab[data-target="modeN"]').click()
            self.fill(nPA=0.2, nPB=0.1, nAlpha=0.05, nTargetPower=0.8)
            self.page.select_option("#nTail", "greater")
            self.page.locator("#calcNBtn").click()
            self.assert_error("#nResult")
            # A decrease remains a valid effect for a two-tailed design.
            self.page.select_option("#nTail", "two-sided")
            self.page.locator("#calcNBtn").click()
            self.assertFalse(self.result("#nResult").startswith("Error:"))
            self.assert_chart()
            self.fill(nPA=0.1, nPB=0.2)
            self.page.select_option("#nTail", "greater")
            self.page.locator("#calcNBtn").click()
            self.assertFalse(self.result("#nResult").startswith("Error:"))
            n, power = self.page.evaluate("() => {const n=computeN(.1,.2,.05,.8,'greater'); return [n,computePower(.1,.2,n,.05,'greater')]}")
            self.assertEqual(n, 157)
            self.assertGreaterEqual(power, 0.8)

    def test_variance_design_respects_direction_and_bilateral_symmetry(self):
        for lang in ("/", "/en/"):
            self.open(lang, "tamano-muestral-dos-varianzas.html")
            self.fill(twoVarR=0.5, twoVarAlpha=0.05, twoVarPower=0.8)
            self.page.select_option("#twoVarTail", "one-sided")
            self.page.locator("#twoVarCalculateBtn").click()
            self.assert_error("#twoVarResult")
            for ratio in (0.5, 2):
                self.fill(twoVarR=ratio)
                self.page.select_option("#twoVarTail", "two-sided")
                self.page.locator("#twoVarCalculateBtn").click()
                self.assertRegex(self.result("#twoVarResult"), r": 19\b")
                self.assert_chart()
            self.page.select_option("#twoVarTail", "one-sided")
            self.page.locator("#twoVarCalculateBtn").click()
            self.assertRegex(self.result("#twoVarResult"), r": 15\b")
            self.assert_chart()

    def test_bernoulli_model_probability_validated_in_every_mode(self):
        for lang in ("/", "/en/"):
            self.open(lang, "bernoulli.html")
            for mode in ("pdf", "cdf", "quantile"):
                self.page.select_option("#calculation", mode)
                self.fill(xValue=0.5 if mode == "quantile" else 1)
                for probability in (-1, 2, ""):
                    self.fill(param1=probability)
                    self.page.locator(".calculate-btn").click()
                    self.assert_error()
            self.page.select_option("#calculation", "pdf")
            self.fill(xValue=1)
            for probability in (0, 1):
                self.fill(param1=probability)
                self.page.locator(".calculate-btn").click()
                value = self.displayed_number(r"P\(X = 1\)\s*=\s*([\d.,]+)", self.result())
                self.assertEqual(value, probability)

    def test_mean_test_preserves_small_normal_and_t_tails(self):
        for lang in ("/", "/en/"):
            self.open(lang, "contraste-hipotesis-una-media.html")
            normal = self.page.evaluate("refs => refs.map(r => meanTestSurvival(r.z,false,1))", REFERENCES["normal_survival"])
            student = self.page.evaluate("refs => refs.map(r => meanTestSurvival(r.t,true,r.df))", REFERENCES["t_survival"])
            for value, reference in zip(normal, REFERENCES["normal_survival"]):
                self.assert_relative(value, reference["expected"])
            for value, reference in zip(student, REFERENCES["t_survival"]):
                self.assert_relative(value, reference["expected"], tolerance=1e-7)
            self.page.select_option("#dispersionType", "population")
            self.fill(mu0=0, xbar=0.9, s=1, n=100)
            for tail in ("two", "right"):
                self.page.select_option("#tail", tail)
                self.page.locator("#calcMeanBtn").click()
                self.assertRegex(self.result("#meanResult"), r"[12][,.]\d+e-19")
            self.fill(xbar=-0.9)
            self.page.select_option("#tail", "left")
            self.page.locator("#calcMeanBtn").click()
            self.assertRegex(self.result("#meanResult"), r"1[,.]\d+e-19")

    def test_jb_zero_moments_explains_limitation(self):
        for lang in ("/", "/en/"):
            self.open(lang, "tamano-muestral-shapiro-wilk.html")
            self.fill(swGamma1=0, swGamma2=0)
            self.page.locator("#swCalculateBtn").click()
            text = self.result("#swResult")
            self.assertIn("do not establish normality" if lang == "/en/" else "no demuestran normalidad", text)
            self.assertEqual(self.page.locator("#swChart").count(), 1)
            self.assertFalse(self.page.locator("#swChart").is_visible())

    def test_normal_explanation_jsonld_is_valid(self):
        for lang in ("/", "/en/"):
            self.open(lang, "normal.html")
            for raw in self.page.locator('script[type="application/ld+json"]').all_text_contents():
                json.loads(raw)
