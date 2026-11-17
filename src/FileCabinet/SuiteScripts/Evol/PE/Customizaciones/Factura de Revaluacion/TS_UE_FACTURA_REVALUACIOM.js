/********************************************************************************************************************************************************
This script for Invoice, Cash Sale, Credit Memo and Vendor Bill (Evento para generar serie, correlativo y seteo de campos obligatorios) 
/******************************************************************************************************************************************************** 
File Name: TS_UE_INV_CS_CM.js                                                                        
Commit: 01                                                        
Version: 1.0                                                                     
Date: 20/04/2022
ApiVersion: Script 2.1
Enviroment: PR
Governance points: N/A
========================================================================================================================================================*/
/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/search', 'N/record', 'N/runtime', 'N/config'],
    (log, search, record, runtime, config) => {

        const For_Generation_Status = 1;

        let FEL_TEMPLATE = "";
        let FEL_SENDING_METHOD = ""

        const configEnviroment = () => {
            let variables = new Object();
            let companyInfo = config.load({ type: config.Type.COMPANY_INFORMATION });
            let companyid = companyInfo.getValue({ fieldId: 'companyid' });
            const EN_SANDBOX = companyid.includes('SB');
            if (EN_SANDBOX) {
                variables.custbody_psg_ei_template = 4;
                variables.custbody_psg_ei_sending_method = 6;
            } else {//EN_PROD
                variables.custbody_psg_ei_template = 4;
                variables.custbody_psg_ei_sending_method = 6;
            }
            return variables;
        }
        //& <F> - dfernandez - 02/12/2024


        const beforeSubmit = (context) => {
            let eventType = context.type;
            log.debug('entro1');
            log.debug('context.type', context.type);
            let objRecord = context.newRecord;
            let type = objRecord.type;
            //& <I> - dfernandez - 02/12/2024
            //**BLOQUE DE CONFIGURACIÓN DE AMBIENTE ======================================================================== */
            let varEnviroment = configEnviroment()
            //log.error('varEnviroment', varEnviroment);
            FEL_TEMPLATE = varEnviroment.custbody_psg_ei_template;
            FEL_SENDING_METHOD = varEnviroment.custbody_psg_ei_sending_method;
            //**============================================================================================================ */
            //& <F> - dfernandez - 02/12/2024
            //Inicio Cambio 13/06/2024 Jechevarria
            if ((eventType === context.UserEventType.CREATE || eventType === context.UserEventType.COPY) && type == record.Type.INVOICE) {
                let memo = objRecord.getValue({ fieldId: 'memo' });


                if (memo == "Factura para la enajenación de activos") {
                    let entity = objRecord.getValue({ fieldId: 'entity' });
                    let location = objRecord.getValue({ fieldId: 'location' });
                    var tipo_persona = search.lookupFields({
                        type: search.Type.CUSTOMER,
                        id: entity,
                        columns: ['custentity_pe_code_document_type']
                    });

                    if (tipo_persona.custentity_pe_code_document_type) {
                        var tipo = tipo_persona.custentity_pe_code_document_type;

                        var tipo_documento = tipo == 1 ? 52 : 50;
                        var customrecord_pe_serieSearchObj = search.create({
                            type: "customrecord_pe_serie",
                            filters:
                                [
                                    ["custrecord_pe_location", "anyof", location],
                                    "AND",
                                    ["custrecord_pe_tipo_documento_serie", "anyof", tipo_documento]
                                ],
                            columns:
                                [
                                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                                ]
                        });
                        var results = customrecord_pe_serieSearchObj.run().getRange({ start: 0, end: 1 });
                        log.debug('results.length', results.length);
                        if (results.length > 0) {
                            var firstResultId = results[0].getValue({ name: 'internalid' });
                            log.debug('firstResultId', firstResultId);
                            objRecord.setValue({ fieldId: 'custbody_pe_serie', value: firstResultId, ignoreFieldChange: true });
                        }
                        objRecord.setValue({ fieldId: 'custbody_pe_document_type', value: tipo_documento, ignoreFieldChange: true });
                        objRecord.setValue({ fieldId: 'department', value: 348, ignoreFieldChange: true });
                        objRecord.setValue({ fieldId: 'class', value: 76, ignoreFieldChange: true });
                        objRecord.setValue({ fieldId: 'custbody_pe_ei_operation_type', value: 21, ignoreFieldChange: true });
                    }
                    customform = objRecord.setValue({ fieldId: 'customform', value: 183, ignoreFieldChange: true });
                    try {
                        log.error('varEnviroment', varEnviroment);
                        objRecord.setValue({ fieldId: 'custbody_psg_ei_template', value: FEL_TEMPLATE, ignoreFieldChange: true });
                        objRecord.setValue({ fieldId: 'custbody_psg_ei_status', value: For_Generation_Status, ignoreFieldChange: true });
                        objRecord.setValue({ fieldId: 'custbody_psg_ei_sending_method', value: FEL_SENDING_METHOD, ignoreFieldChange: true });
                    } catch (error) {
                        log.error('Error-beforeSubmit-E-DOC', error);
                    }
                }
            }
           
          
           
        }

     
        return {
            beforeSubmit: beforeSubmit
        }
    });