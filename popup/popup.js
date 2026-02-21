// Popup script for cross-browser extension
document.addEventListener('DOMContentLoaded', function() {
    const actionBtn = document.getElementById('actionBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const statusText = document.getElementById('statusText');

    // Load saved settings
    loadSettings();

    // Action button click handler
    actionBtn.addEventListener('click', async function() {
        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send message to content script
            await chrome.tabs.sendMessage(tab.id, {
                action: 'performAction',
                data: { timestamp: Date.now() }
            });
            
            updateStatus('Action performed!', 'success');
            
            // Store action in storage
            await chrome.storage.local.set({
                lastAction: Date.now(),
                actionCount: await getActionCount() + 1
            });
            
        } catch (error) {
            console.error('Error performing action:', error);
            updateStatus('Error occurred', 'error');
        }
    });

    // Settings button click handler
    settingsBtn.addEventListener('click', function() {
        // Open options page or show settings
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            // Fallback for browsers that don't support options page
            updateStatus('Settings clicked!', 'info');
        }
    });

    // Update status text with styling
    function updateStatus(message, type = 'info') {
        statusText.textContent = message;
        statusText.className = type;
        
        // Reset after 3 seconds
        setTimeout(() => {
            statusText.textContent = 'Ready to go!';
            statusText.className = '';
        }, 3000);
    }

    // Load settings from storage
    async function loadSettings() {
        try {
            const result = await chrome.storage.local.get(['actionCount', 'lastAction']);
            if (result.actionCount) {
                updateStatus(`Actions performed: ${result.actionCount}`, 'info');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Get current action count
    async function getActionCount() {
        try {
            const result = await chrome.storage.local.get(['actionCount']);
            return result.actionCount || 0;
        } catch (error) {
            console.error('Error getting action count:', error);
            return 0;
        }
    }
});

// Add CSS classes for status styling
const style = document.createElement('style');
style.textContent = `
    #statusText.success { color: #28a745; }
    #statusText.error { color: #dc3545; }
    #statusText.info { color: #17a2b8; }
`;
document.head.appendChild(style);