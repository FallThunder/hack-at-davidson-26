import { useState } from 'react'

const URGENCY_STYLES = {
  1: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800/50',
  2: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800/50',
  3: 'bg-orange-50 border-orange-200 dark:bg-orange-900/15 dark:border-orange-800/50',
  4: 'bg-red-50 border-red-200 dark:bg-red-900/15 dark:border-red-800/50',
  5: 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700/60'
}

export function FlagCard({ urgency, flag, confidence, excerpt, reasoning, sources = [] }) {
  const [expanded, setExpanded] = useState(false)

  const clampedUrgency = Math.min(Math.max(urgency, 1), 5)
  const fires = '🔥'.repeat(clampedUrgency)
  const confidencePct = Math.round((confidence ?? 0) * 100)
  const cardStyle = URGENCY_STYLES[clampedUrgency] ?? URGENCY_STYLES[3]

  return (
    <div className={`rounded-xl border p-4 ${cardStyle}`}>
      {/* Header: fires, flag type, confidence */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-sm leading-none" aria-label={`Urgency ${urgency} of 5`}>{fires}</span>
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
            {flag}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
          {confidencePct}% confident
        </span>
      </div>

      {/* Excerpt blockquote */}
      {excerpt && (
        <blockquote className="border-l-2 border-gray-400 dark:border-gray-500 pl-3 mb-2.5">
          <p className="text-xs italic text-gray-700 dark:text-gray-300 leading-relaxed">
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
