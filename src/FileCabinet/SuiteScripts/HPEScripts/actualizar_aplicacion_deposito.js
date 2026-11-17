/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {

    /**
     * Define el método execute que se ejecuta cuando se activa el script.
     * @param {Object} context
     */
    function execute(context) {
        // 1. Definir los parámetros de búsqueda
        var depositApplicationSearch = search.create({
            type: search.Type.DEPOSIT_APPLICATION,
            filters: [
                // **IMPORTANTE**: Define un filtro específico para los registros que deseas actualizar.
                // Ejemplo: Buscar aplicaciones de depósito donde un campo personalizado (custbody_campo_personalizado) esté vacío.
                // Asegúrate de usar el ID interno del campo.
                // Por ejemplo, el campo "Memo" (memo)
                search.createFilter({
                    name: 'depositdate',
                    operator: search.Operator.ON,
					values: ['03/01/2025']
                    // Si el filtro no es por memo, ajusta el campo y el operador.}
                })
            ],
            columns: [
                // Solo necesitamos el ID interno. Puedes agregar más columnas si son necesarias para la lógica de actualización.
                search.createColumn({ name: 'internalid' })
            ]
        });

        var pagedData = depositApplicationSearch.runPaged({ pageSize: 1000 });

        pagedData.pageRanges.forEach(function(pageRange) {
            var currentPage = pagedData.fetch({ index: pageRange.index });
            currentPage.data.forEach(function(result) {
                var depositApplicationId = result.id;
                
                try {
                    // 2. Cargar el registro de Aplicación de Depósito en modo de edición
                    var depositApplicationRecord = record.load({
                        type: record.Type.DEPOSIT_APPLICATION,
                        id: depositApplicationId,
                        isDynamic: false // Usar modo estándar (más eficiente para actualizaciones de campo simple)
                    });

                    // 3. Establecer el nuevo valor para el campo
                    // **REEMPLAZA 'custbody_el_campo_a_actualizar' con el ID interno del campo deseado.**
                    // Ejemplo de campo: 'memo', 'trandate', 'custbody_mi_campo_personalizado'
                    var campoId = 'custbody_pe_registro'; 
                    var nuevoValor = '03-01-2025';

                    depositApplicationRecord.setValue({
                        fieldId: campoId,
                        value: nuevoValor
                    });

                    // 4. Guardar el registro
                    var idSaved = depositApplicationRecord.save();

                    log.audit({
                        title: 'Éxito',
                        details: 'Aplicación de Depósito ID ' + idSaved + ' actualizada. Campo ' + campoId + ' establecido a: ' + nuevoValor
                    });

                } catch (e) {
                    log.error({
                        title: 'Error al actualizar Aplicación de Depósito ID: ' + depositApplicationId,
                        details: e.toString()
                    });
                }
            });
        });
        
        log.audit({
            title: 'Finalizado',
            details: 'Proceso de actualización de Aplicaciones de Depósito completado.'
        });
    }

    return {
        execute: execute
    };
});