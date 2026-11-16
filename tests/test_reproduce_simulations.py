"""Execute the displayed simulation code and compare it with the browser's run."""

from contextlib import redirect_stdout
from io import StringIO
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory, mkdtemp
from unittest.mock import patch

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

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
        return self.capture_case(name, payload)

    def capture_case(self, name, payload):
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
        self.assertIn('matplotlib', panel.locator('.reproduce-dependencies').inner_text())
        return dict(name=name, observed=observed, payload=payload, stream_state=self.page.evaluate('ReproduceSimulations.snapshot()'), **snippets)

    def execute_cases(self, cases):
        def flatten(values):
            return np.concatenate([np.atleast_1d(v).astype(float) for v in values])

        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = os.environ.get('PROBLAB_PLOT_OUTPUT')
        if root:
            Path(root).mkdir(parents=True, exist_ok=True)
            output = Path(mkdtemp(prefix=self._testMethodName+'-', dir=root))
        else:
            output = Path(temporary.name)
        for i, case in enumerate(cases):
            with self.subTest(case=case['name'], language='Python'):
                namespace = {}
                try:
                    with redirect_stdout(StringIO()), patch('matplotlib.pyplot.show') as show:
                        exec(case['python'], namespace)
                    show.assert_called_once()
                    self.assertEqual(len(plt.get_fignums()), 1)
                    self.assert_plot(case, namespace)
                    namespace['fig'].savefig(output/f'python-{i}.png')
                finally:
                    plt.close('all')
                self.assert_plot_image(output/f'python-{i}.png')
                actual = flatten(namespace['result'][key] for key in case['observed'])
                np.testing.assert_allclose(actual, flatten(case['observed'].values()),
                                           rtol=1e-7, atol=1e-8)
                if case['payload']['kind'] != 'errors':
                    self.assertEqual(namespace['state'], case['stream_state'], 'Plotting must not draw new samples')
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
            image_path = json.dumps(str(output/f'r-{i}-%d.png'))
            checks = ''
            if case['payload']['kind'] != 'errors':
                checks += '\nstopifnot(state == '+str(case['stream_state'])+')'
            if case['payload']['kind'] == 'poissonGaps':
                checks += '\nstopifnot(abs(sum(gap_hist$density*diff(gap_hist$breaks))-mean(gaps < 4/rate)) < 1e-12)'
            blocks.append('local({\npng('+image_path+', width=1200, height=750, res=120)\n' +
                case['r'] + checks + '\ndev.off()\ncat("\\nCASE_' + str(i) +
                '=", paste(format(unlist(result[c(' + keys + ')]), digits=17), collapse=","), "\\n")\n})')
        script = output/'simulations.R'
        script.write_text('\n'.join(blocks))
        completed = subprocess.run([executable, '--vanilla', '-f', str(script)],
                                   capture_output=True, text=True, timeout=180,
                                   env={**os.environ, 'XDG_CACHE_HOME': str(output/'cache')})
        self.assertEqual(completed.returncode, 0, completed.stderr)
        values = {int(i): np.fromstring(v, sep=',') for i, v in re.findall(
            r'CASE_(\d+)=\s*([^\n]+)', completed.stdout)}
        self.assertEqual(len(values), len(cases), completed.stdout)
        for i, case in enumerate(cases):
            with self.subTest(case=case['name'], language='R'):
                np.testing.assert_allclose(values[i], flatten(case['observed'].values()),
                                           rtol=1e-7, atol=1e-8)
                self.assertEqual(len(list(output.glob(f'r-{i}-*.png'))), 1, 'Each snippet produces one figure')
                self.assert_plot_image(output/f'r-{i}-1.png')
        if root:
            (output/'cases.json').write_text(json.dumps([{'name': c['name'], 'kind': c['payload']['kind']} for c in cases], indent=2))

    def assert_plot_image(self, path):
        with Image.open(path) as image:
            self.assertGreaterEqual(min(image.size), 400)
            pixels = np.asarray(image.convert('RGB'))
            self.assertGreater(np.count_nonzero(np.min(pixels, axis=2) < 240), 1000)

    def assert_plot(self, case, namespace):
        kind = case['payload']['kind']
        axes = namespace['fig'].axes
        self.assertEqual(len(axes), 2 if kind in ('clt', 'bootstrap', 'markov') else 1)
        self.assertTrue(all(ax.get_title() for ax in axes))
        if kind == 'walk1d':
            self.assertEqual(len(axes[0].lines), namespace['paths']+int(namespace['show_mean']))
            self.assertEqual(len(axes[0].collections), int(namespace['show_bands']))
            for line, walk in zip(axes[0].lines, namespace['walks']):
                np.testing.assert_array_equal(line.get_ydata(), walk)
        if kind == 'walk2d':
            self.assertEqual(len(axes[0].patches), int(namespace['show_circle']))
            for line, walk in zip(axes[0].lines, namespace['walks']):
                np.testing.assert_array_equal(line.get_xydata(), walk)
        if kind == 'markov':
            lines = axes[0].lines[::2]
            np.testing.assert_allclose([line.get_ydata()[-1] for line in lines], namespace['empirical'])
            self.assertEqual([text.get_text() for text in axes[0].get_legend().get_texts()], namespace['state_names'])
            np.testing.assert_allclose([bar.get_height() for bar in axes[1].patches],
                                       np.r_[namespace['empirical'], namespace['stationary']])
        if kind == 'bootstrap':
            bounds = [line.get_xdata()[0] for line in axes[1].lines if len(line.get_xdata()) == 2]
            np.testing.assert_allclose(bounds, namespace['ci'])
        if kind == 'poissonPath':
            for line, run in zip(axes[0].lines, namespace['runs']):
                np.testing.assert_array_equal(line.get_xdata(), [0, *run['events'], namespace['horizon']])
        if kind == 'poissonGaps':
            displayed_mass = sum(bar.get_width()*bar.get_height() for bar in axes[0].patches)
            np.testing.assert_allclose(displayed_mass, np.mean(namespace['gaps'] < 4/namespace['rate']))
        if kind == 'intervals':
            segments = axes[0].collections[0].get_segments()
            np.testing.assert_allclose([[seg[0,0], seg[1,0]] for seg in segments], namespace['intervals'][:,:2])
            np.testing.assert_allclose(axes[0].collections[1].get_offsets()[:,0], namespace['intervals'][:,2])
        namespace['fig'].canvas.draw()

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

    def test_plot_options_and_degenerate_samples(self):
        cases = []
        self.open_simulator('/', 'simulador-paseo-aleatorio')
        self.page.locator('#bands1d').uncheck()
        self.page.locator('#meanline1d').uncheck()
        cases.append(self.collect('walk1d-no-reference-lines', 'btn1d'))
        self.page.locator('.mode-tab[data-tab="2d"]').click()
        self.page.locator('#circle2d').uncheck()
        cases.append(self.collect('walk2d-no-circle', 'btn2d'))
        self.open_simulator('/', 'simulador-proceso-poisson')
        self.fill(**{'lambda-t': .1, 'horizon-t': .5})
        self.page.select_option('#num-traj', '1')
        empty = self.collect('poisson-no-events', 'btn-simular-t')
        self.assertEqual(empty['observed']['counts'], [0])
        cases.append(empty)
        self.open_simulator('/', 'simulador-bootstrap')
        self.page.locator('.simulation-seed-input').fill('12345')
        self.page.evaluate('''() => {
            currentSample = Array(10).fill(5);
            currentSampleDist = 'normal';
            runBootstrap('normal', 'mean', 10, 200, .95);
        }''')
        constant = self.capture_case('bootstrap-constant-sample', self.page.evaluate('window.simulationPayload'))
        self.assertEqual(constant['observed']['standard_error'], 0)
        cases.append(constant)
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
