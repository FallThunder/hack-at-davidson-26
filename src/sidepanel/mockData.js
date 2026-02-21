import example2 from '../../exampleFiles/example2/example2.json'
import example3 from '../../exampleFiles/example3/example3.json'

function adaptExample(json) {
  return {
    siteProfile: {
      domain: json.site_profile.domain,
      company: json.site_profile.company,
      factual_reporting: json.site_profile.factual_reporting,
      political_bias: json.site_profile.political_bias,
      overall_tone: json.content_analysis.overall_tone,
      overall_factuality: json.content_analysis.overall_factuality
    },
    flags: json.content_analysis.flags,
    dimensions: json.content_analysis.dimensions ?? []
  }
}

// Keyed by the exact article URL stored in each example file
export const MOCK_BY_URL = {
  [example2.url]: adaptExample(example2),
  [example3.url]: adaptExample(example3)
}
