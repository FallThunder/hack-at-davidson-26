import exampleJson from '../../exampleFiles/example2/example2.json'

export const MOCK_SITE_PROFILE = {
  domain: exampleJson.site_profile.domain,
  company: exampleJson.site_profile.company,
  factual_reporting: exampleJson.site_profile.factual_reporting,
  political_bias: exampleJson.site_profile.political_bias,
  overall_tone: exampleJson.content_analysis.overall_tone,
  overall_factuality: exampleJson.content_analysis.overall_factuality
}

export const MOCK_FLAGS = exampleJson.content_analysis.flags

export const MOCK_DIMENSIONS = exampleJson.content_analysis.dimensions ?? []
