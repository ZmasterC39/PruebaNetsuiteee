/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/config', 'N/file', 'N/log', 'N/record', 'N/runtime', 'N/search', 'N/format', 'N/task'],
    (config, file, log, record, runtime, search, format, task) => {

        const FOLDER_NAME = 'FileCabinet';
        const SEARCH1 = 'customsearch_pe_registro_de_ventas_14_1';
        const CUSTOM_RECORD_LOG = 'customrecord_pe_generation_logs';
        const CODIGO_LIBRO = '140100';
        const PARAMETER = 'custscript_pe_mr_ple_14_1_per_v2';
        const BOOK_NAME = 'Reg. Ventas 14.1';
        const TEMP_FOLDER_NAME = 'TEMP_PLE_14_1';

        let currentScript = runtime.getCurrentScript();
        let tempFileIds = [];
        let summary = {
            totalProcessed: 0,
            currentFile: null,
            fedIdNumb: null,
            perLookup: null,
            formatType: null,
            folderid: null,
            isOneWorld: false,
            logId: null
        };

        const getInputData = () => {
            log.audit('getInputData', 'Iniciando proceso Map/Reduce');

            const scriptParameters = JSON.parse(currentScript.getParameter(PARAMETER));
            if (!scriptParameters) {
                throw new Error('No se encontraron parámetros del script');
            }

            // Configuración inicial
            const config = initializeConfiguration(scriptParameters);
            summary.fedIdNumb = config.fedIdNumb;
            summary.perLookup = config.perLookup;
            summary.formatType = scriptParameters.selectFormat;
            summary.folderid = config.folderid;
            summary.isOneWorld = config.isOneWorld;

            // Crear registro de log
            summary.logId = createGenerationLog({
                custrecord_pe_period_log: scriptParameters.selectPeriod,
                custrecord_pe_report_log: "Procesando...",
                custrecord_pe_status_log: "Procesando...",
                custrecord_pe_book_log: BOOK_NAME,
                custrecord_pe_subsidiary_log: config.isOneWorld ? scriptParameters.selectSubsidiary : null
            });

            // Crear carpeta temporal
            createTempFolder(summary.folderid);

            // Configurar búsqueda y obtener columnas
            const searchObj = search.load({ id: SEARCH1 });

            // Aplicar filtros
            const filters = searchObj.filters;
            filters.push(search.createFilter({
                name: 'postingperiod',
                operator: search.Operator.ANYOF,
                values: scriptParameters.selectPeriod
            }));

            if (config.isOneWorld) {
                filters.push(search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.ANYOF,
                    values: scriptParameters.selectSubsidiary
                }));
            }
            let searchResultCount = searchObj.runPaged().count;
            log.debug('searchResultCount', searchResultCount);

            // Modificación clave: Devolver los IDs de los resultados
            return searchObj.run().getRange({ start: 0, end: 1000 }).map(result => result.id);
        };

        const map = (context) => {
            try {
                // Obtener el ID del registro
                const recordId = context.value;

                // Cargar la búsqueda y obtener el resultado específico
                const searchObj = search.load({ id: SEARCH1 });
                let searchResultCount = searchObj.runPaged().count;
                log.debug('searchResultCount2', searchResultCount);
                const searchResults = searchObj.run().getRange({ start: 0, end: 1000 });

                // Encontrar el resultado específico que coincide con el recordId
                let result;
                for (let i = 0; i < searchResults.length; i++) {
                    if (searchResults[i].id === recordId) {
                        result = searchResults[i];
                        break;
                    }
                }

                if (!result) {
                    log.debug('No se encontró resultado', `ID: ${recordId}`);
                    return;
                }

                // Obtener columnas de la búsqueda
                const columns = searchObj.columns;

                // Procesar el registro
                const registro = processRecord(result, columns);

                // 2. Formatear la línea para el archivo
                const line = formatRecordAsLine(registro);

                // 3. Determinar el archivo temporal actual (rotación cada 50k registros)
                const fileIndex = Math.floor(summary.totalProcessed / 50000) + 1;
                const currentFile = `temp_${fileIndex}`;

                // 4. Escribir en el contexto para Reduce
                context.write({
                    key: currentFile,    // Nombre del archivo temporal
                    value: line          // Línea formateada
                });

                // 5. Actualizar contador
                summary.totalProcessed++;

                // 6. Log cada 1000 registros para seguimiento
                if (summary.totalProcessed % 1000 === 0) {
                    log.audit('Progreso', `Registros procesados: ${summary.totalProcessed}`);
                }

            } catch (e) {
                log.error('map Error', `Error procesando registro: ${e.message}\n${e.stack}`);
            }
        };

        const reduce = (context) => {
            try {
                const fileContent = context.values.map(v => v).join('');
                const fileName = context.key;

                const tempFile = createTempFile(
                    fileName,
                    summary.formatType,
                    fileContent,
                    getFolderId(TEMP_FOLDER_NAME),
                    fileName === 'temp_1' // Solo incluir cabecera en el primer archivo
                );

                tempFileIds.push(tempFile);
            } catch (e) {
                log.error('reduce Error', `Error combinando resultados: ${e.message}`);
            }
        };

        const summarize = (summaryContext) => {
            log.audit('summarize', 'Proceso Map/Reduce completado');

            try {
                // Combinar archivos temporales en uno final
                if (tempFileIds.length > 0) {
                    const finalFileName = 'LE' + summary.fedIdNumb + summary.perLookup + CODIGO_LIBRO + '00' + '1111';
                    const finalFileId = combineTempFiles(finalFileName, summary.formatType, summary.folderid);

                    // Actualizar log con archivo final
                    updateRecordLog(
                        summary.logId,
                        finalFileId,
                        summary.totalProcessed
                    );
                } else {
                    updateRecordLog(summary.logId);
                }

                // Limpiar archivos temporales
                cleanupTempFiles();

                log.audit('Resumen', `Total registros procesados: ${summary.totalProcessed}`);
                summaryContext.output = `Proceso completado. ${summary.totalProcessed} registros procesados.`;
            } catch (e) {
                log.error('summarize Error', `Error finalizando proceso: ${e.message}`);
                summaryContext.output = `Error: ${e.message}`;
            }
        };

        // -------------------- LÓGICA COMPLETA DE PROCESAMIENTO DE CAMPOS --------------------

        const processRecord = (result, columns) => {
            const registro = {};

            // Validar que tenemos un resultado y columnas válidas
            if (!result || !columns || !Array.isArray(columns)) {
                throw new Error('Datos de entrada inválidos para procesar registro');
            }

            for (let i = 0; i < columns.length; i++) {
                try {
                    const column = columns[i];
                    let value = '';

                    // Obtener valor de forma segura
                    if (result && typeof result.getValue === 'function') {
                        value = result.getValue(column) || '';
                    }

                    // Procesamiento especial por tipo de campo
                    switch (i) {
                        // Fecha de vencimiento (Campo 5)
                        case 4:
                            value = processFechaVencimiento(value, result.getValue(columns[3]));
                            break;

                        // Tipo de comprobante (Campo 6)
                        case 5:
                            value = parseFloat(value).toFixed(2);
                            break;

                        // IGV (Campo 16) - Invertir signo para tipo 07
                        case 15:
                            if (result.getValue(columns[5]) === '07' && parseFloat(value) > 0) {
                                value = (parseFloat(value) * -1).toFixed(2);
                            }
                            break;

                        // Campos numéricos (2 decimales)
                        case 12: case 13: case 14: case 16: case 17: case 18: case 19:
                        case 20: case 21: case 22: case 23: case 24: case 42: case 43:
                        case 44: case 45: case 46: case 47: case 48: case 49: case 50:
                            value = formatNumber(value);
                            break;

                        // Campos opcionales (vaciar si son "- None -")
                        case 8: case 27: case 28: case 29: case 30: case 31: case 32:
                        case 33: case 34: case 35: case 36: case 37: case 38: case 39:
                        case 40: case 41:
                            if (value === '- None -') value = '';
                            break;

                        // Valor por defecto (eliminar "- None -")
                        default:
                            if (value === '- None -') value = '';
                    }

                    registro[`campoRegistro${completarCero(2, i + 1)}`] = value || '';

                } catch (e) {
                    log.error(`Error procesando columna ${i}`, e.message);
                    registro[`campoRegistro${completarCero(2, i + 1)}`] = '';
                }
            }

            return registro;
        };

        // -------------------- FUNCIONES AUXILIARES --------------------
        const formatRecordAsLine = (registro) => {
            const campos = [];

            // Generar array ordenado de campos (01 a 51)
            for (let i = 1; i <= 51; i++) {
                const fieldName = `campoRegistro${completarCero(2, i)}`;
                campos.push(registro[fieldName] || '');
            }

            // Unir con pipe y añadir salto de línea
            return campos.join('|') + '\n';
        };

        const createTempFile = (name, formatType, content, folderId, includeHeader = false) => {
            let fileContent = includeHeader ? getCabeceraCSV() : '';
            fileContent += formatType === 'CSV' ? content.replace(/\|/g, ',') : content;

            const fileObj = file.create({
                name: `${name}.${formatType === 'CSV' ? 'csv' : 'txt'}`,
                fileType: formatType === 'CSV' ? file.Type.CSV : file.Type.PLAINTEXT,
                contents: fileContent,
                encoding: file.Encoding.UTF8,
                folder: folderId,
                isOnline: false
            });

            return fileObj.save();
        };

        const combineTempFiles = (finalFileName, formatType, finalFolderId) => {
            let finalContent = '';

            tempFileIds.forEach((fileId, index) => {
                const tempFile = file.load({ id: fileId });
                let content = tempFile.getContents();

                if (index === 0) {
                    finalContent = content;
                } else {
                    let lines = content.split('\n');
                    if (lines[0].includes('Periodo|CUO|Correlativo')) {
                        lines.shift();
                    }
                    finalContent += lines.join('\n');
                }
            });

            return createFile(finalFileName, formatType, finalContent, finalFolderId);
        };

        const createFile = (nameFile, formatType, contentFile, folderid) => {
            const objFields = {
                name: `${nameFile}.${formatType === 'CSV' ? 'csv' : 'txt'}`,
                fileType: formatType === 'CSV' ? file.Type.CSV : file.Type.PLAINTEXT,
                contents: contentFile,
                encoding: file.Encoding.UTF8,
                folder: folderid,
                isOnline: true
            };

            const fileObj = file.create(objFields);
            return fileObj.save();
        };

        const initializeConfiguration = (scriptParameters) => {
            let fedIdNumb, isOneWorld = 0;

            if (runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" })) {
                const subLookup = search.lookupFields({
                    type: search.Type.SUBSIDIARY,
                    id: scriptParameters.selectSubsidiary,
                    columns: ['taxidnum']
                });
                fedIdNumb = subLookup.taxidnum;
                isOneWorld = 1;
            } else {
                const configpage = config.load({ type: config.Type.COMPANY_INFORMATION });
                fedIdNumb = configpage.getValue('employerid');
            }

            const perLookup = search.lookupFields({
                type: search.Type.ACCOUNTING_PERIOD,
                id: scriptParameters.selectPeriod,
                columns: ['startdate']
            });
            const periodoFinDate = format.parse({ type: format.Type.DATE, value: perLookup.startdate });
            const perLookupFormatted = periodoFinDate.getFullYear() + completarCero(2, periodoFinDate.getMonth() + 1) + '00';

            const folderid = getFolderId(FOLDER_NAME);

            return {
                fedIdNumb,
                perLookup: perLookupFormatted,
                folderid,
                isOneWorld
            };
        };

        const createTempFolder = (parentFolderId) => {
            let folderSearch = search.create({
                type: 'folder',
                filters: [['name', 'is', TEMP_FOLDER_NAME]],
                columns: ['internalid']
            });

            let folderId;
            folderSearch.run().each((result) => {
                folderId = result.getValue('internalid');
                return false;
            });

            if (!folderId) {
                const newFolder = file.createFolder({
                    name: TEMP_FOLDER_NAME,
                    parent: parentFolderId
                });
                folderId = newFolder.save();
                log.audit('Folder Created', `Carpeta temporal creada: ${folderId}`);
            }

            return folderId;
        };

        const cleanupTempFiles = () => {
            if (tempFileIds.length === 0) return;

            log.audit('Cleanup', `Eliminando ${tempFileIds.length} archivos temporales`);

            tempFileIds.forEach(fileId => {
                try {
                    file.delete({ id: fileId });
                } catch (e) {
                    log.error('Cleanup Error', `No se pudo eliminar archivo ${fileId}: ${e.message}`);
                }
            });

            tempFileIds = [];
        };

        const createGenerationLog = (data) => {
            const recordGenerationLog = record.create({
                type: CUSTOM_RECORD_LOG,
                isDynamic: true
            });

            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    recordGenerationLog.setValue({ fieldId: key, value: data[key] });
                }
            }

            return recordGenerationLog.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
        };

        const updateRecordLog = (id, fileId = 0, totalProcessed = 0, errormessage = null) => {
            const updateData = {};

            if (errormessage) {
                updateData.custrecord_pe_report_log = errormessage;
                updateData.custrecord_pe_status_log = 'Error';
            } else if (fileId === 0) {
                updateData.custrecord_pe_report_log = 'Proceso finalizado';
                updateData.custrecord_pe_status_log = 'No hay registros';
            } else {
                const openFile = file.load({ id: fileId });
                updateData.custrecord_pe_report_log = openFile.name;
                updateData.custrecord_pe_status_log = 'Generated';
                updateData.custrecord_pe_file_cabinet_log = openFile.url;
                updateData.custrecord_pe_total_records = totalProcessed;
            }

            record.submitFields({
                type: CUSTOM_RECORD_LOG,
                id: id,
                values: updateData
            });
        };

        const getFolderId = (folderName = FOLDER_NAME) => {
            const folderSearchObj = search.create({
                type: "folder",
                filters: [["name", "is", folderName]],
                columns: ["internalid"]
            });

            let folderid;
            folderSearchObj.run().each((result) => {
                folderid = result.getValue("internalid");
                return false;
            });

            return folderid;
        };

        const completarCero = (tamano, valor) => {
            let strValor = valor.toString();
            while (strValor.length < tamano) {
                strValor = '0' + strValor;
            }
            return strValor;
        };

        const convertDate = (date) => {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };

        const getCabeceraCSV = () => {
            return '1 Periodo|2 CUO|3 Correlativo|4 Fecha de Emision del Comprobante de Pago o Documento|' +
                '5 Fecha de Vencimiento o Fecha de Pago|6 Tipo de Comprobante de Pago o Documento|' +
                '7 Serie del Comprobante de Pago o Documento|8 Nro del Comprobante de Pago o Documento|' +
                '9 en caso de optar por imp tot de las operaciones diarias o no otorguen derecho a credito fiscal|' +
                '10 Tipo de Documento de identidad del cliente|11 Numero de RUC del cliente o numero de documento de identidad segun corresponda|' +
                '12 Apellidos y nombres o razon social del cliente. En caso de personas naturales|13 X-PE|14 S-PE|15 Desc|16 IGV|' +
                '17 IGV Descuento PE|18 E-PE|19 I-PE|20 SUn-PE|21 IUn-PE|22 Inaf-PE|23 ICBP|24 Otros|25 Total|26 Mon|27 TC|' +
                '28 Fecha Doc Ref|29 TD Doc Ref|30 Serie Doc Ref|31 Num Doc Ref|32 identificador Contrato|33 Inconsistencia TC|' +
                '34 Medio de Pago|35 Estado que identifica|36 Periodo|37 Periodo Inicial|38 Periodo Final|39 meses anteriores 12|' +
                '40 es rectificacion|41 Tipo Transaccion|42 Memo|43 Descuento exonerado|44 Descuento PE|45 Descuento X-PE|' +
                '46 Descuento Inaf-PE|47 SNop-PE|48 SNoc-PE|49 E-PE|50 INoc-PE|51 0 Ordenamiento|\n';
        };

        const safeGetValue = (result, column) => {
            try {
                return result.getValue(column) || '';
            } catch (e) {
                return '';
            }
        };

        // Formatear números a 2 decimales
        const formatNumber = (value) => {
            const num = parseFloat(value) || 0;
            return (Math.round(num * 100) / 100).toFixed(2);
        };

        // Procesar fecha de vencimiento
        const processFechaVencimiento = (fechaVenc, fechaEmision) => {
            if (!fechaVenc || fechaVenc === '- None -') return '';

            try {
                const [dayE, monthE, yearE] = fechaEmision.split('/').map(Number);
                const [dayV, monthV, yearV] = fechaVenc.split('/').map(Number);

                const fechaVencObj = new Date(yearV, monthV - 1, dayV);
                const ultimoDiaMes = new Date(yearE, monthE, 0); // Último día del mes de emisión

                return (fechaVencObj > ultimoDiaMes) ? convertDate(ultimoDiaMes) : fechaVenc;
            } catch (e) {
                log.error('Error procesando fecha', e);
                return fechaVenc;
            }
        };



        return {
            getInputData,
            map,
            reduce,
            summarize
        };
    });