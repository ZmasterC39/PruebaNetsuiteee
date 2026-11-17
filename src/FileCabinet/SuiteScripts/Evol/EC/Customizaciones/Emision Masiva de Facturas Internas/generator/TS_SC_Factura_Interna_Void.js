/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/email', 'N/file', 'N/log', 'N/record', 'N/runtime', 'N/search', 'N/task', 'N/render', '../lib/TS_CM_Factura_Interna'],
    /**
 * @param{email} email
 * @param{file} file
 * @param{log} log
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */
    (email, file, log, record, runtime, search, task, render, _lib) => {
        const LOG_RECORD = 'customrecord_ht_cr_fac_inter_lote';
        const COMPLETADO = 1;
        const ERROR = 2;
        const PENDIENTE = 3;
        const PROCESANDO = 4;
        const COMPROBANTE_FISCAL = 37
        const ESTADO_FACTURA_INTERNA = 2
        const CUSTOM_TRANSACTION_FACTURA_INTERNA = "customsale_ec_factura_interna";
        const outputfoldervoid = 20073
        let currentScript = runtime.getCurrentScript();
        let message1 = 'Lote procesado correctamente.';
        let message2 = 'El registro no contiene un archivo de entrada.';
        const PROCESS_ANULACION = 1;

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            let scriptParameters = getScriptParameters();
            let { id } = runtime.getCurrentUser();
            log.audit('Remaining governance', runtime.getCurrentScript().getRemainingUsage());
            let valuesRecord = new Object();
            if (scriptParameters.loteID) {
                try {
                    valuesRecord.custrecord_ht_fibulk_estado = PROCESANDO;
                    updateLote(scriptParameters.loteID, valuesRecord);
                    let lotData = getLot(scriptParameters.loteID);
                    log.debug('lotData', lotData);
                    if (lotData[0].inputfile) {
                        let responseProcesssData = processData(lotData[0]);
                        valuesRecord.custrecord_ht_fibulk_estado = COMPLETADO;
                        valuesRecord.custrecord_ht_fibulk_log = responseProcesssData.message;
                        valuesRecord.custrecord_ht_fibulk_output = responseProcesssData.outputFileId;
                        updateLote(scriptParameters.loteID, valuesRecord);
                    } else {
                        valuesRecord.custrecord_ht_fibulk_estado = ERROR;
                        valuesRecord.custrecord_ht_fibulk_log = message2;
                        updateLote(scriptParameters.loteID, valuesRecord);
                    }
                } catch (error) {
                    log.error('Catch-Error', error);
                    valuesRecord.custrecord_ht_fibulk_estado = ERROR;
                    valuesRecord.custrecord_ht_fibulk_log = JSON.stringify(error);
                    updateLote(scriptParameters.loteID, valuesRecord);
                }
            }

            log.audit('Remaining governance', runtime.getCurrentScript().getRemainingUsage());

            // if( id == -4){
              getLotePendiente();
            // }
            log.audit('Remaining governance', runtime.getCurrentScript().getRemainingUsage());
        }

        const getLotePendiente = () => {
            let valuesRecord = new Object();
            let loteFun;
            try {
                let filters =[
                    ["custrecord_ht_fibulk_estado", "anyof", PENDIENTE],
                    "AND",
                    ["custrecord_ht_fibulk_proceso", "anyof", PROCESS_ANULACION],
                    "AND",
                    ["owner.subsidiary","anyof","2"],
                    "AND",
                    ["created","within","today"]
                ];

                let searchLotePendiente = search.create({
                    type: 'customrecord_ht_cr_fac_inter_lote',
                    filters,
                    columns: [
                        search.createColumn({name: "internalid", label: "Id"}),
                        search.createColumn({name: "created", label: "Fecha de creación"}),
                        search.createColumn({name: "owner", label: "Propietario"}),
                        search.createColumn({name: "custrecord_ht_fibulk_estado", label: "Estado"}),
                        search.createColumn({name: "custrecord_ht_fibulk_log", label: "Mensaje"}),
                        search.createColumn({name: "custrecord_ht_fibulk_output", label: "Respuesta JSON"}),
                        search.createColumn({name: "custrecord_ht_fibulk_input", label: "Respuesta JSON"})
                    ]
                });

                var searchResultCount = searchLotePendiente.runPaged().count;
                log.audit("searchLotePendiente result count",searchResultCount);
                let resultadoPendiente = searchLotePendiente.run().getRange(0,5);

                for (let index = 0; index < resultadoPendiente.length; index++) {
                    let lote = resultadoPendiente[index].getValue({ name : 'custrecord_ht_fibulk_input'});
                    let idRegistro = resultadoPendiente[index].getValue({ name : 'internalid'});
                    loteFun = idRegistro;
                    log.audit("Factura Interna Lote", `<a href='https://7451241.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=2190&id=${idRegistro}&scrollid=6459&whence='>${idRegistro}</a>`);
                    let responseProcesssData = processData({ inputfile :lote});
                    valuesRecord.custrecord_ht_fibulk_estado = COMPLETADO;
                    valuesRecord.custrecord_ht_fibulk_log = responseProcesssData.message;
                    valuesRecord.custrecord_ht_fibulk_output = responseProcesssData.outputFileId;
                    updateLote(idRegistro, valuesRecord);
                }
            } catch (error) {
                valuesRecord.custrecord_ht_fibulk_estado = ERROR;
                valuesRecord.custrecord_ht_fibulk_log = message2;
                updateLote(loteFun, valuesRecord);
                log.audit("error 2")
            }
        }

        const processData = (lotData) => {
            try {
                let contentResults = new Array();
                let contadorProcesados = 1;
                let cantidadTotalRegistros = 0;
                let cantidadTotalRegistrosProcesados = 0;
                let fileObj = file.load({ id: lotData.inputfile });
                let nameData = `${fileObj.name}`;
                let nameDataSinExtension = nameData.replace(".json", "");
                let retorno = '';
                let countProccessTotal = 0;
                if (fileObj.size < 10485760) {
                    let ordenID = JSON.parse(fileObj.getContents());
                    //*PROCESO */
                    cantidadTotalRegistros = ordenID.length;
                    for (let i in ordenID) {
                        scriptObj = runtime.getCurrentScript();
                        retorno = _lib.anulacionFacturaInterna(ordenID[i], cantidadTotalRegistrosProcesados, contadorProcesados, contentResults)
                        log.debug('retorno', retorno);
                        countProccessTotal += retorno.cantidadTotalRegistrosProcesados
                    }
                    scriptObj = runtime.getCurrentScript();
                    let fileOutput = saveJson(retorno.contentResults, nameDataSinExtension, outputfoldervoid);
                    return {
                        outputFileId: fileOutput,
                        message: `${countProccessTotal} de ${cantidadTotalRegistros} registros procesados correctamente`
                    }
                } else {
                    log.error('Error', 'fileObj.size mayor a 10485760');
                    return {
                        outputFileId: fileOutput,
                        message: 'fileObj.size mayor a 10485760'
                    }
                }
            } catch (error) {
                log.error("ERROR processData", error)
            }
        }

        const getScriptParameters = () => {
            let scriptParameters = new Object();
            scriptParameters.loteID = currentScript.getParameter('custscript_ts_sc_fivoid_lote_id');
            log.debug("scriptParameters", scriptParameters);
            return scriptParameters;
        }

        const getLot = (lot) => {
            try {
                let filter = [["internalid", "anyof", lot]]
                let subsidiary = 0;
                const currentScriptPer = runtime.getCurrentUser();
                subsidiary = currentScriptPer?.subsidiary || 0;

                if (subsidiary) {
                    filter.push("AND", ["owner.subsidiary", "anyof", subsidiary]);
                }

                let objPayments = new Array();
                let mySearch = search.create({
                    type: LOG_RECORD,
                    filters: filter,
                    columns: ['custrecord_ht_fibulk_input', 'owner']
                });
                let searchResultCount = mySearch.runPaged().count;
                mySearch.run().each((result) => {
                    objPayments.push({
                        id: result.id,
                        inputfile: result.getValue({ name: "custrecord_ht_fibulk_input" }),
                        owner: result.getValue({ name: "owner" })
                    })
                    return true;
                });
                return searchResultCount == 0 ? 0 : objPayments;

            } catch (error) {
                log.error('Error-getLot', error);
                // return 0;
                let objPayments = new Array();
                let mySearch = search.create({
                    type: LOG_RECORD,
                    filters: [["internalid", "anyof", lot]],
                    columns: ['custrecord_ht_fibulk_input', 'owner']
                });
                let searchResultCount = mySearch.runPaged().count;
                mySearch.run().each((result) => {
                    objPayments.push({
                        id: result.id,
                        inputfile: result.getValue({ name: "custrecord_ht_fibulk_input" }),
                        owner: result.getValue({ name: "owner" })
                    })
                    return true;
                });
                return searchResultCount == 0 ? 0 : objPayments;
            }
        }

        const updateLote = (id, valuesRecord) => {
            record.submitFields({ type: LOG_RECORD, id: id, values: valuesRecord })
        }

        const saveJson = (contents, nombre, folder) => {
            let fileObj = file.create({
                name: `${nombre}_output.json`,
                fileType: file.Type.JSON,
                contents: JSON.stringify(contents),
                folder: folder,
                isOnline: false
            });
            return fileObj.save();
        }

        return { execute }

    });
