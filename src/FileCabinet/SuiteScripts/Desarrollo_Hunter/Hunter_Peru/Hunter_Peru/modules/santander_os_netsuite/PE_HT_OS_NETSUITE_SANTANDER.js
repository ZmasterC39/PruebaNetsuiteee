/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], (search, log) => {

  const S1 = 'customsearch_ordenes_santander_operacion';

  const COL_NAMES = [
    'Fecha','Numero_Documento','Nombre','Nota','Codigo_Operacion',
    'Bien','Motor','Chasis','Financiera','Ejecutivo', 'Total_Facturar', 'Financiera_Bien'
  ];

  const PAGE = 1000;

  const fetchAll = (src, tag) => {
  const pagedData = src.runPaged({ pageSize: 1000 });
    //const pagedData = src.run().getRange({ start: 0, end: 1000 })
  const out = [];

  pagedData.pageRanges.forEach(pageRange => {
    const page = pagedData.fetch({ index: pageRange.index });

    log.audit(tag, `page ${pageRange.index}: ${page.data.length}`);

    out.push(...page.data);
  });

  log.audit(tag, `total ${out.length}`);

  return out;
};

  const mapRow = (row, cols) => {
    const obj = {};
    for (let i = 0; i < 12; i++) {
      //obj[COL_NAMES[i]] = (cols[i] && row.getValue(cols[i])) || '';
      obj[COL_NAMES[i]] = (cols[i] && (row.getText(cols[i]) || row.getValue(cols[i]))) || '';
    }
    return obj;
  };

  const GET = () => {
    log.audit('RESTLET', 'Inicio unificación');

    const sr1 = search.load({ id: S1 });
    const rows1 = fetchAll(sr1, 'Purchase');

    log.audit('RESTLET', `Filas S1: ${rows1.length}`);
   
    const data = rows1.map(r => mapRow(r, sr1.columns));

   log.audit('RESTLET', `Total procesado: ${data.length}`);

    return data;
  };

  return { get: GET };
});

