/**
 * @NApiVersion 2.1
 * @NScriptType  UserEventScript
 * @NModuleScope SameAccount
 *
 * Unicidad del campo "custrecord_ht_pp_codigo" + mensajes de éxito/error.
 */
define(['N/search', 'N/error', 'N/ui/serverWidget'], (search, error, serverWidget) => {

    /* ───────── Config ───────── */
    const RECORD_TYPE     = 'customrecord_ht_cr_pp_valores';
    const UNIQUE_FIELD_ID = 'custrecord_ht_pp_codigo';

    /* ───────── beforeLoad ───────── */
    function beforeLoad(context) {
        if (context.type !== context.UserEventType.VIEW &&
            context.type !== context.UserEventType.EDIT) return;

        const reqParams = (context.request && context.request.parameters) || {};
        if (reqParams.saved === 'T') {
            context.form.addPageInitMessage({
                type   : serverWidget.Message.Type.CONFIRMATION,
                title  : 'Éxito',
                message: 'Registro guardado correctamente.'
            });
        }
    }

    /* ───────── beforeSubmit ───────── */
    function beforeSubmit(context) {
        const action = context.type;
        if (action !== context.UserEventType.CREATE &&
            action !== context.UserEventType.COPY   &&
            action !== context.UserEventType.EDIT) return;

        const rec            = context.newRecord;
        const rawCodigo      = rec.getValue({ fieldId: UNIQUE_FIELD_ID }) || '';
        const codigoLimpio   = rawCodigo.replace(/\s+/g, '');   // ← quita TODOS los espacios

        if (!codigoLimpio) return;                              // nada que validar

        /* 1) Guarda el valor ya normalizado (sin espacios)        */
        rec.setValue({ fieldId: UNIQUE_FIELD_ID, value: codigoLimpio });

        /* 2) Busca duplicados comparando también sin espacios     */
        const dup = search.create({
            type   : RECORD_TYPE,
            filters: [
                /* REPLACE({campo}, ' ', '') elimina espacios dentro del valor guardado
                   antes de compararlo con `codigoLimpio`                              */
                ["formulatext: REPLACE({"+UNIQUE_FIELD_ID+"}, ' ', '')", "is", codigoLimpio],
                "and",
                ["internalid", "noneof", rec.id || 0]
            ],
            columns: ["internalid"]
        }).run().getRange({ start: 0, end: 1 }).length > 0;

        if (dup) {
            throw error.create({
                name    : 'CODIGO_DUPLICADO',
                message : `No se permiten duplicados.\nEl código "${rawCodigo}" ya existe en otro registro.`,
                notifyOff: false
            });
        }
    }

    return { beforeLoad, beforeSubmit };
});
