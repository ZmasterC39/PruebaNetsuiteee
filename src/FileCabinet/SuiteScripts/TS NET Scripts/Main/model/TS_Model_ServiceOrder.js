/**
 * @NApiVersion 2.1
 */

class ServiceOrder {
    constructor(customer, bien, date, department, clase, location, otherrefnum, memo, salesrep, terms, issueinvoice, consideracion, ejecutivareferencia, novedades, notacliente, cambpropietarioconv, canaldistribucion, servicios, ejecutivagestion, aprobacionventa, aprobacioncartera, formapago, origen, convenio, clientefacturar, banco, numerocta, titularcuenta, promocionDA, valorpromocionDA, plazo, aprobar, notacaja, concesionario,  financiera, aseguradora) {
        this.customer = { 'field': 'entity', 'value': customer }
        this.bien = { 'field': 'custbody_ht_so_bien', 'value': bien }
        this.date = { 'field': 'trandate', 'value': new Date(date) }
        this.department = { 'field': 'department', 'value': department }
        this.clase = { 'field': 'class', 'value': clase }
        this.location = { 'field': 'location', 'value': location }
        this.otherrefnum = { 'field': 'otherrefnum', 'value': otherrefnum }
        this.memo = { 'field': 'memo', 'value': memo }
        this.salesrep = { 'field': 'salesrep', 'value': salesrep }
        this.terms = { 'field': 'terms', 'value': terms }
        this.billto = { 'field': 'custbody_ht_facturar_a', 'value': customer }
       // this.billto = { 'field': 'custbody_ht_facturar_a', 'value': clientefacturar }
        this.fromsatellite = { 'field': 'custbodycustbody_ht_os_created_from_sa', 'value': true }
        this.issueinvoice = issueinvoice
        this.issueinvoicetrue = { 'field': 'custbody_ht_os_issue_invoice', 'value': true }
        this.consideracion = { 'field': 'custbody_ht_os_consideracion', 'value': consideracion }
        this.ejecutivareferencia = { 'field': 'custbody_ht_os_ejecutivareferencia', 'value': ejecutivareferencia }
        this.novedades = { 'field': 'custbody_ht_os_novedades', 'value': novedades }
        this.notacliente = { 'field': 'custbodyec_nota_cliente', 'value': notacliente }
        this.cambpropietarioconv = { 'field': 'custbody_es_cambio_de_propietario', 'value': cambpropietarioconv }
        this.canaldistribucion = { 'field': 'custbody_ht_os_vendcanaldistribucion', 'value': canaldistribucion }
        this.servicios = { 'field': 'custbody_ht_os_servicios', 'value': servicios }
        this.ejecutivagestion = { 'field': 'custbody_ht_os_ejecutiva_backoffice', 'value': ejecutivagestion }
        this.aprobacionventa = { 'field': 'custbody_ht_os_aprobacionventa', 'value': aprobacionventa }
        this.aprobacioncartera = { 'field': 'custbody_ht_os_aprobacioncartera', 'value': aprobacioncartera }
        this.formapago = { 'field': 'terms', 'value': formapago }
        this.origen = { 'field': 'custbody_ht_os_origenordenservicio', 'value': origen }
        this.convenio = { 'field': 'custbody_ht_os_convenio', 'value': convenio }
        this.clientefacturar = { 'field': 'custbody_ht_facturar_a', 'value': clientefacturar }
        this.banco = { 'field': 'custbody_ht_ec_banco', 'value': banco }
        this.numerocta = { 'field': 'custbody_ht_ec_numerocta', 'value': numerocta }
        this.titularcuenta = { 'field': 'custbody_ht_ec_titularcuenta', 'value': titularcuenta }
        this.promocionDA = { 'field': 'custbody_ht_ec_promocion_da', 'value': promocionDA }
        this.valorpromocionDA = { 'field': 'custbody_ht_ec_valor_promocion_da', 'value': valorpromocionDA }
        this.plazo = { 'field': 'custbody_ht_ec_plazotarjeta', 'value': plazo }
        this.aprobar = { 'field': 'orderstatus', 'value': aprobar }
      
        this.notacaja = { 'field': 'custbody_os_nota_para_caja', 'value': notacaja }
        this.concesionario = { 'field': 'custbody_ht_os_concesionario', 'value': concesionario }
        this.financiera = { 'field': 'custbody_ht_os_bancofinanciera', 'value': financiera }
        this.aseguradora = { 'field': 'custbody_ht_os_companiaseguros', 'value': aseguradora }

    }

    header() {
        let array = new Array();
        array.push(this.fromsatellite);
        if (this.customer.value != null && this.customer.value.length > 0) {
            array.push(this.customer)
            array.push(this.billto)
        }
        if (this.bien.value != null && this.bien.value.length > 0) { array.push(this.bien) }
        if (this.date.value != null && JSON.stringify(this.date.value).length > 0) { array.push(this.date) }
        if (this.department.value != null && this.department.value.length > 0) { array.push(this.department) }
        if (this.clase.value != null && this.clase.value.length > 0) { array.push(this.clase) }
        if (this.location.value != null && this.location.value.length > 0) { array.push(this.location) }
        if (this.otherrefnum.value != null && this.otherrefnum.value.length > 0) { array.push(this.otherrefnum) }
        if (this.memo.value != null && this.memo.value.length > 0) { array.push(this.memo) }
        if (this.salesrep.value != null && this.salesrep.value.length > 0) { array.push(this.salesrep) }
        if (this.terms.value != null && this.terms.value.length > 0) { array.push(this.terms) }
        if (this.issueinvoice == true) { array.push(this.issueinvoicetrue) }
        if (this.consideracion.value != null && this.consideracion.value.length > 0) { array.push(this.consideracion) }
        if (this.ejecutivareferencia.value != null && this.ejecutivareferencia.value.length > 0) { array.push(this.ejecutivareferencia) }
        if (this.novedades.value != null && this.novedades.value.length > 0) { array.push(this.novedades) }
        if (this.notacliente.value != null && this.notacliente.value.length > 0) { array.push(this.notacliente) }
        if (this.cambpropietarioconv.value != null && this.cambpropietarioconv.value) { array.push(this.cambpropietarioconv) }
        if (this.canaldistribucion.value != null && this.canaldistribucion.value.length > 0) { array.push(this.canaldistribucion) }
        if (this.servicios.value != null && this.servicios.value.length > 0) { array.push(this.servicios) }
        if (this.ejecutivagestion.value != null && this.ejecutivagestion.value.length > 0) { array.push(this.ejecutivagestion) }
        if (this.aprobacionventa.value != null && this.aprobacionventa.value.length > 0) { array.push(this.aprobacionventa) }
        if (this.aprobacioncartera.value != null && this.aprobacioncartera.value.length > 0) { array.push(this.aprobacioncartera) }
        if (this.formapago.value != null && this.formapago.value.length > 0) { array.push(this.formapago) }
        if (this.origen.value != null && this.origen.value.length > 0) { array.push(this.origen) }  
        if (this.convenio.value != null && this.convenio.value.length > 0) { array.push(this.convenio) }  
        if (this.clientefacturar.value != null && this.clientefacturar.value.length > 0) { array.push(this.clientefacturar) }  
        if (this.banco.value != null && this.banco.value.length > 0) { array.push(this.banco) }  
        if (this.numerocta.value != null && this.numerocta.value.length > 0) { array.push(this.numerocta) }  
        if (this.titularcuenta.value != null && this.titularcuenta.value.length > 0) { array.push(this.titularcuenta) }  
        if (this.promocionDA.value != null && this.promocionDA.value.length > 0) { array.push(this.promocionDA) }  
        if (this.valorpromocionDA.value != null && this.valorpromocionDA.value.length > 0) { array.push(this.valorpromocionDA) }  
        if (this.plazo.value != null && this.plazo.value.length > 0) { array.push(this.plazo) }  
        if (this.aprobar.value != null && this.aprobar.value.length > 0) { array.push(this.aprobar) }   
      
        if (this.notacaja.value != null && this.notacaja.value.length > 0) { array.push(this.notacaja) }   
        if (this.concesionario.value != null && this.concesionario.value.length > 0) { array.push(this.concesionario) }   
        if (this.financiera.value != null && this.financiera.value.length > 0) { array.push(this.financiera) }   
        if (this.aseguradora.value != null && this.aseguradora.value.length > 0) { array.push(this.aseguradora) }   
      
        return array;
    }
}

class Detail {
    constructor(item, price, taxcode, taxrate1, quantity, department, clase, location, units, description, rate, grossamt, amount, tax1amt, customer, customermon, codorigen, dispcustodia, transmission, undcoverage, billingschedule) {
        this.item = { 'field': 'item', 'value': item }
        this.price = { 'field': 'price', 'value': price }
        this.taxcode = { 'field': 'taxcode', 'value': taxcode }
        this.taxrate1 = { 'field': 'taxrate1', 'value': taxrate1 }
        this.quantity = { 'field': 'quantity', 'value': quantity }
        this.department = { 'field': 'department', 'value': department }
        this.clase = { 'field': 'clase', 'value': clase }
        this.location = { 'field': 'location', 'value': location }
        this.units = { 'field': 'units', 'value': units }
        this.description = { 'field': 'description', 'value': description }
        this.rate = { 'field': 'rate', 'value': rate }
        this.grossamt = { 'field': 'grossamt', 'value': Number.parseFloat(grossamt).toFixed(2) }
        this.amount = { 'field': 'amount', 'value': (parseFloat(this.rate) * parseFloat(this.quantity)) }
        this.tax1amt = { 'field': 'tax1amt', 'value': tax1amt }
        this.customer = { 'field': 'custcol_ht_os_cliente', 'value': customer }
        this.customermon = { 'field': 'custcol_ht_os_cliente_monitoreo', 'value': customermon }
        this.codorigen = { 'field': 'custcol_ns_codigo_origen', 'value': codorigen }
        this.dispcustodia = { 'field': 'custcol_ts_dispositivo_en_custodia', 'value': dispcustodia }
        this.transmission = { 'field': 'custcol_ht_os_tiempo_cobertura', 'value': transmission }
        this.undcoverage = { 'field': 'custcol_ht_os_und_tiempo_cobertura', 'value': undcoverage }
        this.billingschedule = { 'field': 'billingschedule', 'value': billingschedule }
    }

    detail() {
        let array = new Array();
        if (this.billingschedule.value != null && this.billingschedule.value.length > 0) { array.push(this.billingschedule) }   
        if (this.item.value != null && this.item.value.length > 0) { array.push(this.item) }
        if (this.price.value != null && this.price.value.length > 0) { array.push(this.price) }
        if (this.taxcode.value != null && this.taxcode.value.length > 0) { array.push(this.taxcode) }
        if (this.taxrate1.value != null && this.taxrate1.value.length > 0) { array.push(this.taxrate1) }    
        if (this.quantity.value != null && this.quantity.value.length > 0) { array.push(this.quantity) }
        if (this.department.value != null && this.department.value.length > 0) { array.push(this.department) }
        if (this.clase.value != null && this.clase.value.length > 0) { array.push(this.clase) }
        if (this.location.value != null && this.location.value.length > 0) { array.push(this.location) }
        if (this.units.value != null && this.units.value.length > 0) { array.push(this.units) }
        if (this.description.value != null && this.description.value.length > 0) { array.push(this.description) }
        if (this.rate.value != null && this.rate.value.length > 0) { array.push(this.rate) }
        if (this.grossamt.value != null && this.grossamt.value.length > 0) { array.push(this.grossamt) }
        if (this.amount.value != null && this.amount.value.length > 0) { array.push(this.amount) }
        if (this.tax1amt.value != null && this.tax1amt.value.length > 0) { array.push(this.tax1amt) }
        if (this.customer.value != null && this.customer.value.length > 0) { array.push(this.customer) }
        if (this.customermon.value != null && this.customermon.value.length > 0) { array.push(this.customermon) }
        if (this.codorigen.value != null && this.codorigen.value.length > 0) { array.push(this.codorigen) }
        if (this.dispcustodia.value != null && this.dispcustodia.value.length > 0) { array.push(this.dispcustodia) }
        if (this.transmission.value != null && this.transmission.value.length > 0) { array.push(this.transmission) }
        if (this.undcoverage.value != null && this.undcoverage.value.length > 0) { array.push(this.undcoverage) }    
        return array;
    }
}
