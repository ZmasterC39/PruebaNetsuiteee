/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/search', 'N/currentRecord', 'N/ui/message', 'N/url'], (search, currentRecord, message, url) => {
    
    let typeMode = '';
    
    // Campos que deben actualizar el name
    const DEVICE_FIELDS = [
        'custrecord_ht_mc_seriedispositivo',
        'custrecord_ht_mc_seriedispositivolojack'
    ];
    
    const pageInit = (context) => {
        typeMode = context.mode;
    }
    
    const fieldChanged = (context) => {
        // Solo procesar si es uno de los campos de dispositivo
        if (!DEVICE_FIELDS.includes(context.fieldId)) {
            return;
        }
        
        // Solo en modos de edición
        if (!['create', 'copy', 'edit'].includes(typeMode)) {
            return;
        }
        
        const objRecord = currentRecord.get();
        const serie = objRecord.getText(context.fieldId);
        
        // Solo actualizar si hay valor
        if (serie) {
            objRecord.setText({
                fieldId: 'name',
                text: serie,
                ignoreFieldChange: true
            });
        }
    }
    
    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    }
});