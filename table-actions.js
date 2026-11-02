(function () {
    "use strict";

    const isEn = document.documentElement.lang === "en";
    const STR = isEn
        ? { fallbackTitle: "Statistical table", actionsLabel: "Table actions", csv: "Download CSV", print: "Print table" }
        : { fallbackTitle: "Tabla estadística", actionsLabel: "Acciones de tabla", csv: "Descargar CSV", print: "Imprimir tabla" };

    function slugify(value) {
        return (value || "tabla-estadistica")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "tabla-estadistica";
    }

    function getTableTitle(table) {
        const wrapper = table.closest(".dist-table-wrap");
        let current = wrapper ? wrapper.previousElementSibling : table.previousElementSibling;

        while (current) {
            if (current.classList && current.classList.contains("table-section-title")) {
                return current.textContent.trim();
            }

            current = current.previousElementSibling;
        }

        const heading = document.querySelector("h1");
        return heading ? heading.textContent.trim() : STR.fallbackTitle;
    }

    // Para el nombre del CSV: los símbolos que slugify eliminaría se pasan a
    // palabras, para que «P(X = k)» y «P(X ≤ k)» no den el mismo nombre.
    const SYMBOL_WORDS = isEn
        ? { "≤": "le", "≥": "ge", "=": "eq", "<": "lt", ">": "gt" }
        : { "≤": "menor o igual", "≥": "mayor o igual", "=": "igual", "<": "menor", ">": "mayor" };
    const GREEK_WORDS = { "λ": "lambda", "α": isEn ? "alpha" : "alfa", "β": "beta", "ν": "nu", "χ": "chi", "Φ": "phi", "Γ": "gamma", "μ": "mu", "σ": "sigma" };

    function symbolsToWords(text) {
        return (text || "")
            .replace(/[−-](?=\d)/g, isEn ? " minus " : " menos ")
            .replace(/[≤≥=<>]/g, c => ` ${SYMBOL_WORDS[c]} `)
            .replace(/[λαβνχΦΓμσ]/g, c => ` ${GREEK_WORDS[c]}`)
            .replace(/[₀-₉]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x2050))
            .replace(/²/g, "2")
            .replace(/⁻¹/g, " inv ");
    }


    // Separador decimal de la configuración regional del navegador, que suele
    // coincidir con la de Excel: con coma decimal, «0.9750» se importaría
    // como texto en lugar de como número.
    const DECIMAL = (() => {
        try {
            const part = new Intl.NumberFormat().formatToParts(1.5).find(p => p.type === "decimal");
            return part ? part.value : ".";
        } catch (e) {
            return ".";
        }
    })();

    // Separador de campos: el que usa Excel en esa configuración regional,
    // «;» donde la coma es el separador decimal y «,» en el resto. No se
    // escribe la línea «sep=;»: con ella Excel ignora la marca BOM y lee el
    // UTF-8 como ANSI («distribuciÃ³n», «Î¦» en lugar de «Φ»).
    const FIELD_SEP = DECIMAL === "," ? ";" : ",";

    function csvEscape(value) {
        const normalized = (value || "").replace(/\s+/g, " ").trim();
        const needsQuotes = normalized.includes('"') || normalized.includes(FIELD_SEP);
        return needsQuotes ? `"${normalized.replace(/"/g, '""')}"` : normalized;
    }

    // 6 decimales, o notación científica si el valor es menor que 0.001,
    // para no perder las colas (P(Z > 4) = 3.16712E-05 en lugar de 0.0000).
    function csvNumber(v) {
        const abs = Math.abs(v);
        const text = abs === 0 || abs >= 0.001 ? v.toFixed(6) : v.toExponential(5).toUpperCase();
        return text.replace(".", DECIMAL);
    }

    // Valor de una celda para el CSV. Si la página sabe calcular el valor
    // exacto (window.tableCellExact), se escribe con más precisión que la
    // tabla; si no, se usa el texto de la celda, con el separador decimal local
    // cuando es un número. «−0.0» se deja como texto para no perder el signo.
    function cellCsvValue(cell) {
        if (cell.dataset.val !== undefined && typeof window.tableCellExact === "function") {
            const v = window.tableCellExact(cell);
            if (typeof v === "number" && isFinite(v)) return csvNumber(v);
        }
        const text = cell.textContent.replace(/\s+/g, " ").trim();
        if (/^[-−]?\d+(\.\d+)?$/.test(text) && !/^[-−]0(\.0+)?$/.test(text)) {
            return text.replace("−", "-").replace(".", DECIMAL);
        }
        return text;
    }

    function escapeHtml(value) {
        return (value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function tableToCsv(table) {
        const rows = Array.from(table.querySelectorAll("tr"));
        return rows
            .map(row => Array.from(row.querySelectorAll("th, td"))
                .map(cell => csvEscape(cellCsvValue(cell)))
                .join(FIELD_SEP))
            .join("\n");
    }

    function downloadTableCsv(table) {
        const title = getTableTitle(table);
        const heading = document.querySelector("h1");
        const page = heading ? heading.textContent.trim() : STR.fallbackTitle;
        // Primera línea: qué tabla es, ya que el nombre del
        // archivo no siempre se ve al abrirlo
        const caption = title && title !== page ? `${page} — ${title}` : page;
        const csv = `${csvEscape(caption)}\n${tableToCsv(table)}`;
        const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        // Nombre a partir del h1 (el <title> lleva palabras de SEO, como
        // «acumulada», que no describen todas las tablas de la página)
        const name = title && title !== page ? `${page} ${symbolsToWords(title)}` : page;
        link.download = `${slugify(name || table.id)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function printTable(table) {
        const title = getTableTitle(table);
        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            window.print();
            return;
        }

        const tableHtml = table.outerHTML;
        const safeTitle = escapeHtml(title);
        const safeDocumentTitle = escapeHtml(document.title);
        printWindow.document.write(`<!doctype html>
<html lang="${document.documentElement.lang || "es"}">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>
    body { font-family: Inter, Arial, sans-serif; color: #0f172a; margin: 24px; }
    h1 { font-size: 1.25rem; margin: 0 0 16px; }
    .print-source { color: #64748b; font-size: 0.85rem; margin-bottom: 18px; }
    table { border-collapse: collapse; width: 100%; font-size: 0.74rem; font-variant-numeric: tabular-nums; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: center; }
    th { background: #e0e7ff; color: #1e3a8a; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    @page { margin: 12mm; }
</style>
</head>
<body>
<h1>${safeTitle}</h1>
<div class="print-source">${safeDocumentTitle}</div>
${tableHtml}
</body>
</html>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    function createButton(label, type, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `table-action-btn table-action-btn-${type}`;
        button.textContent = label;
        button.addEventListener("click", onClick);
        return button;
    }

    function ensureTableActions() {
        document.querySelectorAll(".dist-table").forEach(table => {
            const wrapper = table.closest(".dist-table-wrap");
            if (!wrapper || wrapper.dataset.tableActionsReady === "true") {
                return;
            }

            const actions = document.createElement("div");
            actions.className = "table-actions";
            actions.setAttribute("aria-label", STR.actionsLabel);
            actions.appendChild(createButton(STR.csv, "csv", () => downloadTableCsv(table)));
            actions.appendChild(createButton(STR.print, "print", () => printTable(table)));
            wrapper.parentNode.insertBefore(actions, wrapper.nextSibling);
            wrapper.dataset.tableActionsReady = "true";
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", ensureTableActions);
    } else {
        ensureTableActions();
    }

    window.ProbLabTableActions = { refresh: ensureTableActions };
}());
