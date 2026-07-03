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

    function csvEscape(value) {
        const normalized = (value || "").replace(/\s+/g, " ").trim();
        return /[",\n;]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
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
                .map(cell => csvEscape(cell.textContent))
                .join(";"))
            .join("\n");
    }

    function downloadTableCsv(table) {
        const title = getTableTitle(table);
        const csv = `sep=;\n${tableToCsv(table)}`;
        const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${slugify(document.title)}-${slugify(title || table.id)}.csv`;
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
