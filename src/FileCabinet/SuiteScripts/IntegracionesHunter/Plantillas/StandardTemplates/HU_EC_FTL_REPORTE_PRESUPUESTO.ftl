<?xml version="1.0"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdfset>
<pdf>
	<head>
      	<meta name="title" value="Plantilla base ftl"/>
		<macrolist>
			<macro id="nlheader">
<div position="absolute" top="-10">
    <img src="https://www.hunter.com.ec/images/logo.png" height="53px" width="120px"/>
</div>
<div position="absolute" left="110" top="15">
    <img src="https://www.proteloinc.com/hs-fs/hubfs/NetSuite-logo-top-partner-protelo.webp?width=1074&amp;height=255&amp;name=NetSuite-logo-top-partner-protelo.webp" width="50px" height="12px"/>
</div>

<table width="100%">
    <tr>
        <td align="right">
            <table>
                <tr>
                    <td align="right" vertical-align="middle">
                        <p font-size="8px"><b font-size="8px">Usuario Impresión:</b></p>
                        <p font-size="8px"><b font-size="8px">Fecha Impresión:</b></p>
                        <p font-size="8px"><b font-size="8px">Hora impresión:</b></p>
                    </td>
                    <td align="right" vertical-align="middle">
                        <p font-size="8px">${user.email?substring(0, user.email?index_of("@"))?upper_case}</p>
                        <p font-size="8px">${.now?string["dd/MM/yyyy"]}</p>
                        <p font-size="8px">${.now?string["HH:mm:ss"]}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
        	</macro>
			<macro id="watermark">
				<p valign="middle" align="center" rotate="-30" font-size="80px" color="#F0F0F0">
				NetSuite - HUNTER
				</p>
			</macro>
			<macro id="nlfooter">
				<!-- <#include "https://www.hunteronline.com.ec/IMGCOTIZADORWEB/Imagenescampanias/NetSuiteTemplates/shared/footer.txt"/> -->
        	</macro>
		</macrolist>
		<style type="text/css">
          <style type="text/css">
    * {
        font-family: NotoSans, sans-serif;
        font-size: 10px;
    }

    .table th, .table td{ padding: 5px;}
    p { margin: 0px; }
</style>        </style>
    </head>

	<body header="nlheader" header-height="75px" footer="nlfooter" footer-height="15px" background-macro="watermark" size="A4" padding-left="45px" padding-right="45px" padding-top="45px">
      <table width="100%">
          <tr>
            <td align="center"><h1 align="center" font-size="14px" font-family="sans-serif">${record.subsidiary.legalname} <br/> TIPO DE DOCUMENTO <br/>${record.tranid}</h1></td>
          </tr>
      </table>

      <hr margin-bottom="20px" />
      <br/>
      <p>Template base ftl file *</p>
      <br/>
	</body>
</pdf>
</pdfset>
