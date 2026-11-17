<#assign data = input.data?eval >
<#assign head = data.head >
<#assign body = data.body >

<#assign valor_Adquisiciones = 0>
<#assign otros_conceptos = 0>
<#assign importe_total = 0>
<#assign monto_retención = 0>
<#assign total_valor_Adquisiciones = 0>
<#assign total_otros_conceptos = 0>
<#assign total_importe_total = 0>
<#assign total_monto_retención = 0>
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdf pagesize="A3">
<head>
    <meta name="title" value="Libro Electronico 8.2" />
    <style type="text/css">
        body {
            	font-family: 'Helvetica';
                padding: 15px;
                color: #333333;
            }
            h1 {
                font-size: 15px;
                margin-bottom: 20px;
            }
            h2 {
                font-size: 10px;
                margin-bottom: 15px;
            }
            .tblData {
                width: 100%;
                font-size: 8px;
                border-collapse: collapse; /* Asegura que los bordes se colapsen */
            }
            .tblData th, td {
                border: 1px solid #ddd;/*Borde de la tabla */
                padding: 5px;
                /*width: 100%;*/
            }
            .tblData th {
                background-color: #f2f2f2;
                align: center;
            }
    </style>
</head>
<body size="A3-LANDSCAPE">
    <h1>${head.titulo}</h1>
    <table style="width: 100%; font-size: 10px; margin: 20px 0;">
            <tr>
                <th><b>PERIODO:  </b>${head.periodo}</th>
                <th style="align: right;"><b>FECHA:  </b>${head.fechaHora}</th>
            </tr>
            <tr>
                <th><b>RUC:  </b>${head.ruc}</th>
                <th style="align: right;"><b>USUARIO:  </b>${head.usuario}</th>
            </tr>
            <tr>
                <th colspan="2"><b>APELLIDOS Y NOMBRES, DENOMINACIÓN O RAZÓN SOCIAL:  </b>${head.razonSocial}</th>
            </tr>
    </table>
    <table class="tblData">
        <thead>
                <tr >
                <th rowspan="3"><br/><br/>NUMERO<br/>CORRELATIVO<br/>DEL<br/>REGISTRO<br/>O CODIGO<br/>UNICO<br/>DE LA<br/>OPERACION</th>
                <th rowspan="3"><br/><br/><br/><br/><br/><br/>FECHA DE<br/>EMISION<br/>DEL<br/>COMPROBANTE<br/>DE PAGO<br/>O DOCUMENTO</th>
                <th rowspan="3"><br/><br/><br/><br/><br/><br/>FECHA DE<br/>VENCIMIENTO<br/>O FECHA<br/>DE PAGO (1)</th>
                <th colspan="3"><br/><br/><br/>INFORMACIÓN<br/>COMPROBANTE DE PAGO<br/>O DOCUMENTO</th>
                <th rowspan="3"><br/><br/><br/><br/><br/>VALOR DE<br/>ADQUISIONES</th>
                <th rowspan="3"><br/><br/><br/>OTROS CONCEPTOS ADICIONALES</th>
                <th rowspan="3"><br/><br/><br/>IMPORTE TOTAL<br/>COMPROBANTE DE PAGO<br/>O DOCUMENTO</th>
                <th colspan="5">COMPROBANTE DE PAGO QUE SUSTENTA EL CRÉDITO FISCAL</th>
                <th rowspan="3"><br/><br/><br/>MONTO DE<br/>RETENCION DEL<br/>IGV</th>
                <th rowspan="3"><br/><br/><br/><br/><br/><br/>CODIGO DE<br/>MONEDA</th>
                <th rowspan="3"><br/><br/><br/><br/><br/><br/><br/>*TIPO DE<br/>CAMBIO</th>
                <th colspan="3">INFORMACIÓN DEL SUJETO<br/>NO DOMICILIADO</th>
                <th rowspan="3"><br/><br/><br/><br/><br/><br/><br/>RENTA<br/>NETA</th>
                <th colspan="2"><br/><br/><br/><br/><br/><br/><br/>RETENCION</th>
            </tr>
            <tr >
                <th rowspan="2"><br/><br/>TIPO (TABLA 10)</th>
                <th rowspan="2"><br/><br/>SERIE</th>
                <th rowspan="2"><br/><br/>NUMERO</th>
                <th rowspan="2">TIPO DE<br/>COMPROBANTE DE PAGO<br/>O DOCUMENTO<br/>QUE SUSTENTA<br/>EL CRÉDITO<br/>FISCAL</th>
                <th rowspan="2">SERIE DEL<br/>COMPROBANTE DE<br/>PAGO O DOCUMENTO<br/>QUE SUSTENTA<br/>EL CRÉDITO<br/>FISCAL</th>
                <th rowspan="2">AÑO DE EMISIÓN<br/>DE LA DUA<br/>O DSI QUE<br/>SUSTENTA EL<br/>CRÉDITO FISCAL</th>
                <th rowspan="2" colspan="2">NUNMERO DE<br/>COMPROBANTE DE PAGO<br/>O DOCUMENTO<br/>O NÚMERO DE<br/>ORDEN DEL<br/>FORMULARIO FÍSICO<br/>O VIRTUAL<br/>DONDE<br/>CONSTE<br/>EL PAGO<br/>DEL IMPUESTO,<br/>QUE<br/>SUSTENTE<br/>EL CRÉDITO<br/>FISCAL</th>
                <th colspan="3">DOCUMENTO DEIDENTIDAD</th>
                <th rowspan="2"><br/><br/>TASA</th>
                <th rowspan="2"><br/><br/>IMPUESTO</th>
            </tr>
            <tr>
                    <th >PAIS DE<br/>RESIDENCIA</th>
                    <th >APELLIDOS,<br/>NOMBRES,<br/>DENOMINACION O<br/>RAZON SOCIAL</th>
                    <th >NUMERO DE<br/>IDENTIFICACION</th>
                </tr>
        </thead>
        
        <tbody>
            <#list body as registro>
            <tr>


                <#assign valor_Adquisiciones =  (registro.c8_valor_Adquisiciones?number)  />
                <#assign otros_conceptos =  (registro.c9_otros_conceptos?number)  />
                <#assign importe_total =  (registro.c10_importe_total?number)  />
                <#assign monto_retención = (registro.c15_monto_retención?number)  />

                <#-- Número original para total_valor_Adquisiciones -->
                <#assign formato_c8_valor_Adquisiciones = valor_Adquisiciones?string("#,##0.00")>
                <#assign formato_c9_otros_conceptos = otros_conceptos?string("#,##0.00")>
                <#assign formato_c10_importe_total = importe_total?string("#,##0.00")>
                <#assign formato_c15_monto_retención = monto_retención?string("#,##0.00")>
                <#-- Paso 1: Reemplazar el punto por un carácter temporal (por ejemplo, "X") -->
                <#assign paso_1_c8_valor_Adquisiciones = formato_c8_valor_Adquisiciones?replace(".", "X")>
                <#assign paso_1_c9_otros_conceptos = formato_c9_otros_conceptos?replace(".", "X")>
                <#assign paso_1_c10_importe_total = formato_c10_importe_total?replace(".", "X")>
                <#assign paso_1_c15_monto_retención = formato_c15_monto_retención?replace(".", "X")>
                <#-- Paso 2: Reemplazar la coma por un punto (separador decimal) -->
                <#assign paso_2_c8_valor_Adquisiciones = paso_1_c8_valor_Adquisiciones?replace(",", ".")>
                <#assign paso_2_c9_otros_conceptos = paso_1_c9_otros_conceptos?replace(",", ".")>
                <#assign paso_2_c10_importe_total = paso_1_c10_importe_total?replace(",", ".")>
                <#assign paso_2_c15_monto_retención = paso_1_c15_monto_retención?replace(",", ".")>
                <#-- Paso 3: Reemplazar el carácter temporal "X" por una coma (separador de miles) -->
                <#assign valor_c8_valor_Adquisiciones = paso_2_c8_valor_Adquisiciones?replace("X", ",")>
                <#assign valor_c9_otros_conceptos = paso_2_c9_otros_conceptos?replace("X", ",")>
                <#assign valor_c10_importe_total = paso_2_c10_importe_total?replace("X", ",")>
                <#assign valor_c15_monto_retención = paso_2_c15_monto_retención?replace("X", ",")>

                <td>${registro.c2_cuo}</td>
                <td>${registro.c4_Fecha_de_emision}</td>
                <td>${registro.c40_fecha_vencimiento}</td>
                <td>${registro.c5_tipo_comprobante}</td>
                <td>${registro.c6_serie_comprobante}</td>
                <td>${registro.c7_nro_comprobante}</td>

                <#if head.idioma == 'en' >
                <td >${registro.c8_valor_Adquisiciones?string["#,##0.00"]}</td>
                <td >${registro.c9_otros_conceptos?string["#,##0.00"]}</td>
                <td >${registro.c10_importe_total?string["#,##0.00"]}</td>
                <#else>
                <td>${valor_c8_valor_Adquisiciones}</td>
                <td>${valor_c9_otros_conceptos}</td>
                <td>${valor_c10_importe_total}</td>
                </#if>


                /*Montos*/ 
                <#--<td>${registro.c8_valor_Adquisiciones}</td>
                <td>${registro.c9_otros_conceptos}</td>
                <td>${registro.c10_importe_total}</td>-->
                /*Total*/
                <td>${registro.c11_tipo_comprobante_credito}</td>
                <td>${registro.c12_serie_comp_Dua}</td>
                <td>${registro.c13_año_emision_dua}</td>
                <td colspan="2">${registro.c14_nro_orden}</td>
                /*Montos*/ 
                <#--<td>${registro.c15_monto_retención}</td>-->
                <#if head.idioma == 'en' >
                <td >${registro.c15_monto_retención?string["#,##0.00"]}</td>
                <#else>
                <td>${valor_c15_monto_retención}</td>
                </#if>


                /*Total*/
                <td>${registro.c16_cod_moneda}</td>
                <td>${registro.c17_tipo_Cambio}</td>
                <td>${registro.c18_pais_residencia}</td>
                <td>${registro.c19_apellidos_nombres}</td>
                <td>${registro.c21_numero_ident}</td>
                <td>${registro.c26_renta_bruta}</td>
                
                <td>${registro.c29_tasa_retención}</td>
                <td>${registro.c30_impuesto_retenido}</td>


            <#assign total_valor_Adquisiciones = total_valor_Adquisiciones + (registro.c8_valor_Adquisiciones?number)  />
            <#assign total_otros_conceptos = total_otros_conceptos + (registro.c9_otros_conceptos?number)  />
            <#assign total_importe_total = total_importe_total + (registro.c10_importe_total?number)  />
            <#assign total_monto_retención = total_monto_retención + (registro.c15_monto_retención?number)  />


            </tr>
            </#list>
            <tr>

                <#-- Número original para total_valor_Adquisiciones -->
                <#assign formatted_valor_Adquisiciones = total_valor_Adquisiciones?string("#,##0.00")>
                <#assign formatted_otros_conceptos = total_otros_conceptos?string("#,##0.00")>
                <#assign formatted_total_importe_total = total_importe_total?string("#,##0.00")>
                <#assign formatted_total_monto_retención = total_monto_retención?string("#,##0.00")>
                <#-- Paso 1: Reemplazar el punto por un carácter temporal (por ejemplo, "X") -->
                <#assign paso_1_a = formatted_valor_Adquisiciones?replace(".", "X")>
                <#assign paso_1_b = formatted_otros_conceptos?replace(".", "X")>
                <#assign paso_1_c = formatted_total_importe_total?replace(".", "X")>
                <#assign paso_1_d = formatted_total_monto_retención?replace(".", "X")>
                <#-- Paso 2: Reemplazar la coma por un punto (separador decimal) -->
                <#assign paso_2_a = paso_1_a?replace(",", ".")>
                <#assign paso_2_b = paso_1_b?replace(",", ".")>
                <#assign paso_2_c = paso_1_c?replace(",", ".")>
                <#assign paso_2_d = paso_1_d?replace(",", ".")>
                <#-- Paso 3: Reemplazar el carácter temporal "X" por una coma (separador de miles) -->
                <#assign valor_Adquisiciones_final = paso_2_a?replace("X", ",")>
                <#assign valor_Conceptos_final = paso_2_b?replace("X", ",")>
                <#assign valor_Importe_final = paso_2_c?replace("X", ",")>
                <#assign valor_Monto_final = paso_2_d?replace("X", ",")>
                <#if head.idioma == 'en' >
                <td colspan="6" style="border-left: none; border-bottom: none; align: right;">TOTALES</td>
                <td >${total_valor_Adquisiciones?string["#,##0.00"]}</td>
                <td >${total_otros_conceptos?string["#,##0.00"]}</td>
                <td >${total_importe_total?string["#,##0.00"]}</td>
                <td colspan="5" style="border-left: none; border-bottom: none; align: right;"></td>
                <td >${total_monto_retención?string["#,##0.00"]}</td>
                <td colspan="5" style="border-right: none; border-bottom: none;"></td>
                <#else>
                <td colspan="6" style="border-left: none; border-bottom: none; align: right;">TOTALES</td>
                <td>${valor_Adquisiciones_final}</td>
                <td>${valor_Conceptos_final}</td>
                <td>${valor_Importe_final}</td>
                <td colspan="5" style="border-left: none; border-bottom: none; align: right;"></td>
                <td>${valor_Monto_final}</td>
                <td colspan="5" style="border-right: none; border-bottom: none;"></td>
                </#if>
            </tr>
            <tr>
            <td colspan="11" style="border: none;">(1)Señalar la fecha correspondiente, de acuerdo a lo establecido en el literal b)del inciso II del numeral 1 del Articulo 10 del Reglamento de la Ley del IGV.</td>
            </tr>
        </tbody>
    </table>
</body>
</pdf>
