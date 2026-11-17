/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * Registro de despliegue : customrecord_log_proceso_general
 * Disparo                : afterSubmit / CREATE
 * Condición              : custrecordlog_proceso_general_proceso = 'ImpulsoDirecto'
 * Origen del ID cobertura: custrecordid_registro_proc_general -> customrecord_ht_co_cobertura
 * Destino                : SOLO plataforma PX (LATAM). Sin Telematic / AMI.
 */

define(['N/log', 'N/search', 'N/record', 'N/file', 'N/runtime',
  'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller'
],
  (log, search, record, file, runtime, _platformController) => {

    const folderRequest = 24651;   // SB: 28733 - PR: 24651
    const folderResponse = 24652;  // SB: 28734 - PR: 24652

    const PROCESO_IMPULSO = 'ImpulsoDirecto';
    // const URL_PX = 'https://tyr.24hm.net/API_PX/WSPX.asmx'; // URL de prueba
    let URL_PX = 'https://tristan.24hm.net/API_PX_LATAM/WSPX.asmx'; 

    /* ============================================================
     *  ENTRADA
     * ============================================================ */
    const afterSubmit = (scriptContext) => {
      try {
        
        if (scriptContext.type !== scriptContext.UserEventType.CREATE) return;

        const logRecord = scriptContext.newRecord;
        const idLog = logRecord.id || 0;

        // ---- 1. Filtro por proceso ------------------------------------
        const proceso = (logRecord.getValue({ fieldId: 'custrecordlog_proceso_general_proceso' }) || '')
          .toString().trim();

        if (proceso !== PROCESO_IMPULSO) return;

        // ---- 2. ID de cobertura ---------------------------------------
        const idCobertura = logRecord.getValue({ fieldId: 'custrecordid_registro_proc_general' });

        if (!idCobertura) {
          log.error('ImpulsoDirecto', { idLog: idLog, mensaje: 'El log no tiene custrecordid_registro_proc_general.' });
          return;
        }

        log.audit('ImpulsoDirecto - Inicio', { idLog: idLog, idCobertura: idCobertura });

        // ---- 3. Validación de ejecución (única validación) ------------
        const currentUser = runtime.getCurrentUser();
        const permisoEjecucion = validarEjecucion(currentUser);

        if (!permisoEjecucion?.permiso) {
          log.audit('ImpulsoDirecto - Sin permiso de ejecución', {
            usuario: currentUser?.id,
            subsidiaria: currentUser?.subsidiary
          });
          return;
        }

        // ---- 4. Carga de la cobertura ---------------------------------
        let recCobertura;
        try {
          recCobertura = record.load({
            type: 'customrecord_ht_co_cobertura',
            id: idCobertura,
            isDynamic: false
          });
        } catch (error) {
          log.error('ImpulsoDirecto - No se pudo cargar la cobertura', {
            idCobertura: idCobertura,
            mensaje: error.message,
            stack: error.stack
          });
          return;
        }

        const SubsidiariaID = recCobertura.getValue({ fieldId: 'custrecord_ht_co_subsidiaria' });
        if (SubsidiariaID != 2 && SubsidiariaID != "2") return;
        
        const item = recCobertura.getValue({ fieldId: 'custrecord_ht_co_producto' });

        // ---- 5. Parametrización del item ------------------------------
        //  [0] = GPG (habilita envío a PX)   [1] = FAM (código de producto)
        const parametrizacion_Item = obtenerParametrizacionItem(item, ['GPG', 'FAM']);

        // ---- 6. Trama -------------------------------------------------
        const trama = obtenerDatosParaImpulso(recCobertura);

        if (!trama) {
          log.error('ImpulsoDirecto - No se pudo construir la trama', { idCobertura: idCobertura });
          return;
        }

        trama.producto = parametrizacion_Item[1]?.Valor || '';

        // Ajuste heredado del WFA: producto HT sin GPG parametrizado -> se fuerza envío a PX.
        if (parametrizacion_Item[0]?.Valor === '') {
          parametrizacion_Item[0].Valor = 'S';
        }

        log.debug('TRAMA', trama);
        log.debug('parametrizacion_Item', parametrizacion_Item);

        // ---- 7. Envío a PX --------------------------------------------
        if (parametrizacion_Item[0]?.Valor !== 'S') {
          log.audit('ImpulsoDirecto - Item sin GPG = S, no se envía a PX', {
            idCobertura: idCobertura,
            item: item,
            GPG: parametrizacion_Item[0]?.Valor || ''
          });
          return;
        }

        casoActualizacionCoberturaLatam(trama, SubsidiariaID);

        log.audit('ImpulsoDirecto - Fin', { idLog: idLog, idCobertura: idCobertura });

      } catch (error) {
        log.error('Error en afterSubmit', { mensaje: error.message, stack: error.stack });
      }
    };

    /* ============================================================
     *  TRAMA
     * ============================================================ */
    const obtenerDatosParaImpulso = (dataCobertura) => {
      try {

        if (!dataCobertura) throw new Error('El objeto dataCobertura es nulo o indefinido.');

        const fechaFinal = formatearFecha(dataCobertura.getText({ fieldId: 'custrecord_ht_co_coberturafinal' })) || '';
        if (!fechaFinal) throw new Error('La fecha final no tiene valor.');

        const idCobertura = dataCobertura.id;
        const datoTecnico = dataCobertura.getValue({ fieldId: 'custrecord_ht_co_numeroserieproducto' }) || '';
        const CodigoVehiculo = dataCobertura.getValue({ fieldId: 'custrecord_ht_co_bien' })?.toString() || '';
        const custrecord_ht_co_producto = dataCobertura.getValue({ fieldId: 'custrecord_ht_co_producto' }) || '';
        const estadocobertura = dataCobertura.getValue({ fieldId: 'custrecord_ht_co_estado_cobertura' }) || '';
        const Propietario = dataCobertura.getValue({ fieldId: 'custrecord_ht_co_propietario' }) || '';
        const familia_prod = dataCobertura.getValue({ fieldId: 'custrecord_ht_co_familia_prod' }) || '';

        if (Propietario == '439954' && estadocobertura == '2') {   // Se excluye toda suspensión
          throw new Error('El propietarioid es 439954, proceso detenido. (CONFLICTO)');
        }

        const EstadoSim =
          estadocobertura === '1' ? 'ACT' :
            estadocobertura === '2' ? 'INA' :
              (() => { throw new Error('Estado de cobertura no válido.'); })();

        const { familia } = dataFamilia(familia_prod);

        return {
          // Plataforma PX
          FechaFinCobertura: fechaFinal,
          EstadoSim: EstadoSim,
          CodigoProducto: custrecord_ht_co_producto,
          IdCobertura: idCobertura,
          IdDatoTecnico: datoTecnico,
          FamiliaProducto: familia,
          codigovehiculo: CodigoVehiculo,   // requerido por envioPXActualizacionEstado
          producto: ''                      // se setea con FAM en afterSubmit
        };

      } catch (error) {
        log.error('Error en obtenerDatosParaImpulso', { mensaje: error.message, stack: error.stack });
        return false;
      }
    };

    /* ============================================================
     *  ENVÍO PX
     * ============================================================ */
    function casoActualizacionCoberturaLatam(trama, SubsidiariaID) {
      try {

        log.debug('Inicia casoActualizacionCoberturaLatam', trama);

        const camposRequeridos = ['IdDatoTecnico', 'codigovehiculo'];
        const camposVacios = camposRequeridos.filter(campo => !trama[campo] || trama[campo] === '');

        if (camposVacios.length > 0) {
          log.error('Campos vacíos en trama', `Los siguientes campos están vacíos: ${camposVacios.join(', ')}`);
          return true;
        }

        if (trama.EstadoSim != 'ACT' && trama.EstadoSim != 'INA') {
          log.debug('Estado SIM no válido', trama.EstadoSim);
          return false;
        }

        log.debug('Parámetros PX', {
          IdDatoTecnico: trama.IdDatoTecnico,
          SubsidiariaID: SubsidiariaID,
          URLPX: URL_PX,
          codigovehiculo: trama.codigovehiculo,
          A: '1',
          EstadoSim: trama.EstadoSim,
          Familia: trama.FamiliaProducto
        });

        const procesoPX = _platformController.envioPXActualizacionEstado(
          trama.IdDatoTecnico,
          SubsidiariaID,
          URL_PX,
          trama.codigovehiculo,
          '1',
          trama.EstadoSim,
          trama.FamiliaProducto
        );

        log.debug('procesoPX', procesoPX);

        // ⚠ ORIGINAL: if ((body != "1") || (body != 1))  -> siempre TRUE, nunca guardaba traza.
        //   Corregido a comparación normalizada.
        const cuerpo = String(procesoPX?.response?.body ?? '').trim();
        const exito = (cuerpo === '1');

        if (!exito) {
          generarLogCambioEstado(procesoPX?.PxAdmin, trama.IdCobertura, 'F', 'ProcesoPX');
          return false;
        }

        const requestFile = saveJson(procesoPX?.PxAdmin || {}, `request_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderRequest);
        const responseFile = saveJson(procesoPX, `response_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderResponse);

        crearRegistroImpulso(trama.IdCobertura, requestFile, responseFile, cuerpo, 'PX');

        return true;

      } catch (error) {
        log.error('Error en casoActualizacionCoberturaLatam', { mensaje: error.message, stack: error.stack });
        crearRegistroImpulso(trama?.IdCobertura, '', '', error?.message, 'PX');
        return false;
      }
    }

    /* ============================================================
     *  AUXILIARES
     * ============================================================ */
    const validarEjecucion = (datos) => {
      if (datos.subsidiary === 2) {
        return {
          permiso: true,
          id: datos.id,
          nombre: datos.name || ''
        };
      }
      return {
        permiso: false,
        id: '',
        nombre: ''
      };
    };

    const dataFamilia = (id) => {
      const emptyFamilia = { familia: '' };

      if (!id) return emptyFamilia;

      try {
        const searchParametroInfo = search.lookupFields({
          type: 'customrecord_ht_cr_pp_valores',
          id: id,
          columns: ['custrecord_ht_pp_codigo']
        });

        if (!searchParametroInfo || !Object.keys(searchParametroInfo).length) {
          log.error('dataFamilia', `No se encontró información para el ID: ${id}`);
          return emptyFamilia;
        }

        return { familia: searchParametroInfo.custrecord_ht_pp_codigo || '' };

      } catch (error) {
        log.error('Error en dataFamilia', error.message || error);
        return emptyFamilia;
      }
    };

    const formatearFecha = (fecha) => {
      try {
        const partes = fecha.split('/');
        const dia = partes[0];
        const mes = partes[1];
        const anio = partes[2];
        return `${anio}-${mes}-${dia}`;
      } catch (error) {
        throw new Error('Error en Formatear fecha');
      }
    };

    const obtenerParametrizacionItem = (items, busquedaParametro) => {
      try {
        let data = [];

        for (let i = 0; i < busquedaParametro.length; i++) {

          if (!items || !busquedaParametro[i]) {
            log.debug('obtenerParametrizacionItem', 'El ID del item o el parámetro de búsqueda son nulos o indefinidos');
            return [];
          }

          let filtro = [
            ['custrecord_ht_pp_parametrizacionid', 'is', items],
            'AND',
            ['custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code', 'is', busquedaParametro[i]]
          ];

          let busqueda = search.create({
            type: 'customrecord_ht_pp_main_param_prod',
            filters: filtro,
            columns: [
              search.createColumn({ name: 'custrecord_ht_pp_parametrizacion_rela', label: 'Param' }),
              search.createColumn({ name: 'custrecord_ht_pp_parametrizacion_valor', label: 'Valor' }),
              search.createColumn({ name: 'custrecord_ht_pp_code', join: 'CUSTRECORD_HT_PP_PARAMETRIZACION_RELA', label: 'Código' }),
              search.createColumn({ name: 'custrecord_ht_pp_codigo', join: 'CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR', label: 'Código' })
            ]
          });

          let resultCount = busqueda.runPaged().count;

          if (resultCount > 0) {
            let pageData = busqueda.runPaged({ pageSize: 1 });
            pageData.pageRanges.forEach((pageRange) => {
              let page = pageData.fetch({ index: pageRange.index });
              page.data.forEach((result) => {
                let columns = result.columns;
                data.push({
                  Param: result.getValue(columns[2]) || '',
                  ParamId: result.getValue(columns[0]) || '',
                  Valor: result.getValue(columns[3]) || '',
                  ValorText: result.getText(columns[1]) || '',
                  ValorId: result.getValue(columns[1]) || ''
                });
              });
            });
          } else {
            data.push({ Param: '', ParamId: '', Valor: '', ValorText: '', ValorId: '' });
          }
        }

        return data;

      } catch (error) {
        log.error('Error en obtenerParametrizacionItem', { error: error.message, stack: error.stack });
        return [];
      }
    };

    const crearRegistroImpulso = (cobertura, requestFile, responseFile, respuesta, Plataforma) => {
      try {
        let objRecord = record.create({ type: 'customrecord_ht_ct_traza_impulso_platafo', isDynamic: true });
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_cobertura', value: cobertura });          // ID Cobertura
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_impulso', value: 4 });                    // ID del impulso
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_plataforma', value: Plataforma });        // Plataforma -> PX
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_estado', value: 'Enviado' });
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_envio', value: requestFile });
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_respuesta', value: responseFile });
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_respuesta', value: respuesta });
        objRecord.save();
      } catch (error) {
        log.error('Error al crear el registro de traza', { error: error.message, stack: error.stack });
      }
    };

    function generarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste) {
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
    }

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
      afterSubmit: afterSubmit
    };
  });
