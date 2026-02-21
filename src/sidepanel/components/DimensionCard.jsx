const DIMENSION_META = {
  factCheck:        { title: 'Fact Check',        icon: '🔍' },
  rhetoric:         { title: 'Rhetoric',           icon: '💬' },
  headlineAccuracy: { title: 'Headline Accuracy',  icon: '📰' },
  statistics:       { title: 'Statistics',         icon: '📊' },
  sourceDiversity:  { title: 'Source Diversity',   icon: '🔗' },
  emotionalArc:     { title: 'Emotional Arc',      icon: '📈' }
}

function scoreBadgeClass(score) {
  if (score >= 70) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

export function DimensionCard({ dimension, score, label, summary }) {
  const meta = DIMENSION_META[dimension] ?? { title: dimension, icon: '⚙️' }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">{meta.icon}</span>
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {meta.title}
          </span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreBadgeClass(score)}`}>
          {score}
        </span>
      </div>

      {label && (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      )}

      {summary && (
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{summary}</p>
      )}
    </div>
  )
}
