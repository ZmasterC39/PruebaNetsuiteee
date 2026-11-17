/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * @author Mauro F Ramos
 * @date Created at: 31/05/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
*/

define(['N/runtime', 'N/ui/serverWidget', 'N/log', 'N/search'], function (runtime, serverWidget, log, search) {

    function onRequest( context ){
        let form;
        try {
            let { role: userRol, subsidiary} = runtime.getCurrentUser();
            let tipo_proceso = context.request.parameters.tipo_proceso || false;
            let page;

          log.debug("tipo_proceso", tipo_proceso)

            switch (tipo_proceso) {
                case '1':
                    page = 'EC Agrupa Factura Directa'
                    break;
                case '2':
                    page = 'EC Emisión Masiva de Facturas Internas'
                    break;
                default:
                    page = ''
                    break;
            }

            if( subsidiary !== 2 || !tipo_proceso){
                form = serverWidget.createForm({title: 'No tienes permisos para ver esta página'});
                context.response.writePage(form);
                return;
            }

            form = serverWidget.createForm( { title: `Estado del proceso: ${page}`});
            form.clientScriptModulePath = 'SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_ESTADO.js'

            let fecha_inicio = context.request.parameters.fecha_inicio;
            let fecha_fin = context.request.parameters.fecha_fin;

            _uiMain(context, form, tipo_proceso, fecha_inicio, fecha_fin);
            if(tipo_proceso || fecha_inicio || fecha_fin){
                _uiSublist(form, tipo_proceso, fecha_inicio, fecha_fin);
            }

            context.response.writePage(form);

        } catch (error) {
            log.eror("ERROR: onRequest", error.stack)
        }
    }

    function _uiSublist(form, tipo_proceso, fecha_inicio, fecha_fin){
        try {
            let sublist = form.addSublist({
                id: 'custpage_sublist',
                type: serverWidget.SublistType.LIST,
                label: "Procesos"
            });

            sublist.addRefreshButton();

            if (fecha_inicio === undefined) {
                let hoy = new Date();
                let dia = String(hoy.getDate()).padStart(2, '0');
                let mes = String(hoy.getMonth() + 1).padStart(2, '0');
                let anio = hoy.getFullYear();

                fecha_inicio = `${dia}/${mes}/${anio}`;
            }


            if( fecha_fin === undefined ){
                let hoy = new Date();
                let dia = String(hoy.getDate()).padStart(2, '0');
                let mes = String(hoy.getMonth() + 1).padStart(2, '0');
                let anio = hoy.getFullYear();
                fecha_fin = `${dia}/${mes}/${anio}`;
            }

            if( !tipo_proceso) {
                return;
            }

            sublist.addField({ id: 'custpage_id', type: serverWidget.FieldType.TEXT, label: 'ID',  });
            sublist.addField({ id: 'custpage_custrecord_registro_actividad_estado', type: serverWidget.FieldType.TEXT, label: 'Estado' });
            sublist.addField({ id: 'custpage_custrecord_registro_actividad_cliente', type: serverWidget.FieldType.TEXT, label: 'Cliente' });
            sublist.addField({ id: 'custpage_custrecord_registro_actividad_detalle', type: serverWidget.FieldType.TEXT, label: 'Detalle' });
            sublist.addField({ id: 'custpage_custrecord_registro_actividad_fecha_inic', type: serverWidget.FieldType.TEXT, label: 'Fecha de Inicio' });
            sublist.addField({ id: 'custpage_custrecord_registro_actividad_fecha_fin', type: serverWidget.FieldType.TEXT, label: 'Fecha de Fin' });
            sublist.addField({ id: 'custpage_owner', type: serverWidget.FieldType.TEXT, label: 'Creado por' });

            let data = _get_cola(tipo_proceso, fecha_inicio, fecha_fin);

            data.forEach((item, index) => {
                Object.keys(item).forEach((key) => {
                    sublist.setSublistValue({
                        id: `custpage_${key}`,
                        line: index,
                        value: item[key] || '-'
                    })
                })
            })


        } catch (error) {
            log.error("ERROR _uiSublist", error.stack)
        }
    }

    function _get_cola(tipo_proceso, fecha_inicio, fecha_fin){
        try {
            let filters = [
                ["custrecord_registro_actividad_subsidiary","anyof","2"]
            ];
            let data = [];


            if( fecha_inicio && fecha_fin) {
                filters.push("AND");
                filters.push(["created","within",`${fecha_inicio}`,`${fecha_fin}`])
            }

            if( tipo_proceso ){
                filters.push("AND");
                filters.push(["custrecord_registro_actividad_nombre","anyof",tipo_proceso]);
            }

            var customrecord_registro_actividadSearchObj = search.create({
                type: "customrecord_registro_actividad",
                filters,
                columns:
                [
                    search.createColumn({name: "internalid", label: "ID", sort: search.Sort.DESC}),
                    search.createColumn({name: "custrecord_registro_actividad_estado", label: "Estado"}),
                    search.createColumn({name: "custrecord_registro_actividad_cliente", label: "Cliente"}),
                    search.createColumn({name: "owner", label: "Propietario"}),
                    search.createColumn({name: "custrecord_registro_actividad_detalle", label: "Detalle"}),
                    search.createColumn({name: "custrecord_registro_actividad_fecha_inic", label: "Fecha inicio"}),
                    search.createColumn({name: "custrecord_registro_actividad_fecha_fin", label: "Fecha Fin"})
                ]
            });
            var searchResultCount = customrecord_registro_actividadSearchObj.runPaged().count;
            customrecord_registro_actividadSearchObj.run().each(function(result){
                data.push({
                    id: result.id,
                    custrecord_registro_actividad_estado: result.getText({ name: 'custrecord_registro_actividad_estado'}),
                    custrecord_registro_actividad_cliente: result.getText({ name: 'custrecord_registro_actividad_cliente'}),
                    owner: result.getText('owner'),
                    custrecord_registro_actividad_detalle: result.getValue( { name: 'custrecord_registro_actividad_detalle'}),
                    custrecord_registro_actividad_fecha_inic: result.getValue( { name: 'custrecord_registro_actividad_fecha_inic'}),
                    custrecord_registro_actividad_fecha_fin: result.getValue({ name: 'custrecord_registro_actividad_fecha_fin'})
                })
            return true;
            });

            return data;
        } catch (error) {
            log.error("ERROR: _get_cola", error.stack);
        }
    }

    function _uiMain(context, form, proceso, fecha_inicio_param, fecha_fin_param){
        try {
            form.addFieldGroup({
                id: 'custpage_seccion_busqueda',
                label: 'Filtros de búsqueda',
            });

            let fecha_inicio = form.addField({
                id: 'custpage_fecha_inicio',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Inicio',
                container: 'custpage_seccion_busqueda'
            });
            fecha_inicio.defaultValue = fecha_inicio_param || new Date();
            fecha_inicio.isMandatory = true;

            let fecha_fin = form.addField({
                id: 'custpage_fecha_fin',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Fin',
                container: 'custpage_seccion_busqueda'
            });
            fecha_fin.defaultValue = fecha_fin_param || new Date();
            fecha_fin.isMandatory = true;

            var tipo_proceso = form.addField({
                id: 'custpage_tipo_proceso',
                label: 'Tipo proceso',
                type: serverWidget.FieldType.SELECT,
                source: 'customlist_tipo_proceso',
                container: 'custpage_seccion_busqueda'
            });
            tipo_proceso.defaultValue = proceso;
            tipo_proceso.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

        } catch (error) {
            log.error("ERROR: _uiMain", error.stack)
        }
    }

    return { onRequest }

});