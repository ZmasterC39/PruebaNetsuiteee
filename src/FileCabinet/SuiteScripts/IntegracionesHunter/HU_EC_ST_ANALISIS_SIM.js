/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * @author Mauro F Ramos
 * @date 31/03/2025
 * @description
 *
 * @version 1.0
 * @notes
 * @LastModifiedBy
 */

define(['N/runtime', 'N/ui/serverWidget', 'N/search', 'N/log'], (runtime, serverWidget, search, log)=> {

    const LONGITUD_PAGINA = 50;

    function onRequest(context) {
        try {
            let {role: userRol, subsidiary} = runtime.getCurrentUser();
            if( subsidiary !== 2){
                let form = serverWidget.createForm({title: 'No tienes permisos para ver esta página'});
                context.response.writePage(form);
                return;
            }
            let form = serverWidget.createForm({title: 'ANALISIS SIMs ACTIVAS Vs SERVICIOS DEPURACION TI'});
            _uiMain(context, form);
            _uiSublist(context, form);
            context.response.writePage(form);
        } catch (error) {
            log.error({title: 'Error en el Suitelet', details: error});
        }
    }

    _uiMain = (context, form) => {
        try {
            form.addSubmitButton({
                label: 'Enviar'
            });
    
            form.addResetButton({
                label: 'Cancelar'
            });
            form.addField({
                id: 'custpage_pagina',
                type: serverWidget.FieldType.SELECT,
                label: 'Página'
            });
        } catch (error) {
            log.error({title: 'Error en la creación del formulario', details: error});
        }
    }

    _uiSublist = (context, form) => {
        try {
            let sublist = form.addSublist({
                id: 'custpage_sublista',
                type: serverWidget.SublistType.LIST,
                label: "Busqueda"
            });
    
            var coberturaSearchObj = search.create({
                type: "customrecord_ht_co_cobertura",
                filters:
                [
                   ["formulatext: {custrecord_ht_co_operadora}","isnotempty",""], 
                   "AND", 
                   ["custrecord_ht_co_propietario.entityid","doesnotstartwith","C-PE"], 
                   "AND", 
                   ["custrecord_ht_co_subsidiaria.name","doesnotcontain","AUTOSAFE S.A.C."], 
                   "AND", 
                   ["custrecord_ht_co_operadora","startswith",""], 
                   "AND", 
                   ["custrecord_ht_co_numeroserieproducto.custrecord_ht_mc_estadosimcard","anyof","1","4","7","6"], 
                   
                ],
                columns:
                [
                   search.createColumn({name: "custrecord_ht_co_coberturafinal", label: "COBERTURA FINAL"}),
                   search.createColumn({name: "internalid", label: "ID interno"}),
                   search.createColumn({name: "custrecord_ht_co_celularsimcard", label: "SIM SERIE"}),
                   search.createColumn({name: "custrecord_ht_co_operadora", label: "OPERADORA"}),
                   search.createColumn({name: "custrecord_ht_co_estado_cobertura", label: "ESTADO COBERTURA"}),
                   search.createColumn({name: "custrecord_ht_co_bien", label: "BIEN"}),
                   search.createColumn({
                      name: "altname",
                      join: "CUSTRECORD_HT_CO_BIEN",
                      label: "Nombre"
                   }),
                   search.createColumn({name: "custrecord_ht_co_propietario", label: "PROPIETARIO"}),
                   search.createColumn({
                      name: "category",
                      join: "CUSTRECORD_HT_CO_PROPIETARIO",
                      label: "CATEGORIA"
                   }),
                   search.createColumn({name: "custrecord_ht_co_producto", label: "PRODUCTO"}),
                   search.createColumn({name: "custrecord_ht_co_coberturainicial", label: "COBERTURA INICIAL"}),
                   search.createColumn({name: "custrecord_ht_co_estado", label: "ESTADO DISPOSITIVO"}),
                   search.createColumn({name: "custrecord_ht_co_familia_prod", label: "FAMILIA PRODUCTO"}),
                   search.createColumn({name: "custrecord_ht_co_nocelularsimcard", label: "SIM NUMERO CELULAR"}),
                   search.createColumn({name: "custrecord_ht_co_imei", label: "HT CO IMEI/ESN/DNID"}),
                   search.createColumn({
                      name: "custrecord_ht_mc_estadosimcard",
                      join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO",
                      label: "ESTADO DE LA SIM CARD"
                   }),
                   search.createColumn({name: "name", label: "ID"}),
                   search.createColumn({name: "created", label: "Fecha de creación"})
                ]
             });
            let ResultadoConsulta = coberturaSearchObj.runPaged({ pageSize: LONGITUD_PAGINA });
            let conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
            let pg = 0;
            let indice = pg;
            if (!indice || indice == "" || indice < 0) {
                indice = 0;
                } else if (indice > conteoPagina) {
                indice = conteoPagina;
            }
            let data = [];
            if( ResultadoConsulta.count == 0) return;
            for (let i = 0; i < conteoPagina; i++) {
                let ResPagina = ResultadoConsulta.fetch({ index: i });
                ResPagina.data.forEach(function(pageRange) {
                    // data.push(
                    //     {
                    //         id: pageRange.id,
                    //         coberturafinal: pageRange.getValue("custrecord_ht_co_coberturafinal"),
                    //         // internalid: pageRange.getValue("internalid"),
                    //         celularsimcard: pageRange.getValue("custrecord_ht_co_celularsimcard"),
                    //     }
                    // );
                });
            }
            // ResPagina.data.forEach(function(pageRange) {
            //     // log.debug("pageRange", pageRange);
            //     data.push(
            //         {
            //             id: pageRange.id,
            //             coberturafinal: pageRange.getValue("custrecord_ht_co_coberturafinal"),
            //             // internalid: pageRange.getValue("internalid"),
            //             celularsimcard: pageRange.getValue("custrecord_ht_co_celularsimcard"),
            //         }
            //     );
            // });
            // log.debug("transformedRecord", data);

            let paginaField = form.getField({ id: 'custpage_pagina' });

            // Limpia opciones previas si es necesario
            for (let index = 0; index < conteoPagina; index++) {
                paginaField.addSelectOption({
                    value: index,
                    text: index + 1
                });
            }
            paginaField.defaultValue = pg || 0;
        } catch (error) {
            log.error({title: 'Error en la creación de la sublista', details: error});
        }
    }

    return {
        onRequest: onRequest
    };
});