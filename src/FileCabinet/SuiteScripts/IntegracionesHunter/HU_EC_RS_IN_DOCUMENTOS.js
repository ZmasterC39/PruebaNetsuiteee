/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/search', 'N/query'], function (log, record, search, query) {
    const LONGITUD_PAGINA = 50;
    const PaisConsulta = 'EC';

    function _get(context) {
        try {
            let ResultadoConsulta = null;
            let OpcionConsulta = context.tipodocumento;
            let FechaIni = '';
            let FechaFin = '';

            if (OpcionConsulta != "LIBRO") {
                if (typeof context.fechaini != 'undefined') {
                    if (context.fechaini.length != 0) {
                        FechaIni = context.fechaini;
                    }
                }

                if (typeof context.fechafin != 'undefined') {
                    if (context.fechafin.length != 0) {
                        FechaFin = context.fechafin;
                    }
                }
            }

            if (OpcionConsulta != "LIBRO3") {
                if (typeof context.fechaini != 'undefined') {
                    if (context.fechaini.length != 0) {
                        FechaIni = context.fechaini;
                    }
                }

                if (typeof context.fechafin != 'undefined') {
                    if (context.fechafin.length != 0) {
                        FechaFin = context.fechafin;
                    }
                }
            }

            if (OpcionConsulta == "CONTROLGASTO") {
                if (typeof context.fechaini != 'undefined') {
                    if (context.fechaini.length != 0) {
                        FechaIni = context.fechaini;
                    }
                }

                if (typeof context.fechafin != 'undefined') {
                    if (context.fechafin.length != 0) {
                        FechaFin = context.fechafin;
                    }
                }
            }


            switch (OpcionConsulta) {
                case "ORDENES":
                    ResultadoConsulta = ConsultaOrdenes(FechaIni, FechaFin);
                    return ResultadoConsulta;

                case "FACTURAS":
                    ResultadoConsulta = ConsultaFacturas(FechaIni, FechaFin);
                    return ResultadoConsulta;

                case "TRABAJO":
                    ResultadoConsulta = ConsultaTrabajo(FechaIni, FechaFin);
                    return ResultadoConsulta;

                case "FABRICACION":
                    ResultadoConsulta = ConsultaFabricacion(FechaIni, FechaFin);
                    return ResultadoConsulta;

                case "PAGO":
                    ResultadoConsulta = ConsultaPago(FechaIni, FechaFin);
                    break;

                case "DEPOSITO":
                    ResultadoConsulta = ConsultaDeposito(FechaIni, FechaFin);
                    break;

                case "NCR":
                    ResultadoConsulta = ConsultaNCR(FechaIni, FechaFin);
                    break;

                case "ANEXO":
                    ResultadoConsulta = ConsultaANEXO(context);
                    break;

                case "ANEXO2":
                    ResultadoConsulta = ConsultaANEXO2(context);
                    break;

                case "ITEMS":
                    ResultadoConsulta = ConsultaOrdenesItems(FechaIni, FechaFin);
                    break;

                case "CONSOLIDADO":
                    ResultadoConsulta = ConsultaConsolidado(FechaIni, FechaFin);
                    break;

                case "CONSOLIDADO2":
                    ResultadoConsulta = ConsultaConsolidado2(FechaIni, FechaFin);
                    break;

                case "CONSOLIDADO22":
                    let indice = Number(context?.indice || 1);
                    ResultadoConsulta = ConsultaConsolidado22(FechaIni, FechaFin, indice);
                    break;

                case "CONSOLIDADO3":
                    ResultadoConsulta = ConsultaConsolidado3(FechaIni, FechaFin);
                    break;

                case "ESTIMACION_OPORTUNIDAD":
                    ResultadoConsulta = ConsultaEstimacionOportunidad();
                    break;

                case "CLIENTE":
                    ResultadoConsulta = ConsultaClienteCreacion(FechaIni, FechaFin);
                    break;

                case "COBRO":
                    ResultadoConsulta = ConsultaCobro(FechaIni, FechaFin);
                    break;

                case "COBRO2":
                    ResultadoConsulta = ConsultaCobro2(FechaIni, FechaFin);
                    break;

                case "BIENVENIDA":
                    ResultadoConsulta = ConsultaBIENVENIDA(FechaIni, FechaFin);
                    break;

                case "COMUNICA":
                    ResultadoConsulta = ConsultaCOMUNICA(FechaIni, FechaFin);
                    break;

                case "COBRO3":
                    ResultadoConsulta = ConsultaCobro3(FechaIni, FechaFin);
                    break;

                case "LIBRO":
                    ResultadoConsulta = ConsultaLibro(context);
                    break;

                case "LIBRO2":
                    ResultadoConsulta = ConsultaLibro2(context);
                    break;

                case "LIBRO3":
                    ResultadoConsulta = ConsultaLibro3(context);
                    break;

                case "LIBRO_DISPOSITIVO":
                    ResultadoConsulta = ConsultaLibro4(context);
                    break;

                case "LIBRO_COBERTURA":
                    ResultadoConsulta = ConsultaLibro5(context);
                    break;

                case "CASOSCONTROL":
                    ResultadoConsulta = ConsultaLibro6(context);
                    break;

                case "NCR_DIA":
                    ResultadoConsulta = ConsultaNCR2(FechaIni, FechaFin);
                    break;

                case "FACTURA_DIA":
                    ResultadoConsulta = ConsultaFacturas2(FechaIni, FechaFin);
                    return ResultadoConsulta;

                case "REPORTE_ORDEN_TRABAJO":

                    let fechaCorte = convertirFecha(context?.fechaCorte);

                    if (!fechaCorte) {
                        log.error("Error de parámetros", fechaCorte);
                        return ResultadoConsulta;
                    }

                    // ResultadoConsulta = ReporteOrdenTrabajo(fechaCorte, context?.page);
                    ResultadoConsulta = ReporteOrdenTrabajo2(fechaCorte, context?.page);


                    return ResultadoConsulta;


                case "REPORTE_ORDEN_TRABAJO2":

                    let fechaCorte2 = convertirFecha(context?.fechaCorte);

                    if (!fechaCorte2) {
                        log.error("Error de parámetros", fechaCorte2);
                        return ResultadoConsulta;
                    }

                    ResultadoConsulta = ReporteOrdenTrabajo2(fechaCorte2, context?.page);

                    return ResultadoConsulta;

                case "CONTROLGASTO":
                    let indice_controlGasto = Number(context?.indice || 1);
                    ResultadoConsulta = ConsultaControlGasto(FechaIni, FechaFin, indice_controlGasto);
                    break;

                case "ALQUILER":
                    ResultadoConsulta = ConsultaAlquiler();
                    return ResultadoConsulta;

                case "FINANCIERO_NCR":
                    let indice2 = Number(context?.indice || 1);
                    ResultadoConsulta = FINANCIERO_NCR(FechaIni, FechaFin, indice2);
                    break;

                default:
                    return 'id:400, tipo de documento no valido';
            }

            return ResultadoConsulta;
        } catch (error) {
            log.error('error', { error: error.message, stack: error.stack });
            return 'id:400, No se encontraron resultados.';
        }
    }

    function FINANCIERO_NCR(fecha_ini, fecha_fin, indice) {
        try {
            indice = indice - 1;
            const LONGITUD_PAGINA = 900;
            log.debug("FINANCIERO_NCR", { fecha_ini, fecha_fin })

            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "verifique Valores", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje, indice: indice });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            // Helper: lee una columna por su label (evita el colapso de fórmulas duplicadas)
            function getByLabel(result, label) {
                var col = result.columns.filter(function (c) { return c.label === label; })[0];
                return col ? result.getValue(col) : '';
            }

            function getTextByLabel(result, label) {
                var col = result.columns.filter(function (c) { return c.label === label; })[0];
                return col ? result.getText(col) : '';
            }

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let Busqueda = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["trandate", "within", fecha_ini, fecha_fin],
                        "AND",
                        ["subsidiary", "anyof", "2"],
                        "AND",
                        ["accounttype", "anyof", "OthAsset", "Income", "COGS"],
                        "AND",
                        ["mainline", "is", "F"],
                        "AND",
                        ["posting", "is", "T"],
                        "AND",
                        ["taxline", "is", "F"],
                        // "AND",
                        // ["trandate", "within", "thisfiscalyear"],
                        "AND",
                        ["formulanumeric: CASE WHEN {accounttype} = 'Ingresos' THEN 1WHEN {accounttype} = 'Costo de los artículos vendidos' THEN 1WHEN REGEXP_SUBSTR(TRIM({account}), '^[0-9]+') LIKE '11005%' THEN 1ELSE 0END", "equalto", "1"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "line", label: "ID de línea" }),
                        search.createColumn({ name: "location", label: "Oficina" }),
                        search.createColumn({ name: "postingperiod", label: "Período" }),
                        // search.createColumn({ name: "trandate", label: "Fecha" }),
                        search.createColumn({
                            name: "trandate",
                            label: "Fecha",
                            sort: search.Sort.ASC
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "TO_NUMBER(SUBSTR({postingperiod}, -4))",
                            label: "AÑO"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "CASE WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ene' THEN 1 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'feb' THEN 2 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'mar' THEN 3 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'abr' THEN 4 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'may' THEN 5 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jun' THEN 6 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jul' THEN 7 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ago' THEN 8 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'sep' THEN 9 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'oct' THEN 10 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'nov' THEN 11 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'dic' THEN 12 ELSE 0 END",
                            label: "MES_NUM"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ene' THEN 'Enero' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'feb' THEN 'Febrero' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'mar' THEN 'Marzo' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'abr' THEN 'Abril' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'may' THEN 'Mayo' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jun' THEN 'Junio' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jul' THEN 'Julio' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ago' THEN 'Agosto' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'sep' THEN 'Septiembre' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'oct' THEN 'Octubre' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'nov' THEN 'Noviembre' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'dic' THEN 'Diciembre' ELSE 'Sin mes' END",
                            label: "MES"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "SUBSTR({postingperiod}, -4) || '-' || CASE WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ene' THEN '01' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'feb' THEN '02' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'mar' THEN '03' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'abr' THEN '04' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'may' THEN '05' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jun' THEN '06' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jul' THEN '07' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ago' THEN '08' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'sep' THEN '09' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'oct' THEN '10' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'nov' THEN '11' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'dic' THEN '12' ELSE '00' END",
                            label: "AÑO_MES"
                        }),
                        // search.createColumn({
                        //     name: "formulatext",
                        //     formula: "{postingperiod}",
                        //     label: "Fórmula (texto)"
                        // }),
                        search.createColumn({ name: "type", label: "Tipo" }),
                        search.createColumn({ name: "accounttype", label: "Tipo de cuenta" }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR(TRIM({account}), '^[0-9]+')",
                            label: "Nun_cuenta"
                        }),
                        // search.createColumn({
                        //     name: "formulatext",
                        //     formula: "TRIM(REGEXP_REPLACE({account}, '^[0-9]+[[:space:]]*', ''))",
                        //     label: "CUENTA_NOMBRE"
                        // }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "TRIM(REGEXP_SUBSTR({account}, '[^:]+$'))",
                            label: "CUENTA_NOMBRE"
                        }),
                        search.createColumn({ name: "debitamount", label: "Importe (débito)" }),
                        search.createColumn({ name: "creditamount", label: "Importe (crédito)" }),
                        search.createColumn({ name: "amount", label: "Importe" }),
                        search.createColumn({ name: "tranid", label: "Número de documento" }),
                        search.createColumn({ name: "transactionnumber", label: "Número de transacción" }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'OS[0-9]+' ) IS NOT NULL THEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'OS[0-9]+' )  WHEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'OT[0-9]+' ) IS NOT NULL THEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'OT[0-9]+' )  WHEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'OF-EC-[0-9]+' ) IS NOT NULL THEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'OF-EC-[0-9]+' )  WHEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'OC-[0-9]+' ) IS NOT NULL THEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'OC-[0-9]+' )  WHEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'FA[0-9]+' ) IS NOT NULL THEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'FA[0-9]+' )  WHEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'NC[0-9]+' ) IS NOT NULL THEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'NC[0-9]+' )  WHEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'BUILD[0-9]+' ) IS NOT NULL THEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'BUILD[0-9]+' )  WHEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'EN-EC-[0-9]+' ) IS NOT NULL THEN REGEXP_SUBSTR(     TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}),     'EN-EC-[0-9]+' )  ELSE TO_CHAR({tranid}) END",
                            label: "DOC_ORIGEN_LIMPIO"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OS[0-9]+') IS NOT NULL THEN 'ORDEN_SERVICIO'  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OT[0-9]+') IS NOT NULL THEN 'ORDEN_TRABAJO'  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OF-EC-[0-9]+') IS NOT NULL THEN 'ORDEN_FABRICACION'  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OC-[0-9]+') IS NOT NULL THEN 'PEDIDO_OC'  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'FA[0-9]+') IS NOT NULL THEN 'FACTURA'  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'NC[0-9]+') IS NOT NULL THEN 'NOTA_CREDITO'  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'BUILD[0-9]+') IS NOT NULL THEN 'ENSAMBLE_BUILD'  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'EN-EC-[0-9]+') IS NOT NULL THEN 'DOCUMENTO_INVENTARIO_EN'  ELSE 'DOCUMENTO_PROPIO' END",
                            label: "TIPO_DOC_ORIGEN"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OS[0-9]+') IS NOT NULL THEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OS[0-9]+')      || '|' || NVL(REGEXP_SUBSTR(TO_CHAR({item}), '[0-9]+'), TO_CHAR({item}))      || '|' || TO_CHAR({postingperiod})  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OT[0-9]+') IS NOT NULL THEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OT[0-9]+')      || '|' || NVL(REGEXP_SUBSTR(TO_CHAR({item}), '[0-9]+'), TO_CHAR({item}))      || '|' || TO_CHAR({postingperiod})  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OF-EC-[0-9]+') IS NOT NULL THEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OF-EC-[0-9]+')      || '|' || NVL(REGEXP_SUBSTR(TO_CHAR({item}), '[0-9]+'), TO_CHAR({item}))      || '|' || TO_CHAR({postingperiod})  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OC-[0-9]+') IS NOT NULL THEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'OC-[0-9]+')      || '|' || NVL(REGEXP_SUBSTR(TO_CHAR({item}), '[0-9]+'), TO_CHAR({item}))      || '|' || TO_CHAR({postingperiod})  WHEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'FA[0-9]+') IS NOT NULL THEN REGEXP_SUBSTR(TO_CHAR({createdfrom}) || ' ' || TO_CHAR({tranid}) || ' ' || TO_CHAR({transactionnumber}) || ' ' || TO_CHAR({memo}) || ' ' || TO_CHAR({memomain}), 'FA[0-9]+')      || '|' || NVL(REGEXP_SUBSTR(TO_CHAR({item}), '[0-9]+'), TO_CHAR({item}))      || '|' || TO_CHAR({postingperiod})  ELSE TO_CHAR({tranid})      || '|' || NVL(REGEXP_SUBSTR(TO_CHAR({item}), '[0-9]+'), TO_CHAR({item}))      || '|' || TO_CHAR({postingperiod}) END",
                            label: "KEY_RELACION_FINAL"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN NVL(TRIM(TO_CHAR({mainname})), '- None -') <> '- None -' THEN TRIM(TO_CHAR({mainname}))  WHEN NVL(TRIM(TO_CHAR({entity})), '- None -') <> '- None -' THEN TRIM(TO_CHAR({entity}))  ELSE '' END",
                            label: "NOMBRE_FINAL"
                        }),
                        search.createColumn({ name: "line.cseg5", label: "Linea Negocio" }),
                        search.createColumn({ name: "line.cseg6", label: "TipoProducto" }),
                        search.createColumn({ name: "class", label: "Clase" }),
                        search.createColumn({ name: "itemtype", label: "itemType" }),
                        search.createColumn({ name: "quantity", label: "Cantidad" }),
                        search.createColumn({ name: "unitid", label: "ID de la unidad" }),
                        search.createColumn({ name: "custbody_ht_ce_ordentrabajo", label: "HT CE Orden de trabajo" }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR({item}, '[0-9]+')",
                            label: "ARTICULO_BASE"
                        }),
                        search.createColumn({ name: "costestimate", label: "Costo ampliado estimado (línea)" }),
                        search.createColumn({ name: "custtype", label: "Categoría de cliente" }),
                        search.createColumn({
                            name: "custitem_ht_at_productoalquiler",
                            join: "item",
                            label: "ALQ - Producto de Alquiler"
                        }),
                        search.createColumn({ name: "item", label: "Artículo" }),
                        search.createColumn({
                            name: "salesdescription",
                            join: "item",
                            label: "Descripción"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "'ITEM ' || REGEXP_SUBSTR({item}, '[0-9]+')",
                            label: "PAQUETE_PRODUCTO"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN NVL(TRIM(TO_CHAR({memo})), 'SIN_DATO') <> 'SIN_DATO'      AND NVL(TRIM(TO_CHAR({memomain})), 'SIN_DATO') <> 'SIN_DATO'      AND TRIM(TO_CHAR({memo})) = TRIM(TO_CHAR({memomain})) THEN TRIM(TO_CHAR({memo}))  WHEN NVL(TRIM(TO_CHAR({memo})), 'SIN_DATO') <> 'SIN_DATO'      AND NVL(TRIM(TO_CHAR({memomain})), 'SIN_DATO') <> 'SIN_DATO'      AND TRIM(TO_CHAR({memo})) <> TRIM(TO_CHAR({memomain})) THEN TRIM(TO_CHAR({memo})) || ' | ' || TRIM(TO_CHAR({memomain}))  WHEN NVL(TRIM(TO_CHAR({memo})), 'SIN_DATO') <> 'SIN_DATO' THEN TRIM(TO_CHAR({memo}))  WHEN NVL(TRIM(TO_CHAR({memomain})), 'SIN_DATO') <> 'SIN_DATO' THEN TRIM(TO_CHAR({memomain}))  ELSE 'SIN_NOTA' END",
                            label: "NOTA_FINAL"
                        }),
                        search.createColumn({ name: "custbodyec_nota_cliente", label: "EC Nota Cliente" }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "CASE  WHEN {accounttype} = 'Ingresos'  THEN NVL({quantity},0)  ELSE 0  END",
                            label: "UNIDADES_VENDIDAS"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "CASE  WHEN {accounttype} = 'Ingresos'  THEN NVL({amount},0)  ELSE 0  END",
                            label: "VENTAS"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "CASE  WHEN {accounttype} = 'Costo de los artículos vendidos'  THEN NVL({quantity},0)  ELSE 0  END",
                            label: "UNIDADES_COSTO"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "CASE  WHEN {accounttype} = 'Costo de los artículos vendidos'  THEN NVL({amount},0)  ELSE 0  END",
                            label: "COSTO DE VENTA"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "CASE  WHEN REGEXP_SUBSTR(TRIM({account}), '^[0-9]+') LIKE '11005%' THEN NVL({quantity},0) ELSE 0 END",
                            label: "UNIDADES_INVENTARIO"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "CASE  WHEN REGEXP_SUBSTR(TRIM({account}), '^[0-9]+') LIKE '11005%' THEN NVL({amount},0) ELSE 0 END",
                            label: "INVENTARIO"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "CASE  WHEN {accounttype} = 'Ingresos'  THEN NVL({amount},0) WHEN {accounttype} = 'Costo de los artículos vendidos'  THEN -NVL({amount},0) ELSE 0  END",
                            label: "RENTABILIDAD "
                        }),
                        search.createColumn({ name: "department", label: "Departamento" }),
                        search.createColumn({
                            name: "lastname",
                            join: "salesRep",
                            label: "Apellidos"
                        }),
                        search.createColumn({ name: "custcol_ht_ai_componentechaser", label: "HT AI Tipo de Componente Chaser" }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE  WHEN {accounttype} = 'Ingresos' THEN 'SI' WHEN {accounttype} = 'Costo de los artículos vendidos' THEN 'SI' WHEN REGEXP_SUBSTR(TRIM({account}), '^[0-9]+') LIKE '11005%' THEN 'SI' ELSE 'NO' END",
                            label: "INCLUIR REPORTE"
                        }),
                        search.createColumn({ name: "createdby", label: "Creado por" }),
                        search.createColumn({ name: "statusref", label: "Estado" }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN {accounttype} = 'Ingresos'      AND {type} = 'Factura de venta' THEN '01_VENTA'  WHEN {accounttype} = 'Ingresos'      AND {type} = 'Nota de crédito' THEN '02_NOTA_CREDITO'  WHEN {accounttype} = 'Costo de los artículos vendidos' THEN '03_COSTO_VENTA'  WHEN REGEXP_SUBSTR(TRIM(TO_CHAR({account})), '^[0-9]+') LIKE '11005%' THEN '04_INVENTARIO_11005'  ELSE '08_REVISAR' END",
                            label: "TIPO_MOVIMIENTO_COSTEO"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN {accounttype} = 'Ingresos' AND NVL({quantity},0) <> 0 THEN 'CANTIDAD_VENTA'  WHEN {accounttype} = 'Costo de los artículos vendidos' AND NVL({quantity},0) <> 0 THEN 'CANTIDAD_COSTO'  WHEN REGEXP_SUBSTR(TRIM(TO_CHAR({account})), '^[0-9]+') LIKE '11005%'      AND NVL({quantity},0) <> 0 THEN 'CANTIDAD_INVENTARIO'  ELSE 'SIN_CANTIDAD' END",
                            label: "TIPO_CANTIDAD"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN ABS(NVL({quantity},0)) > 0 THEN 'SI' WHEN ABS(NVL({amount},0)) > 0 THEN 'SI' ELSE 'NO' END",
                            label: "MOVIMIENTO_REAL"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN ABS(NVL({quantity},0)) > 0 THEN 'SI' ELSE 'NO' END",
                            label: "MATERIAL_REAL_TECNICO"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN ABS(NVL({amount},0)) > 0 THEN 'SI' WHEN ABS(NVL({debitamount},0)) > 0 THEN 'SI' WHEN ABS(NVL({creditamount},0)) > 0 THEN 'SI' ELSE 'NO' END",
                            label: "LINEA_CUADRE_CONTABLE"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR( UPPER( NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'') ), 'OS[0-9]+' )",
                            label: "1. ID_OS"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR( UPPER( NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'') ), 'OT[0-9]+' )",
                            label: "2. ID_OT"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR( UPPER( NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'') ), 'OF-EC-[0-9]+' )",
                            label: "3. ID_OF"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR( UPPER( NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'') ), 'OC-[0-9]+' )",
                            label: "4. ID_OC"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR( UPPER( NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'') ), 'FA[0-9]+' )",
                            label: "5. ID_FACTURA"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR( UPPER( NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'') ), 'NC[0-9]+' )",
                            label: "6. ID_NOTA_CREDITO"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR( UPPER( NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'') ), 'BUILD[0-9]+' )",
                            label: "7. ID_BUILD"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR( UPPER( NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'') ), 'EN-EC-[0-9]+' )",
                            label: "8. ID_ENSAMBLE_EN"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "REGEXP_SUBSTR( UPPER( NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({tranid}),'') ), '(CUSTINVC|CUSTCRED|BUILD)[0-9]+' )",
                            label: "9. ID_TRANSACCION_NETSUITE"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN REGEXP_SUBSTR(UPPER(NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'')), 'OS[0-9]+') IS NOT NULL THEN 'OS|' ELSE '' END || CASE WHEN REGEXP_SUBSTR(UPPER(NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'')), 'OT[0-9]+') IS NOT NULL THEN 'OT|' ELSE '' END || CASE WHEN REGEXP_SUBSTR(UPPER(NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'')), 'OF-EC-[0-9]+') IS NOT NULL THEN 'OF|' ELSE '' END || CASE WHEN REGEXP_SUBSTR(UPPER(NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'')), 'OC-[0-9]+') IS NOT NULL THEN 'OC|' ELSE '' END || CASE WHEN REGEXP_SUBSTR(UPPER(NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'')), 'FA[0-9]+') IS NOT NULL THEN 'FA|' ELSE '' END || CASE WHEN REGEXP_SUBSTR(UPPER(NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'')), 'NC[0-9]+') IS NOT NULL THEN 'NC|' ELSE '' END || CASE WHEN REGEXP_SUBSTR(UPPER(NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'')), 'BUILD[0-9]+') IS NOT NULL THEN 'BUILD|' ELSE '' END || CASE WHEN REGEXP_SUBSTR(UPPER(NVL(TO_CHAR({createdfrom}),'') || ' ' || NVL(TO_CHAR({tranid}),'') || ' ' || NVL(TO_CHAR({transactionnumber}),'') || ' ' || NVL(TO_CHAR({memo}),'') || ' ' || NVL(TO_CHAR({memomain}),'')), 'EN-EC-[0-9]+') IS NOT NULL THEN 'EN|' ELSE '' END",
                            label: "TIPOS_ID_ENCONTRADOS"
                        })
                    ]
            });

            let ObjResultado = [];

            let ResultadoConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA });

            let conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
            if (!indice || indice == "" || indice < 0) {
                indice = 0;
            } else if (indice > conteoPagina) {
                indice = conteoPagina;
            }

            if (ResultadoConsulta.count != 0) {
                let ResPagina = ResultadoConsulta.fetch({ index: indice });
                ResPagina.data.forEach(function (result) {

                    ObjResultado.push({
                        ID_Interno: result.id,
                        ID_Linea: result.getValue({ name: "line" }),
                        Oficina: result.getText({ name: "location" }),
                        Periodo: result.getText({ name: "postingperiod" }),
                        Fecha: result.getValue("trandate"),
                        Anio: parseFloat(getByLabel(result, "AÑO") || 0),
                        Mes_Num: parseFloat(getByLabel(result, "MES_NUM") || 0),
                        Mes: getByLabel(result, "MES"),
                        Anio_Mes: getByLabel(result, "AÑO_MES"),
                        // Formula_Texto_Periodo: getByLabel(result, "Fórmula (texto)"),
                        Tipo: result.getText({ name: "type" }),
                        Tipo_Cuenta: result.getValue({ name: "accounttype" }),
                        Num_Cuenta: getByLabel(result, "Nun_cuenta"),
                        Cuenta_Nombre: getByLabel(result, "CUENTA_NOMBRE"),
                        Debito: parseNumber(result.getValue("debitamount")),
                        Credito: Number((parseFloat(result.getValue("creditamount") || 0) * -1).toFixed(2)),
                        Importe: Number((parseFloat(result.getValue("debitamount") || 0) - parseFloat(result.getValue("creditamount") || 0)).toFixed(2)),
                        NDocumento: result.getValue("tranid"),
                        Numero_Transaccion: result.getValue("transactionnumber"),
                        Doc_Origen_Limpio: getByLabel(result, "DOC_ORIGEN_LIMPIO"),
                        Tipo_Doc_Origen: getByLabel(result, "TIPO_DOC_ORIGEN"),
                        KEY_Relacion_Final: getByLabel(result, "KEY_RELACION_FINAL"),
                        Nombre_Final: getByLabel(result, "NOMBRE_FINAL").replace(/,/g, ' '),
                        Linea_Negocio: getTextByLabel(result, "Linea Negocio"),
                        Tipo_Producto: getTextByLabel(result, "TipoProducto"),
                        Clase: result.getText({ name: "class" }),
                        ItemType: result.getValue({ name: "itemtype" }),
                        Cantidad: parseFloat(result.getValue("quantity") || 0),
                        ID_Unidad: result.getValue({ name: "unitid" }),
                        HT_CE_OrdenTrabajo: result.getValue({ name: "custbody_ht_ce_ordentrabajo" }),
                        Articulo_Base: getByLabel(result, "ARTICULO_BASE"),
                        Costo_Estimado: parseFloat(result.getValue("costestimate") || 0),
                        Categoria_Cliente: result.getText({ name: "custtype" }),
                        // ALQ_Producto_Alquiler: result.getValue({ name: "custitem_ht_at_productoalquiler", join: "item" }),
                        ALQ_Producto_Alquiler: result.getValue({ name: "custitem_ht_at_productoalquiler", join: "item" }) === true ? "Si" : "No",
                        Articulo: result.getText({ name: "item" }),
                        Descripcion_Articulo: result.getValue({ name: "salesdescription", join: "item" }).replace(/,/g, ' '),
                        Paquete_Producto: getByLabel(result, "PAQUETE_PRODUCTO"),
                        Nota_Final: getByLabel(result, "NOTA_FINAL").replace(/,/g, ' '),
                        EC_Nota_Cliente: result.getValue({ name: "custbodyec_nota_cliente" }).replace(/,/g, ' '),
                        Unidades_Vendidas: parseFloat(getByLabel(result, "UNIDADES_VENDIDAS") || 0),
                        Ventas: parseFloat(getByLabel(result, "VENTAS") || 0),
                        Unidades_Costo: parseFloat(getByLabel(result, "UNIDADES_COSTO") || 0),
                        Costo_Venta: parseFloat(getByLabel(result, "COSTO DE VENTA") || 0),
                        Unidades_Inventario: parseFloat(getByLabel(result, "UNIDADES_INVENTARIO") || 0),
                        Inventario: parseFloat(getByLabel(result, "INVENTARIO") || 0),
                        Rentabilidad: parseFloat(getByLabel(result, "RENTABILIDAD ") || 0),
                        Departamento: result.getText({ name: "department" }),
                        Apellidos_SalesRep: result.getValue({ name: "lastname", join: "salesRep" }),
                        HT_AI_ComponenteChaser: result.getValue({ name: "custcol_ht_ai_componentechaser" }),
                        Incluir_Reporte: getByLabel(result, "INCLUIR REPORTE"),
                        Creado_Por: result.getText({ name: "createdby" }),
                        Estado: result.getText({ name: "statusref" }),
                        Tipo_Movimiento_Costeo: getByLabel(result, "TIPO_MOVIMIENTO_COSTEO"),
                        Tipo_Cantidad: getByLabel(result, "TIPO_CANTIDAD"),
                        Movimiento_Real: getByLabel(result, "MOVIMIENTO_REAL"),
                        Material_Real_Tecnico: getByLabel(result, "MATERIAL_REAL_TECNICO"),
                        Linea_Cuadre_Contable: getByLabel(result, "LINEA_CUADRE_CONTABLE"),
                        ID_OS: getByLabel(result, "1. ID_OS"),
                        ID_OT: getByLabel(result, "2. ID_OT"),
                        ID_OF: getByLabel(result, "3. ID_OF"),
                        ID_OC: getByLabel(result, "4. ID_OC"),
                        ID_Factura: getByLabel(result, "5. ID_FACTURA"),
                        ID_Nota_Credito: getByLabel(result, "6. ID_NOTA_CREDITO"),
                        ID_Build: getByLabel(result, "7. ID_BUILD"),
                        ID_Ensamble_EN: getByLabel(result, "8. ID_ENSAMBLE_EN"),
                        ID_Transaccion_NetSuite: getByLabel(result, "9. ID_TRANSACCION_NETSUITE"),
                        Tipos_ID_Encontrados: getByLabel(result, "TIPOS_ID_ENCONTRADOS"),
                    });
                });
            }

            return {
                results: ObjResultado,
                index: parseInt(indice) + 1,
                pages: conteoPagina,
                //total: ResultadoConsulta.count,
            };

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaOrdenes(fecha_ini, fecha_fin) {

        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let serviceOrderSearch = search.create({
                type: "salesorder",
                filters: [
                    ["type", "anyof", "SalesOrd"],
                    "AND", ["trandate", "within", fecha_ini, fecha_fin],
                    "AND", ["subsidiary", "anyof", "2"],
                    "AND", ["memorized", "is", "F"],
                    "AND", ["posting", "any", ""],
                    "AND", ["voided", "is", "F"],
                    // "AND", ["trandate","within","thismonth"], 
                    "AND", ["mainline", "is", "T"],
                    "AND", ["custbody_itr_doc_number", "doesnotstartwith", "OSP"],
                    "AND", ["tranid", "doesnotcontain", "OSP"],
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "custbody_ht_so_bien" }),

                    // Información adicional
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "entity" }),
                    search.createColumn({ name: "memo" }),
                    search.createColumn({ name: "custbody_ht_os_aprobacionventa" }),
                    search.createColumn({ name: "custbody_ht_os_aprobacioncartera" }),
                    search.createColumn({ name: "taxtotal" }),
                    search.createColumn({ name: "total" }),
                    search.createColumn({ name: "custbody_ht_os_ejecutiva_backoffice" }),
                    search.createColumn({ name: "salesrep" }),
                    search.createColumn({ name: "custbody_ht_os_ejecutivareferencia" }),
                    search.createColumn({ name: "opportunity" }),
                    search.createColumn({ name: "subsidiary" }),
                    search.createColumn({ name: "department" }),
                    search.createColumn({ name: "class" }),
                    search.createColumn({ name: "location" }),
                    search.createColumn({ name: "custbody_ht_os_companiaseguros" }),
                    search.createColumn({ name: "custbody_ht_os_concesionario" }),
                    search.createColumn({ name: "custbody_ht_os_bancofinanciera" }),
                    search.createColumn({ name: "custbody_ht_os_vendcanaldistribucion" }),
                    search.createColumn({ name: "custbody_ht_facturar_a" }),
                    search.createColumn({ name: "custbody_ht_os_trabajado" })
                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = serviceOrderSearch.runPaged({ pageSize: 1000 });
            log.debug("count ConsultaOrdenes", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let ordersMap = {};


                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalidOs = result.getValue({ name: "internalid" });

                    // Si la orden no está en el mapa, inicializar el objeto
                    if (!ordersMap[internalidOs]) {
                        ordersMap[internalidOs] = {
                            // Información principal
                            internalidOs: internalidOs,
                            id_bien: result.getValue({ name: "custbody_ht_so_bien" }),
                            bien: result.getText({ name: "custbody_ht_so_bien" }),
                            tranid: result.getValue({ name: "tranid" }),
                            trandate: result.getValue({ name: "trandate" }),
                            id_entity: result.getValue({ name: "entity" }),
                            entity_text: (result.getText({ name: "entity" }) || '').replace(/,/g, ' '),
                            memo: (result.getValue({ name: "memo" }) || '').replace(/,/g, ' '),
                            id_custbody_ht_os_aprobacionventa: result.getValue({ name: "custbody_ht_os_aprobacionventa" }),
                            custbody_ht_os_aprobacionventa: result.getText({ name: "custbody_ht_os_aprobacionventa" }),
                            id_custbody_ht_os_aprobacioncartera: result.getValue({ name: "custbody_ht_os_aprobacioncartera" }),
                            custbody_ht_os_aprobacioncartera: result.getText({ name: "custbody_ht_os_aprobacioncartera" }),

                            // Valores Orden de servicio (Sales Order)
                            subtotal: (parseFloat(result.getValue({ name: "total" }) || "0") - parseFloat(result.getValue({ name: "taxtotal" }) || "0")).toFixed(2),
                            taxtotal: result.getValue({ name: "taxtotal" }),
                            total: result.getValue({ name: "total" }),

                            // Información de ventas
                            id_custbody_ht_os_ejecutiva_backoffice: result.getValue({ name: "custbody_ht_os_ejecutiva_backoffice" }),
                            custbody_ht_os_ejecutiva_backoffice: result.getText({ name: "custbody_ht_os_ejecutiva_backoffice" }),
                            id_salesrep: result.getValue({ name: "salesrep" }),
                            salesrep: result.getText({ name: "salesrep" }),
                            id_custbody_ht_os_ejecutivareferencia: result.getValue({ name: "custbody_ht_os_ejecutivareferencia" }),
                            custbody_ht_os_ejecutivareferencia: result.getText({ name: "custbody_ht_os_ejecutivareferencia" }),
                            opportunity: result.getValue({ name: "opportunity" }),

                            // Clasificacion 
                            id_subsidiary: result.getValue({ name: "subsidiary" }),
                            subsidiary: result.getText({ name: "subsidiary" }),
                            id_department: result.getValue({ name: "department" }),
                            department: result.getText({ name: "department" }),
                            id_class: result.getValue({ name: "class" }),
                            class: result.getText({ name: "class" }),
                            id_location: result.getValue({ name: "location" }),
                            location: result.getText({ name: "location" }),

                            // Canal de distribucion
                            id_custbody_ht_os_companiaseguros: result.getValue({ name: "custbody_ht_os_companiaseguros" }),
                            custbody_ht_os_companiaseguros: result.getText({ name: "custbody_ht_os_companiaseguros" }),
                            id_custbody_ht_os_concesionario: result.getValue({ name: "custbody_ht_os_concesionario" }),
                            custbody_ht_os_concesionario: result.getText({ name: "custbody_ht_os_concesionario" }),
                            id_custbody_ht_os_bancofinanciera: result.getValue({ name: "custbody_ht_os_bancofinanciera" }),
                            custbody_ht_os_bancofinanciera: result.getText({ name: "custbody_ht_os_bancofinanciera" }),
                            id_custbody_ht_os_vendcanaldistribucion: result.getValue({ name: "custbody_ht_os_vendcanaldistribucion" }),
                            custbody_ht_os_vendcanaldistribucion: result.getText({ name: "custbody_ht_os_vendcanaldistribucion" }),

                            // Información Adicional
                            id_custbody_ht_facturar_a: result.getValue({ name: "custbody_ht_facturar_a" }),
                            custbody_ht_facturar_a: (result.getText({ name: "custbody_ht_facturar_a" }) || '').replace(/,/g, ' '),
                            custbody_ht_os_trabajado: (result.getValue({ name: "custbody_ht_os_trabajado" }) || '').replace(/,/g, ' '),

                        };
                    }
                });

                // Convertir el mapa de órdenes en un array
                results = results.concat(Object.values(ordersMap));
            });

            return results;
        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaFacturas(fecha_ini, fecha_fin) {
        try {

            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de facturas
            let invoiceSearch = search.create({
                type: "transaction",
                filters: [
                    // vendbill, CustInvc
                    ["type", "anyof", "CustInvc"],
                    "AND", ["trandate", "within", fecha_ini, fecha_fin],
                    "AND", ["subsidiary", "anyof", "2"],
                    "AND", ["mainline", "is", "T"],
                    "AND", ["memorized", "is", "F"],
                    "AND", ["posting", "any", ""],
                    "AND", ["voided", "is", "F"],
                    // "AND",  ["trandate","within","thismonth"]
                ],
                columns: [
                    // Información principal
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "entity" }),
                    search.createColumn({ name: "custbody_ht_so_bien" }),
                    search.createColumn({ name: "custbody_ht_facturar_a" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "postingperiod" }),
                    search.createColumn({ name: "duedate" }),
                    search.createColumn({ name: "custbody_ht_ec_fech_ven_fin" }),
                    search.createColumn({ name: "startdate" }),
                    search.createColumn({ name: "enddate" }),
                    search.createColumn({ name: "memo" }),
                    search.createColumn({ name: "custbody_ht_os_convenio" }),
                    search.createColumn({ name: "custbody_ec_estado_de_autorizaci" }),
                    search.createColumn({ name: "location" }),

                    // Resumen de la factura
                    search.createColumn({ name: "taxtotal" }),
                    search.createColumn({ name: "total" }),

                    // Información de ventas
                    search.createColumn({ name: "createdfrom" }),
                    search.createColumn({ name: "opportunity" }),
                    search.createColumn({ name: "salesrep" }),

                    // Clasificación
                    search.createColumn({ name: "custbody_ts_ec_subsidiaria_pais" }),
                    search.createColumn({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                    search.createColumn({ name: "custbody_ts_ec_serie_cxc" }),
                    search.createColumn({ name: "custbody_ts_ec_numero_preimpreso" }),
                    search.createColumn({ name: "custbodyts_ec_tipo_trans" }),
                    search.createColumn({ name: "custbody_ts_ec_metodo_pago" }),
                    search.createColumn({ name: "custbody_base_niva" }),
                    search.createColumn({ name: "custbodyts_ec_base_rate0" }),
                    search.createColumn({ name: "custbodyts_ec_base_rate12" }),
                    search.createColumn({ name: "custbody_ts_ec_ice_monto" }),
                    search.createColumn({ name: "custbody_ec_monto_iva" }),
                    search.createColumn({ name: "custbody_ec_tip_compensaciones" }),
                    search.createColumn({ name: "custbody_ec_mon_comp" }),
                    search.createColumn({ name: "custbody_ec_monto_iva" }),
                    search.createColumn({ name: "custbody_ec_tip_compensaciones" }),
                    search.createColumn({ name: "custbody_ec_mon_comp" }),
                    search.createColumn({ name: "custbody_ec_tip_emi" }),
                    search.createColumn({ name: "custbody_ec_ncomprobantes" }),
                    search.createColumn({ name: "custbody_ec_fecha_autorizacion" }),
                    search.createColumn({ name: "custbodyts_ec_num_autorizacion" }),

                    // Canal de Distribución
                    search.createColumn({ name: "custbody_ht_os_companiaseguros" }),
                    search.createColumn({ name: "custbody_ht_os_concesionario" }),
                    search.createColumn({ name: "custbody_ht_os_bancofinanciera" }),
                    search.createColumn({ name: "custbodyec_nota_cliente" }),

                    // Información de facturación
                    search.createColumn({ name: "terms" }),
                    // search.createColumn({ name: "billaddress" }),

                    search.createColumn({ name: "debitamount", label: "Debito" }),
                    search.createColumn({ name: "creditamount", label: "Credito" }),
                    search.createColumn({ name: "grossamount", label: "Diferencia" }),
                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = invoiceSearch.runPaged({ pageSize: 1000 });
            // log.debug("count ConsultaFacturas", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let invoicesMap = {};

                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalidInvoice = result.getValue({ name: "internalid" });

                    // Si la factura no está en el mapa, inicializar el objeto
                    if (!invoicesMap[internalidInvoice]) {
                        invoicesMap[internalidInvoice] = {
                            // Información principal
                            internalidInvoice: internalidInvoice,
                            tranid: result.getValue({ name: "tranid" }),
                            id_entity: result.getValue({ name: "entity" }),
                            entity_text: (result.getText({ name: "entity" }) || '').replace(/,/g, ' '),
                            id_custbody_ht_so_bien: result.getValue({ name: "custbody_ht_so_bien" }),
                            custbody_ht_so_bien: result.getText({ name: "custbody_ht_so_bien" }),
                            id_custbody_ht_facturar_a: result.getValue({ name: "custbody_ht_facturar_a" }),
                            custbody_ht_facturar_a: (result.getText({ name: "custbody_ht_facturar_a" }) || '').replace(/,/g, ' '),
                            trandate: result.getValue({ name: "trandate" }),
                            id_postingperiod: result.getValue({ name: "postingperiod" }),
                            postingperiod: result.getText({ name: "postingperiod" }),
                            duedate: result.getValue({ name: "duedate" }),
                            custbody_ht_ec_fech_ven_fin: result.getValue({ name: "custbody_ht_ec_fech_ven_fin" }),
                            startdate: result.getValue({ name: "startdate" }),
                            enddate: result.getValue({ name: "enddate" }),
                            memo: (result.getValue({ name: "memo" }) || '').replace(/,/g, ' '),
                            id_custbody_ht_os_convenio: result.getValue({ name: "custbody_ht_os_convenio" }),
                            custbody_ht_os_convenio: result.getText({ name: "custbody_ht_os_convenio" }),
                            custbody_ec_estado_de_autorizaci: result.getValue({ name: "custbody_ec_estado_de_autorizaci" }),
                            location: result.getText({ name: "location" }),

                            // Resumen de la factura
                            subtotal: (((parseFloat(result.getValue({ name: "total" }) || "0") - parseFloat(result.getValue({ name: "taxtotal" }) || "0")).toFixed(2)) || "0").replace(/-/g, ' '),
                            taxtotal: (result.getValue({ name: "taxtotal" }) || "0").replace(/-/g, ' '),
                            total: (result.getValue({ name: "total" }) || "0").replace(/-/g, ' '),

                            // Información de ventas
                            id_createdfrom: result.getValue({ name: "createdfrom" }),
                            createdfrom: result.getText({ name: "createdfrom" }),
                            opportunity: result.getValue({ name: "opportunity" }),
                            id_salesrep: result.getValue({ name: "salesrep" }),
                            salesrep: result.getText({ name: "salesrep" }),

                            // Clasificacion 
                            id_custbody_ts_ec_subsidiaria_pais: result.getValue({ name: "custbody_ts_ec_subsidiaria_pais" }),
                            custbodyts_ec_tipo_documento_fiscal: result.getValue({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                            custbody_ts_ec_serie_cxc: result.getValue({ name: "custbody_ts_ec_serie_cxc" }),
                            custbody_ts_ec_numero_preimpreso: result.getValue({ name: "custbody_ts_ec_numero_preimpreso" }),
                            id_custbodyts_ec_tipo_trans: result.getValue({ name: "custbodyts_ec_tipo_trans" }),
                            custbodyts_ec_tipo_trans: result.getText({ name: "custbodyts_ec_tipo_trans" }),
                            id_custbody_ts_ec_metodo_pago: result.getValue({ name: "custbody_ts_ec_metodo_pago" }),
                            custbody_ts_ec_metodo_pago: result.getText({ name: "custbody_ts_ec_metodo_pago" }),
                            custbody_base_niva: result.getValue({ name: "custbody_base_niva" }),
                            custbodyts_ec_base_rate0: result.getValue({ name: "custbodyts_ec_base_rate0" }),
                            custbodyts_ec_base_rate12: result.getValue({ name: "custbodyts_ec_base_rate12" }),
                            custbody_ts_ec_ice_monto: result.getValue({ name: "custbody_ts_ec_ice_monto" }),
                            custbody_ec_monto_iva: result.getValue({ name: "custbody_ec_monto_iva" }),
                            custbody_ec_tip_compensaciones: result.getValue({ name: "custbody_ec_tip_compensaciones" }),
                            custbody_ec_mon_comp: result.getValue({ name: "custbody_ec_mon_comp" }),
                            custbody_ec_monto_iva: result.getValue({ name: "custbody_ec_monto_iva" }),
                            custbody_ec_tip_compensaciones: result.getValue({ name: "custbody_ec_tip_compensaciones" }),
                            custbody_ec_mon_comp: result.getValue({ name: "custbody_ec_mon_comp" }),
                            id_custbody_ec_tip_emi: result.getValue({ name: "custbody_ec_tip_emi" }),
                            custbody_ec_tip_emi: result.getText({ name: "custbody_ec_tip_emi" }),
                            custbody_ec_ncomprobantes: result.getValue({ name: "custbody_ec_ncomprobantes" }),
                            custbody_ec_fecha_autorizacion: result.getValue({ name: "custbody_ec_fecha_autorizacion" }),
                            custbodyts_ec_num_autorizacion: result.getValue({ name: "custbodyts_ec_num_autorizacion" }),

                            // Canal de distribucion
                            id_custbody_ht_os_companiaseguros: result.getValue({ name: "custbody_ht_os_companiaseguros" }),
                            custbody_ht_os_companiaseguros: result.getText({ name: "custbody_ht_os_companiaseguros" }),
                            id_custbody_ht_os_concesionario: result.getValue({ name: "custbody_ht_os_concesionario" }),
                            custbody_ht_os_concesionario: result.getText({ name: "custbody_ht_os_concesionario" }),
                            id_custbody_ht_os_bancofinanciera: result.getValue({ name: "custbody_ht_os_bancofinanciera" }),
                            custbody_ht_os_bancofinanciera: result.getText({ name: "custbody_ht_os_bancofinanciera" }),
                            custbodyec_nota_cliente: (result.getValue({ name: "custbodyec_nota_cliente" }) || '').replace(/,/g, ' '),

                            // Información de facturación
                            id_terms: result.getValue({ name: "terms" }),
                            terms: result.getText({ name: "terms" }),

                        };
                    }
                });

                // Convertir el mapa de facturas en un array
                results = results.concat(Object.values(invoicesMap));
            });


            // try {
            //     let preciototal = 0;

            //     for (let i = 0; i < results.length; i++) {
            //         preciototal += parseFloat(results[i].subtotal);
            //     }

            //     log.debug("preciototal", preciototal);

            // } catch (error) {
            //     log.error("error", { message: error.message, stack: error.stack });
            // }



            // log.debug("results", results);

            return results;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaFacturas2(fecha_ini, fecha_fin) {
        try {

            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de facturas
            let invoiceSearch = search.create({
                type: "transaction",
                filters: [
                    // vendbill, CustInvc
                    ["type", "anyof", "CustInvc"],
                    "AND", ["trandate", "within", fecha_ini, fecha_fin],
                    "AND", ["subsidiary", "anyof", "2"],
                    "AND", ["mainline", "is", "T"],
                    "AND", ["memorized", "is", "F"],
                    "AND", ["posting", "any", ""],
                    "AND", ["voided", "is", "F"],
                    // "AND",  ["trandate","within","thismonth"]
                ],
                columns: [
                    // Información principal
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "tranid" }),
                    // search.createColumn({ name: "entity" }),
                    // search.createColumn({ name: "custbody_ht_so_bien" }),
                    // search.createColumn({ name: "custbody_ht_facturar_a" }),
                    // search.createColumn({ name: "trandate" }),
                    // search.createColumn({ name: "postingperiod" }),
                    // search.createColumn({ name: "duedate" }),
                    // search.createColumn({ name: "custbody_ht_ec_fech_ven_fin" }),
                    // search.createColumn({ name: "startdate" }),
                    // search.createColumn({ name: "enddate" }),
                    // search.createColumn({ name: "memo" }),
                    // search.createColumn({ name: "custbody_ht_os_convenio" }),
                    // search.createColumn({ name: "custbody_ec_estado_de_autorizaci" }),
                    search.createColumn({ name: "location" }),

                    // Resumen de la factura
                    search.createColumn({ name: "taxtotal" }),
                    search.createColumn({ name: "total" }),

                    // Información de ventas
                    // search.createColumn({ name: "createdfrom" }),
                    // search.createColumn({ name: "opportunity" }),
                    // search.createColumn({ name: "salesrep" }),

                    // // Clasificación
                    // search.createColumn({ name: "custbody_ts_ec_subsidiaria_pais" }),
                    // search.createColumn({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                    // search.createColumn({ name: "custbody_ts_ec_serie_cxc" }),
                    // search.createColumn({ name: "custbody_ts_ec_numero_preimpreso" }),
                    // search.createColumn({ name: "custbodyts_ec_tipo_trans" }),
                    // search.createColumn({ name: "custbody_ts_ec_metodo_pago" }),
                    // search.createColumn({ name: "custbody_base_niva" }),
                    // search.createColumn({ name: "custbodyts_ec_base_rate0" }),
                    // search.createColumn({ name: "custbodyts_ec_base_rate12" }),
                    // search.createColumn({ name: "custbody_ts_ec_ice_monto" }),
                    // search.createColumn({ name: "custbody_ec_monto_iva" }),
                    // search.createColumn({ name: "custbody_ec_tip_compensaciones" }),
                    // search.createColumn({ name: "custbody_ec_mon_comp" }),
                    // search.createColumn({ name: "custbody_ec_monto_iva" }),
                    // search.createColumn({ name: "custbody_ec_tip_compensaciones" }),
                    // search.createColumn({ name: "custbody_ec_mon_comp" }),
                    // search.createColumn({ name: "custbody_ec_tip_emi" }),
                    // search.createColumn({ name: "custbody_ec_ncomprobantes" }),
                    // search.createColumn({ name: "custbody_ec_fecha_autorizacion" }),
                    // search.createColumn({ name: "custbodyts_ec_num_autorizacion" }),

                    // // Canal de Distribución
                    // search.createColumn({ name: "custbody_ht_os_companiaseguros" }),
                    // search.createColumn({ name: "custbody_ht_os_concesionario" }),
                    // search.createColumn({ name: "custbody_ht_os_bancofinanciera" }),
                    // search.createColumn({ name: "custbodyec_nota_cliente" }),

                    // // Información de facturación
                    // search.createColumn({ name: "terms" }),
                    // // search.createColumn({ name: "billaddress" }),

                    // search.createColumn({ name: "debitamount", label: "Debito" }),
                    // search.createColumn({ name: "creditamount", label: "Credito" }),
                    // search.createColumn({ name: "grossamount", label: "Diferencia" }),
                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = invoiceSearch.runPaged({ pageSize: 1000 });
            // log.debug("count ConsultaFacturas", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let invoicesMap = {};

                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalidInvoice = result.getValue({ name: "internalid" });

                    // Si la factura no está en el mapa, inicializar el objeto
                    if (!invoicesMap[internalidInvoice]) {
                        invoicesMap[internalidInvoice] = {
                            // Información principal
                            internalidInvoice: internalidInvoice,
                            tranid: result.getValue({ name: "tranid" }),
                            // id_entity: result.getValue({ name: "entity" }),
                            // entity_text: (result.getText({ name: "entity" }) || '').replace(/,/g, ' '),
                            // id_custbody_ht_so_bien: result.getValue({ name: "custbody_ht_so_bien" }),
                            // custbody_ht_so_bien: result.getText({ name: "custbody_ht_so_bien" }),
                            // id_custbody_ht_facturar_a: result.getValue({ name: "custbody_ht_facturar_a" }),
                            // custbody_ht_facturar_a: (result.getText({ name: "custbody_ht_facturar_a" }) || '').replace(/,/g, ' '),
                            // trandate: result.getValue({ name: "trandate" }),
                            // id_postingperiod: result.getValue({ name: "postingperiod" }),
                            // postingperiod: result.getText({ name: "postingperiod" }),
                            // duedate: result.getValue({ name: "duedate" }),
                            // custbody_ht_ec_fech_ven_fin: result.getValue({ name: "custbody_ht_ec_fech_ven_fin" }),
                            // startdate: result.getValue({ name: "startdate" }),
                            // enddate: result.getValue({ name: "enddate" }),
                            // memo: (result.getValue({ name: "memo" }) || '').replace(/,/g, ' '),
                            // id_custbody_ht_os_convenio: result.getValue({ name: "custbody_ht_os_convenio" }),
                            // custbody_ht_os_convenio: result.getText({ name: "custbody_ht_os_convenio" }),
                            // custbody_ec_estado_de_autorizaci: result.getValue({ name: "custbody_ec_estado_de_autorizaci" }),
                            location: result.getText({ name: "location" }),

                            // Resumen de la factura
                            subtotal: (((parseFloat(result.getValue({ name: "total" }) || "0") - parseFloat(result.getValue({ name: "taxtotal" }) || "0")).toFixed(2)) || "0").replace(/-/g, ' '),
                            // taxtotal: (result.getValue({ name: "taxtotal" }) || "0").replace(/-/g, ' '),
                            // total: (result.getValue({ name: "total" }) || "0").replace(/-/g, ' '),

                            // Información de ventas
                            // id_createdfrom: result.getValue({ name: "createdfrom" }),
                            // createdfrom: result.getText({ name: "createdfrom" }),
                            // opportunity: result.getValue({ name: "opportunity" }),
                            // id_salesrep: result.getValue({ name: "salesrep" }),
                            // salesrep: result.getText({ name: "salesrep" }),

                            // // Clasificacion 
                            // id_custbody_ts_ec_subsidiaria_pais: result.getValue({ name: "custbody_ts_ec_subsidiaria_pais" }),
                            // custbodyts_ec_tipo_documento_fiscal: result.getValue({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                            // custbody_ts_ec_serie_cxc: result.getValue({ name: "custbody_ts_ec_serie_cxc" }),
                            // custbody_ts_ec_numero_preimpreso: result.getValue({ name: "custbody_ts_ec_numero_preimpreso" }),
                            // id_custbodyts_ec_tipo_trans: result.getValue({ name: "custbodyts_ec_tipo_trans" }),
                            // custbodyts_ec_tipo_trans: result.getText({ name: "custbodyts_ec_tipo_trans" }),
                            // id_custbody_ts_ec_metodo_pago: result.getValue({ name: "custbody_ts_ec_metodo_pago" }),
                            // custbody_ts_ec_metodo_pago: result.getText({ name: "custbody_ts_ec_metodo_pago" }),
                            // custbody_base_niva: result.getValue({ name: "custbody_base_niva" }),
                            // custbodyts_ec_base_rate0: result.getValue({ name: "custbodyts_ec_base_rate0" }),
                            // custbodyts_ec_base_rate12: result.getValue({ name: "custbodyts_ec_base_rate12" }),
                            // custbody_ts_ec_ice_monto: result.getValue({ name: "custbody_ts_ec_ice_monto" }),
                            // custbody_ec_monto_iva: result.getValue({ name: "custbody_ec_monto_iva" }),
                            // custbody_ec_tip_compensaciones: result.getValue({ name: "custbody_ec_tip_compensaciones" }),
                            // custbody_ec_mon_comp: result.getValue({ name: "custbody_ec_mon_comp" }),
                            // custbody_ec_monto_iva: result.getValue({ name: "custbody_ec_monto_iva" }),
                            // custbody_ec_tip_compensaciones: result.getValue({ name: "custbody_ec_tip_compensaciones" }),
                            // custbody_ec_mon_comp: result.getValue({ name: "custbody_ec_mon_comp" }),
                            // id_custbody_ec_tip_emi: result.getValue({ name: "custbody_ec_tip_emi" }),
                            // custbody_ec_tip_emi: result.getText({ name: "custbody_ec_tip_emi" }),
                            // custbody_ec_ncomprobantes: result.getValue({ name: "custbody_ec_ncomprobantes" }),
                            // custbody_ec_fecha_autorizacion: result.getValue({ name: "custbody_ec_fecha_autorizacion" }),
                            // custbodyts_ec_num_autorizacion: result.getValue({ name: "custbodyts_ec_num_autorizacion" }),

                            // // Canal de distribucion
                            // id_custbody_ht_os_companiaseguros: result.getValue({ name: "custbody_ht_os_companiaseguros" }),
                            // custbody_ht_os_companiaseguros: result.getText({ name: "custbody_ht_os_companiaseguros" }),
                            // id_custbody_ht_os_concesionario: result.getValue({ name: "custbody_ht_os_concesionario" }),
                            // custbody_ht_os_concesionario: result.getText({ name: "custbody_ht_os_concesionario" }),
                            // id_custbody_ht_os_bancofinanciera: result.getValue({ name: "custbody_ht_os_bancofinanciera" }),
                            // custbody_ht_os_bancofinanciera: result.getText({ name: "custbody_ht_os_bancofinanciera" }),
                            // custbodyec_nota_cliente: (result.getValue({ name: "custbodyec_nota_cliente" }) || '').replace(/,/g, ' '),

                            // // Información de facturación
                            // id_terms: result.getValue({ name: "terms" }),
                            // terms: result.getText({ name: "terms" }),

                        };
                    }
                });

                // Convertir el mapa de facturas en un array
                results = results.concat(Object.values(invoicesMap));
            });


            // try {
            //     let preciototal = 0;

            //     for (let i = 0; i < results.length; i++) {
            //         preciototal += parseFloat(results[i].subtotal);
            //     }

            //     log.debug("preciototal", preciototal);

            // } catch (error) {
            //     log.error("error", { message: error.message, stack: error.stack });
            // }



            // log.debug("results", results);

            return results;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    // Caché a nivel de módulo (persiste durante toda la ejecución del script)
    let cacheParametrizacion = {};

    function ConsultaAlquiler() {
        try {

            let results = [];

            // Crear la búsqueda de órdenes de trabajo (flujo de alquiler)
            let ordenTrabajoSearch = search.create({
                type: "customrecord_ht_record_ordentrabajo",
                filters: [
                    ["custrecord_ht_ot_subsidiary", "anyof", "2"],
                    "AND", ["custrecord_flujo_de_alquiler", "is", "T"],
                    "AND", ["custrecord_ht_ot_estado", "anyof", "2"],
                    "AND", ["custrecord_ht_ot_item.custitem_ht_ar_tipoactivo", "anyof", "621", "619", "620"],
                    "AND", ["created", "within", "01/05/2026 0:00", "02/07/2026 23:59"],
                    "AND", ["custrecord_ht_hs_orden_trabajo_ins.custrecord_ht_af_enlace", "anyof", "@NONE@"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "created", label: "Fecha Creacion" }),
                    search.createColumn({ name: "name", label: "ID" }),
                    search.createColumn({ name: "custrecord_ht_ot_orden_serivicio_txt", label: "HT OT Orden de Servicio TXT" }),
                    search.createColumn({ name: "custrecord_ht_ot_orden_servicio", label: "HT OT ID Orden Servicio" }),
                    search.createColumn({ name: "custrecord_ht_ot_estado", label: "HT OT Estado Orden de trabajo" }),
                    search.createColumn({ name: "custrecord_ht_ot_item", label: "HT OT Ítem" }),
                    search.createColumn({ name: "custrecord_ht_ot_cliente_id", label: "Cliente" }),
                    search.createColumn({ name: "custrecord_ht_ot_taller", label: "HT OT Taller" }),
                    search.createColumn({ name: "custrecord_ht_ot_ordenfabricacion", label: "HT OT Orden de fabricación" }),
                    search.createColumn({ name: "custrecord_ht_ot_serieproductoasignacion", label: "HT OT Serie Producto" }),
                    search.createColumn({ name: "custrecord_ht_ot_fechatrabajoasignacion", label: "HT OT Fecha trabajo" }),
                    search.createColumn({
                        name: "salesdescription",
                        join: "CUSTRECORD_HT_OT_ITEM",
                        label: "Descripción"
                    }),
                    search.createColumn({ name: "custrecord_flujo_de_alquiler", label: "Flujo de Alquiler" }),
                    search.createColumn({
                        name: "custrecord_ht_af_enlace",
                        join: "CUSTRECORD_HT_HS_ORDEN_TRABAJO_INS",
                        label: "HT Activo Fijo"
                    })
                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = ordenTrabajoSearch.runPaged({ pageSize: 1000 });
            log.debug("count ConsultaAlquiler", { count: searchResult.count });

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {
                    results.push({

                        id: result.getValue({ name: "internalid" }),
                        name: result.getValue({ name: "name" }),
                        created: result.getValue({ name: "created" }),

                        id_ordenServicio: result.getValue({ name: "custrecord_ht_ot_orden_servicio" }),
                        ordenServicioTxt: result.getValue({ name: "custrecord_ht_ot_orden_serivicio_txt" }),

                        id_estado: result.getValue({ name: "custrecord_ht_ot_estado" }),
                        estado: result.getText({ name: "custrecord_ht_ot_estado" }),

                        id_item: result.getValue({ name: "custrecord_ht_ot_item" }),
                        item: result.getText({ name: "custrecord_ht_ot_item" }),

                        ADP_item: (obtenerParametrizacionItem2(
                            result.getValue({ name: "custrecord_ht_ot_item" }),
                            [109])[0]?.Valor
                        ),

                        descripcionItem: result.getValue({ name: "salesdescription", join: "CUSTRECORD_HT_OT_ITEM" }),

                        id_cliente: result.getValue({ name: "custrecord_ht_ot_cliente_id" }),
                        cliente: (result.getText({ name: "custrecord_ht_ot_cliente_id" }) || '').replace(/,/g, ' '),

                        id_taller: result.getValue({ name: "custrecord_ht_ot_taller" }),
                        taller: result.getText({ name: "custrecord_ht_ot_taller" }),

                        ordenFabricacion: result.getValue({ name: "custrecord_ht_ot_ordenfabricacion" }),
                        serieProducto: result.getValue({ name: "custrecord_ht_ot_serieproductoasignacion" }),
                        fechaTrabajo: result.getValue({ name: "custrecord_ht_ot_fechatrabajoasignacion" }),

                        flujoAlquiler: result.getValue({ name: "custrecord_flujo_de_alquiler" }),
                        activoFijoEnlace: result.getValue({
                            name: "custrecord_ht_af_enlace",
                            join: "CUSTRECORD_HT_HS_ORDEN_TRABAJO_INS"
                        })
                    });
                });
            });

            return results;

        } catch (error) {
            log.error("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    // Función original que hace la búsqueda real (ahora solo se llama si no hay caché)
    const buscarParametrizacionItem = (items, busquedaParametro) => {
        try {

            if (items == "") {
                return [];
            }

            let data = [];
            let parametrosOpcionales;

            let filtro = [
                ["custrecord_ht_pp_aplicacion", "is", "T"],
                "AND",
                ["custrecord_ht_pp_parametrizacionid", "anyof", items],
            ];

            if (busquedaParametro !== undefined) {
                parametrosOpcionales = busquedaParametro?.toString();
                filtro.push("AND", [
                    "custrecord_ht_pp_parametrizacion_rela",
                    "anyof",
                    parametrosOpcionales.split(","),
                ]);
            }

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

            let resultCount = busqueda.runPaged().count;

            if (resultCount > 0) {
                let pageData = busqueda.runPaged({ pageSize: 1000 });
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
            }

            return data;
        } catch (error) {
            log.error("Error en buscarParametrizacionItem", error);
            return [];
        }
    };

    // Nueva función: revisa el caché antes de disparar una búsqueda nueva
    const obtenerParametrizacionItem2 = (items, busquedaParametro) => {
        try {

            if (items == "") {
                return [];
            }

            // Armamos la llave del caché combinando item + parámetro buscado
            let cacheKey = items.toString() + "_" + (busquedaParametro !== undefined ? busquedaParametro.toString() : "all");

            // Si ya existe en caché, se devuelve directo sin buscar de nuevo
            if (cacheParametrizacion.hasOwnProperty(cacheKey)) {
                log.debug("obtenerParametrizacionItem - cache hit", { cacheKey: cacheKey });
                return cacheParametrizacion[cacheKey];
            }

            // No existe en caché, se hace la búsqueda real y se guarda el resultado
            let data = buscarParametrizacionItem(items, busquedaParametro);
            cacheParametrizacion[cacheKey] = data;

            return data;

        } catch (error) {
            log.error("Error en obtenerParametrizacionItem", error);
            return [];
        }
    };

    function ConsultaTrabajo(fecha_ini, fecha_fin) {
        try {

            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de OT 
            let searchOT = search.create({
                type: "customrecord_ht_record_ordentrabajo",
                filters: [
                    ["created", "within", fecha_ini, fecha_fin],
                    "AND",
                    ["custrecord_ht_ot_vehiculo.custrecord_bn_subsidiaria", "anyof", "2"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "name" }),
                    search.createColumn({ name: "custrecord_ht_ot_orden_servicio" }),
                    search.createColumn({ name: "custrecord_ht_ot_estado" }),
                    search.createColumn({ name: "custrecord_ht_ot_ordenfabricacion" }),
                    search.createColumn({ name: "custrecord_ht_ot_taller" }),
                    search.createColumn({ name: "custrecord_ht_ot_odometro" }),
                    search.createColumn({ name: "custrecord_ht_ot_item" }),
                    search.createColumn({ name: "custrecord_ht_ot_itemrelacionado" }),
                    search.createColumn({ name: "custrecord_flujo_de_alquiler" }),
                    search.createColumn({ name: "custrecord_flujo_de_convenio" }),
                    search.createColumn({ name: "custrecord_flujo_de_custodia" }),
                    search.createColumn({ name: "custrecord_flujo_de_garantia" }),
                    search.createColumn({ name: "custrecord_ht_ot_others_installs" }),
                    search.createColumn({ name: "isinactive" }),
                    search.createColumn({ name: "custrecord_ht_ot_flu_acc" }),

                    search.createColumn({ name: "custrecord_ht_ot_cliente_id" }),
                    search.createColumn({ name: "custrecord_ht_ot_identificacioncliente" }),
                    search.createColumn({ name: "custrecord_ht_ot_direccioncliente" }),
                    search.createColumn({ name: "custrecord_ht_ot_correocliente" }),
                    search.createColumn({ name: "custrecord_ht_ot_telefonocliente" }),
                    // search.createColumn({ name: "custrecord_cons_trabajo" }),

                    search.createColumn({ name: "custrecord_ht_ot_vehiculo" }),
                    search.createColumn({ name: "custrecord_ht_ot_placa" }),
                    search.createColumn({ name: "custrecord_ht_ot_motor" }),
                    search.createColumn({ name: "custrecord_ht_ot_chasis" }),
                    search.createColumn({ name: "custrecord_ht_ot_marca" }),
                    search.createColumn({ name: "custrecord_ht_ot_tipo" }),
                    search.createColumn({ name: "custrecord_ht_ot_modelobien" }),
                    search.createColumn({ name: "custrecord_ht_ot_color" }),
                    search.createColumn({ name: "custrecord_ht_ot_version" }),

                    search.createColumn({ name: "custrecord_ht_ot_supervisorasignacion" }),
                    search.createColumn({ name: "custrecord_ht_ot_tecnicoasignacion" }),
                    search.createColumn({ name: "custrecord_ht_ot_fechatrabajoasignacion" }),
                    search.createColumn({ name: "custrecord_ht_ot_horatrabajoasignacion" }),

                    search.createColumn({ name: "custrecord_ht_ot_serieproductoasignacion" }),
                    search.createColumn({ name: "custrecord_ht_ot_ubicacion" }),
                    search.createColumn({ name: "custrecord_ht_ot_estadochaser" }),

                    search.createColumn({ name: "custrecord_ht_ot_dispositivo" }),
                    search.createColumn({ name: "custrecord_ht_ot_modelo" }),
                    search.createColumn({ name: "custrecord_ht_ot_unidad" }),
                    search.createColumn({ name: "custrecord_ht_ot_firmware" }),
                    search.createColumn({ name: "custrecord_ht_ot_script" }),
                    search.createColumn({ name: "custrecord_ht_ot_servidor" }),
                    search.createColumn({ name: "custrecord_ht_ot_simcard" }),
                    search.createColumn({ name: "custrecord_ht_ot_ip" }),
                    search.createColumn({ name: "custrecord_ht_ot_apn" }),
                    search.createColumn({ name: "custrecord_ht_ot_imei" }),
                    search.createColumn({ name: "custrecord_ht_ot_vid" }),

                    search.createColumn({ name: "custrecord_ht_ot_boxserie" }),
                    search.createColumn({ name: "custrecord_ht_ot_codigoactivacion" }),
                    search.createColumn({ name: "custrecord_ht_ot_codigorespuesta" }),

                    search.createColumn({ name: "custrecord_ht_ot_motivos" }),
                    search.createColumn({ name: "custrecord_ht_ot_motivoscomentario" }),
                    search.createColumn({ name: "custrecord_ht_ot_fueraciudad" }),
                    search.createColumn({ name: "custrecord_ht_ot_fuerataller" }),

                    search.createColumn({ name: "custrecord_ht_ot_servicios_commands" }),
                    search.createColumn({ name: "custrecord_ht_ot_numero_puertas" }),

                    search.createColumn({ name: "custrecord_ht_ot_connovedad" }),
                    search.createColumn({ name: "custrecord_ht_ot_observacion" }),
                    search.createColumn({ name: "custrecordht_ot_baja" }),
                    search.createColumn({ name: "custrecord_ht_ot_bodega" }),
                    search.createColumn({ name: "custrecord_ht_lista_bodegas" }),

                    search.createColumn({ name: "custrecord_ht_ot_pxadminfinalizacion" }),
                    search.createColumn({ name: "custrecord_ht_ot_confirmaciontelamatic" }),
                    search.createColumn({ name: "custrecord_ht_ot_noimpulsaplataformas" }),
                    search.createColumn({ name: "custrecord_ht_ot_listacomentarios" }),
                    search.createColumn({ name: "custrecord_ht_ot_comentariofinalizacion" }),

                    search.createColumn({ name: "custrecord_ht_ot_producto" }),
                    search.createColumn({ name: "custrecord_ht_ot_tipo_trabajo" }),
                    search.createColumn({ name: "custrecordht_ot_tipo_agrupacion" }),

                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = searchOT.runPaged({ pageSize: 1000 });
            log.debug("count ConsultaTrabajo", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let ordersMap = {};

                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalidOT = result.getValue({ name: "internalid" });

                    // Si la OT no está en el mapa, inicializar el objeto
                    if (!ordersMap[internalidOT]) {
                        ordersMap[internalidOT] = {
                            // General
                            internalidOT: internalidOT,
                            name: result.getValue({ name: "name" }),
                            id_custrecord_ht_ot_orden_servicio: result.getValue({ name: "custrecord_ht_ot_orden_servicio" }),
                            orden_servicio: result.getText({ name: "custrecord_ht_ot_orden_servicio" }),
                            id_custrecord_ht_ot_estado: result.getValue({ name: "custrecord_ht_ot_estado" }),
                            estado: result.getText({ name: "custrecord_ht_ot_estado" }),
                            id_custrecord_ht_ot_ordenfabricacion: result.getValue({ name: "custrecord_ht_ot_ordenfabricacion" }),
                            ordenfabricacion: result.getText({ name: "custrecord_ht_ot_ordenfabricacion" }),
                            id_custrecord_ht_ot_taller: result.getValue({ name: "custrecord_ht_ot_taller" }),
                            taller: result.getText({ name: "custrecord_ht_ot_taller" }),
                            custrecord_ht_ot_odometro: result.getValue({ name: "custrecord_ht_ot_odometro" }),
                            id_custrecord_ht_ot_item: result.getValue({ name: "custrecord_ht_ot_item" }),
                            item: result.getText({ name: "custrecord_ht_ot_item" }),
                            id_custrecord_ht_ot_itemrelacionado: result.getValue({ name: "custrecord_ht_ot_itemrelacionado" }),
                            itemrelacionado: result.getText({ name: "custrecord_ht_ot_itemrelacionado" }),
                            custrecord_ht_ot_others_installs: result.getValue({ name: "custrecord_ht_ot_others_installs" }),
                            isinactive: result.getValue({ name: "isinactive" }),
                            custrecord_ht_ot_flu_acc: result.getValue({ name: "custrecord_ht_ot_flu_acc" }),

                            // Cliente
                            id_custrecord_ht_ot_cliente_id: result.getValue({ name: "custrecord_ht_ot_cliente_id" }),
                            custrecord_ht_ot_cliente_id: result.getText({ name: "custrecord_ht_ot_cliente_id" }),
                            // custrecord_cons_trabajo: result.getValue({ name: "custrecord_cons_trabajo" }),


                            // Bien
                            id_custrecord_ht_ot_vehiculo: result.getValue({ name: "custrecord_ht_ot_vehiculo" }),
                            custrecord_ht_ot_vehiculo: result.getText({ name: "custrecord_ht_ot_vehiculo" }),
                            id_custrecord_ht_ot_estadochaser: result.getValue({ name: "custrecord_ht_ot_estadochaser" }),
                            custrecord_ht_ot_estadochaser: result.getText({ name: "custrecord_ht_ot_estadochaser" }),

                            // Dispositivo Flota Chaser
                            custrecord_ht_ot_dispositivo: result.getValue({ name: "custrecord_ht_ot_dispositivo" }),
                            custrecord_ht_ot_simcard: result.getValue({ name: "custrecord_ht_ot_simcard" }),
                            custrecord_ht_ot_imei: result.getValue({ name: "custrecord_ht_ot_imei" }),
                            custrecord_ht_ot_vid: result.getValue({ name: "custrecord_ht_ot_vid" }),

                            // Dispositivo Lojack
                            custrecord_ht_ot_boxserie: result.getValue({ name: "custrecord_ht_ot_boxserie" }),
                            custrecord_ht_ot_codigoactivacion: result.getValue({ name: "custrecord_ht_ot_codigoactivacion" }),
                            custrecord_ht_ot_codigorespuesta: result.getValue({ name: "custrecord_ht_ot_codigorespuesta" }),

                            // Fuera de taller
                            custrecord_ht_ot_motivos: result.getValue({ name: "custrecord_ht_ot_motivos" }),
                            custrecord_ht_ot_motivoscomentario: result.getValue({ name: "custrecord_ht_ot_motivoscomentario" }),
                            custrecord_ht_ot_fueraciudad: result.getValue({ name: "custrecord_ht_ot_fueraciudad" }),
                            custrecord_ht_ot_fuerataller: result.getValue({ name: "custrecord_ht_ot_fuerataller" }),

                            // Finalización
                            custrecord_ht_ot_comentariofinalizacion: result.getValue({ name: "custrecord_ht_ot_comentariofinalizacion" }),

                            //Desarrollo
                            id_custrecord_ht_ot_producto: result.getValue({ name: "custrecord_ht_ot_producto" }),
                            custrecord_ht_ot_producto: result.getText({ name: "custrecord_ht_ot_producto" }),
                            id_custrecord_ht_ot_tipo_trabajo: result.getValue({ name: "custrecord_ht_ot_tipo_trabajo" }),
                            custrecord_ht_ot_tipo_trabajo: result.getText({ name: "custrecord_ht_ot_tipo_trabajo" }),
                            id_custrecordht_ot_tipo_agrupacion: result.getValue({ name: "custrecordht_ot_tipo_agrupacion" }),
                            custrecordht_ot_tipo_agrupacion: result.getText({ name: "custrecordht_ot_tipo_agrupacion" }),

                        };
                    }

                });

                // Convertir el mapa de órdenes en un array
                results = results.concat(Object.values(ordersMap));
            });

            return results;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaFabricacion(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let fabricacionSearch = search.create({
                type: "workorder",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["datecreated", "within", fecha_ini, fecha_fin],
                        "AND", ["subsidiary", "anyof", "2"],
                        "AND", ["mainline", "is", "T"],
                        "AND", ["type", "anyof", "WorkOrd"]
                    ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "entity" }),
                    search.createColumn({ name: "item" }),
                    search.createColumn({ name: "firmed" }),
                    search.createColumn({ name: "built" }),
                    search.createColumn({ name: "quantity" }),
                    search.createColumn({ name: "createdfrom" }),
                    search.createColumn({ name: "startdate" }),
                    search.createColumn({ name: "enddate" }),
                    search.createColumn({ name: "memo" }),
                    search.createColumn({ name: "actualproductionstartdate" }),
                    search.createColumn({ name: "actualproductionenddate" }),
                    search.createColumn({ name: "schedulingmethod" }),
                    search.createColumn({ name: "memo" }),
                    search.createColumn({ name: "custbody_ht_ce_ordentrabajo" }),
                    search.createColumn({ name: "subsidiary" }),
                    search.createColumn({ name: "location" }),
                    search.createColumn({ name: "options" }),
                    search.createColumn({ name: "status" }),
                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = fabricacionSearch.runPaged({ pageSize: 1000 });
            log.debug("count ConsultaFabricacion", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let ordersMap = {};

                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalidOF = result.getValue({ name: "internalid" });

                    // Si la orden de servicio no está en el mapa, inicializar el objeto
                    if (!ordersMap[internalidOF]) {
                        ordersMap[internalidOF] = {
                            // General
                            internalidOF: internalidOF,
                            tranid: result.getValue({ name: "tranid" }),
                            trandate: result.getValue({ name: "trandate" }),
                            id_item: result.getValue({ name: "item" }),
                            item: result.getText({ name: "item" }),
                            firmed: result.getValue({ name: "firmed" }),
                            built: result.getValue({ name: "built" }),
                            quantity: result.getValue({ name: "quantity" }),
                            id_createdfrom: result.getValue({ name: "createdfrom" }),
                            createdfrom: result.getText({ name: "createdfrom" }),
                            startdate: result.getValue({ name: "startdate" }),
                            enddate: result.getValue({ name: "enddate" }),
                            id_custbody_ht_ce_ordentrabajo: result.getValue({ name: "custbody_ht_ce_ordentrabajo" }),
                            custbody_ht_ce_ordentrabajo: result.getText({ name: "custbody_ht_ce_ordentrabajo" }),
                            id_subsidiary: result.getValue({ name: "subsidiary" }),
                            subsidiary: result.getText({ name: "subsidiary" }),
                            id_location: result.getValue({ name: "location" }),
                            location: result.getText({ name: "location" }),
                            id_status: result.getValue({ name: "status" }),
                            status: result.getText({ name: "status" }),
                        };
                    }
                });

                // Convertir el mapa de órdenes de servicio en un array
                results = results.concat(Object.values(ordersMap));
            });

            return results;


        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaPago(fecha_ini, fecha_fin) {
        try {
            return { fecha_fin: fecha_fin, fecha_ini: fecha_ini };
        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaDeposito(fecha_ini, fecha_fin) {
        try {
            return { fecha_fin: fecha_fin, fecha_ini: fecha_ini };
        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaNCR(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let NotaCreditoSearch = search.create({
                type: "transaction",
                filters:
                    [
                        ["type", "anyof", "CustCred"],
                        "AND", ["memorized", "is", "F"],
                        "AND", ["posting", "any", ""],
                        "AND", ["voided", "is", "F"],
                        "AND", ["trandate", "within", fecha_ini, fecha_fin],
                        "AND", ["mainline", "is", "T"],
                        "AND", ["subsidiary", "anyof", "2"],
                    ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "transactionnumber" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "entity" }),
                    search.createColumn({ name: "account" }),
                    search.createColumn({ name: "currency" }),
                    search.createColumn({ name: "taxtotal" }),
                    search.createColumn({ name: "total" }),
                    search.createColumn({ name: "exchangerate" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "postingperiod" }),
                    search.createColumn({ name: "duedate" }),
                    search.createColumn({ name: "memo" }),
                    search.createColumn({ name: "createdfrom" }),

                    search.createColumn({ name: "subsidiary" }),
                    search.createColumn({ name: "department" }),
                    search.createColumn({ name: "class" }),
                    search.createColumn({ name: "location" }),

                    search.createColumn({ name: "custbody_ts_ec_subsidiaria_pais" }),
                    search.createColumn({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                    search.createColumn({ name: "custbody_ts_ec_serie_doc_cxp" }),
                    search.createColumn({ name: "custbody_ts_ec_numero_preimpreso" }),
                    search.createColumn({ name: "custbody_ts_ec_sustento_comprobante" }),
                    search.createColumn({ name: "custbodyts_ec_tipo_trans" }),
                    search.createColumn({ name: "custbody_ec_desc_tip_iva" }),
                    search.createColumn({ name: "custbody_base_niva" }),
                    search.createColumn({ name: "custbody_ts_ec_bimp_exe" }),
                    search.createColumn({ name: "custbodyts_ec_base_rate0" }),
                    search.createColumn({ name: "custbodyts_ec_base_rate12" }),
                    search.createColumn({ name: "custbody_ec_monto_iva" }),
                    search.createColumn({ name: "custbody_ts_ec_monto_letras" }),
                    search.createColumn({ name: "custbodyts_ec_num_autorizacion" }),
                    search.createColumn({ name: "custbody_ec_fecha_autorizacion" }),
                    search.createColumn({ name: "custbody_ts_pago_residente" }),
                    search.createColumn({ name: "custbody_ts_ec_ice_monto" }),
                    search.createColumn({ name: "custbodyts_ec_doc_type_ref" }),
                    search.createColumn({ name: "custbody_diario_relacionado" }),
                    search.createColumn({ name: "custbodyts_ec_doc_serie_ref" }),
                    search.createColumn({ name: "custbodyts_ec_doc_number_ref" }),
                    search.createColumn({ name: "custbody_ts_ec_folio_fiscal_ref" }),
                    search.createColumn({ name: "custbody_ec_comentario" }),
                    search.createColumn({ name: "custbodyec_causal" }),

                    search.createColumn({ name: "salesrep", label: "Representante de ventas" }),

                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = NotaCreditoSearch.runPaged({ pageSize: 1000 });
            // log.debug("count ConsultaNCR", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let invoicesMap = {};

                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalid = result.getValue({ name: "internalid" });

                    // Si la factura no está en el mapa, inicializar el objeto
                    if (!invoicesMap[internalid]) {
                        invoicesMap[internalid] = {
                            // Información principal
                            internalid: internalid,
                            transactionnumber: result.getValue({ name: "transactionnumber" }),
                            tranid: result.getValue({ name: "tranid" }),
                            id_entity: result.getValue({ name: "entity" }),
                            entity_text: (result.getText({ name: "entity" }) || '').replace(/,/g, ' '),
                            id_account: result.getValue({ name: "account" }),
                            id_currency: result.getValue({ name: "currency" }),
                            exchangerate: result.getValue({ name: "exchangerate" }),
                            trandate: result.getValue({ name: "trandate" }),
                            id_postingperiod: result.getValue({ name: "postingperiod" }),
                            postingperiod_text: result.getText({ name: "postingperiod" }),
                            id_createdfrom: result.getValue({ name: "createdfrom" }),
                            createdfrom: result.getText({ name: "createdfrom" }),

                            // Montos
                            subtotal: ((parseFloat(result.getValue({ name: "total" }) || "0") - parseFloat(result.getValue({ name: "taxtotal" }) || "0")).toFixed(2)),
                            taxtotal: result.getValue({ name: "taxtotal" }),
                            total: result.getValue({ name: "total" }),

                            // Classificación      
                            id_subsidiary: result.getValue({ name: "subsidiary" }),
                            id_department: result.getText({ name: "department" }),
                            id_class: result.getText({ name: "class" }),
                            id_location: result.getText({ name: "location" }),

                            // EC Localización
                            id_custbody_ts_ec_subsidiaria_pais: result.getValue({ name: "custbody_ts_ec_subsidiaria_pais" }),
                            id_custbodyts_ec_tipo_documento_fiscal: result.getValue({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                            custbody_ts_ec_serie_doc_cxp: result.getValue({ name: "custbody_ts_ec_serie_doc_cxp" }),
                            custbody_ts_ec_numero_preimpreso: result.getValue({ name: "custbody_ts_ec_numero_preimpreso" }),
                            id_custbody_ts_ec_sustento_comprobante: result.getValue({ name: "custbody_ts_ec_sustento_comprobante" }),
                            id_custbodyts_ec_tipo_trans: result.getValue({ name: "custbodyts_ec_tipo_trans" }),
                            id_custbody_ec_desc_tip_iva: result.getValue({ name: "custbody_ec_desc_tip_iva" }),
                            custbody_base_niva: result.getValue({ name: "custbody_base_niva" }),
                            custbody_ts_ec_bimp_exe: result.getValue({ name: "custbody_ts_ec_bimp_exe" }),
                            custbodyts_ec_base_rate0: result.getValue({ name: "custbodyts_ec_base_rate0" }),
                            custbodyts_ec_base_rate12: result.getValue({ name: "custbodyts_ec_base_rate12" }),
                            custbody_ec_monto_iva: result.getValue({ name: "custbody_ec_monto_iva" }),
                            custbodyts_ec_num_autorizacion: result.getValue({ name: "custbodyts_ec_num_autorizacion" }),
                            custbody_ec_fecha_autorizacion: result.getValue({ name: "custbody_ec_fecha_autorizacion" }),
                            id_custbody_ts_pago_residente: result.getValue({ name: "custbody_ts_pago_residente" }),
                            custbody_ts_ec_ice_monto: result.getValue({ name: "custbody_ts_ec_ice_monto" }),

                            // EC Documento de Referencia
                            id_custbodyts_ec_doc_type_ref: result.getValue({ name: "custbodyts_ec_doc_type_ref" }),
                            id_custbody_diario_relacionado: result.getValue({ name: "custbody_diario_relacionado" }),
                            custbodyts_ec_doc_serie_ref: result.getValue({ name: "custbodyts_ec_doc_serie_ref" }),
                            custbodyts_ec_doc_number_ref: result.getValue({ name: "custbodyts_ec_doc_number_ref" }),
                            custbody_ts_ec_folio_fiscal_ref: result.getValue({ name: "custbody_ts_ec_folio_fiscal_ref" }),
                            idcausal: result.getValue({ name: "custbodyec_causal" }),
                            causalText: (result.getText({ name: "custbodyec_causal" }) || '').replace(/,/g, '/'),

                            // Adiconal
                            ID_EJECUTIVA_DE_VENTAS: result.getValue("salesrep") || "",
                            EJECUTIVA_DE_VENTAS: (result.getText("salesrep") || "").replace(/[^a-zA-Z0-9\s]/g, ""),

                        };
                    }
                });

                // Convertir el mapa de facturas en un array
                results = results.concat(Object.values(invoicesMap));

                // // suma del subtotal
                // let totalSubtotal = 0;
                // let totalTaxtotal = 0;
                // let totalTotal = 0;

                // for (let i = 0; i < results.length; i++) {
                //     totalSubtotal += parseFloat(results[i].subtotal);
                //     totalTaxtotal += parseFloat(results[i].taxtotal);
                //     totalTotal += parseFloat(results[i].total);
                // }

                // log.debug("totalSubtotal", totalSubtotal);
                // log.debug("totalTaxtotal", totalTaxtotal);
                // log.debug("totalTotal", totalTotal);

            });

            return results;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaNCR2(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let NotaCreditoSearch = search.create({
                type: "transaction",
                filters:
                    [
                        ["type", "anyof", "CustCred"],
                        "AND", ["memorized", "is", "F"],
                        "AND", ["posting", "any", ""],
                        "AND", ["voided", "is", "F"],
                        "AND", ["trandate", "within", fecha_ini, fecha_fin],
                        "AND", ["mainline", "is", "T"],
                        "AND", ["subsidiary", "anyof", "2"],
                    ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    // search.createColumn({ name: "transactionnumber" }),
                    search.createColumn({ name: "tranid" }),
                    // search.createColumn({ name: "entity" }),
                    // search.createColumn({ name: "account" }),
                    // search.createColumn({ name: "currency" }),
                    search.createColumn({ name: "taxtotal" }),
                    search.createColumn({ name: "total" }),
                    // search.createColumn({ name: "exchangerate" }),
                    // search.createColumn({ name: "trandate" }),
                    // search.createColumn({ name: "postingperiod" }),
                    // search.createColumn({ name: "duedate" }),
                    // search.createColumn({ name: "memo" }),
                    // search.createColumn({ name: "createdfrom" }),

                    // search.createColumn({ name: "subsidiary" }),
                    // search.createColumn({ name: "department" }),
                    // search.createColumn({ name: "class" }),
                    search.createColumn({ name: "location" }),

                    // search.createColumn({ name: "custbody_ts_ec_subsidiaria_pais" }),
                    // search.createColumn({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                    // search.createColumn({ name: "custbody_ts_ec_serie_doc_cxp" }),
                    // search.createColumn({ name: "custbody_ts_ec_numero_preimpreso" }),
                    // search.createColumn({ name: "custbody_ts_ec_sustento_comprobante" }),
                    // search.createColumn({ name: "custbodyts_ec_tipo_trans" }),
                    // search.createColumn({ name: "custbody_ec_desc_tip_iva" }),
                    // search.createColumn({ name: "custbody_base_niva" }),
                    // search.createColumn({ name: "custbody_ts_ec_bimp_exe" }),
                    // search.createColumn({ name: "custbodyts_ec_base_rate0" }),
                    // search.createColumn({ name: "custbodyts_ec_base_rate12" }),
                    // search.createColumn({ name: "custbody_ec_monto_iva" }),
                    // search.createColumn({ name: "custbody_ts_ec_monto_letras" }),
                    // search.createColumn({ name: "custbodyts_ec_num_autorizacion" }),
                    // search.createColumn({ name: "custbody_ec_fecha_autorizacion" }),
                    // search.createColumn({ name: "custbody_ts_pago_residente" }),
                    // search.createColumn({ name: "custbody_ts_ec_ice_monto" }),
                    // search.createColumn({ name: "custbodyts_ec_doc_type_ref" }),
                    // search.createColumn({ name: "custbody_diario_relacionado" }),
                    // search.createColumn({ name: "custbodyts_ec_doc_serie_ref" }),
                    // search.createColumn({ name: "custbodyts_ec_doc_number_ref" }),
                    // search.createColumn({ name: "custbody_ts_ec_folio_fiscal_ref" }),
                    // search.createColumn({ name: "custbody_ec_comentario" }),
                    // search.createColumn({ name: "custbodyec_causal" }),

                    // search.createColumn({ name: "salesrep", label: "Representante de ventas" }),

                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = NotaCreditoSearch.runPaged({ pageSize: 1000 });
            // log.debug("count ConsultaNCR", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let invoicesMap = {};

                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalid = result.getValue({ name: "internalid" });

                    // Si la factura no está en el mapa, inicializar el objeto
                    if (!invoicesMap[internalid]) {
                        invoicesMap[internalid] = {
                            // Información principal
                            internalid: internalid,
                            // transactionnumber: result.getValue({ name: "transactionnumber" }),
                            tranid: result.getValue({ name: "tranid" }),
                            // id_entity: result.getValue({ name: "entity" }),
                            // entity_text: (result.getText({ name: "entity" }) || '').replace(/,/g, ' '),
                            // id_account: result.getValue({ name: "account" }),
                            // id_currency: result.getValue({ name: "currency" }),
                            // exchangerate: result.getValue({ name: "exchangerate" }),
                            // trandate: result.getValue({ name: "trandate" }),
                            // id_postingperiod: result.getValue({ name: "postingperiod" }),
                            // postingperiod_text: result.getText({ name: "postingperiod" }),
                            // id_createdfrom: result.getValue({ name: "createdfrom" }),
                            // createdfrom: result.getText({ name: "createdfrom" }),

                            // Montos
                            subtotal: ((parseFloat(result.getValue({ name: "total" }) || "0") - parseFloat(result.getValue({ name: "taxtotal" }) || "0")).toFixed(2)),
                            // taxtotal: result.getValue({ name: "taxtotal" }),
                            // total: result.getValue({ name: "total" }),

                            // Classificación      
                            // id_subsidiary: result.getValue({ name: "subsidiary" }),
                            // id_department: result.getText({ name: "department" }),
                            // id_class: result.getText({ name: "class" }),
                            id_location: result.getText({ name: "location" }),

                            // EC Localización
                            // id_custbody_ts_ec_subsidiaria_pais: result.getValue({ name: "custbody_ts_ec_subsidiaria_pais" }),
                            // id_custbodyts_ec_tipo_documento_fiscal: result.getValue({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                            // custbody_ts_ec_serie_doc_cxp: result.getValue({ name: "custbody_ts_ec_serie_doc_cxp" }),
                            // custbody_ts_ec_numero_preimpreso: result.getValue({ name: "custbody_ts_ec_numero_preimpreso" }),
                            // id_custbody_ts_ec_sustento_comprobante: result.getValue({ name: "custbody_ts_ec_sustento_comprobante" }),
                            // id_custbodyts_ec_tipo_trans: result.getValue({ name: "custbodyts_ec_tipo_trans" }),
                            // id_custbody_ec_desc_tip_iva: result.getValue({ name: "custbody_ec_desc_tip_iva" }),
                            // custbody_base_niva: result.getValue({ name: "custbody_base_niva" }),
                            // custbody_ts_ec_bimp_exe: result.getValue({ name: "custbody_ts_ec_bimp_exe" }),
                            // custbodyts_ec_base_rate0: result.getValue({ name: "custbodyts_ec_base_rate0" }),
                            // custbodyts_ec_base_rate12: result.getValue({ name: "custbodyts_ec_base_rate12" }),
                            // custbody_ec_monto_iva: result.getValue({ name: "custbody_ec_monto_iva" }),
                            // custbodyts_ec_num_autorizacion: result.getValue({ name: "custbodyts_ec_num_autorizacion" }),
                            // custbody_ec_fecha_autorizacion: result.getValue({ name: "custbody_ec_fecha_autorizacion" }),
                            // id_custbody_ts_pago_residente: result.getValue({ name: "custbody_ts_pago_residente" }),
                            // custbody_ts_ec_ice_monto: result.getValue({ name: "custbody_ts_ec_ice_monto" }),

                            // // EC Documento de Referencia
                            // id_custbodyts_ec_doc_type_ref: result.getValue({ name: "custbodyts_ec_doc_type_ref" }),
                            // id_custbody_diario_relacionado: result.getValue({ name: "custbody_diario_relacionado" }),
                            // custbodyts_ec_doc_serie_ref: result.getValue({ name: "custbodyts_ec_doc_serie_ref" }),
                            // custbodyts_ec_doc_number_ref: result.getValue({ name: "custbodyts_ec_doc_number_ref" }),
                            // custbody_ts_ec_folio_fiscal_ref: result.getValue({ name: "custbody_ts_ec_folio_fiscal_ref" }),
                            // idcausal: result.getValue({ name: "custbodyec_causal" }),
                            // causalText: (result.getText({ name: "custbodyec_causal" }) || '').replace(/,/g, '/'),

                            // // Adiconal
                            // ID_EJECUTIVA_DE_VENTAS: result.getValue("salesrep") || "",
                            // EJECUTIVA_DE_VENTAS: (result.getText("salesrep") || "").replace(/[^a-zA-Z0-9\s]/g, ""),

                        };
                    }
                });

                // Convertir el mapa de facturas en un array
                results = results.concat(Object.values(invoicesMap));

                // // suma del subtotal
                // let totalSubtotal = 0;
                // let totalTaxtotal = 0;
                // let totalTotal = 0;

                // for (let i = 0; i < results.length; i++) {
                //     totalSubtotal += parseFloat(results[i].subtotal);
                //     totalTaxtotal += parseFloat(results[i].taxtotal);
                //     totalTotal += parseFloat(results[i].total);
                // }

                // log.debug("totalSubtotal", totalSubtotal);
                // log.debug("totalTaxtotal", totalTaxtotal);
                // log.debug("totalTotal", totalTotal);

            });

            return results;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaANEXO2(data) {
        try {

            log.debug("Seguimiento Anexo", data);

            let flat = false
            let results = [];

            // Validar los datos de entrada
            if (data.factura == null || data.factura == "") {
                log.debug("error", { message: "No se ha enviado el id de la factura" });
                return [];
            }

            // Crear la búsqueda de facturas
            let invoiceSearch = search.create({
                type: "transaction",
                filters: [
                    ["type", "anyof", "CustInvc"],
                    // "AND",  ["internalid", "is", data.idFactura],
                    "AND", ["tranid", "anyof", data.factura],
                    "AND", ["subsidiary", "anyof", "2"],
                    "AND", ["mainline", "is", "T"],
                    "AND", ["memorized", "is", "F"],
                    "AND", ["posting", "any", ""],
                    "AND", ["voided", "is", "F"],
                ],
                columns: [
                    // Información principal
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "total" }),
                    search.createColumn({ name: "entity" }),
                    search.createColumn({ name: "createdfrom" }),
                    search.createColumn({ name: "custbody_ht_so_bien" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "terms" }),
                    search.createColumn({ name: "duedate" }),
                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = invoiceSearch.runPaged({ pageSize: 100 });

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let invoicesMap = {};

                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalidInvoice = result.getValue({ name: "internalid" });

                    let total = (result.getValue({ name: "total" }) || "0").replace(/-/g, ' ')

                    let cuotas = getInstallment(internalidInvoice, total);

                    let infocliente = getCliente(result.getValue({ name: "entity" }));
                    let infoOS = getOrden(result.getValue({ name: "createdfrom" }) || "");

                    let idVehiculo = result.getValue({ name: "custbody_ht_so_bien" })

                    let infoVehiculo;
                    if (idVehiculo) {
                        infoVehiculo = getVehiculo(idVehiculo);
                    } else {
                        let idBienOs = infoOS?.idbien || "";
                        infoVehiculo = getVehiculo(idBienOs);
                    }

                    // Si la factura no está en el mapa, inicializar el objeto
                    if (!invoicesMap[internalidInvoice]) {
                        if (!infoVehiculo.idvehiculo) {
                            log.debug("FI", "No tiene ninguna de las dos relaciones");

                            let infFiBien = obtenerInfFacturaInternaBien(internalidInvoice);
                            let infFiBien2 = obtenerInfFacturaInternaBien2(internalidInvoice);

                            if (infFiBien.length > 0) {
                                // // log.debug("infFiBien", infFiBien.length);
                                // let generalNw = [];

                                // for (let i = 0; i < infFiBien.length; i++) {

                                //     infoVehiculo = getVehiculo(infFiBien[i].custbody_ht_so_bien)
                                //     infoOS.nOS = (infFiBien[i].custrecord_orden_servicio || "")

                                //     generalNw.push({
                                //         // Información principal
                                //         internalidInvoice: internalidInvoice,
                                //         factura: result.getValue({ name: "tranid" }),
                                //         nombre_cliente: infocliente.cliente,
                                //         identificacion: infocliente.identificacion,
                                //         fecha_de_factura: result.getValue({ name: "trandate" }),

                                //         // Detalle de forma de pago 
                                //         forma_de_pago: result.getText({ name: "terms" }),
                                //         fecha_de_vencimiento: result.getValue({ name: "duedate" }),
                                //         valor: parseFloat(infFiBien[i].foreigntotal || "0").toFixed(2),

                                //         // Detalle de cuotas
                                //         cuotas: cuotas,

                                //         // Detalle de vehiculos
                                //         // Vehiculo: infoVehiculo.marca + '/' + infoVehiculo.modelo + '/' + infoVehiculo.chasis + '/' + infoVehiculo.motor + '/' + infoVehiculo.placa + '/' + infoOS.nOS,
                                //         Vehiculo: infoVehiculo.marca + '/' + infoVehiculo.modelo + '/' + infoVehiculo.chasis + '/' + infoVehiculo.motor + '/' + infoVehiculo.placa + '/' + infoVehiculo.serie_pro,
                                //         monto: parseFloat(infFiBien[i].foreigntotal || "0").toFixed(2),

                                //     })
                                // }

                                // invoicesMap[internalidInvoice] = generalNw;
                            }

                            let generalNw2 = []
                            if (infFiBien2.length > 0) {
                                // log.debug("infFiBien2", infFiBien2.length);
                                for (let i = 0; i < infFiBien2.length; i++) {
                                    infoVehiculo = getVehiculo2(infFiBien2[i].custbody_ht_so_bien)
                                    infoOS.nOS = (infFiBien2[i].custrecord_orden_servicio || "")

                                    generalNw2.push({
                                        // Información principal
                                        internalidInvoice: internalidInvoice,
                                        factura: result.getValue({ name: "tranid" }),
                                        nombre_cliente: infocliente.cliente,
                                        identificacion: infocliente.identificacion,
                                        fecha_de_factura: result.getValue({ name: "trandate" }),

                                        // Detalle de forma de pago 
                                        forma_de_pago: result.getText({ name: "terms" }),
                                        fecha_de_vencimiento: result.getValue({ name: "duedate" }),
                                        valor: parseFloat(infFiBien2[i].foreigntotal || "0").toFixed(2),

                                        // Detalle de cuotas
                                        cuotas: cuotas,

                                        // Detalle de vehiculos
                                        // Vehiculo: infoVehiculo.marca + '/' + infoVehiculo.modelo + '/' + infoVehiculo.chasis + '/' + infoVehiculo.motor + '/' + infoVehiculo.placa + '/' + infoOS.nOS,
                                        Vehiculo: infoVehiculo.marca + '/' + infoVehiculo.modelo + '/' + infoVehiculo.chasis + '/' + infoVehiculo.motor + '/' + infoVehiculo.placa + '/' + infoVehiculo.serie_pro,
                                        monto: parseFloat(infFiBien2[i].foreigntotal || "0").toFixed(2),
                                    })
                                }

                                invoicesMap[internalidInvoice] = generalNw2;
                                flat = true;
                            }

                            else if (infFiBien.length == 0) {

                                let infFiBien2 = obtenerInfFacturaInternaBien2(internalidInvoice);
                                let generalNw2 = [];

                                for (let i = 0; i < infFiBien2.length; i++) {

                                    infoVehiculo = getVehiculo(infFiBien2[i].custbody_ht_so_bien)
                                    infoOS.nOS = (infFiBien2[i].custrecord_orden_servicio || "")

                                    generalNw2.push({
                                        // Información principal
                                        internalidInvoice: internalidInvoice,
                                        factura: result.getValue({ name: "tranid" }),
                                        nombre_cliente: infocliente.cliente,
                                        identificacion: infocliente.identificacion,
                                        fecha_de_factura: result.getValue({ name: "trandate" }),

                                        // Detalle de forma de pago 
                                        forma_de_pago: result.getText({ name: "terms" }),
                                        fecha_de_vencimiento: result.getValue({ name: "duedate" }),
                                        valor: parseFloat(infFiBien2[i].foreigntotal || "0").toFixed(2),

                                        // Detalle de cuotas
                                        cuotas: cuotas,

                                        // Detalle de vehiculos
                                        // Vehiculo: infoVehiculo.marca + '/' + infoVehiculo.modelo + '/' + infoVehiculo.chasis + '/' + infoVehiculo.motor + '/' + infoVehiculo.placa + '/' + infoOS.nOS,
                                        Vehiculo: infoVehiculo.marca + '/' + infoVehiculo.modelo + '/' + infoVehiculo.chasis + '/' + infoVehiculo.motor + '/' + infoVehiculo.placa + '/' + infoVehiculo.serie_pro,
                                        monto: parseFloat(infFiBien2[i].foreigntotal || "0").toFixed(2),
                                    })
                                }

                                invoicesMap[internalidInvoice] = generalNw2;
                                flat = true
                            }

                        } else {
                            invoicesMap[internalidInvoice] = {
                                // Información principal
                                internalidInvoice: internalidInvoice,
                                factura: result.getValue({ name: "tranid" }),
                                nombre_cliente: infocliente.cliente,
                                identificacion: infocliente.identificacion,
                                fecha_de_factura: result.getValue({ name: "trandate" }),

                                // Detalle de forma de pago 
                                forma_de_pago: result.getText({ name: "terms" }),
                                fecha_de_vencimiento: result.getValue({ name: "duedate" }),
                                valor: total,

                                // Detalle de cuotas
                                cuotas: cuotas,

                                // Detalle de vehiculos
                                Vehiculo: infoVehiculo.marca + '/' + infoVehiculo.modelo + '/' + infoVehiculo.chasis + '/' + infoVehiculo.motor + '/' + infoVehiculo.placa + '/' + infoOS.nOS + '/' + infoVehiculo.serie_pro,
                                monto: total,
                            };
                        }
                    }
                });

                // Convertir el mapa de facturas en un array
                if (flat) {
                    results = results.concat(Object.values(invoicesMap))[0];
                } else {
                    results = results.concat(Object.values(invoicesMap));
                }
            });

            return results;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaANEXO(data) {
        try {

            log.debug("Seguimiento Anexo", data);

            let flat = false
            let results = [];

            // Validar los datos de entrada
            if (data.factura == null || data.factura == "") {
                log.debug("error", { message: "No se ha enviado el id de la factura" });
                return [];
            }

            // Crear la búsqueda de facturas
            let invoiceSearch = search.create({
                type: "transaction",
                filters: [
                    ["type", "anyof", "CustInvc"],
                    // "AND",  ["internalid", "is", data.idFactura],
                    "AND", ["tranid", "anyof", data.factura],
                    "AND", ["subsidiary", "anyof", "2"],
                    "AND", ["mainline", "is", "T"],
                    "AND", ["memorized", "is", "F"],
                    "AND", ["posting", "any", ""],
                    "AND", ["voided", "is", "F"],
                ],
                columns: [
                    // Información principal
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "total" }),
                    search.createColumn({ name: "entity" }),
                    search.createColumn({ name: "createdfrom" }),
                    search.createColumn({ name: "custbody_ht_so_bien" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "terms" }),
                    search.createColumn({ name: "duedate" }),
                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = invoiceSearch.runPaged({ pageSize: 1 });

            log.debug("count ConsultaOrdenesItems", { count: searchResult.count });


            log.debug("Resultados de la búsqueda", searchResult.count);

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let invoicesMap = {};

                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalidInvoice = result.getValue({ name: "internalid" });

                    let total = (result.getValue({ name: "total" }) || "0").replace(/-/g, ' ')

                    let cuotas = getInstallment(internalidInvoice, total);

                    let infocliente = getCliente(result.getValue({ name: "entity" }));
                    let infoOS = getOrden(result.getValue({ name: "createdfrom" }) || "");

                    let idVehiculo = result.getValue({ name: "custbody_ht_so_bien" })

                    let infoVehiculo;
                    if (idVehiculo) {
                        infoVehiculo = getVehiculo(idVehiculo);
                    } else {
                        let idBienOs = infoOS?.idbien || "";
                        infoVehiculo = getVehiculo(idBienOs);
                    }

                    if (!invoicesMap[internalidInvoice]) {
                        if (!infoVehiculo.idvehiculo) {
                            log.debug("FI", "No tiene ninguna de las dos relaciones");

                            // Cache de valores estáticos
                            let factura = result.getValue({ name: "tranid" });
                            let fechaFactura = result.getValue({ name: "trandate" });
                            let formaPago = result.getText({ name: "terms" });
                            let fechaVenc = result.getValue({ name: "duedate" });

                            // Cache de vehículos
                            let vehiculoCache = {};

                            // Función para crear el objeto de salida
                            const crearObjeto = (registro) => {
                                let bienId = registro.custbody_ht_so_bien;

                                if (!vehiculoCache[bienId]) {
                                    vehiculoCache[bienId] = getVehiculo(bienId);
                                }
                                let v = vehiculoCache[bienId];

                                infoOS.nOS = registro.custrecord_orden_servicio || "";

                                return {
                                    internalidInvoice: internalidInvoice,
                                    factura: factura,
                                    nombre_cliente: infocliente.cliente,
                                    identificacion: infocliente.identificacion,
                                    fecha_de_factura: fechaFactura,

                                    forma_de_pago: formaPago,
                                    fecha_de_vencimiento: fechaVenc,
                                    valor: parseFloat(registro.foreigntotal || "0").toFixed(2),
                                    cuotas: cuotas,
                                    // Vehiculo: [
                                    //     v.marca, v.modelo, v.chasis, v.motor, v.placa, v.serie_pro
                                    // ].join('/'),
                                    Vehiculo: [
                                        v.marca,
                                        v.modelo,
                                        v.chasis,
                                        v.motor,
                                        v.placa,
                                        v.serie_pro
                                    ].filter(val => val && val.toString().trim() !== '' && val.toString().toUpperCase() !== 'NO DEFINIDO')
                                        .join('/'),
                                    // Vehiculo: [
                                    //     v.marca,
                                    //     v.modelo,
                                    //     v.chasis,
                                    //     v.motor,
                                    //     v.placa,
                                    //     v.serie_pro
                                    // ].filter(val => val && val.toString().trim() !== '').join('/'),
                                    monto: parseFloat(registro.foreigntotal || "0").toFixed(2),
                                };
                            };

                            // Procesar infFiBien
                            let infFiBien = obtenerInfFacturaInternaBien(internalidInvoice);
                            if (!Array.isArray(infFiBien)) infFiBien = [];
                            let generalNw = infFiBien.map(crearObjeto);

                            // Procesar infFiBien2
                            let infFiBien2 = obtenerInfFacturaInternaBien2(internalidInvoice);
                            if (!Array.isArray(infFiBien2)) infFiBien2 = [];
                            let generalNw2 = infFiBien2.map(crearObjeto);

                            // Guardar resultado (si existe infFiBien2 se prioriza)
                            invoicesMap[internalidInvoice] = generalNw2.length > 0 ? generalNw2 : generalNw;

                            flat = true;

                        } else {
                            // Caso cuando sí hay idvehiculo
                            invoicesMap[internalidInvoice] = {
                                internalidInvoice: internalidInvoice,
                                factura: result.getValue({ name: "tranid" }),
                                nombre_cliente: infocliente.cliente,
                                identificacion: infocliente.identificacion,
                                fecha_de_factura: result.getValue({ name: "trandate" }),

                                forma_de_pago: result.getText({ name: "terms" }),
                                fecha_de_vencimiento: result.getValue({ name: "duedate" }),
                                valor: total,
                                cuotas: cuotas,
                                // Vehiculo: [
                                //     infoVehiculo.marca,
                                //     infoVehiculo.modelo,
                                //     infoVehiculo.chasis,
                                //     infoVehiculo.motor,
                                //     infoVehiculo.placa,
                                //     infoOS.nOS,
                                //     infoVehiculo.serie_pro
                                // ].join('/'),

                                // Vehiculo: [
                                //     v.marca,
                                //     v.modelo,
                                //     v.chasis,
                                //     v.motor,
                                //     v.placa,
                                //     v.serie_pro
                                // ].filter(val => val && val.toString().trim() !== '').join('/'),
                                Vehiculo: [
                                    infoVehiculo.marca,
                                    infoVehiculo.modelo,
                                    infoVehiculo.chasis,
                                    infoVehiculo.motor,
                                    infoVehiculo.placa,
                                    infoVehiculo.serie_pro
                                ].filter(val => val && val.toString().trim() !== '' && val.toString().toUpperCase() !== 'NO DEFINIDO')
                                    .join('/'),
                                monto: total,
                            };
                        }
                    }

                });

                // Convertir el mapa de facturas en un array
                if (flat) {
                    results = results.concat(Object.values(invoicesMap))[0];
                } else {
                    results = results.concat(Object.values(invoicesMap));
                }
            });

            return results;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaOrdenesItems(fecha_ini, fecha_fin) {

        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];
            let data = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let serviceOrderSearch = search.create({
                type: "transaction",
                filters: [
                    ["type", "anyof", "CustInvc"],
                    "AND", ["trandate", "within", fecha_ini, fecha_fin],
                    "AND", ["subsidiary", "anyof", "2"],
                    "AND", ["mainline", "is", "T"],
                    "AND", ["memorized", "is", "F"],
                    "AND", ["posting", "any", ""],
                    "AND", ["voided", "is", "F"],
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = serviceOrderSearch.runPaged({ pageSize: 1000 });
            log.debug("count ConsultaOrdenesItems", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let ordersMap = {};


                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalidOs = result.getValue({ name: "internalid" });

                    // Si la orden no está en el mapa, inicializar el objeto
                    if (!ordersMap[internalidOs]) {
                        ordersMap[internalidOs] = {
                            // Información principal
                            internalidOs: internalidOs,
                        };
                    }
                });

                results = results.concat(Object.values(ordersMap));
            });
            // log.debug("results", results);
            for (let i = 0; i < results.length; i++) {
                let itemParametrizado = obtenerItemParametrizadoPorBien(results[i].internalidOs);
                if (itemParametrizado) {
                    let itemflat = itemParametrizado.flat();
                    data = data.concat(itemflat);
                }
            }


            // try {

            //     let preciototal = 0;

            //     for (let i = 0; i < data.length; i++) {
            //         preciototal += parseFloat(data[i].precio);
            //     }

            //     log.debug("preciototal", preciototal);
            // } catch (error) {

            // }



            return data;
        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaConsolidado(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let invoiceSearch = search.create({
                type: "transaction",
                filters:
                    [
                        // ["type", "anyof", ["Journal", "CustInvc", "CustCred"]],
                        // "AND",
                        ["trandate", "within", fecha_ini, fecha_fin],
                        "AND", ["subsidiary", "anyof", "2"],
                        // "AND", ["mainline", "is", "T"],
                        // "AND", ["memorized", "is", "F"],
                        "AND", ["posting", "is", "T"],
                        // "AND", ["voided", "is", "F"],
                        "AND", ["accounttype", "anyof",
                            [
                                "Expense",            // Gastos
                                "Income",             // Ingresos
                                "Cost of Goods Sold", // Costos de los artículos vendidos
                                "Other Income",       // Otros ingresos
                                "Other Expense"       // Otros gastos
                            ]
                        ],
                    ],
                columns: [
                    search.createColumn({ name: "internalid", join: "subsidiary", label: "ID interno" }),
                    search.createColumn({ name: "subsidiary", label: "Subsidiaria" }),
                    search.createColumn({ name: "internalid", join: "location", label: "ID interno" }),
                    search.createColumn({ name: "name", join: "location", label: "Ubicacion" }),
                    search.createColumn({ name: "externalid", join: "location", label: "ID externo" }),
                    search.createColumn({ name: "namenohierarchy", join: "location", label: "Nombre (sin jerarquía)" }),
                    search.createColumn({ name: "number", join: "account", label: "Número" }),
                    search.createColumn({ name: "custrecord_ht_ec_cuentabancaria", join: "account", label: "EC Cuenta bancaria" }),
                    search.createColumn({ name: "account", label: "Cuenta" }),
                    search.createColumn({ name: "description", join: "account", label: "Descripción" }),
                    search.createColumn({ name: "internalid", label: "ID interno" }),
                    search.createColumn({ name: "type", label: "Tipo" }),
                    search.createColumn({ name: "debitamount", label: "Debito" }),
                    search.createColumn({ name: "creditamount", label: "Credito" }),
                    search.createColumn({ name: "grossamount", label: "Diferencia" }),
                    search.createColumn({ name: "trandate", label: "Fecha", sort: search.Sort.ASC }),
                    search.createColumn({ name: "transactionnumber", label: "Número de transacción" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "postingperiod" }),
                ]
            });


            // let results = []; // Array donde almacenar los resultados completos

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = invoiceSearch.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda", totalRecords);

            let dataaaa = []

            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados

                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {

                    dataaaa.push({

                        ID_EMPRESA: result.getValue({ name: "internalid", join: "subsidiary" }),
                        Empresa: result.getText("subsidiary"),
                        ID_oficina: result.getValue({ name: "internalid", join: "location" }),
                        Oficina: result.getValue({ name: "name", join: "location" }),
                        ID_Sucursal: result.getValue({ name: "externalid", join: "location" }),
                        Sucursal: result.getValue({ name: "namenohierarchy", join: "location" }),
                        Grupo_Cuenta: result.getValue({ name: "number", join: "account" }),
                        Numero_Cuenta: result.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account" }),
                        ID_Cuenta_Netsuite: result.getValue("account"),
                        Descripcion_Cuenta: result.getValue({ name: "description", join: "account" }),
                        ID_Transaccion: result.getValue({ name: "internalid" }),
                        Numero_Transaccion: result.getValue("transactionnumber"),
                        Debito: parseNumber(result.getValue("debitamount")),
                        Credito: Number((parseFloat(result.getValue("creditamount") || 0) * -1).toFixed(2)),
                        importe: Number((parseFloat(result.getValue("debitamount") || 0) - parseFloat(result.getValue("creditamount") || 0)).toFixed(2)),
                        Fecha_Movimiento: result.getValue("trandate"),
                        Tipo: result.getText("type"),
                        NDocumento: result.getValue("tranid"),
                        id_periodoDePublicacion: result.getValue({ name: "postingperiod" }),
                        periodoDePublicacion: result.getText({ name: "postingperiod" }),
                    })
                });

                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));

                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar

                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados

                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {

                        dataaaa.push({
                            ID_EMPRESA: result.getValue({ name: "internalid", join: "subsidiary" }),
                            Empresa: result.getText("subsidiary"),
                            ID_oficina: result.getValue({ name: "internalid", join: "location" }),
                            Oficina: result.getValue({ name: "name", join: "location" }),
                            ID_Sucursal: result.getValue({ name: "externalid", join: "location" }),
                            Sucursal: result.getValue({ name: "namenohierarchy", join: "location" }),
                            Grupo_Cuenta: result.getValue({ name: "number", join: "account" }),
                            Numero_Cuenta: result.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account" }),
                            ID_Cuenta_Netsuite: result.getValue("account"),
                            Descripcion_Cuenta: result.getValue({ name: "description", join: "account" }),
                            ID_Transaccion: result.getValue({ name: "internalid" }),
                            Numero_Transaccion: result.getValue("transactionnumber"),
                            Debito: parseNumber(result.getValue("debitamount")),
                            Credito: Number((parseFloat(result.getValue("creditamount") || 0) * -1).toFixed(2)),
                            importe: Number((parseFloat(result.getValue("debitamount") || 0) - parseFloat(result.getValue("creditamount") || 0)).toFixed(2)),
                            Fecha_Movimiento: result.getValue("trandate"),
                            Tipo: result.getText("type"),
                            NDocumento: result.getValue("tranid"),
                            id_periodoDePublicacion: result.getValue({ name: "postingperiod" }),
                            postingperiod: result.getText({ name: "postingperiod" }),
                        })

                    });

                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            log.debug("Número total de registros dataaa", dataaaa.length);

            return dataaaa;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaConsolidado22(fecha_ini, fecha_fin, indice) {
        try {
            indice = indice - 1;
            const LONGITUD_PAGINA = 900;
            log.debug("ConsultaConsolidado22", { fecha_ini, fecha_fin })

            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            let cacheEntidad = {}; // cache por transacción dentro de esta ejecución

            // Mapa de tipo de búsqueda -> tipo de record para lookupFields
            function mapearTipoRecord(searchType) {
                var mapa = {
                    "CustInvc": "invoice",
                    "CustCred": "creditmemo",
                    "Journal": "journalentry",
                    "SalesOrd": "salesorder",
                    "CustPymt": "customerpayment",
                    "VendBill": "vendorbill"
                    // agrega los que aparezcan en tu data
                };
                return mapa[searchType] || null;
            }

            function obtenerEntityCabecera(idTran, searchType) {
                try {
                    var recordType = mapearTipoRecord(searchType);
                    if (!recordType) return { id: "", nombre: "" };

                    var valores = search.lookupFields({
                        type: recordType,
                        id: idTran,
                        columns: ['entity']
                    });

                    if (valores.entity && valores.entity.length) {
                        return { id: valores.entity[0].value, nombre: valores.entity[0].text };
                    }
                    return { id: "", nombre: "" };
                } catch (e) {
                    log.debug("obtenerEntityCabecera error", { idTran: idTran, message: e.message });
                    return { id: "", nombre: "" };
                }
            }

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "verifique Valores", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje, indice: indice });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let Busqueda = search.create({
                type: "transaction",
                filters:
                    [
                        // ["type", "anyof", ["Journal", "CustInvc", "CustCred"]],
                        // "AND",
                        ["trandate", "within", fecha_ini, fecha_fin],
                        "AND", ["subsidiary", "anyof", "2"],
                        // "AND", ["mainline", "is", "T"],
                        // "AND", ["memorized", "is", "F"],
                        "AND", ["posting", "is", "T"],
                        // "AND", ["voided", "is", "F"],
                        // "AND",   // Doas 10/04/2026 - Se comenta este filtro para incluir todas las cuentas contables, no solo las de bancos 
                        // [
                        //     [["account.number", "startswith", "4"]],
                        //     "OR", [["account.number", "startswith", "5"]],
                        //     "OR", [["account.number", "startswith", "6"]],
                        //     "OR", [["account.number", "startswith", "7"]]
                        // ],
                    ],
                columns: [
                    search.createColumn({ name: "internalid", join: "subsidiary", label: "ID interno" }),
                    search.createColumn({ name: "subsidiary", label: "Subsidiaria" }),
                    search.createColumn({ name: "internalid", join: "location", label: "ID interno" }),
                    search.createColumn({ name: "name", join: "location", label: "Ubicacion" }),
                    search.createColumn({ name: "externalid", join: "location", label: "ID externo" }),
                    search.createColumn({ name: "namenohierarchy", join: "location", label: "Nombre (sin jerarquía)" }),
                    search.createColumn({ name: "number", join: "account", label: "Número" }),
                    search.createColumn({ name: "custrecord_ht_ec_cuentabancaria", join: "account", label: "EC Cuenta bancaria" }),
                    search.createColumn({ name: "account", label: "Cuenta" }),
                    search.createColumn({ name: "description", join: "account", label: "Descripción" }),
                    search.createColumn({ name: "internalid", label: "ID interno" }),
                    search.createColumn({ name: "type", label: "Tipo" }),
                    search.createColumn({ name: "debitamount", label: "Debito" }),
                    search.createColumn({ name: "creditamount", label: "Credito" }),
                    search.createColumn({ name: "grossamount", label: "Diferencia" }),
                    search.createColumn({ name: "trandate", label: "Fecha", sort: search.Sort.ASC }),
                    search.createColumn({ name: "transactionnumber", label: "Número de transacción" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "postingperiod" }),
                    search.createColumn({ name: "mainname", label: "Nombre de la línea principal" }),
                    search.createColumn({ name: "createdfrom", label: "Creado desde" })
                ]
            });

            let ObjResultado = [];

            let ResultadoConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA });

            let conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
            if (!indice || indice == "" || indice < 0) {
                indice = 0;
            } else if (indice > conteoPagina) {
                indice = conteoPagina;
            }

            if (ResultadoConsulta.count != 0) {
                let ResPagina = ResultadoConsulta.fetch({ index: indice });
                ResPagina.data.forEach(function (result) {

                    let idTran = result.getValue({ name: "internalid" });

                    // resolver entity de cabecera una sola vez por transacción
                    if (!cacheEntidad.hasOwnProperty(idTran)) {
                        cacheEntidad[idTran] = obtenerEntityCabecera(idTran, result.getValue("type"));
                    }
                    let entidadCabecera = cacheEntidad[idTran];

                    ObjResultado.push({
                        ID_EMPRESA: result.getValue({ name: "internalid", join: "subsidiary" }),
                        Empresa: result.getText("subsidiary"),
                        ID_oficina: result.getValue({ name: "internalid", join: "location" }),
                        Oficina: result.getValue({ name: "name", join: "location" }),
                        ID_Sucursal: result.getValue({ name: "externalid", join: "location" }),
                        Sucursal: result.getValue({ name: "namenohierarchy", join: "location" }),
                        Grupo_Cuenta: result.getValue({ name: "number", join: "account" }),
                        Numero_Cuenta: result.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account" }),
                        ID_Cuenta_Netsuite: result.getValue("account"),
                        Descripcion_Cuenta: result.getValue({ name: "description", join: "account" }),
                        ID_Transaccion: result.getValue({ name: "internalid" }),
                        Numero_Transaccion: result.getValue("transactionnumber"),
                        Debito: parseNumber(result.getValue("debitamount")),
                        Credito: Number((parseFloat(result.getValue("creditamount") || 0) * -1).toFixed(2)),
                        importe: Number((parseFloat(result.getValue("debitamount") || 0) - parseFloat(result.getValue("creditamount") || 0)).toFixed(2)),
                        Fecha_Movimiento: result.getValue("trandate"),
                        Tipo: result.getText("type"),
                        NDocumento: result.getValue("tranid"),
                        id_periodoDePublicacion: result.getValue({ name: "postingperiod" }),
                        periodoDePublicacion: result.getText({ name: "postingperiod" }),
                        Nombre_Linea_Principal: (result.getValue({ name: "mainname", label: "Nombre de la línea principal" }) ? result.getText({ name: "mainname", label: "Nombre de la línea principal" }) : "" || "").replace(/,/g, ' '),
                        Entidad: (entidadCabecera.nombre).replace(/,/g, ' '),
                        Creado_desde: (result.getValue("createdfrom") ? result.getText("createdfrom") : "") || "",
                    });
                });
            }



            return {
                results: ObjResultado,
                index: parseInt(indice) + 1,
                pages: conteoPagina,
                //total: ResultadoConsulta.count,
            };

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaConsolidado2(fecha_ini, fecha_fin) {
        try {

            log.debug("fechas", {
                fecha_ini, fecha_fin
            })

            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let invoiceSearch = search.create({
                type: "transaction",
                filters:
                    [
                        // ["type", "anyof", ["Journal", "CustInvc", "CustCred"]],
                        // "AND",
                        ["trandate", "within", fecha_ini, fecha_fin],
                        "AND", ["subsidiary", "anyof", "2"],
                        // "AND", ["mainline", "is", "T"],
                        // "AND", ["memorized", "is", "F"],
                        "AND", ["posting", "is", "T"],
                        // "AND", ["voided", "is", "F"],
                        // "AND",   // Doas 10/04/2026 - Se comenta este filtro para incluir todas las cuentas contables, no solo las de bancos 
                        // [
                        //     [["account.number", "startswith", "4"]],
                        //     "OR", [["account.number", "startswith", "5"]],
                        //     "OR", [["account.number", "startswith", "6"]],
                        //     "OR", [["account.number", "startswith", "7"]]
                        // ],
                    ],
                columns: [
                    search.createColumn({ name: "internalid", join: "subsidiary", label: "ID interno" }),
                    search.createColumn({ name: "subsidiary", label: "Subsidiaria" }),
                    search.createColumn({ name: "internalid", join: "location", label: "ID interno" }),
                    search.createColumn({ name: "name", join: "location", label: "Ubicacion" }),
                    search.createColumn({ name: "externalid", join: "location", label: "ID externo" }),
                    search.createColumn({ name: "namenohierarchy", join: "location", label: "Nombre (sin jerarquía)" }),
                    search.createColumn({ name: "number", join: "account", label: "Número" }),
                    search.createColumn({ name: "custrecord_ht_ec_cuentabancaria", join: "account", label: "EC Cuenta bancaria" }),
                    search.createColumn({ name: "account", label: "Cuenta" }),
                    search.createColumn({ name: "description", join: "account", label: "Descripción" }),
                    search.createColumn({ name: "internalid", label: "ID interno" }),
                    search.createColumn({ name: "type", label: "Tipo" }),
                    search.createColumn({ name: "debitamount", label: "Debito" }),
                    search.createColumn({ name: "creditamount", label: "Credito" }),
                    search.createColumn({ name: "grossamount", label: "Diferencia" }),
                    search.createColumn({ name: "trandate", label: "Fecha", sort: search.Sort.ASC }),
                    search.createColumn({ name: "transactionnumber", label: "Número de transacción" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "postingperiod" }),
                ]
            });


            // let results = []; // Array donde almacenar los resultados completos

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = invoiceSearch.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda-", totalRecords);

            let dataaaa = []

            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados

                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {

                    dataaaa.push({

                        ID_EMPRESA: result.getValue({ name: "internalid", join: "subsidiary" }),
                        Empresa: result.getText("subsidiary"),
                        ID_oficina: result.getValue({ name: "internalid", join: "location" }),
                        Oficina: result.getValue({ name: "name", join: "location" }),
                        ID_Sucursal: result.getValue({ name: "externalid", join: "location" }),
                        Sucursal: result.getValue({ name: "namenohierarchy", join: "location" }),
                        Grupo_Cuenta: result.getValue({ name: "number", join: "account" }),
                        Numero_Cuenta: result.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account" }),
                        ID_Cuenta_Netsuite: result.getValue("account"),
                        Descripcion_Cuenta: result.getValue({ name: "description", join: "account" }),
                        ID_Transaccion: result.getValue({ name: "internalid" }),
                        Numero_Transaccion: result.getValue("transactionnumber"),
                        Debito: 0, //parseNumber(result.getValue("debitamount")),
                        Credito: 0, //Number((parseFloat(result.getValue("creditamount") || 0) * -1).toFixed(2)),
                        importe: 0, //Number((parseFloat(result.getValue("debitamount") || 0) - parseFloat(result.getValue("creditamount") || 0)).toFixed(2)),
                        Fecha_Movimiento: result.getValue("trandate"),
                        Tipo: result.getText("type"),
                        NDocumento: result.getValue("tranid"),
                        id_periodoDePublicacion: result.getValue({ name: "postingperiod" }),
                        periodoDePublicacion: result.getText({ name: "postingperiod" }),
                    })
                });

                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));

                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar

                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados

                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {

                        dataaaa.push({
                            ID_EMPRESA: result.getValue({ name: "internalid", join: "subsidiary" }),
                            Empresa: result.getText("subsidiary"),
                            ID_oficina: result.getValue({ name: "internalid", join: "location" }),
                            Oficina: result.getValue({ name: "name", join: "location" }),
                            ID_Sucursal: result.getValue({ name: "externalid", join: "location" }),
                            Sucursal: result.getValue({ name: "namenohierarchy", join: "location" }),
                            Grupo_Cuenta: result.getValue({ name: "number", join: "account" }),
                            Numero_Cuenta: result.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account" }),
                            ID_Cuenta_Netsuite: result.getValue("account"),
                            Descripcion_Cuenta: result.getValue({ name: "description", join: "account" }),
                            ID_Transaccion: result.getValue({ name: "internalid" }),
                            Numero_Transaccion: result.getValue("transactionnumber"),
                            Debito: 0, //parseNumber(result.getValue("debitamount")),
                            Credito: 0, //Number((parseFloat(result.getValue("creditamount") || 0) * -1).toFixed(2)),
                            importe: 0, //Number((parseFloat(result.getValue("debitamount") || 0) - parseFloat(result.getValue("creditamount") || 0)).toFixed(2)),
                            Fecha_Movimiento: result.getValue("trandate"),
                            Tipo: result.getText("type"),
                            NDocumento: result.getValue("tranid"),
                            id_periodoDePublicacion: result.getValue({ name: "postingperiod" }),
                            periodoDePublicacion: result.getText({ name: "postingperiod" }),
                        })

                    });

                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            log.debug("Número total de registros dataaa", dataaaa.length);

            return dataaaa;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaConsolidado3(fecha_ini, fecha_fin) {
        try {

            function obtenerIdPeriodoContable(periodo) {
                try {
                    const periodSearch = search.create({
                        type: "accountingperiod",
                        filters: [["periodname", "contains", periodo]],
                        columns: ["internalid"],
                    });

                    const resultSet = periodSearch.run();
                    const results = resultSet.getRange({ start: 0, end: 1 });

                    if (results.length > 0) {
                        return results[0].getValue("internalid");
                    } else {
                        return "";
                    }
                } catch (e) {
                    log.error("Error en obtenerIdPeriodoContable", e);
                    return "";
                }
            }

            function convertirFecha(fecha) {
                const [dia, mes, año] = fecha.split("/"); // Dividir la fecha en día, mes y año
                return new Date(`${año}-${mes}-${dia}`); // Construir la fecha en formato ISO
            }

            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)

            log.debug("Fechas de búsqueda", { fecha_ini: fecha_ini, fecha_fin: fecha_fin });


            // Convertir las fechas a objetos Date para calcular el período
            const fechaInicioObj = convertirFecha(fecha_ini); // Convertir fecha inicial
            const fechaFinObj = convertirFecha(fecha_fin); // Convertir fecha final

            // Obtener el mes y año del período
            const mesInicio = fechaInicioObj.toLocaleString('en-US', { month: 'short' }).toLowerCase(); // Mes abreviado en inglés
            const añoInicio = fechaInicioObj.getFullYear();
            const postingPeriod = `${mesInicio} ${añoInicio}`; // Formato dinámico "jul 2025"

            log.debug("Posting Period", postingPeriod);
            // Obtener el ID del período contable
            const postingPeriodId = obtenerIdPeriodoContable(postingPeriod);
            log.debug("Posting Period ID", postingPeriodId);

            let invoiceSearch = search.create({
                type: "transaction",
                filters:
                    [
                        // ["type", "anyof", ["Journal", "CustInvc", "CustCred"]],
                        // "AND",
                        ["trandate", "within", fecha_ini, fecha_fin],
                        "AND", ["subsidiary", "anyof", "2"],
                        // "AND", ["mainline", "is", "T"],
                        // "AND", ["memorized", "is", "F"],
                        "AND", ["posting", "is", "T"],
                        // "AND", ["voided", "is", "F"],
                        "AND",
                        [
                            [
                                // ["account.number", "startswith", "4"]],
                                // "OR", [["account.number", "startswith", "5"]],
                                // "OR"
                                [["account.number", "startswith", "6"]],
                                // "OR", [["account.number", "startswith", "7"]
                            ]
                        ],
                        // "AND", ["postingperiod", "is", postingPeriodId], // Filtrar por período de publicación
                    ],
                columns: [
                    search.createColumn({ name: "internalid", join: "subsidiary", label: "ID interno" }),
                    search.createColumn({ name: "subsidiary", label: "Subsidiaria" }),
                    search.createColumn({ name: "internalid", join: "location", label: "ID interno" }),
                    search.createColumn({ name: "name", join: "location", label: "Ubicacion" }),
                    search.createColumn({ name: "externalid", join: "location", label: "ID externo" }),
                    search.createColumn({ name: "namenohierarchy", join: "location", label: "Nombre (sin jerarquía)" }),
                    search.createColumn({ name: "number", join: "account", label: "Número" }),
                    search.createColumn({ name: "custrecord_ht_ec_cuentabancaria", join: "account", label: "EC Cuenta bancaria" }),
                    search.createColumn({ name: "account", label: "Cuenta" }),
                    search.createColumn({ name: "description", join: "account", label: "Descripción" }),
                    search.createColumn({ name: "internalid", label: "ID interno" }),
                    search.createColumn({ name: "type", label: "Tipo" }),
                    search.createColumn({ name: "debitamount", label: "Debito" }),
                    search.createColumn({ name: "creditamount", label: "Credito" }),
                    search.createColumn({ name: "grossamount", label: "Diferencia" }),
                    search.createColumn({ name: "trandate", label: "Fecha", sort: search.Sort.ASC }),
                    search.createColumn({ name: "postingperiod" }),
                    search.createColumn({ name: "transactionnumber", label: "Número de transacción" }),
                    search.createColumn({ name: "tranid" }),
                ]
            });


            // let results = []; // Array donde almacenar los resultados completos

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = invoiceSearch.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda", totalRecords);

            let dataaaa = []

            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados

                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {

                    dataaaa.push({

                        ID_EMPRESA: result.getValue({ name: "internalid", join: "subsidiary" }),
                        Empresa: result.getText("subsidiary"),
                        ID_oficina: result.getValue({ name: "internalid", join: "location" }),
                        Oficina: result.getValue({ name: "name", join: "location" }),
                        ID_Sucursal: result.getValue({ name: "externalid", join: "location" }),
                        Sucursal: result.getValue({ name: "namenohierarchy", join: "location" }),
                        Grupo_Cuenta: result.getValue({ name: "number", join: "account" }),
                        Numero_Cuenta: result.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account" }),
                        ID_Cuenta_Netsuite: result.getValue("account"),
                        Descripcion_Cuenta: result.getValue({ name: "description", join: "account" }),
                        ID_Transaccion: result.getValue({ name: "internalid" }),
                        Numero_Transaccion: result.getValue("transactionnumber"),
                        Debito: parseNumber(result.getValue("debitamount")),
                        Credito: Number((parseFloat(result.getValue("creditamount") || 0) * -1).toFixed(2)),
                        importe: Number((parseFloat(result.getValue("debitamount") || 0) - parseFloat(result.getValue("creditamount") || 0)).toFixed(2)),
                        Fecha_Movimiento: result.getValue("trandate"),
                        Tipo: result.getText("type"),
                        NDocumento: result.getValue("tranid"),
                        id_periodoDePublicacion: result.getValue({ name: "postingperiod" }),
                        periodoDePublicacion: result.getText({ name: "postingperiod" }),
                    })
                });

                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));

                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar

                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados

                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {

                        dataaaa.push({
                            ID_EMPRESA: result.getValue({ name: "internalid", join: "subsidiary" }),
                            Empresa: result.getText("subsidiary"),
                            ID_oficina: result.getValue({ name: "internalid", join: "location" }),
                            Oficina: result.getValue({ name: "name", join: "location" }),
                            ID_Sucursal: result.getValue({ name: "externalid", join: "location" }),
                            Sucursal: result.getValue({ name: "namenohierarchy", join: "location" }),
                            Grupo_Cuenta: result.getValue({ name: "number", join: "account" }),
                            Numero_Cuenta: result.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account" }),
                            ID_Cuenta_Netsuite: result.getValue("account"),
                            Descripcion_Cuenta: result.getValue({ name: "description", join: "account" }),
                            ID_Transaccion: result.getValue({ name: "internalid" }),
                            Numero_Transaccion: result.getValue("transactionnumber"),
                            Debito: parseNumber(result.getValue("debitamount")),
                            Credito: Number((parseFloat(result.getValue("creditamount") || 0) * -1).toFixed(2)),
                            importe: Number((parseFloat(result.getValue("debitamount") || 0) - parseFloat(result.getValue("creditamount") || 0)).toFixed(2)),
                            Fecha_Movimiento: result.getValue("trandate"),
                            Tipo: result.getText("type"),
                            NDocumento: result.getValue("tranid"),
                            id_periodoDePublicacion: result.getValue({ name: "postingperiod" }),
                            postingperiod: result.getText({ name: "postingperiod" }),
                        })

                    });

                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }

            // let totalDebito = dataaaa.reduce((sum, item) => sum + (item.Debito || 0), 0);
            // let totalCredito = dataaaa.reduce((sum, item) => sum + (item.Credito || 0), 0);
            // log.debug("Total Debito", totalDebito);
            // log.debug("Total Credito", totalCredito);

            log.debug("Número total de registros dataaa", dataaaa.length);

            return dataaaa;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaEstimacionOportunidad() {
        try {
            let results = [];

            let opportunitySearch = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters: [
                    ['voided', 'is', 'F'],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['formulatext: {number}', 'doesnotstartwith', 'OSP'],
                    'AND',
                    ['formulatext: {createdfrom.number}', 'doesnotstartwith', 'OSP'],
                    'AND',
                    ['subsidiary', 'anyof', '2'],
                    'AND',
                    ['type', 'anyof', 'Estimate', 'Opprtnty'],
                    'AND',
                    ['status', 'anyof', 'Estimate:A', 'Estimate:X', 'Estimate:B'],
                ],
                columns: [
                    search.createColumn({ name: "location", label: "Ubicación" }),
                    search.createColumn({ name: "custentity_ts_grupo_comercial", join: "salesRep", label: "Grupo Comercial" }),
                    search.createColumn({ name: "type", label: "Tipo" }),
                    search.createColumn({ name: "salesrep", label: "Representante de ventas" }),
                    search.createColumn({ name: "trandate", label: "Fecha" }),
                    search.createColumn({ name: "custbody_ht_os_ejecutiva_backoffice", label: "HT Ejecutiva de Gestión" }),
                    search.createColumn({ name: "altname", join: "customerMain", label: "Nombre" }),
                    search.createColumn({ name: "invoicenum", label: "Numero de Documento" }),
                    search.createColumn({ name: "statusref", label: "Estado" }),
                    search.createColumn({ name: "entitystatus", label: "Estado de estimación/oportunidad" }),
                    search.createColumn({ name: "formulanumeric", formula: "ROUND({today} - {trandate}, 0)", label: "N. Dias de atraso" }),
                    search.createColumn({ name: "netamountnotax", label: "VALOR SIN IVA" }),
                    search.createColumn({ name: "amount", label: "Valor con IVA" })
                ]
            });

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = opportunitySearch.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda", totalRecords);

            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                searchResult.pageRanges.forEach(function (pageRange) {
                    if (pageRange.index === 0) {
                        let myPage = searchResult.fetch({ index: pageRange.index });

                        myPage.data.forEach(function (result) {
                            results.push({
                                Ubicacion: result.getText("location"),
                                Grupo_Comercial: result.getText({ name: "custentity_ts_grupo_comercial", join: "salesRep" }),
                                Tipo: result.getText("type"),
                                Representante_de_ventas: result.getText("salesrep"),
                                Fecha: result.getValue("trandate"),
                                HT_Ejecutiva_de_Gestion: result.getText("custbody_ht_os_ejecutiva_backoffice"),
                                Nombre: result.getValue({ name: "altname", join: "customerMain" }),
                                Numero_de_Documento: result.getValue("invoicenum"),
                                Estado: result.getText("statusref"),
                                Estado_de_estimacion_oportunidad: result.getText("entitystatus"),
                                N_Dias_de_atraso: result.getValue("formulanumeric"),
                                VALOR_SIN_IVA: result.getValue("netamountnotax"),
                                Valor_con_IVA: result.getValue("amount")
                            });
                        });
                    }
                });
            }

            return results;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaClienteCreacion(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let clienteBusqueda = search.create({
                type: "customer",
                filters:
                    [
                        ["datecreated", "within", fecha_ini, fecha_fin],
                    ],
                columns: [
                    search.createColumn({
                        name: "internalid",
                        summary: "GROUP",
                        label: "ID"
                    }),
                    search.createColumn({
                        name: "address",
                        summary: "GROUP",
                        label: "Dirección"
                    }),
                    search.createColumn({
                        name: "altname",
                        summary: "GROUP",
                        label: "Nombre"
                    }),
                    search.createColumn({
                        name: "email",
                        summary: "GROUP",
                        label: "Correo electrónico"
                    }),
                    search.createColumn({
                        name: "phone",
                        summary: "GROUP",
                        label: "Teléfono"
                    }),
                    search.createColumn({
                        name: "vatregnumber",
                        summary: "GROUP",
                        label: "Número de impuesto"
                    }),
                    search.createColumn({
                        name: "category",
                        summary: "GROUP",
                        label: "Categoría"
                    }),
                    search.createColumn({
                        name: "salesrep",
                        summary: "GROUP",
                        label: "Representante de ventas"
                    }),
                    search.createColumn({
                        name: "custentity_ht_cl_oficinacliente",
                        summary: "GROUP",
                        label: "HT Oficina cliente"
                    }),
                    search.createColumn({
                        name: "datecreated",
                        summary: "GROUP",
                        label: "Fecha de creación"
                    })
                ]
            });

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = clienteBusqueda.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda", totalRecords);

            let dataaaa = []

            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados

                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {

                    dataaaa.push({
                        ID_CLIENTE: result.getValue({ name: "internalid", summary: "GROUP" }) || 0,
                        DIRECCCION: result.getValue({ name: "address", summary: "GROUP" })
                            ? result.getValue({ name: "address", summary: "GROUP" })
                                .replace(/\n+/g, " ") // Reemplaza saltos de línea con un espacio
                                .replace(/\s{2,}/g, " ") // Reemplaza múltiples espacios con un solo espacio
                                .replace(/,/g, "") // Elimina las comas
                                .trim() // Elimina espacios al inicio y al final
                            : "",
                        NOMBRES: result.getValue({ name: "altname", summary: "GROUP" })
                            ? result.getValue({ name: "altname", summary: "GROUP" }).replace(/,/g, ' ')
                            : "",
                        CORREO: result.getValue({ name: "email", summary: "GROUP" }) || "",
                        TELEFONO: result.getValue({ name: "phone", summary: "GROUP" }) || "",
                        CEDULA: result.getValue({ name: "vatregnumber", summary: "GROUP" }) || "",
                        TIPO_CLIENTE: result.getValue({ name: "category", summary: "GROUP" }) || "",

                        TIPO_CLIENTE_TEXT: result.getText({ name: "category", summary: "GROUP" }) === "- None -"
                            ? ""
                            : result.getText({ name: "category", summary: "GROUP" }) || "",

                        EJECUTIVA: result.getValue({ name: "salesrep", summary: "GROUP" }) || "",

                        EJECUTIVA_TEXT: result.getText({ name: "salesrep", summary: "GROUP" }) === "- None -"
                            ? ""
                            : result.getText({ name: "salesrep", summary: "GROUP" }) || "",

                        SUCURSAL: result.getValue({ name: "custentity_ht_cl_oficinacliente", summary: "GROUP" }) || "",
                        SUCURSAL_TEXT: result.getText({ name: "custentity_ht_cl_oficinacliente", summary: "GROUP" }) === "- None -"
                            ? ""
                            : result.getText({ name: "custentity_ht_cl_oficinacliente", summary: "GROUP" }) || "",

                        FECHA_CREACION: result.getValue({ name: "datecreated", summary: "GROUP" }) || "",
                    });
                });

                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));

                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar

                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados

                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {

                        dataaaa.push({
                            ID_CLIENTE: result.getValue({ name: "internalid", summary: "GROUP" }) || 0,
                            DIRECCCION: result.getValue({ name: "address", summary: "GROUP" })
                                ? result.getValue({ name: "address", summary: "GROUP" })
                                    .replace(/\n+/g, " ") // Reemplaza saltos de línea con un espacio
                                    .replace(/\s{2,}/g, " ") // Reemplaza múltiples espacios con un solo espacio
                                    .replace(/,/g, "") // Elimina las comas
                                    .trim() // Elimina espacios al inicio y al final
                                : "",
                            NOMBRES: result.getValue({ name: "altname", summary: "GROUP" })
                                ? result.getValue({ name: "altname", summary: "GROUP" }).replace(/,/g, ' ')
                                : "",
                            CORREO: result.getValue({ name: "email", summary: "GROUP" }) || "",
                            TELEFONO: result.getValue({ name: "phone", summary: "GROUP" }) || "",
                            CEDULA: result.getValue({ name: "vatregnumber", summary: "GROUP" }) || "",
                            TIPO_CLIENTE: result.getValue({ name: "category", summary: "GROUP" }) || "",

                            TIPO_CLIENTE_TEXT: result.getText({ name: "category", summary: "GROUP" }) === "- None -"
                                ? ""
                                : result.getText({ name: "category", summary: "GROUP" }) || "",

                            EJECUTIVA: result.getValue({ name: "salesrep", summary: "GROUP" }) || "",

                            EJECUTIVA_TEXT: result.getText({ name: "salesrep", summary: "GROUP" }) === "- None -"
                                ? ""
                                : result.getText({ name: "salesrep", summary: "GROUP" }) || "",

                            SUCURSAL: result.getValue({ name: "custentity_ht_cl_oficinacliente", summary: "GROUP" }) || "",
                            SUCURSAL_TEXT: result.getText({ name: "custentity_ht_cl_oficinacliente", summary: "GROUP" }) === "- None -"
                                ? ""
                                : result.getText({ name: "custentity_ht_cl_oficinacliente", summary: "GROUP" }) || "",

                            FECHA_CREACION: result.getValue({ name: "datecreated", summary: "GROUP" }) || "",
                        });

                    });

                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            log.debug("Número total de registros", dataaaa.length);

            return dataaaa;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaCobro(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let cobroBusqueda = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["mainline", "is", "T"],
                        "AND",
                        ["amountremaining", "greaterthan", "1.00"],
                        "AND",
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["location", "anyof", "5", "204"],
                        "AND",
                        ["subsidiary", "anyof", "2"],
                        "AND",
                        ["trandate", "within", fecha_ini, fecha_fin],
                        "AND",
                        ["custcol_2663_companyname", "startswith", ""],
                        "AND",
                        ["salesrep", "anyof", "2456", "2461", "2621", "2608", "2422", "2436", "2641", "27360", "2536", "2410", "2477", "2396"],
                        "AND",
                        ["daysoverdue", "greaterthanorequalto", "1"]
                    ],
                columns: [
                    search.createColumn({
                        name: "vatregnumber",
                        join: "customerMain",
                        label: "IDENTIFICACION"
                    }),
                    search.createColumn({
                        name: "altname",
                        join: "customerMain",
                        label: "NOMBRE"
                    }),
                    search.createColumn({ name: "trandate", label: "FECHA INICIO" }),
                    search.createColumn({ name: "duedate", label: "FECHA VENCIMIENTO" }),
                    search.createColumn({
                        name: "formulanumeric",
                        formula: "ROUND(TO_NUMBER({today} - {duedate})-1, 0)",
                        label: "DIAS VENCIDOS"
                    }),
                    search.createColumn({ name: "tranid", label: "NUMERO FACTURA" }),
                    search.createColumn({ name: "salesrep", label: "EJECUTIVA DE VENTAS" }),
                    search.createColumn({ name: "amount", label: "MONTO" }),
                    search.createColumn({ name: "amountpaid", label: "ABONO" }),
                    search.createColumn({ name: "amountremaining", label: "SALDO" }),
                    search.createColumn({
                        name: "custrecord_ht_bien_placa",
                        join: "CUSTBODY_HT_SO_BIEN",
                        label: "PLACA"
                    }),
                    search.createColumn({ name: "email", label: "Correo electrónico" })
                ]
            });

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = cobroBusqueda.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda", totalRecords);

            let dataaaa = []

            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados

                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {

                    dataaaa.push({
                        IDENTIFICACION: result.getValue({ name: "vatregnumber", join: "customerMain" }) || "",
                        NOMBRE: result.getValue({ name: "altname", join: "customerMain" }) || "",
                        FECHA_INICIO: result.getValue("trandate") || "",
                        FECHA_VENCIMIENTO: result.getValue("duedate") || "",
                        DIAS_VENCIDOS: result.getValue("formulanumeric") || "",
                        NUMERO_FACTURA: result.getValue("tranid") || "",
                        EJECUTIVA_DE_VENTAS: result.getText("salesrep") || "",
                        MONTO: result.getValue("amount") || "",
                        ABONO: result.getValue("amountpaid") || "",
                        SALDO: result.getValue("amountremaining") || "",
                        PLACA: result.getValue({ name: "custrecord_ht_bien_placa", join: "CUSTBODY_HT_SO_BIEN" }) || "",
                        CORREO: result.getValue("email") || "",
                    });
                });

                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));

                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar

                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados

                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {

                        dataaaa.push({
                            IDENTIFICACION: result.getValue({ name: "vatregnumber", join: "customerMain" }) || "",
                            NOMBRE: result.getValue({ name: "altname", join: "customerMain" }) || "",
                            FECHA_INICIO: result.getValue("trandate") || "",
                            FECHA_VENCIMIENTO: result.getValue("duedate") || "",
                            DIAS_VENCIDOS: result.getValue("formulanumeric") || "",
                            NUMERO_FACTURA: result.getValue("tranid") || "",
                            EJECUTIVA_DE_VENTAS: result.getText("salesrep") || "",
                            MONTO: result.getValue("amount") || "",
                            ABONO: result.getValue("amountpaid") || "",
                            SALDO: result.getValue("amountremaining") || "",
                            PLACA: result.getValue({ name: "custrecord_ht_bien_placa", join: "CUSTBODY_HT_SO_BIEN" }) || "",
                            CORREO: result.getValue("email") || "",

                        });

                    });

                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            log.debug("Número total de registros", dataaaa.length);

            return dataaaa;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaCobro2(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let cobroBusqueda = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["mainline", "is", "T"],
                        "AND",
                        ["amountremaining", "greaterthan", "1.00"],
                        "AND",
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["location", "anyof", "8", "9", "4"],
                        "AND",
                        ["subsidiary", "anyof", "2"],
                        "AND",
                        ["trandate", "within", ""],
                        "AND",
                        ["custcol_2663_companyname", "startswith", ""],
                        "AND",
                        ["salesrep", "anyof", "2418", "27377", "2504", "2552", "2518", "501445", "2502", "2489"],
                        "AND",
                        ["daysoverdue", "greaterthanorequalto", "1"]
                    ],
                columns: [
                    search.createColumn({
                        name: "vatregnumber",
                        join: "customerMain",
                        label: "IDENTIFICACION"
                    }),
                    search.createColumn({
                        name: "altname",
                        join: "customerMain",
                        label: "NOMBRE"
                    }),
                    search.createColumn({ name: "trandate", label: "FECHA INICIO" }),
                    search.createColumn({ name: "duedate", label: "FECHA VENCIMIENTO" }),
                    search.createColumn({
                        name: "formulanumeric",
                        formula: "ROUND(TO_NUMBER({today} - {duedate})-1, 0)",
                        label: "DIAS VENCIDOS"
                    }),
                    search.createColumn({ name: "tranid", label: "NUMERO FACTURA" }),
                    search.createColumn({ name: "salesrep", label: "EJECUTIVA DE VENTAS" }),
                    search.createColumn({ name: "amount", label: "MONTO" }),
                    search.createColumn({ name: "amountpaid", label: "ABONO" }),
                    search.createColumn({ name: "amountremaining", label: "SALDO" }),
                    search.createColumn({
                        name: "custrecord_ht_bien_placa",
                        join: "CUSTBODY_HT_SO_BIEN",
                        label: "PLACA"
                    }),
                    search.createColumn({ name: "email", label: "Correo electrónico" }),
                    search.createColumn({ name: "location", label: "Ubicación" })
                ]
            });

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = cobroBusqueda.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda", totalRecords);

            let dataaaa = []

            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados

                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {

                    dataaaa.push({
                        IDENTIFICACION: result.getValue({ name: "vatregnumber", join: "customerMain" }) || "",
                        NOMBRE: result.getValue({ name: "altname", join: "customerMain" }) || "",
                        FECHA_INICIO: result.getValue("trandate") || "",
                        FECHA_VENCIMIENTO: result.getValue("duedate") || "",
                        DIAS_VENCIDOS: result.getValue("formulanumeric") || "",
                        NUMERO_FACTURA: result.getValue("tranid") || "",
                        EJECUTIVA_DE_VENTAS: result.getText("salesrep") || "",
                        MONTO: result.getValue("amount") || "",
                        ABONO: result.getValue("amountpaid") || "",
                        SALDO: result.getValue("amountremaining") || "",
                        PLACA: result.getValue({ name: "custrecord_ht_bien_placa", join: "CUSTBODY_HT_SO_BIEN" }) || "",
                        CORREO: result.getValue("email") || "",
                        UBICACION: result.getText("location") || ""
                    });
                });

                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));

                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar

                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados

                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {

                        dataaaa.push({
                            IDENTIFICACION: result.getValue({ name: "vatregnumber", join: "customerMain" }) || "",
                            NOMBRE: result.getValue({ name: "altname", join: "customerMain" }) || "",
                            FECHA_INICIO: result.getValue("trandate") || "",
                            FECHA_VENCIMIENTO: result.getValue("duedate") || "",
                            DIAS_VENCIDOS: result.getValue("formulanumeric") || "",
                            NUMERO_FACTURA: result.getValue("tranid") || "",
                            EJECUTIVA_DE_VENTAS: result.getText("salesrep") || "",
                            MONTO: result.getValue("amount") || "",
                            ABONO: result.getValue("amountpaid") || "",
                            SALDO: result.getValue("amountremaining") || "",
                            PLACA: result.getValue({ name: "custrecord_ht_bien_placa", join: "CUSTBODY_HT_SO_BIEN" }) || "",
                            CORREO: result.getValue("email") || "",
                            UBICACION: result.getText("location") || ""

                        });

                    });

                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            log.debug("Número total de registros", dataaaa.length);

            return dataaaa;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaCobro3(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let cobroBusqueda = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        // ["mainline", "is", "T"],
                        // "AND",
                        // ["amountremaining", "greaterthan", "1.00"],
                        // "AND",
                        // ["type", "anyof", "CustInvc"],
                        // "AND",
                        // ["location", "anyof", "8", "9", "4"],
                        // "AND",
                        // ["subsidiary", "anyof", "2"],
                        // "AND",
                        // ["trandate", "within", ""],
                        // "AND",
                        // ["custcol_2663_companyname", "startswith", ""],
                        // "AND",
                        // ["salesrep", "anyof", "2418", "27377", "2504", "2552", "2518", "501445", "2502", "2489"],
                        // "AND",
                        // ["daysoverdue", "greaterthanorequalto", "1"]

                        // !Antes
                        // ["mainline", "is", "T"],
                        // "AND",
                        // ["amountremaining", "greaterthan", "1.00"],
                        // "AND",
                        // ["type", "anyof", "CustInvc"],
                        // "AND",
                        // ["subsidiary", "anyof", "2"],
                        // "AND",
                        // ["trandate", "within", ""],
                        // "AND",
                        // ["custcol_2663_companyname", "startswith", ""],
                        // "AND",
                        // ["daysoverdue", "greaterthanorequalto", "1"],
                        // "AND",
                        // ["salesrep.custentity_ts_grupo_comercial", "anyof", "2"],
                        // "AND",
                        // ["salesrep", "noneof", "2505", "2396"],
                        // "AND",
                        // ["terms", "noneof", "48"]

                        // !20/08/2026
                        ["mainline", "is", "T"],
                        "AND",
                        ["amountremaining", "greaterthan", "1.00"],
                        "AND",
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["subsidiary", "anyof", "2"],
                        "AND",
                        ["trandate", "within", ""],
                        "AND",
                        ["custcol_2663_companyname", "startswith", ""],
                        "AND",
                        ["daysoverdue", "greaterthanorequalto", "1"],
                        "AND",
                        ["salesrep.custentity_ts_grupo_comercial", "anyof", "2", "1"],
                        "AND",
                        // ["salesrep", "noneof", "2396", "2505", "468331", "671314", "2411", "2430", "2441", "2484", "2555"],
                        ["salesrep","noneof","2411","468331","2555","2505","27371","2396","671314","2430","2570","2484","2441","2500"], 
                        "AND",
                        ["terms", "noneof", "48"],
                        "AND",
                        ["location", "noneof", "3", "6", "10", "103", "420"]

                    ],
                columns: [
                    search.createColumn({ name: "location", label: "Ubicación" }),
                    search.createColumn({
                        name: "custentity_ts_grupo_comercial",
                        join: "salesRep",
                        label: "GRUPO COMERCIAL"
                    }),
                    search.createColumn({
                        name: "vatregnumber",
                        join: "customerMain",
                        label: "IDENTIFICACION"
                    }),
                    search.createColumn({
                        name: "altname",
                        join: "customerMain",
                        label: "NOMBRE"
                    }),
                    search.createColumn({ name: "trandate", label: "FECHA INICIO" }),
                    search.createColumn({ name: "duedate", label: "FECHA VENCIMIENTO" }),
                    search.createColumn({
                        name: "formulanumeric",
                        formula: "ROUND(TO_NUMBER({today} - {duedate})-1, 0)",
                        label: "DIAS VENCIDOS"
                    }),
                    search.createColumn({ name: "tranid", label: "NUMERO FACTURA" }),
                    search.createColumn({ name: "salesrep", label: "EJECUTIVA DE VENTAS" }),
                    search.createColumn({ name: "amount", label: "MONTO" }),
                    search.createColumn({ name: "amountpaid", label: "ABONO" }),
                    search.createColumn({ name: "amountremaining", label: "SALDO" }),
                    search.createColumn({
                        name: "custrecord_ht_bien_placa",
                        join: "CUSTBODY_HT_SO_BIEN",
                        label: "PLACA"
                    }),
                    search.createColumn({ name: "email", label: "Correo electrónico" }),
                    // search.createColumn({name: "terms", label: "Términos"})
                ]
            });

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = cobroBusqueda.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda", totalRecords);

            let dataaaa = []

            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados

                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {

                    dataaaa.push({
                        ID_UBICACION: result.getValue("location") || "",
                        UBICACION: result.getText("location") || "",
                        ID_GRUPO_COMERCIAL: result.getValue({ name: "custentity_ts_grupo_comercial", join: "salesRep" }) || "",
                        GRUPO_COMERCIAL: result.getText({ name: "custentity_ts_grupo_comercial", join: "salesRep" }) || "",
                        IDENTIFICACION: (result.getValue({ name: "vatregnumber", join: "customerMain" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                        NOMBRE: result.getValue({ name: "altname", join: "customerMain" }) || "",
                        FECHA_INICIO: result.getValue("trandate") || "",
                        FECHA_VENCIMIENTO: result.getValue("duedate") || "",
                        DIAS_VENCIDOS: result.getValue("formulanumeric") || "",
                        NUMERO_FACTURA: result.getValue("tranid") || "",
                        ID_EJECUTIVA_DE_VENTAS: result.getValue("salesrep") || "",
                        EJECUTIVA_DE_VENTAS: (result.getText("salesrep") || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                        MONTO: result.getValue("amount") || "",
                        ABONO: result.getValue("amountpaid") || "",
                        SALDO: result.getValue("amountremaining") || "",
                        PLACA: result.getValue({ name: "custrecord_ht_bien_placa", join: "CUSTBODY_HT_SO_BIEN" }) || "",
                        CORREO: result.getValue("email") || ""
                    });
                });

                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));

                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar

                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados

                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {

                        dataaaa.push({
                            ID_UBICACION: result.getValue("location") || "",
                            UBICACION: result.getText("location") || "",
                            ID_GRUPO_COMERCIAL: result.getValue({ name: "custentity_ts_grupo_comercial", join: "salesRep" }) || "",
                            GRUPO_COMERCIAL: result.getText({ name: "custentity_ts_grupo_comercial", join: "salesRep" }) || "",
                            IDENTIFICACION: (result.getValue({ name: "vatregnumber", join: "customerMain" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                            NOMBRE: result.getValue({ name: "altname", join: "customerMain" }) || "",
                            FECHA_INICIO: result.getValue("trandate") || "",
                            FECHA_VENCIMIENTO: result.getValue("duedate") || "",
                            DIAS_VENCIDOS: result.getValue("formulanumeric") || "",
                            NUMERO_FACTURA: result.getValue("tranid") || "",
                            ID_EJECUTIVA_DE_VENTAS: result.getValue("salesrep") || "",
                            EJECUTIVA_DE_VENTAS: (result.getText("salesrep") || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                            MONTO: result.getValue("amount") || "",
                            ABONO: result.getValue("amountpaid") || "",
                            SALDO: result.getValue("amountremaining") || "",
                            PLACA: result.getValue({ name: "custrecord_ht_bien_placa", join: "CUSTBODY_HT_SO_BIEN" }) || "",
                            CORREO: result.getValue("email") || ""
                        });

                    });

                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            log.debug("Número total de registros", dataaaa.length);

            return dataaaa;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaBIENVENIDA(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let cobroBusqueda = search.create({
                type: "customrecord_ht_co_cobertura",
                // settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["custrecord_ht_co_estado", "noneof", "@NONE@"],
                        "AND",
                        ["custrecord_ht_co_familia_prod", "noneof", "1449", "1452", "1454", "1455", "2343", "443", "1448", "446", "1602", "1606", "1613", "451", "1688", "1949"],
                        "AND",
                        ["custrecord_ht_co_familia_prod", "noneof", "522", "746", "926", "1565", "1567", "1562", "449", "1673", "1675", "1680", "1704", "1729", "1730", "1742", "1733", "2305", "2313", "2323", "2354", "2365", "2460", "2494", "512"],
                        "AND",
                        ["lastmodifiedby", "noneof", "21", "4", "13", "3", "510"],
                        "AND",
                        ["custrecord_ht_co_propietario.category", "anyof", "1", "3", "2"],
                        "AND",
                        ["custrecord_ht_co_propietario", "noneof", "@CURRENT@", "402924", "159967"],
                        "AND",
                        ["created", "after", "01/12/2024 23:59"],
                        "AND",
                        ["custrecord_ht_co_estado_cobertura", "noneof", "2", "3", "4"],
                        "AND",
                        ["custrecord_ht_co_propietario.subsidiary", "anyof", "2"],
                        "AND",
                        ["custrecord_ht_co_coberturainicial", "within", "thisfiscalyear"],
                        "AND",
                        ["formulatext: CASE      WHEN {custrecord_ht_co_propietario.salesrep} IN (       'E-1093', 'E-1386', 'E-1559', 'E-1618', 'E-2392', 'E-2400', 'E-2410', 'E-2419',       'E-2470', 'E-2471', 'E-2513', 'E-2572', 'E-2635', 'E-2665', 'E-2692', 'E-2729',       'E-2775', 'E-460', 'E-2546', 'E-2573', 'E-2618', 'E-2623', 'E-2637', 'E-2725',       'E-2727', 'E-2765', 'E-1165', 'E-1594', 'E-1766', 'E-2019', 'E-2046', 'E-2123',       'E-2141', 'E-2180', 'E-2249', 'E-2336', 'E-589', 'E-599', 'E-8', 'E-920', 'E-849',       'E-00000439', 'E-00000292', 'E-00000303', 'E-00000309',       'E-10721485', 'E-EVICES',       'E-10721474', 'E-10721588', 'E-10721590', 'E-10721602', 'E-10721613',       'E-10721603', 'E-10721612'  ) THEN 'No mostrar'  ELSE 'mostrar'END", "is", "mostrar"],
                        "AND",
                        ["formulatext: CASE      WHEN {custrecord_ht_co_familia_prod} IN (       'AB - AMBACAR BY HUNTER',       'AN - ANDOR BY HUNTER',       'BZ - HMONITOREO BRONZE',       'CH - H.MONITOREO AMI',       'CI - MARESA CINASCAR',       'CM - HUNTER MONITOREO',       'GK - GALMACK SATELITAL BY HUNTER',       'HT - HUNTER GPS HMT',       'HU - HUNTER RASTREO',       'MB - H.M. MOTO BASICO',       'MF - DUOTECH HMONITOREO',       'MG - GALARMOVIL GPS BY HUNTER',       'MJ - DUOTECH RASTREO',       'SZ - SUZUKI TRACKING BY HUNTER',       'VH - VEHICENTRO BY HUNTER'  )  THEN 'Mostrar'  ELSE 'Ocultar'END", "is", "Mostrar"],
                        "AND",
                        ["custrecord_ht_co_producto", "noneof", "42935"],
                        "AND",
                        ["custrecord_ht_co_propietario", "noneof", "342453"],
                        "AND",
                        ["created", "within", fecha_ini, fecha_fin],
                    ],
                columns: [
                    search.createColumn({
                        name: "entityid",
                        join: "CUSTRECORD_HT_CO_PROPIETARIO",
                        label: "ID"
                    }),
                    search.createColumn({ name: "custrecord_ht_co_coberturainicial", label: "Fecha de inicio " }),
                    search.createColumn({ name: "custrecord_ht_co_propietario", label: "HT CO Propietario" }),
                    search.createColumn({
                        name: "email",
                        join: "CUSTRECORD_HT_CO_PROPIETARIO",
                        label: "Correo electrónico"
                    }),
                    search.createColumn({
                        name: "phone",
                        join: "CUSTRECORD_HT_CO_PROPIETARIO",
                        label: "Teléfono"
                    }),
                    search.createColumn({
                        name: "salesrep",
                        join: "CUSTRECORD_HT_CO_PROPIETARIO",
                        label: "Representante de ventas"
                    }),
                    search.createColumn({ name: "custrecord_ht_co_bien", label: "HT CO Bien" }),
                    search.createColumn({
                        name: "custrecord_ht_bien_placa",
                        join: "CUSTRECORD_HT_CO_BIEN",
                        label: "HT BN Placa"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "{custrecord_ht_co_bien.custrecord_ht_bien_marca}",
                        label: "MARCA"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "{custrecord_ht_co_bien.custrecord_ht_bien_modelo}",
                        label: "MODELO"
                    }),
                    search.createColumn({
                        name: "custrecord_ht_bien_ano",
                        join: "CUSTRECORD_HT_CO_BIEN",
                        label: "HT BN Año"
                    }),
                    search.createColumn({
                        name: "custrecord_ht_bien_motor",
                        join: "CUSTRECORD_HT_CO_BIEN",
                        label: "HT BN Motor"
                    }),
                    search.createColumn({
                        name: "custrecord_ht_bien_chasis",
                        join: "CUSTRECORD_HT_CO_BIEN",
                        label: "HT BN Chasis"
                    }),
                    search.createColumn({ name: "custrecord_ht_co_producto", label: "HT CO Producto" }),
                    search.createColumn({
                        name: "displayname",
                        join: "CUSTRECORD_HT_CO_PRODUCTO",
                        label: "Nombre para mostrar"
                    }),
                    search.createColumn({ name: "custrecord_ht_co_coberturafinal", label: "HT CO Cobertura final" }),
                    search.createColumn({ name: "custrecord_ht_co_estado_cobertura", label: "HT CO Estado Cobertura" }),
                    search.createColumn({ name: "custrecord_ht_co_estado", label: "Estado" }),
                    search.createColumn({ name: "custrecord_ht_co_familia_prod", label: "Familia de Producto" }),
                    search.createColumn({
                        name: "custrecord_ht_bien_consesionarios",
                        join: "CUSTRECORD_HT_CO_BIEN",
                        label: "HT BN Concesionarios"
                    }),
                    search.createColumn({
                        name: "custrecord_ht_bien_companiaseguros",
                        join: "CUSTRECORD_HT_CO_BIEN",
                        label: "HT BN Compañía de seguros"
                    }),
                    search.createColumn({
                        name: "custrecord_ht_bien_conveniovehiculo",
                        join: "CUSTRECORD_HT_CO_BIEN",
                        label: "HT BN Convenio vehículo"
                    }),
                    search.createColumn({
                        name: "custrecord_ht_bien_financiadovehiculo",
                        join: "CUSTRECORD_HT_CO_BIEN",
                        label: "HT BN Financiado por"
                    }),
                    search.createColumn({
                        name: "custentity_ht_cl_oficinacliente",
                        join: "CUSTRECORD_HT_CO_PROPIETARIO",
                        label: "HT Oficina cliente"
                    }),
                    search.createColumn({
                        name: "custrecord_ht_bien_marca",
                        join: "CUSTRECORD_HT_CO_BIEN",
                        label: "MARCA2"
                    }),
                    search.createColumn({
                        name: "custrecord_ht_bien_modelo",
                        join: "CUSTRECORD_HT_CO_BIEN",
                        label: "MODELO2"
                    }),
                    search.createColumn({ name: "created", label: "Fecha de creación" }),
                    search.createColumn({ name: "custrecord_ht_co_coberturainicial", label: "COB INICIAL" }),
                    search.createColumn({ name: "custrecord_ht_co_coberturafinal", label: "COB FINAL" })
                ]
            });

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = cobroBusqueda.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda", totalRecords);

            let dataaaa = []

            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados

                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {

                    dataaaa.push({
                        ID_PROPIETARIO: result.getValue({ name: "entityid", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || 0,
                        FECHA_INICIO: result.getValue("custrecord_ht_co_coberturainicial") || "",
                        HT_CO_Propietario: result.getValue("custrecord_ht_co_propietario") || "",
                        CORREO: result.getValue({ name: "email", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                        TELEFONO: result.getValue({ name: "phone", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                        EJECUTIVA: result.getValue({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                        EJECUTIVA_TEXT: result.getText({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) === "- None -"
                            ? ""
                            // : (result.getText({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                            : result.getText({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                        HT_CO_Bien: result.getValue("custrecord_ht_co_bien") || "",
                        PLACA: result.getValue({ name: "custrecord_ht_bien_placa", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        MARCA: result.getValue({ name: "custrecord_ht_bien_marca", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        MARCATEXT: result.getText({ name: "custrecord_ht_bien_marca", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                            ? ""
                            : (result.getText({ name: "custrecord_ht_bien_marca", join: "CUSTRECORD_HT_CO_BIEN" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                        MODELO: result.getValue({ name: "custrecord_ht_bien_modelo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        MODELOTEXT: result.getText({ name: "custrecord_ht_bien_modelo", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                            ? ""
                            : (result.getText({ name: "custrecord_ht_bien_modelo", join: "CUSTRECORD_HT_CO_BIEN" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                        ANIO_VEHICULO: result.getValue({ name: "custrecord_ht_bien_ano", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        MOTOR: result.getValue({ name: "custrecord_ht_bien_motor", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        CHASIS: result.getValue({ name: "custrecord_ht_bien_chasis", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        HT_CO_Producto: result.getValue("custrecord_ht_co_producto") || "",
                        HT_CO_Producto_Text: result.getText("custrecord_ht_co_producto") === "- None -"
                            ? ""
                            : result.getText("custrecord_ht_co_producto") || "",
                        HT_CO_Cobertura_final: result.getValue("custrecord_ht_co_coberturafinal") || "",
                        HT_CO_Estado_Cobertura: result.getValue("custrecord_ht_co_estado_cobertura") || "",
                        HT_CO_Estado_Cobertura_Text: result.getText("custrecord_ht_co_estado_cobertura") === "- None -"
                            ? ""
                            : result.getText("custrecord_ht_co_estado_cobertura") || "",
                        HT_CO_Estado: result.getValue("custrecord_ht_co_estado") || "",
                        HT_CO_Estado_Text: result.getText("custrecord_ht_co_estado") === "- None -"
                            ? ""
                            : result.getText("custrecord_ht_co_estado") || "",
                        FAMILIA_PRODUCTO: result.getValue("custrecord_ht_co_familia_prod") || "",
                        FAMILIA_PRODUCTO_TEXT: result.getText("custrecord_ht_co_familia_prod") === "- None -"
                            ? ""
                            : result.getText("custrecord_ht_co_familia_prod") || "",
                        CONCESIONARIO: result.getValue({ name: "custrecord_ht_bien_consesionarios", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        COMPANIA_SEGUROS: result.getValue({ name: "custrecord_ht_bien_companiaseguros", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        CONVENIO_VEHICULO: result.getValue({ name: "custrecord_ht_bien_conveniovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        FINANCIADO_POR: result.getValue({ name: "custrecord_ht_bien_financiadovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        CONCESIONARIO_TEXT: result.getText({ name: "custrecord_ht_bien_consesionarios", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                            ? ""
                            : result.getText({ name: "custrecord_ht_bien_consesionarios", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        COMPANIA_SEGUROS_TEXT: result.getText({ name: "custrecord_ht_bien_companiaseguros", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                            ? ""
                            : result.getText({ name: "custrecord_ht_bien_companiaseguros", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        CONVENIO_VEHICULO_TEXT: result.getText({ name: "custrecord_ht_bien_conveniovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                            ? ""
                            : result.getText({ name: "custrecord_ht_bien_conveniovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        FINANCIADO_POR_TEXT: result.getText({ name: "custrecord_ht_bien_financiadovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                            ? ""
                            : result.getText({ name: "custrecord_ht_bien_financiadovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        OFICINA_CLIENTE: result.getValue({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                        OFICINA_CLIENTE_TEXT: result.getText({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) === "- None -"
                            ? ""
                            : result.getText({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                        // MARCA2: result.getValue({ name: "custrecord_ht_bien_marca", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        // MODELO2: result.getValue({ name: "custrecord_ht_bien_modelo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        // MARCA2_TEXT: result.getText({ name: "custrecord_ht_bien_marca", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                        //     ? ""
                        //     : (result.getText({ name: "custrecord_ht_bien_marca", join: "CUSTRECORD_HT_CO_BIEN" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                        // MODELO2_TEXT: result.getText({ name: "custrecord_ht_bien_modelo", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                        //     ? ""
                        //     : (result.getText({ name: "custrecord_ht_bien_modelo", join: "CUSTRECORD_HT_CO_BIEN" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                        // Formuala text marca es columna9
                        // FORMULA_TEXTO_MARCA: result.getValue({ name: "formulatext", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        // Formuala text modelo es columna10
                        // FORMULA_TEXTO_MODELO: result.getValue({ name: "formulatext", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                        // FEcha de creación
                        FECHA_CREACION: result.getValue("created") || "",
                        // Cob inicial
                        COB_INICIAL: result.getValue("custrecord_ht_co_coberturainicial") || "",
                        // Cob final
                        COB_FINAL: result.getValue("custrecord_ht_co_coberturafinal") || ""

                    });
                });

                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));

                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar

                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados

                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {

                        dataaaa.push({
                            ID_PROPIETARIO: result.getValue({ name: "entityid", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || 0,
                            FECHA_INICIO: result.getValue("custrecord_ht_co_coberturainicial") || "",
                            HT_CO_Propietario: result.getValue("custrecord_ht_co_propietario") || "",
                            CORREO: result.getValue({ name: "email", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                            TELEFONO: result.getValue({ name: "phone", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                            EJECUTIVA: result.getValue({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                            EJECUTIVA_TEXT: result.getText({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) === "- None -"
                                ? ""
                                // : (result.getText({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                                : result.getText({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                            HT_CO_Bien: result.getValue("custrecord_ht_co_bien") || "",
                            PLACA: result.getValue({ name: "custrecord_ht_bien_placa", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            MARCA: result.getValue({ name: "custrecord_ht_bien_marca", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            MARCATEXT: result.getText({ name: "custrecord_ht_bien_marca", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                                ? ""
                                : (result.getText({ name: "custrecord_ht_bien_marca", join: "CUSTRECORD_HT_CO_BIEN" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                            MODELO: result.getValue({ name: "custrecord_ht_bien_modelo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            MODELOTEXT: result.getText({ name: "custrecord_ht_bien_modelo", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                                ? ""
                                : (result.getText({ name: "custrecord_ht_bien_modelo", join: "CUSTRECORD_HT_CO_BIEN" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                            ANIO_VEHICULO: result.getValue({ name: "custrecord_ht_bien_ano", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            MOTOR: result.getValue({ name: "custrecord_ht_bien_motor", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            CHASIS: result.getValue({ name: "custrecord_ht_bien_chasis", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            HT_CO_Producto: result.getValue("custrecord_ht_co_producto") || "",
                            HT_CO_Producto_Text: result.getText("custrecord_ht_co_producto") === "- None -"
                                ? ""
                                : result.getText("custrecord_ht_co_producto") || "",
                            HT_CO_Cobertura_final: result.getValue("custrecord_ht_co_coberturafinal") || "",
                            HT_CO_Estado_Cobertura: result.getValue("custrecord_ht_co_estado_cobertura") || "",
                            HT_CO_Estado_Cobertura_Text: result.getText("custrecord_ht_co_estado_cobertura") === "- None -"
                                ? ""
                                : result.getText("custrecord_ht_co_estado_cobertura") || "",
                            HT_CO_Estado: result.getValue("custrecord_ht_co_estado") || "",
                            HT_CO_Estado_Text: result.getText("custrecord_ht_co_estado") === "- None -"
                                ? ""
                                : result.getText("custrecord_ht_co_estado") || "",
                            FAMILIA_PRODUCTO: result.getValue("custrecord_ht_co_familia_prod") || "",
                            FAMILIA_PRODUCTO_TEXT: result.getText("custrecord_ht_co_familia_prod") === "- None -"
                                ? ""
                                : result.getText("custrecord_ht_co_familia_prod") || "",
                            CONCESIONARIO: result.getValue({ name: "custrecord_ht_bien_consesionarios", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            COMPANIA_SEGUROS: result.getValue({ name: "custrecord_ht_bien_companiaseguros", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            CONVENIO_VEHICULO: result.getValue({ name: "custrecord_ht_bien_conveniovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            FINANCIADO_POR: result.getValue({ name: "custrecord_ht_bien_financiadovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            CONCESIONARIO_TEXT: result.getText({ name: "custrecord_ht_bien_consesionarios", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                                ? ""
                                : result.getText({ name: "custrecord_ht_bien_consesionarios", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            COMPANIA_SEGUROS_TEXT: result.getText({ name: "custrecord_ht_bien_companiaseguros", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                                ? ""
                                : result.getText({ name: "custrecord_ht_bien_companiaseguros", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            CONVENIO_VEHICULO_TEXT: result.getText({ name: "custrecord_ht_bien_conveniovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                                ? ""
                                : result.getText({ name: "custrecord_ht_bien_conveniovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            FINANCIADO_POR_TEXT: result.getText({ name: "custrecord_ht_bien_financiadovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) === "- None -"
                                ? ""
                                : result.getText({ name: "custrecord_ht_bien_financiadovehiculo", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            OFICINA_CLIENTE: result.getValue({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                            OFICINA_CLIENTE_TEXT: result.getText({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) === "- None -"
                                ? ""
                                : result.getText({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" }) || "",
                            // FORMULA_TEXTO_MARCA: result.getValue({ name: "formulatext", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            // Formuala text modelo es columna10
                            // FORMULA_TEXTO_MODELO: result.getValue({ name: "formulatext", join: "CUSTRECORD_HT_CO_BIEN" }) || "",
                            // FEcha de creación
                            FECHA_CREACION: result.getValue("created") || "",
                            // Cob inicial
                            COB_INICIAL: result.getValue("custrecord_ht_co_coberturainicial") || "",
                            // Cob final
                            COB_FINAL: result.getValue("custrecord_ht_co_coberturafinal") || ""

                        });

                    });

                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            log.debug("Número total de registros", dataaaa.length);

            return dataaaa;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaCOMUNICA(fecha_ini, fecha_fin) {

        try {
            // // Validar las fechas
            // let fechaIniValida = validarFecha(fecha_ini);
            // let fechaFinValida = validarFecha(fecha_fin);

            // if (!fechaIniValida.valido || !fechaFinValida.valido) {
            //     log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
            //     return [];
            // }

            // fecha_ini = fecha_ini.replace(/-/g, "/");
            // fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let invoiceSearch = search.create({
                type: "invoice",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters: [
                    ["mainline", "is", "T"],
                    "AND", ["amountremaining", "greaterthan", "0.00"],
                    "AND", ["type", "anyof", "CustInvc"],
                    "AND", ["subsidiary", "anyof", "2"],
                    "AND", ["trandate", "within", ""],
                    "AND", ["formulanumeric: ROUND(TO_NUMBER({duedate} - {today})-1, 0)", "equalto", "1"],
                    "AND", ["customermain.category", "anyof", "10", "8"],
                    "AND", ["location", "anyof", "@ALL@"],
                    "AND", ["custtype", "anyof", "@ALL@"],
                    "AND", ["custcol_2663_companyname", "startswith", ""]
                ],
                columns: [
                    search.createColumn({ name: "location", label: "OFICINA" }),
                    search.createColumn({ name: "custtype", label: "Categoría de cliente" }),
                    search.createColumn({ name: "vatregnumber", join: "customerMain", label: "IDENTIFICACION" }),
                    search.createColumn({ name: "altname", join: "customerMain", label: "NOMBRE" }),
                    search.createColumn({ name: "trandate", label: "FECHA INICIO" }),
                    search.createColumn({ name: "duedate", label: "FECHA VENCIMIENTO" }),
                    search.createColumn({ name: "formulanumeric", formula: "ROUND(TO_NUMBER({duedate} - {today})-1, 0)", label: "DIAS: VENCIDOS (-) POR VENCER (+)" }),
                    search.createColumn({ name: "formulatext", formula: "CASE   WHEN ({duedate} >= {today})  THEN 'POR VENCER' ELSE 'VENCIDO' END", label: "ESTADO VCTO" }),
                    search.createColumn({ name: "tranid", label: "Número de documento" }),
                    search.createColumn({ name: "salesrep", label: "Representante de ventas" }),
                    search.createColumn({ name: "amount", label: "MONTO" }),
                    search.createColumn({ name: "amountpaid", label: "ABONO" }),
                    search.createColumn({ name: "amountremaining", label: "SALDO" }),
                    search.createColumn({ name: "email", label: "Correo electrónico" })
                ]
            });


            // let results = []; // Array donde almacenar los resultados completos

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = invoiceSearch.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda", totalRecords);

            let dataaaa = []

            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados

                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {

                    dataaaa.push({
                        oficina: result.getValue({ name: "location" }) || "",
                        oficinaText: result.getText({ name: "location" }) === "- None -" ? "" : (result.getText({ name: "location" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                        categoriaCliente: result.getValue({ name: "custtype" }) || "",
                        categoriaClienteText: result.getText({ name: "custtype" }) === "- None -" ? "" : (result.getText({ name: "custtype" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                        identificacion: result.getValue({ name: "vatregnumber", join: "customerMain" }) || "",
                        nombre: (result.getValue({ name: "altname", join: "customerMain" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                        fechaInicio: result.getValue("trandate") || "",
                        fechaVencimiento: result.getValue("duedate") || "",
                        diasVencidosPorVencer: result.getValue({ name: "formulanumeric", formula: "ROUND(TO_NUMBER({duedate} - {today})-1, 0)" }) || "",
                        estadoVcto: result.getValue({ name: "formulatext", formula: "CASE   WHEN ({duedate} >= {today})  THEN 'POR VENCER' ELSE 'VENCIDO' END" }) || "",
                        numeroDocumento: result.getValue("tranid") || "",
                        idrepresentanteVentas: result.getValue("salesrep") || "",
                        representanteVentas: (result.getText("salesrep") || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                        monto: parseFloat(result.getValue("amount")) || 0,
                        abono: parseFloat(result.getValue("amountpaid")) || 0,
                        saldo: parseFloat(result.getValue("amountremaining")) || 0,
                        email: result.getValue("email") || ""
                    })
                });

                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));

                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar

                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados

                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {

                        dataaaa.push({
                            oficina: result.getValue({ name: "location" }) || "",
                            oficinaText: result.getText({ name: "location" }) === "- None -" ? "" : (result.getText({ name: "location" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                            categoriaCliente: result.getValue({ name: "custtype" }) || "",
                            categoriaClienteText: result.getText({ name: "custtype" }) === "- None -" ? "" : (result.getText({ name: "custtype" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                            identificacion: result.getValue({ name: "vatregnumber", join: "customerMain" }) || "",
                            nombre: (result.getValue({ name: "altname", join: "customerMain" }) || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                            fechaInicio: result.getValue("trandate") || "",
                            fechaVencimiento: result.getValue("duedate") || "",
                            diasVencidosPorVencer: result.getValue({ name: "formulanumeric", formula: "ROUND(TO_NUMBER({duedate} - {today})-1, 0)" }) || "",
                            estadoVcto: result.getValue({ name: "formulatext", formula: "CASE   WHEN ({duedate} >= {today})  THEN 'POR VENCER' ELSE 'VENCIDO' END" }) || "",
                            numeroDocumento: result.getValue("tranid") || "",
                            idrepresentanteVentas: result.getValue("salesrep") || "",
                            representanteVentas: (result.getText("salesrep") || "").replace(/[^a-zA-Z0-9\s]/g, ""),
                            monto: parseFloat(result.getValue("amount")) || 0,
                            abono: parseFloat(result.getValue("amountpaid")) || 0,
                            saldo: parseFloat(result.getValue("amountremaining")) || 0,
                            email: result.getValue("email") || ""
                        })

                    });

                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            log.debug("Número total de registros dataaa", dataaaa.length);

            return dataaaa;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaLibro(requestBody) {
        try {
            var page = parseInt(requestBody.page || 1);
            var pageSize = parseInt(requestBody.pageSize || 1000);
            var sql = `
                    SELECT 
                        NVL(BUILTIN.DF(item.itemtype), 'VACIO') AS itemtype,
                        item.id,
                        NVL(BUILTIN.DF(item.custitem_ht_it_tipo_producto), 'VACIO') AS custitem_ht_it_tipo_producto,
                        NVL(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(item.displayname, ',', ''), ':', ''), '''', ''), '"', ''), '{', ''), '}', ''), 'VACIO') AS displayname,
                        NVL(item.itemid, 'VACIO') AS itemid,
                        NVL(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(item.description, ',', ''), ':', ''), '''', ''), '"', ''), '{', ''), '}', ''), 'VACIO') AS description,
                        NVL(BUILTIN.DF(ItemInventoryBalance.location), 'VACIO') AS location,
                        NVL(TO_CHAR(ItemInventoryBalance.binnumber), 'VACIO') AS binnumber,
                        NVL(bin.binnumber, 'VACIO') AS bin_name,
                        NVL(ItemInventoryBalance.quantityonhand, 0) AS quantityonhand,
                        NVL(item.averagecost, 0) AS averagecost,
                        NVL((ItemInventoryBalance.quantityonhand * item.averagecost), 0) AS total_value,
                        NVL(BUILTIN.DF(item.custitem_ht_ai_tipocomponente), 'VACIO') AS custitem_ht_ai_tipocomponente,
                        NVL(item.custitem_ht_at_tipotransaccion, 'VACIO') AS custitem_ht_at_tipotransaccion,
                        NVL(item.subtype, 'VACIO') AS subtype,
                        NVL(classification.name, 'VACIO') AS costcategory,
                        NVL(item.custitem_ht_at_dispositivo, 'VACIO') AS custitem_ht_at_dispositivo,
                        NVL(item.fullname, 'VACIO') AS fullname,
                        NVL(item.custitem_ht_at_tipoagrupacionprod, 'VACIO') AS custitem_ht_at_tipoagrupacionprod,
                        NVL(item.custitem_ht_at_tipoproducto, 'VACIO') AS custitem_ht_at_tipoproducto,
                        NVL(BUILTIN.DF(item.cseg6), 'VACIO') AS cseg6,
                        NVL(BUILTIN.DF(item.custitem_ht_it_trabajo_tecnico), 'VACIO') AS custitem_ht_it_trabajo_tecnico,
                        NVL(REPLACE(TO_CHAR(BUILTIN.DF(ItemInventoryBalance.inventorynumber)), '''',''), 'VACIO') AS inventorynumber,
                        NVL(TO_CHAR(item.createddate, 'YYYY-MM-DD'), 'VACIO') AS createddate
                    FROM 
                        item
                        INNER JOIN 
                            itemSubsidiaryMap 
                            ON item.id = itemSubsidiaryMap.item
                        INNER JOIN 
                            Subsidiary 
                            ON itemSubsidiaryMap.subsidiary = Subsidiary.id
                        LEFT OUTER JOIN 
                            CUSTOMRECORD_NCFAR_ASSET 
                            ON item.id = CUSTOMRECORD_NCFAR_ASSET.custrecord_assetdisposalitem
                        LEFT OUTER JOIN 
                            ItemInventoryBalance 
                            ON item.id = ItemInventoryBalance.item
                        LEFT OUTER JOIN 
                            bin 
                            ON ItemInventoryBalance.binnumber = bin.id
                     --   LEFT OUTER JOIN 
                     --       Location 
                     --       ON ItemInventoryBalance.location = Location.id
                        LEFT OUTER JOIN 
                            classification 
                            ON item.class = classification.id
                    --WHERE 
                    --    NVL(item.isinactive, 'F') = 'F'
                    --    AND Subsidiary.id = '2'
                    --    AND ItemInventoryBalance.quantityonhand IS NOT NULL
                    --    AND item.itemtype IN ('InvtPart', 'Assembly')
                    WHERE 
                      item."ID" = ItemInventoryBalance.item
                      AND (
                        (
                          NVL(item.isinactive, 'F') = 'F'
                          AND BUILTIN.MNFILTER(
                            item.subsidiary, 'MN_INCLUDE', '', 
                            'TRUE', '2'
                          ) = 'T' 
                          AND ItemInventoryBalance.quantityonhand IS NOT NULL 
                          AND item.itemtype IN ('InvtPart', 'Assembly')
                        )
                      )
                    --       AND  item.custitem_ht_it_tipo_producto = 1
                  ORDER BY item.custitem_ht_it_tipo_producto ASC, item.displayname DESC
                  --ORDER BY item.createddate ASC
                `;

            var pagedData = query.runSuiteQLPaged({
                query: sql,
                pageSize: pageSize
            });

            var totalRecords = pagedData.count;
            var totalPages = pagedData.pageRanges.length;

            if (page > totalPages && totalPages > 0) {
                page = totalPages;
            } else if (totalPages === 0) {
                return {
                    success: true,
                    data: [],
                    pagination: {
                        page: 0,
                        pageSize: pageSize,
                        totalRecords: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                };
            }

            var pageIndex = page - 1;
            var pageData = pagedData.fetch({ index: pageIndex });
            var results = [];

            // Calcular cuántos registros deberían estar en esta página
            var recordsInThisPage = pageSize;
            if (page === totalPages) {
                recordsInThisPage = totalRecords - (pageSize * (totalPages - 1));
            }

            var iterator = pageData.data.iterator();
            var count = 0;
            iterator.each(function (result) {
                if (count < recordsInThisPage) {
                    results.push(result.value.asMap());
                    count++;
                }
                return count < recordsInThisPage; // Detener iteración cuando alcancemos el límite
            });

            return {
                success: true,
                data: results,
                pagination: {
                    page: page,
                    pageSize: pageSize,
                    totalRecords: totalRecords,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };

        } catch (e) {
            return {
                success: false,
                error: e.message,
                details: e.stack
            };
        }
    }

    function ConsultaLibro2(requestBody) {
        try {
            var page = parseInt(requestBody.page || 1);
            var pageSize = parseInt(requestBody.pageSize || 1000);

            var sql = `
                    SELECT 
                        NVL(BUILTIN.DF(item.itemtype), 'VACIO') AS itemtype,
                        item.id,
                        NVL(BUILTIN.DF(item.custitem_ht_it_tipo_producto), 'VACIO') AS custitem_ht_it_tipo_producto,
                        NVL(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(item.displayname, ',', ''), ':', ''), '''', ''), '"', ''), '{', ''), '}', ''), 'VACIO') AS displayname,
                        NVL(item.itemid, 'VACIO') AS itemid,
                        NVL(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(item.description, ',', ''), ':', ''), '''', ''), '"', ''), '{', ''), '}', ''), 'VACIO') AS description,
                        'VACIO' AS location,
                        NVL(TO_CHAR(ItemInventoryBalance.binnumber), 'VACIO') AS binnumber,
                        NVL(bin.binnumber, 'VACIO') AS bin_name,
                        NVL(ItemInventoryBalance.quantityonhand, 0) AS quantityonhand,
                        NVL(item.averagecost, 0) AS averagecost,
                        NVL((ItemInventoryBalance.quantityonhand * item.averagecost), 0) AS total_value,
                        NVL(BUILTIN.DF(item.custitem_ht_ai_tipocomponente), 'VACIO') AS custitem_ht_ai_tipocomponente,
                        NVL(item.custitem_ht_at_tipotransaccion, 'VACIO') AS custitem_ht_at_tipotransaccion,
                        NVL(item.subtype, 'VACIO') AS subtype,
                        NVL(classification.name, 'VACIO') AS costcategory,
                        NVL(item.custitem_ht_at_dispositivo, 'VACIO') AS custitem_ht_at_dispositivo,
                        NVL(item.fullname, 'VACIO') AS fullname,
                        NVL(item.custitem_ht_at_tipoagrupacionprod, 'VACIO') AS custitem_ht_at_tipoagrupacionprod,
                        NVL(item.custitem_ht_at_tipoproducto, 'VACIO') AS custitem_ht_at_tipoproducto,
                        NVL(BUILTIN.DF(item.cseg6), 'VACIO') AS cseg6,
                        NVL(BUILTIN.DF(item.custitem_ht_it_trabajo_tecnico), 'VACIO') AS custitem_ht_it_trabajo_tecnico,
                        NVL(REPLACE(TO_CHAR(BUILTIN.DF(ItemInventoryBalance.inventorynumber)), '''',''), 'VACIO') AS inventorynumber,
                        NVL(TO_CHAR(item.createddate, 'YYYY-MM-DD'), 'VACIO') AS createddate
                    FROM 
                        item
                        INNER JOIN 
                            itemSubsidiaryMap 
                            ON item.id = itemSubsidiaryMap.item
                        INNER JOIN 
                            Subsidiary 
                            ON itemSubsidiaryMap.subsidiary = Subsidiary.id
                        LEFT OUTER JOIN 
                            CUSTOMRECORD_NCFAR_ASSET 
                            ON item.id = CUSTOMRECORD_NCFAR_ASSET.custrecord_assetdisposalitem
                        LEFT OUTER JOIN 
                            ItemInventoryBalance 
                            ON item.id = ItemInventoryBalance.item
                        LEFT OUTER JOIN 
                            bin 
                            ON ItemInventoryBalance.binnumber = bin.id
                        LEFT OUTER JOIN 
                            classification 
                            ON item.class = classification.id
                    WHERE 
                        NVL(item.isinactive, 'F') = 'F'
                        AND Subsidiary.id = '2'
                        AND ItemInventoryBalance.quantityonhand IS NOT NULL
                        AND item.itemtype IN ('InvtPart', 'Assembly')
                        --AND item.custitem_ht_it_tipo_producto = 14
                        AND item.id = 22059
                `;

            var pagedData = query.runSuiteQLPaged({
                query: sql,
                pageSize: pageSize
            });

            var totalRecords = pagedData.count;
            var totalPages = pagedData.pageRanges.length;

            if (page > totalPages && totalPages > 0) {
                page = totalPages;
            } else if (totalPages === 0) {
                return {
                    success: true,
                    data: [],
                    pagination: {
                        page: 0,
                        pageSize: pageSize,
                        totalRecords: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                };
            }

            var pageIndex = page - 1;
            var pageData = pagedData.fetch({ index: pageIndex });
            var results = [];

            // Calcular cuántos registros deberían estar en esta página
            var recordsInThisPage = pageSize;
            if (page === totalPages) {
                recordsInThisPage = totalRecords - (pageSize * (totalPages - 1));
            }

            var iterator = pageData.data.iterator();
            var count = 0;
            iterator.each(function (result) {
                if (count < recordsInThisPage) {
                    results.push(result.value.asMap());
                    count++;
                }
                return count < recordsInThisPage; // Detener iteración cuando alcancemos el límite
            });

            return {
                success: true,
                data: results,
                pagination: {
                    page: page,
                    pageSize: pageSize,
                    totalRecords: totalRecords,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };

        } catch (e) {
            return {
                success: false,
                error: e.message,
                details: e.stack
            };
        }
    }

    function ConsultaLibro3(requestBody) {
        try {
            var page = parseInt(requestBody.page || 1);
            var pageSize = parseInt(requestBody.pageSize || 1000);

            let fechaInicio = requestBody.fechaInicio || '01-01-2025';
            let fechaFin = requestBody.fechaFin || '31-12-2026';

            fechaInicio = formatearFechaSQL(fechaInicio);
            fechaFin = formatearFechaSQL(fechaFin);

            var sql = `
SELECT 
  "TRANSACTION".tranid AS NUMERO_ID_DOCUMENTO, 
  "TRANSACTION".trandate AS FECHA, 
  BUILTIN.DF(customrecordts_ec_series_impresion.custrecord_ts_ec_localidad_serie) AS EC_SERIE_CXC_EC_LOCALIDAD_POR_SERIE, 
  --BUILTIN.DF("TRANSACTION".entity) AS ENTIDAD, 
   REPLACE(REPLACE(REPLACE(customer.entityid, '"', ''), '\', ''), '''', '') AS ENTIDAD,
  BUILTIN.DF(customer."CATEGORY") AS "ENTIDAD_CATEGORIA", 
  --BUILTIN.DF(employee.custentity_ts_grupo_comercial) AS REP_VENTA_GRUPO_COMERCIAL, 
  NVL(BUILTIN.DF(employee.custentity_ts_grupo_comercial), 'VACIO') AS REP_VENTA_GRUPO_COMERCIAL,
  -- BUILTIN.DF(employee."LOCATION") AS "REP_VENTAS_OFICINA", 
  NVL(BUILTIN.DF(employee."LOCATION"), '0') AS RV_OFICINA,
  --transaction_0.typebaseddocumentnumber AS CREADO_DESDE, 
  NVL(transaction_0.typebaseddocumentnumber, TO_DATE('2000-01-01', 'YYYY-MM-DD')) AS CREADO_DESDE_, 
  --BUILTIN.DF("TRANSACTION".employee) AS REP_FACTURA, 
  NVL(BUILTIN.DF("TRANSACTION".employee), 'VACIO') AS REP_FACTURA,
  BUILTIN.DF(transactionline.item) AS LINEA_TRANSACCION_ARTICULO, 
  employee.firstname || ' ' || employee.lastname AS REP_FACTURA_NOMBRE, 
  item.displayname AS ARTICULO_NOMBRE_CODIGO_PARA_MOSTRAR, 
  item.description AS ARTICULO_DESCRIPCION, 
  "TRANSACTION".custbody_ec_fecha_autorizacion AS HT_FECHA_AUTORIZACION, 
  CASE WHEN "TRANSACTION".foreigntotal < 0 THEN 'Nota de crédito' 
       WHEN Instr(Upper(item.description), 'RENO') > 0 
         OR Instr(Upper(item.description), 'RENOVACION') > 0 THEN 'Renovación' 
       WHEN (((Instr(Upper(item.description), 'MANTENIMIENTO') > 0 
               OR Instr(Upper(item.description), 'CHEQUEO') > 0) 
              OR Instr(Upper(item.description), 'DESINSTALACION') > 0) 
            OR Instr(Upper(item.description), 'DESI') > 0) 
         OR Instr(Upper(item.description), 'SIMCARD') > 0 THEN 'OTROS SERVICIOS' 
       ELSE 'Venta nueva' END AS CLASS, 
  BUILTIN.DF("TRANSACTION".status) AS ESTADO, 
  transactionline.netamount * -1 AS VALOR, 
--  customrecord_ht_record_bienes.custrecord_ht_bien_placa AS BIEN_HT_BN_PLACA, 
  NVL(CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_placa, 'VACIO') AS BN_PLACA,
  BUILTIN.DF(transactionline."LOCATION") AS LINEA_TRANSACCION_UBICACION, 
  --"TRANSACTION".memo AS NOTA, 
  NVL(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("TRANSACTION".memo, ',', ''), ':', ''), '''', ''), '"', ''), '{', ''), '}', ''), 'VACIO') AS NOTA,
  CASE WHEN entity."ID" = 47445 THEN 
  NVL(
            BUILTIN.DF(customrecordts_ec_series_impresion.custrecord_ts_ec_localidad_serie),
            'VACIO'
         ) 
       ELSE BUILTIN.DF(employee."LOCATION") END AS OFICINA_REPRESENTANTE_CB, 
  employee."ID" AS ID_INTERNO_REP_FACTURA, 
  "TRANSACTION"."ID" AS ID_INTERNO_FACTURA, 
  entity."ID" AS ID_INTERNO_CLIENTE, 
  CASE WHEN BUILTIN.DF("TRANSACTION".employee) IN ('E-10721591') THEN 'Servicio al cliente' 
       WHEN BUILTIN.DF("TRANSACTION".employee) IN ('E-2046', 'E-2034') THEN 'Corporativo' 
       WHEN BUILTIN.DF("TRANSACTION".employee) = 'E-FREEL3' THEN 'Individuales' 
       WHEN BUILTIN.DF("TRANSACTION".employee) = 'E-2573' THEN 
         CASE WHEN BUILTIN.DF(customer."CATEGORY") = '001 CLIENTE CORRIENTE' THEN 'Individuales' 
              WHEN BUILTIN.DF(customer."CATEGORY") IN ('009 CLIENTE CORPORATIVO', '011 PYMES') THEN 'Corporativo' 
              WHEN BUILTIN.DF(customer."CATEGORY") = '010 INSTITUCION PUBLICA' THEN 'Publico' 
              WHEN BUILTIN.DF(customer."CATEGORY") = '003 CONCESIONARIO' THEN 'Individuales' 
              ELSE 'Corporativo' END 
       WHEN BUILTIN.DF(employee.department) IN ('Corporativo', 'PYMES', 'Comercial-Corporativo') THEN 'Corporativo' 
       WHEN (BUILTIN.DF(employee.department) = 'Call-Center' OR BUILTIN.DF(employee.department) = 'Individuales') 
         OR BUILTIN.DF("TRANSACTION".employee) = 'E-2725' THEN 'Individuales' 
       WHEN BUILTIN.DF(employee.department) = 'Servicio al cliente' THEN BUILTIN.DF(employee.department) 
       WHEN BUILTIN.DF(employee.department) IN ('Seguros y Concesionarios', 'Comercial-Seguros & Concesionarios') THEN 'Concesionarios' 
       ELSE BUILTIN.DF(employee.department) END AS DEPARTAMENTO_CB, 
  BUILTIN.DF(employee.department) AS REPRESENTANTE_VENTA_DEPARTAMENTO, 
  CASE WHEN BUILTIN.DF("TRANSACTION".custbody_ec_estado_factura_interna) = 'No Facturado' THEN 'Facturación normal' 
       WHEN BUILTIN.DF("TRANSACTION".custbody_ec_estado_factura_interna) = 'Facturado' THEN 'Subido a débito' 
       ELSE 'Estado no definido' END AS FACT 
FROM 
  "TRANSACTION", 
  customrecord_ht_record_bienes, 
  customrecordts_ec_series_impresion, 
  employee, 
  customer, 
  entity, 
  "TRANSACTION" transaction_0, 
  item, 
  transactionline 
WHERE 
       (
              (
                     (
                            (
                                   (
                                          (
                                                 (
                                                        (
                                                               "TRANSACTION".custbody_ht_so_bien = CUSTOMRECORD_HT_RECORD_BIENES."ID"(+)
                                                               AND "TRANSACTION".custbody_ts_ec_serie_cxc = CUSTOMRECORDTS_EC_SERIES_IMPRESION."ID"(+)
                                                        )
                                                        AND "TRANSACTION".employee = employee."ID"(+)
                                                 )
                                                 AND "TRANSACTION".entity = Customer."ID"(+)
                                          )
                                          AND "TRANSACTION".entity = entity."ID"(+)
                                   )
                                   AND transactionLine.createdfrom = transaction_0."ID"(+)
                            )
                            AND transactionLine.item = item."ID"(+)
                     )
                     AND "TRANSACTION"."ID" = transactionLine."TRANSACTION"
              )
       )
  AND (
    (
      Upper(
        BUILTIN.DF(item.incomeaccount)
      ) LIKE '4%' 
      AND transactionline.subsidiary IN ('2') 
      AND "TRANSACTION"."type" IN ('CustInvc', 'CustCred') 
      AND transactionline.netamount * -1 IS NOT NULL 
      AND (
        NOT(
          "TRANSACTION".status IN ('CustInvc:V')
        ) 
        OR "TRANSACTION".status IS NULL
      ) 
      --  AND "TRANSACTION".trandate BETWEEN To_date(?, 'YYYY-MM-DD HH24:MI:SS') 
      -- AND To_date(?, 'YYYY-MM-DD HH24:MI:SS')
        AND "TRANSACTION".trandate BETWEEN To_date('${fechaInicio}', 'YYYY-MM-DD HH24:MI:SS')
        AND TO_DATE('${fechaFin}', 'YYYY-MM-DD HH24:MI:SS')
    )
  )

                `;

            var pagedData = query.runSuiteQLPaged({
                query: sql,
                pageSize: pageSize
            });

            var totalRecords = pagedData.count;
            var totalPages = pagedData.pageRanges.length;

            if (page > totalPages && totalPages > 0) {
                page = totalPages;
            } else if (totalPages === 0) {
                return {
                    success: true,
                    data: [],
                    pagination: {
                        page: 0,
                        pageSize: pageSize,
                        totalRecords: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                };
            }

            var pageIndex = page - 1;
            var pageData = pagedData.fetch({ index: pageIndex });
            var results = [];

            // Calcular cuántos registros deberían estar en esta página
            var recordsInThisPage = pageSize;
            if (page === totalPages) {
                recordsInThisPage = totalRecords - (pageSize * (totalPages - 1));
            }

            var iterator = pageData.data.iterator();
            var count = 0;
            iterator.each(function (result) {
                if (count < recordsInThisPage) {
                    results.push(result.value.asMap());
                    count++;
                }
                return count < recordsInThisPage; // Detener iteración cuando alcancemos el límite
            });

            return {
                success: true,
                data: results,
                pagination: {
                    page: page,
                    pageSize: pageSize,
                    totalRecords: totalRecords,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };

        } catch (e) {
            return {
                success: false,
                error: e.message,
                details: e.stack
            };
        }
    }

    function ConsultaLibro4(requestBody) {
        try {
            var page = parseInt(requestBody.page || 1);
            var pageSize = parseInt(requestBody.pageSize || 1000);

            var sql = `
                SELECT
                  dd.name,
                  mc.custrecord_ht_mc_seriedispositivo AS serie_dispositivo,
                  BUILTIN.DF(dd.custrecord_ht_dd_estado) AS estado,
                  BUILTIN.DF(dd.custrecord_ht_dd_dispositivo) AS dispositivo,
                  BUILTIN.DF(dd.custrecord_ht_dd_tipodispositivo) AS tipodispositivo,
                  dd.id
                FROM
                  customrecord_ht_record_detallechaserdisp dd,
                  customrecord_ht_record_mantchaser mc
                WHERE
                  mc.custrecord_ht_mc_seriedispositivo(+) = dd.id
                  AND dd.custrecordht_hdd_subsidiaria = 2
                ORDER BY dd.id ASC  
            `;

            var pagedData = query.runSuiteQLPaged({
                query: sql,
                pageSize: pageSize
            });

            var totalRecords = pagedData.count;
            var totalPages = pagedData.pageRanges.length;

            if (page > totalPages && totalPages > 0) {
                page = totalPages;
            } else if (totalPages === 0) {
                return {

                    results: [],
                    index: 0,
                    pages: 0,
                    totalRecords: 0

                    // // success: true,
                    // data: [],
                    // pagination: {
                    //     pages: 0,
                    //     pageSize: pageSize,
                    //     totalRecords: 0,
                    //     totalPages: 0,
                    //     hasNextPage: false,
                    //     hasPreviousPage: false
                    // }
                };
            }

            var pageIndex = page - 1;
            var pageData = pagedData.fetch({ index: pageIndex });

            var mapped = pageData.data.asMappedResults();
            // log.debug('KEYS', JSON.stringify(mapped[0]));

            var results = mapped.map(function (m) {
                return {
                    name: m.name || '',
                    serie_dispositivo: m.serie_dispositivo || '',
                    estado: m.estado || '',
                    dispositivo: m.dispositivo || '',
                    tipodispositivo: m.tipodispositivo || '',
                    id: m.id || ''
                };
            });

            var iterator = pageData.data.iterator();
            iterator.each(function (result) {
                // log.debug('KEYS', JSON.stringify(result.value.asMap()));
                return false;
            });

            return {
                // success: true,
                // data: results,
                // pagination: {
                //     pages: page,
                //     pageSize: pageSize,
                //     totalRecords: totalRecords,
                //     totalPages: totalPages,
                //     hasNextPage: page < totalPages,
                //     hasPreviousPage: page > 1
                // }

                results: results,
                index: page,
                pages: totalPages,
                totalRecords: totalRecords
            };

        } catch (e) {
            return {
                success: false,
                error: e.message,
                details: e.stack
            };
        }
    }

    function ConsultaLibro5(requestBody) {
        try {
            var page = parseInt(requestBody.page || 1);
            var pageSize = parseInt(requestBody.pageSize || 1000);

            var sql = `
                SELECT 
                  co.name,
                  co.custrecord_ht_co_estado as id_custrecord_ht_co_estado,
                  BUILTIN.DF(co.custrecord_ht_co_estado) AS desc_estado_cobertura,
                  BUILTIN.DF(co.custrecord_ht_co_estado_cobertura) AS estado_cobertura,
                  BUILTIN.DF(co.custrecord_ht_co_familia_prod) AS familia_prod,
                  co.custrecord_ht_co_bien,
                  co.custrecord_ht_co_celularsimcard,
                  co.custrecord_ht_co_clientemonitoreo,
                  BUILTIN.DF(co.custrecord_ht_co_clientemonitoreo) AS custrecord_ht_co_clientemonitoreoText,
                  BUILTIN.DF(co.custrecord_ht_co_modelodispositivo) AS modelodispositivo,
                  co.custrecord_ht_co_numerodispositivo,
                  BUILTIN.DF(co.custrecord_ht_co_operadora) AS operadora,
                  co.custrecord_ht_co_orden_servicio,
                  BUILTIN.DF(co.custrecord_ht_co_orden_servicio) AS name_orden_servicio,
                  ct.custrecord_ht_ct_orden_trabajo AS id_orden_trabajo,
                  BUILTIN.DF(ct.custrecord_ht_ct_orden_trabajo) AS orden_trabajo,
                  co.custrecord_ht_co_producto AS producto_id,
                  BUILTIN.DF(co.custrecord_ht_co_producto) AS producto,
                  co.id,
                  BUILTIN.DF(bien.custrecord_ht_bien_marca) AS marca,
                  bien.custrecord_ht_bien_placa AS placa,
                  cust.entitytitle
                FROM
                  customrecord_ht_co_cobertura co,
                  customrecord_ht_record_bienes bien,
                  customer cust,
                  customrecord_ht_ct_cobertura_transaction ct
                WHERE
                  co.custrecord_ht_co_bien = bien.id(+)
                  AND co.custrecord_ht_co_clientemonitoreo = cust.id(+)
                  AND co.id = ct.custrecord_ht_ct_transacciones(+)
                  AND co.custrecord_ht_co_subsidiaria = 2
                ORDER BY co.id ASC 
            `;

            var pagedData = query.runSuiteQLPaged({
                query: sql,
                pageSize: pageSize
            });

            var totalRecords = pagedData.count;
            var totalPages = pagedData.pageRanges.length;

            if (page > totalPages && totalPages > 0) {
                page = totalPages;
            } else if (totalPages === 0) {
                return {
                    // success: true,
                    // data: [],
                    // pagination: {
                    //     pages: 0,
                    //     pageSize: pageSize,
                    //     totalRecords: 0,
                    //     totalPages: 0,
                    //     hasNextPage: false,
                    //     hasPreviousPage: false
                    // }

                    results: [],
                    index: 0,
                    pages: 0,
                    totalRecords: 0

                };
            }

            var pageIndex = page - 1;
            var pageData = pagedData.fetch({ index: pageIndex });

            var mapped = pageData.data.asMappedResults();
            // log.debug('KEYS', JSON.stringify(mapped[0]));

            var results = mapped.map(function (m) {
                return {
                    name: m.name || '',
                    id: m.id || '',
                    custrecord_ht_co_numerodispositivo: m.custrecord_ht_co_numerodispositivo || '',
                    id_custrecord_ht_co_estado: m.id_custrecord_ht_co_estado || '',
                    desc_estado_cobertura: m.desc_estado_cobertura || '',
                    entitytitle: m.entitytitle || '',
                    familia_prod: m.familia_prod || '',
                    modelodispositivo: m.modelodispositivo || '',
                    placa: m.placa || '',
                    custrecord_ht_co_bien: m.custrecord_ht_co_bien || '',
                    marca: m.marca || '',
                    custrecord_ht_co_celularsimcard: m.custrecord_ht_co_celularsimcard || '',
                    custrecord_ht_co_clientemonitoreo: m.custrecord_ht_co_clientemonitoreo || '',
                    custrecord_ht_co_clientemonitoreoText: m.custrecord_ht_co_clientemonitoreoText || '',
                    producto_id: m.producto_id || '',
                    producto: m.producto || '',
                    estado_cobertura: m.estado_cobertura || '',
                    operadora: m.operadora || '',
                    custrecord_ht_co_orden_servicio: m.custrecord_ht_co_orden_servicio || '',
                    name_orden_servicio: m.name_orden_servicio || '',
                    id_orden_trabajo: m.id_orden_trabajo || '',
                    orden_trabajo: m.orden_trabajo || ''
                };
            });

            var iterator = pageData.data.iterator();
            iterator.each(function (result) {
                // log.debug('KEYS', JSON.stringify(result.value.asMap()));
                return false;
            });

            return {
                // success: true,
                // data: results,
                // pagination: {
                //     pages: page,
                //     pageSize: pageSize,
                //     totalRecords: totalRecords,
                //     totalPages: totalPages,
                //     hasNextPage: page < totalPages,
                //     hasPreviousPage: page > 1
                // }

                results: results,
                index: page,
                pages: totalPages,
                totalRecords: totalRecords

            };

        } catch (e) {
            return {
                success: false,
                error: e.message,
                details: e.stack
            };
        }
    }

//     // !aqui
//     function ConsultaLibro6(requestBody) {
//         try {
//             var page = parseInt(requestBody.page || 1);
//             var pageSize = parseInt(requestBody.pageSize || 1000);

//             var fechaInicio = requestBody.fechaInicio || requestBody.fechaini || null;
//             var fechaFin = requestBody.fechaFin || requestBody.fechafin || null;

//             var filtroFechas = '';
//             if (fechaInicio && fechaFin) {
//                 filtroFechas = `
//   AND sc.datecreated >= TO_DATE('${formatearFechaSQL(fechaInicio)}', 'YYYY-MM-DD')
//   AND sc.datecreated < TO_DATE('${formatearFechaSQL(fechaFin)}', 'YYYY-MM-DD') + 1`;
//             }

//             var sql = `
//             SELECT
//               sc.id                                      AS  ID_INTERNO,
//               sc.casenumber                              AS  ID,
//               sc.title                                   AS  ASUNTO,
//               sc.custevent_ht_caso_solicitante           AS  HT_SOLICITANTE,  -- FALTA TEXT
//               sc.companyname                             AS  NOMBRE_EMPRESA,
//               sc.subsidiary                              AS  SUBSIDIARIA,     -- FALTA TEXT
//               sc.assigned                                AS  ASIGNADO_A,
//               sc.contact                                 AS  CONTACTO,
//               sc.email                                   AS  CORREO_ELECTRONICO,
//               sc.phone                                   AS  TELEFONO,
//               sc.status                                  AS  ESTADO,           --FALTA TEXT
//               sc.priority                                AS  PRIORIDAD,--FALTA TEXT
//               sc.custevent_ht_departamento               AS  DEPARTAMENTO,--FALTA TEXT
//               sc.custevent_ht_caso_vehiculo              AS  HT_VEHICULO,--FALTA TEXT
//               sc.custevent_ht_caso_aseguradora           AS  HT_ASEGURADORA,--FALTA TEXT
//               sc.custevent_ht_caso_consecionario         AS  HT_CONCESIONARIO,--FALTA TEXT
//               sc.datecreated                             AS  FECHA_CREACION,
//               sc.custevent_ts_ht_fecha_hora_salida_ope   AS  FECHA_HORA_SALIDA_OPERATIVA,
//               sc.custevent_ht_cs_fechahorarecup          AS  FECHA_HORA_RECUPERACION,
//               sc.custevent_ht_caso_tipogestion           AS  HT_TIPO_GESTION,--FALTA TEXT
//               sc.custevent_ht_caso_etapacaso             AS  HT_ETAPA_CASO,--FALTA TEXT
//               sc.issue                                   AS  PROBLEMA_CASO,--FALTA TEXT
//               sc.custevent_ht_caso_mediomonitoreo        AS  HT_MEDIO_MONITOREO,--FALTA TEXT
//               sc.custevent_ht_caso_fecharobo             AS  HT_FECHA_ROBO,
//               sc.custevent_ht_cs_hora_robo               AS  HT_HORA_ROBO,
//               sc.custevent_ht_caso_direccionrobo         AS  HT_DIRECCION_ROBO,
//               sc.custevent_ht_cs_lugar_robo              AS  HT_LUGAR_ROBO,
//               sc.custevent_latitud                       AS  HT_LATITUD,
//               sc.custevent_longitud                      AS  HT_LONGITUD,
//               sc.custevent_ht_caso_pais                  AS  HT_PAIS,--FALTA TEXT
//               sc.custevent_ht_caso_provincia             AS  HT_PROVINCIA,--FALTA TEXT
//               sc.custevent_ht_caso_ciudad                AS  HT_CIUDAD,--FALTA TEXT
//               sc.custevent_ht_caso_situacionvehiculo     AS  HT_SITUACION_VEHICULO,--FALTA TEXT
//               sc.custevent_ht_caso_sectorrobo            AS HT_SECTOR_ROBO,--FALTA TEXT
//               sc.custevent_ht_caso_estadoconductor       AS HT_ESTADO_CONDUCTOR,--FALTA TEXT
//               sc.custevent_nombre                        AS HT_NOMBRE,
//               sc.custevent_ht_caso_observacion           AS HT_OBSERVACION,
//               sc.custevent_ht_cs_fecha_ubicacion         AS FECHA_UBICACION,
//               sc.custevent_ht_cs_hora_ubicacion          AS HT_HORA_UBICAION, 
//               sc.custevent_ht_cs_lugar_ubicacion         AS HT_LUGAR_UBICAION,
//               sc.custevent_ht_cs_recuperadopor           AS HT_RECUPERADO_POR,--FALTA TEXT
//               sc.custevent_ht_cs_sectorrecup             AS HT_SECTOR_RECUP,--FALTA TEXT
//               sc.custevent_ts_ht_base                    AS HT_BASE,--FALTA TEXT
//               sc.custevent_caso_apoyo_policial           AS APOYO_POLICIAL,--FALTA TEXT
//               sc.custevent_ts_ht_operador_contro         AS HT_OPERADOR_CONTROL,--FALTA TEXT
//               sc.custevent_ht_cs_latitudgestion          AS HT_LATITUD_GESTION,
//               sc.custevent_ht_cs_longitudgestion         AS HT_LONGITUD_GESTION,
//               sc.custevent_ht_cs_estadoveh               AS HT_ESTADO_VEH --FALTA TEXT
//             FROM supportCase sc
//             WHERE 1 = 1
//               AND sc.subsidiary = 2
//               AND sc.custevent_ht_departamento = 11${filtroFechas}
//             ORDER BY sc.datecreated ASC, sc.id ASC
//             `;

//             var pagedData = query.runSuiteQLPaged({
//                 query: sql,
//                 pageSize: pageSize
//             });

//             var totalRecords = pagedData.count;
//             var totalPages = pagedData.pageRanges.length;

//             // if (totalPages === 0 || page < 1 || page > totalPages) {
//             //     return {
//             //         success: true,
//             //         data: [],
//             //         pagination: {
//             //             page: page,
//             //             pageSize: pageSize,
//             //             totalRecords: totalRecords,
//             //             totalPages: totalPages,
//             //             hasNextPage: false,
//             //             hasPreviousPage: totalPages > 0 && page > 1
//             //         }
//             //     };
//             // }

//             if (totalPages === 0 || page < 1 || page > totalPages) {
//                 return {
//                     results: [],
//                     index: page,
//                     pages: totalPages,
//                     totalRecords: 0
//                 };
//             }

//             var pageData = pagedData.fetch({ index: page - 1 });
//             var results = [];

//             var recordsInThisPage = pageSize;
//             if (page === totalPages) {
//                 recordsInThisPage = totalRecords - (pageSize * (totalPages - 1));
//             }

//             var iterator = pageData.data.iterator();
//             var count = 0;
//             iterator.each(function (result) {
//                 if (count < recordsInThisPage) {
//                     results.push(result.value.asMap());
//                     count++;
//                 }
//                 return count < recordsInThisPage;
//             });

//             // return {
//             //     success: true,
//             //     data: results,
//             //     pagination: {
//             //         page: page,
//             //         pageSize: pageSize,
//             //         totalRecords: totalRecords,
//             //         totalPages: totalPages,
//             //         hasNextPage: page < totalPages,
//             //         hasPreviousPage: page > 1
//             //     }
//             // };

//             return {
//                 results: results,
//                 index: page,
//                 pages: totalPages,
//                 totalRecords: totalRecords
//             };

//         } catch (e) {
//             // return {
//             //     success: false,
//             //     error: e.message,
//             //     details: e.stack
//             // };
//             return {
//                 results: [],
//                 index: 0,
//                 pages: 0,
//                 totalRecords: 0
//             };
//         }
//     }

    // !aqui
    function ConsultaLibro6(requestBody) {
        try {
            var page = parseInt(requestBody.page || 1);
            var pageSize = parseInt(requestBody.pageSize || 1000);

            var fechaInicio = requestBody.fechaInicio || requestBody.fechaini || null;
            var fechaFin = requestBody.fechaFin || requestBody.fechafin || null;

            var filtroFechas = '';
            if (fechaInicio && fechaFin) {
                filtroFechas = `
  AND sc.datecreated >= TO_DATE('${formatearFechaSQL(fechaInicio)}', 'YYYY-MM-DD')
  AND sc.datecreated < TO_DATE('${formatearFechaSQL(fechaFin)}', 'YYYY-MM-DD') + 1`;
            }

            var sql = `
            SELECT
              sc.id                                                                          AS ID_INTERNO,
              sc.casenumber                                                                  AS ID,
              sc.title                                                                       AS ASUNTO,
              BUILTIN.DF(sc.custevent_ht_caso_solicitante)                                   AS HT_SOLICITANTE,
              sc.companyname                                                                 AS NOMBRE_EMPRESA,
              BUILTIN.DF(sc.subsidiary)                                                      AS SUBSIDIARIA,
              BUILTIN.DF(sc.assigned)                                                        AS ASIGNADO_A,
              BUILTIN.DF(sc.contact)                                                         AS CONTACTO,
              sc.email                                                                       AS CORREO_ELECTRONICO,
              sc.phone                                                                       AS TELEFONO,
              BUILTIN.DF(sc.status)                                                          AS ESTADO,
              BUILTIN.DF(sc.priority)                                                        AS PRIORIDAD,
              BUILTIN.DF(sc.custevent_ht_departamento)                                       AS DEPARTAMENTO,
              BUILTIN.DF(sc.custevent_ht_caso_vehiculo)                                      AS HT_VEHICULO,
              BUILTIN.DF(sc.custevent_ht_caso_aseguradora)                                   AS HT_ASEGURADORA,
              BUILTIN.DF(sc.custevent_ht_caso_consecionario)                                 AS HT_CONCESIONARIO,
              TO_CHAR(sc.datecreated, 'DD/MM/YYYY HH24:MI:SS')                               AS FECHA_CREACION,
              TO_CHAR(sc.custevent_ts_ht_fecha_hora_salida_ope, 'DD/MM/YYYY HH24:MI:SS')     AS FECHA_HORA_SALIDA_OPERATIVA,
              TO_CHAR(sc.custevent_ht_cs_fechahorarecup, 'DD/MM/YYYY HH24:MI:SS')            AS FECHA_HORA_RECUPERACION,
              BUILTIN.DF(sc.custevent_ht_caso_tipogestion)                                   AS HT_TIPO_GESTION,
              BUILTIN.DF(sc.custevent_ht_caso_etapacaso)                                     AS HT_ETAPA_CASO,
              BUILTIN.DF(sc.issue)                                                           AS PROBLEMA_CASO,
              BUILTIN.DF(sc.custevent_ht_caso_mediomonitoreo)                                AS HT_MEDIO_MONITOREO,
              TO_CHAR(sc.custevent_ht_caso_fecharobo, 'DD/MM/YYYY')                          AS HT_FECHA_ROBO,
              TO_CHAR(sc.custevent_ht_cs_hora_robo)                                          AS HT_HORA_ROBO,
              sc.custevent_ht_caso_direccionrobo                                             AS HT_DIRECCION_ROBO,
              sc.custevent_ht_cs_lugar_robo                                                  AS HT_LUGAR_ROBO,
              TO_CHAR(sc.custevent_latitud)                                                  AS HT_LATITUD,
              TO_CHAR(sc.custevent_longitud)                                                 AS HT_LONGITUD,
              BUILTIN.DF(sc.custevent_ht_caso_pais)                                          AS HT_PAIS,
              BUILTIN.DF(sc.custevent_ht_caso_provincia)                                     AS HT_PROVINCIA,
              BUILTIN.DF(sc.custevent_ht_caso_ciudad)                                        AS HT_CIUDAD,
              BUILTIN.DF(sc.custevent_ht_caso_situacionvehiculo)                             AS HT_SITUACION_VEHICULO,
              BUILTIN.DF(sc.custevent_ht_caso_sectorrobo)                                    AS HT_SECTOR_ROBO,
              BUILTIN.DF(sc.custevent_ht_caso_estadoconductor)                               AS HT_ESTADO_CONDUCTOR,
              sc.custevent_nombre                                                            AS HT_NOMBRE,
              sc.custevent_ht_caso_observacion                                               AS HT_OBSERVACION,
              TO_CHAR(sc.custevent_ht_cs_fecha_ubicacion, 'DD/MM/YYYY')                      AS FECHA_UBICACION,
              TO_CHAR(sc.custevent_ht_cs_hora_ubicacion)                                     AS HT_HORA_UBICAION,
              sc.custevent_ht_cs_lugar_ubicacion                                             AS HT_LUGAR_UBICAION,
              BUILTIN.DF(sc.custevent_ht_cs_recuperadopor)                                   AS HT_RECUPERADO_POR,
              BUILTIN.DF(sc.custevent_ht_cs_sectorrecup)                                     AS HT_SECTOR_RECUP,
              BUILTIN.DF(sc.custevent_ts_ht_base)                                            AS HT_BASE,
              BUILTIN.DF(sc.custevent_caso_apoyo_policial)                                   AS APOYO_POLICIAL,
              BUILTIN.DF(sc.custevent_ts_ht_operador_contro)                                 AS HT_OPERADOR_CONTROL,
              TO_CHAR(sc.custevent_ht_cs_latitudgestion)                                     AS HT_LATITUD_GESTION,
              TO_CHAR(sc.custevent_ht_cs_longitudgestion)                                    AS HT_LONGITUD_GESTION,
              BUILTIN.DF(sc.custevent_ht_cs_estadoveh)                                       AS HT_ESTADO_VEH
            FROM supportCase sc
            WHERE 1 = 1
              AND sc.subsidiary = 2
              AND sc.custevent_ht_departamento = 11${filtroFechas}
            ORDER BY sc.datecreated ASC, sc.id ASC
            `;

            var pagedData = query.runSuiteQLPaged({
                query: sql,
                pageSize: pageSize
            });

            var totalRecords = pagedData.count;
            var totalPages = pagedData.pageRanges.length;

            if (totalPages === 0 || page < 1 || page > totalPages) {
                return {
                    results: [],
                    index: page,
                    pages: totalPages,
                    totalRecords: 0
                };
            }

            var pageData = pagedData.fetch({ index: page - 1 });
            var results = [];

            var recordsInThisPage = pageSize;
            if (page === totalPages) {
                recordsInThisPage = totalRecords - (pageSize * (totalPages - 1));
            }

            var iterator = pageData.data.iterator();
            var count = 0;
            iterator.each(function (result) {
                if (count < recordsInThisPage) {
                    var row = result.value.asMap();
                    var limpio = {};
                    for (var k in row) {
                        var v = row[k];
                        if (v === null || v === undefined) {
                            limpio[k] = '';
                        } else if (typeof v === 'string') {
                            limpio[k] = v
                                .replace(/[\r\n]+/g, ' ')
                                .replace(/,/g, '')
                                .replace(/["']/g, '')
                                .trim();
                        } else {
                            limpio[k] = v;
                        }
                    }
                    results.push(limpio);
                    count++;
                }
                return count < recordsInThisPage;
            });

            return {
                results: results,
                index: page,
                pages: totalPages,
                totalRecords: totalRecords
            };

        } catch (e) {
            return {
                results: [],
                index: 0,
                pages: 0,
                totalRecords: 0
            };
        }
    }

    function ReporteOrdenTrabajo(fechaCorte, indice) {
        try {

            var requestBody = {
                page: indice,
                pageSize: 1000,
                fechaCorte: fechaCorte
            };

            log.debug("Request Body", requestBody);

            var page = parseInt(requestBody.page || 1);
            var pageSize = parseInt(requestBody.pageSize || 1000);

            var sql = `
                  SELECT
                      -- ORDEN DE TRABAJO
                       NVL(ot.custrecord_ht_ot_orden_servicio, 0)                AS ID_OS,
                       NVL(ot.custrecord_ht_ot_item, 0)                          AS PRODUCTO,
                       NVL(it.displayname, 'NINGUNO')                            AS PRODUCTO_DESC,
                       NVL(v.name, 'NINGUNO')                                    AS ACCION_PRODUCTO,
                      
                      -- CLIENTE
                      NVL(cu.vatregnumber, 0)                                         AS ID_CLIENTE,
                      NVL(cu.altname, 'NINGUNO')                                      AS CLIENTE,
                      
                      -- VEHÍCULO
                      NVL(ot.custrecord_ht_ot_vehiculo, 0)                       AS COD_VEH,
                      NVL(vb.altname,'NINGUNO')                                       AS DESC_VEHICULO,
                      NVL(vb.custrecord_ht_bien_chasis, 'NINGUNO')                    AS CHASIS,
                      
                      -- ESTADO TRABAJO
                      NVL(ot.id, 0)                                              AS ID_ORDEN_TRABAJO,
                      NVL(ot.name, 'SIN NOMBRE')                                      AS ORDEN_TRABAJO,
                      NVL(BUILTIN.DF(ot.custrecord_ht_ot_estado), 'SIN ESTADO')       AS ESTADO_TRABAJO,
                      NVL(ot.custrecord_ht_ot_observacion, 'NINGUNO')            AS OBSERVACION,
                      
                      -- SALES ORDER
                      NVL(so.tranid, '0')                                              AS OS,
                      TRIM(SUBSTR(BUILTIN.DF(so.status), INSTR(BUILTIN.DF(so.status), ':') + 1)) AS ESTADO_OS,
                      NVL(so.trandate,'01/01/1999')                                    AS FECHA_OS,
                      NVL(NULLIF('' , ''), 'NINGUNO')                             AS CIUDAD_OS,
                      
                      -- PERSONAL
                      NVL(concesionario.name, 'NINGUNO')                                                                                                          AS CONCESIONARIO,
                      -- backoffice_emp.entityid || ' ' || backoffice_emp.firstname || ' ' || backoffice_emp.lastname                                            AS EJEC_INICIO_GESTION,
                     CASE 
                       WHEN backoffice_emp.entityid IS NOT NULL AND backoffice_emp.firstname IS NOT NULL AND backoffice_emp.lastname IS NOT NULL
                       THEN backoffice_emp.entityid || ' ' || backoffice_emp.firstname || ' ' || backoffice_emp.lastname
                       ELSE 'NINGUNO'
                     END AS EJEC_INICIO_GESTION,

                      NVL(NULLIF('' , ''), 'NINGUNO')                              AS EJEC_RENOV,
                     -- referencia_emp.entityid || ' ' || referencia_emp.firstname || ' ' || referencia_emp.lastname AS EJEC_REFERENCIA
                      CASE 
                       WHEN referencia_emp.entityid IS NOT NULL AND referencia_emp.firstname IS NOT NULL AND referencia_emp.lastname IS NOT NULL
                       THEN referencia_emp.entityid || ' ' || referencia_emp.firstname || ' ' || referencia_emp.lastname
                       ELSE 'NINGUNO'
                     END AS EJEC_REFERENCIA
                  
                  FROM customrecord_ht_record_ordentrabajo ot
                  
                  LEFT JOIN item it 
                      ON it.id = ot.custrecord_ht_ot_item
                  
                  LEFT JOIN customer cu 
                      ON cu.id = ot.custrecord_ht_ot_cliente_id
                  
                  LEFT JOIN customrecord_ht_record_bienes vb 
                      ON vb.id = ot.custrecord_ht_ot_vehiculo
                  
                  LEFT JOIN customrecord_ht_pp_main_param_prod p
                      ON p.custrecord_ht_pp_parametrizacionid = ot.custrecord_ht_ot_item
                      AND p.custrecord_ht_pp_parametrizacion_rela = 109
                  
                  LEFT JOIN customrecord_ht_cr_pp_valores v
                      ON v.id = p.custrecord_ht_pp_parametrizacion_valor
                  
                  LEFT JOIN (
                      SELECT
                          A.id,
                          A.tranid,
                          A.status,
                          A.trandate,
                          A.custbody_ht_os_concesionario        AS os_concesionario_id,
                          A.custbody_ht_os_ejecutiva_backoffice AS os_backoffice,
                          A.custbody_ht_os_ejecutivareferencia  AS os_referencia
                      FROM transaction A
                      WHERE A.recordtype = 'salesorder'
                          AND A.customform = 142
                          AND A.status != 'C'
                  ) so ON so.id = ot.custrecord_ht_ot_orden_servicio
                  
                  LEFT JOIN customrecord_ht_record_canaldistribucion concesionario
                      ON concesionario.id = so.os_concesionario_id
                  
                  LEFT JOIN employee backoffice_emp
                      ON backoffice_emp.id = so.os_backoffice
                  
                  LEFT JOIN employee referencia_emp
                      ON referencia_emp.id = so.os_referencia
                  
                  WHERE 
                     -- ot.created 
                     -- BETWEEN TO_DATE('${fechaCorte} 00:00:00', 'YYYY-MM-DD HH24:MI:SS') AND 
                     -- TO_DATE('${fechaCorte} 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
                    ot.created <= TO_DATE('${fechaCorte} 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
                     AND ot.custrecord_ht_ot_subsidiary = 2
                     AND ot.custrecord_ht_ot_estado IN (4, 7)
                  
                  ORDER BY ot.created ASC;
                `;

            var pagedData = query.runSuiteQLPaged({
                query: sql,
                pageSize: pageSize
            });

            var totalRecords = pagedData.count;
            var totalPages = pagedData.pageRanges.length;

            if (page > totalPages && totalPages > 0) {
                page = totalPages;
            } else if (totalPages === 0) {
                return {
                    success: true,
                    data: [],
                    pagination: {
                        page: 0,
                        pageSize: pageSize,
                        totalRecords: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                };
            }

            var pageIndex = page - 1;
            var pageData = pagedData.fetch({ index: pageIndex });
            var results = [];

            // Calcular cuántos registros deberían estar en esta página
            var recordsInThisPage = pageSize;
            if (page === totalPages) {
                recordsInThisPage = totalRecords - (pageSize * (totalPages - 1));
            }

            var iterator = pageData.data.iterator();
            var count = 0;

            iterator.each(function (result) {
                if (count < recordsInThisPage) {
                    var row = result.value.asMap();
                    var idOS = row.id_os;

                    // log.debug("Procesando OS ID:", idOS);

                    // En lugar de lookupFields aquí, solo guardamos el ID
                    if (idOS) {
                        row.idOS_temp = idOS; // Marcar para batch lookup después
                    }

                    results.push(row);
                    count++;
                }
                return count < recordsInThisPage;
            });

            // AHORA: Hacer UN SOLO lookup batch al final
            if (results.length > 0) {
                var osIds = results
                    .filter(r => r.idOS_temp)
                    .map(r => r.idOS_temp);

                if (osIds.length > 0) {
                    try {
                        // Una sola búsqueda que trae TODOS los datos
                        var searchResults = search.create({
                            type: 'transaction',
                            filters: [
                                ['internalid', 'anyof', osIds]
                            ],
                            columns: [
                                search.createColumn({ name: 'internalid' }),
                                search.createColumn({ name: 'location' }),
                                search.createColumn({ name: 'salesrep' })
                            ]
                        }).run().getRange({ start: 0, end: 1000 });

                        // Mapear resultados para acceso rápido
                        var dataMap = {};
                        searchResults.forEach(function (res) {
                            var osId = res.id;
                            dataMap[osId] = {
                                ciudad: res.getText('location') || 'NINGUNO',
                                ejec: res.getText('salesrep') || 'NINGUNO'
                            };
                        });

                        // Enriquecer los results con el mapa
                        results.forEach(function (row) {
                            if (row.idOS_temp && dataMap[row.idOS_temp]) {
                                row.ciudad_os = dataMap[row.idOS_temp].ciudad;
                                row.ejec_renov = dataMap[row.idOS_temp].ejec;
                            } else if (row.idOS_temp) {
                                row.ciudad_os = 'NINGUNO';
                                row.ejec_renov = 'NINGUNO';
                            }
                            delete row.idOS_temp; // Limpiar variable temporal
                        });

                    } catch (err) {
                        log.error("Error en batch lookup:", err.message);
                        results.forEach(function (row) {
                            if (row.idOS_temp) {
                                row.OS_ERROR = 'Error obteniendo datos de OS: ' + err.message;
                            }
                        });
                    }
                }
            }


            return {
                success: true,
                data: results,
                pagination: {
                    page: page,
                    pageSize: pageSize,
                    totalRecords: totalRecords,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };

        } catch (e) {
            return {
                success: false,
                error: e.message,
                details: e.stack
            };
        }
    }

    function ReporteOrdenTrabajo2(fechaCorte, indice) {
        try {

            var requestBody = {
                page: indice,
                pageSize: 900,
                fechaCorte: fechaCorte
            };

            log.debug("Request Body", requestBody);

            var page = parseInt(requestBody.page || 1);
            var pageSize = parseInt(requestBody.pageSize || 900);

            var sql = `
                       SELECT
                      -- ORDEN DE TRABAJO
                       NVL(ot.custrecord_ht_ot_orden_servicio, 0)                AS ID_OS,
                       NVL(ot.custrecord_ht_ot_item, 0)                          AS PRODUCTO,
                       NVL(it.displayname, 'NINGUNO')                            AS PRODUCTO_DESC,
                       NVL(v.name, 'NINGUNO')                                    AS ACCION_PRODUCTO,
                      
                      -- CLIENTE
                      NVL(cu.vatregnumber, 0)                                         AS ID_CLIENTE,
                      --NVL(cu.altname, 'NINGUNO')                                      AS CLIENTE,
                      NVL(
                          REPLACE(
                              REPLACE(
                                  REPLACE(
                                      REPLACE(cu.altname, ',', ''),   -- QUITA COMAS
                                  '"', ''),
                              '\', ''),
                          '''', ''),
                          'NINGUNO'
                      ) AS CLIENTE,

                      
                      -- VEHÍCULO
                      NVL(ot.custrecord_ht_ot_vehiculo, 0)                       AS COD_VEH,
                     -- NVL(vb.altname,'NINGUNO')                                       AS DESC_VEHICULO,
                      NVL(
                          REPLACE(
                              REPLACE(
                                  REPLACE(
                                      REPLACE(vb.altname, ',', ''),   
                                  '"', ''),
                              '\', ''),
                          '''', ''),
                          'NINGUNO'
                      ) AS DESC_VEHICULO,
                      NVL(vb.custrecord_ht_bien_chasis, 'NINGUNO')                    AS CHASIS,
                      
                      -- ESTADO TRABAJO
                      NVL(ot.id, 0)                                              AS ID_ORDEN_TRABAJO,
                      NVL(ot.name, 'SIN NOMBRE')                                      AS ORDEN_TRABAJO,
                      NVL(BUILTIN.DF(ot.custrecord_ht_ot_estado), 'SIN ESTADO')       AS ESTADO_TRABAJO,
                      --NVL(ot.custrecord_cons_trabajo, 'NINGUNO')            AS OBSERVACION,
                        NVL(
                          (
                            SELECT
                              TRIM(
                                emp.entityid || ' ' ||
                                emp.firstname || ' ' ||
                                emp.lastname
                              )
                            FROM employee emp
                            WHERE emp.id = ot.custrecord_ht_ot_supervisorasignacion
                          ),
                          'NINGUNO'
                        ) AS HT_OT_SUPERVISOR,
                        NVL(
                          (
                            SELECT
                              TRIM(
                                emp.entityid || ' ' ||
                                emp.firstname || ' ' ||
                                emp.lastname
                              )
                            FROM employee emp
                            WHERE emp.id = ot.custrecord_ht_ot_tecnicoasignacion
                          ),
                          'NINGUNO'
                        ) AS HT_OT_TECNICO_ASIGNADO,

                      NVL(REPLACE(REPLACE(REPLACE(REPLACE(ot.custrecord_cons_trabajo, ',', ''), '"', ''), '\', ''), '''', ''), 'NINGUNO') AS OBSERVACION,
                      
                      -- SALES ORDER
                      NVL(so.tranid, '0')                                              AS OS,
                      CASE 
                          WHEN TRIM(SUBSTR(BUILTIN.DF(so.status), INSTR(BUILTIN.DF(so.status), ':') + 1)) IS NULL
                               OR TRIM(SUBSTR(BUILTIN.DF(so.status), INSTR(BUILTIN.DF(so.status), ':') + 1)) = '' 
                          THEN 'CANCELADO'
                          ELSE TRIM(SUBSTR(BUILTIN.DF(so.status), INSTR(BUILTIN.DF(so.status), ':') + 1))
                      END AS ESTADO_OS,
                      NVL(so.trandate,'01/01/1999')                                    AS FECHA_OS,
                      NVL(NULLIF('' , ''), 'NINGUNO')                             AS CIUDAD_OS,
                      
                      -- PERSONAL
                      --NVL(concesionario.name, 'NINGUNO')                                                                                                          AS CONCESIONARIO,
                      NVL(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(concesionario.name, ',', ''),   -- QUITA COMAS
            '"', ''),
        '\', ''),
    '''', ''),
    'NINGUNO'
) AS CONCESIONARIO,

                      -- backoffice_emp.entityid || ' ' || backoffice_emp.firstname || ' ' || backoffice_emp.lastname                                            AS EJEC_INICIO_GESTION,
                     CASE 
                       WHEN backoffice_emp.entityid IS NOT NULL AND backoffice_emp.firstname IS NOT NULL AND backoffice_emp.lastname IS NOT NULL
                       THEN backoffice_emp.entityid || ' ' || backoffice_emp.firstname || ' ' || backoffice_emp.lastname
                       ELSE 'NINGUNO'
                     END AS EJEC_INICIO_GESTION,

                      NVL(NULLIF('' , ''), 'NINGUNO')                              AS EJEC_RENOV,
                     -- referencia_emp.entityid || ' ' || referencia_emp.firstname || ' ' || referencia_emp.lastname AS EJEC_REFERENCIA
                      CASE 
                       WHEN referencia_emp.entityid IS NOT NULL AND referencia_emp.firstname IS NOT NULL AND referencia_emp.lastname IS NOT NULL
                       THEN referencia_emp.entityid || ' ' || referencia_emp.firstname || ' ' || referencia_emp.lastname
                       ELSE 'NINGUNO'
                     END AS EJEC_REFERENCIA
                  
                  FROM customrecord_ht_record_ordentrabajo ot
                  
                  LEFT JOIN item it 
                      ON it.id = ot.custrecord_ht_ot_item
                  
                  LEFT JOIN customer cu 
                      ON cu.id = ot.custrecord_ht_ot_cliente_id
                  
                  LEFT JOIN customrecord_ht_record_bienes vb 
                      ON vb.id = ot.custrecord_ht_ot_vehiculo
                  
                  LEFT JOIN customrecord_ht_pp_main_param_prod p
                      ON p.custrecord_ht_pp_parametrizacionid = ot.custrecord_ht_ot_item
                      AND p.custrecord_ht_pp_parametrizacion_rela = 109
                  
                  LEFT JOIN customrecord_ht_cr_pp_valores v
                      ON v.id = p.custrecord_ht_pp_parametrizacion_valor
                  
                  LEFT JOIN (
                      SELECT
                          A.id,
                          A.tranid,
                          A.status,
                          A.trandate,
                          A.custbody_ht_os_concesionario        AS os_concesionario_id,
                          A.custbody_ht_os_ejecutiva_backoffice AS os_backoffice,
                          A.custbody_ht_os_ejecutivareferencia  AS os_referencia
                      FROM transaction A
                      WHERE A.recordtype = 'salesorder'
                          AND A.customform = 142
                          AND A.status != 'C'
                  ) so ON so.id = ot.custrecord_ht_ot_orden_servicio
                  
                  LEFT JOIN customrecord_ht_record_canaldistribucion concesionario
                      ON concesionario.id = so.os_concesionario_id
                  
                  LEFT JOIN employee backoffice_emp
                      ON backoffice_emp.id = so.os_backoffice
                  
                  LEFT JOIN employee referencia_emp
                      ON referencia_emp.id = so.os_referencia
                  
                  WHERE 
                         -- ot.created 
                     -- BETWEEN TO_DATE('${fechaCorte} 00:00:00', 'YYYY-MM-DD HH24:MI:SS') AND 
                     -- TO_DATE('${fechaCorte} 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
                    ot.created <= TO_DATE('${fechaCorte} 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
                    AND ot.custrecord_ht_ot_subsidiary = 2
                    AND ot.custrecord_ht_ot_estado IN (4, 7)
                  
                    --AND ot.id = 13827

                  ORDER BY ot.created ASC;
                `;

            var pagedData = query.runSuiteQLPaged({
                query: sql,
                pageSize: pageSize
            });

            var totalRecords = pagedData.count;
            var totalPages = pagedData.pageRanges.length;

            if (page > totalPages && totalPages > 0) {
                page = totalPages;
            } else if (totalPages === 0) {
                return {
                    success: true,
                    data: [],
                    pagination: {
                        page: 0,
                        pageSize: pageSize,
                        totalRecords: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                };
            }

            var pageIndex = page - 1;
            var pageData = pagedData.fetch({ index: pageIndex });
            var results = [];

            // Calcular cuántos registros deberían estar en esta página
            var recordsInThisPage = pageSize;
            if (page === totalPages) {
                recordsInThisPage = totalRecords - (pageSize * (totalPages - 1));
            }

            var iterator = pageData.data.iterator();
            var count = 0;

            iterator.each(function (result) {
                if (count < recordsInThisPage) {
                    var row = result.value.asMap();
                    var idOS = row.id_os;

                    // log.debug("Procesando OS ID:", idOS);

                    // En lugar de lookupFields aquí, solo guardamos el ID
                    if (idOS) {
                        row.idOS_temp = idOS; // Marcar para batch lookup después
                    }

                    results.push(row);
                    count++;
                }
                return count < recordsInThisPage;
            });

            // AHORA: Hacer UN SOLO lookup batch al final
            // Filtrar los que NO están cancelados
            results = results.filter(r => r.estado_os !== "CANCELADO");

            // if (results.length > 0) {

            //     var osIds = results
            //         .filter(r => r.idOS_temp)
            //         .map(r => r.idOS_temp);

            //     if (osIds.length > 0) {
            //         try {
            //             // Una sola búsqueda que trae TODOS los datos
            //             var searchResults = search.create({
            //                 type: 'transaction',
            //                 filters: [
            //                     ['internalid', 'anyof', osIds]
            //                 ],
            //                 columns: [
            //                     search.createColumn({ name: 'internalid' }),
            //                     search.createColumn({ name: 'location' }),
            //                     search.createColumn({ name: 'salesrep' })
            //                 ]
            //             }).run().getRange({ start: 0, end: 10 });

            //             // Mapear resultados para acceso rápido
            //             var dataMap = {};
            //             searchResults.forEach(function (res) {
            //                 var osId = res.id;

            //                 // Si tengo los Datos, sale valor

            //                 log.debug("OS ID en lookup:", osId);
            //                 log.debug("Location:", res.getText('location'));
            //                 log.debug("Sales Rep:", res.getText('salesrep'));

            //                 dataMap[osId] = {
            //                     ciudad: res.getText('location') || 'NINGUNO',
            //                     ejec: res.getText('salesrep') || 'NINGUNO'
            //                 };
            //             });

            //             // Enriquecer los results con el mapa
            //             // aca ya no funciona
            //             results.forEach(function (row) {
            //                 if (row.idOS_temp && dataMap[row.idOS_temp]) {
            //                     row.ciudad_os = dataMap[row.idOS_temp].ciudad;
            //                     row.ejec_renov = dataMap[row.idOS_temp].ejec;
            //                 } else if (row.idOS_temp) {
            //                     row.ciudad_os = 'NINGUNO';
            //                     row.ejec_renov = 'NINGUNO';
            //                 }
            //                 delete row.idOS_temp; // Limpiar variable temporal
            //             });

            //         } catch (err) {
            //             log.error("Error en batch lookup:", err.message);
            //             results.forEach(function (row) {
            //                 if (row.idOS_temp) {
            //                     row.OS_ERROR = 'Error obteniendo datos de OS: ' + err.message;
            //                 }
            //             });
            //         }
            //     }
            // }

            // if (results.length > 0) {

            //     var osIds = results
            //         .filter(r => r.idOS_temp)
            //         .map(r => r.idOS_temp);

            //     if (osIds.length > 0) {
            //         try {
            //             // Una sola búsqueda que trae TODOS los datos
            //             var searchResults = search.create({
            //                 type: 'transaction',
            //                 filters: [
            //                     ['internalid', 'anyof', osIds]
            //                 ],
            //                 columns: [
            //                     search.createColumn({ name: 'internalid' }),
            //                     search.createColumn({ name: 'location' }),
            //                     search.createColumn({ name: 'salesrep' })
            //                 ]
            //             }).run().getRange({ start: 0, end: 1000 });

            //             // Mapear resultados para acceso rápido
            //             var dataMap = {};
            //             searchResults.forEach(function (res) {

            //                 // ESTE es el internalid correcto
            //                 var osId = res.getValue({ name: 'internalid' });

            //                 // log.debug("OS ID lookup:", osId);
            //                 log.debug("Location:", res.getText('location'));
            //                 // log.debug("Sales Rep:", res.getText('salesrep'));

            //                 dataMap[osId] = {
            //                     ciudad: res.getText('location') || 'NINGUNO',
            //                     ejec: res.getText('salesrep') || 'NINGUNO'
            //                 };
            //             });

            //             // Enriquecer los results con el mapa
            //             results.forEach(function (row) {
            //                 if (row.idOS_temp && dataMap[row.idOS_temp]) {

            //                     row.ciudad_os = dataMap[row.idOS_temp].ciudad;
            //                     row.ejec_renov = dataMap[row.idOS_temp].ejec;

            //                 } else if (row.idOS_temp) {

            //                     row.ciudad_os = 'NINGUNO';
            //                     row.ejec_renov = 'NINGUNO';
            //                 }

            //                 delete row.idOS_temp;
            //             });

            //         } catch (err) {
            //             log.error("Error en batch lookup:", err.message);
            //             results.forEach(function (row) {
            //                 if (row.idOS_temp) {
            //                     row.OS_ERROR = 'Error obteniendo datos de OS: ' + err.message;
            //                 }
            //             });
            //         }
            //     }
            // }

            if (results.length > 0) {

                var osIds = results
                    .filter(r => r.idOS_temp)
                    .map(r => r.idOS_temp);

                if (osIds.length > 0) {
                    try {
                        var dataMap = {};

                        // Helper: divide array en chunks
                        function chunkArray(arr, size) {
                            var chunks = [];
                            for (var i = 0; i < arr.length; i += size) {
                                chunks.push(arr.slice(i, i + size));
                            }
                            return chunks;
                        }

                        // Ajusta el tamaño del chunk si quieres (400 es seguro para NetSuite)
                        var CHUNK_SIZE = 400;
                        var chunks = chunkArray(osIds, CHUNK_SIZE);

                        chunks.forEach(function (chunkIds, chunkIndex) {
                            // Crear la búsqueda para este chunk
                            var mySearch = search.create({
                                type: 'transaction',
                                filters: [
                                    ['internalid', 'anyof', chunkIds]
                                ],
                                columns: [
                                    search.createColumn({ name: 'internalid' }),
                                    search.createColumn({ name: 'location' }),
                                    search.createColumn({ name: 'salesrep' })
                                ]
                            });

                            // Usar runPaged para iterar todas las páginas (por si la búsqueda tiene >1000 filas)
                            var paged = mySearch.runPaged({ pageSize: 1000 });

                            paged.pageRanges.forEach(function (pageRange) {
                                var page = paged.fetch({ index: pageRange.index });
                                page.data.forEach(function (res) {
                                    var osId = res.getValue({ name: 'internalid' });
                                    // Guardar en el mapa. coerción de key a string está OK en JS
                                    dataMap[osId] = {
                                        ciudad: res.getText({ name: 'location' }) || 'NINGUNO',
                                        ejec: res.getText({ name: 'salesrep' }) || 'NINGUNO'
                                    };
                                });
                            });

                            log.debug('Chunk procesado', 'chunk ' + (chunkIndex + 1) + ' de ' + chunks.length + ' (ids=' + chunkIds.length + ')');
                        });

                        // Enriquecer los results con el mapa
                        results.forEach(function (row) {
                            if (row.idOS_temp && dataMap[row.idOS_temp]) {
                                row.ciudad_os = dataMap[row.idOS_temp].ciudad;
                                row.ejec_renov = dataMap[row.idOS_temp].ejec;
                            } else if (row.idOS_temp) {
                                row.ciudad_os = 'NINGUNO';
                                row.ejec_renov = 'NINGUNO';
                            }
                            delete row.idOS_temp;
                        });

                    } catch (err) {
                        log.error("Error en batch lookup:", err.message || err);
                        results.forEach(function (row) {
                            if (row.idOS_temp) {
                                row.OS_ERROR = 'Error obteniendo datos de OS: ' + (err.message || err);
                            }
                        });
                    }
                }
            }


            return {
                success: true,
                data: results,
                pagination: {
                    page: page,
                    pageSize: pageSize,
                    totalRecords: totalRecords,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };

        } catch (e) {
            return {
                success: false,
                error: e.message,
                details: e.stack
            };
        }
    }

    function ConsultaControlGasto(fecha_ini, fecha_fin, indice) {
        try {

            log.debug("ConsultaControlGasto - Parámetros", { fecha_ini: fecha_ini, fecha_fin: fecha_fin, indice: indice });

            const LONGITUD_PAGINA = 1000;

            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "verifique Valores", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje, indice: indice });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            if (!indice || indice == "" || indice < 0) {
                indice = 0;
            } else {
                indice = indice - 1;
            }

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let Busqueda = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["posting", "is", "T"],
                        "AND",
                        ["accounttype", "anyof", "Expense"],
                        "AND",
                        ["subsidiary", "anyof", "2"],
                        "AND",
                        ["trandate", "within", fecha_ini, fecha_fin],
                    ],
                columns: [
                    search.createColumn({ name: "location", label: "Oficina" }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "{account.number} || ' - ' || TRIM(SUBSTR({account}, INSTR({account}, ':', -1) + 1))",
                        label: "CUENTA_FINAL"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "TRIM(REGEXP_SUBSTR({account}, '[^:]+$'))",
                        label: "CUENTA_NOMBRE_LIMPIA"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "REGEXP_SUBSTR(TRIM({account}), '^[0-9]+')",
                        label: "Nun_cuenta"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "TRIM(REGEXP_REPLACE({account}, '^[0-9]+[[:space:]]*', ''))",
                        label: "CUENTA_NOMBRE"
                    }),
                    search.createColumn({ name: "postingperiod", label: "Período" }),
                    search.createColumn({ name: "type", label: "Tipo" }),
                    search.createColumn({ name: "debitamount", label: "Importe (débito)" }),
                    search.createColumn({ name: "creditamount", label: "Importe (crédito)" }),
                    search.createColumn({ name: "amount", label: "Importe" }),
                    search.createColumn({ name: "tranid", label: "Número de documento" }),
                    search.createColumn({ name: "createdfrom", label: "Creado desde" }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "CASE WHEN NVL(TRIM(TO_CHAR({mainname})), '- None -') <> '- None -' THEN TRIM(TO_CHAR({mainname}))  WHEN NVL(TRIM(TO_CHAR({entity})), '- None -') <> '- None -' THEN TRIM(TO_CHAR({entity}))  ELSE '' END",
                        label: "NOMBRE_FINAL"
                    }),
                    search.createColumn({ name: "memo", label: "Nota" }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "REGEXP_SUBSTR({item}, '[0-9]+')",
                        label: "ARTICULO_BASE"
                    }),
                    search.createColumn({
                        name: "formulanumeric",
                        formula: "SUBSTR({postingperiod}, -4)",
                        label: "AÑO"
                    }),
                    search.createColumn({
                        name: "formulanumeric",
                        formula: "CASE  WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ene' THEN 1 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'feb' THEN 2 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'mar' THEN 3 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'abr' THEN 4 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'may' THEN 5 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jun' THEN 6 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jul' THEN 7 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ago' THEN 8 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'sep' THEN 9 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'oct' THEN 10 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'nov' THEN 11 WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'dic' THEN 12 ELSE 0 END",
                        label: "MES_NUM"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "CASE  WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ene' THEN 'Enero' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'feb' THEN 'Febrero' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'mar' THEN 'Marzo' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'abr' THEN 'Abril' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'may' THEN 'Mayo' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jun' THEN 'Junio' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jul' THEN 'Julio' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ago' THEN 'Agosto' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'sep' THEN 'Septiembre' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'oct' THEN 'Octubre' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'nov' THEN 'Noviembre' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'dic' THEN 'Diciembre' ELSE 'Sin mes' END",
                        label: "MES"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "SUBSTR({postingperiod}, -4) || '-' || CASE  WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ene' THEN '01' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'feb' THEN '02' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'mar' THEN '03' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'abr' THEN '04' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'may' THEN '05' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jun' THEN '06' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'jul' THEN '07' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'ago' THEN '08' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'sep' THEN '09' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'oct' THEN '10' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'nov' THEN '11' WHEN LOWER(SUBSTR({postingperiod},1,3)) = 'dic' THEN '12' ELSE '00' END",
                        label: "AÑO_MES"
                    }),
                    search.createColumn({ name: "department", label: "Departamento" }),
                    search.createColumn({ name: "trandate", label: "Fecha" }),
                    search.createColumn({ name: "datecreated", label: "Fecha de creación" }),
                    search.createColumn({ name: "createdby", label: "Creado por" })
                ]
            });

            let ObjResultado = [];

            let ResultadoConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA });

            let conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
            if (!indice || indice == "" || indice < 0) {
                indice = 0;
            } else if (indice > conteoPagina) {
                indice = conteoPagina;
            }

            if (ResultadoConsulta.count != 0) {
                let ResPagina = ResultadoConsulta.fetch({ index: indice });
                ResPagina.data.forEach(function (result) {

                    ObjResultado.push({
                        OFICINA: result.getText(result.columns[0]),
                        CUENTA_FINAL: (result.getValue(result.columns[1]) || "").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").replace(/,/g, "").trim(),
                        CUENTA_NOMBRE_LIMPIA: (result.getValue(result.columns[2]) || "").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").replace(/,/g, "").trim(),
                        Nun_cuenta: result.getValue(result.columns[3]),
                        CUENTA_NOMBRE: (result.getValue(result.columns[4]) || "").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").replace(/,/g, "").trim(),
                        PERIODO: result.getText(result.columns[5]),
                        TIPO: result.getText(result.columns[6]),
                        DEBITO: result.getValue(result.columns[7]) || "0",
                        CREDITO: result.getValue(result.columns[8]) || "0",
                        IMPORTE: result.getValue(result.columns[9]) || "0",
                        NUM_DOCUMENTO: result.getValue(result.columns[10]),
                        CREADO_DESDE: result.getText(result.columns[11]),
                        NOMBRE_FINAL: (result.getValue(result.columns[12]) || "").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").replace(/,/g, "").trim(),
                        NOTA: (result.getValue(result.columns[13]) || "").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").replace(/,/g, "").trim(),
                        ARTICULO_BASE: (result.getValue(result.columns[14]) || "").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").replace(/,/g, "").trim(),
                        AÑO: result.getValue(result.columns[15]),
                        MES_NUM: result.getValue(result.columns[16]),
                        MES: result.getValue(result.columns[17]),
                        AÑO_MES: result.getValue(result.columns[18]),
                        DEPARTAMENTO: (result.getText(result.columns[19]) || "").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").replace(/,/g, "").trim(),
                        FECHA: result.getValue(result.columns[20]),
                        FECHA_CREACION: result.getValue(result.columns[21]),
                        CREADO_POR: result.getText(result.columns[22])
                    });
                });
            }

            let totalImporte = ObjResultado.reduce(function (acc, row) {
                return acc + parseFloat(row.IMPORTE || 0);
            }, 0);


            return {
                results: ObjResultado,
                index: parseInt(indice) + 1,
                pages: conteoPagina,
                total: ResultadoConsulta.count,
                totalImporte: totalImporte
            };

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function _post(context) {
        try {
            let ResultadoConsulta = [];
            log.debug("context.query_:", context.query_);
            ResultadoConsulta = ConsultaLibre(context.query_);
            return ResultadoConsulta;

        } catch (error) {
            log.error('error', error.message);
            return 'id:400, No se pudo insertar el registro. Error controlado.';
        }
    }

    function _put() {
        //put
    }

    function _delete() {
        //delete
    }

    /**
     * Funciones adicionales
     */
    const validarFecha = (fecha) => {
        const regex = /^\d{2}-\d{2}-\d{4}$/;
        const mensajeFormatoCorrecto = "El formato correcto es dd-mm-yyyy.";

        // Verifica si la fecha cumple con el formato dd-mm-yyyy
        if (!regex.test(fecha)) {
            return {
                valido: false,
                mensaje: `La fecha ${fecha} no cumple con el formato correcto. ${mensajeFormatoCorrecto}`
            };
        }

        // Divide la fecha en día, mes y año
        const [dia, mes, año] = fecha.split('-').map(Number);
        const fechaObjeto = new Date(año, mes - 1, dia);

        // Verifica si la fecha es válida
        if (fechaObjeto.getFullYear() !== año || fechaObjeto.getMonth() !== mes - 1 || fechaObjeto.getDate() !== dia) {
            return {
                valido: false,
                mensaje: `La fecha ${fecha} no es una fecha válida. ${mensajeFormatoCorrecto}`
            };
        }

        // La fecha es válida
        return {
            valido: true,
            mensaje: `La fecha ${fecha} es válida.`
        };
    };

    const getInstallment = (id, total) => {
        let installmentData = []
        try {

            if (!id) {
                return installmentData
            }

            var installmentSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", id]
                    ],
                columns:
                    [
                        search.createColumn({ name: "amount", join: "installmentOnSalesOrder", label: "Importe" }),
                        search.createColumn({ name: "installmentnumber", join: "installmentOnSalesOrder", label: "Número de cuotas" }),
                        search.createColumn({ name: "percentage", join: "installmentOnSalesOrder", label: "Porcentaje" })
                    ]
            });


            // count results
            var searchResultCount = installmentSearchObj.runPaged().count;

            if (searchResultCount == 0) {
                return [{ num: '1', importe: total, valorAcumulado: total, porcentaje: '100%' }]
            } else {
                let totalAcumulado = 0
                installmentSearchObj.run().each(result => {
                    installmentData.push(
                        {
                            num: result.getValue({ name: "installmentnumber", join: "installmentOnSalesOrder" }),
                            importe: result.getValue({ name: "amount", join: "installmentOnSalesOrder" }),
                            valorAcumulado: totalAcumulado += result.getValue({ name: "amount", join: "installmentOnSalesOrder" }) ? parseFloat(result.getValue({ name: "amount", join: "installmentOnSalesOrder" })) : 0,
                            porcentaje: result.getValue({ name: "percentage", join: "installmentOnSalesOrder" }),
                        }
                    )
                    return true
                })

                installmentData?.sort((a, b) => (+a.num || 0) - (+b.num || 0))
                return installmentData
            }

        } catch (error) {
            log.error('error-getInstallment', error);
            return installmentData
        }
    };

    const getCliente = (id) => {
        try {

            if (id == "") {
                return [{ idcliente: '', cliente: '', identificacion: '', direccion: '', telefono: '', tipopersona: '', email: '', primernombre: '', segundonombre: '', apellidopaterno: '', apellidomaterno: '', compania: '' }];
            }

            const customerSearchObj = search.create({
                type: "customer",
                filters: [["internalid", "anyof", id]],
                columns: [
                    search.createColumn({ name: "entityid", label: "ID" }),
                    search.createColumn({ name: "altname", label: "Nombre" }),
                    search.createColumn({ name: "email", label: "Correo electrónico" }),
                    search.createColumn({ name: "phone", label: "Teléfono" }),
                    search.createColumn({
                        name: "custentity_ts_ec_tipo_persona",
                        label: "EC - Tipo de persona",
                    }),
                    search.createColumn({ name: "internalid", label: "ID interno" }),
                    search.createColumn({
                        name: "shipaddress",
                        label: "Dirección de envío",
                    }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "{vatregnumber}",
                        label: "Fórmula (texto)",
                    }),

                    search.createColumn({ name: "custentity_ht_cl_primernombre", label: "Primer Nombre" }),
                    search.createColumn({ name: "custentity_ht_cl_segundonombre", label: "Segundo Nombre" }),
                    search.createColumn({ name: "custentity_ht_cl_apellidopaterno", label: "Apellido Paterno" }),
                    search.createColumn({ name: "custentity_ht_cl_apellidomaterno", label: "Apellido Materno" }),
                    search.createColumn({ name: "companyname", label: "Compania" }),

                ],
            });

            const myPagedData = customerSearchObj.runPaged({ pageSize: 1000 });
            let respuesta = [];

            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {
                    respuesta.push({
                        idcliente: result.getValue({ name: "internalid" }),
                        cliente: result.getValue({ name: "altname" }),
                        identificacion: result.getValue({ name: "formulatext" }),
                        direccion: result.getValue({ name: "shipaddress" }),
                        telefono: result.getValue({ name: "phone" }),
                        tipopersona: result.getValue({
                            name: "custentity_ts_ec_tipo_persona",
                        }),
                        email: result.getValue({ name: "email" }),
                        primernombre: result.getValue({ name: "custentity_ht_cl_primernombre" }),
                        segundonombre: result.getValue({ name: "custentity_ht_cl_segundonombre" }),
                        apellidopaterno: result.getValue({ name: "custentity_ht_cl_apellidopaterno" }),
                        apellidomaterno: result.getValue({ name: "custentity_ht_cl_apellidomaterno" }),
                        compania: result.getValue({ name: "companyname" }),
                    });
                });
            });

            return respuesta[0];
        } catch (e) {
            log.error("Error en getCliente", e);
            return [{ idcliente: '', cliente: '', identificacion: '', direccion: '', telefono: '', tipopersona: '', email: '', primernombre: '', segundonombre: '', apellidopaterno: '', apellidomaterno: '', compania: '' }];
        }
    };

    const getOrden = (id) => {
        try {

            if (id == "") {
                return [{ codigo: '', nombre: '', idbien: '', nOS: '' }];
            }

            const salesorderSearchObj = search.create({
                type: "salesorder",
                filters: [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["internalid", "anyof", id],
                    "AND",
                    ["mainline", "is", "T"],
                ],
                columns: [
                    { name: "internalid" },
                    { name: "tranid", label: "Num. Pedido" },
                    { name: "custbody_ht_so_bien" },
                    { name: "altname", join: "CUSTBODY_HT_SO_BIEN" },
                    { name: "internalid", join: "CUSTBODY_HT_SO_BIEN" },
                ],
            });

            const myPagedData = salesorderSearchObj.runPaged({ pageSize: 10 });
            let respuesta = [];

            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {

                    const nOS = result.getValue({ name: "tranid" });
                    const codigo = result.getText({ name: "custbody_ht_so_bien" });
                    const nombre = result.getValue({ name: "altname", join: "CUSTBODY_HT_SO_BIEN" });
                    const idbien = result.getValue({ name: "internalid", join: "CUSTBODY_HT_SO_BIEN" });

                    respuesta.push({
                        codigo,
                        nombre,
                        idbien,
                        nOS
                    });
                });
            });

            return respuesta[0];
        } catch (e) {
            log.error("Error en BuscarOS", e);
            return [{ codigo: '', nombre: '', idbien: '', nOS: '' }];
        }
    };

    const getVehiculo = (id) => {
        try {

            if (id == "") {
                return [{ idvehiculo: '', vehiculo: '', motor: '', placa: '', chasis: '', codmarca: '', marca: '', codmodelo: '', modelo: '', color: '', anio: '', tipovehiculo: '', codigosys: '', tipo: '', anio: '', concesionarios: '', serie_pro: '' }];
            }

            const vehicleSearchObj = search.create({
                type: "customrecord_ht_record_bienes",
                filters: [["internalid", "anyof", id]],
                columns: [
                    { name: "internalid" },
                    { name: "name" },
                    { name: "altname" },
                    { name: "custrecord_ht_bien_motor" },
                    { name: "custrecord_ht_bien_placa" },
                    { name: "custrecord_ht_bien_chasis" },
                    { name: "custrecord_ht_bien_marca" },
                    { name: "custrecord_ht_bien_modelo" },
                    { name: "custrecord_ht_bien_colorcarseg" },
                    { name: "custrecord_ht_bien_ano" },
                    { name: "custrecord_ht_bien_codsysh" },
                    { name: "custrecord_ht_bien_tipo" },
                    { name: "custrecord_ht_bien_tipoterrestre" },
                    { name: "custrecord_ht_bien_ano" },
                    { name: "custrecord_ht_bien_consesionarios" },
                    { name: "custrecord_ht_serie_pro" }

                ],
            });

            const myPagedData = vehicleSearchObj.runPaged({ pageSize: 10 });
            let respuesta = [];

            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {

                    let codmarca = result.getValue({ name: "custrecord_ht_bien_marca" });
                    let marca = ConsultaMarca(codmarca, 'CUSTOMRECORD_HT_BIEN_MARCA');

                    let codmodelo = result.getValue({ name: "custrecord_ht_bien_modelo" });
                    let modelo = ConsultaModelo(codmodelo, "CUSTOMRECORD_HT_BN_MODELO");

                    respuesta.push({
                        idvehiculo: result.getValue({ name: "internalid" }),
                        vehiculo: result.getValue({ name: "name" }),
                        name: result.getValue({ name: "altname" }),
                        motor: result.getValue({ name: "custrecord_ht_bien_motor" }),
                        placa: result.getValue({ name: "custrecord_ht_bien_placa" }),
                        chasis: result.getValue({ name: "custrecord_ht_bien_chasis" }),
                        codmarca: result.getValue({ name: "custrecord_ht_bien_marca" }),
                        marca: marca,
                        codmodelo: result.getValue({ name: "custrecord_ht_bien_modelo" }),
                        modelo: modelo,
                        color: result.getText({ name: "custrecord_ht_bien_colorcarseg" }),
                        anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
                        tipovehiculo: result.getText({ name: "custrecord_ht_bien_tipo" }),
                        idtipovehiculo: result.getValue({ name: "custrecord_ht_bien_tipo" }),
                        codigosys: result.getValue({ name: "custrecord_ht_bien_codsysh" }),
                        tipo: result.getValue({ name: "custrecord_ht_bien_tipoterrestre" }),
                        anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
                        concesionarios: result.getText({ name: "custrecord_ht_bien_consesionarios" }),
                        serie_pro: result.getValue({ name: "custrecord_ht_serie_pro" }) ? result.getValue({ name: "custrecord_ht_serie_pro" }) : result.getValue({ name: "altname" })
                    });
                });
            });

            log.debug("respuesta--", respuesta);

            return respuesta[0];
        } catch (e) {
            log.error("Error en getVehiculo - ", e);
            return [{ idvehiculo: '', vehiculo: '', motor: '', placa: '', chasis: '', codmarca: '', marca: '', codmodelo: '', modelo: '', color: '', anio: '', tipovehiculo: '', codigosys: '', tipo: '', anio: '', concesionarios: '', serie_pro: '' }];
        }
    };

    const getVehiculo2 = (id) => {
        try {
            if (id == "") {
                return [{
                    idvehiculo: '', vehiculo: '', motor: '', placa: '', chasis: '',
                    codmarca: '', marca: '', codmodelo: '', modelo: '',
                    color: '', anio: '', tipovehiculo: '', codigosys: '',
                    tipo: '', concesionarios: '', serie_pro: ''
                }];
            }

            const vehicleSearchObj = search.create({
                type: "customrecord_ht_record_bienes",
                filters: [["internalid", "anyof", id]],
                columns: [
                    { name: "internalid" },
                    { name: "name" },
                    { name: "altname" },
                    { name: "custrecord_ht_bien_motor" },
                    { name: "custrecord_ht_bien_placa" },
                    { name: "custrecord_ht_bien_chasis" },

                    { name: "custrecord_ht_bien_marca" },                  // ID marca
                    { name: "name", join: "custrecord_ht_bien_marca" },    // Nombre marca

                    { name: "custrecord_ht_bien_modelo" },                 // ID modelo
                    { name: "name", join: "custrecord_ht_bien_modelo" },   // Nombre modelo

                    { name: "custrecord_ht_bien_colorcarseg" },
                    { name: "custrecord_ht_bien_ano" },
                    { name: "custrecord_ht_bien_codsysh" },
                    { name: "custrecord_ht_bien_tipo" },
                    { name: "custrecord_ht_bien_tipoterrestre" },
                    { name: "custrecord_ht_bien_consesionarios" },
                    { name: "custrecord_ht_serie_pro" }
                ],
            });

            const myPagedData = vehicleSearchObj.runPaged({ pageSize: 10 });
            let respuesta = [];

            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {
                    respuesta.push({
                        idvehiculo: result.getValue({ name: "internalid" }),
                        vehiculo: result.getValue({ name: "name" }),
                        name: result.getValue({ name: "altname" }),
                        motor: result.getValue({ name: "custrecord_ht_bien_motor" }),
                        placa: result.getValue({ name: "custrecord_ht_bien_placa" }),
                        chasis: result.getValue({ name: "custrecord_ht_bien_chasis" }),

                        codmarca: result.getValue({ name: "custrecord_ht_bien_marca" }),
                        marca: result.getValue({ name: "name", join: "custrecord_ht_bien_marca" }),

                        codmodelo: result.getValue({ name: "custrecord_ht_bien_modelo" }),
                        modelo: result.getValue({ name: "name", join: "custrecord_ht_bien_modelo" }),

                        color: result.getText({ name: "custrecord_ht_bien_colorcarseg" }),
                        anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
                        tipovehiculo: result.getText({ name: "custrecord_ht_bien_tipo" }),
                        idtipovehiculo: result.getValue({ name: "custrecord_ht_bien_tipo" }),
                        codigosys: result.getValue({ name: "custrecord_ht_bien_codsysh" }),
                        tipo: result.getValue({ name: "custrecord_ht_bien_tipoterrestre" }),
                        concesionarios: result.getText({ name: "custrecord_ht_bien_consesionarios" }),
                        serie_pro: result.getValue({ name: "custrecord_ht_serie_pro" }) || result.getValue({ name: "altname" })
                    });
                });
            });

            log.debug("respuesta--", respuesta);
            return respuesta[0];

        } catch (e) {
            log.error("Error en getVehiculo - ", e);
            return [{
                idvehiculo: '', vehiculo: '', motor: '', placa: '', chasis: '',
                codmarca: '', marca: '', codmodelo: '', modelo: '',
                color: '', anio: '', tipovehiculo: '', codigosys: '',
                tipo: '', concesionarios: '', serie_pro: ''
            }];
        }
    };

    const ConsultaModelo = (Id_Modelo, tabla) => {
        try {

            if (Id_Modelo == "") {
                return "";
            }

            var Resultado = [];
            let Busqueda = search.create({
                type: tabla,
                filters: [
                    ["isinactive", "anyof", "F"],
                ],
                columns:
                    [
                        search.createColumn({ name: "internalid", join: "CUSTRECORD_HT_MB_MARCA", label: "Id Marca" }),
                        search.createColumn({ name: "custrecord_ht_mb_marca", label: "Codigo marca" }),
                        search.createColumn({ name: "internalid", label: "Id Modelo" }),
                        search.createColumn({ name: "custrecord_ht_mod_descripcion", label: "Modelo" })

                    ]
            });

            if (Id_Modelo != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.IS,
                    values: Id_Modelo
                }));
            }

            var ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });

            if (ResConsulta.count != 0) {
                for (let i in ResConsulta) {
                    var IdMarca = ResConsulta[i].getValue({ name: 'custrecord_ht_mb_marca' });
                    var IdModelo = ResConsulta[i].getValue({ name: 'internalid' });
                    var Modelo = ResConsulta[i].getValue({ name: 'custrecord_ht_mod_descripcion' });
                }
                Resultado.push({
                    IdMarca: IdMarca,
                    Id: IdModelo,
                    Descripcion: Modelo
                });
            }

            //return Resultado;
            return Resultado[0]?.Descripcion || "";
        } catch (error) {
            log.error('error', error);
            //return JSON.stringify({error: error.message});
            return '';
        }
    };

    const ConsultaMarca = (Id_Marca, tabla) => {
        try {
            log.debug("Id_Marca", Id_Marca);

            if (!Id_Marca) {
                log.debug("Id_Marca es nulo o vacío");
                return "";
            }

            let Busqueda = search.create({
                type: tabla,
                filters: [
                    ["isinactive", "anyof", "F"],
                    "AND",
                    ["internalid", "is", Id_Marca]
                ],
                columns: [
                    search.createColumn({ name: "custrecord_ht_marca_descripcion", label: "Modelo" })
                ]
            });

            let pagedData = Busqueda.runPaged({ pageSize: 1 });
            let firstPage = pagedData.fetch({ index: 0 });

            // log.debug("Resultados de la búsqueda", firstPage.data);

            if (firstPage.data.length > 0) {
                let descripcion = firstPage.data[0].getValue({ name: 'custrecord_ht_marca_descripcion' });
                // log.debug("Descripción encontrada", descripcion);
                return descripcion || "";
            } else {
                log.debug("No se encontraron resultados");
                return "";
            }
        } catch (e) {
            log.error(tabla, e);
            return "";
        }
    };

    const obtenerItemParametrizadoPorBien = (IdOs) => {
        let results = [];

        try {

            if (!IdOs) {
                return [];
            }

            let serviceOrderSearch = search.create({
                type: "transaction",
                filters: [
                    ["type", "anyof", "CustInvc"],
                    "AND",
                    ["internalid", "is", IdOs],
                    "AND",
                    ["subsidiary", "anyof", "2"], // Subsidiaria.
                    "AND",
                    ["item.internalid", "noneof", "@NONE@"],
                    // "AND",
                    // ["custbody_ht_so_bien", "anyof", IdVehiculo],
                    "AND",
                    // TaxItem
                    ["item.type", "noneof", "TaxItem"],
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "item" }),
                    search.createColumn({ name: "rate" }),
                    search.createColumn({ name: "displayname", join: "item" }),
                    search.createColumn({ name: "internalid", join: "item" }),
                    search.createColumn({ name: "type", join: "item" }),
                    search.createColumn({ name: "custbody_ht_so_bien" }),
                    search.createColumn({ name: "amount" }),
                ],
            });

            let searchResult = serviceOrderSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {
                    let infoparametros = "";
                    item = result.getValue({ name: "item" });
                    infoparametros = obtenerParametrizacionItem(
                        item,
                        [109]
                    );
                    results.push({
                        internalidFac: result.getValue({ name: "internalid" }),
                        iditem: item,
                        infoparametroApd: infoparametros[0]?.ValorText || "",
                        descripcion: result.getValue({ name: "displayname", join: "item" }),
                        tipo: result.getValue({ name: "type", join: "item" }),
                        precio: result.getValue({ name: "amount" })
                    });
                });
            });

            //log.debug("results", results);
            return results;

        } catch (error) {
            log.debug("error", error);
            return [];
        }
    };

    const obtenerParametrizacionItem = (items, busquedaParametro) => {
        try {

            if (items == "") {
                return [];
            }

            let data = [];
            let parametrosOpcionales;

            let filtro = [
                ["custrecord_ht_pp_aplicacion", "is", "T"],
                "AND",
                ["custrecord_ht_pp_parametrizacionid", "anyof", items],
            ];

            if (busquedaParametro !== undefined) {
                parametrosOpcionales = busquedaParametro?.toString();
                filtro.push("AND", [
                    "custrecord_ht_pp_parametrizacion_rela",
                    "anyof",
                    parametrosOpcionales.split(","),
                ]);
            }

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

            let resultCount = busqueda.runPaged().count;

            if (resultCount > 0) {
                let pageData = busqueda.runPaged({ pageSize: 1000 });
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
            }

            return data;
        } catch (error) {
            log.error("Error en obtenerParametrizacionItem", error);
            return [];
        }
    };

    function obtenerUnDato(type, columna, id) {
        try {
            const resultado = search
                .create({
                    type: type,
                    filters: [["internalid", "is", id]],
                    columns: [columna],
                })
                .run()
                .getRange({ start: 0, end: 1 });

            return resultado.length > 0 ? resultado[0].getValue(columna) : "";
        } catch (error) {
            return "";
        }
    }

    function formatearFechaSQL(fecha) {
        // fecha viene como "DD-MM-YYYY"
        const [dd, mm, yyyy] = fecha.split('-');
        return `${yyyy}-${mm}-${dd}`;
    }

    // 25/11/2024
    const obtenerInfFacturaInternaBien = (idFactura) => {
        try {

            if (!idFactura) { return []; }

            let sqlQuery = `
                SELECT 	f.custrecord_orden_servicio, t.tranid, t.custbody_ht_so_bien, t.foreigntotal
                FROM     customrecord_ht_fact_internas_asociadas f,
                		transaction t
                WHERE	t.id = f.custrecord_orden_servicio
                and 	f.custrecord_nro_factura = ${idFactura}
                and 	t.type = 'SalesOrd'
                `;
            var resultSet = query.runSuiteQL({
                query: sqlQuery,
            });

            let results = resultSet.asMappedResults();

            if (results.length == 0) {
                return false;
            } else {
                for (let obj of results) {
                    for (let key in obj) {
                        if (typeof obj[key] === 'string') {
                            obj[key] = obj[key].replace(/\n/g, " ");
                        } else {
                            obj[key] = obj[key] === null ? "" : obj[key];
                        }
                    }
                }
                return results;
            }

        } catch (error) {
            log.error("Error obtenerInfFacturaInternaBien", { error: error.message, stack: error.stack });
            return [];
        }
    };

    // 25/11/2024
    const obtenerInfFacturaInternaBien2 = (idFactura) => {
        try {

            if (!idFactura) { return []; }

            let sqlQuery = `
                        Select  f.custrecord_orden_servicio, t.tranid, t.custbody_ht_so_bien, t.foreigntotal
                        FROM    customrecord_ht_fact_internas_asociadas f,
                        		transaction t
                        WHERE	t.id = f.custrecord_nro_factura_interna
                        and 	f.custrecord_nro_factura = ${idFactura}
                    `;
            var resultSet = query.runSuiteQL({
                query: sqlQuery,
            });

            let results = resultSet.asMappedResults();

            if (results.length == 0) {
                return false;
            } else {
                for (let obj of results) {
                    for (let key in obj) {
                        if (typeof obj[key] === 'string') {
                            obj[key] = obj[key].replace(/\n/g, " ");
                        } else {
                            obj[key] = obj[key] === null ? "" : obj[key];
                        }
                    }
                }
                return results;
            }

        } catch (error) {
            log.error("Error obtenerInfFacturaInternaBien", { error: error.message, stack: error.stack });
            return [];
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
                    search.createColumn({ name: "custrecord_ht_bien_chasis", }),
                    search.createColumn({ name: "altname", label: "Name" }),
                    search.createColumn({ name: "custrecord_ht_bien_placa", label: "Placa" }),
                    search.createColumn({ name: "custrecord_ht_bien_codsysh", label: "custrecord_ht_bien_codsysh" }),
                ]
            });

            let result = objSearch.run().getRange({ start: 0, end: 1 })[0];
            if (result) {
                objData.chassis = result.getValue({ name: "custrecord_ht_bien_chasis" }) || '';
                objData.name = result.getValue({ name: "altname" }) || '';
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

    const obtenerDataOS = (IdOs) => {
        try {
            if (!IdOs) {
                return [];
            }

            let serviceOrderSearch = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["subsidiary", "anyof", "2"],
                        "AND",
                        ["mainline", "is", "T"],
                        // "AND",
                        // ["trandate", "within", "18/08/2025", "18/11/2025"],
                        "AND",
                        ["customform", "anyof", "142"],
                        "AND",
                        ["internalid", "anyof", IdOs],
                        "AND",
                        ["status", "noneof", "SalesOrd:C", "SalesOrd:H"]
                    ],
                columns: [
                    search.createColumn({ name: "internalid", label: "ID interno" }),
                    search.createColumn({ name: "tranid", label: "Número de documento" }),
                    search.createColumn({ name: "statusref", label: "Estado" }),
                    search.createColumn({ name: "trandate", label: "Fecha" }),
                    search.createColumn({ name: "location", label: "Oficina" }),
                    search.createColumn({ name: "entity", label: "Nombre" }),
                    search.createColumn({ name: "custbody_ht_os_concesionario", label: "HT Concesionario" }),
                    search.createColumn({ name: "custbody_ht_os_ejecutiva_backoffice", label: "HT Ejecutiva de Gestión" }),
                    search.createColumn({ name: "custbody_ht_os_ejecutivareferencia", label: "HT Ejecutiva de referencia" }),
                    search.createColumn({ name: "salesrep", label: "Representante de ventas" }),
                    search.createColumn({ name: "memo", label: "Nota" }),
                ],
            });

            let results = [];
            let searchResult = serviceOrderSearch.runPaged({ pageSize: 1000 });

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {

                    let tranid = result.getValue({ name: "tranid" });
                    let status = result.getText({ name: "statusref" });
                    let createddate = result.getValue({ name: "trandate" });
                    let location = result.getText({ name: "location" });
                    let ejecutivaBackoffice = result.getText({ name: "custbody_ht_os_ejecutiva_backoffice" });
                    let salesrep = result.getText({ name: "salesrep" });
                    let ejecutivaReferenciasRep = result.getText({ name: "custbody_ht_os_ejecutivareferencia" });
                    let memo = result.getValue({ name: "memo" });
                    let concesionario = result.getText({ name: "custbody_ht_os_concesionario" });

                    results.push({
                        tranid: tranid,
                        status: status,
                        createddate: createddate,
                        location: location,
                        ejecutivaBackoffice: ejecutivaBackoffice,
                        salesrep: salesrep,
                        ejecutivaReferenciasRep: ejecutivaReferenciasRep,
                        memo: memo,
                        concesionario: concesionario
                    });


                });
            });

            return results[0] || {};

        } catch (error) {
            log.debug("error", error);
            return [];
        }
    };

    function quitarTilde(texto) {
        return texto
            .normalize("NFD")                 // separa las tildes
            .replace(/[\u0300-\u036f]/g, ""); // elimina los acentos
    };

    function convertirFecha(fechaCorte) {

        try {
            // Validar que la entrada no sea nula o vacía
            if (!fechaCorte || typeof fechaCorte !== 'string') {
                return { error: 'Fecha inválida. Debe ser un string' };
            }

            // Expresión regular para validar formato DD-MM-YYYY
            const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
            const match = fechaCorte.match(regex);

            if (!match) {
                return { error: 'Formato inválido. Use DD-MM-YYYY' };
            }

            const dia = parseInt(match[1], 10);
            const mes = parseInt(match[2], 10);
            const año = parseInt(match[3], 10);

            // Validar rango de mes
            if (mes < 1 || mes > 12) {
                return { error: 'Mes inválido. Debe estar entre 01 y 12' };
            }

            // Días por mes (considerando años bisiestos)
            const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

            // Verificar si es año bisiesto
            const esBisiesto = (año % 4 === 0 && año % 100 !== 0) || (año % 400 === 0);
            if (esBisiesto) {
                diasPorMes[1] = 29;
            }

            // Validar rango de día
            if (dia < 1 || dia > diasPorMes[mes - 1]) {
                return { error: 'Día inválido para el mes especificado' };
            }

            // Convertir a formato YYYY-MM-DD
            const fechaFormato = `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            return fechaFormato;
        } catch (error) {
            return false;
        }
    }

    function parseNumber(input) {
        if (input === "") {
            return 0;
        }

        let number = Number(input);

        if (isNaN(number)) {
            return 0;
        }

        return number;
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }

});