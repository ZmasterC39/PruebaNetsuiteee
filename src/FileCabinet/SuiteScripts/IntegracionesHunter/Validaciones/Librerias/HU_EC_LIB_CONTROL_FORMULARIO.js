/**
 * @NpiVersion 2.1
 *
 * @author Mauro F Ramos
 * @date 04/02/2025
 * @description Librería para manejar el comportamiento de un campo de un formulario.
 *
 * @version 1.0
 * @notes - Ninguna -
 * @LastModifiedBy 19/09/2025
 */
define(['N/log'], (log) => {

    /**
     * Oculta un campo del formulario e inserta uno nuevo ofuscando la información.
     * Válido en USER EVENT
     * @function obfuscateField
     * @param {Object} context - Contexto del script, incluyendo el formulario y el registro nuevo o existente.
     * @param {string} fieldId - ID del campo a ofuscar en el registro y a ocultar.
     * @param {string} nextTo - ID del campo al que se insertará el nuevo campo al lado.
     * @param {string} position - Posición de inserción del campo, como "NONE" o "STARTCOL".
     * @throws {Error} Si ocurre un error al intentar deshabilitar el campo, se registra en el log de NetSuite.
    */
   function ofuscarCampo(context, fieldId, nextTo, position) {
        try {
            var form = context.form;
            var field = context.newRecord;
            let customValue = field.getText({ fieldId: fieldId });

            let customLabel = form.getField({ id: fieldId });
            if (customValue.length === 0) {
                return;
            }

            let newFiedl = form.addField({
                id: "custpage_" + fieldId,
                type: "TEXT",
                label: customLabel.label,
            });
            newFiedl.updateBreakType({
                breakType: position,
            });

            if (customValue.length > 0 &&  customValue.length <= 3) {
                customValue = customValue.substring(0, 1) + "X".repeat(2);
            }

            if (customValue.length > 3) {
                customValue = customValue.substring(0, 3) + "X".repeat(customValue.length - 3);
            }
            newFiedl.defaultValue = customValue;
            form.insertField({
                field: newFiedl,
                nextfield: nextTo,
            });

            let hidden = form.getField(fieldId);
            hidden.updateDisplayType({ displayType: "HIDDEN" });
        } catch (error) {
            log.error("ERROR - obfuscateField", error);
        }
    }

    /**
     * Deshabilita una lista de campos en el registro actual.
     * VÁLIDO EN CLIENT SCRIPT
     * @param {Object} context - El contexto del script, que incluye información sobre el registro actual.
     * @param {Array<string>} fieldsToDisable - Una lista de IDs de los campos que se deshabilitarán.
     */
    function deshabilitarCampos(context, fieldsToDisable) {
        try {
            let currentRecord = context.currentRecord;

            fieldsToDisable.forEach( function (fieldId) {
                let field = currentRecord.getField({ fieldId: fieldId,});
                field.isDisabled = true;
            });
        } catch (error) {
            log.error("Error disableFields", error);
        }
    }

   /**
     * Oculta una lista de campos en el formulario.
     * VÁLIDO EN USER EVENT
     * @param {Object} context - Contexto del script, incluyendo el formulario.
     * @param {Array<string>} fieldIds - Lista de IDs de campos que se deben ocultar.
     */
    function ocultarCampos(context, fieldIds) {
        try {
            let form = context.form;

            fieldIds.forEach(function (fieldId) {
                let field = form.getField({ id: fieldId });
                if (field) {
                    field.updateDisplayType({ displayType: "HIDDEN" });
                }
            });
        } catch (error) {
            log.error("Error ocultarCampos", error.stack);
        }
    }

    return { ofuscarCampo, deshabilitarCampos, ocultarCampos }
})