# PruebaNetsuiteee

Proyecto de personalizaciones de Oracle NetSuite para Hunter, con procesos para Perú y Ecuador, desarrollado con JavaScript y SuiteScript.

Incluye facturación interna y agrupación de facturas, órdenes de servicio y de fabricación, ensambles e inventario, gestión de coberturas, procesos financieros e integraciones con plataformas externas.

## Estructura

- `src/FileCabinet/SuiteScripts/`: scripts, librerías, plantillas y archivos de los procesos.
- `src/Objects/`: definiciones de objetos personalizados de NetSuite.
- `docs/`: documentación funcional y técnica.
- `__tests__/`: pruebas unitarias con Jest.
- `suitecloud.config.js`: configuración de SuiteCloud y ejecución de pruebas previa al despliegue.

## Pruebas

```sh
npm ci
npm test
```

La ejecución de los scripts de negocio requiere una cuenta de NetSuite con los registros, campos, permisos e integraciones correspondientes. La configuración local de autenticación (`project.json`) y las dependencias (`node_modules/`) se excluyen mediante `.gitignore`.
