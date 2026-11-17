function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    var recordType = transactionRecord.getRecordType();

    // Solo aplicar a Facturas de Venta
    if (recordType != 'invoice') return;

    var id = transactionRecord.getId();
    var bookId = book.getId();
    var isPrimaryBook = book.isPrimary();
  
    // 1. Obtener valores de cabecera (IDs reales de base de datos)
    // Se recomienda usar custbody en lugar de custpage para scripts de servidor
    var applyWht = transactionRecord.getFieldValue('custbody_4601_appliesto');
    var currency = transactionRecord.getFieldValue('currency');
    var exchangeHeader = Number(transactionRecord.getFieldValue('exchangerate') || 1);
 
    // --- NUEVA LÓGICA: SUMATORIA DE COLUMNAS EN LÍNEAS ---
    var whtAmountTrans = 0;
    var itemCount = transactionRecord.getLineItemCount('item');

    for (var i = 1; i <= itemCount; i++) {
        var lineWht = Number(transactionRecord.getLineItemValue('item', 'custcol_4601_witaxamount', i) || 0);
        whtAmountTrans += lineWht;
    }

    // ----------------------------------------------------
  
    nlapiLogExecution("DEBUG", "Validación Inicio", "ID: " + id + " | Aplica: " + applyWht + " | Monto Transacción: " + whtAmountTrans);

    if ((applyWht == 'T' || applyWht === true) && whtAmountTrans > 0) {

        try {
            // --- LÓGICA DE MULTIBOOK: Determinar tasa de cambio según el libro actual ---
            var tasaDeCambio = 0;

            if (book.isPrimary()) {
                tasaDeCambio = exchangeHeader;
            } else {
                var sublistBook = 'accountingbookdetail';
                var bookCount = transactionRecord.getLineItemCount(sublistBook);
                for (var j = 1; j <= bookCount; j++) {
                    // Se compara el ID del libro en la sublista con el ID del libro actual
                    if (transactionRecord.getLineItemValue(sublistBook, 'bookid', j) == bookId) {
                        tasaDeCambio = Number(transactionRecord.getLineItemValue(sublistBook, 'exchangerate', j));
                        break;
                    }
                }         }

            // Fallback en caso de no encontrar tasa específica
            if (!tasaDeCambio || tasaDeCambio === 0) tasaDeCambio = exchangeHeader;

            // Calcular monto convertido para el libro actual
            var amountForBook = Math.round((whtAmountTrans * tasaDeCambio) * 100) / 100;

            nlapiLogExecution("DEBUG", "Cálculo Multibook", "Libro: " + bookId + " | Tasa: " + tasaDeCambio + " | Monto Libro: " + amountForBook);

            // --- CONFIGURACIÓN DE CUENTAS ---
            var CTA_DETRACCION_MN = 6303; 
            var CTA_DETRACCION_ME = 6302; 
            var CTA_FACTURA_MN    = 4896; 
            var CTA_FACTURA_ME    = 4897; 

            var accountDebit, accountCredit;

            if (currency == '1') { // Moneda Local
                accountDebit  = CTA_FACTURA_ME;
                accountCredit = CTA_DETRACCION_ME;
            } else { // Moneda Extranjera
                accountDebit  = CTA_FACTURA_MN;
                accountCredit = CTA_DETRACCION_MN;
            }

            // --- SEGMENTACIÓN (Dimensiones) ---
            var firstLine = standardLines.getLine(0);
            //var entityId   = firstLine.getEntityId();
            var entityId = standardLines.getLine(0).getEntityId();
            var deptId     = firstLine.getDepartmentId();
            var classId    = firstLine.getClassId();
            var locationId = firstLine.getLocationId();

            nlapiLogExecution("DEBUG", "Cuenta AR", "Cuenta:" + accountDebit + " | Libro: " + bookId + ' | Entidad: ' + entityId + ' | Es primario: ' + book.isPrimary());

            // 4. CREAR LÍNEA DÉBITO (Aumenta Facturas - Cuenta por Cobrar)
            var lineDeb = customLines.addNewLine();
            lineDeb.setAccountId(Number(accountDebit));
            lineDeb.setDebitAmount(amountForBook); // Usar monto calculado por libro
            lineDeb.setMemo("Reversa Detracción Automática (Aumento AR)");
            // --- LÓGICA BLINDADA ---
            if (isPrimaryBook) {
                // En el libro primario SÍ ponemos la entidad para el Estado de Cuenta
                //if (entityId) lineDeb.setEntityId(Number(entityId));
                nlapiLogExecution("DEBUG", "Libro Primario", "Cuenta AR " + accountDebit);
            } else {
                // En libros secundarios, NO SE LLAMA a setEntityId. 
                // Esto evita que el validador de NetSuite encuentre el conflicto.
                nlapiLogExecution("DEBUG", "Libro Secundario", "Omitiendo entidad en cuenta AR " + accountDebit);
            }
            if (deptId) lineDeb.setDepartmentId(deptId);
            if (classId) lineDeb.setClassId(classId);
            if (locationId) lineDeb.setLocationId(locationId);

            // 5. CREAR LÍNEA CRÉDITO (Disminuye Detracciones)
            var lineCre = customLines.addNewLine();
            lineCre.setAccountId(Number(accountCredit));
            lineCre.setCreditAmount(amountForBook); // Usar monto calculado por libro
            lineCre.setMemo("Reversa Detracción Automática (Mueve a Detracciones)");
            // Al ser 'Other Current Asset', NetSuite permite la entidad en todos los libros
            if (entityId) {
                lineCre.setEntityId(Number(entityId));
            }
            if (deptId) lineCre.setDepartmentId(deptId);
            if (classId) lineCre.setClassId(classId);
            if (locationId) lineCre.setLocationId(locationId);

            nlapiLogExecution("AUDIT", "GL Exitoso", "Libro ID: " + bookId + " | Total Detracción: " + amountForBook);
          
        } catch (e) {
            nlapiLogExecution("ERROR", "Error creando líneas custom", e.message);
        }
    } else {
        nlapiLogExecution("DEBUG", "Detraccion", "No aplica detracción o monto es 0.");
    }
}