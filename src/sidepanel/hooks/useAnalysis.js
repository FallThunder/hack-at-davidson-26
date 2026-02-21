import { useReducer, useCallback, useRef } from 'react'
import { computeTrustScore } from '../../utils/scoring.js'
import { MOCK_SITE_PROFILE, MOCK_FLAGS, MOCK_DIMENSIONS } from '../mockData.js'

const HAS_DIMENSIONS = MOCK_DIMENSIONS.length > 0

const DIMENSION_ORDER = [
  'factCheck',
  'rhetoric',
  'headlineAccuracy',
  'statistics',
  'sourceDiversity',
  'emotionalArc'
]

const initialState = {
  status: 'idle',       // 'idle' | 'extracting' | 'analyzing' | 'complete'
  article: null,        // { headline, url }
  siteProfile: null,    // populated first
  dimensions: {},       // filled one by one
  flags: [],            // populated after last dimension
  trustScore: null,     // { score, tier } — computed when all 6 arrive
  error: null
}

function reducer(state, action) {
  switch (action.type) {
    case 'START_EXTRACT':
      return { ...state, status: 'extracting', error: null }

    case 'ARTICLE_RECEIVED':
      return { ...state, article: action.payload }

    case 'START_ANALYZE':
      return { ...state, status: 'analyzing' }

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

    // Try to get article data from the content script
    const articleData = await sendToContent({ type: 'GET_ARTICLE' })
    dispatch({
      type: 'ARTICLE_RECEIVED',
      payload: articleData ?? { headline: 'Demo Article', url: 'https://example.com', text: '', sentences: [] }
    })

    dispatch({ type: 'START_ANALYZE' })

    const schedule = (fn, delay) => {
      const id = setTimeout(fn, delay)
      pendingTimeouts.current.push(id)
    }

    // Simulate streaming: site profile arrives first
    schedule(() => {
      dispatch({ type: 'SITE_PROFILE_RECEIVED', payload: MOCK_SITE_PROFILE })
    }, 400)

    // Dimensions stream in one by one
    MOCK_DIMENSIONS.forEach((dimension, index) => {
      schedule(() => {
        dispatch({ type: 'DIMENSION_RECEIVED', payload: dimension })
      }, 800 + index * 700)
    })

    // Flags arrive after the last dimension
    const totalDelay = 800 + (MOCK_DIMENSIONS.length - 1) * 700 + 300
    schedule(() => {
      dispatch({ type: 'FLAGS_RECEIVED', payload: MOCK_FLAGS })
    }, totalDelay)

    // Mark complete
    schedule(() => {
      dispatch({ type: 'ANALYSIS_COMPLETE' })
    }, totalDelay + 100)
  }, [])

  return { ...state, startAnalysis, hasDimensions: HAS_DIMENSIONS }
}
