/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/file', 'N/log', 'N/format'],
    (search, file, log, format) => {

        const DATE_FROM = new Date(2026, 2, 20);   
        const DATE_TO   = new Date(2026, 2, 26); 
        const SUBSIDIARY_ID = '3';
        const PDF_FIELD = 'custbody_pe_ei_printed_pdf';

        function getInputData() {
            const fromStr = format.format({
                value: DATE_FROM,
                type: format.Type.DATE
            });

            const toStr = format.format({
                value: DATE_TO,
                type: format.Type.DATE
            });

            return search.create({
                type: search.Type.INVOICE,
                filters: [
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['subsidiary', 'anyof', SUBSIDIARY_ID],
                    'AND',
                    [PDF_FIELD, 'isnotempty', ''],
                    'AND',
                    ['trandate', 'within', fromStr, toStr]
                ],
                columns: [
                    search.createColumn({
                        name: 'trandate',
                        sort: search.Sort.ASC
                    }),
                    search.createColumn({ name: 'tranid' }),
                    search.createColumn({ name: PDF_FIELD })
                ]
            });
        }

        function map(context) {
            const row = JSON.parse(context.value);

            const tranid = extractFieldValue(row.values.tranid);
            const trandate = extractFieldValue(row.values.trandate);
            const pdfId = extractFieldValue(row.values[PDF_FIELD]);

            if (!pdfId) {
                return;
            }

            let pdfObj;
            try {
                pdfObj = file.load({ id: pdfId });
            } catch (e) {
                log.error({
                    title: 'Error cargando PDF ' + pdfId,
                    details: e
                });
                return;
            }

            const pdfSize = Number(pdfObj.size) || 0;

            if (pdfSize === 0) {
                log.audit({
                    title: 'Día ' + trandate,
                    details: tranid
                });

                context.write({
                    key: trandate || 'SIN_FECHA',
                    value: 1
                });
            }
        }

        function reduce(context) {
            let totalDia = 0;

            for (let i = 0; i < context.values.length; i++) {
                totalDia += Number(context.values[i]) || 0;
            }

            context.write({
                key: context.key,
                value: totalDia
            });
        }

        function summarize(summary) {
            let totalGeneral = 0;

            summary.output.iterator().each((day, total) => {
                const totalDia = Number(total) || 0;
                totalGeneral += totalDia;

                log.audit({
                    title: 'Resumen día ' + day,
                    details: 'Total: ' + totalDia
                });

                return true;
            });

            log.audit({
                title: 'Resumen final',
                details: 'Total general: ' + totalGeneral
            });

            if (summary.inputSummary.error) {
                log.error({
                    title: 'Error en getInputData',
                    details: summary.inputSummary.error
                });
            }

            summary.mapSummary.errors.iterator().each((key, error) => {
                log.error({
                    title: 'Error en map - ' + key,
                    details: error
                });
                return true;
            });

            summary.reduceSummary.errors.iterator().each((key, error) => {
                log.error({
                    title: 'Error en reduce - ' + key,
                    details: error
                });
                return true;
            });
        }

        function extractFieldValue(fieldValue) {
            if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
                return '';
            }

            if (typeof fieldValue === 'string' || typeof fieldValue === 'number') {
                return String(fieldValue);
            }

            if (Array.isArray(fieldValue)) {
                if (!fieldValue.length) {
                    return '';
                }
                return extractFieldValue(fieldValue[0]);
            }

            if (typeof fieldValue === 'object') {
                if (fieldValue.value !== undefined && fieldValue.value !== null) {
                    return String(fieldValue.value);
                }
                if (fieldValue.text !== undefined && fieldValue.text !== null) {
                    return String(fieldValue.text);
                }
            }

            return '';
        }

        return {
            getInputData,
            map,
            reduce,
            summarize
        };
    });