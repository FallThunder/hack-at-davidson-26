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
  const tier = score >= 85 ? 'good' : score >= 70 ? 'mediocre' : score >= 55 ? 'acceptable' : 'poor'
  return { score, tier }
}

export function getScoreColor(score) {
  if (score >= 85) return '#22c55e'
  if (score >= 70) return '#eab308'
  if (score >= 55) return '#f97316'
  return '#ef4444'
}

export function getTierLabel(tier) {
  return {
    good: 'High Trust',
    mediocre: 'Mostly Reliable',
    acceptable: 'Partially Reliable',
    poor: 'Low Trust',
  }[tier] ?? 'Unknown'
}

// Flag urgency → point deduction (weighted by confidence)
const FLAG_DEDUCTIONS = { 5: 20, 4: 13, 3: 8, 2: 4, 1: 2 }

// overall_factuality string → point adjustment.
// Order matters: more specific strings must come before substrings they contain.
const FACTUALITY_ADJUSTMENTS = [
  ['highly factual',  8],
  ['mostly factual',  2],
  ['mostly false',  -15],
  ['factual',         5],
  ['false',         -25],
  ['mixed',          -5],
  ['satire',        -25],
  ['conspiracy',    -30],
  ['pseudoscience', -30],
]

// overall_tone string → point adjustment
const TONE_ADJUSTMENTS = [
  ['neutral',        0],
  ['analytical',     0],
  ['balanced',       0],
  ['informational',  0],
  ['opinion',       -5],
  ['sensational',  -12],
  ['inflammatory', -15],
  ['satirical',    -20],
  ['humorous',     -10],
]

function matchAdjustment(value, table) {
  const lower = value.toLowerCase()
  for (const [key, adj] of table) {
    if (lower.includes(key)) return adj
  }
  return 0
}

// Multi-factor trust score.
//   siteProfile — merged object from /publisher + /analyze responses, may be null.
//   flags       — array of { urgency, confidence } objects.
//
// Components (all additive from a 100 baseline):
//   1. Publisher factual-reporting score  (-20 to +20)  → normalized to 0–100
//   2. Political bias penalty             (0   to -12)  → neutrality 0–100
//   3. Content overall_factuality string  (-30 to  +8)  → normalized to 0–100
//   4. Content overall_tone string        (-20 to   0)  → normalized to 0–100
//   5. Per-flag deductions weighted by confidence       → claims health 0–100
export function computeTrustScoreFromFlags(flags, siteProfile = null) {
  let score = 100

  // 1. Publisher factual reporting (0–100 → ±20 pts)
  //    Component score: the raw 0–100 publisher reliability value (null if unavailable)
  const publisherScore = siteProfile?.factual_reporting?.score ?? null
  if (publisherScore != null) {
    score += (publisherScore - 50) * 0.40
  }

  // 2. Political bias penalty (0–100 → 0 to −12 pts)
  //    Neutrality = distance from center: 100 − 2×|biasScore − 50|
  //    Extreme Left (0) or Extreme Right (100) → neutrality 0; Center (50) → neutrality 100
  const neutralityScore = siteProfile?.political_bias?.score != null
    ? Math.round(100 - 2 * Math.abs(siteProfile.political_bias.score - 50))
    : null
  if (neutralityScore != null) {
    score -= (100 - neutralityScore) * 0.12
  }

  // 3. Content factuality string (−30 to +8 pts)
  //    Component score: normalized from [-30, +8] range to [0, 100] (null if unavailable)
  const factualityAdj = siteProfile?.overall_factuality != null
    ? matchAdjustment(siteProfile.overall_factuality, FACTUALITY_ADJUSTMENTS)
    : null
  const factualityScore = factualityAdj != null
    ? Math.round(Math.max(0, Math.min(100, (factualityAdj + 30) / 38 * 100)))
    : null
  if (factualityAdj != null) {
    score += factualityAdj
  }

  // 4. Tone string (−20 to 0 pts)
  //    Component score: normalized from [-20, 0] range to [0, 100] (null if unavailable)
  const toneAdj = siteProfile?.overall_tone != null
    ? matchAdjustment(siteProfile.overall_tone, TONE_ADJUSTMENTS)
    : null
  const toneScore = toneAdj != null
    ? Math.round(Math.max(0, Math.min(100, (toneAdj + 20) / 20 * 100)))
    : null
  if (toneAdj != null) {
    score += toneAdj
  }

  // 5. Flag deductions
  //    Component score: 100 minus total penalty (clamped); 100 = no flags, lower = more/worse flags
  const flagPenalty = flags.reduce((sum, flag) => {
    const urgency = Math.min(Math.max(flag.urgency, 1), 5)
    return sum + FLAG_DEDUCTIONS[urgency] * flag.confidence
  }, 0)
  score -= flagPenalty
  const claimsScore = Math.max(5, Math.min(100, Math.round(100 - flagPenalty)))

  const finalScore = Math.min(100, Math.max(5, Math.round(score)))
  const tier = finalScore >= 85 ? 'good' : finalScore >= 70 ? 'mediocre' : finalScore >= 55 ? 'acceptable' : 'poor'

  // Component breakdown for the ring visualization in TrustMeter.
  // delta: actual pts this component added/subtracted from the 100-pt baseline.
  const components = [
    { key: 'publisher',  label: 'Pub.',   fullLabel: 'Publisher',      weight: 0.25, score: publisherScore,
      delta: publisherScore != null ? Math.round((publisherScore - 50) * 0.40) : null },
    { key: 'neutrality', label: 'Bias',   fullLabel: 'Bias Neutrality', weight: 0.15, score: neutralityScore,
      delta: neutralityScore != null ? -Math.round((100 - neutralityScore) * 0.12) : null },
    { key: 'factuality', label: 'Facts',  fullLabel: 'Factuality',     weight: 0.25, score: factualityScore,
      delta: factualityAdj },
    { key: 'tone',       label: 'Tone',   fullLabel: 'Tone',           weight: 0.15, score: toneScore,
      delta: toneAdj },
    { key: 'claims',     label: 'Claims', fullLabel: 'Claim Accuracy', weight: 0.20, score: claimsScore,
      delta: -Math.round(flagPenalty) },
  ]

  return { score: finalScore, tier, components }
}
