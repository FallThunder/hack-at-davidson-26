import { useEffect, useState } from 'react'
import { useAnalysis } from './hooks/useAnalysis.js'
import { useHighlights } from './hooks/useHighlights.js'
import { Header } from './components/Header.jsx'
import { SiteProfile } from './components/SiteProfile.jsx'
import { TrustMeter } from './components/TrustMeter.jsx'
import { DimensionCard } from './components/DimensionCard.jsx'
import { SkeletonCard } from './components/SkeletonCard.jsx'
import { FlagCard } from './components/FlagCard.jsx'
import { HighlightToggle } from './components/HighlightToggle.jsx'

const DIMENSION_ORDER = [
  'factCheck',
  'rhetoric',
  'headlineAccuracy',
  'statistics',
  'sourceDiversity',
  'emotionalArc'
]

const DARK_MODE_STORAGE_KEY = 'evident-dark-mode'

function getInitialDarkMode() {
  try {
    const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch (_) {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function App() {
  // Dark mode: persisted in localStorage, fallback to system preference
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)
  // Original-array index of the flag that was clicked in the article
  const [activeFlag, setActiveFlag] = useState(null)

  const { status, article, siteProfile, dimensions, flags, trustScore, startAnalysis, hasDimensions } = useAnalysis()
  const { highlightsVisible, toggleHighlights, highlightsApplied, scrollToFlag, resetHighlights } = useHighlights(flags)

  // Sync dark mode class to side panel <html> and persist to localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    try {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, darkMode ? 'true' : 'false')
    } catch (_) {}
  }, [darkMode])

  // Sync dark mode to article page tooltips/popover
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return
    chrome.runtime.sendMessage({ type: 'SET_DARK_MODE', dark: darkMode, target: 'content' })
  }, [darkMode])

  // Open a long-lived port so the service worker can detect when the panel closes.
  // Embed the window ID in the port name so the service worker knows exactly
  // which window's active tab to clear highlights on disconnect.
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return
    let port
    chrome.windows.getCurrent(win => {
      port = chrome.runtime.connect({ name: `sidepanel-${win.id}` })
    })
    return () => port?.disconnect()
  }, [])

  // Auto-start analysis on mount
  useEffect(() => {
    startAnalysis()
  }, [])

  // Listen for messages from the content script and service worker
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return
    const handler = (message) => {
      if (message.type === 'HIGHLIGHT_CLICKED') {
        setActiveFlag(message.flagIndex)
      }
      if (message.type === 'PAGE_NAVIGATED') {
        setActiveFlag(null)
        resetHighlights()
        startAnalysis(message.source === 'tabSwitch')
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [resetHighlights, startAnalysis])

  // Reset active flag when a new set of flags arrives
  useEffect(() => {
    setActiveFlag(null)
  }, [flags])

  // Set toolbar icon by trust score when analysis completes
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
    if (status !== 'complete' || !trustScore?.tier) return
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      chrome.runtime.sendMessage({
        type: 'SET_ICON_BY_SCORE',
        tier: trustScore.tier,
        tabId
      }).catch(() => {})
    })
  }, [status, trustScore])

  const isAnalyzing = status === 'extracting' || status === 'analyzing'

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode(d => !d)} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">

          {/* Article URL */}
          {article?.url && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate px-0.5" title={article.url}>
              {article.url}
            </p>
          )}

          {/* Unsupported page */}
          {status === 'unsupported' && (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-3">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No analysis available for this page.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                Navigate to a news article to see Evident in action.
              </p>
            </div>
          )}

          {/* Extracting state */}
          {status === 'extracting' && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-0.5">
              <svg className="animate-spin w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Reading article…
            </div>
          )}

          {/* Trust Meter — only after all 6 dimensions complete */}
          {trustScore ? (
            <TrustMeter score={trustScore.score} tier={trustScore.tier} />
          ) : hasDimensions && isAnalyzing && (
            <div className="flex flex-col items-center py-5">
              <div className="w-36 h-36 rounded-full border-8 border-gray-200 dark:border-gray-700 animate-pulse" />
              <div className="mt-3 h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          )}

          {/* Site Profile */}
          {siteProfile && <SiteProfile {...siteProfile} />}

          {/* 6 Dimension Cards */}
          {hasDimensions && (isAnalyzing || Object.keys(dimensions).length > 0) && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-0.5">
                Analysis
              </p>
              <div className="space-y-2.5">
                {DIMENSION_ORDER.map(key => {
                  const result = dimensions[key]
                  return result
                    ? <DimensionCard key={key} {...result} />
                    : <SkeletonCard key={key} />
                })}
              </div>
            </div>
          )}

          {/* Fact Flags */}
          {flags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-0.5">
                Fact Flags
              </p>
              <div className="space-y-2.5">
                {[...flags]
                  .map((flag, originalIndex) => ({ ...flag, originalIndex }))
                  .sort((a, b) => b.urgency - a.urgency)
                  .map((flag) => (
                    <FlagCard
                      key={flag.originalIndex}
                      {...flag}
                      isActive={activeFlag === flag.originalIndex}
                      onActivate={() => setActiveFlag(flag.originalIndex)}
                      onScrollToArticle={highlightsApplied ? () => scrollToFlag(flag.originalIndex) : undefined}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Spacer so content clears the sticky button */}
          <div className="h-4" />
        </div>
      </div>

      <HighlightToggle
        visible={highlightsVisible}
        onToggle={toggleHighlights}
        disabled={!highlightsApplied}
      />
    </div>
  )
}
