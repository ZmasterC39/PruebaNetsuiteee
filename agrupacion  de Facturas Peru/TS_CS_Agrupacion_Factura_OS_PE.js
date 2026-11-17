/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/currentRecord", "N/url", "N/ui/dialog"], function (currentRecord, url, dialog) {
    const SEARCH_SCRIPT_ID = "customscript__ts_sl_agrup_factura_os_pe";
    const SEARCH_DEPLOYMENT_ID = "customdeploy_ts_sl_agrup_factura_os_pe";
    const CSV_INPUT_SELECTOR = "input[type='file'][id*='custpage_csv_fin'], input[type='file'][name='custpage_csv_fin'], input[type='file']";
    const REQUIRED_SEARCH_FIELDS = ["fechaInicio", "fechaFin", "currency", "tipo_doc"];
    const REQUIRED_SUBMIT_FIELDS = ["fecha_inicio", "fecha_fin", "termino_pago", "ubicacion", "glosa"];
    const AR_ACCOUNT_BY_CURRENCY = {
        "1": "4897",
        "5": "4896"
    };

    const pageState = {
        currentRecord: null,
        bindAttempts: 0
    };

    const NON_REDIRECT_FIELDS = new Set([
        "termino_pago",
        "glosa",
        "referencia",
        "nota_factura",
        "igv",
        "totalbody",
        "importe_total",
        "total_registros",
        "total_seleccionados",
        "forma_pago",
        "tipo_operacion",
        "concept_detraction",
        "gratutita",
        "account",
        "serie",
        "ubicacion",
        "custpage_csv_fin"
    ]);

    const HEADER_CANDIDATES = {
        "id interno": true,
        "idinterna": true,
        "idinterno": true,
        "id interno factura": true,
        "id factura interna": true,
        "internal id": true,
        "internalid": true,
        "invoice internal id": true,
        "internal invoice id": true
    };

    function pageInit(scriptContext) {
        try {
            pageState.currentRecord = scriptContext.currentRecord;
            syncFormaPago(scriptContext.currentRecord);
            updateTotals(scriptContext.currentRecord);

            bindCsvInput();
            hookMarkAll();
        } catch (e) {
            console.log("Error pageInit", e.message);
        }
    }

    function bindCsvInput() {
        try {
            const fileInput = document.querySelector(CSV_INPUT_SELECTOR);

            if (!fileInput) {
                if (pageState.bindAttempts < 10) {
                    pageState.bindAttempts++;
                    window.setTimeout(bindCsvInput, 400);
                }
                return;
            }

            if (fileInput.dataset.tsCsvBound === "T") {
                return;
            }

            fileInput.dataset.tsCsvBound = "T";
            fileInput.addEventListener("change", handleCsvSelected);
        } catch (e) {
            console.log("Error bindCsvInput", e.message);
        }
    }

    function hookMarkAll() {
        try {
            const form = document.querySelector("form");
            if (!form) return;
            if (form.dataset.tsMarkAllHooked === "T") return;

            form.dataset.tsMarkAllHooked = "T";

            form.addEventListener("click", function (ev) {
                const target = ev.target;
                if (!target) return;

                const txt = String(target.innerText || "").toLowerCase();
                const id = String(target.id || "").toLowerCase();

                if (
                    txt.indexOf("mark all") !== -1 ||
                    txt.indexOf("unmark all") !== -1 ||
                    id.indexOf("markall") !== -1
                ) {
                    scheduleTotalsRefresh();
                }
            }, true);
        } catch (e) {
            console.log("Error hookMarkAll", e.message);
        }
    }

    function handleCsvSelected(event) {
        try {
            const fileInput = event.target;
            const selectedFile = fileInput && fileInput.files ? fileInput.files[0] : null;

            if (!selectedFile) return;

            const rec = getActiveRecord();
            const lineCount = rec.getLineCount({ sublistId: "sublista" }) || 0;

            if (!lineCount) {
                showAlert(
                    "Sin resultados",
                    "Primero realiza la búsqueda para cargar la sublista de facturas internas."
                );
                clearFileInput(fileInput);
                return;
            }

            const mimeType = String(selectedFile.type || "").toLowerCase();
            const isCsv =
                /\.csv$/i.test(String(selectedFile.name || "")) ||
                mimeType.indexOf("csv") !== -1 ||
                mimeType.indexOf("excel") !== -1;

            if (!isCsv) {
                showAlert("Archivo no válido", "Debes seleccionar un archivo CSV.");
                clearFileInput(fileInput);
                return;
            }

            const reader = new FileReader();

            reader.onload = function (loadEvent) {
                try {
                    const csvText = loadEvent && loadEvent.target ? loadEvent.target.result : "";
                    const ids = extractInternalIdsFromCsv(csvText);

                    if (!ids.length) {
                        showAlert(
                            "CSV sin IDs válidos",
                            "No se encontraron IDs internos válidos en el archivo. Usa una columna 'Id interno' o deja los IDs en la primera columna."
                        );
                        clearFileInput(fileInput);
                        return;
                    }

                    const result = applyCsvSelection(ids);

                    let message = `IDs leídos: ${result.requestedIds}\n`;
                    message += `Facturas encontradas: ${result.matchedIds}\n`;
                    message += `Líneas marcadas: ${result.markedLines}`;

                    if (result.missingIds.length) {
                        message += `\n\nIDs no encontrados (${result.missingIds.length}):\n${result.missingIds.slice(0, 20).join(", ")}`;
                        if (result.missingIds.length > 20) {
                            message += "\n...";
                        }
                    }

                    showAlert("Selección por CSV completada", message);
                } catch (error) {
                    console.log("Error reader.onload", error.message);
                    showAlert("Error al procesar CSV", error.message || "No se pudo procesar el archivo.");
                } finally {
                    clearFileInput(fileInput);
                }
            };

            reader.onerror = function () {
                showAlert("Error de lectura", "No se pudo leer el archivo CSV.");
                clearFileInput(fileInput);
            };

            reader.readAsText(selectedFile, "UTF-8");
        } catch (e) {
            console.log("Error handleCsvSelected", e.message);
            showAlert("Error", e.message || "Ocurrió un problema al procesar el CSV.");
        }
    }

    function syncFormaPago(rec) {
        try {
            const terminoPago = String(rec.getValue({ fieldId: "termino_pago" }) || "");
            const formaPagoActual = String(rec.getValue({ fieldId: "forma_pago" }) || "");

            if (!terminoPago) return;

            const nuevaFormaPago = terminoPago === "4" ? "1" : "2";

            if (formaPagoActual !== nuevaFormaPago) {
                rec.setValue({
                    fieldId: "forma_pago",
                    value: nuevaFormaPago,
                    ignoreFieldChange: true
                });
            }
        } catch (e) {
            console.log("Error syncFormaPago", e.message);
        }
    }

    function fieldChanged(scriptContext) {
        try {
            const rec = scriptContext.currentRecord;
            const fieldId = scriptContext.fieldId;

            if (scriptContext.sublistId === "sublista" && fieldId === "check") {
                updateTotals(rec);
                return;
            }

            if (fieldId === "currency") {
                syncDefaultArAccount(rec);
            }

            if (fieldId === "termino_pago") {
                syncFormaPago(rec);
            }

            if (NON_REDIRECT_FIELDS.has(fieldId)) {
                return;
            }

            const params = buildSearchParams(rec);

            if (!hasRequiredSearchParams(params)) {
                return;
            }
            redirectToSearch(params);
        } catch (e) {
            console.log("Error fieldChanged", e.message);
        }
    }

    function syncDefaultArAccount(rec) {
        try {
            const currency = String(rec.getValue({ fieldId: "currency" }) || "");
            const currentAccount = String(rec.getValue({ fieldId: "account" }) || "");

            const isAutoAccount = currentAccount === "" || isManagedArAccount(currentAccount);
            const newAccount = getDefaultArAccount(currency);

            if (newAccount && isAutoAccount && currentAccount !== newAccount) {
                rec.setValue({
                    fieldId: "account",
                    value: newAccount,
                    ignoreFieldChange: true
                });
            }
        } catch (e) {
            console.log("Error syncDefaultArAccount", e.message);
        }
    }

    function buildSearchParams(rec) {
        const fechaInicio = rec.getValue({ fieldId: "fecha_inicio" });
        const fechaFin = rec.getValue({ fieldId: "fecha_fin" });

        return {
            flag: "searchFacturaFin",
            cliente: rec.getValue({ fieldId: "cliente" }) || "",
            fechaInicio: fechaInicio ? new Date(fechaInicio) : "",
            tipoOS: "1",
            fechaFin: fechaFin ? new Date(fechaFin) : "",
            currency: rec.getValue({ fieldId: "currency" }) || "",
            account: rec.getValue({ fieldId: "account" }) || "",
            agrupador: rec.getValue({ fieldId: "agrupador" }) || "",
            glosa: rec.getValue({ fieldId: "glosa" }) || "",
            serie: rec.getValue({ fieldId: "serie" }) || "",
            referencia: rec.getValue({ fieldId: "referencia" }) || "",
            nota_factura: rec.getValue({ fieldId: "nota_factura" }) || "",
            importe_total: rec.getValue({ fieldId: "importe_total" }) || "",
            termino_pago: rec.getValue({ fieldId: "termino_pago" }) || "",
            ubicacion: rec.getValue({ fieldId: "ubicacion" }) || "",
            articulo: rec.getValue({ fieldId: "articulo" }) || "",
            facturara: rec.getValue({ fieldId: "facturara" }) || "",
            tipo_doc: rec.getValue({ fieldId: "tipo_doc" }) || "",
            forma_pago: rec.getValue({ fieldId: "forma_pago" }) || "",
            tipo_operacion: rec.getValue({ fieldId: "tipo_operacion" }) || "",
            concept_detraction: rec.getValue({ fieldId: "concept_detraction" }) || "",
            gratutita: rec.getValue({ fieldId: "gratutita" }) || ""
        };
    }

    function calcularImporte() {
        try {
            updateTotals(getActiveRecord());
        } catch (error) {
            console.log("Error calcularImporte", error.message);
        }
    }

    function scheduleTotalsRefresh() {
        window.setTimeout(function () {
            updateTotals(getActiveRecord());
        }, 300);

        window.setTimeout(function () {
            updateTotals(getActiveRecord());
        }, 900);
    }

    function hasRequiredSearchParams(params) {
        return REQUIRED_SEARCH_FIELDS.every(function (fieldId) {
            return !!params[fieldId];
        });
    }

    function redirectToSearch(params) {
        const route = url.resolveScript({
            scriptId: SEARCH_SCRIPT_ID,
            deploymentId: SEARCH_DEPLOYMENT_ID,
            params: { custscript_ts_context: JSON.stringify(params) },
            returnExternalUrl: false
        });

        window.onbeforeunload = null;

        try {
            if (typeof setWindowChanged === "function") {
                setWindowChanged(window, false);
            }
        } catch (e) {
            console.log("Error setWindowChanged", e.message);
        }

        window.location.href = route;
    }

    function updateTotals(rec) {
        try {
            const lineCount = rec.getLineCount({ sublistId: "sublista" }) || 0;

            let totalBase = 0;
            let totalIgv = 0;
            let totalGeneral = 0;
            let selectedCount = 0;

            for (let i = 0; i < lineCount; i++) {
                const isSelected = asBoolean(
                    rec.getSublistValue({
                        sublistId: "sublista",
                        fieldId: "check",
                        line: i
                    })
                );

                if (!isSelected) continue;
                selectedCount++;

                totalBase += parseNumber(
                    rec.getSublistValue({
                        sublistId: "sublista",
                        fieldId: "monto",
                        line: i
                    })
                );

                totalIgv += parseNumber(
                    rec.getSublistValue({
                        sublistId: "sublista",
                        fieldId: "impuestos",
                        line: i
                    })
                );

                totalGeneral += parseNumber(
                    rec.getSublistValue({
                        sublistId: "sublista",
                        fieldId: "totalline",
                        line: i
                    })
                );
            }

            rec.setValue({
                fieldId: "importe_total",
                value: round2(totalBase),
                ignoreFieldChange: true
            });
            rec.setValue({
                fieldId: "igv",
                value: round2(totalIgv),
                ignoreFieldChange: true
            });
            rec.setValue({
                fieldId: "totalbody",
                value: round2(totalGeneral),
                ignoreFieldChange: true
            });
            rec.setValue({
                fieldId: "total_registros",
                value: lineCount,
                ignoreFieldChange: true
            });
            rec.setValue({
                fieldId: "total_seleccionados",
                value: selectedCount,
                ignoreFieldChange: true
            });
        } catch (e) {
            console.log("Error updateTotals", e.message);
        }
    }

    function hasSelectedLines(rec) {
        const lineCount = rec.getLineCount({ sublistId: "sublista" }) || 0;

        for (let i = 0; i < lineCount; i++) {
            const isSelected = asBoolean(
                rec.getSublistValue({
                    sublistId: "sublista",
                    fieldId: "check",
                    line: i
                })
            );

            if (isSelected) {
                return true;
            }
        }

        return false;
    }

    function hasRequiredRecordValues(rec, fieldIds) {
        return (fieldIds || []).every(function (fieldId) {
            return !!rec.getValue({ fieldId: fieldId });
        });
    }

    function extractInternalIdsFromCsv(text) {
        const delimiter = detectDelimiter(text);
        const rows = parseCsvText(text, delimiter).filter(function (row) {
            return row.some(function (cell) {
                return String(cell || "").trim() !== "";
            });
        });

        if (!rows.length) {
            return [];
        }

        const firstRow = rows[0].map(normalizeText);
        let idIndex = firstRow.findIndex(function (header) {
            return !!HEADER_CANDIDATES[header];
        });

        let startRow = 1;

        if (idIndex === -1) {
            idIndex = 0;
            startRow = 0;
        }

        const ids = [];

        for (let i = startRow; i < rows.length; i++) {
            const rawValue = rows[i][idIndex] != null ? rows[i][idIndex] : "";
            const normalizedValue = sanitizeId(rawValue);

            if (!normalizedValue) continue;
            if (!/^\d+$/.test(normalizedValue)) continue;

            ids.push(normalizedValue);
        }

        return uniqueArray(ids);
    }

    function applyCsvSelection(ids) {
        const rec = getActiveRecord();
        const idSet = new Set(
            uniqueArray((ids || []).map(function (id) {
                return sanitizeId(id);
            }).filter(Boolean))
        );

        const lineCount = rec.getLineCount({ sublistId: "sublista" }) || 0;
        const matchedIds = new Set();
        let markedLines = 0;

        for (let i = 0; i < lineCount; i++) {
            const lineId = sanitizeId(
                rec.getSublistValue({
                    sublistId: "sublista",
                    fieldId: "id",
                    line: i
                })
            );

            if (!lineId) continue;

            const shouldCheck = idSet.has(lineId);
            const currentValue = asBoolean(
                rec.getSublistValue({
                    sublistId: "sublista",
                    fieldId: "check",
                    line: i
                })
            );

            if (currentValue !== shouldCheck) {
                rec.selectLine({
                    sublistId: "sublista",
                    line: i
                });

                rec.setCurrentSublistValue({
                    sublistId: "sublista",
                    fieldId: "check",
                    value: shouldCheck,
                    ignoreFieldChange: true
                });

                rec.commitLine({
                    sublistId: "sublista"
                });
            }

            if (shouldCheck) {
                matchedIds.add(lineId);
                markedLines++;
            }
        }

        updateTotals(rec);

        return {
            requestedIds: idSet.size,
            matchedIds: matchedIds.size,
            markedLines: markedLines,
            missingIds: Array.from(idSet).filter(function (id) {
                return !matchedIds.has(id);
            })
        };
    }

    function detectDelimiter(text) {
        const firstNonEmptyLine = String(text || "")
            .replace(/^\uFEFF/, "")
            .split(/\r\n|\n|\r/)
            .find(function (line) {
                return String(line || "").trim() !== "";
            }) || "";

        let commas = 0;
        let semicolons = 0;
        let inQuotes = false;

        for (let i = 0; i < firstNonEmptyLine.length; i++) {
            const char = firstNonEmptyLine[i];
            const next = firstNonEmptyLine[i + 1];

            if (char === '"') {
                if (inQuotes && next === '"') {
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (!inQuotes) {
                if (char === ",") commas++;
                if (char === ";") semicolons++;
            }
        }

        return semicolons > commas ? ";" : ",";
    }

    function parseCsvText(text, delimiter) {
        const rows = [];
        const content = String(text || "").replace(/^\uFEFF/, "");

        let row = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const next = content[i + 1];

            if (char === '"') {
                if (inQuotes && next === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                row.push(current);
                current = "";
            } else if ((char === "\n" || char === "\r") && !inQuotes) {
                if (char === "\r" && next === "\n") {
                    i++;
                }

                row.push(current);

                if (row.some(function (cell) { return String(cell || "").trim() !== ""; })) {
                    rows.push(row);
                }

                row = [];
                current = "";
            } else {
                current += char;
            }
        }

        row.push(current);

        if (row.some(function (cell) { return String(cell || "").trim() !== ""; })) {
            rows.push(row);
        }

        return rows;
    }

    function saveRecord(scriptContext) {
        try {
            const rec = scriptContext.currentRecord;
            if (!hasSelectedLines(rec)) {
                alert("Debe seleccionar al menos un registro.");
                return false;
            }

            if (hasRequiredRecordValues(rec, REQUIRED_SUBMIT_FIELDS)) {
                return true;
            }

            alert("Debe llenar los campos obligatorios.");
            return false;
        } catch (error) {
            console.log("Error saveRecord", error.message);
            return false;
        }
    }

    function getActiveRecord() {
        try {
            return currentRecord.get();
        } catch (e) {
            return pageState.currentRecord;
        }
    }

    function showAlert(title, message) {
        try {
            dialog.alert({
                title: title,
                message: message
            });
        } catch (e) {
            alert(message);
        }
    }

    function clearFileInput(fileInput) {
        try {
            if (fileInput) {
                fileInput.value = "";
            }
        } catch (e) {
            console.log("Error clearFileInput", e.message);
        }
    }

    function getDefaultArAccount(currencyId) {
        return AR_ACCOUNT_BY_CURRENCY[String(currencyId || "")] || "";
    }

    function isManagedArAccount(accountId) {
        return Object.keys(AR_ACCOUNT_BY_CURRENCY).some(function (currencyId) {
            return AR_ACCOUNT_BY_CURRENCY[currencyId] === String(accountId || "");
        });
    }

    function sanitizeId(value) {
        return String(value == null ? "" : value)
            .replace(/^["']|["']$/g, "")
            .trim();
    }

    function normalizeText(value) {
        return String(value == null ? "" : value)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/_/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function parseNumber(value) {
        const normalized = String(value == null ? "" : value).replace(/,/g, "");
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    }

    function round2(value) {
        return Number(parseNumber(value).toFixed(2));
    }

    function asBoolean(value) {
        return value === true || value === "T";
    }

    function uniqueArray(list) {
        return Array.from(new Set(list || []));
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        calcularImporte: calcularImporte,
        saveRecord: saveRecord
    };
});
