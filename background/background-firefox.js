// Firefox-compatible background script (Manifest V2)
// This script provides compatibility for Firefox while maintaining similar functionality

// Use browser API with chrome fallback for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Extension installation and updates
browserAPI.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed/updated:', details);
    
    switch (details.reason) {
        case 'install':
            handleInstall();
            break;
        case 'update':
            handleUpdate(details.previousVersion);
            break;
        case 'browser_update':
        case 'shared_module_update':
            console.log('Browser or shared module updated');
            break;
    }
});

// Extension startup
browserAPI.runtime.onStartup.addListener(() => {
    console.log('Extension started');
    initializeExtension();
});

// Handle extension installation
async function handleInstall() {
    console.log('Extension installed for the first time');
    
    // Set default settings
    await browserAPI.storage.local.set({
        extensionEnabled: true,
        actionCount: 0,
        installDate: Date.now(),
        version: browserAPI.runtime.getManifest().version
    });
    
    // Set badge text (Firefox uses browserAction instead of action)
    const badgeAPI = browserAPI.browserAction || browserAPI.action;
    if (badgeAPI && badgeAPI.setBadgeText) {
        badgeAPI.setBadgeText({ text: 'NEW' });
        badgeAPI.setBadgeBackgroundColor({ color: '#28a745' });
        
        // Clear badge after 5 seconds
        setTimeout(() => {
            badgeAPI.setBadgeText({ text: '' });
        }, 5000);
    }
}

// Handle extension updates
async function handleUpdate(previousVersion) {
    console.log(`Extension updated from ${previousVersion} to ${browserAPI.runtime.getManifest().version}`);
    
    // Update version in storage
    await browserAPI.storage.local.set({
        version: browserAPI.runtime.getManifest().version,
        updateDate: Date.now()
    });
    
    // Show update badge
    const badgeAPI = browserAPI.browserAction || browserAPI.action;
    if (badgeAPI && badgeAPI.setBadgeText) {
        badgeAPI.setBadgeText({ text: 'UPD' });
        badgeAPI.setBadgeBackgroundColor({ color: '#17a2b8' });
        
        // Clear badge after 5 seconds
        setTimeout(() => {
            badgeAPI.setBadgeText({ text: '' });
        }, 5000);
    }
}

// Initialize extension
async function initializeExtension() {
    console.log('Initializing extension...');
    
    // Check if extension is enabled
    const result = await browserAPI.storage.local.get(['extensionEnabled']);
    if (result.extensionEnabled === false) {
        console.log('Extension is disabled');
        return;
    }
    
    // Set up context menus
    setupContextMenus();
    
    // Set up alarms if needed (Firefox has limited alarm support)
    if (browserAPI.alarms) {
        setupAlarms();
    }
}

// Set up context menus
function setupContextMenus() {
    // Remove existing menus
    browserAPI.contextMenus.removeAll(() => {
        // Add main menu item
        browserAPI.contextMenus.create({
            id: 'main-menu',
            title: 'Extension Starter',
            contexts: ['page', 'selection']
        });
        
        // Add submenu items
        browserAPI.contextMenus.create({
            id: 'get-page-info',
            parentId: 'main-menu',
            title: 'Get Page Info',
            contexts: ['page']
        });
        
        browserAPI.contextMenus.create({
            id: 'highlight-headings',
            parentId: 'main-menu',
            title: 'Highlight Headings',
            contexts: ['page']
        });
        
        browserAPI.contextMenus.create({
            id: 'analyze-selection',
            parentId: 'main-menu',
            title: 'Analyze Selection',
            contexts: ['selection']
        });
    });
}

// Handle context menu clicks
browserAPI.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('Context menu clicked:', info.menuItemId);
    
    try {
        switch (info.menuItemId) {
            case 'get-page-info':
                const pageInfo = await browserAPI.tabs.sendMessage(tab.id, {
                    action: 'getPageInfo'
                });
                console.log('Page info:', pageInfo);
                
                // Show notification with page info
                if (browserAPI.notifications) {
                    browserAPI.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon48.png',
                        title: 'Page Information',
                        message: `Title: ${pageInfo.title}\nLinks: ${pageInfo.links}\nImages: ${pageInfo.images}`
                    });
                }
                break;
                
            case 'highlight-headings':
                await browserAPI.tabs.sendMessage(tab.id, {
                    action: 'highlightElements',
                    selector: 'h1, h2, h3, h4, h5, h6'
                });
                break;
                
            case 'analyze-selection':
                if (info.selectionText) {
                    console.log('Selected text:', info.selectionText);
                    
                    // Store selection analysis
                    await browserAPI.storage.local.set({
                        [`selection_${Date.now()}`]: {
                            text: info.selectionText,
                            url: info.pageUrl,
                            timestamp: Date.now(),
                            length: info.selectionText.length,
                            wordCount: info.selectionText.split(/\s+/).length
                        }
                    });
                    
                    // Show notification
                    if (browserAPI.notifications) {
                        browserAPI.notifications.create({
                            type: 'basic',
                            iconUrl: 'icons/icon48.png',
                            title: 'Selection Analyzed',
                            message: `Text length: ${info.selectionText.length} characters\nWord count: ${info.selectionText.split(/\s+/).length} words`
                        });
                    }
                }
                break;
        }
    } catch (error) {
        console.error('Error handling context menu:', error);
    }
});

// Set up alarms for periodic tasks (if supported)
function setupAlarms() {
    if (!browserAPI.alarms) {
        console.log('Alarms not supported in this browser');
        return;
    }
    
    // Clear existing alarms
    browserAPI.alarms.clearAll();
    
    // Create a daily cleanup alarm
    browserAPI.alarms.create('dailyCleanup', {
        delayInMinutes: 1, // First run after 1 minute
        periodInMinutes: 24 * 60 // Then every 24 hours
    });
}

// Handle alarms (if supported)
if (browserAPI.alarms) {
    browserAPI.alarms.onAlarm.addListener(async (alarm) => {
        console.log('Alarm triggered:', alarm.name);
        
        switch (alarm.name) {
            case 'dailyCleanup':
                await performDailyCleanup();
                break;
        }
    });
}

// Perform daily cleanup tasks
async function performDailyCleanup() {
    console.log('Performing daily cleanup...');
    
    try {
        // Get all stored data
        const allData = await browserAPI.storage.local.get();
        const now = Date.now();
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
        
        // Remove old page stats and selections
        const keysToRemove = [];
        for (const [key, value] of Object.entries(allData)) {
            if ((key.startsWith('pageStats_') || key.startsWith('selection_')) && 
                value.timestamp && value.timestamp < oneWeekAgo) {
                keysToRemove.push(key);
            }
        }
        
        if (keysToRemove.length > 0) {
            await browserAPI.storage.local.remove(keysToRemove);
            console.log(`Cleaned up ${keysToRemove.length} old entries`);
        }
        
        // Update cleanup stats
        await browserAPI.storage.local.set({
            lastCleanup: now,
            cleanupCount: (allData.cleanupCount || 0) + 1
        });
        
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

// Listen for messages from content scripts and popup
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    switch (message.action) {
        case 'contentScriptLoaded':
            console.log('Content script loaded on:', message.url);
            sendResponse({ success: true });
            break;
            
        case 'getExtensionInfo':
            sendResponse({
                version: browserAPI.runtime.getManifest().version,
                name: browserAPI.runtime.getManifest().name
            });
            break;
            
        default:
            console.warn('Unknown message action:', message.action);
            sendResponse({ success: false, message: 'Unknown action' });
    }
    
    return true; // Keep message channel open for async response
});

// Handle tab updates (navigation, refresh, etc.)
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);
        
        // You can perform actions when pages load
        // For example, inject additional scripts or check page content
    }
});

// Handle extension icon clicks (when no popup is defined)
const actionAPI = browserAPI.browserAction || browserAPI.action;
if (actionAPI && actionAPI.onClicked) {
    actionAPI.onClicked.addListener((tab) => {
        console.log('Extension icon clicked on tab:', tab.url);
        
        // This won't fire if popup is defined in manifest
        // But useful for extensions that don't use popups
    });
}

// Initialize on script load
initializeExtension();