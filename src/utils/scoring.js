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
//   1. Publisher factual-reporting score  (-20 to +20)
//   2. Political bias penalty             (0   to -12)
//   3. Content overall_factuality string  (-30 to  +8)
//   4. Content overall_tone string        (-20 to   0)
//   5. Per-flag deductions weighted by confidence
export function computeTrustScoreFromFlags(flags, siteProfile = null) {
  let score = 100

  // 1. Publisher factual reporting (0–100 → ±20 pts)
  if (siteProfile?.factual_reporting?.score != null) {
    score += (siteProfile.factual_reporting.score - 50) * 0.40
  }

  // 2. Political bias penalty (0–100 → 0 to −12 pts)
  if (siteProfile?.political_bias?.score != null) {
    score -= siteProfile.political_bias.score * 0.12
  }

  // 3. Content factuality string (−30 to +8 pts)
  if (siteProfile?.overall_factuality) {
    score += matchAdjustment(siteProfile.overall_factuality, FACTUALITY_ADJUSTMENTS)
  }

  // 4. Tone string (−20 to 0 pts)
  if (siteProfile?.overall_tone) {
    score += matchAdjustment(siteProfile.overall_tone, TONE_ADJUSTMENTS)
  }

  // 5. Flag deductions
  score -= flags.reduce((sum, flag) => {
    const urgency = Math.min(Math.max(flag.urgency, 1), 5)
    return sum + FLAG_DEDUCTIONS[urgency] * flag.confidence
  }, 0)

  const finalScore = Math.min(100, Math.max(5, Math.round(score)))
  return { score: finalScore, tier: finalScore >= 70 ? 'high' : finalScore >= 40 ? 'moderate' : 'low' }
}
