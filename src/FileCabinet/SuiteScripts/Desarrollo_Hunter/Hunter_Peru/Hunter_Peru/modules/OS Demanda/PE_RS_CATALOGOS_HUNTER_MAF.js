/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/query', 'N/search', 'N/error', 'N/log'], function(query, search, error, log) {

  const CATALOG_CLASSES = {
    cliente: 'cliente',
    vehiculo: 'vehiculo'
  };

  const VEHICLE_CATALOGS = {
    marca: 'Marca',
    modelo: 'Modelo',
    //tipovehiculo: 'Tipo',
    tipo: 'Tipo',
    tipobien: 'TipoBien',
    usovehiculo: 'UsoVehiculo',
    tipoterrestre: 'TipoTerrestre',
    colorcarseg: 'ColorAutosafe',
    colorautosafe: 'ColorAutosafe',
    transmision: 'Transmision',
    recorrido: 'Recorrido',
    sucursal: 'SucursalConcesionario',
    sucursalconcesionario: 'SucursalConcesionario',
    sucursal_concesionario: 'SucursalConcesionario',
    concesionario: 'Concesionario',
    companiaseguro: 'Aseguradora',
    aseguradora: 'Aseguradora',
    financiadovehiculo: 'Financiera',
    financiera: 'Financiera',
    financiador: 'Financiador',
    broker: 'Broker'
  };

  const CLIENT_CATALOGS = {
    tiposPersona: 'customrecord_pe1_type_of_person',
    tiposDocumento: 'customrecord_pe_document_type',
    tiposContacto: 'customlist_ht_ct_tipodecontacto',
    tiposTelefono: 'customrecordht_registro_tipo_telefono',
    tiposEmail: 'customlist_ht_email_tipoemail',
    ubigeos: 'customrecord_pe_ubigeo',
    canal: 'customlist_lista_canal_distribuci_sys',
    formaPago: 'customlist_pe_lista_forma_pago_sys'
  };

  function validateRequest(body) {
    if (!body.clase) {
      throw error.create({
        name: 'MISSING_REQUIRED_PARAM',
        message: 'Parametro «clase» es requerido (cliente o vehiculo)'
      });
    }

    const clase = body.clase.toLowerCase();
    if (!CATALOG_CLASSES[clase]) {
      throw error.create({
        name: 'INVALID_CLASS',
        message: 'Clase invalida. Use: cliente o vehiculo'
      });
    }

    return clase;
  }

  function fetchClientCatalog(catalogKey, typeId, filters) {
    const data = [];
    
    if (typeId === 'customrecord_pe_ubigeo') {
      let searchFilters = [['isinactive', 'is', 'F']];
      
      if (filters && filters.id) {
        searchFilters.push('AND');
        searchFilters.push(['internalid', 'is', filters.id]);
      }
      
      search.create({
        type: typeId,
        filters: searchFilters,
        columns: ['internalid', 'name', 'custrecord_pe_codigo']
      }).run().each(r => {
        const ubigeoName = r.getValue('name');
        const parts = ubigeoName.split(':').map(p => p.trim());
        
        data.push({
          id: r.getValue('internalid'),
          nombre: ubigeoName,
          codigo: r.getValue('custrecord_pe_codigo'),
          departamento: parts[0] || '',
          provincia: parts[1] || '',
          distrito: parts[2] || ''
        });
        return true;
      });
    } else if (typeId === 'customlist_lista_canal_distribuci_sys' || typeId === 'customlist_pe_lista_forma_pago_sys') {
      let sql = '';
      let params = [];
      
      if (filters && filters.id) {
        sql = 'SELECT id, name AS nombre FROM ' + typeId + ' WHERE id = ?';
        params = [filters.id];
      } else {
        sql = 'SELECT id, name AS nombre FROM ' + typeId + ' WHERE isinactive = \'F\' ORDER BY name';
      }
      
      log.debug({ title: 'SQL Client Catalog', details: sql });
      const rows = query.runSuiteQL({ query: sql, params: params }).asMappedResults();
      return rows;
    } else {
      let searchFilters = [['isinactive', 'is', 'F']];
      
      if (typeId === 'customrecord_pe_document_type') {
        searchFilters = [
          ['isinactive', 'is', 'F'],
          'AND',
          ['internalid', 'anyof', ['3', '5', '2', '4']]
        ];
      }
      
      if (typeId === 'customlist_ht_email_tipoemail') {
        searchFilters = [
          ['isinactive', 'is', 'F'],
          'AND',
          ['internalid', 'anyof', ['1', '111', '112']]
        ];
      }

      if (filters && filters.id) {
        searchFilters.push('AND');
        searchFilters.push(['internalid', 'is', filters.id]);
      }

      search.create({
        type: typeId,
        filters: searchFilters,
        columns: ['internalid', 'name']
      }).run().each(r => {
        data.push({
          id: r.getValue('internalid'),
          nombre: r.getValue('name')
        });
        return true;
      });
    }
    
    return data;
  }

  function processVehicleCatalog(catalogType, body) {
    const idSolo = body.id || (body.dato && body.dato.id) || null;
    const marca = body.marca || (body.dato && body.dato.marca) || null;
    const modelo = body.modelo || (body.dato && body.dato.modelo) || null;
    const tipobien = body.tipobien || (body.dato && body.dato.tipobien) || null;
    const concesionario = body.concesionario || (body.dato && body.dato.concesionario) || null;

    let sql = '';
    let params = [];

    switch (catalogType) {
      case 'ColorAutosafe':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_bn_colorcarseg WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_bn_colorcarseg ORDER BY name';
        }
        break;

      case 'Marca':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_bien_marca WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_bien_marca WHERE custrecord_ht_marca_sub = 3 ORDER BY name';
        }
        break;

      case 'Modelo':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_bn_modelo WHERE id = ?';
          params = [idSolo];
        } else {
          if (!marca) throw error.create({ name: 'MISSING_PARAM', message: 'Falta «marca»' });
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_bn_modelo WHERE custrecord_ht_mb_marca = ? AND custrecord_ht_mod_subsidiaria = 3 ORDER BY name';
          params = [marca];
        }
        break;

      case 'Tipo':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_record_tipovehiculo WHERE id = ? AND custrecord_ht_tv_subsidiaria = 3';
          params = [idSolo];
        } else {
          if (!marca || !modelo) throw error.create({ name: 'MISSING_PARAM', message: 'Faltan «marca» y/o «modelo»' });
          sql = 'SELECT tv.id AS id, tv.name AS nombre FROM customrecord_ht_record_tipovehiculo tv JOIN customrecord_ht_bn_modelo mo ON tv.custrecord_ht_tv_cod_marca = mo.custrecord_ht_cod_marca AND tv.custrecord_ht_tv_cod_modelo = mo.custrecord_ht_mod_codigo WHERE mo.id = ? AND mo.custrecord_ht_mb_marca = ? AND tv.isinactive = \'F\' AND tv.custrecord_ht_tv_subsidiaria = 3 ORDER BY tv.name';
          params = [modelo, marca];
        }
        break;

      case 'TipoBien':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_bien_tipobien WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_bien_tipobien ORDER BY name';
        }
        break;

      case 'TipoTerrestre':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_bien_tipoterrestre WHERE id = ?';
          params = [idSolo];
        } else {
          if (!tipobien) throw error.create({ name: 'MISSING_PARAM', message: 'Falta «tipobien»' });
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_bien_tipoterrestre WHERE custrecord_ht_tt_tipobien = ? ORDER BY name';
          params = [tipobien];
        }
        break;

      case 'Transmision':
        if (idSolo) {
          sql = 'SELECT id AS id, custrecord_ht_bn_descripcion AS nombre FROM customrecord_ht_bn_transmision WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id AS id, custrecord_ht_bn_descripcion AS nombre FROM customrecord_ht_bn_transmision ORDER BY name';
        }
        break;

      case 'Recorrido':
        if (idSolo) {
          sql = 'SELECT id, altname as nombre FROM customrecord_ht_record_recorrido WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id, altname as nombre FROM customrecord_ht_record_recorrido ORDER BY name';
        }
        break;

      case 'UsoVehiculo':
        if (idSolo) {
          sql = 'SELECT id, altname as nombre FROM customrecord_ht_bien_usovehiculo WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id, altname as nombre FROM customrecord_ht_bien_usovehiculo ORDER BY name';
        }
        break;

      case 'SucursalConcesionario':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_pe_sucursal WHERE id = ?';
          params = [idSolo];
        } else {
          if (!concesionario) throw error.create({ name: 'MISSING_PARAM', message: 'Falta «concesionario»' });
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_pe_sucursal WHERE custrecord_ht_pe_consecionario = ? AND isinactive = \'F\' ORDER BY name';
          params = [concesionario];
        }
        break;

      case 'Concesionario':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_record_canaldistribucion WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_record_canaldistribucion WHERE custrecord_ht_cd_tipocanal = 2 AND custrecord_ht_cd_subsidiaria = 3 AND isinactive = \'F\' ORDER BY name';
        }
        break;

      case 'Aseguradora':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_record_canaldistribucion WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_record_canaldistribucion WHERE custrecord_ht_cd_tipocanal = 1 AND custrecord_ht_cd_subsidiaria = 3 AND isinactive = \'F\' ORDER BY name';
        }
        break;

      case 'Financiera':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_record_canaldistribucion WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_record_canaldistribucion WHERE custrecord_ht_cd_tipocanal = 3 AND custrecord_ht_cd_subsidiaria = 3 AND isinactive = \'F\' ORDER BY name';
        }
        break;

      case 'Financiador':
        if (idSolo) {
          sql = 'SELECT id AS id, entitytitle AS nombre FROM Customer WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id AS id, entitytitle AS nombre FROM Customer ORDER BY entitytitle';
        }
        break;

      case 'Broker':
        if (idSolo) {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_record_canaldistribucion WHERE id = ?';
          params = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS nombre FROM customrecord_ht_record_canaldistribucion WHERE custrecord_ht_cd_tipocanal = 4 AND custrecord_ht_cd_subsidiaria = 3 AND isinactive = \'F\' ORDER BY name';
        }
        break;

      default:
        throw error.create({ name: 'INVALID_CATALOG', message: 'Catalogo no soportado: ' + catalogType });
    }

    log.debug({ title: 'SQL', details: sql });
    const rows = query.runSuiteQL({ query: sql, params: params }).asMappedResults();
    return rows;
  }

  function post(requestBody) {
    try {
      const clase = validateRequest(requestBody);

      if (clase === 'vehiculo') {
        const catalogKey = (requestBody.tipoConsulta || requestBody.catalogo || '').toString().toLowerCase();
        
        if (!catalogKey) {
          throw error.create({
            name: 'MISSING_CATALOG',
            message: 'Falta «tipoConsulta» o «catalogo»'
          });
        }

        const catalogType = VEHICLE_CATALOGS[catalogKey];
        if (!catalogType) {
          throw error.create({
            name: 'INVALID_CATALOG',
            message: 'Catalogo de vehiculo no soportado: ' + catalogKey
          });
        }

        const items = processVehicleCatalog(catalogType, requestBody);
        return {
          success: true,
          clase: 'vehiculo',
          catalogo: catalogKey,
          items: items
        };

      } else if (clase === 'cliente') {
        const requestedCatalogs = [];
        
        Object.keys(CLIENT_CATALOGS).forEach(key => {
          if (requestBody[key] === 'true' || requestBody[key] === true) {
            requestedCatalogs.push(key);
          }
        });

        if (requestedCatalogs.length > 0) {
          const result = {};
          requestedCatalogs.forEach(key => {
            const filters = requestBody.id ? { id: requestBody.id } : null;
            result[key] = fetchClientCatalog(key, CLIENT_CATALOGS[key], filters);
          });
          
          return {
            success: true,
            clase: 'cliente',
            catalogos: result
          };
        } else {
          const result = {};
          Object.keys(CLIENT_CATALOGS).forEach(key => {
            result[key] = fetchClientCatalog(key, CLIENT_CATALOGS[key], null);
          });
          
          return {
            success: true,
            clase: 'cliente',
            catalogos: result
          };
        }
      }

    } catch (e) {
      log.error({ title: 'Restlet Error', details: e.message });
      return {
        success: false,
        error: e.name,
        mensaje: e.message
      };
    }
  }

  return { post: post };
});