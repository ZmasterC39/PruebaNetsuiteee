/**
 * Script: SuiteGL - Reclasificación de Depósitos (Customer Deposit & Application)
 * Version: 1.0.5 - Eliminación de book.getExchangeRate() que causa TypeError.
 */
function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    var recordType = transactionRecord.getRecordType();
    var id = transactionRecord.getId();

    // 1. CONFIGURACIÓN DE CUENTAS Y CONSTANTES
    var accountPasivoEstandar = 1837;      
    var accountAnticiposPasivoMN = 6819;    
    var accountAnticiposPasivoME = 6820;    
    const ID_MONEDA_BASE = '1';           
    const TOLERANCE = 0.1;            
    
    nlapiLogExecution('DEBUG', 'customizeGlImpact - Inicio', 'Tipo de Registro: ' + recordType + ', ID: ' + id);

// ----------------------------------------------------------------------------------------------------
// A) LÓGICA PARA EL DEPÓSITO DE CLIENTE (customerdeposit)
// ----------------------------------------------------------------------------------------------------
    if (recordType == 'customerdeposit') {
        var pago = Number(transactionRecord.getFieldValue('payment'));
        var location_id = Number(transactionRecord.getFieldValue('location'));
        var memo = transactionRecord.getFieldValue('memo');
        var exchangerate = transactionRecord.getFieldValue('exchangerate');
        var moneda = transactionRecord.getFieldValue('currency');
        var Lpago = 0; 
        
        // --- Determinación de Cuenta Objetivo ---
        var targetAccountAnticiposPasivo;
        if (moneda == ID_MONEDA_BASE) {
            targetAccountAnticiposPasivo = accountAnticiposPasivoME;
        } else {
            targetAccountAnticiposPasivo = accountAnticiposPasivoMN;
        }
        
        // --- Determinación del Monto en Moneda Base (Lpago) ---
        var tasaDeCambio = 0;
        
        if (book.isPrimary()) {
            // Libro Primario: Usar el tipo de cambio del encabezado
            tasaDeCambio = Number(exchangerate);
        } else {
            // Libro Secundario: **SOLO** usar el método de Fallback (sublista), ya que book.getExchangeRate() falla.
            const USGAAP_BOOK_ID = book.getId(); // ID del libro secundario, ajustar si es necesario
            const sublistId = 'accountingbookdetail';
            var lineCountRecord = 0; 
            
            try { 
                lineCountRecord = transactionRecord.getLineItemCount(sublistId); 
            } catch(e) { 
                nlapiLogExecution('DEBUG', 'GET LINE COUNT FALLA', 'No se pudo obtener el conteo de líneas del libro contable.');
            }
            
            for (var i = 1; i <= lineCountRecord; i++) {
                const currentBookId = transactionRecord.getLineItemValue(sublistId, 'bookid', i);
                if (currentBookId == USGAAP_BOOK_ID) {
                    tasaDeCambio = Number(transactionRecord.getLineItemValue(sublistId, 'exchangerate', i));
                    nlapiLogExecution('DEBUG', 'TASA SECUNDARIA ENCONTRADA', 'Libro ID: ' + currentBookId + ', Tasa: ' + tasaDeCambio);
                    break; 
                }
            }
            // Fallback final
            if (!tasaDeCambio || tasaDeCambio === 0) {
                 tasaDeCambio = Number(exchangerate);
                 nlapiLogExecution('DEBUG', 'FALLBACK TASA', 'Usando tasa primaria por defecto: ' + tasaDeCambio);
            }
   
        }
        
        if (moneda == ID_MONEDA_BASE) {
            Lpago = (pago * tasaDeCambio);
        } else {
            // Aplicar la tasa de cambio obtenida (sea del encabezado o del libro secundario)
            Lpago = (pago * tasaDeCambio); 
        }
        nlapiLogExecution('DEBUG', 'CD - Monto en Moneda Base (pago)', pago); 
        nlapiLogExecution('DEBUG', 'CD - Monto en TC', tasaDeCambio); 
        nlapiLogExecution('DEBUG', 'CD - Monto en Moneda Base (Lpago)', Lpago); 

        nlapiLogExecution('DEBUG', 'Moneda ', moneda); 
        nlapiLogExecution('DEBUG', 'Moneda Base ', ID_MONEDA_BASE); 
       
        // 1. Lpago con 5 decimales (para el registro final)
        //Lpago = parseFloat(Lpago.toFixed(5)); 
        Lpago = Math.round(Lpago * 100) / 100;
       //    Creamos una NUEVA variable para este valor redondeado.
       var Lpago5Dec = parseFloat(Lpago.toFixed(5));

      nlapiLogExecution('DEBUG', 'CD - Monto en Moneda Base (Lpago)', Lpago); 
      nlapiLogExecution('DEBUG', 'CD - Monto en Moneda Base (Lpago5Dec)', Lpago5Dec); 
        
        // 2. Lpago con 2 decimales (para la comparación)
       // var Lpago2DecP = parseFloat(Lpago.toFixed(2));
        var Lpago2Dec = Math.round(Lpago5Dec * 100) / 100;
        
       // nlapiLogExecution('DEBUG', 'CD - Lpago 2 Decimales P (Para Búsqueda)', Lpago2DecP);
        nlapiLogExecution('DEBUG', 'CD - Lpago 2 Decimales (Para Búsqueda)', Lpago2Dec);
        nlapiLogExecution('DEBUG', 'CD - Cuenta Objetivo Pasivo', targetAccountAnticiposPasivo);

       // LÓGICA DE RECLASIFICACIÓN
        if (Lpago > 0) {
            
            // 1. BÚSQUEDA DEFENSIVA DE LA LÍNEA ESTÁNDAR (CRÉDITO)
            var standardCreditLine = null;
            var i = 0;
            
            while(true) {
                try {
                    var line = standardLines.getLine(i);
                    if (!line) { break; }

                    var creditAmount = line.getCreditAmount();
                    nlapiLogExecution('DEBUG', 'CD - creditAmount', creditAmount);
                    nlapiLogExecution('DEBUG', 'CD - Math.abs(creditAmount - Lpago2Dec)', Math.abs(creditAmount - Lpago2Dec));
                    
                    
                    if (line.getAccountId() == accountPasivoEstandar && creditAmount > 0) {
                        // COMPARACIÓN ROBUSTA: Comparamos el crédito estándar con Lpago redondeado a 2 decimales.
                        if (Math.abs(creditAmount - Lpago2Dec) < TOLERANCE) {
                            standardCreditLine = line;
                            // **IMPORTANTE:** Reemplazamos Lpago con el CreditAmount ESTÁNDAR para la anulación
                            // Esto asegura que Débito y Crédito se anulen exactamente con el monto de NetSuite.
                            Lpago = creditAmount; 
                            nlapiLogExecution('DEBUG', 'CD - Monto Final Anulación', Lpago);
                            break;
                        }
                    }
                  i++;
                } catch(e) {
                    break; 
                }
            }
            
            if (standardCreditLine) {
                var entity = standardCreditLine.getEntityId();
                var department = standardCreditLine.getDepartmentId();
                var _class = standardCreditLine.getClassId();
                
                // 2. LÍNEA DE ANULACIÓN (Débito al Pasivo Estándar)
                var newLineAnulacion = customLines.addNewLine();
                newLineAnulacion.setDebitAmount(Lpago);
                newLineAnulacion.setAccountId(accountPasivoEstandar);
                if (entity) newLineAnulacion.setEntityId(entity);
                if (department) newLineAnulacion.setDepartmentId(department);
                if (_class) newLineAnulacion.setClassId(_class);
                newLineAnulacion.setLocationId(location_id);
                newLineAnulacion.setMemo('SUITEGL ANULACIÓN PASIVO ESTÁNDAR: ' + memo);
                
                // 3. LÍNEA DE RECLASIFICACIÓN (Crédito al Pasivo Personalizado)
                var newLineReclasificacion = customLines.addNewLine();
                newLineReclasificacion.setCreditAmount(Lpago);
                newLineReclasificacion.setAccountId(targetAccountAnticiposPasivo); 
                if (entity) newLineReclasificacion.setEntityId(entity);
                if (department) newLineReclasificacion.setDepartmentId(department);
                if (_class) newLineReclasificacion.setClassId(_class);
                newLineReclasificacion.setLocationId(location_id);
                newLineReclasificacion.setMemo('SUITEGL CRÉDITO ANTICIPOS PASIVO: ' + memo);
                
                nlapiLogExecution('DEBUG', 'CD - Reclasificación Pasivo', 'Completa. Cuenta: ' + targetAccountAnticiposPasivo);
            } else {
                nlapiLogExecution('DEBUG', 'CD - Sin Pasivo Estándar', 'No se encontró la línea de Pasivo Estándar para reclasificar. Monto Lpago: ' + Lpago);
            }
        }
    }
    
// ----------------------------------------------------------------------------------------------------
// B) LÓGICA PARA LA APLICACIÓN DE DEPÓSITO DE CLIENTE (depositapplication)
// ----------------------------------------------------------------------------------------------------
    if (recordType == 'depositapplication') {
        nlapiLogExecution('DEBUG', 'CDA - Inicio', 'Manejando Aplicación de Depósito.');

        // 1. BÚSQUEDA DEFENSIVA DE LA LÍNEA ESTÁNDAR (DÉBITO)
        var standardDebitLine = null;
        var amountToReverse = 0;
        var i = 0;
        
        while(true) {
            try {
                var line = standardLines.getLine(i);
                if (!line) { break; }
                
                var debitAmount = line.getDebitAmount();
                
                if(line.getAccountId() == accountPasivoEstandar && debitAmount > 0) {
                    standardDebitLine = line;
                    amountToReverse = debitAmount; 
                    break;
                }
                i++;
            } catch(e) {
                break; 
            }
        }

        if (standardDebitLine) {
            var entity = standardDebitLine.getEntityId();
            var location_id = standardDebitLine.getLocationId(); 
            var memo = transactionRecord.getFieldValue('memo') || 'Aplicación Depósito';
            
            // Determinar la cuenta de Pasivo personalizada a cancelar.
            var appliedCurrency = transactionRecord.getFieldValue('currency');
            var targetAccountAnticiposPasivo;
            if (appliedCurrency == ID_MONEDA_BASE) {
                targetAccountAnticiposPasivo = accountAnticiposPasivoME;
            } else {
                targetAccountAnticiposPasivo = accountAnticiposPasivoMN;
            }
            
            // 2. LÍNEA DE ANULACIÓN (Crédito al Pasivo Estándar)
            var newLineAnulacion = customLines.addNewLine();
            newLineAnulacion.setCreditAmount(amountToReverse);
            newLineAnulacion.setAccountId(accountPasivoEstandar);
            if (entity) newLineAnulacion.setEntityId(entity);
            newLineAnulacion.setLocationId(location_id);
            newLineAnulacion.setMemo('SUITEGL ANULACIÓN APLICACIÓN PASIVO ESTÁNDAR: ' + memo);
            
            // 3. LÍNEA DE CANCELACIÓN (Débito al Pasivo Personalizado)
            var newLineCancelacion = customLines.addNewLine();
            newLineCancelacion.setDebitAmount(amountToReverse);
            newLineCancelacion.setAccountId(targetAccountAnticiposPasivo); 
            if (entity) newLineCancelacion.setEntityId(entity);
            newLineCancelacion.setLocationId(location_id);
            newLineCancelacion.setMemo('SUITEGL DÉBITO ANTICIPOS PASIVO: ' + memo);
            
            nlapiLogExecution('DEBUG', 'CDA - Cancelación Pasivo', 'Cuenta: ' + targetAccountAnticiposPasivo + ', Monto: ' + amountToReverse);
        } else {
            nlapiLogExecution('DEBUG', 'CDA - Sin Pasivo Estándar', 'No se encontró la línea de Pasivo Estándar para aplicar.');
        }
    }
}