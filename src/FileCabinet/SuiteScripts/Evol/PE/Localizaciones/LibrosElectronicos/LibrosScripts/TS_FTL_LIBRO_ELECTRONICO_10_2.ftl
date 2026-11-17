<#setting locale="computer">
<#setting number_format="computer">
<#assign jsonContent=jsonString.text?eval>
<#assign count = 1>
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdf>
   <head>
      <meta name="title" value="10.2 Registro de Costos" />
      <macrolist>
         <macro id="cabecera">

         <h2 align="center">FORMATO 10.2: "REGISTRO DE COSTOS -  ELEMENTOS DEL COSTO MENSUAL"</h2>
         
         <table style="margin-top:15px;">
            <tr></tr>
            <tr>
               <td width="10%"></td>
               <td width="40%" align="left"><p><b>PERÍODO :</b></p></td>
               <td width="50%" align="left"><p>${jsonContent.period}</p></td>
            </tr>
            <tr>
               <td width="10%"></td>
               <td width="40%" align="left"><p><b>RUC :</b></p></td>
               <td width="50%" align="left"><p>${jsonContent.ruc}</p></td>
            </tr>
            <tr>
               <td width="10%"></td>
               <td width="40%" align="left"><p><b>APELLIDOS Y NOMBRES, DENOMINACIÓN O RAZÓN SOCIAL :</b></p></td>
               <td width="50%" align="left"><p>${jsonContent.legalname}</p></td>
            </tr>
         </table>
         </macro>
      </macrolist>
      <style>
         body {
            font-size: 11px;
            padding: 12pt 28pt 0pt 12pt;
            font-family: "Helvetica";
         }
         p, h1, h2, h3, h4, h5, h6, tr, th {
            font-family: "Helvetica";
         }
         p {
            font-size: 12px;
         }
         table {
            width: 100%;
         }
      </style>
   </head>
   <body background-color="white" size="A4-landscape" header="cabecera" header-height="35mm" footer-height="10mm">

      <table style="margin-top:50px;">
         <thead>
            <tr>
               <th style="border-left:1px solid black; border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;"><p><b>CONSUMO EN LA PRODUCCIÓN</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Enero</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Febrero</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Marzo</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Abril</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Mayo</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Junio</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Julio</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Agosto</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Septiembre</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Octubre</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Noviembre</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>Diciembre</b></p></th>
               <th style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="center"><p><b>TOTAL</b></p></th>
            </tr>
         </thead>
         <tbody>
            <#list jsonContent.detail as row>
               <#if count == jsonContent.detail?size>
               <tr>
                  <td style="border-left:1px solid black; border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;"><p><b>${row[0]}</b></p></td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[1]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[2]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[3]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[4]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[5]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[6]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[7]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[8]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[9]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[10]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[11]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right">${row[12]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; border-top:1px solid black; border-bottom:1px solid black; font-size: 6px;" align="right"></td>
               </tr>
               <#else>
               <tr>
                  <td style="border-left:1px solid black; border-right:1px solid black; font-size: 6px;" align="left"><p>${row[0]}</p></td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[1]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[2]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[3]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[4]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[5]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[6]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[7]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[8]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[9]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[10]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[11]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[12]?string["#,##0.00"]}</td>
                  <td style="border-right:1px solid black; font-size: 6px;" align="right">${row[13]?string["#,##0.00"]}</td>
               </tr>
               </#if>
               <#assign count = count + 1>
            </#list>
         </tbody>
      </table>
   </body>
</pdf>   