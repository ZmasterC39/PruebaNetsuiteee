# Suspensión de Cobertura — Perú (Subsidiaria 3)

Resumen del proceso `HU_PE_MR_EVENTO_SUSPENDER_COBERTURA.js` y sus dependencias.

---

## 1. Suspensión de cobertura

- Script Map/Reduce que corre por cronograma en NetSuite.
- Busca coberturas **activas** (`customrecord_ht_co_cobertura`) cuya **fecha final ya venció**, para la subsidiaria 3.
- Si corresponde suspender, cambia el estado de la cobertura a **2 (Suspendida)** y notifica a las plataformas externas (PX / Telematic).
- Al final genera un Excel con el resultado y lo envía por correo.

## 2. Políticas de vencimiento

- Tabla de reglas de negocio: `customrecord_ht_suspension_politica_net`.
- Define, por **subsidiaria + categoría de cliente + grupo de producto (LOJ/MON)**, cuántos **días de gracia** se dan antes de suspender.

| Campo | Significado |
|---|---|
| `custrecord_ht_subsidiaria_spn` | Subsidiaria (2=EC, 3=PE) |
| `custrecord_ht_tipo_categoria_spn` | Categoría del cliente (mismo campo "Category" del customer) |
| `custrecord_ht_grupo_spn` | Grupo del producto: `LOJ` o `MON` |
| `custrecord_ht_dias_spn` | Días de gracia |

- El script matchea por `GRP` + `TIPO_CATEGORIA` y compara `hoy - fecha_fin_cobertura >= DIAS`.
- **⚠️ Pendiente:** Ecuador tiene 18 filas configuradas; **Perú (subsidiaria 3) no tiene ninguna todavía**. Sin estas filas, ninguna cobertura de PE puede evaluarse como "aplica suspensión". Es una tarea de **carga de datos**, no de código.

## 3. Envío a plataforma PX

- Aplica solo si el ítem de la cobertura tiene el parámetro **GPG = "S"**.
- Arma una "trama" (JSON) con los datos de la cobertura, cliente y vehículo.
- La envía a través de `HU_TS_ScriptPlataformas_controller` → un RESTlet interno → servicio SOAP externo (`WSPX.asmx`, LATAM).
- Guarda el request/response como archivos JSON y crea un registro de traza (`customrecord_ht_ct_traza_impulso_platafo`).

## 4. Envío a Telematic (AMI)

- Aplica solo si el ítem tiene el parámetro **GPT = "S"** y hay fecha de cobertura final.
- Se autentica (`HU_EC_FUNCION.loginGetToken`) y hace un `POST` HTTP directo a la API de Hunter (`ProcesoAMI/ActualizacionCoberturaNetsuite`).
- Igual que PX: guarda trazas de request/response y un registro de impulso.
- **⚠️ Pendiente:** la URL de esta API (`HU_EC_CONSTANTES`) apunta al dominio de Ecuador (`hunteronline.com.ec`) — confirmar si Perú usa el mismo servidor o uno propio.

## 5. Clientes excluidos

- El script de Ecuador excluye ciertos clientes específicos (IDs internos de prueba/casos especiales) de la suspensión.
- En la versión PE se dejó preparada la constante `CLIENTES_EXCLUIDOS_PE` (vacía por defecto) para agregar ahí los internalid que el negocio confirme, sin tocar el resto de la lógica.

## 6. HU_EC_FUNCION

- Módulo utilitario con una sola función: `loginGetToken()`.
- Hace login contra la API de Hunter (usuario/clave desde `HU_EC_CONSTANTES`) y devuelve el token usado para autenticar el envío a Telematic.

## 7. HU_EC_CONSTANTES

- Módulo de constantes compartidas por varios scripts de Integraciones Hunter:
  - `USER_API` / `PASS_API`: credenciales de la API.
  - `SUBSIDIARIA_EC`: id de subsidiaria Ecuador (no usado en el script PE).
  - `URLS.HUNTER_API_NETSUITE`: endpoint de Telematic/AMI (usado por nuestro proceso).
  - `URLS.DOCUMENTOS_DIGITALIZADOS`: endpoint de otro proceso (documentos escaneados), **no relacionado** con coberturas.

## 8. Parametrización por ítem (HU_EC_CS_HT_PARAMS + `customrecord_ht_pp_main_param_prod`)

- Cada Ítem/Producto de NetSuite puede tener configurados parámetros como **GPG**, **GPT**, **FAM**, **APS** en el registro `customrecord_ht_pp_main_param_prod`.
- Estos valores son los que deciden, para cada cobertura, si se envía o no a PX (`GPG`), a Telematic (`GPT`), y con qué código de familia (`FAM`).
- `HU_EC_CS_HT_PARAMS.js` es un Client Script que ayuda a autocompletar/validar esos valores en el formulario cuando se edita la parametrización de un ítem.

---

### Pendientes de validar antes de producción (PE)

1. Políticas de vencimiento (`customrecord_ht_suspension_politica_net`) — **no existen para subsidiaria 3**.
2. Carpetas de File Cabinet para request/response (hoy apuntan a las de EC).
3. Confirmar si `ACCION_IMPULSO` y las categorías de cliente son las mismas que EC.
4. Confirmar si la URL de Telematic (`HU_EC_CONSTANTES`) sirve también para Perú.
5. Clientes a excluir (`CLIENTES_EXCLUIDOS_PE`) — lista vacía por ahora.
