/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/runtime'], (record, log, runtime) => {

  const afterSubmit = (context) => {
    // Solo nos interesa la creación
    if (context.type !== context.UserEventType.CREATE) return;

    const newRec   = context.newRecord;
    const execCtx  = runtime.executionContext; // USER_INTERFACE, RESTLET, etc.

    /* ---------- Mapeo de campos ---------- */
    const fieldIds = newRec.getFields();
    const fieldMap = {};

    fieldIds.forEach((fid) => {
      // Evita campos gigantes (por ejemplo archivos) si fuera necesario
      const val = newRec.getValue({fieldId: fid});
      if (val !== null && val !== '' && val !== undefined) {
        // getText() para listas desplegables, ¡útil en reportes!
        const txt = newRec.getText({fieldId: fid});
        fieldMap[fid] = txt || val;
      }
    });

    /* ---------- Persistencia ---------- */
    try {
      const auditRec = record.create({
        type: 'customrecord_customer_creation_audit',
        isDynamic: false
      });
      auditRec.setValue({fieldId:'custrecord_customer', value:newRec.id});
      auditRec.setValue({fieldId:'custrecord_context',  value:execCtx});
      auditRec.setValue({
        fieldId:'custrecord_fieldmap',
        value: JSON.stringify(fieldMap)   // ≤ 4 000 car. – suficiente en la mayoría de casos
      });
      auditRec.save({enableSourcing:false, ignoreMandatoryFields:true});
    } catch (e) {
      // Siempre registra el error para poder depurar
      log.error({title:'Customer Audit – error al grabar', details:e});
    }
  };

  return { afterSubmit };
});
