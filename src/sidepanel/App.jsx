import { useEffect, useState, useCallback } from 'react'
import { useAnalysis } from './hooks/useAnalysis.js'
import { saveUserDomain } from '../utils/newsDomains.js'
import { useHighlights } from './hooks/useHighlights.js'
import { Header } from './components/Header.jsx'
import { SiteProfile } from './components/SiteProfile.jsx'
import { TrustMeter } from './components/TrustMeter.jsx'
import { DimensionCard } from './components/DimensionCard.jsx'
import { SkeletonCard, SkeletonSiteProfile, SkeletonFlagCard } from './components/SkeletonCard.jsx'
import { FlagCard } from './components/FlagCard.jsx'
import { HighlightToggle } from './components/HighlightToggle.jsx'

const STATUS_MESSAGES = [
  'Reading article...',
  'Analyzing article...',
  'Checking factual claims...',
  'Evaluating sources...',
  'Assessing rhetoric...',
  'Reviewing statistics...',
]

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

  const { status, article, siteProfile, dimensions, flags, trustScore, startAnalysis, hasDimensions, unsupportedDomain, notAnArticle, slowWarning } = useAnalysis()
  const { highlightsVisible, toggleHighlights, highlightsApplied, scrollToFlag, resetHighlights } = useHighlights(flags)

  const [statusMsgIdx, setStatusMsgIdx] = useState(0)

  // Cycle status message while loading
  useEffect(() => {
    if (status !== 'extracting' && status !== 'analyzing') {
      setStatusMsgIdx(0)
      return
    }
    const interval = setInterval(() => {
      setStatusMsgIdx(i => (i + 1) % STATUS_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [status])

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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) return
      chrome.runtime.sendMessage({ type: 'SET_DARK_MODE', dark: darkMode, target: 'content', tabId })
    })
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

  const handleAddDomain = useCallback(async () => {
    if (!unsupportedDomain) return
    await saveUserDomain(unsupportedDomain)
    startAnalysis()
  }, [unsupportedDomain, startAnalysis])

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
              {notAnArticle ? (
                <>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    This looks like a homepage or category page.
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    Navigate to a specific article to analyze it.
                  </p>
                  <button
                    onClick={() => startAnalysis(false, true)}
                    className="mt-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors duration-150"
                  >
                    Analyze anyway
                  </button>
                </>
              ) : unsupportedDomain ? (
                <>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {unsupportedDomain} is not in your news sites list.
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    Add it to analyze articles from this site.
                  </p>
                  <button
                    onClick={handleAddDomain}
                    className="mt-1 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium transition-colors duration-150"
                  >
                    Add {unsupportedDomain}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    No analysis available for this page.
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    Navigate to a news article to see Evident in action.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Status line — visible during extraction and analysis */}
          {isAnalyzing && (
            <div className="flex items-center gap-2.5 px-0.5">
              <svg className="animate-spin shrink-0 w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span key={statusMsgIdx} className="text-sm text-gray-500 dark:text-gray-400 animate-fade-in-up">
                {STATUS_MESSAGES[statusMsgIdx]}
              </span>
            </div>
          )}

          {/* Slow-response warning */}
          {slowWarning && isAnalyzing && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Analysis is taking longer than usual. The server may be busy — please wait a moment or try refreshing the page.
            </div>
          )}

          {/* Trust Meter — skeleton while analyzing, real meter once score arrives */}
          {trustScore ? (
            <TrustMeter score={trustScore.score} tier={trustScore.tier} />
          ) : isAnalyzing && (
            <div className="flex flex-col items-center py-5">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="9" className="text-gray-200 dark:text-gray-700" />
                  <circle
                    cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="9"
                    strokeLinecap="round" strokeDasharray="70 213"
                    className="text-indigo-400 dark:text-indigo-500 animate-spin origin-center"
                    style={{ animationDuration: '2s' }}
                  />
                </svg>
              </div>
              <div className="mt-3 h-3 w-24 skeleton-shimmer rounded" />
            </div>
          )}

          {/* Site Profile — skeleton while publisher data loads */}
          {siteProfile
            ? <SiteProfile {...siteProfile} />
            : isAnalyzing && <SkeletonSiteProfile />
          }

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

          {/* Fact Flags — skeleton while analyzing, real cards once flags arrive, empty state if none */}
          {flags.length > 0 ? (
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
          ) : status === 'complete' ? (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-0.5">
                Fact Flags
              </p>
              <div className="flex flex-col items-center py-5 text-center gap-2">
                <svg className="w-8 h-8 text-green-400 dark:text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">No significant issues found.</p>
              </div>
            </div>
          ) : isAnalyzing && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-0.5">
                Fact Flags
              </p>
              <div className="space-y-2.5">
                <SkeletonFlagCard />
                <SkeletonFlagCard />
                <SkeletonFlagCard />
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
