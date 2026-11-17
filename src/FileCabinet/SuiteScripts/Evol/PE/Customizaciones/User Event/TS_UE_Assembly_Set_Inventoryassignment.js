/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/search', 'N/error'],
    function (record, log, search, error) {

        const ERROR_NAME = 'HT_ENSAMBLE_DATO_TECNICO';
        const FIELD_DATO_TECNICO = 'custbody_ht_as_datos_tecnicos';
        const ROLE = { DISPOSITIVO: 'dispositivo', SIM: 'SIM card' };

        const isCreateOrEdit = (context) =>
            context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT;

        /**
         * Bloquea el guardado (UI, CSV o script), al crear y al editar, si el Dato Técnico no es coherente con
         * la revisión de lista de materiales, la Orden de Fabricación y los componentes del ensamble.
         */
        function beforeSubmit(context) {
            if (!isCreateOrEdit(context)) return;
            const assemblyBuild = context.newRecord;
            if (!assemblyBuild.getValue({ fieldId: FIELD_DATO_TECNICO })) return;

            const result = validateBuild(assemblyBuild);
            if (result.warnings.length) {
                log.audit('Advertencias Dato Técnico', result.warnings);
            }
            if (!result.ok) {
                log.error('Validación Dato Técnico', result.errors);
                throw error.create({ name: ERROR_NAME, message: formatMessage(result), notifyOff: true });
            }
        }

        /**
         * Edita los componentes según el Dato Técnico (al crear y al editar):
         * cantidad 1 + detalle de inventario en una sola línea por artículo del Dato Técnico,
         * cantidad 0 en líneas repetidas o del Dato Técnico anterior.
         */
        function afterSubmit(context) {
            if (!isCreateOrEdit(context)) return;
            const isCreate = context.type === context.UserEventType.CREATE;
            const newRecord = context.newRecord;

            const datoTecnicoId = toId(newRecord.getValue({ fieldId: FIELD_DATO_TECNICO }));
            if (!datoTecnicoId) return;

            const oldDatoTecnicoId = (!isCreate && context.oldRecord)
                ? toId(context.oldRecord.getValue({ fieldId: FIELD_DATO_TECNICO }))
                : '';
            const dtChanged = isCreate || oldDatoTecnicoId !== datoTecnicoId;

            try {
                const dt = getDatoTecnico(datoTecnicoId);
                const required = getRequiredItems(dt);
                required.forEach((req) => {
                    req.inventoryNumberId = findInventoryNumberId(req.item, req.serial);
                });

                const staleItems = (dtChanged && oldDatoTecnicoId)
                    ? getRequiredItems(getDatoTecnico(oldDatoTecnicoId)).map((req) => req.item)
                    : [];

                const plan = planComponentSync({
                    lines: readComponentLines(newRecord),
                    required: required,
                    staleItems: staleItems,
                    dtChanged: dtChanged
                });
                log.debug('Plan componentes', { buildId: newRecord.id, dtChanged: dtChanged, plan: plan });

                const pending = plan.filter((line) => line.action !== 'keep');
                if (!dtChanged && !pending.length) {
                    log.debug('Componentes ya sincronizados con el Dato Técnico', newRecord.id);
                    return;
                }

                const assemblyBuild = record.load({ type: record.Type.ASSEMBLY_BUILD, id: newRecord.id, isDynamic: true });
                const location = assemblyBuild.getValue({ fieldId: 'location' });

                if (isCreate) {
                    assemblyBuild.setValue({ fieldId: 'quantity', value: 1 });
                }

                // Detalle de inventario principal (serie del ensamble = serie del dispositivo)
                if (dtChanged && dt.deviceSerial) {
                    const deviceStock = findAvailableBin(dt.deviceItem, dt.deviceSerial, location);
                    updateMainInventoryDetail(assemblyBuild, dt.deviceSerial, deviceStock ? deviceStock.binId : '');
                }

                pending.forEach((line) => {
                    if (line.action === 'assign') {
                        const req = line.requirement;
                        const stock = findAvailableBin(req.item, req.serial, location);
                        if (!stock || !stock.inventoryNumberId) {
                            throw error.create({
                                name: ERROR_NAME,
                                message: `La serie ${req.serial} del ${req.role} no tiene stock disponible en la ubicación del ensamble.`,
                                notifyOff: true
                            });
                        }
                        assignComponentLine(assemblyBuild, line.line, stock);
                    } else {
                        clearComponentLine(assemblyBuild, line.line);
                    }
                });

                const buildId = assemblyBuild.save();
                log.audit('Assembly Build actualizado', { buildId: buildId, cambios: pending.length });

            } catch (e) {
                log.error('Error en afterSubmit', e);
                throw error.create({
                    name: ERROR_NAME,
                    message: 'El ensamble se guardó, pero no se pudieron asignar los componentes del Dato Técnico: ' + e.message,
                    notifyOff: true
                });
            }
        }

        // ------------------------------------------------------------------ edición de componentes

        /** Lee las líneas de componentes (modo estándar, solo lectura) incluyendo la serie asignada. */
        function readComponentLines(rec) {
            const lines = [];
            const count = rec.getLineCount({ sublistId: 'component' });
            for (let i = 0; i < count; i++) {
                const line = {
                    line: i,
                    item: rec.getSublistValue({ sublistId: 'component', fieldId: 'item', line: i }),
                    quantity: rec.getSublistValue({ sublistId: 'component', fieldId: 'quantity', line: i }),
                    hasDetail: false,
                    assignedNumber: ''
                };
                try {
                    line.hasDetail = rec.hasSublistSubrecord({ sublistId: 'component', fieldId: 'componentinventorydetail', line: i });
                    if (line.hasDetail) {
                        const detail = rec.getSublistSubrecord({ sublistId: 'component', fieldId: 'componentinventorydetail', line: i });
                        if (detail.getLineCount({ sublistId: 'inventoryassignment' }) > 0) {
                            line.assignedNumber = detail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: 0 });
                        }
                    }
                } catch (e) {
                    // No se pudo leer el detalle: se considera desconocido para no reasignar una serie ya consumida
                    line.hasDetail = rec.getSublistValue({ sublistId: 'component', fieldId: 'componentinventorydetailset', line: i }) === 'T';
                    line.assignedNumber = undefined;
                }
                lines.push(line);
            }
            return lines;
        }

        /**
         * Decide qué hacer con cada línea de componentes:
         *  - assign: la primera línea de cada artículo del Dato Técnico -> cantidad 1 + detalle de inventario.
         *  - clear:  líneas repetidas de esos artículos o del Dato Técnico anterior -> cantidad 0 sin detalle.
         *  - keep:   lo demás (o la línea ya está correcta).
         */
        function planComponentSync({ lines, required, staleItems, dtChanged }) {
            const assigned = new Set();
            const requiredItems = required.map((req) => toId(req.item));
            const stale = (staleItems || []).map(toId).filter((item) => requiredItems.indexOf(item) === -1);

            return lines.map((line) => {
                const item = toId(line.item);
                const quantity = Number(line.quantity) || 0;
                const requirement = required.find((req) => toId(req.item) === item);

                if (requirement && !assigned.has(item)) {
                    assigned.add(item);
                    const sameNumber = line.assignedNumber === undefined
                        || (requirement.inventoryNumberId && toId(line.assignedNumber) === toId(requirement.inventoryNumberId));
                    const isCorrect = !dtChanged && quantity === 1 && line.hasDetail && sameNumber;
                    return { line: line.line, item: item, action: isCorrect ? 'keep' : 'assign', requirement: requirement };
                }

                const mustBeZero = requirement || stale.indexOf(item) !== -1;
                return { line: line.line, item: item, action: (mustBeZero && quantity !== 0) ? 'clear' : 'keep' };
            });
        }

        function updateMainInventoryDetail(assemblyBuild, serie, bin) {
            const invdet = assemblyBuild.getSubrecord({ fieldId: 'inventorydetail' });
            clearInventoryAssignments(invdet);

            invdet.selectNewLine({ sublistId: 'inventoryassignment' });
            invdet.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', value: serie });
            if (bin) {
                invdet.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: bin });
            }
            invdet.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: 1 });
            invdet.commitLine({ sublistId: 'inventoryassignment' });
        }

        function assignComponentLine(assemblyBuild, lineNum, stock) {
            assemblyBuild.selectLine({ sublistId: 'component', line: lineNum });
            assemblyBuild.setCurrentSublistValue({ sublistId: 'component', fieldId: 'quantity', value: 1 });

            const detail = assemblyBuild.getCurrentSublistSubrecord({ sublistId: 'component', fieldId: 'componentinventorydetail' });
            clearInventoryAssignments(detail);

            detail.selectNewLine({ sublistId: 'inventoryassignment' });
            detail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: stock.inventoryNumberId });
            if (stock.binId) {
                detail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', value: stock.binId });
            }
            detail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorystatus', value: 1 });
            detail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: 1 });
            detail.commitLine({ sublistId: 'inventoryassignment' });

            assemblyBuild.commitLine({ sublistId: 'component' });
        }

        function clearComponentLine(assemblyBuild, lineNum) {
            assemblyBuild.selectLine({ sublistId: 'component', line: lineNum });
            assemblyBuild.setCurrentSublistValue({ sublistId: 'component', fieldId: 'quantity', value: 0 });
            if (assemblyBuild.hasCurrentSublistSubrecord({ sublistId: 'component', fieldId: 'componentinventorydetail' })) {
                try {
                    assemblyBuild.removeCurrentSublistSubrecord({ sublistId: 'component', fieldId: 'componentinventorydetail' });
                } catch (e) {
                    clearInventoryAssignments(assemblyBuild.getCurrentSublistSubrecord({ sublistId: 'component', fieldId: 'componentinventorydetail' }));
                }
            }
            assemblyBuild.commitLine({ sublistId: 'component' });
        }

        function clearInventoryAssignments(subrecord) {
            if (!subrecord) return;
            const assignCount = subrecord.getLineCount({ sublistId: 'inventoryassignment' });
            for (let i = assignCount - 1; i >= 0; i--) {
                subrecord.removeLine({ sublistId: 'inventoryassignment', line: i });
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
            return items.filter((value) => toId(value) === toId(item)).length;
        }

        function lookupItemFromSerial(recordType, id, fieldId) {
            if (!id) return '';
            const result = search.lookupFields({ type: recordType, id: id, columns: [fieldId] });
            return fieldValue(result[fieldId]);
        }

        function getDatoTecnico(datoTecnicoId) {
            const dt = search.lookupFields({
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

            const chaserSerialId = fieldValue(dt.custrecord_ht_mc_seriedispositivo);
            const lojackSerialId = fieldValue(dt.custrecord_ht_mc_seriedispositivolojack);
            const simSerialId = fieldValue(dt.custrecord_ht_mc_celularsimcard);

            let deviceSerial = '';
            let deviceItemFromSerial = '';
            if (chaserSerialId) {
                deviceSerial = fieldText(dt.custrecord_ht_mc_seriedispositivo);
                deviceItemFromSerial = lookupItemFromSerial('customrecord_ht_record_detallechaserdisp', chaserSerialId, 'custrecord_ht_dd_dispositivo');
            } else if (lojackSerialId) {
                deviceSerial = fieldText(dt.custrecord_ht_mc_seriedispositivolojack);
                deviceItemFromSerial = lookupItemFromSerial('customrecord_ht_record_detallechaslojack', lojackSerialId, 'custrecord_ht_cl_lojack');
            }

            // LoJack: el artículo está en custrecord_ht_cl_dt_lojack (no usa custrecord_ht_dt_dispositivo)
            const deviceItem = (!chaserSerialId && lojackSerialId)
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

        /** Artículos que el Dato Técnico obliga a consumir: dispositivo y, si tiene serie, SIM. */
        function getRequiredItems(dt) {
            const required = [];
            if (dt.deviceItem) {
                required.push({ role: ROLE.DISPOSITIVO, item: dt.deviceItem, serial: dt.deviceSerial });
            }
            const simItem = dt.simItem || dt.simItemFromSerial;
            if (dt.simSerial && simItem) {
                required.push({ role: ROLE.SIM, item: simItem, serial: dt.simSerial });
            }
            return required;
        }

        function getSublistItems(rec, sublistId) {
            const items = [];
            const count = rec.getLineCount({ sublistId: sublistId });
            for (let i = 0; i < count; i++) {
                items.push(toId(rec.getSublistValue({ sublistId: sublistId, fieldId: 'item', line: i })));
            }
            return items;
        }

        function getRevisionItems(revisionId) {
            return getSublistItems(record.load({ type: 'bomrevision', id: revisionId }), 'component');
        }

        function getWorkOrder(transactionId) {
            const lookup = search.lookupFields({ type: search.Type.TRANSACTION, id: transactionId, columns: ['type'] });
            if (fieldValue(lookup.type) !== 'WorkOrd') return null;

            const workOrder = record.load({ type: record.Type.WORK_ORDER, id: transactionId });
            return {
                revision: toId(workOrder.getValue({ fieldId: 'billofmaterialsrevision' })),
                items: getSublistItems(workOrder, 'item')
            };
        }

        function getItemNames(itemIds) {
            const names = {};
            const ids = Array.from(new Set(itemIds.filter(Boolean)));
            if (!ids.length) return names;

            search.create({
                type: search.Type.ITEM,
                filters: [['internalid', 'anyof', ids]],
                columns: ['itemid', 'displayname']
            }).run().each((result) => {
                const itemid = result.getValue({ name: 'itemid' });
                const displayname = result.getValue({ name: 'displayname' });
                names[toId(result.id)] = displayname ? `${itemid} ${displayname}` : itemid;
                return true;
            });
            return names;
        }

        function findInventoryNumberId(itemId, serial) {
            let id = '';
            if (!itemId || !serial) return id;
            search.create({
                type: 'inventorynumber',
                filters: [['item', 'anyof', itemId], 'AND', ['inventorynumber', 'is', serial]],
                columns: ['inventorynumber']
            }).run().each((result) => {
                id = toId(result.id);
                return false;
            });
            return id;
        }

        function findAvailableBin(itemId, serial, location) {
            const filters = [
                ['inventorynumber', 'is', serial],
                'AND',
                ['inventorynumber.item', 'anyof', itemId],
                'AND',
                ['quantityavailable', 'greaterthan', '0']
            ];
            if (location) filters.push('AND', ['location', 'anyof', location]);

            let found = null;
            search.create({
                type: 'inventorynumberbin',
                filters: filters,
                columns: ['inventorynumber', 'binnumber', 'location']
            }).run().each((result) => {
                found = {
                    inventoryNumberId: toId(result.getValue({ name: 'inventorynumber' })),
                    binId: toId(result.getValue({ name: 'binnumber' }))
                };
                return false;
            });
            return found;
        }

        function validateBuild(rec) {
            const errors = [];
            const warnings = [];

            const revisionId = toId(rec.getValue({ fieldId: 'billofmaterialsrevision' }));
            const createdFrom = toId(rec.getValue({ fieldId: 'createdfrom' }));

            const dt = getDatoTecnico(toId(rec.getValue({ fieldId: FIELD_DATO_TECNICO })));
            const revisionItems = revisionId ? getRevisionItems(revisionId) : [];
            const workOrder = createdFrom ? getWorkOrder(createdFrom) : null;
            const buildItems = getSublistItems(rec, 'component');
            const names = getItemNames([dt.deviceItem, dt.deviceItemFromSerial, dt.simItem, dt.simItemFromSerial]);
            const label = (item) => names[item] ? names[item] : `ID ${item}`;
            let missing = false;

            // No se validan los datos del Dato Técnico: solo que sus artículos estén en revisión, OF y componentes
            if (!revisionId) {
                errors.push('El ensamble no tiene revisión de lista de materiales.');
            }
            if (workOrder && revisionId && workOrder.revision && workOrder.revision !== revisionId) {
                errors.push('La revisión de lista de materiales del ensamble no coincide con la de la Orden de Fabricación.');
            }

            getRequiredItems(dt).forEach((req) => {
                const name = `El ${req.role} ${label(req.item)} del Dato Técnico`;
                if (revisionId) {
                    const inRevision = countOf(revisionItems, req.item);
                    if (inRevision === 0) {
                        errors.push(`${name} no está en la revisión de lista de materiales.`);
                        missing = true;
                    } else if (inRevision > 1) {
                        warnings.push(`El artículo ${label(req.item)} está duplicado en la revisión de lista de materiales (${inRevision} líneas). Se consumirá en una sola línea; elimine la línea repetida de la revisión.`);
                    }
                }
                if (workOrder && countOf(workOrder.items, req.item) === 0) {
                    errors.push(`${name} no está en la Orden de Fabricación.`);
                    missing = true;
                }
                if (countOf(buildItems, req.item) === 0) {
                    errors.push(`${name} no está en los componentes del ensamble.`);
                    missing = true;
                }
            });

            if (missing) {
                errors.push('Agregue el artículo a la revisión de lista de materiales y a la Orden de Fabricación, y vuelva a generar el ensamble.');
            }

            return { ok: errors.length === 0, errors: errors, warnings: warnings };
        }

        function formatMessage(result, separator) {
            const sep = separator || '\n';
            return result.errors.concat(result.warnings).join(sep);
        }

        return {
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });
