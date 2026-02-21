import { useState, useEffect } from 'react'
import { getScoreColor, getTierLabel } from '../../utils/scoring.js'

const RADIUS = 45
const CIRCUMFERENCE = 2 * Math.PI * RADIUS  // ≈ 282.7

export function TrustMeter({ score, tier }) {
  const [displayScore, setDisplayScore] = useState(0)

  // Animate the number counting up
  useEffect(() => {
    const duration = 1200
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [score])

  const arcColor = getScoreColor(score)
  const tierLabel = getTierLabel(tier)
  // strokeDashoffset: full circle = CIRCUMFERENCE (empty arc), 0 = full arc
  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE

  return (
    <div className="flex flex-col items-center py-5 animate-fade-in-up">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
          {/* Background track */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Score arc */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke={arcColor}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>

        {/* Number in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold leading-none"
            style={{ color: arcColor }}
          >
            {displayScore}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">/100</span>
        </div>
      </div>

      <p
        className="mt-2.5 text-base font-bold tracking-tight"
        style={{ color: arcColor }}
      >
        {tierLabel}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Trust Score</p>
    </div>
  )
}
