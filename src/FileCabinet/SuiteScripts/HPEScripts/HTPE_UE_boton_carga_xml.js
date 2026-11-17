/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', 'N/ui/serverWidget', 'N/log'], (url, serverWidget, log) => {

    // 💡 CONSTANTE: ID de la subsidiaria AUTOSAFE
    const SUBSIDIARY_AUTOSAFE_ID = '3';
  
    // 💡 CONSTANTE 2: ID INTERNO del formulario "PE Documentos Nacionales"
    // *** ¡IMPORTANTE! Reemplace 'REEMPLAZAR_CON_ID_INTERNO_DEL_FORMULARIO' con el ID real de su formulario. ***
    const CUSTOM_FORM_TITLE = 'Factura';  
  
    function beforeLoad(scriptContext) {
        const eventType = scriptContext.type;
        const currentRecord = scriptContext.newRecord;

        // 1. Obtener el ID de la subsidiaria del registro actual.
        const currentSubsidiaryId = currentRecord.getValue({ fieldId: 'subsidiary' });
        log.debug({ // <<< 2. USAR log.debug para mostrar el ID
              title: 'DEBUG UE - SUBSIDIRIA ACTUAL',
              details: 'ID de Subsidiaria: ' + currentSubsidiaryId
        });
        const currentForm = scriptContext.form;
        const currentFormTitle = currentForm.title;
        log.debug({ // <<< 2. USAR log.debug para mostrar el ID
              title: 'DEBUG UE - Formulario',
              details: 'ID de Formulario: ' + currentFormTitle
        });
      
        // Solo agrega el botón cuando se está creando (CREATE) o editando (EDIT) una factura.
        if (eventType === scriptContext.UserEventType.CREATE &&
            currentSubsidiaryId === SUBSIDIARY_AUTOSAFE_ID &&
            currentFormTitle === CUSTOM_FORM_TITLE)  {
            
            log.debug({ // <<< 2. USAR log.debug para mostrar el ID
                title: 'DEBUG UE - crear el boton',
                details: 'Boton de XML Visible ' + eventType + ' ' + currentSubsidiaryId + ' ' + currentFormTitle
            });
 
            //const currentForm = scriptContext.form;
            const currentRecordId = scriptContext.newRecord.id;
            const currentRecordType = scriptContext.newRecord.type;

            // =========================================================================
            // 2. ASOCIAR EL CLIENT SCRIPT DE FORMA DINÁMICA
            // Cambia la ruta interna de abajo por el path real de tu archivo en el File Cabinet
            // =========================================================================
            currentForm.clientScriptModulePath = 'SuiteScripts/HPEScripts/HTPE_CS_VendorBill.js';

            // 3. Resolver la URL del Suitelet.
            const suiteletUrl = url.resolveScript({
                scriptId: 'customscript_xml_upload_suitelet', // 💡 Reemplaza con tu ID de Script
                deploymentId: 'customdeploy_xml_upload_deploy', // 💡 Reemplaza con tu ID de Despliegue
                params: {
                    'recordid': currentRecordId,
                    'recordtype': currentRecordType
                }
            });

            // Guardamos la URL calculada en un campo oculto del formulario 
            // para que el Client Script pueda leerla fácilmente al presionar el botón.
            const urlField = currentForm.addField({
                id: 'custpage_suitelet_url_holder',
                type: serverWidget.FieldType.TEXT,
                label: 'Suitelet URL Holder'
            });
            urlField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
            urlField.defaultValue = suiteletUrl;
          
            // 4. Agregar el botón que abre el Suitelet en una nueva ventana/tab.
            currentForm.addButton({
                id: 'custpage_cargar_xml_server',
                label: 'Factura XML',
                // La función usa window.open para evitar interrumpir la sesión de la factura.
                functionName: 'abrirSuiteletXml' // <-- Llama limpiamente a la función del CS
            });
        }
    }
    return {
        beforeLoad: beforeLoad
    };
});