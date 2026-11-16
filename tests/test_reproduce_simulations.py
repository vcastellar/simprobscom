"""Execute the displayed simulation code and compare it with the browser's run."""

from contextlib import redirect_stdout
from io import StringIO
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory

import numpy as np

from test_input_validation import BrowserTestCase


class SimulationReproductionTests(BrowserTestCase):
    def open_simulator(self, lang, name):
        self.page.goto(self.base + lang + 'simulaciones/' + name + '.html',
                       wait_until='domcontentloaded')
        # Several simulators draw on canvas directly and do not load Chart/jStat.
        self.page.wait_for_function('typeof ReproduceSimulations !== "undefined"')
        self.page.evaluate('''() => {
            const render = ReproduceSimulations.render;
            ReproduceSimulations.render = function(kind, id, o) {
                window.simulationPayload = {kind, id, o};
                render(kind, id, o);
            };
        }''')

    def run_simulation(self, button, seed=12345):
        self.page.evaluate('window.simulationPayload = null')
        if button:
            self.page.locator('.simulation-seed-input:visible').fill(str(seed))
            self.page.locator('#' + button).click()
        else:
            self.page.evaluate('update()')
        self.page.wait_for_function('window.simulationPayload !== null')
        return self.page.evaluate('window.simulationPayload')

    def collect(self, name, button, seed=12345):
        payload = self.run_simulation(button, seed)
        panel = self.page.locator('#reproduce-code')
        self.assertTrue(panel.is_visible())
        if not panel.evaluate('e => e.open'):
            panel.locator('summary').click()
        snippets = {}
        for language in ('r', 'python'):
            self.page.locator('#reproduce-tab-' + language).click()
            snippets[language] = panel.locator('code').inner_text()
            self.assertNotIn('undefined', snippets[language])
        observed = {key: value for key, value in payload['o']['observed'].items() if value is not None}
        return dict(name=name, observed=observed, payload=payload, **snippets)

    def execute_cases(self, cases):
        def flatten(values):
            return np.concatenate([np.atleast_1d(v).astype(float) for v in values])

        for case in cases:
            with self.subTest(case=case['name'], language='Python'):
                namespace = {}
                with redirect_stdout(StringIO()):
                    exec(case['python'], namespace)
                actual = flatten(namespace['result'][key] for key in case['observed'])
                np.testing.assert_allclose(actual, flatten(case['observed'].values()),
                                           rtol=1e-7, atol=1e-8)
                if case['payload']['kind'] == 'walk1d':
                    for walk in namespace['walks']:
                        self.assertEqual(walk[0], 0)
                        self.assertTrue(np.all(np.isin(np.diff(walk), [-1, 1])))
                if case['payload']['kind'] == 'walk2d':
                    for walk in namespace['walks']:
                        self.assertTrue(np.all(np.sum(np.abs(np.diff(walk, axis=0)), axis=1) == 1))
                if case['payload']['kind'] == 'poissonGaps':
                    horizon = namespace['horizon']
                    for run in namespace['runs']:
                        self.assertLessEqual(sum(run['gaps'][:-1]), horizon)
                        self.assertGreater(sum(run['gaps']), horizon)

        executable = os.environ.get('PROBLAB_RSCRIPT') or shutil.which('Rscript')
        if not executable:
            with self.subTest(language='R'):
                self.skipTest('Set PROBLAB_RSCRIPT or install R to execute R snippets')
            return
        blocks = []
        for i, case in enumerate(cases):
            keys = ','.join(json.dumps(key) for key in case['observed'])
            blocks.append('local({\n' + case['r'] + '\ncat("\\nCASE_' + str(i) +
                '=", paste(format(unlist(result[c(' + keys + ')]), digits=17), collapse=","), "\\n")\n})')
        with TemporaryDirectory() as directory:
            script = Path(directory) / 'simulations.R'
            script.write_text('\n'.join(blocks))
            completed = subprocess.run([executable, '--vanilla', '-f', str(script)],
                                       capture_output=True, text=True, timeout=180)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        values = {int(i): np.fromstring(v, sep=',') for i, v in re.findall(
            r'CASE_(\d+)=\s*([^\n]+)', completed.stdout)}
        self.assertEqual(len(values), len(cases), completed.stdout)
        for i, case in enumerate(cases):
            with self.subTest(case=case['name'], language='R'):
                np.testing.assert_allclose(values[i], flatten(case['observed'].values()),
                                           rtol=1e-7, atol=1e-8)

    def test_catalog_and_method_variants_in_both_languages(self):
        cases = []
        for lang in ('/', '/en/'):
            self.open_simulator(lang, 'teorema-central-limite')
            self.page.select_option('#sampleSize', '5')
            self.page.select_option('#numSims', '100')
            for distribution in ('normal', 'uniform', 'exponential', 'bernoulli', 'poisson', 'chisquare'):
                self.page.select_option('#dist', distribution)
                cases.append(self.collect(lang+'clt/'+distribution, 'simBtn'))

            self.open_simulator(lang, 'simulador-bootstrap')
            self.page.select_option('#sampleN', '10')
            self.page.select_option('#numBoot', '200')
            for distribution in ('normal', 'exponential', 'uniform', 'lognormal', 'binomial', 'poisson'):
                self.page.select_option('#popDist', distribution)
                for statistic, confidence in [('mean', '0.90'), ('median', '0.95'), ('sd', '0.99')]:
                    self.page.select_option('#statistic', statistic)
                    self.page.select_option('#confLevel', confidence)
                    cases.append(self.collect(lang+'bootstrap/'+distribution+'/'+statistic, 'newSampleBtn'))

            self.open_simulator(lang, 'simulador-cadenas-markov')
            for preset in ('clima', 'cliente'):
                self.page.locator('.preset-tab[data-preset="' + preset + '"]').click()
                cases.append(self.collect(lang+'markov/'+preset, 'simBtn'))
            self.page.locator('.preset-tab[data-preset="custom"]').click()
            self.page.select_option('#numStates', '2')
            # Periodic and reducible examples exercise the exact iteration used by the page.
            for name, matrix in [('periodic', [[0, 1], [1, 0]]), ('reducible', [[1, 0], [0, 1]])]:
                for i, row in enumerate(matrix):
                    for j, value in enumerate(row):
                        self.fill(**{f'cell_{i}_{j}': value})
                cases.append(self.collect(lang+'markov/'+name, 'simBtn'))

            self.open_simulator(lang, 'simulador-proceso-poisson')
            for mode, suffix in [('trayectoria', 't'), ('distribucion', 'd'), ('tiempos', 'e')]:
                self.page.locator('#tab-' + mode).click()
                self.fill(**{'lambda-'+suffix: 1.7, 'horizon-'+suffix: 2.5})
                if suffix != 't':
                    self.page.select_option('#num-sims-'+suffix, '100')
                cases.append(self.collect(lang+'poisson/'+mode, 'btn-simular-'+suffix))

            self.open_simulator(lang, 'simulador-paseo-aleatorio')
            self.page.select_option('#n1d', '50')
            self.page.select_option('#paths1d', '5')
            for probability in ('0.3', '0.5', '0.7'):
                self.page.select_option('#p1d', probability)
                cases.append(self.collect(lang+'walk1d/'+probability, 'btn1d'))
            self.page.locator('.mode-tab[data-tab="2d"]').click()
            self.page.select_option('#n2d', '100')
            for paths in ('1', '3'):
                self.page.select_option('#paths2d', paths)
                cases.append(self.collect(lang+'walk2d/'+paths, 'btn2d'))

            self.open_simulator(lang, 'simulador-intervalos-confianza')
            self.page.select_option('#numIntMedia', '20')
            self.page.select_option('#nMedia', '10')
            for method in ('z', 't'):
                self.page.select_option('#methodMedia', method)
                cases.append(self.collect(lang+'intervals/'+method, 'simBtn'))
            self.page.locator('#tabProp').click()
            self.page.select_option('#numIntProp', '20')
            self.page.select_option('#nProp', '10')
            self.fill(trueP=.03)
            for method in ('wald', 'wilson', 'clopper'):
                self.page.select_option('#methodProp', method)
                cases.append(self.collect(lang+'intervals/'+method, 'simBtn'))

            self.open_simulator(lang, 'simulador-errores-tipo-i-ii')
            for alternative in ('right', 'two'):
                self.page.select_option('#testType', alternative)
                cases.append(self.collect(lang+'errors/'+alternative, None))
        self.assertEqual(len(cases), 86)
        self.execute_cases(cases)

    def test_seed_repeatability_and_new_random_runs(self):
        cases = []
        for name, button in [('teorema-central-limite', 'simBtn'),
                             ('simulador-bootstrap', 'newSampleBtn'),
                             ('simulador-cadenas-markov', 'simBtn'),
                             ('simulador-proceso-poisson', 'btn-simular-t'),
                             ('simulador-paseo-aleatorio', 'btn1d'),
                             ('simulador-intervalos-confianza', 'simBtn')]:
            self.open_simulator('/', name)
            for seed in (0, 4294967295):
                first = self.collect(name+'/'+str(seed), button, seed)
                second = self.run_simulation(button, seed)
                self.assertEqual(first['payload'], second)
                cases.append(first)
            first = self.run_simulation(button, '')
            second = self.run_simulation(button, '')
            self.assertNotEqual(first['o']['seed'], second['o']['seed'])
        self.execute_cases(cases)

    def test_bootstrap_keeps_sample_and_snapshot_until_recalculation(self):
        self.open_simulator('/', 'simulador-bootstrap')
        self.page.select_option('#sampleN', '10')
        self.page.select_option('#numBoot', '200')
        initial = self.collect('bootstrap-initial', 'newSampleBtn')
        code = self.page.locator('#reproduce-code code').inner_text()
        self.page.select_option('#sampleN', '100')
        self.page.select_option('#popDist', 'poisson')
        self.assertTrue(self.page.locator('.reproduce-stale').is_visible())
        self.assertEqual(self.page.locator('#reproduce-code code').inner_text(), code)
        repeated = self.collect('bootstrap-kept-sample', 'rebootBtn')
        self.assertEqual(initial['payload']['o']['sample'], repeated['payload']['o']['sample'])
        self.assertEqual(len(repeated['payload']['o']['sample']), 10)
        self.assertFalse(self.page.locator('.reproduce-stale').is_visible())
        self.execute_cases([initial, repeated])

    def test_invalid_seed_and_matrix_hide_code_and_recover(self):
        for lang in ('/', '/en/'):
            self.open_simulator(lang, 'simulador-cadenas-markov')
            self.run_simulation('simBtn')
            for value in ('-1', '1.5', '4294967296'):
                self.fill(**{'simulationSeed-simBtn': value})
                self.page.locator('#simBtn').click()
                self.assertFalse(self.page.locator('#reproduce-code').is_visible())
            self.run_simulation('simBtn')
            self.page.locator('.preset-tab[data-preset="custom"]').click()
            self.page.select_option('#numStates', '2')
            self.run_simulation('simBtn')
            self.fill(cell_0_0=.1)
            self.page.locator('#simBtn').click()
            self.assertFalse(self.page.locator('#reproduce-code').is_visible())
            self.assertTrue(self.page.locator('#matrixError').is_visible())
            self.fill(cell_0_0=.5)
            self.run_simulation('simBtn')
            self.assertTrue(self.page.locator('#reproduce-code').is_visible())

    def test_mobile_code_and_mode_switches(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        for lang in ('/', '/en/'):
            self.open_simulator(lang, 'simulador-paseo-aleatorio')
            self.collect('walk1d-mobile', 'btn1d')
            rect = self.page.locator('#reproduce-code').bounding_box()
            self.assertGreaterEqual(rect['x'], 0)
            self.assertLessEqual(rect['x']+rect['width'], 390)
            self.page.locator('.mode-tab[data-tab="2d"]').click()
            self.assertFalse(self.page.locator('#reproduce-code').is_visible())
            self.collect('walk2d-mobile', 'btn2d')
            self.assertTrue(self.page.locator('#interp2d + #reproduce-code').is_visible())
            self.open_simulator(lang, 'simulador-bootstrap')
            self.page.select_option('#sampleN', '1000')
            self.page.select_option('#numBoot', '200')
            sample = self.collect('bootstrap-long-sample-mobile', 'newSampleBtn')
            pre = self.page.locator('#reproduce-code pre')
            self.assertLessEqual(pre.bounding_box()['height'], 550)
            pre.focus()
            self.page.keyboard.press('PageDown')
            self.page.wait_for_function('document.querySelector("#reproduce-code pre").scrollTop > 0')
            self.page.context.grant_permissions(['clipboard-read', 'clipboard-write'])
            self.page.locator('.reproduce-copy').click()
            self.page.wait_for_function('''['Copied', 'Copiado'].includes(
                document.querySelector('.reproduce-status').textContent)''')
            self.assertEqual(self.page.evaluate('navigator.clipboard.readText()'), sample['python'])
