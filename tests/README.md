# Pruebas de regresión de entradas

Las pruebas abren las calculadoras en Chromium y comprueban los dominios de
entrada, los mensajes de error, la retirada del gráfico anterior y la recuperación
con valores válidos, en español e inglés. Incluyen referencias numéricas conocidas
y los extremos válidos de Bernoulli y Clopper–Pearson.

Las regresiones numéricas también cubren la invariancia de Shapiro–Wilk al cambiar
escala y origen, cuantiles en colas largas, tablas de Fisher con ceros y p-valores
pequeños, dirección de diseños unilaterales y colas normales y t estables. Las
referencias independientes se guardan en `statistical_references.json`, calculadas
con SciPy 1.17.0; las pruebas numéricas comparan contra esos valores guardados.

Requisitos de desarrollo: Python 3, Playwright para Python, Chromium, Matplotlib y
Pillow para verificar los gráficos exportados. La web sigue
sin necesitar instalación de paquetes para funcionar.

```sh
python3 -m pip install playwright==1.62.0
python3 -m pip install scipy==1.17.0
python3 -m pip install matplotlib pillow
python3 -m playwright install chromium
python3 -m unittest discover -s tests -v
```

Las pruebas arrancan y cierran su propio servidor HTTP en un puerto libre. Para
cargar jStat y Chart.js necesitan acceso HTTPS a `cdn.jsdelivr.net`; mantienen la
verificación TLS y la integridad de los scripts de la aplicación.

Se utiliza el Chromium del sistema si está disponible. `CHROMIUM_PATH` permite
elegir otro ejecutable. En entornos con proxy se respeta `HTTPS_PROXY` (o
`https_proxy`); su CA debe estar en el almacén de confianza de Chromium. Si ese
almacén está en un perfil aislado, se puede indicar su directorio raíz con
`PROBLAB_BROWSER_HOME`. En el entorno de Codex preparado para este repositorio:

```sh
PROBLAB_BROWSER_HOME=/workspace/.cloud-browser python3 -m unittest discover -s tests -v
```

«Reproducir el cálculo» se comprueba en las 16 distribuciones y las 19 herramientas
del catálogo de contrastes, tanto en español como en inglés. Las pruebas leen el
código de las pestañas visibles, lo ejecutan con Python/SciPy y R base y comparan
el resultado con el cálculo sin redondear del navegador. Incluyen densidad/masa,
colas e intervalos con límites no enteros, cuantiles y parámetros distintos de
los predeterminados; además de alternativas unilaterales, Welch, Fisher z,
McNemar, Yates, TOST, distribuciones de referencia de KS y los modos de potencia
y tamaño muestral. También se comprueban las pestañas por teclado, la copia,
el aviso de datos modificados (incluidas casillas), los errores y la vista móvil.

Los fragmentos reproducen el resultado principal: probabilidad/cuantil en las
distribuciones; estadístico, valor p y decisión en los contrastes; potencia o n en
las páginas de diseño. Mantienen el método de la calculadora: KS asintótico con
parámetros especificados, contraste z de proporciones sin corrección, o corrección
de continuidad cuando está seleccionada. La geométrica desplaza en uno el soporte
de R; Fisher muestra el OR muestral ad/bc, distinto de la estimación condicional
de `fisher.test()`. Shapiro–Wilk reproduce la simulación Monte Carlo con B,
semilla y generadores normales nativos: no sustituye el valor p por el
analítico de `shapiro.test()`. Las notas junto al código explican estas diferencias.

Para elegir un ejecutable distinto de `Rscript`, usa `PROBLAB_RSCRIPT`. Sin R,
las comprobaciones de ejecución de R se marcan como omitidas y las de Python
siguen ejecutándose. Con ambos intérpretes disponibles:

```sh
PROBLAB_RSCRIPT=/ruta/a/Rscript python3 -m unittest discover -s tests -v
```

Las siete páginas de simulaciones también generan código R/Python. Sus pruebas
ejecutan 104 casos en ambos lenguajes, con las variantes de cada simulador y los
extremos válidos de la semilla. Verifican propiedades estadísticas, parámetros,
identidades deterministas, trayectorias, límites y cobertura, y renderizan los
gráficos en R y Python. Los resultados aleatorios no se comparan por igualdad
entre entornos; el aviso de la interfaz explica que pueden variar.

La web usa Mersenne–Twister MT19937 de `mersenne-twister@1.1.0`, servido localmente
con su licencia y procedencia en `vendor/`. Las normales de la web se obtienen
mediante Box–Muller. El motor se verifica con vectores de referencia independientes
de NumPy y momentos de las distribuciones utilizadas.

La semilla opcional admite enteros entre 0 y 4294967295, incluido cero; en blanco
se elige una nueva semilla. R utiliza `set.seed()` y sus funciones nativas; para
admitir todo el rango de entrada, la semilla se reduce módulo
`.Machine$integer.max`. Python utiliza `numpy.random.default_rng()` (PCG64) y sus
métodos de muestreo. No se exportan implementaciones propias de generadores.
La repetición está garantizada dentro de cada entorno con la misma configuración;
igualar la semilla entre la web, R y Python no implica igualar la secuencia.
Las semillas anteriores al cambio de LCG a MT19937 generan otras muestras.

En bootstrap se conserva la muestra observada completa al exportar, junto con la
semilla de la ejecución. Cada lenguaje genera sus propios remuestreos de esa
misma muestra. «Regenerar bootstrap» conserva su tamaño y distribución de origen.
Los límites percentiles mantienen los índices de orden de la web, sin interpolación.
En Markov se incluye el estado inicial al contar ocupaciones y se conserva la
iteración estacionaria desde la distribución uniforme, con su tolerancia y límite.
El simulador de errores I/II es analítico y no utiliza semilla.

Los fragmentos de simulaciones incluyen los gráficos de los datos que acaban de
calcular: histogramas y referencias teóricas, límites bootstrap, trayectorias,
ocupación de Markov, intervalos coloreados por cobertura y regiones de errores
I/II. Respetan las opciones de bandas, media teórica y círculo del paseo aleatorio,
así como los nombres de los estados de Markov. R usa sus gráficos de base; en
RStudio aparecen en el panel de gráficos y `Rscript` los guarda por defecto en
`Rplots.pdf`. Python necesita Matplotlib (`pip install scipy matplotlib`) y termina
con `plt.show()` para mostrarlos en una sesión interactiva o un cuaderno.

Las pruebas usan el backend Agg de Matplotlib y dispositivos PNG de R, comprueban
que cada fragmento genera una figura visible y contrastan sus series, barras,
límites y frecuencias con los resultados numéricos. También comprueban que la densidad truncada de las esperas
de Poisson mantiene como denominador todas las observaciones. Se incluyen muestras
bootstrap constantes y trayectorias sin eventos. Los PNG se crean en directorios
temporales; para conservarlos durante una revisión puede indicarse
`PROBLAB_PLOT_OUTPUT=/tmp/problab-plot-review` al ejecutar las pruebas.

Las 11 calculadoras del catálogo de intervalos de confianza disponen también de
código R/Python, en español e inglés. `test_reproduce_intervals.py` ejecuta 154
casos en ambos lenguajes y compara todos los límites con los valores sin redondear
de la web, incluidas las salidas secundarias y las comparaciones entre métodos.
Se usan R base y SciPy, sin generar datos ficticios a partir de estadísticos resumen.

La cobertura incluye t y z para medias, Welch y varianza agrupada, diferencias
apareadas con la definición indicada, corrección por población finita, Wald,
Wilson, Clopper–Pearson, Newcombe–Wilson, varianza y desviación típica, odds ratio
y riesgo relativo logarítmicos. Las correcciones de 0,5 respetan la opción elegida
y se aplican a las cuatro celdas. Wald conserva los recortes de la calculadora.
Los casos prueban confianza personalizada, cero y todo éxitos, y n = N.

También se comprueban el aviso de parámetros modificados, la retirada del código
ante entradas o confianza inválidas, la recuperación posterior, la copia y la
vista móvil. Los gráficos de estas calculadoras siguen funcionando en la web;
los fragmentos añadidos reproducen los resultados numéricos de los intervalos.
