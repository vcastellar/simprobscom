"""Independent MT19937 reference vectors and distribution checks for the web RNG."""
import json
from pathlib import Path
import subprocess
import unittest

import numpy as np
from test_input_validation import BrowserTestCase


ROOT = Path(__file__).resolve().parents[1]


class RandomGeneratorTests(unittest.TestCase):
    def node(self, code):
        result = subprocess.run(['node', '-e', code], cwd=ROOT, check=True, capture_output=True, text=True)
        return json.loads(result.stdout)

    def test_mt19937_matches_independent_reference_across_twists(self):
        for seed in (0, 5489, 4294967295):
            actual = self.node('const MT=require("./vendor/mersenne-twister.js");'
                               f'const rng=new MT({seed});console.log(JSON.stringify(Array.from({{length:2000}},()=>rng.random_int())));')
            expected = np.random.RandomState(seed).randint(0, 2**32, size=2000, dtype=np.uint32)
            np.testing.assert_array_equal(actual, expected)

    def test_distributions_have_expected_moments_and_open_uniforms(self):
        moments = self.node('''global.MersenneTwister=require("./vendor/mersenne-twister.js");
require("./random-generator.js");
const rng=ProbLabRandom.create(123456), result={};
for(const [kind,args] of [["random",[]],["normal",[]],["exponential",[2]],["poisson",[3]],["binomial",[10,.3]],["chisquare",[3]]]) {
    const a=Array.from({length:100000},()=>rng[kind](...args));
    const mean=a.reduce((s,v)=>s+v,0)/a.length;
    result[kind]={mean,variance:a.reduce((s,v)=>s+(v-mean)**2,0)/a.length,min:Math.min(...a),max:Math.max(...a)};
}
console.log(JSON.stringify(result));''')
        expected = {'random': (.5, 1/12), 'normal': (0, 1), 'exponential': (.5, .25),
                    'poisson': (3, 3), 'binomial': (3, 2.1), 'chisquare': (3, 6)}
        for kind, (mean, variance) in expected.items():
            self.assertLess(abs(moments[kind]['mean']-mean), 7*np.sqrt(variance/100000))
            self.assertLess(abs(moments[kind]['variance']-variance), .07*variance)
        self.assertGreater(moments['random']['min'], 0)
        self.assertLess(moments['random']['max'], 1)


class ShapiroGeneratorTests(BrowserTestCase):
    def test_documented_example_and_seed_domain_in_both_languages(self):
        for lang in ('/', '/en/'):
            self.open(lang,'shapiro-wilk-normalidad.html')
            self.page.evaluate('''() => {
                const render=renderShapiroResult;
                window.renderShapiroResult=o=>{window.exampleResult=o;render(o);};
            }''')
            self.fill(sampleData='23.1 24.5 22.8 25.2 24.1 23.7 24.9 23.5 25.0 24.3',mcSeed=12345,mcIter=5000)
            self.page.locator('#calcShapiroBtn').click()
            result=self.page.evaluate('window.exampleResult')
            self.assertEqual(result['b'],3683)
            self.assertAlmostEqual(result['p'],3684/5001)
            for seed in (0,4294967295):
                self.fill(mcSeed=seed,mcIter=1000)
                self.page.locator('#calcShapiroBtn').click()
                first=self.page.locator('#shapiroResult').inner_text()
                self.page.locator('#calcShapiroBtn').click()
                self.assertEqual(first,self.page.locator('#shapiroResult').inner_text())
            for seed in (-1,1.5,4294967296):
                self.fill(mcSeed=seed)
                self.page.locator('#calcShapiroBtn').click()
                self.assertFalse(self.page.locator('#reproduce-code').is_visible())
