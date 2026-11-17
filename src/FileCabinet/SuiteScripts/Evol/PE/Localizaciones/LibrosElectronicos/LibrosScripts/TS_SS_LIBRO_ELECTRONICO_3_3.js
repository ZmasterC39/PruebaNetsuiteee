/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/format", "N/render"],

	(search, record, runtime, log, file, task, config, format, render) => {


		/**
	  * Defines the Scheduled script trigger point.
	  * @param {Object} scriptContext 
	  * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
	  * @since 2015.2
	  */

		const SCRIPT_ID = 'customscript_ts_ss_le_3_3';
		const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_3';
		const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;

		const entityCache = {};
		let processedRows = 0;
		const MAX_ENTITIES_PER_BATCH = 20; // Limitar búsquedas por lote
		const BATCH_SIZE = 500; // Tamaño de lote para procesamiento
		let entitiesProcessed = 0;
		let entitiesCached = 0;

		const execute = (scriptContext) => {
			try {
				let getCola = getPendientes();
				if (getCola.length > 0) {
					let params = getCola[0].param;
					params = JSON.parse(params);
					let idCola = getCola[0].id;

					// Verificar si hay un estado de procesamiento guardado
					let processingState = null;
					let colaRecord = record.load({
						type: 'customrecord_ts_le_cola_ejecuciones',
						id: idCola
					});

					let stateData = colaRecord.getValue('custrecord_ts_le_estado_data');
					if (stateData) {
						try {
							processingState = JSON.parse(stateData);
							log.audit('Reanudando procesamiento', processingState);
						} catch (e) {
							log.error('Error al parsear estado de procesamiento', e);
						}
					}

					params.parametros.idCola = idCola;

					// Procesar este lote
					let result = main(params.parametros, scriptContext, processingState);

					// Si procesamiento no está completo, programar siguiente ejecución
					if (!result.completed) {
						try {
							log.audit('Programando siguiente ejecución', {
								processed: result.processed,
								total: result.total,
								progress: Math.round((result.processed / result.total) * 100) + '%'
							});

							let scriptTask = task.create({
								taskType: TIPO_SCRIPT,
								scriptId: SCRIPT_ID,
								deploymentId: DEPLOYMENT_ID
							});
							let scriptTaskId = scriptTask.submit();
						} catch (error) {
							log.error('Error al programar siguiente ejecución', error);
						}
					} else {
						log.audit('Procesamiento completado', 'Todos los registros procesados correctamente');
					}
				}
			} catch (error) {
				log.error('Error en execute', error);
			}
		}

		const main = (parametros, scriptContext, processingState) => {
			try {
				// Inicializar el estado si es primera ejecución
				if (!processingState) {
					processingState = {
						currentPage: 0,
						pageSize: 5000,   // Procesar 5000 registros por ejecución
						totalRows: 0,
						processedRows: 0,
						results: []
					};
				}

				// Obtener datos básicos
				const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
				const searchId = 'customsearch_pe_detalle_12_3_3';
				let fedIdNumb = '';

				const params = getParams(parametros);

				if (featureSubsidiary) {
					fedIdNumb = getSubsidiaria(params.filterSubsidiary, 'ruc');
				} else {
					fedIdNumb = getEmployerID();
				}

				// Actualizar estado a PROCESANDO en primera ejecución
				if (processingState.currentPage === 0) {
					let param_update_cola = {
						idCola: parametros.idCola,
						estado: 'PROCESANDO',
						mensaje: 'Iniciando procesamiento'
					};
					updateCola(param_update_cola);

					// Obtener recuento total de registros
					processingState.totalRows = getTotalRows(params.filterSubsidiary, params.filterPostingPeriod, searchId, featureSubsidiary);
					log.audit('Total de registros a procesar', processingState.totalRows);
				}

				// Procesar lote actual
				let batchResult = searchBookIncremental(
					params.filterSubsidiary,
					params.filterPostingPeriod,
					searchId,
					featureSubsidiary,
					params.filterAnioPeriod,
					processingState.currentPage,
					processingState.pageSize
				);

				// Acumular resultados
				processingState.results = processingState.results.concat(batchResult.content);
				processingState.processedRows += batchResult.processedCount;
				processingState.currentPage++;

				// Determinar si hemos terminado
				let isCompleted = batchResult.isLastBatch ||
					(processingState.currentPage * processingState.pageSize >= processingState.totalRows);

				// Actualizar estado en la cola
				let progressMessage = `Procesados ${processingState.processedRows} de ${processingState.totalRows} registros (${Math.round((processingState.processedRows / processingState.totalRows) * 100)}%)`;

				let param_update_cola = {
					idCola: parametros.idCola,
					estado: isCompleted ? 'FINALIZADO' : 'PROCESANDO',
					mensaje: isCompleted ? 'Procesamiento completado' : progressMessage,
					processingState: JSON.stringify(processingState)
				};

				// Si hemos terminado, generar el archivo
				if (isCompleted) {
					log.audit('Procesamiento completado, generando archivo', {
						registrosEnResultado: processingState.results.length
					});

					let hasinfo = processingState.results.length > 0 ? '1' : '0';

					if (hasinfo === '1') {
						// Crear el archivo con todos los resultados acumulados
						const createfile = createFile(params, fedIdNumb, hasinfo, processingState.results);

						try {
							let fileAux = file.load({
								id: createfile
							});

							param_update_cola.fechaFin = new Date();
							param_update_cola.urlArchivo = fileAux.url;
							param_update_cola.nombreArchivo = fileAux.name;
						} catch (fileError) {
							log.error('Error al cargar archivo', fileError);
							param_update_cola.mensaje = 'Error al cargar archivo: ' + fileError.message;
						}
					} else {
						param_update_cola.fechaFin = new Date();
						param_update_cola.mensaje = 'No hay registros';
					}
				}

				updateCola(param_update_cola);

				return {
					completed: isCompleted,
					processed: processingState.processedRows,
					total: processingState.totalRows
				};

			} catch (error) {
				log.error('Error en main', error);

				try {
					// Actualizar cola con error
					let param_update_cola = {
						idCola: parametros.idCola,
						estado: 'ERROR',
						mensaje: error.message,
						fechaFin: new Date()
					};
					updateCola(param_update_cola);
				} catch (e) {
					log.error('Error al actualizar cola con error', e);
				}

				return {
					completed: true,  // Marcar como completado para evitar ciclos infinitos
					processed: 0,
					total: 0,
					error: error.message
				};
			}
		}

		const getTotalRows = (filterSubsidiary, filterPostingPeriod, searchId, featureSubsidiary) => {
			try {
				const searchLoad = search.load({
					id: searchId
				});

				let filters = searchLoad.filters;

				if (featureSubsidiary) {
					const filterTwo = search.createFilter({
						name: 'subsidiary',
						operator: search.Operator.ANYOF,
						values: filterSubsidiary
					});
					filters.push(filterTwo);
				}

				// Ejecutar la búsqueda para obtener el recuento total
				return searchLoad.runPaged().count;
			} catch (e) {
				log.error({ title: 'getTotalRows', details: e });
				return 0;
			}
		};

		const searchBookIncremental = (subsidiary, period, searchId, featureSubsidiary, anioperiod, currentPage, pageSize) => {
			let json = [];
			let processedCount = 0;

			try {
				log.audit('Inicio de searchBookIncremental', {
					subsidiary: subsidiary,
					period: period,
					searchId: searchId,
					anioperiod: anioperiod,
					currentPage: currentPage,
					pageSize: pageSize
				});

				const searchLoad = search.load({
					id: searchId
				});

				let filters = searchLoad.filters;

				if (featureSubsidiary) {
					const filterTwo = search.createFilter({
						name: 'subsidiary',
						operator: search.Operator.ANYOF,
						values: subsidiary
					});
					filters.push(filterTwo);
				}

				// Ejecutar la búsqueda paginada
				const pagedData = searchLoad.runPaged({
					pageSize: pageSize
				});

				// Solo procesar la página actual
				if (currentPage < pagedData.pageRanges.length) {
					const currentPageData = pagedData.fetch({
						index: currentPage
					});

					log.audit('Procesando página', {
						pageIndex: currentPage,
						registrosEnPágina: currentPageData.data.length
					});

					currentPageData.data.forEach(function (result) {
						try {
							processedCount++;

							// Capturar y limpiar los valores de cada columna con manejo de valores nulos
							let column01 = result.getValue(searchLoad.columns[0]) || '';
							const column02 = result.getValue(searchLoad.columns[1]) || '';
							let column03 = (result.getValue(searchLoad.columns[2]) || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "");
							const column04 = result.getValue(searchLoad.columns[3]) || '';
							let column05 = result.getValue(searchLoad.columns[4]) || '';
							if (column05 === '- None -') {
								column05 = '00000000000';
							}

							let column06 = (result.getValue(searchLoad.columns[5]) || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "");
							if (column06 === ' ' || column06 === '' || column06 === 'null') {
								column06 = 'VACIO';
							}

							const column07 = result.getValue(searchLoad.columns[6]) || '';

							// Manejo seguro de valores numéricos
							let column08 = '0.00';
							try {
								column08 = parseFloat(result.getValue(searchLoad.columns[7]) || 0).toFixed(2);
							} catch (numError) {
								log.error('Error al procesar número', numError);
							}

							const column09 = result.getValue(searchLoad.columns[8]) || '';
							let column10 = result.getValue(searchLoad.columns[9]) || '';
							let column11 = result.getValue(searchLoad.columns[10]) || '';
							let column12 = result.getValue(searchLoad.columns[11]) || '';
							let column13 = result.getValue(searchLoad.columns[12]) || '0';
							let column14 = result.getValue(searchLoad.columns[13]) || '';
							let column15 = result.getValue(searchLoad.columns[14]) || '';

							// Variables para la entidad
							let nombre = column15;
							let numTrabajador = column14;
							let codigoTipoDocumento = '0';

							// Procesamiento de entidad con caché
							if (column13 !== '0') {
								// Si ya se marcó como error, usar valores por defecto
								if (entityCache[`error_${column13}`]) {
									// Ya sabemos que esta entidad da error, usar valores básicos
								} else {
									// Utilizar la función existente getEntidadFromCache
									let entidad = getEntidadFromCache(column13);
									if (entidad && entidad[0]) {
										if (entidad[2] === false) {
											nombre = entidad[0] || nombre;
										} else if (entidad[2] === true) {
											nombre = entidad[3] || nombre;
										}
										numTrabajador = entidad[1] || numTrabajador;
										codigoTipoDocumento = entidad[4] || '0';
									}
								}
							}

							// Limpiar el nombre para evitar caracteres problemáticos
							nombre = (nombre || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "");

							// Agregar al JSON si cumple el criterio de año
							if (column10 == anioperiod) {
								json.push({
									c1_periodo: column01,
									c2_cuo: column02,
									c3_correlativo: column03,
									c4_tipo_doc_cliente: codigoTipoDocumento,
									c5_nro_doc_cliente: numTrabajador,
									c6_nombres_o_razon_social: nombre,
									c7_fecha_emision: column07,
									c8_monto_cuenta_por_cobrar_cliente: column08,
									c9_estado_op: column09,
									c10_anio: column10,
									c11_factura: column11,
									c12_idInterno: column12
								});
							}
						} catch (rowError) {
							log.error('Error procesando fila', {
								error: rowError,
								rowNumber: processedCount
							});
							// Continuar con la siguiente fila a pesar del error
						}
					});
				}

				// Determinar si esta es la última página
				const isLastBatch = currentPage >= pagedData.pageRanges.length - 1;

				log.audit('Fin de searchBookIncremental', {
					registrosProcesados: processedCount,
					registrosEnJSON: json.length,
					esUltimoProcesamiento: isLastBatch
				});

				return {
					content: json,
					processedCount: processedCount,
					isLastBatch: isLastBatch
				};
			} catch (e) {
				log.error({ title: 'Error en searchBookIncremental', details: e });
				return {
					content: [],
					processedCount: 0,
					isLastBatch: true
				};
			}
		};

		const updateCola = (params) => {
			try {
				let cola = record.load({
					type: 'customrecord_ts_le_cola_ejecuciones',
					id: params.idCola
				});

				// Campos estándar
				if (params.estado) cola.setValue({ fieldId: 'custrecord_ts_le_estado_ejecu', value: params.estado });
				if (params.fechaFin) cola.setValue({ fieldId: 'custrecord_ts_le_cola_fecha_fin', value: params.fechaFin });
				if (params.mensaje) cola.setValue({ fieldId: 'custrecord_ts_le_estado_mens', value: params.mensaje });
				if (params.urlArchivo) cola.setValue({ fieldId: 'custrecord_ts_le_url_archivo', value: params.urlArchivo });
				if (params.nombreArchivo) cola.setValue({ fieldId: 'custrecord_ts_le_nombre_archivo', value: params.nombreArchivo });

				// Campo para estado de procesamiento
				if (params.processingState) cola.setValue({ fieldId: 'custrecord_ts_le_estado_data', value: params.processingState });

				cola.save();
				return "OK";
			} catch (error) {
				log.error('updateCola Error', error);
				return "ERROR";
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

		const getParams = (parametros) => {
			try {

				return {
					filterSubsidiary: parametros.custbody_ts_le_subsidiaria,
					filterPostingPeriod: parametros.custbody_ts_le_periodo,
					filterFormat: parametros.salida_reporte_nombre,
					fileCabinetId: parametros.salida_folder,
					filterAnioPeriod: parametros.custbody_ts_le_anio_contable
				}
			} catch (e) {
				log.error({ title: 'getParams', details: e });
			}
			//log.debug('PARAMETROS', params);
		}


		const getSubsidiaria = (filterSubsidiary, pOpcion) => {
			try {
				const subLookup = search.lookupFields({
					type: search.Type.SUBSIDIARY,
					id: filterSubsidiary,
					columns: ['taxidnum', 'legalname']
				});

				if (pOpcion === 'ruc') {
					return subLookup.taxidnum;
				} else if (pOpcion === 'razonSocial') {
					return subLookup.legalname;
				} else {
					return '-';
				}
			} catch (e) {
				log.error({ title: 'getSubsidiaria', details: e });
			}
		}


		const getEmployerID = () => {
			const configpage = config.load({ type: config.Type.COMPANY_INFORMATION });
			const employeeid = configpage.getValue('employerid');
			return employeeid;
		}


		const createRecord = (logrecodId, featureSubsidiary, filterSubsidiary, filterPostingPeriod) => {
			try {
				const recordlog = record.create({ type: logrecodId });
				if (featureSubsidiary) {
					recordlog.setValue({ fieldId: 'custrecord_pe_subsidiary_log', value: filterSubsidiary });
				}
				recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: null }); //filterPostingPeriod - JCA
				recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
				recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
				recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Inventario y Balance 3.3' });
				const recordlogid = recordlog.save();

				return { recordlogid: recordlogid, irecord: record };
			} catch (e) {
				log.error({ title: 'createRecord', details: e });
			}
		}


		const searchBook = (subsidiary, period, searchId, featureSubsidiary, anioperiod) => {
			let json = [];
			let processedRows = 0;
			let entitiesProcessed = 0;
			let entitiesCached = 0;
			let entitiesError = 0;

			try {
				log.audit('Inicio de searchBook', {
					subsidiary: subsidiary,
					period: period,
					searchId: searchId,
					anioperiod: anioperiod
				});

				const searchLoad = search.load({
					id: searchId
				});

				let filters = searchLoad.filters;

				if (featureSubsidiary) {
					const filterTwo = search.createFilter({
						name: 'subsidiary',
						operator: search.Operator.ANYOF,
						values: subsidiary
					});
					filters.push(filterTwo);
				}

				// Usar SearchPagedData para procesar los resultados página por página
				const pagedData = searchLoad.runPaged({
					pageSize: 1000 // Procesar 1000 registros por vez
				});

				const searchResultCount = pagedData.count;
				log.audit('Total de registros a procesar', searchResultCount);

				if (searchResultCount === 0) {
					return { thereisinfo: 0, content: [] };
				}

				// Procesar página por página
				pagedData.pageRanges.forEach(function (pageRange) {
					const currentPage = pagedData.fetch({ index: pageRange.index });
					log.audit('Procesando página', {
						pageIndex: pageRange.index,
						registrosEnPágina: currentPage.data.length
					});

					currentPage.data.forEach(function (result) {
						try {
							processedRows++;

							// Log de progreso cada 1000 registros
							if (processedRows % 1000 === 0) {
								log.audit('Progreso', {
									registrosProcesados: processedRows,
									entidadesProcesadas: entitiesProcessed,
									entidadesEnCache: entitiesCached,
									entidadesError: entitiesError,
									tamañoJSON: json.length
								});
							}

							// Capturar y limpiar los valores de cada columna con manejo de valores nulos
							let column01 = result.getValue(searchLoad.columns[0]) || '';
							const column02 = result.getValue(searchLoad.columns[1]) || '';
							let column03 = (result.getValue(searchLoad.columns[2]) || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "");
							const column04 = result.getValue(searchLoad.columns[3]) || '';
							let column05 = result.getValue(searchLoad.columns[4]) || '';
							if (column05 === '- None -') {
								column05 = '00000000000';
							}

							let column06 = (result.getValue(searchLoad.columns[5]) || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "");
							if (column06 === ' ' || column06 === '' || column06 === 'null') {
								column06 = 'VACIO';
							}

							const column07 = result.getValue(searchLoad.columns[6]) || '';

							// Manejo seguro de valores numéricos
							let column08 = '0.00';
							try {
								column08 = parseFloat(result.getValue(searchLoad.columns[7]) || 0).toFixed(2);
							} catch (numError) {
								log.error('Error al procesar número', numError);
							}

							const column09 = result.getValue(searchLoad.columns[8]) || '';
							let column10 = result.getValue(searchLoad.columns[9]) || '';
							let column11 = result.getValue(searchLoad.columns[10]) || '';
							let column12 = result.getValue(searchLoad.columns[11]) || '';
							let column13 = result.getValue(searchLoad.columns[12]) || '0';
							let column14 = result.getValue(searchLoad.columns[13]) || '';
							let column15 = result.getValue(searchLoad.columns[14]) || '';

							// Variables para la entidad
							let nombre = column15;
							let numTrabajador = column14;
							let codigoTipoDocumento = '0';

							// Procesamiento de entidad con caché y manejo de errores
							if (column13 !== '0') {
								// Si ya está marcado como error, usar valores por defecto
								if (entityCache[`error_${column13}`]) {
									// Ya sabemos que esta entidad da error, usar valores básicos
								} else {
									// Buscar en caché primero
									const customerCacheKey = `customer_${column13}`;
									const vendorCacheKey = `vendor_${column13}`;
									const employeeCacheKey = `employee_${column13}`;

									let entidad = null;
									let entidadTipo = null;

									// Verificar si ya existe en caché
									if (entityCache[customerCacheKey]) {
										entidad = entityCache[customerCacheKey];
										entidadTipo = 'customer';
										entitiesCached++;
									} else if (entityCache[vendorCacheKey]) {
										entidad = entityCache[vendorCacheKey];
										entidadTipo = 'vendor';
										entitiesCached++;
									} else if (entityCache[employeeCacheKey]) {
										entidad = entityCache[employeeCacheKey];
										entidadTipo = 'employee';
										entitiesCached++;
									} else {
										// No está en caché, intentar obtener con manejo de errores
										entitiesProcessed++;

										try {
											entidad = getCustomer(column13);
											entidadTipo = 'customer';
										} catch (customerError) {
											log.error('Error al obtener cliente ' + column13, customerError);
											// Marcar como error para no intentarlo de nuevo
											entityCache[`error_${column13}`] = true;
											entitiesError++;
										}

										if (!entidad || entidad[0] === null) {
											try {
												entidad = getProveedor(column13);
												entidadTipo = 'vendor';
											} catch (vendorError) {
												log.error('Error al obtener proveedor ' + column13, vendorError);
												// Marcar como error para no intentarlo de nuevo
												entityCache[`error_${column13}`] = true;
												entitiesError++;
											}
										}

										if (!entidad || entidad[0] === null) {
											try {
												entidad = getemployee(column13);
												entidadTipo = 'employee';
											} catch (employeeError) {
												log.error('Error al obtener empleado ' + column13, employeeError);
												// Marcar como error para no intentarlo de nuevo
												entityCache[`error_${column13}`] = true;
												entitiesError++;
											}
										}
									}

									// Si se encontró la entidad, procesar los datos
									if (entidad && Array.isArray(entidad)) {
										let company = entidad[0] || '';
										numTrabajador = entidad[1] || numTrabajador;
										let isPerson = entidad[2];
										let altname = entidad[3] || '';
										codigoTipoDocumento = entidad[4] || '0';

										// Determinar nombre según tipo de persona
										if (isPerson === false) {
											nombre = company || nombre;
										} else if (isPerson === true) {
											nombre = altname || nombre;
										}
									}
								}
							}

							// Limpiar el nombre para evitar caracteres problemáticos
							nombre = (nombre || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "");

							// Agregar al JSON si cumple el criterio de año
							if (column10 == anioperiod) {
								json.push({
									c1_periodo: column01,
									c2_cuo: column02,
									c3_correlativo: column03,
									c4_tipo_doc_cliente: codigoTipoDocumento,
									c5_nro_doc_cliente: numTrabajador,
									c6_nombres_o_razon_social: nombre,
									c7_fecha_emision: column07,
									c8_monto_cuenta_por_cobrar_cliente: column08,
									c9_estado_op: column09,
									c10_anio: column10,
									c11_factura: column11,
									c12_idInterno: column12
								});
							}
						} catch (rowError) {
							log.error('Error procesando fila', {
								error: rowError,
								rowNumber: processedRows
							});
							// Continuar con la siguiente fila a pesar del error
						}
					});
				});

				// Log de resumen final
				log.audit('Fin de searchBook', {
					registrosProcesados: processedRows,
					entidadesProcesadas: entitiesProcessed,
					entidadesEnCache: entitiesCached,
					entidadesError: entitiesError,
					registrosEnJSON: json.length,
					tamañoCaché: Object.keys(entityCache).length
				});

				return {
					thereisinfo: json.length > 0 ? 1 : 0,
					content: json
				};
			} catch (e) {
				log.error({ title: 'Error en searchBook', details: e });

				// Log de diagnóstico en caso de error
				log.audit('Estado en momento de error', {
					registrosProcesados: processedRows,
					entidadesProcesadas: entitiesProcessed,
					entidadesEnCache: entitiesCached,
					entidadesError: entitiesError,
					registrosEnJSON: json.length
				});

				// Intentar retornar los datos que se hayan procesado hasta el momento
				return {
					thereisinfo: json.length > 0 ? 1 : 0,
					content: json
				};
			}
		}

		const processEntitiesBatch = (idsToProcess) => {
			try {
				if (!idsToProcess || idsToProcess.length === 0) {
					return;
				}

				// Agrupar IDs por tipo: clientes, proveedores, empleados
				let customerIds = [];
				let vendorIds = [];
				let employeeIds = [];

				// Primero, identificar qué tipo es cada ID
				for (let id of idsToProcess) {
					if (entityCache[id]) continue; // Ya procesado

					// Verificar si existe como cliente
					try {
						let exists = search.lookupFields({
							type: 'customer',
							id: id,
							columns: ['internalid']
						});
						if (exists && exists.internalid) {
							customerIds.push(id);
							continue;
						}
					} catch (e) {
						// No es cliente - continuar con próxima comprobación
					}

					// Verificar si existe como proveedor
					try {
						let exists = search.lookupFields({
							type: 'vendor',
							id: id,
							columns: ['internalid']
						});
						if (exists && exists.internalid) {
							vendorIds.push(id);
							continue;
						}
					} catch (e) {
						// No es proveedor - continuar con empleado
					}

					// Por descarte, comprobar como empleado
					try {
						let exists = search.lookupFields({
							type: 'employee',
							id: id,
							columns: ['internalid']
						});
						if (exists && exists.internalid) {
							employeeIds.push(id);
						}
					} catch (e) {
						// No es empleado - ignorar
						entityCache[id] = {
							tipo: 'unknown',
							company: '',
							vatregnumber: '',
							isPerson: false,
							altname: '',
							doctype: '0'
						};
					}
				}

				// Procesar clientes en lote si hay
				if (customerIds.length > 0) {
					processCustomers(customerIds);
				}

				// Procesar proveedores en lote si hay
				if (vendorIds.length > 0) {
					processVendors(vendorIds);
				}

				// Procesar empleados en lote si hay
				if (employeeIds.length > 0) {
					processEmployees(employeeIds);
				}
			} catch (error) {
				log.error('Error en processEntitiesBatch', error);
			}
		};

		const processCustomers = (ids) => {
			try {
				// Crear una búsqueda para obtener múltiples clientes a la vez
				const customerSearch = search.create({
					type: 'customer',
					filters: [['internalid', 'anyof', ids]],
					columns: [
						'internalid', 'companyname', 'vatregnumber', 'isperson', 'altname',
						{ name: 'custentity_pe_code_document_type', join: null }
					]
				});

				customerSearch.run().each(function (result) {
					const id = result.getValue('internalid');
					entityCache[id] = {
						tipo: 'customer',
						company: result.getValue('companyname') || '',
						vatregnumber: result.getValue('vatregnumber') || '',
						isPerson: result.getValue('isperson') === 'T',
						altname: result.getValue('altname') || '',
						doctype: result.getValue({ name: 'custentity_pe_code_document_type' }) || '0'
					};
					return true;
				});

				// Marcar como procesados los IDs que no se encontraron
				ids.forEach(id => {
					if (!entityCache[id]) {
						entityCache[id] = {
							tipo: 'unknown',
							company: '',
							vatregnumber: '',
							isPerson: false,
							altname: '',
							doctype: '0'
						};
					}
				});
			} catch (error) {
				log.error('Error en processCustomers', error);
			}
		};

		const processVendors = (ids) => {
			try {
				const vendorSearch = search.create({
					type: 'vendor',
					filters: [['internalid', 'anyof', ids]],
					columns: [
						'internalid', 'companyname', 'vatregnumber', 'isperson', 'altname',
						{ name: 'custentity_pe_code_document_type', join: null }
					]
				});

				vendorSearch.run().each(function (result) {
					const id = result.getValue('internalid');
					entityCache[id] = {
						tipo: 'vendor',
						company: result.getValue('companyname') || '',
						vatregnumber: result.getValue('vatregnumber') || '',
						isPerson: result.getValue('isperson') === 'T',
						altname: result.getValue('altname') || '',
						doctype: result.getValue({ name: 'custentity_pe_code_document_type' }) || '0'
					};
					return true;
				});

				// Marcar como procesados los IDs que no se encontraron
				ids.forEach(id => {
					if (!entityCache[id]) {
						entityCache[id] = {
							tipo: 'unknown',
							company: '',
							vatregnumber: '',
							isPerson: false,
							altname: '',
							doctype: '0'
						};
					}
				});
			} catch (error) {
				log.error('Error en processVendors', error);
			}
		};

		const processEmployees = (ids) => {
			try {
				const employeeSearch = search.create({
					type: 'employee',
					filters: [['internalid', 'anyof', ids]],
					columns: [
						'internalid', 'altname',
						{ name: 'custentity_pe_document_number', join: null },
						{ name: 'custentity_pe_code_document_type', join: null }
					]
				});

				employeeSearch.run().each(function (result) {
					const id = result.getValue('internalid');
					entityCache[id] = {
						tipo: 'employee',
						company: '',
						vatregnumber: result.getValue({ name: 'custentity_pe_document_number' }) || '',
						isPerson: true,
						altname: result.getValue('altname') || '',
						doctype: result.getValue({ name: 'custentity_pe_code_document_type' }) || '0'
					};
					return true;
				});

				// Marcar como procesados los IDs que no se encontraron
				ids.forEach(id => {
					if (!entityCache[id]) {
						entityCache[id] = {
							tipo: 'unknown',
							company: '',
							vatregnumber: '',
							isPerson: false,
							altname: '',
							doctype: '0'
						};
					}
				});
			} catch (error) {
				log.error('Error en processEmployees', error);
			}
		};

		// Función para obtener info de entidad desde el caché
		const getEntidadFromCache = (id) => {
			try {
				id = String(id);
				if (!id || id === '0') {
					return [null, null, null, null, null];
				}

				// Si no está en caché, marcar para procesamiento posterior
				if (!entityCache[id]) {
					entityCache[id] = null; // Marcarlo temporalmente
					return [null, null, null, null, null];
				}

				// Si está marcado pero aún no procesado (null)
				if (entityCache[id] === null) {
					return [null, null, null, null, null];
				}

				// Si está en caché y procesado, devolver los datos
				const entity = entityCache[id];
				return [
					entity.company,
					entity.vatregnumber,
					entity.isPerson,
					entity.altname,
					entity.doctype
				];
			} catch (e) {
				log.error('Error en getEntidadFromCache', e);
				return [null, null, null, null, null];
			}
		};


		const structureBody = (searchResult) => {
			let contentReport = '';
			try {
				for (let i in searchResult) {
					contentReport =
						contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cuo + '|' + searchResult[i].c3_correlativo + '|' +
						searchResult[i].c4_tipo_doc_cliente + '|' + searchResult[i].c5_nro_doc_cliente + '|' + searchResult[i].c6_nombres_o_razon_social + '|' +
						searchResult[i].c7_fecha_emision + '|' + searchResult[i].c8_monto_cuenta_por_cobrar_cliente + '|' + searchResult[i].c9_estado_op + '|' +
						'|\n';
				}

				return contentReport;
			} catch (e) {
				log.error({ title: 'structureBody', details: e });
			}
		}


		const createFile = (params, fedIdNumb, hasinfo, transactionJSON) => {
			let typeformat;
			const header = '1 Periodo|2 CUO|3 Correlativo|4 Tipo de Documento de Identidad del cliente|5 Numero de Documento de Identidad del cliente|6 Apellidos y Nombres, Denominación o Razon Social del cliente|' +
				'7 Fecha de Emision|8 Monto de cada cuenta por cobrar del cliente|9 Indica el estado de la operacion|10 Cód. Cuenta Contable|\n';
			try {

				let periodname = params.filterAnioPeriod;

				let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231030300' + '07' + '1' + hasinfo + '11';//_' + recordlogid;
				let structuregbody = structureBody(transactionJSON);
				let jsonAxiliar = getJsonData(transactionJSON, params);
				jsonAxiliar = setSpecialChars(jsonAxiliar);

				if (params.filterFormat == 'CSV') {
					nameReportGenerated = nameReportGenerated + '.csv';
					structuregbody = header + structuregbody;
					structuregbody = structuregbody.replace(/[,]/gi, ' ');
					structuregbody = structuregbody.replace(/[|]/gi, ',');
					typeformat = file.Type.CSV;
				} else if (params.filterFormat == 'TXT') {
					nameReportGenerated = nameReportGenerated + '.txt';
					typeformat = file.Type.PLAINTEXT;
				} else if (params.filterFormat == 'PDF') {
					log.debug('jsonAxiliar YWH', jsonAxiliar);
					// Generar el contenido PDF
					var renderer = render.create();
					renderer.templateContent = getTemplate(); //==> Cargar la plantilla FTL desde el File Cabinet

					// Pasar datos al template
					log.debug('setSpecialChars(jsonAxiliar)', setSpecialChars(jsonAxiliar));
					renderer.addCustomDataSource({
						format: render.DataSource.OBJECT,
						alias: 'input',
						data: {
							data: JSON.stringify(jsonAxiliar)
						}
					});
					var pdfFile = renderer.renderAsPdf();

					// **************************************************************************************** //

					// Guardar el PDF en el File Cabinet
					pdfFile.name = nameReportGenerated + '.pdf';
					pdfFile.folder = params.fileCabinetId;
					let pdfFileId = pdfFile.save();

					let auxFile = file.load({ id: pdfFileId });
					var urlfile = auxFile.url;

					return pdfFileId;
				}
				const fileObj = file.create({
					name: nameReportGenerated,
					fileType: typeformat,
					contents: structuregbody,
					encoding: file.Encoding.UTF8,
					folder: params.fileCabinetId,
					isOnline: true
				});
				const fileId = fileObj.save();
				return fileId;
			} catch (e) {
				log.error({ title: 'createFile', details: e });
			}
		}

		const getTemplate = () => {
			var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_3.ftl");
			return aux.getContents();
		};

		const getJsonData = (transactions, params) => {
			try {
				let userTemp = runtime.getCurrentUser(),
					useID = userTemp.id,
					jsonTransacion = {},
					jsonTransacionvine = new Array(),
					totalMonto = 0;

				var cantidadLinea = 0;
				var montoviene = 0;
				var cantidadFor = 0;
				var cantidadAnterio = 0;
				log.debug('transactions', transactions);
				for (var k in transactions) {
					let IDD = transactions[k].c12_idInterno;
					cantidadLinea = cantidadLinea + (1 * 4.5) + 1;
					//if (!jsonTransacion[IDD]) {
					jsonTransacion[IDD] = {
						number: cantidadFor,
						idInterno: transactions[k].c12_idInterno,
						periodoTexto: transactions[k].c1_periodo,
						cuo: transactions[k].c2_cuo,
						correlativo: transactions[k].c3_correlativo,
						tipoDocumento: transactions[k].c4_tipo_doc_cliente,
						numeroDocumento: transactions[k].c5_nro_doc_cliente,
						razonSocial: transactions[k].c6_nombres_o_razon_social,
						fechaEmision: transactions[k].c7_fecha_emision,
						monto: formatearNumeroConComas(Number(transactions[k].c8_monto_cuenta_por_cobrar_cliente).toFixed(2)),
						indicadorEstado: transactions[k].c9_estado_op,
						anio: transactions[k].c10_anio,
						factura: transactions[k].c11_factura
					}
					cantidadFor = cantidadFor + 1;
					totalMonto = totalMonto + Number(transactions[k].c8_monto_cuenta_por_cobrar_cliente);

					//}
					if (cantidadLinea <= 121) {
						montoviene = Number(montoviene) + Number(transactions[k].c8_monto_cuenta_por_cobrar_cliente);
						cantidadAnterio = cantidadLinea;
					} else {
						jsonTransacionvine.push({
							montoviene: formatearNumeroConComas(montoviene.toFixed(2)),
							cantidadFor: cantidadFor - 1
						});

						cantidadLinea = 0;
						cantidadLinea = cantidadLinea + (1 * 4.5) + 1;
						montoviene = Number(montoviene) + Number(transactions[k].c8_monto_cuenta_por_cobrar_cliente);
					}
				}

				let jsonAxiliar = {
					"cabecera": {
						"Anio": params.filterAnioPeriod,
						"ruc": getSubsidiaria(params.filterSubsidiary, 'ruc'),
						"razonSocial": getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase()
					},
					"total": {
						"totalMonto": formatearNumeroConComas(totalMonto.toFixed(2))
					},
					"movements": jsonTransacion,
					"jsonTransacionvine": jsonTransacionvine

				};

				return jsonAxiliar;
			} catch (error) {
				log.error('getJsonData()', error.message);
			}
		}

		const setSpecialChars = (obj) => {
			for (const key in obj) {
				if (typeof obj[key] === 'string') {
					obj[key] = obj[key].replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;")
						.replace(/"/g, "&quot;");
				} else if (typeof obj[key] === 'object' && obj[key] !== null) {
					setSpecialChars(obj[key]); // Llamada recursiva para objetos anidados
				}
			}
			return obj;
		};

		function formatearNumeroConComas(numero) {
			// Convierte el número a una cadena
			const numeroString = numero.toString();

			// Divide la cadena en parte entera y parte decimal (si existe)
			const partes = numeroString.split('.');
			const parteEntera = partes[0];
			const parteDecimal = partes.length > 1 ? '.' + partes[1] : '';

			// Agrega comas para separar los miles en la parte entera
			const parteEnteraFormateada = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

			// Combina la parte entera formateada y la parte decimal (si existe)
			const numeroFormateado = parteEnteraFormateada + parteDecimal;

			return numeroFormateado;
		}

		const setRecord = (irecord, recordlogid, fileid, logrecodId) => {
			try {
				const fileAux = file.load({ id: fileid });
				irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_file_cabinet_log: fileAux.url } });
				irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: 'Generated' } });
				irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: fileAux.name } });
				return recordlogid;
			} catch (e) {
				log.error({ title: 'setRecord', details: e });
			}
		}


		const setError = (irecord, logrecodId, recordlogid, error) => {
			try {
				irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: 'ERROR: ' + error } });
			} catch (e) {
				log.error({ title: 'setError', details: e });
			}
		}


		const setVoid = (irecord, logrecodId, recordlogid, estado) => {
			try {
				const estado = 'No hay registros';
				const report = 'Proceso finalizado';
				irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: estado } });
				irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: report } });
			} catch (e) {
				log.error({ title: 'setVoid', details: e });
			}
		}


		const getPeriodName = (filterPostingPeriod) => {
			try {
				const perLookup = search.lookupFields({
					type: search.Type.ACCOUNTING_PERIOD,
					id: filterPostingPeriod,
					columns: ['periodname']
				});
				const period = perLookup.periodname;
				return period;
			} catch (e) {
				log.error({ title: 'getPeriodName', details: e });
			}
		}

		function CompletarCero(tamano, valor) {
			var strValor = valor + '';
			var lengthStrValor = strValor.length;
			var nuevoValor = valor + '';

			if (lengthStrValor <= tamano) {
				if (tamano != lengthStrValor) {
					for (var i = lengthStrValor; i < tamano; i++) {
						nuevoValor = '0' + nuevoValor;
					}
				}
				return nuevoValor;
			} else {
				return nuevoValor.substring(0, tamano);
			}
		}


		const retornaPeriodoString = (campoRegistro01) => {
			if (campoRegistro01 >= '') {
				var valorAnio = campoRegistro01.split(' ')[1];
				var valorMes = campoRegistro01.split(' ')[0];
				if (valorMes.indexOf('Jan') >= 0 || valorMes.indexOf('Ene') >= 0) {
					valorMes = '01';
				} else {
					if (valorMes.indexOf('Feb') >= 0) {
						valorMes = '02';
					} else {
						if (valorMes.indexOf('Mar') >= 0) {
							valorMes = '03';
						} else {
							if (valorMes.indexOf('Abr') >= 0 || valorMes.indexOf('Apr') >= 0) {
								valorMes = '04';
							} else {
								if (valorMes.indexOf('May') >= 0) {
									valorMes = '05';
								} else {
									if (valorMes.indexOf('Jun') >= 0) {
										valorMes = '06';
									} else {
										if (valorMes.indexOf('Jul') >= 0) {
											valorMes = '07';
										} else {
											if (valorMes.indexOf('Aug') >= 0 || valorMes.indexOf('Ago') >= 0) {
												valorMes = '08';
											} else {
												if (valorMes.indexOf('Set') >= 0 || valorMes.indexOf('Sep') >= 0) {
													valorMes = '09';
												} else {
													if (valorMes.indexOf('Oct') >= 0) {
														valorMes = '10';
													} else {
														if (valorMes.indexOf('Nov') >= 0) {
															valorMes = '11';
														} else {
															valorMes = '12';
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
				campoRegistro01 = valorAnio + valorMes + ultimoDia;
			}
			return campoRegistro01;
		}

		const retornaPeriodoStringForView = (campoRegistro01) => {
			if (campoRegistro01 >= '') {
				var valorAnio = campoRegistro01.split(' ')[1];
				var valorMes = campoRegistro01.split(' ')[0];
				if (valorMes.indexOf('Jan') >= 0 || valorMes.indexOf('Ene') >= 0) {
					valorMes = '01';
				} else {
					if (valorMes.indexOf('Feb') >= 0) {
						valorMes = '02';
					} else {
						if (valorMes.indexOf('Mar') >= 0) {
							valorMes = '03';
						} else {
							if (valorMes.indexOf('Abr') >= 0 || valorMes.indexOf('Apr') >= 0) {
								valorMes = '04';
							} else {
								if (valorMes.indexOf('May') >= 0) {
									valorMes = '05';
								} else {
									if (valorMes.indexOf('Jun') >= 0) {
										valorMes = '06';
									} else {
										if (valorMes.indexOf('Jul') >= 0) {
											valorMes = '07';
										} else {
											if (valorMes.indexOf('Aug') >= 0 || valorMes.indexOf('Ago') >= 0) {
												valorMes = '08';
											} else {
												if (valorMes.indexOf('Set') >= 0 || valorMes.indexOf('Sep') >= 0) {
													valorMes = '09';
												} else {
													if (valorMes.indexOf('Oct') >= 0) {
														valorMes = '10';
													} else {
														if (valorMes.indexOf('Nov') >= 0) {
															valorMes = '11';
														} else {
															valorMes = '12';
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
				//campoRegistro01 = valorAnio + valorMes + '30';
				campoRegistro01 = {
					valorAnio: valorAnio,
					valorMes: valorMes
				}
			}
			return campoRegistro01;
		}

		const numberWithCommas = (x) => {
			x = x.toString();
			var pattern = /(-?\d+)(\d{3})/;
			while (pattern.test(x))
				x = x.replace(pattern, "$1,$2");
			return x;
		}

		const func = (valorAnio, valorMes) => {
			// var date = new Date();
			var ultimoDia = new Date(valorAnio, valorMes, 0).getDate();
			var parse = String(valorAnio) + String(valorMes) + String(ultimoDia)
			return parse
		}

		const getCustomer = (id) => {
			try {
				id = Number(id) || 0;

				// Si ya existe en el caché, retornar inmediatamente
				if (entityCache[`customer_${id}`]) {
					return entityCache[`customer_${id}`];
				}

				var arr = [null, null, null, null, null];

				if (id > 0) {
					let customer = search.lookupFields({
						type: "customer",
						id: id,
						columns: [
							"companyname", 'vatregnumber', 'isperson', 'altname', 'custentity_pe_code_document_type'
						]
					});

					arr[0] = customer.companyname || '';
					arr[1] = customer.vatregnumber || '';
					arr[2] = customer.isperson === 'T';
					arr[3] = customer.altname || '';
					arr[4] = customer.custentity_pe_code_document_type || '0';

					// Guardar en caché
					entityCache[`customer_${id}`] = arr;
				}

				return arr;
			} catch (error) {
				log.error('error-getCustomer', error);

				// En caso de error por límite excedido, retornar valores vacíos
				// pero guardar en caché para evitar intentar de nuevo
				entityCache[`customer_${id}`] = [null, null, null, null, null];
				return [null, null, null, null, null];
			}
		}

		const getProveedor = (id) => {
			try {
				id = Number(id) || 0;

				// Si ya existe en el caché, retornar inmediatamente
				if (entityCache[`vendor_${id}`]) {
					return entityCache[`vendor_${id}`];
				}

				var arr = [null, null, null, null, null];

				if (id > 0) {
					let vendor = search.lookupFields({
						type: "vendor",
						id: id,
						columns: [
							"companyname", 'vatregnumber', 'isperson', 'altname', 'custentity_pe_code_document_type',
						]
					});

					arr[0] = vendor.companyname || '';
					arr[1] = vendor.vatregnumber || '';
					arr[2] = vendor.isperson === 'T';
					arr[3] = vendor.altname || '';
					arr[4] = vendor.custentity_pe_code_document_type || '0';

					// Guardar en caché
					entityCache[`vendor_${id}`] = arr;
				}

				return arr;
			} catch (error) {
				log.error('error-getProveedor', error);

				// En caso de error por límite excedido, retornar valores vacíos
				// pero guardar en caché para evitar intentar de nuevo
				entityCache[`vendor_${id}`] = [null, null, null, null, null];
				return [null, null, null, null, null];
			}
		}

		const getemployee = (id) => {
			try {
				id = Number(id) || 0;

				// Si ya existe en el caché, retornar inmediatamente
				if (entityCache[`employee_${id}`]) {
					return entityCache[`employee_${id}`];
				}

				var arr = [null, null, null, null, null];

				if (id > 0) {
					let employee = search.lookupFields({
						type: "employee",
						id: id,
						columns: [
							"altname", 'custentity_pe_document_number', 'custentity_pe_code_document_type'
						]
					});

					arr[0] = '';
					arr[1] = employee.custentity_pe_document_number || '';
					arr[2] = true;
					arr[3] = employee.altname || '';
					arr[4] = employee.custentity_pe_code_document_type || '0';

					// Guardar en caché
					entityCache[`employee_${id}`] = arr;
				}

				return arr;
			} catch (error) {
				log.error('error-getemployee', error);

				// En caso de error por límite excedido, retornar valores vacíos
				// pero guardar en caché para evitar intentar de nuevo
				entityCache[`employee_${id}`] = [null, null, null, null, null];
				return [null, null, null, null, null];
			}
		}




		return { execute }

	});
