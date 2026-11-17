/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

define(['N/search', 'N/record', 'N/log', 'N/email', 'N/format', 'N/runtime', 'N/task'],
function (search, record, log, email, format, runtime, task) {

    const execute = () => {
        const logLines = [];
        const fechaCorte = obtenerFechaCorte();

        if (!fechaCorte) {
            log.error("Error", "No se pudo obtener la fecha de corte.");
            return;
        }

        log.debug('Fecha corte', fechaCorte);
      
        const userObj = runtime.getCurrentUser();
        const dateFormat = userObj.getPreference({ name: 'DATEFORMAT' });
        //log.debug('Formato de fecha del usuario', dateFormat);

        const ordenes = buscarOrdenes(fechaCorte);
        
        log.debug('Órdenes encontradas', ordenes.length);
        //log.audit('Órdenes encontradas', ordenes );
         
        const script = runtime.getCurrentScript();
                
        for (let result of ordenes) {
            const runCount = parseInt(script.getParameter('custscript_run_count') || '0', 10);
            let remainingUsage = script.getRemainingUsage();
          
             
            if (remainingUsage < 500) // umbral seguro para reagendar
            { 
                log.audit('Uso cercano al límite', `Uso restante: ${remainingUsage}. Reagendando script...`);
                log.audit('runCount', runCount);
              
                if (runCount < 1) {                 
                   // reagendar solo una vez más
                   const nextParams = {
                       custscript_run_count: (runCount + 1).toString()
                   };
    
                   // Guarda progreso parcial si fuera necesario (p.ej. índices procesados)
                   if (logLines.length > 0) {
                      enviarCorreoConLog(logLines);
                   } else {
                      log.debug('Sin órdenes', 'No se procesó ninguna orden al reagendar.');
                   }
              
                   // Reagendar el mismo Scheduled Script
                   try {
                       const status = task.create({
                         taskType: task.TaskType.SCHEDULED_SCRIPT,
                         scriptId: script.id,                       
                         deploymentId: script.deploymentId,
                         params: nextParams
                       }).submit();
                
                    log.audit('Script reagendado', `runCount=${runCount + 1}, Status de reagendado: ${status}`);
                    //log.audit('Reagendado', `runCount=${runCount + 1}, taskId=${taskId}`);
                     
                   } catch (e) {
                      log.error('Error al reagendar script', e);
                   }
    
                   return; // Salir para evitar exceder uso
               }else {   
                  if (logLines.length > 0) {
                      enviarCorreoConLog(logLines);
                   } else {
                      log.debug('Sin órdenes runCount', runCount);
                   }
                  return;
               }   
                  
            }//if 

            
            let salesOrderId = result.id;
            let tranid = result.tranid;
            let resultado = '';
            let cerradas = 0;             
            let fecha = getFechaActual();
            let todasEliminadas = true;
 
            try {
                const workOrderIds = existeRelacionFabricacion(salesOrderId);
              
                for (const woId of workOrderIds) {
                    if (tieneTransacciones(woId)) {
                        todasEliminadas = false;
                        resultado ='OF con relacion: ' + woId;
                        break;
                    }
                }
            
                if (todasEliminadas) {
                    const soRecord = record.load({
                          type: record.Type.SALES_ORDER,
                          id: salesOrderId,
                          isDynamic: false
                    });

                    const lineCount = soRecord.getLineCount({ sublistId: 'item' });
                
                    for (let i = 0; i < lineCount; i++) {
                        const isClosed = soRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'isclosed',
                            line: i
                        });

                        if (!isClosed) {
                           
                            soRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'isclosed',
                                line: i,
                                value: true
                            });
                          
                            cerradas++;
                        }
                    }

                    if (cerradas > 0) {
                        soRecord.save();
                        resultado = 'Cerrada';
                    } else {
                        resultado = 'Ya estaba cerrada';
                    }
                }  

                logLines.push(`${salesOrderId},${tranid},${cerradas},${resultado},${fecha}`);

            } catch (e) {
                resultado = 'Error de guardado: ' + e.message;
                logLines.push(`${salesOrderId},${tranid},${cerradas},${resultado},${fecha}`);
                log.error('Error con orden ' + salesOrderId, e);
            }
 
            log.debug('Proceso', `Orden ${tranid} (${salesOrderId}) - ${resultado} - Líneas cerradas: ${cerradas}`);

            
        }//for
        
      
        if (logLines.length > 0) {
            enviarCorreoConLog(logLines);
        } else {
            log.debug('Sin órdenes', 'No se procesó ninguna orden.');
        }
    };

    const buscarOrdenes = (fechaCorte) => {
        const results = [];

        /*
        const searchObj = search.create({
            type: "transaction",
            filters: [
                ["mainline", "is", "T"],              
                "AND", ["subsidiary", "anyof", "2"],              
                "AND", ["type", "anyof", "SalesOrd"],
                "AND", ["customform", "anyof", "142"],
                "AND", ["status", "anyof", "SalesOrd:B", "SalesOrd:A"],              
                "AND", ["custbody_ec_estado_factura_interna", "noneof", "2", "3"],
                "AND", ["terms", "noneof", "48"],
                "AND", ["amount", "greaterthan", "0.00"],
                "AND", ["voided", "is", "F"],
                "AND", ["billingstatus", "is", "T"],
                "AND", ["activity.type","noneof","Event"], 
                "AND", ["custrecord_ht_ot_orden_servicio.custrecord_ht_ot_estado", "anyof", "7"],
                "AND", ["custbody_ht_factura_directa", "anyof", "@NONE@"],
                "AND", ["name", "noneof", "20995"],
                "AND", ["custbody_ht_os_origenordenservicio", "anyof", "@NONE@"],
                "AND", ["custbody_ht_saldo_inicial", "is", "F"],
                "AND", ["custbody_ht_si_g001", "is", "F"],
                "AND", ["custbody_ht_si_g002", "is", "F"],
                "AND", ["custbody_ht_si_g003", "is", "F"],
                "AND", ["custbody_ht_si_g000", "is", "F"],
                "AND", ["custbody_ht_facturar_a", "noneof", "20995"],
                "AND", ["custbody_ht_os_convenio", "anyof", "@NONE@"],  
                "AND", ["trandate", search.Operator.ONORBEFORE, fechaCorte]  
            ],
            columns: [
                search.createColumn({name: "internalid", label: "ID_OS"}), 
                search.createColumn({name: "trandate", label: "FECHA"}), 
                search.createColumn({name: "tranid", label: "OS"}), 
                search.createColumn({name: 'entity' }),     
                search.createColumn({name: 'entityid', join: 'customer' }),
                search.createColumn({name: 'vatregnumber', join: 'customer' }),
                search.createColumn({name: 'internalid', join: 'customer' }),
                search.createColumn({name: "custbody_ht_so_bien", label: "ID_BIEN"}),
                search.createColumn({
                    name: "altname",
                    join: "CUSTBODY_HT_SO_BIEN",
                    label: "BIEN"
                }), 
                search.createColumn({name: "amount", label: "Importe"}),
                search.createColumn({name: "statusref", label: "ESTADO"}),
                search.createColumn({name: "custbody_ec_estado_factura_agrupada", label: "ESTADO_FACT_AGRUPADA"}),
                search.createColumn({name: "custbody_ec_estado_factura_interna", label: "ESTADO_FACT_INTERNA"})
            ]
        });
        */

        // 1. Cargar la búsqueda guardada
        const searchObj = search.load({
              id: 'customsearch_hu_ec_os_singestion'  
        });

        // 2. Crear filtro de fecha dinámico
        const dateFilter = search.createFilter({
              name: 'trandate',
              operator: search.Operator.ONORBEFORE,
              values: fechaCorte
        });

        // 3. Agregar filtro al search
        const existingFilters = searchObj.filters;
        existingFilters.push(dateFilter);
        searchObj.filters = existingFilters;

        
        // Ejecuta búsqueda en modo paginado (páginas de hasta 1000 registros)
        const pagedData = searchObj.runPaged({ pageSize: 1000 });
        const totalCount = pagedData.count;
        //log.debug('Ordenes encontradas', totalCount);

        // Itera por cada rango de página disponible
        pagedData.pageRanges.forEach(pageRange => {
        const page = pagedData.fetch({ index: pageRange.index });
        page.data.forEach(result => {
              results.push({
                    id: result.getValue({ name: "internalid" }),
                    tranid: result.getValue({ name: "tranid" }),
                    fecha: result.getValue({ name: "trandate" })
                    // agrega otros campos si los necesitas
                });
            });
        });

 
       
        return results;
    }; 

    const enviarCorreoConLog = (logLines) => {
        const headers = ['ID Orden', 'Número', 'Líneas Cerradas', 'Resultado', 'Fecha'];
        const htmlContent = `
            <p>ORDENES CONSIDERADAS: <strong>${logLines.length}</strong></p>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial; font-size: 12px;">
              <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
              <tbody>
                ${logLines.map(line => {
                    const cols = line.split(',');
                    return `<tr>${cols.map(col => `<td>${col}</td>`).join('')}</tr>`;
                }).join('')}
              </tbody>
            </table>
        `;

        email.send({
            author: 449,
            recipients: ["mnarea@carsegsa.com"],
            subject: 'CIERRE DE ORDENES SIN GESTION',
            body: htmlContent
        });

        log.debug('Correo enviado', 'Se envió el resumen de cierre de órdenes.');
    };

    const obtenerFechaCorte = () => {
        try {
            let fechaEcuador = new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" });
            let today = new Date(fechaEcuador);

            // Restar 10 días a la fecha actual
            today.setDate(today.getDate()-11);  // Se ajusta a 10 dias
             
            let dia = today.getDate().toString().padStart(2, '0');
            let mes = (today.getMonth() + 1).toString().padStart(2, '0');
            let anio = today.getFullYear(); 
          
            return `${dia}/${mes}/${anio}`;
        } catch (error) {
            log.error("Error obteniendo fecha", error);
            return false;
        }
    };

 

    const existeRelacionFabricacion = (salesOrderId) => {
        const workOrders = [];

        const searchWO = search.create({
            type: search.Type.WORK_ORDER,
            filters: [
                ['createdfrom', 'anyof', salesOrderId],
                'AND',
                ['mainline', 'is', 'T'],
                'AND',
                ['status', 'noneof', 'WorkOrd:C']
            ],
            columns: ['internalid']
        });

        searchWO.run().each(result => {
            workOrders.push(result.getValue('internalid'));
            return true;
        });

        return workOrders;
    };

    const tieneTransacciones = (workOrderId) => {
        const resultCount = search.create({
            type: search.Type.TRANSACTION,
            filters: [
                ['createdfrom', 'anyof', workOrderId],
                'AND',
                ['mainline', 'is', 'T']
            ],
            columns: ['internalid']
        }).runPaged({ pageSize: 1 });

        return resultCount.count > 0;
    };

    const getFechaActual = () => {
        return format.format({ value: new Date(), type: format.Type.DATETIME });
    };

    return { execute };
});
