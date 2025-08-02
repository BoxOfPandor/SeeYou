// Injecter le script dans le contexte de la page
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

let discoveredBlobs = [];
let overlayVisible = false;

// Créer l'overlay
async function createOverlay() {
    // Vérifier les paramètres sauvegardés
    let showIcon = true;
    try {
        const result = await chrome.storage.sync.get(['showFloatingIcon']);
        showIcon = result.showFloatingIcon !== false;
    } catch (error) {
        console.log('Paramètres par défaut utilisés');
    }

    // Bouton toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'blob-toggle-btn';
    toggleBtn.className = 'blob-toggle-btn';
    toggleBtn.innerHTML = '📁';
    toggleBtn.title = 'Toggle Blob Downloader';
    toggleBtn.style.display = showIcon ? 'flex' : 'none';

    // Overlay principal
    const overlay = document.createElement('div');
    overlay.id = 'blob-downloader-overlay';
    overlay.innerHTML = `
        <div class="blob-header" id="blob-header">
            <div class="blob-title">🗂️ Blob Downloader</div>
            <button class="blob-close" id="blob-close">×</button>
        </div>
        <div class="blob-content">
            <div class="blob-input-group">
                <input type="text" class="blob-input" id="blob-input" placeholder="URL blob: ou ID d'objet">
                <button class="blob-button" id="download-single">📥 Télécharger</button>
            </div>

            <button class="blob-button secondary" id="scan-blobs">🔍 Scanner les blobs</button>
            <button class="blob-button" id="download-all">📦 Télécharger tous</button>

            <div class="blob-status" id="blob-status">Prêt - Cliquez sur scanner pour commencer</div>

            <div class="blob-list" id="blob-list"></div>
        </div>
    `;

    document.body.appendChild(toggleBtn);
    document.body.appendChild(overlay);

    setupEventListeners();
}

function setupEventListeners() {
    const toggleBtn = document.getElementById('blob-toggle-btn');
    const overlay = document.getElementById('blob-downloader-overlay');
    const closeBtn = document.getElementById('blob-close');
    const header = document.getElementById('blob-header');

    // Toggle overlay
    toggleBtn.addEventListener('click', toggleOverlay);
    closeBtn.addEventListener('click', hideOverlay);

    // Actions
    document.getElementById('download-single').addEventListener('click', downloadSingle);
    document.getElementById('scan-blobs').addEventListener('click', scanBlobs);
    document.getElementById('download-all').addEventListener('click', downloadAll);

    // Drag and drop pour déplacer l'overlay
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = overlay.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        e.preventDefault();
    });

    function onDrag(e) {
        if (!isDragging) return;
        overlay.style.left = (e.clientX - dragOffset.x) + 'px';
        overlay.style.top = (e.clientY - dragOffset.y) + 'px';
        overlay.style.right = 'auto';
    }

    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }

    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlayVisible) {
            hideOverlay();
        }
    });
}

function toggleOverlay() {
    if (overlayVisible) {
        hideOverlay();
    } else {
        showOverlay();
    }
}

function showOverlay() {
    const overlay = document.getElementById('blob-downloader-overlay');
    const toggleBtn = document.getElementById('blob-toggle-btn');

    overlay.classList.add('visible');
    toggleBtn.classList.add('active');
    toggleBtn.innerHTML = '×';
    overlayVisible = true;
}

function hideOverlay() {
    const overlay = document.getElementById('blob-downloader-overlay');
    const toggleBtn = document.getElementById('blob-toggle-btn');

    overlay.classList.remove('visible');
    toggleBtn.classList.remove('active');
    toggleBtn.innerHTML = '📁';
    overlayVisible = false;
}

function setStatus(message) {
    const status = document.getElementById('blob-status');
    status.textContent = message;
}

function displayBlobs(blobs) {
    const blobList = document.getElementById('blob-list');
    blobList.innerHTML = '';

    if (blobs.length === 0) {
        blobList.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Aucun blob trouvé</div>';
        return;
    }

    blobs.forEach((blobUrl, index) => {
        const item = document.createElement('div');
        item.className = 'blob-item';

        const urlSpan = document.createElement('div');
        urlSpan.className = 'blob-url';
        urlSpan.textContent = `${index + 1}. ${blobUrl.substring(0, 60)}...`;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'blob-actions';

        const previewBtn = document.createElement('button');
        previewBtn.className = 'blob-preview-btn';
        previewBtn.textContent = '👁️';
        previewBtn.title = 'Prévisualiser';
        previewBtn.onclick = () => previewBlob(blobUrl, index + 1);

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'blob-download-btn';
        downloadBtn.textContent = '↓';
        downloadBtn.title = 'Télécharger';
        downloadBtn.onclick = () => downloadBlob(blobUrl);

        actionsDiv.appendChild(previewBtn);
        actionsDiv.appendChild(downloadBtn);

        item.appendChild(urlSpan);
        item.appendChild(actionsDiv);
        blobList.appendChild(item);
    });
}

async function downloadSingle() {
    const input = document.getElementById('blob-input');
    const url = input.value.trim();

    if (!url) {
        setStatus('❌ Veuillez entrer une URL blob ou un ID d\'objet');
        return;
    }

    setStatus('⏳ Téléchargement...');

    // Si c'est juste un ID, essayer de le convertir en URL blob
    let blobUrl = url;
    if (!url.startsWith('blob:') && !url.startsWith('http')) {
        // Essayer de trouver l'URL blob correspondant à cet ID
        const foundBlob = discoveredBlobs.find(blob => blob.includes(url));
        if (foundBlob) {
            blobUrl = foundBlob;
            setStatus('⏳ ID trouvé, téléchargement...');
        } else {
            // Essayer de construire une URL blob avec l'ID
            blobUrl = `blob:${window.location.origin}/${url}`;
        }
    }

    const result = await downloadBlob(blobUrl);

    if (result) {
        setStatus('✅ Téléchargement réussi');
        input.value = '';
    }
}

async function scanBlobs() {
    setStatus('🔍 Scan en cours...');

    // Vider la liste précédente
    discoveredBlobs = [];
    displayBlobs(discoveredBlobs);

    // Demander au script injecté de scanner
    window.postMessage({ type: 'SCAN_BLOBS' }, '*');

    // Écouter la réponse
    const listener = (event) => {
        if (event.source !== window) return;
        if (event.data.type === 'BLOBS_FOUND') {
            window.removeEventListener('message', listener);
            discoveredBlobs = event.data.blobs;
            displayBlobs(discoveredBlobs);
            setStatus(`🎯 ${discoveredBlobs.length} blob(s) trouvé(s)`);
        }
    };
    window.addEventListener('message', listener);
}

async function downloadAll() {
    if (discoveredBlobs.length === 0) {
        setStatus('❌ Aucun blob à télécharger - Scannez d\'abord');
        return;
    }

    setStatus(`⏳ Téléchargement de ${discoveredBlobs.length} blob(s)...`);
    let success = 0;

    for (let i = 0; i < discoveredBlobs.length; i++) {
        const blobUrl = discoveredBlobs[i];
        setStatus(`⏳ Téléchargement ${i + 1}/${discoveredBlobs.length}...`);

        const result = await downloadBlob(blobUrl);
        if (result) success++;

        // Petite pause entre les téléchargements
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    setStatus(`✅ ${success}/${discoveredBlobs.length} téléchargements réussis`);
}

async function downloadBlob(blobUrl) {
    return new Promise((resolve) => {
        // Demander au script injecté de télécharger
        window.postMessage({
            type: 'DOWNLOAD_BLOB',
            blobUrl: blobUrl
        }, '*');

        // Écouter la réponse
        const listener = (event) => {
            if (event.source !== window) return;
            if (event.data.type === 'DOWNLOAD_RESULT') {
                window.removeEventListener('message', listener);
                if (!event.data.success) {
                    setStatus(`❌ Erreur: ${event.data.error}`);
                }
                resolve(event.data.success);
            }
        };
        window.addEventListener('message', listener);
    });
}

// Écouter les messages de l'extension (bouton dans la barre d'outils)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleOverlay') {
        toggleOverlay();
    }

    if (request.action === 'updateFloatingIcon') {
        const toggleBtn = document.getElementById('blob-toggle-btn');
        if (toggleBtn) {
            toggleBtn.style.display = request.show ? 'flex' : 'none';
        }
    }

    if (request.action === 'scanAndShow') {
        showOverlay();
        setTimeout(scanBlobs, 300); // Petit délai pour l'animation
    }
});

// Prévisualiser un blob
async function previewBlob(blobUrl, index) {
    try {
        setStatus('🔍 Chargement de la prévisualisation...');

        // Créer le modal s'il n'existe pas
        let modal = document.getElementById('blob-preview-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'blob-preview-modal';
            modal.className = 'blob-preview-modal';
            document.body.appendChild(modal);
        }

        // Récupérer le blob
        const response = await fetch(blobUrl);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        // Déterminer le type de média
        const mimeType = blob.type || 'unknown';
        const isImage = mimeType.startsWith('image/');
        const isVideo = mimeType.startsWith('video/');
        const isAudio = mimeType.startsWith('audio/');

        let mediaElement = '';
        let mediaInfo = `Type: ${mimeType} | Taille: ${formatFileSize(blob.size)}`;

        if (isImage) {
            mediaElement = `<img src="${objectUrl}" alt="Blob Preview ${index}">`;
        } else if (isVideo) {
            mediaElement = `<video src="${objectUrl}" controls autoplay muted></video>`;
        } else if (isAudio) {
            mediaElement = `<audio src="${objectUrl}" controls autoplay></audio>`;
        } else {
            mediaElement = `<div style="padding: 40px; text-align: center; color: #666;">
                <div style="font-size: 48px;">📄</div>
                <div style="margin-top: 10px;">Prévisualisation non disponible</div>
                <div style="font-size: 12px; margin-top: 5px;">Type: ${mimeType}</div>
            </div>`;
        }

        modal.innerHTML = `
            <div class="blob-preview-content">
                <div class="blob-preview-header">
                    <div class="blob-preview-title">Prévisualisation - Blob #${index}</div>
                    <button class="blob-preview-close" onclick="closePreview()">×</button>
                </div>
                <div class="blob-preview-media">
                    ${mediaElement}
                </div>
                <div class="blob-preview-info">
                    ${mediaInfo}
                </div>
                <div class="blob-preview-actions">
                    <button class="blob-preview-download" onclick="downloadAndClosePreview('${blobUrl}')">
                        📥 Télécharger
                    </button>
                </div>
            </div>
        `;

        // Afficher le modal
        modal.classList.add('show');

        // Fermer en cliquant en dehors
        modal.onclick = (e) => {
            if (e.target === modal) {
                closePreview();
            }
        };

        // Nettoyer l'URL d'objet après un délai
        setTimeout(() => {
            if (objectUrl !== blobUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        }, 300000); // 5 minutes

        setStatus('✅ Prévisualisation chargée');

    } catch (error) {
        setStatus(`❌ Erreur prévisualisation: ${error.message}`);
    }
}

// Fermer la prévisualisation
function closePreview() {
    const modal = document.getElementById('blob-preview-modal');
    if (modal) {
        modal.classList.remove('show');
        // Nettoyer le contenu après l'animation
        setTimeout(() => {
            modal.innerHTML = '';
        }, 300);
    }
}

// Télécharger depuis la prévisualisation et fermer
async function downloadAndClosePreview(blobUrl) {
    await downloadBlob(blobUrl);
    closePreview();
}

// Formatter la taille de fichier
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fermer la prévisualisation avec Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('blob-preview-modal');
        if (modal && modal.classList.contains('show')) {
            closePreview();
        } else if (overlayVisible) {
            hideOverlay();
        }
    }
});

// Créer l'overlay quand la page est chargée
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createOverlay);
} else {
    createOverlay();
}