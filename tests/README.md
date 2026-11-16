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

El piloto «Reproducir el cálculo» añade pruebas que ejecutan los fragmentos de
Python generados (con SciPy) y, si R está disponible, los de R base. Para elegir
un ejecutable distinto de `Rscript`, usa `PROBLAB_RSCRIPT`. Sin R, sus dos pruebas
de ejecución se marcan como omitidas. También se comprueban las pestañas por
teclado, la copia, el aviso de datos modificados y la vista móvil.
