    /**
     *@NApiVersion 2.1
    *@NScriptType ScheduledScript
    */
    define(['N/file', 'N/search', 'N/record', 'N/runtime', 'N/task'], (file, search, record, runtime, task) => {

        const currentScript = runtime.getCurrentScript();
        const MAX_CANTIDAD = 2000; // max 2000
        const execute = (context) => {
            try {
                var fileCabinetId = 30427; // SB: 28731  PR: 30427// Borrar OT Duplicada

                var arrOrdenServicio = buscarOTDuplicado();
                log.error('arrOrdenServicio', arrOrdenServicio)

                if (arrOrdenServicio.length > 0) {
                    //log.error('currentScript.getRemainingUsage() 1', currentScript.getRemainingUsage())
                    let arrOSconDuplicado = eliminarOT(arrOrdenServicio);
                    //log.error('currentScript.getRemainingUsage() 2', currentScript.getRemainingUsage())

                    //log.error('arrOSconDuplicado', arrOSconDuplicado)

                    let OSRevisados = structureBody(arrOSconDuplicado.ArrayOSRevisadas)
                    let OTconErrores = structureBody(arrOSconDuplicado.ArrayOTSinEliminar)

                    let fecha = getFechaHora();
                    let nameOS = 'OrdenServicio_Revisado_' + fecha + '.txt'
                    let nameOT = 'OrdenTrabajo_NoSePudoEliminar_' + fecha + '.txt'

                    let fileObjOTconErrores = file.create({
                        name: nameOT,
                        fileType: file.Type.PLAINTEXT,
                        contents: OTconErrores,
                        encoding: file.Encoding.UTF8,
                        folder: fileCabinetId,
                        isOnline: true
                    });
                    var fileIDOTconErrores = fileObjOTconErrores.save();

                    let fileObjOSRevisados = file.create({
                        name: nameOS,
                        fileType: file.Type.PLAINTEXT,
                        contents: OSRevisados,
                        encoding: file.Encoding.UTF8,
                        folder: fileCabinetId,
                        isOnline: true
                    });
                    var fileIDOSRevisados = fileObjOSRevisados.save();

                    if (arrOSconDuplicado.ArrayOTSinEliminar.length >= MAX_CANTIDAD) {
                        arrOSconDuplicado.finalizo = true;
                    }

                    if (arrOSconDuplicado.finalizo == false) {
                        let scriptTask = task.create({
                            taskType: task.TaskType.SCHEDULED_SCRIPT,
                            scriptId: 'customscript_ts_ss_eliminar_ot_duplicada',
                            deploymentId: 'customdeploy_ts_ss_eliminar_ot_duplicad',
                        });
                        let scriptTaskId = scriptTask.submit();
                    }
                }

            } catch (error) {
                log.error('error', error)
            }

        }

        const buscarOTDuplicado = () => {
            var arrOS = [];

            let searchRecord = search.load({ id: "customsearch_ec_ot_item_dup" });

            const searchResultCount = searchRecord.runPaged().count;
            //log.debug("searchResultCount result count", searchResultCount);
            const searchRecordPagedData = searchRecord.runPaged({ pageSize: 1000 });

            for (let i = 0; i < searchRecordPagedData.pageRanges.length; i++) {
                const searchRecordObjPage = searchRecordPagedData.fetch({ index: i });
                searchRecordObjPage.data.forEach(result => {
                    try {
                        var columns = result.columns;
                        let id = result.getValue(columns[0]);
                        let articulo = result.getValue(columns[1]);
                        let duplicado = result.getValue(columns[2]);
                        let arrauxi = id + '|' + articulo
                        if (Number(duplicado) > 1) {
                            arrOS.push(arrauxi);
                        }
                    } catch (error) {
                        log.error('Error buscarOTDuplicado ' + result.id, error);
                    }
                });
            }
            return arrOS;
        }

        const eliminarOT = (arr) => {
            let ArrayOSRevisadas = [];
            let ArrayOTSinEliminar = [];
            let totalArr = arr.length;
            let finalizo = true;
            if (totalArr > MAX_CANTIDAD) {
                totalArr = MAX_CANTIDAD;
                finalizo = false;
            }

            for (let x = 0; x < totalArr; x++) {
                let arreglo = arr[x].split('|');
                //log.error('arreglo', arreglo)
                var searchRecord = search.create({
                    type: "customrecord_ht_record_ordentrabajo",
                    filters:
                        [
                            ["custrecord_ht_ot_estado", "anyof", "7"],
                            "AND",
                            ["custrecord_ht_ot_orden_servicio", "anyof", arreglo[0]],
                            "AND",
                            ["custrecord_ht_ot_item", "anyof", arreglo[1]]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "ID interno" }),
                            search.createColumn({ name: "custrecord_ht_ot_orden_servicio", label: "HT OT ID Orden Servicio" })
                        ]
                });

                const searchResultCount = searchRecord.runPaged().count;
                log.debug("searchResultCount", searchResultCount);
                const searchRecordPagedData = searchRecord.runPaged({ pageSize: 1000 });
                let numero = 0;
                let OS = '';
                for (let i = 0; i < searchRecordPagedData.pageRanges.length; i++) {
                    const searchRecordPage = searchRecordPagedData.fetch({ index: i });
                    searchRecordPage.data.forEach(result => {
                        var columns = result.columns;
                        let idInterno = Number(result.getValue(columns[0]));

                        //log.error('idInterno', idInterno);
                        //log.error('result.getText(columns[1])', result.getText(columns[1]));
                        numero = Number(numero);
                        let idAEliminar = 0;
                        try {
                            if (numero != 0) {
                                OS = result.getText(columns[1]);
                                if (idInterno > numero) {
                                    idAEliminar = numero;
                                    numero = idInterno;
                                    record.delete({
                                        type: "customrecord_ht_record_ordentrabajo",
                                        id: idAEliminar
                                    });
                                } else {
                                    idAEliminar = idInterno;
                                    record.delete({
                                        type: "customrecord_ht_record_ordentrabajo",
                                        id: idAEliminar
                                    });
                                }
                            } else {
                                numero = idInterno;
                            }
                        } catch (error) {
                            log.error('error', error);
                            ArrayOTSinEliminar.push(idAEliminar)
                        }
                    });

                    if (OS != '') {
                        ArrayOSRevisadas.push(OS)
                    }

                    if (currentScript.getRemainingUsage() < 100) {
                        finalizo = false;
                        return {
                            ArrayOSRevisadas,
                            ArrayOTSinEliminar,
                            finalizo
                        }
                    }
                }
            }

            return {
                ArrayOSRevisadas,
                ArrayOTSinEliminar,
                finalizo
            }
        }

        const structureBody = (searchResult) => {
            let contentReport = '';
            try {
                for (let i in searchResult) {
                    contentReport =
                        contentReport + searchResult[i] + '\n';
                }
                return contentReport;

            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }

        const getFechaHora = () => {
            var fechaHora = new Date();
            var dia = fechaHora.getDate().toString().padStart(2, '0');
            var mes = (fechaHora.getMonth() + 1).toString().padStart(2, '0');
            var anio = fechaHora.getFullYear();
            var horas = fechaHora.getHours().toString().padStart(2, '0');
            var minutos = fechaHora.getMinutes().toString().padStart(2, '0');
            var segundos = fechaHora.getSeconds().toString().padStart(2, '0');
            var fechaHoraFormateada = `${dia}/${mes}/${anio}_HORA${horas}/${minutos}/${segundos}`;
            return fechaHoraFormateada;
        }

        return {
            execute: execute
        }
    });
