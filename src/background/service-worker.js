// Open the Evident side panel when the toolbar icon is clicked.
// Must call open() synchronously (before any await) or Chrome rejects: "may only be called in response to a user gesture"
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return
  chrome.sidePanel.open({ tabId: tab.id })
  chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: 'sidepanel/index.html',
    enabled: true
  }).catch(() => {})
})

// Relay messages: side panel sends { target: 'content', ...rest }
// Service worker finds the active tab and forwards to its content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      sendResponse({ error: error.message })
    }
  })

  return true  // Keep message channel open for async response
})
