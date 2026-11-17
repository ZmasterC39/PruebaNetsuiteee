const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scriptPath = path.join(
    __dirname,
    '..',
    'src',
    'FileCabinet',
    'SuiteScripts',
    'TS NET Scripts',
    'Main',
    'core',
    'TS_UE_Sales_Order_PE.js'
);

const loadScript = (dependencies) => {
    let exported;
    vm.runInNewContext(
        fs.readFileSync(scriptPath, 'utf8'),
        {
            define: (dependencyNames, factory) => {
                exported = factory(...dependencyNames.map((name) => dependencies[name]));
            }
        },
        { filename: path.basename(scriptPath) }
    );
    return exported;
};

const makeHarness = ({ orderstatus = 'A', venta = '1', cartera = '1' } = {}) => {
    const log = {
        audit: jest.fn(),
        debug: jest.fn(),
        error: jest.fn()
    };
    const salesOrder = {
        getValue: jest.fn((fieldId) => ({
            orderstatus,
            custbody_ht_os_aprobacionventa: venta,
            custbody_ht_os_aprobacioncartera: cartera
        })[fieldId] ?? '')
    };
    const record = {
        load: jest.fn(() => salesOrder),
        submitFields: jest.fn()
    };
    const dependencies = {
        'N/log': log,
        'N/record': record,
        'N/search': {},
        'N/ui/serverWidget': {},
        'N/plugin': {},
        'N/transaction': {},
        'N/https': {},
        'N/runtime': { getCurrentUser: () => ({ id: '49599' }) },
        'N/email': {},
        'N/query': {},
        'N/error': {},
        'N/task': {},
        '../controller/TS_CM_Controller_PE': {},
        '../constant/TS_CM_Constant': { Status: { APROBADO: 1 } },
        '../error/TS_CM_ErrorMessages': {},
        '../routes/TS_ROUTER_Sales_Order': {},
        'N/format': {}
    };
    const script = loadScript(dependencies);

    script.afterSubmit({
        type: 'xedit',
        UserEventType: {
            CREATE: 'create',
            COPY: 'copy',
            EDIT: 'edit',
            XEDIT: 'xedit'
        },
        newRecord: {
            id: '3454153',
            getValue: () => '3'
        }
    });

    return { log, record };
};

describe('aprobacion para generar Work Orders', () => {
    test('cambia A a B cuando ambas aprobaciones custom estan aprobadas', () => {
        const { record } = makeHarness();

        expect(record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            type: 'salesorder',
            id: '3454153',
            values: { orderstatus: 'B' }
        }));
    });

    test('no aprueba cuando aun falta una aprobacion custom', () => {
        const { record } = makeHarness({ venta: '2', cartera: '1' });

        expect(record.submitFields).not.toHaveBeenCalled();
    });

    test('es idempotente cuando la Orden de Venta ya esta aprobada', () => {
        const { record } = makeHarness({ orderstatus: 'B' });

        expect(record.submitFields).not.toHaveBeenCalled();
    });
});
