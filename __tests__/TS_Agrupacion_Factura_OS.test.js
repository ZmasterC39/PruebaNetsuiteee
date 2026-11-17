const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const scriptRoot = path.join(
    projectRoot,
    'src',
    'FileCabinet',
    'SuiteScripts',
    'Evol',
    'PE',
    'Customizaciones',
    'Agrupacion OS para Facturas'
);

const paths = {
    sl: path.join(scriptRoot, 'TS_SL_Agrupacion_Factura_OS.js'),
    ss: path.join(scriptRoot, 'TS_SS_Agrupacion_Factura_OS.js'),
    mr: path.join(scriptRoot, 'TS_MR_Agrupacion_Factura_OS.js')
};

const read = (filePath) => fs.readFileSync(filePath, 'utf8');

const loadSuiteScript = (filePath, exportMarker, replacement, mocks = {}) => {
    const source = read(filePath);
    expect(source).toContain(exportMarker);

    let exported;
    const sandbox = {
        console,
        define: (dependencies, factory) => {
            exported = factory(...dependencies.map((dependency) => mocks[dependency] || {}));
        }
    };

    vm.runInNewContext(source.replace(exportMarker, replacement), sandbox, {
        filename: filePath
    });

    return exported;
};

describe('Agrupacion de Facturas OS - mini agrupaciones FIN/CSV', () => {
    test('interpreta 1-2-3, 1, 1, 1-2 como cuatro grupos y hereda la glosa', () => {
        const module = loadSuiteScript(
            paths.sl,
            'return { onRequest };',
            'return { onRequest, __test: { parseMiniGroupingCsv } };'
        );

        const csv = [
            'tranid,Linea de Item,Glosa',
            'FIN-1,1,GRUPO A',
            'FIN-2,2,',
            'FIN-3,3,',
            'FIN-4,1,GRUPO B',
            'FIN-5,1,GRUPO C',
            'FIN-6,1,GRUPO D',
            'FIN-7,2,'
        ].join('\n');

        const grouping = module.__test.parseMiniGroupingCsv(csv);

        expect(grouping.groupCount).toBe(4);
        expect(grouping.entries.map((entry) => entry.groupKey)).toEqual([
            'csv:1', 'csv:1', 'csv:1', 'csv:2', 'csv:3', 'csv:4', 'csv:4'
        ]);
        expect(grouping.entries.map((entry) => entry.groupGlosa)).toEqual([
            'GRUPO A', 'GRUPO A', 'GRUPO A', 'GRUPO B', 'GRUPO C', 'GRUPO D', 'GRUPO D'
        ]);
    });

    test('el Suitelet preserva identidad, importe, impuesto y descripcion de cada linea origen', () => {
        const source = read(paths.sl);

        expect(source).toContain('const preserveSourceLine = modoFacturacion === BILLING_MODE_INTERNAL_INVOICE;');
        expect(source).toContain('? item.sourceLineKey');
        expect(source).toContain('String(entry.lineuniquekey || "")');
        expect(source).toContain('search.createColumn({ name: "fxamount" })');
        expect(source).toContain('amount: getSearchLineAmount(result)');
        expect(source).toContain('descripcion: result.getValue({ name: "memo" }) || ""');
        expect(source).toContain('taxcode: result.getValue({ name: "taxcode" })');
        expect(source).toContain('grupo.items.sort(compareSourceInvoiceLines)');
    });

    test('el Scheduled Script crea dos lineas exactas y no una cantidad consolidada', () => {
        const invoice = createInvoiceMock();
        const recordMock = {
            Type: { INVOICE: 'invoice' },
            create: jest.fn(() => invoice),
            submitFields: jest.fn()
        };
        const runtimeMock = {
            getCurrentScript: jest.fn(() => ({ getRemainingUsage: () => 10000 }))
        };
        const fileMock = {
            Type: { JSON: 'JSON' },
            create: jest.fn(() => ({ save: () => 'checkpoint-1' }))
        };

        const module = loadSuiteScript(
            paths.ss,
            'return { execute };',
            'return { execute, __test: { generarFacturasDirectasRapido, buildLineDescription } };',
            {
                'N/record': recordMock,
                'N/log': { audit: jest.fn(), error: jest.fn() },
                'N/search': {},
                'N/runtime': runtimeMock,
                'N/task': {},
                'N/file': fileMock
            }
        );

        const params = buildScheduledParams([
            buildSourceItem('FIN-1', 'LINE-1', 14.58, 'DESCRIPCION 1'),
            buildSourceItem('FIN-2', 'LINE-2', 14.58, 'DESCRIPCION 2')
        ]);

        const result = module.__test.generarFacturasDirectasRapido(
            params,
            'log-1',
            { id: 'queue-1', parametros: 'old-checkpoint' },
            { fileObj: { name: 'queue-1.json' } }
        );

        expect(result.completed).toBe(true);
        expect(invoice.lines).toHaveLength(2);
        expect(invoice.lines.map((line) => line.quantity)).toEqual([0.08333, 0.08333]);
        expect(invoice.lines.map((line) => line.amount)).toEqual([14.58, 14.58]);
        expect(invoice.lines.reduce((total, line) => total + line.amount, 0)).toBeCloseTo(29.16, 2);
        expect(invoice.lines.map((line) => line.price)).toEqual([-1, -1]);
        expect(invoice.lines.map((line) => line.rate)).toEqual([175, 175]);
        expect(invoice.lines.map((line) => line.taxcode)).toEqual(['24205', '24205']);
        expect(invoice.lines.map((line) => line.description)).toEqual([
            'GLOSA GRUPO - DESCRIPCION 1',
            'GLOSA GRUPO - DESCRIPCION 2'
        ]);
        expect(invoice.body.memo).toBe('GLOSA GRUPO');
    });

    test('el Scheduled Script rechaza una linea FIN/CSV sin importe fuente', () => {
        const invoice = createInvoiceMock();
        const module = loadSuiteScript(
            paths.ss,
            'return { execute };',
            'return { execute, __test: { generarFacturasDirectasRapido } };',
            {
                'N/record': {
                    Type: { INVOICE: 'invoice' },
                    create: () => invoice,
                    submitFields: jest.fn()
                },
                'N/log': { audit: jest.fn(), error: jest.fn() },
                'N/search': {},
                'N/runtime': { getCurrentScript: () => ({ getRemainingUsage: () => 10000 }) },
                'N/task': {},
                'N/file': { Type: { JSON: 'JSON' }, create: () => ({ save: () => 'checkpoint-1' }) }
            }
        );
        const item = buildSourceItem('FIN-1', 'LINE-1', null, 'DESCRIPCION');

        expect(() => module.__test.generarFacturasDirectasRapido(
            buildScheduledParams([item]),
            'log-1',
            { id: 'queue-1', parametros: 'old-checkpoint' },
            { fileObj: { name: 'queue-1.json' } }
        )).toThrow('no contiene el importe de origen');
    });

    test('el Map/Reduce evita el filtro incompatible y no duplica el vinculo OS-factura', () => {
        const capturedSearches = [];
        const recordMock = {
            load: jest.fn(() => ({
                getValue: ({ fieldId }) => fieldId === 'custrecord_ht_pe_inv_os' ? '3451499' : ''
            })),
            create: jest.fn()
        };
        const searchMock = {
            createColumn: (column) => column,
            create: jest.fn((definition) => {
                capturedSearches.push(definition);
                return {
                    run: () => ({
                        each: (callback) => callback({ getValue: () => 'bridge-1' })
                    })
                };
            })
        };
        const module = loadSuiteScript(
            paths.mr,
            'return { getInputData, map, summarize };',
            'return { getInputData, map, summarize, __test: { linkSalesOrderInvoice, procesarFacturaInterna } };',
            {
                'N/record': recordMock,
                'N/log': { audit: jest.fn(), error: jest.fn() },
                'N/search': searchMock,
                'N/runtime': {},
                'N/file': {},
                'N/task': {}
            }
        );

        expect(() => module.__test.linkSalesOrderInvoice('SO-1', '3451499')).not.toThrow();
        expect(capturedSearches[0].filters).toEqual([
            ['custrecord_ht_pe_os_inv', 'anyof', 'SO-1']
        ]);
        expect(recordMock.create).not.toHaveBeenCalled();
    });

    test('el Map/Reduce exige encontrar todas las lineuniquekey seleccionadas', () => {
        const finRecord = {
            getValue: () => '43245',
            setValue: jest.fn(),
            getLineCount: () => 1,
            getSublistValue: ({ fieldId }) => fieldId === 'lineuniquekey' ? 'LINE-1' : '46090',
            selectLine: jest.fn(),
            setCurrentSublistValue: jest.fn(),
            commitLine: jest.fn(),
            save: jest.fn()
        };
        const module = loadSuiteScript(
            paths.mr,
            'return { getInputData, map, summarize };',
            'return { getInputData, map, summarize, __test: { procesarFacturaInterna } };',
            {
                'N/record': { load: () => finRecord, Type: { SALES_ORDER: 'salesorder' } },
                'N/log': { audit: jest.fn(), error: jest.fn() },
                'N/search': {},
                'N/runtime': {},
                'N/file': {},
                'N/task': {}
            }
        );

        expect(() => module.__test.procesarFacturaInterna({
            facturaInternaId: 'FIN-1',
            facturarId: '43245',
            invoiceId: '3451499',
            selectedItems: ['46090'],
            selectedLineKeys: ['LINE-1', 'LINE-2']
        })).toThrow('Solo se encontraron 1 de 2 lineas seleccionadas');
        expect(finRecord.save).not.toHaveBeenCalled();
    });
});

const createInvoiceMock = () => {
    let currentLine = null;
    const invoice = {
        body: {},
        lines: [],
        setValue: jest.fn(({ fieldId, value }) => {
            invoice.body[fieldId] = value;
        }),
        getText: jest.fn(() => 'Soles'),
        selectNewLine: jest.fn(() => {
            currentLine = {};
        }),
        setCurrentSublistValue: jest.fn(({ fieldId, value }) => {
            currentLine[fieldId] = value;
        }),
        getCurrentSublistValue: jest.fn(({ fieldId }) => currentLine[fieldId]),
        commitLine: jest.fn(() => {
            invoice.lines.push({ ...currentLine });
            currentLine = null;
        }),
        save: jest.fn(() => '3451499')
    };

    return invoice;
};

const buildSourceItem = (finId, lineUniqueKey, amount, description) => ({
    id: '46090',
    item_f: '',
    unidad: '2',
    cantidad: 0.08333,
    price: '-1',
    rate: 175,
    amount,
    taxcode: '24205',
    descripcion: description,
    departamento: '238',
    clase: '76',
    oficina: '417',
    sourceInvoiceId: finId,
    sourceLineUniqueKey: lineUniqueKey,
    sourceLineKey: `csv:1|${finId}|${lineUniqueKey}`
});

const buildScheduledParams = (items) => ({
    modoFacturacion: 'por_fin',
    facturaDirecta: [{
        groupKey: 'csv:1',
        groupOrder: 1,
        facturar_a: '43245',
        glosa_grupo: 'GLOSA GRUPO',
        items
    }],
    facturasSeleccionadas: [],
    agrupador: 'AGRUPADOR',
    glosa: 'GLOSA GENERAL',
    ubicacion: '416',
    currency: '1',
    tipo_doc: '50',
    terminoPago: '56',
    notaFactura: '',
    forma_pago: '2',
    concept_detraction: '1',
    tipo_operacion: '21',
    percentage_detraction: '0%',
    serie: '1',
    gratutita: 'F'
});
