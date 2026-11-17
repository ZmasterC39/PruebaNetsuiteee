/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log'], function (record, log) {
  // === Constantes ===
  const FIN_TYPE = 'customsale_ec_factura_interna'; // tu transacción custom
  const SO_STATE_FIELD = 'custbody_ec_estado_factura_interna'; // en Sales Order
  const SO_STATE_EMITIDA_PAR = 2; // "Facturación pendiente / parcialmente ejecutada"
  const SO_STATE_RESET = 1;       // estado "inicial" al anular
  const LINK_SO_FIELD = 'custbody_ec_created_from_fac_int'; // seteado por el MR de emisión

  // Convierte a int seguro
  function toInt(v) {
    var n = Number(String(v || '').replace(/,/g, '').trim());
    return isNaN(n) ? 0 : n;
  }

  // Intenta obtener el SO desde el campo custom; si no, desde "createdfrom"
  function getSourceSoId(rec) {
    try {
      var fromCustom = rec.getValue({ fieldId: LINK_SO_FIELD });
      var soId = toInt(fromCustom);
      if (soId) return soId;

      var fromNative = rec.getValue({ fieldId: 'createdfrom' });
      soId = toInt(fromNative);
      return soId || 0;
    } catch (e) {
      log.error('getSourceSoId_error', e);
      return 0;
    }
  }

  // Actualiza el estado en la SO (silencioso, sin bloquear)
  function updateSalesOrderState(soId, newState) {
    if (!soId) return;
    try {
      record.submitFields({
        type: record.Type.SALES_ORDER,
        id: soId,
        values: { [SO_STATE_FIELD]: newState },
        options: { enableSourcing: false, ignoreMandatoryFields: true }
      });
      log.debug('SO_state_updated', { soId: soId, newState: newState });
    } catch (e) {
      // No bloquear creación/edición/borrado de FIN por esto
      log.error('SO_state_update_failed', { soId: soId, newState: newState, err: e });
    }
  }

  // === CREATE / EDIT (post-save) ===
  function afterSubmit(context) {
    try {
      var rec = context.newRecord;
      if (!rec || rec.type !== FIN_TYPE) return;

      if (context.type === context.UserEventType.CREATE) {
        var soIdC = getSourceSoId(rec);
        if (soIdC) updateSalesOrderState(soIdC, SO_STATE_EMITIDA_PAR);
        return;
      }

      // Detectar VOID por edición (campo 'void' a T)
      if (context.type === context.UserEventType.EDIT) {
        try {
          var oldRec = context.oldRecord;
          // Si no hay oldRecord, no podemos comparar
          if (!oldRec) return;

          var wasVoid = !!oldRec.getValue({ fieldId: 'void' });
          var isVoid  = !!rec.getValue({ fieldId: 'void' });

          if (!wasVoid && isVoid) {
            var soIdV = getSourceSoId(rec);
            if (soIdV) updateSalesOrderState(soIdV, SO_STATE_RESET);
          }
        } catch (e) {
          log.error('detect_void_edit_error', e);
        }
      }
    } catch (e) {
      log.error('afterSubmit_error', e);
    }
  }

  // === DELETE (pre-delete para aún leer oldRecord) ===
  function beforeSubmit(context) {
    try {
      var rec = context.newRecord;
      if (!rec || rec.type !== FIN_TYPE) return;

      if (context.type === context.UserEventType.DELETE) {
        // En DELETE, usar oldRecord para conocer el vínculo
        var oldRec = context.oldRecord || rec;
        var soIdD = getSourceSoId(oldRec);
        if (soIdD) updateSalesOrderState(soIdD, SO_STATE_RESET);
      }
    } catch (e) {
      log.error('beforeSubmit_error', e);
    }
  }

  return { beforeSubmit, afterSubmit };
});
