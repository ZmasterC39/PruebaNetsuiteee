/**
* @NApiVersion 2.1
*/
define(['N/query', 'N/search', 'N/log', 'N/error', 'N/format'], function (query, search, log, error, format) {

    /**
     * Formatea una fecha a string YYYY-MM-DD para SQL
     * @param {String} dateValue - Fecha a formatear
     * @returns {String} - Fecha formateada
     */
    function formatDateToSQLString(dateValue) {
        try {
            var date;
            if (typeof dateValue === 'string') {
                if (dateValue.includes('/')) {
                    var parts = dateValue.split('/');
                    // Asumiendo formato DD/MM/YYYY o MM/DD/YYYY
                    if (parts.length === 3) {
                        // Si es MM/DD/YYYY (API de búsqueda)
                        if (parts[0].length <= 2 && parts[1].length <= 2) {
                            date = new Date(parts[2], parseInt(parts[0]) - 1, parts[1]);
                        } else {
                            // Si es DD/MM/YYYY (formato usuario)
                            date = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
                        }
                    } else {
                        date = new Date(dateValue);
                    }
                } else {
                    date = new Date(dateValue);
                }
            } else {
                date = new Date(dateValue);
            }

            return date.getFullYear() + '-' +
                padZero(date.getMonth() + 1) + '-' +
                padZero(date.getDate());
        } catch (e) {
            log.error('Error formateando fecha para SQL', e);
            if (typeof dateValue === 'string') {
                return dateValue.replace(/\//g, '-');
            }
            return dateValue.toString();
        }
    }
    /**
     * Función principal para procesar la solicitud POST
     * @param {Object} requestBody - El cuerpo de la solicitud con los parámetros
     * @returns {Object} - Resultados de la consulta
     */
    function post(requestBody) {
        try {
            // Validar parámetros obligatorios
            if (!requestBody.startDate || !requestBody.endDate) {
                throw error.create({
                    name: 'MISSING_REQUIRED_PARAMETER',
                    message: 'Se requieren los parámetros startDate y endDate'
                });
            }

            // Formatear fechas
            var startDate = formatDateString(requestBody.startDate);
            var endDate = formatDateString(requestBody.endDate);
            var showDetails = requestBody.showDetails === true || requestBody.showDetails === 'true';
            
            // Verificamos si se desea usar paginación manual
            var usePagination = requestBody.usePagination === true || requestBody.usePagination === 'true';
            var page = parseInt(requestBody.page || '1');
            var pageSize = parseInt(requestBody.pageSize || '1000');

            // Validar parámetros de paginación si se usa paginación manual
            if (usePagination) {
                if (isNaN(page) || page < 1) page = 1;
                if (isNaN(pageSize) || pageSize < 1 || pageSize > 1000) pageSize = 1000;
            }

            // Obtener el total de órdenes (para paginación)
            var totalCount = getTotalOrdersCount(startDate, endDate);
            log.debug('Total de órdenes encontradas', totalCount);
            
            // Variable para almacenar todas las órdenes
            var allOrders = [];
            
            // Obtener órdenes: con paginación manual o automática
            if (usePagination) {
                // Modo paginación manual: solo obtener la página solicitada
                allOrders = getServiceOrders(startDate, endDate, page, pageSize);
            } else {
                // Modo paginación automática: obtener todas las órdenes en lotes
                var autoPagination = {
                    pageSize: 1000, // Tamaño máximo recomendado por consulta
                    totalPages: Math.ceil(totalCount / 1000)
                };
                
                log.debug('Paginación automática', 'Procesando ' + autoPagination.totalPages + ' páginas');
                
                // Límite de seguridad: no más de 50 páginas (50,000 registros) para evitar problemas de rendimiento
                var maxPages = Math.min(autoPagination.totalPages, 50);
                
                for (var i = 1; i <= maxPages; i++) {
                    log.debug('Procesando página automática', i + ' de ' + maxPages);
                    var pageOrders = getServiceOrders(startDate, endDate, i, autoPagination.pageSize);
                    allOrders = allOrders.concat(pageOrders);
                    
                    // Si llegamos al límite de 50,000 registros, salimos del bucle
                    if (allOrders.length >= 50000) {
                        log.audit('Límite de registros alcanzado', 'Se alcanzó el límite de 50,000 registros');
                        break;
                    }
                }
                
                // Informar si se aplicó un límite
                if (allOrders.length < totalCount) {
                    log.audit('Advertencia de datos', 'Se procesaron ' + allOrders.length + 
                              ' de ' + totalCount + ' órdenes debido a límites de rendimiento');
                }
            }

            // Crear mapa de tasas de cambio por fecha
            var exchangeRates = getExchangeRatesByDates(startDate, endDate);
            log.debug('Tasas de cambio recuperadas', JSON.stringify(exchangeRates));

            // Aplicar tasas de cambio a las órdenes
            applyExchangeRates(allOrders, exchangeRates);

            // Obtener resumen por mes (la consulta SQL directa es más eficiente para esto)
            var monthlySummary = getMonthlySummary(startDate, endDate, exchangeRates);
            
            // Procesar resultados usando la misma lógica del resumen mensual para consistencia
            var results = processResultsFromMonthlySummary(monthlySummary, allOrders, showDetails);
            
            // Añadir información de paginación
            if (usePagination) {
                results.pagination = {
                    page: page,
                    pageSize: pageSize,
                    totalRecords: totalCount,
                    totalPages: Math.ceil(totalCount / pageSize)
                };
            } else {
                results.pagination = {
                    automatic: true,
                    processedRecords: allOrders.length,
                    totalRecords: totalCount,
                    complete: allOrders.length >= totalCount
                };
            }
            
            // Añadir el resumen mensual a la respuesta
            results.monthlySummary = monthlySummary;

            return {
                success: true,
                data: results
            };
        } catch (e) {
            log.error('Error en función post', e);
            return {
                success: false,
                error: e.message || 'Error desconocido'
            };
        }
    }
    
    /**
     * Procesa los resultados basados en el resumen mensual para garantizar consistencia
     * @param {Array} monthlySummary - Resumen mensual calculado
     * @param {Array} orders - Lista de órdenes (para detalles si se requieren)
     * @param {Boolean} showDetails - Indica si mostrar detalles
     * @returns {Object} - Resultados procesados
     */
    function processResultsFromMonthlySummary(monthlySummary, orders, showDetails) {
        // Calcular totales sumando los valores del resumen mensual
        var totalSoles = 0;
        var totalDolares = 0;
        var totalConvertido = 0;
        var totalOrders = 0;
        
        monthlySummary.forEach(function(month) {
            totalSoles += month.totalSoles;
            totalDolares += month.totalDolares;
            totalConvertido += month.totalSolesEnUSD; // Renombrado para claridad
            totalOrders += month.cantidadOrdenes;
        });
        
        // Total general es la suma de dólares originales más soles convertidos a dólares
        var totalGeneral = totalDolares + totalConvertido;
        
        var response = {
            summary: {
                totalSoles: roundNumber(totalSoles),
                totalDolares: roundNumber(totalDolares),
                totalSolesEnUSD: roundNumber(totalConvertido), // Soles convertidos a USD
                totalGeneral: roundNumber(totalGeneral),       // USD + Soles convertidos a USD
                cantidadOrdenes: totalOrders
            }
        };
        
        // Agregar detalles si se requieren
        if (showDetails) {
            response.details = orders.map(function (order) {
                return {
                    id: order.id,
                    tranid: order.tranid,
                    trandate: order.trandate,
                    entity: order.entity,
                    currency: order.currencyText,
                    monto: roundNumber(order.estgrossprofit),
                    montoConvertido: roundNumber(order.convertedAmount || 0),
                    tipoCambio: roundNumber(order.exchangeRate || 0),
                    status: order.status
                };
            });
        }
        
        return response;
    }

    /**
     * Obtiene el conteo total de órdenes para la paginación
     * @param {String} startDate - Fecha de inicio formatada
     * @param {String} endDate - Fecha fin formatada
     * @returns {Number} - Total de registros
     */
    function getTotalOrdersCount(startDate, endDate) {
        // Convertir fechas a formato SQL
        var sqlStartDate = formatDateToSQLString(startDate);
        var sqlEndDate = formatDateToSQLString(endDate);

        // Consulta para obtener el conteo de órdenes
        var sql = `
        SELECT 
            COUNT(*) as total
        FROM 
            transaction so
        WHERE 
            so.type = 'SalesOrd'
            AND so.recordtype = 'salesorder'
            AND BUILTIN.DF(so.status) != 'Cancelled'
            AND so.estgrossprofit > 0
            AND so.entity != 38014
            AND so.trandate BETWEEN TO_DATE('${sqlStartDate}', 'YYYY-MM-DD') AND TO_DATE('${sqlEndDate}', 'YYYY-MM-DD')
        `;

        log.debug('SQL Count Query', sql);
        var result = query.runSuiteQL({ query: sql }).asMappedResults()[0];
        return parseInt(result.total || '0');
    }

    /**
     * Obtiene las órdenes de servicio según el rango de fechas con paginación
     * @param {String} startDate - Fecha de inicio formatada
     * @param {String} endDate - Fecha fin formatada
     * @param {Number} page - Número de página
     * @param {Number} pageSize - Tamaño de página
     * @returns {Array} - Resultados de órdenes
     */
    function getServiceOrders(startDate, endDate, page, pageSize) {
        // Convertir fechas a formato SQL
        var sqlStartDate = formatDateToSQLString(startDate);
        var sqlEndDate = formatDateToSQLString(endDate);

        // Calcular rango para paginación en NetSuite
        var startRow = (page - 1) * pageSize;
        var endRow = startRow + pageSize - 1;

        // NetSuite SuiteQL no soporta LIMIT/OFFSET directamente
        // Usamos el método de ROW_NUMBER() para implementar paginación
        var sql = `
        WITH OrderedResults AS (
            SELECT 
                so.id,
                so.tranid,
                so.trandate,
                so.entity,
                so.status,
                so.currency,
                BUILTIN.DF(so.currency) as currencyname,
                so.estgrossprofit,
                ROW_NUMBER() OVER (ORDER BY so.trandate DESC) as rn
            FROM 
                transaction so
            WHERE 
                so.type = 'SalesOrd'
                AND so.recordtype = 'salesorder'
                AND BUILTIN.DF(so.status) != 'Cancelled'
                AND so.estgrossprofit > 0
                AND so.entity != 38014
                AND so.trandate BETWEEN TO_DATE('${sqlStartDate}', 'YYYY-MM-DD') AND TO_DATE('${sqlEndDate}', 'YYYY-MM-DD')
        )
        SELECT 
            id,
            tranid,
            trandate,
            entity,
            status,
            currency,
            currencyname,
            estgrossprofit
        FROM 
            OrderedResults
        WHERE 
            rn BETWEEN ${startRow + 1} AND ${endRow + 1}
        `;

        log.debug('SQL Query', sql);
        var results = query.runSuiteQL({ query: sql }).asMappedResults();
        log.debug('SQL Results Count', results.length);

        // Convertir a formato uniforme para procesamiento
        var orders = results.map(function (result) {
            return {
                id: result.id,
                tranid: result.tranid,
                trandate: result.trandate,
                entity: result.entity,
                status: result.status,
                currency: result.currency.toString(), // Convertir a string para consistencia
                currencyText: result.currencyname,
                estgrossprofit: parseFloat(result.estgrossprofit || '0')
            };
        });

        return orders;
    }

    /**
     * Obtiene el resumen por mes
     * @param {String} startDate - Fecha inicio
     * @param {String} endDate - Fecha fin
     * @param {Object} exchangeRates - Tasas de cambio
     * @returns {Array} - Resumen por mes
     */
    function getMonthlySummary(startDate, endDate, exchangeRates) {
        // Convertir fechas a formato SQL
        var sqlStartDate = formatDateToSQLString(startDate);
        var sqlEndDate = formatDateToSQLString(endDate);

        // Consulta SQL para agrupar por año y mes
        // Oracle SQL que es compatible con NetSuite
        var sql = `
        SELECT 
            TO_CHAR(so.trandate, 'YYYY') as year,
            TO_CHAR(so.trandate, 'MM') as month,
            TO_CHAR(so.trandate, 'YYYY-MM') as yearmonth,
            so.currency,
            BUILTIN.DF(so.currency) as currencyname,
            SUM(so.estgrossprofit) as total,
            COUNT(*) as count
        FROM 
            transaction so
        WHERE 
            so.type = 'SalesOrd'
            AND so.recordtype = 'salesorder'
            AND BUILTIN.DF(so.status) != 'Cancelled'
            AND so.estgrossprofit > 0
            AND so.entity != 38014
            AND so.trandate BETWEEN TO_DATE('${sqlStartDate}', 'YYYY-MM-DD') AND TO_DATE('${sqlEndDate}', 'YYYY-MM-DD')
        GROUP BY 
            TO_CHAR(so.trandate, 'YYYY'),
            TO_CHAR(so.trandate, 'MM'),
            TO_CHAR(so.trandate, 'YYYY-MM'),
            so.currency,
            BUILTIN.DF(so.currency)
        ORDER BY 
            TO_CHAR(so.trandate, 'YYYY'),
            TO_CHAR(so.trandate, 'MM'),
            so.currency
        `;

        var results = query.runSuiteQL({ query: sql }).asMappedResults();
        log.debug('Monthly Summary Results', results.length);

        // Procesar resultados por mes
        var monthlyData = {};
        var monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        results.forEach(function(result) {
            var yearMonth = result.yearmonth;
            var currency = result.currency.toString();
            var total = parseFloat(result.total || '0');
            var count = parseInt(result.count || '0');
            var monthIndex = parseInt(result.month) - 1;
            var year = parseInt(result.year);
            
            // Inicializar datos del mes si no existen
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                    year: year,
                    month: monthIndex + 1,
                    monthName: monthNames[monthIndex],
                    label: monthNames[monthIndex] + ' ' + year,
                    totalSoles: 0,
                    totalDolares: 0,
                    totalSolesEnUSD: 0, // Renombrado para claridad: Soles convertidos a USD
                    totalGeneral: 0,     // Total combinado: USD originales + Soles convertidos a USD
                    cantidadOrdenes: 0
                };
            }
            
            // Sumar según moneda
            if (currency === '1') { // USD
                monthlyData[yearMonth].totalDolares += total;
            } else if (currency === '5') { // PEN
                monthlyData[yearMonth].totalSoles += total;
                
                // Convertir soles a dólares
                // Usamos la primera fecha del mes para la tasa de cambio
                var monthDate = '01/' + padZero(monthIndex + 1) + '/' + year;
                var rate = findRateForDate(monthDate, exchangeRates);
                
                if (rate && rate > 0) {
                    var solesEnUSD = total / rate;
                    monthlyData[yearMonth].totalSolesEnUSD += solesEnUSD;
                }
            }
            
            // Sumar la cantidad de órdenes
            monthlyData[yearMonth].cantidadOrdenes += count;
        });
        
        // Calcular el total general para cada mes: USD originales + Soles convertidos a USD
        Object.keys(monthlyData).forEach(function(key) {
            monthlyData[key].totalGeneral = monthlyData[key].totalDolares + monthlyData[key].totalSolesEnUSD;
        });
        
        // Convertir a array y redondear valores
        var summary = Object.values(monthlyData).map(function(item) {
            return {
                year: item.year,
                month: item.month,
                monthName: item.monthName,
                label: item.label,
                totalSoles: roundNumber(item.totalSoles),
                totalDolares: roundNumber(item.totalDolares),
                totalSolesEnUSD: roundNumber(item.totalSolesEnUSD),
                totalGeneral: roundNumber(item.totalGeneral),
                cantidadOrdenes: item.cantidadOrdenes
            };
        });
        
        // Ordenar por año y mes
        summary.sort(function(a, b) {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });
        
        return summary;
    }

    /**
     * Encuentra tasa de cambio para una fecha específica
     * @param {String} dateString - Fecha en formato DD/MM/YYYY
     * @param {Object} exchangeRates - Objeto con tasas de cambio
     * @returns {Number} - Tasa de cambio encontrada
     */
    function findRateForDate(dateString, exchangeRates) {
        try {
            var formattedDate = formatDateToString(dateString);
            
            // Intentar obtener tasa exacta para la fecha
            var rate = exchangeRates.ratesByDate[formattedDate];
            
            // Si no existe tasa para la fecha exacta, buscar la más cercana
            if (!rate) {
                rate = findClosestRate(dateString, exchangeRates.allRates);
            }
            
            return rate;
        } catch (e) {
            log.error('Error buscando tasa para fecha', e);
            return 0;
        }
    }

    /**
     * Obtiene tasas de cambio para el rango de fechas
     * @param {String} startDate - Fecha inicio
     * @param {String} endDate - Fecha fin
     * @returns {Object} - Mapa de fechas a tasas de cambio
     */
    function getExchangeRatesByDates(startDate, endDate) {
        var rateSearch = search.create({
            type: 'currencyrate',
            filters: [
                ['basecurrency', 'anyof', '5'], // PEN
                'AND',
                ['transactioncurrency', 'anyof', '1'], // USD
                'AND',
                ['effectivedate', 'onorafter', '01/01/2020'] // Traer un rango amplio de tasas
            ],
            columns: [
                search.createColumn({ name: 'effectivedate', sort: search.Sort.ASC }),
                search.createColumn({ name: 'exchangerate' })
            ]
        });

        var ratesByDate = {};
        var allRates = []; // Para buscar fechas cercanas

        rateSearch.run().each(function (result) {
            var effectiveDate = result.getValue('effectivedate');
            var rate = parseFloat(result.getValue('exchangerate'));

            var formattedDate = formatDateToString(effectiveDate);
            ratesByDate[formattedDate] = rate;

            allRates.push({
                date: new Date(effectiveDate),
                formattedDate: formattedDate,
                rate: rate
            });

            return true;
        });

        // Guardar la lista completa de tasas ordenadas para buscar fechas cercanas
        allRates.sort(function (a, b) {
            return a.date - b.date;
        });

        return {
            ratesByDate: ratesByDate,
            allRates: allRates
        };
    }

    /**
     * Encuentra la tasa de cambio más cercana a una fecha dada
     * @param {Date} targetDate - Fecha objetivo
     * @param {Array} allRates - Lista ordenada de tasas
     * @returns {Number} - Tasa de cambio
     */
    function findClosestRate(targetDate, allRates) {
        if (!allRates || allRates.length === 0) {
            return 0;
        }

        var targetDateObj = new Date(targetDate);

        // Buscar la tasa más cercana
        var closestRate = allRates[0];
        var closestDiff = Math.abs(targetDateObj - closestRate.date);

        for (var i = 1; i < allRates.length; i++) {
            var diff = Math.abs(targetDateObj - allRates[i].date);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestRate = allRates[i];
            }
        }

        log.debug('Buscando tasa para ' + targetDate,
            'Tasa más cercana: ' + closestRate.formattedDate + ' - ' + closestRate.rate);

        return closestRate.rate;
    }

    /**
     * Aplica tasas de cambio a las órdenes
     * @param {Array} orders - Lista de órdenes
     * @param {Object} exchangeRates - Tasas de cambio
     */
    function applyExchangeRates(orders, exchangeRates) {
        orders.forEach(function (order) {
            if (order.currency === '1') { // USD
                order.exchangeRate = 1;
                order.convertedAmount = order.estgrossprofit;
            } else if (order.currency === '5') { // PEN
                var orderDate = formatDateToString(order.trandate);

                // Intentar obtener tasa exacta para la fecha
                var rate = exchangeRates.ratesByDate[orderDate];

                // Si no existe tasa para la fecha exacta, buscar la más cercana
                if (!rate) {
                    rate = findClosestRate(order.trandate, exchangeRates.allRates);
                }

                if (rate && rate > 0) {
                    order.exchangeRate = rate;
                    order.convertedAmount = order.estgrossprofit / rate; // Soles a USD
                } else {
                    log.error('No se encontró tasa para la fecha', order.trandate);
                    order.exchangeRate = 0;
                    order.convertedAmount = 0;
                }
            }
        });
    }

    /**
     * Procesa los resultados y calcula totales
     * @param {Array} orders - Lista de órdenes
     * @param {Boolean} showDetails - Indica si mostrar detalles
     * @returns {Object} - Resultados procesados
     */
    function processResults(orders, showDetails) {
        var totalSoles = 0;
        var totalDolares = 0;
        var totalConvertido = 0;

        orders.forEach(function (order) {
            if (order.currency === '1') { // USD
                totalDolares += order.estgrossprofit;
                totalConvertido += order.estgrossprofit;
            } else if (order.currency === '5') { // PEN
                totalSoles += order.estgrossprofit;
                if (order.convertedAmount) {
                    totalConvertido += order.convertedAmount;
                }
            }
        });

        // Total combinado en dólares (totalConvertido)
        var totalGeneral = totalConvertido;
        
        var response = {
            summary: {
                totalSoles: roundNumber(totalSoles),
                totalDolares: roundNumber(totalDolares),
                totalConvertido: roundNumber(totalConvertido),
                totalGeneral: roundNumber(totalGeneral), // Total combinado
                cantidadOrdenes: orders.length
            }
        };

        if (showDetails) {
            response.details = orders.map(function (order) {
                return {
                    id: order.id,
                    tranid: order.tranid,
                    trandate: order.trandate,
                    entity: order.entity,
                    currency: order.currencyText,
                    monto: roundNumber(order.estgrossprofit),
                    montoConvertido: roundNumber(order.convertedAmount || 0),
                    tipoCambio: roundNumber(order.exchangeRate || 0),
                    status: order.status
                };
            });
        }

        return response;
    }

    /**
     * Formatea una fecha para usar en búsquedas
     * @param {String} dateString - Fecha a formatear
     * @returns {String} - Fecha formateada
     */
    function formatDateString(dateString) {
        try {
            if (!dateString) return '';

            // Si es formato DD/MM/YYYY
            if (dateString.includes('/')) {
                var parts = dateString.split('/');
                if (parts.length === 3) {
                    // Formato para search API (MM/DD/YYYY)
                    return parts[1] + '/' + parts[0] + '/' + parts[2];
                }
            }

            // Otros formatos, convertir a objeto Date y luego formatear
            var date = new Date(dateString);
            return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
        } catch (e) {
            log.error('Error formateando fecha', e);
            return dateString; // Devolver original si hay error
        }
    }

    /**
     * Formatea una fecha a string YYYY-MM-DD
     * @param {String|Date} dateValue - Fecha a formatear
     * @returns {String} - Fecha formateada
     */
    function formatDateToString(dateValue) {
        try {
            var date;
            if (typeof dateValue === 'string') {
                if (dateValue.includes('/')) {
                    var parts = dateValue.split('/');
                    // Asumiendo formato DD/MM/YYYY
                    if (parts.length === 3) {
                        date = new Date(parts[2], parts[1] - 1, parts[0]);
                    } else {
                        date = new Date(dateValue);
                    }
                } else {
                    date = new Date(dateValue);
                }
            } else {
                date = new Date(dateValue);
            }

            return date.getFullYear() + '-' +
                padZero(date.getMonth() + 1) + '-' +
                padZero(date.getDate());
        } catch (e) {
            log.error('Error formateando fecha a string', e);
            return dateValue.toString();
        }
    }

    /**
     * Añade ceros a la izquierda
     * @param {Number} num - Número a formatear
     * @returns {String} - Número formateado
     */
    function padZero(num) {
        return num < 10 ? '0' + num : num.toString();
    }

    /**
     * Redondea un número a 2 decimales
     * @param {Number} num - Número a redondear
     * @returns {Number} - Número redondeado
     */
    function roundNumber(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    return {
        post: post
    };
});