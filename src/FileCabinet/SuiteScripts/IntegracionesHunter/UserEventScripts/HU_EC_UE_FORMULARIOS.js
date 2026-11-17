/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 */
define(['N/log', 'N/runtime'], function(log, runtime) {

    function beforeLoad(context) {
        let { form, type }  = context;
        let { role } = runtime.getCurrentUser();

        // 1811	EC - Administrador
        // 1894	EC Desarrollo TI
        // 1898 CO - Administrador
        if (  ![1811, 1894, 1898].includes(role) ) {
            if ( type === context.UserEventType.VIEW ) {
                form.removeButton({ id: 'edit' });
                form.removeButton({ id: 'new' });
                form.removeButton({ id: 'print' });
                form.removeButton({ id: 'makecopy' });
                form.removeButton({ id: 'neweventfield' });
            }else if( type === context.UserEventType.EDIT || type === context.UserEventType.COPY ) {
                form.removeButton({ id: 'submitter' });
                form.removeButton({ id: 'submitas' });
                form.removeButton({ id: 'submitnew' });
                form.removeButton({ id: 'submitcopy' });
                form.removeButton({ id: 'submitnext' });
                form.removeButton({ id: '_cancel' });
                form.removeButton({ id: 'changeid' });
                form.removeButton({ id: 'delete' });
            }else if( type === context.UserEventType.CREATE){
                form.removeButton({ id: 'submitter' });
                form.removeButton({ id: 'close' });
                form.removeButton({ id: 'closeremaining' });
                form.removeButton({ id: '_cancel' });
            }
        }
    }

    return { beforeLoad };
});