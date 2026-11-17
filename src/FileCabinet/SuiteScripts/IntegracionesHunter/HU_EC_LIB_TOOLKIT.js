/**
 * @NApiVersion 2.1
 */

define(['N/log', 'N/query', 'N/https', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION'], (log, query, https, _funcion) => {

    /**
     * Ejecuta una consulta SuiteQL en NetSuite y retorna los resultados procesados.
     *
     * @function executeQuery
     * @param {string} sqlQuery   - Consulta SuiteQL a ejecutar. Debe ser una consulta SQL válida. Puede incluir placeholders (?) para parámetros.
     * @param {Array} [params=[]] - Array de parámetros para la consulta SQL. Los valores en este array reemplazarán los placeholders (?) en la consulta en orden. Si no es un array, se convertirá automáticamente en un array vacío.
     * @returns {Array<Object>|boolean}  Retorna un array de objetos con los resultados de la consulta, donde cada objeto representa una fila. Retorna false si no hay resultados o si ocurre un error.
     *                                   - Strings: Se eliminan los saltos de línea (\n) y se reemplazan con espacios
     *                                   - Null: Se convierten en strings vacíos ("")
     *                                   - Otros tipos: Se mantienen sin cambios
     *
     * @author Mauro F Ramos
     *
     */
    const executeQuery = (sqlQuery, params = []) => {
        try {
            // Aseguramos que params sea un array válido
            if (!Array.isArray(params)) {
                params = [];
            }
            let resultSet = query.runSuiteQL({ query: sqlQuery, params: params });
            let results = resultSet.asMappedResults();
            if (results.length > 0) {
                return results.map(obj => {
                    return Object.fromEntries(
                        Object.entries(obj).map(([key, value]) => [
                            key,
                            typeof value === 'string' ? value.replace(/\n/g, " ") : value === null ? "" : value
                        ])
                    );
                });
            } else {
                return false;
            }
        } catch (error) {
            log.error("executeQuery error", error);
        }
    }

    /**
     * Ofusca campos sensibles de un formulario de NetSuite reemplazándolos con versiones que ocultan parcialmente su contenido usando caracteres 'X'.
     * ! Tipo de script válido: UserEventScript
     *
     * @function ofuscarCampos
     * @param {Object} context - Objeto de contexto de NetSuite que contiene referencias al formulario
     * @param {Array<Object>} camposConfiguracion - Array de objetos de configuración que especifican los campos a ofuscar y su posicionamiento.
     * @param {string} camposConfiguracion[].fieldId - ID interno del campo de NetSuite que se desea ofuscar. Debe ser un campo existente en el registro.
     * @param {string} camposConfiguracion[].nextTo - ID del campo después del cual se insertará el nuevo campo ofuscado.
     * @param {string} camposConfiguracion[].position - Tipo de salto (break type) para el campo. Valores típicos: "STARTCOL", "STARTROW", "NONE"
     * @example
     *   Ofuscar múltiples campos sensibles
     *     const config = [
     *         {
     *             fieldId: 'custbody_tarjeta_credito',
     *             nextTo: 'subsidiary',
     *             position: 'STARTROW'
     *         },
     *         {
     *             fieldId: 'custbody_numero_cuenta',
     *             nextTo: 'custbody_tarjeta_credito',
     *             position: 'STARTCOL'
     *         }
     *     ];
     * @returns {void} Esta función no retorna ningún valor.
     * @author Mauro F Ramos
     */
    const ofuscarCampos = (context, camposConfiguracion) =>{ 
        try {
            const form = context.form;
            const record = context.newRecord;

            camposConfiguracion.forEach(config => {
                try {
                    const { fieldId, nextTo, position } = config;

                    let customValue = record.getText({ fieldId });

                    const customLabel = form.getField({ id: fieldId });

                    // Crear el nuevo campo ofuscado
                    const newField = form.addField({
                        id: "custpage_" + fieldId,
                        type: "TEXT",
                        label: customLabel.label,
                    });

                    newField.updateBreakType({
                        breakType: position,
                    });

                    // if (!customValue || customValue.length === 0) {
                    //     return;
                    // }

                    // Lógica de ofuscación
                    if (customValue.length > 0 && customValue.length <= 3) {
                        customValue = customValue.substring(0, 1) + "X".repeat(2);
                    } else if (customValue.length > 3) {
                        customValue = customValue.substring(0, 3) + "X".repeat(15);
                    }

                    newField.defaultValue = customValue;

                    form.insertField({
                        field: newField,
                        nextfield: nextTo,
                    });

                    // Ocultar el campo original
                    const hidden = form.getField({ id: fieldId });
                    hidden.updateDisplayType({ displayType: "HIDDEN" });

                } catch (fieldError) {
                    log.error("Error ofuscando campo: " + config.fieldId, fieldError);
                }
            });

        } catch (error) {
            log.error("Error general en ofuscarCampos", error);
        }
    }


    /**
     * Oculta uno o múltiples campos de un formulario de NetSuite cambiando su tipo de visualización a HIDDEN.
     * ! Tipo de script válido: UserEventScript
     *
     * @function ocultarCampo
     * @param {Object} context - Objeto de contexto de NetSuite que contiene la referencia al formulario actual.
     * @param {Array<Object>} camposConfiguracion - Array de objetos de configuración que especifican
     * @example
     *   Ocultar múltiples campos
     *     const config = [
     *         { fieldId: 'custbody_campo1' },
     *         { fieldId: 'custbody_campo2' },
     *         { fieldId: 'custbody_campo3' }
     *     ];
     * @returns {void} Esta función no retorna ningún valor.
     * @author Mauro F Ramos
     *
     */
    const ocultarCampo = (context, camposConfiguracion) => {
        try {
            const form = context.form;
            camposConfiguracion.forEach(config => {
                const { fieldId, nextTo, position } = config;

                const hidden = form.getField({ id: fieldId });
                hidden.updateDisplayType({ displayType: "HIDDEN" });
            })
        } catch (error) {
            log.error("ERROR ocultarCampo", error );
        }
    }

    /**
     * Deshabilita uno o múltiples campos de un formulario de NetSuite cambiando su tipo de visualización a DISABLED.
     * ! Tipo de script válido: ClientScript
     *
     * @function deshabilitarCampos
     *
     * @param {Object} context - Objeto de contexto de NetSuite que contiene la referencia al formulario actual.
     * @param {Array<Object>} camposConfiguracion - Array de objetos de configuración que especifican los campos a deshabilitar.
     * @example
     *   Deshabilitar múltiples campos
     *     const config = [
     *         { fieldId: 'custbody_total_calculado' },
     *         { fieldId: 'custbody_fecha_automatica' },
     *         { fieldId: 'custbody_status_interno' }
     *     ];
     * @returns {void} Esta función no retorna ningún valor.
     * @author Mauro F Ramos
     *
     */
    const deshabilitarCampos = (context, camposConfiguracion) => {
        try {
            const form = context.form;
            camposConfiguracion.forEach(config => {
                const { fieldId } = config;

                const disabled = form.getField({ id: fieldId });
                disabled.updateDisplayType({ displayType: "DISABLED" });
            })
        } catch (error) {
            log.error("ERROR ocultarCampo", error );
        }
    }

    /**
     * Obtener información una ejecutiva de ventas en función del ID del representante de ventas en NetSuite.
     *
     * @param {number} representante_ventas - id del representante de ventas en netsuite
     * @returns {string|boolean} - Retorna el correo electrónico del jefe de la ejecutiva de ventas. Retorna false en caso de error.
     */
    const getJefeEjecutiva = (representante_ventas) => {
        try {
        let loginApiToken = loginGetToken();
        let params = {
            opcion: "100",
            datSelect: "SELECT TOP 1 EMP.CODIGO EJECUTIVA, JEF.CODIGO JEFE, RTRIM(LTRIM(EMP.IDENTIFICACION )) IDENTIFICACION_EJE,RTRIM(LTRIM(JEF.IDENTIFICACION )) IDENTIFICACION_JEF, ISNULL((SELECT EJ.DIRECCION_E_MAIL FROM SRVHAWKEYE.hra_prod.[dbo].[VW_COLABORADORES_SYSHUNTER] EJ WITH(NOLOCK) WHERE EJ.CEDULA = EMP.IDENTIFICACION AND EJ.STATUS NOT IN ('E')),'') MAIL_EJECUTIVO, ISNULL((SELECT EJ.DIRECCION_E_MAIL FROM SRVHAWKEYE.hra_prod.[dbo].[VW_COLABORADORES_SYSHUNTER] EJ WITH(NOLOCK) WHERE EJ.CEDULA = JEF.IDENTIFICACION AND EJ.STATUS NOT IN ('E')), '') MAIL_JEFE, ISNULL((SELECT EJ.DIRECCION_E_MAIL FROM HUNTER.DBO.COM_EMPLEADO_COMISION J WITH(NOLOCK), SRVHAWKEYE.hra_prod.[dbo].[VW_COLABORADORES_SYSHUNTER] EJ WITH(NOLOCK) WHERE J.COM_EMPLEADO_ID = EMP.JEFE_ID AND EJ.CEDULA = J.IDENTIFICACION AND EJ.STATUS NOT IN ('E')),'') MAIL_JEFE2, EMP.JEFE_ID, EMP.CODIGO_NS, R.*",
            datFrom: "FROM Hunter.DBO.COM_RELACION_EMPLEADO R WITH(NOLOCK), Hunter.DBO.COM_EMPLEADO_COMISION EMP WITH(NOLOCK), Hunter.DBO.COM_EMPLEADO_COMISION JEF WITH(NOLOCK)",
            datWhere: `WHERE R.COM_EMPLEADO_ID = EMP.COM_EMPLEADO_ID AND R.JEFE_ID = JEF.COM_EMPLEADO_ID AND EMP.CODIGO_NS = ${representante_ventas} AND JEF.GEN_ESTADO_ID = 1 AND R.GEN_ESTADO_ID = 1 AND JEF.CODIGO NOT IN ('JREYMU','LYESQU','MSAMAM',EMP.CODIGO) ORDER BY R.COM_RELACION_EMPLEADO_ID DESC`
            };

        let urlBase = "https://www.hunteronline.com.ec:2023/ApiNetsuite//General/ConsultaGeneralBD";

        let headersConsulta = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${loginApiToken}`,
        };

        let response = https.post({
          url: urlBase,
          headers: headersConsulta,
          body: JSON.stringify(params),
        });

        let data = JSON.parse(response.body);
        return data.results[0];
        } catch (error) {
            log.error("error", error)
            return false
        }
    }

    const TIMEZONE_ECUADOR = "America/Guayaquil";
    const LOCALE_ECUADOR = "es-EC";

    /**
     * Obtiene la fecha y hora actual en Ecuador
     * @param {Date} [fecha] - Fecha opcional. Si no se proporciona, usa la fecha actual
     * @returns {Object} Objeto con diferentes formatos de la fecha
    */
    const getFecha= (fecha) => {
        const rand = () => String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
        const fechaBase = fecha || new Date();

        const opciones = {
            timeZone: TIMEZONE_ECUADOR,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        };

        // Formato completo: "DD/MM/YYYY, HH:mm:ss"
        const fechaFormateada = new Intl.DateTimeFormat(LOCALE_ECUADOR, opciones).format(fechaBase);

        // Obtener partes individuales
        const partes = new Intl.DateTimeFormat(LOCALE_ECUADOR, {
            timeZone: TIMEZONE_ECUADOR,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }).formatToParts(fechaBase);

        const valores = {};
        partes.forEach(parte => {
            if (parte.type !== 'literal') {
                valores[parte.type] = parte.value;
            }
        });

        return {
            // Formato legible: "11/11/2025, 15:30:45"
            formato: fechaFormateada,

            // Para campos datetime de NetSuite: "11/11/2025 15:30:45"
            fecha1: `${valores.day}/${valores.month}/${valores.year} ${valores.hour}:${valores.minute}:${valores.second}`,


            fecha2: `${valores.day}/${valores.month}/${valores.year} ${valores.hour}:${valores.minute}`,

            // Para campos de fecha de NetSuite: "11/11/2025"
            fecha3: `${valores.day}/${valores.month}/${valores.year}`,

            // Formato ISO para búsquedas: "2025-11-11T15:30:45"
            iso: `${valores.year}-${valores.month}-${valores.day}T${valores.hour}:${valores.minute}:${valores.second}`,

            // Formato para nombres de archivo: "20251111_153045"
            archivo: `${valores.year}${valores.month}${valores.day}_${valores.hour}${valores.minute}${valores.second}_${rand()}_${rand()}_${rand()}`,

            // Partes individuales
            partes: {
                dia: valores.day,
                mes: valores.month,
                anio: valores.year,
                hora: valores.hour,
                minuto: valores.minute,
                segundo: valores.second
            },

            // Objeto Date original (útil para comparaciones)
            dateObject: fechaBase
        };
    }

  const loginGetToken = () =>  _funcion.loginGetToken();

    return { executeQuery, ofuscarCampos, ocultarCampo, deshabilitarCampos, getJefeEjecutiva, getFecha, loginGetToken }
})