// Content script for cross-browser extension
// This script runs in the context of web pages

(function() {
    'use strict';
    
    // Prevent multiple injections
    if (window.extensionContentScriptLoaded) {
        return;
    }
    window.extensionContentScriptLoaded = true;

    console.log('Extension content script loaded on:', window.location.href);

    // Listen for messages from popup or background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Content script received message:', message);
        
        switch (message.action) {
            case 'performAction':
                performPageAction(message.data);
                sendResponse({ success: true, message: 'Action performed' });
                break;
                
            case 'getPageInfo':
                const pageInfo = getPageInfo();
                sendResponse(pageInfo);
                break;
                
            case 'highlightElements':
                highlightElements(message.selector || 'h1, h2, h3');
                sendResponse({ success: true });
                break;
                
            case 'removeHighlights':
                removeHighlights();
                sendResponse({ success: true });
                break;
                
            default:
                console.warn('Unknown action:', message.action);
                sendResponse({ success: false, message: 'Unknown action' });
        }
        
        return true; // Keep message channel open for async response
    });

    // Perform a sample action on the page
    function performPageAction(data) {
        // Example: Add a notification banner
        showNotification('Extension action performed!', 'success');
        
        // Example: Log page statistics
        const stats = {
            title: document.title,
            url: window.location.href,
            links: document.querySelectorAll('a').length,
            images: document.querySelectorAll('img').length,
            timestamp: data.timestamp || Date.now()
        };
        
        console.log('Page statistics:', stats);
        
        // Store in extension storage
        chrome.storage.local.set({
            [`pageStats_${Date.now()}`]: stats
        });
    }

    // Get basic page information
    function getPageInfo() {
        return {
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname,
            links: document.querySelectorAll('a').length,
            images: document.querySelectorAll('img').length,
            headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
            paragraphs: document.querySelectorAll('p').length,
            lastModified: document.lastModified,
            charset: document.characterSet,
            lang: document.documentElement.lang || 'unknown'
        };
    }

    // Highlight elements on the page
    function highlightElements(selector) {
        removeHighlights(); // Remove existing highlights first
        
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
            element.style.outline = '2px solid #667eea';
            element.style.outlineOffset = '2px';
            element.classList.add('extension-highlighted');
            
            // Add a small badge with number
            const badge = document.createElement('div');
            badge.className = 'extension-highlight-badge';
            badge.textContent = index + 1;
            badge.style.cssText = `
                position: absolute;
                top: -10px;
                left: -10px;
                background: #667eea;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 10000;
                pointer-events: none;
            `;
            
            element.style.position = 'relative';
            element.appendChild(badge);
        });
        
        showNotification(`Highlighted ${elements.length} elements`, 'info');
    }

    // Remove all highlights
    function removeHighlights() {
        const highlighted = document.querySelectorAll('.extension-highlighted');
        highlighted.forEach(element => {
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.classList.remove('extension-highlighted');
            
            // Remove badges
            const badges = element.querySelectorAll('.extension-highlight-badge');
            badges.forEach(badge => badge.remove());
        });
    }

    // Show a notification on the page
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.extension-notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'extension-notification';
        notification.textContent = message;
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#17a2b8',
            warning: '#ffc107'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // Add animation keyframes
        if (!document.querySelector('#extension-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'extension-notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }

    // Initialize content script
    function init() {
        console.log('Extension content script initialized');
        
        // Example: Listen for specific page events
        document.addEventListener('click', function(event) {
            // You can add click tracking or other interactions here
            // console.log('Click detected:', event.target);
        });
        
        // Send initialization message to background script
        chrome.runtime.sendMessage({
            action: 'contentScriptLoaded',
            url: window.location.href,
            title: document.title
        }).catch(error => {
            // Background script might not be ready, that's okay
            console.log('Could not send init message:', error.message);
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();