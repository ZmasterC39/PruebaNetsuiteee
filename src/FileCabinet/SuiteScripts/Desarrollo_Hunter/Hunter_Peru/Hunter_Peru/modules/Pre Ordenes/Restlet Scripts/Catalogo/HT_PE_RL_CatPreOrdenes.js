/**
 * Pre-Órdenes – Catálogos   (ago-2025)
 * ------------------------------------
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */
define(['N/query', 'N/log', 'N/search'], function (query, log, search) {
  /* ───── alias legibles → nombre lógico ───── */
  var alias = {
    vendedor: 'Vendedor',
    empleado: 'Empleado',
    tipocanal: 'TipoCanal',
    canal: 'CanalSYS',
    formapago: 'FormaPagoSYS',
    convenio: 'Convenio',
    lugarinstalacion: 'LugarInstalacion',
    unidadtiempo: 'UnidadTiempo',
    leyenda: 'Leyenda',
    condiciones: 'Condiciones',
    articulo: 'Item',
    clase: 'Clase'
  };

  /**
   * Función para buscar artículos usando N/search
   * @param {string|number} id - ID específico del artículo (opcional)
   * @returns {Array} - Array de artículos encontrados
   */
  function searchItems(id) {
    var items = [];
    var filters = [];

    if (id) {
      // Búsqueda por ID específico
      filters = [['internalid', 'anyof', id]];
    } else {
      // Búsqueda de todos los activos + PE-9829
      filters = [
        ['isinactive', 'is', 'F'],
        'OR',
        ['itemid', 'is', 'PE-9829']
      ];
    }

    try {
      var itemSearch = search.create({
        type: search.Type.ITEM,
        filters: filters,
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'itemid', sort: search.Sort.ASC }),
          search.createColumn({ name: 'displayname' }),
          search.createColumn({ name: 'salesdescription' }),
          search.createColumn({ name: 'type' }),
          search.createColumn({ name: 'custitem_ec_item_agrupado' })
        ]
      });

      var pageSize = 1000;
      var pagedData = itemSearch.runPaged({ pageSize: pageSize });

      log.audit({
        title: 'Búsqueda de Items',
        details: 'Total de páginas: ' + pagedData.pageRanges.length + ', Total items: ' + pagedData.count
      });

      pagedData.pageRanges.forEach(function (pageRange) {
        var page = pagedData.fetch({ index: pageRange.index });

        page.data.forEach(function (result) {
          var description =
            result.getValue('salesdescription') ||
            result.getValue('displayname') ||
            '';

          items.push({
            id: result.getValue('internalid'),
            itemid: result.getValue('itemid'),
            description: description,
            type: result.getValue('type'),
            itemagrupado: result.getValue('custitem_ec_item_agrupado')
          });
        });

        log.debug({
          title: 'Página procesada',
          details: 'Página ' + (pageRange.index + 1) + ' - Items: ' + page.data.length
        });
      });
    } catch (e) {
      log.error({
        title: 'Error en búsqueda de Items',
        details: e.toString()
      });
      throw e;
    }

    return items;
  }

  /**
   * Busca vendedores (customrecord_pe_ht_os_vendedor) con N/search
   * @param {string|number} id - internalid específico (opcional)
   * @returns {Array<{id:string,name:string,ruc:string}>}
   */
  function searchVendedores(id) {
    var vendedores = [];
    var filters = id ? [['internalid', 'anyof', id]] : [['isinactive', 'is', 'F']];

    try {
      var vendSearch = search.create({
        type: 'customrecord_pe_ht_os_vendedor',
        filters: filters,
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'name', sort: search.Sort.ASC }),
          search.createColumn({ name: 'custrecord_ht_pe_vd_id_concesionario' }) // ruc
        ]
      });

      var paged = vendSearch.runPaged({ pageSize: 1000 });

      log.audit({
        title: 'Búsqueda de Vendedores',
        details: 'Total de páginas: ' + paged.pageRanges.length + ', Total: ' + paged.count
      });

      paged.pageRanges.forEach(function (pageRange) {
        var page = paged.fetch({ index: pageRange.index });
        page.data.forEach(function (r) {
          vendedores.push({
            id: r.getValue('internalid'),
            name: r.getValue('name'),
            ruc: r.getValue('custrecord_ht_pe_vd_id_concesionario')
          });
        });

        log.debug({
          title: 'Página vendedores procesada',
          details: 'Página ' + (pageRange.index + 1) + ' - Registros: ' + page.data.length
        });
      });
    } catch (e) {
      log.error({ title: 'Error en búsqueda de Vendedores', details: e.toString() });
      throw e;
    }

    return vendedores;
  }

  /**
   * Función auxiliar para ejecutar consultas con paginación (para otros catálogos)
   * @param {string} sqlQuery - Consulta SQL a ejecutar
   * @param {Array} params - Parámetros de la consulta
   * @param {number} pageSize - Tamaño de página (default 5000)
   * @returns {Array} - Todos los resultados concatenados
   */
  function runQueryWithPagination(sqlQuery, params, pageSize) {
    pageSize = pageSize || 5000;
    var allResults = [];
    var paginatedQuery = query.runSuiteQLPaged({
      query: sqlQuery,
      params: params || [],
      pageSize: pageSize
    });

    log.debug({
      title: 'Paginación SQL',
      details: 'Total páginas: ' + paginatedQuery.pageRanges.length
    });

    // Iterar sobre todas las páginas
    paginatedQuery.pageRanges.forEach(function (pageRange) {
      var page = paginatedQuery.fetch({ index: pageRange.index });
      var pageResults = page.data.asMappedResults();
      allResults = allResults.concat(pageResults);

      log.debug({
        title: 'Página SQL procesada',
        details: 'Página ' + (pageRange.index + 1) + ' - Registros: ' + pageResults.length
      });
    });

    return allResults;
  }

  /* =========================================================== */
  function post(body) {
    try {
      var catKey = (body.caso || '').toString().toLowerCase();
      var cat = alias[catKey];
      if (!cat) throw new Error('Falta «caso».');

      var id = body.id || null;
      var tipocanal = body.tipocanal || null;
      var sub = body.subsidiaria || 3;

      var sql = '',
        p = [];

      /* ——— listas fijas ——— */
      if (cat === 'TipoCanal') {
        var tipos = [
          { id: 1, name: 'Aseguradora' },
          { id: 2, name: 'Concesionario' },
          { id: 3, name: 'Financiera' }
        ];
        return {
          success: true,
          items: id ? tipos.filter(function (t) { return +t.id === +id; }) : tipos
        };
      }

      /* ——— Artículo - Usando N/search en lugar de SuiteQL ——— */
      else if (cat === 'Item') {
        try {
          var items = searchItems(id);
          return {
            success: true,
            items: items,
            totalCount: items.length,
            message: 'Items recuperados usando búsqueda de NetSuite'
          };
        } catch (searchError) {
          log.error({ title: 'Error buscando Items', details: searchError });
          throw searchError;
        }
      }

      /* ——— Empleado (supervisor 35878 + sus subordinados) ——— */
      else if (cat === 'Empleado') {
        if (id) {
          // Consulta específica por ID
          sql =
            "SELECT id, firstname, lastname, email, " +
            "CASE WHEN firstname IS NOT NULL AND lastname IS NOT NULL " +
            "THEN firstname || ' ' || lastname " +
            "ELSE COALESCE(firstname, '') || COALESCE(lastname, '') END AS name " +
            'FROM employee WHERE id = ? AND isinactive = \'F\'';
          p = [id];
        } else {
          // Consulta para supervisor 35878 y sus subordinados
          sql =
            "SELECT id, firstname, lastname, email, " +
            "CASE WHEN firstname IS NOT NULL AND lastname IS NOT NULL " +
            "THEN firstname || ' ' || lastname " +
            "ELSE COALESCE(firstname, '') || COALESCE(lastname, '') END AS name " +
            "FROM employee WHERE isinactive = 'F' AND " +
            '(id = 35878 OR supervisor = 35878) ' +
            'ORDER BY firstname, lastname';
          p = [];
        }
      }

      /* ——— Forma de Pago SYS ——— */
      else if (cat === 'FormaPagoSYS') {
        sql = id
          ? 'SELECT id,name FROM customlist_pe_lista_forma_pago_sys WHERE id=?'
          : "SELECT id,name FROM customlist_pe_lista_forma_pago_sys WHERE isinactive='F' ORDER BY name";
        if (id) p = [id];
      }

      /* ——— Canal SYS ——— */
      else if (cat === 'CanalSYS') {
        sql = id
          ? 'SELECT id,name FROM customlist_lista_canal_distribuci_sys WHERE id=?'
          : "SELECT id,name FROM customlist_lista_canal_distribuci_sys WHERE isinactive='F' ORDER BY name";
        if (id) p = [id];
      }

      /* ——— Convenio ——— */
      else if (cat === 'Convenio') {
        sql = id
          ? 'SELECT id,name FROM customrecord_pe_convenios WHERE id=?'
          : "SELECT id,name FROM customrecord_pe_convenios WHERE isinactive='F' ORDER BY name";
        if (id) p = [id];
      }

      /* ——— Lugar de Instalación ——— */
      else if (cat === 'LugarInstalacion') {
        sql = id
          ? 'SELECT id, name FROM customlist_pe_ht_po_lugar_instacion WHERE id = ?'
          : "SELECT id, name FROM customlist_pe_ht_po_lugar_instacion WHERE isinactive = 'F' ORDER BY name";
        if (id) p = [id];
      }

      /* ——— Unidad de Tiempo ——— */
      else if (cat === 'UnidadTiempo') {
        sql = id
          ? 'SELECT id,name FROM customlist_ht_os_unid_tiempo WHERE id=?'
          : "SELECT id,name FROM customlist_ht_os_unid_tiempo WHERE isinactive='F' ORDER BY id";
        if (id) p = [id];
      }

      /* ——— Leyenda OS (customrecord_ht_pe_os_leyenda) ——— */
      else if (cat === 'Leyenda') {
        sql = id
          ? 'SELECT id AS id, custrecord_ht_pe_os_leyenda AS name FROM customrecord_ht_pe_os_leyenda WHERE id = ?'
          : "SELECT id AS id, custrecord_ht_pe_os_leyenda AS name FROM customrecord_ht_pe_os_leyenda WHERE isinactive = 'F' ORDER BY name";
        if (id) p = [id];
      }

      /* ——— Condiciones (Terms) ——— */
      else if (cat === 'Condiciones') {
        sql = id
          ? 'SELECT id,name FROM term WHERE id=?'
          : "SELECT id,name FROM term WHERE isinactive='F' ORDER BY name";
        if (id) p = [id];
      }

      /* ——— Vendedor ——— (MODIFICADO PARA USAR N/search) */
      else if (cat === 'Vendedor') {
        try {
          var vendedores = searchVendedores(id);
          return {
            success: true,
            items: vendedores,
            totalCount: vendedores.length,
            message: 'Vendedores recuperados usando búsqueda de NetSuite'
          };
        } catch (vendErr) {
          log.error({ title: 'Error buscando Vendedores', details: vendErr });
          throw vendErr;
        }
      }

      /* ——— Clase ——— */
      else if (cat === 'Clase') {
        sql = id
          ? 'SELECT id,name FROM Classification WHERE id=?'
          : "SELECT id,name FROM Classification WHERE isinactive='F' AND subsidiary=? ORDER BY name";
        p = id ? [id] : [sub];
      }

      /* ——— default ——— */
      else {
        throw new Error('Catálogo no soportado: ' + cat);
      }

      // Ejecución normal para todos los casos excepto Item, TipoCanal y Vendedor
      log.debug({ title: 'Cat.SQL', details: sql });

      var filas = query.runSuiteQL({
        query: sql,
        params: p
      }).asMappedResults();

      return {
        success: true,
        items: filas
      };
    } catch (e) {
      log.error({
        title: 'Catálogo',
        details: e
      });
      return {
        success: false,
        message: e.message
      };
    }
  }

  return {
    post: post
  };
});
