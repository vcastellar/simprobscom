"""Run the code displayed by every distribution and hypothesis calculator."""

from contextlib import redirect_stdout
from io import StringIO
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory

from test_input_validation import BrowserTestCase


DISTRIBUTIONS = {
    'normal': {'param1': 2, 'param2': 3},
    'binomial': {'param1': 17, 'param2': .35},
    'poisson': {'param1': 4.2},
    'studentt': {'param1': 7},
    'chisquare': {'param1': 4},
    'centralf': {'param1': 5, 'param2': 9},
    'exponential': {'param1': 2.3},
    'negbin': {'param1': 3, 'param2': .45},
    'geometric': {'param1': .25},
    'uniform': {'param1': -3, 'param2': 6},
    'gamma': {'param1': 2.5, 'param2': 1.2},
    'beta': {'param1': 2, 'param2': 3},
    'lognormal': {'param1': .3, 'param2': .7},
    'weibull': {'param1': 1.8, 'param2': 2.1},
    'hypergeometric': {'param1': 20, 'param2': 14, 'param3': 10},
    'bernoulli': {'param1': .35},
}

HYPOTHESES = [
    'contraste-hipotesis-una-media', 'contraste-hipotesis-medias-apareadas',
    'contraste-hipotesis-dos-medias', 'contraste-hipotesis-una-proporcion',
    'contraste-hipotesis-dos-proporciones', 'contraste-hipotesis-varianzas',
    'contraste-hipotesis-dos-varianzas', 'contraste-hipotesis-correlacion',
    'contraste-hipotesis-odds-ratio', 'contraste-hipotesis-proporciones-apareadas',
    'contraste-hipotesis-no-inferioridad', 'test-exacto-fisher', 'anova',
    'chi-cuadrado-bondad-ajuste', 'contraste-independencia-chi-cuadrado',
    'kolmogorov-smirnov-bondad-ajuste', 'shapiro-wilk-normalidad',
    'potencia-contraste-una-proporcion', 'potencia-test-ab',
]


class CatalogReproductionTests(BrowserTestCase):
    def snippets(self):
        panel = self.page.locator('#reproduce-code')
        self.assertTrue(panel.is_visible())
        if not panel.evaluate('e => e.open'):
            panel.locator('summary').click()
        snippets = {}
        for language in ('r', 'python'):
            self.page.locator('#reproduce-tab-' + language).click()
            snippets[language] = panel.locator('code').inner_text()
            self.assertNotIn('undefined', snippets[language])
        return snippets

    def execute_cases(self, cases):
        """Compare independent R/SciPy execution with the unrounded web result."""
        for case in cases:
            with self.subTest(case=case['name'], runtime='Python'):
                namespace = {}
                with redirect_stdout(StringIO()):
                    exec(case['python'], namespace)
                value = float(eval(case['py_expression'], namespace))
                self.compare_result(value,case)

        executable = os.environ.get('PROBLAB_RSCRIPT') or shutil.which('Rscript')
        if not executable:
            with self.subTest(runtime='R'):
                self.skipTest('Set PROBLAB_RSCRIPT or install R to execute R code')
            return
        blocks = []
        for i, case in enumerate(cases):
            blocks.append('local({\n' + case['r'] + '\ncat("\\nCASE_' + str(i) +
                '=", format(' + case['r_expression'] + ', digits=17), "\\n")\n})')
        with TemporaryDirectory() as directory:
            script = Path(directory) / 'reproduction.R'
            script.write_text('\n'.join(blocks))
            completed = subprocess.run([executable, '--vanilla', '-f', str(script)],
                capture_output=True, text=True, timeout=180)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        values = {int(i): float(v) for i, v in re.findall(
            r'CASE_(\d+)=\s*([-+\d.eE]+)', completed.stdout)}
        self.assertEqual(len(values), len(cases), completed.stdout)
        for i, case in enumerate(cases):
            with self.subTest(case=case['name'], runtime='R'):
                self.compare_result(values[i],case)

    def compare_result(self,value,case):
        if case.get('monte_carlo'):
            B=case['monte_carlo'];p=case['expected']
            self.assertGreaterEqual(value,1/(B+1));self.assertLessEqual(value,1)
            tolerance=7*math.sqrt((p*(1-p)+value*(1-value))/B)+2/(B+1)
            self.assertLessEqual(abs(value-p),tolerance)
        else:
            self.assertTrue(math.isclose(value,case['expected'],rel_tol=2e-5,abs_tol=1e-7),(value,case['expected']))

    def test_all_distribution_modes_in_both_languages(self):
        cases = []
        for lang in ('/', '/en/'):
            for name, parameters in DISTRIBUTIONS.items():
                self.open(lang, name + '.html')
                self.page.evaluate('''() => {
                    const render = renderDistributionResult;
                    window.renderDistributionResult = function(o) {
                        window.reproductionValue = o.result;
                        render(o);
                    };
                }''')
                self.fill(**parameters)
                offset = 5 if name == 'hypergeometric' else 0
                for mode, tail, x, b in [
                    ('pdf', None, 1 + offset, None),
                    ('cdf', 'left', 1.2 + offset, None),
                    ('cdf', 'right', 1.2 + offset, None),
                    ('cdf', 'interval', .6 + offset, 2.4 + offset),
                    ('quantile', None, .7, None),
                ]:
                    self.page.select_option('#calculation', mode)
                    if tail:
                        self.page.select_option('#cdfMode', tail)
                    self.fill(xValue=x)
                    if b is not None:
                        self.fill(bValue=b)
                    self.page.locator('.calculate-btn').click()
                    cases.append(dict(name=f'{lang}{name}/{mode}/{tail}',
                        expected=self.page.evaluate('window.reproductionValue'),
                        r_expression='result', py_expression='result', **self.snippets()))
        self.assertEqual(len(cases), 160)
        self.execute_cases(cases)

    def open_hypothesis(self, lang, name):
        self.open(lang, name + '.html')
        self.page.evaluate('''() => {
            const render = ReproduceTests.render;
            ReproduceTests.render = function(kind, id, o) {
                window.reproductionPayload = {kind, o};
                render(kind, id, o);
            };
        }''')
        if name == 'contraste-hipotesis-una-media':
            self.page.evaluate('''() => {
                const render = renderMeanTestResult;
                window.renderMeanTestResult = function(o) {
                    window.reproductionPayload = {kind: 'mean', o};
                    render(o);
                };
            }''')
        if name == 'shapiro-wilk-normalidad':
            self.fill(sampleData='12.1, 11.8, 12.5, 13, 12.4, 11.9, 12.2', mcIter=1000)

    def hypothesis_case(self, name):
        self.page.locator('main .calculate-btn:visible').first.click()
        payload = self.page.evaluate('window.reproductionPayload')
        self.assertIsNotNone(payload, name)
        if payload['kind'].startswith('power'):
            design = payload['o']['mode'] == 'n'
            expected = self.page.evaluate('''o => o.mode === 'n'
                ? computeN(o.p0, o.p1, o.alpha, o.targetPower, o.alternative)
                : computePower(o.p0, o.p1, o.n, o.alpha, o.alternative)''', payload['o'])
            r_expression = py_expression = 'n' if design else 'power'
        else:
            expected = payload['o']['p']
            r_expression, py_expression = 'result$p_value', 'result["p_value"]'
        return dict(name=name, expected=expected, monte_carlo=payload['o']['B'] if payload['kind']=='shapiro' else None, r_expression=r_expression,
            py_expression=py_expression, **self.snippets())

    def test_all_hypothesis_tools_in_both_languages(self):
        cases = []
        for lang in ('/', '/en/'):
            for name in HYPOTHESES:
                self.open_hypothesis(lang, name)
                cases.append(self.hypothesis_case(lang + name))
        self.assertEqual(len(cases), 38)
        self.execute_cases(cases)

    def test_method_variants_in_both_languages(self):
        cases = []
        for lang in ('/', '/en/'):
            # Every directional family, including Fisher's exact alternatives.
            for name in HYPOTHESES[:9] + ['test-exacto-fisher']:
                self.open_hypothesis(lang, name)
                for tail in ('left', 'right'):
                    self.page.select_option('#tail', tail)
                    cases.append(self.hypothesis_case(f'{lang}{name}/{tail}'))
            name = 'contraste-hipotesis-varianzas'
            self.open_hypothesis(lang, name)
            self.page.select_option('#testType', 'two')
            for tail in ('two', 'left', 'right'):
                self.page.select_option('#tail', tail)
                cases.append(self.hypothesis_case(f'{lang}{name}/two/{tail}'))
            name = 'contraste-hipotesis-correlacion'
            self.open_hypothesis(lang, name)
            self.fill(rho0=.2)
            cases.append(self.hypothesis_case(f'{lang}{name}/fisher-z'))
            name = 'contraste-hipotesis-proporciones-apareadas'
            self.open_hypothesis(lang, name)
            for correction in ('no', 'yes'):
                self.page.select_option('#correction', correction)
                cases.append(self.hypothesis_case(f'{lang}{name}/{correction}'))
            name = 'contraste-independencia-chi-cuadrado'
            self.open_hypothesis(lang, name)
            self.page.select_option('#numRows', '2')
            self.page.select_option('#numCols', '2')
            for cell, value in zip(self.page.locator('#ctGrid input[data-r]').all(), [12, 5, 3, 10]):
                cell.fill(str(value))
            for correction in (False, True):
                self.page.locator('#yates').set_checked(correction)
                cases.append(self.hypothesis_case(f'{lang}{name}/2x2/{correction}'))
            name = 'contraste-hipotesis-no-inferioridad'
            self.open_hypothesis(lang, name)
            for variable in ('prop', 'means'):
                self.page.select_option('#varType', variable)
                self.fill(delta=.1 if variable == 'prop' else 3)
                for method, direction in [('ni', 'ni'), ('ni', 'ns'), ('tost', 'ns')]:
                    self.page.select_option('#testType', method)
                    if method == 'ni':
                        self.page.select_option('#niDirection', direction)
                    cases.append(self.hypothesis_case(f'{lang}{name}/{variable}/{method}/{direction}'))
            name = 'kolmogorov-smirnov-bondad-ajuste'
            self.open_hypothesis(lang, name)
            for distribution in ('uniform', 'exponential'):
                self.page.select_option('#distType', distribution)
                cases.append(self.hypothesis_case(f'{lang}{name}/{distribution}'))
            name = 'shapiro-wilk-normalidad'
            self.open_hypothesis(lang, name)
            for sample, seed in [('1, 2, 4', 0), ('1, 2, 3, 9', 42), ('1, 2, 3, 4, 9, 12', 98765)]:
                self.fill(sampleData=sample, mcSeed=seed)
                cases.append(self.hypothesis_case(f'{lang}{name}/{sample}/{seed}'))
            for name in ('potencia-test-ab', 'potencia-contraste-una-proporcion'):
                self.open_hypothesis(lang, name)
                ab = name == 'potencia-test-ab'
                self.page.select_option('#pwTail' if ab else '#pwAlternative', 'greater')
                cases.append(self.hypothesis_case(f'{lang}{name}/power/greater'))
                self.page.locator('.mode-tab[data-target="modeN"]').click()
                for alternative in (('two-sided', 'greater') if ab else ('two-sided', 'greater', 'less')):
                    self.page.select_option('#nTail' if ab else '#nAlternative', alternative)
                    if alternative == 'less':
                        self.fill(nP1=.2)
                    cases.append(self.hypothesis_case(f'{lang}{name}/n/{alternative}'))
        self.execute_cases(cases)

    def test_checkbox_snapshot_errors_and_power_panel_position(self):
        for lang in ('/', '/en/'):
            self.open_hypothesis(lang, 'contraste-independencia-chi-cuadrado')
            self.page.locator('#calcChiBtn').click()
            self.snippets()
            previous = self.page.locator('#reproduce-code code').inner_text()
            self.page.locator('#yates').check()
            self.assertTrue(self.page.locator('.reproduce-stale').is_visible())
            self.assertEqual(self.page.locator('#reproduce-code code').inner_text(), previous)
            self.fill(alpha=0)
            self.page.locator('#ctGrid input[data-r]').first.press('Enter')
            self.assertFalse(self.page.locator('#reproduce-code').is_visible())
            for name in ('potencia-test-ab', 'potencia-contraste-una-proporcion'):
                self.open_hypothesis(lang, name)
                self.page.locator('#calcPwBtn').click()
                self.assertTrue(self.page.locator('#pwResult + #reproduce-code').is_visible())
                self.page.locator('.mode-tab[data-target="modeN"]').click()
                self.assertFalse(self.page.locator('#reproduce-code').is_visible())
                self.page.locator('#calcNBtn').click()
                self.assertTrue(self.page.locator('#nResult + #reproduce-code').is_visible())
                self.fill(nAlpha=0)
                self.page.locator('#calcNBtn').click()
                self.assertFalse(self.page.locator('#reproduce-code').is_visible())
