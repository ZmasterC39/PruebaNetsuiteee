const fs = require('fs');
const vm = require('vm');

const libraryPath = require.resolve('../src/FileCabinet/SuiteScripts/Desarrollo_Hunter/Hunter_Peru/appHunter/modules/BOM Assembly Assurance/lib/HT_PE_LIB_BAG_DIFF');
const bagDiff = require(libraryPath);

describe('HT_PE_LIB_BAG_DIFF module contract', () => {
    test('registers through AMD define with no dependencies', () => {
        let capturedDependencies;
        let capturedFactory;
        const context = {
            define: (dependencies, factory) => {
                capturedDependencies = dependencies;
                capturedFactory = factory;
            }
        };

        vm.runInNewContext(fs.readFileSync(libraryPath, 'utf8'), context);

        expect(capturedDependencies).toEqual([]);
        expect(typeof capturedFactory).toBe('function');
        expect(capturedFactory()).toEqual(expect.objectContaining({
            compare: expect.any(Function),
            validateBuildItems: expect.any(Function)
        }));
    });
});

describe('HT_PE_LIB_BAG_DIFF normalizers', () => {
    test('normalizes quantities and calculates the target BOM quantity', () => {
        expect(bagDiff.normalizeNumber('2')).toBe(2);
        expect(bagDiff.normalizeQuantity(' 1,5 ')).toBe(1.5);
        expect(bagDiff.normalizeQuantity('1.234,5')).toBe(1234.5);
        expect(bagDiff.normalizeQuantity('1,234.5')).toBe(1234.5);
        expect(bagDiff.normalizeQuantity('1.234567891')).toBe(1.23456789);
        expect(bagDiff.normalizeQuantity('100%')).toBe(100);
        expect(bagDiff.normalizeQuantity('not-a-number')).toBe(0);
        expect(bagDiff.calculateTargetQuantity('1.25', '4')).toBe(5);
    });

    test.each([
        [true, true],
        ['T', true],
        ['true', true],
        [1, true],
        ['SI', true],
        [false, false],
        ['F', false],
        ['false', false],
        [0, false],
        ['', false],
        [null, false]
    ])('normalizes checkbox value %p as %p', (value, expected) => {
        expect(bagDiff.isChecked(value)).toBe(expected);
        expect(bagDiff.normalizeCheckbox(value)).toBe(expected);
    });

    test('normalizes a blank source as STOCK and canonicalizes source text', () => {
        expect(bagDiff.normalizeSource('')).toBe('STOCK');
        expect(bagDiff.normalizeSource(null)).toBe('STOCK');
        expect(bagDiff.normalizeSource(' stock ')).toBe('STOCK');
        expect(bagDiff.normalizeSource('work order')).toBe('WORK_ORDER');
    });
});

describe('HT_PE_LIB_BAG_DIFF component matching', () => {
    test('detects PE-8702 as the single missing component for the reported case', () => {
        const result = bagDiff.compare(
            [
                { componentId: '500', item: 'PE-8748', unit: 'UND', quantity: 1 },
                { componentId: '501', item: 'PE-8702', unit: 'UND', quantity: 1 }
            ],
            [{ componentId: '500', item: 'PE-8748', units: 'UND', quantity: 1 }],
            1
        );

        expect(result.clean).toBe(false);
        expect(result.missing).toHaveLength(1);
        expect(result.missing[0].expected).toMatchObject({ item: 'PE-8702', targetQuantity: 1 });
        expect(result.updates).toHaveLength(0);
        expect(result.extras).toHaveLength(0);
    });

    test('exposes the shared compare contract', () => {
        const result = bagDiff.compare(
            [{ componentId: 'COMP-1', item: 'A', quantity: 2 }],
            [{ componentId: 'COMP-1', item: 'A', quantity: 1, line: 7 }],
            3
        );

        expect(result.clean).toBe(false);
        expect(result.counts).toEqual({
            expected: 1,
            actual: 1,
            matched: 1,
            missing: 0,
            updates: 1,
            extras: 0
        });
        expect(result.updates[0]).toMatchObject({
            line: 7,
            expected: { componentId: 'COMP-1', item: 'A', quantity: 6 },
            actual: { componentId: 'COMP-1', item: 'A', quantity: 1 },
            changes: { quantity: { from: 1, to: 6 } }
        });
    });

    test('matches one-to-one in component, signature and item passes', () => {
        const result = bagDiff.createComponentDiff({
            workOrderQuantity: 2,
            bomComponents: [
                { componentId: 'A', item: '100', unit: 'UND', source: 'STOCK', quantity: 1 },
                { item: '100', unit: 'UND', source: '', quantity: 2 },
                { componentId: 'C', item: '200', unit: 'UND', source: 'WORK_ORDER', quantity: 1 },
                { componentId: 'D', item: '300', unit: '', source: '', quantity: 1 }
            ],
            workOrderComponents: [
                { componentId: 'A', item: '999', units: 'UND', itemSource: 'STOCK', quantity: 2, line: 10 },
                { item: '100', units: 'UND', itemSource: 'STOCK', quantity: 4, line: 11 },
                { componentId: 'B', item: '200', units: 'UND', itemSource: 'WORK_ORDER', quantity: 2, line: 12 },
                { item: '300', units: 'CAJA', itemSource: 'STOCK', quantity: 2, line: 13 }
            ]
        });

        expect(result.matched.map((match) => match.matchType)).toEqual([
            'COMPONENT_ID',
            'SIGNATURE',
            'ITEM'
        ]);
        expect(result.missing).toHaveLength(1);
        expect(result.missing[0].desired.componentId).toBe('C');
        expect(result.extras).toHaveLength(1);
        expect(result.extras[0].current.componentId).toBe('B');
        expect(result.updates).toHaveLength(1);
        expect(result.updates[0].changes.item).toEqual({ from: '999', to: '100' });
    });

    test('does not match different non-empty component IDs', () => {
        const result = bagDiff.createComponentDiff({
            workOrderQuantity: 1,
            bomComponents: [
                { componentId: 'BOM-1', item: 'PE-8702', unit: 'UND', source: 'STOCK', quantity: 1 }
            ],
            workOrderComponents: [
                { componentId: 'WO-OTHER', item: 'PE-8702', units: 'UND', itemSource: 'STOCK', quantity: 1 }
            ]
        });

        expect(result.matched).toHaveLength(0);
        expect(result.missing).toHaveLength(1);
        expect(result.extras).toHaveLength(1);
    });

    test('preserves multiplicity and never consumes one work order line twice', () => {
        const result = bagDiff.createComponentDiff({
            workOrderQuantity: 1,
            bomComponents: [
                { item: 'PE-8702', quantity: 1 },
                { item: 'PE-8702', quantity: 1 }
            ],
            workOrderComponents: [
                { item: 'PE-8702', quantity: 1 }
            ]
        });

        expect(result.matched).toHaveLength(1);
        expect(result.missing).toHaveLength(1);
        expect(result.extras).toHaveLength(0);
        expect(result.counts).toMatchObject({ bom: 2, workOrder: 1, matched: 1, missing: 1 });
    });

    test('keeps blank actual component IDs available for constrained later matches', () => {
        const result = bagDiff.createComponentDiff({
            workOrderQuantity: 1,
            bomComponents: [
                { item: 'A', unit: 'UND', source: 'STOCK', quantity: 1 },
                { componentId: 'EXPECTED-A', item: 'A', unit: 'PIEZA', source: 'STOCK', quantity: 1 }
            ],
            workOrderComponents: [
                { item: 'A', units: 'CAJA', source: 'STOCK', quantity: 1 },
                { componentId: 'UNRELATED', item: 'A', units: 'UND', source: 'STOCK', quantity: 1 }
            ]
        });

        expect(result.matched).toHaveLength(2);
        expect(result.missing).toHaveLength(0);
        expect(result.extras).toHaveLength(0);
        expect(result.matched[0]).toMatchObject({ matchType: 'SIGNATURE', line: 1 });
        expect(result.matched[1]).toMatchObject({ matchType: 'ITEM', line: 0 });
    });

    test('reports quantity, unit and source without requiring an internal WO component ID', () => {
        const result = bagDiff.createComponentDiff({
            workOrderQuantity: 3,
            bomComponents: [
                { componentId: 'COMP-1', item: 'PE-8702', unit: 'UND', source: 'WORK ORDER', quantity: 2 }
            ],
            workOrderComponents: [
                { item: 'PE-8702', units: 'CAJA', itemSource: '', quantity: 1 }
            ]
        });

        expect(result.missing).toHaveLength(0);
        expect(result.extras).toHaveLength(0);
        expect(result.updates).toHaveLength(1);
        expect(result.updates[0].changes).toEqual({
            quantity: { from: 1, to: 6 },
            unit: { from: 'CAJA', to: 'UND' },
            source: { from: 'STOCK', to: 'WORK_ORDER' }
        });
    });

    test('does not force a unit update when the BOM unit is blank', () => {
        const result = bagDiff.createComponentDiff({
            workOrderQuantity: 1,
            bomComponents: [
                { item: 'PE-8702', unit: '', source: '', quantity: 1 }
            ],
            workOrderComponents: [
                { item: 'PE-8702', units: 'UND', itemSource: 'STOCK', quantity: 1 }
            ]
        });

        expect(result.isSynchronized).toBe(true);
        expect(result.updates).toHaveLength(0);
    });

    test('does not require the undocumented Work Order component ID to be writable', () => {
        const result = bagDiff.compare(
            [{ componentId: '501', item: 'PE-8702', unit: 'UND', source: 'STOCK', quantity: 1 }],
            [{ componentId: '0', item: 'PE-8702', units: 'UND', source: 'STOCK', quantity: 1 }],
            1
        );

        expect(result.clean).toBe(true);
        expect(result.updates).toHaveLength(0);
    });

    test('preserves Work Order safety metadata on updates and extras', () => {
        const result = bagDiff.compare(
            [{ item: 'A', quantity: 2 }],
            [
                { item: 'A', quantity: 1, quantitycommitted: 1, line: 3 },
                { item: 'B', quantity: 1, isclosed: true, inventorydetailset: true, line: 4 }
            ],
            1
        );

        expect(result.updates[0].actual).toMatchObject({ line: 3, committed: 1 });
        expect(result.extras[0].actual).toMatchObject({ line: 4, closed: true, inventoryDetail: true });
    });
});

describe('HT_PE_LIB_BAG_DIFF Build validation', () => {
    test('validates item multiplicity and ignores all quantities', () => {
        const expected = [
            { item: 'A', quantity: 100 },
            { item: 'A', quantity: 1 },
            { item: 'B', quantity: 25 }
        ];
        const build = [
            { item: 'A', quantity: 0 },
            { item: 'A', quantity: 999 },
            { item: 'B', quantity: 0 }
        ];

        expect(bagDiff.validateBuildByItemMultiplicity(expected, build)).toMatchObject({
            valid: true,
            missing: [],
            extras: []
        });
    });

    test('reports missing and extra Build lines by item count', () => {
        const result = bagDiff.validateBuildItems(
            [{ item: 'A' }, { item: 'A' }, { item: 'B' }],
            [{ item: 'A', quantity: 0 }, { item: 'C' }, { item: 'C', quantity: 999 }]
        );

        expect(result.valid).toBe(false);
        expect(result.missing).toEqual([
            { item: 'A', expectedCount: 2, actualCount: 1, count: 1 },
            { item: 'B', expectedCount: 1, actualCount: 0, count: 1 }
        ]);
        expect(result.extras).toEqual([
            { item: 'C', expectedCount: 0, actualCount: 2, count: 2 }
        ]);
    });

    test('accepts the all-zero quantity policy used by precheck', () => {
        const result = bagDiff.validateBuildQuantities(
            [{ item: 'PE-8702', quantity: 1 }, { item: 'SIM', quantity: 2 }],
            [{ item: 'PE-8702', quantity: 0 }, { item: 'SIM', quantity: 0 }],
            1
        );

        expect(result).toMatchObject({ valid: true, mode: 'PRECHECK_ZERO' });
    });

    test('accepts standard quantities scaled by the Build header quantity', () => {
        const result = bagDiff.validateBuildQuantities(
            [{ item: 'A', quantity: 2 }, { item: 'A', quantity: 1 }],
            [{ item: 'A', quantity: 2 }, { item: 'A', quantity: 4 }],
            2
        );

        expect(result).toMatchObject({ valid: true, mode: 'STANDARD' });
    });

    test('rejects mixed or arbitrary component quantities', () => {
        const result = bagDiff.validateBuildQuantities(
            [{ item: 'PE-8702', quantity: 1 }, { item: 'SIM', quantity: 1 }],
            [{ item: 'PE-8702', quantity: 0 }, { item: 'SIM', quantity: 1 }],
            1
        );

        expect(result.valid).toBe(false);
        expect(result.mode).toBe('MISMATCH');
    });

    test('rejects an invalid Build header quantity even in precheck mode', () => {
        const result = bagDiff.validateBuildQuantities(
            [{ item: 'PE-8702', quantity: 1 }],
            [{ item: 'PE-8702', quantity: 0 }],
            0
        );

        expect(result).toMatchObject({ valid: false, mode: 'INVALID_HEADER_QUANTITY' });
    });
});
