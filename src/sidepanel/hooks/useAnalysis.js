import { useReducer, useCallback, useRef } from 'react'
import { computeTrustScoreFromFlags } from '../../utils/scoring.js'

const BACKEND_URL = 'https://factcheck.coredoes.dev'
const POLL_INTERVAL_MS = 3000

// Per-session cache keyed by URL — avoids redundant API calls when switching tabs
const analysisCache = new Map()

const initialState = {
  status: 'idle',       // 'idle' | 'extracting' | 'analyzing' | 'unsupported' | 'complete'
  article: null,        // { headline, url }
  siteProfile: null,    // populated from /publisher, then updated with tone/factuality from /analyze
  dimensions: {},       // unused for live API (no dimensions from backend)
  flags: [],            // populated when /analyze completes
  trustScore: null,     // { score, tier } — computed from flags
  hasDimensions: false, // stays false for live API (no dimension cards shown)
  error: null
}

function reducer(state, action) {
  switch (action.type) {
    case 'START_EXTRACT':
      return { ...state, status: 'extracting', error: null }

    case 'ARTICLE_RECEIVED':
      return { ...state, article: action.payload }

    case 'START_ANALYZE':
      return { ...state, status: 'analyzing', hasDimensions: false }

    case 'UNSUPPORTED':
      return { ...state, status: 'unsupported' }

    case 'SITE_PROFILE_RECEIVED':
      return { ...state, siteProfile: action.payload }

    case 'DIMENSION_RECEIVED':
      return state

    case 'FLAGS_RECEIVED':
      return { ...state, flags: action.payload }

    case 'TRUST_SCORE_RECEIVED':
      return { ...state, trustScore: action.payload }

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
  const pollIntervalRef = useRef(null)
  const publisherDataRef = useRef(null)

  const startAnalysis = useCallback(async (useCache = false) => {
    // Cancel any in-flight poll interval from a previous run
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    publisherDataRef.current = null

    dispatch({ type: 'RESET' })
    dispatch({ type: 'START_EXTRACT' })

    // Get article data from the content script
    const articleData = await sendToContent({ type: 'GET_ARTICLE' })
    const article = articleData ?? { headline: '', url: '', text: '', sentences: [] }
    dispatch({ type: 'ARTICLE_RECEIVED', payload: article })

    // Only analyzable URLs are http/https pages
    const url = article.url ?? ''
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
      dispatch({ type: 'UNSUPPORTED' })
      return
    }

    // Restore from cache on tab switch — no API calls needed
    if (useCache) {
      const cached = analysisCache.get(url)
      if (cached) {
        dispatch({ type: 'SITE_PROFILE_RECEIVED', payload: cached.siteProfile })
        dispatch({ type: 'FLAGS_RECEIVED', payload: cached.flags })
        dispatch({ type: 'TRUST_SCORE_RECEIVED', payload: cached.trustScore })
        dispatch({ type: 'ANALYSIS_COMPLETE' })
        return
      }
    }

    dispatch({ type: 'START_ANALYZE' })

    // Fetch publisher data immediately (fast, cached by backend)
    fetch(`${BACKEND_URL}/publisher?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        if (data.ready && data.data) {
          publisherDataRef.current = data.data
          dispatch({ type: 'SITE_PROFILE_RECEIVED', payload: data.data })
        }
      })
      .catch(() => {
        // Non-fatal: continue without site profile
      })

    // Poll /analyze until ready
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/analyze?url=${encodeURIComponent(url)}`)
        const data = await res.json()

        if (data.ready && data.data) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null

          const { overall_tone, overall_factuality, flags } = data.data.content_analysis

          // Merge publisher data with tone/factuality from analyze
          const mergedSiteProfile = {
            ...(publisherDataRef.current ?? {}),
            overall_tone,
            overall_factuality
          }
          const trustScore = computeTrustScoreFromFlags(flags)

          dispatch({ type: 'SITE_PROFILE_RECEIVED', payload: mergedSiteProfile })
          dispatch({ type: 'FLAGS_RECEIVED', payload: flags })
          dispatch({ type: 'TRUST_SCORE_RECEIVED', payload: trustScore })
          dispatch({ type: 'ANALYSIS_COMPLETE' })

          // Cache result so switching back to this tab skips the API call
          analysisCache.set(url, { siteProfile: mergedSiteProfile, flags, trustScore })
        }
      } catch {
        // Continue polling on network error
      }
    }

    // Run immediately, then on interval
    await poll()
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
  }, [])

  return { ...state, startAnalysis }
}
