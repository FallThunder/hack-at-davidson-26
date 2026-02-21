const WEIGHTS = {
  factCheck: 0.25,
  rhetoric: 0.20,
  headlineAccuracy: 0.15,
  statistics: 0.15,
  sourceDiversity: 0.15,
  emotionalArc: 0.10
}

export function computeTrustScore(dimensionScores) {
  const score = Math.round(
    Object.entries(WEIGHTS).reduce(
      (sum, [key, weight]) => sum + (dimensionScores[key] ?? 50) * weight,
      0
    )
  )
  const tier = score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low'
  return { score, tier }
}

export function getScoreColor(score) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#eab308'
  return '#ef4444'
}

export function getTierLabel(tier) {
  return { high: 'High Trust', moderate: 'Moderate Trust', low: 'Low Trust' }[tier] ?? 'Unknown'
}
