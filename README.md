# ProbLab

ProbLab es una herramienta web educativa para calcular, simular y visualizar conceptos estadísticos directamente en el navegador. Está pensada para estudiantes, docentes, analistas y cualquier persona que necesite resolver problemas de probabilidad e inferencia sin instalar software adicional.

---

## 🚀 Características

- Calculadoras de distribuciones de probabilidad continuas y discretas.
- Tablas estadísticas online para valores críticos, CDF y cuantiles.
- Calculadoras de tamaños muestrales para medias, proporciones y comparaciones.
- Intervalos de confianza y contrastes de hipótesis con explicación de supuestos.
- Herramientas de test A/B: z-test, enfoque bayesiano, potencia y simulación.
- Resultados visuales inmediatos y funcionamiento completamente en el navegador.

---

## 🌐 Acceso a la herramienta

Puedes usar la versión online aquí:

👉 **https://problabtools.com**

---

## 📦 Tecnologías utilizadas

- **HTML5**
- **CSS3**
- **JavaScript**
- Gráficos generados dinámicamente en el navegador

---

## 🤖 Asistente de estadística (RAG)

`asistente.html` (y `en/asistente.html`) es un chat que responde preguntas de estadística con el contenido de la propia web:

1. `rag/build_index.py` extrae el texto explicativo de cada página, lo trocea por secciones y genera `rag/index-es.json` y `rag/index-en.json`.
2. `api/rag.php` busca los fragmentos más relevantes (BM25) y pide a Claude (API de Anthropic) que responda solo con ellos, citando las páginas.
3. `rag-chat.js` muestra la conversación y enlaza las fuentes.

**Puesta en marcha en el hosting (una vez):**

1. Crea una clave de API en <https://platform.claude.com> y, si quieres, un límite de gasto mensual.
2. Copia `api/config.example.php` como `problab-config.php` **un nivel por encima de `public_html`** (fuera de la web pública) y pon la clave.
3. Instala el SDK en `public_html/api`: por SSH, `cd public_html/api && composer install --no-dev`. Si no tienes SSH, ejecuta ese comando en tu ordenador y sube la carpeta `api/vendor/` por FTP.
4. Comprueba que PHP es 8.1 o superior (hPanel → Avanzado → Configuración de PHP).

**En cada despliegue:** `python3 rag/build_index.py` (requiere `beautifulsoup4`) para que el asistente use el contenido actualizado.

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si deseas mejorar la herramienta, abrir issues o proponer nuevas calculadoras, distribuciones o ejemplos resueltos, no dudes en participar.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia MIT.
