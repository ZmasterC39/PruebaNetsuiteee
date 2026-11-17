/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
Creado Por: JHON MONTES
Fecha: 27/09/2026
Objetivo: Realiza una Suspencion de las cobertura categorizadas para la Subsidiaria 3
Script: MapReduceScript
*/
define([
    "N/https",
    "N/log",
    "N/record",
    "N/search",
    "SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController",
    "./UtilsGeneral/HU_EC_FUNCION",
    "./UtilsGeneral/HU_EC_CONSTANTES",
    'N/file',
    'N/runtime',    
    'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller',
    'N/email',
], function (https, log, record, search, coberturaController, _funcion, _const, file, runtime, _platformController, email) {

    const SUBSIDIARIA_PE = 3;

    // Internalid de clientes (propietarios) a excluir de la suspensión para PE.
    // Vacío por defecto: agregar aquí los IDs cuando el equipo funcional los confirme, ej: [47445, 20995]
    const CLIENTES_EXCLUIDOS_PE = [];

    // MODO_PRUEBA = false -> comportamiento real: llama a PX, actualiza el
    // estado de la cobertura, crea archivos y envía correo.
    // COBERTURAS_PRUEBA: si tiene elementos, fuerza la búsqueda a traer
    // únicamente esas coberturas (aplica tanto en modo prueba como en real).
    // Dejar [] para procesar el universo completo de coberturas vencidas.
    const MODO_PRUEBA = false;
    const COBERTURAS_PRUEBA = [686220];

    // let URLPX = 'https://tyr.24hm.net/API_PX/WSPX.asmx'; // URL de LATAM PX
    let URLPX = 'https://tristan.24hm.net/API_PX_LATAM/WSPX.asmx'; // Endpoint compartido LATAM (resuelve NACIONALIDAD por subsidiaria)
    const ACCION_IMPULSO = 4;   // TODO: confirmar si PE usa el mismo ID de impulso que EC
    const folderRequest = 24651  
    const folderResponse = 24652  

    // Variable de fecha y hora
    const fechaActual = obtenerFechaActual();

    function getInputData() {
        try {
          // return
            // -------------------------------------------------------------------
            // CATEGORIZACIÓN DE CLIENTES: desactivada temporalmente para PE.
            // No se filtra por categoría del propietario; se procesan todas las
            // coberturas vencidas de la subsidiaria sin importar su categoría.
            // TODO: validar con negocio si las categorías de suspensión de PE son las mismas que EC
            // 	001 CLIENTE CORRIENTE,007 CANJE,011 PYMES,009 CLIENTE CORPORATIVO,003 CONCESIONARIO,005 FINANCIERA,006 HUNTER MONITOREO,008 CLIENTE MONITOREO (KEEPER)
            // let categoriaParaSuspencion = [1, 7, 10, 8, 3, 5, 6, 9];
            // -------------------------------------------------------------------

            let infTablaGeneral = registroOrigenProducto();

            // -------------------------------------------------------------------
            // POLÍTICAS DE VENCIMIENTO: desactivadas temporalmente para PE.
            // No se consultan los días de gracia por política; toda cobertura que
            // llega hasta acá ya fue filtrada por "coberturafinal <= fechaActual"
            // en la búsqueda, así que se trata directamente como candidata a suspensión.
            // let politicas = consultaPoliticasNetsuite();
            // -------------------------------------------------------------------
            let politicas = [];

            log.audit("FechaPolitica", fechaActual)

            let universoCobertura = buscarCoberturasPorCategoria(fechaActual /*, categoriaParaSuspencion */);
            let dataclasificada = clasificarGrupoCategoriaUniverso(universoCobertura, infTablaGeneral);

            return dataclasificada.map(result => {
                return {
                    internalid: result.internalid,
                    name: result.name,
                    idbien: result.idbien,
                    bien: result.bienText,
                    id_familia_bien: result.id_familia_bien,
                    familia_bien: result.familia_bien,
                    coberturaInicial: result.coberturaInicial,
                    coberturaFinal: result.coberturaFinal,
                    categoria_cliente: result.categoria,
                    categoria_texto: result.categoria_text,
                    categoria_grupo: result.categoria_grupo,
                    propietario: result.propietario,
                    propietario_text: result.propietario_text,
                    vendedor: result.vendedor || "",
                    vendedor_text: result.vendedor_text || "",
                    oficina: result.oficina || "",
                    oficina_text: result.oficina_text || "",
                    politicas: politicas,
                    idProducto: result.idProducto,
                    idProducto_text: result.idProducto_text,
                    idSubsidiaria: result.idSubsidiaria
                };
            });

        } catch (error) {
            log.error("Error en getInputData", error);
            return [];
        }
    }

    function map(context) {
        try {
          // return
            log.debug("En Ejecución", "---------------------------");
            const data = JSON.parse(context.value);

            if (!data || Object.keys(data).length === 0) {
                log.debug("No hay datos de cobertura", context.value);
                return;
            }

            log.debug("--Datos de Cobertura--", {
                id_coberura: data.internalid,
                idbien: data.idbien,
                id_familia_bien: data.id_familia_bien,
                familia_bien: data.familia_bien,
                coberturaInicial: data.coberturaInicial,
                coberturaFinal: data.coberturaFinal,
                categoria_cliente: data.categoria_cliente,
                categoria_grupo: data.categoria_grupo
            });

            // Validación de campos obligatorios
            const camposRequeridos = ['idbien', 'id_familia_bien', 'coberturaInicial', 'coberturaFinal', 'internalid', 'familia_bien', 'categoria_cliente', 'categoria_grupo'];
            const tieneCamposCompletos = camposRequeridos.every(campo => data[campo]);
            if (!tieneCamposCompletos) {
                log.error("Datos incompletos de cobertura", data);
                return;
            }

            // -------------------------------------------------------------------
            // POLÍTICAS DE VENCIMIENTO: desactivadas temporalmente para PE.
            // Ya no se evalúan los días de gracia por categoría/grupo; toda cobertura
            // que llega hasta acá (ya vencida según la búsqueda) se marca directamente
            // como candidata a suspensión.
            // const politicaEnDias = obtenerPoliticasNetsuite(data.categoria_grupo, data.categoria_cliente, data.politicas);
            // const resultado = evaluarCoberturaSuspencion(data, politicaEnDias, fechaActual);
            // log.debug("--Política en días--", {
            //     categoria_grupo: data.categoria_grupo,
            //     categoria_cliente: data.categoria_cliente,
            //     politicaEnDias: politicaEnDias?.dias || null,
            //     familia_bien: data.familia_bien,
            //     resultado: resultado ? "Aplica Suspensión" : "No Aplica Suspensión"
            // });
            const politicaEnDias = { dias: null };
            const resultado = true;
            // -------------------------------------------------------------------

            const esCoberturaDePrueba = MODO_PRUEBA && COBERTURAS_PRUEBA.includes(Number(data.internalid));
            if (!resultado && !esCoberturaDePrueba) return;
            if (!resultado && esCoberturaDePrueba) {
                log.audit("MODO PRUEBA - Aviso", `La política real indica que NO aplicaría suspensión para la cobertura ${data.internalid} (días de política: ${politicaEnDias?.dias ?? "sin política encontrada"}). Se continúa igual el flujo por ser modo prueba, solo para trazar el resto de la lógica.`);
            }

            const recordId = data.internalid;
            // log.debug("Record ID", recordId);

            if (!data?.idProducto) return;
            const parametrizacionItem = obtenerParametrizacionItem(data.idProducto, ['GPG', 'GPT', 'FAM', 'APS']);
            if (!parametrizacionItem?.length || parametrizacionItem?.length > 0 && parametrizacionItem[3]?.Valor === 'N') return;

            // !Actualizar estado de la cobertura
            actualizarEstadoCobertura(recordId);

            // Cargar registro de cobertura
            const recordData = record.load({ type: 'customrecord_ht_co_cobertura', id: recordId, isDynamic: false });
            const trama = obtenerDatosParaImpulso(recordData);
            if (!trama) return;

            log.debug("--Datos de Parametrización--", {
                item: data.idProducto,
                GPG: parametrizacionItem[0].Valor || "SIN VALOR",
                GPT: parametrizacionItem[1].Valor || "SIN VALOR",
                FAM: parametrizacionItem[2].Valor || "SIN VALOR",
                APS: parametrizacionItem[3].Valor || "SIN VALOR"
            });

            trama.producto = parametrizacionItem[2]?.Valor || "";

            log.debug("Trama", trama);
            log.debug("Parametrización del Item", parametrizacionItem);

            let respuestapx = false;
            let respuestaTelematic = false;

            // Enviar trama a PX si aplica
            if (parametrizacionItem[0]?.Valor === 'S') {
                log.debug("Caso Actualización Cobertura PX", "Se envia datos de Actualización a PX");
                respuestapx = casoActualizacionCoberturaLatam(trama, data.idSubsidiaria);
            }

            // -------------------------------------------------------------------
            // ENVÍO A TELEMATIC (AMI): desactivado temporalmente para PE.
            // if (esEnvioAMIValido(parametrizacionItem, trama)) {
            //     log.debug("Caso Actualización Telematic", "Se envia datos de Actualización a Telematic");
            //     respuestaTelematic = casoActualizacionTelematic(trama);
            // }
            // -------------------------------------------------------------------

            context.write({
                key: recordId,
                value: {
                    ID_COBERTURA: data.internalid,
                    COBERTURA: data.name,
                    COD_BIEN: data.idbien,
                    COD_FAMILIA: data.bien,
                    ID_FAMILIA: data.id_familia_bien,
                    FAMILIA: data.familia_bien,
                    COBERTURA_INICIAL: data.coberturaInicial,
                    COBERTURA_FINAL: data.coberturaFinal,
                    CATEGORIA_CLIENTE: data.categoria_texto,
                    COD_CAT_CLIENTE: data.categoria_cliente,
                    ID_PROPIETARIO: data.propietario,
                    PROPIETARIO: data.propietario_text,
                    ID_REPRESENTANTE_VENTA: data.vendedor || "",
                    REPRESENTANTE_VENTA: data.vendedor_text || "",
                    ID_OFICINA: data.oficina || "",
                    OFICINA: data.oficina_text || "",
                    GRUPO: data.categoria_grupo,
                    POLITICA_DIAS: politicaEnDias?.dias || null,
                    ID_ITEM: data.idProducto,
                    ITEM: data.idProducto_text,
                    GPG: parametrizacionItem[0].Valor || "SIN VALOR",
                    RESPUESTAGPG: respuestapx,
                    GPT: parametrizacionItem[1].Valor || "SIN VALOR",
                    RESPUESTAGPT: respuestaTelematic,
                    FAM: parametrizacionItem[2].Valor || "SIN VALOR",
                    EVALUACION: resultado ? "Aplica Suspensión" : "No Aplica Suspensión",
                }
            });

        } catch (error) {
            log.debug("Error en map", error);
        }
    }

    function reduce(context) {
        try {
          // return
            log.debug("context", context);

            // Convertimos la lista de resultados del map
            const resultados = context.values.map(value => JSON.parse(value));
            let resultadoFinal = [];

            // Agregamos cada objeto directamente al array final
            resultados.forEach(result => {
                resultadoFinal.push(result); // Agregamos el objeto al array
            });

            // Escribir los resultados combinados en el contexto
            context.write({
                key: context.key,
                value: JSON.stringify(resultadoFinal) // Convertimos el array a JSON para el summary
            });

            log.debug("Resultado final escrito en context.write", resultadoFinal);

        } catch (error) {
            log.error("Error en reduce", error);
        }
    }

    function summarize(summary) {
        try {
          // return
            let allResults = [];

            // Iterar sobre los resultados del reduce
            summary.output.iterator().each((key, value) => {
                let parsedValue = JSON.parse(value);
                allResults.push(...parsedValue);
                return true;
            });

            if (MODO_PRUEBA) {
                log.audit("MODO PRUEBA - Resultados a reportar", allResults);
                log.audit("MODO PRUEBA - Envio de Reporte (omitido)", "Se generaría el Excel y se enviaría por correo a jmontes@hunter.com.pe. Se omite la creación del archivo y el envío del correo.");
                log.audit('Resumen de procesamiento', { recordsProcessed: summary.inputSummary.totalKeys });
                return;
            }

            const excelContent = convertToExcelXML(allResults);
            log.debug("excelContent", excelContent)

            let nombreTemporalExel = `Reporte_Cobertura_Suspension_PE_${fechaSistemaLog()}.xls`;

            const excelFile = file.create({
                name: nombreTemporalExel,        // .xls es compatible con Excel
                fileType: file.Type.XMLDOC,      // Usamos XMLDOC para este contenido
                contents: excelContent
            });

            // Enviar el archivo por correo
            email.send({
                author: 449,
                recipients: ['jmontes@hunter.com.pe','pcordova@hunter.com.pe','rzamudio@hunter.com.pe'],
                subject: 'Reporte de Resultados del Map/Reduce - PE',
                body: 'Adjunto encontrarás el archivo xls generado.',
                attachments: [excelFile]
            });
            log.audit('Correo enviado correctamente con archivo adjunto en memoria');

            log.audit('Resumen de procesamiento', {
                recordsProcessed: summary.inputSummary.totalKeys,
            });
        } catch (error) {
            log.error("Error en summarize", { error: error.message, stack: error.stack });
        }
    }

    function convertToExcelXML(data) {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]);

        let rowsXML = '';

        // Encabezados
        rowsXML += '<Row>';
        headers.forEach(header => {
            rowsXML += `<Cell><Data ss:Type="String">${escapeXML(header)}</Data></Cell>`;
        });
        rowsXML += '</Row>';

        // Datos
        data.forEach(row => {
            rowsXML += '<Row>';
            headers.forEach(header => {
                const value = row[header] != null ? row[header] : '';
                rowsXML += `<Cell><Data ss:Type="String">${escapeXML(value.toString())}</Data></Cell>`;
            });
            rowsXML += '</Row>';
        });

        // Plantilla completa Excel XML
        return `<?xml version="1.0"?>
                <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                xmlns:o="urn:schemas-microsoft-com:office:office"
                xmlns:x="urn:schemas-microsoft-com:office:excel"
                xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
                xmlns:html="http://www.w3.org/TR/REC-html40">
                <Worksheet ss:Name="Resultado">
                <Table>
                ${rowsXML}
                </Table>
                </Worksheet>
                </Workbook>`;
    }

    function escapeXML(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
    * Funciones Auxiliares
    */
    const fechaSistemaLog = () => {
        let date = new Date();
        let tdate = date.getDate();
        tdate = tdate < 10 ? `0${tdate}` : tdate;
        let month = date.getMonth() + 1;
        month = month < 10 ? `0${month}` : month;
        let year = date.getFullYear();
        let hours = date.getHours();
        hours = hours < 10 ? `0${hours}` : hours;
        let minutes = date.getMinutes();
        minutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${tdate}${month}${year}${hours}${minutes}`;
    };

    function obtenerFechaActual() {
        try {
            // Obtener la fecha actual en la zona horaria de Perú
            let fechaPeru = new Date().toLocaleString("en-US", { timeZone: "America/Lima" });
            let today = new Date(fechaPeru);

            // Restar 3 días a la fecha actual
            // today.setDate(today.getDate());  // Se ajusta a dos dias
            today.setDate(today.getDate() - 1); // Restar un día

            // Formatear la fecha en el formato "DD/MM/YYYY"
            let dia = today.getDate().toString().padStart(2, '0');
            let mes = (today.getMonth() + 1).toString().padStart(2, '0'); // Los meses son indexados desde 0
            let anio = today.getFullYear();

            let fechaFormateada = `${dia}/${mes}/${anio}`;
            return fechaFormateada;

        } catch (error) {
            log.debug("error", error)
            return
        }
    };

    function registroOrigenProducto() {
        try {
            let searchObj = search.create({
                type: "customrecord_ht_general_tabla_codigos",
                filters: [
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    search.createColumn({ name: "name", label: "ID" }),
                    search.createColumn({ name: "created", label: "Fecha de creación" }),
                    search.createColumn({ name: "custrecord_ht_subsidiaria_gtc", label: "HT Subsidiaria" }),
                    search.createColumn({ name: "custrecord_ht_codigo_tabla", label: "HT CODIGO TABLA" }),
                    search.createColumn({ name: "custrecord_ht_codigo_gtc", label: "HT CODIGO" }),
                    search.createColumn({ name: "custrecord_ht_codigo_nuevo", label: "HT CODIGO NUEVO" }),
                    search.createColumn({
                        name: "custrecord_ht_pp_codigo",
                        join: "CUSTRECORD_HT_CODIGO_GTC",
                        label: "Código"
                    }),
                    search.createColumn({
                        name: "custrecord33",
                        join: "CUSTRECORD_HT_CODIGO_GTC",
                        label: "Subsidiaria"
                    })
                ]
            });

            let searchResult = searchObj.run().getRange({ start: 0, end: 1000 });
            let data = [];

            if (searchResult && searchResult.length > 0) {

                searchResult.forEach(result => {
                    let codigoTabla = result.getValue({ name: "custrecord_ht_codigo_tabla" }) || "";
                    let codigo = result.getValue({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_CODIGO_GTC" }) || "";
                    let descripcion = result.getValue({ name: "custrecord_ht_codigo_gtc" }) || "";
                    let codigoNuevo = result.getValue({ name: "custrecord_ht_codigo_nuevo" }) || "";

                    data.push({
                        CODIGO_TABLA: codigoTabla,
                        CODIGO: codigo,
                        DESCRIPCION: descripcion,
                        CODIGO_NUEVO: codigoNuevo
                    });
                });
            }

            return data;


        } catch (error) {
            log.error("Error en registroOrigenProducto", { error: error.message, stack: error.stack });
            return [];
        }
    };

    function consultaPoliticasNetsuite() {
        try {
            let searchObj = search.create({
                type: "customrecord_ht_suspension_politica_net",
                filters: [
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_ht_subsidiaria_spn", "anyof", SUBSIDIARIA_PE]
                ],
                columns: [
                    search.createColumn({ name: "name", label: "ID" }),
                    search.createColumn({ name: "created", label: "Fecha de creación" }),
                    search.createColumn({ name: "custrecord_ht_tipo_categoria_spn", label: "HT TIPO CATEGORIA SPN" }),
                    search.createColumn({ name: "custrecord_ht_tipo_cliente_clt", label: "HT TIPO_CLIENTE_CLT" }),
                    search.createColumn({ name: "custrecord_ht_tipo_clte_sus", label: "HT TIPO CLTE SUS" }),
                    search.createColumn({ name: "custrecord_ht_grupo_spn", label: "HT GRUPO SPN" }),
                    search.createColumn({ name: "custrecord_ht_dias_spn", label: "HT DIAS SPN" })
                ]
            });

            let searchResult = searchObj.run().getRange({ start: 0, end: 1000 });

            let data = [];

            if (searchResult && searchResult.length > 0) {
                searchResult.forEach(result => {
                    let tipoCategoria = result.getValue({ name: "custrecord_ht_tipo_categoria_spn" }) || "";
                    let tipoClienteCLT = result.getValue({ name: "custrecord_ht_tipo_cliente_clt" }) || "";
                    let tipoClienteSUS = result.getValue({ name: "custrecord_ht_tipo_clte_sus" }) || "";
                    let grupo = result.getValue({ name: "custrecord_ht_grupo_spn" }) || "";
                    let dias = result.getValue({ name: "custrecord_ht_dias_spn" }) || "";

                    data.push({
                        TIPO_CATEGORIA: tipoCategoria,
                        TIPO_CLIENTE_CLT: tipoClienteCLT,
                        TIPO_CLTE_SUS: tipoClienteSUS,
                        GRP: grupo,
                        DIAS: dias
                    });
                });
            }

            // log.debug("Consulta Politicas Netsuite", data);
            return data;

        } catch (error) {
            log.error("Error en consultaPoliticasNetsuite", { error: error.message, stack: error.stack });
            return [];
        }
    };

    const obtenerDatosParaImpulso = (dataCobertura) => {
        try {
            // Validaciones iniciales
            if (!dataCobertura) throw new Error("El objeto dataCobertura es nulo o indefinido.");
            const PARAMETRO_PRODUCTO = "GPT";

            // Obtener valores de dataCobertura
            const idCobertura = dataCobertura.id;
            const CodigoVehiculo = dataCobertura.getValue('custrecord_ht_co_bien')?.toString() || "";
            const datoTecnico = dataCobertura.getValue('custrecord_ht_co_numeroserieproducto') || "";
            const fechaFinal = formatearFecha(dataCobertura.getText('custrecord_ht_co_coberturafinal')) || "";
            if (!fechaFinal) throw new Error("La fecha final no tiene valor.");

            const custrecord_ht_co_producto = dataCobertura.getValue('custrecord_ht_co_producto') || "";
            const estadocobertura = dataCobertura.getValue('custrecord_ht_co_estado_cobertura') || "";
            const Propietario = dataCobertura.getValue('custrecord_ht_co_propietario') || "";
            const PropietarioMonitoreo = dataCobertura.getValue('custrecord_ht_co_clientemonitoreo') || "";

            // Obtener información del cliente
            const infoCliente = obtenerDataCliente(Propietario) || {};
            const infoClienteMonitoreo = obtenerDataCliente(PropietarioMonitoreo) || {};

            // Determinar estado de la SIM
            const EstadoSim = estadocobertura === "1" ? "ACT" : estadocobertura === "2" ? "INA" : (() => { throw new Error("Estado de cobertura no válido."); })();

            // Obtener información del bien
            const { CodigoSys } = obtenerDataBien(CodigoVehiculo);

            // Retornar la trama de datos
            return {
                EstadoSim,
                IdCobertura: idCobertura,
                IdDatoTecnico: datoTecnico,
                FechaFinCobertura: fechaFinal,

                // Plataforma AMI
                clientepropietario: infoCliente?.clientId || "",
                clientemonitoreo: infoClienteMonitoreo?.clientId || infoCliente?.clientId || "",
                codigovehiculo: CodigoVehiculo,
                codigosys: CodigoSys,
                cobertura: new Date(fechaFinal).toISOString(),
                producto: "",
                itemNS: custrecord_ht_co_producto,
                ordenservicio: "0",
                usuario: "OPERAD",
                origen: "N",
                parametroproducto: PARAMETRO_PRODUCTO
            };

        } catch (error) {
            log.debug("Error en obtenerDatosParaImpulso", error.message);
            return false;
        }
    };

    const obtenerDataBien = (id) => {
        let objData = {
            IdMarca: '',
            DescMarca: '',
            IdModelo: '',
            DescModelo: '',
            IDTelematics: '',
            name: '',
            placa: '',
            CodigoSys: ''
        };

        if (!id) return objData; // Retornar objeto vacío si el ID es nulo o indefinido

        try {
            let objSearch = search.create({
                type: "customrecord_ht_record_bienes",
                filters: [
                    ["internalid", "anyof", id]
                ],
                columns: [
                    search.createColumn({ name: "custrecord_ht_marca_descripcion", join: "CUSTRECORD_HT_BIEN_MARCA", label: "Descripcion" }),
                    search.createColumn({ name: "custrecord_ht_marca_codigo", join: "CUSTRECORD_HT_BIEN_MARCA", label: "Codigo" }),
                    search.createColumn({ name: "custrecord_ht_mod_descripcion", join: "CUSTRECORD_HT_BIEN_MODELO", label: "Descripcion" }),
                    search.createColumn({ name: "custrecord_ht_mod_codigo", join: "CUSTRECORD_HT_BIEN_MODELO", label: "Codigo" }),
                    search.createColumn({ name: "custrecord_ht_bien_id_telematic", label: "ID Telematics" }),
                    search.createColumn({ name: "name", label: "Name" }),
                    search.createColumn({ name: "custrecord_ht_bien_placa", label: "Placa" }),
                    search.createColumn({ name: "custrecord_ht_bien_codsysh", label: "custrecord_ht_bien_codsysh" }),
                ]
            });

            let result = objSearch.run().getRange({ start: 0, end: 1 })[0];
            if (result) {
                objData.IdMarca = result.getValue({ name: "custrecord_ht_marca_codigo", join: "CUSTRECORD_HT_BIEN_MARCA" }) || '';
                objData.DescMarca = result.getValue({ name: "custrecord_ht_marca_descripcion", join: "CUSTRECORD_HT_BIEN_MARCA" }) || '';
                objData.IdModelo = result.getValue({ name: "custrecord_ht_mod_codigo", join: "CUSTRECORD_HT_BIEN_MODELO" }) || '';
                objData.DescModelo = result.getValue({ name: "custrecord_ht_mod_descripcion", join: "CUSTRECORD_HT_BIEN_MODELO" }) || '';
                objData.IDTelematics = result.getValue({ name: "custrecord_ht_bien_id_telematic" }) || '';
                objData.name = result.getValue({ name: "name" }) || '';
                objData.placa = result.getValue({ name: "custrecord_ht_bien_placa" }) || '';
                objData.CodigoSys = result.getValue({ name: "custrecord_ht_bien_codsysh" }) || '';
            }
        } catch (error) {
            log.error("Error en getDataBien", error);
        }

        return objData;
    };

    const obtenerDataCliente = (id) => {
        const emptyClient = {
            clientId: "",
            clientName: "",
            phone: "",
            mobilephone: "",
            isPerson: "",
            companyName: ""
        };

        try {
            if (!id) {
                // log.error('getClientInfo', 'El ID del cliente es nulo o indefinido');
                return emptyClient;
            }

            const searchClientInfo = search.lookupFields({
                type: "customer",
                id: id,
                columns: ['vatregnumber', 'altname', 'phone', 'mobilephone', 'homephone', 'isperson', 'companyname']
            });

            if (!searchClientInfo || Object.keys(searchClientInfo).length === 0) {
                log.error('getClientInfo', `No se encontró información para el cliente con ID: ${id}`);
                return emptyClient;
            }

            return {
                clientId: searchClientInfo.vatregnumber || "",
                clientName: searchClientInfo.altname || "",
                phone: searchClientInfo.phone || searchClientInfo.homephone || "",
                mobilephone: searchClientInfo.mobilephone || "",
                isPerson: searchClientInfo.isperson || "",
                companyName: searchClientInfo.companyname || ""
            };

        } catch (error) {
            log.error('error-getClientInfo', error.message || error);
            return emptyClient;
        }
    };

    const formatearFecha = (fecha) => {
        try {
            const partes = fecha.split("/");
            const dia = partes[0];
            const mes = partes[1];
            const año = partes[2];
            const fechaFormateada = `${año}-${mes}-${dia}`;
            return fechaFormateada;
        } catch (error) {
            throw new Error("Error en Formatear fecha");
        }
    };

    const obtenerParametrizacionItem = (items, busquedaParametro) => {
        try {
            let data = [];
            for (let i = 0; i < busquedaParametro.length; i++) {

                if (!items || !busquedaParametro[i]) {
                    log.error("Error", "El ID del item o el parámetro de búsqueda son nulos o indefinidos");
                    return [];
                }

                let filtro = [
                    ["custrecord_ht_pp_parametrizacionid", "is", items],
                    "AND",
                    ["custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code", "is", busquedaParametro[i]]
                ];

                let busqueda = search.create({
                    type: "customrecord_ht_pp_main_param_prod",
                    filters: filtro,
                    columns: [
                        search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela", label: "Param" }),
                        search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor", label: "Valor" }),
                        search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA", label: "Código" }),
                        search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR", label: "Código" }),
                    ],
                });

                let resultCount = busqueda?.runPaged()?.count || 0;

                if (resultCount > 0) {
                    let pageData = busqueda.runPaged({ pageSize: 1 });
                    pageData.pageRanges.forEach((pageRange) => {
                        let page = pageData.fetch({ index: pageRange.index });
                        page.data.forEach((result) => {
                            let columns = result.columns;
                            let parametrizacion = {
                                Param: result.getValue(columns[2]) || "",
                                ParamId: result.getValue(columns[0]) || "",
                                Valor: result.getValue(columns[3]) || "",
                                ValorText: result.getText(columns[1]) || "",
                                ValorId: result.getValue(columns[1]) || "",
                            };
                            data.push(parametrizacion);
                        });
                    });
                } else {
                    data.push({
                        Param: "",
                        ParamId: "",
                        Valor: "",
                        ValorText: "",
                        ValorId: "",
                    });
                }
            }

            return data;
        } catch (error) {
            log.error("Error", { error: error.message, stack: error.stack });
            return []
        }
    };

    const crearRegistroImpulso = (cobertura, requestFile, responseFile, respuesta, Plataforma) => {
        if (MODO_PRUEBA) {
            log.audit("MODO PRUEBA - Registro de Traza de Impulso (omitido)", { cobertura, requestFile, responseFile, respuesta, Plataforma });
            return;
        }
        try {
            let objRecord = record.create({ type: 'customrecord_ht_ct_traza_impulso_platafo', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_cobertura', value: cobertura });                          // ID Cobertura
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_impulso', value: ACCION_IMPULSO });                       // ID del impulso
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_plataforma', value: Plataforma });                        // Plataforma -> PX
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_estado', value: 'Enviado' });                             // Estado -> enviado
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_envio', value: requestFile });                      // Documento
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_respuesta', value: responseFile });                 // Documento
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_respuesta', value: respuesta });                          // Documento

            let saveRecord = objRecord.save();
            log.debug('Registro guardado con ID', saveRecord);
        } catch (error) {
            log.error('Error al crear el registro de traza', { error: error.message, stack: error.stack });
        }
    };

    function generarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste) {
        if (MODO_PRUEBA) {
            log.audit("MODO PRUEBA - Log de Cambio de Estado (omitido)", { registroID, EstadoProcesado, Ajuste });
            return;
        }
        try {

            let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: Ajuste });
            objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
            objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
            objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
            objRecord.save();

        } catch (error) {
            log.error('Error en generarLogCambioEstado', error);
        }
    };

    // =====================================================================
    // ENVÍO A TELEMATIC (AMI): función aislada/desactivada temporalmente para PE.
    // Se deja el código completo comentado (no se borra) para poder reactivarlo
    // fácilmente más adelante. Ver también el punto de invocación comentado en map().
    // =====================================================================
    /*
    const casoActualizacionTelematic = (data) => {
        try {

            if (MODO_PRUEBA) {
                log.audit("MODO PRUEBA - Envio a Telematic/AMI (omitido)", {
                    mensaje: "Se llamaría a https.post contra ProcesoAMI/ActualizacionCoberturaNetsuite. Llamada omitida.",
                    clientepropietario: data.clientepropietario,
                    clientemonitoreo: data.clientemonitoreo,
                    codigovehiculo: data.codigovehiculo,
                    codigosys: data.codigosys,
                    cobertura: data.cobertura,
                    producto: data.producto,
                    itemNS: data.itemNS
                });
                return true;
            }

            // Validar que los datos no sean nulos, vacíos o indefinidos
            if (!data || Object.keys(data).length === 0) {
                log.error("casoActualizacionTelematic", "Los datos proporcionados son nulos, vacíos o indefinidos.");
                return false;
            }

            // Obtener el token
            const token = _funcion.loginGetToken();
            if (!token) {
                // log.error("casoActualizacionTelematic", "No se pudo obtener el token.");
                // generarLogCambioEstado(data, data.IdCobertura || 0, "F", "ProcesoAMI");
                return false;
            }

            // Configurar los headers
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            // Construir el cuerpo de la solicitud
            const requestData = {
                "clientepropietario": data.clientepropietario,
                "clientemonitoreo": data.clientemonitoreo,
                "codigovehiculo": data.codigovehiculo,
                "codigosys": data.codigosys,
                "serie": "",
                "comando": "",
                "ruccompania": "",
                "ordentrabajo": "0",
                "sensors": "0",
                "cobertura": data.cobertura,
                "producto": data.producto,
                "itemNS": data.itemNS,
                "ordenservicio": data.ordenservicio,
                "usuario": "OPERAD",
                "origen": "N",
                "parametroproducto": "GPT",
                "vehiculoid": "",
                "clienteid": "",
                "accion": "",
                "vidanterior": "",
                "vid": ""
            };

            log.debug("Datos de la solicitud", requestData);

            // return true; // Retornar true para evitar errores en el proceso

            // Configurar las opciones de la solicitud
            const options = {
                method: "POST",
                url: `${_const.URLS.HUNTER_API_NETSUITE}/ProcesoAMI/ActualizacionCoberturaNetsuite`,
                headers: headers,
                body: JSON.stringify(requestData),
            };

            // log.debug("Opciones de la API externa", options);

            // Realizar la solicitud HTTP
            let response = https.post(options);

            // Validar la respuesta
            let temporal = response && response.body ? JSON.parse(response.body) : null;
            let respuesta = temporal && temporal[0]?.cODIGO == "1" ? temporal[0]?.cODIGO : response;

            // Crear archivos de trazabilidad
            const requestFile = saveJson(requestData, `request_${data.EstadoSim || 0}_${data.codigovehiculo}_GPT_${sysDateTime()}`, folderRequest);
            // log.debug("Archivo de solicitud creado", requestFile);

            const responseFile = saveJson(response, `response_${data.EstadoSim || 0}_${data.codigovehiculo}_GPT_${sysDateTime()}`, folderResponse);
            // log.debug("Archivo de respuesta creado", responseFile);

            // Crear registro de impulso
            crearRegistroImpulso(data.IdCobertura, requestFile, responseFile, respuesta, "TELEMATICS");

            // Validar el estado de la respuesta
            if (response && response.code == 200) {
                log.debug("Respuesta exitosa de la API externa", temporal);
                return true;
            } else {
                log.error("Error en la respuesta de la API externa", temporal || response);
                generarLogCambioEstado(data, data.datoTecnicoID || 0, "F", "ProcesoAMI");
                return false;
            }
        } catch (error) {
            log.error("Error en casoActualizacionTelematic", error.message);
            // crearRegistroImpulso(data?.IdCobertura, "", "", error?.message, "TELEMATICS");
            // generarLogCambioEstado(error, data?.IdCobertura || 0, "F", "ProcesoAMI");
            return false;
        }
    };

    function esEnvioAMIValido(parametrizacion_Item, trama) {
        return (
            parametrizacion_Item[1]?.Valor === 'S' &&     // Validar si el envío a AMI está habilitado posee GPT
            trama.producto &&                             // Validar que el producto no esté vacío
            trama.FechaFinCobertura                       // Validar que la fecha de fin no esté vacía
        );
    };
    */
    // =====================================================================

    function actualizarEstadoCobertura(recordId) {
        try {

            if (MODO_PRUEBA) {
                log.audit("MODO PRUEBA - Actualizar Estado Cobertura (omitido)", `Se actualizaría custrecord_ht_co_estado_cobertura a 2 (Suspendida) en el registro ID ${recordId}. No se ejecuta ningún record.submitFields real.`);
                return;
            }

            record.submitFields({
                type: "customrecord_ht_co_cobertura",
                id: recordId,
                values: {
                    custrecord_ht_co_estado_cobertura: 2 // Nuevo estado
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            log.debug("Estado de cobertura actualizado", `ID: ${recordId}`);
        } catch (error) {
            log.error("Error al actualizar el estado de cobertura", {
                recordId: recordId,
                mensaje: error.message
            });
            throw error; // Relanzamos el error para que sea manejado en el bloque principal
        }
    };

    function casoActualizacionCoberturaLatam(trama, SubsidiariaID) {
        try {

            if (MODO_PRUEBA) {
                log.audit("MODO PRUEBA - Envio a PX (omitido)", {
                    mensaje: "Se llamaría a _platformController.envioPXActualizacionEstado (RESTlet -> SOAP WSPX.asmx). Llamada omitida.",
                    IdDatoTecnico: trama.IdDatoTecnico,
                    codigovehiculo: trama.codigovehiculo,
                    EstadoSim: trama.EstadoSim,
                    SubsidiariaID,
                    URLPX
                });
                return true;
            }

            // log.debug("trama", trama) // !
            // log.debug("SubsidiariaID", SubsidiariaID) // !
            const camposRequeridos = ['IdDatoTecnico', 'codigovehiculo'];

            const camposVacios = camposRequeridos.filter(campo => !trama[campo] || trama[campo] === '');
            if (camposVacios.length > 0) {
                // log.debug("--jsonCobertura--", jsonCobertura)
                log.error('Campos vacíos en jsonCobertura', `Los siguientes campos están vacíos: ${camposVacios.join(', ')}`);
                return false;
            }

            // log.debug("trama", trama.EstadoSim) // !

            if (trama.EstadoSim != "ACT" && trama.EstadoSim != "INA") {
                log.debug("Estado SIM no válido", trama.EstadoSim)
                return false;
            }

            // LOG las propiedades necesarias
            log.debug("IdDatoTecnico", trama.IdDatoTecnico);
            log.debug("SubsidiariaID", SubsidiariaID);
            log.debug("codigovehiculo", trama.codigovehiculo);
            log.debug("EstadoSim", trama.EstadoSim);

            // return true

            let procesoPX = _platformController.envioPXActualizacionEstado(trama.IdDatoTecnico, SubsidiariaID, URLPX, trama.codigovehiculo, "1", trama.EstadoSim);

            // log.debug("Respuesta procesoPX", procesoPX);

            if ((procesoPX?.response?.body != "1") || (procesoPX?.response?.body != 1)) {
                // Generar log Proceso General PX
                generarLogCambioEstado(procesoPX.PxAdmin, trama.IdCobertura, 'F', "ProcesoPX");
                return false; // Retornar false si la respuesta no es válida
            } else {
                // Crear Archivos
                let requestFile = saveJson(procesoPX?.PxAdmin || {}, `request_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderRequest);  // json traza
                // log.debug('idrequestFile', requestFile);

                let responseFile = saveJson(procesoPX, `response_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderResponse);   // json Respuesta
                // log.debug('idresponseFile', requestFile);

                crearRegistroImpulso(trama.IdCobertura, requestFile, responseFile, procesoPX.response.body, 'PX');

                return true; // Retornar la respuesta del proceso PX
            }

        } catch (error) {
            log.debug("error", error)
            // crearRegistroImpulso(trama?.IdCobertura, "", "", error?.message, 'PX');
            // generarLogCambioEstado(error, trama?.IdCobertura, 'F', "ProcesoPX");
            return false
        }
    };

    function obtenerPoliticasNetsuite(CODIGO, CATEGORIA, POLITICA_NET) {
        try {
            let politicaEncontrada = []

            if (!CODIGO || !CATEGORIA) {
                log.error("Datos incompletos", "Código o categoría no proporcionados.");
                return { dias: null };
            }
            // log.debug("obtenerPoliticasYCategorias", `Código: ${CODIGO}, Categoría: ${CATEGORIA}`);

            politicaEncontrada = POLITICA_NET.find(p =>
                p.GRP == CODIGO && p.TIPO_CATEGORIA == CATEGORIA
            );

            return {
                dias: politicaEncontrada ? politicaEncontrada?.DIAS : null
            };

        } catch (error) {
            log.error("Error al obtener políticas de NetSuite", error);
            return { dias: null };
        }

    };

    function buscarCoberturasPorCategoria(fechaPolitica, categoria) {
        try {

            // -------------------------------------------------------------------
            // CATEGORIZACIÓN DE CLIENTES: desactivada temporalmente para PE.
            // Ya no se exige ni se filtra por categoría del propietario.
            // if (!fechaPolitica || !categoria) { // Validar que los parámetros no sean nulos o indefinidos
            //     log.error("Parámetros inválidos", "Fecha de política o categoría no proporcionados.");
            //     return [];
            // }
            if (!fechaPolitica) {
                log.error("Parámetros inválidos", "Fecha de política no proporcionada.");
                return [];
            }

            // const categorias = Array.isArray(categoria) ? categoria : [categoria];
            // -------------------------------------------------------------------
            // log.debug("Buscar Coberturas", `Fecha: ${fechaPolitica}, Categorías: ${categorias}`);

            let filtrosBusqueda;
            if (COBERTURAS_PRUEBA.length) {
                log.audit("FILTRO FORZADO DE COBERTURAS", `Se ignoran los filtros de categoría/estado/fecha. Se forzará la búsqueda solo para la(s) cobertura(s): ${COBERTURAS_PRUEBA.join(', ')} (MODO_PRUEBA=${MODO_PRUEBA})`);
                filtrosBusqueda = [
                    ["internalid", "anyof", ...COBERTURAS_PRUEBA]
                ];
            } else {
                filtrosBusqueda = [
                    ["custrecord_ht_co_subsidiaria", "anyof", SUBSIDIARIA_PE],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_ht_co_coberturafinal", "onorbefore", fechaPolitica],
                    "AND",
                    ["custrecord_ht_co_estado_cobertura", "anyof", "1"],
                    // -------------------------------------------------------------------
                    // CATEGORIZACIÓN DE CLIENTES: desactivada temporalmente para PE.
                    // No se filtra por categoría de cliente; se toman todas las coberturas
                    // vencidas de la subsidiaria sin importar la categoría del propietario.
                    // "AND",
                    // ["custrecord_ht_co_propietario.category", "anyof", ...categorias],
                    // -------------------------------------------------------------------
                    ...(CLIENTES_EXCLUIDOS_PE.length
                        ? ["AND", ["custrecord_ht_co_propietario.internalid", "noneof", ...CLIENTES_EXCLUIDOS_PE]]
                        : [])
                ];
            }

            const searchObj = search.create({
                type: "customrecord_ht_co_cobertura",
                filters: filtrosBusqueda,
                columns: [
                    "custrecord_ht_co_bien",
                    "custrecord_ht_co_familia_prod",
                    { name: "custrecord_ht_pp_codigo", join: "custrecord_ht_co_familia_prod" },
                    "custrecord_ht_co_coberturainicial",
                    "custrecord_ht_co_coberturafinal",
                    "internalid",
                    { name: "category", join: "custrecord_ht_co_propietario" }
                    , "name",
                    "custrecord_ht_co_propietario"
                    , { name: "name", join: "custrecord_ht_co_bien" }
                    , {
                        name: "salesrep",
                        join: "CUSTRECORD_HT_CO_PROPIETARIO",
                    }
                    , {
                        name: "custentity_ht_cl_oficinacliente",
                        join: "CUSTRECORD_HT_CO_PROPIETARIO",
                    },
                    "custrecord_ht_co_producto",
                    "custrecord_ht_co_subsidiaria"
                ]
            });

            const results = [];

            const pagedData = searchObj.runPaged({ pageSize: 100 });

            // cantidad de registros
            log.debug("Cantidad de registros encontrados", pagedData.count);

            pagedData.pageRanges.forEach(pageRange => {
                const page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach(result => {
                    results.push({
                        internalid: result.getValue({ name: "internalid" }),
                        name: result.getValue({ name: "name" }),
                        idbien: result.getValue({ name: "custrecord_ht_co_bien" }),
                        bienText: limpiarCaracteresEspeciales(result.getText({ name: "custrecord_ht_co_bien" })),
                        id_familia_bien: result.getValue({ name: "custrecord_ht_co_familia_prod" }),
                        familia_bien: result.getValue({ name: "custrecord_ht_pp_codigo", join: "custrecord_ht_co_familia_prod" }),
                        coberturaInicial: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
                        coberturaFinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
                        categoria: result.getValue({ name: "category", join: "custrecord_ht_co_propietario" }),
                        categoria_text: result.getText({ name: "category", join: "custrecord_ht_co_propietario" }),
                        propietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
                        propietario_text: limpiarCaracteresEspeciales(result.getText({ name: "custrecord_ht_co_propietario" })),
                        vendedor: result.getValue({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
                        vendedor_text: limpiarCaracteresEspeciales(result.getText({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" })),
                        oficina: result.getValue({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
                        oficina_text: limpiarCaracteresEspeciales(result.getText({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" })),
                        idProducto: result.getValue({ name: "custrecord_ht_co_producto" }),
                        idProducto_text: limpiarCaracteresEspeciales(result.getText({ name: "custrecord_ht_co_producto" })),
                        idSubsidiaria: result.getValue({ name: "custrecord_ht_co_subsidiaria" }),
                    });
                });
            });

            return results;
        } catch (error) {
            log.error("Error al ejecutar la búsqueda de coberturas", error);
            return [];
        }
    };

    function limpiarCaracteresEspeciales(texto) {
        if (!texto) return texto; // Si el texto es nulo o indefinido, devolverlo tal cual
        return texto.replace(/[^\w\s]/gi, ''); // Reemplazar caracteres especiales con una cadena vacía
    }

    function clasificarGrupoCategoriaUniverso(datosCobertura, origen) {
        try {
            if (!origen) {
                log.error("Origen no definido", "El origen de datos no está disponible para clasificar las coberturas.");
                return [];
            }

            return datosCobertura.map(item => {
                const familia = item.familia_bien;
                const encontrado = origen.find(entry => entry.CODIGO == familia);

                const categoria_producto = (() => {
                    if (!encontrado) return "NO DEFINIDA";

                    if (["CAR", "MON", "SAT", "PER", "SER"].includes(encontrado.CODIGO_NUEVO)) {
                        return "MON";
                    }
                    else if (encontrado.CODIGO_NUEVO === "LOJ") {
                        return "LOJ";
                    }
                    else {
                        log.debug("Categoría no definida", `Familia: ${familia}, Código Nuevo: ${encontrado.CODIGO_NUEVO}`);
                        return "NO DEFINIDA";
                    }
                })();

                return {
                    ...item,
                    categoria_grupo: categoria_producto
                };
            });

        } catch (error) {
            log.error("Error al clasificar grupo y categoría", error);
            return [];
        }
    };

    function evaluarCoberturaSuspencion(info, políticaSuspencion, fechaActual) {
        try {
            const coberturaFinal = new Date(info.coberturaFinal.split('/').reverse().join('/'));
            const fechaHoy = new Date(fechaActual.split('/').reverse().join('/'));

            const diferenciaMs = fechaHoy - coberturaFinal;
            const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));

            return diferenciaDias >= parseInt(políticaSuspencion.dias);
        } catch (error) {
            log.error("Error al evaluar cobertura", error);
            return false;
        }
    };

    const fechaSistema = () => {
        let date = new Date();
        let tdate = date.getDate();
        tdate = tdate < 10 ? `0${tdate}` : tdate;
        let month = date.getMonth() + 1;
        month = month < 10 ? `0${month}` : month;
        let year = date.getFullYear();
        let hours = date.getHours();
        hours = hours < 10 ? `0${hours}` : hours;
        let minutes = date.getMinutes();
        minutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${tdate}${month}${year}${hours}${minutes}`;
    };

    const sysDateTime = () => {
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const rand2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${rand}_${rand2}`;
    };

    const saveJson = (contents, nombre, folder) => {
        if (MODO_PRUEBA) {
            log.audit("MODO PRUEBA - Guardar archivo JSON (omitido)", { nombre, folder });
            return null;
        }
        let fecha = fechaSistema();
        let fileObj = file.create({
            name: `${nombre}_${fecha}.json`,
            fileType: file.Type.JSON,
            contents: JSON.stringify(contents),
            folder: folder,
            isOnline: false
        });
        return fileObj.save();
    };

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});
