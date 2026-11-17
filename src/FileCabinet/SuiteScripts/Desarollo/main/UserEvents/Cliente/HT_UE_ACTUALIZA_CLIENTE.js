/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @param {Form} contex.form
 */
define(['N/log', 'N/https', 'N/runtime'], function (log, https, runtime) {

    var confirmaMigraAMI_PX

    function beforeLoad(context) {

        //limpiar el campo de respuesta antes de entrar

        var currentRecord = context.newRecord;
        var type = context.type;

        if (type === 'create') {
            return;
        }

        if (type === 'edit') {

            var respuesta = currentRecord.getValue({
                fieldId: 'custentity_ht_cl_actualizado_plataforma'
            });

            if (respuesta != null) {
                currentRecord.setValue({
                    fieldId: 'custentity_ht_cl_actualizado_plataforma',
                    value: ''
                });
            }
            /*
            //generar boton
            const form = context.form;
            form.addButton({
                id: 'custpage_actualiza_plataforma',
                label: 'Actualizar en Plataforma',
                functionName: 'actualizaClientePlataforma'
            });

            form.clientScriptModulePath = 'SuiteScripts/Desarollo/main/ClientScripts/HT_CS_ACTUALIZA_CLIENTE.js';
            */
        }

    }

    function beforeSubmit(context) {
/*
        var currentRecord = context.newRecord;
        
        currentRecord.setValue({
            fieldId: 'custentity_ht_cl_actualizado_plataforma',
            value: 'GAA'
        });
        */
    }


    function afterSubmit(context) {
        log.debug({ 'title': 'beforeSubmit', 'details': 'xdd' });
    
        try {
            if (context.type === 'edit') {
                var currentRecord = context.newRecord;
                var id = currentRecord.getValue({
                    fieldId: 'id'
                });
    
                if (id != null) {
                    var currentUser = runtime.getCurrentUser();
                    var usuarioNombre = currentUser.name;
    
                    // Guarda los valores originales antes de realizar cambios
                    var originalValues = {};
                    currentRecord.getFields().forEach(function (fieldId) {
                        originalValues[fieldId] = currentRecord.getValue({ fieldId: fieldId });
                    });
    
                    var body = {
                        "clienteIdInterno": id,
                        "action": "test",
                    }
    
                    let resletHeaders = {
                        'Content-Type': 'application/json',
                        'Accept': '/'
                    }
    
                    let resletResponse = https.requestRestlet({
                        body: JSON.stringify(body),
                        deploymentId: 'customdeploy_ht_routecliente',
                        scriptId: 'customscript_ht_routecliente',
                        headers: resletHeaders
                    });
                    let response = resletResponse.body;
    
                    responseparse = JSON.parse(response);
    
                    log.debug({ 'title': 'resultado del servicio no validado', 'details': response });
    
                    var resPX = '';
                    var resAMI = '';
    
                    
                    if (responseparse.px && responseparse.px.status === 200) {
                        resPX = 'Actualizado en PX ' + obtenerFechaYHoraActual();
                        log.debug({ 'title': 'Resultado del servicio PX exitoso', 'details': responseparse.px });
                    } else if (responseparse.px) {
                        log.debug({ 'title': 'Resultado del servicio PX error', 'details': responseparse.px });
                        // Revierte los cambios en NetSuite utilizando los valores originales
                        currentRecord.getFields().forEach(function (fieldId) {
                            currentRecord.setValue({
                                fieldId: fieldId,
                                value: originalValues[fieldId]
                            });
                        });

                        // Sube el registro actualizado con los valores originales
                        var recordId = currentRecord.save();
                        log.debug({ 'title': 'Rollback exitoso', 'details': 'Registro revertido con ID: ' + recordId });

                    }
    
                    if (responseparse.ami && responseparse.ami.status === 200) {
                        resAMI = 'Actualizado en AMI ' + obtenerFechaYHoraActual();
                        log.debug({ 'title': 'Resultado del servicio AMI exitoso', 'details': responseparse.ami });
                    } else if (responseparse.ami) {
                        log.debug({ 'title': 'Resultado del servicio AMI error', 'details': responseparse.ami });
                        // Revierte los cambios en NetSuite utilizando los valores originales
                        currentRecord.getFields().forEach(function (fieldId) {
                            currentRecord.setValue({
                                fieldId: fieldId,
                                value: originalValues[fieldId]
                            });
                        });

                        // Sube el registro actualizado con los valores originales
                        var recordId = currentRecord.save();
                        log.debug({ 'title': 'Rollback exitoso', 'details': 'Registro revertido con ID: ' + recordId });
                    }
    
                    log.debug({ 'title': 'Resultado del servicio', 'details': resPX + ' || ' + resAMI });
    
                    confirmaMigraAMI_PX = resPX + ' || ' + resAMI;
                    
    /*
                    // Realiza el rollback en caso de error
                    if (resPX != '' && resAMI != '') {
                        log.error('Error en el proceso de actualización externa');
                        // Revierte los cambios en NetSuite utilizando los valores originales
                        currentRecord.getFields().forEach(function (fieldId) {
                            currentRecord.setValue({
                                fieldId: fieldId,
                                value: originalValues[fieldId]
                            });
                        });
                        // Sube el registro actualizado con los valores originales
                        var recordId = currentRecord.save();
                        log.debug({ 'title': 'Rollback exitoso', 'details': 'Registro revertido con ID: ' + recordId });
                    } else if (resPX != '' || resAMI != '') {
                        // Revierte los cambios en NetSuite utilizando los valores originales
                        currentRecord.getFields().forEach(function (fieldId) {
                            currentRecord.setValue({
                                fieldId: fieldId,
                                value: originalValues[fieldId]
                            });
                        });

                        // Sube el registro actualizado con los valores originales
                        var recordId = currentRecord.save();
                        log.debug({ 'title': 'Rollback exitoso', 'details': 'Registro revertido con ID: ' + recordId });
                        
                    } 
                    */
    
                } else {
                    log.debug({ 'title': 'fieldValue', 'details': 'No se obtuvo el id del registro' });
                }
            }
        } catch (error) {
            log.error('Error en beforeSubmit', error);
        }
    }

    
    function obtenerFechaYHoraActual() {
        const fecha = new Date();

        // Configurar la zona horaria a GMT-5 (Ecuador)
        const options = { timeZone: 'America/Guayaquil' };
        const fechaEcuador = new Date(fecha.toLocaleString('en-US', options));

        const dia = fechaEcuador.getDate().toString().padStart(2, '0');
        const mes = (fechaEcuador.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaEcuador.getFullYear();

        const horas = fechaEcuador.getHours().toString().padStart(2, '0');
        const minutos = fechaEcuador.getMinutes().toString().padStart(2, '0');
        const segundos = fechaEcuador.getSeconds().toString().padStart(2, '0');

        const fechaYHoraFormateada = `${año}/${mes}/${dia} ${horas}:${minutos}:${segundos}`;
        return fechaYHoraFormateada;
    }


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
