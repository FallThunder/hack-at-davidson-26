import { useState, useEffect } from 'react'
import { getScoreColor, getTierLabel } from '../../utils/scoring.js'

const RADIUS = 45
const CX = 70
const CY = 70
const CIRCUMFERENCE = 2 * Math.PI * RADIUS  // ≈ 282.7
// Gap must exceed strokeWidth (9) so rounded caps don't overlap: 12 − 2×4.5 = 3 units of real gap
const SEGMENT_GAP = 12
const LABEL_RADIUS = 58
const DOT_R = 2.5

// Convert arc position (px clockwise from 12 o'clock) to SVG {x, y} at radius r.
function posToXY(pos, r) {
  const θ = (pos / CIRCUMFERENCE) * 2 * Math.PI
  return { x: CX + r * Math.sin(θ), y: CY - r * Math.cos(θ) }
}

// SVG arc path for a segment [startPos, startPos+len] at RADIUS.
function arcPath(startPos, len) {
  const { x: x1, y: y1 } = posToXY(startPos, RADIUS)
  const { x: x2, y: y2 } = posToXY(startPos + len, RADIUS)
  const largeArc = (len / CIRCUMFERENCE) * 2 * Math.PI > Math.PI ? 1 : 0
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`
}

function buildSegments(components) {
  const totalGap = components.length * SEGMENT_GAP
  const availableArc = CIRCUMFERENCE - totalGap
  let pos = 0

  return components.map(({ key, label, fullLabel, weight, score, delta }) => {
    const len = availableArc * weight
    const startPos = pos
    pos += len + SEGMENT_GAP

    const dot = posToXY(startPos, RADIUS)
    const midPos = startPos + len / 2
    const midθ = (midPos / CIRCUMFERENCE) * 2 * Math.PI
    const sinM = Math.sin(midθ)
    const cosM = Math.cos(midθ)
    const labelXY = posToXY(midPos, LABEL_RADIUS)

    return {
      key, label, fullLabel, score, delta, startPos, len, dot, labelXY,
      textAnchor: sinM > 0.35 ? 'start' : sinM < -0.35 ? 'end' : 'middle',
      dominantBaseline: cosM > 0.35 ? 'auto' : cosM < -0.35 ? 'hanging' : 'central',
    }
  })
}

export function TrustMeter({ score, tier, components }) {
  const [displayScore, setDisplayScore] = useState(0)
  const [ringHovered, setRingHovered] = useState(false)
  const [hoveredKey, setHoveredKey] = useState(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayScore(score)
      return
    }
    const duration = 1200
    const startTime = performance.now()
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score])

  const arcColor = getScoreColor(score)
  const tierLabel = getTierLabel(tier)
  const segments = components ? buildSegments(components) : null
  const hoveredSeg = hoveredKey ? segments?.find(s => s.key === hoveredKey) : null
  const showBreakdown = ringHovered && segments != null

  return (
    <div
      className="flex flex-col items-center py-5 motion-safe:animate-fade-in-up"
      aria-label={`Trust Score: ${score} out of 100. ${tierLabel}.`}
    >
      <div
        className="relative w-52 h-52"
        tabIndex={segments ? 0 : undefined}
        onFocus={segments ? () => setRingHovered(true) : undefined}
        onBlur={segments ? () => { setRingHovered(false); setHoveredKey(null) } : undefined}
      >
        <svg viewBox="0 0 140 140" className="w-full h-full" aria-hidden="true">
          {/*
            Outer <g> owns the circular hover boundary. The transparent filled circle
            (r=65, ~97px from center in the rendered 208px div) makes the entire disk
            interactive — so the hover area matches the ring shape, not the square div.
            Using SVG hit-testing instead of clip-path keeps labels visible.
          */}
          <g
            onMouseEnter={() => setRingHovered(true)}
            onMouseLeave={() => { setRingHovered(false); setHoveredKey(null) }}
          >
            {/* Transparent disk — provides circular hit area including the center region */}
            <circle cx={CX} cy={CY} r={65} fill="rgba(0,0,0,0)" style={{ pointerEvents: 'all' }} />

            {/* Default mode: single overall-score arc — fades out on hover */}
            <g style={{ opacity: showBreakdown ? 0 : 1, transition: 'opacity 0.3s ease', pointerEvents: showBreakdown ? 'none' : 'auto' }}>
              <circle
                cx={CX} cy={CY} r={RADIUS}
                fill="none" stroke="currentColor" strokeWidth="9"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx={CX} cy={CY} r={RADIUS}
                fill="none" stroke={arcColor} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - score / 100)}
                transform={`rotate(-90 ${CX} ${CY})`}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </g>

            {/* Breakdown mode: segmented tracks + filled bars + labels — fades in on hover */}
            {segments && (
              <g style={{ opacity: showBreakdown ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: showBreakdown ? 'auto' : 'none' }}>
                {segments.map(({ key, label, score: compScore, startPos, len, dot, labelXY, textAnchor, dominantBaseline }) => {
                const segColor = compScore != null ? getScoreColor(compScore) : '#d1d5db'
                const isHovered = hoveredKey === key
                const dimmed = hoveredKey !== null && !isHovered
                return (
                    <g key={key} style={{ transition: 'opacity 0.15s', opacity: dimmed ? 0.35 : 1 }}>
                      {/* Dimmed full track */}
                      <path
                        d={arcPath(startPos, len)}
                        fill="none" stroke={segColor} strokeWidth="9" strokeLinecap="round"
                        opacity="0.2"
                      />
                      {/* Filled portion proportional to component score */}
                      {compScore != null && (
                        <path
                          d={arcPath(startPos, (compScore / 100) * len)}
                          fill="none" stroke={segColor} strokeWidth="9" strokeLinecap="round"
                        />
                      )}
                      {/* Wide invisible hit target */}
                      <path
                        d={arcPath(startPos, len)}
                        fill="none" stroke="transparent" strokeWidth="20" strokeLinecap="round"
                        onMouseEnter={() => setHoveredKey(key)}
                        onMouseLeave={() => setHoveredKey(null)}
                        style={{ cursor: 'default' }}
                      />
                      <circle cx={dot.x} cy={dot.y} r={DOT_R} fill={segColor} />
                      <text
                        x={labelXY.x} y={labelXY.y}
                        fontSize="5.5" fill="currentColor"
                        textAnchor={textAnchor} dominantBaseline={dominantBaseline}
                        className="text-gray-500 dark:text-gray-400"
                      >
                        {label}
                      </text>
                    </g>
                  )
                })}
              </g>
            )}
          </g>
        </svg>

        {/* Center overlay — score normally, component info when hovering a segment */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
          {hoveredSeg ? (
            <>
              <span
                className="text-xs font-semibold text-center leading-tight px-4"
                style={{ color: hoveredSeg.score != null ? getScoreColor(hoveredSeg.score) : '#9ca3af' }}
              >
                {hoveredSeg.fullLabel}
              </span>
              {hoveredSeg.score != null && (
                <span className="text-lg font-bold leading-none" style={{ color: getScoreColor(hoveredSeg.score) }}>
                  {hoveredSeg.score}
                  <span className="text-xs font-normal text-gray-400 dark:text-gray-500">/100</span>
                </span>
              )}
              {hoveredSeg.delta != null && (
                <span
                  className="text-xs font-medium tabular-nums"
                  style={{ color: hoveredSeg.delta > 0 ? '#22c55e' : hoveredSeg.delta < 0 ? '#ef4444' : '#9ca3af' }}
                >
                  {hoveredSeg.delta > 0 ? '+' : ''}{hoveredSeg.delta} pts
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-3xl font-bold leading-none" style={{ color: arcColor }}>
                {displayScore}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">/100</span>
            </>
          )}
        </div>
      </div>

      <p className="mt-2.5 text-base font-bold tracking-tight" style={{ color: arcColor }}>
        {tierLabel}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Article Trust Score</p>
      {segments && (
        <p
          className="text-xs text-gray-300 dark:text-gray-600 mt-0.5"
          style={{ opacity: ringHovered ? 0 : 1, transition: 'opacity 0.3s ease' }}
        >
          Hover or focus ring to see breakdown
        </p>
      )}
    </div>
  )
}
