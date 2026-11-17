/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
*/

define(['N/log', 'N/sftp'], (log, sftp) => {

    const _post = (requestBody) => {
        try {
            log.debug("requestBody", requestBody);

            const connection = sftp.createConnection({
                passwordGuid: '13a99046e84e42b49f4f293b9fe26562', // DEBE ser un GUID válido de NetSuite
                url: 'hunterapi.hunter.com.ec',
                hostKey: 'AAAAB3NzaC1yc2EAAAADAQABAAABgQDZK6BBOWUzp5XZWvENeFAEwJX1MaGSHmJl/wtBt2kLegoi0AEL8nK4+g4V7eUtwOkJ4n0IhMVty+06Q6aonUKggdLRtADbsBrjHXI36PbkNDhfNcF4zcFpEzIjx5i/9ASdcHfRlI5s7NuUgZy3QTuUKiQ6YykQJwS3LQ4Y3s8fdVLNsw4GRW4ElT2QuabDzQyZZviqlyOT6o+LggFbXDscN/cyiZI/cMS+0nPnxkXofgochCh2AQUNZxzVMTdcfIrk93ShXtJa/q3ISeN4GHN234gXYtq4cAxPcn2c+2HRsB3Ub3KQwWNYx/aKCkcWqgC4bU24F1uw4C9Z2XgPMS5s5MJEtxZkWJ7XovWucVFtW1DfS+7LOiy2YiL3SwlOEdc9Xm3cV5utQxL2S8LwC0D9IK5iZZFHIUzxR824vLFH1UJqAuZsdFTblyEhMgba9ovCQXcvNEDxSynHYQEP3gwhN8DYPb6qyt4VHH8STKwfKfRa9bK9CRdaHaKVrDFm+Ds=', // DEBE ser el hostKey válido del servidor
                username: 'netsuite',
                hostKeyType: 'rsa',
                port: 2122,
                directory: '/estimaciones',
            });

            // Esperar a que ambas operaciones terminen
            Promise.all([
                // Listar la carpeta actual
                connection.list({ path: './' }).then(fileList => {
                    log.debug('=== CARPETA ACTUAL (./) ===');
                    fileList.forEach(file => {
                        log.debug(`${file.name} (${file.type === 'd' ? 'Carpeta' : 'Archivo'})`);
                    });
                }),

                // Listar la carpeta padre
                connection.list({ path: '../' }).then(fileList => {
                    log.debug('=== CARPETA PADRE (../) ===');
                    fileList.forEach(file => {
                        log.debug(`${file.name} (${file.type === 'd' ? 'Carpeta' : 'Archivo'})`);
                    });
                })
            ]).then(() => {
                // Cerrar DESPUÉS de que terminen
                connection.close();
                log.debug('Conexión cerrada');
            }).catch(err => {
                log.error('Error:', err.message); // Usa log.error, no console.error
                connection.close();
            });

            return JSON.stringify({ status: true, message: 'Archivo guardado'});

        } catch (error) {
            log.debug("ERROR _post", error);
            return JSON.stringify({
                status: false,
                message: error
            })
        }
    }

    return { post: _post };

});