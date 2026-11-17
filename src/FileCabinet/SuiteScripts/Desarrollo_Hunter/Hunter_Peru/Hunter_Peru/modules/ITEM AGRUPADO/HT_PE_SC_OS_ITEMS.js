/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log', 'N/runtime'], (record, log, runtime) => {

  // ✅ Aquí pegas los internalId que me pasarás (SIN parámetros)
  const INVOICE_IDS = [
3925861,
4003981,
4009893,
4010809,
4010830
  ];

  const TARGET_DEPARTMENT_ID = 298; // ✅ Departamento a setear en cada línea

  const SUBLIST_ID = 'item';
  const FIELD_DEPARTMENT = 'department';

  function execute(context) {
    if (!Array.isArray(INVOICE_IDS) || INVOICE_IDS.length === 0) {
      log.audit('Sin IDs', 'INVOICE_IDS está vacío. No hay nada que procesar.');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < INVOICE_IDS.length; i++) {
      const invoiceId = INVOICE_IDS[i];

      // (Opcional) corte por gobernanza si tu lista es grande
      const remaining = runtime.getCurrentScript().getRemainingUsage();
      if (remaining < 200) {
        log.audit('Gobernanza baja', `Uso restante ${remaining}. Cortando en índice ${i}.`);
        break;
      }

      try {
        const invRec = record.load({
          type: record.Type.INVOICE,
          id: invoiceId,
          isDynamic: false
        });

        const lineCount = invRec.getLineCount({ sublistId: SUBLIST_ID });

        if (!lineCount) {
          skippedCount++;
          log.debug('Sin líneas', `Invoice ${invoiceId} no tiene líneas en ${SUBLIST_ID}`);
          continue;
        }

        let touched = false;

        for (let line = 0; line < lineCount; line++) {
          // Si quieres ser más estricto, puedes validar que sea línea posteable:
          // const isPosting = invRec.getSublistValue({ sublistId: SUBLIST_ID, fieldId: 'isposting', line });
          // if (isPosting === false || isPosting === 'F') continue;

          const currentDept = invRec.getSublistValue({
            sublistId: SUBLIST_ID,
            fieldId: FIELD_DEPARTMENT,
            line
          });

          // Si ya está en 299, no hace nada
          if (Number(currentDept) === TARGET_DEPARTMENT_ID) continue;

          invRec.setSublistValue({
            sublistId: SUBLIST_ID,
            fieldId: FIELD_DEPARTMENT,
            line,
            value: TARGET_DEPARTMENT_ID
          });

          touched = true;
        }

        if (touched) {
          const savedId = invRec.save({
            enableSourcing: false,
            ignoreMandatoryFields: false
          });

          updatedCount++;
          log.audit('Actualizado', `Invoice ${invoiceId} guardado (id=${savedId}) con dept líneas=${TARGET_DEPARTMENT_ID}`);
        } else {
          skippedCount++;
          log.debug('Sin cambios', `Invoice ${invoiceId} ya tenía dept=${TARGET_DEPARTMENT_ID} en todas las líneas.`);
        }

      } catch (e) {
        errorCount++;
        log.error('Error procesando invoice', `ID ${invoiceId} -> ${e.name}: ${e.message}`);
      }
    }

    log.audit('Resumen', `Updated=${updatedCount}, Skipped=${skippedCount}, Errors=${errorCount}`);
  }

  return { execute };
});
