/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/query', 'N/log'], function (query, log) {

var alias = {
  // jerarquía principal
  marca               : 'Marca',
  modelo              : 'Modelo',
  tipovehiculo        : 'Tipo',

  // jerarquía Tipo de Bien
  tipobien            : 'TipoBien',
  tipoterrestre       : 'TipoTerrestre',

  // colores  ────────────────────────────────────────────────
  colorcarseg         : 'ColorAutosafe',
  colorautosafe       : 'ColorAutosafe',      // ← NUEVO  (sinónimo)
  //colorfabricante     : 'ColorFabricante',
  //colormatricula      : 'ColorMatricula',

  oficina             : 'Oficina',
  ejecutivorenovacion : 'EjecutivoRenovacion',

  // catálogos simples
  transmision         : 'Transmision',
  //caractadicional     : 'CaractAdicional',
  recorrido           : 'Recorrido',          //  nuevo
  usovehiculo         : 'UsoVehiculo',

  // canales
  concesionario       : 'Concesionario',
  companiaseguro      : 'Aseguradora',
  financiadovehiculo  : 'Financiera',
  financiador         : 'Financiador',
  broker              : 'Broker',

  // Sucursal de Concesionario  ─────────────────────────────
  sucursal            : 'SucursalConcesionario',            // ← NUEVO
  sucursalconcesionario: 'SucursalConcesionario',           // ← NUEVO (alias)
  sucursal_concesionario: 'SucursalConcesionario',          // ← NUEVO (alias)

  // lista fija
  cliente             : 'Cliente'
};

  /* ========================================================== */
  function doPost(body) {

   try {
    var raw = (body.tipoConsulta || body.caso || '').toString().toLowerCase();
    var cat = alias[raw] || raw;
    if (!cat) throw new Error('Falta «tipoConsulta» / «caso».');

    var idSolo       = body.id   || (body.dato && body.dato.id)   || null;
    var marca        = body.marca    || (body.dato && body.dato.marca)    || null;
    var modelo       = body.modelo   || (body.dato && body.dato.modelo)   || null;
    var tipobien     = body.tipobien || (body.dato && body.dato.tipobien) || null;
    var concesionario= body.concesionario || (body.dato && body.dato.concesionario) || null;

    var sql='', p=[];

      /* =================== QUERIES =================== */

      /* ----- Colores -------------------------------- */
      if (cat === 'ColorAutosafe') {
        if (idSolo) {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bn_colorcarseg WHERE id = ?';
          p   = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bn_colorcarseg WHERE custrecord_ht_bn_colorcarseg_subsidiaria = 3 ORDER BY name';
        }
      }
      /*    
      else if (cat === 'ColorFabricante') {
        if (idSolo) {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bn_colorfabricante WHERE id = ?';
          p   = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bn_colorfabricante ORDER BY name';
        }
      }
      
      else if (cat === 'ColorMatricula') {
        if (idSolo) {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bn_colormatricula WHERE id = ?';
          p   = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bn_colormatricula ORDER BY name';
        }
      }
      */

      /* ----- Marca ---------------------------------- */
      else if (cat === 'Marca') {
        if (idSolo) {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bien_marca WHERE id = ?';
          p   = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bien_marca ' +
                'WHERE custrecord_ht_marca_sub = 3 ORDER BY name';
        }
      }

      /* ----- Oficina -------------------------------- */
      else if (cat === 'Oficina') {
        if (idSolo) {
          sql = 'SELECT id, fullname AS name FROM Location WHERE id = ?';
          p   = [idSolo];
        } else {
          sql = 'SELECT id, fullname AS name FROM Location';
        }
      }

      /* ---------- EJECUTIVOS DE RENOVACIÓN -------------------- */
      else if (cat === 'EjecutivoRenovacion') {
        if (idSolo) {
          sql = 'SELECT id, (firstname || \' \' || lastname) AS name FROM Employee WHERE id = ?';
          p   = [idSolo];
        } else {
          sql = 'SELECT id, (firstname || \' \' || lastname) AS name ' +
                'FROM   Employee ' +
                'WHERE supervisor = 35878';
        }
      }

      /* ----- Modelo -------------------------------- */
      else if (cat === 'Modelo') {
        if (idSolo) {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bn_modelo WHERE id = ?';
          p   = [idSolo];
        } else {
          if (!marca) throw new Error('Falta «marca».');
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bn_modelo ' +
                'WHERE custrecord_ht_mb_marca = ? AND custrecord_ht_mod_subsidiaria = 3 ' +
                'ORDER BY name';
          p = [marca];
        }
      }

      /* ----- Tipo de vehículo ----------------------- */
else if (cat === 'Tipo') {
  if (idSolo) {
    sql = 'SELECT id AS id, name AS name FROM customrecord_ht_record_tipovehiculo WHERE id = ? AND custrecord_ht_tv_subsidiaria = 3';
    p   = [idSolo];
  } else {
    if (!marca || !modelo) throw new Error('Faltan «marca» y/o «modelo».');
    sql = [
      'SELECT tv.id AS id, tv.name AS name',
      'FROM customrecord_ht_record_tipovehiculo tv',
      'JOIN customrecord_ht_bn_modelo mo',
      '  ON tv.custrecord_ht_tv_cod_marca  = mo.custrecord_ht_cod_marca',
      ' AND tv.custrecord_ht_tv_cod_modelo = mo.custrecord_ht_mod_codigo',
      'WHERE mo.id = ? AND mo.custrecord_ht_mb_marca = ? AND tv.isinactive = \'F\' AND tv.custrecord_ht_tv_subsidiaria = 3',
      'ORDER BY tv.name'
    ].join(' ');
    p = [modelo, marca];
  }
}

      /* ----- TipoBien ------------------------------- */
      else if (cat === 'TipoBien') {
        if (idSolo) {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bien_tipobien WHERE id = ?';
          p   = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bien_tipobien ORDER BY name';
        }
      }
        
      /* ----- TipoTerrestre -------------------------- */
      else if (cat === 'TipoTerrestre') {
        if (idSolo) {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bien_tipoterrestre WHERE id = ?';
          p   = [idSolo];
        } else {
          if (!tipobien) throw new Error('Falta «tipobien».');
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_bien_tipoterrestre ' +
                'WHERE custrecord_ht_tt_tipobien = ? ORDER BY name';
          p = [tipobien];
        }
      }

      /* ----- Transmisión ---------------------------- */
      else if (cat === 'Transmision') {
        if (idSolo) {
          sql = 'SELECT id AS id, custrecord_ht_bn_descripcion AS name ' +
                'FROM customrecord_ht_bn_transmision WHERE id = ?';
          p = [idSolo];
        } else {
          sql = 'SELECT id AS id, custrecord_ht_bn_descripcion AS name ' +
                'FROM customrecord_ht_bn_transmision ORDER BY name';
        }
      }

      /* ----- Cliente (lista fija) ------------------- */
      else if (cat === 'Cliente') {
        sql = 'SELECT id AS id, entitytitle AS name FROM Customer WHERE id IN (495846, 47092)';
      }

      /* ----- Canal de distribución ------------------ */
      else if (cat === 'Concesionario' || cat === 'Aseguradora' || cat === 'Financiera') {
        if (idSolo) {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_record_canaldistribucion WHERE id = ?';
          p   = [idSolo];
        } else {
          var canal = (cat === 'Aseguradora') ? 1 : (cat === 'Concesionario') ? 2 : 3;
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_record_canaldistribucion ' +
                'WHERE custrecord_ht_cd_tipocanal = ? AND custrecord_ht_cd_subsidiaria = 3 ' +
                'AND isinactive = \'F\' ORDER BY name';
          p = [canal];
        }
      }

      /* ----- Recorrido ---------------------------- */
      else if (cat === 'Recorrido') {
        sql = idSolo ?
          'SELECT id, altname as name FROM customrecord_ht_record_recorrido WHERE id = ?'
        : 'SELECT id, altname as name FROM customrecord_ht_record_recorrido ORDER BY name';
        if (idSolo) p = [idSolo];
      }

      /* ----- Uso de vehículo ---------------------- */
      else if (cat === 'UsoVehiculo') {
        sql = idSolo ?
          'SELECT id, altname as name FROM customrecord_ht_bien_usovehiculo WHERE id = ?'
        : 'SELECT id, altname as name FROM customrecord_ht_bien_usovehiculo ORDER BY name';
        if (idSolo) p = [idSolo];
      }

/* ----- Financiador (Customer) ------------------ */
else if (cat === 'Financiador') {

  var textoBusqueda =
    body.name ||
    body.nombre ||
    body.search ||
    body.term ||
    body.q ||
    (body.dato && (
      body.dato.name ||
      body.dato.nombre ||
      body.dato.search ||
      body.dato.term ||
      body.dato.q
    )) ||
    '';

  textoBusqueda = textoBusqueda.toString().trim();

  if (idSolo) {
    sql = 'SELECT id AS id, entitytitle AS name FROM Customer WHERE id = ?';
    p = [idSolo];

  } else if (textoBusqueda && textoBusqueda.length >= 4) {
    sql = [
      'SELECT id, name FROM (',
      '  SELECT id AS id, entitytitle AS name',
      '  FROM Customer',
      '  WHERE UPPER(entitytitle) LIKE ?',
      '  ORDER BY entitytitle',
      ')',
      'WHERE ROWNUM <= 50'
    ].join(' ');

    p = ['%' + textoBusqueda.toUpperCase() + '%'];

  } else {
    return {
      success: true,
      items: []
    };
  }
}

      /*--------------- Broker-------------  */
      else if (cat === 'Broker') {
        if (idSolo) {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_record_canaldistribucion WHERE id = ?';
          p   = [idSolo];
        } else {
          sql = 'SELECT id AS id, name AS name FROM customrecord_ht_record_canaldistribucion ' +
                'WHERE custrecord_ht_cd_tipocanal = 4 AND custrecord_ht_cd_subsidiaria = 3 ' +
                'AND isinactive = \'F\' ORDER BY name';
        }
      }

      /* ----- Sucursal de Concesionario (NUEVO) ------ */
      else if (cat === 'SucursalConcesionario') {
        if (idSolo) {
          sql = 'SELECT id AS id, name AS name ' +
                'FROM customrecord_ht_pe_sucursal WHERE id = ?';
          p = [idSolo];
        } else {
          if (!concesionario) throw new Error('Falta «concesionario».');
          sql = 'SELECT id AS id, name AS name ' +
                'FROM customrecord_ht_pe_sucursal ' +
                'WHERE custrecord_ht_pe_consecionario = ? AND isinactive = \'F\' ' +
                'ORDER BY name';
          p = [concesionario];
        }
      }

      /* ----- Desconocido ---------------------------- */
      else {
        throw new Error('Catálogo no soportado: ' + cat);
      }

      /* ------------ ejecutar SuiteQL --------------- */
      log.debug({ title: 'SQL', details: sql });
      var rows = query.runSuiteQL({ query: sql, params: p }).asMappedResults();
      return { success: true, items: rows };

    } catch (e) {
      log.error({ title: 'Restlet Catálogos', details: e });
      return { success: false, message: e.message };
    }
  }

  return { post: doPost };
});
