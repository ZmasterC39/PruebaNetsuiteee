<?xml version="1.0"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdfset>
<pdf>
	<head>
	<#assign item = data.info[0] />

		<meta name="title" value="Reporte Caso ${item.numero}"/>
		<macrolist>
			<macro id="nlheader">
				<table class="header" style="width: 100%;">
					<tr>
						<td rowspan="2">
							<img display="inline" src="https://www.hunter.com.ec/images/logo.png" height="53px" width="120px"/>
							<img display="inline" class="netsuite" src="https://www.proteloinc.com/hs-fs/hubfs/NetSuite-logo-top-partner-protelo.webp?width=1074&amp;height=255&amp;name=NetSuite-logo-top-partner-protelo.webp" width="50px" height="12px"/>
						</td>
					</tr>
					<tr>
						<td align="right">
							<#assign fecha = .now?string("dd/MM/yyyy")>
							<#assign hora = .now?string("HH:mm:ss")>
							<b>Fecha:</b> ${fecha} <br/>
							<b>Hora:</b> ${hora} <br/>
						</td>
					</tr>
				</table>

				<table width="100%"  position="absolute" top="35px">
					<tr>
						<td align="center" font-size="14px"><b>INFORME DE OPERATIVO</b></td>
					</tr>
				</table>

				<table width="100%" margin-top="20px">
					<tr>
						<td><b color="#000080">DENUNCIA No. :</b> ${item.numero}</td>
						<td align="right"><b color="#000080">FECHA - HORA DE DENUNCIA</b> ${item.fechaDenuncia}</td>
					</tr>
				</table>
				<table width="100%">
					<tr>
						<td><b color="#000080">CLIENTE:</b> <b>${item.empresa}</b></td>
						<td align="right"><b color="#000080">TELEFONO:</b> ${item.telefono}</td>
					</tr>
				</table>
			</macro>
        	<macro id="nlfooter">
				<table class="footer" style="width: 100%;">
					<tr>
						<td align="right"><pagenumber/> de <totalpages/></td>
					</tr>
				</table>
			</macro>
		</macrolist>

		<style>
			body { font-size: 11px; font-family: 'Arial', 'Helvetica', sans-serif;}
			.info { padding: 0px; margin-left:400px}
		</style>
    </head>

	<body header="nlheader" header-height="135px" footer="nlfooter" footer-height="15px" background-macro="watermark" size="A4" padding-left="20px" padding-right="20px" padding-top="25px">

	<table background-color="#bfbfbf" width="100%" padding="5px" border="1" margin-bottom="15px">
		<tr>
			<td>
				<table background-color="#fff" width="100%" border="1" padding="5px" >
					<tr>
						<td border-bottom="1"><b>DENUNCIA EN: </b>${item.departamento}</td>
						<td border-bottom="1"><b>BASE: </b></td>
					</tr>
					<tr>
						<td><b>OPERADOR CONTROL: </b></td>
					</tr>
				</table>

			</td>
		</tr>

		<tr>
			<td>
				<table background-color="#fff" width="100%" padding="5px" border="1">
					<tr>
						<td border-left="1" border-top="1"><b>DENUNCIANTE :</b> ${item.denunciante}</td>
						<td border-top="1" border-right="1"><b>TELF. CONTACTO: </b>${item.telefono}</td>
					</tr>
					<tr >
						<td border-left="1" border-top="1" border-right="1" colspan="2"><b>DOMICILIO CLIENTE: </b>${item.domicilioCliente}</td>
					</tr>
					<tr >
						<td border-left="1" border-top="1" border-bottom="1"><b>CLIENTE: </b>${item.empresa}</td>
						<td border-top="1" border-right="1" border-bottom="1"><b>CLAVE CLIENTE:</b></td>
					</tr>
					<tr>
						<td>
						<b color="#000080">DATOS DEL VEHÍCULO</b>
						</td>
					</tr>
					<tr>
						<td border-left="1" border-top="1" border-bottom="1" ><b>MOTOR:</b> ${item.motor}</td>
						<td border-top="1" border-bottom="1" border-right="1"><b>CHASIS:</b> ${item.chasis}</td>
					</tr>
					<tr>
						<td border-left="1" border-bottom="1"><b>CONCESIONARIO:</b> ${item.concesionario}</td>
						<td border-bottom="1" border-right="1"><b>MEDIO MONITOREO:</b></td>
					</tr>
					<tr>
						<td border-left="1" border-bottom="1" border-right="1" colspan="2" ><b>CIA. DE SEGUROS</b> ${item.aseguradora}</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>

	<table background-color="#bfbfbf" width="100%" padding="5px" border="1" margin-bottom="15px">
		<tr>
			<td><b color="#000080">DATOS TÉCNICOS, TALLERES Y CARGA</b></td>
		</tr>
		<tr>
			<td align="center"><b>CIA SEGURO DE CARGA : -</b></td>
		</tr>
		<tr>
			<td>
				<table background-color="#fff" width="100%">
					<tr>
						<td border-left="1" border-top="1" border-bottom="1"><b>TIPO CARGA:</b></td>
						<td border-left="1" border-top="1" border-bottom="1" border-right="1">-</td>
					</tr>
				</table>
			</td>
		</tr>
		<tr>
			<td>
				<table  background-color="#fff" width="100%">
					<tr>
						<td border-left="1" border-top="1" border-bottom="1"><b>PRODUCTO</b></td>
						<td border-left="1" border-top="1" border-bottom="1"><b>BOX/VID</b></td>
						<td border-left="1" border-top="1" border-bottom="1"><b>ACTIVACION</b></td>
						<td border-left="1" border-top="1" border-bottom="1"><b>RESP.</b></td>
						<td border-left="1" border-top="1" border-bottom="1"><b>TEC.INSTALACION</b></td>
						<td border-left="1" border-top="1" border-bottom="1"><b>CIU/FECH.</b></td>
						<td border-left="1" border-top="1" border-bottom="1"><b>INST.</b></td>
						<td border-left="1" border-top="1" border-bottom="1"><b>TEC.CHEQUEO</b></td>
						<td border-left="1" border-top="1" border-bottom="1"><b>CIU/FECH.</b></td>
						<td border-left="1" border-top="1" border-bottom="1" border-right="1"><b>CHEQ.</b></td>
					</tr>
					<tr>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					</tr>
				</table>
			</td>
		</tr>
	</table>

	<table background-color="#bfbfbf" width="100%" padding="5px" border="1" margin-bottom="15px">
		<tr><td><b color="#000080">DATOS DEL ROBO / OPERATIVO / UBICACIÓN</b></td></tr>
		<tr>
			<td>
				<table background-color="#fff" width="100%" border="1" padding="5px">
					<tr>
						<td border-left="1" border-top="1"><b>LUGAR DE ROBO:</b> ${item.lugarRobo}</td>
						<td border-top="1"></td>
						<td border-top="1"><b>CIUDAD:</b> ${item.ciudadRobo}</td>
						<td border-top="1" border-right="1"></td>
					</tr>
					<tr>
						<td border-left="1" border-top="1"><b>FECHA ROBO:</b> ${item.fechaRobo}</td>
						<td border-top="1"></td>
						<td border-top="1"><b>HORA ROBO:</b> ${item.horaRobo}</td>
						<td border-top="1" border-right="1"></td>
					</tr>
					<tr>
						<td border-left="1" border-top="1" border-bottom="1"><b>FECHA ACT. CONTROL :</b></td>
						<td border-top="1" border-bottom="1"></td>
						<td border-top="1" border-bottom="1"><b>HORA ACT.CONTROL:</b></td>
						<td border-top="1" border-right="1" border-bottom="1"></td>
					</tr>
				</table>
			</td>
		</tr>
		<tr>
			<td>
				<table background-color="#fff" width="100%" border="1">
					<tr>
						<td><b>FEC-HORA NICIO OPER.</b></td>
						<td></td>
						<td><b>FEC-HORA FINAL OPER.</b></td>
						<td></td>
					</tr>
				</table>
			</td>
		</tr>
		<tr>
			<td>
				<table background-color="#fff" width="100%" border="1" padding="5px">
					<tr>
						<td border-left="1" border-top="1"><b>LUGAR UBICACIÓN:</b> ${item.lugarUbicacion}</td>
						<td border-top="1"></td>
						<td border-top="1"><b>CIUDAD:</b> ${item.ciudadUbicacion}</td>
						<td border-top="1" border-right="1"></td>
					</tr>
					<tr>
                                               <#assign partes = item.fechaUbicacion?split(" ")>
						<td border-left="1" border-top="1"><b>FECHA UBICACIÓN:</b> ${partes[0]!""}</td>
						<td border-top="1"></td>
						<td border-top="1"><b>HORA UBICACIÓN:</b> ${partes[1]!""}</td>
						<td border-top="1" border-right="1"></td>
					</tr>
					<tr>
						<td border-left="1" border-top="1"><b>UBICADO POR: </b>${item.recuperadoPor}</td>
						<td border-top="1"></td>
						<td border-top="1"><b>MINUTO CEL.: </b>${item.celularMin}</td>
						<td border-top="1" border-right="1"></td>
					</tr>
					<tr>
						<td border-left="1" border-top="1"><b>POS. LAT.:</b> ${item.latitudGestion}</td>
						<td border-top="1"></td>
						<td border-top="1"><b>POS. LONG.:</b> ${item.longitudGestion}</td>
						<td border-top="1" border-right="1"></td>
					</tr>
					<tr>
						<td border-left="1" border-top="1" border-bottom="1"><b>TIPO SEÑAL CONT.:</b></td>
						<td border-top="1" border-bottom="1"></td>
						<td border-top="1" border-bottom="1"><b>TIPO SEÑAL RASTREO :</b></td>
						<td border-top="1" border-right="1" border-bottom="1"></td>
					</tr>
				</table>
			</td>
		</tr>
	</table>

	<pbr size="A4"/>

	<table background-color="#bfbfbf" margin-bottom="15px" width="100%" border="1" padding="5px">
		<thead font-weight="bold">
			<tr>
				<td colspan="3"><b>ETAPA</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${item.tipoGestionCodigo} ${item.tipoGestion} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${item.etapaCaso}</td>
			</tr>
			<tr>
				<td border-left="1" border-bottom="1" border-top="1" border-right="1" background-color="#fff" align="center" vertical-align="middle">USUARIO</td>
				<td border-top="1" border-bottom="1" border-right="1" background-color="#fff" align="center" vertical-align="middle">FECHA<br/>SEGUIMIENTO</td>
				<td border-top="1" border-bottom="1" border-right="1" background-color="#fff" align="center" vertical-align="middle">SEGUIMIENTO</td>
			</tr>
		</thead>
		<tbody>
		<#list data.mensajes as mensajes>
			<tr>
				<td border-left="1" border-right="1" border-bottom="1" background-color="#fff" vertical-align="middle"><p align="left">${mensajes.author}</p></td>
				<td border-right="1" border-bottom="1" background-color="#fff" word-wrap="break-word" word-break="break-word" vertical-align="middle" ><p text-align="left" >${mensajes.messagedate}</p></td>
				<td border-right="1" border-bottom="1" background-color="#fff" word-wrap="break-word" word-break="break-word" vertical-align="middle">${mensajes.message}</td>
			</tr>
		</#list>
		</tbody>
	</table>

	</body>
</pdf>

</pdfset>
