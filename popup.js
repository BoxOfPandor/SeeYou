document.addEventListener('DOMContentLoaded', async function() {
    const showFloatingIcon = document.getElementById('showFloatingIcon');
    const toggleOverlay = document.getElementById('toggleOverlay');
    const scanCurrentPage = document.getElementById('scanCurrentPage');
    const status = document.getElementById('status');

    // Charger les paramètres sauvegardés
    try {
        const result = await chrome.storage.sync.get(['showFloatingIcon']);
        showFloatingIcon.checked = result.showFloatingIcon !== false; // true par défaut
    } catch (error) {
        console.log('Paramètres par défaut utilisés');
    }

    // Sauvegarder les paramètres quand ils changent
    showFloatingIcon.addEventListener('change', async () => {
        try {
            await chrome.storage.sync.set({
                showFloatingIcon: showFloatingIcon.checked
            });

            // Informer le content script du changement
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            chrome.tabs.sendMessage(tab.id, {
                action: 'updateFloatingIcon',
                show: showFloatingIcon.checked
            });

            setStatus(showFloatingIcon.checked ? 'Icône affichée' : 'Icône masquée');
        } catch (error) {
            setStatus('Erreur lors de la sauvegarde');
        }
    });

    // Toggle overlay
    toggleOverlay.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' });
            setStatus('Overlay basculé');
            window.close(); // Fermer le popup
        } catch (error) {
            setStatus('Erreur: Actualisez la page');
        }
    });

    // Scanner la page courante
    scanCurrentPage.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            chrome.tabs.sendMessage(tab.id, { action: 'scanAndShow' });
            setStatus('Scan lancé');
            window.close(); // Fermer le popup
        } catch (error) {
            setStatus('Erreur: Actualisez la page');
        }
    });

    function setStatus(message) {
        status.textContent = message;
        setTimeout(() => {
            status.textContent = 'Extension prête';
        }, 2000);
    }
});