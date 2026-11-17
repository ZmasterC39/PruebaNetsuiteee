/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * @author Mauro F Ramos
 * @date Created at: 14/08/2025
 * @description
 *
*/

define( ['N/log', 'N/query', 'N/record'], function (log, query, record) {

    function getInputData(context) {
        try {
            let suiteql = `SELECT id, name, subsidiaryrestriction FROM role WHERE subsidiaryoption = 'SELECTED' AND isinactive = 'F' --AND id = 1811`; // Ejecutar para 1 solo rol para verificar
            let result = _executeQuery(suiteql);
            if ( result ) return result;
            return [];
        } catch (error) {
            log.error("ERROR getInputData")
            return true;
        }
    }

    function map(context){
        try {
            const data = JSON.parse(context.value);

            //if ( role.getValue({fieldId: 'subsidiaryrestriction'}) == 3 ) return;
            let role = record.load({ type: 'role', id: data.id, isDynamic: false });
            let subsidiaria = Number(role.getValue({fieldId: 'subsidiaryrestriction'}))
            if ( subsidiaria == 3 ) return;
            log.debug("MAP", `*-*-*-*-*-*-*-*-*-*-* ${ role.getValue({fieldId: 'subsidiaryrestriction'})} - ${ role.getValue({fieldId: 'name'})} *-*-*-*-*-*-*-*-*-*-*`);

            // ! Subficha formularios > transaccion personalizada = tranformprefs
            let lineCount = role.getLineCount({ sublistId: 'tranformprefs' });
            for (let i = 0; i < lineCount; i++) {
                // Seleccionar los formularios de entidad: empleado
                // entitytype == Employee
                let trantype = role.getSublistValue({sublistId: 'tranformprefs', fieldId: 'trantype', line: i });

                //  Muestra el nombre del formulario personalizado
                let trantemplatename = role.getSublistValue({ sublistId: 'tranformprefs', fieldId: 'trantemplatename', line: i });

                // Id del formulario personalizado
                let formulario_personalizado_id = role.getSublistValue({ sublistId: 'tranformprefs', fieldId: 'trantemplate', line: i });

                // [ROL] FORMULARIO > ENTIDAD > TIPO
                if ( trantype == 'Estimate') {
                        // Si el rol es de la subsidiaria [Empresa principal : CARSEG id:2]
                    if ( role.getValue({fieldId: 'subsidiaryrestriction'}) == 2 ) {
                        // Formulario
                        if ( [212].includes(formulario_personalizado_id) ){
                            log.debug(`Subsidiary: ${role.getValue({fieldId: 'subsidiaryrestriction'})}`, `Formulario ${trantemplatename} No permitido ❌ ❌`);
                            role.setSublistValue({ sublistId: 'tranformprefs', fieldId: 'transtored', line: i,value: true });
                            role.setSublistValue({ sublistId: 'tranformprefs', fieldId: 'tranenabled', line: i, value: false });
                            role.setSublistValue({ sublistId: 'tranformprefs', fieldId: 'tranpreferred', line: i, value: false });
                            //role.setSublistValue({ sublistId: 'entityformprefs', fieldId: 'entityrestricted', line: i, value: false });
                        }
                    }
                }
            }
            role.save({ enableSourcing: true, ignoreMandatoryFields: true });
        } catch (error) {
            log.error("ERROR map", error.stack);
        }
    }

    function reduce(params) {
        try {
            log.debug("reduce");
            return true;
        } catch (error) {
            log.error("ERROR reduce");
            return true;
        }
    }

    function summarize(params) {
        try {
            log.debug("summarize");
            return true;
        } catch (error) {
            log.error("ERROR summarize");
            return true;
        }
    }

    function _executeQuery(sqlQuery, params = []) {
        try {
            // Aseguramos que params sea un array válido
            if (!Array.isArray(params)) {
                params = [];
            }
            let resultSet = query.runSuiteQL({ query: sqlQuery, params: params });
            let results = resultSet.asMappedResults();
            if (results.length > 0) {
                return results.map(obj => {
                    return Object.fromEntries(
                        Object.entries(obj).map(([key, value]) => [
                            key,
                            typeof value === 'string' ? value.replace(/\n/g, " ") : value === null ? "" : value
                        ])
                    );
                });
            } else {
                return false;
            }
        } catch (error) {
            log.error("_executeQuery error", error);
        }
    }


    return { getInputData, map, reduce, summarize }

} )