const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const moduleRoot = path.join(
    projectRoot,
    'src',
    'FileCabinet',
    'SuiteScripts',
    'Desarrollo_Hunter',
    'Hunter_Peru',
    'appHunter',
    'modules',
    'BOM Assembly Assurance'
);

const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');

describe('BOM Assembly Assurance deployment contracts', () => {
    test('uses the real BOM Revision component sublist with compatible field fallbacks', () => {
        const assurance = read(moduleRoot, 'lib', 'HT_PE_LIB_BAG_ASSURANCE.js');

        expect(assurance).toContain("BOM_SUBLIST: 'component'");
        expect(assurance).toContain("['quantity', 'bomquantity']");
        expect(assurance).toContain("['units', 'unit']");
        expect(assurance).toContain("['id', 'lineid', 'internalid']");
    });

    test('guards every Assembly Build CREATE while keeping beforeLoad UI-only', () => {
        const guard = read(moduleRoot, 'HT_PE_UE_BAG_BUILD_GUARD.js');

        expect(guard).toContain('if (!isUiCreate(context)) return;');
        expect(guard).toContain('if (!isCreate(context)) return;');
        expect(guard).toContain('assurance.claimBuildSession(sessionId, workOrderId, context.newRecord)');
    });

    test('routes both maintained client-script copies through the Gate', () => {
        const relativeClients = [
            ['src', 'FileCabinet', 'SuiteScripts', 'TS NET Scripts', 'Main', 'core', 'TS_CS_Ensamble_Dispositivo_PE.js'],
            ['src', 'FileCabinet', 'SuiteScripts', 'TS NET Scripts', 'Main', 'core', 'evol', 'TS_CS_Ensamble_Dispositivo_PE.js']
        ];

        relativeClients.forEach((relativePath) => {
            const client = read(projectRoot, ...relativePath);
            expect(client).toContain('customscript_ht_pe_sl_bag_gate');
            expect(client).toContain('url.resolveScript({');
            expect(client).not.toContain("window.open('https://' + host + '/app/accounting/transactions/build.nl?id='");
        });
    });

    test('applies the mutation token field to Work Orders with the SDF bodybom flag', () => {
        const fieldXml = read(
            projectRoot,
            'src',
            'Objects',
            'custbody_ht_pe_bag_wo_mut_token.xml'
        );

        expect(fieldXml).toContain('<bodybom>T</bodybom>');
        expect(fieldXml).not.toContain('<bodyworkorder>');
    });
});
