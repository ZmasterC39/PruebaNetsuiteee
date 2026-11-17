/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

// Estado: Culminado
define(['N/currentRecord', 'N/runtime', 'N/search', "N/record"], function (currentRecord, runtime, search, record) {

    let SUBSIDIARIA_EC = 2;
    let CAMPO_FAM = 'custrecord_ht_pp_parametrizacion_rela';
    let CAMPO_PLATAFORMA = 'custrecord_ht_pp_plataforma';
    let CAMPO_CLASIFICACION = 'custrecord_ht_pp_clasificacion';
    let ITEM_AJUSTADO = 'custrecord_ht_pp_parametrizacionid'
    let LIST_PLATAFORMA = { 1: "GPT", 2: "GPG", 3: "NINGUNO" };
    let LIST_CLASIFICACION = { 1: "CAR", 2: "LOJ", 3: "MON", 4: "PER", 5: "SAT", 6: "SER", 8: "ACC", 9: "OPE", 10: "OTS", 11 :"OTV" };

    function pageInit(context) {
      // return
        try {
            if (debeOmitirEjecucion()) {
                context.currentRecord.getField({ fieldId: CAMPO_PLATAFORMA }).isDisplay = false;
                context.currentRecord.getField({ fieldId: CAMPO_CLASIFICACION }).isDisplay = false;
                return true;
            }

            actualizarCamposFormulario(context.currentRecord)
        } catch (error) { log.error('Error pageInit', error); }
    }

    function fieldChanged(context) {
        try {
            if (debeOmitirEjecucion()) return true;

            let currentRecord = context.currentRecord;
            if (context.fieldId === CAMPO_FAM) {
                actualizarCamposFormulario(currentRecord);
            }
        } catch (error) { log.error('Error fieldChanged', error); }
    }

    function saveRecord(context) {
        try {
            if (debeOmitirEjecucion()) return true;

            let currentRecord = context.currentRecord;
            let famValue = currentRecord.getValue({ fieldId: CAMPO_FAM });
            let plataformaValue = currentRecord.getValue({ fieldId: CAMPO_PLATAFORMA });
            let clasificacionValue = currentRecord.getValue({ fieldId: CAMPO_CLASIFICACION });
            let idItem = currentRecord.getValue({ fieldId: ITEM_AJUSTADO });
            let idItemText = currentRecord.getText({ fieldId: ITEM_AJUSTADO });

            if ((famValue == 130 || famValue == '130') && (clasificacionValue == 2)) {

                if (!clasificacionValue) {
                    // console.log(clasificacionValue);
                    alert('El campo HT CLASIFICACION es obligatorio.');
                    return false;
                }

                let valor = currentRecord.getValue({ fieldId: 'custrecord_ht_pp_parametrizacion_valor' });

                let searchResult = search.create({
                    type: 'customrecord_ht_general_tabla_codigos',
                    filters: [
                        ['custrecord_ht_codigo_gtc', 'is', valor],
                        'AND',
                        ['custrecord_ht_subsidiaria_gtc', 'anyof', SUBSIDIARIA_EC]
                    ],
                    columns: ['internalid', 'custrecord_ht_plataforma_gtc', 'custrecord_ht_codigo_nuevo']
                }).run().getRange({ start: 0, end: 1 });

                if (searchResult && searchResult.length > 0) {

                    let idRegistro = searchResult[0].getValue('internalid');
                    let plataforma = searchResult[0].getValue('custrecord_ht_plataforma_gtc');
                    let clasificacion = searchResult[0].getValue('custrecord_ht_codigo_nuevo');

                    if (clasificacion && clasificacionValue && (clasificacion != obtenerValorLista(LIST_CLASIFICACION, clasificacionValue))) {
                        let confirmar = confirm('HT CLASIFICACION Ya cuenta con un valor (' + clasificacion + ').\n\n¿Estás seguro de modificarlo?');

                        if (!confirmar) {
                            return false;
                        } else {

                            record.submitFields({
                                type: 'customrecord_ht_general_tabla_codigos',
                                id: idRegistro,
                                values: {
                                    custrecord_ht_plataforma_gtc: '',
                                    custrecord_ht_codigo_nuevo: obtenerValorLista(LIST_CLASIFICACION, clasificacionValue)
                                }
                            });
                        }
                    }

                    // alert('Simula el Guardado.');
                    currentRecord.setValue({
                        fieldId: CAMPO_PLATAFORMA,
                        value: ''
                    });

                    // crearNotaSimple({ // Demora mucho se comenta
                    //     recordId: idRegistro,
                    //     titulo: 'Actualizacion de Clasificacion',
                    //     mensaje: 'Modificado por Item ' + " " + "ID: " + idItem + " " + "Nombre: " + idItemText
                    // });

                    return true

                } else {
                    crearRegistroHtCodigoGeneral(valor, obtenerValorLista(LIST_CLASIFICACION, clasificacionValue), obtenerValorLista(LIST_PLATAFORMA, plataformaValue))
                    return true; //-
                }


            } else if ((famValue == 130 || famValue == '130') && (!plataformaValue || (!clasificacionValue && clasificacionValue != 2))) {

                // alert("Entra 2")
                if (!plataformaValue) {
                    console.log(clasificacionValue);
                    alert('El campo HT PLATAFORMA es obligatorio.');
                    return false;
                }

                if (!clasificacionValue) {
                    console.log(clasificacionValue);
                    alert('El campo HT CLASIFICACION es obligatorio.');
                    return false;
                }
            } else {
                // alert("Entra 3")
                let valor = currentRecord.getValue({ fieldId: 'custrecord_ht_pp_parametrizacion_valor' });

                let searchResult = search.create({
                    type: 'customrecord_ht_general_tabla_codigos',
                    filters: [
                        ['custrecord_ht_codigo_gtc', 'is', valor],
                        'AND',
                        ['custrecord_ht_subsidiaria_gtc', 'anyof', SUBSIDIARIA_EC]
                    ],
                    columns: ['internalid', 'custrecord_ht_plataforma_gtc', 'custrecord_ht_codigo_nuevo']
                }).run().getRange({ start: 0, end: 1 });

                if (searchResult && searchResult.length > 0) {
                    let idRegistro = searchResult[0].getValue('internalid');
                    let plataforma = searchResult[0].getValue('custrecord_ht_plataforma_gtc');
                    let clasificacion = searchResult[0].getValue('custrecord_ht_codigo_nuevo');

                    if (plataforma && plataformaValue && (plataforma != obtenerValorLista(LIST_PLATAFORMA, plataformaValue))) {
                        let confirmar = confirm(
                            'HT PLATAFORMA Ya cuenta con un valor (' + plataforma + ').\n\n¿Estás seguro de modificarlo?'
                        );

                        if (!confirmar) {
                            return false;
                        } else {

                            record.submitFields({
                                type: 'customrecord_ht_general_tabla_codigos',
                                id: idRegistro,
                                values: {
                                    custrecord_ht_plataforma_gtc: obtenerValorLista(LIST_PLATAFORMA, plataformaValue),
                                    // custrecord_ht_codigo_nuevo: obtenerClasificacion(ht_clasificacion)
                                }
                            });
                        }
                    }

                    if (clasificacion && clasificacionValue && (clasificacion != obtenerValorLista(LIST_CLASIFICACION, clasificacionValue))) {
                        let confirmar = confirm('HT CLASIFICACION Ya cuenta con un valor (' + clasificacion + ').\n\n¿Estás seguro de modificarlo?');

                        if (!confirmar) {
                            return false;
                        } else {
                            record.submitFields({
                                type: 'customrecord_ht_general_tabla_codigos',
                                id: idRegistro,
                                values: {
                                    custrecord_ht_plataforma_gtc: obtenerValorLista(LIST_PLATAFORMA, plataformaValue),
                                    custrecord_ht_codigo_nuevo: obtenerValorLista(LIST_CLASIFICACION, clasificacionValue)
                                }
                            });
                            // return true; //-
                        }
                    }

                    // crearNotaSimple({ // Demora mucho se comenta
                    //     recordId: idRegistro,
                    //     // recordType: 'customrecord_ht_general_tabla_codigos',
                    //     titulo: 'Actualizacion de Clasificacion',
                    //     mensaje: 'Item cuya familia fue modificada' + " " + "ID: " + idItem + " " + "Nombre: " + idItemText
                    // });

                    // alert('Simula el Guardado.');
                    return true

                } else {
                    // alert('ELSE_2.');
                    crearRegistroHtCodigoGeneral(valor, obtenerValorLista(LIST_CLASIFICACION, clasificacionValue), obtenerValorLista(LIST_PLATAFORMA, plataformaValue))
                    return true; //-
                }

            }
        } catch (error) { log.error('Error saveRecord', error); }
    }

    /*
    * Validaciones
    */
    function debeOmitirEjecucion() {   // Si uno se cumple no se ejecuta.
        return (
            runtime.executionContext == runtime.ContextType.CSV_IMPORT ||     // Carga CSV
            runtime.getCurrentUser().subsidiary != 2            // Es diferente Ecuador
            // runtime.getCurrentUser().subsidiary != SUBSIDIARIA_EC             // Es diferente Ecuador

        );
    }

    /*
    * Funciones Adicionales
    */
    function actualizarCamposFormulario(currentRecord) {

        let famValue = currentRecord.getValue({ fieldId: CAMPO_FAM });
        if (famValue == 130 || famValue == '130') {

            validarCampoPorFamilia(currentRecord, CAMPO_PLATAFORMA);
            validarCampoPorFamilia(currentRecord, CAMPO_CLASIFICACION);

            // Obtener el id de la Familia
            let valor = currentRecord.getValue({ fieldId: 'custrecord_ht_pp_parametrizacion_valor' });

            // Busqueda en HT Codigo General
            let searchResult = search.create({
                type: 'customrecord_ht_general_tabla_codigos',
                filters: [
                    ['custrecord_ht_codigo_gtc', 'is', valor],
                    'AND',
                    ['custrecord_ht_subsidiaria_gtc', 'anyof', SUBSIDIARIA_EC]
                ],
                columns: ['internalid', 'custrecord_ht_plataforma_gtc', 'custrecord_ht_codigo_nuevo']
            }).run().getRange({ start: 0, end: 1 });

            // Si Existe por defecto coloca los valores en el formulario
            if (searchResult && searchResult.length > 0) {

                // Valores del Registro en String 
                let plataforma = searchResult[0]?.getValue('custrecord_ht_plataforma_gtc');
                let codigo = searchResult[0]?.getValue('custrecord_ht_codigo_nuevo');

                // Valores por ID ya que es una lista en el Formulario de Parametros
                let idPlataforma = obtenerIdLista(LIST_PLATAFORMA, plataforma);
                let idCodigo = obtenerIdLista(LIST_CLASIFICACION, codigo);

                currentRecord.setValue({ fieldId: CAMPO_PLATAFORMA, value: idPlataforma });
                currentRecord.setValue({ fieldId: CAMPO_CLASIFICACION, value: idCodigo });
            }

        } else {
            // Si No existe valores nulos en el formulario
            validarCampoPorFamilia(currentRecord, CAMPO_PLATAFORMA);
            currentRecord.setValue({ fieldId: CAMPO_PLATAFORMA, value: '' });

            validarCampoPorFamilia(currentRecord, CAMPO_CLASIFICACION);
            currentRecord.setValue({ fieldId: CAMPO_CLASIFICACION, value: '' });
        }
    }

    function obtenerValorLista(lista, codigo) {
        return lista[codigo] || "No definido";
    }

    function obtenerIdLista(lista, valor) {
        for (let key in lista) {
            if (lista[key] === valor) {
                return parseInt(key);
            }
        }
        return null;
    }

    function crearRegistroHtCodigoGeneral(familia, clasificacion, plataforma) {
        try {

            if (!familia || !clasificacion || !plataforma) {
                alert('Error al crear el registro de traza');
                return
            }

            let objRecord = record.create({ type: 'customrecord_ht_general_tabla_codigos', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecord_ht_subsidiaria_gtc', value: 2 });
            objRecord.setValue({ fieldId: 'custrecord_ht_codigo_tabla', value: 'PRO' });
            objRecord.setValue({ fieldId: 'custrecord_ht_codigo_gtc', value: familia });
            objRecord.setValue({ fieldId: 'custrecord_ht_codigo_nuevo', value: clasificacion });
            objRecord.setValue({ fieldId: 'custrecord_ht_plataforma_gtc', value: plataforma });

            let saveRecord = objRecord.save();

        } catch (error) {
            alert('Error al crear el registro de traza');
            alert(error);
            return
        }
    }

    function crearNotaNetsuite({ recordId, titulo, mensaje }) {
        try {

            const noteRec = record.create({
                type: 'note',
                isDynamic: true
            });

            noteRec.setValue({ fieldId: 'title', value: titulo });
            noteRec.setValue({ fieldId: 'note', value: mensaje });
            noteRec.setValue({ fieldId: 'record', value: recordId });
            noteRec.setValue({ fieldId: 'recordtype', value: 3305 });

            return noteRec.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });

        } catch (error) {
            log.error('Error crearNotaSimple', error);
        }
    }

    function validarCampoPorFamilia(currentRecord, fieldId) {

        let famValue = currentRecord.getValue({ fieldId: CAMPO_FAM });
        let esValido = famValue == 130 || famValue == '130';

        let campo = currentRecord.getField({ fieldId });

        if (fieldId == CAMPO_PLATAFORMA) {
            campo.isDisplay = esValido;
            campo.isDisabled = !esValido;
            // campo.isMandatory = esValido;
        } else {
            campo.isDisplay = esValido;
            campo.isDisabled = !esValido;
            campo.isMandatory = esValido;
        }



        console.log('validarCampoPorFamilia', { fieldId, esValido });

        if (!esValido) {
            currentRecord.setValue({
                fieldId: fieldId,
                value: ''
            });
        }
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
});