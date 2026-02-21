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

export function App() {
  // Dark mode: default to system preference, allow manual override
  const [darkMode, setDarkMode] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const { status, article, siteProfile, dimensions, flags, trustScore, startAnalysis } = useAnalysis()
  const { highlightsVisible, toggleHighlights, highlightsApplied } = useHighlights(flags)

  // Sync dark mode class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Auto-start analysis on mount
  useEffect(() => {
    startAnalysis()
  }, [])

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
          ) : isAnalyzing && (
            <div className="flex flex-col items-center py-5">
              <div className="w-36 h-36 rounded-full border-8 border-gray-200 dark:border-gray-700 animate-pulse" />
              <div className="mt-3 h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          )}

          {/* Site Profile */}
          {siteProfile && <SiteProfile {...siteProfile} />}

          {/* 6 Dimension Cards */}
          {(isAnalyzing || Object.keys(dimensions).length > 0) && (
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
                  .sort((a, b) => b.urgency - a.urgency)
                  .map((flag, i) => (
                    <FlagCard key={i} {...flag} />
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
