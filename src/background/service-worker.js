// Register click-to-open behavior on install/update (persists across service worker restarts)
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)
})

// When the active tab navigates to a new URL, notify the side panel to re-analyze
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url || !tab.active) return
  chrome.runtime.sendMessage({ type: 'PAGE_NAVIGATED', url: changeInfo.url }).catch(() => {})
})

// When the user switches tabs, re-analyze the newly active tab
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    chrome.runtime.sendMessage({ type: 'PAGE_NAVIGATED', url: tab.url }).catch(() => {})
  })
})

// Also open explicitly when the toolbar icon is clicked (covers first-run and fallback)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return
  await chrome.sidePanel.setOptions({ tabId: tab.id, path: 'sidepanel/index.html', enabled: true })
  await chrome.sidePanel.open({ tabId: tab.id })
})

// Detect side panel close via long-lived port and clear highlights.
// Port name is "sidepanel-<windowId>" so we query the exact window's active tab.
chrome.runtime.onConnect.addListener((port) => {
  if (!port.name.startsWith('sidepanel-')) return
  const windowId = parseInt(port.name.split('-')[1], 10)
  port.onDisconnect.addListener(() => {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
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
