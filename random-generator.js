(function (root) {
    'use strict';
    // MT19937 supplied by the vendored mersenne-twister package; normals use Box–Muller.
    function create(seed) {
        const engine = new MersenneTwister(seed);
        return {
            random() { return (engine.random_int() + 0.5) / 4294967296; },
            normal(mu=0,sigma=1) { return mu+sigma*Math.sqrt(-2*Math.log(this.random()))*Math.cos(2*Math.PI*this.random()); },
            exponential(rate=1) { return -Math.log(this.random())/rate; },
            poisson(rate) {
                const limit = Math.exp(-rate);
                let product=1, k=0;
                do { k++; product*=this.random(); } while (product>limit);
                return k-1;
            },
            binomial(n,p) {
                let count=0;
                for (let i=0;i<n;i++) if(this.random()<p) count++;
                return count;
            },
            chisquare(df) {
                let sum=0;
                for(let i=0;i<df;i++) sum+=this.normal()**2;
                return sum;
            }
        };
    }
    root.ProbLabRandom = {create};
}(globalThis));
