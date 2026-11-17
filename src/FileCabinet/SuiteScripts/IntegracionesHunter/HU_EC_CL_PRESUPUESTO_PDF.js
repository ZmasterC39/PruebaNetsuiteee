/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/log", "N/url"], (log, url) => {
  function pageInit(context) {}

  function exportToExcel(data) {
    try {
      // Crear el contenido del CSV
      let csvContent = "Oficina,Facturacion,Presupuesto,% de Cumplimiento\n";

      // Convertir el string JSON a objeto si es necesario
      const dataArray = typeof data === "string" ? JSON.parse(data) : data;

      // Agregar los datos
      dataArray.forEach((row) => {
        if (row.presupuesto_valor == 0.001) {
          row.presupuesto_valor = 0;
        }
        if (row.sucursal.startsWith("<b>Total")) {
          row.sucursal = "Total";
        }
        if (row.porcentaje_de_cumplimiento.includes("&nbsp;")) {
          row.porcentaje_de_cumplimiento =
            row.porcentaje_de_cumplimiento.replace(/&nbsp;/g, "");
        }

        csvContent += `"${row.sucursal}",${row.factura_valor},${row.presupuesto_valor},"${row.porcentaje_de_cumplimiento}"\n`;
      });

      // Crear el Blob
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

      // Crear link temporal
      const link = document.createElement("a");
      if (link.download !== undefined) {
        // Crear URL del blob
        const url = window.URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          "Resultados_Facturacion_vs_Presupuesto.csv"
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      log.error("ERROR ClientScript - ", error);
      console.error("Error al exportar:", error);
    }
  }

  return {
    pageInit: pageInit,
    exportToExcel: exportToExcel,
  };
});
