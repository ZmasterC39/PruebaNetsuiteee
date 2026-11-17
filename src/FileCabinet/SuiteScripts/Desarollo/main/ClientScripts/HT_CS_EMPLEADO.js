/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['../Models/modelGeneral'], function (modelGeneral) {

    function pageInit(context) {

        //cargar la funcion que trae la lista de empleados
        var listaEmpleados = modelGeneral.getCodSYSEmpleados()

        console.log('listaEmpleados', listaEmpleados);

    }

    function saveRecord(context) {

    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord
    }
});