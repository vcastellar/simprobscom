(function () {
    'use strict';
    const en = document.documentElement.lang === 'en';
    const q = JSON.stringify;
    const L = en ? {
        density:'Density', probability:'Probability', value:'Value', frequency:'Frequency',
        observed:'Empirical', theoretical:'Theoretical', fitted:'Fitted normal',
        original:'Original distribution', means:'Sample means', sample:'Observed sample', bootstrap:'Bootstrap distribution',
        step:'Step', position:'Position', walk1d:'Random walk in 1D', walk2d:'Random walk in 2D',
        mean:'Theoretical mean', band:'Mean +/- 2 SD', origin:'Origin', final:'Final position',
        occupation:'State occupation over time', comparison:'Final occupation frequencies', state:'State', stationary:'Stationary iteration',
        time:'Time', count:'Event count', poissonPath:'Poisson process trajectories', poissonCounts:'Distribution of N(T)',
        poissonGaps:'Complete waiting times', wait:'Waiting time', interval:'Interval', intervals:'Confidence intervals',
        covered:'Covers the true value', missed:'Misses the true value', truth:'True value',
        errors:'Type I and type II errors', null:'H0', alternative:'H1', critical:'Critical value',
        ci:'Percentile interval', axisX:'x', axisY:'y'
    } : {
        density:'Densidad', probability:'Probabilidad', value:'Valor', frequency:'Frecuencia',
        observed:'Empírico', theoretical:'Teórico', fitted:'Normal ajustada',
        original:'Distribución original', means:'Medias muestrales', sample:'Muestra observada', bootstrap:'Distribución bootstrap',
        step:'Paso', position:'Posición', walk1d:'Paseo aleatorio 1D', walk2d:'Paseo aleatorio 2D',
        mean:'Media teórica', band:'Media +/- 2 DT', origin:'Origen', final:'Posición final',
        occupation:'Ocupación de estados en el tiempo', comparison:'Frecuencias finales de ocupación', state:'Estado', stationary:'Iteración estacionaria',
        time:'Tiempo', count:'Número de eventos', poissonPath:'Trayectorias del proceso de Poisson', poissonCounts:'Distribución de N(T)',
        poissonGaps:'Tiempos de espera completos', wait:'Tiempo de espera', interval:'Intervalo', intervals:'Intervalos de confianza',
        covered:'Cubre el valor verdadero', missed:'No cubre el valor verdadero', truth:'Valor verdadero',
        errors:'Errores de tipo I y tipo II', null:'H0', alternative:'H1', critical:'Valor crítico',
        ci:'Intervalo percentil', axisX:'x', axisY:'y'
    };
    // Explicit equal-width breaks also handle constant samples and avoid R's pretty-bin rounding.
    const rHistogram = `density_hist <- function(values, bins) {
    lo <- min(values); hi <- max(values)
    if (hi == lo) hi <- lo+1
    hist(values, breaks=seq(lo,hi,length.out=bins+1), right=FALSE, include.lowest=TRUE, plot=FALSE)
}`;
    const pyHistogram = `def density_hist(ax, values, bins, title, xlabel):
    lo, hi = float(np.min(values)), float(np.max(values))
    if hi == lo:
        hi = lo+1
    ax.hist(values, bins=np.linspace(lo,hi,bins+1), density=True, color="#a5b4fc", edgecolor="white")
    ax.set(title=title, xlabel=xlabel, ylabel=${q(L.density)})`;
    const rPanels = 'old_par <- par(mfrow=c(1,2), mar=c(4.5,4,3,1))';
    const pyPanels = 'fig, axes = plt.subplots(1,2, figsize=(12,4.5), layout="constrained")';
    const rEndPanels = '\npar(old_par)';

    const populations = {
        normal: ['dnorm(x,5,2)', 'stats.norm.pdf(x,loc=5,scale=2)'],
        exponential: ['dexp(x,rate=.5)', 'stats.expon.pdf(x,scale=2)'],
        uniform: ['dunif(x,0,10)', 'stats.uniform.pdf(x,loc=0,scale=10)'],
        lognormal: ['dlnorm(x,1,.5)', 'stats.lognorm.pdf(x,s=.5,scale=np.exp(1))'],
        binomial: ['dbinom(k,10,.5)', 'stats.binom.pmf(k,n=10,p=.5)'],
        poisson: ['dpois(k,5)', 'stats.poisson.pmf(k,mu=5)']
    };
    const cltPopulations = {
        normal: ['dnorm(x)', 'stats.norm.pdf(x)'],
        uniform: ['dunif(x)', 'stats.uniform.pdf(x)'],
        exponential: ['dexp(x)', 'stats.expon.pdf(x)'],
        bernoulli: ['dbinom(k,1,.3)', 'stats.bernoulli.pmf(k,p=.3)'],
        poisson: ['dpois(k,3)', 'stats.poisson.pmf(k,mu=3)'],
        chisquare: ['dchisq(x,3)', 'stats.chi2.pdf(x,df=3)']
    };
    function sourceHistogram(dist, data, bins, title, table) {
        const [rBins,pyBins] = Array.isArray(bins) ? bins : [bins,bins];
        const discrete = ['binomial','bernoulli','poisson'].includes(dist);
        const [rpdf,pypdf] = table[dist];
        if (discrete) return {
            r: `k <- seq(min(${data}), max(${data}))
mass <- tabulate(match(${data},k), nbins=length(k))/length(${data})
theory <- ${rpdf}
plot(k,mass,type="h",lwd=8,col="#818cf8",xlim=range(k)+c(-.5,.5),ylim=c(0,max(mass,theory)*1.15),main=${q(title)},xlab=${q(L.value)},ylab=${q(L.probability)})
points(k,theory,col="#dc2626",pch=19)
legend("topright",legend=c(${q(L.observed)},${q(L.theoretical)}),col=c("#818cf8","#dc2626"),pch=c(15,19),bty="n")`,
            python: `k = np.arange(int(np.min(${data})),int(np.max(${data}))+1)
mass = np.array([np.mean(${data} == value) for value in k])
axes[0].bar(k,mass,color="#818cf8",label=${q(L.observed)})
axes[0].plot(k,${pypdf},"o",color="#dc2626",label=${q(L.theoretical)})
axes[0].set(title=${q(title)},xlabel=${q(L.value)},ylabel=${q(L.probability)})
axes[0].legend()`
        };
        return {
            r: `source_hist <- density_hist(${data},${rBins})
x <- seq(min(source_hist$breaks),max(source_hist$breaks),length.out=400)
source_density <- ${rpdf}
plot(source_hist,freq=FALSE,col="#a5b4fc",border="white",ylim=c(0,max(source_hist$density,source_density)*1.1),main=${q(title)},xlab=${q(L.value)},ylab=${q(L.density)})
lines(x,source_density,col="#dc2626",lwd=2)`,
            python: `density_hist(axes[0],${data},${pyBins},${q(title)},${q(L.value)})
x = np.linspace(np.min(${data}),max(np.max(${data}),np.min(${data})+1e-9),400)
axes[0].plot(x,${pypdf},color="#dc2626",label=${q(L.theoretical)})
axes[0].legend()`
        };
    }
    function histograms(kind,o) {
        const clt = kind === 'clt';
        const source = sourceHistogram(o.dist,clt?'original_sample':'data',clt?'40':['max(5,ceiling(log2(n)+1))','max(5,ceil(np.log2(n)+1))'],clt?L.original:L.sample,clt?cltPopulations:populations);
        if (clt) return {
            r: `${rHistogram}
${rPanels}
${source.r}
means_hist <- density_hist(sample_means,min(ceiling(sqrt(simulations)*1.5),60))
theoretical_sd <- sqrt(true_variance/n)
x <- seq(min(min(sample_means),true_mean-4*theoretical_sd),max(max(sample_means),true_mean+4*theoretical_sd),length.out=400)
theory_density <- dnorm(x,true_mean,theoretical_sd)
fitted_density <- if (sd(sample_means) > 0) dnorm(x,mean(sample_means),sd(sample_means)) else rep(0,length(x))
plot(means_hist,freq=FALSE,col="#a5b4fc",border="white",xlim=range(x),ylim=c(0,max(means_hist$density,theory_density,fitted_density)*1.1),main=${q(L.means)},xlab=${q(L.value)},ylab=${q(L.density)})
lines(x,theory_density,col="#dc2626",lwd=2)
if (sd(sample_means) > 0) lines(x,fitted_density,col="#16a34a",lwd=2,lty=2)
legend("topright",legend=c(${q(L.theoretical)},${q(L.fitted)}),col=c("#dc2626","#16a34a"),lty=c(1,2),bty="n")${rEndPanels}`,
            python: `${pyHistogram}
${pyPanels}
${source.python}
density_hist(axes[1],sample_means,min(ceil(sqrt(simulations)*1.5),60),${q(L.means)},${q(L.value)})
theoretical_sd = sqrt(true_variance/n)
x = np.linspace(min(np.min(sample_means),true_mean-4*theoretical_sd),max(np.max(sample_means),true_mean+4*theoretical_sd),400)
axes[1].plot(x,stats.norm.pdf(x,loc=true_mean,scale=theoretical_sd),color="#dc2626",label=${q(L.theoretical)})
if np.std(sample_means,ddof=1) > 0:
    axes[1].plot(x,stats.norm.pdf(x,loc=np.mean(sample_means),scale=np.std(sample_means,ddof=1)),"--",color="#16a34a",label=${q(L.fitted)})
axes[1].legend()`
        };
        return {
            r: `${rHistogram}
${rPanels}
${source.r}
boot_hist <- density_hist(replicates,max(5,ceiling(log2(B)+1)))
inside <- boot_hist$mids >= ci[1] & boot_hist$mids <= ci[2]
padding <- diff(range(boot_hist$breaks))*.2
x <- seq(min(boot_hist$breaks)-padding,max(boot_hist$breaks)+padding,length.out=400)
fitted_density <- if (sd(replicates) > 0) dnorm(x,mean(replicates),sd(replicates)) else rep(0,length(x))
plot(boot_hist,freq=FALSE,col=ifelse(inside,"#86efac","#cbd5e1"),border="white",xlim=range(x),ylim=c(0,max(boot_hist$density,fitted_density)*1.1),main=${q(L.bootstrap)},xlab=statistic_name,ylab=${q(L.density)})
if (sd(replicates) > 0) lines(x,fitted_density,col="#dc2626",lwd=2)
abline(v=ci,col="#0891b2",lty=2,lwd=2)
legend("topright",legend=${q(L.ci)},col="#0891b2",lty=2,bty="n")${rEndPanels}`,
            python: `${pyHistogram}
${pyPanels}
${source.python}
lo, hi = float(np.min(replicates)),float(np.max(replicates))
if hi == lo:
    hi = lo+1
edges = np.linspace(lo,hi,max(5,ceil(np.log2(B)+1))+1)
counts, edges = np.histogram(replicates,bins=edges)
centers = (edges[:-1]+edges[1:])/2
colors = ["#86efac" if ci[0] <= center <= ci[1] else "#cbd5e1" for center in centers]
axes[1].bar(centers,counts/(B*np.diff(edges)),width=np.diff(edges),color=colors,edgecolor="white")
if np.std(replicates,ddof=1) > 0:
    x = np.linspace(lo-.2*(hi-lo),hi+.2*(hi-lo),400)
    axes[1].plot(x,stats.norm.pdf(x,loc=np.mean(replicates),scale=np.std(replicates,ddof=1)),color="#dc2626")
for i,bound in enumerate(ci):
    axes[1].axvline(bound,color="#0891b2",linestyle="--",label=${q(L.ci)} if i == 0 else None)
axes[1].set(title=${q(L.bootstrap)},xlabel=statistic_name,ylabel=${q(L.density)})
axes[1].legend()`
        };
    }
    function walks(kind) {
        if (kind === 'walk1d') return {
            r: `time <- 0:n
expected <- (2*p-1)*time
spread <- sqrt(4*p*(1-p)*time)
limits <- range(unlist(walks),if (show_mean) expected else numeric(0),if (show_bands) c(expected-2*spread,expected+2*spread) else numeric(0))
plot(time,expected,type="n",ylim=limits,xlab=${q(L.step)},ylab=${q(L.position)},main=${q(L.walk1d)})
if (show_bands) polygon(c(time,rev(time)),c(expected+2*spread,rev(expected-2*spread)),col=adjustcolor("#818cf8",alpha.f=.2),border=NA)
colors <- hcl.colors(paths,"Dark 3")
for (i in seq_along(walks)) lines(time,walks[[i]],col=colors[i])
if (show_mean) lines(time,expected,col="black",lty=2,lwd=2)
if (show_mean || show_bands) legend("topleft",legend=c(if (show_mean) ${q(L.mean)},if (show_bands) ${q(L.band)}),col=c(if (show_mean) "black",if (show_bands) "#818cf8"),lty=c(if (show_mean) 2,if (show_bands) 1),bty="n")`,
            python: `fig, ax = plt.subplots(figsize=(9,5),layout="constrained")
time = np.arange(n+1)
expected = (2*p-1)*time
spread = np.sqrt(4*p*(1-p)*time)
if show_bands:
    ax.fill_between(time,expected-2*spread,expected+2*spread,color="#818cf8",alpha=.2,label=${q(L.band)})
for i,walk in enumerate(walks):
    ax.plot(time,walk,color=plt.get_cmap("tab10")(i%10),alpha=.8)
if show_mean:
    ax.plot(time,expected,"--",color="black",label=${q(L.mean)})
ax.set(title=${q(L.walk1d)},xlabel=${q(L.step)},ylabel=${q(L.position)})
if show_bands or show_mean:
    ax.legend()`
        };
        return {
            r: `extent <- max(abs(unlist(walks)),if (show_circle) sqrt(n) else 0,1)*1.1
plot(0,0,type="n",asp=1,xlim=c(-extent,extent),ylim=c(-extent,extent),xlab=${q(L.axisX)},ylab=${q(L.axisY)},main=${q(L.walk2d)})
if (show_circle) {
    angle <- seq(0,2*pi,length.out=300)
    lines(sqrt(n)*cos(angle),sqrt(n)*sin(angle),col="#94a3b8",lty=2)
}
colors <- hcl.colors(paths,"Dark 3")
for (i in seq_along(walks)) {
    lines(walks[[i]][,1],walks[[i]][,2],col=colors[i])
    points(tail(walks[[i]][,1],1),tail(walks[[i]][,2],1),col=colors[i],pch=19)
}
points(0,0,pch=4,lwd=2,cex=1.4)
legend("topright",legend=c(${q(L.origin)},${q(L.final)},if (show_circle) paste0("r = ",signif(sqrt(n),3))),col=c("black","black",if (show_circle) "#94a3b8"),pch=c(4,19,if (show_circle) NA),lty=c(0,0,if (show_circle) 2),bty="n")`,
            python: `fig, ax = plt.subplots(figsize=(6,6),layout="constrained")
for i,walk in enumerate(walks):
    color = plt.get_cmap("tab10")(i%10)
    ax.plot(walk[:,0],walk[:,1],color=color,alpha=.8)
    ax.scatter(walk[-1,0],walk[-1,1],color=color,s=30,label=${q(L.final)} if i == 0 else None)
if show_circle:
    ax.add_patch(plt.Circle((0,0),sqrt(n),fill=False,linestyle="--",color="#94a3b8",label=f"r = {sqrt(n):.2f}"))
ax.scatter([0],[0],marker="x",color="black",label=${q(L.origin)})
ax.set(title=${q(L.walk2d)},xlabel=${q(L.axisX)},ylabel=${q(L.axisY)},aspect="equal")
ax.legend()`
        };
    }
    function markov() {
        return {
            r: `${rPanels}
occupation <- sapply(seq_len(states),function(s) cumsum(history == s)/seq_along(history))
colors <- hcl.colors(states,"Dark 3")
matplot(0:steps,occupation,type="l",lty=1,col=colors,ylim=c(0,1),xlab=${q(L.step)},ylab=${q(L.probability)},main=${q(L.occupation)})
for (s in seq_len(states)) abline(h=stationary[s],col=colors[s],lty=2)
legend("topright",legend=state_names,col=colors,lty=1,bty="n")
barplot(rbind(empirical,stationary),beside=TRUE,names.arg=state_names,col=c("#818cf8","#fbbf24"),ylim=c(0,1),ylab=${q(L.probability)},main=${q(L.comparison)})
legend("topright",legend=c(${q(L.observed)},${q(L.stationary)}),fill=c("#818cf8","#fbbf24"),bty="n")${rEndPanels}`,
            python: `${pyPanels}
history_array = np.asarray(history)
for s in range(states):
    occupation = np.cumsum(history_array == s)/np.arange(1,steps+2)
    color = plt.get_cmap("tab10")(s%10)
    axes[0].plot(np.arange(steps+1),occupation,color=color,label=state_names[s])
    axes[0].axhline(stationary[s],color=color,linestyle="--",alpha=.6)
axes[0].set(title=${q(L.occupation)},xlabel=${q(L.step)},ylabel=${q(L.probability)},ylim=(0,1))
axes[0].legend()
positions = np.arange(states)
axes[1].bar(positions-.2,empirical,width=.4,color="#818cf8",label=${q(L.observed)})
axes[1].bar(positions+.2,stationary,width=.4,color="#fbbf24",label=${q(L.stationary)})
axes[1].set_xticks(positions,state_names)
axes[1].set(title=${q(L.comparison)},ylabel=${q(L.probability)},ylim=(0,1))
axes[1].legend()`
        };
    }
    function poisson(kind) {
        if (kind === 'poissonPath') return {
            r: `top <- max(counts,rate*horizon,1)*1.1
plot(0,0,type="n",xlim=c(0,horizon),ylim=c(0,top),xlab=${q(L.time)},ylab="N(t)",main=${q(L.poissonPath)})
colors <- hcl.colors(repetitions,"Dark 3")
for (i in seq_along(runs)) {
    events <- runs[[i]]$events
    lines(c(0,events,horizon),c(0,seq_along(events),length(events)),type="s",col=colors[i])
}
abline(a=0,b=rate,lty=2,lwd=2)
legend("topleft",legend=${q(L.mean)},lty=2,bty="n")`,
            python: `fig, ax = plt.subplots(figsize=(9,5),layout="constrained")
for run in runs:
    events = run["events"]
    ax.step([0,*events,horizon],[0,*range(1,len(events)+1),len(events)],where="post",alpha=.8)
ax.plot([0,horizon],[0,rate*horizon],"--",color="black",label=${q(L.mean)})
ax.set(title=${q(L.poissonPath)},xlabel=${q(L.time)},ylabel="N(t)",xlim=(0,horizon))
ax.legend()`
        };
        if (kind === 'poissonCounts') return {
            r: `k <- 0:(max(counts)+1)
frequencies <- tabulate(counts+1,nbins=length(k))
expected_counts <- repetitions*dpois(k,rate*horizon)
hist(counts,breaks=seq(-.5,max(counts)+1.5,by=1),right=FALSE,col="#a5b4fc",border="white",ylim=c(0,max(frequencies,expected_counts)*1.1),main=${q(L.poissonCounts)},xlab=${q(L.count)},ylab=${q(L.frequency)})
lines(k,expected_counts,type="b",col="#dc2626",lwd=2)
legend("topright",legend=${q(L.theoretical)},col="#dc2626",lty=1,pch=1,bty="n")`,
            python: `fig, ax = plt.subplots(figsize=(9,5),layout="constrained")
k = np.arange(int(np.max(counts))+2)
frequencies = np.bincount(counts,minlength=len(k))
ax.bar(k,frequencies,color="#a5b4fc",label=${q(L.observed)})
ax.plot(k,repetitions*stats.poisson.pmf(k,mu=rate*horizon),"o-",color="#dc2626",label=${q(L.theoretical)})
ax.set(title=${q(L.poissonCounts)},xlabel=${q(L.count)},ylabel=${q(L.frequency)})
ax.legend()`
        };
        // The web truncates the displayed range, but the density denominator includes all gaps.
        return {
            r: `gap_breaks <- seq(0,4/rate,length.out=31)
gap_hist <- hist(gaps[gaps < 4/rate],breaks=gap_breaks,right=FALSE,include.lowest=TRUE,plot=FALSE)
gap_hist$density <- gap_hist$counts/(length(gaps)*diff(gap_breaks))
plot(gap_hist,freq=FALSE,col="#a5b4fc",border="white",ylim=c(0,max(gap_hist$density,rate)*1.1),main=${q(L.poissonGaps)},xlab=${q(L.wait)},ylab=${q(L.density)})
x <- seq(0,4/rate,length.out=400)
lines(x,dexp(x,rate=rate),col="#dc2626",lwd=2)
legend("topright",legend=${q(L.theoretical)},col="#dc2626",lty=1,bty="n")`,
            python: `fig, ax = plt.subplots(figsize=(9,5),layout="constrained")
gap_counts, gap_edges = np.histogram(gaps[gaps < 4/rate],bins=np.linspace(0,4/rate,31))
centers = (gap_edges[:-1]+gap_edges[1:])/2
gap_density = gap_counts/(len(gaps)*np.diff(gap_edges))
ax.bar(centers,gap_density,width=np.diff(gap_edges),color="#a5b4fc",edgecolor="white")
x = np.linspace(0,4/rate,400)
ax.plot(x,stats.expon.pdf(x,scale=1/rate),color="#dc2626",label=${q(L.theoretical)})
ax.set(title=${q(L.poissonGaps)},xlabel=${q(L.wait)},ylabel=${q(L.density)},xlim=(0,4/rate))
ax.legend()`
        };
    }
    function intervals() {
        return {
            r: `old_par <- par(mar=c(7,4,3,1))
rows <- seq_len(repetitions)
covers <- intervals[,1] <= truth & truth <= intervals[,2]
colors <- ifelse(covers,"#16a34a","#dc2626")
plot(0,0,type="n",xlim=range(intervals[,1:2],truth),ylim=c(repetitions+.5,.5),main=paste(${q(L.intervals)},method,paste0(100*confidence,"%")),xlab=${q(L.value)},ylab=${q(L.interval)})
segments(intervals[,1],rows,intervals[,2],rows,col=colors,lwd=2)
points(intervals[,3],rows,col=colors,pch=16,cex=.6)
abline(v=truth,lty=2,lwd=2)
legend("bottom",inset=c(0,-.30),horiz=TRUE,xpd=NA,cex=.8,legend=c(${q(L.covered)},${q(L.missed)},${q(L.truth)}),col=c("#16a34a","#dc2626","black"),lty=c(1,1,2),bty="n")
par(old_par)`,
            python: `fig, ax = plt.subplots(figsize=(10,max(5,min(12,repetitions*.06))),layout="constrained")
rows = np.arange(1,repetitions+1)
covers = (intervals[:,0] <= truth) & (truth <= intervals[:,1])
colors = np.where(covers,"#16a34a","#dc2626")
ax.hlines(rows,intervals[:,0],intervals[:,1],colors=colors,linewidth=2)
ax.scatter(intervals[:,2],rows,c=colors,s=12)
ax.axvline(truth,color="black",linestyle="--",label=${q(L.truth)})
ax.plot([],[],color="#16a34a",label=${q(L.covered)})
ax.plot([],[],color="#dc2626",label=${q(L.missed)})
ax.set(title=f"${L.intervals} ({method}, {100*confidence:g}%)",xlabel=${q(L.value)},ylabel=${q(L.interval)},ylim=(repetitions+.5,.5))
ax.legend(loc="upper left",bbox_to_anchor=(1.01,1))`
        };
    }
    function errors() {
        return {
            r: `x <- seq(min(-4,delta-4,-critical-1),max(4,delta+4,critical+1),length.out=800)
plot(x,dnorm(x),type="n",ylim=c(0,.43),main=${q(L.errors)},xlab="Z",ylab=${q(L.density)})
shade <- function(lo,hi,mu,color) {
    xx <- seq(lo,hi,length.out=400)
    polygon(c(lo,xx,hi),c(0,dnorm(xx,mu),0),col=adjustcolor(color,alpha.f=.35),border=NA)
}
shade(critical,max(x),0,"#dc2626")
if (alternative != "right") shade(min(x),-critical,0,"#dc2626")
shade(if (alternative == "right") min(x) else -critical,critical,delta,"#f59e0b")
lines(x,dnorm(x),col="#4f46e5",lwd=2)
lines(x,dnorm(x,delta),col="#ea580c",lwd=2)
abline(v=if (alternative == "right") critical else c(-critical,critical),lty=2)
legend("topright",legend=c(${q(L.null)},${q(L.alternative)},paste0("alpha = ",signif(alpha,3)),paste0("beta = ",signif(beta,3))),col=c("#4f46e5","#ea580c","#dc2626","#f59e0b"),lty=1,lwd=2,bty="n")`,
            python: `fig, ax = plt.subplots(figsize=(9,5),layout="constrained")
x = np.linspace(min(-4,delta-4,-critical-1),max(4,delta+4,critical+1),800)
h0, h1 = stats.norm.pdf(x),stats.norm.pdf(x,loc=delta)
reject = x >= critical if alternative == "right" else np.abs(x) >= critical
ax.fill_between(x,0,h0,where=reject,color="#dc2626",alpha=.35,label=f"alpha = {alpha:.3g}")
ax.fill_between(x,0,h1,where=~reject,color="#f59e0b",alpha=.35,label=f"beta = {beta:.3g}")
ax.plot(x,h0,color="#4f46e5",label=${q(L.null)})
ax.plot(x,h1,color="#ea580c",label=${q(L.alternative)})
for bound in ([critical] if alternative == "right" else [-critical,critical]):
    ax.axvline(bound,color="#64748b",linestyle="--")
ax.set(title=${q(L.errors)},xlabel="Z",ylabel=${q(L.density)})
ax.legend()`
        };
    }
    window.ReproduceSimulationPlots = function(kind,o) {
        if (kind === 'clt' || kind === 'bootstrap') return histograms(kind,o);
        if (kind === 'walk1d' || kind === 'walk2d') return walks(kind);
        if (kind === 'markov') return markov();
        if (kind.startsWith('poisson')) return poisson(kind);
        if (kind === 'intervals') return intervals();
        return errors();
    };
}());
