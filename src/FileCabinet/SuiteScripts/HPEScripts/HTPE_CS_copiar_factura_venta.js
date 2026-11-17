/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url'],
    (url) => {

        /**
         * Punto de entrada pageInit (obligatorio para un Client Script).
         * @param {Object} scriptContext
         */
        function pageInit(scriptContext) {
            // Este script solo utiliza una función personalizada llamada desde un botón. 
            // pageInit se incluye para satisfacer el requisito de NetSuite.
            console.log('Client Script initialized successfully.');
        }

        /**
         * Función llamada por el botón "Copiar Asiento".
         * Resuelve la URL del Suitelet que contiene el formulario de opciones y lo abre en una nueva ventana.
         *
         * @param {number} recordId - ID Interno del asiento de diario a copiar.
         * @param {string} recordType - Tipo de registro ('journalentry').
         */
        function copiarAsiento(recordId, recordType) {
            try {
                // *** ¡IMPORTANTE! ***
                // REEMPLAZA estos ID con los IDs reales de tu Suitelet (HTPE_SL_copiar_asiento.js)
                const suiteletScriptId = 'customscript_htpe_sl_copiar_fv'; 
                const suiteletDeploymentId = 'customdeploy_htpe_sl_copiar_factura_de_v';

                // 1. Construir la URL del Suitelet, pasando el ID del asiento original y su tipo como parámetros.
                // Estos parámetros serán usados por el Suitelet para cargar el asiento original.
                const suiteletUrl = url.resolveScript({
                    scriptId: suiteletScriptId,
                    deploymentId: suiteletDeploymentId,
                    params: {
                        originalId: recordId,
                        recordType: recordType
                    },
                    isExternal: false // La URL es interna de NetSuite
                });

                // 2. Abrir el formulario del Suitelet en una nueva pestaña/ventana con dimensiones específicas.
                // Esto simula la ventana emergente para que el usuario ingrese la fecha y las cuentas.
                window.open(suiteletUrl, 'copiaAsientoWindow', 'width=700,height=500,toolbar=no,menubar=no,scrollbars=yes,resizable=no');

            } catch (e) {
                console.error('Error al generar la URL del Suitelet:', e);
                alert('Ocurrió un error al iniciar la copia: ' + e.message);
            }
        }

        // Se retorna la función de punto de entrada requerida (pageInit) 
        // y la función personalizada (copiarAsiento)
        return {
            pageInit: pageInit,
            copiarAsiento: copiarAsiento
        };
    }
);