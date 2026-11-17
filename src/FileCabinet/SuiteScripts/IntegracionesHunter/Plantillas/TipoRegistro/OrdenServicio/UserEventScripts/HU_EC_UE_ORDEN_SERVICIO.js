/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/runtime', 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT', 'N/log'], (search, runtime, _toolkit, log) => {
    const beforeLoad = (scriptContext) => {

        try{
            let ftl = 0 // Valor para la plantilla a utilizar (Para pantallas con más de 1 plantilla)
            const form = scriptContext.form;
            form.clientScriptModulePath = 'SuiteScripts/IntegracionesHunter/Plantillas/ClientScripts/HU_EC_CS_STANDARD_PDF.js'

            var objRecord = scriptContext.newRecord;
            var id = objRecord.id;
            var type = objRecord.type;
            var tranIdStart  = (objRecord.getValue('tranid') ?? '').slice(0,3) // No mostrar en OS de Proveeduría

            const custScript = "customscript_hu_ec_st_orden_servicio";
            const custDeploy = "customdeploy_hu_ec_st_orden_servicio";

            if (scriptContext.type === scriptContext.UserEventType.VIEW && tranIdStart != 'OSP') {
                try{
                    ftl = 1 // 1 - Plantilla de Acta de Recepción

                    let bienId = objRecord.getValue({fieldId: 'custbody_ht_so_bien'}); 

                    if(bienId){
                        if(esVehiculoTerrrestre(bienId) && existeRecepcion(id)){
                            form.addButton({
                                id: "custpage_print_acta_button",
                                label: "Acta Recepción",
                                functionName: `customButtonFunction('${type}','${id}','${custScript}','${custDeploy}','${ftl}')`
                            });
                        }
                    }
                }catch(error){
                    log.error('Error-btn-Acta', error);
                }

                try{
                    ftl = 2 // 2 - Plantilla base de Orden de Servicio

                    form.addButton({
                        id: "custpage_print_os_button",
                        label: "Imprimir OS",
                        functionName: `customButtonFunction('${type}','${id}','${custScript}','${custDeploy}','${ftl}')`
                    });

                }catch(error){
                    log.error('Error-btn-OS', error);
                }
            }

            let usuario = runtime.getCurrentUser();
            if(usuario.subsidiary == 2 && usuario.role != 1811){
                let renovacion_aplicada = form.getField({id: 'custbody_ht_so_renovacion_aplicada'});
                renovacion_aplicada.updateDisplayType({ displayType: "HIDDEN" });

            }

          // MRAMOS 08/10/2025
          // 1894 EC - DesarrolloTI
           if(scriptContext.type === scriptContext.UserEventType.VIEW && usuario.subsidiary == 2){
             if( [1894].includes(usuario.role)) {
               let record = scriptContext.newRecord;
               let entity = record.getText({ fieldId: 'entity' });
               let campos_sensibles = {
                 ORDEN_SERVICIO: [
                   { fieldId: 'entity', nextTo: 'entity', position: 'NONE'},
                   { fieldId: 'custbody_ht_so_bien', nextTo: 'custbody_ht_so_bien', position: 'NONE'},
                   { fieldId: 'billaddress', nextTo: 'billaddress', position: 'STARTCOL'},
                   { fieldId: 'custbody_ht_facturar_a', nextTo: 'custbody_ht_facturar_a', position: 'STARTCOL'},
                 ]
               }
               _toolkit.ofuscarCampos(scriptContext, campos_sensibles.ORDEN_SERVICIO);

               let os_title = form.addField({
                 id: 'custpage_os_title',
                 type: 'INLINEHTML',
                 label: 'Ofuscar os title'
               });
               os_title.defaultValue = `
               <script>
               ( function() {
                   function ofuscarElemento(selector) {
                     const elemento = document.querySelector(selector);
                     if (!elemento) return;
             
                     const textoOriginal = elemento.innerText.trim();
                     if (textoOriginal.length <= 9) return;
             
                     // Mantiene los primeros 9 caracteres visibles
                     const textoOfuscado = textoOriginal
                       .split('')
                       .map((c, i) => {
                         if (i < 9) return c;
                         // return /[A-Za-z0-9]/.test(c) ? 'X' : c;
                         return /[A-Za-z]/.test(c) ? 'X' : c;
                       })
                       .join('');
             
                     elemento.innerText = textoOfuscado;
                   }

                   function ofuscarTituloYId() {
                     ofuscarElemento('.uir-record-name'); // título principal
                     ofuscarElemento('.uir-record-id');   // ID del registro
                     ofuscarElemento('.listtext uir-list-row-cell');   // correo
                   }

                   window.addEventListener('load', ofuscarTituloYId);
                 } 
               )();
               </script>
               `
             }
           }

         //  if( (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) && ![1811, 1894].includes(usuario.role) ){
         //    let deshabilitar_campos = {
         //      ORDEN_SERVICIO: [
         //        { fieldId: 'custbody_ec_estado_factura_interna'},
         //        { fieldId: 'custbody_ht_factura_directa'},
         //        { fieldId: 'custbody_ec_estado_factura_agrupada'},
         //      ]
         //    }
         //    _toolkit.deshabilitarCampos(scriptContext, deshabilitar_campos.ORDEN_SERVICIO );
         //  }

         // if( scriptContext.type == scriptContext.UserEventType.EDIT && ![1811].includes(usuario.role)  ) {
         //   scriptContext.form.addField({
         //        id: 'custpage_btn_void',
         //        label: ' ',
         //        type: 'INLINEHTML'
         //    }).defaultValue = `
         //    <script>
         //      document.addEventListener('DOMContentLoaded', function() {
         //        try{
         //          const btnAnular = document.querySelector('#tbl_void'); if (btnAnular)  btnAnular.style.display = 'none';
         //        }catch(error){
         //         console.log(error);
         //        }
         //      });
         //    </script>`;
         // }

         // scriptContext.form.addField({
         //   id: 'custpage_btn_closeremaining',
         //   label: ' ',
         //   type: 'INLINEHTML'
         // }).defaultValue = `
         // <script>
         //   document.addEventListener('DOMContentLoaded', function() {
         //   try {
         //    const btn = document.getElementById('closeremaining');
         //    if (!btn) {
         //      return;
         //    }
         //    const originalOnClick = btn.getAttribute('onclick');
         //      btn.removeAttribute('onclick');
         //     btn.addEventListener('click', function (e) {
         //     e.preventDefault();
         //     const self = this;
         //     const confirmed = confirm("¿Está seguro que desea cerrar la orden ${scriptContext.newRecord.id}?");
         //     if (confirmed) {
         //       const func = new Function(originalOnClick);
         //       func.call(self);
         //       console.log(originalOnClick)
         //     }
         //    });
         //   } catch (error) {
         //     console.log('Error en script inline:', error);
         //   }
         // });
         // </script>`;
        }catch(error){
            log.error('Error', error);
        }
    }

    const esVehiculoTerrrestre = (id) => {
        var searchVehicleType = search.lookupFields({
            type: "customrecord_ht_record_bienes",
            id: id,
            columns: [
                'custrecord_ht_bien_tipobien'
            ]
        });
        let esVehiculo = false
        let tipobien = searchVehicleType.custrecord_ht_bien_tipobien?.length != 0 ? searchVehicleType.custrecord_ht_bien_tipobien[0].value : ""
        if(tipobien == 1){ // 1 es para vehiculos terrestres
            esVehiculo = true
        }
        return esVehiculo
    }

    const existeRecepcion = (id) => {
        let activitySearchObj = search.create({
            type: "activity",
            filters: [
                ["type", "anyof", "Event"], // Las Recepciones son de tipo Event
                "AND",
                ["transaction.internalid", "anyof", id]
            ],
            columns: [
                search.createColumn({name: "internalid", label: "Internal ID"})
            ]
        });
        let result = activitySearchObj.run().getRange({ start: 0, end: 1 });
        return result.length > 0;
    }

    return {
        beforeLoad : beforeLoad
    };
})