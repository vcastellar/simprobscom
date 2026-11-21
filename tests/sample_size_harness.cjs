// Run the calculator's own inline script in a minimal DOM for numerical tests.
// This does not replace browser checks of the shared tabs/copy component.
const fs = require('fs');
const vm = require('vm');
const input = JSON.parse(fs.readFileSync(0,'utf8'));
const elements = {};
for (const [id, data] of Object.entries(input.fields)) elements[id] = {
    ...data, addEventListener() {}, options: [], add() {}, hidden: false
};
let snippet, expected;
const context = {
    document: {documentElement:{lang:input.language},getElementById(id) {
        if (!elements[id]) throw Error('Unknown field: '+id);
        return elements[id];
    }},
    URLSearchParams, location:{search:''}, console,
    SampleSizeCharts: {clear(){}, power(o){expected=o.n;}, precision(o){expected=o.n;}},
    ReproduceCode: {clear(){snippet=null;}, show(result,value){snippet=value;}},
};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(input.jstat,'utf8'),context);
vm.runInContext(fs.readFileSync('reproduce-sample-sizes.js','utf8'),context);
for (const script of input.scripts) vm.runInContext(script,context);
const records = [];
function record() { records.push({snippet,expected}); }
record();
for (const scenario of input.scenarios || []) {
    for (const [id, value] of Object.entries(scenario)) {
        if (typeof value === 'boolean') elements[id].checked=value;
        else elements[id].value=String(value);
    }
    vm.runInContext(input.calculate+'()',context);
    record();
}
process.stdout.write(JSON.stringify(records));
