// Background script (Service Worker) for cross-browser extension
// This script runs in the background and handles extension lifecycle events

// Extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed/updated:', details);
    
    switch (details.reason) {
        case 'install':
            handleInstall();
            break;
        case 'update':
            handleUpdate(details.previousVersion);
            break;
        case 'chrome_update':
        case 'shared_module_update':
            console.log('Browser or shared module updated');
            break;
    }
});

// Extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started');
    initializeExtension();
});

// Handle extension installation
async function handleInstall() {
    console.log('Extension installed for the first time');
    
    // Set default settings
    await chrome.storage.local.set({
        extensionEnabled: true,
        actionCount: 0,
        installDate: Date.now(),
        version: chrome.runtime.getManifest().version
    });
    
    // Set badge text
    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#28a745' });
    
    // Clear badge after 5 seconds
    setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
    }, 5000);
}

// Handle extension updates
async function handleUpdate(previousVersion) {
    console.log(`Extension updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`);
    
    // Update version in storage
    await chrome.storage.local.set({
        version: chrome.runtime.getManifest().version,
        updateDate: Date.now()
    });
    
    // Show update badge
    chrome.action.setBadgeText({ text: 'UPD' });
    chrome.action.setBadgeBackgroundColor({ color: '#17a2b8' });
    
    // Clear badge after 5 seconds
    setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
    }, 5000);
}

// Initialize extension
async function initializeExtension() {
    console.log('Initializing extension...');
    
    try {
        // Check if extension is enabled
        const result = await chrome.storage.local.get(['extensionEnabled']);
        if (result.extensionEnabled === false) {
            console.log('Extension is disabled');
            return;
        }
        
        // Set up context menus
        setupContextMenus();
        
        // Set up alarms if needed
        setupAlarms();
        
        console.log('Extension initialization completed successfully');
    } catch (error) {
        console.error('Error during extension initialization:', error);
    }
}

// Set up context menus
function setupContextMenus() {
    try {
        // Remove existing menus
        chrome.contextMenus.removeAll(() => {
            if (chrome.runtime.lastError) {
                console.log('Context menu removal error:', chrome.runtime.lastError);
                return;
            }
            
            // Add main menu item
            chrome.contextMenus.create({
                id: 'main-menu',
                title: 'Smart Page Analyzer',
                contexts: ['page', 'selection']
            }, () => {
                if (chrome.runtime.lastError) {
                    console.log('Context menu creation error:', chrome.runtime.lastError);
                    return;
                }
            });
            
            // Add submenu items
            chrome.contextMenus.create({
                id: 'get-page-info',
                parentId: 'main-menu',
                title: 'Get Page Info',
                contexts: ['page']
            }, () => {
                if (chrome.runtime.lastError) {
                    console.log('Context menu creation error:', chrome.runtime.lastError);
                }
            });
            
            chrome.contextMenus.create({
                id: 'highlight-headings',
                parentId: 'main-menu',
                title: 'Highlight Headings',
                contexts: ['page']
            }, () => {
                if (chrome.runtime.lastError) {
                    console.log('Context menu creation error:', chrome.runtime.lastError);
                }
            });
            
            chrome.contextMenus.create({
                id: 'analyze-selection',
                parentId: 'main-menu',
                title: 'Analyze Selection',
                contexts: ['selection']
            }, () => {
                if (chrome.runtime.lastError) {
                    console.log('Context menu creation error:', chrome.runtime.lastError);
                }
            });
        });
    } catch (error) {
        console.error('Error setting up context menus:', error);
    }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('Context menu clicked:', info.menuItemId);
    
    try {
        switch (info.menuItemId) {
            case 'get-page-info':
                const pageInfo = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getPageInfo'
                });
                console.log('Page info:', pageInfo);
                
                // Show notification with page info
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Page Information',
                    message: `Title: ${pageInfo.title}\nLinks: ${pageInfo.links}\nImages: ${pageInfo.images}`
                });
                break;
                
            case 'highlight-headings':
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'highlightElements',
                    selector: 'h1, h2, h3, h4, h5, h6'
                });
                break;
                
            case 'analyze-selection':
                if (info.selectionText) {
                    console.log('Selected text:', info.selectionText);
                    
                    // Store selection analysis
                    await chrome.storage.local.set({
                        [`selection_${Date.now()}`]: {
                            text: info.selectionText,
                            url: info.pageUrl,
                            timestamp: Date.now(),
                            length: info.selectionText.length,
                            wordCount: info.selectionText.split(/\s+/).length
                        }
                    });
                    
                    // Show notification
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon48.png',
                        title: 'Selection Analyzed',
                        message: `Text length: ${info.selectionText.length} characters\nWord count: ${info.selectionText.split(/\s+/).length} words`
                    });
                }
                break;
        }
    } catch (error) {
        console.error('Error handling context menu:', error);
    }
});

// Set up alarms for periodic tasks
function setupAlarms() {
    try {
        // Clear existing alarms
        chrome.alarms.clearAll(() => {
            if (chrome.runtime.lastError) {
                console.log('Alarm clear error:', chrome.runtime.lastError);
                return;
            }
            
            // Create a daily cleanup alarm
            chrome.alarms.create('dailyCleanup', {
                delayInMinutes: 1, // First run after 1 minute
                periodInMinutes: 24 * 60 // Then every 24 hours
            });
        });
    } catch (error) {
        console.error('Error setting up alarms:', error);
    }
}

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
    console.log('Alarm triggered:', alarm.name);
    
    switch (alarm.name) {
        case 'dailyCleanup':
            await performDailyCleanup();
            break;
    }
});

// Perform daily cleanup tasks
async function performDailyCleanup() {
    console.log('Performing daily cleanup...');
    
    try {
        // Get all stored data
        const allData = await chrome.storage.local.get();
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
            await chrome.storage.local.remove(keysToRemove);
            console.log(`Cleaned up ${keysToRemove.length} old entries`);
        }
        
        // Update cleanup stats
        await chrome.storage.local.set({
            lastCleanup: now,
            cleanupCount: (allData.cleanupCount || 0) + 1
        });
        
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    switch (message.action) {
        case 'contentScriptLoaded':
            console.log('Content script loaded on:', message.url);
            // You can track which tabs have the content script loaded
            sendResponse({ success: true });
            break;
            
        case 'pageAnalysisComplete':
            handlePageAnalysis(message.analysis, sender.tab);
            sendResponse({ success: true });
            break;
            
        case 'getExtensionInfo':
            sendResponse({
                version: chrome.runtime.getManifest().version,
                name: chrome.runtime.getManifest().name
            });
            break;
            
        default:
            console.warn('Unknown message action:', message.action);
            sendResponse({ success: false, message: 'Unknown action' });
    }
    
    return true; // Keep message channel open for async response
});

// Handle page analysis results
async function handlePageAnalysis(analysis, tab) {
    console.log('Page analysis received:', analysis);
    
    try {
        // Store analysis in local storage
        await chrome.storage.local.set({
            [`analysis_${tab.id}`]: {
                ...analysis,
                tabId: tab.id,
                tabUrl: tab.url,
                analyzedAt: Date.now()
            }
        });
        
        // Update badge based on analysis
        updateExtensionBadge(analysis, tab.id);
        
        // Send notification for interesting findings
        if (analysis.isNewsArticle && analysis.newsConfidence > 70) {
            const popularity = analysis.sitePopularity;
            const domain = analysis.domain;
            
            // Only show notification for lesser-known sites with high-confidence news
            if (popularity === 'unknown' || popularity === 'emerging') {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'News Article Detected',
                    message: `High-confidence news article found on ${domain} (${popularity} site)`
                });
            }
        }
        
    } catch (error) {
        console.error('Error handling page analysis:', error);
    }
}

// Update extension badge based on analysis
function updateExtensionBadge(analysis, tabId) {
    if (analysis.isNewsArticle) {
        // Show news indicator
        chrome.action.setBadgeText({ 
            text: '📰', 
            tabId: tabId 
        });
        chrome.action.setBadgeBackgroundColor({ 
            color: '#28a745',
            tabId: tabId 
        });
        
        // Update title to show analysis
        const confidence = Math.round(analysis.newsConfidence);
        const popularity = analysis.sitePopularity;
        chrome.action.setTitle({ 
            title: `Smart Page Analyzer\nNews Article (${confidence}% confidence)\nSite: ${popularity}`,
            tabId: tabId 
        });
    } else {
        // Clear badge for non-news pages
        chrome.action.setBadgeText({ 
            text: '', 
            tabId: tabId 
        });
        
        chrome.action.setTitle({ 
            title: `Smart Page Analyzer\nSite: ${analysis.sitePopularity}`,
            tabId: tabId 
        });
    }
}

// Handle tab updates (navigation, refresh, etc.)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);
        
        // You can perform actions when pages load
        // For example, inject additional scripts or check page content
    }
});

// Handle extension icon clicks (when no popup is defined)
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked on tab:', tab.url);
    
    // This won't fire if popup is defined in manifest
    // But useful for extensions that don't use popups
});

// Initialize on script load
initializeExtension();