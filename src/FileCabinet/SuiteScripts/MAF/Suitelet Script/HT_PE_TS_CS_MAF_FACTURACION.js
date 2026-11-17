/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/log", "N/url", "N/currentRecord", "N/ui/dialog"], function (log, url, currentRecord, dialog) {

  let pageContext;

  function pageInit(scriptContext) {
    pageContext = scriptContext;

    // enganchar el input file CSV cuando NetSuite lo renderice
    setTimeout(() => {
      try {
        const fileInput = document.querySelector("input[type='file']");
        if (fileInput) fileInput.addEventListener("change", handleFileSelect);
      } catch (e) {
        console.log("CSV hook error", e);
      }
    }, 800);

    // ✅ actualizar contadores al cargar
    setTimeout(() => {
      actualizarConteo();
      hookMarkAll();
    }, 600);
  }

  // ✅ Hook para Mark All / Unmark All (NetSuite no siempre dispara fieldChanged por cada línea)
  function hookMarkAll() {
    try {
      const form = document.querySelector("form");
      if (!form) return;

      // cuando el usuario cliquea algo, recalculamos un rato después
      form.addEventListener("click", (ev) => {
        const t = ev.target;
        if (!t) return;

        // detecta clicks típicos de mark all (no es 100% estándar en todos los skins)
        const txt = (t.innerText || "").toLowerCase();
        const id = (t.id || "").toLowerCase();

        if (txt.includes("mark all") || txt.includes("unmark all") || id.includes("markall")) {
          setTimeout(actualizarConteo, 350);
          setTimeout(actualizarConteo, 900);
        }
      }, true);
    } catch (e) {
      console.log("hookMarkAll error", e);
    }
  }

  function handleFileSelect(event) {
    const f = event.target.files && event.target.files[0];
    if (!f) return;

    const isCsv = (f.type === "text/csv") || (f.name && f.name.toLowerCase().endsWith(".csv"));
    if (!isCsv) {
      dialog.alert({ title: "Error", message: "Por favor, seleccione un archivo CSV válido." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const contenido = e.target.result || "";
        procesarCSV(contenido);
      } catch (err) {
        console.log(err);
        dialog.alert({ title: "Error", message: "No se pudo procesar el CSV." });
      }
    };
    reader.readAsText(f);
  }

  // CSV parser simple con comillas
  function parseCSV(text) {
    const rows = [];
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim() !== "");
    for (const line of lines) {
      const row = [];
      let cur = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuotes = !inQuotes;
        else if (ch === "," && !inQuotes) { row.push(cur); cur = ""; }
        else cur += ch;
      }
      row.push(cur);
      rows.push(row.map(c => (c || "").trim()));
    }
    return rows;
  }

  function procesarCSV(contenido) {
    const rec = currentRecord.get();
    const data = parseCSV(contenido);

    const lineCount = rec.getLineCount({ sublistId: "sublista" });

    for (let i = 0; i < lineCount; i++) {
      const soId = (rec.getSublistValue({ sublistId: "sublista", fieldId: "id", line: i }) || "").trim();
      const itemName = (rec.getSublistValue({ sublistId: "sublista", fieldId: "orden_itemsname", line: i }) || "").trim();
      if (!soId) continue;

      for (let j = 0; j < data.length; j++) {
        const csvSoId = (data[j][0] || "").trim();
        const csvItem = (data[j][6] || "").trim();

        if (csvSoId === soId && csvItem === itemName) {
          rec.selectLine({ sublistId: "sublista", line: i });
          rec.setCurrentSublistValue({ sublistId: "sublista", fieldId: "check", value: true });
          rec.commitLine({ sublistId: "sublista" });
          break;
        }
      }
    }

    calcularImporte();
    actualizarConteo(); // ✅
  }

  function fieldChanged(scriptContext) {
    try {
      const rec = scriptContext.currentRecord;
      const fieldId = scriptContext.fieldId;

      // ✅ Si marcaste check: recalcula y actualiza conteo, NO recargar
      if (scriptContext.sublistId === "sublista" && fieldId === "check") {
        calcularImporte();
        actualizarConteo();
        return;
      }

      // Campos base
      const cliente = rec.getValue({ fieldId: "cliente" });
      const fechaInicio = rec.getValue({ fieldId: "fecha_inicio" });
      const fechaFin = rec.getValue({ fieldId: "fecha_fin" });
      const currency = rec.getValue({ fieldId: "currency" });
      const account = rec.getValue({ fieldId: "account" });

      // PE/MAF
      const tipo_doc = rec.getValue({ fieldId: "tipo_doc" });
      const ubicacion = rec.getValue({ fieldId: "ubicacion" });
      const serie = rec.getValue({ fieldId: "serie" });
      const termino_pago = rec.getValue({ fieldId: "termino_pago" });
      const glosa = rec.getValue({ fieldId: "glosa" });
      const referencia = rec.getValue({ fieldId: "referencia" });
      const nota_factura = rec.getValue({ fieldId: "nota_factura" });

      const forma_pago = rec.getValue({ fieldId: "forma_pago" });
      const tipo_operacion = rec.getValue({ fieldId: "tipo_operacion" });
      const concept_detraction = rec.getValue({ fieldId: "concept_detraction" });
      const gratutita = rec.getValue({ fieldId: "gratutita" });

      // Campos que NO deben recargar
      const noReloadFields = new Set([
        "termino_pago", "glosa", "nota_factura",
        "importe_total", "igv", "totalbody",
        "forma_pago", "tipo_operacion", "concept_detraction", "gratutita",
        "serie"
      ]);
      if (noReloadFields.has(fieldId)) return;

      // Si cambia oficina o tipo_doc: recargamos para que Suitelet cargue Series
      const triggersSeriesReload = (fieldId === "ubicacion" || fieldId === "tipo_doc");
      const triggersSearchReload = (fieldId === "cliente" || fieldId === "fecha_inicio" || fieldId === "fecha_fin" || fieldId === "currency" || fieldId === "account");

      if (!triggersSeriesReload && !triggersSearchReload) return;

      // Series: necesitamos ambos
      if (triggersSeriesReload && (!ubicacion || !tipo_doc)) return;

      // Sublista: mínimos
      const canSearch = (fechaInicio && fechaFin && currency);

      const params = {
        flag: canSearch ? "searchFacturaFin" : "",
        cliente,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : "",
        fechaFin: fechaFin ? new Date(fechaFin) : "",
        currency,
        account,

        tipo_doc,
        ubicacion,
        serie,
        termino_pago,
        glosa,
        referencia,
        nota_factura,

        forma_pago,
        tipo_operacion,
        concept_detraction,
        gratutita,

        tipo_generado: "MAF"
      };

      const ruta = url.resolveScript({
        scriptId: "customscript_ht_pe_ts_sl_maf_facturacion",
        deploymentId: "customdeploy_ht_pe_ts_sl_maf_facturacion",
        params: { custscript_ts_context: JSON.stringify(params) },
        returnExternalUrl: false
      });

      window.onbeforeunload = null;
      try { setWindowChanged(window, false); } catch (e) {}
      window.location.href = ruta;

    } catch (e) {
      console.log("fieldChanged error", e);
    }
  }

function calcularImporte() {
  try {
    const ctx = pageContext;
    if (!ctx || !ctx.currentRecord) return;

    const rec = ctx.currentRecord;

    // Limpia símbolos y separadores antes de parsear
    const parseMoney = (v) => {
      if (v === null || v === undefined) return 0;
      let s = String(v).trim();

      // quita todo excepto dígitos, punto, coma y signo
      s = s.replace(/[^\d.,-]/g, "");

      // Si viene con miles tipo "1,234.56" -> quita comas
      // Si viene tipo "1.234,56" (EU) -> convierte a "1234.56"
      const hasComma = s.indexOf(",") !== -1;
      const hasDot = s.indexOf(".") !== -1;

      if (hasComma && hasDot) {
        // asume que la coma es miles si está antes del punto
        if (s.lastIndexOf(",") < s.lastIndexOf(".")) {
          s = s.replace(/,/g, "");
        } else {
          // asume formato 1.234,56
          s = s.replace(/\./g, "").replace(/,/g, ".");
        }
      } else if (hasComma && !hasDot) {
        // asume coma decimal
        s = s.replace(/,/g, ".");
      }

      const n = Number(s);
      return isNaN(n) ? 0 : n;
    };

    let total = 0, igv = 0, grand = 0;

    const count = rec.getLineCount({ sublistId: "sublista" });
    for (let i = 0; i < count; i++) {
      const isSelected = rec.getSublistValue({ sublistId: "sublista", fieldId: "check", line: i });
      if (!(isSelected === true || isSelected === "T")) continue;

      const monto = parseMoney(rec.getSublistValue({ sublistId: "sublista", fieldId: "monto", line: i }));
      const imp   = parseMoney(rec.getSublistValue({ sublistId: "sublista", fieldId: "impuestos", line: i }));
      const tot   = parseMoney(rec.getSublistValue({ sublistId: "sublista", fieldId: "totalline", line: i }));

      total += monto;
      igv += imp;
      grand += tot;
    }

    // Setea números (NetSuite formatea)
    rec.setValue({ fieldId: "importe_total", value: total });
    rec.setValue({ fieldId: "igv", value: igv });
    rec.setValue({ fieldId: "totalbody", value: grand });

  } catch (e) {
    console.log("calcularImporte error", e);
  }
}


  // ✅ Conteo Seleccionados / Total
  function actualizarConteo() {
    try {
      const rec = currentRecord.get();
      const total = rec.getLineCount({ sublistId: "sublista" }) || 0;

      let selected = 0;
      for (let i = 0; i < total; i++) {
        const v = rec.getSublistValue({ sublistId: "sublista", fieldId: "check", line: i });
        if (v === true || v === "T") selected++;
      }

      // setea campos si existen
      try { rec.setValue({ fieldId: "custpage_count_total", value: total }); } catch (e) {}
      try { rec.setValue({ fieldId: "custpage_count_selected", value: selected }); } catch (e) {}
    } catch (e) {
      console.log("actualizarConteo error", e);
    }
  }

  function saveRecord(scriptContext) {
    try {
      const rec = scriptContext.currentRecord;

      const count = rec.getLineCount({ sublistId: "sublista" });
      let any = false;
      for (let i = 0; i < count; i++) {
        const isSelected = rec.getSublistValue({ sublistId: "sublista", fieldId: "check", line: i });
        if (isSelected) { any = true; break; }
      }
      if (!any) {
        alert("Debe seleccionar al menos un registro");
        return false;
      }

      const fechaInicio = rec.getValue({ fieldId: "fecha_inicio" });
      const fechaFin = rec.getValue({ fieldId: "fecha_fin" });
      const termino_pago = rec.getValue({ fieldId: "termino_pago" });
      const ubicacion = rec.getValue({ fieldId: "ubicacion" });
      const glosa = rec.getValue({ fieldId: "glosa" });

      if (!fechaInicio || !fechaFin || !termino_pago || !ubicacion || !glosa) {
        alert("Debe llenar los campos obligatorios");
        return false;
      }

      return true;
    } catch (e) {
      log.error("saveRecord error", e);
      return false;
    }
  }

  return {
    pageInit,
    fieldChanged,
    calcularImporte,
    saveRecord
  };
});
