/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record'], (log, record) => {

    const TARGET_CREATE_DATE = {
        year: 2026,
        month: 4,
        day: 1
    };

    const NEW_TRAN_DATE = new Date(2026, 2, 31);
    const TARGET_SUBSIDIARY = '3';

    function formatDate(dateObj) {
        if (!dateObj) return '';
        const d = String(dateObj.getDate()).padStart(2, '0');
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = dateObj.getFullYear();
        return `${d}/${m}/${y}`;
    }

    function beforeSubmit(context) {
        try {
            if (context.type !== context.UserEventType.CREATE) return;

            const rec = context.newRecord;

            if (rec.type !== record.Type.INVOICE) return;

            const subsidiary = String(rec.getValue({ fieldId: 'subsidiary' }) || '');
            if (subsidiary !== TARGET_SUBSIDIARY) return;

            const now = new Date();
            const isTargetDay =
                now.getFullYear() === TARGET_CREATE_DATE.year &&
                (now.getMonth() + 1) === TARGET_CREATE_DATE.month &&
                now.getDate() === TARGET_CREATE_DATE.day;

            if (!isTargetDay) return;

            // Datos antes del cambio
            const invoiceId = rec.id || rec.getValue({ fieldId: 'id' }) || '(nuevo)';
            const invoiceTranId = rec.getValue({ fieldId: 'tranid' }) || '(sin número)';
            const oldTranDate = rec.getValue({ fieldId: 'trandate' });

            // Cambio de fecha
            rec.setValue({
                fieldId: 'trandate',
                value: NEW_TRAN_DATE
            });

            // Log sin usar getText (evita error)
            log.audit({
                title: 'Trandate ajustado',
                details:
                    `Invoice: ${invoiceTranId} | ` +
                    `Internal ID: ${invoiceId} | ` +
                    `Subsidiaria: ${subsidiary} | ` + // ← solo ID
                    `Fecha original: ${formatDate(oldTranDate)} | ` +
                    `Fecha nueva: ${formatDate(NEW_TRAN_DATE)}`
            });

        } catch (e) {
            log.error({
                title: 'Error en User Event',
                details: e
            });
        }
    }

    return {
        beforeSubmit
    };
});