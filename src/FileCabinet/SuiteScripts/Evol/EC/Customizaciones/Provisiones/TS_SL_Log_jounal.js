/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
*/

define(['N/log', 'N/runtime', './TS_LIB_SalesOrden_generate.js', 'N/ui/serverWidget', 'N/redirect', 'N/task', 'N/search', 'N/record','N/format'], function
    (log, runtime, library, serverWidget, redirect, task, search, record,format) {

    let currentScript = runtime.getCurrentScript();
    const userRecord = runtime.getCurrentUser();

    const onRequest = (context) => {
        try {

            var method = context.request.method;
            let { UserInterface } = library;
            let userInterface = new UserInterface();
            userInterface.init();
            if (method == 'GET') {
                let { fechainicio,fechafin } = context.request.parameters;
                let nameReport = "LOG Asientos "

                //let parameters = getParametersWithDefaultValues(context.request.parameters);


                userInterface.createForm(nameReport);
                userInterface.setClientScript("./TS_CS_SalesOrden_generate.js");

                /*let conteinerID_1 = 'custpage_group_filtros';
                userInterface.addFieldGroup(conteinerID_1, 'Filtros de búsqueda');
                let custpage_subsidiaria = userInterface.addField('custpage_subsidiaria', serverWidget.FieldType.SELECT, 'Subsidiaria ', conteinerID_1, 'subsidiary');
                let custpage_periodo = userInterface.addField('custpage_periodo', serverWidget.FieldType.SELECT, 'Periodo  ', conteinerID_1, 'accountingperiod');
                let custpage_pendientes = userInterface.addField('custpage_pendientes', serverWidget.FieldType.SELECT, 'Procesos de Provision', conteinerID_1, 'customrecord_conf_pend');



                custpage_subsidiaria.setDefaultValue(subsidiaria);
                custpage_periodo.setDefaultValue(ubicacion);
                custpage_subsidiaria.setMandatoryValue(true);
                custpage_periodo.setMandatoryValue(true);
                custpage_pendientes.setDefaultValue(pendientes);
                custpage_pendientes.setMandatoryValue(true);*/

                let resultSubList2 = userInterface.addSublist('custpage_sublist', serverWidget.SublistType.LIST, 'Lista Log');
                resultSubList2.addSublistField('custpage_sublist_id', serverWidget.FieldType.TEXT, 'ID');
                resultSubList2.addSublistField('custpage_sublist_estado', serverWidget.FieldType.TEXT, 'Estado');
                resultSubList2.addSublistField('custpage_sublist_usuario', serverWidget.FieldType.TEXT, 'Usuario');
                resultSubList2.addSublistField('custpage_sublist_asiento', serverWidget.FieldType.TEXT, 'Asiento Creado');
                resultSubList2.addSublistField('custpage_sublist_creacion', serverWidget.FieldType.DATE, 'Fecha de creacion ');
                resultSubList2.addSublistField('custpage_sublist_finalizacion', serverWidget.FieldType.DATE, 'Fecha de finalizacion ');
                resultSubList2.addSublistField('custpage_sublist_creado', serverWidget.FieldType.TEXT, 'Creado por');
                resultSubList2.addSublistField('custpage_sublist_errores', serverWidget.FieldType.TEXTAREA, 'Errores ');
      


               


               let filterDefaultValues = getFilterDefaultValues(fechainicio,fechafin);
                filterDefaultValues.page = 0;
                //log.error("filterDefaultValues", filterDefaultValues);
                // 
            
                userInterface.setResultSubListDataLog(resultSubList2,filterDefaultValues);
                   // log.debug('perioddatefirst', perioddatefirst);
          


            
                context.response.writePage(userInterface.FORM);
            } else if (method == 'POST') {

              
                
               
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

  

    

 
    const getFilterDefaultValues = (fechainicio,fechafin) => {
        return {
            fechafin : fechafin,
            fechainicio:fechainicio
        };
    }


  

    return {
        onRequest
    }
})