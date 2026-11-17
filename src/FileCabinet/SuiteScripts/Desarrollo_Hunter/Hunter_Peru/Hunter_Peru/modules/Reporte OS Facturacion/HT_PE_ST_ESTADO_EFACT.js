/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget', 'N/format', 'N/file', 'N/runtime', 'N/log'],
    (search, serverWidget, format, file, runtime, log) => {

        const SUBSIDIARY_ID = '3';

        function onRequest(context) {
            try {
                const request = context.request;
                const form = serverWidget.createForm({
                    title: 'Facturas con PDF Pendiente de Envio a efact'
                });

                const today = format.format({
                    value: new Date(),
                    type: format.Type.DATE
                });

                const fldFrom = form.addField({
                    id: 'custpage_date_from',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha Desde'
                });

                const fldTo = form.addField({
                    id: 'custpage_date_to',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha Hasta'
                });

                fldFrom.defaultValue = request.parameters.custpage_date_from || today;
                fldTo.defaultValue = request.parameters.custpage_date_to || today;

                form.addSubmitButton({ label: 'Buscar' });

                const sublist = form.addSublist({
                    id: 'custpage_results',
                    type: serverWidget.SublistType.LIST,
                    label: 'Resultados'
                });

                sublist.addField({
                    id: 'custpage_tranid',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Factura'
                });

                sublist.addField({
                    id: 'custpage_trandate',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Fecha'
                });

                sublist.addField({
                    id: 'custpage_pdfid',
                    type: serverWidget.FieldType.TEXT,
                    label: 'PDF ID'
                });
/*
                sublist.addField({
                    id: 'custpage_pdfsize',
                    type: serverWidget.FieldType.TEXT,
                    label: 'PDF Size'
                });
*/
                if (request.method === 'POST') {
                    const dateFrom = request.parameters.custpage_date_from || '';
                    const dateTo = request.parameters.custpage_date_to || '';

                    const validation = validateDateRange(dateFrom, dateTo);
                    if (validation) {
                        addMessage(form, validation, true);
                        context.response.writePage(form);
                        return;
                    }

                    const filters = [
                        ['mainline', 'is', 'T'],
                        'AND',
                        ['subsidiary', 'anyof', SUBSIDIARY_ID],
                        'AND',
                        ['custbody_pe_ei_printed_pdf', 'isnotempty', '']
                    ];

                    if (dateFrom && dateTo) {
                        filters.push('AND');
                        filters.push(['trandate', 'within', dateFrom, dateTo]);
                    } else if (dateFrom) {
                        filters.push('AND');
                        filters.push(['trandate', 'onorafter', dateFrom]);
                    } else if (dateTo) {
                        filters.push('AND');
                        filters.push(['trandate', 'onorbefore', dateTo]);
                    }

                    const invoiceSearch = search.create({
                        type: search.Type.INVOICE,
                        filters: filters,
                        columns: [
                            search.createColumn({ name: 'tranid' }),
                            search.createColumn({ name: 'trandate' }),
                            search.createColumn({ name: 'custbody_pe_ei_printed_pdf' })
                        ]
                    });

                    const paged = invoiceSearch.runPaged({ pageSize: 1000 });
                    const cache = {};
                    let line = 0;
                    let scanned = 0;

                    outer:
                    for (let p = 0; p < paged.pageRanges.length; p++) {
                        const page = paged.fetch({ index: paged.pageRanges[p].index });

                        for (let i = 0; i < page.data.length; i++) {
                            if (runtime.getCurrentScript().getRemainingUsage() < 120) {
                                addMessage(form, 'Se alcanzó el límite seguro de governanza. Reduce el rango de fechas.', true);
                                break outer;
                            }

                            const result = page.data[i];
                            const tranid = result.getValue({ name: 'tranid' }) || '';
                            const trandate = result.getValue({ name: 'trandate' }) || '';
                            const pdfId = String(result.getValue({ name: 'custbody_pe_ei_printed_pdf' }) || '');

                            scanned++;

                            if (!pdfId) {
                                continue;
                            }

                            const pdfSize = getPdfSizeCached(pdfId, cache);

                            // solo mostrar archivos existentes en 0 bytes
                            if (pdfSize === 0 && cache[pdfId] && cache[pdfId].exists === true) {
                                setValue(sublist, 'custpage_tranid', line, tranid);
                                setValue(sublist, 'custpage_trandate', line, trandate);
                                setValue(sublist, 'custpage_pdfid', line, pdfId);
                                //setValue(sublist, 'custpage_pdfsize', line, '0');
                                line++;
                            }
                        }
                    }

                    addSummary(form, line, scanned, Object.keys(cache).length, runtime.getCurrentScript().getRemainingUsage());
                }

                context.response.writePage(form);

            } catch (e) {
                log.error({
                    title: 'Error general Suitelet',
                    details: e
                });

                const form = serverWidget.createForm({ title: 'Error' });
                addMessage(form, 'Ocurrió un error: ' + (e.message || JSON.stringify(e)), true);
                context.response.writePage(form);
            }
        }

        function getPdfSizeCached(fileId, cache) {
            if (cache[fileId]) {
                return cache[fileId].size;
            }

            try {
                const obj = file.load({ id: fileId });
                const size = Number(obj.size) || 0;

                cache[fileId] = {
                    exists: true,
                    size: size
                };

                return size;
            } catch (e) {
                log.error({
                    title: 'Error cargando PDF ' + fileId,
                    details: e
                });

                cache[fileId] = {
                    exists: false,
                    size: -1
                };

                return -1;
            }
        }

        function validateDateRange(dateFrom, dateTo) {
            if (dateFrom && dateTo) {
                const fromDate = format.parse({
                    value: dateFrom,
                    type: format.Type.DATE
                });

                const toDate = format.parse({
                    value: dateTo,
                    type: format.Type.DATE
                });

                if (fromDate.getTime() > toDate.getTime()) {
                    return 'La Fecha Desde no puede ser mayor que la Fecha Hasta.';
                }
            }
            return '';
        }

        function setValue(sublist, fieldId, line, value) {
            if (value !== null && value !== undefined && value !== '') {
                sublist.setSublistValue({
                    id: fieldId,
                    line: line,
                    value: String(value)
                });
            }
        }

        function addMessage(form, message, isError) {
            const fld = form.addField({
                id: 'custpage_msg_' + new Date().getTime(),
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
            });

            fld.defaultValue =
                '<div style="padding:10px;color:' + (isError ? '#b00020' : '#1f6f43') + ';font-weight:bold;">' +
                escapeHtml(message) +
                '</div>';
        }

        function addSummary(form, shown, scanned, uniqueFiles, remainingUsage) {
            const fld = form.addField({
                id: 'custpage_summary',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
            });

            fld.defaultValue =
                '<div style="padding:10px;margin-top:10px;border:1px solid #ccc;background:#f8f8f8;">' +
                '<b>Facturas evaluadas:</b> ' + scanned + '<br>' +
                '<b>Facturas con PDF No enviados a efact:</b> ' + shown + '<br>' +
                '<b>PDF únicos cargados:</b> ' + uniqueFiles + '<br>' +
                '<b>Usage restante:</b> ' + remainingUsage +
                '</div>';
        }

        function escapeHtml(text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        return { onRequest };
    });