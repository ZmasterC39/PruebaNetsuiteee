/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/sftp', 'N/log', 'N/runtime', 'N/file'], (sftp, log, runtime, file) => {

	const execute = (context) => {
		try {
			let fileId = runtime.getCurrentScript().getParameter({ name: 'custscript_ts_file_id' });
			log.debug({
				title: 'Envio de archivos',
				details: fileId
			});

			let loadFile = file.load({ id: fileId });

			let connection = connectSftp();

			connection.upload({
				directory: '/',
				file: loadFile.name,
				file: loadFile,
				replaceExisting: true
			});

		} catch (error) {
			log.debug({
				title: 'Error en el Envío',
				details: error.message
			});
		}
	}

	function connectSftp() {
		var username = 'netsuite';
		var passwordGuid = "4d25ca366065403aba5e05ac2cfa89cb"; // "13a99046e84e42b49f4f293b9fe26562";
		var url = 'hunterapi.hunter.com.ec';
		var hostKey = 'AAAAB3NzaC1yc2EAAAADAQABAAABgQDZK6BBOWUzp5XZWvENeFAEwJX1MaGSHmJl/wtBt2kLegoi0AEL8nK4+g4V7eUtwOkJ4n0IhMVty+06Q6aonUKggdLRtADbsBrjHXI36PbkNDhfNcF4zcFpEzIjx5i/9ASdcHfRlI5s7NuUgZy3QTuUKiQ6YykQJwS3LQ4Y3s8fdVLNsw4GRW4ElT2QuabDzQyZZviqlyOT6o+LggFbXDscN/cyiZI/cMS+0nPnxkXofgochCh2AQUNZxzVMTdcfIrk93ShXtJa/q3ISeN4GHN234gXYtq4cAxPcn2c+2HRsB3Ub3KQwWNYx/aKCkcWqgC4bU24F1uw4C9Z2XgPMS5s5MJEtxZkWJ7XovWucVFtW1DfS+7LOiy2YiL3SwlOEdc9Xm3cV5utQxL2S8LwC0D9IK5iZZFHIUzxR824vLFH1UJqAuZsdFTblyEhMgba9ovCQXcvNEDxSynHYQEP3gwhN8DYPb6qyt4VHH8STKwfKfRa9bK9CRdaHaKVrDFm+Ds=';
		var port = 2122;
		var directory = '/';
		var timeout = '';
		var hostKeyType = 'rsa';
		var connection = getSFTPConnection(username, passwordGuid, url, hostKey, hostKeyType, port, directory, timeout);

		return connection;
	}

	function getSFTPConnection(username, passwordGuid, url, hostKey, hostKeyType, port, directory, timeout) {
		var preConnectionObj = {};
		preConnectionObj.passwordGuid = passwordGuid;
		preConnectionObj.url = url;
		preConnectionObj.hostKey = hostKey;
		if (username) { preConnectionObj.username = username; }
		if (hostKeyType) { preConnectionObj.hostKeyType = hostKeyType; }
		if (port) { preConnectionObj.port = Number(port); }
		if (directory) { preConnectionObj.directory = directory; }
		if (timeout) { preConnectionObj.timeout = Number(timeout); }

		var connectionObj = sftp.createConnection(preConnectionObj);
		return connectionObj;
	}

	return {
		execute: execute,
	}
});