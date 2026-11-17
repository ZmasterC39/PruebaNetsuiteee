const fs = require('fs');
const path = require('path');
const vm = require('vm');

const moduleRoot = path.join(
    __dirname,
    '..',
    'src',
    'FileCabinet',
    'SuiteScripts',
    'Desarrollo_Hunter',
    'Hunter_Peru',
    'appHunter',
    'modules',
    'BOM Revision'
);

const fnv1a = (value) => {
    let hash = 0x811c9dc5;

    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }

    return (`0000000${(hash >>> 0).toString(16)}`).slice(-8);
};

const componentHash = (componentId, item, units = '20', source = 'STOCK') => {
    const canonical = `${componentId}:${item}:${units}:${source}`;
    return `HTBOM1-1-${fnv1a(canonical)}`;
};

const loadAmdModule = (filename, dependencies) => {
    let exported;
    const context = {
        define: (dependencyNames, factory) => {
            exported = factory(...dependencyNames.map((name) => dependencies[name]));
        }
    };

    vm.runInNewContext(
        fs.readFileSync(path.join(moduleRoot, filename), 'utf8'),
        context,
        { filename }
    );

    return exported;
};

const makeLog = () => ({
    audit: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
});

const makeWorkOrderRecord = (state, saveHook) => {
    let currentLine = null;

    return {
        id: state.id,
        getValue: ({ fieldId }) => state.body[fieldId] ?? '',
        setValue: ({ fieldId, value }) => {
            state.body[fieldId] = value;
        },
        getLineCount: ({ sublistId }) => sublistId === 'item' ? state.lines.length : 0,
        getSublistValue: ({ sublistId, fieldId, line }) => (
            sublistId === 'item' ? state.lines[line]?.[fieldId] ?? '' : ''
        ),
        getSublistText: ({ sublistId, fieldId, line }) => (
            sublistId === 'item' && fieldId === 'item' ? state.lines[line]?.itemText ?? '' : ''
        ),
        selectLine: ({ line }) => {
            currentLine = { line, data: state.lines[line], isNew: false };
        },
        selectNewLine: () => {
            currentLine = { line: state.lines.length, data: {}, isNew: true };
        },
        setCurrentSublistValue: ({ fieldId, value }) => {
            if (!currentLine) throw new Error('No current line');
            currentLine.data[fieldId] = String(value);
            state.mutations.push({ line: currentLine.line, fieldId, value: String(value) });
        },
        getCurrentSublistValue: ({ fieldId }) => currentLine?.data[fieldId] ?? '',
        commitLine: () => {
            if (!currentLine) throw new Error('No current line');
            if (currentLine.isNew) state.lines.push(currentLine.data);
            currentLine = null;
        },
        cancelLine: () => {
            currentLine = null;
        },
        removeLine: ({ line }) => {
            state.lines.splice(line, 1);
        },
        save: () => {
            state.saveCount += 1;
            if (saveHook) saveHook(state);
            return state.id;
        }
    };
};

const makeBomRecord = (state) => ({
    id: state.id,
    getValue: ({ fieldId }) => state.body[fieldId] ?? '',
    setValue: ({ fieldId, value }) => {
        state.body[fieldId] = value;
    },
    getLineCount: ({ sublistId }) => sublistId === 'component' ? state.lines.length : 0,
    getSublistValue: ({ sublistId, fieldId, line }) => (
        sublistId === 'component' ? state.lines[line]?.[fieldId] ?? '' : ''
    ),
    save: () => state.id
});

const makeSyncHarness = ({ saveHook } = {}) => {
    const expectedHash = componentHash('24947', '27454');
    const workOrder = {
        id: '3451253',
        body: {
            subsidiary: '3',
            built: '0',
            linked: 'F',
            componentsfullyissued: 'F',
            orderstatus: 'B',
            statusRef: 'pendingBuild',
            billofmaterialsrevision: '1939',
            custbody_ht_pe_bomrev_sync_hash: expectedHash,
            quantity: '1',
            startdate: '18/08/2026'
        },
        lines: [{
            item: '46921',
            itemText: 'PE-8455 QUECLINK GV 350 CEU',
            bomrevisioncomponent: '24947',
            quantity: '1',
            units: '20',
            itemsource: 'STOCK',
            quantitycommitted: '0',
            quantityfulfilled: '0',
            inventorydetailset: 'F',
            isclosed: 'F'
        }],
        mutations: [],
        saveCount: 0
    };
    const bom = {
        id: '1939',
        body: {
            custrecord_ht_pe_bomrev_sync_hash: expectedHash
        },
        lines: [{
            id: '24947',
            lineid: '1',
            item: '27454',
            quantity: '1',
            bomquantity: '1',
            units: '20',
            itemsource: 'STOCK'
        }]
    };
    const record = {
        Type: {
            WORK_ORDER: 'workorder',
            ASSEMBLY_BUILD: 'assemblybuild'
        },
        load: jest.fn(({ type }) => {
            if (type === 'workorder') return makeWorkOrderRecord(workOrder, saveHook);
            if (type === 'bomrevision') return makeBomRecord(bom);
            throw new Error(`Unexpected record type ${type}`);
        }),
        submitFields: jest.fn(({ values }) => {
            Object.assign(workOrder.body, values);
            return workOrder.id;
        })
    };

    return { expectedHash, workOrder, bom, record };
};

describe('Work Order BOM Revision internal-ID regression', () => {
    test('the copied BOM hash differs from the fingerprint of the real wrong item', () => {
        expect(componentHash('24947', '27454')).not.toBe(componentHash('24947', '46921'));
    });

    test('the detector clears a copied hash when the real WO item is different', () => {
        const expectedHash = componentHash('24947', '27454');
        const actualHash = componentHash('24947', '46921');
        const submitFields = jest.fn();
        const record = {
            Type: { WORK_ORDER: 'workorder' },
            load: jest.fn(() => workOrder),
            submitFields
        };
        const search = {
            lookupFields: jest.fn(() => ({
                custrecord_ht_pe_bomrev_sync_hash: expectedHash
            }))
        };
        const workOrder = {
            id: '3451253',
            getValue: ({ fieldId }) => ({
                billofmaterialsrevision: '1939',
                custbody_ht_pe_bomrev_sync_hash: expectedHash
            })[fieldId] ?? '',
            getLineCount: () => 1,
            getSublistValue: ({ fieldId }) => ({
                bomrevisioncomponent: '24947',
                item: '46921',
                units: '20',
                itemsource: 'STOCK'
            })[fieldId] ?? ''
        };
        const module = loadAmdModule('HT_PE_UE_WO_BOMREV_SYNC_DETECTOR.js', {
            'N/log': makeLog(),
            'N/record': record,
            'N/search': search,
            'N/redirect': { toSuitelet: jest.fn() },
            'N/runtime': { executionContext: 'USERINTERFACE', ContextType: { USER_INTERFACE: 'USERINTERFACE' } }
        });

        module.afterSubmit({
            type: 'create',
            UserEventType: { CREATE: 'create', EDIT: 'edit', XEDIT: 'xedit' },
            newRecord: workOrder,
            oldRecord: null
        });

        expect(actualHash).not.toBe(expectedHash);
        expect(submitFields).toHaveBeenCalledWith(expect.objectContaining({
            id: '3451253',
            values: { custbody_ht_pe_bomrev_sync_hash: '' }
        }));
    });

    test('the Suitelet replaces 46921 with serialized item 27454 and verifies the saved WO', () => {
        const harness = makeSyncHarness();
        const redirect = { toRecord: jest.fn(), toRecordTransform: jest.fn() };
        const module = loadAmdModule('HT_PE_SL_WO_BOMREV_SYNC.js', {
            'N/log': makeLog(),
            'N/record': harness.record,
            'N/redirect': redirect,
            'N/runtime': { executionContext: 'USERINTERFACE' }
        });

        module.onRequest({
            request: {
                method: 'GET',
                parameters: {
                    custparam_woid: '3451253',
                    custparam_bomrevid: '1939'
                }
            },
            response: { write: jest.fn() }
        });

        expect(harness.workOrder.lines).toHaveLength(1);
        expect(harness.workOrder.lines[0]).toMatchObject({
            bomrevisioncomponent: '24947',
            item: '27454',
            units: '20',
            itemsource: 'STOCK'
        });
        expect(harness.workOrder.body.custbody_ht_pe_bomrev_sync_hash).toBe(harness.expectedHash);
        expect(harness.workOrder.mutations).toContainEqual(expect.objectContaining({
            fieldId: 'item',
            value: '27454'
        }));
        expect(redirect.toRecord).toHaveBeenCalled();
    });

    test('post-save sourcing back to 46921 clears the hash instead of claiming success', () => {
        const harness = makeSyncHarness({
            saveHook: (state) => {
                state.lines[0].item = '46921';
            }
        });
        const module = loadAmdModule('HT_PE_SL_WO_BOMREV_SYNC.js', {
            'N/log': makeLog(),
            'N/record': harness.record,
            'N/redirect': { toRecord: jest.fn(), toRecordTransform: jest.fn() },
            'N/runtime': { executionContext: 'USERINTERFACE' }
        });

        module.onRequest({
            request: {
                method: 'GET',
                parameters: {
                    custparam_woid: '3451253',
                    custparam_bomrevid: '1939'
                }
            },
            response: { write: jest.fn() }
        });

        expect(harness.workOrder.lines[0].item).toBe('46921');
        expect(harness.workOrder.body.custbody_ht_pe_bomrev_sync_hash).toBe('');
        expect(harness.record.submitFields).toHaveBeenCalledWith(expect.objectContaining({
            values: { custbody_ht_pe_bomrev_sync_hash: '' }
        }));
    });

    test('the Map/Reduce automatic path fixes the same internal-ID mismatch', () => {
        const harness = makeSyncHarness();
        const module = loadAmdModule('HT_PE_MR_WO_BOMREV_SYNC.js', {
            'N/record': harness.record,
            'N/query': {},
            'N/runtime': { getCurrentScript: jest.fn() },
            'N/log': makeLog()
        });

        module.map({ value: JSON.stringify({ id: '3451253' }) });

        expect(harness.workOrder.lines[0].item).toBe('27454');
        expect(harness.workOrder.body.custbody_ht_pe_bomrev_sync_hash).toBe(harness.expectedHash);
    });
});
