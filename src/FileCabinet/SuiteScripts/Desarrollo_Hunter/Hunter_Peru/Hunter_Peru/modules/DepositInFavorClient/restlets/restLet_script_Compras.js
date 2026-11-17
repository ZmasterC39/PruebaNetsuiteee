/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], (search, log) => {

  const S1 = 'customsearch_pe_registro_de_compra_8_1_2';
  const S2 = 'customsearch_pe_reg_compras_8_1_er_2';

  const COL_NAMES = [
    'periodo','cuo','correlativo','fecha_emision','fecha_vencimiento',
    'tipo_doc','serie_doc','anio_dua','numero_doc','col10',
    'tipo_doc_prov','ruc_prov','razon_social','base_gravada','igv_gravada',
    'base_mixta','igv_mixta','base_sin_credito','igv_sin_credito',
    'valor_no_gravado','isc','icbp','otros_tributos','importe_total',
    'moneda','tipo_cambio','fec_doc_ref','tipo_doc_ref','serie_doc_ref',
    'cod_dependencia','num_doc_ref','fec_detraccion','num_detraccion',
    'retencion','clasif_bienes','ident_contrato','incons_tc',
    'incons_prov_no_habido','incons_prov','incons_dni','ind_pago',
    'estado_oportuno','periodo2','periodo_ini','periodo_fin','llave',
    'numero_documento','nota','tipo_cuenta','pais_fact', 'imp_original', 'porc_detrac','imp_original_detrac',
    'archivos_adjuntos', 'tasa_impuesto_real', 'cantidad_file'
  ];

  const PAGE = 1000;

  const fetchAll = (src, tag) => {
    const rs = src.run();
    const out = [];
    let from = 0, chunk;
    do {
      chunk = rs.getRange({ start: from, end: from + PAGE });
      log.audit(tag, `lote ${chunk.length}`);
      out.push(...chunk);
      from += PAGE;
    } while (chunk.length === PAGE);
    log.audit(tag, `total ${out.length}`);
    return out;
  };

  const mapRow = (row, cols) => {
    const obj = {};
    for (let i = 0; i < 56; i++) {
      obj[COL_NAMES[i]] = (cols[i] && row.getValue(cols[i])) || '';
    }
    return obj;
  };

  const GET = () => {
    log.audit('RESTLET', 'Inicio unificación');

    const sr1 = search.load({ id: S1 });
    const rows1 = fetchAll(sr1, 'Purchase');

    const sr2 = search.load({ id: S2 });
    const rows2 = fetchAll(sr2, 'ExpenseReport');

    log.audit('RESTLET', `Filas Purchase: ${rows1.length}`);
    log.audit('RESTLET', `Filas ExpenseReport: ${rows2.length}`);

    const data = [
      ...rows1.map(r => mapRow(r, sr1.columns)),
      ...rows2.map(r => mapRow(r, sr2.columns))
    ];

    log.audit('RESTLET', `Combinado total: ${data.length}`);

    return JSON.stringify(data);
  };

  return { get: GET };
});
