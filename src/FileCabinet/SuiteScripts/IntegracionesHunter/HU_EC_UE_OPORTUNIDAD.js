/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * @author Mauro F Ramos
 * @date Created at: 15/10/2025 - Last modified: 17/10/2025
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 *
 */

define(['N/log', 'N/runtime', 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT'], function (log, runtime, _toolkit) {

    function beforeLoad(context) {
        try {
            let { id, name, email, location, departament, role, subsidiary } = runtime.getCurrentUser();
            if ( subsidiary = 2 ) {
                _ocultar_componentes(context);
                if (context.type == context.UserEventType.CREATE) {
                    _load_grid(context);
                }
            }
        } catch (error) {
            log.debug("ERROR beforeLoad", error);
        }
    }

    // Ayuda a ocultar campos del formulario y subfichas en todo context VIEW, EDIT
    function _ocultar_componentes(context){
        try {
            // ! PARA OCULTAR CAMPOS
            let campos_sensibles;
            campos_sensibles = {
                OPORTUNIDAD: [
                    { fieldId: 'title', nextTo: 'title', position: 'NONE' },
                    { fieldId: 'memo', nextTo: 'memo', position: 'NONE' },
                    { fieldId: 'class', nextTo: 'class', position: 'NONE' },
                    { fieldId: 'taxtotal', nextTo: 'taxtotal', position: 'NONE' },
                    { fieldId: 'custpage_lsa_vis', nextTo: 'custpage_lsa_vis', position: 'STARTCOL' },
                ]
            };
            _toolkit.ocultarCampo(context, campos_sensibles.OPORTUNIDAD );

            // ! Ocultar Sub Fichas del formulario
            context.form.addField({
                id: 'custpage_hide_clear_button',
                label: ' ',
                type: 'INLINEHTML'
            }).defaultValue = `
                <script>
                    document.addEventListener('DOMContentLoaded', function() {
                        try{
                            // SUBFICHAS
                            const subFichaArticulos = document.querySelector('#itemslnk'); if (subFichaArticulos)  subFichaArticulos.style.display = 'none';
                            const subFichaRelaciones = document.querySelector('#rltnshptablnk'); if(subFichaRelaciones) subFichaRelaciones.style.display = 'none';
                            const subFichaContabilidad = document.querySelector('#accntingtablnk'); if(subFichaContabilidad) subFichaContabilidad.style.display = 'none';
                            const subFichaRegistroPersonalizado = document.querySelector('#rlrcdstablnk'); if(subFichaRegistroPersonalizado) subFichaRegistroPersonalizado.style.display = 'none';
                            const subFichaLibrosContables = document.querySelector('#multibooklnk'); if(subFichaLibrosContables) subFichaLibrosContables.style.display = 'none';

                            // CONTROLES EN SUBFICHA
                            const gridFiltrosNecesidadClienteVIEW = document.querySelector('#recmachcustrecord_nc_oportunidad_main_form'); if(gridFiltrosNecesidadClienteVIEW) gridFiltrosNecesidadClienteVIEW.style.display = 'none';
                            const gridFiltrosNecesidadClienteEDIT = document.querySelector('#tbl_clearsplitsrecmachcustrecord_nc_oportunidad'); if(gridFiltrosNecesidadClienteEDIT) gridFiltrosNecesidadClienteEDIT.style.display = 'none';

                            const editar = document.querySelector('#div__lab1'); if (editar) editar.style.display = 'none';
                            const eliminar = document.querySelector('#div__lab11'); if (eliminar) eliminar.style.display = 'none';

                            const filas = document.querySelectorAll('tr[id^="recmachcustrecord_nc_oportunidadrow"]');

                            filas.forEach((fila, index) => {
                                const tds = fila.querySelectorAll('td');

                                if (tds.length > 0) {
                                    tds[0].remove();
                                    tds[tds.length - 1].remove();
                                }
                            });
                        }catch(error){
                            console.log(error);
                        }

                    });
                </script>
            `;
        } catch (error) {
            log.error("ERRO _ocultar", error)
        }
    }

    function _load_grid(context) {
        try {
            context.newRecord.getSublistValue({sublistId: 'recmachcustrecord_nc_oportunidad', fieldId: 'custrecord_nc_principal_problema', line: 0})
            let grid = _toolkit.executeQuery('SELECT cat.id, cat.name FROM customrecord_catopc AS cat JOIN MAP_customrecord_catopc_custrecord_catopc_subsidiaria AS map ON cat.id = map.mapone JOIN Subsidiary AS sub ON map.maptwo = sub.id WHERE cat.custrecord_catopc_nivel = ? AND cat.custrecord_catopc_referencia = ? AND sub.id = 2 ORDER BY cat.id;', [1,2]);
            for (let i = 0; i < grid.length; i++) {
                context.newRecord.setSublistValue({sublistId: 'recmachcustrecord_nc_oportunidad', fieldId: 'custrecord_nc_principal_problema', line: i, value: grid[i].id});
            }
            let sublist = context.form.getSublist({ id: 'recmachcustrecord_nc_oportunidad' });

            if (sublist) {
                sublist.isAddButtonVisible = false;
                sublist.isRemoveButtonVisible = false;
            }
        } catch (error) {
            log.debug("ERROR _load_grid", error);
        }
    }

    return { beforeLoad };

});