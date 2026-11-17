/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/url', 'N/format', 'N/log'],
  (serverWidget, search, url, format, log) => {

  const FIXED_SUBSIDIARY_ID = '3';
  const RECORD_TYPE_FACTURA_INTERNA = 'customsale_ec_factura_interna';
  const ANYOF_CHUNK_SIZE = 500;

  const isNsNullAdapter = (v) => {
    try {
      if (v === null || v === undefined) return true;
      if (typeof v === 'object' || typeof v === 'function') return true;
      return String(v).indexOf('ScriptNullObjectAdapter@') !== -1;
    } catch (e) {
      return true;
    }
  };

  const cleanStr = (v) => isNsNullAdapter(v) ? '' : String(v);

  const trim = (v) => cleanStr(v).trim();

  const toNum = (v, def = 0) => {
    const n = parseFloat(cleanStr(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : def;
  };

  const getTextSafe = (r, opts) => cleanStr(r.getText(opts));

  const getValueSafe = (r, opts) => cleanStr(r.getValue(opts));

  const fmtDate = (d) => {
    try {
      return format.format({
        value: d,
        type: format.Type.DATE
      });
    } catch (e) {
      return '';
    }
  };

  const fmt2 = (v) => {
    const n = toNum(v, NaN);
    return Number.isFinite(n) ? n.toFixed(2) : '';
  };

  const parseDateParam = (val) => {
    const s = cleanStr(val);

    if (!s) return null;

    try {
      return format.parse({
        value: s,
        type: format.Type.DATE
      });
    } catch (e) {
      return null;
    }
  };

  /*
   * ============================================================
   * FECHA PREDETERMINADA
   * ============================================================
   *
   * Antes:
   *   from = primer día del mes
   *   to   = último día del mes
   *
   * Ahora:
   *   from = hoy
   *   to   = hoy
   *
   * Los campos siguen siendo editables.
   */
  const getDefaultMonthRange = () => {
    const today = new Date();

    return {
      from: today,
      to: today
    };
  };

  const uniq = (arr) => {
    const seen = {};
    const out = [];

    (arr || []).forEach((v) => {
      const s = cleanStr(v).trim();

      if (s && !seen[s]) {
        seen[s] = true;
        out.push(s);
      }
    });

    return out;
  };

  const chunkArray = (arr, size) => {
    const chunks = [];

    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }

    return chunks;
  };

  const addContainsFilter = (filters, field, val) => {
    const s = trim(val).toUpperCase();

    if (s) {
      filters.push(
        'AND',
        [field, 'contains', s]
      );
    }
  };

  const csvCell = (v) =>
    `"${String(cleanStr(v)).replace(/"/g, '""')}"`;

  const setLineValue = (sublist, id, line, val, maxLen = 300) => {
    let s = cleanStr(val);

    if (!s) return;

    if (val instanceof Date) {
      s = fmtDate(val);
    }

    if (s.length > maxLen) {
      s = s.substring(0, maxLen);
    }

    sublist.setSublistValue({
      id,
      line,
      value: s
    });
  };

  const forEachPaged = (searchObj, callback) => {
    const paged = searchObj.runPaged({
      pageSize: 1000
    });

    for (let p = 0; p < paged.pageRanges.length; p++) {
      const page = paged.fetch({
        index: p
      });

      for (let i = 0; i < page.data.length; i++) {
        callback(page.data[i]);
      }
    }
  };

  const addExportNativeButton = (form) => {
    const fldAction = form.addField({
      id: 'custpage_action',
      type: serverWidget.FieldType.TEXT,
      label: ' '
    });

    fldAction.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN
    });

    fldAction.defaultValue = '';

    form.addButton({
      id: 'custpage_btn_export',
      label: 'Exportar CSV',
      functionName: 'custpage_export_csv'
    });

    const fld = form.addField({
      id: 'custpage_export_js',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' '
    });

    fld.defaultValue = `
      <script>
        function custpage_export_csv(){
          try{
            var f = document.forms && document.forms[0];

            if (!f) return;

            var act = document.getElementById('custpage_action');

            if (!act){
              act = document.createElement('input');
              act.type = 'hidden';
              act.name = 'custpage_action';
              act.id = 'custpage_action';
              f.appendChild(act);
            }

            act.value = 'export';
            f.submit();

          }catch(e){}
        }
      </script>
    `;
  };

  const buildForm = (params) => {
    const form = serverWidget.createForm({
      title: 'Reporte de Facturas Internas'
    });

    /*
     * Ahora def.from y def.to contienen la fecha actual.
     */
    const def = getDefaultMonthRange();

    /*
     * ------------------------------------------------------------
     * FECHA DESDE
     * ------------------------------------------------------------
     *
     * Si el usuario ya seleccionó una fecha:
     *   usa params.custpage_date_from
     *
     * Si no:
     *   usa la fecha actual.
     */
    form.addField({
      id: 'custpage_date_from',
      type: serverWidget.FieldType.DATE,
      label: 'Fecha desde'
    }).defaultValue =
      cleanStr(params.custpage_date_from) ||
      fmtDate(def.from);

    /*
     * ------------------------------------------------------------
     * FECHA HASTA
     * ------------------------------------------------------------
     *
     * Si el usuario ya seleccionó una fecha:
     *   usa params.custpage_date_to
     *
     * Si no:
     *   usa la fecha actual.
     */
    form.addField({
      id: 'custpage_date_to',
      type: serverWidget.FieldType.DATE,
      label: 'Fecha hasta'
    }).defaultValue =
      cleanStr(params.custpage_date_to) ||
      fmtDate(def.to);

    form.addField({
      id: 'custpage_tranid',
      type: serverWidget.FieldType.TEXT,
      label: 'Factura interna'
    }).defaultValue =
      cleanStr(params.custpage_tranid) ||
      '';

    form.addField({
      id: 'custpage_cliente',
      type: serverWidget.FieldType.TEXT,
      label: 'Cliente'
    }).defaultValue =
      cleanStr(params.custpage_cliente) ||
      '';

    form.addField({
      id: 'custpage_facturar_a',
      type: serverWidget.FieldType.TEXT,
      label: 'Facturar a'
    }).defaultValue =
      cleanStr(params.custpage_facturar_a) ||
      '';

    form.addField({
      id: 'custpage_ht_cod_agru',
      type: serverWidget.FieldType.TEXT,
      label: 'Cod. agrupador'
    }).defaultValue =
      cleanStr(params.custpage_ht_cod_agru) ||
      '';

    form.addField({
      id: 'custpage_memo',
      type: serverWidget.FieldType.TEXT,
      label: 'Memo / OS'
    }).defaultValue =
      cleanStr(params.custpage_memo) ||
      '';

    form.addSubmitButton({
      label: 'Buscar'
    });

    addExportNativeButton(form);

    const fldCount = form.addField({
      id: 'custpage_count',
      type: serverWidget.FieldType.INTEGER,
      label: 'Recuento'
    });

    fldCount.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.INLINE
    });

    const sublist = form.addSublist({
      id: 'custpage_results',
      type: serverWidget.SublistType.LIST,
      label: 'Facturas internas'
    });

    sublist.addField({
      id: 'custpage_ver',
      type: serverWidget.FieldType.URL,
      label: 'Ver'
    });

    sublist.addField({
      id: 'custpage_internalid',
      type: serverWidget.FieldType.TEXT,
      label: 'ID Interno'
    });

    sublist.addField({
      id: 'custpage_tranid',
      type: serverWidget.FieldType.TEXT,
      label: 'Factura interna'
    });

    sublist.addField({
      id: 'custpage_createdfrom',
      type: serverWidget.FieldType.TEXT,
      label: 'Created From'
    });

    sublist.addField({
      id: 'custpage_fecha',
      type: serverWidget.FieldType.TEXT,
      label: 'Fecha'
    });

    sublist.addField({
      id: 'custpage_cliente',
      type: serverWidget.FieldType.TEXT,
      label: 'Cliente'
    });

    sublist.addField({
      id: 'custpage_cliente_doc',
      type: serverWidget.FieldType.TEXT,
      label: 'Doc. cliente'
    });

    sublist.addField({
      id: 'custpage_facturar_a',
      type: serverWidget.FieldType.TEXT,
      label: 'Facturar a'
    });

    sublist.addField({
      id: 'custpage_factura_directa',
      type: serverWidget.FieldType.TEXT,
      label: 'Factura directa'
    });

    sublist.addField({
      id: 'custpage_cod_agru',
      type: serverWidget.FieldType.TEXT,
      label: 'Cod. agrupador'
    });

    sublist.addField({
      id: 'custpage_memo',
      type: serverWidget.FieldType.TEXT,
      label: 'Memo / OS'
    });

    sublist.addField({
      id: 'custpage_currency',
      type: serverWidget.FieldType.TEXT,
      label: 'Moneda'
    });

    sublist.addField({
      id: 'custpage_exchangerate',
      type: serverWidget.FieldType.TEXT,
      label: 'Tipo cambio'
    });

    sublist.addField({
      id: 'custpage_fxamount',
      type: serverWidget.FieldType.TEXT,
      label: 'FX Amount'
    });

    sublist.addField({
      id: 'custpage_total',
      type: serverWidget.FieldType.TEXT,
      label: 'Total'
    });

    sublist.addField({
      id: 'custpage_rate',
      type: serverWidget.FieldType.TEXT,
      label: 'Precio'
    });

    sublist.addField({
      id: 'custpage_quantity',
      type: serverWidget.FieldType.TEXT,
      label: 'Cantidad'
    });

    sublist.addField({
      id: 'custpage_amount',
      type: serverWidget.FieldType.TEXT,
      label: 'Importe línea'
    });

    sublist.addField({
      id: 'custpage_placa',
      type: serverWidget.FieldType.TEXT,
      label: 'Placa'
    });

    sublist.addField({
      id: 'custpage_chasis',
      type: serverWidget.FieldType.TEXT,
      label: 'Chasis'
    });

    sublist.addField({
      id: 'custpage_items',
      type: serverWidget.FieldType.TEXT,
      label: 'Items'
    });

    sublist.addField({
      id: 'custpage_items_detail',
      type: serverWidget.FieldType.TEXT,
      label: 'Detalle precios items'
    });

    const viewField = sublist.getField({
      id: 'custpage_ver'
    });

    if (viewField) {
      viewField.linkText = 'Ver';
    }

    return {
      form,
      sublist,
      fldCount
    };
  };

  const buildMainFilters = (params) => {
    const filters = [];

    /*
     * Si no llegan fechas desde el formulario,
     * ambas serán automáticamente la fecha actual.
     */
    const def = getDefaultMonthRange();

    const dateFrom =
      parseDateParam(params.custpage_date_from) ||
      def.from;

    const dateTo =
      parseDateParam(params.custpage_date_to) ||
      def.to;

    filters.push([
      'mainline',
      'is',
      'T'
    ]);

    filters.push(
      'AND',
      [
        'subsidiary',
        'anyof',
        FIXED_SUBSIDIARY_ID
      ]
    );

    /*
     * El filtro de fechas SE CONSERVA.
     *
     * Al abrir por primera vez:
     *
     * Fecha desde = hoy
     * Fecha hasta = hoy
     *
     * Por tanto solamente muestra el día actual.
     *
     * Si el usuario cambia las fechas,
     * seguirá pudiendo consultar cualquier rango.
     */
    if (dateFrom) {
      filters.push(
        'AND',
        [
          'trandate',
          'onorafter',
          fmtDate(dateFrom)
        ]
      );
    }

    if (dateTo) {
      filters.push(
        'AND',
        [
          'trandate',
          'onorbefore',
          fmtDate(dateTo)
        ]
      );
    }

    if (trim(params.custpage_tranid)) {
      filters.push(
        'AND',
        [
          'tranid',
          'contains',
          trim(params.custpage_tranid)
        ]
      );
    }

    addContainsFilter(
      filters,
      'formulatext: UPPER({entity})',
      params.custpage_cliente
    );

    addContainsFilter(
      filters,
      'formulatext: UPPER({custbody_ht_facturar_a})',
      params.custpage_facturar_a
    );

    addContainsFilter(
      filters,
      'formulatext: UPPER({custbody_ht_cod_agru})',
      params.custpage_ht_cod_agru
    );

    addContainsFilter(
      filters,
      'formulatext: UPPER({memo})',
      params.custpage_memo
    );

    return filters;
  };

  const createFacturaInternaSearch = (params) => {
    return search.create({
      type: RECORD_TYPE_FACTURA_INTERNA,

      filters: buildMainFilters(params),

      columns: [
        search.createColumn({
          name: 'internalid'
        }),

        search.createColumn({
          name: 'tranid'
        }),

        search.createColumn({
          name: 'createdfrom'
        }),

        search.createColumn({
          name: 'trandate'
        }),

        search.createColumn({
          name: 'entity'
        }),

        search.createColumn({
          name: 'altname',
          join: 'customerMain'
        }),

        search.createColumn({
          name: 'custentity_pe_document_number',
          join: 'customerMain'
        }),

        search.createColumn({
          name: 'custbody_ht_facturar_a'
        }),

        search.createColumn({
          name: 'custbody_ht_factura_directa'
        }),

        search.createColumn({
          name: 'custbody_ht_cod_agru'
        }),

        search.createColumn({
          name: 'memo'
        }),

        search.createColumn({
          name: 'currency'
        }),

        search.createColumn({
          name: 'exchangerate'
        }),

        search.createColumn({
          name: 'fxamount'
        }),

        search.createColumn({
          name: 'total'
        }),

        search.createColumn({
          name: 'custbody_ht_so_bien'
        })
      ]
    });
  };

  const getBienMap = (bienIds) => {
    const ids = uniq(bienIds);

    if (!ids.length) {
      return {};
    }

    const out = {};

    for (const chunk of chunkArray(ids, ANYOF_CHUNK_SIZE)) {
      const s = search.create({
        type: 'customrecord_ht_record_bienes',

        filters: [
          [
            'internalid',
            'anyof',
            chunk
          ]
        ],

        columns: [
          search.createColumn({
            name: 'internalid'
          }),

          search.createColumn({
            name: 'custrecord_ht_bien_placa'
          }),

          search.createColumn({
            name: 'custrecord_ht_bien_chasis'
          })
        ]
      });

      forEachPaged(s, (r) => {
        const id = getValueSafe(r, {
          name: 'internalid'
        });

        if (!id) {
          return;
        }

        out[id] = {
          placa: getValueSafe(r, {
            name: 'custrecord_ht_bien_placa'
          }),

          chasis: getValueSafe(r, {
            name: 'custrecord_ht_bien_chasis'
          })
        };
      });
    }

    return out;
  };

  const getItemsMap = (facturaIds) => {
    const ids = uniq(facturaIds);

    if (!ids.length) {
      return {};
    }

    const itemsByDoc = {};
    const detailByDoc = {};
    const summaryByDoc = {};

    for (const chunk of chunkArray(ids, ANYOF_CHUNK_SIZE)) {
      const s = search.create({
        type: RECORD_TYPE_FACTURA_INTERNA,

        filters: [
          [
            'internalid',
            'anyof',
            chunk
          ],
          'AND',
          [
            'mainline',
            'is',
            'F'
          ],
          'AND',
          [
            'taxline',
            'is',
            'F'
          ],
          'AND',
          [
            'shipping',
            'is',
            'F'
          ]
        ],

        columns: [
          search.createColumn({
            name: 'internalid'
          }),

          search.createColumn({
            name: 'item'
          }),

          search.createColumn({
            name: 'itemid',
            join: 'item'
          }),

          search.createColumn({
            name: 'displayname',
            join: 'item'
          }),

          search.createColumn({
            name: 'quantity'
          }),

          search.createColumn({
            name: 'rate'
          }),

          search.createColumn({
            name: 'amount'
          })
        ]
      });

      forEachPaged(s, (r) => {
        const id = getValueSafe(r, {
          name: 'internalid'
        });

        if (!id) {
          return;
        }

        const itemTextByJoin =
          `${getValueSafe(r, {
            name: 'itemid',
            join: 'item'
          })} ${getValueSafe(r, {
            name: 'displayname',
            join: 'item'
          })}`.trim();

        const itemTextByText =
          getTextSafe(r, {
            name: 'item'
          }) ||
          getValueSafe(r, {
            name: 'item'
          });

        const itemText =
          itemTextByJoin ||
          itemTextByText;

        const qty = getValueSafe(r, {
          name: 'quantity'
        });

        const rate = getValueSafe(r, {
          name: 'rate'
        });

        const amount = getValueSafe(r, {
          name: 'amount'
        });

        if (!itemsByDoc[id]) {
          itemsByDoc[id] = [];
        }

        if (!detailByDoc[id]) {
          detailByDoc[id] = [];
        }

        if (!summaryByDoc[id]) {
          summaryByDoc[id] = {
            quantity: 0,
            amount: 0,
            firstRate: ''
          };
        }

        if (itemText) {
          itemsByDoc[id].push(itemText);
        }

        const detail = [
          itemText,
          qty ? `Cant:${qty}` : '',
          rate ? `Precio:${fmt2(rate)}` : '',
          amount ? `Importe:${fmt2(amount)}` : ''
        ]
          .filter(Boolean)
          .join(' | ');

        if (detail) {
          detailByDoc[id].push(detail);
        }

        summaryByDoc[id].quantity +=
          toNum(qty, 0);

        summaryByDoc[id].amount +=
          toNum(amount, 0);

        if (
          !summaryByDoc[id].firstRate &&
          cleanStr(rate)
        ) {
          summaryByDoc[id].firstRate =
            fmt2(rate);
        }
      });
    }

    const out = {};

    ids.forEach((id) => {
      const summary =
        summaryByDoc[id] ||
        {};

      out[id] = {
        items:
          uniq(itemsByDoc[id] || [])
            .join(' | '),

        itemsDetail:
          uniq(detailByDoc[id] || [])
            .join(' || '),

        quantity:
          summary.quantity
            ? fmt2(summary.quantity)
            : '',

        amount:
          summary.amount
            ? fmt2(summary.amount)
            : '',

        rate:
          summary.firstRate ||
          ''
      };
    });

    return out;
  };

  const snapshotRow = (r) => ({
    internalid: getValueSafe(r, {
      name: 'internalid'
    }),

    id: getValueSafe(r, {
      name: 'internalid'
    }),

    tranid: getValueSafe(r, {
      name: 'tranid'
    }),

    createdfrom:
      getTextSafe(r, {
        name: 'createdfrom'
      }) ||
      getValueSafe(r, {
        name: 'createdfrom'
      }),

    trandate: r.getValue({
      name: 'trandate'
    }),

    cliente: getValueSafe(r, {
      name: 'altname',
      join: 'customerMain'
    }),

    clienteDoc: getValueSafe(r, {
      name: 'custentity_pe_document_number',
      join: 'customerMain'
    }),

    facturarA:
      getTextSafe(r, {
        name: 'custbody_ht_facturar_a'
      }) ||
      getValueSafe(r, {
        name: 'custbody_ht_facturar_a'
      }),

    facturaDirecta:
      getTextSafe(r, {
        name: 'custbody_ht_factura_directa'
      }) ||
      getValueSafe(r, {
        name: 'custbody_ht_factura_directa'
      }),

    codAgru:
      getTextSafe(r, {
        name: 'custbody_ht_cod_agru'
      }) ||
      getValueSafe(r, {
        name: 'custbody_ht_cod_agru'
      }),

    memo: getValueSafe(r, {
      name: 'memo'
    }),

    bienId: getValueSafe(r, {
      name: 'custbody_ht_so_bien'
    }),

    currency:
      getTextSafe(r, {
        name: 'currency'
      }) ||
      getValueSafe(r, {
        name: 'currency'
      }),

    exchangerate: getValueSafe(r, {
      name: 'exchangerate'
    }),

    fxamount: getValueSafe(r, {
      name: 'fxamount'
    }),

    total: getValueSafe(r, {
      name: 'total'
    })
  });

  const getRows = (params) => {
    const rows = [];

    const mainSearch =
      createFacturaInternaSearch(params);

    forEachPaged(mainSearch, (r) => {
      rows.push(
        snapshotRow(r)
      );
    });

    const bienMap =
      getBienMap(
        rows.map((r) => r.bienId)
      );

    const itemsMap =
      getItemsMap(
        rows.map((r) => r.id)
      );

    return rows.map((row) => {
      const bien =
        row.bienId
          ? (bienMap[row.bienId] || {})
          : {};

      const itemData =
        row.id
          ? (itemsMap[row.id] || {})
          : {};

      const recUrl =
        row.id
          ? url.resolveRecord({
              recordType: RECORD_TYPE_FACTURA_INTERNA,
              recordId: row.id,
              isEditMode: false
            })
          : '';

      return {
        ver:
          recUrl,

        internalid:
          row.internalid,

        tranid:
          row.tranid,

        createdfrom:
          row.createdfrom,

        fecha:
          row.trandate instanceof Date
            ? fmtDate(row.trandate)
            : cleanStr(row.trandate),

        cliente:
          row.cliente,

        clienteDoc:
          row.clienteDoc,

        facturarA:
          row.facturarA,

        facturaDirecta:
          row.facturaDirecta,

        codAgru:
          row.codAgru,

        memo:
          row.memo,

        currency:
          row.currency,

        exchangerate:
          fmt2(row.exchangerate),

        fxamount:
          fmt2(row.fxamount),

        total:
          fmt2(row.total),

        rate:
          itemData.rate ||
          '',

        quantity:
          itemData.quantity ||
          '',

        amount:
          itemData.amount ||
          '',

        placa:
          bien.placa ||
          '',

        chasis:
          bien.chasis ||
          '',

        items:
          itemData.items ||
          '',

        itemsDetail:
          itemData.itemsDetail ||
          ''
      };
    });
  };

  const fillSublist = (sublist, params) => {
    const rows =
      getRows(params);

    let line = 0;

    rows.forEach((row) => {
      setLineValue(
        sublist,
        'custpage_ver',
        line,
        row.ver,
        4000
      );

      setLineValue(
        sublist,
        'custpage_internalid',
        line,
        row.internalid
      );

      setLineValue(
        sublist,
        'custpage_tranid',
        line,
        row.tranid
      );

      setLineValue(
        sublist,
        'custpage_createdfrom',
        line,
        row.createdfrom
      );

      setLineValue(
        sublist,
        'custpage_fecha',
        line,
        row.fecha
      );

      setLineValue(
        sublist,
        'custpage_cliente',
        line,
        row.cliente
      );

      setLineValue(
        sublist,
        'custpage_cliente_doc',
        line,
        row.clienteDoc
      );

      setLineValue(
        sublist,
        'custpage_facturar_a',
        line,
        row.facturarA
      );

      setLineValue(
        sublist,
        'custpage_factura_directa',
        line,
        row.facturaDirecta
      );

      setLineValue(
        sublist,
        'custpage_cod_agru',
        line,
        row.codAgru
      );

      setLineValue(
        sublist,
        'custpage_memo',
        line,
        row.memo
      );

      setLineValue(
        sublist,
        'custpage_currency',
        line,
        row.currency
      );

      setLineValue(
        sublist,
        'custpage_exchangerate',
        line,
        row.exchangerate
      );

      setLineValue(
        sublist,
        'custpage_fxamount',
        line,
        row.fxamount
      );

      setLineValue(
        sublist,
        'custpage_total',
        line,
        row.total
      );

      setLineValue(
        sublist,
        'custpage_rate',
        line,
        row.rate
      );

      setLineValue(
        sublist,
        'custpage_quantity',
        line,
        row.quantity
      );

      setLineValue(
        sublist,
        'custpage_amount',
        line,
        row.amount
      );

      setLineValue(
        sublist,
        'custpage_placa',
        line,
        row.placa
      );

      setLineValue(
        sublist,
        'custpage_chasis',
        line,
        row.chasis
      );

      setLineValue(
        sublist,
        'custpage_items',
        line,
        row.items,
        300
      );

      setLineValue(
        sublist,
        'custpage_items_detail',
        line,
        row.itemsDetail,
        300
      );

      line++;
    });

    return rows.length;
  };

  const exportCsv = (context, params) => {
    const rows =
      getRows(params);

    const headers = [
      'ID Interno',
      'Factura interna',
      'Created From',
      'Fecha',
      'Cliente',
      'Doc. cliente',
      'Facturar a',
      'Factura directa',
      'Cod. agrupador',
      'Memo / OS',
      'Moneda',
      'Tipo cambio',
      'FX Amount',
      'Total',
      'Precio',
      'Cantidad',
      'Importe línea',
      'Unidad',
      'Nivel precio',
      'Placa',
      'Chasis',
      'Items',
      'Detalle precios items'
    ];

    const csvLines = [
      '\ufeff' +
      headers
        .map(csvCell)
        .join(',')
    ];

    rows.forEach((row) => {
      csvLines.push(
        [
          row.internalid,
          row.tranid,
          row.createdfrom,
          row.fecha,
          row.cliente,
          row.clienteDoc,
          row.facturarA,
          row.facturaDirecta,
          row.codAgru,
          row.memo,
          row.currency,
          row.exchangerate,
          row.fxamount,
          row.total,
          row.rate,
          row.quantity,
          row.amount,
          row.placa,
          row.chasis,
          row.items,
          row.itemsDetail
        ]
          .map(csvCell)
          .join(',')
      );
    });

    const fileName =
      `reporte_facturas_internas_${
        fmtDate(new Date())
          .replace(/\//g, '-')
      }.csv`;

    context.response.addHeader({
      name: 'Content-Type',
      value: 'text/csv; charset=UTF-8'
    });

    context.response.addHeader({
      name: 'Content-Disposition',
      value: `attachment; filename="${fileName}"`
    });

    context.response.write(
      csvLines.join('\n')
    );
  };

  const onRequest = (context) => {
    const params =
      context.request.parameters ||
      {};

    const action =
      trim(params.custpage_action);

    if (action === 'export') {
      try {
        exportCsv(
          context,
          params
        );

      } catch (e) {
        log.error({
          title: 'ERROR EXPORT CSV FACTURA INTERNA',
          details: e
        });

        context.response.addHeader({
          name: 'Content-Type',
          value: 'text/plain; charset=UTF-8'
        });

        context.response.write(
          `Error al exportar CSV: ${
            cleanStr(
              e && e.message
                ? e.message
                : e
            )
          }`
        );
      }

      return;
    }

    const {
      form,
      sublist,
      fldCount
    } = buildForm(params);

    try {
      const total =
        fillSublist(
          sublist,
          params
        );

      fldCount.defaultValue =
        String(total);

    } catch (e) {
      log.error({
        title: 'ERROR REPORTE FACTURA INTERNA',
        details: e
      });

      fldCount.defaultValue = '0';

      const fld = form.addField({
        id: 'custpage_error',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' '
      });

      fld.defaultValue = `
        <div style="
          margin-top:8px;
          padding:8px;
          border:1px solid #b00;
          border-radius:6px;
          color:#b00;
        ">
          Error al generar el reporte:
          ${
            cleanStr(
              e && e.message
                ? e.message
                : e
            )
          }
        </div>
      `;
    }

    context.response.writePage(
      form
    );
  };

  return {
    onRequest
  };
});