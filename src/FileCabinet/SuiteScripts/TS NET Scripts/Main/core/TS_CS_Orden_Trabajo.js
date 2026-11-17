/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define([
    'N/currentRecord',
    'N/record',
    'N/ui/dialog',
    'N/query',
    '../controller/TS_CM_Controller',
    '../constant/TS_CM_Constant',
    '../error/TS_CM_ErrorMessages',
  'N/runtime',
  'SuiteScripts/IntegracionesHunter/Validaciones/Librerias/HU_EC_LIB_CONTROL_FORMULARIO.js'
], (currentRecord, record, dialog, query, _controller, _constant, _errorMessage, runtime, _controlFormulario) => {
    const SENSOR_TEMPERATURA = '75';
    const ESTADO_CHEQUEADO = 2;
    let typeMode;
    var idPredeterminado = 0; //estado de dispositivo por accion
  
    const pageInit = (context) => {
        let currentRecord = context.currentRecord;
        typeMode = context.mode;
        console.log('typeMode', typeMode);
        let usuario = runtime.getCurrentUser();

        let item = currentRecord.getValue({ fieldId: 'custrecord_ht_ot_item' });
        let itemRelacionado =currentRecord.getValue({ fieldId: 'custrecord_ht_ot_itemrelacionado' }); //MLNY 07-2025
        
        if (item.length > 0) {
            let parametrosRespo = _controller.parametrizacion(item);
            let estadoOT = currentRecord.getValue('custrecord_ht_ot_estado');
            //console.log('parametrosRespo', parametrosRespo);
            let parametro = 0;
            for (let j = 0; j < parametrosRespo.length; j++) {
                if (parametrosRespo[j][0] == SENSOR_TEMPERATURA) {
                    parametro = parametrosRespo[j][1];
                }
            }
            //console.log('parametro', parametro);
              
            if (parametro != '9') {
                //var form = context.form;
                var myField = currentRecord.getField('custrecord_ht_ot_termometro');
                myField.isVisible = false;
            }
           

            if (typeMode == 'edit' && estadoOT == _constant.Status.CHEQUEADO) {
                currentRecord.getField('custrecord_ht_ot_supervisorasignacion').isDisabled = true
                currentRecord.getField('custrecord_ht_ot_tecnicoasignacion').isDisabled = true
                currentRecord.getField('custrecord_ht_ot_fechatrabajoasignacion').isDisabled = true
                currentRecord.getField('custrecord_ht_ot_horatrabajoasignacion').isDisabled = true
                currentRecord.getField('custrecord_ht_ot_serieproductoasignacion').isDisabled = true
                currentRecord.getField('custrecord_ht_ot_ubicacion').isDisabled = true
                //currentRecord.getField('custrecord_ht_ot_estadochaser').isDisabled = true
                currentRecord.getField('custrecord_ht_ot_motivos').isDisabled = true
                currentRecord.getField('custrecord_ht_ot_fueraciudad').isDisabled = true
                currentRecord.getField('custrecord_ht_ot_fuerataller').isDisabled = true
                currentRecord.getField('custrecord_ht_ot_connovedad').isDisabled = true
                currentRecord.getField('custrecord_ht_ot_listacomentarios').isDisabled = true
            }

            // console.log(item);
            // let sql = 'SELECT custrecord_ht_pp_parametrizacion_valor as valor FROM customrecord_ht_pp_main_param_prod ' +
            //     'WHERE custrecord_ht_pp_parametrizacionid = ? AND custrecord_ht_pp_parametrizacion_rela = ?';
            // let resultSet = query.runSuiteQL({ query: sql, params: [item, parametro] });
            // let results = resultSet.asMappedResults();
            // let valor = results.length > 0 ? results[0]['valor'] : 0;
            let dsr = _controller.getParameter(item, _constant.Parameter.DSR_DEFINICION_DE_SERVICIOS)
            console.log(dsr);
            if (dsr != _constant.Valor.SI) {
                 
                let field = currentRecord.getField('custrecord_ht_ot_servicios_commands');
                field.isDisplay = false;
                
                let field2 = currentRecord.getField('custrecord_ht_ot_numero_puertas');
                field2.isDisplay = false;
            }

            // if (typeMode == 'edit' && currentRecord.getValue('custrecord_flujo_de_convenio')) {
            let myFieldEstadoOT = currentRecord.getField('custrecord_ht_ot_estado');
            myFieldEstadoOT.isDisabled = true;
            // }

           //log.debug('subsidiaria....', usuario.subsidiary);
           if (usuario.subsidiary == _constant.Constants.ECUADOR_SUBSIDIARY) {                
                let idEstadoDispositivo = currentRecord.getValue('custrecord_ht_ot_estadochaser');       
                let estadoDispositivo = currentRecord.getText('custrecord_ht_ot_estadochaser');
                if (typeMode == 'edit' && (estadoOT != _constant.Status.CERRADO && estadoOT != _constant.Status.CHEQUEADO)) {
                    if (estadoDispositivo == '') 
                    {              
                        let accion = _controller.getParameter(itemRelacionado,  _constant.Parameter.ADP_ACCION_DEL_PRODUCTO);
                        log.debug('_constant.Parameter.EDC_ENTREGA_DIRECTA_A_CLIENTE', _constant.Parameter.EDC_ENTREGA_DIRECTA_A_CLIENTE)
                        let valorEdc = _controller.getParameter(itemRelacionado,  _constant.Parameter.EDC_ENTREGA_DIRECTA_A_CLIENTE);
                        let entregaDirecta = _controller.getValorParameter(itemRelacionado,  _constant.Parameter.EDC_ENTREGA_DIRECTA_A_CLIENTE,valorEdc);
                                              
                        //log.debug('PI valor....', accion);    
                        //log.debug('PI valorEdc....', valorEdc);   
                        //log.debug('PI entregaDirecta....', entregaDirecta);     
                        idPredeterminado = _controller.getEstadoPredeterminado(accion,entregaDirecta) 
                        
                        if(idPredeterminado !=0)  {
                        currentRecord.setValue({
                            fieldId: 'custrecord_ht_ot_estadochaser',
                            value: idPredeterminado
                        });    
                        }                   
                   }else{
                        idPredeterminado = idEstadoDispositivo;
                   } 
                   //log.debug('PI idPredeterminado....', idPredeterminado);
                }                 
           } //hasta aqui

           // MAURO F RAMOS 11/03/2026 - Desactivar campo si el estado ya es X - NO EJECUTADO o C - CHEQUEADO o C - CERRADO
           if (estadoOT == 10 || estadoOT == 2 || estadoOT == 9) {
                currentRecord.getField('custrecord_trabajo_no_ejecutado').isDisabled = true
           }
        
 
        }

      if(usuario.subsidiary == 2){
                _controlFormulario.deshabilitarCampos(context, ['custrecord_ht_ot_fechatrabajoasignacion', 'custrecord_ht_ot_horatrabajoasignacion'] )
            }
    }

    const saveRecord = (context) => {
        if (typeMode == 'edit') {
            let currentRecord = context.currentRecord;
            let statusOT = currentRecord.getValue('custrecord_ht_ot_estado');
            let statusChaser = currentRecord.getValue('custrecord_ht_ot_estadochaser');
            let fecha_asignacion = currentRecord.getValue('custrecord_ht_ot_fecha_asignacion');
            let retorno = true;
            let casilla_verificacion = currentRecord.getValue('custrecord_trabajo_no_ejecutado');
            let novedades_no_ejecutadas = currentRecord.getValue('custrecord_lt_ot_novedades_no_ejecutadas');
            //console.log('Response', statusOT + ' - ' + statusChaser)
            if (statusOT == ESTADO_CHEQUEADO && statusChaser.length == 0) {
                dialog.alert({ title: 'Alerta', message: 'Debe ingresar un estado para dispositivo Chaser.' });
                retorno = false;
            }

            if (statusOT == ESTADO_CHEQUEADO && fecha_asignacion.length == 0) {
                dialog.alert({ title: 'Alerta', message: 'Debe ingresar una Fecha de Ejecución del trabajo.' });
                retorno = false;
            }

            /* MAURO F RAMOS 11/03/2026
                Validaciones del nuevo flujo, trabajo no ejecutado
                 - Si la casilla de verificación "Trabajo no ejecutado" está marcada, el campo de novedades no debe estar vacío y el estado de la Orden de trabajo debe ser "X - No Ejecutado".
            */
            if (casilla_verificacion == true){
                if ( novedades_no_ejecutadas == ''){
                    dialog.alert({ title: 'Alerta', message: 'Debe ingresar una novedad para el trabajo no ejecutado.' });
                    setTimeout(function () {
                        var el = document.getElementById('custrecord_lt_ot_novedades_no_ejecutadas_display');
                        if (el) {
                            el.focus();
                            el.select(); // opcional
                        }
                    }, 50);
                    retorno = false;
                }

                if ( statusOT != 10 ) {
                    dialog.alert({ title: 'Alerta', message: 'El estado de la Orden de trabajo establecido debe ser "X - No Ejecutado" luego de marcar la casilla e ingresar una novedad.' });
                    retorno = false;
                }
            }else {
                // - La casilla verificación esta marcada, el estado de la OT es "X - No Ejecutado", pero el campo de novedades está vacío.
                if ( statusOT == 10 && novedades_no_ejecutadas != '') {
                    dialog.alert({ title: 'Alerta', message: 'La casilla "Trabajo no ejecutado" debe estar marcada si el estado de la Orden de trabajo es "X - No Ejecutado".' });
                    retorno = false;
                }
            }
            return retorno
        } else {
            return true;
        }
    }

    const reloadFuncion = (url) => { alert(url) }

    // GALVAR 03-08-2026
   const evaluarParDatosTecnico = (osId, itemRelActual) => {
       try {
           let sql =
               "SELECT ot.custrecord_ht_ot_itemrelacionado AS itemrel, " +
               "       ot.custrecord_ht_ot_estado AS estado, " +
               "       val.custrecord_ht_pp_codigo AS adp " +
               "FROM customrecord_ht_record_ordentrabajo ot " +
               "  INNER JOIN customrecord_ht_pp_main_param_prod mp " +
               "          ON mp.custrecord_ht_pp_parametrizacionid = ot.custrecord_ht_ot_itemrelacionado " +
               "  INNER JOIN customrecord_ht_cr_parametrizacion_produ rela " +
               "          ON rela.id = mp.custrecord_ht_pp_parametrizacion_rela " +
               "         AND rela.custrecord_ht_pp_code = 'ADP' " +
               "  INNER JOIN customrecord_ht_cr_pp_valores val " +
               "          ON val.id = mp.custrecord_ht_pp_parametrizacion_valor " +
               "WHERE ot.custrecord_ht_ot_orden_servicio = ? " ;
           let filas = query.runSuiteQL({ query: sql, params: [osId] }).asMappedResults();
           const ADP_DATOSTECNICO = '005';
           let datostecnico = filas.filter(f => String(f.adp) === ADP_DATOSTECNICO);
           let esParExacto =  datostecnico.length === 1 ;
           if (!esParExacto) {
               return { aplica: false, esDatosTecnico: false };
           }
           return {
               aplica: true,
               esDatosTecnico: true
           };
       } catch (e) {
           //console.error('Error evaluarParDatosTecnico', e);
           return { aplica: false, esDatosTecnico: false };
       }
   };
     
    function fieldChanged(context) {
        try {
         
                var currentRecord = context.currentRecord; // El registro del formulario actual.             
                let usuario = runtime.getCurrentUser();
                let resultado=0;
                let idEstadoOT = currentRecord.getValue('custrecord_ht_ot_estado');
                if (typeMode == 'edit') {
                    if(usuario.subsidiary == _constant.Constants.ECUADOR_SUBSIDIARY)
                    {   
                        /* MAURO F RAMOS 11/03/2026
                            Al seleccionar el checkbox "Trabajo no ejecutado", se muestra un mensaje indicando que se debe registrar una novedad y se enfoca el campo de novedades para el ingreso de información
                        */
                        if ( context.fieldId === 'custrecord_trabajo_no_ejecutado' && currentRecord.getValue('custrecord_trabajo_no_ejecutado') == true)  {
                            currentRecord.getField('custrecord_trabajo_no_ejecutado').isDisabled = true;
                            currentRecord.getField('custrecord_lt_ot_novedades_no_ejecutadas').isDisabled = false;
                            var options = {
                            title: 'Confirmación',
                            message: 'Si el trabajo no puede ejecutarse, registrá una novedad indicando el motivo.',
                            buttons: [{label: 'Entendido', value:true}]
                            };

                            dialog.create(options)
                            .then(function () {
                                // focus al campo de novedades
                                setTimeout(function () {
                                var el = document.getElementById('custrecord_lt_ot_novedades_no_ejecutadas_display');
                                if (el) {
                                    el.focus();
                                    el.select(); // opcional
                                }
                                }, 50);
                            })
                            .catch(function () {
                                // si cancela no hacemos nada
                            });
                        }
                        let casilla_verificacion = currentRecord.getValue('custrecord_trabajo_no_ejecutado');
                        let novedades_no_ejecutadas = currentRecord.getValue('custrecord_lt_ot_novedades_no_ejecutadas');
                        if (casilla_verificacion == true && novedades_no_ejecutadas != ''){
                            currentRecord.setValue({ fieldId: 'custrecord_ht_ot_estado', value: 10, ignoreFieldChange: true })
                        }
                        /* FIN DEL CAMBIO*/
                        if (context.fieldId == 'custrecord_ht_ot_estadochaser' && (idEstadoOT != _constant.Status.CERRADO && idEstadoOT != _constant.Status.CHEQUEADO))
                        {
                            let idEstadoDispositivo = currentRecord.getValue('custrecord_ht_ot_estadochaser');       
                            let estadoDispositivo = currentRecord.getText('custrecord_ht_ot_estadochaser');
                            let articulo = currentRecord.getValue({fieldId: 'custrecord_ht_ot_itemrelacionado'});
                            let accion = _controller.getParameter(articulo, _constant.Parameter.ADP_ACCION_DEL_PRODUCTO);
                            let valorEdc = _controller.getParameter(articulo,  _constant.Parameter.EDC_ENTREGA_DIRECTA_A_CLIENTE);
                            let entregaDirecta = _controller.getValorParameter(articulo,  _constant.Parameter.EDC_ENTREGA_DIRECTA_A_CLIENTE,valorEdc);
                            //log.debug('FC idEstadoDispositivo....', idEstadoDispositivo);
                            //log.debug('PI valor....', accion);    
                            //log.debug('PI valorEdc....', valorEdc);   
                            //log.debug('PI entregaDirecta....', entregaDirecta);     
                            //log.debug('FC idPredeterminado...', idPredeterminado);
                            if (estadoDispositivo !='' && (idPredeterminado != idEstadoDispositivo))
                            {
                                let resultado = _controller.evaluaAccionEstado(accion, idEstadoDispositivo, entregaDirecta)
                                log.debug('FC resultado ', resultado);
                                if (resultado == 0)
                                {
                                    dialog.alert({ title: 'Alerta', message: 'Estado ['+ estadoDispositivo +'], no aplica para acción de producto del trabajo a procesar.' });                                                    
                                    if(idPredeterminado !=0)  {
                                        currentRecord.setValue({
                                            fieldId: 'custrecord_ht_ot_estadochaser',
                                            value: idPredeterminado
                                        });    
                                    }                                       
                                    return false;
                                }  
                                else {
                                    idPredeterminado = idEstadoDispositivo;
                                } 
                                //log.debug('FC idPredeterminado.....', idPredeterminado);
                            }
                        }//custrecord_ht_ot_estadochaser
                        // INICIO
                        // GALVAR 03-08-2026
                        const osId = currentRecord.getValue('custrecord_ht_ot_orden_servicio');
                        const itemRel = currentRecord.getValue('custrecord_ht_ot_itemrelacionado');
                        const estado = currentRecord.getValue('custrecord_ht_ot_estado');
                        const info = evaluarParDatosTecnico(osId, itemRel);
                        if ( context.fieldId === 'custrecord_ht_ot_serieproductoasignacion' && info.aplica && info.esDatosTecnico && estado === '4') {
                            console.log('info', info);
                            if (currentRecord.getValue('custrecord_ht_ot_serieproductoasignacion').length > 0) { 
                               console.log('info', currentRecord.getValue('custrecord_ht_ot_serieproductoasignacion'));
                               var serieChaser = currentRecord.getValue('custrecord_ht_ot_serieproductoasignacion');
                               console.log('serieChaser', serieChaser);
                               let sql3 = 'SELECT custrecord_ht_mc_seriedispositivo from customrecord_ht_record_mantchaser where id = ?';
                               let results3 = query.runSuiteQL({ query: sql3, params: [serieChaser] }).asMappedResults();
                               console.log('results3', results3[0].custrecord_ht_mc_seriedispositivo);
                               var seriedispositivo = results3[0].custrecord_ht_mc_seriedispositivo;
                               console.log('seriedispositivo', seriedispositivo);
                               let sql4 = 'SELECT custrecord_ht_dd_vid from customrecord_ht_record_detallechaserdisp where id = ?';
                               let results4 = query.runSuiteQL({ query: sql4, params: [seriedispositivo] }).asMappedResults();
                               console.log('results4', results4[0].custrecord_ht_dd_vid);
                               var vid = results4[0].custrecord_ht_dd_vid;
                               currentRecord.setValue({ fieldId: 'custrecord_ht_ot_vid_nuevo', value: vid, ignoreFieldChange: true });
                               currentRecord.setValue({ fieldId: 'custrecord_ht_ot_vid_anterior', value: vid, ignoreFieldChange: true });
                               //procesando = true;
                            }
                        }
                        //FIN
                    }
                } 
                return true;
            } catch (error) {
                //log.error('Error', error);
                log.error("Error", { error: error.message, stack: error.stack });
            }    
    } 

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        reloadFuncion: reloadFuncion,
        fieldChanged: fieldChanged
       
    }
});
