/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/log',
    'N/search',
    'N/record',
    'N/redirect',
    'N/ui/serverWidget',
    'N/query',
    'N/error',
    '../controller/TS_CM_Controller',
    '../constant/TS_CM_Constant',
    '../error/TS_CM_ErrorMessages',
], (log, search, record, redirect, serverWidget, query, err, _controller, _constant, _error) => {
    const CUSTOMER = 'customer';
    const VENDOR = 'vendor';
    const LEAD = 'lead';
    const PROSPECT = 'prospect';
    const AUTOSAFE = 3
    const CARSEG = 2


    const beforeSubmit = (context) => {
        const objRecord = context.newRecord;
        const recordId = objRecord.id;
        if (objRecord.type == 'employee') {

            let vatregnumber = objRecord.getValue('custentity_ec_numero_registro');

            if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.COPY) {
                let existe = getNumberCustomer(recordId, vatregnumber, 'crear')
                if(existe == true){
                    var myCustomError = err.create({
                        name: 'ERROR_NUMERO_DOCUMENTO',
                        message: 'Ya existe una Empleado con el mismo DOCUMENTO DE IDENTIDAD',
                        notifyOff: false
                    });
                    throw myCustomError.message;
                }
                return false;
            } else if (context.type === context.UserEventType.EDIT) {
                let existe = getNumberCustomer(recordId, vatregnumber, 'editar')
                if(existe == true){
                    var myCustomError = err.create({
                        name: 'ERROR_NUMERO_DOCUMENTO',
                        message: 'Ya existe una Empleado con el mismo DOCUMENTO DE IDENTIDAD',
                        notifyOff: false
                    });
                    throw myCustomError.message;
                }
            }
        }
        return true;
    }

    const getNumberCustomer = (id, vatregnumber, tipoEvento) => {
        try {
            if(tipoEvento == 'crear'){
                var employeeSearchObj = search.create({
                    type: "employee",
                    filters:
                    [
                       ["custentity_ec_numero_registro","is",vatregnumber],
                       "AND", 
                       ["subsidiary","anyof",CARSEG]
                    ],
                    columns:
                    [
                       search.createColumn({name: "internalid", label: "ID interno"})
                    ]
                 });
            } else if (tipoEvento == 'editar'){
                var employeeSearchObj = search.create({
                    type: "employee",
                    filters:
                    [
                       ["custentity_ec_numero_registro","is",vatregnumber], 
                       "AND", 
                       ["internalid","noneof",id],
                       "AND", 
                       ["subsidiary","anyof",CARSEG]
                    ],
                    columns:
                    [
                       search.createColumn({name: "internalid", label: "ID interno"})
                    ]
                 });
            }
    
            let searchResultCount = employeeSearchObj.runPaged().count;
            if (searchResultCount > 0){
                return true
            }    
        } catch (error) {
            log.error('error',error)
        }
        
        return false
    }

    return {
        beforeSubmit: beforeSubmit,
    }
});
/********************************************************************************************************************
TRACKING
/********************************************************************************************************************
/* Commit:01
Version: 1.0
Date: 16/03/2021
Author: Dennis Fernández
Description: Creación del script.
===================================================================================================================*/