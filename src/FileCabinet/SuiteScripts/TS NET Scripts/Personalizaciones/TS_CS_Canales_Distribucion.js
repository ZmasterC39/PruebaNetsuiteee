/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/search', 'N/currentRecord', 'N/ui/message', 'N/url', 'N/runtime', 'N/ui/dialog'], (search, currentRecord, message, url, runtime, dialog) => {
    let typeMode = '';

    const pageInit = (context) => {
        typeMode = context.mode; //!Importante, no borrar.
    }

    const fieldChanged = (context) => {
        const objRecord = currentRecord.get();

        if (typeMode == 'create' || typeMode == 'copy' || typeMode == 'edit') {

            var ruc = objRecord.getText('custrecord_ht_cd_ruccanaldistribucion');
            console.log('ruc',ruc);
            var nombre = objRecord.getText('custrecord_ht_cd_nombre');

            var array = [ruc, nombre];
            var txtfinal = '';
            for (let i = 0; i < array.length; i++) {
                if(array[i]){

                    txtfinal += array[i];
                    if((i < array.length-1) && array[i+1] ) txtfinal += ' ';
                }
            }
            console.log('txtfinal',txtfinal)
            objRecord.setText({
                fieldId: 'name',
                text: txtfinal,
                ignoreFieldChange: true
            });
        }

        if (typeMode == 'create' || typeMode == 'copy' || typeMode == 'edit') {
            const { fieldId, currentRecord } = context;
            let { id, name, email, location, departament, role, roleId, roleCenter, subsidiary} = runtime.getCurrentUser();

            if ( subsidiary == 2 ) {
                if ( currentRecord.getValue({ fieldId: 'custrecord_ht_cd_tipocanal' }) != '' ) {
                    currentRecord.getField({ fieldId: 'custrecord_ht_cd_envio_certificado' }).isDisplay = true;
                    currentRecord.getField({ fieldId: 'custrecord_ht_cd_correo_certificados' }).isDisplay = true;
                    currentRecord.getField('custrecord_ht_cd_correo_certificados').isMandatory = true;

                    if (fieldId == 'custrecord_ht_cd_correo_certificados') {
                        const correos = currentRecord.getValue({ fieldId: 'custrecord_ht_cd_correo_certificados' });
                        // Formato esperado: "correo1@dominio.com;correo2@dominio.com;correo3@dominio.com"
                        // El ";" es SOLO separador, no debe ir al inicio, al final, ni duplicado

                        if (correos) {
                            // 1. Verificar que no empiece ni termine en ;
                            if (correos.startsWith(';') || correos.endsWith(';')) {
                                dialog.alert({ title: 'Alerta', message: 'El campo no debe iniciar ni terminar en ";". El ";" solo se usa para separar correos.' });
                                currentRecord.setValue({
                                    fieldId: 'custrecord_ht_cd_correo_certificados',
                                    value: '',
                                    ignoreFieldChange: true
                                });
                                return false;
                            }

                            // 2. Split SIN filtrar vacíos, para detectar ";;" (doble separador)
                            const listaCorreos = correos.split(';');

                            const segmentosVacios = listaCorreos.filter(c => c.length === 0);
                            if (segmentosVacios.length > 0) {
                                dialog.alert({ title: 'Alerta', message: 'Hay un ";" duplicado o mal ubicado. Verifica el formato.' });
                                currentRecord.setValue({
                                    fieldId: 'custrecord_ht_cd_correo_certificados',
                                    value: '',
                                    ignoreFieldChange: true
                                });
                                return false;
                            }

                            // 3. Validar formato de cada correo (sin trim, no se permiten espacios)
                            const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                            const correosInvalidos = listaCorreos.filter(c => !regexEmail.test(c));

                            if (correosInvalidos.length > 0) {
                                dialog.alert({ title: 'Alerta', message: 'Formato inválido. Los correos deben:<br/>• Ser correos válidos (usuario@dominio.com) <br/> • Estar separados únicamente por ";" (sin comas, dos puntos, ni espacios)<br/><br/> • Correo(s) o segmento(s) con problema: ' + correosInvalidos.map(c => `"${c}"`).join('<br/>') });
                                currentRecord.setValue({
                                    fieldId: 'custrecord_ht_cd_correo_certificados',
                                    value: '',
                                    ignoreFieldChange: true
                                });
                                return false;
                            }

                            // 4. Duplicados
                            const duplicados = listaCorreos.filter((c, i) => listaCorreos.indexOf(c) !== i);
                            if (duplicados.length > 0) {
                                dialog.alert({ title: 'Alerta', message: 'Existen correos duplicados:<br/>' + [...new Set(duplicados)].join('\n') });
                                currentRecord.setValue({
                                    fieldId: 'custrecord_ht_cd_correo_certificados',
                                    value: '',
                                    ignoreFieldChange: true
                                });
                                return false;
                            }
                        }
                    }

                }else{
                    currentRecord.getField({ fieldId: 'custrecord_ht_cd_envio_certificado' }).isDisplay = false;
                    currentRecord.setValue({ fieldId: 'custrecord_ht_cd_envio_certificado', value: false, ignoreFieldChange: true });
                    currentRecord.getField({ fieldId: 'custrecord_ht_cd_correo_certificados' }).isDisplay = false;
                    currentRecord.setValue({ fieldId: 'custrecord_ht_cd_correo_certificados', value: null, ignoreFieldChange: true });
                    currentRecord.getField('custrecord_ht_cd_correo_certificados').isMandatory = false;

                }
            }

        }
    }

    function saveRecord(context) {
        try {
            let { id, name, email, location, departament, role, roleId, roleCenter, subsidiary} = runtime.getCurrentUser();
            const { currentRecord } = context;
            if ( subsidiary == 2 ) {
                if ( currentRecord.getValue({ fieldId: 'custrecord_ht_cd_envio_certificado' }) == true ) {
                    const correos = currentRecord.getValue({ fieldId: 'custrecord_ht_cd_correo_certificados' });
                    if ( correos.length == 0) {
                        alert("No ha ingresado el correo electrónico para el envío de certificado")
                        return false;
                    }

                }
            }

            return true;
        } catch (error) {
            log.error("ERROR saveRecord", error);
        }
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        fieldChanged: fieldChanged,
        //sublistChanged: sublistChanged
    }
});
