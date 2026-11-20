"""Execute the displayed R/Python confidence intervals against unrounded web results."""
from contextlib import redirect_stdout
from io import StringIO
import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory

import numpy as np

from test_input_validation import BrowserTestCase


PAGES = ['media', 'media-sigma-conocida', 'diferencia-medias', 'medias-apareadas',
         'media-poblacion-finita', 'proporcion', 'diferencia-proporciones',
         'proporcion-poblacion-finita', 'varianza', 'odds-ratio', 'ratio-proporciones']


class ConfidenceIntervalReproductionTests(BrowserTestCase):
    def open_interval(self,lang,name):
        self.open(lang,'intervalo-confianza-'+name+'.html')
        self.page.evaluate('''() => {
            const render=CICharts.result;
            CICharts.result=function(el,o) {
                window.intervalOutput={id:el.id,values:[...(o.main?[o.main]:o.rows),...(o.secondary||[])].map(row=>[row.lo,row.hi])};
                render(el,o);
            };
        }''')

    def collect(self,name):
        self.page.evaluate('window.intervalOutput=null')
        self.page.locator('.calculate-btn').click()
        self.page.wait_for_function('window.intervalOutput !== null')
        output=self.page.evaluate('window.intervalOutput')
        panel=self.page.locator('#reproduce-code')
        self.assertTrue(panel.is_visible())
        if not panel.evaluate('e=>e.open'):panel.locator('summary').click()
        snippets={}
        for language in ('r','python'):
            self.page.locator('#reproduce-tab-'+language).click()
            snippets[language]=panel.locator('code').inner_text()
            self.assertNotIn('undefined',snippets[language])
        return dict(name=name,expected=output['values'],**snippets)

    def execute_cases(self,cases):
        for case in cases:
            with self.subTest(case=case['name'],runtime='Python'):
                namespace={}
                with redirect_stdout(StringIO()):exec(case['python'],namespace)
                np.testing.assert_allclose(namespace['result']['intervals'],case['expected'],rtol=2e-5,atol=1e-8)
        executable=os.environ.get('PROBLAB_RSCRIPT') or shutil.which('Rscript')
        if not executable:
            with self.subTest(runtime='R'):self.skipTest('Install R or set PROBLAB_RSCRIPT')
            return
        blocks=[]
        for i,case in enumerate(cases):
            blocks.append('local({\n'+case['r']+'\ncat("\\nCASE_'+str(i)+'=",paste(format(as.numeric(t(result$intervals)),digits=17),collapse=","),"\\n")\n})')
        with TemporaryDirectory() as directory:
            script=Path(directory)/'intervals.R';script.write_text('\n'.join(blocks))
            completed=subprocess.run([executable,'--vanilla','-f',str(script)],text=True,capture_output=True,timeout=120)
        self.assertEqual(completed.returncode,0,completed.stderr)
        values={int(i):np.fromstring(v,sep=',') for i,v in re.findall(r'CASE_(\d+)=\s*([^\n]+)',completed.stdout)}
        self.assertEqual(len(values),len(cases),completed.stdout)
        for i,case in enumerate(cases):
            with self.subTest(case=case['name'],runtime='R'):
                np.testing.assert_allclose(values[i],np.asarray(case['expected']).ravel(),rtol=2e-5,atol=1e-8)

    def test_catalog_methods_and_boundary_counts_in_both_languages(self):
        cases=[]
        for lang in ('/','/en/'):
            for name in PAGES:
                self.open_interval(lang,name)
                select='#fmConf' if name=='media-poblacion-finita' else '#fpConf' if name=='proporcion-poblacion-finita' else '#conf'
                for confidence in ('0.90','0.95','0.99'):
                    self.page.select_option(select,confidence)
                    cases.append(self.collect(f'{lang}{name}/{confidence}'))
                if select=='#conf':
                    self.page.select_option(select,'custom');self.fill(customConf=.937)
                    cases.append(self.collect(f'{lang}{name}/custom'))
            self.open_interval(lang,'proporcion')
            self.fill(n=20)
            for x in (0,2,20):
                self.fill(x=x)
                for method in ('wald','wilson','clopper','both'):
                    self.page.select_option('#method',method)
                    cases.append(self.collect(f'{lang}proportion/{x}/{method}'))
            self.open_interval(lang,'diferencia-proporciones')
            self.fill(n1=20,n2=20)
            for x1,x2 in ((0,20),(0,0)):
                self.fill(x1=x1,x2=x2)
                for method in ('wald','newcombe','both'):
                    self.page.select_option('#method',method)
                    cases.append(self.collect(f'{lang}difference/{x1}/{x2}/{method}'))
            for name in ('odds-ratio','ratio-proporciones'):
                self.open_interval(lang,name)
                positive={'a':8,'b':12,'c':4,'d':16} if name=='odds-ratio' else {'x1':8,'n1':20,'x2':4,'n2':20}
                self.fill(**positive)
                for correction in ('none','auto','always'):
                    self.page.select_option('#correction',correction)
                    cases.append(self.collect(f'{lang}{name}/positive/{correction}'))
                self.fill(**({'a':0} if name=='odds-ratio' else {'x1':0}))
                for correction in ('auto','always'):
                    self.page.select_option('#correction',correction)
                    cases.append(self.collect(f'{lang}{name}/zero/{correction}'))
            self.open_interval(lang,'diferencia-medias')
            self.fill(xbar1=10,xbar2=12,s1=3,s2=8,n1=15,n2=40)
            for method in ('welch','pooled'):
                self.page.select_option('#varType',method)
                cases.append(self.collect(f'{lang}twoMeans/{method}'))
            self.open_interval(lang,'medias-apareadas')
            self.fill(meanDiff=-3,sdDiff=5,n=12)
            for direction in ('after-before','before-after','method1-method2'):
                self.page.select_option('#direction',direction)
                cases.append(self.collect(f'{lang}paired/{direction}'))
            for name,prefix in [('media-poblacion-finita','fm'),('proporcion-poblacion-finita','fp')]:
                self.open_interval(lang,name)
                self.fill(**{prefix+'N':20,prefix+'BigN':20})
                if prefix=='fp':self.fill(fpX=10)
                cases.append(self.collect(f'{lang}{name}/census'))
        self.assertEqual(len(cases),154)
        self.execute_cases(cases)

    def test_stale_invalid_confidence_copy_and_mobile(self):
        for lang in ('/','/en/'):
            for name in PAGES:
                self.open_interval(lang,name)
                self.collect(lang+name)
                panel=self.page.locator('#reproduce-code')
                text=panel.locator('code').inner_text()
                field='fmS' if name=='media-poblacion-finita' else 'fpN' if name=='proporcion-poblacion-finita' else 'n' if name in ('media','media-sigma-conocida','medias-apareadas','varianza','proporcion') else 'a' if name=='odds-ratio' else 'n1'
                old=self.page.locator('#'+field).input_value()
                self.fill(**{field:''})
                self.assertTrue(panel.locator('.reproduce-stale').is_visible())
                self.assertEqual(panel.locator('code').inner_text(),text)
                self.page.locator('.calculate-btn').click()
                self.assertFalse(panel.is_visible())
                self.fill(**{field:old});self.page.locator('.calculate-btn').click()
                self.assertTrue(panel.is_visible())
            self.open_interval(lang,'proporcion')
            self.page.select_option('#conf','custom');self.fill(customConf=1)
            self.assertFalse(self.page.locator('#reproduce-code').is_visible())
            self.fill(customConf=.95);self.collect(lang+'proportion/restored')
            self.page.context.grant_permissions(['clipboard-read','clipboard-write'])
            self.page.locator('.reproduce-copy').click()
            self.page.wait_for_function("['Copied','Copiado'].includes(document.querySelector('.reproduce-status').textContent)")
            self.assertEqual(self.page.evaluate('navigator.clipboard.readText()'),self.page.locator('#reproduce-code code').inner_text())
            self.page.set_viewport_size({'width':390,'height':844})
            rect=self.page.locator('#reproduce-code').bounding_box()
            self.assertGreaterEqual(rect['x'],0);self.assertLessEqual(rect['x']+rect['width'],390)
            pre=self.page.locator('#reproduce-code pre')
            self.assertLessEqual(pre.bounding_box()['height'],550)
            pre.focus();self.page.keyboard.press('PageDown')
            self.page.wait_for_function('document.querySelector("#reproduce-code pre").scrollTop > 0')
            self.page.set_viewport_size({'width':1280,'height':800})
