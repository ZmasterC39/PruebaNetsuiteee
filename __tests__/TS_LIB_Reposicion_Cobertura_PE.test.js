const fs = require('fs');
const path = require('path');
const vm = require('vm');
const base = path.join(__dirname, '../src/FileCabinet/SuiteScripts/TS NET Scripts/Main');
const load = (file, dependencies) => {
    let exported;
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
        define: (names, factory) => { exported = factory(...names.map(n => dependencies[n])); }
    });
    return exported;
};
const constant = load(path.join(base, 'constant/TS_CM_Constant.js'), {});
const harness = () => {
    const ot = { custrecord_ht_ot_estado: 2, custrecord_ht_ot_subsidiary: 3,
        custrecord_ht_ot_item: 100, custrecord_ht_ot_vehiculo: 20, custrecord_ht_ot_producto: 30,
        custrecord_ht_ot_serieproductoasignacion: 40, custrecord_ht_ot_estadochaser: 12 };
    const coverage = { custrecord_ht_co_estado: 13, custrecord_ht_co_estado_cobertura: 4,
        custrecord_ht_co_subsidiaria: 3, custrecord_ht_co_bien: 20, custrecord_ht_co_familia_prod: 30,
        custrecord_ht_co_numeroserieproducto: 40, custrecord_ht_co_coberturafinal: new Date(2099, 0, 1) };
    const device = { custrecord_ht_mc_vehiculo: 20, custrecord_ht_mc_estado: 12 };
    const rows = { coverage: 1, history: true };
    const record = {
        load: jest.fn(({ type }) => ({ getValue: field => (type === 'customrecord_ht_co_cobertura' ? coverage :
            type === 'customrecord_ht_record_mantchaser' ? device : ot)[field] ?? '' })),
        submitFields: jest.fn()
    };
    const search = { create: jest.fn(({ type }) => ({ run: () => ({ getRange: () =>
        type === 'customrecord_ht_co_cobertura' ? Array.from({ length: rows.coverage }, () => ({ getValue: () => 50 })) :
            rows.history ? [{ getValue: () => 60 }] : [] }) })) };
    const controller = { getParameter: jest.fn(() => ({ idinterno: constant.Valor.VALOR_001_INST_DISPOSITIVO })),
        parametrizacion: jest.fn(() => []) };
    const log = { audit: jest.fn(), debug: jest.fn(), error: jest.fn() };
    const lib = load(path.join(base, 'core/TS_LIB_Reposicion_Cobertura_PE.js'), {
        'N/record': record, 'N/search': search, 'N/log': log,
        '../controller/TS_CM_Controller_PE': controller, '../constant/TS_CM_Constant': constant
    });
    return { ot, coverage, device, rows, record, search, controller, log,
        run: (args = {}) => lib.reconcile({ otId: 10, ...args }) };
};
test('corrects installation and coverage after completed replacement', () => {
    const h = harness();
    expect(h.run()).toBe(true);
    expect(h.record.submitFields).toHaveBeenCalledWith(expect.objectContaining({ id: 50,
        values: { custrecord_ht_co_estado: 12, custrecord_ht_co_estado_cobertura: 1 } }));
    expect(h.log.audit).toHaveBeenCalled();
    expect(JSON.stringify(h.search.create.mock.calls)).toContain('custbody_ht_so_renovacion_aplicada');
});
test('repairs installation even when renewal already activated coverage, then does nothing on repeat', () => {
    const h = harness();
    h.coverage.custrecord_ht_co_estado_cobertura = 1;
    expect(h.run()).toBe(true);
    const values = h.record.submitFields.mock.calls[0][0].values;
    expect(values).toEqual({ custrecord_ht_co_estado: 12 });
    Object.assign(h.coverage, values);
    expect(h.run()).toBe(false);
    expect(h.record.submitFields).toHaveBeenCalledTimes(1);
});
test.each([2, 3, 5])('preserves special coverage state %s', state => {
    const h = harness(); h.coverage.custrecord_ht_co_estado_cobertura = state;
    expect(h.run()).toBe(false); expect(h.record.submitFields).not.toHaveBeenCalled();
});
test.each([
    ['processing OT', h => { h.ot.custrecord_ht_ot_estado = 4; }],
    ['other subsidiary', h => { h.ot.custrecord_ht_ot_subsidiary = 2; }],
    ['device uninstalled', h => { h.device.custrecord_ht_mc_estado = 13; }],
    ['wrong vehicle', h => { h.device.custrecord_ht_mc_vehiculo = 99; }],
    ['wrong series', h => { h.coverage.custrecord_ht_co_numeroserieproducto = 99; }],
    ['ambiguous coverage', h => { h.rows.coverage = 2; }],
    ['no coverage', h => { h.rows.coverage = 0; }],
    ['no history', h => { h.rows.history = false; }],
    ['expired coverage', h => { h.coverage.custrecord_ht_co_coberturafinal = new Date(2000, 0, 1); }],
    ['convenio', h => { h.ot.custrecord_flujo_de_convenio = true; }],
    ['maintenance', h => { h.controller.getParameter.mockReturnValue({ idinterno: constant.Valor.VALOR_006_MANTENIMIENTO_CHEQUEO_DE_DISPOSITIVO }); }],
    ['upgrade', h => { h.controller.parametrizacion.mockReturnValue([[constant.Parameter.CPR_CONVERSION_DE_PRODUCTO_UPGRADE, constant.Valor.SI]]); }]
])('skips %s', (_, change) => {
    const h = harness(); change(h);
    expect(h.run()).toBe(false); expect(h.record.submitFields).not.toHaveBeenCalled();
});
test('excluded SIM/replacement part branch performs no reads or writes', () => {
    const h = harness(); expect(h.run({ excluded: true })).toBe(false);
    expect(h.record.load).not.toHaveBeenCalled();
});
test('logs failure without reporting a successful correction', () => {
    const h = harness(); h.record.submitFields.mockImplementation(() => { throw new Error('write failed'); });
    expect(h.run()).toBe(false); expect(h.log.error).toHaveBeenCalled(); expect(h.log.audit).not.toHaveBeenCalled();
});
test('supports LoJack reinstalacion and local ADP internal IDs', () => {
    const h = harness();
    h.controller.getParameter.mockReturnValue({ idinterno: 9999, codigo: '003' });
    h.ot.custrecord_ht_ot_boxserie = 'BOX-1';
    h.device.custrecord_ht_mc_estado = 13;
    h.device.custrecord_ht_mc_estadolojack = 12;
    expect(h.run()).toBe(true);
});
test('restores a manually cleared coverage state', () => {
    const h = harness(); h.coverage.custrecord_ht_co_estado_cobertura = '';
    expect(h.run()).toBe(true);
    expect(h.record.submitFields.mock.calls[0][0].values.custrecord_ht_co_estado_cobertura).toBe(1);
});
test.each([constant.Status.DEVOLUCION, constant.Status.RENOVACION])('requires history concept %s independently', missing => {
    const h = harness();
    const original = h.search.create.getMockImplementation();
    h.search.create.mockImplementation(options => {
        if (options.type === 'customrecord_ht_ct_cobertura_transaction' && options.filters[2][2] === missing) {
            return { run: () => ({ getRange: () => [] }) };
        }
        return original(options);
    });
    expect(h.run()).toBe(false);
    expect(h.record.submitFields).not.toHaveBeenCalled();
});
