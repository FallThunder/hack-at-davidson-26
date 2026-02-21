import { useReducer, useCallback, useRef } from 'react'
import { computeTrustScore } from '../../utils/scoring.js'
import { MOCK_BY_URL } from '../mockData.js'

const DIMENSION_ORDER = [
  'factCheck',
  'rhetoric',
  'headlineAccuracy',
  'statistics',
  'sourceDiversity',
  'emotionalArc'
]

const initialState = {
  status: 'idle',       // 'idle' | 'extracting' | 'analyzing' | 'unsupported' | 'complete'
  article: null,        // { headline, url }
  siteProfile: null,    // populated first
  dimensions: {},       // filled one by one
  flags: [],            // populated after last dimension
  trustScore: null,     // { score, tier } — computed when all 6 arrive
  hasDimensions: false, // true once we confirm a valid mock exists for this URL
  error: null
}

function reducer(state, action) {
  switch (action.type) {
    case 'START_EXTRACT':
      return { ...state, status: 'extracting', error: null }

    case 'ARTICLE_RECEIVED':
      return { ...state, article: action.payload }

    case 'START_ANALYZE':
      return { ...state, status: 'analyzing', hasDimensions: true }

    case 'UNSUPPORTED':
      return { ...state, status: 'unsupported' }

    case 'SITE_PROFILE_RECEIVED':
      return { ...state, siteProfile: action.payload }

    case 'DIMENSION_RECEIVED': {
      const newDimensions = { ...state.dimensions, [action.payload.dimension]: action.payload }
      const allComplete = DIMENSION_ORDER.every(k => newDimensions[k])

      let trustScore = state.trustScore
      if (allComplete) {
        const scores = Object.fromEntries(
          DIMENSION_ORDER.map(k => [k, newDimensions[k].score])
        )
        trustScore = computeTrustScore(scores)
      }

      return { ...state, dimensions: newDimensions, trustScore }
    }

    case 'FLAGS_RECEIVED':
      return { ...state, flags: action.payload }

    case 'ANALYSIS_COMPLETE':
      return { ...state, status: 'complete' }

    case 'RESET':
      return { ...initialState }

    case 'ERROR':
      return { ...state, status: 'idle', error: action.payload }

    default:
      return state
  }
}

// Helper: send a message through the service worker to the content script
function sendToContent(message) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      resolve(null)
      return
    }
    chrome.runtime.sendMessage({ ...message, target: 'content' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null)
      } else {
        resolve(response)
      }
    })
  })
}

export function useAnalysis() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const pendingTimeouts = useRef([])

  const startAnalysis = useCallback(async () => {
    // Cancel any in-flight mock-streaming timeouts from a previous run
    pendingTimeouts.current.forEach(id => clearTimeout(id))
    pendingTimeouts.current = []

    dispatch({ type: 'RESET' })
    dispatch({ type: 'START_EXTRACT' })

    // Get article data from the content script
    const articleData = await sendToContent({ type: 'GET_ARTICLE' })
    const article = articleData ?? { headline: '', url: '', text: '', sentences: [] }
    dispatch({ type: 'ARTICLE_RECEIVED', payload: article })

    // Use mock for this URL or fall back to first available mock so we can test (e.g. toolbar icon)
    const mock = MOCK_BY_URL[article.url] ?? Object.values(MOCK_BY_URL)[0]
    if (!mock?.dimensions?.length) {
      dispatch({ type: 'UNSUPPORTED' })
      return
    }

    dispatch({ type: 'START_ANALYZE' })

    const schedule = (fn, delay) => {
      const id = setTimeout(fn, delay)
      pendingTimeouts.current.push(id)
    }

    // Simulate streaming: site profile arrives first
    schedule(() => {
      dispatch({ type: 'SITE_PROFILE_RECEIVED', payload: mock.siteProfile })
    }, 400)

    // Dimensions stream in one by one
    mock.dimensions.forEach((dimension, index) => {
      schedule(() => {
        dispatch({ type: 'DIMENSION_RECEIVED', payload: dimension })
      }, 800 + index * 700)
    })

    // Flags arrive after the last dimension
    const totalDelay = 800 + (mock.dimensions.length - 1) * 700 + 300
    schedule(() => {
      dispatch({ type: 'FLAGS_RECEIVED', payload: mock.flags })
    }, totalDelay)

    // Mark complete
    schedule(() => {
      dispatch({ type: 'ANALYSIS_COMPLETE' })
    }, totalDelay + 100)
  }, [])

  return { ...state, startAnalysis }
}
