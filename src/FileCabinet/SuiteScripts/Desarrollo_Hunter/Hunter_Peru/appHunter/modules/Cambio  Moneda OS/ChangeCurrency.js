/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log'], (record, log) => {

    // ==============================
    //  CONSTANTES A MODIFICAR
    // ==============================

    // ID interno de la orden de servicio / Sales Order
    const SALESORDER_ID = 1769881;     // <-- aquí pones tu ID (ej. 1769881)

    // Moneda origen y destino (IDs internos de moneda)
    // Ejemplo: 1 = USD, 5 = PEN (en muchas cuentas)
    const CURRENCY_FROM = '1';         // moneda actual de la orden (ej. USD)
    const CURRENCY_TO   = '5';         // moneda a la que quieres cambiar (ej. PEN)

    // Tipo de cambio a usar
    // Ej.: USD -> PEN = 3.627, PEN -> USD ~ 0.2757
    const EXCHANGE_RATE = 3.627;

    // ==============================
    //  FUNCIÓN PRINCIPAL
    // ==============================
    const execute = (context) => {
        try {
            log.audit({
                title: 'Inicio cambio de moneda',
                details: `SO=${SALESORDER_ID}, from=${CURRENCY_FROM}, to=${CURRENCY_TO}, rate=${EXCHANGE_RATE}`
            });

            processSalesOrder(SALESORDER_ID, CURRENCY_FROM, CURRENCY_TO, EXCHANGE_RATE);

        } catch (e) {
            log.error({
                title: 'Error en execute',
                details: e
            });
        }
    };

    /**
     * Cambia la moneda de una Sales Order específica
     * @param {number|string} soId           - Internal ID de la Sales Order
     * @param {string}        currencyFrom   - Moneda origen (ID interno)
     * @param {string}        currencyTo     - Moneda destino (ID interno)
     * @param {number}        exchRate       - Tipo de cambio
     */
    const processSalesOrder = (soId, currencyFrom, currencyTo, exchRate) => {

        const soRec = record.load({
            type: record.Type.SALES_ORDER,
            id: soId,
            isDynamic: true
        });

        const currentCurrency = soRec.getValue({ fieldId: 'currency' });

        // Seguridad: sólo cambiar si la moneda actual coincide con la esperada
        if (String(currentCurrency) !== String(currencyFrom)) {
            log.audit({
                title: `SO ${soId} NO procesada`,
                details: `Moneda actual (${currentCurrency}) diferente de origen (${currencyFrom}).`
            });
            return;
        }

        log.debug({
            title: `Procesando Sales Order ${soId}`,
            details: `Cambio de moneda ${currencyFrom} → ${currencyTo}, rate=${exchRate}`
        });

        // 1) Actualizar tipo de cambio
        soRec.setValue({
            fieldId: 'exchangerate',
            value: exchRate
        });

        // 2) Cambiar moneda
        soRec.setValue({
            fieldId: 'currency',
            value: currencyTo
        });

        // 3) "Tocar" las líneas para forzar recálculo de NetSuite
        const lineCount = soRec.getLineCount({ sublistId: 'item' });
        for (let i = 0; i < lineCount; i++) {
            soRec.selectLine({ sublistId: 'item', line: i });

            const rate = soRec.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate'
            });

            // Setear el mismo rate para forzar refresh de importes/impuestos
            soRec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: rate
            });

            soRec.commitLine({ sublistId: 'item' });
        }

        const savedId = soRec.save({
            enableSourcing: true,
            ignoreMandatoryFields: false
        });

        log.audit({
            title: 'Sales Order actualizada',
            details: `ID=${savedId}, moneda cambiada a ${currencyTo}`
        });
    };

    return { execute };
});
