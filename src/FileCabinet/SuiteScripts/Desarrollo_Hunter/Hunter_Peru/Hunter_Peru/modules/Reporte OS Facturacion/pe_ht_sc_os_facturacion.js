/**
 *  @NApiVersion 2.x
 *  @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

/*───────────────────────  UTILIDADES  ───────────────────────*/

/** Datos básicos de la OS */
function fetchOrderBasic(id) {
  return search.lookupFields({
    type:  search.Type.SALES_ORDER,
    id:    id,
    columns: ['tranid', 'trandate', 'status', 'total']
  });
}

function fetchTransformations(id) {
  var tSearch = search.create({
    type: 'transaction',
    filters: [
      ['createdfrom', 'anyof', id], 'and',
      ['mainline',    'is',   'T']
    ],
    columns: ['internalid', 'type', 'tranid', 'trandate', 'status', 'total']
  });

  var list = [];
  tSearch.run().each(function (r) {
    if (r.getText('type') === 'EC Factura Interna') {
      list.push({
        id:     r.getValue('internalid'),
        type:   'EC Factura Interna',
        tranid: r.getValue('tranid'),
        date:   r.getValue('trandate'),
        status: r.getText('status'),
        total:  r.getValue('total')
      });
    }
    return true;
  });
  return list;
}


/*
function fetchLinks(id) {
  try {
    var rec = record.load({
      type:      record.Type.SALES_ORDER,
      id:        id,
      isDynamic: false
    });

    var rows      = rec.getLineCount({ sublistId: 'links' });
    var linksList = [];

    for (var i = 0; i < rows; i++) {
      var typeTxt = rec.getSublistValue({
        sublistId: 'links',
        fieldId:   'type',
        line:      i
      });
      if (typeTxt === 'Factura de venta') {        // filtra el tipo
        linksList.push({
          id:       rec.getSublistValue({ sublistId: 'links', fieldId: 'id',       line: i }),
          linktype: rec.getSublistValue({ sublistId: 'links', fieldId: 'linktype', line: i }),
          type:     typeTxt,
          tranid:   rec.getSublistValue({ sublistId: 'links', fieldId: 'tranid',   line: i }),
          date:     rec.getSublistValue({ sublistId: 'links', fieldId: 'trandate', line: i }),
          status:   rec.getSublistValue({ sublistId: 'links', fieldId: 'status',   line: i }),
          total:    rec.getSublistValue({ sublistId: 'links', fieldId: 'total',    line: i }),
          url:      rec.getSublistValue({ sublistId: 'links', fieldId: 'linkurl',  line: i })
        });
      }
    }
    return linksList;

  } catch (e) {
    if (e.name === 'RCRD_LOCKED_BY_WF') {
      log.debug({ title: 'OS ' + id + ' bloqueada', details: 'Links omitidos (record locked)' });
      return [];
    }
    throw e;
  }
}
*/

/*──────────────────────────  EXECUTE  ─────────────────────────*/
function execute() {

  var soSearch = search.create({
    type: search.Type.SALES_ORDER,
    filters: [
      ['mainline',   'is',   'T'   ], 'and',
      ['subsidiary', 'anyof','3'   ], 'and',
      ['entity',     'noneof','38014']
    ],
    columns: [
      search.createColumn({ name: 'internalid', sort: search.Sort.DESC })
    ]
  });

  var collected = [];
  var paged     = soSearch.runPaged({ pageSize: 1000 });

  for (var p = 0; p < paged.pageRanges.length && collected.length < 10; p++) {
    var page = paged.fetch({ index: p });

    for (var i = 0; i < page.data.length && collected.length < 10; i++) {

      var soId  = page.data[i].getValue('internalid');
      var trans = fetchTransformations(soId);
      // var links = fetchLinks(soId);   // ← desactivado

      if (trans.length > 0) {          // solo nos importan las Fact. Internas
        collected.push({
          id:              soId,
          order:           fetchOrderBasic(soId),
          transformations: trans
          // ,links:        links        // ← desactivado
        });
      }
    }
  }

  log.audit({
    title:   'TOP-10 OS (sub 3) – EC Factura Interna',
    details: JSON.stringify(collected, null, 2)
  });
}

return { execute: execute };

});
