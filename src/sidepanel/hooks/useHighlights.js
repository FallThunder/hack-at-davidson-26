import { useState, useEffect, useCallback } from 'react'

// Gets the tabId from the side panel's own window context — more reliable than
// letting the service worker guess with currentWindow:true, which can return the
// wrong window if the user has switched focus during a long analysis.
async function sendToContent(message) {
  if (typeof chrome === 'undefined' || !chrome.runtime) return null
  const tabs = await new Promise(r => chrome.tabs.query({ active: true, currentWindow: true }, r))
  const tabId = tabs[0]?.id
  if (!tabId) return null
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ ...message, target: 'content', tabId }, (response) => {
      if (chrome.runtime.lastError) resolve(null)
      else resolve(response)
    })
  })
}

export function useHighlights(flags) {
  const [highlightsVisible, setHighlightsVisible] = useState(true)
  const [highlightsApplied, setHighlightsApplied] = useState(false)

  // Apply highlights once when flags arrive; only mark applied on confirmed success
  useEffect(() => {
    if (!flags?.length || highlightsApplied) return
    let cancelled = false
    sendToContent({ type: 'APPLY_HIGHLIGHTS', highlights: flags }).then(response => {
      if (!cancelled && response?.success) setHighlightsApplied(true)
    })
    return () => { cancelled = true }
  }, [flags, highlightsApplied])

  const toggleHighlights = useCallback(() => {
    const next = !highlightsVisible
    setHighlightsVisible(next)
    sendToContent({ type: 'TOGGLE_HIGHLIGHTS', visible: next })
  }, [highlightsVisible])

  const scrollToFlag = useCallback((flagIndex) => {
    sendToContent({ type: 'SCROLL_TO_FLAG', flagIndex })
  }, [])

  // Called when the user navigates to a new article — clears old highlights from the page
  const resetHighlights = useCallback(() => {
    sendToContent({ type: 'CLEAR_HIGHLIGHTS' })
    setHighlightsApplied(false)
    setHighlightsVisible(true)
  }, [])

  return { highlightsVisible, toggleHighlights, highlightsApplied, scrollToFlag, resetHighlights }
}
