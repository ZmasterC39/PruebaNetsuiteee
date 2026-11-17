/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/query', 'N/log', 'N/currentRecord', 'N/ui/dialog', 'N/https', 'N/ui/message'], function (query, log, currentRecord, dialog, https, message) {

    function pageInit(context) {

        //limpiar el campo de respuesta antes de entrar

        var currentRecord = context.currentRecord;

        var respuesta = currentRecord.getValue({
            fieldId: 'custentity_ht_cl_actualizado_plataforma'
        });

        if (respuesta != null) {
            currentRecord.setValue({
                fieldId: 'custentity_ht_cl_actualizado_plataforma',
                value: ''
            });
        }

    }

    //acciones personalizadas
    function actualizaClientePlataforma() {
        alert('Se presionó el botón');
    }

    function saveRecord(context) {
        /*
        var currentRecord = context.currentRecord;

        // Llama a la función de actualización del campo personalizado en el UserEventScript
        var updateField = currentRecord.save();

        // Verificar si el campo contiene la palabra "ACTUALIZADO"
        var customField = currentRecord.getValue({
            fieldId: 'custentity_ht_cl_actualizado_plataforma'
        });

        if (customField.indexOf('Actualizado')) {
            // Mostrar un mensaje de error y evitar que el registro se guarde
            dialog.alert({
                title: 'Error de validación',
                message: 'No se puede guardar el registro. El campo personalizado no contiene la palabra "ACTUALIZADO".'
            });
            return false; // Evita que el registro se guarde
        } else {
            // Mostrar un mensaje de éxito y permitir que el registro se guarde
            dialog.alert({
                title: 'Validación exitosa',
                message: 'El registro se guardó correctamente.'
            });
            return true; // Permite que el registro se guarde
        }

        // Permite que el registro se guarde
        */
        return true;
    }


    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        actualizaClientePlataforma: actualizaClientePlataforma
    }
});
