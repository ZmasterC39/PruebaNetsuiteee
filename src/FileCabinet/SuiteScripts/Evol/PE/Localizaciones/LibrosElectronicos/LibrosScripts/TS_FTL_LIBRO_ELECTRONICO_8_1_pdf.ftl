<#setting locale="en_US">
<#assign data = input.data?eval >
<#assign head = data.head >
<#assign body = data.body >
<#assign footers = data.footer >
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdf pagesize="A3">
<head>
    <meta name="title" value="Libro Electronico 8.1" />
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
                <th colspan="3"><br/><br/><br/>COMPROBANTE DE PAGO<br/>O DOCUMENTO</th>
                <th rowspan="3" colspan="2"><br/>N° DEL COMPROBANTE<br/>DE PAGO, DOCUMENTO,<br/>N° DE ORDEN<br/>DEL FORMULARIO<br/>FISICO O VIRTUAL,<br/>N° DE DUA, DSI O<br/>LIQUIDACION DE<br/>COBRANZA U OTROS<br/>DOCUMENTOS EMITIDOS<br/>POR SUNAT PARA<br/>ACREDITAR EL CREDITO<br/>FISCAL EN<br/>LA IMPORTACION</th>
                <th colspan="3"><br/><br/><br/>INFORMACION DEL PROVEEDOR</th>
                <th colspan="2">ADQUISICIONES<br/>GRAVADAS<br/>DESTINADAS A<br/>OPERACIONES<br/>GRAVADAS Y/O<br/>DE EXPORTACION</th>
                <th colspan="2">ADQUISICIONES<br/>GRAVADAS DESTINADAS<br/>A OPERACIONES<br/>GRAVADAS Y/O DE<br/>EXPORTACION Y A<br/>OPERACIONES NO GRAVADAS</th>
                <th colspan="2">ADQUISICIONES<br/>GRAVADAS<br/>DESTINADAS A<br/>OPERACIONES NO<br/>GRAVADAS</th>
                <th rowspan="3"><br/><br/><br/><br/><br/><br/>VALOR DE<br/>LAZ<br/>ADQUISIONES<br/>NO GRAVADAS</th>
                <th rowspan="3"><br/><br/><br/><br/><br/><br/><br/>ISC</th>
                <th rowspan="3"><br/><br/><br/><br/><br/><br/><br/>OTROS<br/>TRIBUTOS<br/>Y CARGOS</th>
                <th rowspan="3"><br/><br/><br/><br/><br/><br/><br/>IMPORTE<br/>TOTAL</th>
                <th rowspan="3"><br/><br/>N° DE<br/>COMPROBANTE<br/>DE PAGO<br/>EMITIDO POR<br/>SUJETO NO<br/>DOMICILIADO (02)</th>
                <th colspan="2"><br/><br/>CONSTANCIA DE<br/>DEPOSITO DE<br/>DETRACCION (3)</th>
                <th rowspan="3"><br/><br/><br/><br/>TIPO DE<br/>CAMBIO</th>
                <th colspan="4"><br/><br/>REFERENCIA DEL COMPROBANTE<br/>DE PAGO O DOCUMENTO ORIGINAL<br/>QUE SE MODIFICA</th>
            </tr>
            <tr >
                <th rowspan="2">TIPO (TABLA 10)</th>
                <th rowspan="2">SERIE O CODIGO DE LA DEPENDENCIA ADUANERA (TABLA 11)</th>
                <th rowspan="2">AÑO DE EMISION DE LA DUA O DSI</th>
                <th colspan="2">DOCUMENTO DE IDENTIDAD</th>
                <th rowspan="2">APELLIDOS Y NOMBRES, DENOMINACIONES O RAZON SOCIAL</th>
                <th rowspan="2">BASE IMPONIBLE</th>
                <th rowspan="2">IGV</th>
                <th rowspan="2">BASE IMPONIBLE</th>
                <th rowspan="2">IGV</th>
                <th rowspan="2">BASE IMPONIBLE</th>
                <th rowspan="2">IGV</th>
                <th rowspan="2">NUMERO</th>
                <th rowspan="2">FECHA DE EMISION</th>
                <th rowspan="2">FECHA</th>
                <th rowspan="2">TIPO (TABLA 10)</th>
                <th rowspan="2">SERIE</th>
                <th rowspan="2">N° DEL COMPROBANTE DE PAGO O DOCUMENTO</th>
            </tr>
            <tr>
                    <th >TIPO<br/>(TABLA 2)</th>
                    <th >NÚMERO</th>
                </tr>
        </thead>
        
        <tbody>
            <#list body as registro>
            <tr>
                <td>${registro.campoRegistro02}</td>
                <td>${registro.campoRegistro04}</td>
                <td>${registro.campoRegistro05}</td>
                <td>${registro.campoRegistro06}</td>
                <td>${registro.campoRegistro07}</td>
                <td>${registro.campoRegistro08}</td>
                <td colspan="2">${registro.campoRegistro09}</td>
                
                <td>${registro.campoRegistro11}</td>
                <td>${registro.campoRegistro12}</td>
                <td>${registro.campoRegistro13}</td>
                /*Montos*/    
                <td>${registro.campoRegistro14}</td>
                <td>${registro.campoRegistro15}</td>
                <td>${registro.campoRegistro16}</td>
                <td>${registro.campoRegistro17}</td>
                <td>${registro.campoRegistro18}</td>
                <td>${registro.campoRegistro19}</td>
                <td>${registro.campoRegistro20}</td>
                <td>${registro.campoRegistro21}</td>
                <td>${registro.campoRegistro23}</td>
                <td>${registro.campoRegistro24}</td>
                /*Total*/
                <td>${registro.campoRegistro34}</td>
                <td>${registro.campoRegistro33}</td>
                <td>${registro.campoRegistro32}</td>

                <td>${registro.campoRegistro26}</td>
                <td>${registro.campoRegistro27}</td>
                <td>${registro.campoRegistro28}</td>
                <td>${registro.campoRegistro29}</td>
                <td>${registro.campoRegistro31}</td>

            </tr>
            </#list>
            <tr>

                <td colspan="11" style="border-left: none; border-bottom: none; align: right;">TOTALES</td>
                <td>${footers.T_campoRegistro14}</td>
                <td>${footers.T_campoRegistro15}</td>
                <td>${footers.T_campoRegistro16}</td>
                <td>${footers.T_campoRegistro17}</td>
                <td>${footers.T_campoRegistro18}</td>
                <td>${footers.T_campoRegistro19}</td>
                <td>${footers.T_campoRegistro20}</td>
                <td>${footers.T_campoRegistro21}</td>
                <td>${footers.T_campoRegistro23}</td>
                <td>${footers.T_campoRegistro24}</td>
                <td colspan="5" style="border-right: none; border-bottom: none;"></td>
            </tr>
            <tr>
            <td colspan="11" style="border: none;">(1)Señalar la fecha correspondiente, de acuerdo a lo establecido en el literal b)del inciso II del numeral 1 del Articulo 10 del Reglamento de la Ley del IGV.</td>
            </tr>
        </tbody>
    </table>
</body>
</pdf>
