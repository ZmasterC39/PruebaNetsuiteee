/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/url', 'N/format'],

    function (record, search, url, format) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            try {
                console.log('fieldChanged');
                let currentRecord = scriptContext.currentRecord;
                if (scriptContext.fieldId === 'custpage_desde') {
                    let fechaHasta = currentRecord.getValue('custpage_hasta');
                    let fechaDesde = currentRecord.getValue('custpage_desde');
                    if (fechaDesde > fechaHasta) {
                        currentRecord.setValue({
                            fieldId: 'custpage_desde',
                            value: fechaHasta
                        });
                    }
                    if (fechaDesde === '') {
                        currentRecord.setValue({
                            fieldId: 'custpage_desde',
                            value: fechaHasta
                        });
                    }
                }
                if (scriptContext.fieldId === 'custpage_hasta') {
                    let fechaHasta = currentRecord.getValue('custpage_hasta');
                    let fechaDesde = currentRecord.getValue('custpage_desde');
                    if (fechaDesde > fechaHasta) {
                        currentRecord.setValue({
                            fieldId: 'custpage_hasta',
                            value: fechaDesde
                        });
                    }
                    if (fechaHasta === '') {
                        currentRecord.setValue({
                            fieldId: 'custpage_hasta',
                            value: fechaDesde
                        });
                    }
                }
                if (scriptContext.fieldId === 'custpage_desde' || scriptContext.fieldId === 'custpage_hasta') {
                    let scriptId = 'customscript_ts_sl_cons_comi_exec';
                    let deploymentId = 'customdeploy_ts_sl_cons_comi_exec';

                    let fechaDesde = currentRecord.getValue('custpage_desde');
                    fechaDesde = format.format({
                        value: fechaDesde,
                        type: format.Type.DATE
                    });
                    let fechaHasta = currentRecord.getValue('custpage_hasta');
                    fechaHasta = format.format({
                        value: fechaHasta,
                        type: format.Type.DATE
                    });

                    let params = {
                        desde: fechaDesde,
                        hasta: fechaHasta
                    };

                    let ruta = url.resolveScript({
                        scriptId: scriptId,
                        deploymentId: deploymentId,
                        params: params
                    });

                    window.onbeforeunload = null;
                    window.open(ruta, '_self');
                }
            } catch (error) {
                console.error(error);
            }
        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {

        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged/* ,
        postSourcing: postSourcing,
        sublistChanged: sublistChanged,
        lineInit: lineInit,
        validateField: validateField,
        validateLine: validateLine,
        validateInsert: validateInsert,
        validateDelete: validateDelete,
        saveRecord: saveRecord */
        };

    });
