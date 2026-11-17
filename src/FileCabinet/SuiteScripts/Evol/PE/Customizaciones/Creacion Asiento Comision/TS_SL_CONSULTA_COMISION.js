/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/log', 'N/record', 'N/search', 'N/runtime', 'N/ui/serverWidget', 'N/query', 'N/redirect', 'N/task'],

    (log, record, search, runtime, serverWidget, query, redirect, task) => {
        
        var subsidira = 3; //subsidiaria de AUTOSAFE S.A.C.
        
        const onRequest = (scriptContext) => {
            try {
                if (scriptContext.request.method === 'GET') {
                    
                    let paymentMethod = scriptContext.request.parameters.paymentMethod;
                    // Antes era por periodo
                    //let postingPeriod = scriptContext.request.parameters.postingPeriod; 
                    // CAMBIO: Ahora recibimos fechas en lugar de periodo
                    let startDate = scriptContext.request.parameters.startDate; 
                    let endDate = scriptContext.request.parameters.endDate;

                    let form = serverWidget.createForm({
                        title: 'Lineas de comisiones'
                    });
                    // Asegúrate de que el Client Script cargado en NetSuite tenga este nombre
                    form.clientScriptModulePath = './TS_CS_CONSULTA_COMISION_1.js';

                    // --- Filtros ---
                    form.addFieldGroup({
                        id: 'custpage_group_filters',
                        label: 'Filtros'
                    });

                    // Botón principal de Enviar (se mantiene aquí)
                    form.addSubmitButton({
                        label: 'Enviar'
                    });
                    
                    // Campos de Filtro
                    let paymentMethodField = form.addField({
                        id: 'custpage_paymentmethod',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Forma de pago',
                        source: 'paymentmethod',
                        container: 'custpage_group_filters'
                    });

                    paymentMethodField.isMandatory = true;
                  
                    /*Por Periodo
                    let postingPeriodField = form.addField({
                        id: 'custpage_postingperiod',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Período Contable',
                        source: 'accountingperiod',
                        container: 'custpage_group_filters'
                    }); */

                    // CAMBIO: Campos de Fecha en lugar de Período
                    let startDateField = form.addField({
                        id: 'custpage_startdate',
                        type: serverWidget.FieldType.DATE,
                        label: 'Fecha Desde',
                        container: 'custpage_group_filters'
                    });
                    startDateField.isMandatory = true;

                    let endDateField = form.addField({
                        id: 'custpage_enddate',
                        type: serverWidget.FieldType.DATE,
                        label: 'Fecha Hasta',
                        container: 'custpage_group_filters'
                    });
                    endDateField.isMandatory = true;                    
                    
                    // Restaurar valores si vienen en la URL
                    if (paymentMethod) {
                        paymentMethodField.defaultValue = paymentMethod;
                    }
                     /*Por Periodo 
                    if (postingPeriod) {
                        postingPeriodField.defaultValue = postingPeriod;
                    }*/
                  
                    if (startDate) startDateField.defaultValue = startDate;
                    if (endDate) endDateField.defaultValue = endDate; 
                  
                    // --- Fin Filtros ---

                    // --- Sublista para Depositos ---
                    var sublist = form.addSublist({
                        id: 'custpage_sublist',
                        // CAMBIO CLAVE: Usar INLINEEDITOR para permitir botones de sublista
                        type: serverWidget.SublistType.INLINEEDITOR, 
                        label: 'Depositos'
                    });

                    // BOTONES AÑADIDOS DIRECTAMENTE A LA SUBLISTA (Aparecerán cerca del detalle)
                    sublist.addButton({
                        id: 'custpage_markall',
                        label: 'Marcar Todos',
                        functionName: 'markAll' 
                    });
                    sublist.addButton({
                        id: 'custpage_unmarkall',
                        label: 'Desmarcar Todos',
                        functionName: 'unmarkAll' 
                    });
                    
                    // Nuevo: Columna Checkbox para seleccionar
                    sublist.addField({
                        id: 'custpage_select',
                        type: serverWidget.FieldType.CHECKBOX,
                        label: 'Seleccionar'
                    });
                    
                    // Columna oculta para almacenar el ID del depósito para el Map/Reduce
                    sublist.addField({
                        id: 'custpage_deposit_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'ID Deposito'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    // NUEVO CAMPO OCULTO: ID de Moneda para el Map/Reduce
                    sublist.addField({
                       id: 'custpage_deposit_currency_id',
                       type: serverWidget.FieldType.TEXT,
                       label: 'ID Moneda Deposito'
                     }).updateDisplayType({
                         displayType: serverWidget.FieldDisplayType.HIDDEN
                    }); 
                  
                    // Campos existentes (Añadí updateDisplayType para hacerlos de solo lectura si usa INLINEEDITOR)
                    sublist.addField({ id: 'custpage_deposit_number', type: serverWidget.FieldType.TEXT, label: 'Numero Deposito' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    sublist.addField({ id: 'custpage_deposit_date', type: serverWidget.FieldType.DATE, label: 'Fecha Deposito' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    sublist.addField({ id: 'custpage_deposit_currency', type: serverWidget.FieldType.TEXT, label: 'Moneda Deposito' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    sublist.addField({ id: 'custpage_deposit_amount', type: serverWidget.FieldType.CURRENCY, label: 'Monto Deposito' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    sublist.addField({ id: 'custpage_account_id', type: serverWidget.FieldType.TEXT, label: 'Cuenta' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY }); 
                    sublist.addField({ id: 'custpage_payment_method', type: serverWidget.FieldType.TEXT, label: 'Forma de Pago' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    sublist.addField({ id: 'custpage_nota_linea', type: serverWidget.FieldType.TEXT, label: 'Nota Linea' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    sublist.addField({ id: 'custpage_department', type: serverWidget.FieldType.TEXT, label: 'Departamento' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    sublist.addField({ id: 'custpage_location', type: serverWidget.FieldType.TEXT, label: 'Ubicacion' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    sublist.addField({ id: 'custpage_class', type: serverWidget.FieldType.TEXT, label: 'Clase' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                    // --- Fin Sublista ---

                    // ... Lógica de llenado de sublista (se mantiene igual) ...

                    //if (paymentMethod && postingPeriod) {
                    if (paymentMethod && startDate && endDate) {
                        
                        let dataDepositos = [];
                        
                        // 1. Buscamos el registro de configuración de método de pago
                        var sqlPaymentMethod = `SELECT 
                                                   chfpc.* 
                                                FROM 
                                                   customrecord_ht_forma_pago_comision chfpc 
                                                WHERE 
                                                   chfpc.custrecord_ht_forma_pago = ${paymentMethod}`;
                        var queryPaymentMethod = query.runSuiteQL({ query: sqlPaymentMethod });
                        var resultPaymentMethod = queryPaymentMethod.asMappedResults();
                        var data = resultPaymentMethod[0];

                        log.debug('paymentMethod', paymentMethod);
                        log.debug('resultPaymentMethod.length', resultPaymentMethod.length);

                        if (resultPaymentMethod.length > 0) {
                            
                            // 2. Buscamos los depósitos que cumplen las condiciones (SQL se mantiene igual)
                            var sqlGetDepositos = `
                                SELECT
                                    distinct transactionline.lineSequenceNumber as nro_linea,
                                    tran.id as deposit_id,
                                    tran.tranid as deposit_number,
                                    tran.trandate as deposit_date,
                                    tran.currency as deposit_currency,
                                    currency.name as deposit_currency_name,
                                    transactionline.netAmount as deposit_amount,
                                    account.id as account_id,
                                    account.fullName as account_name,
                                    (
                                        select 
                                            pm.name 
                                        from 
                                            transaction t 
                                            inner join transactionline tl on t.id = tl.transaction
                                            inner join paymentMethod pm on pm.id = tl.paymentmethod
                                        where 
                                            t.id = tran.id
                                        and pm.id = ${data.custrecord_ht_forma_pago}
                                        and rownum = 1
                                    ) as payment_method,
                                    transactionline.memo as nota_linea,
                                    transactionline.department as department,
                                    transactionline.location as location,
                                    transactionline.class as class,
                                    department.name as department_name,
                                    classification.name as class_name,
                                    location.name as location_name,
                                    transactionline.subsidiary
                                FROM
                                    transaction tran
                                    INNER JOIN transactionline ON tran.id = transactionline.transaction
                                    INNER JOIN transactionaccountingline ON transactionaccountingline.transaction = transactionline.transaction
                                    AND transactionaccountingline.transactionline = transactionline.id
                                    INNER JOIN currency ON currency.id = tran.currency
                                    INNER JOIN account ON account.id = transactionaccountingline.account
                                    LEFT JOIN department ON department.id = transactionline.department
                                    LEFT JOIN location ON location.id = transactionline.location
                                    LEFT JOIN classification ON classification.id = transactionline.class
                                WHERE
                                    tran.custbody_ht_asiento_comision_ref IS NULL
                                    AND transactionline.subsidiary = ${subsidira}
                                    AND tran.trandate BETWEEN TO_DATE('${startDate}', 'DD-MM-YYYY') AND TO_DATE('${endDate}', 'DD-MM-YYYY')
                                    AND EXISTS(
                                        select * from transaction t 
                                        inner join transactionline tl on t.id = tl.transaction
                                        inner join paymentMethod pm on pm.id = tl.paymentmethod
                                        where t.id = tran.id
                                        and pm.id = ${data.custrecord_ht_forma_pago}
                                    ) AND (
                                        account.id = ${data.custrecord_ht_cta_pte_ancipo_me}
                                        OR account.id = ${data.custrecord_ht_cta_pte_ancipo_mn}
                                    )
                                ORDER BY
                                    tran.trandate
                            `;
                            //log.debug('SQL Debug', sqlGetDepositos);

                            // AND tran.postingperiod = ${postingPeriod} 
                          
                            var queryGetDepositos = query.runSuiteQL({ query: sqlGetDepositos });
                            var resultGetDepositos = queryGetDepositos.asMappedResults();

                            // << CAMBIO AQUÍ >> ----------------------------------------------------
                            let totalRegistros = resultGetDepositos.length;
                            log.debug('totalRegistros', totalRegistros);
 
                            if (totalRegistros > 0) {
                                
                                // Mostrar el conteo en un campo de HTML en línea
                                form.addField({
                                    id: 'custpage_total_count',
                                    type: serverWidget.FieldType.INLINEHTML,
                                    label: ' '
                                }).defaultValue = `<div style="font-weight: bold; margin-bottom: 10px; font-size: 14px; padding: 5px; border: 1px solid #ddd; background-color: #f0f0f0;">
                                    Total de Depósitos Encontrados: <strong>${totalRegistros}</strong>
                                </div>`;
  
                                for (var i = 0; i < resultGetDepositos.length; i++) {
                                    let deposit = resultGetDepositos[i];
                                
                                    dataDepositos.push(deposit);

                                    // Llenado de valores
                                    sublist.setSublistValue({ id: 'custpage_deposit_id', line: i, value: deposit.deposit_id });
                                    // NUEVO: Llenamos el campo oculto con el ID de la moneda
                                    sublist.setSublistValue({ id: 'custpage_deposit_currency_id', line: i, value: deposit.deposit_currency }); // 'deposit.deposit_currency' es el ID
                                    sublist.setSublistValue({ id: 'custpage_deposit_number', line: i, value: deposit.deposit_number });
                                    sublist.setSublistValue({ id: 'custpage_deposit_date', line: i, value: deposit.deposit_date });
                                    sublist.setSublistValue({ id: 'custpage_deposit_currency', line: i, value: deposit.deposit_currency_name });
                                    sublist.setSublistValue({ id: 'custpage_deposit_amount', line: i, value: deposit.deposit_amount });
                                    sublist.setSublistValue({ id: 'custpage_account_id', line: i, value: deposit.account_name });
                                    sublist.setSublistValue({ id: 'custpage_payment_method', line: i, value: deposit.payment_method });
                                    sublist.setSublistValue({ id: 'custpage_nota_linea', line: i, value: deposit.nota_linea || ' ' });
                                    sublist.setSublistValue({ id: 'custpage_department', line: i, value: deposit.department_name || ' ' });
                                    sublist.setSublistValue({ id: 'custpage_location', line: i, value: deposit.location_name || ' ' });
                                    sublist.setSublistValue({ id: 'custpage_class', line: i, value: deposit.class_name || ' ' });
                                }

                            } else {
                                // << CAMBIO AQUÍ >> Mensaje si no hay resultados
                                form.addField({
                                    id: 'custpage_no_results',
                                    type: serverWidget.FieldType.INLINEHTML,
                                    label: ' ',
                                }).defaultValue = `<div style="padding: 10px; color: #CC0000; font-weight: bold; font-size: 14px; border: 1px solid #CC0000; background-color: #FFEEF0;">
                                    ⚠️ No se encontraron depósitos pendientes de comisión con los filtros seleccionados.
                                </div>`;
                            }
                            // -----------------------------------------------------------------------
                            log.debug('dataDepositos', dataDepositos);
                        }
                      
                    }

                    scriptContext.response.writePage(form);
                    
                } else {
                    // --- Lógica POST (Submit) ---
                    // Se mantiene igual. El cambio a INLINEEDITOR no afecta la recolección de datos POST.
                    let paymentMethod = scriptContext.request.parameters.custpage_paymentmethod;
                    //let postingPeriod = scriptContext.request.parameters.custpage_postingperiod;
                    let startDate = scriptContext.request.parameters.custpage_startdate;
                    let endDate = scriptContext.request.parameters.custpage_enddate; 
                    let lineCount = scriptContext.request.getLineCount({ group: 'custpage_sublist' });
                    
                    //log.debug('POST Request', `Payment Method: ${paymentMethod}, Period: ${postingPeriod}, Lines: ${lineCount}`);
                    log.debug('POST Request', `Payment Method: ${paymentMethod}, startDate: ${startDate} endDate: ${endDate}, Lines: ${lineCount}`);
                    
                    // 1. Recolectar las líneas seleccionadas
                    let selectedDeposits = [];
                    let selectedDepositsData = []; // Array que contendrá los objetos de depósito completos
                  
                    for (let i = 0; i < lineCount; i++) {
                        let isSelected = scriptContext.request.getSublistValue({
                            group: 'custpage_sublist',
                            name: 'custpage_select',
                            line: i
                        });
                        
                        if (isSelected === 'T') {
                            let depositId = scriptContext.request.getSublistValue({
                                group: 'custpage_sublist',
                                name: 'custpage_deposit_id',
                                line: i
                            });

                            // Es crucial que 'depositId' no sea nulo antes de guardarlo.
                            if (depositId) {
                               selectedDeposits.push(depositId);

                               // **RECOLECCIÓN DE TODOS LOS DATOS TAL COMO SE OBTUVIERON EN EL GET**
                               let depositData = {
                                   deposit_id: depositId,
                                   deposit_number: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_deposit_number', line: i }),
                                   deposit_date: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_deposit_date', line: i }),
                                   // CAMBIO CLAVE: Obtenemos el ID de moneda del campo oculto
                                   deposit_currency: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_deposit_currency_id', line: i }), 
                                   deposit_currency_name: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_deposit_currency', line: i }),
                                   deposit_amount: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_deposit_amount', line: i }),
                                   // Asumiendo que el MR espera los nombres de los campos de la SuiteQL (como en el GET)
                                   account_name: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_account_id', line: i }),
                                   payment_method: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_payment_method', line: i }),
                                   nota_linea: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_nota_linea', line: i }),
                                   department_name: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_department', line: i }),
                                   location_name: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_location', line: i }),
                                   class_name: scriptContext.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_class', line: i }),
                                   // Campos adicionales que necesita el MR pero no vienen de la sublista:
                                   subsidiary: subsidira // Se toma la subsidiaria del script
                                   // Si el Map/Reduce necesita los IDs de department, location o class,
                                   // estos deben ser añadidos como campos ocultos en el GET.
                                   };
                
                               selectedDepositsData.push(depositData);                               
                            }  
                        }
                    }

                    if (selectedDepositsData.length === 0) {
                        // Redirigir de vuelta al formulario con los filtros aplicados
                        log.audit('POST: No Selection', 'No deposits were selected for processing.');
                        redirect.toSuitelet({
                             scriptId: 'customscript_ts_sl_consulta_comision',
                             deploymentId: 'customdeploy_ts_sl_consulta_comision',
                             parameters: {
                                'paymentMethod': paymentMethod,
                                'startDate': startDate, 
                                'endDate': endDate
                             }
                        });
                        return;
                    }

                  //'postingPeriod': postingPeriod
                  
                    log.debug('selectedDepositsData (Ready for MR)', JSON.stringify(selectedDepositsData));
                  
                    // 2. Obtener la configuración de la forma de pago (necesaria para el MR)
                    var sqlPaymentMethod = `SELECT chfpc.* FROM customrecord_ht_forma_pago_comision chfpc WHERE chfpc.custrecord_ht_forma_pago = ${paymentMethod}`;
                    var queryPaymentMethod = query.runSuiteQL({ query: sqlPaymentMethod });
                    var resultPaymentMethod = queryPaymentMethod.asMappedResults();
                    var data = resultPaymentMethod[0];

                    if (resultPaymentMethod.length > 0) {
                        
                        // 3. Crear el registro de ejecución y lanzar el Map/Reduce
                        let datosProcesar = {
                            dataDepositos: selectedDepositsData,
                            paymentMethod: data
                        };

                        let createExec = record.create({
                            type: 'customrecord_ts_asient_comis_ejec',
                            isDynamic: true
                        });

                        createExec.setValue({ fieldId: 'custrecord_ts_asient_comis_ejec_proc_dat', value: JSON.stringify(datosProcesar) });
                        createExec.setValue({ fieldId: 'custrecord_ts_asient_comis_ejec_fec_ini', value: new Date() });
                        createExec.setValue({ fieldId: 'custrecord_ts_asient_comis_ejec_estado', value: 'PENDIENTE' });
                        
                        let execId = createExec.save();
                        log.debug('Execution Record Created', `ID: ${execId}`);

                        let execMr = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 'customscript_ts_mr_crea_asien_comis',
                            deploymentId: 'customdeploy_ts_mr_crea_asien_comis',
                            // DEBES PASAR EL ID DEL REGISTRO DE EJECUCIÓN COMO PARÁMETRO:
                            params: {
                            'custscript_ts_mr_exec_id': execId // Reemplaza 'custscript_ts_mr_exec_id' con el ID del parámetro de script real
                            }    
                        });
                        execMr.submit();

                        // 4. Redireccionar al usuario a la página de monitoreo
                        redirect.toSuitelet({
                            scriptId: 'customscript_ts_sl_cons_comi_exec',
                            deploymentId: 'customdeploy_ts_sl_cons_comi_exec',
                        });

                    } else {
                        // Caso de error
                        log.error('POST Error', 'No se encontró la configuración de la forma de pago.');
                        redirect.toSuitelet({
                            scriptId: 'customscript_ts_sl_consulta_comision',
                            deploymentId: 'customdeploy_ts_sl_consulta_comision'
                        });
                    }

                }
            } catch (error) {
                log.error('ERROR onRequest', error);
            }
        }

        return { onRequest }

    });