/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * @author Mauro F Ramos
 * @date Created at: 03/06/2026
 * @description UE para envío de correo con adjuntos (Excel/CSV + PDF) desde Estimaciones.
 *              Crea seguimiento al cliente tras el envío.
 *
 * @version 2.0
 * @notes
 *     • _formulario_correo_automatico, crea los campos de manera visual para que el usuario pueda enviar el correo electrónico + botones de subida de archivo
 *     • _envioCorreo, se activa cuando esta marcada la casilla de verificación + existe un correo electronico como destinatario.
 *                     Es el encargado de crear los archivos en el gabinete de archivos de Netsuite, tanto el excel como el pdf.
 *                     Es el encargado de unificar el archivo adjunto en el correo para el cliente.
 *                     Crea el seguimiento
*/

define([ 'N/runtime', 'N/log', 'N/ui/serverWidget', 'N/email', 'N/file', 'N/render', 'N/record', 'N/https' ], (runtime, log, serverWidget, email, file, render, record, https) => {

    function beforeLoad(context) {
        try {
            const { subsidiary } = runtime.getCurrentUser();

            if (subsidiary === 2) {
                _formulario_correo_automatico(context);
            }
        } catch (error) {
            log.error('ERROR beforeLoad', error);
        }
    }


    function _formulario_correo_automatico(context) {
        try {
            const { form, newRecord, type } = context;

            form.getField('visibletocustomer')?.updateDisplayType({ displayType: 'NODISPLAY' });
            form.getField('visibletocustomer')?.updateDisplayType({ displayType: 'NODISPLAY' });
            form.getField('custbody_correo_jefatura')?.updateDisplayType({ displayType: 'NODISPLAY' });
            form.getField('message')?.updateDisplayType({ displayType: 'NODISPLAY' });
            //form.getField('custbody_archivo_pdf_adjuntado')?.updateDisplayType({ displayType: 'NODISPLAY' });
            //form.getField('custbody_archivo_excel_bienes')?.updateDisplayType({ displayType: 'NODISPLAY' });

            if (type === context.UserEventType.VIEW) return;
            //form.getField('custbody_correo_ultima_vez_enviado')?.updateDisplayType({ displayType: 'NODISPLAY' });

            const enviar_correo = form.addField({ id:    'custpage_enviar_correo', type:  serverWidget.FieldType.CHECKBOX, label: 'Enviar por correo' });
            form.insertField({ field: enviar_correo, nextfield: 'message' });

            const correo = form.addField({ id: 'custpage_correo', type:  serverWidget.FieldType.EMAIL, label: 'Correo electrónico' });
            form.insertField({ field: correo, nextfield: 'message' });

            const mensaje = form.addField({ id: 'custpage_mensaje', type:  serverWidget.FieldType.TEXTAREA, label: 'Mensaje para cliente' });
            form.insertField({ field: mensaje, nextfield: 'message' });

            // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* ARCHIVO BIENES EXCEL / CSV *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* ARCHIVO BIENES EXCEL / CSV *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            const archivo_pdf = form.addField({ id: 'custpage_archivo_pdf', type:  serverWidget.FieldType.INLINEHTML, label: 'Archivo PDF'});
            form.insertField({ field: archivo_pdf, nextfield: 'message' });
            const archivo = form.addField({ id: 'custpage_archivo_bienes', type:  serverWidget.FieldType.INLINEHTML, label: 'Archivo Excel / CSV' });
            form.insertField({ field: archivo, nextfield: 'message' });

            const archivo_bienes_contenido = form.addField({ id: 'custpage_archivo_bienes_contenido', type: serverWidget.FieldType.LONGTEXT, label: 'Archivo Excel / CSV contenido en base 64' });
            form.insertField({ field: archivo_bienes_contenido, nextfield: 'message' });
            archivo_bienes_contenido.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const archivo_bienes_nombre = form.addField({ id: 'custpage_archivo_bienes_nombre', type: serverWidget.FieldType.TEXT, label: 'Archivo Excel / CSV Nombre' });
            form.insertField({ field: archivo_bienes_nombre, nextfield: 'message' });
            archivo_bienes_nombre.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const archivo_bienes_extension = form.addField({ id: 'custpage_archivo_bienes_extension', type: serverWidget.FieldType.TEXT, label: 'Archivo Excel / CSV extension' });
            form.insertField({ field: archivo_bienes_extension, nextfield: 'message' });
            archivo_bienes_extension.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const archivo_bienes_tipo = form.addField({ id: 'custpage_archivo_bienes_tipo', type: serverWidget.FieldType.TEXT, label: 'Archivo Excel / CSV tipo' });
            form.insertField({ field: archivo_bienes_tipo, nextfield: 'message' });
            archivo_bienes_tipo.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const archivo_bienes_datos = form.addField({ id: 'custpage_archivo_bienes_datos', type: serverWidget.FieldType.LONGTEXT, label: 'Archivo Excel / CSV datos' });
            form.insertField({ field: archivo_bienes_datos, nextfield: 'message' });
            archivo_bienes_datos.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const archivo_bienes_headers = form.addField({ id: 'custpage_archivo_bienes_header', type: serverWidget.FieldType.LONGTEXT, label: 'Archivo Excel / CSV Header' });
            form.insertField({ field: archivo_bienes_headers, nextfield: 'message' });
            archivo_bienes_headers.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const archivo_bienes_rows = form.addField({ id: 'custpage_archivo_bienes_rows', type: serverWidget.FieldType.LONGTEXT, label: 'Archivo Excel / CSV Rows' });
            form.insertField({ field: archivo_bienes_rows, nextfield: 'message' });
            archivo_bienes_rows.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* ARCHIVO PDF *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* ARCHIVO PDF *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            // const archivo_pdf = form.addField({ id: 'custpage_archivo_pdf', type:  serverWidget.FieldType.INLINEHTML, label: 'Archivo PDF'});
            // form.insertField({ field: archivo_pdf, nextfield: 'message' });

            const archivo_pdf_contenido = form.addField({ id: 'custpage_archivo_pdf_contenido', type: serverWidget.FieldType.LONGTEXT, label: 'Archivo PDF contenido en base 64' });
            form.insertField({ field: archivo_pdf_contenido, nextfield: 'message' });
            archivo_pdf_contenido.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const archivo_pdf_nombre = form.addField({ id: 'custpage_archivo_pdf_nombre', type: serverWidget.FieldType.TEXT, label: 'Archivo PDF nombre' });
            form.insertField({ field: archivo_pdf_nombre, nextfield: 'message' });
            archivo_pdf_nombre.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const archivo_pdf_extension = form.addField({ id: 'custpage_archivo_pdf_extension', type: serverWidget.FieldType.TEXT, label: 'Archivo PDF extension' });
            form.insertField({ field: archivo_pdf_extension, nextfield: 'message' });
            archivo_pdf_extension.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const archivo_pdf_tipo = form.addField({ id: 'custpage_archivo_pdf_tipo', type: serverWidget.FieldType.TEXT, label: 'Archivo PDF tipo' });
            form.insertField({ field: archivo_pdf_tipo, nextfield: 'message' });
            archivo_pdf_tipo.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* CARGAR LIBRERÍA PARA TRATAR EXCEL / CSV *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            const xlsxLib = file.load({ id: '/SuiteScripts/IntegracionesHunter/UtilsGeneral/xlsx.full.min.js' });

            archivo.defaultValue = `
            <style>
                #custpage_estado   { font-weight: bold; }
                #custpage_nombre   { font-weight: bold; color: #2aa198; margin-left: 10px; }
            </style>

            <p style="color: #6f6f6f; font-size: 12px; margin: 12px 0 2px 0;">ARCHIVO DE BIENES <span id="custpage_estado"></span></p>
            <div id="custpage_archivo_wrapper"></div>

            <script src="${xlsxLib.url}" type="text/javascript"><\/script>

            <script type="text/javascript">
            (function() {
                var wrapper = document.getElementById('custpage_archivo_wrapper');
                var status  = document.getElementById('custpage_estado');

                if (!wrapper) return;

                // ── Botón auxiliar (SIEMPRE presente, sobrevive al submit) ──
                var btnAdd = document.createElement('button');
                btnAdd.type        = 'button';            // CLAVE: evita que NetSuite lo tome como submit
                btnAdd.id          = 'custpage_btn_add';
                btnAdd.textContent = '+ Añadir archivo';
                btnAdd.className = 'btn btn-primary';

                var nombreLbl = document.createElement('span');
                nombreLbl.id  = 'custpage_nombre';

                wrapper.appendChild(btnAdd);
                wrapper.appendChild(nombreLbl);

                // Al hacer clic: si el input no existe (fue removido en un submit previo), lo recrea.
                btnAdd.addEventListener('click', function() {
                    var input = document.getElementById('custpage_archivo');
                    if (!input) input = crearInput();
                    input.click();
                });

                // Input inicial
                crearInput();

                // ── Interceptar submit: eliminar file input del DOM ──
                var mainForm = document.getElementById('main_form') || document.forms[0];
                if (mainForm) {
                    mainForm.addEventListener('submit', function() {
                        var fi = document.getElementById('custpage_archivo');
                        if (fi && fi.parentNode) {
                            fi.disabled = true;
                            fi.parentNode.removeChild(fi);
                        }
                    }, true);
                }

                // ── Crea (o recrea) el input file con su handler ──
                function crearInput() {
                    var input = document.createElement('input');
                    input.type          = 'file';
                    input.id            = 'custpage_archivo';
                    input.accept        = '.csv,.xlsx,.xls';
                    input.style.display = 'none';   // oculto: el botón es el disparador visible
                    input.addEventListener('change', onChange);
                    wrapper.appendChild(input);
                    return input;
                }

                function onChange(e) {
                    try {
                        var fileObj = e.target.files[0];
                        if (!fileObj) {
                            limpiarCampos();
                            nombreLbl.textContent = '';
                            status.textContent    = '';
                            status.style.color    = '';
                            return;
                        }

                        status.textContent    = 'Procesando...';
                        status.style.color    = '#b58900';
                        nombreLbl.textContent = fileObj.name;

                        var ext = fileObj.name.split('.').pop().toLowerCase();

                        var readerB64 = new FileReader();
                        readerB64.onload = function(ev) {
                            var b64 = ev.target.result.split(',')[1];
                            setNSField('custpage_archivo_bienes_contenido', b64);
                            setNSField('custpage_archivo_bienes_nombre',    fileObj.name);
                            setNSField('custbody_archivo_excel_bienes',    fileObj.name);
                            setNSField('custpage_archivo_bienes_extension',     ext);
                            setNSField('custpage_archivo_bienes_tipo',    fileObj.type || ext);
                        };
                        readerB64.readAsDataURL(fileObj);

                        if (ext === 'xlsx' || ext === 'xls') {
                            leerExcel(fileObj);
                        } else if (ext === 'csv') {
                            leerCSV(fileObj);
                        } else {
                            status.textContent = 'Formato no soportado. Use .csv o .xlsx';
                            status.style.color = '#dc322f';
                            limpiarCampos();
                            nombreLbl.textContent = '';
                        }
                    } catch(err) {
                        console.error('change', err);
                    }
                }

                function leerExcel(fileObj) {
                    var reader = new FileReader();
                    reader.onload = function(ev) {
                        try {
                            if (typeof XLSX === 'undefined') {
                                status.textContent = 'Error: librería XLSX no cargada.';
                                status.style.color = '#dc322f';
                                return;
                            }
                            var data     = new Uint8Array(ev.target.result);
                            var workbook = XLSX.read(data, { type: 'array' });
                            var sheet    = workbook.Sheets[workbook.SheetNames[0]];
                            var csv      = XLSX.utils.sheet_to_csv(sheet);
                            guardarCSV(csv);
                        } catch (err) {
                            status.textContent = 'Error al leer Excel: ' + err.message;
                            status.style.color = '#dc322f';
                        }
                    };
                    reader.readAsArrayBuffer(fileObj);
                }

                function leerCSV(fileObj) {
                    var reader = new FileReader();
                    reader.onload = function(ev) { guardarCSV(ev.target.result); };
                    reader.readAsText(fileObj);
                }

                function guardarCSV(csv) {
                    try {
                        var filas = csv.split('\\n').filter(function(r) { return r.trim(); });
                        if (filas.length === 0) {
                            status.textContent = 'El archivo está vacío.';
                            status.style.color = '#dc322f';
                            limpiarCampos();
                            return;
                        }
                        setNSField('custpage_archivo_bienes_datos',   csv);
                        setNSField('custpage_archivo_bienes_header',  filas[0]);
                        setNSField('custpage_archivo_bienes_rows',    filas.slice(1).join('\\n'));

                        status.textContent = filas.length + ' filas (' + (filas.length - 1) + ' registros).';
                        status.style.color = '#2aa198';
                    } catch (err) {
                        console.error('guardarCSV', err);
                    }
                }

                function limpiarCampos() {
                    var campos = [
                        'custpage_archivo_bienes_contenido', 'custpage_archivo_bienes_nombre', 'custbody_archivo_excel_bienes' , 'custpage_archivo_bienes_extension',
                        'custpage_archivo_bienes_tipo', 'custpage_archivo_bienes_datos', 'custpage_archivo_bienes_header',
                        'custpage_archivo_bienes_rows'
                    ];
                    for (var i = 0; i < campos.length; i++) {
                        setNSField(campos[i], '');
                    }
                }

                function setNSField(id, val) {
                    try {
                        if (typeof nlapiSetFieldValue === 'function') {
                            nlapiSetFieldValue(id, val, true, true);
                        } else {
                            var el = document.getElementById(id);
                            if (el) el.value = val + "aaaaaa" ;
                        }
                    } catch(e) {
                        console.error('setNSField ' + id, e);
                    }
                }
            })();
            <\/script>
            `;

            archivo_pdf.defaultValue = `
            <style>
                #custpage_pdf_estado  { font-weight: bold; }
                #custpage_pdf_nombre  { font-weight: bold; color: #2aa198; margin-left: 10px; }
            </style>

            <p style="color: #6f6f6f; font-size: 12px; margin: 12px 0 2px 0;">ARCHIVO PDF<span id="custpage_pdf_estado"></span></p>
            <div id="custpage_pdf_wrapper"></div>

            <script type="text/javascript">
            (function() {
                var wrapper = document.getElementById('custpage_pdf_wrapper');
                var status  = document.getElementById('custpage_pdf_estado');
                if (!wrapper) return;

                // ── Botón auxiliar (SIEMPRE presente, sobrevive al submit) ──
                var btnAdd = document.createElement('button');
                btnAdd.type        = 'button';            // CLAVE: evita que NetSuite lo tome como submit
                btnAdd.id          = 'custpage_btn_add_pdf';
                btnAdd.textContent = '+ Añadir archivo';
                btnAdd.className = 'btn btn-primary';

                var nombreLbl = document.createElement('span');
                nombreLbl.id  = 'custpage_pdf_nombre';

                wrapper.appendChild(btnAdd);
                wrapper.appendChild(nombreLbl);

                // Al hacer clic: si el input no existe (fue removido en un submit previo), lo recrea.
                btnAdd.addEventListener('click', function() {
                    var input = document.getElementById('custpage_archivo_pdf');
                    if (!input) input = crearInput_pdf();
                    input.click();
                });

                // Input inicial
                crearInput_pdf();

                // ── Interceptar submit: eliminar file input del DOM ──
                var mainForm = document.getElementById('main_form') || document.forms[0];
                if (mainForm) {
                    mainForm.addEventListener('submit', function() {
                        var fi = document.getElementById('custpage_archivo_pdf');
                        if (fi && fi.parentNode) {
                            fi.disabled = true;
                            fi.parentNode.removeChild(fi);
                        }
                    }, true);
                }

                // ── Crea (o recrea) el input file con su handler ──
                function crearInput_pdf() {
                    var input = document.createElement('input');
                    input.type          = 'file';
                    input.id            = 'custpage_archivo_pdf';
                    input.accept        = '.pdf';
                    input.style.display = 'none';   // oculto: el botón es el disparador visible
                    input.addEventListener('change', onChange);
                    wrapper.appendChild(input);
                    return input;
                }

                function onChange(e) {
                    try {
                        var fileObj = e.target.files[0];
                        if (!fileObj) {
                            limpiarCamposPdf();
                            nombreLbl.textContent = '';
                            status.textContent    = '';
                            status.style.color    = '';
                            return;
                        }

                        var ext = fileObj.name.split('.').pop().toLowerCase();
                        if (ext !== 'pdf') {
                            status.textContent    = 'Solo se aceptan archivos PDF.';
                            status.style.color    = '#dc322f';
                            limpiarCamposPdf();
                            nombreLbl.textContent = '';
                            return;
                        }

                        status.textContent    = 'Procesando...';
                        status.style.color    = '#b58900';
                        nombreLbl.textContent = fileObj.name;

                        var reader = new FileReader();
                        reader.onload = function(ev) {
                            var b64 = ev.target.result.split(',')[1];
                            setNSField('custpage_archivo_pdf_contenido', b64);
                            setNSField('custpage_archivo_pdf_nombre',    fileObj.name);
                            setNSField('custbody_archivo_pdf_adjuntado',    fileObj.name);
                            setNSField('custpage_archivo_pdf_extension', ext);
                            setNSField('custpage_archivo_pdf_tipo',      fileObj.type || 'application/pdf');

                            status.textContent = 'Archivo cargado correctamente.';
                            status.style.color = '#2aa198';
                        };
                        reader.readAsDataURL(fileObj);
                    } catch(err) {
                        console.error('change pdf', err);
                    }
                }

                function limpiarCamposPdf() {
                    var campos = [
                        'custpage_archivo_pdf_contenido', 'custpage_archivo_pdf_nombre', 'custbody_archivo_pdf_adjuntado',
                        'custpage_archivo_pdf_extension', 'custpage_archivo_pdf_tipo'
                    ];
                    for (var i = 0; i < campos.length; i++) {
                        setNSField(campos[i], '');
                    }
                }

                function setNSField(id, val) {
                    try {
                        if (typeof nlapiSetFieldValue === 'function') {
                            nlapiSetFieldValue(id, val, true, true);
                        } else {
                            var el = document.getElementById(id);
                            if (el) el.value = val;
                        }
                    } catch(e) {
                        console.error('setNSField ' + id, e);
                    }
                }
            })();
            <\/script>
            `;

            if ( newRecord.getValue('custbody_ht_so_bien').length > 0) {
                const bien = record.load({ type: 'customrecord_ht_record_bienes', id: newRecord.getValue('custbody_ht_so_bien') });
                    const motor = bien.getValue({ fieldId: 'custrecord_ht_bien_motor' });
                    const chasis = bien.getValue({ fieldId: 'custrecord_ht_bien_chasis' });

                    let row = false;

                    if ( bien.id ) row = bien.id;
                    if ( motor ) row += ','+ motor;
                    if ( chasis ) row += ',' + chasis;
                    if ( bien.id && motor && chasis && row ) {
                        newRecord.setValue({ fieldId: 'custbody_archivo_excel_bienes', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                        newRecord.setValue({ fieldId: 'custpage_archivo_bienes_nombre', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                        newRecord.setValue({ fieldId: 'custpage_archivo_bienes_header', value: 'id,motor,chasis', ignoreFieldChange: true, forceSyncSourcing: true });
                        newRecord.setValue({ fieldId: 'custpage_archivo_bienes_rows', value: row, ignoreFieldChange: true, forceSyncSourcing: true });
                    }
            }

        } catch (error) {
            log.error('ERROR _formulario_correo_automatico', error);
        }
    }

    async function afterSubmit (context) {
        try {
            const { subsidiary } = runtime.getCurrentUser();
            if (subsidiary == 2) {
                await _envio_automatico(context);
            }
        } catch (error) {
            log.error('ERROR afterSubmit', error);
        }
    };

    async function _envio_automatico(context) {
        try {
            if (context.type === context.UserEventType.VIEW || context.type === context.UserEventType.DELETE) return;
            const { newRecord, type } = context;

            const { id, type: recordType } = newRecord;

            const enviar_correo      = newRecord.getValue('custpage_enviar_correo');
            const correo_jefa        = newRecord.getValue('custbody_correo_jefatura');
            const correo             = newRecord.getValue('custpage_correo') || '';
            const mensaje            = newRecord.getValue('custpage_mensaje') || '';

            if ( enviar_correo == false || correo.length == 0 ) return;

            const archivo_nombre     = newRecord.getValue('custpage_archivo_bienes_nombre') || '';
            const archivo_extension  = newRecord.getValue('custpage_archivo_bienes_extension') || '';
            const archivo_contenido  = newRecord.getValue('custpage_archivo_bienes_contenido') || '';
            const archivo_header     = newRecord.getValue('custpage_archivo_bienes_header') || '';
            const archivo_rows       = newRecord.getValue('custpage_archivo_bienes_rows') || '';

            // Archivo PDF del usuario
            const pdf_nombre         = newRecord.getValue('custpage_archivo_pdf_nombre') || '';
            const pdf_contenido      = newRecord.getValue('custpage_archivo_pdf_contenido') || '';

            // Este si podría ser cargado con un load.
            //const numEstimacion      = estimacion.getValue({ fieldId: 'tranid' });

            const payload = {
                recordType,
                recordId   : id,
                eventType  : type,          // 'create', 'edit', etc.
                enviar_correo,
                correo,
                correo_jefa,
                mensaje,
                archivo_nombre,
                archivo_extension,
                archivo_contenido,
                archivo_header,
                archivo_rows,
                pdf_nombre,
                pdf_contenido
            };

            let requestOptions = {
                deploymentId: 'customdeploy_hu_ec_rs_envio_documento',
                scriptId: 'customscript_hu_ec_rs_envio_documento',
                headers: { Accept: "*/*", "Content-Type": "application/json" },
                method: 'POST',
                body: JSON.stringify(payload)
            };

            let myRestletResponse = await https.requestRestlet.promise(requestOptions);
            let response = myRestletResponse?.body;
            log.debug("Response", JSON.parse(response));
        } catch (error) {
            log.error("Error en la solicitud API", error.stack);
            return { "status": error.stack };
        }
    }

    return { beforeLoad, afterSubmit };
});