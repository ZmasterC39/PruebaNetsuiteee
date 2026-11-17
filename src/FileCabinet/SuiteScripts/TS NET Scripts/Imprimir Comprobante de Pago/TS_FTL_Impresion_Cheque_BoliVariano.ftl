<#setting locale="es">
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdf>
<head>
    <meta name="title" value="Impresion Comprobante de Pago"/>
    <macrolist>
        <macro id="nlheader">

        </macro>
    </macrolist>
    <style type="text/css">
        * {
            font-family: sans-serif;
        }
        p {
            font-size: 10px;
            text-align: center;
        }

        th, td {
            text-align: center;
            border: 0px solid #333333;
            font-size: 5px;
            padding: 5px;
        }

        .tabla {
            width: 100%;
            border: 0px solid #333333;
            border-collapse: collapse;
        }

        .tabla th {
            border: 0px solid #333333;
            font-size: 10px;
            padding: 5px;
        }

        .tabla td {
            border: 0px solid #333333;
            padding: 5px;
        }    

        .miTabla {
            border: 1px solid #333333;
            width: 100%;
            font-size: 9pt;
            table-layout: fixed;
            margin-bottom: 20px;
        }

        .tablacheque {
            width: 100%;
            border: 0px solid #333333;
            border-collapse: collapse;
        }

        .tablacheque td {
            border: 0.0mm solid #333333;
            padding: 1mm 0mm 0mm 0mm;
        }

        .tablaComprobante {
            width: 100%;
            border: 0px solid #333333;
            border-collapse: collapse;
        }

        .tablaComprobante td {
            border: 0.0mm solid #333333;
            padding: 1mm 0mm 0mm 0mm;
        }  
    </style>
</head>

<body padding="0.0in 0.0in 0.0in 0.0in" size="240mm 275mm">
    <#if record.vendoPayment.pasoCantidad == "si">
    <table class="tablacheque" padding="17mm 0mm 0mm 75mm" >
    <#else>
    <table class="tablacheque" padding="21mm 0mm 0mm 75mm" >
    </#if>
        <thead> 
        </thead>
        <tbody>
            <tr>
            <#if record.vendoPayment.pasoCantidad == "si">
                <td align="left" width="90mm">${record.vendoPayment.beneficiario}</td>
                <td align="left" width="10mm"> </td>
                <td align="left" vertical-align="bottom" width="65mm" colspan="2">${record.vendoPayment.montoTotal}</td>
            <#else>
                <td align="center" width="90mm">${record.vendoPayment.beneficiario}</td>
                <td align="left" width="10mm"> </td>
                <td align="left" vertical-align="bottom" width="65mm" colspan="2">${record.vendoPayment.montoTotal}</td>
            </#if>
            </tr>
            <tr>
                <td align="left" width="165mm" colspan="4"></td>
            </tr>

            <tr>
                <td align="left" width="165mm" colspan="4"></td>
            </tr>

            <tr>
                <td align="left" width="165mm" colspan="4"></td>
            </tr>
            
            <tr>
                <td align="left" width="165mm" colspan="4"></td>
            </tr>
            <tr>
                <td align="left" width="135mm" colspan="3">${record.vendoPayment.total}</td>
                <td align="left" width="30mm" colspan="1"></td>
            </tr>
            <tr>
                <td align="left" width="165mm" colspan="4"></td>
            </tr>
            <tr>
                <td align="left" width="165mm" colspan="4"></td>
            </tr>
            <tr>
                <td align="left" width="165mm" colspan="4"></td>
            </tr>
            <tr>
                <td align="left" width="165mm" colspan="4"></td>
            </tr>
            <tr>
                <td align="left" width="165mm" colspan="4"></td>
            </tr>
            <tr>
                <td align="left" width="165mm" colspan="4"></td>
            </tr>
            <tr>
                <td align="left" width="165mm" colspan="4">${record.vendoPayment.fechaUbica}</td>
            </tr>
        </tbody>
    </table>
    <table class="tablaComprobante" padding="64mm 0mm 20mm 35mm">
        <thead>
        </thead>
        <tbody>
            <tr>
                <td width="56%" align="left">${record.vendoPayment.sucursal}</td>
                <td width="44%" align="left"></td>
            </tr>
            <tr>
                <td width="56%" align="left">${record.vendoPayment.beneficiario}</td>
                <td width="44%" align="left">${record.vendoPayment.ruc}</td>
            </tr>
            <tr>
                <td width="56%" align="left">${record.vendoPayment.fecha}</td>
                <td width="44%" align="left"></td>
            </tr>
            <tr>
                <td width="56%" align="left">${record.vendoPayment.cheque}</td>
                <td width="44%" align="left"></td>
            </tr>
            <tr>
                <td width="56%" align="left">${record.vendoPayment.nombreCredito}</td>
                <td width="44%" align="left"></td>
            </tr>
            <tr>
                <td width="56%" align="left">${record.vendoPayment.numCuenta}</td>
                <td width="44%" align="left"></td>
            </tr>
            <tr>
                <td width="56%" align="left">${record.vendoPayment.memo}</td>
                <td width="44%" align="left"></td>
            </tr>
            <tr>
            </tr>
        </tbody>
    </table>
    <table class="tabla"  padding="7mm 0mm 0mm 0mm" >
        <thead>
        </thead>
        <tbody>
            <tr>    
                <td padding="0mm 0mm 0mm 15mm" align="left" width="40mm" colspan="1">${record.vendoPayment.numeroCredito}</td>
                <td align="left" width="100mm" colspan="1">${record.vendoPayment.nombreCredito}</td>
                <td align="left" width="20mm" colspan="1"></td>
                <td align="left" width="65mm" colspan="1">${record.vendoPayment.montoImpacto}</td>
            </tr>
            <tr>
                <td padding="0mm 0mm 0mm 15mm" align="left" width="40mm"  colspan="1">${record.vendoPayment.numeroDebito}</td>
                <td align="left" width="100mm" colspan="1">${record.vendoPayment.nombreDebito}</td>
                <td align="left" width="20mm" colspan="1">${record.vendoPayment.montoImpacto}</td>
                <td align="left" width="65mm" colspan="1"></td>
            </tr>
            <tr>
                <td align="center" width="240mm"  colspan="4"></td>
            </tr><tr>
                <td align="center" width="240mm"  colspan="4"></td>
            </tr><tr>
                <td align="center" width="240mm"  colspan="4"></td>
            </tr><tr>
                <td align="center" width="240mm"  colspan="4"></td>
            </tr><tr>
                <td align="center" width="240mm"  colspan="4"></td>
            </tr><tr>
                <td align="center" width="240mm"  colspan="4"></td>
            </tr><tr>
                <td align="left" width="165mm" colspan="2"></td>
                <td align="left" width="20mm" colspan="1">${record.vendoPayment.montoImpacto}</td>
                <td align="left" width="65mm" colspan="1">${record.vendoPayment.montoImpacto}</td>
            </tr>
        </tbody>
    </table>
</body>

</pdf>