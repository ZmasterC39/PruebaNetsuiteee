/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * 
 * MEJORAS:
 * - Búsqueda por descripción/nombre para campos del vehículo
 * - Soporte para moneda: "Soles"=5, "Dólares"=1
 * - Búsqueda flexible por ID o descripción
 */

define([
  'N/record',
  'N/search',
  'N/error',
  'N/log',
  'N/runtime',
  'N/query',
  'N/email'
], function (record, search, error, log, runtime, query, emailenv) {

  const CONFIG = {
    DEFAULT_SUBSIDIARY: 3,
    DEFAULT_STATUS: 13,
    DEFAULT_CURRENCY: 1,
    EXTRA_CURRENCY: 5,
    DEFAULT_BROKER: 19909,
    DEFAULT_EXECUTIVE_MAF: 35921,

    PHONE_REC: 'customrecord_ht_registro_telefono',
    PHONE_CUSTOMER_FLD: 'custrecord_ht_campo_lbl_entidad_telefono',
    EMAIL_REC: 'customrecord_ht_record_correoelectronico',
    EMAIL_CUSTOMER_FLD: 'custrecord_ht_ce_enlace',
    CONTACT_REC: 'customrecord_ht_rc_registrocontactos',
    CONTACT_CUSTOMER_FLD: 'custrecord_ht_rc_empresa',

    PRECIO_MAF_CAB_REC: 'customrecord_ven_tb_precios_maf_cab',
    PRECIO_MAF_DET_REC: 'customrecord_ven_tb_precios_maf_det',

    OFFICE_TO_DEPT: {
      '415': 299,
      '416': 299,
      '417': 331,
      '418': 315,
      '419': 283
    },

    // Mapeo de monedas
    CURRENCY_MAP: {
      'SOLES': 5,
      'SOL': 5,
      'PEN': 5,
      'S/': 5,
      'S/.': 5,
      'DOLARES': 1,
      'DOLAR': 1,
      'USD': 1,
      'US$': 1,
      '$': 1
    },

    DOCUMENT_TYPE_MAP: {
    'DNI': 2,
    'RUC': 4,
    'CE': 3,
    'PASAPORTE': 5
   }
  };



  const Utils = {
    nvlNum: (v, d = 0) => (isFinite(parseFloat(v)) ? parseFloat(v) : d),

    round2: (x) => Math.round((x + Number.EPSILON) * 100) / 100,

    rate01: function (r) {
      r = this.nvlNum(r, 0);
      return (r > 1 ? r / 100 : r);
    },

    normalize: (s) => (s || '').toString().trim().toUpperCase(),
    isEmpty: (v) => v === null || v === undefined || v === '' ||
      (typeof v === 'string' && v.trim() === ''),

    toBool: (v) => (v === true || v === 'T' || v === 1 ||
      (typeof v === 'string' && v.toLowerCase() === 'true')),

    logAudit: function (title, data) {
      log.audit({
        title: `[OS-API] ${title}`,
        details: typeof data === 'object' ? JSON.stringify(data) : data
      });
    },

    logError: function (title, error) {
      log.error({
        title: `[OS-API ERROR] ${title}`,
        details: error.message || String(error)
      });
    },

    splitName: function (fullName) {
      const parts = (fullName || '').toString().trim().split(/\s+/);
      return {
        first: parts.shift() || '',
        rest: parts.join(' ') || ''
      };
    },

    splitLastName: function (fullLastName) {
      const parts = (fullLastName || '').toString().trim().split(/\s+/);
      const materno = parts.pop() || '';
      const paterno = parts.join(' ') || '';
      return { paterno, materno };
    },

    /**
     * Convierte descripción de moneda a ID
     * @throws Error si la moneda no es válida
     */
    parseCurrency: function (value) {
      if (Utils.isEmpty(value)) return null;

      // Si ya es un número, verificar si es válido
      if (!isNaN(value)) {
        const numValue = parseInt(value, 10);
        if (numValue === 1 || numValue === 5) return numValue;
        
        throw error.create({
          name: 'INVALID_CURRENCY',
          message: `Campo: "moneda" - Valor inválido: "${value}" - Solo se aceptan: 1 (Dólares) o 5 (Soles)`
        });
      }

      // Buscar en el mapa
      const normalized = Utils.normalize(value);
      if (CONFIG.CURRENCY_MAP[normalized]) {
        return CONFIG.CURRENCY_MAP[normalized];
      }

      // Si no se encuentra, listar valores válidos
      const validValues = Object.keys(CONFIG.CURRENCY_MAP).join(', ');
      throw error.create({
        name: 'INVALID_CURRENCY',
        message: `Campo: "moneda" - Valor inválido: "${value}" - Valores aceptados: ${validValues}, 1, 5`
      });
    },

    parseDocumentType: function (value) {
      if (Utils.isEmpty(value)) return null;

      // Si ya es un número, verificar si es válido (2, 3, 4, 5)
      /*if (!isNaN(value)) {
        const numValue = parseInt(value, 10);
        const validIds = Object.values(CONFIG.DOCUMENT_TYPE_MAP);
        if (validIds.includes(numValue)) {
          return numValue;
        }
        
        throw error.create({
          name: 'INVALID_DOCUMENT_TYPE',
          message: `Campo: "documentType" - Valor inválido: "${value}" - IDs válidos: ${validIds.join(', ')}`
        });
      }*/

      // Buscar en el mapa
      const normalized = Utils.normalize(value);
      if (CONFIG.DOCUMENT_TYPE_MAP[normalized]) {
        return CONFIG.DOCUMENT_TYPE_MAP[normalized];
      }

      // Si no se encuentra, listar valores válidos
      const validValues = Object.keys(CONFIG.DOCUMENT_TYPE_MAP).join(', ');
      throw error.create({
        name: 'INVALID_DOCUMENT_TYPE',
        message: `Campo: "documentType" - Valor inválido: "${value}" - Valores aceptados: ${validValues}`
      });
    }    

  };

  const UbigeoSearcher = {
    findByCode: function (codigoUbigeo) {
      if (Utils.isEmpty(codigoUbigeo)) return null;

      try {
        const searchObj = search.create({
          type: 'customrecord_pe_ubigeo',
          filters: [
            ['custrecord_pe_codigo', 'is', codigoUbigeo],
            'AND',
            ['isinactive', 'is', 'F']
          ],
          columns: ['internalid', 'name', 'custrecord_pe_codigo']
        });

        let ubigeoData = null;
        searchObj.run().each(function (res) {
          const ubigeoName = res.getValue('name');
          const parts = ubigeoName.split(':').map(p => p.trim());

          ubigeoData = {
            internalId: res.getValue('internalid'),
            codigo: res.getValue('custrecord_pe_codigo'),
            departamento: parts[0] || '',
            provincia: parts[1] || '',
            distrito: parts[2] || ''
          };

          Utils.logAudit('Ubigeo encontrado', ubigeoData);
          return false;
        });

        return ubigeoData;
      } catch (e) {
        Utils.logError('Error buscando ubigeo', e);
        return null;
      }
    }
  };

  /**
   * NUEVO: Módulo para búsqueda por descripción
   */
  const DescriptionSearcher = {
    /**
     * Busca en cualquier catálogo por nombre/descripción
     * @throws Error si no encuentra el valor
     */
    findByDescription: function (recordType, searchField, value, additionalFilters, fieldLabel) {
      if (Utils.isEmpty(value)) return null;

      try {
        const filters = [
          [searchField, 'is', value],
          'AND',
          ['isinactive', 'is', 'F']
        ];

        // Agregar filtros adicionales si existen
        if (additionalFilters && Array.isArray(additionalFilters)) {
          additionalFilters.forEach(filter => {
            filters.push('AND');
            filters.push(filter);
          });
        }

        const searchObj = search.create({
          type: recordType,
          filters: filters,
          columns: ['internalid', searchField]
        });

        let foundId = null;
        searchObj.run().each(function (res) {
          foundId = res.getValue('internalid');
          Utils.logAudit(`Encontrado en ${recordType}`, {
            id: foundId,
            value: res.getValue(searchField),
            fieldLabel: fieldLabel
          });
          return false; // solo el primero
        });

        if (!foundId) {
          throw error.create({
            name: 'VALUE_NOT_FOUND',
            message: `No se encontró "${value}" en el catálogo de ${fieldLabel || recordType}`
          });
        }

        return foundId;
      } catch (e) {
        if (e.name === 'VALUE_NOT_FOUND') throw e;
        Utils.logError(`Error buscando en ${recordType}`, e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar en ${fieldLabel || recordType}: ${e.message}`
        });
      }
    },

    /**
     * Busca Tipo Bien por nombre
     * @throws Error si no encuentra el valor
     */
    findTipoBien: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;
      
      // Si es número, retornar directamente
      if (!isNaN(value)) return parseInt(value, 10);

      try {
        return this.findByDescription(
          'customrecord_ht_bien_tipobien',
          'name',
          Utils.normalize(value),
          null,
          'Tipo Bien'
        );
      } catch (e) {
        throw error.create({
          name: 'INVALID_TIPO_BIEN',
          message: `Campo: "${fieldKey || 'custrecord_ht_bien_tipobien'}" - Valor inválido: "${value}" - El Tipo de Bien no existe en el catálogo`
        });
      }
    },

    /**
     * Busca Tipo Terrestre por nombre
     * @throws Error si no encuentra el valor
     */
    findTipoTerrestre: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;
      if (!isNaN(value)) return parseInt(value, 10);

      try {
        return this.findByDescription(
          'customrecord_ht_bien_tipoterrestre',
          'name',
          Utils.normalize(value),
          null,
          'Tipo Terrestre'
        );
      } catch (e) {
        throw error.create({
          name: 'INVALID_TIPO_TERRESTRE',
          message: `Campo: "${fieldKey || 'custrecord_ht_bien_tipoterrestre'}" - Valor inválido: "${value}" - El Tipo Terrestre no existe en el catálogo`
        });
      }
    },

    /**
     * Busca Marca por nombre usando N/query
     * @throws Error si no encuentra el valor
     */
    findMarca: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;
      if (!isNaN(value)) return parseInt(value, 10);

      try {
        const normalized = Utils.normalize(value);
        
        const sql = `
          SELECT id, name
          FROM customrecord_ht_bien_marca 
          WHERE UPPER(name) = ?
          AND custrecord_ht_marca_sub = 3
          AND isinactive = 'F'
        `;
        
        const results = query.runSuiteQL({
          query: sql,
          params: [normalized]
        }).asMappedResults();

        if (results && results.length > 0) {
          const foundId = parseInt(results[0].id, 10);
          Utils.logAudit('Marca encontrada', {
            id: foundId,
            name: results[0].name,
            searchValue: normalized
          });
          return foundId;
        }

        // Si no se encuentra, listar valores válidos
        const sqlValid = `
          SELECT name
          FROM customrecord_ht_bien_marca 
          WHERE custrecord_ht_marca_sub = 3
          AND isinactive = 'F'
          ORDER BY name
        `;
        
        const validResults = query.runSuiteQL({
          query: sqlValid
        }).asMappedResults();

        const validValues = validResults.map(r => r.name).join(', ');

        throw error.create({
          name: 'VALUE_NOT_FOUND',
          //message: `No se encontró la Marca: "${value}". Valores válidos: ${validValues}`
          message: `No se encontró la Marca: "${value}".`
        });

      } catch (e) {
        if (e.name === 'VALUE_NOT_FOUND') {
          throw error.create({
            name: 'INVALID_MARCA',
            message: `Campo: "${fieldKey || 'custrecord_ht_bien_marca'}" - ${e.message}`
          });
        }
        Utils.logError('Error buscando Marca', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar Marca: ${e.message}`
        });
      }
    },

    /**
     * Busca Modelo por nombre Y marca usando N/query
     * @param {string|number} value - Nombre o ID del modelo
     * @param {string} fieldKey - Nombre del campo (para errores)
     * @param {number} marcaId - ID de la marca (requerido si value es string)
     * @throws Error si no encuentra el valor
     */
    findModelo: function (value, fieldKey, marcaId) {
      if (Utils.isEmpty(value)) return null;
      if (!isNaN(value)) return parseInt(value, 10);

      try {
        const normalized = Utils.normalize(value);
        
        // Validar que se proporcionó la marca
        if (!marcaId) {
          throw error.create({
            name: 'MISSING_MARCA',
            message: 'Para buscar Modelo por nombre, primero debe especificarse una Marca válida'
          });
        }
        
        const sql = `
          SELECT id, name
          FROM customrecord_ht_bn_modelo 
          WHERE UPPER(name) = ?
          AND custrecord_ht_mb_marca = ?
          AND custrecord_ht_mod_subsidiaria = 3
          AND isinactive = 'F'
        `;
        
        const results = query.runSuiteQL({
          query: sql,
          params: [normalized, marcaId]
        }).asMappedResults();

        if (results && results.length > 0) {
          const foundId = parseInt(results[0].id, 10);
          Utils.logAudit('Modelo encontrado', {
            id: foundId,
            name: results[0].name,
            searchValue: normalized,
            marcaId: marcaId
          });
          return foundId;
        }

        // Si no se encuentra, listar valores válidos para esa marca
        const sqlValid = `
          SELECT name
          FROM customrecord_ht_bn_modelo 
          WHERE custrecord_ht_mb_marca = ?
          AND custrecord_ht_mod_subsidiaria = 3
          AND isinactive = 'F'
          ORDER BY name
        `;
        
        const validResults = query.runSuiteQL({
          query: sqlValid,
          params: [marcaId]
        }).asMappedResults();

        const validValues = validResults.map(r => r.name).join(', ');

        throw error.create({
          name: 'VALUE_NOT_FOUND',
          message: `No se encontró el Modelo: "${value}" para la Marca especificada.`
          //message: `No se encontró el Modelo: "${value}" para la Marca especificada. Modelos válidos: ${validValues}`        
        });

      } catch (e) {
        if (e.name === 'VALUE_NOT_FOUND' || e.name === 'MISSING_MARCA') {
          throw error.create({
            name: 'INVALID_MODELO',
            message: `Campo: "${fieldKey || 'custrecord_ht_bien_modelo'}" - ${e.message}`
          });
        }
        Utils.logError('Error buscando Modelo', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar Modelo: ${e.message}`
        });
      }
    },

    /**
     * Busca Tipo Vehículo por nombre, marca Y modelo usando N/query
     * @param {string|number} value - Nombre o ID del tipo
     * @param {string} fieldKey - Nombre del campo (para errores)
     * @param {number} marcaId - ID de la marca (requerido si value es string)
     * @param {number} modeloId - ID del modelo (requerido si value es string)
     * @throws Error si no encuentra el valor
     */
    findTipoVehiculo: function (value, fieldKey, marcaId, modeloId) {
      if (Utils.isEmpty(value)) return null;
      if (!isNaN(value)) return parseInt(value, 10);

      try {
        const normalized = Utils.normalize(value);
        
        // Validar que se proporcionaron marca y modelo
        if (!marcaId || !modeloId) {
          throw error.create({
            name: 'MISSING_MARCA_MODELO',
            message: 'Para buscar Tipo de Vehículo por nombre, primero deben especificarse Marca y Modelo válidos'
          });
        }
        
        const sql = `
          SELECT tv.id, tv.name
          FROM customrecord_ht_record_tipovehiculo tv
          JOIN customrecord_ht_bn_modelo mo ON tv.custrecord_ht_tv_cod_marca = mo.custrecord_ht_cod_marca 
            AND tv.custrecord_ht_tv_cod_modelo = mo.custrecord_ht_mod_codigo
          WHERE UPPER(tv.name) = ?
          AND mo.id = ?
          AND mo.custrecord_ht_mb_marca = ?
          AND tv.isinactive = 'F'
          AND tv.custrecord_ht_tv_subsidiaria = 3
        `;
        
        const results = query.runSuiteQL({
          query: sql,
          params: [normalized, modeloId, marcaId]
        }).asMappedResults();

        if (results && results.length > 0) {
          const foundId = parseInt(results[0].id, 10);
          Utils.logAudit('Tipo Vehículo encontrado', {
            id: foundId,
            name: results[0].name,
            searchValue: normalized,
            marcaId: marcaId,
            modeloId: modeloId
          });
          return foundId;
        }

        // Si no se encuentra, listar valores válidos para esa marca y modelo
        const sqlValid = `
          SELECT tv.name
          FROM customrecord_ht_record_tipovehiculo tv
          JOIN customrecord_ht_bn_modelo mo ON tv.custrecord_ht_tv_cod_marca = mo.custrecord_ht_cod_marca 
            AND tv.custrecord_ht_tv_cod_modelo = mo.custrecord_ht_mod_codigo
          WHERE mo.id = ?
          AND mo.custrecord_ht_mb_marca = ?
          AND tv.isinactive = 'F'
          AND tv.custrecord_ht_tv_subsidiaria = 3
          ORDER BY tv.name
        `;
        
        const validResults = query.runSuiteQL({
          query: sqlValid,
          params: [modeloId, marcaId]
        }).asMappedResults();

        const validValues = validResults.map(r => r.name).join(', ');

        throw error.create({
          name: 'VALUE_NOT_FOUND',
          message: `No se encontró el Tipo de Vehículo: "${value}" para la Marca y Modelo especificados.`
          //message: `No se encontró el Tipo de Vehículo: "${value}" para la Marca y Modelo especificados. Tipos válidos: ${validValues}`
        });

      } catch (e) {
        if (e.name === 'VALUE_NOT_FOUND' || e.name === 'MISSING_MARCA_MODELO') {
          throw error.create({
            name: 'INVALID_TIPO_VEHICULO',
            message: `Campo: "${fieldKey || 'custrecord_ht_bien_tipo'}" - ${e.message}`
          });
        }
        Utils.logError('Error buscando Tipo Vehículo', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar Tipo de Vehículo: ${e.message}`
        });
      }
    },

    /**
     * Busca Transmisión por descripción
     * @throws Error si no encuentra el valor
     */
    findTransmision: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;
      if (!isNaN(value)) return parseInt(value, 10);

      try {
        return this.findByDescription(
          'customrecord_ht_bn_transmision',
          'custrecord_ht_bn_descripcion',
          Utils.normalize(value),
          null,
          'Transmisión'
        );
      } catch (e) {
        throw error.create({
          name: 'INVALID_TRANSMISION',
          message: `Campo: "${fieldKey || 'custrecord_ht_bien_transmision'}" - Valor inválido: "${value}" - La Transmisión no existe en el catálogo`
        });
      }
    },

    /**
     * Busca Color por nombre
     * @throws Error si no encuentra el valor
     */
    findColor: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;
      if (!isNaN(value)) return parseInt(value, 10);

      try {
        return this.findByDescription(
          'customrecord_ht_bn_colorcarseg',
          'name',
          Utils.normalize(value),
          null,
          'Color'
        );
      } catch (e) {
        throw error.create({
          name: 'INVALID_COLOR',
          message: `Campo: "${fieldKey || 'custrecord_ht_bien_colorcarseg'}" - Valor inválido: "${value}" - El Color no existe en el catálogo`
        });
      }
    },

    /**
     * Busca Recorrido por altname
     * @throws Error si no encuentra el valor
     */
    findRecorrido: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;
      
      // Si es número, retornar directamente
      if (!isNaN(value)) return parseInt(value, 10);

      try {
        const normalized = Utils.normalize(value);
        
        // Usar SuiteQL para buscar por altname
        const sql = `
          SELECT id, altname as nombre 
          FROM customrecord_ht_record_recorrido 
          WHERE UPPER(altname) = ?
          AND isinactive = 'F'
        `;
        
        const results = query.runSuiteQL({
          query: sql,
          params: [normalized]
        }).asMappedResults();

        if (results && results.length > 0) {
          const foundId = parseInt(results[0].id, 10);
          Utils.logAudit('Recorrido encontrado', {
            id: foundId,
            nombre: results[0].nombre,
            searchValue: normalized
          });
          return foundId;
        }

        // Si no se encuentra, listar valores válidos
        const sqlValid = `
          SELECT altname as nombre 
          FROM customrecord_ht_record_recorrido 
          WHERE isinactive = 'F'
          ORDER BY altname
        `;
        
        const validResults = query.runSuiteQL({
          query: sqlValid
        }).asMappedResults();

        const validValues = validResults.map(r => r.nombre).join(', ');

        throw error.create({
          name: 'VALUE_NOT_FOUND',
          message: `No se encontró el Recorrido: "${value}".`
          //message: `No se encontró el Recorrido: "${value}". Valores válidos: ${validValues}`
        });

      } catch (e) {
        if (e.name === 'VALUE_NOT_FOUND') {
          throw error.create({
            name: 'INVALID_RECORRIDO',
            message: `Campo: "${fieldKey || 'custrecord_ht_bien_recorrido'}" - ${e.message}`
          });
        }
        Utils.logError('Error buscando Recorrido', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar Recorrido: ${e.message}`
        });
      }
    },

    /**
     * Busca Uso Vehículo por altname
     * @throws Error si no encuentra el valor
     */
    findUsoVehiculo: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;
      
      // Si es número, retornar directamente
      if (!isNaN(value)) return parseInt(value, 10);

      try {
        const normalized = Utils.normalize(value);
        
        // Usar SuiteQL para buscar por altname
        const sql = `
          SELECT id, altname as nombre 
          FROM customrecord_ht_bien_usovehiculo 
          WHERE UPPER(altname) = ?
          AND isinactive = 'F'
        `;
        
        const results = query.runSuiteQL({
          query: sql,
          params: [normalized]
        }).asMappedResults();

        if (results && results.length > 0) {
          const foundId = parseInt(results[0].id, 10);
          Utils.logAudit('Uso Vehículo encontrado', {
            id: foundId,
            nombre: results[0].nombre,
            searchValue: normalized
          });
          return foundId;
        }

        // Si no se encuentra, listar valores válidos
        const sqlValid = `
          SELECT altname as nombre 
          FROM customrecord_ht_bien_usovehiculo 
          WHERE isinactive = 'F'
          ORDER BY altname
        `;
        
        const validResults = query.runSuiteQL({
          query: sqlValid
        }).asMappedResults();

        const validValues = validResults.map(r => r.nombre).join(', ');

        throw error.create({
          name: 'VALUE_NOT_FOUND',
          message: `No se encontró el Uso de Vehículo: "${value}".`
          //message: `No se encontró el Uso de Vehículo: "${value}". Valores válidos: ${validValues}`
        });

      } catch (e) {
        if (e.name === 'VALUE_NOT_FOUND') {
          throw error.create({
            name: 'INVALID_USO_VEHICULO',
            message: `Campo: "${fieldKey || 'custrecord_ht_bien_usovehiculo'}" - ${e.message}`
          });
        }
        Utils.logError('Error buscando Uso Vehículo', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar Uso de Vehículo: ${e.message}`
        });
      }
    },

    /**
     * Busca Concesionario por RUC usando N/query
     * @throws Error si no encuentra el valor
     */
    findConcesionario: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;
      
      // Si es número, retornar directamente
      //if (!isNaN(value)) return parseInt(value, 10);

      try {
        const normalized = value.toString().trim();
        
        // Buscar por RUC
        const sql = `
          SELECT id, name, custrecord_ht_cd_ruccanaldistribucion as ruc
          FROM customrecord_ht_record_canaldistribucion 
          WHERE custrecord_ht_cd_ruccanaldistribucion = ?
          AND custrecord_ht_cd_tipocanal = 2
          AND custrecord_ht_cd_subsidiaria = 3
          AND isinactive = 'F'
        `;
        
        const results = query.runSuiteQL({
          query: sql,
          params: [normalized]
        }).asMappedResults();

        if (results && results.length > 0) {
          const foundId = parseInt(results[0].id, 10);
          Utils.logAudit('Concesionario encontrado por RUC', {
            id: foundId,
            name: results[0].name,
            ruc: results[0].ruc,
            searchValue: normalized
          });
          return foundId;
        }

        // Si no se encuentra, listar valores válidos
        const sqlValid = `
          SELECT name, custrecord_ht_cd_ruccanaldistribucion as ruc
          FROM customrecord_ht_record_canaldistribucion 
          WHERE custrecord_ht_cd_tipocanal = 2
          AND custrecord_ht_cd_subsidiaria = 3
          AND isinactive = 'F'
          ORDER BY name
        `;
        
        const validResults = query.runSuiteQL({
          query: sqlValid
        }).asMappedResults();

        const validValues = validResults.map(r => `${r.name} (${r.ruc})`).join(', ');

        throw error.create({
          name: 'VALUE_NOT_FOUND',
          message: `No se encontró Concesionario con RUC: "${value}".`
          //message: `No se encontró Concesionario con RUC: "${value}". Valores válidos: ${validValues}`
        });

      } catch (e) {
        if (e.name === 'VALUE_NOT_FOUND') {
          throw error.create({
            name: 'INVALID_CONCESIONARIO',
            message: `Campo: "${fieldKey || 'custrecord_ht_bien_consesionarios'}" - ${e.message}`
          });
        }
        Utils.logError('Error buscando Concesionario', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar Concesionario: ${e.message}`
        });
      }
    },

    /**
     * Busca Aseguradora por RUC usando N/query
     * @throws Error si no encuentra el valor
     */
    findAseguradora: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;
      
      // Si es número, retornar directamente
      //if (!isNaN(value)) return parseInt(value, 10);

      try {
        const normalized = value.toString().trim();
        
        // Buscar por RUC
        const sql = `
          SELECT id, name, custrecord_ht_cd_ruccanaldistribucion as ruc
          FROM customrecord_ht_record_canaldistribucion 
          WHERE custrecord_ht_cd_ruccanaldistribucion = ?
          AND custrecord_ht_cd_tipocanal = 1
          AND custrecord_ht_cd_subsidiaria = 3
          AND isinactive = 'F'
        `;
        
        const results = query.runSuiteQL({
          query: sql,
          params: [normalized]
        }).asMappedResults();

        if (results && results.length > 0) {
          const foundId = parseInt(results[0].id, 10);
          Utils.logAudit('Aseguradora encontrada por RUC', {
            id: foundId,
            name: results[0].name,
            ruc: results[0].ruc,
            searchValue: normalized
          });
          return foundId;
        }

        // Si no se encuentra, listar valores válidos
        const sqlValid = `
          SELECT name, custrecord_ht_cd_ruccanaldistribucion as ruc
          FROM customrecord_ht_record_canaldistribucion 
          WHERE custrecord_ht_cd_tipocanal = 1
          AND custrecord_ht_cd_subsidiaria = 3
          AND isinactive = 'F'
          ORDER BY name
        `;
        
        const validResults = query.runSuiteQL({
          query: sqlValid
        }).asMappedResults();

        const validValues = validResults.map(r => `${r.name} (${r.ruc})`).join(', ');

        throw error.create({
          name: 'VALUE_NOT_FOUND',          
          message: `No se encontró Aseguradora con RUC: "${value}".`
          //message: `No se encontró Aseguradora con RUC: "${value}". Valores válidos: ${validValues}`
        });

      } catch (e) {
        if (e.name === 'VALUE_NOT_FOUND') {
          throw error.create({
            name: 'INVALID_ASEGURADORA',
            message: `Campo: "${fieldKey || 'custrecord_ht_bien_companiaseguros'}" - ${e.message}`
          });
        }
        Utils.logError('Error buscando Aseguradora', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar Aseguradora: ${e.message}`
        });
      }
    },

    /**
     * Busca Tipo de Documento por nombre o alias usando mapeo directo
     * @throws Error si no encuentra el valor
     */
    findDocumentType: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;

      try {
        // Usar la función de utilidad para parsear
        const documentTypeId = Utils.parseDocumentType(value);
        
        if (documentTypeId) {
          Utils.logAudit('Tipo de Documento resuelto', {
            valorOriginal: value,
            idResuelto: documentTypeId,
            campo: fieldKey || 'custentity_pe_document_type'
          });
          return documentTypeId;
        }

        // Si llegamos aquí, no se encontró el tipo
        const validValues = Object.keys(CONFIG.DOCUMENT_TYPE_MAP).join(', ');
        throw error.create({
          name: 'VALUE_NOT_FOUND',
          message: `No se encontró el Tipo de Documento: "${value}". Valores válidos: ${validValues}`
        });

      } catch (e) {
        if (e.name === 'INVALID_DOCUMENT_TYPE' || e.name === 'VALUE_NOT_FOUND') {
          throw error.create({
            name: 'INVALID_DOCUMENT_TYPE',
            message: `Campo: "${fieldKey || 'custentity_pe_document_type'}" - ${e.message}`
          });
        }
        Utils.logError('Error buscando Tipo de Documento', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar Tipo de Documento: ${e.message}`
        });
      }
    },

    /**
     * Busca Tipo de Persona por nombre
     * @throws Error si no encuentra el valor
     */
    findPersonType: function (value, fieldKey) {
      if (Utils.isEmpty(value)) return null;
      
      // Si es número, retornar directamente
      if (!isNaN(value)) return parseInt(value, 10);

      try {
        // Normalizar el valor de entrada
        const normalized = Utils.normalize(value);
        
        // Buscar en el catálogo
        const filters = [
          ['name', 'is', normalized],
          'AND',
          ['isinactive', 'is', 'F']
        ];

        const searchObj = search.create({
          type: 'customrecord_pe1_type_of_person',
          filters: filters,
          columns: ['internalid', 'name']
        });

        let foundId = null;
        let foundName = null;
        searchObj.run().each(function (res) {
          foundId = res.getValue('internalid');
          foundName = res.getValue('name');
          Utils.logAudit('Tipo de Persona encontrado', {
            id: foundId,
            name: foundName,
            searchValue: normalized
          });
          return false; // solo el primero
        });

        if (!foundId) {
          // Listar tipos válidos para el mensaje de error
          const validTypes = [];
          search.create({
            type: 'customrecord_pe1_type_of_person',
            filters: [
              ['isinactive', 'is', 'F']
            ],
            columns: ['name']
          }).run().each(function (res) {
            validTypes.push(res.getValue('name'));
            return true;
          });

          throw error.create({
            name: 'VALUE_NOT_FOUND',            
            message: `No se encontró el Tipo de Persona: "${value}".`
            //message: `No se encontró el Tipo de Persona: "${value}". Valores válidos: ${validTypes.join(', ')}`
          });
        }

        return foundId;
      } catch (e) {
        if (e.name === 'VALUE_NOT_FOUND') {
          throw error.create({
            name: 'INVALID_PERSON_TYPE',
            message: `Campo: "${fieldKey || 'custentity_pe_type_of_person'}" - ${e.message}`
          });
        }
        Utils.logError('Error buscando Tipo de Persona', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar Tipo de Persona: ${e.message}`
        });
      }
    }

  };

  const Validator = {
    isValidEmail: (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    },

    isValidCellphone: (phone) => {
      const cleaned = (phone || '').replace(/\s+/g, '');
      return /^\d{9}$/.test(cleaned);
    },

    requireFields: function (obj, fields, context = '') {
      const missing = [];
      fields.forEach(f => {
        if (Utils.isEmpty(obj[f]) && obj[f] !== 0) {
          missing.push(f);
        }
      });

      if (missing.length > 0) {
        throw error.create({
          name: 'MISSING_REQUIRED_FIELDS',
          message: `${context ? context + ': ' : ''}Faltan campos obligatorios: ${missing.join(', ')}`
        });
      }
    },

    validatePhones: function (phones) {
      if (!Array.isArray(phones) || phones.length === 0) {
        throw error.create({
          name: 'INVALID_PHONES',
          message: 'Debe incluir al menos 1 teléfono'
        });
      }

      const cellphones = [];
      let principalCount = 0;

      phones.forEach((phone, idx) => {
        const number = (phone.number || '').replace(/\s+/g, '');
        if (!number) {
          throw error.create({
            name: 'INVALID_PHONE',
            message: `Teléfono ${idx + 1}: número es obligatorio`
          });
        }

        const type = (phone.typeName || phone.type || '').toLowerCase();
        if (type.includes('celular') || type.includes('móvil')) {
          if (!this.isValidCellphone(number)) {
            throw error.create({
              name: 'INVALID_CELLPHONE',
              message: `Teléfono ${idx + 1}: celular debe tener 9 dígitos`
            });
          }
          if (cellphones.includes(number)) {
            throw error.create({
              name: 'DUPLICATE_CELLPHONE',
              message: `Teléfono ${idx + 1}: celular ${number} duplicado`
            });
          }
          cellphones.push(number);
        }

        if (phone.principal) principalCount++;
      });

      if (principalCount !== 1) {
        throw error.create({
          name: 'INVALID_PRINCIPAL_PHONE',
          message: 'Debe haber exactamente 1 teléfono principal'
        });
      }
    },

    validateEmails: function (emails) {
      if (!Array.isArray(emails) || emails.length !== 3) {
        throw error.create({
          name: 'INVALID_EMAILS',
          message: 'Debe incluir exactamente 3 emails'
        });
      }

      const addresses = [];
      const types = [];

      emails.forEach((e, idx) => {
        const addr = (e.email || '').toLowerCase().trim();
        if (!this.isValidEmail(addr)) {
          throw error.create({
            name: 'INVALID_EMAIL_FORMAT',
            message: `Email ${idx + 1}: formato inválido`
          });
        }

        addresses.push(addr);

        const type = e.typeName || e.type || '';
        if (types.includes(type)) {
          throw error.create({
            name: 'DUPLICATE_EMAIL_TYPE',
            message: `Email ${idx + 1}: tipo "${type}" duplicado`
          });
        }
        types.push(type);
      });
    },

    validateAddresses: function (addresses) {
      if (!Array.isArray(addresses) || addresses.length === 0) {
        throw error.create({
          name: 'INVALID_ADDRESSES',
          message: 'Debe incluir al menos 1 dirección'
        });
      }

      addresses.forEach((addr, idx) => {
        if (Utils.isEmpty(addr.addr1)) {
          throw error.create({
            name: 'INVALID_ADDRESS',
            message: `Dirección ${idx + 1}: falta dirección (addr1)`
          });
        }

        if (Utils.isEmpty(addr.addressee)) {
          throw error.create({
            name: 'INVALID_ADDRESSEE',
            message: `Dirección ${idx + 1}: falta destinatario (addressee)`
          });
        }

        if (Utils.isEmpty(addr.country)) {
          throw error.create({
            name: 'INVALID_COUNTRY',
            message: `Dirección ${idx + 1}: falta país (country)`
          });
        }

        if (addr.country === 'PE') {
          if (Utils.isEmpty(addr.custrecord_pe_cod_ubigeo)) {
            throw error.create({
              name: 'INVALID_UBIGEO',
              message: `Dirección ${idx + 1}: ubigeo es obligatorio para Perú (custrecord_pe_cod_ubigeo)`
            });
          }
        }
      });
    }
  };

  const PrecioMAFSearcher = {
    findPrecioCabecera: function (precio) {
      Utils.logAudit('Buscando precio en cabecera MAF', { precio: precio });

      try {
        const precioStr = precio.toString();

        const searchObj = search.create({
          type: CONFIG.PRECIO_MAF_CAB_REC,
          filters: [
            ['custrecord_ht_pe_cab_maf_precio', 'is', precioStr],
            'AND',
            ['isinactive', 'is', 'F']
          ],
          columns: [
            'internalid',
            'custrecord_ht_pe_cab_maf_id',
            'custrecord_ht_pe_cab_maf_precio'
          ]
        });

        let result = null;
        searchObj.run().each(function (res) {
          result = {
            internalId: res.getValue('internalid'),
            cabId: res.getValue('custrecord_ht_pe_cab_maf_id'),
            precio: res.getValue('custrecord_ht_pe_cab_maf_precio')
          };
          Utils.logAudit('Precio encontrado en cabecera', result);
          return false;
        });

        if (!result) {
          Utils.logError('Precio no encontrado', { precio: precio });
          throw error.create({
            name: 'PRICE_NOT_FOUND',
            message: `El precio ${precio} no existe en el sistema MAF`
          });
        }

        return result;

      } catch (e) {
        if (e.name === 'PRICE_NOT_FOUND') throw e;
        Utils.logError('Error buscando precio en cabecera', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar precio: ${e.message}`
        });
      }
    },

    findItemsDetalle: function (cabId) {
      Utils.logAudit('Buscando items en detalle MAF', { cabId: cabId });

      try {
        const searchObj = search.create({
          type: CONFIG.PRECIO_MAF_DET_REC,
          filters: [
            ['custrecord_ht_pe_det_maf_cabid', 'is', cabId],
            'AND',
            ['isinactive', 'is', 'F']
          ],
          columns: [
            'internalid',
            'custrecord_ht_pe_det_maf_item',
            'custrecord_ht_pe_det_maf_precios',
            'custrecord_ht_pe_det_maf_mese_adic'
          ]
        });

        const items = [];
        searchObj.run().each(function (res) {
          const itemCode = res.getValue('custrecord_ht_pe_det_maf_item');
          const precio = res.getValue('custrecord_ht_pe_det_maf_precios');
          const mesesAdicionales = res.getValue('custrecord_ht_pe_det_maf_mese_adic') || 0;

          items.push({
            itemCode: itemCode,
            precio: precio,
            mesesAdicionales: parseInt(mesesAdicionales, 10) || 0
          });
          return true;
        });

        if (items.length === 0) {
          throw error.create({
            name: 'NO_ITEMS_FOR_PRICE',
            message: `No hay items asociados al precio en la tabla de detalle`
          });
        }

        Utils.logAudit('Items encontrados en detalle', {
          cabId: cabId,
          totalItems: items.length
        });

        return items;

      } catch (e) {
        if (e.name === 'NO_ITEMS_FOR_PRICE') throw e;
        Utils.logError('Error buscando items en detalle', e);
        throw error.create({
          name: 'SEARCH_ERROR',
          message: `Error al buscar items en detalle: ${e.message}`
        });
      }
    },

    findItemInternalId: function (itemCode) {
      Utils.logAudit('Buscando item en inventario', { itemCode: itemCode });

      try {
        const cleanItemCode = 'PE-' + itemCode;

        Utils.logAudit('cleanItemCode', { cleanItemCode: cleanItemCode });

        const searchObj = search.create({
          type: search.Type.ITEM,
          filters: [
            ['itemid', 'is', cleanItemCode]
          ],
          columns: ['internalid', 'itemid']
        });

        let itemId = null;
        searchObj.run().each(function (res) {
          itemId = parseInt(res.getValue('internalid'), 10);
          Utils.logAudit('Item encontrado', {
            itemId: itemId,
            itemCode: res.getValue('itemid')
          });
          return false;
        });

        if (!itemId) {
          const searchObj2 = search.create({
            type: search.Type.ITEM,
            filters: [
              ['itemid', 'is', itemCode]
            ],
            columns: ['internalid']
          });

          searchObj2.run().each(function (res) {
            itemId = parseInt(res.getValue('internalid'), 10);
            return false;
          });
        }

        if (!itemId) {
          Utils.logError('Item no encontrado en inventario', { itemCode: itemCode });
        }

        return itemId;

      } catch (e) {
        Utils.logError('Error buscando item', e);
        return null;
      }
    },

    getItemsByPrice: function (precio) {
      Utils.logAudit('INICIO - Búsqueda de items por precio MAF', { precio: precio });

      const cabecera = this.findPrecioCabecera(precio);
      const itemsDetalle = this.findItemsDetalle(cabecera.cabId);
      const precioUsuario = parseFloat(precio) || 0;

      const tempItems = [];
      const notFoundItems = [];

      itemsDetalle.forEach((item) => {
        const itemInternalId = this.findItemInternalId(item.itemCode);

        Utils.logAudit('Item encontrado', {
          itemInternalId: itemInternalId,
          itemCode: item.itemCode,
          precio: item.precio,
          mesesAdicionales: item.mesesAdicionales
        });

        if (itemInternalId) {
          tempItems.push({
            item: itemInternalId,
            itemCode: item.itemCode,
            precioUnitario: parseFloat(item.precio) || 0,
            mesesAdicionales: parseInt(item.mesesAdicionales, 10) || 0
          });
        } else {
          notFoundItems.push(item.itemCode);
        }
      });

      if (notFoundItems.length > 0) {
        throw error.create({
          name: 'ITEMS_NOT_FOUND',
          message: `Items no encontrados en inventario: ${notFoundItems.join(', ')}`
        });
      }

      let itemPrincipal = null;
      let maxMeses = -1;

      tempItems.forEach((item) => {
        if (item.mesesAdicionales > maxMeses) {
          maxMeses = item.mesesAdicionales;
          itemPrincipal = item;
        }
      });

      if (!itemPrincipal) {
        throw error.create({
          name: 'NO_PRINCIPAL_ITEM',
          message: 'No se pudo identificar el item principal'
        });
      }

      Utils.logAudit('Item principal identificado', {
        itemCode: itemPrincipal.itemCode,
        mesesAdicionales: itemPrincipal.mesesAdicionales
      });

      const precioItemPrincipal = itemPrincipal.precioUnitario * itemPrincipal.mesesAdicionales;

      let sumaOtrosPrecios = 0;
      tempItems.forEach((item) => {
        if (item.item !== itemPrincipal.item) {
          sumaOtrosPrecios += item.precioUnitario;
        }
      });

      const precioTotalCalculado = precioItemPrincipal + sumaOtrosPrecios;

      Utils.logAudit('Cálculo de precios', {
        precioItemPrincipal: precioItemPrincipal,
        sumaOtrosPrecios: sumaOtrosPrecios,
        precioTotalCalculado: precioTotalCalculado,
        precioUsuario: precioUsuario
      });

      const diferencia = Math.abs(precioTotalCalculado - precioUsuario);
      const tolerancia = 0.01;

      if (diferencia > tolerancia) {
        throw error.create({
          name: 'PRICE_MISMATCH',
          message: `El precio calculado (${precioTotalCalculado.toFixed(2)}) no coincide con el precio esperado (${precioUsuario.toFixed(2)}). Diferencia: ${diferencia.toFixed(2)}`
        });
      }

      let plazoTotal = 0;
      tempItems.forEach((item) => {
        plazoTotal += item.mesesAdicionales;
      });

      if (tempItems.length === 0 || plazoTotal === 0) {
        plazoTotal = 0;
      }

      Utils.logAudit('Plazo calculado', {
        plazoTotal: plazoTotal,
        desglose: tempItems.map(i => ({ itemCode: i.itemCode, meses: i.mesesAdicionales }))
      });

      const mappedItems = [];

      tempItems.forEach((item) => {
        let precioParaLinea = 0;

        if (item.item === itemPrincipal.item) {
          precioParaLinea = precioItemPrincipal;
        } else {
          precioParaLinea = item.precioUnitario;
        }

        mappedItems.push({
          item: item.item,
          itemCode: item.itemCode,
          precio: item.precioUnitario,
          mesesAdicionales: item.mesesAdicionales,
          cantidad: 1,
          totalConImpuestos: precioParaLinea,
          tasaImpuesto: 18,
          tiempoCobertura: plazoTotal,
          unidadTiempo: '2'
        });
      });

      Utils.logAudit('FIN - Items obtenidos por precio', {
        totalItems: mappedItems.length,
        plazoTotal: plazoTotal,
        precioTotalCalculado: precioTotalCalculado,
        itemsDetalle: mappedItems.map(i => ({
          itemCode: i.itemCode,
          precio: i.totalConImpuestos,
          plazo: i.tiempoCobertura
        }))
      });

      return {
        articulos: mappedItems,
        maxMesesAdicionales: maxMeses,
        plazoTotal: plazoTotal,
        cabId: cabecera.cabId
      };
    }
  };

  const Searcher = {
    findCustomerByDoc: function (docNumber) {
      if (Utils.isEmpty(docNumber)) return null;

      let customerId = null;
      search.create({
        type: record.Type.CUSTOMER,
        filters: [['custentity_pe_document_number', 'is', docNumber]],
        columns: ['internalid']
      }).run().each(function (result) {
        customerId = result.getValue('internalid');
        return false;
      });

      return customerId;
    },

    findBienByIdentifiers: function (placa, motor, chasis) {
      const filters = [];
      let hasFilters = false;

      /*if (!Utils.isEmpty(placa) && placa.toUpperCase() !== 'S/P') {
        if (hasFilters) filters.push('OR');
        filters.push(['custrecord_ht_bien_placa', 'is', placa]);
        hasFilters = true;
      }*/

      if (!Utils.isEmpty(motor)) {
        if (hasFilters) filters.push('OR');
        filters.push(['custrecord_ht_bien_motor', 'is', motor]);
        hasFilters = true;
      }

      if (!Utils.isEmpty(chasis)) {
        if (hasFilters) filters.push('OR');
        filters.push(['custrecord_ht_bien_chasis', 'is', chasis]);
        hasFilters = true;
      }

      if (!hasFilters) return null;

      let bienId = null;
      search.create({
        type: 'customrecord_ht_record_bienes',
        filters: filters,
        columns: ['internalid']
      }).run().each(function (result) {
        bienId = result.getValue('internalid');
        return false;
      });

      return bienId;
    },

    existsBienField: function (fieldId, value) {
      if (Utils.isEmpty(value)) return false;

      const val = Utils.normalize(value);
      const variants = [val];
      if (val !== val.toUpperCase()) variants.push(val.toUpperCase());

      const filters = [];
      variants.forEach((v, i) => {
        if (i > 0) filters.push('OR');
        filters.push([fieldId, 'is', v]);
      });

      const results = search.create({
        type: 'customrecord_ht_record_bienes',
        filters: filters,
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });

      return !!(results && results.length);
    },

    findEmployeeByEmail: function (email) {
      if (Utils.isEmpty(email)) return null;

      const em = email.toString().trim().toLowerCase();
      const results = search.create({
        type: search.Type.EMPLOYEE,
        filters: [
          ['email', 'is', em], 'AND',
          ['isinactive', 'is', 'F']
        ],
        columns: ['internalid', 'giveaccess']
      }).run().getRange({ start: 0, end: 10 });

      if (!results || !results.length) return null;

      let selected = results[0];
      for (let i = 0; i < results.length; i++) {
        const ga = results[i].getValue('giveaccess');
        if (ga === true || ga === 'T') {
          selected = results[i];
          break;
        }
      }

      return selected.getValue('internalid');
    }
  };

  const ClienteProcessor = {
    process: function (clienteData) {
      if (!clienteData) {
        throw error.create({
          name: 'MISSING_CLIENTE',
          message: 'Debe proporcionar datos del cliente'
        });
      }

      // Mapeo interno: si viene "email" simple, generar array "emails"
      if (clienteData.email && !clienteData.emails) {
        Utils.logAudit('Mapeando email simple a array de emails', { email: clienteData.email });
        clienteData.emails = [
          {
            email: clienteData.email,
            type: '1',
            typeName: 'E-MAIL',
            principal: true
          },
          {
            email: clienteData.email,
            type: '111',
            typeName: 'E-MAIL FACTURACIÓN ELECTRÓNICA',
            principal: false
          },
          {
            email: clienteData.email,
            type: '112',
            typeName: 'E-MAIL WEB SOPORTE TÉCNICO',
            principal: false
          }
        ];
      }

      // Mapeo interno: si viene "phone" simple, generar array "phones"
      if (clienteData.phone && !clienteData.phones) {
        Utils.logAudit('Mapeando phone simple a array de phones', { phone: clienteData.phone });
        clienteData.phones = [
          {
            number: clienteData.phone,
            type: '4',
            typeName: 'CELULAR',
            extension: '',
            principal: true
          }
        ];
      }

      // Mapeo interno: completar campos de addresses
      if (Array.isArray(clienteData.addresses)) {
        clienteData.addresses = clienteData.addresses.map((addr) => {
          const mappedAddr = { ...addr };

          // Setear label por defecto
          if (!mappedAddr.label) {
            mappedAddr.label = 'Principal';
          }

          // Setear country por defecto
          if (!mappedAddr.country) {
            mappedAddr.country = 'PE';
          }

          // Buscar departamento y distrito por cod_ubigeo
          if (mappedAddr.cod_ubigeo && !mappedAddr.departamento && !mappedAddr.distrito) {
            const ubigeoData = UbigeoSearcher.findByCode(mappedAddr.cod_ubigeo);
            if (ubigeoData) {
              mappedAddr.departamento = ubigeoData.departamento;
              mappedAddr.distrito = ubigeoData.distrito;
              // Mapear a campos NetSuite
              mappedAddr.custrecord_pe_departamento = ubigeoData.departamento;
              mappedAddr.custrecord_pe_distrito = ubigeoData.distrito;
              mappedAddr.dropdownstate = ubigeoData.provincia;
              mappedAddr.custrecord_pe_cod_ubigeo = mappedAddr.cod_ubigeo;
              mappedAddr.custrecord_pe_ubigeo = ubigeoData.internalId;
              Utils.logAudit('Ubigeo mapeado', {
                codigo: mappedAddr.cod_ubigeo,
                departamento: ubigeoData.departamento,
                distrito: ubigeoData.distrito,
                custrecord_pe_ubigeo: ubigeoData.internalId
              });
            }
          } else if (mappedAddr.cod_ubigeo) {
            // Si ya tiene departamento y distrito, solo mapear a campos NetSuite
            mappedAddr.custrecord_pe_departamento = mappedAddr.departamento;
            mappedAddr.custrecord_pe_distrito = mappedAddr.distrito;
            mappedAddr.custrecord_pe_cod_ubigeo = mappedAddr.cod_ubigeo;
          }

          return mappedAddr;
        });
      }

      Utils.logAudit('Procesando Cliente', clienteData);

      const docNumber = clienteData.documentNumber || clienteData.custentity_pe_document_number;
      let customerId = null;

      if (docNumber) {
        customerId = Searcher.findCustomerByDoc(docNumber);
      }

      if (customerId) {
        Utils.logAudit('Cliente existente encontrado', { customerId, docNumber });
        return customerId;
      }

      Utils.logAudit('Creando nuevo cliente', docNumber);
      return this.create(clienteData);
    },

    create: function (data) {
      Validator.requireFields(data, [
        'documentNumber',
        'documentType',
        'personType'
      ], 'Cliente');

      const isPerson = (data.isindividual || '').toLowerCase() === 'individual';

      if (isPerson) {
        Validator.requireFields(data, ['firstname', 'lastname'], 'Cliente (Persona)');
      } else {
        Validator.requireFields(data, ['companyname'], 'Cliente (Empresa)');
      }

      if (data.phones) Validator.validatePhones(data.phones);
      if (data.emails) Validator.validateEmails(data.emails);
      if (data.addresses) Validator.validateAddresses(data.addresses);

      let ownerId = null;
      if (data.ownerId) {
        ownerId = data.ownerId;
      } else if (data.ownerEmail || data.owner_email) {
        const email = data.ownerEmail || data.owner_email;
        ownerId = Searcher.findEmployeeByEmail(email);
      }

      const cust = record.create({
        type: record.Type.CUSTOMER,
        isDynamic: true
      });

      cust.setValue({ fieldId: 'subsidiary', value: CONFIG.DEFAULT_SUBSIDIARY });
      cust.setValue({ fieldId: 'currency', value: CONFIG.DEFAULT_CURRENCY });
      cust.setValue({ fieldId: 'entitystatus', value: CONFIG.DEFAULT_STATUS });

      
let documentTypeId = data.documentType;
      if (data.documentType) {
        try {
          documentTypeId = DescriptionSearcher.findDocumentType(
            data.documentType,
            'documentType'
          );
          Utils.logAudit('Tipo de Documento resuelto', {
            original: data.documentType,
            resolved: documentTypeId
          });
        } catch (e) {
          // Re-lanzar el error con contexto
          throw e;
        }
      }

      // ✨ NUEVO: Resolver Tipo de Persona
      let personTypeId = data.personType;
      if (data.personType) {
        try {
          personTypeId = DescriptionSearcher.findPersonType(
            data.personType,
            'personType'
          );
          Utils.logAudit('Tipo de Persona resuelto', {
            original: data.personType,
            resolved: personTypeId
          });
        } catch (e) {
          // Re-lanzar el error con contexto
          throw e;
        }
      }
      

      cust.setValue({
        fieldId: 'custentity_pe_document_type',
        value: documentTypeId
      });
      cust.setValue({
        fieldId: 'custentity_pe_document_number',
        value: data.documentNumber
      });
      cust.setValue({
        fieldId: 'custentity_pe_type_of_person',
        value: personTypeId
      });
      cust.setValue({ fieldId: 'vatregnumber', value: data.documentNumber });
      cust.setValue({ fieldId: 'isindividual', value: isPerson ? 'Individual' : 'Empresa' });
      cust.setValue({ fieldId: 'isperson', value: isPerson ? 'T' : 'F' });

      if (data.email) cust.setValue({ fieldId: 'email', value: data.email });
      if (data.phone) cust.setValue({ fieldId: 'phone', value: data.phone });

      if (ownerId) {
        try {
          cust.setValue({ fieldId: 'custentity_pe_ht_owner_customers', value: ownerId });
          cust.setValue({ fieldId: 'owner', value: ownerId });
          try {
            cust.setValue({ fieldId: 'salesrep', value: ownerId });
          } catch (e) {
            Utils.logError('No se pudo setear salesrep', e);
          }
        } catch (e) {
          Utils.logError('No se pudo setear owner', e);
        }
      }

      // Marcar MAF=true y API_SENT=true (bloquea envío temporal)
      cust.setValue({ fieldId: 'custentity_ht_pe_customer_maf', value: true });
      cust.setValue({ fieldId: 'custentity_cust_api_sent', value: true });

      if (isPerson) {
        const firstname = data.firstname || '';
        const lastname = data.lastname || '';

        const { first: primerNombre, rest: segundoNombre } = Utils.splitName(firstname);
        const { paterno, materno } = Utils.splitLastName(lastname);

        cust.setValue({ fieldId: 'firstname', value: firstname });
        cust.setValue({ fieldId: 'lastname', value: lastname });
        cust.setValue({ fieldId: 'custentity_ht_cl_primernombre', value: Utils.normalize(primerNombre) });
        cust.setValue({ fieldId: 'custentity_ht_cl_segundonombre', value: Utils.normalize(segundoNombre) });
        cust.setValue({ fieldId: 'custentity_ht_cl_apellidopaterno', value: Utils.normalize(paterno) });
        cust.setValue({ fieldId: 'custentity_ht_cl_apellidomaterno', value: Utils.normalize(materno) });
        cust.setValue({ fieldId: 'custentity_pe_legal_name', value: `${firstname} ${lastname}` });

      } else {
        const companyname = data.companyname || '';
        cust.setValue({ fieldId: 'companyname', value: companyname });
        cust.setValue({ fieldId: 'custentity_pe_legal_name', value: companyname });
      }

      // Direcciones
      if (Array.isArray(data.addresses)) {
        data.addresses.forEach(addr => {
          cust.selectNewLine({ sublistId: 'addressbook' });
          cust.setCurrentSublistValue({
            sublistId: 'addressbook',
            fieldId: 'label',
            value: addr.label || 'Principal'
          });
          cust.setCurrentSublistValue({
            sublistId: 'addressbook',
            fieldId: 'defaultbilling',
            value: true
          });
          cust.setCurrentSublistValue({
            sublistId: 'addressbook',
            fieldId: 'defaultshipping',
            value: true
          });

          const sub = cust.getCurrentSublistSubrecord({
            sublistId: 'addressbook',
            fieldId: 'addressbookaddress'
          });

          if (addr.country) sub.setValue({ fieldId: 'country', value: addr.country });
          if (addr.addressee) sub.setValue({ fieldId: 'addressee', value: addr.addressee });
          if (addr.attention) sub.setValue({ fieldId: 'attention', value: addr.attention });
          sub.setValue({ fieldId: 'addrphone', value: addr.addrphone || null });
          if (addr.addr1) sub.setValue({ fieldId: 'addr1', value: addr.addr1 });
          if (addr.addr2) sub.setValue({ fieldId: 'addr2', value: addr.addr2 });
          if (addr.addr3) sub.setValue({ fieldId: 'addr3', value: addr.addr3 });

          const cityValue = addr.city || addr.custrecord_pe_departamento;
          if (cityValue) sub.setValue({ fieldId: 'city', value: cityValue });

          const stateValue = addr.dropdownstate;
          if (stateValue) sub.setValue({ fieldId: 'state', value: stateValue });

          const setpe_ubigeo = addr.custrecord_pe_ubigeo;
          if (setpe_ubigeo) sub.setValue({ fieldId: 'custrecord_pe_ubigeo', value: setpe_ubigeo });

          const zipValue = addr.zip || addr.custrecord_pe_cod_ubigeo;
          if (zipValue) sub.setValue({ fieldId: 'zip', value: zipValue });

          if (addr.addrtext) sub.setValue({ fieldId: 'addrtext', value: addr.addrtext });

          // Campos personalizados (con try-catch)
          const customFields = [
            'custrecord_pe_departamento',
            'custrecord_pe_distrito',
            'custrecord_pe_cod_ubigeo',
            'custrecord_pe_ubigeo',
            'custrecord_ht_direccion_tipo',
            'custrecord_direccion_oficina',
            'custrecord_direccion_zona',
            'custrecord_direccion_latitud',
            'custrecord_direccion_longitud',
            'custrecord_ec_provincia',
            'custrecord_ec_canton',
            'custrecord_ec_parroquia'
          ];

          customFields.forEach(field => {
            try {
              if (addr[field]) {
                sub.setValue({ fieldId: field, value: addr[field] });
              }
            } catch (e) {
              Utils.logError(`Error seteando ${field}`, e);
            }
          });

          cust.commitLine({ sublistId: 'addressbook' });
        });
      }

      // Monedas
      [CONFIG.DEFAULT_CURRENCY, CONFIG.EXTRA_CURRENCY].forEach(cur => {
        cust.selectNewLine({ sublistId: 'currency' });
        cust.setCurrentSublistValue({ sublistId: 'currency', fieldId: 'currency', value: cur });
        cust.commitLine({ sublistId: 'currency' });
      });

      const customerId = cust.save({
        enableSourcing: true,
        ignoreMandatoryFields: false
      });

      Utils.logAudit('Cliente creado con MAF=true y API_SENT=true (bloqueado)', { customerId });

      // Crear teléfonos
      if (Array.isArray(data.phones)) {
        data.phones.forEach(phone => {
          try {
            const tel = record.create({ type: CONFIG.PHONE_REC });
            tel.setValue({ fieldId: CONFIG.PHONE_CUSTOMER_FLD, value: customerId });
            if (phone.number) {
              tel.setValue({
                fieldId: 'custrecord_ht_campo_txt_telefono',
                value: phone.number
              });
            }
            if (phone.type) {
              tel.setValue({
                fieldId: 'custrecord_ht_campo_list_tipo_telefono',
                value: Number(phone.type) || phone.type
              });
            }
            if (phone.extension) {
              tel.setValue({
                fieldId: 'custrecord_ht_campo_txt_extension',
                value: phone.extension
              });
            }
            tel.setValue({
              fieldId: 'custrecord_ht_campo_txt_principal',
              value: Utils.toBool(phone.principal)
            });
            tel.save();
          } catch (e) {
            Utils.logError('Error creando teléfono', e);
          }
        });
      }

      // Crear emails
      if (Array.isArray(data.emails)) {
        data.emails.forEach(em => {
          try {
            const email = record.create({ type: CONFIG.EMAIL_REC });
            email.setValue({ fieldId: CONFIG.EMAIL_CUSTOMER_FLD, value: customerId });
            if (em.email) {
              email.setValue({
                fieldId: 'custrecord_ht_email_email',
                value: em.email
              });
            }
            if (em.type) {
              email.setValue({
                fieldId: 'custrecord_ht_email_tipoemail',
                value: Number(em.type) || em.type
              });
            }
            email.setValue({
              fieldId: 'custrecord_ht_email_emailprincipal',
              value: Utils.toBool(em.principal)
            });
            email.save();
          } catch (e) {
            Utils.logError('Error creando email', e);
          }
        });
      }

      // Crear contactos
      if (Array.isArray(data.contacts)) {
        data.contacts.forEach(c => {
          try {
            const contact = record.create({ type: CONFIG.CONTACT_REC });
            contact.setValue({ fieldId: CONFIG.CONTACT_CUSTOMER_FLD, value: customerId });

            Object.keys(c).forEach(f => {
              if (Utils.isEmpty(c[f])) return;
              try {
                if (contact.getField({ fieldId: f })) {
                  contact.setValue({ fieldId: f, value: c[f] });
                }
              } catch (e) {
              }
            });

            contact.save();
          } catch (e) {
            Utils.logError('Error creando contacto', e);
          }
        });
      }

      Utils.logAudit('Todos los custom records creados', {
        customerId,
        phones: data.phones ? data.phones.length : 0,
        emails: data.emails ? data.emails.length : 0,
        contacts: data.contacts ? data.contacts.length : 0
      });

      return customerId;
    }
  };

  const BienProcessor = {
    process: function (bienData, customerId) {
      if (!bienData) {
        throw error.create({
          name: 'MISSING_BIEN',
          message: 'Debe proporcionar datos del bien/vehículo'
        });
      }

      // ✨ NUEVO: Resolver campos por descripción
      this.resolveDescriptions(bienData);

      Utils.logAudit('Procesando Bien (después de resolver descripciones)', bienData);

      const placa = bienData.custrecord_ht_bien_placa || bienData.placa;
      const motor = bienData.custrecord_ht_bien_motor || bienData.motor;
      const chasis = bienData.custrecord_ht_bien_chasis || bienData.chasis;

      let bienId = null;
      if (placa || motor || chasis) {
        bienId = Searcher.findBienByIdentifiers(placa, motor, chasis);
      }

      if (bienId) {
        Utils.logAudit('Bien existente encontrado', {
          bienId,
          placa,
          motor,
          chasis
        });
        return bienId;
      }

      Utils.logAudit('Creando nuevo bien', { placa, motor, chasis });
      return this.create(bienData, customerId);
    },

    /**
     * ✨ NUEVO: Resolver descripciones a IDs
     * Valida y convierte todos los campos de descripción a IDs
     * @throws Error con detalle del campo y valor que falló
     */
    resolveDescriptions: function (bienData) {
      Utils.logAudit('═══ INICIO: Resolución de descripciones ═══', null);
      
      const errors = [];
      
      let marcaId = null;
      let modeloId = null;

      // Tipo Bien
      if (bienData.custrecord_ht_bien_tipobien) {
        try {
          const resolved = DescriptionSearcher.findTipoBien(
            bienData.custrecord_ht_bien_tipobien,
            'custrecord_ht_bien_tipobien'
          );
          if (resolved) {
            Utils.logAudit('✓ Tipo Bien resuelto', {
              campo: 'custrecord_ht_bien_tipobien',
              valorOriginal: bienData.custrecord_ht_bien_tipobien,
              idResuelto: resolved
            });
            bienData.custrecord_ht_bien_tipobien = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_tipobien',
            valor: bienData.custrecord_ht_bien_tipobien,
            error: e.message
          });
        }
      }

      // Tipo Terrestre
      if (bienData.custrecord_ht_bien_tipoterrestre) {
        try {
          const resolved = DescriptionSearcher.findTipoTerrestre(
            bienData.custrecord_ht_bien_tipoterrestre,
            'custrecord_ht_bien_tipoterrestre'
          );
          if (resolved) {
            Utils.logAudit('✓ Tipo Terrestre resuelto', {
              campo: 'custrecord_ht_bien_tipoterrestre',
              valorOriginal: bienData.custrecord_ht_bien_tipoterrestre,
              idResuelto: resolved
            });
            bienData.custrecord_ht_bien_tipoterrestre = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_tipoterrestre',
            valor: bienData.custrecord_ht_bien_tipoterrestre,
            error: e.message
          });
        }
      }

      // Marca
      if (bienData.custrecord_ht_bien_marca) {
        try {
          const resolved = DescriptionSearcher.findMarca(
            bienData.custrecord_ht_bien_marca,
            'custrecord_ht_bien_marca'
          );
          if (resolved) {
            marcaId = resolved;  // ← GUARDAR para usar en Modelo
            Utils.logAudit('✓ Marca resuelta', {
              campo: 'custrecord_ht_bien_marca',
              valorOriginal: bienData.custrecord_ht_bien_marca,
              idResuelto: resolved
            });
            bienData.custrecord_ht_bien_marca = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_marca',
            valor: bienData.custrecord_ht_bien_marca,
            error: e.message
          });
        }
      }

      // Modelo
      if (bienData.custrecord_ht_bien_modelo) {
        try {
          const resolved = DescriptionSearcher.findModelo(
            bienData.custrecord_ht_bien_modelo,
            'custrecord_ht_bien_modelo',
            marcaId  // ← PASAR marcaId
          );
          if (resolved) {
            modeloId = resolved;  // ← GUARDAR para usar en Tipo
            Utils.logAudit('✓ Modelo resuelto', {
              campo: 'custrecord_ht_bien_modelo',
              valorOriginal: bienData.custrecord_ht_bien_modelo,
              idResuelto: resolved,
              marcaUsada: marcaId
            });
            bienData.custrecord_ht_bien_modelo = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_modelo',
            valor: bienData.custrecord_ht_bien_modelo,
            error: e.message
          });
        }
      }

      // Tipo Vehículo
      if (bienData.custrecord_ht_bien_tipo) {
        try {
          const resolved = DescriptionSearcher.findTipoVehiculo(
            bienData.custrecord_ht_bien_tipo,
            'custrecord_ht_bien_tipo',
            marcaId,   // ← PASAR marcaId
            modeloId   // ← PASAR modeloId
          );
          if (resolved) {
            Utils.logAudit('✓ Tipo Vehículo resuelto', {
              campo: 'custrecord_ht_bien_tipo',
              valorOriginal: bienData.custrecord_ht_bien_tipo,
              idResuelto: resolved,
              marcaUsada: marcaId,
              modeloUsado: modeloId
            });
            bienData.custrecord_ht_bien_tipo = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_tipo',
            valor: bienData.custrecord_ht_bien_tipo,
            error: e.message
          });
        }
      }

      // Transmisión
      if (bienData.custrecord_ht_bien_transmision) {
        try {
          const resolved = DescriptionSearcher.findTransmision(
            bienData.custrecord_ht_bien_transmision,
            'custrecord_ht_bien_transmision'
          );
          if (resolved) {
            Utils.logAudit('✓ Transmisión resuelta', {
              campo: 'custrecord_ht_bien_transmision',
              valorOriginal: bienData.custrecord_ht_bien_transmision,
              idResuelto: resolved
            });
            bienData.custrecord_ht_bien_transmision = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_transmision',
            valor: bienData.custrecord_ht_bien_transmision,
            error: e.message
          });
        }
      }

      // Color
      if (bienData.custrecord_ht_bien_colorcarseg) {
        try {
          const resolved = DescriptionSearcher.findColor(
            bienData.custrecord_ht_bien_colorcarseg,
            'custrecord_ht_bien_colorcarseg'
          );
          if (resolved) {
            Utils.logAudit('✓ Color resuelto', {
              campo: 'custrecord_ht_bien_colorcarseg',
              valorOriginal: bienData.custrecord_ht_bien_colorcarseg,
              idResuelto: resolved
            });
            bienData.custrecord_ht_bien_colorcarseg = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_colorcarseg',
            valor: bienData.custrecord_ht_bien_colorcarseg,
            error: e.message
          });
        }
      }

      // Recorrido
      if (bienData.custrecord_ht_bien_recorrido) {
        try {
          const resolved = DescriptionSearcher.findRecorrido(
            bienData.custrecord_ht_bien_recorrido,
            'custrecord_ht_bien_recorrido'
          );
          if (resolved) {
            Utils.logAudit('✓ Recorrido resuelto', {
              campo: 'custrecord_ht_bien_recorrido',
              valorOriginal: bienData.custrecord_ht_bien_recorrido,
              idResuelto: resolved
            });
            bienData.custrecord_ht_bien_recorrido = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_recorrido',
            valor: bienData.custrecord_ht_bien_recorrido,
            error: e.message
          });
        }
      }

      // Uso Vehículo
      if (bienData.custrecord_ht_bien_usovehiculo) {
        try {
          const resolved = DescriptionSearcher.findUsoVehiculo(
            bienData.custrecord_ht_bien_usovehiculo,
            'custrecord_ht_bien_usovehiculo'
          );
          if (resolved) {
            Utils.logAudit('✓ Uso Vehículo resuelto', {
              campo: 'custrecord_ht_bien_usovehiculo',
              valorOriginal: bienData.custrecord_ht_bien_usovehiculo,
              idResuelto: resolved
            });
            bienData.custrecord_ht_bien_usovehiculo = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_usovehiculo',
            valor: bienData.custrecord_ht_bien_usovehiculo,
            error: e.message
          });
        }
      }

      // Concesionario (por RUC)
      if (bienData.custrecord_ht_bien_consesionarios) {
        try {
          const resolved = DescriptionSearcher.findConcesionario(
            bienData.custrecord_ht_bien_consesionarios,
            'custrecord_ht_bien_consesionarios'
          );
          if (resolved) {
            Utils.logAudit('✓ Concesionario resuelto', {
              campo: 'custrecord_ht_bien_consesionarios',
              valorOriginal: bienData.custrecord_ht_bien_consesionarios,
              idResuelto: resolved
            });
            bienData.custrecord_ht_bien_consesionarios = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_consesionarios',
            valor: bienData.custrecord_ht_bien_consesionarios,
            error: e.message
          });
        }
      }

      // Aseguradora (por RUC)
      if (bienData.custrecord_ht_bien_companiaseguros) {
        try {
          const resolved = DescriptionSearcher.findAseguradora(
            bienData.custrecord_ht_bien_companiaseguros,
            'custrecord_ht_bien_companiaseguros'
          );
          if (resolved) {
            Utils.logAudit('✓ Aseguradora resuelta', {
              campo: 'custrecord_ht_bien_companiaseguros',
              valorOriginal: bienData.custrecord_ht_bien_companiaseguros,
              idResuelto: resolved
            });
            bienData.custrecord_ht_bien_companiaseguros = resolved;
          }
        } catch (e) {
          errors.push({
            campo: 'custrecord_ht_bien_companiaseguros',
            valor: bienData.custrecord_ht_bien_companiaseguros,
            error: e.message
          });
        }
      }

      // Si hay errores, lanzar excepción con todos los detalles
      /*if (errors.length > 0) {
        const errorDetails = errors.map(e => e.error).join(' | ');
        const errorSummary = errors.map(e => 
          `${e.campo}="${e.valor}"`
        ).join(', ');

        Utils.logError('✗ Errores en resolución de descripciones', {
          totalErrores: errors.length,
          campos: errorSummary,
          detalles: errors
        });

        throw error.create({
          name: 'CATALOG_VALIDATION_ERROR',
          message: `Errores de validación en catálogos del vehículo: ${errorDetails}`
        });
      }*/

      if (errors.length > 0) {
        // Crear mensaje detallado por cada error
        const errorMessages = errors.map(e => {
          const fieldLabels = {
            'custrecord_ht_bien_tipobien': 'Tipo de Bien',
            'custrecord_ht_bien_tipoterrestre': 'Tipo Terrestre',
            'custrecord_ht_bien_marca': 'Marca',
            'custrecord_ht_bien_modelo': 'Modelo',
            'custrecord_ht_bien_tipo': 'Tipo de Vehículo',
            'custrecord_ht_bien_transmision': 'Transmisión',
            'custrecord_ht_bien_colorcarseg': 'Color',
            'custrecord_ht_bien_recorrido': 'Recorrido',
            'custrecord_ht_bien_usovehiculo': 'Uso de Vehículo',
            'custrecord_ht_bien_consesionarios': 'Concesionario',
            'custrecord_ht_bien_companiaseguros': 'Aseguradora'
          };
          
          const label = fieldLabels[e.campo] || e.campo;
          return `• ${label}: "${e.valor}" - ${e.error}`;
        }).join('\n');

        const errorSummary = errors.map(e => 
          `${e.campo}="${e.valor}"`
        ).join(', ');

        Utils.logError('✗ Errores en resolución de descripciones', {
          totalErrores: errors.length,
          campos: errorSummary,
          detalles: errors
        });

        // ✨ NUEVO: Enviar email con errores
        try {
          sendErrorEmail('Errores de validación de catálogos del vehículo', {
            errores: errors,
            totalErrores: errors.length,
            mensajeDetallado: errorMessages,
            timestamp: new Date().toISOString()
          });
        } catch (emailError) {
          Utils.logError('No se pudo enviar email de error', emailError);
        }

        throw error.create({
          name: 'CATALOG_VALIDATION_ERROR',
          message: `Errores de validación en catálogos del vehículo (${errors.length} campo${errors.length > 1 ? 's' : ''}):\n${errorMessages}`
        });
      }

      Utils.logAudit('═══ FIN: Resolución de descripciones completada exitosamente ═══', {
        camposProcesados: Object.keys(bienData).length
      });
    },

    validateDuplicates: function (placa, motor, chasis) {
      const errors = [];

      /*if (placa && placa.toUpperCase() !== 'S/P') {
        if (Searcher.existsBienField('custrecord_ht_bien_placa', placa)) {
          errors.push({ field: 'placa', value: placa });
        }
      }*/

      if (motor) {
        if (Searcher.existsBienField('custrecord_ht_bien_motor', motor)) {
          errors.push({ field: 'motor', value: motor });
        }
      }

      if (chasis) {
        if (Searcher.existsBienField('custrecord_ht_bien_chasis', chasis)) {
          errors.push({ field: 'chasis', value: chasis });
        }
      }

      if (errors.length > 0) {
        const details = errors.map(e => `${e.field}=${e.value}`).join(', ');
        throw error.create({
          name: 'DUPLICATE_BIEN',
          message: `Bien duplicado: ${details}`,
          notifyOff: true
        });
      }
    },

    create: function (data, customerId) {
      Validator.requireFields(data, [
        'custrecord_ht_bien_motor',
        'custrecord_ht_bien_chasis',
        'custrecord_ht_bien_tipobien',
        'custrecord_ht_bien_tipoterrestre',
        'custrecord_ht_bien_marca',
        'custrecord_ht_bien_modelo',
        'custrecord_ht_bien_tipo',
        'custrecord_ht_bien_colorcarseg'
      ], 'Bien');

      const placa = Utils.normalize(
        data.custrecord_ht_bien_placa || data.placa || ''
      );
      const motor = Utils.normalize(
        data.custrecord_ht_bien_motor || data.motor || ''
      );
      const chasis = Utils.normalize(
        data.custrecord_ht_bien_chasis || data.chasis || ''
      );

      this.validateDuplicates(placa, motor, chasis);

      let ownerId = null;
      if (data.ownerId) {
        ownerId = data.ownerId;
      } else if (data.ownerEmail || data.owner_email) {
        const email = data.ownerEmail || data.owner_email;
        ownerId = Searcher.findEmployeeByEmail(email);
      }

      const bien = record.create({
        type: 'customrecord_ht_record_bienes',
        isDynamic: true
      });

      bien.setValue({
        fieldId: 'custrecord_ht_bien_propietario',
        value: customerId
      });

      bien.setValue({ fieldId: 'custrecord_ht_bien_placa', value: placa });
      bien.setValue({ fieldId: 'custrecord_ht_bien_motor', value: motor });
      bien.setValue({ fieldId: 'custrecord_ht_bien_chasis', value: chasis });
      bien.setValue({ fieldId: 'custrecord_ht_bien_oficina', value: 416 });
      bien.setValue({ fieldId: 'custrecord_ht_bien_financiadovehiculo', value: 19654 });
      bien.setValue({ fieldId: 'custrecord_pe_ht_financiador', value: customerId });
      bien.setValue({ fieldId: 'custrecord_pe_broker', value: 19909 });
      //bien.setValue({ fieldId: 'custrecord_ht_pe_sucursal', value: 1 });

      const altNameParts = [];
      if (data.custrecord_ht_bien_codsysh) {
        altNameParts.push(data.custrecord_ht_bien_codsysh);
      }
      if (placa) altNameParts.push('PLC.:' + placa);
      if (motor) altNameParts.push('MOT.:' + motor);
      if (chasis) altNameParts.push('CHA.:' + chasis);
      bien.setValue({ fieldId: 'altname', value: altNameParts.join(' ') });

      const bienFields = [
        'custrecord_ht_bien_codsysh',
        'custrecord_ht_bien_ano',
        'custrecord_ht_bien_clave',
        'custrecord_ht_bien_avaluo',
        'custrecord_ht_bien_tipobien',
        'custrecord_ht_bien_tipoterrestre',
        'custrecord_ht_bien_marca',
        'custrecord_ht_bien_modelo',
        'custrecord_ht_bien_tipo',
        'custrecord_ht_bien_transmision',
        'custrecord_ht_bien_colorcarseg',
        'custrecord_ht_bien_recorrido',
        'custrecord_ht_bien_usovehiculo',
        'custrecord_ht_bien_numeropuertas',
        'custrecord_ht_bien_consesionarios',
        'custrecord_ht_bien_companiaseguros',
        'custrecord_pe_ht_financiador',
        'custrecord_pe_broker',
        'custrecord_ht_pe_bien_ejecutivoren',
        'custrecord_ht_pe_bien_ejecutivo_ren',
        'custrecord_ht_bien_kilometraje',
        'custrecord_ht_bien_observacion'
      ];

      bienFields.forEach(f => {
        if (!Utils.isEmpty(data[f])) {
          try {
            bien.setValue({ fieldId: f, value: data[f] });
          } catch (e) {
            Utils.logError(`Error seteando campo bien: ${f}`, e);
          }
        }
      });

      if (Utils.isEmpty(data.custrecord_pe_broker)) {
        bien.setValue({
          fieldId: 'custrecord_pe_broker',
          value: CONFIG.DEFAULT_BROKER
        });
      }

      const bienId = bien.save({
        enableSourcing: true,
        ignoreMandatoryFields: false
      });

      Utils.logAudit('Bien creado', { bienId });

      if (data.custrecord_ht_bien_observacion) {
        try {
          record.submitFields({
            type: 'customrecord_ht_record_bienes',
            id: bienId,
            values: {
              custrecord_ht_bien_observacion: String(data.custrecord_ht_bien_observacion)
            }
          });
        } catch (e) {
          Utils.logError('Error guardando observación del bien', e);
        }
      }

      if (ownerId) {
        try {
          record.submitFields({
            type: 'customrecord_ht_record_bienes',
            id: bienId,
            values: { owner: Number(ownerId) }
          });
          Utils.logAudit('Owner del bien seteado post-save', { bienId, ownerId });
        } catch (e) {
          Utils.logError('Error seteando owner del bien', e);
        }
      }

      return bienId;
    }
  };

  const OSProcessor = {
    validate: function (data, customerId, bienId, bienRecord) {
      Utils.logAudit('Validando campos OS', { customerId, bienId });

      if (!customerId) {
        throw error.create({
          name: 'MISSING_CUSTOMER',
          message: 'Cliente no especificado o no se pudo crear'
        });
      }

      if (!bienId) {
        throw error.create({
          name: 'MISSING_BIEN',
          message: 'Bien/Vehículo no especificado o no se pudo crear'
        });
      }

      const required = [
        'moneda'
      ];

      Validator.requireFields(data, required, 'Orden de Servicio');

      const isModoMAF = !Utils.isEmpty(data.precioMAF) && Utils.nvlNum(data.precioMAF, 0) > 0;

      if (!isModoMAF) {

        if (Utils.isEmpty(data.ejecutivaReferencia)) {
          throw error.create({
            name: 'MISSING_EJECUTIVA_REFERENCIA',
            message: 'Falta: Ejecutiva de Referencia'
          });
        }

        if (Utils.isEmpty(data.ejecutivaRenovacion)) {
          throw error.create({
            name: 'MISSING_EJECUTIVA_RENOVACION',
            message: 'Falta: Ejecutiva de Renovación'
          });
        }

        if (!Array.isArray(data.articulos) || data.articulos.length === 0) {
          throw error.create({
            name: 'MISSING_ITEMS',
            message: 'Debe incluir al menos 1 artículo en la orden'
          });
        }
      } else {
        Utils.logAudit('Modo MAF detectado', { precioMAF: data.precioMAF });
      }

      const requiredBienFields = [
        { field: 'custrecord_ht_bien_consesionarios', name: 'Concesionario' },
        { field: 'custrecord_ht_bien_companiaseguros', name: 'Aseguradora' },
        { field: 'custrecord_ht_bien_financiadovehiculo', name: 'Financiera' }
      ];

      if (!bienRecord) {
        throw error.create({
          name: 'BIEN_NOT_LOADED',
          message: 'No se pudo cargar el bien para validar campos requeridos'
        });
      }

      requiredBienFields.forEach(({ field, name }) => {
        try {
          const value = bienRecord.getValue(field);
          if (Utils.isEmpty(value)) {
            throw error.create({
              name: `MISSING_${name.toUpperCase().replace(/\s+/g, '_')}`,
              message: `Falta: ${name} en el vehículo`
            });
          }
        } catch (e) {
          if (e.name && e.name.startsWith('MISSING_')) {
            throw e;
          }
          Utils.logError(`Error validando campo ${field} del bien`, e);
          throw error.create({
            name: `INVALID_BIEN_FIELD`,
            message: `Error validando campo ${name} en el vehículo`
          });
        }
      });

      Utils.logAudit('Validación OS exitosa', 'OK');
    },

    create: function (data, customerId, bienId, bienRecord) {
      Utils.logAudit('Creando Sales Order', { customerId, bienId });

      const isModoMAF = !Utils.isEmpty(data.precioMAF) && Utils.nvlNum(data.precioMAF, 0) > 0;

      if (isModoMAF) {
        Utils.logAudit('Modo MAF: Obteniendo items por precio', { precioMAF: data.precioMAF });
        const result = PrecioMAFSearcher.getItemsByPrice(data.precioMAF);
        data.articulos = result.articulos;
        data.ejecutivaReferencia = CONFIG.DEFAULT_EXECUTIVE_MAF;
        data.ejecutivaRenovacion = CONFIG.DEFAULT_EXECUTIVE_MAF;
        data.representanteVentas = CONFIG.DEFAULT_EXECUTIVE_MAF;
      }

      const getFromBien = (field) => {
        if (!bienRecord) return null;

        const bienFieldMap = {
          concesionario: 'custrecord_ht_bien_consesionarios',
          aseguradora: 'custrecord_ht_bien_companiaseguros',
          financiera: 'custrecord_ht_bien_financiadovehiculo',
          broker: 'custrecord_pe_broker'
        };

        const bienField = bienFieldMap[field];
        if (!bienField) return null;

        try {
          return bienRecord.getValue(bienField);
        } catch (e) {
          Utils.logError(`Error obteniendo ${field} del bien`, e);
          return null;
        }
      };

      const concesionario = getFromBien('concesionario');
      const aseguradora = getFromBien('aseguradora');
      const financiera = getFromBien('financiera');
      const broker = getFromBien('broker');

      const so = record.create({
        type: record.Type.SALES_ORDER,
        isDynamic: true
      });

      so.setValue({ fieldId: 'subsidiary', value: CONFIG.DEFAULT_SUBSIDIARY });
      so.setValue({ fieldId: 'entity', value: customerId });
      so.setValue({ fieldId: 'currency', value: Number(data.moneda) || data.moneda });
      so.setValue({ fieldId: 'custbody_os_vincula_pago_maf', value: data.cod_pago || '' });

      if (bienId) {
        so.setValue({ fieldId: 'custbody_ht_so_bien', value: bienId });
      }

      const oficina = 416;
      let departamento = data.departamento;

      if (oficina && !departamento) {
        const mapped = CONFIG.OFFICE_TO_DEPT[String(oficina)];
        if (mapped) departamento = mapped;
      }

      if (departamento) so.setValue({ fieldId: 'department', value: departamento });
      so.setValue({ fieldId: 'class', value: 76 });
      so.setValue({ fieldId: 'location', value: oficina });

      if (isModoMAF) {
        try {
          so.setValue({ fieldId: 'custbody_fac_maf', value: true });
          Utils.logAudit('Campo custbody_fac_maf marcado como TRUE (Orden MAF)', null);
        } catch (e) {
          Utils.logError('Error marcando custbody_fac_maf', e);
        }
      }

      const osFields = {
        custbody_canal_distribucion_sys: 6,
        custbody_ht_pe_os_leyenda: 13,
        custbody_pe_os_convenio: '',
        terms: '56',
        custbody_pe_os_forma_pago_sys: 2,
        custbody_ht_facturar_a: customerId,
        custbody_os_ejecutivarenovacion: data.ejecutivaRenovacion,
        custbody_ht_os_ejecutivareferencia: data.ejecutivaReferencia,
        custbody_pe_ht_lugar_instalacion: 1,
        custbody_ht_os_concesionario: concesionario,
        custbody_ht_os_companiaseguros: aseguradora,
        custbody_ht_os_bancofinanciera: financiera,
        custbody_ht_os_broker: broker
      };

      if (data.representanteVentas) {
        try {
          so.setValue({
            fieldId: 'salesrep',
            value: data.representanteVentas
          });
        } catch (e) {
          Utils.logError('Error seteando salesrep', e);
        }
      }

      Object.keys(osFields).forEach(field => {
        if (!Utils.isEmpty(osFields[field])) {
          try {
            so.setValue({ fieldId: field, value: osFields[field] });
          } catch (e) {
            Utils.logError(`Error seteando campo OS: ${field}`, e);
          }
        }
      });

      data.articulos.forEach((art, idx) => {
        try {
          so.selectNewLine({ sublistId: 'item' });

          if (Utils.isEmpty(art.item)) {
            throw error.create({
              name: 'MISSING_ITEM',
              message: `Línea ${idx + 1}: falta item/artículo`
            });
          }

          so.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            value: art.item
          });

          const qty = Utils.nvlNum(art.cantidad, 1);
          so.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            value: qty
          });

          const totalInc = Utils.nvlNum(art.totalConImpuestos || art.precio, 0);
          const taxRate = Utils.rate01(art.tasaImpuesto || 18);
          const unitPrice = Utils.round2(totalInc / qty / (1 + taxRate));

          so.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            value: unitPrice
          });

          const tiempo = Utils.nvlNum(art.tiempoCobertura, 0);
          if (tiempo > 0) {
            so.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_ht_os_tiempo_cobertura',
              value: tiempo
            });
          }

          if (art.unidadTiempo) {
            so.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_ht_os_und_tiempo_cobertura',
              value: art.unidadTiempo
            });
          }

          so.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_ht_os_cliente_monitoreo',
            value: customerId
          });

          const depLinea = art.departamento || departamento;
          const ofiLinea = art.oficina || oficina;

          if (depLinea) {
            so.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'department',
              value: depLinea
            });
          }

          if (ofiLinea) {
            so.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'location',
              value: ofiLinea
            });
          }

          so.commitLine({ sublistId: 'item' });

        } catch (e) {
          Utils.logError(`Error agregando línea ${idx + 1}`, e);
          throw error.create({
            name: 'LINE_ERROR',
            message: `Error en línea ${idx + 1}: ${e.message}`
          });
        }
      });

      const osId = so.save({
        enableSourcing: true,
        ignoreMandatoryFields: false
      });

      Utils.logAudit('Sales Order creada', { osId, modoMAF: isModoMAF });

      return osId;
    }
  };

  function unlockCustomerForSending(customerId) {
    try {
      Utils.logAudit('═══════════════════════════════════════════════════', null);
      Utils.logAudit('INICIO - Desbloquear cliente para envío', { customerId });

      const cust = record.load({
        type: record.Type.CUSTOMER,
        id: customerId,
        isDynamic: false
      });

      const docNumber = cust.getValue('custentity_pe_document_number');
      const mafFlag = cust.getValue('custentity_ht_pe_customer_maf');
      const apiSentBefore = cust.getValue('custentity_cust_api_sent');

      Utils.logAudit('Estado previo al desbloqueo', {
        customerId: customerId,
        documentNumber: docNumber,
        MAF: mafFlag,
        API_SENT: apiSentBefore
      });

      if (!mafFlag || mafFlag === 'F' || mafFlag === false) {
        Utils.logError('Cliente no tiene MAF=true', {
          customerId,
          mafFlag,
          mensaje: 'No se puede desbloquear un cliente sin MAF'
        });
        return false;
      }

      if (!apiSentBefore || apiSentBefore === 'F' || apiSentBefore === false) {
        Utils.logAudit('Cliente ya está desbloqueado', {
          customerId,
          mensaje: 'API_SENT ya está en false, no es necesario modificar'
        });
        return true;
      }

      cust.setValue({
        fieldId: 'custentity_cust_api_sent',
        value: false
      });

      Utils.logAudit('Campo API_SENT desmarcado, guardando registro...', null);

      const savedId = cust.save({
        enableSourcing: false,
        ignoreMandatoryFields: true
      });

      Utils.logAudit('═══════════════════════════════════════════════════', null);
      Utils.logAudit('FIN - Cliente desbloqueado exitosamente', {
        customerId: savedId,
        documentNumber: docNumber,
        mensaje: 'User Event debe ejecutarse ahora y enviar al sistema externo'
      });
      Utils.logAudit('═══════════════════════════════════════════════════', null);

      return true;

    } catch (e) {
      Utils.logError('ERROR al desbloquear cliente', e);
      Utils.logError('Stack trace', e.stack || 'No disponible');
      return false;
    }
  }

  function sendErrorEmail(subject, errorData) {
    try {
      
      const body = `
  <html>
  <body style="font-family: Arial, sans-serif;">
    <h2 style="color: #d32f2f;">Error en Creación de Orden de Servicio MAF</h2>
    
    <h3>Resumen:</h3>
    <ul>
      <li><strong>Total de errores:</strong> ${errorData.totalErrores}</li>
      <li><strong>Timestamp:</strong> ${errorData.timestamp}</li>
    </ul>
    
    <h3>Detalle de errores:</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead style="background-color: #f5f5f5;">
        <tr>
          <th>Campo</th>
          <th>Valor Enviado</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        ${errorData.errores.map(e => `
          <tr>
            <td><code>${e.campo}</code></td>
            <td><strong>${e.valor}</strong></td>
            <td style="color: #d32f2f;">${e.error}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <h3>Request Body Completo:</h3>
    <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto;">
  ${errorData.requestBody ? JSON.stringify(errorData.requestBody, null, 2) : 'No disponible'}
    </pre>
    
    <hr>
    <p style="color: #666; font-size: 12px;">
      Este es un email automático generado por el RESTlet de Creación de OS MAF.<br>
      Script: PE_RS_GENERA_OS_DEMANDA_MAF
    </p>
  </body>
  </html>
      `;

      emailenv.send({
        author: runtime.getCurrentUser().id,
        recipients: 'bleon@hunter.com.pe',//'grupodesarrollo@hunter.com.pe',
        subject: `[OS-API ERROR] ${subject}`,
        body: body
      });

      Utils.logAudit('Email de error enviado', {
        destinatario: 'bleon@hunter.com.pe',
        asunto: subject
      });

    } catch (e) {
      Utils.logError('Error enviando email de notificación', e);
    }
  }

  function post(requestBody) {
    const startTime = new Date();

    try {
      Utils.logAudit('═══════════════════════════════════════════════════', null);
      Utils.logAudit('INICIO - Crear Orden de Servicio', {
        timestamp: startTime.toISOString(),
        user: runtime.getCurrentUser().name
      });
      Utils.logAudit('Request Body', requestBody);

      if (!requestBody || typeof requestBody !== 'object') {
        throw error.create({
          name: 'INVALID_REQUEST',
          message: 'Body de la solicitud inválido o vacío'
        });
      }

      const clienteData = requestBody.cliente;
      const customerId = ClienteProcessor.process(clienteData);
      Utils.logAudit('Cliente procesado', { customerId });

      // ✨ NUEVO: Resolver moneda ANTES de procesar el bien
      if (requestBody.moneda) {
        try {
          const resolvedCurrency = Utils.parseCurrency(requestBody.moneda);
          if (resolvedCurrency) {
            Utils.logAudit('Moneda resuelta en main', {
              original: requestBody.moneda,
              resolved: resolvedCurrency
            });
            requestBody.moneda = resolvedCurrency;
          }
        } catch (e) {
          throw e; // Re-lanzar error de validación
        }
      }

      const bienData = requestBody.bien;
      const bienId = BienProcessor.process(bienData, customerId);
      Utils.logAudit('Bien procesado', { bienId });

      let bienRecord = null;
      if (bienId) {
        try {
          bienRecord = record.load({
            type: 'customrecord_ht_record_bienes',
            id: bienId,
            isDynamic: false
          });
          Utils.logAudit('Bien cargado exitosamente', { bienId });
        } catch (e) {
          Utils.logError('Error cargando bien', e);
          throw error.create({
            name: 'BIEN_LOAD_ERROR',
            message: `No se pudo cargar el bien: ${e.message}`
          });
        }
      }

      OSProcessor.validate(requestBody, customerId, bienId, bienRecord);
      const osId = OSProcessor.create(requestBody, customerId, bienId, bienRecord);
      Utils.logAudit('Orden de Servicio creada', { osId });

      const unlocked = unlockCustomerForSending(customerId);
      if (!unlocked) {
        Utils.logError('No se pudo desbloquear cliente', { customerId });
      }

      let tranId = null;
      try {
        const salesOrderFields = search.lookupFields({
          type: record.Type.SALES_ORDER,
          id: osId,
          columns: ['tranid']
        });
        tranId = salesOrderFields.tranid || osId;
        Utils.logAudit('TranID obtenido de la orden de servicio', { tranId });
      } catch (e) {
        Utils.logError('Error obteniendo tranid de la orden', e);
        tranId = osId;
      }

      const clienteDocumento = clienteData.documentNumber || clienteData.custentity_pe_document_number || customerId;

      /*let vehiculoPlaca = null;
      try {
        if (bienRecord) {
          vehiculoPlaca = bienRecord.getValue('custrecord_ht_bien_placa');
        }
        if (!vehiculoPlaca && bienData) {
          vehiculoPlaca = bienData.custrecord_ht_bien_placa || bienData.placa;
        }
        if (!vehiculoPlaca) {
          vehiculoPlaca = bienId;
        }
        Utils.logAudit('Placa obtenida del vehículo', { vehiculoPlaca });
      } catch (e) {
        Utils.logError('Error obteniendo placa del vehículo', e);
        vehiculoPlaca = bienId;
      }*/

      const endTime = new Date();
      const duration = endTime - startTime;

      const response = {
        success: true,
        code: 'OK',
        message: 'Orden de Servicio creada exitosamente',
        data: {
          salesOrderId: tranId,
          customerId: clienteDocumento,
          bienId: bienId,
          motor: requestBody.motor,
          timestamp: endTime.toISOString(),
          duration: `${duration}ms`
        }
      };

      Utils.logAudit('═══════════════════════════════════════════════════', null);
      Utils.logAudit('FIN - Orden de Servicio creada exitosamente', response.data);
      Utils.logAudit('═══════════════════════════════════════════════════', null);

      return response;

    } catch (e) {
      Utils.logError('ERROR GENERAL', e);

      if (e.name === 'CATALOG_VALIDATION_ERROR' || 
          e.name === 'INVALID_MARCA' || 
          e.name === 'INVALID_MODELO' ||
          e.name === 'INVALID_TIPO_VEHICULO' ||
          e.name === 'INVALID_CONCESIONARIO' ||
          e.name === 'INVALID_ASEGURADORA') {
        try {
          sendErrorEmail('Error en validación de catálogos', {
            errores: [{ campo: 'General', valor: 'N/A', error: e.message }],
            totalErrores: 1,
            timestamp: new Date().toISOString(),
            requestBody: requestBody
          });
        } catch (emailError) {
          Utils.logError('No se pudo enviar email de error general', emailError);
        }
      }

      const endTime = new Date();
      const duration = endTime - startTime;

      const errorResponse = {
        success: false,
        code: e.name || 'ERROR',
        message: e.message || 'Error desconocido al crear Orden de Servicio',
        details: {
          timestamp: endTime.toISOString(),
          duration: `${duration}ms`,
          stack: e.stack || null
        }
      };

      Utils.logAudit('═══════════════════════════════════════════════════', null);
      Utils.logAudit('FIN - Error al crear Orden de Servicio', errorResponse);
      Utils.logAudit('═══════════════════════════════════════════════════', null);

      return errorResponse;
    }
  }

  return {
    post: post
  };
});