// Ce script s'exécute dans le contexte de la page web
// Il a accès aux blobs créés par la page

// Stocker les références aux blobs
const blobUrls = new Set();

// Intercepter la création de blob URLs
const originalCreateObjectURL = URL.createObjectURL;
URL.createObjectURL = function(blob) {
    const url = originalCreateObjectURL.call(this, blob);
    blobUrls.add(url);
    console.log('Blob URL créé:', url);
    return url;
};

// Intercepter la révocation de blob URLs
const originalRevokeObjectURL = URL.revokeObjectURL;
URL.revokeObjectURL = function(url) {
    blobUrls.delete(url);
    console.log('Blob URL révoqué:', url);
    return originalRevokeObjectURL.call(this, url);
};

// Scanner la page pour trouver des blob URLs existants
function scanPageForBlobs() {
    const foundBlobs = new Set(blobUrls);

    // Scanner les éléments img
    document.querySelectorAll('img[src^="blob:"]').forEach(img => {
        foundBlobs.add(img.src);
    });

    // Scanner les éléments video
    document.querySelectorAll('video[src^="blob:"], video source[src^="blob:"]').forEach(video => {
        foundBlobs.add(video.src);
    });

    // Scanner les éléments audio
    document.querySelectorAll('audio[src^="blob:"], audio source[src^="blob:"]').forEach(audio => {
        foundBlobs.add(audio.src);
    });

    // Scanner les liens
    document.querySelectorAll('a[href^="blob:"]').forEach(link => {
        foundBlobs.add(link.href);
    });

    // Scanner les éléments avec background-image
    document.querySelectorAll('*').forEach(element => {
        const style = window.getComputedStyle(element);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage.includes('blob:')) {
            const match = bgImage.match(/blob:[^"')]+/);
            if (match) {
                foundBlobs.add(match[0]);
            }
        }
    });

    return Array.from(foundBlobs);
}

// Télécharger un blob
async function downloadBlob(blobUrl) {
    try {
        // Permettre différents formats d'entrée
        let finalUrl = blobUrl;

        // Si ce n'est pas une URL complète, essayer de la construire
        if (!blobUrl.startsWith('blob:') && !blobUrl.startsWith('http')) {
            // Essayer de construire l'URL blob
            finalUrl = `blob:${window.location.origin}/${blobUrl}`;
        }

        // Récupérer le blob
        const response = await fetch(finalUrl);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} - Vérifiez l'URL ou l'ID`);
        }

        const blob = await response.blob();

        // Déterminer le nom de fichier et l'extension
        let filename = 'blob_download';
        let extension = '';

        // Essayer de déterminer l'extension depuis le type MIME
        if (blob.type) {
            const mimeToExt = {
                'image/jpeg': '.jpg',
                'image/jpg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'image/webp': '.webp',
                'image/svg+xml': '.svg',
                'video/mp4': '.mp4',
                'video/webm': '.webm',
                'video/avi': '.avi',
                'video/mov': '.mov',
                'audio/mp3': '.mp3',
                'audio/mpeg': '.mp3',
                'audio/wav': '.wav',
                'audio/ogg': '.ogg',
                'application/pdf': '.pdf',
                'text/plain': '.txt',
                'application/json': '.json',
                'text/html': '.html',
                'text/css': '.css',
                'application/javascript': '.js'
            };
            extension = mimeToExt[blob.type] || '';
        }

        // Essayer d'extraire un ID de l'URL pour le nom de fichier
        const urlParts = finalUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart.length > 5 && lastPart.length < 50) {
            filename = `blob_${lastPart.substring(0, 20)}`;
        }

        // Ajouter timestamp pour éviter les conflits
        const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
        filename = `${filename}_${timestamp}${extension}`;

        // Créer le lien de téléchargement
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Nettoyer
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

        return { success: true };
    } catch (error) {
        console.error('Erreur téléchargement blob:', error);
        return { success: false, error: error.message };
    }
}

// Écouter les messages du content script
window.addEventListener('message', async (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'SCAN_BLOBS') {
        const blobs = scanPageForBlobs();
        window.postMessage({
            type: 'BLOBS_FOUND',
            blobs: blobs
        }, '*');
    }

    if (event.data.type === 'DOWNLOAD_BLOB') {
        const result = await downloadBlob(event.data.blobUrl);
        window.postMessage({
            type: 'DOWNLOAD_RESULT',
            success: result.success,
            error: result.error
        }, '*');
    }
});

console.log('Blob Downloader injecté et prêt!');