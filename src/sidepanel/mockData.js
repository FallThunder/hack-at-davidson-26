import exampleJson from '../../example.json'

export const MOCK_SITE_PROFILE = {
  domain: exampleJson.site_profile.domain,
  company: exampleJson.site_profile.company,
  factual_reporting: exampleJson.site_profile.factual_reporting,
  political_bias: exampleJson.site_profile.political_bias,
  overall_tone: exampleJson.content_analysis.overall_tone,
  overall_factuality: exampleJson.content_analysis.overall_factuality
}

export const MOCK_FLAGS = exampleJson.content_analysis.flags

export const MOCK_DIMENSIONS = [
  {
    dimension: 'factCheck',
    score: 28,
    label: 'Multiple False Claims',
    summary: 'Several factual claims are directly contradicted by court rulings and independent scientific consensus, including the classification of CO₂ under the Clean Air Act.'
  },
  {
    dimension: 'rhetoric',
    score: 35,
    label: 'Heavy Fear Appeals',
    summary: 'The article uses loaded language ("crushing regulations", "travesty", "graft") and appeals to economic anxiety throughout, with limited balanced counterpoint.'
  },
  {
    dimension: 'headlineAccuracy',
    score: 62,
    label: 'Partially Accurate',
    summary: 'The headline frames the policy repeal as a clear "triumph," overstating certainty. The article itself contains contested claims that complicate this framing.'
  },
  {
    dimension: 'statistics',
    score: 31,
    label: 'Unverified Figures',
    summary: 'The $1.3 trillion savings figure originates from an EPA press release and has not been independently verified. Multiple economists contest the methodology.'
  },
  {
    dimension: 'sourceDiversity',
    score: 22,
    label: 'Single Perspective',
    summary: 'Sources are primarily administration officials and partisan outlets. No independent scientists, economists, or opposing viewpoints are quoted or cited.'
  },
  {
    dimension: 'emotionalArc',
    score: 20,
    label: 'High Escalation',
    summary: 'The article escalates in emotional intensity toward the end, culminating in appeals to patriotism and economic victimhood without proportionate evidence.'
  }
]
