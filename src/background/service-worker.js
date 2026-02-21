// Open the Evident side panel when the toolbar icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return
  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: 'sidepanel/index.html',
    enabled: true
  })
  await chrome.sidePanel.open({ tabId: tab.id })
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
