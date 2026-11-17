/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/search', 'N/runtime'], (search, runtime) => {

    const saveRecord = (context) => {
        try {
            const rec = context.currentRecord;
            const subsidiary = runtime.getCurrentUser().subsidiary;

            if (Number(subsidiary) !== 2) { return true; }

            const os = rec.getValue({ fieldId: 'transaction' });
            if (!os) return true;

            const currentId = rec.id;
            if (currentId) { return true; }

            const busqueda = search.create({
                type: 'calendarevent',
                filters: [
                    ["transaction.internalid", "anyof", os]
                ],
                columns: ['internalid']
            });

            const resultado = busqueda.run().getRange({ start: 0, end: 1 });

            if (resultado.length > 0) {
                alert('Ya existe un registro para esta Orden de Servicio. No se puede crear otro.');
                return false;
            }

            // New
            // Validar si la orden de servicio existe
            let dataOS = getBuscarOrdenService(os);

            if (dataOS[12] != "1" || dataOS[13] != "1") {
                alert('No se puede recepcionar la orden de servicio, verificar estado de aprobación y cartera');
                return false;
            }

            return true;
        } catch (error) {
            return true
        }


    };

    /**
 * TODO: Funciones de busqueda.
 */
    const getBuscarOrdenService = (id) => {
        try {
            const salesorderSearchObj = search.create({
                type: "salesorder",
                filters: [["type", "anyof", "SalesOrd"], "AND", ["internalid", "anyof", id], "AND", ["mainline", "is", "T"]],
                columns: [
                    { name: "custbody_ht_so_bien", label: "Bien" },
                    { name: "altname", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
                    { name: "location" },
                    { name: "internalid", join: "location", label: "ID location" },
                    { name: "altname", join: "customerMain", label: "Name" },
                    { name: "tranid", label: "Num. Pedido" },
                    { name: "memo", label: "Nota" },
                    { name: "custbody_ht_os_correocliente", label: "email" },
                    { name: "formulatext", formula: "{entity.id}", label: "Fórmula (texto)" },
                    { name: "internalid", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
                    { name: "formulatext", formula: "{entity}", label: "Fórmula (texto)" },
                    { name: "name", join: "location", label: "ID location" },
                    { name: "subsidiary", label: "Subsidiaria" },
                    { name: "custbody_ht_os_concesionario", label: "Concesionario" },
                    { name: "trandate", label: "Fecha de la transacción" },
                    { name: "custbody_ht_os_aprobacionventa", label: "Aprobación Venta" },
                    { name: "custbody_ht_os_aprobacioncartera", label: "Aprobación Cartera" }
                ],
            });

            const myPagedData = salesorderSearchObj.runPaged({ pageSize: 1000 });
            let respuesta = [];

            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });

                myPage.data.forEach((result) => {
                    const columns = result.columns;
                    const codigo = result.getText(columns[0]);
                    const nombre = result.getValue(columns[1]);
                    const idbien = result.getValue(columns[9]);
                    const name = result.getValue(columns[11]);
                    const subsidiary = result.getText(columns[12]).split(":")[1].trim();
                    const nrodocPropietario = result?.getValue(columns[10]).split(" ")[0].split("-")[2];
                    const subsidiaryid = result.getValue(columns[12])
                    const memo = result.getValue(columns[6]);
                    const location = result.getValue(columns[2]);
                    const nOS = result.getValue(columns[5]);
                    const concesionario = result.getText(columns[13]);
                    const fecha = result.getValue(columns[14]);
                    const aprobacionVenta = result.getValue(columns[15]);
                    const aprobacionCartera = result.getValue(columns[16]);

                    respuesta = [codigo, nombre, idbien, nrodocPropietario, name, subsidiary, subsidiaryid, memo, location, nOS, concesionario, fecha, aprobacionVenta, aprobacionCartera];
                    // respuesta = [codigo, nombre, idbien, nrodocPropietario, name, subsidiary, subsidiaryid, memo, location, nOS, concesionario, fecha];

                });
            });

            return respuesta;
        } catch (e) {
            log.error("Error en BuscarOS", e);
            return [];
        }
    };

    return {
        saveRecord
    };
});