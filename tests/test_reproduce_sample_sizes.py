"""Execute generated sample-size code against the calculator's unrounded n.

Set PROBLAB_JSTAT to a local copy of the pinned jStat 1.9.4 script. This
numerical harness needs no browser; existing browser tests cover the shared UI.
"""
from contextlib import redirect_stdout
from html.parser import HTMLParser
from io import StringIO
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Fields(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.fields = {}
        self.select = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.fields[a['id']] = dict(value=a.get('value',''), checked='checked' in a)
        if tag == 'select':
            self.select = a.get('id')
            if self.select:
                self.fields[self.select] = dict(value=None)
        if tag == 'option' and self.select:
            f = self.fields[self.select]
            if f['value'] is None or 'selected' in a:
                f['value'] = a.get('value','')

    def handle_endtag(self, tag):
        if tag == 'select':
            self.select = None


class SampleSizeCodeTests(unittest.TestCase):
    def records(self, path):
        source = path.read_text()
        scripts = [s for s in re.findall(r'<script>(.*?)</script>', source, re.S)
                   if 'function calculate' in s]
        calculate = re.search(r'function (calculate\w+)\(', scripts[0])[1]
        fields = Fields(source).fields
        scenarios = []
        # Exercise another confidence/power and nondefault allocation/tail.
        changes = {}
        for id, field in fields.items():
            if id.endswith('Confidence'): changes[id] = 90
            if id.endswith('Power'): changes[id] = .9
            if id.endswith('Alpha'): changes[id] = .1
            if id.endswith('Tail'): changes[id] = 'one-sided' if 'one-sided' in source else 'right'
            if id.endswith('Alternative'): changes[id] = 'greater'
            if id.endswith('Allocation'): changes[id] = 'custom'
            if id.endswith('Ratio'): changes[id] = 1.7
            if id.endswith('ApplyFPC'): changes[id] = False
        if changes: scenarios.append(changes)
        if 'niType' in fields: scenarios.append({'niType':'eq','niDelta':.2})
        if 'varAlternative' in fields: scenarios.append({'varAlternative':'less','varR':.7})
        if 'twoVarTail' in fields: scenarios.append({'twoVarTail':'two-sided','twoVarR':.7})
        if 'onePropAlternative' in fields: scenarios.append({'onePropAlternative':'less'})
        data = dict(fields=fields,scripts=scripts,calculate=calculate,
                    language='en' if path.parent.name=='en' else 'es',
                    scenarios=scenarios,jstat=os.environ['PROBLAB_JSTAT'])
        run = subprocess.run(['node','tests/sample_size_harness.cjs'],input=json.dumps(data),
                             text=True,cwd=ROOT,capture_output=True,check=True,timeout=120)
        return json.loads(run.stdout)

    def test_all_calculators_and_languages(self):
        if not os.environ.get('PROBLAB_JSTAT'):
            self.skipTest('Set PROBLAB_JSTAT to pinned jStat 1.9.4')
        count = 0
        for folder in [ROOT,ROOT/'en']:
            paths = sorted(folder.glob('tamano-muestral-*.html'))
            self.assertEqual(len(paths),25)
            for path in paths:
                with self.subTest(path=str(path.relative_to(ROOT))):
                    for record in self.records(path):
                        self.assertIsNotNone(record['snippet'])
                        self.assertIsNotNone(record['expected'])
                        namespace = {}
                        with redirect_stdout(StringIO()):
                            exec(record['snippet']['python'], namespace)
                        self.assertEqual(namespace['result'],record['expected'], record['snippet']['python'])
                        count += 1
        self.assertGreaterEqual(count,100)

    def test_r_snippets(self):
        executable = os.environ.get('PROBLAB_RSCRIPT') or shutil.which('Rscript')
        if not executable or not os.environ.get('PROBLAB_JSTAT'):
            self.skipTest('Requires Rscript and PROBLAB_JSTAT')
        for path in sorted(ROOT.glob('tamano-muestral-*.html')):
            for record in self.records(path):
                with self.subTest(path=path.name):
                    run = subprocess.run([executable,'--vanilla','-e',record['snippet']['r']+'\ncat("RESULT=",result)'],
                                         capture_output=True,text=True,check=True,timeout=120)
                    self.assertEqual(int(re.search(r'RESULT=\s*(\d+)',run.stdout)[1]),record['expected'])
