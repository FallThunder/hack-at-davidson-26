import { useState, useEffect, useRef } from 'react'

const URGENCY_STYLES = {
  1: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800/50',
  2: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800/50',
  3: 'bg-orange-50 border-orange-200 dark:bg-orange-900/15 dark:border-orange-800/50',
  4: 'bg-red-50 border-red-200 dark:bg-red-900/15 dark:border-red-800/50',
  5: 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700/60'
}

const URGENCY_DOT_COLORS = {
  1: 'bg-yellow-400',
  2: 'bg-yellow-400',
  3: 'bg-orange-500',
  4: 'bg-red-500',
  5: 'bg-red-600'
}

const URGENCY_SEMANTIC = {
  1: 'very low',
  2: 'low',
  3: 'moderate',
  4: 'high',
  5: 'critical'
}

export function FlagCard({ urgency, flag, confidence, excerpt, reasoning, sources = [], isActive = false, onScrollToArticle, onActivate }) {
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef(null)

  const clampedUrgency = Math.min(Math.max(urgency, 1), 5)
  const confidencePct = Math.round((confidence ?? 0) * 100)
  const cardStyle = URGENCY_STYLES[clampedUrgency] ?? URGENCY_STYLES[3]
  const dotColor = URGENCY_DOT_COLORS[clampedUrgency] ?? URGENCY_DOT_COLORS[3]

  // When active (clicked from article), expand and scroll into view
  useEffect(() => {
    if (!isActive) return
    setExpanded(true)
    cardRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center'
    })
  }, [isActive])

  function handleCardKeyDown(e) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate?.()
    }
  }

  function handleExcerptKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onScrollToArticle?.()
    }
  }

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      className={[
        'rounded-xl border p-4 transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-500',
        cardStyle,
        isActive ? 'ring-2 ring-indigo-400 dark:ring-indigo-500 shadow-md' : ''
      ].join(' ')}
      onClick={onActivate}
      onKeyDown={handleCardKeyDown}
      aria-pressed={isActive}
    >
      {/* Header: urgency dot, flag type, confidence */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="flex items-center gap-1 shrink-0" aria-label={`Urgency: ${clampedUrgency} of 5 — ${URGENCY_SEMANTIC[clampedUrgency]}`}>
            <span className={`w-2 h-2 rounded-full ${dotColor}`} aria-hidden="true" />
            <span className="text-xs font-semibold tabular-nums text-gray-400 dark:text-gray-500" aria-hidden="true">
              {clampedUrgency}/5
            </span>
          </span>
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
            {flag}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
          {confidencePct}% confident
        </span>
      </div>

      {/* Excerpt blockquote — click to scroll to the highlighted span in the article */}
      {excerpt && (
        <blockquote
          className={[
            'border-l-2 border-gray-400 dark:border-gray-500 pl-3 mb-2.5',
            onScrollToArticle ? 'cursor-pointer group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 rounded' : ''
          ].join(' ')}
          role={onScrollToArticle ? 'button' : undefined}
          tabIndex={onScrollToArticle ? 0 : undefined}
          aria-label={onScrollToArticle ? 'Jump to this passage in the article' : undefined}
          onClick={onScrollToArticle}
          onKeyDown={onScrollToArticle ? handleExcerptKeyDown : undefined}
        >
          <p className={[
            'text-xs italic text-gray-700 dark:text-gray-300 leading-relaxed',
            onScrollToArticle ? 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-150' : ''
          ].join(' ')}>
            &ldquo;{excerpt}&rdquo;
          </p>
        </blockquote>
      )}

      {/* Reasoning — expandable */}
      {reasoning && (
        <>
          <p className={`text-xs text-gray-600 dark:text-gray-400 leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
            {reasoning}
          </p>
          {reasoning.length > 100 && (
            <button
              onClick={() => setExpanded(e => !e)}
              aria-expanded={expanded}
              className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 mt-1 font-medium"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
            Sources
          </p>
          {sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline truncate mb-0.5"
            >
              {source.title}
              {source.publisher && (
                <span className="text-gray-400 dark:text-gray-500"> — {source.publisher}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
