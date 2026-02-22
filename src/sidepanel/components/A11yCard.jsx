const TIERS = [
  { min: 90, label: 'Excellent', color: '#22c55e' },
  { min: 75, label: 'Good',      color: '#84cc16' },
  { min: 50, label: 'Fair',      color: '#f97316' },
  { min: 0,  label: 'Poor',      color: '#ef4444' },
]

export function A11yCard({ a11yScore }) {
  const { score, issues } = a11yScore
  const tier = TIERS.find(t => score >= t.min)

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          Page Accessibility
        </span>
        <span className="text-sm font-bold" style={{ color: tier.color }}>
          {score}/100 · {tier.label}
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: tier.color }}
        />
      </div>

      {/* Issues list */}
      {issues.length > 0 ? (
        <ul className="space-y-0.5">
          {issues.map(issue => (
            <li key={issue.type} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{issue.message}</span>
              {issue.count > 1 && (
                <span className="font-medium text-gray-400 dark:text-gray-500">×{issue.count}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-green-500">No accessibility issues detected</p>
      )}
    </div>
  )
}
