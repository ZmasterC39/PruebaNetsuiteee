/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], (search, log) => {

    const SAVED_SEARCH_ID = 'customsearch_prueba_jisus'; // o 6130

    /**
     * Método GET del Restlet
     * @param {Object} context
     * @returns {Object}
     */
    const get = (context) => {
        try {
            const ss = search.load({
                id: SAVED_SEARCH_ID
            });

            const results = [];
            const pagedData = ss.runPaged({
                pageSize: 1000
            });

            pagedData.pageRanges.forEach(pageRange => {
                const page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(result => {
                    const cols = ss.columns;

                    // Mapeamos columna por índice según el orden que comentaste:
                    // 0: ID
                    // 1: Nombre
                    // 2: ID de script
                    // 3: HT BN Propietario
                    // 4: Tipo de bien
                    // 5: Tipo terrestre
                    // 6: HT BN Placa
                    // 7: HT BN Cod SysHunter
                    // 8: HT BN Seguimiento
                    // 9: ¿Enviado con éxito?
                    // 10: Último intento fallo?
                    // 11: Última respuesta de la api
                    // 12: HT BN Motor
                    // 13: HT BN Chasis

                    const row = {
                        id: result.getValue(cols[0]),
                        nombre: result.getValue(cols[1]),
                        idScript: result.getValue(cols[2]),
                        htBnPropietario: result.getText(cols[3]) || result.getValue(cols[3]),
                        tipoBien: result.getText(cols[4]) || result.getValue(cols[4]),
                        tipoTerrestre: result.getText(cols[5]) || result.getValue(cols[5]),
                        htBnPlaca: result.getValue(cols[6]),
                        htBnCodSysHunter: result.getValue(cols[7]),
                        htBnSeguimiento: result.getValue(cols[8]),
                        enviadoConExito: result.getValue(cols[9]),
                        ultimoIntentoFallo: result.getValue(cols[10]),
                        ultimaRespuestaApi: result.getValue(cols[11]),
                        htBnMotor: result.getValue(cols[12]),
                        htBnChasis: result.getValue(cols[13])
                    };

                    results.push(row);
                });
            });

            return {
                success: true,
                count: results.length,
                data: results
            };

        } catch (e) {
            log.error('RESTLET_ERROR', e);
            return {
                success: false,
                message: e.message || e
            };
        }
    };

    return {
        get
    };
});
