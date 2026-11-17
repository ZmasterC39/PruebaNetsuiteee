<#assign data = input.data?eval >
<#assign head = data.head >
<#assign body = data.body >
<#assign footer = data.footer >
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdf pagesize="A3">
    <head>
        <meta name="title" value="Libro Electronico 14.1" />
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
                <tr>
                    <th rowspan="3"><br/>NÚMERO<br/>CORRELATIVO<br/>DEL<br/>REGISTRO<br/>O CÓDIGO<br/>ÚNICO DE LA<br/>OPERACIÓN</th>
                    <th rowspan="3"><br/><br/>FECHA DE<br/>EMISION DEL<br/>COMPROBANTE<br/>DEPAGO O<br/>DOCUMENTO</th>
                    <th rowspan="3"><br/><br/>FECHA DE<br/>VENCIMIENTO<br/>Y/O PAGO</th>
                    <th colspan="3">COMPROBANTE DE PAGO<br/>O DOCUMENTO</th>
                    <th colspan="3"><br/>INFORMACIÓN DEL CLIENTE</th>
                    <th rowspan="3"><br/><br/>VALOR<br/>FACTURADO<br/>DE LA<br/>EXPORTACION</th>
                    <th rowspan="3"><br/>BASE<br/>IMPONIBLE<br/>DE LA<br/>OPERACIÓN<br/>GRAVADA</th>
                    <th colspan="2">IMPORTE TOTAL DE LA<br/>OPERACIÓN EXONERADA O INAFECTA</th>
                    <th rowspan="3"><br/><br/><br/><br/>ISC</th>
                    <th rowspan="3"><br/><br/>IGV Y/O IPM</th>
                    <th rowspan="3"><br/>OTROS<br/>TRIBUTOS Y<br/>CARGOS<br/>QUE NO<br/>FORMAN<br/>PARTE DE<br/>LA BASE<br/>IMPONIBLE</th>
                    <th rowspan="3"><br/>IMPORTE<br/>TOTAL DEL<br/>COMPROBANTE<br/>DE PAGO</th>
                    <th rowspan="3"><br/>TIPO<br/>DE<br/>CAMBIO</th>
                    <th colspan="4">REFERENCIA DEL COMPROBANTE DE PAGO O<br/>DOCUMENTO ORIGINAL QUE SE MODIFICA</th>
                </tr>
                <tr>
                    <th rowspan="2">TIPO<br/>(TABLA 10)</th>
                    <th rowspan="2">N° SERIE O N°<br/>DE SERIE<br/>DE LA MAQUINA<br/>REGISTRADORA</th>
                    <th rowspan="2">NÚMERO</th>
                    <th colspan="2">DOCUMENTO DE<br/>IDENTIDAD</th>
                    <th rowspan="2"><br/>APELLIDOS Y NOMBRES,<br/>DENOMINACIÓN O RAZÓN SOCIAL</th>
                    <th rowspan="2"><br/>EXONERADA</th>
                    <th rowspan="2"><br/>INAFECTA</th>
                    <th rowspan="2"><br/><br/>FECHA</th>
                    <th rowspan="2"><br/>TIPO<br/>(TABLA 10)</th>
                    <th rowspan="2"><br/><br/>SERIE</th>
                    <th rowspan="2">N° DEL<br/>COMPROBANTE<br/>DE PAGO<br/>O DOCUMENTO</th>
                </tr>
                <tr>
                    <th rowspan="2">TIPO<br/>(TABLA 2)</th>
                    <th rowspan="2">NÚMERO</th>
                </tr>
            </thead>
            <tbody>
                <#list body as record>
                    <tr>
                        <td>${record.c3_correlativo}</td>
                        <td>${record.c4_fecha_emision_comprobante_pago_doc}</td>
                        <td>${record.c5_fecha_vencimiento_o_fecha_pago}</td>
                        <td>${record.c6_tipo_comprobante_pago_o_documento}</td>
                        <td>${record.c7_serie_comprobante_pago_o_documento}</td>
                        <td>${record.c8_nro_comprobante_pago_o_documento}</td>
                        <td>${record.c10_tipo_documento_identidad_cliente}</td>
                        <td>${record.c11_numero_ruc_cliente_o_nro_doc}</td>
                        <td>${record.c12_nombres_o_razon_social}</td>
                        <td>${record.c13_x_pe}</td>
                        <td>${record.c14_s_pe}</td>
                        <td>${record.c18_e_pe}</td>
                        <td>${record.c22_inaf_pe}</td>
                        <td>${record.c20_sun_pe}</td>
                        <td>${record.c16_igv}</td>
                        <td>${record.c24_otros}</td>
                        <td>${record.c25_total}</td>
                        <td>${record.c27_tc}</td>
                        <td>${record.c28_fecha_doc_ref}</td>
                        <td>${record.c29_td_doc_ref}</td>
                        <td>${record.c30_serie_doc_ref}</td>
                        <td>${record.c31_num_doc_ref}</td>
                    </tr>
                </#list>
                <tr>
                    <td colspan="9" style="border-left: none; border-bottom: none; align: right;">TOTALES</td>
                    <td>${footer.c13_x_pe_tot}</td>
                    <td>${footer.c14_s_pe_tot}</td>
                    <td>${footer.c18_e_pe_tot}</td>
                    <td>${footer.c22_inaf_pe_tot}</td>
                    <td>${footer.c20_sun_pe_tot}</td>
                    <td>${footer.c16_igv_tot}</td>
                    <td>${footer.c24_otros_tot}</td>
                    <td>${footer.c25_total_tot}</td>
                    <td colspan="5" style="border-right: none; border-bottom: none;"></td>
                </tr>
            </tbody>
        </table>
    </body>
</pdf>