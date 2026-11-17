/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config"],

    (search, record, runtime, log, file, task, config) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext 
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_pe_ss_reporte_flujo_directo';
        const DEPLOYMENT_ID = 'customdeploy_pe_ss_reporte_flujo_directo';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;


        const execute = (scriptContext) => {
            try {
                let getCola = getPendientes();
                log.debug('getCola', getCola);
                if (getCola.length > 0) {
                    let params = getCola[0].param;
                    params = JSON.parse(params);
                    let idCola = getCola[0].id;
                    params.parametros.idCola = idCola;
                    main(params.parametros, scriptContext);
                    try {
                        let scriptTask = task.create({
                            taskType: TIPO_SCRIPT,
                            scriptId: SCRIPT_ID,
                            deploymentId: DEPLOYMENT_ID
                        });
                        let scriptTaskId = scriptTask.submit();
                    } catch (error) {
                        log.error('Error', error);
                    }

                }

            } catch (error) {
                log.error('Error', error);
            }
        }

        const main = (parametros, scriptContext) => {
            try {
                const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
                let fedIdNumb = '';
                let hasinfo = 0;

                const params = parametros;
                log.debug('params', params);
                if (featureSubsidiary) {
                    const getruc = getRUC(params.custbody_ts_le_subsidiaria)
                    fedIdNumb = getruc;
                } else {
                    const employerid = getEmployerID();
                    fedIdNumb = employerid;
                }
                let endperiodo = getPeriodName(params.custbody_ts_le_periodo);

                function convertirFormatoFecha(fechaStr) {
                    const meses = [
                        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                        'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
                    ];
                    let [dia, mes, año] = fechaStr.split('/');
                    let mesTexto = meses[parseInt(mes, 10) - 1]; // Convertir mes de "09" a 8, por ejemplo
                    return `${dia} DE ${mesTexto} DE ${año}`;
                }


                let rangoFechas = ` AL ${convertirFormatoFecha(endperiodo)}`;
                var total = 0;
                /////////////////////////////////Venta de Producto - CLASES
                let savedSearch = search.load({ id: "customsearch_actividad_operacional" });
                let shipdateFilter = search.createFilter({ name: "postingperiod", operator: 'abs', values: params.custbody_ts_le_periodo });
                savedSearch.filters.push(shipdateFilter);
                var PrimeraFila = '';
                let TotalGeneralBusqueda1 = 0;
                let pagedData = savedSearch.runPaged({ pageSize: 4000 });
                pagedData.pageRanges.forEach(function (pageRange) {
                    let page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        let columns = result.columns;
                        PrimeraFila += "<Row>";
                        PrimeraFila += '<Cell   ss:StyleID="s87"><Data ss:Type="String">' + result.getText(columns[0]) + '</Data></Cell>';
                        PrimeraFila += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (parseFloat(result.getValue(columns[1]))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                        PrimeraFila += "</Row>";
                        TotalGeneralBusqueda1 += parseFloat(result.getValue(columns[1]));
                    });
                });
                ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                var transactionSearchObjCuenta42 = search.create({
                    type: "transaction",
                    settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                    filters:
                        [
                            ["type", "anyof", "VendPymt", "VPrep"],
                            "AND",
                            ["formulanumeric: CASE WHEN substr({account.number},1,2) = '42' THEN 1 ELSE 0 END", "equalto", "1"],
                            "AND",
                            ["custbodysj_actividad_fujo_de_caja", "anyof", "1"],
                            "AND",
                            ["postingperiod", "abs", params.custbody_ts_le_periodo]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "creditamount",
                                summary: "SUM",
                                label: "Importe (crédito)"
                            }),
                            search.createColumn({
                                name: "debitamount",
                                summary: "SUM",
                                label: "Importe (débito)"
                            })
                        ]
                });
                var transactionSearchObjCuenta43 = search.create({
                    type: "transaction",
                    settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                    filters:
                        [
                            ["type", "anyof", "VendPymt", "VPrep"],
                            "AND",
                            ["formulanumeric: CASE WHEN substr({account.number},1,2) = '43' THEN 1 ELSE 0 END", "equalto", "1"],
                            "AND",
                            ["custbodysj_actividad_fujo_de_caja", "anyof", "1"],
                            "AND",
                            ["postingperiod", "abs", params.custbody_ts_le_periodo]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "creditamount",
                                summary: "SUM",
                                label: "Importe (crédito)"
                            }),
                            search.createColumn({
                                name: "debitamount",
                                summary: "SUM",
                                label: "Importe (débito)"
                            })
                        ]
                });
                var transactionSearchObjCuenta44 = search.create({
                    type: "check",
                    settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                    filters:
                        [
                            ["type", "anyof", "Check"],
                            "AND",
                            ["formulanumeric: CASE WHEN substr({account.number},1,2) = '44' THEN 1 ELSE 0 END", "equalto", "1"],
                            "AND",
                            ["custbodysj_actividad_fujo_de_caja", "anyof", "1"],
                            "AND",
                            ["postingperiod", "abs", params.custbody_ts_le_periodo]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "creditamount",
                                summary: "SUM",
                                label: "Importe (crédito)"
                            }),
                            search.createColumn({
                                name: "debitamount",
                                summary: "SUM",
                                label: "Importe (débito)"
                            })
                        ]
                });
                let xmlString = printStyleExcel();

                xmlString += '<Worksheet ss:Name="Reporte Presupuestal">';
                xmlString += "<Table>";

                xmlString += '<Column  ss:AutoFitWidth="0" ss:Width="400"/>';
                xmlString += '<Column ss:AutoFitWidth="0" ss:Width="120"/>';
                xmlString += '<Column ss:AutoFitWidth="0" ss:Width="350"/>';
                xmlString += '<Column ss:AutoFitWidth="0" ss:Width="100"/>';
                xmlString += '<Column ss:StyleID="s98"   ss:Width="150" ss:AutoFitWidth="0" ss:Span="12"/>';

                xmlString += "<Row/>";
                xmlString += "<Row/>";

                xmlString += "<Row>";
                xmlString += '<Cell  ss:MergeAcross="1" ss:StyleID="s82"><Data ss:Type="String">PANADERIA SAN JORGE </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell  ss:MergeAcross="1" ss:StyleID="s82"><Data ss:Type="String">ESTADO DE EFECTIVO DIRECTO </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell  ss:MergeAcross="1" ss:StyleID="s82"><Data ss:Type="String">' + rangoFechas + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Detalle </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">IMPORTE </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row/>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Actividad de Operación</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String">Cobranzas correspondientes a:</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">Venta de Producto - CLASES</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + TotalGeneralBusqueda1.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</Data></Cell>';
                xmlString += "</Row>";
                xmlString += PrimeraFila;


                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Detalle </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">IMPORTE </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Otros Ingresos </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";

                var total1413101 = consultaSegunda(params.custbody_ts_le_periodo, '6714');
                var total1621102 = consultaSegunda(params.custbody_ts_le_periodo, '6631');

                let TotalGeneralBusqueda2 = 0;


                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Entregas A Rendir </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + total1413101.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                TotalGeneralBusqueda2 += total1413101 + total1621102;

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Subsidios A Essalud </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + total1621102.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Otros Ingresos </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + TotalGeneralBusqueda2.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s81"><Data ss:Type="String">Total Ingresos Actividad de Operación </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + (TotalGeneralBusqueda2 + TotalGeneralBusqueda1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";


                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Detalle </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">IMPORTE </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Pagos correspondientes a: </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                let totalcuenta42 = 0;
                let TotalGeneralBusqueda3 = 0;
                transactionSearchObjCuenta42.run().each(function (result) {
                    var totalcredito = result.getValue({
                        name: "creditamount",
                        summary: "SUM",
                        label: "Importe (crédito)"
                    });
                    var totaldebito = result.getValue({
                        name: "debitamount",
                        summary: "SUM",
                        label: "Importe (débito)"
                    });
                    totalcuenta42 = totalcredito ? parseFloat(totalcredito) : 0;
                    totalcuenta42 = totaldebito ? parseFloat(totaldebito) : 0;
                    return true;
                });
                TotalGeneralBusqueda3 += totalcuenta42;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Proveedores - Terceros </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + totalcuenta42.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                let totalcuenta43 = 0;
                transactionSearchObjCuenta43.run().each(function (result) {
                    var totalcredito = result.getValue({
                        name: "creditamount",
                        summary: "SUM",
                        label: "Importe (crédito)"
                    });
                    var totaldebito = result.getValue({
                        name: "debitamount",
                        summary: "SUM",
                        label: "Importe (débito)"
                    });
                    totalcuenta43 = totalcredito ? parseFloat(totalcredito) : 0;
                    totalcuenta43 = totaldebito ? parseFloat(totaldebito) : 0;
                    return true;
                });
                TotalGeneralBusqueda3 += totalcuenta43;
                let TotalGeneralBusqueda4 = 0;
                let totalcuenta44 = 0;
                transactionSearchObjCuenta44.run().each(function (result) {
                    var totalcredito = result.getValue({
                        name: "creditamount",
                        summary: "SUM",
                        label: "Importe (crédito)"
                    });
                    var totaldebito = result.getValue({
                        name: "debitamount",
                        summary: "SUM",
                        label: "Importe (débito)"
                    });

                    totalcuenta44 = totalcredito ? parseFloat(totalcredito) : 0;
                    totalcuenta44 = totaldebito ? parseFloat(totaldebito) : 0;
                    return true;
                });
                TotalGeneralBusqueda4 += totalcuenta44;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Proveedores - Relacionadas </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + totalcuenta43.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">CUENTAS POR PAGAR A LOS ACCIONISTAS (SOCIOS)</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta44.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Trabajadores - Planilla </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4111201 = consultaCuarta(params.custbody_ts_le_periodo, '8841');
                TotalGeneralBusqueda4 += totalcuenta4111201;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Salarios</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4111201.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4114102 = consultaCuarta(params.custbody_ts_le_periodo, '8851');
          
                TotalGeneralBusqueda4 += totalcuenta4114102;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Gratificacion Salarios</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4114102.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4114101 = consultaCuarta(params.custbody_ts_le_periodo, '8850');
                TotalGeneralBusqueda4 += totalcuenta4114101;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Gratificacion Sueldos</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4114101.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4111101 = consultaCuarta(params.custbody_ts_le_periodo, '8839');
                
                TotalGeneralBusqueda4 += totalcuenta4111101;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Sueldos</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4111101.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">TOTAL DE PLANILLA </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + (totalcuenta4111101 + totalcuenta4114102 + totalcuenta4114101 + totalcuenta4111201).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Trabajadores </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";

                var totalTrabajadores = 0;
                var totalcuenta4071101 = consultaCuarta(params.custbody_ts_le_periodo, '8815');
                
                var totalcuenta4032101 = consultaCuarta(params.custbody_ts_le_periodo, '8766');
            
                totalTrabajadores += totalcuenta4071101 + totalcuenta4032101;

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Fondo de Pensiones</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (totalcuenta4071101 + totalcuenta4032101).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4031101 = consultaCuarta(params.custbody_ts_le_periodo, '8762');
             
                var totalcuenta4031102 = consultaCuarta(params.custbody_ts_le_periodo, '8763');
                
                totalTrabajadores += totalcuenta4031102 + totalcuenta4031101;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Seguro Personal - ESSALUD/EPS</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (totalcuenta4031102 + totalcuenta4031101).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4115101 = consultaCuarta(params.custbody_ts_le_periodo, '8854');
               
                totalTrabajadores += totalcuenta4115101;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Vacaciones Empleados</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4115101.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4115102 = consultaCuarta(params.custbody_ts_le_periodo, '8855');
            
                totalTrabajadores += totalcuenta4115102;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Vacaciones Obreros</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4115102.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4131102 = consultaCuarta(params.custbody_ts_le_periodo, '8863');
               
                totalTrabajadores += totalcuenta4131102;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Participación de los Trabajadores</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4131102.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4131101 = consultaCuarta(params.custbody_ts_le_periodo, '8862');
                totalTrabajadores += totalcuenta4131101;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Participación de los Empleados</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4131101.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta1411101 = consultaCuarta(params.custbody_ts_le_periodo, '6615');
            
                var totalcuenta1411102 = consultaCuarta(params.custbody_ts_le_periodo, '6616');
               
                var totalcuenta1411103 = consultaCuarta(params.custbody_ts_le_periodo, '6617');
               

                var totalcuenta1411104 = consultaCuarta(params.custbody_ts_le_periodo, '6618');
           
                var totalcuenta1411105 = consultaCuarta(params.custbody_ts_le_periodo, '6619');
               
                totalTrabajadores += totalcuenta1411105 + totalcuenta1411104 + totalcuenta1411103 + totalcuenta1411102 + totalcuenta1411101;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Prestamos al Personal</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (totalcuenta1411105 + totalcuenta1411104 + totalcuenta1411103 + totalcuenta1411102 + totalcuenta1411101).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta1419103 = consultaCuarta(params.custbody_ts_le_periodo, '6638');
              
                totalTrabajadores += totalcuenta1419103;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Prestamos a Terceros</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta1419103.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Indemnización al personal</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";

                var totalcuenta4151101 = consultaCuarta(params.custbody_ts_le_periodo, '8869');
                var totalcuenta4151102 = consultaCuarta(params.custbody_ts_le_periodo, '8870');
                var totalcuenta4151111 = consultaCuarta(params.custbody_ts_le_periodo, '8871');
                var totalcuenta4151112 = consultaCuarta(params.custbody_ts_le_periodo, '8872');
                
                totalTrabajadores += (totalcuenta4151112 + totalcuenta4151111 + totalcuenta4151102 + totalcuenta4151101);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Compensación por tiempo de Servicio - CTS</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (totalcuenta4151112 + totalcuenta4151111 + totalcuenta4151102 + totalcuenta4151101).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Remuneración No Domiciliado</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";

                var totalcuenta4699902 = consultaCuarta(params.custbody_ts_le_periodo, '9249');
             
                totalTrabajadores += (totalcuenta4699902);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Retenciones Judiciales</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4699902.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4191101 = consultaCuarta(params.custbody_ts_le_periodo, '8891');
              
                var totalcuenta4191102 = consultaCuarta(params.custbody_ts_le_periodo, '8892');

                totalTrabajadores += (totalcuenta4191102 + totalcuenta4191101);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Liquidaciones</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (totalcuenta4191102 + totalcuenta4191101).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4033101 = consultaCuarta(params.custbody_ts_le_periodo, '8769');
            
                totalTrabajadores += (totalcuenta4033101);
                TotalGeneralBusqueda4 += (totalTrabajadores);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Contribuciones - SENATI</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4033101.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">TOTAL DE TRABAJADORES </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + totalTrabajadores.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                var totaltributos = 0;
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Tributos</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4011101 = consultaCuarta(params.custbody_ts_le_periodo, '8706');
                
                totaltributos += (totalcuenta4011101);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Igv Nacional</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4011101.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4017101 = consultaCuarta(params.custbody_ts_le_periodo, '8729');
               
                var totalcuenta1671101 = consultaCuarta(params.custbody_ts_le_periodo, '6815');
               
                totaltributos += (totalcuenta1671101 + totalcuenta4017101);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Renta 3Er</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (totalcuenta1671101 + totalcuenta4017101).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4017201 = consultaCuarta(params.custbody_ts_le_periodo, '8732');
                
                totaltributos += (totalcuenta4017201);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Renta 4Ta</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4017201.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4017301 = consultaCuarta(params.custbody_ts_le_periodo, '8734');
              
                totaltributos += (totalcuenta4017301);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Renta 5Ta</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4017301.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4061501 = consultaCuarta(params.custbody_ts_le_periodo, '8795');
                
                totaltributos += (totalcuenta4061501);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Arbitrios</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4061501.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4011401 = consultaCuarta(params.custbody_ts_le_periodo, '8769');
               
                totaltributos += (totalcuenta4011401);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Regimen De Retenciones</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4011401.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4063401 = consultaCuarta(params.custbody_ts_le_periodo, '8809');
               
                totaltributos += (totalcuenta4063401);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Predial</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4063401.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4011201 = consultaCuarta(params.custbody_ts_le_periodo, '8710');
            
          
                totaltributos += (totalcuenta4011201);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Igv No Domiciliado</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4011201.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4017401 = consultaCuarta(params.custbody_ts_le_periodo, '8736');
                
                totaltributos += (totalcuenta4017401);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Renta No Domiciliada</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4017401.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4011301 = consultaCuarta(params.custbody_ts_le_periodo, '8712');
           
                totaltributos += (totalcuenta4011301);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Percepciones</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4011301.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4018601 = consultaCuarta(params.custbody_ts_le_periodo, '8751');
               

                var totalcuenta1672101 = consultaCuarta(params.custbody_ts_le_periodo, '6818');
             
                totaltributos += (totalcuenta1672101 + totalcuenta4018601);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">ITAN</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (totalcuenta1672101 + totalcuenta4018601).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4018501 = consultaCuarta(params.custbody_ts_le_periodo, '8749');
            
                totaltributos += (totalcuenta4018501);
                TotalGeneralBusqueda4 += totaltributos;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Impuesto a los Dividendos </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta4018501.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">TOTAL Tributos </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + totaltributos.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta1413101 = consultaCuarta(params.custbody_ts_le_periodo, '6631');
      
                TotalGeneralBusqueda4 += (totalcuenta1413101);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Entregas A Rendir </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + totalcuenta1413101.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta4699101 = consultaCuarta(params.custbody_ts_le_periodo, '8749');
             
                var totalcuenta4699102 = consultaCuarta(params.custbody_ts_le_periodo, '9240');
              
                TotalGeneralBusqueda4 += (totalcuenta4699101 + totalcuenta4699102);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Fondo Fijo </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (totalcuenta4699101 + totalcuenta4699102).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var totalcuenta1644101 = consultaCuarta(params.custbody_ts_le_periodo, '6769');
            
                var totalcuenta1644201 = consultaCuarta(params.custbody_ts_le_periodo, '6771');
             

                TotalGeneralBusqueda4 += (totalcuenta1644101 + totalcuenta1644201);
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Depositos en Garantia </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (totalcuenta1644101 + totalcuenta1644201).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">TOTAL </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + (totalcuenta1644101 + totalcuenta1644201 + totalcuenta4699101 + totalcuenta4699102 + totalcuenta1413101).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Total Egresos Actividad de Operación </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + (TotalGeneralBusqueda2 + TotalGeneralBusqueda3).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Efectivo y Equivalente de Efectivo por Actividad de Operación </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + (TotalGeneralBusqueda1 + TotalGeneralBusqueda2 + TotalGeneralBusqueda3 + TotalGeneralBusqueda4).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Actividad de Financiamiento </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Cobranzas correspondientes a: </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                savedSearch = search.load({ id: "customsearch_actividad_operacional_3_3" });
                shipdateFilter = search.createFilter({ name: "postingperiod", operator: 'abs', values: params.custbody_ts_le_periodo });
                savedSearch.filters.push(shipdateFilter);

                let TotalGeneralBusqueda5 = 0;
                let GrupoA = 0;
                pagedData = savedSearch.runPaged({ pageSize: 4000 });
                pagedData.pageRanges.forEach(function (pageRange) {
                    let page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        let columns = result.columns;

                        GrupoA += result.getValue(columns[0]) ? parseFloat(result.getValue(columns[0])):0;
                        GrupoA += result.getValue(columns[1]) ? parseFloat(result.getValue(columns[1])):0;
                    });
                });
                TotalGeneralBusqueda5 += GrupoA;

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Préstamos a Relacionadas </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + GrupoA.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                GrupoA = 0;
                savedSearch = search.load({ id: "customsearch_actividad_operacional_3_3_2" });
                shipdateFilter = search.createFilter({ name: "postingperiod", operator: 'abs', values: params.custbody_ts_le_periodo });
                savedSearch.filters.push(shipdateFilter);
                pagedData = savedSearch.runPaged({ pageSize: 4000 });
                pagedData.pageRanges.forEach(function (pageRange) {
                    let page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        let columns = result.columns;

                        GrupoA += result.getValue(columns[0]) ? parseFloat(result.getValue(columns[0])):0;
                        GrupoA += result.getValue(columns[1]) ? parseFloat(result.getValue(columns[1])):0;
                    });
                });

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Ingresos Financieros </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + GrupoA.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                TotalGeneralBusqueda5 += GrupoA;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Total Ingresos Actividad de Financiamiento</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + TotalGeneralBusqueda5.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Pagos correspondientes a: </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                let grupoB = 0;
                savedSearch = search.load({ id: "customsearch_actividad_operacional_3_3_3" });
                shipdateFilter = search.createFilter({ name: "postingperiod", operator: 'abs', values: params.custbody_ts_le_periodo });
                savedSearch.filters.push(shipdateFilter);
                pagedData = savedSearch.runPaged({ pageSize: 4000 });
                pagedData.pageRanges.forEach(function (pageRange) {
                    let page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        let columns = result.columns;

                        grupoB += result.getValue(columns[0]) ? parseFloat(result.getValue(columns[0])):0;
                        grupoB += result.getValue(columns[1]) ? parseFloat(result.getValue(columns[1])):0;
                    });
                });
                TotalGeneralBusqueda5 += grupoB;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Dividendos</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + grupoB.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";

                var TotalgrupoB = 0;
                savedSearch = search.load({ id: "customsearch_actividad_operacional_3_3_4" });
                shipdateFilter = search.createFilter({ name: "postingperiod", operator: 'abs', values: params.custbody_ts_le_periodo });
                savedSearch.filters.push(shipdateFilter);
                pagedData = savedSearch.runPaged({ pageSize: 4000 });
                pagedData.pageRanges.forEach(function (pageRange) {
                    let page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        let columns = result.columns;

                        TotalgrupoB += result.getValue(columns[0]) ? parseFloat(result.getValue(columns[0])):0;
                        TotalgrupoB += result.getValue(columns[1]) ? parseFloat(result.getValue(columns[1])):0;
                    });
                });
                grupoB += TotalgrupoB;
                TotalGeneralBusqueda5 += grupoB;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Leasing</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + TotalgrupoB.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Total Egresos Actividad de Financiamiento</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + grupoB.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Efectivo y Equivalente de Efectivo por Actividad de Financiamiento</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + TotalGeneralBusqueda5.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Actividad de Inversión </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">Cobranzas correspondientes a: </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                var Total6GrupoA = 0;
                savedSearch = search.load({ id: "customsearch_actividad_operacional_3_5" });
                shipdateFilter = search.createFilter({ name: "postingperiod", operator: 'abs', values: params.custbody_ts_le_periodo });
                savedSearch.filters.push(shipdateFilter);
                pagedData = savedSearch.runPaged({ pageSize: 4000 });
                pagedData.pageRanges.forEach(function (pageRange) {
                    let page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        let columns = result.columns;

                        Total6GrupoA += result.getValue(columns[0]) ? parseFloat(result.getValue(columns[0])):0;
                        Total6GrupoA += result.getValue(columns[1]) ? parseFloat(result.getValue(columns[1])):0;
                    });
                });
                xmlString += "<Row>";
                
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Pre - venta Terreno Trujillo</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + Total6GrupoA.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var Total6Grupob = 0;
                savedSearch = search.load({ id: "customsearch_actividad_operacional_3_5_2" });
                shipdateFilter = search.createFilter({ name: "postingperiod", operator: 'abs', values: params.custbody_ts_le_periodo });
                savedSearch.filters.push(shipdateFilter);
                pagedData = savedSearch.runPaged({ pageSize: 4000 });
                pagedData.pageRanges.forEach(function (pageRange) {
                    let page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        let columns = result.columns;

                        Total6Grupob += result.getValue(columns[0]) ? parseFloat(result.getValue(columns[0])):0;
                        Total6Grupob += result.getValue(columns[1]) ? parseFloat(result.getValue(columns[1])):0;
                    });
                });
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Total Ingresos Actividad de Inversión</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + Total6GrupoA.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Pagos correspondientes a: </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Adquisición Activo Fijo</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + Total6Grupob.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var Total6GrupoC = 0;
                savedSearch = search.load({ id: "customsearch_actividad_operacional_3_5_4" });
                shipdateFilter = search.createFilter({ name: "postingperiod", operator: 'abs', values: params.custbody_ts_le_periodo });
                savedSearch.filters.push(shipdateFilter);
                pagedData = savedSearch.runPaged({ pageSize: 4000 });
                pagedData.pageRanges.forEach(function (pageRange) {
                    let page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        let columns = result.columns;

                        Total6GrupoC += result.getValue(columns[0]) ? parseFloat(result.getValue(columns[0])):0;
                        Total6GrupoC += result.getValue(columns[1]) ? parseFloat(result.getValue(columns[1])):0;
                    });
                });
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Activos Intangibles</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + Total6GrupoC.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Total Egresos Actividad de Inversión</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + (Total6Grupob+Total6GrupoC).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                var TotalGeneralBusqueda6 = Total6Grupob+Total6GrupoC+Total6GrupoA;
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Efectivo y Equivalente de Efectivo por Actividad de Inversión</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + (Total6Grupob+Total6GrupoC+Total6GrupoA).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Diferencia En Cambio </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                var Total6761101 = 0;
                savedSearch = search.load({ id: "customsearch_actividad_operacional_3_5_5" });
                shipdateFilter = search.createFilter({ name: "postingperiod", operator: 'abs', values: params.custbody_ts_le_periodo });
                savedSearch.filters.push(shipdateFilter);
                pagedData = savedSearch.runPaged({ pageSize: 4000 });
                pagedData.pageRanges.forEach(function (pageRange) {
                    let page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        let columns = result.columns;

                        Total6761101 += result.getValue(columns[0]) ? parseFloat(result.getValue(columns[0])):0;
                        
                    });
                });
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String"> Perdida en Diferencia en Cambio</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + Total6761101.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var Total7761101 = 0;
                savedSearch = search.load({ id: "customsearch_actividad_operacional_3_5_3" });
                shipdateFilter = search.createFilter({ name: "postingperiod", operator: 'abs', values: params.custbody_ts_le_periodo });
                savedSearch.filters.push(shipdateFilter);
                pagedData = savedSearch.runPaged({ pageSize: 4000 });
                pagedData.pageRanges.forEach(function (pageRange) {
                    let page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        let columns = result.columns;

                        Total7761101 += result.getValue(columns[0]) ? parseFloat(result.getValue(columns[0])):0;
                        
                    });
                })
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Ganancia en Diferencia en Cambio</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + Total7761101.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                var TotalGeneralBusqueda7 = Total7761101+Total6761101;
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Total Diferencia En Cambio</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + (Total7761101+Total6761101).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Flujo de Caja Total (A) + (B) + (C) </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + (TotalGeneralBusqueda1 + TotalGeneralBusqueda2 + TotalGeneralBusqueda3 + TotalGeneralBusqueda4 +TotalGeneralBusqueda7 + TotalGeneralBusqueda6 +TotalGeneralBusqueda5).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") +  ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s87"><Data ss:Type="String">Saldo Inicial</Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s89"><Data ss:Type="String">' + (total - (TotalGeneralBusqueda1 + TotalGeneralBusqueda2 + TotalGeneralBusqueda3 + TotalGeneralBusqueda4 +TotalGeneralBusqueda7 + TotalGeneralBusqueda6 +TotalGeneralBusqueda5)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";

                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s83"><Data ss:Type="String">Saldo de efectivo y equivalente en efectivo </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s86"><Data ss:Type="String">' + total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "<Row>";
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += '<Cell   ss:StyleID="s88"><Data ss:Type="String"> </Data></Cell>';
                xmlString += "</Row>";
                xmlString += "</Table></Worksheet></Workbook>";

                // Crear archivo en NetSuite
                var excelFile = file.create({
                    name: 'ReportEfectivoDirecto.xls',
                    fileType: file.Type.PLAINTEXT,
                    contents: xmlString,
                    folder: params.salida_folder // Reemplazar por el ID de la carpeta donde quieres guardar el archivo
                });

                // Guardar el archivo en el File Cabinet
                var fileId = excelFile.save();
                const fileAux = file.load({ id: fileId });
                param_update_cola = {
                    idCola: params.idCola,
                    estado: 'FINALIZADO',
                    fechaFin: new Date(),
                    urlArchivo: `${fileAux.url}&_xd=T`,
                    nombreArchivo: fileAux.name
                };

                const statusProcess = updateCola(param_update_cola);
            } catch (error) {
                log.error('main Error', error);
                try {
                    let param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'ERROR',
                        mensaje: error.message,
                        fechaFin: new Date()
                    }
                    updateCola(param_update_cola);
                } catch (error) {
                    log.error('main param_update_cola Error', error);
                }
            }
        }
        const CalcularTotal = () => {
            var calculoTotal = 0;
            let savedSearch = search.load({ id: "customsearch_actividad_operacional" });
            let pagedData = savedSearch.runPaged({ pageSize: 4000 });
            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(function (result) {
                    let columns = result.columns;
                    let number = result.getValue(columns[1]);
                    calculoTotal += parseFloat(number);
                });
            });
            savedSearch = search.load({ id: "customsearch_actividad_operacional_2" });
            pagedData = savedSearch.runPaged({ pageSize: 4000 });
            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(function (result) {
                    let columns = result.columns;
                    let number = result.getValue(columns[0]);
                    calculoTotal += parseFloat(number);
                });
            });
            savedSearch = search.load({ id: "customsearch_actividad_operacional_3" });
            pagedData = savedSearch.runPaged({ pageSize: 4000 });
            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(function (result) {
                    let columns = result.columns;
                    let number = result.getValue(columns[0]);
                    calculoTotal += parseFloat(number);
                });
            });
            savedSearch = search.load({ id: "customsearch_actividad_operacional_3_4" });
            pagedData = savedSearch.runPaged({ pageSize: 4000 });
            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(function (result) {
                    let columns = result.columns;
                    let number = result.getValue(columns[0]);
                    calculoTotal += parseFloat(number);
                });
            });

            savedSearch = search.load({ id: "customsearch_actividad_operacional_3_3_2" });
            pagedData = savedSearch.runPaged({ pageSize: 4000 });
            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(function (result) {
                    let columns = result.columns;
                    let number = result.getValue(columns[0]);
                    calculoTotal += parseFloat(number);
                });
            });
            savedSearch = search.load({ id: "customsearch_actividad_operacional_3_3" });
            pagedData = savedSearch.runPaged({ pageSize: 4000 });
            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(function (result) {
                    let columns = result.columns;
                    let number = result.getValue(columns[0]);
                    calculoTotal += parseFloat(number);
                });
            });
            savedSearch = search.load({ id: "customsearch_actividad_operacional_3_3_3" });
            pagedData = savedSearch.runPaged({ pageSize: 4000 });
            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(function (result) {
                    let columns = result.columns;
                    let number = result.getValue(columns[0]);
                    calculoTotal += parseFloat(number);
                });
            });
            savedSearch = search.load({ id: "customsearch_actividad_operacional_3_3_4" });
            pagedData = savedSearch.runPaged({ pageSize: 4000 });
            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(function (result) {
                    let columns = result.columns;
                    let number = result.getValue(columns[0]);
                    calculoTotal += parseFloat(number);
                });
            });
            return calculoTotal;
        }
        const getRUC = (filterSubsidiary) => {
            try {
                const subLookup = search.lookupFields({
                    type: search.Type.SUBSIDIARY,
                    id: filterSubsidiary,
                    columns: ['taxidnum']
                });
                const ruc = subLookup.taxidnum;
                return ruc;
            } catch (e) {
                log.error({ title: 'getRUC', details: e });
            }
        }
        const consultaSegunda = (custbody_ts_le_periodo, cuenta) => {
            var transactionSearchObj = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["type", "anyof", "Deposit"],
                        "AND",
                        ["account", "anyof", cuenta],
                        "AND",
                        ["custbodysj_actividad_fujo_de_caja", "anyof", "1"],
                        "AND",
                        ["postingperiod", "abs", custbody_ts_le_periodo],
                        "AND",
                        ["custbody_sj_fujo_de_caja_otros_ingreso", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "creditamount",
                            summary: "SUM",
                            label: "Importe (crédito)"
                        })
                    ]
            });
            var entregaRendir = 0;
            transactionSearchObj.run().each(function (result) {
                var total = result.getValue({
                    name: "creditamount",
                    summary: "SUM",
                    label: "Importe (crédito)"
                });
                entregaRendir += total ? parseFloat(total) : 0;
                return true;
            });
            return entregaRendir;
        }
        const consultaCuarta = (custbody_ts_le_periodo, cuenta) => {
            var transactionSearchObj = search.create({
                type: "transaction",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["type", "anyof", "Check"],
                        "AND",
                        ["account", "anyof", cuenta],
                        "AND",
                        ["custbodysj_actividad_fujo_de_caja", "anyof", "1"],
                        "AND",
                        ["postingperiod", "abs", custbody_ts_le_periodo]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "creditamount",
                            summary: "SUM",
                            label: "Importe (crédito)"
                        }),
                        search.createColumn({
                            name: "debitamount",
                            summary: "SUM",
                            label: "Importe (débito)"
                        })
                    ]
            });
            var totalcuenta = 0;
            transactionSearchObj.run().each(function (result) {
                var totalcredito = result.getValue({
                    name: "creditamount",
                    summary: "SUM",
                    label: "Importe (crédito)"
                });
                var totaldebito = result.getValue({
                    name: "debitamount",
                    summary: "SUM",
                    label: "Importe (débito)"
                });
                totalcuenta += totalcredito ? parseFloat(totalcredito) : 0;
                totalcuenta += totaldebito ? parseFloat(totaldebito) : 0;
                return true;
            });
            return totalcuenta;

        }
        const printStyleExcel = () => {
            let strExcel = "";

            strExcel +=
                '<?xml version="1.0" encoding="UTF-8" ?><?mso-application progid="Excel.Sheet"?>';
            //strExcel += '<?mso-application progid="Excel.Sheet"?>';
            strExcel += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
            strExcel += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
            strExcel += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
            strExcel += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
            strExcel += 'xmlns:html="http://www.w3.org/TR/REC-html40">';
            //Estilos de Celdas
            strExcel += "<Styles>";
            strExcel += '<Style ss:ID="Default" ss:Name="Normal">';
            strExcel += '<Alignment ss:Vertical="Bottom"/>';
            strExcel += "<Borders/>";
            strExcel +=
                '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>';
            strExcel += "<Interior/>";
            strExcel += "<NumberFormat/>";
            strExcel += "<Protection/>";
            strExcel += "</Style>";
            strExcel += '<Style ss:ID="s20" ss:Name="Porcentaje">';
            strExcel += '<NumberFormat ss:Format="0%"/>';
            strExcel += "</Style>";
            strExcel += '<Style ss:ID="s63">';
            strExcel += '<Alignment ss:Vertical="Center"/>';
            strExcel += "</Style>";
            strExcel += '<Style ss:ID="s73">';
            strExcel += "<Borders>";
            strExcel +=
                '<Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += "</Style>";
            strExcel += '<Style ss:ID="s75">';
            strExcel += "<Borders>";
            strExcel +=
                '<Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel +=
                '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>';
            strExcel += '<Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>';
            strExcel += '<NumberFormat ss:Format="Percent"/>';
            strExcel += "</Style>";
            strExcel += '<Style ss:ID="s76">';
            strExcel += '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>';
            strExcel +=
                '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Color="#FFFFFF" ss:Bold="1"/>';
            strExcel += '<Interior ss:Color="#002060" ss:Pattern="Solid"/>';
            strExcel += "</Style>";
            strExcel += '<Style ss:ID="s81">';
            strExcel += '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s82">';
            strExcel += '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s83">';
            strExcel += '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Interior ss:Color="#c7c7c7" ss:Pattern="Solid"/>';
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s84">';
            strExcel += '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s85">';
            strExcel += '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s86">';
            strExcel += '<Alignment ss:Horizontal="Right" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s87">';
            strExcel += '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" />';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s88">';
            strExcel += '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" />';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s89">';
            strExcel += '<Alignment ss:Horizontal="Right" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" />';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s90">';
            strExcel += '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s91">';
            strExcel += '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Interior ss:Color="#c7c7c7" ss:Pattern="Solid"/>';
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s92">';
            strExcel += '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";


            strExcel += '<Style ss:ID="s96">';
            strExcel += "<Borders>";
            strExcel +=
                '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += "</Style>";
            strExcel += '<Style ss:ID="s97">';
            strExcel += '<Alignment ss:Vertical="Center"/>';
            strExcel += '<NumberFormat ss:Format="Fixed"/>';
            strExcel += "</Style>";
            strExcel += '<Style ss:ID="s98">';
            strExcel += '<NumberFormat ss:Format="Fixed"/>';
            strExcel += "</Style>";
            strExcel += '<Style ss:ID="s99">';
            strExcel += "<Borders/>";
            strExcel += '<NumberFormat ss:Format="Fixed"/>';
            strExcel += "</Style>";
            strExcel += '<Style ss:ID="s102">';
            strExcel += "<Borders/>";
            strExcel +=
                '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>';
            strExcel += '<Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>';
            strExcel += '<NumberFormat ss:Format="Percent"/>';
            strExcel += "</Style>";
            strExcel += "</Styles>";

            return strExcel;
        };
        const getPeriodName = (custbody_ts_le_periodo) => {
            try {
                const perLookup = search.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: custbody_ts_le_periodo,
                    columns: ['enddate']
                });
                const period = perLookup.enddate;
                return period;
            } catch (e) {
                log.error({ title: 'getPeriodName', details: e });
            }
        }
        const getEmployerID = () => {
            const configpage = config.load({ type: config.Type.COMPANY_INFORMATION });
            const employeeid = configpage.getValue('employerid');
            return employeeid;
        }

        /**
         * 
         * @param {Object} params
         * Estados: (1) PENDIENTE, (2) PROCESANDO, (3) ERROR, (4) FINALIZADO
         */
        const updateCola = (params) => {
            try {
                let cola = record.load({
                    type: 'customrecord_ts_le_cola_ejecuciones',
                    id: params.idCola
                });

                if (params.estado) {
                    cola.setValue({ fieldId: 'custrecord_ts_le_estado_ejecu', value: params.estado });
                }
                if (params.fechaFin) {
                    cola.setValue({ fieldId: 'custrecord_ts_le_cola_fecha_fin', value: params.fechaFin });
                }
                if (params.mensaje) {
                    cola.setValue({ fieldId: 'custrecord_ts_le_estado_mens', value: params.mensaje });
                }
                if (params.urlArchivo) {
                    cola.setValue({ fieldId: 'custrecord_ts_le_url_archivo', value: params.urlArchivo });
                }
                if (params.nombreArchivo) {
                    cola.setValue({ fieldId: 'custrecord_ts_le_nombre_archivo', value: params.nombreArchivo });
                }


                cola.save();
            } catch (error) {
                log.error('updateCola Error', error);
            }
        }

        const getPendientes = () => {
            try {
                let cola = [];

                let searchCola = search.create({
                    type: 'customrecord_ts_le_cola_ejecuciones',
                    filters: [
                        ['isinactive', 'is', 'F'],
                        'AND',
                        ['custrecord_ts_le_estado_ejecu', 'is', 'PENDIENTE'],
                        'AND',
                        ['custrecord_ts_le_cola_script_id', 'is', SCRIPT_ID],
                        'AND',
                        ['custrecord_ts_le_cola_id_deploy', 'is', DEPLOYMENT_ID]
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid' }),
                        search.createColumn({ name: 'custrecord_ts_le_cola_fecha_inicio' }),
                        search.createColumn({ name: 'custrecord_ts_le_cola_param' }),
                    ]

                });

                searchCola.run().each(function (result) {
                    let obj = {
                        id: result.getValue({ name: 'internalid' }),
                        fechaInicio: result.getValue({ name: 'custrecord_ts_le_cola_fecha_inicio' }),
                        param: result.getValue({ name: 'custrecord_ts_le_cola_param' })
                    }

                    cola.push(obj);
                    return true;
                });

                //ordenamos la cola por fecha de inicio 
                cola.sort((a, b) => {
                    return new Date(a.fechaInicio) - new Date(b.fechaInicio);
                });


                return cola;


            } catch (error) {
                log.error('Error', error);
            }
        }

        return { execute }

    });
