/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

  const NEW_DOCUMENT_TYPE_ID = 2;  

  function getClientesToUpdate() {
    const customerIds = [];

    // Cargar la búsqueda guardada por ID interno o nombre script ID
    const customerSearch = search.load({ id: 'customsearch_hu_ec_cliente_revision' });

    customerSearch.run().each(result => {
      const internalId = result.getValue({ name: 'internalid' });
      customerIds.push(internalId);
      return true;
    });

    return customerIds;
  }

  function execute(context) {
    try {
      const clientes = getClientesToUpdate(); 
      log.audit('Clientes a actualizar', clientes);
      
      clientes.forEach(clienteId => {
        try {
          const customerRecord = record.load({
            type: record.Type.CUSTOMER,
            id: clienteId,
            isDynamic: false
          });

          customerRecord.setValue({
            fieldId: 'custentity_ec_document_type',
            value: NEW_DOCUMENT_TYPE_ID
          });

          customerRecord.save();
          log.debug(`Cliente ${clienteId}`, 'Tipo de documento actualizado correctamente.');

        } catch (e) {
          log.error(`Error cliente ${clienteId}`, e.message);
        }
      });
    
    } catch (error) {
      log.error('Error general', error.message);
    }
  }

  return {
    execute
  };

});
