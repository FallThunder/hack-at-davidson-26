// Register click-to-open behavior on install/update (persists across service worker restarts)
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)
})

// When the active tab navigates to a new URL, notify the side panel to re-analyze and reset toolbar icon
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url || !tab.active) return
  chrome.action.setIcon({ tabId, path: { 16: 'icons/icon16.png', 48: 'icons/icon48.png' } }).catch(() => {})
  chrome.runtime.sendMessage({ type: 'PAGE_NAVIGATED', url: changeInfo.url }).catch(() => {
    // Side panel may not be open — ignore
  })
})

// Also open explicitly when the toolbar icon is clicked (covers first-run and fallback)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return
  await chrome.sidePanel.setOptions({ tabId: tab.id, path: 'sidepanel/index.html', enabled: true })
  await chrome.sidePanel.open({ tabId: tab.id })
})

// Detect side panel close via long-lived port and clear highlights
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'sidepanel') return
  port.onDisconnect.addListener(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_HIGHLIGHTS' }).catch(() => {})
    })
  })
})

// Relay messages: side panel sends { target: 'content', ...rest }
// Service worker finds the active tab and forwards to its content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Content script → side panel: content scripts can't target extension pages directly
  if (message.target === 'sidepanel') {
    const { target, ...rest } = message
    chrome.runtime.sendMessage(rest).catch(() => {})
    sendResponse({ ok: true })
    return true
  }

  // Toolbar icon by trust score (side panel → background)
  if (message.type === 'SET_ICON_BY_SCORE') {
    const tier = message.tier === 'high' ? 'green' : message.tier === 'low' ? 'red' : 'yellow'
    const path = { 16: `icons/icon-${tier}.png`, 48: `icons/icon-${tier}.png` }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId) chrome.action.setIcon({ tabId, path }).catch(() => {})
      sendResponse({ ok: true })
    })
    return true
  }

  if (message.target !== 'content') return

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0]
    if (!tab?.id) {
      sendResponse({ error: 'No active tab found' })
      return
    }
    try {
      const response = await chrome.tabs.sendMessage(tab.id, message)
      sendResponse(response)
    } catch (error) {
      // Content script not present (e.g. extension reloaded without refreshing page)
      // Re-inject it programmatically and retry once
      if (error.message?.includes('Receiving end does not exist')) {
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] })
          await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content/highlight.css'] })
          const response = await chrome.tabs.sendMessage(tab.id, message)
          sendResponse(response)
        } catch (retryError) {
          sendResponse({ error: retryError.message })
        }
      } else {
        sendResponse({ error: error.message })
      }
    }
  })

  return true  // Keep message channel open for async response
})
