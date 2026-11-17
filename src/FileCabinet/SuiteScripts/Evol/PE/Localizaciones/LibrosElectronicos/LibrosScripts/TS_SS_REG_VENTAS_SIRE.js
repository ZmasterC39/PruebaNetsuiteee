/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @author rhuaccha
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', 'N/config'], (search, record, runtime, log, file, task, config) => {

	const SEARCH_ID = 'customsearch_ts_registro_ventas_sire';
	const SCRIPT_ID = 'customscript_ts_ss_reg_ventas_sire';
	const DEPLOYMENT_ID = 'customdeploy_ts_ss_reg_ventas_sire';
	const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;

	const execute = (context) => {
		try {
			let getCola = getPendientes();
			if (getCola.length > 0) {
				let params = getCola[0].param;
				params = JSON.parse(params);
				let idCola = getCola[0].id;
				params.parametros.idCola = idCola;
				main(params.parametros, context);
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

	const main = (parametros, context) => {
		const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
		const params = getParams(parametros);
		try {
			let fedIdNumb = '';

			var pageConfig = config.load({
				type: config.Type.COMPANY_INFORMATION
			});

			let companyRuc = pageConfig.getValue('employerid');
			let companyID = pageConfig.getValue('legalname');

			fedIdNumb = companyRuc;

			let param_update_cola = {
				idCola: parametros.idCola,
				estado: 'PROCESANDO'
			};

			log.error('params', params);

			const searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, SEARCH_ID, featureSubsidiary, companyRuc, companyID);
			if (searchbook.thereisinfo == 1) {
				hasinfo = '1';
				const structuregbody = structureBody(searchbook.content);
				const createfile = createFile(params.filterPostingPeriod, fedIdNumb, hasinfo, '', params.filterFormat, structuregbody, params.fileCabinetId, params);
				let fileAux = file.load({
					id: createfile
				});
				param_update_cola = {
					idCola: parametros.idCola,
					estado: 'FINALIZADO',
					fechaFin: new Date(),
					urlArchivo: fileAux.url,
					nombreArchivo: fileAux.name
				};

				const statusProcess = updateCola(param_update_cola);
				log.debug({ title: 'FinalResponse', details: 'Estado del proceso: ' + statusProcess + ' OK!!' });
			} else {
				param_update_cola = {
					idCola: parametros.idCola,
					estado: 'FINALIZADO',
					fechaFin: new Date(),
					mensaje: 'No hay registros'
				};

				updateCola(param_update_cola);

			}

		} catch (error) {
			log.error('main Error', error);
			try {
				let param_update_cola = {
					idCola: params.idCola,
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

	const getParams = (parametros) => {
		try {
			return {
				filterSubsidiary: parametros.custbody_ts_le_subsidiaria,
				filterPostingPeriod: parametros.custbody_ts_le_periodo,
				filterFormat: parametros.salida_reporte_nombre,
				fileCabinetId: parametros.salida_folder,
				idCola: parametros.idCola
			}
		} catch (e) {
			log.error({ title: 'getParams', details: e });
		}
	}

	const searchBook = (subsidiary, period, searchId, featureSubsidiary, companyRuc, companyID) => {
		let json = new Array();
		let start = 0;
		let end = 1000;
		let division = 0.0;
		let laps = 0.0;
		let finalizo = false;

		try {
			const searchLoad = search.load({
				id: searchId
			});

			let filters = searchLoad.filters;

			const filterOne = search.createFilter({
				name: 'postingperiod',
				operator: search.Operator.ANYOF,
				values: period
			});

			filters.push(filterOne);

			if (featureSubsidiary) {
				const filterTwo = search.createFilter({
					name: 'subsidiary',
					operator: search.Operator.ANYOF,
					values: subsidiary
				});
				filters.push(filterTwo);
			}

			const searchResultCount = searchLoad.runPaged().count;
			log.error('searchResultCount', searchResultCount);
			division = searchResultCount / 1000;
			laps = Math.round(division);

			if (division > laps) {
				laps = laps + 1
			}

			for (let i = 1; i <= laps; i++) {
				if (i != laps) {
					searchResult = searchLoad.run().getRange({ start: start, end: end });
				} else {
					searchResult = searchLoad.run().getRange({ start: start, end: searchResultCount });
					finalizo = true;
				}
				for (let j in searchResult) {
					let id = searchResult[j].getValue(searchLoad.columns[0]);
					let column01 = companyRuc;
					let column02 = companyID;
					let column03 = searchResult[j].getValue(searchLoad.columns[3]);
					let column04 = searchResult[j].getValue(searchLoad.columns[4]);
					let column05 = searchResult[j].getValue(searchLoad.columns[5]);
					let column06 = searchResult[j].getValue(searchLoad.columns[6]);
					if (column06 == '- None -') {
						column06 = '';
					}
					let column07 = searchResult[j].getValue(searchLoad.columns[7]);
					if (column07 == '- None -') {
						column07 = ''
					}

					let column08 = searchResult[j].getValue(searchLoad.columns[8]);
					if (column08 == '- None -') {
						column08 = ''
					}

					let column09 = searchResult[j].getValue(searchLoad.columns[9]);
					if (column09 == '- None -') {
						column09 = ''
					}

					let column10 = searchResult[j].getValue(searchLoad.columns[10]);
					if (column10 == '- None -') {
						column10 = ''
					}

					let column11 = searchResult[j].getValue(searchLoad.columns[11]);
					if (column11 == '- None -') {
						column11 = ''
					}

					let column12 = searchResult[j].getValue(searchLoad.columns[12]);
					if (column12 == '- None -') {
						column12 = ''
					}

					let column13 = searchResult[j].getValue(searchLoad.columns[13]);
					let column14 = searchResult[j].getValue(searchLoad.columns[14]);
					column14 = (Math.round(column14 * 100) / 100).toFixed(2);
					if (column14 == 0) {
						column14 = '0.00'
					}

					let column15 = searchResult[j].getValue(searchLoad.columns[15]);
					column15 = (Math.round(column15 * 100) / 100).toFixed(2);
					if (column15 == 0) {
						column15 = '0.00'
					}

					let column16 = searchResult[j].getValue(searchLoad.columns[16]);
					column16 = (Math.round(column16 * 100) / 100).toFixed(2);
					if (column16 == 0) {
						column16 = '0.00'
					}

					let column17 = searchResult[j].getValue(searchLoad.columns[17]);
					column17 = (Math.round(column17 * 100) / 100).toFixed(2);
					if (column17 == 0) {
						column17 = '0.00'
					}

					let column18 = searchResult[j].getValue(searchLoad.columns[18]);
					column18 = (Math.round(column18 * 100) / 100).toFixed(2);
					if (column18 == 0) {
						column18 = '0.00'
					}

					let column19 = searchResult[j].getValue(searchLoad.columns[19]);
					column19 = (Math.round(column19 * 100) / 100).toFixed(2);
					if (column19 == 0) {
						column19 = '0.00'
					}

					let column20 = searchResult[j].getValue(searchLoad.columns[20]);
					column20 = (Math.round(column20 * 100) / 100).toFixed(2);
					if (column20 == 0) {
						column20 = '0.00'
					}

					let column21 = searchResult[j].getValue(searchLoad.columns[21]);
					column21 = (Math.round(column21 * 100) / 100).toFixed(2);
					if (column21 == 0) {
						column21 = '0.00'
					}

					let column22 = searchResult[j].getValue(searchLoad.columns[22]);
					column22 = (Math.round(column22 * 100) / 100).toFixed(2);
					if (column22 == 0) {
						column22 = '0.00'
					}

					let column23 = searchResult[j].getValue(searchLoad.columns[23]);
					column23 = (Math.round(column23 * 100) / 100).toFixed(2);
					if (column23 == 0) {
						column23 = '0.00'
					}

					let column24 = searchResult[j].getValue(searchLoad.columns[24]);
					column24 = (Math.round(column24 * 100) / 100).toFixed(2);
					if (column24 == 0) {
						column24 = '0.00'
					}

					let column25 = searchResult[j].getValue(searchLoad.columns[25]);
					column25 = (Math.round(column25 * 100) / 100).toFixed(2);
					if (column25 == 0) {
						column25 = '0.00'
					}

					let column26 = searchResult[j].getValue(searchLoad.columns[26]);
					column26 = (Math.round(column26 * 100) / 100).toFixed(2);
					if (column26 == 0) {
						column26 = '0.00'
					}

					let column27 = searchResult[j].getValue(searchLoad.columns[27]);

					let column28 = searchResult[j].getValue(searchLoad.columns[28]);
					column28 = Number(column28).toFixed(3);

					let column29 = searchResult[j].getValue(searchLoad.columns[29]);
					if (column29 == '- None -') {
						column29 = ''
					}

					let column30 = searchResult[j].getValue(searchLoad.columns[30]);
					if (column30 == '- None -') {
						column30 = ''
					}

					let column31 = searchResult[j].getValue(searchLoad.columns[31]);
					if (column31 == '- None -') {
						column31 = ''
					}

					let column32 = searchResult[j].getValue(searchLoad.columns[32]);
					if (column32 == '- None -') {
						column32 = ''
					}

					let column33 = searchResult[j].getValue(searchLoad.columns[33]);
					if (column33 == '- None -') {
						column33 = ''
					}

					let column34 = searchResult[j].getValue(searchLoad.columns[34]);
					if (column34 == '- None -') {
						column34 = ''
					}

					let column35 = searchResult[j].getValue(searchLoad.columns[35]);
					if (column35 == '- None -') {
						column35 = ''
					}

					let column36 = searchResult[j].getValue(searchLoad.columns[36]);
					if (column36 == '- None -') {
						column36 = ''
					}

					let column37 = searchResult[j].getValue(searchLoad.columns[37]);
					if (column37 == '- None -') {
						column37 = ''
					}

					let column38 = searchResult[j].getValue(searchLoad.columns[38]);
					if (column38 == '- None -') {
						column38 = ''
					}

					let column39 = searchResult[j].getValue(searchLoad.columns[39]);
					if (column39 == '- None -') {
						column39 = ''
					}

					json.push({
						c1: column01,
						c2: column02,
						c3: column03,
						c4: column04,
						c5: column05,
						c6: column06,
						c7: column07,
						c8: column08,
						c9: column09,
						c10: column10,
						c11: column11,
						c12: column12,
						c13: column13,
						c14: column14,
						c15: column15,
						c16: column16,
						c17: column17,
						c18: column18,
						c19: column19,
						c20: column20,
						c21: column21,
						c22: column22,
						c23: column23,
						c24: column24,
						c25: column25,
						c26: column26,
						c27: column27,
						c28: column28,
						c29: column29,
						c30: column30,
						c31: column31,
						c32: column32,
						c33: column33,
						c34: column34,
						c35: column35,
						c36: column36,
						c37: column37,
						c38: column38,
						c39: column39,
					});
				}
				start = start + 1000;
				end = end + 1000;
			}

			if (json.length > 0) {
				return { thereisinfo: 1, content: json, finaliza: finalizo};
			} else {
				return { thereisinfo: 0, finaliza: finalizo}
			}

		} catch (error) {
			log.error({ title: 'searchBook', details: error });
		}
	}

	const structureBody = (searchResult) => {
		let contentReport = '';
		try {
			for (let i in searchResult) {
				contentReport =
					contentReport + searchResult[i].c1 + '|' + searchResult[i].c2 + '|' + searchResult[i].c3 + '|' + searchResult[i].c4 + '|' + searchResult[i].c5 +
					'|' + searchResult[i].c6 + '|' + searchResult[i].c7 + '|' + searchResult[i].c8 + '|' + searchResult[i].c9 + '|' + searchResult[i].c10 +
					'|' + searchResult[i].c11 + '|' + searchResult[i].c12 + '|' + searchResult[i].c13 + '|' + searchResult[i].c14 + '|' + searchResult[i].c15 +
					'|' + searchResult[i].c16 + '|' + searchResult[i].c17 + '|' + searchResult[i].c18 + '|' + searchResult[i].c19 + '|' + searchResult[i].c20 +
					'|' + searchResult[i].c21 + '|' + searchResult[i].c22 + '|' + searchResult[i].c23 + '|' + searchResult[i].c24 + '|' + searchResult[i].c25 +
					'|' + searchResult[i].c26 + '|' + searchResult[i].c27 + '|' + searchResult[i].c28 + '|' + searchResult[i].c29 + '|' + searchResult[i].c30 +
					'|' + searchResult[i].c31 + '|' + searchResult[i].c32 + '|' + searchResult[i].c33 + '|' + searchResult[i].c34 + '|' + searchResult[i].c35 +
					'|' + searchResult[i].c36 + '|' + searchResult[i].c37 + '|' + searchResult[i].c38 + '|' + searchResult[i].c39 + '|\n';
			}

			return contentReport;
		} catch (e) {
			log.error({ title: 'structureBody', details: e });
		}
	}

	const createFile = (filterPostingPeriod, fedIdNumb, hasinfo, recordlogid, filterFormat, structuregbody, fileCabinetId, params) => {
		let typeformat;
		try {
			var nameReport = getFileName(params.filterSubsidiary,params.filterPostingPeriod,'1',params.idCola);
			log.error('nameReport',nameReport);
			let nameReportGenerated = '';
			//let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '010100' + '00' + '1' + hasinfo + '11';
			if (params.filterFormat == 'TXT') {
				nameReportGenerated = nameReport + '.txt';
				typeformat = file.Type.PLAINTEXT;
			}

			const fileObj = file.create({
				name: nameReportGenerated,
				fileType: typeformat,
				contents: structuregbody,
				encoding: file.Encoding.UTF8,
				folder: fileCabinetId,
				isOnline: true
			});
			const fileId = fileObj.save();
			return fileId;
		} catch (e) {
			log.error({ title: 'createFile', details: e });
		}
	}

	const getFileName = (subsidiaryId, periodId, indContent, fileId) => {
		let fileName = '';
		try {
			let periodName = getPeriodName(periodId);
			let partialName = getPartialFileName(periodName);
			let subsidiary = getSubsidiary(subsidiaryId);
			let moneda = '1';
			fileName = 'LE' + subsidiary.ruc + partialName + '140400' + '0' + '2' + '1' + indContent + moneda + '2';// + '_' + fileId;
		} catch (error) {
			log.debug({
				title: 'Error General (saveFile)',
				details: 'Error : ' + error.message
			});
		}
		return fileName;
	}

	const getPeriodName = (periodId) => {
		try {
			let lookup = search.lookupFields({
				type: search.Type.ACCOUNTING_PERIOD,
				id: periodId,
				columns: ['periodname']
			});
			let name = lookup.periodname;
			return name;
		} catch (error) {
			log.debug({
				title: 'Error - getPeriodName',
				details: 'Error : ' + error.message
			});
			return periodId;
		}
	}

	const getPartialFileName = (period) => {
		try {
			let month = period.split(' ')[0].toLowerCase();
			let year = period.split(' ')[1].toLowerCase();

			const monthMap = [
				{ name: 'ene', number: '01' },
				{ name: 'jan', number: '01' },
				{ name: 'january', number: '01' },
				{ name: 'feb', number: '02' },
				{ name: 'february', number: '02' },
				{ name: 'mar', number: '03' },
				{ name: 'march', number: '03' },
				{ name: 'apr', number: '04' },
				{ name: 'abr', number: '04' },
				{ name: 'april', number: '04' },
				{ name: 'may', number: '05' },
				{ name: 'jun', number: '06' },
				{ name: 'june', number: '06' },
				{ name: 'jul', number: '07' },
				{ name: 'july', number: '07' },
				{ name: 'aug', number: '08' },
				{ name: 'ago', number: '08' },
				{ name: 'august', number: '08' },
				{ name: 'sep', number: '09' },
				{ name: 'september', number: '09' },
				{ name: 'oct', number: '10' },
				{ name: 'october', number: '10' },
				{ name: 'nov', number: '11' },
				{ name: 'november', number: '11' },
				{ name: 'dec', number: '12' },
				{ name: 'dic', number: '12' },
				{ name: 'december', number: '12' }
			];
			let monthNumber = "-1";
			let match = monthMap.find(item => item.name === month);
			if (match) {
				monthNumber = match.number;
			}
			return year + monthNumber;
		} catch (error) {
			log.error({
				title: 'Error - getPartialFileName',
				details: error.message
			});
			return '';
		}
	}

	const getSubsidiary = (subsidiaryId) => {
		try {
			let lookup = search.lookupFields({
				type: search.Type.SUBSIDIARY,
				id: subsidiaryId,
				columns: ['taxidnum', 'legalname']
			});
			let value = {
				ruc: lookup.taxidnum,
				name: lookup.legalname
			}
			return value;
		} catch (error) {
			log.error({
				title: 'Error - getSubsidiary',
				details: error.message
			});
			return {};
		}
	}

	return {
		execute: execute
	}
});