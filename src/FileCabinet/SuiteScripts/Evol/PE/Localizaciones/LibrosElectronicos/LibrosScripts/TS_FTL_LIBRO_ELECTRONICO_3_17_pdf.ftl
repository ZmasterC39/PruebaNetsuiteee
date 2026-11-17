<#assign data = input.data?eval >
<#assign company = data.head >
<#assign totals = data.totals >
<#assign movements = data.body >
<#assign totals = data.footer >
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdf>
   <head>
      <meta name="title" value="Formato 3.17" />
      <macrolist>
         <macro id = "cabecera">
            <table width="100%">
               <tr>
                  <td colspan="4" width="100%" align="center"><b>${company.firtsTitle}</b></td>
               </tr>
                <tr>
                    <td width="50%" align="left"><b>EJERCICIO O PERIODO</b></td>
                    <td width="5%" align="right"><b>:</b></td>
                    <td width="30%" align="left">${company.secondTitle}</td>
                    <td width="15%" align="left"></td>
               </tr>
                <tr>
                    <td width="50%" align="left"><b>RUC</b></td>
                    <td width="5%" align="right"><b>:</b></td>
                    <td width="30%" align="left">${company.thirdTitle}</td>
                    <td width="15%" align="left"></td>
               </tr>
                <tr>
                    <td width="50%" align="left"><b>APELLIDOS Y NOMBRES, DENOMINACIÓN O RAZÓN SOCIAL</b></td>
                    <td width="5%" align="right"><b>:</b></td>
                    <td width="30%" align="left">${company.fourthTitle}</td>
                    <td width="15%" align="left"></td>
               </tr>
            </table>
         </macro>
      </macrolist>
   </head>
    <body background-color="white" font-size="7" size="A4-landscape" header = "cabecera" header-height="25mm" footer-height="10mm">
       <table style="font-family: Verdana, Arial, Helvetica, sans-serif; width:100%" >
            <tr>
               <td width="25%" colspan="2" rowspan="2" align = "center " style= "border:1px solid black; font-weight:bold; vertical-align: middle">
                <table>
                  <tr><td align="center" style="text-align:center;">CUENTA Y SUBCUENTA</td></tr>
                  <tr><td align="center" style="text-align:center;">CONTABLE</td></tr>
                </table>  
                
               </td>
               <td width="25%" colspan="2" align = "center " style= "border:1px solid black; font-weight:bold; vertical-align: middle">SALDOS INICIALES</td>
               <td width="25%" colspan="2" align = "center " style= "border:1px solid black; font-weight:bold; vertical-align: middle">MOVIMIENTOS</td>
               <td width="25%" colspan="2" align = "center " style= "border:1px solid black; font-weight:bold; vertical-align: middle">SALDOS FINALES</td>
               <td width="25%" colspan="2" align = "center " style= "border:1px solid black; font-weight:bold; vertical-align: middle">
                  <table>
                    <tr><td align="center" style="text-align:center;">SALDOS FINALES DEL</td></tr>
                    <tr><td align="center" style="text-align:center;">BALANCE GENERAL</td></tr>
                  </table>  
               </td>
               <td width="25%" colspan="2" align = "center " style= "border:1px solid black; font-weight:bold">
                  <table>
                    <tr><td align="center" style="text-align:center;">SALDOS FINALES DEL</td></tr>
                    <tr><td align="center" style="text-align:center;">ESTADO DE PERDIDAS</td></tr>
                    <tr><td align="center" style="text-align:center;">Y GANANCIAS POR</td></tr>
                    <tr><td align="center" style="text-align:center;">NATURALEZA</td></tr>
                  </table>  
                </td>
               <td width="25%" colspan="2" align = "center " style= "border:1px solid black; font-weight:bold">
                  <table>
                    <tr><td align="center" style="text-align:center;">SALDOS FINALES DEL</td></tr>
                    <tr><td align="center" style="text-align:center;">ESTADO DE PERDIDAS</td></tr>
                    <tr><td align="center" style="text-align:center;">Y GANANCIAS POR</td></tr>
                    <tr><td align="center" style="text-align:center;">FUNCION</td></tr>
                  </table> 
               </td>
            </tr>
            <tr>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">DEUDOR</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">ACREDOR</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">DEBE</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">HABER</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">DEUDOR</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">ACREDOR</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">ACTIVO</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">PASIVO</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">PERDIDA</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">GANANCIA</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">PERDIDA</td>
               <td width="25%" align = "center " style= "border:1px solid black; font-weight:bold">GANANCIA</td>
            </tr>
            <#list movements as mov>
                <tr>
                    <td width="25%" style= "border-right:1px solid black" align = "left">${mov.c2_cod_cuenta}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "center">${mov.c20_desc_cuenta}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col01}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col02}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col03}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col04}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col05}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col06}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col07}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col08}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col09}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col10}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col09}</td>
                    <td width="25%" style= "border-right:1px solid black" align = "right">${mov.col10}</td>
                </tr>
            </#list>
             <tr>
                  <td width="25%" align = "center">${totals.col1}</td>
                  <td width="25%" align = "center">${totals.col2}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol01}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol02}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol03}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol04}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol05}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol06}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol07}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol08}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol09}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol10}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol09}</td>
                  <td width="25%" style= "border:1px solid black; font-weight:bold" align = "right">${totals.totalcol10}</td>
               </tr>
        </table>
    </body>
</pdf>