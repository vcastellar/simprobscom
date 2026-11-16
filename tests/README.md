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

Requisitos de desarrollo: Python 3, Playwright para Python y Chromium. La web sigue
sin necesitar instalación de paquetes para funcionar.

```sh
python3 -m pip install playwright==1.62.0
python3 -m pip install scipy==1.17.0
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
semilla y generador LCG/Box–Muller explícitos: no sustituye el valor p por el
analítico de `shapiro.test()`. Las notas junto al código explican estas diferencias.

Para elegir un ejecutable distinto de `Rscript`, usa `PROBLAB_RSCRIPT`. Sin R,
las comprobaciones de ejecución de R se marcan como omitidas y las de Python
siguen ejecutándose. Con ambos intérpretes disponibles:

```sh
PROBLAB_RSCRIPT=/ruta/a/Rscript python3 -m unittest discover -s tests -v
```

Las siete páginas de simulaciones también generan código R/Python. Sus pruebas
ejecutan 100 casos en ambos lenguajes, con las variantes de cada simulador y los
extremos válidos de la semilla. Comparan los resultados sin redondear, incluidos
los vectores de frecuencias, los límites bootstrap y la cobertura de los
intervalos. Comprueban además las trayectorias, la inclusión de la última espera
completa en Poisson, los cambios de modo, los errores y la vista móvil.

Para repetir una simulación se puede fijar una semilla entre 0 y 4294967295.
Dejarla vacía genera una nueva semilla en cada ejecución; el fragmento conserva
la utilizada. JavaScript, R y Python utilizan el mismo LCG explícito y las mismas
transformaciones (Box–Muller para normales), en lugar de los generadores nativos
de cada lenguaje, cuyas semillas no producen secuencias equivalentes. Se mantiene
la distribución estadística de cada experimento, con posibles diferencias de
redondeo entre intérpretes.

En bootstrap se incorpora la muestra observada completa y el estado del generador
al comenzar el remuestreo. «Regenerar bootstrap» conserva también el tamaño y la
distribución de origen de esa muestra aunque cambien los selectores. Los límites
percentiles utilizan los índices de orden de la web, sin interpolación. En
Markov se incluye el estado inicial al contar ocupaciones y se reproduce la
iteración desde la distribución uniforme, con su tolerancia y límite; no se
sustituye por un método que presuponga una única distribución estacionaria. El
simulador de errores I/II calcula probabilidades analíticas y no utiliza semilla.
