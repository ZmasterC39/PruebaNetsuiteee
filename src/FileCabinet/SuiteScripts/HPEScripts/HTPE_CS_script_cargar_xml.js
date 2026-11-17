/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/xml', 'N/file'], (currentRecord, xml, file) => {

    // Función que se llama al presionar el botón
    function cargarXML() {
        const currentRec = currentRecord.get();
        const xmlFile = currentRec.getValue({ fieldId: 'custpage_xml_file' });

        if (!xmlFile) {
            alert('Por favor, seleccione un archivo XML para cargar.');
            return;
        }

        // Se usa un proceso de lectura asíncrona o se intenta forzar la lectura.
        // **IMPORTANTE**: En SuiteScript 2.x Client Script, no se puede leer el contenido del archivo directamente 
        // con 'file.load' ya que no tiene el ID del archivo, sino el objeto temporal.
        // La forma de obtener el contenido del archivo en el Cliente es a través de un **Suitelet/RESTlet** (Servidor)
        // O leyendo el archivo directamente en el navegador (opción no nativa de SuiteScript).
        // 
        // La implementación más robusta es enviar el archivo al servidor (Suitelet) para que lo procese y devuelva los datos.
        // Sin embargo, para simular la actualización de campos *sin grabar*, podemos hacer lo siguiente:
        // 
        // **ESTRATEGIA ALTERNATIVA (Más real y recomendada en NetSuite):**
        // 1. El botón en el formulario dispara un **Suitelet**.
        // 2. El **Suitelet** tiene un formulario que pide al usuario subir el XML.
        // 3. El **Suitelet** procesa el XML y luego **REDIRIGE** al formulario de Factura de Proveedor con los datos del XML en parámetros de URL.
        // 4. El **Client Script** del formulario de Factura de Proveedor lee los parámetros de URL y rellena los campos (usando currentRecord.setValue()).

        // **Para este ejemplo, asumiremos que tienes los datos del XML y que puedes simular el rellenado.**
        // Si el campo 'custpage_xml_file' es de tipo FILE en el User Event Script, su valor en el Client Script es el objeto temporal.
        
        // **Si utilizas la estrategia de un campo FILE y un botón, la lógica debe ser a través de una llamada al servidor.**
        
        alert('Simulando carga y parseo del XML. Se hará una llamada al servidor para obtener los datos.');

        // --- SIMULACIÓN DE DATOS OBTENIDOS DEL XML (POSTERIOR A UNA LLAMADA A SUITELET/RESTLET) ---
        const datosSimulados = {
            'entity': 123, // ID interno del Proveedor
            'trandate': '2025-10-25',
            'memo': 'Carga automática desde XML'
        };
        // --------------------------------------------------------------------------------------------
        
        // Rellenar campos sin grabar (el usuario tendrá que presionar GUARDAR)
        try {
            currentRec.setValue({ fieldId: 'entity', value: datosSimulados.entity, ignoreFieldChange: true });
            currentRec.setValue({ fieldId: 'trandate', value: new Date(datosSimulados.trandate), ignoreFieldChange: true });
            currentRec.setValue({ fieldId: 'memo', value: datosSimulados.memo, ignoreFieldChange: true });

            alert('Campos de la Factura de Proveedor rellenados desde XML. No se ha guardado la transacción.');
            
        } catch (e) {
            console.error('Error al rellenar campos:', e);
            alert('Error al rellenar campos: ' + e.message);
        }
    }

    // El Client Script debe tener un punto de entrada definido para ser cargado.
    function pageInit(scriptContext) {
        console.log('Client Script cargado.');
    }

    return {
        pageInit: pageInit,
        cargarXML: cargarXML // Hace que la función sea accesible por el botón
    };
});