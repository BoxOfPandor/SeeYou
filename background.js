// Service worker pour l'extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('Blob Downloader Overlay installée');

    // Définir les paramètres par défaut
    chrome.storage.sync.set({
        showFloatingIcon: true
    });
});

// Le clic sur l'icône ouvre maintenant le popup (plus le toggle direct)