/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
*/

define(['N/log', 'N/runtime', './TS_LIB_SalesOrden_generate.js', 'N/ui/serverWidget', 'N/redirect', 'N/task', 'N/search', 'N/record', 'N/format'], function
    (log, runtime, library, serverWidget, redirect, task, search, record, format) {

    let currentScript = runtime.getCurrentScript();
    const userRecord = runtime.getCurrentUser();

    const onRequest = (context) => {
        try {

            var method = context.request.method;
            let { UserInterface } = library;
            let userInterface = new UserInterface();
            userInterface.init();
            if (method == 'GET') {
                let { subsidiaria, ubicacion, pendientes } = context.request.parameters;
                let nameReport = "Provisiones "

                //let parameters = getParametersWithDefaultValues(context.request.parameters);


                userInterface.createForm(nameReport);
                userInterface.setClientScript("./TS_CS_SalesOrden_generate.js");

                let conteinerID_1 = 'custpage_group_filtros';
                userInterface.addFieldGroup(conteinerID_1, 'Filtros de búsqueda');
                let custpage_subsidiaria = userInterface.addField('custpage_subsidiaria', serverWidget.FieldType.SELECT, 'Subsidiaria ', conteinerID_1, 'subsidiary');
                let custpage_periodo = userInterface.addField('custpage_periodo', serverWidget.FieldType.SELECT, 'Periodo  ', conteinerID_1, 'accountingperiod');
                let custpage_pendientes = userInterface.addField('custpage_pendientes', serverWidget.FieldType.SELECT, 'Procesos de Provision', conteinerID_1, 'customrecord_conf_pend');



                custpage_subsidiaria.setDefaultValue(subsidiaria);
                custpage_periodo.setDefaultValue(ubicacion);
                custpage_subsidiaria.setMandatoryValue(true);
                custpage_periodo.setMandatoryValue(true);
                custpage_pendientes.setDefaultValue(pendientes);
                custpage_pendientes.setMandatoryValue(true);
                var busquedaLista = '';
                if (pendientes) {
                    var fieldLookUp = search.lookupFields({
                        type: 'customrecord_conf_pend',
                        id: pendientes,
                        columns: ['custrecord_script_text']
                    });

                    busquedaLista = fieldLookUp.custrecord_script_text;

                }


                let resultSubList2 = userInterface.addSublist('custpage_sublist', serverWidget.SublistType.LIST, 'Seleccionar transacciones');
                resultSubList2.addSublistField('custpage_sublist_id', serverWidget.FieldType.TEXT, 'ID');
                resultSubList2.addSublistField('custpage_sublist_documento', serverWidget.FieldType.TEXT, 'Numero de Documento');
                resultSubList2.addSublistField('custpage_sublist_fecha', serverWidget.FieldType.DATE, 'Fecha');
                resultSubList2.addSublistField('custpage_sublist_idcliente', serverWidget.FieldType.TEXT, 'ID Clinete ');
                resultSubList2.addSublistField('custpage_sublist_cliente', serverWidget.FieldType.TEXT, 'Cliente ');
                resultSubList2.addSublistField('custpage_sublist_estado', serverWidget.FieldType.TEXT, 'Estado');
                resultSubList2.addSublistField('custpage_sublist_idarticulo', serverWidget.FieldType.TEXT, 'ID Articulo ');
                resultSubList2.addSublistField('custpage_sublist_namearticulo', serverWidget.FieldType.TEXT, 'Nombre Articulo');
                resultSubList2.addSublistField('custpage_sublist_articulo', serverWidget.FieldType.TEXT, 'Articulo');
                resultSubList2.addSublistField('custpage_sublist_costo', serverWidget.FieldType.TEXT, 'Cuenta costo');
                if (pendientes == 1) {
                    resultSubList2.addSublistField('custpage_sublist_provicion', serverWidget.FieldType.TEXT, 'Cuenta Provision de Costo');
                } else {
                    resultSubList2.addSublistField('custpage_sublist_ingreso', serverWidget.FieldType.TEXT, 'Cuenta Provision de Ingreso');
                }


                resultSubList2.addSublistField('custpage_sublist_directa', serverWidget.FieldType.TEXT, 'Factura Directa Agrupada');
                resultSubList2.addSublistField('custpage_sublist_importe', serverWidget.FieldType.TEXT, 'Importe');


                let custpage_sublist_codcosto = resultSubList2.addSublistField('custpage_sublist_codcosto', serverWidget.FieldType.TEXT, 'Factura Directa Agrupada');
                let custpage_sublist_codprovision = resultSubList2.addSublistField('custpage_sublist_codprovision', serverWidget.FieldType.TEXT, 'Importe');
                let custpage_sublist_departamento = resultSubList2.addSublistField('custpage_sublist_departamento', serverWidget.FieldType.TEXT, 'Factura Directa Agrupada');
                let custpage_sublist_clase = resultSubList2.addSublistField('custpage_sublist_clase', serverWidget.FieldType.TEXT, 'Importe');
                let custpage_sublist_oficina = resultSubList2.addSublistField('custpage_sublist_oficina', serverWidget.FieldType.TEXT, 'Factura Directa Agrupada');

                custpage_sublist_codcosto.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                custpage_sublist_codprovision.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                custpage_sublist_departamento.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                custpage_sublist_clase.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                custpage_sublist_oficina.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);


                let filterDefaultValues = getFilterDefaultValues(subsidiaria, ubicacion, pendientes);
                filterDefaultValues.page = 0;
                //log.error("filterDefaultValues", filterDefaultValues);
                // 
                if (ubicacion && busquedaLista) {
                    const month_year = getperiodos(ubicacion);
                    const perioddatefirst = getFirstAndLastDayOfMonth(
                        month_year.acumulado_actual,
                        month_year.mes_actual
                    );
                    userInterface.setResultSubListData(resultSubList2, filterDefaultValues, perioddatefirst.firstDay, perioddatefirst.lastDay, busquedaLista, pendientes);
                    log.debug('perioddatefirst', perioddatefirst);
                }


                //userInterface.addButton('custpage_print_txt', 'Imprimir Json', 'downloadJson');
                //userInterface.addResetButton();
                userInterface.addSubmitButton("Procesar");
                context.response.writePage(userInterface.FORM);
            } else if (method == 'POST') {


                try {
                    const periodname = getPeriodName(context.request.parameters.custpage_periodo);
                    const namependiente = search.lookupFields({
                        type: 'customrecord_conf_pend',
                        id: context.request.parameters.custpage_pendientes,
                        columns: ["name"],
                    });
                    const month_year = getperiodos(context.request.parameters.custpage_periodo);
                    const perioddatefirst = getFirstAndLastDayOfMonth(
                        month_year.acumulado_actual,
                        month_year.mes_actual
                    );

                    const fecha = format.parse({
                        value: perioddatefirst.lastDay,
                        type: format.Type.DATE
                    });
                    var journalEntry = record.create({
                        type: record.Type.JOURNAL_ENTRY,
                        isDynamic: true
                    });

                    // Configuración del Journal Entry
                    journalEntry.setValue({
                        fieldId: 'customform',
                        value: 131
                    });

                    journalEntry.setValue({
                        fieldId: 'subsidiary',
                        value: context.request.parameters.custpage_subsidiaria
                    });
                    journalEntry.setValue({
                        fieldId: 'currency',
                        value: 1
                    });

                    journalEntry.setValue({
                        fieldId: 'memo',
                        value: 'Asiento de Provisiones de  ' + namependiente.name + ' ' + periodname
                    });
                    journalEntry.setValue({
                        fieldId: 'trandate',
                        value: fecha
                    });
                    journalEntry.setValue({
                        fieldId: 'postingperiod',
                        value: context.request.parameters.custpage_periodo
                    });
                    let transactionIds = getResultSublistDatadepositos(context.request.parameters.custpage_sublistdata, journalEntry, context.request.parameters.custpage_pendientes);

                    const today = new Date();
                    log.debug('userRecord', userRecord);
                    var LogCreate = record.create({ type: 'customrecord_log_sientos', isDynamic: true });
                    LogCreate.setValue({ fieldId: 'custrecord_logas_estado', value: 'CREADO' });
                    LogCreate.setValue({ fieldId: 'custrecord_log_usuario', value: userRecord.id });
                    if (!transactionIds) {
                        LogCreate.setValue({ fieldId: 'custrecord_log_errores', value: 'Debe introducir al menos una línea de artículo para esta transacción. Ningun linea valida' });
                    } else {
                        LogCreate.setValue({ fieldId: 'custrecord_log_asiento', value: transactionIds });
                    }

                    LogCreate.setValue({ fieldId: 'custrecord_log_fecha_creacion', value: today });
                    LogCreate.setValue({ fieldId: 'custrecord_log_fecha_finalizacion', value: today });
                    LogCreate.setValue({ fieldId: 'custrecord_log_creado', value: userRecord.id });

                    LogCreate.save();
                    redirect.toSuitelet({
                        scriptId: 'customscript_ts_sl_log_jounal',
                        deploymentId: 'customdeploy_ts_sl_log_jounal'
                    })

                } catch (error) {
                    const today = new Date();
                    var LogCreate = record.create({ type: 'customrecord_log_sientos', isDynamic: true });
                    LogCreate.setValue({ fieldId: 'custrecord_logas_estado', value: 'CREADO' });
                    LogCreate.setValue({ fieldId: 'custrecord_log_usuario', value: userRecord.id });

                    LogCreate.setValue({ fieldId: 'custrecord_log_fecha_creacion', value: today });
                    LogCreate.setValue({ fieldId: 'custrecord_log_fecha_finalizacion', value: today });
                    LogCreate.setValue({ fieldId: 'custrecord_log_creado', value: userRecord.id });
                    LogCreate.setValue({ fieldId: 'custrecord_log_errores', value: error });
                    LogCreate.save();
                    redirect.toSuitelet({
                        scriptId: 'customscript_ts_sl_log_jounal',
                        deploymentId: 'customdeploy_ts_sl_log_jounal'
                    })
                }


                ;
            }
        } catch (error) {
            log.error("error", error);
        }
    }
    const getPeriodName = (filterPostingPeriod) => {
        try {
            const perLookup = search.lookupFields({
                type: search.Type.ACCOUNTING_PERIOD,
                id: filterPostingPeriod,
                columns: ["periodname"],
            });
            const period = perLookup.periodname;
            return period;
        } catch (e) {
            log.error({ title: "getPeriodName", details: e });
        }
    };
    const getperiodos = (mesAnio) => {
        try {
            const periodname = getPeriodName(mesAnio);

            // Dividimos la entrada para obtener el mes y el año
            const [mes, anio] = periodname.split(" ");
            const anioActual = parseInt(anio);
            const anioAnterior = anioActual - 1;

            // Creamos un objeto con los periodos

            const mes_actual = `${mes} ${anioActual}`;
            const acumulado_actual = `ene ${anioActual}`;
            const mes_anterior = `${mes} ${anioAnterior}`;
            const acumulado_anterior = `ene ${anioAnterior}`;

            return {
                mes_actual: mes_actual,
                acumulado_actual: acumulado_actual,
                mes_anterior: mes_anterior,
                acumulado_anterior: acumulado_anterior,
            };
        } catch (e) {
            log.error({ title: "getperiodos", details: e });
        }
    };
    const getFirstAndLastDayOfMonth = (monthYear, monthYearEnd) => {

        // Extraer el mes y el año del periodo inicial
        const [startMonth, startYear] = monthYearEnd.split(" ");
        // Extraer el mes y el año del periodo final
        const [endMonth, endYear] = monthYearEnd.split(" ");
        const day = 1;

        // Meses del año en español
        const monthNames = [
            "ene",
            "feb",
            "mar",
            "abr",
            "may",
            "jun",
            "jul",
            "ago",
            "sep",
            "oct",
            "nov",
            "dic",
        ];

        // Obtener el índice de los meses
        const startMonthIndex = monthNames.indexOf(startMonth.toLowerCase());
        const endMonthIndex = monthNames.indexOf(endMonth.toLowerCase());

        if (startMonthIndex === -1 || endMonthIndex === -1) {
            throw new Error("Invalid month name");
        }

        // Crear las fechas para el primer día y el último día del mes
        const firstDay = new Date(startYear, startMonthIndex, day);
        const lastDay = new Date(endYear, endMonthIndex + 1, 0); // 0 significa el último día del mes anterior

        // Formatear las fechas manualmente como "DD/MM/YYYY"
        const formattedFirstDay = formatDateManual(firstDay);
        const formattedLastDay = formatDateManual(lastDay);

        // Formatear las fechas como "DD/MM/YYYY" en español
        /*const formattedFirstDay = firstDay.toLocaleDateString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  
        const formattedLastDay = lastDay.toLocaleDateString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });*/

        return {
            firstDay: formattedFirstDay,
            lastDay: formattedLastDay,
        };

    };
    const formatDateManual = (date) => {
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

 


    const getFilterDefaultValues = (subsidiaria, ubicacion, pendientes) => {
        return {
            subsidiaria: subsidiaria,

            ubicacion: ubicacion,
            pendientes: pendientes,
        };
    }


  
   
    const getResultSublistDatadepositos = (sublistData, journalEntry, custpage_pendientes) => {
        let resultData = [];
        let results = false
        try {
            const breakLine = /\u0002/;
            const breakColumns = /\u0001/;

            let lines = sublistData.split(breakLine);
            log.debug("sublistData", sublistData);
            log.debug("lines", lines);

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].split(breakColumns);
                if (parseInt(line[11]) != 0) {

                    results = true;
                    log.debug('line', line);
                    journalEntry.selectNewLine({ sublistId: 'line' });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: line[13]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: custpage_pendientes == 4 ? 'credit' : 'debit',
                        value: line[12]
                    });

                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'memo',
                        value: line[1] + ' - ' + line[7] + ' - ' + line[8]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'entity',
                        value: line[3]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'department',
                        value: line[15]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'class',
                        value: line[16]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'location',
                        value: line[17]
                    });
                    journalEntry.commitLine({ sublistId: 'line' });

                    // Línea de Crédito
                    journalEntry.selectNewLine({ sublistId: 'line' });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: line[14]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: custpage_pendientes == 4 ? 'debit' : 'credit',
                        value: line[12]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'memo',
                        value: line[1] + ' - ' + line[7] + ' - ' + line[8]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'entity',
                        value: line[3]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'department',
                        value: line[15]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'class',
                        value: line[16]
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'location',
                        value: line[17]
                    });
                    journalEntry.commitLine({ sublistId: 'line' });


                }




                //resultData.push(line);

            }
            if (results) {
                var journalEntryId = journalEntry.save();
                return journalEntryId;

            } else {
                return false;
            }

        } catch (error) {
            log.error("An error was found in [getSublistData] function", error);
        }


        return results;
    }

    return {
        onRequest
    }
})