// Firefox detection: Firefox exposes a global `browser` object; Chrome does not.
const isFirefox = typeof browser !== 'undefined'

// Register click-to-open behavior on install/update (persists across service worker restarts)
// In Firefox, sidebar_action handles the click behavior automatically — no equivalent API needed.
chrome.runtime.onInstalled.addListener(() => {
  if (!isFirefox) chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)
})

// Close the side panel when the user navigates to a new URL (different article).
// Same-URL refreshes keep the panel open and re-analyze.
// changeInfo.url fires on navigation; changeInfo.status === 'complete' catches
// same-URL refreshes where the URL doesn't change but the page reloads.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active) return
  if (changeInfo.url) {
    if (!isFirefox) {
      // Chrome: close the panel so the user can choose when to open it on the new article
      chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => {})
    } else {
      // Firefox: can't close the sidebar programmatically — send PAGE_NAVIGATED so the
      // sidebar stays open and automatically re-analyzes the new article
      chrome.runtime.sendMessage({ type: 'PAGE_NAVIGATED', url: changeInfo.url }).catch(() => {})
    }
  } else if (changeInfo.status === 'complete') {
    // Same-URL refresh — keep panel open and re-analyze
    chrome.runtime.sendMessage({ type: 'PAGE_NAVIGATED', url: tab.url }).catch(() => {})
  }
})

// When the user switches tabs, notify the side panel (source: 'tabSwitch' so it can use cached results)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    chrome.runtime.sendMessage({ type: 'PAGE_NAVIGATED', url: tab.url, source: 'tabSwitch' }).catch(() => {})
  })
})

// Open/toggle the panel when the toolbar icon is clicked.
// Chrome: open the side panel (covers first-run and fallback).
// Firefox: toggle the sidebar — sidebar_action handles the default open behavior,
//   but this gives an explicit toggle from the toolbar icon too.
// Do NOT await setOptions before open in Chrome — awaiting consumes the user gesture token
// and causes "sidePanel.open() may only be called in response to a user gesture".
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return
  if (!isFirefox) {
    chrome.sidePanel.setOptions({ tabId: tab.id, path: 'sidepanel/index.html', enabled: true }).catch(() => {})
    chrome.sidePanel.open({ tabId: tab.id }).catch(console.error)
  } else {
    browser.sidebarAction.toggle().catch(console.error)
  }
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

  // Toolbar icon by trust score (side panel → background)
  if (message.type === 'SET_ICON_BY_SCORE') {
    const color = message.tier === 'high' ? 'green' : message.tier === 'low' ? 'red' : 'yellow'

    async function loadImageData(size) {
      const url = chrome.runtime.getURL(`icons/icon${size}-${color}.png`)
      const res = await fetch(url)
      const blob = await res.blob()
      const bitmap = await createImageBitmap(blob)
      const canvas = new OffscreenCanvas(size, size)
      canvas.getContext('2d').drawImage(bitmap, 0, 0, size, size)
      return canvas.getContext('2d').getImageData(0, 0, size, size)
    }

    async function doSet(tabId) {
      try {
        const [img16, img48] = await Promise.all([loadImageData(16), loadImageData(48)])
        const opts = { imageData: { 16: img16, 48: img48 } }
        if (tabId != null) opts.tabId = tabId
        await chrome.action.setIcon(opts)
      } catch (err) {
        console.error('Evident setIcon failed', err)
      }
      sendResponse({ ok: true })
    }

    if (message.tabId != null) {
      doSet(message.tabId)
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => doSet(tabs[0]?.id))
    }
    return true
  }

  if (message.target !== 'content') return

  // tabId is provided by the side panel (queried from its own window context),
  // which is more reliable than querying currentWindow from the service worker
  // when the user may have switched focus to another window.
  const tabId = message.tabId
  if (!tabId) {
    sendResponse({ error: 'No tab ID provided' })
    return
  }

  ;(async () => {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message)
      sendResponse(response)
    } catch (error) {
      // Content script not present (e.g. extension reloaded without refreshing page)
      // Re-inject it programmatically and retry once
      if (error.message?.includes('Receiving end does not exist')) {
        try {
          await chrome.scripting.executeScript({ target: { tabId }, files: ['content/content.js'] })
          await chrome.scripting.insertCSS({ target: { tabId }, files: ['content/highlight.css'] })
          const response = await chrome.tabs.sendMessage(tabId, message)
          sendResponse(response)
        } catch (retryError) {
          sendResponse({ error: retryError.message })
        }
      } else {
        sendResponse({ error: error.message })
      }
    }
  })()

  return true  // Keep message channel open for async response
})
