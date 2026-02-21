import { useState, useEffect, useCallback } from 'react'

function sendToContent(message) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      resolve(null)
      return
    }
    chrome.runtime.sendMessage({ ...message, target: 'content' }, (response) => {
      if (chrome.runtime.lastError) resolve(null)
      else resolve(response)
    })
  })
}

export function useHighlights(flags) {
  const [highlightsVisible, setHighlightsVisible] = useState(true)
  const [highlightsApplied, setHighlightsApplied] = useState(false)

  // Apply highlights once when flags arrive
  useEffect(() => {
    if (!flags?.length || highlightsApplied) return
    sendToContent({ type: 'APPLY_HIGHLIGHTS', highlights: flags })
    setHighlightsApplied(true)
  }, [flags, highlightsApplied])

  const toggleHighlights = useCallback(() => {
    const next = !highlightsVisible
    setHighlightsVisible(next)
    sendToContent({ type: 'TOGGLE_HIGHLIGHTS', visible: next })
  }, [highlightsVisible])

  return { highlightsVisible, toggleHighlights, highlightsApplied }
}
