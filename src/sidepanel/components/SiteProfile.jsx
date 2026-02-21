export function SiteProfile({ domain, company, factual_reporting, political_bias, overall_tone, overall_factuality }) {
  const biasScore = political_bias?.score ?? 50
  const factualScore = factual_reporting?.score ?? 50

  // Color for overall factuality badge
  const factualityColor = {
    'High': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'Mostly Factual': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'Mixed': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Low': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'Misleading': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }[overall_factuality] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

  const toneColor = {
    'Sensationalist': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    'Neutral': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Opinion': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }[overall_tone] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 animate-fade-in-up">
      {/* Domain header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{domain}</p>
          {company && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{company}</p>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {overall_tone && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${toneColor}`}>
              {overall_tone}
            </span>
          )}
          {overall_factuality && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${factualityColor}`}>
              {overall_factuality}
            </span>
          )}
        </div>
      </div>

      {/* Political Bias bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400 dark:text-gray-500">Left</span>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Political Bias: {political_bias?.rating ?? '—'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">Right</span>
        </div>
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          {/* Gradient track */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-gray-300 to-red-400 opacity-30" />
          {/* Dot indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-gray-100 border-2 border-gray-500 dark:border-gray-300 shadow-sm"
            style={{ left: `calc(${biasScore}% - 7px)`, transition: 'left 0.8s ease-out' }}
          />
        </div>
      </div>

      {/* Factual Reporting bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400 dark:text-gray-500">Low</span>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Factual Reporting: {factual_reporting?.rating ?? '—'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">High</span>
        </div>
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-400 via-yellow-300 to-green-400"
            style={{ width: `${factualScore}%`, transition: 'width 0.8s ease-out' }}
          />
        </div>
      </div>
    </div>
  )
}
