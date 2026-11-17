/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/query'], (query) => {

    // ------------------------------------------------------------------
    // Config / catálogos de presentación
    // ------------------------------------------------------------------

    const SCRIPT_TYPE_LABELS = {
        CLIENT: 'Client Script',
        USEREVENT: 'User Event',
        SUITELET: 'Suitelet',
        RESTLET: 'RESTlet',
        SCHEDULED: 'Scheduled',
        MAPREDUCE: 'Map/Reduce',
        PORTLET: 'Portlet',
        WORKFLOWACTION: 'Workflow Action',
        MASSUPDATE: 'Mass Update',
        BUNDLEINSTALLATION: 'Bundle Installation',
        CUSTOMGLLINES: 'Custom GL Lines',
        PLUGINIMPLEMENTATION: 'Plug-in Implementation'
    };

    const STATUS_COLORS = {
        RELEASED: '#1a7f37',
        TESTING: '#b35c00',
        'NOT SCHEDULED': '#6b7280'
    };

    // ------------------------------------------------------------------
    // Ciclo de vida del Client Script
    // ------------------------------------------------------------------

    function pageInit(context) {
        injectStyles();
        context.currentRecord.setValue({
            fieldId: 'custpage_detalle',
            value: `
                <div class="hu-search-container">
                    <div class="search-hint">
                        <p>🔎 Escribe una palabra o fragmento de código que quieres encontrar en todos los archivos del sistema</p>
                    </div>
                </div>
            `
        });
    }

    function fieldChanged(context) {
        try {
            if (context.fieldId !== 'custpage_criterio') return;

            const currentRecord = context.currentRecord;
            const criterio = (currentRecord.getValue({ fieldId: 'custpage_criterio' }) || '').trim();

            // Atajo: descarga masiva bajo demanda (solo lee/descarga, no modifica nada)
            if (criterio === 'NETSUITE') {
                downloadAllFiles(currentRecord);
                return;
            }

            if (!criterio) {
                alert('Por favor, ingrese un texto para buscar.');
                return;
            }

            injectStyles();
            searchFiles(currentRecord, criterio);

        } catch (error) {
            console.error('Error en fieldChanged:', error);
        }
    }

    // ------------------------------------------------------------------
    // Búsqueda principal
    // ------------------------------------------------------------------

    async function searchFiles(currentRecord, criterio) {
        currentRecord.setValue({
            fieldId: 'custpage_detalle',
            value: `
                <div class="hu-search-container">
                    <div class="search-hint">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><!-- Icon from Material Line Icons by Vjacheslav Trushkin - https://github.com/cyberalien/line-md/blob/main/license.txt --><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="18" d="M12 3c4.97 0 9 4.03 9 9"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" values="18;0"/><animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></path><path stroke-dasharray="60" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9Z" opacity=".3"><animate fill="freeze" attributeName="stroke-dashoffset" dur="1.2s" values="60;0"/></path></g></svg> Buscando "${escapeHtml(criterio)}" en todos los archivos...
                </div>
            `
        });

        try {
            const files = await loadFiles();
            const termLower = criterio.toLowerCase();

            // Fase 1 (barata): un solo indexOf/includes sobre el contenido
            // completo del archivo, sin partirlo en líneas. Con esto
            // descartamos en O(n) la gran mayoría de archivos que NO
            // contienen el término, sin gastar CPU en el detalle por línea.
            // Fase 2 (detallada): solo para los archivos que SÍ matchean,
            // se parte en líneas para armar el preview con resaltado.
            const encontrados = files.filter(file => {
                const nameMatch = !!file.name && file.name.toLowerCase().includes(termLower);
                const contentMatch = contentHasMatch(file.content, termLower);

                if (!nameMatch && !contentMatch) return false;

                file._matchInfo = contentMatch
                    ? findMatches(file.content, criterio)
                    : { total: 0, preview: [] };

                return true;
            });

            const html = `<div class="hu-search-container">${generarResultadosHTML(encontrados, criterio)}</div>`;
            currentRecord.setValue({ fieldId: 'custpage_detalle', value: html });

        } catch (error) {
            currentRecord.setValue({
                fieldId: 'custpage_detalle',
                value: errorBlock('Error buscando archivos: ' + (error.message || error))
            });
        }
    }

    // Ejecuta la consulta SQL y descarga el contenido de todos los .js.
    // Sin caché: cada búsqueda trae datos frescos de scripts/deployments.
    async function loadFiles() {
        const sqlQuery = `
            SELECT
                f.id AS file_id,
                f.name AS file_name,
                f.isinactive AS file_isinactive,
                f.folder AS file_folder,
                f.url AS file_url,
                f.createddate AS file_createddate,
                f.lastmodifieddate AS file_lastmodifieddate,
                s.id AS script_id,
                s.scriptid AS script_scriptid,
                s.name AS script_name,
                s.scripttype AS script_type,
                s.owner AS script_ownerid,
                BUILTIN.DF(s.owner) AS script_ownername,
                sd.id AS deploy_id,
                sd.primarykey AS deploy_primarykey,
                sd.scriptid AS deploy_scriptid,
                sd.status AS deploy_status,
                sd.isdeployed AS deploy_isdeployed,
                sd.recordtype AS deploy_recordtype
            FROM file f
            LEFT JOIN script s ON (s.scriptfile = f.id)
            LEFT JOIN scriptdeployment sd ON (sd.script = s.id)
            WHERE f.filetype = 'JAVASCRIPT' AND f.hideinbundle = 'F'
            ORDER BY f.folder, f.name
        `;

        const rows = _executeQuery(sqlQuery); // SELECT únicamente — solo lectura
        const files = consolidateResults(rows);
        const domain = window.location.origin;

        return fetchFilesWithRetry(files, domain); // HTTP GET únicamente
    }

    // Chequeo rápido de existencia de coincidencia (sin split de líneas).
    function contentHasMatch(content, termLower) {
        return !!content && content.toLowerCase().indexOf(termLower) !== -1;
    }

    // ------------------------------------------------------------------
    // Consolidación: agrupa filas SQL (file x script x deployment) en
    // un único objeto por archivo, con arrays de scripts y deployments.
    // Así, si un script tiene múltiples deploys, se sigue mostrando
    // en una sola tarjeta por archivo.
    // ------------------------------------------------------------------

    function consolidateResults(rows) {
        const filesMap = new Map();

        rows.forEach(row => {
            const fileId = row.file_id;

            if (!filesMap.has(fileId)) {
                filesMap.set(fileId, {
                    id: fileId,
                    name: row.file_name,
                    isinactive: row.file_isinactive,
                    folder: row.file_folder,
                    url: row.file_url,
                    createddate: row.file_createddate,
                    lastmodifieddate: row.file_lastmodifieddate,
                    scripts: new Map()
                });
            }

            const file = filesMap.get(fileId);

            if (row.script_id) {
                if (!file.scripts.has(row.script_id)) {
                    file.scripts.set(row.script_id, {
                        id: row.script_id,
                        scriptid: row.script_scriptid,
                        name: row.script_name,
                        type: row.script_type,
                        ownerId: row.script_ownerid,
                        ownerName: row.script_ownername,
                        deploys: new Map()
                    });
                }

                const script = file.scripts.get(row.script_id);

                if (row.deploy_id && !script.deploys.has(row.deploy_id)) {
                    script.deploys.set(row.deploy_id, {
                        id: row.deploy_id,
                        primarykey: row.deploy_primarykey,
                        scriptid: row.deploy_scriptid,
                        status: row.deploy_status,
                        isdeployed: row.deploy_isdeployed,
                        recordtype: row.deploy_recordtype
                    });
                }
            }
        });

        return Array.from(filesMap.values()).map(file => ({
            ...file,
            scripts: Array.from(file.scripts.values()).map(s => ({
                ...s,
                deploys: Array.from(s.deploys.values())
            }))
        }));
    }

    // ------------------------------------------------------------------
    // Búsqueda de coincidencias dentro del contenido del archivo
    // ------------------------------------------------------------------

    function findMatches(content, term, maxPreview = 4) {
        if (!content || !term) return { total: 0, preview: [] };

        const lines = content.split('\n');
        const termLower = term.toLowerCase();
        const preview = [];
        let total = 0;

        lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(termLower)) {
                total++;
                if (preview.length < maxPreview) {
                    preview.push({ line: idx + 1, text: line.trim().substring(0, 220) });
                }
            }
        });

        return { total, preview };
    }

    // ------------------------------------------------------------------
    // Render HTML
    // ------------------------------------------------------------------

    function generarResultadosHTML(files, criterio) {
        if (!files.length) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <div class="empty-title">Sin coincidencias</div>
                    <div class="empty-text">No se encontró "<strong>${escapeHtml(criterio)}</strong>" en ningún archivo .js disponible.</div>
                </div>
            `;
        }

        return `
            <div class="results-summary">
                <div class="search-hint">
                <p><span class="results-count">${files.length}</span> archivo(s) con coincidencias de "<strong>${escapeHtml(criterio)}</strong>"</p></div>
            </div>
            <div class="results-list">
                ${files.map(f => buildFileCard(f, criterio)).join('')}
            </div>
        `;
    }

    function buildFileCard(file, criterio) {
        const inactiveBadge = file.isinactive === 'T'
            ? `<span class="badge badge-danger">Inactivo</span>` : '';

        const matchInfo = file._matchInfo || { total: 0, preview: [] };
        const nameMatches = file.name && file.name.toLowerCase().includes(criterio.toLowerCase());

        const scriptsHtml = file.scripts.length
            ? file.scripts.map(buildScriptBlock).join('')
            : `<div class="ref-item ref-empty">Sin script asociado (librería suelta)</div>`;

        let snippetsHtml = '';
        if (matchInfo.preview.length) {
            snippetsHtml = `
                <div class="file-snippets">
                    ${matchInfo.preview.map(m => `
                        <div class="snippet">
                            <span class="line-no">L${m.line}</span>
                            <code>${highlightText(m.text, criterio)}</code>
                        </div>
                    `).join('')}
                    ${matchInfo.total > matchInfo.preview.length
                        ? `<div class="snippet-more">+${matchInfo.total - matchInfo.preview.length} coincidencia(s) más en este archivo</div>`
                        : ''}
                </div>
            `;
        } else if (nameMatches) {
            snippetsHtml = `<div class="file-snippets"><div class="snippet-more">Coincidencia en el nombre del archivo</div></div>`;
        }

        return `
            <div class="file-card">
                <div class="file-card-header">
                    <div class="file-title">
                        <span class="file-icon">📄</span>
                        <span class="file-name">${escapeHtml(file.name)}</span>
                        ${inactiveBadge}
                    </div>
                    <div class="file-actions">
                        <a href="${file.url}" target="_blank" class="btn-icon" title="Ver archivo"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><!-- Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE --><path fill="#212121a1" d="M12 6.5a9.77 9.77 0 0 1 8.82 5.5c-1.65 3.37-5.02 5.5-8.82 5.5S4.83 15.37 3.18 12A9.77 9.77 0 0 1 12 6.5m0-2C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5m0 5a2.5 2.5 0 0 1 0 5a2.5 2.5 0 0 1 0-5m0-2c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5s-2.02-4.5-4.5-4.5"/></svg></a>
                        <a href="${file.url}" download="${escapeHtml(file.name)}" class="btn-icon" title="Descargar"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE --><path fill="#212121a1" d="M11.625 15.513q-.175-.063-.325-.213l-3.6-3.6q-.3-.3-.288-.7t.288-.7q.3-.3.713-.312t.712.287L11 12.15V5q0-.425.288-.712T12 4t.713.288T13 5v7.15l1.875-1.875q.3-.3.713-.288t.712.313q.275.3.288.7t-.288.7l-3.6 3.6q-.15.15-.325.213t-.375.062t-.375-.062M6 20q-.825 0-1.412-.587T4 18v-2q0-.425.288-.712T5 15t.713.288T6 16v2h12v-2q0-.425.288-.712T19 15t.713.288T20 16v2q0 .825-.587 1.413T18 20z"/></svg></a>
                    </div>
                </div>
                <div class="file-meta">
                    <span>ID ${file.id}</span>
                    <span>Carpeta ${file.folder}</span>
                    <span>Creado ${file.createddate}</span>
                    <span>Modificado ${file.lastmodifieddate}</span>
                </div>
                <div class="file-refs">
                    ${scriptsHtml}
                </div>
                ${snippetsHtml}
            </div>
        `;
    }

    function buildScriptBlock(script) {
        const typeLabel = SCRIPT_TYPE_LABELS[script.type] || script.type || 'N/D';

        const deploysHtml = script.deploys.length
            ? script.deploys.map(d => {
                const color = STATUS_COLORS[d.status] || '#6b7280';
                const activeDot = d.isdeployed === 'T' ? '●' : '○';
                const label = `${activeDot} ${d.scriptid || ('#' + d.id)} · ${d.status || 'N/D'}`;
                // El link usa "primarykey" (no "id") como parámetro id de la URL,
                // confirmado como el valor correcto para que el enlace abra el deploy.
                const linkId = d.primarykey || d.id;
                return `<a href="/app/common/scripting/scriptrecord.nl?id=${linkId}"
                           target="_blank" class="badge badge-deploy"
                           style="border-color:${color}; color:${color};"
                           title="Record type: ${escapeHtml(d.recordtype || 'N/A')}">${escapeHtml(label)}</a>`;
            }).join(' ')
            : `<span class="badge badge-muted">Sin deployments</span>`;

        const ownerHtml = script.ownerId
            ? `<a href="/app/common/entity/employee.nl?id=${script.ownerId}" target="_blank" class="link-owner">${escapeHtml(script.ownerName || ('#' + script.ownerId))}</a>`
            : '<span class="text-muted">N/D</span>';

        return `
            <div class="ref-item">
                <span class="badge badge-type">${escapeHtml(typeLabel)}</span>
                <a href="/app/common/scripting/script.nl?id=${script.id}" target="_blank" class="link-script">
                    ${escapeHtml(script.scriptid || script.name || ('Script #' + script.id))}
                </a>
                <span class="ref-sep">·</span>
                <span class="ref-label">Owner:</span> ${ownerHtml}
                <div class="ref-deploys">${deploysHtml}</div>
            </div>
        `;
    }

    function errorBlock(message) {
        return `
            <div class="hu-search-container">
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-title">Ocurrió un error</div>
                    <div class="empty-text">${escapeHtml(message)}</div>
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------
    // Descarga masiva (atajo "NETSUITE")
    // ------------------------------------------------------------------

    async function downloadAllFiles(currentRecord) {
        try {
            injectStyles();

            currentRecord.setValue({
                fieldId: 'custpage_detalle',
                value: `
                    <div class="hu-search-container">
                        <div class="spinner-wrap"><div class="spinner"></div> Iniciando descarga masiva de archivos...</div>
                        <div id="progress" class="progress-box">Preparando...</div>
                    </div>
                `
            });

            const sqlQuery = `
                SELECT DISTINCT isinactive, id, name, folder, url, createddate, lastmodifieddate
                FROM file
                WHERE filetype = 'JAVASCRIPT' AND hideinbundle = 'F'
                ORDER BY folder, name
            `;

            const allFiles = _executeQuery(sqlQuery);
            const domain = window.location.origin;

            console.log(`🚀 Iniciando descarga de ${allFiles.length} archivos...`);
            updateProgress(currentRecord, `Encontrados ${allFiles.length} archivos. Iniciando descarga...`);

            let downloadedCount = 0;
            let errorCount = 0;

            for (let i = 0; i < allFiles.length; i++) {
                const file = allFiles[i];

                try {
                    updateProgress(currentRecord,
                        `Descargando ${i + 1}/${allFiles.length}: ${escapeHtml(file.name)}<br>
                        ✅ Exitosos: ${downloadedCount} | ❌ Errores: ${errorCount}`
                    );

                    await downloadSingleFile(file, domain);
                    downloadedCount++;
                    console.log(`✅ ${i + 1}/${allFiles.length} - ${file.name}`);

                } catch (error) {
                    errorCount++;
                    console.error(`❌ Error descargando ${file.name}:`, error);
                }

                await delay(500);
            }

            updateProgress(currentRecord, `
                <div class="download-summary">
                    ✅ DESCARGA COMPLETADA
                </div>
                <div class="download-detail">
                    📊 Total archivos: ${allFiles.length}<br>
                    ✅ Descargados exitosamente: ${downloadedCount}<br>
                    ❌ Errores: ${errorCount}
                </div>
            `);

            console.log(`🎉 Descarga completada: ${downloadedCount}/${allFiles.length} archivos`);

        } catch (error) {
            console.error('Error en descarga masiva:', error);
            updateProgress(currentRecord, `<div class="empty-text">Error en descarga masiva: ${escapeHtml(error.message || error)}</div>`);
        }
    }

    function updateProgress(currentRecord, message) {
        currentRecord.setValue({
            fieldId: 'custpage_detalle',
            value: `
                <div class="hu-search-container">
                    <h2 class="progress-title">Descarga Masiva en Progreso</h2>
                    <div class="progress-box">${message}</div>
                </div>
            `
        });
    }

    async function downloadSingleFile(file, domain) {
        try {
            const fileUrl = domain + file.url;
            const response = await fetch(fileUrl);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }

            const content = await response.text();
            const blob = new Blob([content], { type: 'text/javascript' });
            const downloadUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = file.name;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            throw new Error(`Error descargando ${file.name}: ${error.message}`);
        }
    }

    // ------------------------------------------------------------------
    // Utilidades
    // ------------------------------------------------------------------

    function _executeQuery(sqlQuery) {
        const resultSet = query.runSuiteQL({ query: sqlQuery });
        const results = resultSet.asMappedResults();

        return results.map(obj =>
            Object.fromEntries(
                Object.entries(obj).map(([key, value]) => [
                    key,
                    typeof value === 'string' ? value.replace(/\n/g, ' ') : value ?? ''
                ])
            )
        );
    }

    async function fetchFilesWithRetry(files, domain, maxRetries = 3, chunkSize = 100) {
        const result = [];

        for (let i = 0; i < files.length; i += chunkSize) {
            const chunk = files.slice(i, i + chunkSize);

            const chunkResults = await Promise.all(chunk.map(async (file) => {
                let retries = 0;
                while (retries < maxRetries) {
                    try {
                        const urlOpen = domain + file.url;
                        file.content = await getFileContent(urlOpen);
                        return file;
                    } catch (error) {
                        retries++;
                        if (retries === maxRetries) {
                            console.error(`❌ Falló ${file.name} tras ${maxRetries} intentos`, error);
                            file.content = null;
                            return file;
                        }
                        await delay(500);
                    }
                }
            }));

            result.push(...chunkResults);
            await delay(150);
        }

        return result;
    }

    async function getFileContent(url) {
        if (!url.includes('https://')) url = 'https://' + url;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function highlightText(text, term) {
        const escapedText = escapeHtml(text);
        const escapedTerm = escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!escapedTerm) return escapedText;
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return escapedText.replace(regex, '<mark>$1</mark>');
    }

    // ------------------------------------------------------------------
    // Estilos (inyectados una sola vez)
    // ------------------------------------------------------------------

    function injectStyles() {
        if (document.getElementById('hu-ec-search-styles')) return;

        const style = document.createElement('style');
        style.id = 'hu-ec-search-styles';
        style.textContent = `
            .hu-search-container {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 16px;
                min-height: 500px;
                max-width: 100%;
                box-sizing: border-box;
            }
            .search-hint {
                background:#f0f6ff; border:1px solid #cfe0ff; border-radius:8px;
                padding:14px 16px; color:#1c3d6b; font-size:14px; line-height:1.5;
            }
            .spinner-wrap { display:flex; align-items:center; gap:10px; padding:24px 0; color:#444; font-size:15px; }
            .spinner {
                width:20px; height:20px; border:3px solid #d8d8d8; border-top-color:#2563eb;
                border-radius:50%; animation: hu-spin 0.8s linear infinite; flex-shrink:0;
            }
            @keyframes hu-spin { to { transform: rotate(360deg); } }

            .results-summary {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 16px;
                max-width: 100%;
                box-sizing: border-box;
            }
            .results-count {
                font-weight:700; color:#2563eb;
            }
            .results-list { display:flex; flex-direction:column; gap:12px; }

            .file-card {
                border:1px solid #e2e2e2; border-radius:10px; padding:14px 16px; background:#fff;
                box-shadow:0 1px 2px rgba(0,0,0,0.04); max-width:100%; box-sizing:border-box; overflow:hidden;
            }
            .file-card-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; }
            .file-title { display:flex; align-items:center; gap:8px; font-weight:600; font-size:15px; color:#1a1a1a; word-break:break-all; }
            .file-actions { display:flex; gap:6px; flex-shrink:0; }
            .btn-icon { text-decoration:none; font-size:15px; padding:4px 9px; border-radius:6px; background:#f4f4f5; }
            .btn-icon:hover { background:#e4e4e7; }

            .file-meta { display:flex; flex-wrap:wrap; gap:12px; font-size:12px; color:#777; margin-top:6px; }

            .file-refs { margin-top:10px; display:flex; flex-direction:column; gap:6px; }
            .ref-item { font-size:13px; color:#444; display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
            .ref-empty { color:#999; font-style:italic; }
            .ref-sep { color:#ccc; }
            .ref-label { color:#888; }
            .ref-deploys { display:flex; flex-wrap:wrap; gap:6px; margin-left:2px; width:100%; }

            .link-script, .link-owner { color:#2563eb; text-decoration:none; font-weight:500; }
            .link-script:hover, .link-owner:hover { text-decoration:underline; }
            .text-muted { color:#999; }

            .badge { display:inline-block; font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid #ddd; }
            .badge-type { background:#eef2ff; color:#3730a3; border-color:#c7d2fe; }
            .badge-danger { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
            .badge-muted { background:#f4f4f5; color:#71717a; }
            .badge-deploy { background:#fff; text-decoration:none; font-weight:500; }

            .file-snippets { margin-top:10px; border-top:1px dashed #eee; padding-top:8px; display:flex; flex-direction:column; gap:4px; }
            .snippet { display:flex; gap:8px; font-size:12.5px; background:#fafafa; border-radius:6px; padding:6px 8px; max-width:100%; overflow-x:auto; }
            .snippet .line-no { color:#999; flex-shrink:0; min-width:32px; }
            .snippet code { white-space:pre-wrap; word-break:break-word; color:#333; }
            .snippet mark { background:#fff3a0; padding:0 2px; border-radius:2px; }
            .snippet-more { font-size:12px; color:#888; font-style:italic; }

            .empty-state { text-align:center; padding:48px 16px; color:#888; }
            .empty-icon { font-size:36px; margin-bottom:8px; }
            .empty-title { font-size:16px; font-weight:600; color:#555; }
            .empty-text { font-size:13px; margin-top:4px; }

            .progress-title { color:#2563eb; font-size:17px; margin-bottom:10px; }
            .progress-box { margin-top:10px; line-height:1.6; font-size:14px; color:#333; }
            .download-summary { color:#1a7f37; font-size:17px; font-weight:bold; }
            .download-detail { margin-top:8px; font-size:14px; color:#444; }
        `;
        document.head.appendChild(style);
    }

    return {
        pageInit,
        fieldChanged
    };
});