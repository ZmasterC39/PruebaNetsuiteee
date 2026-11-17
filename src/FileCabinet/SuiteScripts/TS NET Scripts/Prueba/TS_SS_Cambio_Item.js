/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/file', 'N/search', 'N/record', 'N/runtime', 'N/task'], (file, search, record, runtime, task) => {

    let currentScript = runtime.getCurrentScript();
    const execute = (context) => {
        try {
            var itemDelet = currentScript.getParameter({ name: 'custscript_item_delet' });
            var itemAdd = currentScript.getParameter({ name: 'custscript_item_add' });
            var fechaInicio = currentScript.getParameter({ name: 'custscript_fecha_inicio' });
            var fechaFin = currentScript.getParameter({ name: 'custscript_fecha_fin' });
            var contador = currentScript.getParameter({ name: 'custscript_contador' });
            var estadoName = currentScript.getParameter({ name: 'custscript_estado_os' });
            var estadoOS = '';

            /*
                11 - Orden de Servicio:Aprobación pendiente                         // SalesOrd:A
                12 - Orden de Servicio:Ejecución de la orden pendiente              // SalesOrd:B
                13 - Orden de Servicio:Cancelada                                    // SalesOrd:C
                14 - Orden de Servicio:Parcialmente ejecutada                       // SalesOrd:D
                15 - Orden de Servicio:Facturación pendiente/parcialmente ejecutada // SalesOrd:E
                16 - Orden de Servicio:Facturación pendiente                        // SalesOrd:F
                17 - Orden de Servicio:Facturada                                    // SalesOrd:G
                18 - Orden de Servicio:Cerrada                                      // SalesOrd:H
                19 - Orden de Servicio:No definido
            */
            switch (estadoName){
                case '11':
                    estadoName = 'AprobacionPendiente';
                    estadoOS = 'SalesOrd:A';
                    break;
                case '12':
                    estadoName = 'EjecucionPendiente';
                    estadoOS = 'SalesOrd:B';
                    break;
                case '13':
                    estadoName = 'Cancelada';
                    estadoOS = 'SalesOrd:C';
                    break;
                case '14':
                    estadoName = 'ParcialemnteEjecutada';
                    estadoOS = 'SalesOrd:D';
                    break;
                case '15':
                    estadoName = 'FacturacionParcialmenteEjecutada';
                    estadoOS = 'SalesOrd:E';
                    break;
                case '16':
                    estadoName = 'FacturacionPendiente';
                    estadoOS = 'SalesOrd:F';
                    break;
                case '17':
                    estadoName = 'Facturada';
                    estadoOS = 'SalesOrd:G';
                    break;
                case '18':
                    estadoName = 'Cerrada';
                    estadoOS = 'SalesOrd:H';
                    break;
                    
            }

            var parentFolderId = 30426; // SB: 28092 PR: 30426 // Borrar Item
            var folderName = itemDelet + '_' + itemAdd + '_' + fechaInicio + '_' + fechaFin + '_' + estadoName;
            var fileName = 'arr_' + itemDelet + '_' + itemAdd + '_' + fechaInicio + '_' + fechaFin + '_' + estadoName + '.txt';

            var folderId = getFolderId(folderName, parentFolderId);
            log.error('Se encontro folderId', folderId)

            if (!folderId) {
                folderId = createFolder(folderName, parentFolderId);
                log.error('creo folderId', folderId)
            }

            var fileId = findFileIdByName(fileName);
            log.error('fileId', fileId)
            if (contador == '0' && !fileId) {
                let arreglo = buscarOS(itemDelet, fechaInicio, fechaFin, estadoOS);
                log.error('arreglo', arreglo)
                if (arreglo == '') {
                    throw new Error("No hay data con los criterios seleccionados");
                }
                
                fileObj = file.create({
                    name: fileName,
                    fileType: file.Type.PLAINTEXT,
                    contents: arreglo,
                    encoding: file.Encoding.UTF8,
                    folder: folderId,
                    isOnline: true
                });
                fileId = fileObj.save();
                log.error('creo fileId', fileId)
            }

            var arregloLeido = file.load({ id: fileId });
            var arregloFinal = (arregloLeido.getContents()).split('|');

            let totalAEliminar = arregloFinal.length
            log.debug({ title: 'Cantidad de registros a eliminar', details: `${totalAEliminar} registros a eliminar` });
            let arrayNoModificados = new Array();
            let arrayModificados = new Array();
            let reprocessing = 0;
            let numInicial = 0;
            let numFinal = 0;
            let continuarDesde = Number(contador) > 0 ? Number(contador) : 0;
            if(arregloFinal.length > 0){
                numInicial = Number(arregloFinal[continuarDesde])
                for (let index = continuarDesde; index < arregloFinal.length; index++) {
                    const element = Number(arregloFinal[index]);
                    try {
                        let ordenServ = record.load({ type: 'salesorder', id: element, isDynamic: true });
                        let lineCount = ordenServ.getLineCount({ sublistId: 'item' });
                        for (var i = 0; i < lineCount; i++) {
                            let itemId = ordenServ.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                            if (itemId == itemDelet) {
                                let tiempoCobertura = ordenServ.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', line: i });
                                let unidad = ordenServ.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_und_tiempo_cobertura', line: i });
                                let quantity = ordenServ.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                                let nvlPrice = ordenServ.getSublistValue({ sublistId: 'item', fieldId: 'price', line: i });
                                let tasa = ordenServ.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                                
                                log.error('tiempoCobertura',tiempoCobertura)
                                log.error('unidad',unidad)
                                log.error('quantity',quantity)
                                log.error('nvlPrice',nvlPrice)
                                log.error('tasa',tasa)
    
                                ordenServ.selectNewLine({ sublistId: 'item'});
                                ordenServ.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: Number(itemAdd)});
                                ordenServ.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', value: tiempoCobertura});
                                ordenServ.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_und_tiempo_cobertura', value: unidad});
                                ordenServ.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantity});
                                ordenServ.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: nvlPrice});
                                ordenServ.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: tasa});
                                ordenServ.commitLine({ sublistId: 'item' });
                                ordenServ.removeLine({ sublistId: 'item', line: i });
    
                                let nombreOS = ordenServ.getValue('tranid');
    
                                var updatedOrderId = ordenServ.save();
                                log.error('updatedOrderId',updatedOrderId)
                                var dataObject = {id: element, name: nombreOS };
                                arrayModificados.push(dataObject);
                                log.error('currentScript.getRemainingUsage()',currentScript.getRemainingUsage())
                                if(currentScript.getRemainingUsage() < 150){
                                    reprocessing = 1
                                    break;
                                }
                            }
                        }
                    } catch (error) {
                        log.error('Error: ' + element, error.message + ' / ' + currentScript.getRemainingUsage());
                        if(reprocessing == 0){
                            var dataObjectError = {id: element, name: nombreOS, error: error.message };
                            arrayNoModificados.push(dataObjectError);
                        }
                    }
                    contador = index;
                    numFinal = arregloFinal[index];
                }
            }

            log.error('fin 1',currentScript.getRemainingUsage())
            if(arrayModificados.length > 0){
                var jsonData = JSON.stringify(arrayModificados);
                var jsonFileCorrecto = file.create({
                    name: 'Modificados Correctamente' + '_' + continuarDesde + '_' + numFinal,
                    fileType: file.Type.JSON,
                    contents: jsonData,
                    folder: folderId,
                    isOnline: false
                });
                let idFileCorrect = jsonFileCorrecto.save();
                log.error('idFileCorrect',idFileCorrect)
            }

            log.error('fin 2',currentScript.getRemainingUsage())
            if(arrayNoModificados.length > 0){
                var jsonDataError = JSON.stringify(arrayNoModificados);
                var jsonFileError = file.create({
                    name: 'No Modificados por errores' + '_' + continuarDesde + '_' + numFinal,
                    fileType: file.Type.JSON,
                    contents: jsonDataError,
                    folder: folderId,
                    isOnline: false
                });
                let idFileError = jsonFileError.save();
                log.error('idFileError',idFileError)
            }

            log.error('fin 3',currentScript.getRemainingUsage())
            try {
                if (contador < arregloFinal.length && reprocessing == 1) {
                    let scriptTask = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: 'customscript_ts_ss_cambio_item',
                        deploymentId: 'customdeploy_ts_ss_cambio_item',
                        params: {
                            custscript_item_delet: itemDelet,
                            custscript_item_add: itemAdd,
                            custscript_fecha_inicio: fechaInicio,
                            custscript_fecha_fin: fechaFin,
                            custscript_contador: contador,
                            custscript_estado_os: estadoName
                        }
                    });
                    let scriptTaskId = scriptTask.submit();
                    log.debug('scriptTaskId', scriptTaskId);
                }
            } catch (error) {
                log.error('Error', error);
            }

        } catch (error) {
            log.error('error', error)
        }

    }

    const buscarOS = (item, fechaInicio, fechaFin, estado) => {
        let arr = new Array();
        let text = '';

        var salesorderSearchObj = search.create({
            type: "salesorder",
            filters:
                [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["subsidiary", "anyof", "2"],
                    "AND",
                    ["trandate", "within", fechaInicio, fechaFin],
                    "AND",
                    ["item", "anyof", item],
                    "AND", 
                    ["status","anyof", estado]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "ID interno" }),
                ]
        });

        const searchResultCount = salesorderSearchObj.runPaged().count;
        log.debug("searchResultCount result count", searchResultCount);
        const salesorderSearchObjPagedData = salesorderSearchObj.runPaged({ pageSize: 1000 });

        for (let i = 0; i < salesorderSearchObjPagedData.pageRanges.length; i++) {
            const salesorderSearchObjPage = salesorderSearchObjPagedData.fetch({ index: i });
            salesorderSearchObjPage.data.forEach(result => {
                try {
                    var columns = result.columns;
                    let scriptObj = runtime.getCurrentScript();
                    //log.debug('Remaining governance units proccess: ', scriptObj.getRemainingUsage());
                    if (scriptObj.getRemainingUsage() > 100) {
                        let id = result.getValue(columns[0]);
                        text = text + id + '|';
                    } else {
                        return '';
                    }
                } catch (error) {
                    log.error('Error ' + result.id, error);
                }
            });
        }
        text = text.slice(0, -1);
        return text;

    }

    const getFolderId = (folderName) => {
        try {
            log.error('getFolderId folderName', folderName)
            var busqueda = search.create({
                type: "folder",
                filters: [
                    ['name', 'is', folderName],
                ],
                columns: ['internalid']
            });

            var resultSet = busqueda.run();
            var results = resultSet.getRange({ start: 0, end: 1 });
            if (results.length > 0) {
                return results[0].getValue('internalid')
            } else {
                return null;
            }
        } catch (error) {
            log.error('getFolderId', error)
        }

    }

    const createFolder = (folderName, parentFolderId) => {
        var folderRecord = record.create({
            type: record.Type.FOLDER,
            isDynamic: true
        });

        folderRecord.setValue({
            fieldId: 'name',
            value: folderName
        });

        folderRecord.setValue({
            fieldId: 'parent',
            value: parentFolderId
        });

        var folderId = folderRecord.save();
        return folderId;
    }

    const findFileIdByName = (fileName) => {
        var fileSearch = search.create({
            type: 'file',
            filters: [
                ['name', 'is', fileName]
            ],
            columns: ['internalid']
        });

        var resultSet = fileSearch.run();
        var results = resultSet.getRange({ start: 0, end: 1 });

        return results.length > 0 ? results[0].getValue('internalid') : null;
    }

    return {
        execute: execute
    }
});
