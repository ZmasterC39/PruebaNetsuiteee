    /**
     * @NApiVersion 2.1
     * @NScriptType ClientScript
     * @NModuleScope SameAccount
     */
    define(['N/currentRecord', 'N/log', 'N/ui/dialog', 'N/search', 'N/record'],
        function (currentRecord, log, dialog, search, nsRecord) {

            function fieldChanged(context) {
                var record = context.currentRecord;
                var fieldId = context.fieldId;

                if (fieldId !== 'custbody_ht_as_datos_tecnicos') return;
                if (!record.getValue('custbody_ht_as_datos_tecnicos')) return;

                try {
                    validateAvailableInventory(record);
                    setQuantity(record);
                    // dialog.alert({
                    //     title: 'Proceso completado',
                    //     message: 'Asignación de inventario realizada con éxito.'
                    // });
                } catch (e) {
                    console.log('Error', e);
                    dialog.alert({
                        title: 'Error',
                        message: 'Error al asignar inventario: ' + e.message
                    });
                }

                validateDatoTecnico(record, true);
            }

            // Valida Dato Técnico vs revisión de lista de materiales, Orden de Fabricación y componentes (crear y editar)
            function saveRecord(context) {
                var record = context.currentRecord;
                if (!record.getValue('custbody_ht_as_datos_tecnicos')) return true;
                return validateDatoTecnico(record, true);
            }

            // offerAdd: si faltan artículos del Dato Técnico ofrece agregarlos (y no deja guardar mientras tanto)
            function validateDatoTecnico(record, offerAdd) {
                try {
                    var result = validateBuild(record);
                    // Errores del propio Dato Técnico (no se corrigen agregando artículos)
                    if (result.blockingErrors.length) {
                        dialog.alert({ title: 'Error en el Dato Técnico', message: result.blockingErrors.join('<br>') });
                        return false;
                    }
                    // Artículos faltantes: solo se muestra "Faltan artículos del Dato Técnico"
                    if (result.missingItems.length) {
                        offerAddMissing(record, result);
                        return false;
                    }
                    if (result.warnings.length) {
                        dialog.alert({ title: 'Advertencia', message: result.warnings.join('<br>') });
                    }
                    return true;
                } catch (e) {
                    console.log('Error validando Dato Técnico', e);
                    dialog.alert({ title: 'Error', message: 'No se pudo validar el Dato Técnico: ' + e.message });
                    return false;
                }
            }

            // ------------------------------------------------------------------ validación Dato Técnico vs revisión / OF / ensamble

            function toId(value) {
                return (value === null || value === undefined) ? '' : String(value);
            }

            function fieldValue(field) {
                return Array.isArray(field) ? (field.length ? toId(field[0].value) : '') : toId(field);
            }

            function fieldText(field) {
                return Array.isArray(field) ? (field.length ? toId(field[0].text) : '') : '';
            }

            function countOf(items, item) {
                return items.filter(function (value) { return toId(value) === toId(item); }).length;
            }

            function lookupItemFromSerial(recordType, id, fieldId) {
                if (!id) return '';
                var result = search.lookupFields({ type: recordType, id: id, columns: [fieldId] });
                return fieldValue(result[fieldId]);
            }

            function getDatoTecnico(datoTecnicoId) {
                var dt = search.lookupFields({
                    type: 'customrecord_ht_record_mantchaser',
                    id: datoTecnicoId,
                    columns: [
                        'custrecord_ht_dt_dispositivo',
                        'custrecord_ht_cl_dt_lojack',
                        'custrecord_ht_sim_card',
                        'custrecord_ht_mc_seriedispositivo',
                        'custrecord_ht_mc_seriedispositivolojack',
                        'custrecord_ht_mc_celularsimcard'
                    ]
                });

                var chaserSerialId = fieldValue(dt.custrecord_ht_mc_seriedispositivo);
                var lojackSerialId = fieldValue(dt.custrecord_ht_mc_seriedispositivolojack);
                var simSerialId = fieldValue(dt.custrecord_ht_mc_celularsimcard);

                var deviceSerial = '';
                var deviceItemFromSerial = '';
                if (chaserSerialId) {
                    deviceSerial = fieldText(dt.custrecord_ht_mc_seriedispositivo);
                    deviceItemFromSerial = lookupItemFromSerial('customrecord_ht_record_detallechaserdisp', chaserSerialId, 'custrecord_ht_dd_dispositivo');
                } else if (lojackSerialId) {
                    deviceSerial = fieldText(dt.custrecord_ht_mc_seriedispositivolojack);
                    deviceItemFromSerial = lookupItemFromSerial('customrecord_ht_record_detallechaslojack', lojackSerialId, 'custrecord_ht_cl_lojack');
                }

                // LoJack: el artículo está en custrecord_ht_cl_dt_lojack (no usa custrecord_ht_dt_dispositivo)
                var deviceItem = (!chaserSerialId && lojackSerialId)
                    ? (fieldValue(dt.custrecord_ht_cl_dt_lojack) || deviceItemFromSerial)
                    : (fieldValue(dt.custrecord_ht_dt_dispositivo) || deviceItemFromSerial);

                return {
                    id: toId(datoTecnicoId),
                    deviceItem: deviceItem,
                    deviceSerial: deviceSerial,
                    deviceItemFromSerial: deviceItemFromSerial,
                    simItem: fieldValue(dt.custrecord_ht_sim_card),
                    simSerial: simSerialId ? fieldText(dt.custrecord_ht_mc_celularsimcard) : '',
                    simItemFromSerial: simSerialId
                        ? lookupItemFromSerial('customrecord_ht_record_detallechasersim', simSerialId, 'custrecord_ht_ds_simcard')
                        : ''
                };
            }

            function getSublistItems(rec, sublistId) {
                var items = [];
                var count = rec.getLineCount({ sublistId: sublistId });
                for (var i = 0; i < count; i++) {
                    items.push(toId(rec.getSublistValue({ sublistId: sublistId, fieldId: 'item', line: i })));
                }
                return items;
            }

            function getWorkOrder(transactionId) {
                var lookup = search.lookupFields({ type: search.Type.TRANSACTION, id: transactionId, columns: ['type'] });
                if (fieldValue(lookup.type) !== 'WorkOrd') return null;

                var workOrder = nsRecord.load({ type: nsRecord.Type.WORK_ORDER, id: transactionId });
                return {
                    id: toId(transactionId),
                    status: toId(workOrder.getValue({ fieldId: 'orderstatus' })),
                    revision: toId(workOrder.getValue({ fieldId: 'billofmaterialsrevision' })),
                    items: getSublistItems(workOrder, 'item')
                };
            }

            function getItemNames(itemIds) {
                var names = {};
                var ids = itemIds.filter(function (id, index) { return id && itemIds.indexOf(id) === index; });
                if (!ids.length) return names;

                search.create({
                    type: search.Type.ITEM,
                    filters: [['internalid', 'anyof', ids]],
                    columns: ['itemid', 'displayname']
                }).run().each(function (result) {
                    var itemid = result.getValue({ name: 'itemid' });
                    var displayname = result.getValue({ name: 'displayname' });
                    names[toId(result.id)] = displayname ? itemid + ' ' + displayname : itemid;
                    return true;
                });
                return names;
            }

            // Valida al crear y al editar: Dato Técnico (dispositivo y SIM) vs revisión, Orden de Fabricación y componentes
            function validateBuild(rec) {
                var errors = [];
                var warnings = [];

                var revisionId = toId(rec.getValue({ fieldId: 'billofmaterialsrevision' }));
                var createdFrom = toId(rec.getValue({ fieldId: 'createdfrom' }));

                var dt = getDatoTecnico(toId(rec.getValue({ fieldId: 'custbody_ht_as_datos_tecnicos' })));
                var revisionItems = revisionId ? getSublistItems(nsRecord.load({ type: 'bomrevision', id: revisionId }), 'component') : [];
                var workOrder = createdFrom ? getWorkOrder(createdFrom) : null;
                var buildItems = getSublistItems(rec, 'component');
                var names = getItemNames([dt.deviceItem, dt.deviceItemFromSerial, dt.simItem, dt.simItemFromSerial]);
                var label = function (item) { return names[item] ? names[item] : 'ID ' + item; };
                var missing = false;

                // No se validan los datos del Dato Técnico: solo que sus artículos estén en revisión, OF y componentes
                var required = [];
                if (dt.deviceItem) required.push({ role: 'dispositivo', item: dt.deviceItem });
                if (dt.simSerial && (dt.simItem || dt.simItemFromSerial)) {
                    required.push({ role: 'SIM card', item: dt.simItem || dt.simItemFromSerial });
                }

                if (!revisionId) {
                    errors.push('El ensamble no tiene revisión de lista de materiales.');
                }
                if (workOrder && revisionId && workOrder.revision && workOrder.revision !== revisionId) {
                    errors.push('La revisión de lista de materiales del ensamble no coincide con la de la Orden de Fabricación.');
                }

                // Errores que no se corrigen agregando artículos (datos del Dato Técnico o revisión inconsistente)
                var blockingErrors = errors.length;
                var missingItems = [];

                required.forEach(function (req) {
                    var name = 'El ' + req.role + ' ' + label(req.item) + ' del Dato Técnico';
                    var gap = { item: req.item, role: req.role, label: label(req.item), inRevision: true, inWorkOrder: true, inBuild: true };
                    if (revisionId) {
                        var inRevision = countOf(revisionItems, req.item);
                        if (inRevision === 0) {
                            errors.push(name + ' no está en la revisión de lista de materiales.');
                            gap.inRevision = false;
                        } else if (inRevision > 1) {
                            warnings.push('El artículo ' + label(req.item) + ' está duplicado en la revisión de lista de materiales (' + inRevision + ' líneas). Se consumirá en una sola línea; elimine la línea repetida de la revisión.');
                        }
                    }
                    if (workOrder && countOf(workOrder.items, req.item) === 0) {
                        errors.push(name + ' no está en la Orden de Fabricación.');
                        gap.inWorkOrder = false;
                    }
                    if (countOf(buildItems, req.item) === 0) {
                        errors.push(name + ' no está en los componentes del ensamble.');
                        gap.inBuild = false;
                    }
                    if (!gap.inRevision || !gap.inWorkOrder || !gap.inBuild) {
                        missing = true;
                        missingItems.push(gap);
                    }
                });

                if (missing) {
                    errors.push('Agregue el artículo a la revisión de lista de materiales y a la Orden de Fabricación, y vuelva a generar el ensamble.');
                }

                return {
                    ok: errors.length === 0,
                    errors: errors,
                    warnings: warnings,
                    missingItems: missingItems,
                    blockingErrors: errors.slice(0, blockingErrors),
                    datoTecnicoId: dt.id,
                    revisionId: revisionId,
                    workOrder: workOrder
                };
            }

            // ------------------------------------------------------------------ agregar artículos faltantes y recargar el ensamble

            var PENDING_DT_KEY = 'ht_ensamble_dt_pendiente_';
            var reloadedDatoTecnicoId = ''; // Dato Técnico restaurado tras agregar artículos y recargar

            function offerAddMissing(record, result) {
                var lines = result.missingItems.map(function (gap) {
                    var where = [];
                    if (!gap.inRevision) where.push('revisión de lista de materiales');
                    if (!gap.inWorkOrder) where.push('Orden de Fabricación');
                    if (!gap.inBuild) where.push('componentes del ensamble');
                    return '- ' + gap.role + ' ' + gap.label + ': falta en ' + where.join(', ') + '.';
                });

                if (record.id) {
                    // Ensamble ya creado: NetSuite no permite agregarle componentes nuevos
                    dialog.alert({
                        title: 'Faltan artículos del Dato Técnico',
                        message: lines.join('<br>') + '<br><br>El ensamble ya fue creado y no se le pueden agregar componentes. ' +
                            'Agregue el artículo a la revisión y a la Orden de Fabricación y vuelva a generar el ensamble.'
                    });
                    return;
                }

                if (!result.workOrder || !result.revisionId) {
                    dialog.alert({
                        title: 'Faltan artículos del Dato Técnico',
                        message: lines.join('<br>') + '<br><br>El ensamble no tiene Orden de Fabricación o revisión de lista de materiales; no se pueden agregar automáticamente.'
                    });
                    return;
                }

                if (['G', 'H'].indexOf(result.workOrder.status) !== -1) {
                    dialog.alert({
                        title: 'Faltan artículos del Dato Técnico',
                        message: lines.join('<br>') + '<br><br>La Orden de Fabricación está construida o cerrada; no se le pueden agregar artículos.'
                    });
                    return;
                }

                // Ya se agregaron y recargó una vez con este Dato Técnico y siguen faltando: avisar (evita recargas en bucle)
                if (reloadedDatoTecnicoId && reloadedDatoTecnicoId === toId(result.datoTecnicoId)) {
                    dialog.alert({
                        title: 'Faltan artículos del Dato Técnico',
                        message: lines.join('<br>') + '<br><br>Se agregaron a la revisión y a la Orden de Fabricación, pero el ensamble aún no los tiene. Vuelva a generar el ensamble desde la Orden de Fabricación.'
                    });
                    return;
                }

                // Sin confirmación: agrega a la revisión y a la OF y recarga el ensamble
                try {
                    addMissingItems(result);
                    reloadBuild(result);
                } catch (e) {
                    console.log('Error agregando artículos', e);
                    dialog.alert({ title: 'Error', message: 'No se pudieron agregar los artículos: ' + e.message });
                }
            }

            function addMissingItems(result) {
                var toRevision = result.missingItems.filter(function (gap) { return !gap.inRevision; });
                var toWorkOrder = result.missingItems.filter(function (gap) { return !gap.inWorkOrder; });

                if (toRevision.length) {
                    var revision = nsRecord.load({ type: 'bomrevision', id: result.revisionId, isDynamic: true });
                    toRevision.forEach(function (gap) {
                        revision.selectNewLine({ sublistId: 'component' });
                        revision.setCurrentSublistValue({ sublistId: 'component', fieldId: 'item', value: gap.item });
                        revision.setCurrentSublistValue({ sublistId: 'component', fieldId: 'bomquantity', value: 1 });
                        revision.commitLine({ sublistId: 'component' });
                    });
                    revision.save();
                }

                if (toWorkOrder.length) {
                    var workOrder = nsRecord.load({ type: nsRecord.Type.WORK_ORDER, id: result.workOrder.id, isDynamic: true });
                    var quantity = Number(workOrder.getValue({ fieldId: 'quantity' })) || 1;
                    toWorkOrder.forEach(function (gap) {
                        workOrder.selectNewLine({ sublistId: 'item' });
                        workOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: gap.item });
                        workOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantity });
                        workOrder.commitLine({ sublistId: 'item' });
                    });
                    workOrder.save({ enableSourcing: true, ignoreMandatoryFields: true });
                }
            }

            // Recarga el ensamble desde la Orden de Fabricación y vuelve a poner el Dato Técnico (ver pageInit)
            function reloadBuild(result) {
                try {
                    window.sessionStorage.setItem(PENDING_DT_KEY + result.workOrder.id, result.datoTecnicoId);
                } catch (e) {
                    console.log('No se pudo guardar el Dato Técnico pendiente', e);
                }
                try { window.setWindowChanged(window, false); } catch (e) { /* función propia de NetSuite */ }
                window.onbeforeunload = null;
                window.location.reload();
            }

            function pageInit(context) {
                var record = context.currentRecord;
                if (context.mode !== 'create' && context.mode !== 'copy') return;

                var workOrderId = toId(record.getValue({ fieldId: 'createdfrom' }));
                if (!workOrderId) return;

                var datoTecnicoId = '';
                try {
                    datoTecnicoId = window.sessionStorage.getItem(PENDING_DT_KEY + workOrderId) || '';
                    window.sessionStorage.removeItem(PENDING_DT_KEY + workOrderId);
                } catch (e) {
                    console.log('No se pudo leer el Dato Técnico pendiente', e);
                }

                // Dispara fieldChanged: vuelve a validar y a preparar los componentes con los datos actualizados
                if (datoTecnicoId) {
                    reloadedDatoTecnicoId = toId(datoTecnicoId);
                    record.setValue({ fieldId: 'custbody_ht_as_datos_tecnicos', value: datoTecnicoId });
                    return;
                }

                // Dato Técnico ya cargado al abrir el ensamble (no pasa por fieldChanged): validar y ofrecer agregar
                if (record.getValue({ fieldId: 'custbody_ht_as_datos_tecnicos' })) {
                    validateDatoTecnico(record, true);
                }
            }

            function setQuantity(assemblyBuild) {
                var countTotal = assemblyBuild.getLineCount({ sublistId: 'component' });

                console.log('Total lines', countTotal);

                for (var j = 0; j < countTotal; j++) {
                    // Primero verificar si la línea existe realmente
                    try {
                        assemblyBuild.selectLine({
                            sublistId: 'component',
                            line: j
                        });

                        // Obtener el ID del item usando getSublistValue en lugar de getCurrentSublistValue
                        // var component = assemblyBuild.getSublistValue({
                        //     sublistId: 'component',
                        //     fieldId: 'item',
                        //     line: j
                        // });

                        // console.log('Processing line', {
                        //     line: j,
                        //     component: component
                        // });

                        assemblyBuild.setCurrentSublistValue({
                            sublistId: 'component',
                            fieldId: 'quantity',
                            line: j,
                            value: 0
                        });
                    } catch (e) {
                        console.log('Error processing line ' + j, e);
                    }
                }
            }

            function validateAvailableInventory(assemblyBuild) {
                let message = '';
                let recordType = '';
                let recordType2 = '';
                let dispositivoSerie = ''
                let columns = [];
                let columns2 = [];
                let idDispositivo = '';
                let simcardSerie = '';
                let idSimcard = '';
                let searchResultCountExisteInventarioDis = 0;
                let searchResultCountExisteInventarioSim = 0;
                let searchResultCountDisponibleSim = -1;
                let searchResultCountDisponible = 0;
                let locationDis = '';
                let locationSim = '';
                let subsidiary = '';
                let monitoreo = '';
                let lojack = '';
                let simcard = '';
                let filtros = '';

                var mySearch = search.create({
                    type: "customrecord_ht_record_mantchaser",
                    filters:
                        [
                            ["internalid", "anyof", assemblyBuild.getValue('custbody_ht_as_datos_tecnicos')]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "custrecord_ht_mc_subsidiaria", label: "HT Subsidiaria" }),
                            search.createColumn({ name: "custrecord_ht_mc_seriedispositivo", label: "HT MC Serie Dispositivo Chaser" }),
                            search.createColumn({ name: "custrecord_ht_mc_seriedispositivolojack", label: "HT MC Serie Dispositivo Lojack" }),
                            search.createColumn({ name: "custrecord_ht_mc_celularsimcard", label: "HT MC Celular Sim Card" })
                        ]
                });
                var searchResultCount = mySearch.runPaged().count;
                console.log("mySearch result count", searchResultCount);
                mySearch.run().each(function (result) {
                    subsidiary = result.getValue('custrecord_ht_mc_subsidiaria');
                    monitoreo = result.getValue('custrecord_ht_mc_seriedispositivo');
                    lojack = result.getValue('custrecord_ht_mc_seriedispositivolojack');
                    simcard = result.getValue('custrecord_ht_mc_celularsimcard');


                    if (monitoreo) {
                        recordType = 'customrecord_ht_record_detallechaserdisp';
                        idDispositivo = result.getValue('custrecord_ht_mc_seriedispositivo');
                        dispositivoSerie = result.getText('custrecord_ht_mc_seriedispositivo');
                        columns = ['custrecord_ht_dd_dispositivo'];
                        filtros =
                            [
                                ["custrecordht_hdd_subsidiaria", "anyof", subsidiary],
                                "AND",
                                ["name", "is", dispositivoSerie]
                            ]
                    } else if (lojack) {
                        recordType = 'customrecord_ht_record_detallechaslojack';
                        idDispositivo = result.getValue('custrecord_ht_mc_seriedispositivolojack');
                        dispositivoSerie = result.getText('custrecord_ht_mc_seriedispositivolojack');
                        columns = ['custrecord_ht_cl_lojack'];
                        filtros =
                            [
                                ["custrecord_ht_cl_lojack_sub", "anyof", subsidiary],
                                "AND",
                                ["name", "is", dispositivoSerie]
                            ]
                    }

                    if (simcard) {
                        recordType2 = 'customrecord_ht_record_detallechasersim';
                        idSimcard = result.getValue('custrecord_ht_mc_celularsimcard');
                        simcardSerie = result.getText('custrecord_ht_mc_celularsimcard');
                        columns2 = ['custrecord_ht_ds_simcard'];

                        let searchSim = getSearchLookupFields(recordType2, idSimcard, columns2)
                        idSimcard = searchSim.custrecord_ht_ds_simcard[0].value;

                        searchResultCountExisteInventarioSim = getInventoryNumber(idSimcard, simcardSerie)
                        if (searchResultCountExisteInventarioSim.count == 0) {
                            message += 'El SIM CARD no está en el inventario.'
                        }

                        locationSim = searchResultCountExisteInventarioSim.location; //*Location*/

                        let customrecord_ht_record_detallechasersimSearchObj = search.create({
                            type: recordType2,
                            filters:
                                [
                                    ["custrecord_ht_ds_subsidiaria", "anyof", subsidiary],
                                    "AND",
                                    ["name", "is", simcardSerie]
                                ],
                            columns:
                                [
                                    search.createColumn({ name: "name", label: "Name" }),
                                ]
                        });
                        searchResultCountDisponibleSim = customrecord_ht_record_detallechasersimSearchObj.runPaged().count;
                        console.log("SIM CARD Disponible", searchResultCountDisponibleSim);
                        if (searchResultCountDisponibleSim == 0) {
                            message += 'El SIM CARD no está disponible.'
                        }
                    }

                    let searchDis = getSearchLookupFields(recordType, idDispositivo, columns)
                    if (monitoreo) {
                        idDispositivo = searchDis.custrecord_ht_dd_dispositivo[0].value;
                    } else if (lojack) {
                        idDispositivo = searchDis.custrecord_ht_cl_lojack[0].value;
                    }
                    searchResultCountExisteInventarioDis = getInventoryNumber(idDispositivo, dispositivoSerie)
                    if (searchResultCountExisteInventarioDis.count == 0) {
                        message += 'El Dispositivo no está en el inventario.'
                    }

                    locationDis = searchResultCountExisteInventarioDis.location; //*Location*/

                    let customrecord_ht_record_detallechaserdispSearchObj = search.create({
                        type: recordType,
                        filters: filtros,
                        columns:
                            [
                                search.createColumn({ name: "name", label: "Name" }),
                            ]
                    });
                    searchResultCountDisponible = customrecord_ht_record_detallechaserdispSearchObj.runPaged().count;
                    console.log("Dispositivo Disponible", searchResultCountDisponible);
                    if (searchResultCountDisponible == 0) {
                        message += 'El Dispositivo no está disponible.'
                    }
                });

                console.log({
                    searchResultCountExisteInventarioDis: searchResultCountExisteInventarioDis.count,
                    searchResultCountExisteInventarioSim: searchResultCountExisteInventarioSim.count,
                    searchResultCountDisponible: searchResultCountDisponible,
                    searchResultCountDisponibleSim: searchResultCountDisponibleSim
                })

                if (searchResultCountExisteInventarioDis.count == 0 || searchResultCountDisponible == 0 || searchResultCountExisteInventarioSim.count == 0 || searchResultCountDisponibleSim == 0) {
                    console.log('message', message);
                    dialog.alert({
                        title: 'Error',
                        message: message
                    });
                }

                if (searchResultCountExisteInventarioDis.count != 0 && searchResultCountDisponible != 0 && searchResultCountExisteInventarioSim.count != 0 && searchResultCountDisponibleSim != 0) {
                    if (locationDis && (locationDis == locationSim || !locationSim)) {
                        assemblyBuild.setValue({ fieldId: 'location', value: locationDis });
                    } else {
                        console.log('locationDis == locationSim', `${locationDis} == ${locationSim}`);
                        dialog.alert({
                            title: 'Error',
                            message: 'El Dispositivo y SimCard no se encuentran en la misma ubicación'
                        });
                    }
                }

            }

            const getInventoryNumber = (item, serie) => {
                let location = '';
                let inventorynumberSearchObj = search.create({
                    type: "inventorynumber",
                    filters:
                        [
                            ["item", "anyof", item],
                            "AND",
                            ["inventorynumber", "is", serie],
                            "AND",
                            ["quantityavailable", "greaterthan", "0"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "inventorynumber", label: "Number" }),
                            search.createColumn({ name: "location", label: "Location" }),
                        ]
                });
                let searchResultCountExisteInventario = inventorynumberSearchObj.runPaged().count;
                console.log("Item se encuentra en el inventario", searchResultCountExisteInventario);
                inventorynumberSearchObj.run().each(function (result) {
                    location = result.getValue("location");
                });

                let jsonReturn = {
                    count: searchResultCountExisteInventario,
                    location: location
                };
                console.log(jsonReturn);
                return jsonReturn
            }

            const getSearchLookupFields = (recordType, id, columns) => {
                let searchDis = search.lookupFields({
                    type: recordType,
                    id: id,
                    columns: columns
                })

                return searchDis
            }

            return {
                pageInit: pageInit,
                fieldChanged: fieldChanged,
                saveRecord: saveRecord
            };
        });