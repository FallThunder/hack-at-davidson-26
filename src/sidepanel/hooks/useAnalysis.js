import { useReducer, useCallback, useRef } from 'react'
import { computeTrustScoreFromFlags } from '../../utils/scoring.js'
import { isNewsDomain, extractHostname, getUserDomains } from '../../utils/newsDomains.js'

const BACKEND_URL = 'https://factcheck2.coredoes.dev'
const POLL_INTERVAL_MS = 3000

// Per-session cache keyed by URL — avoids redundant API calls when switching tabs
const analysisCache = new Map()

const initialState = {
  status: 'idle',           // 'idle' | 'extracting' | 'analyzing' | 'unsupported' | 'complete'
  article: null,            // { headline, url }
  siteProfile: null,        // populated from /publisher, then updated with tone/factuality from /analyze
  dimensions: {},           // unused for live API (no dimensions from backend)
  flags: [],                // populated when /analyze completes
  trustScore: null,         // { score, tier } — computed from flags
  hasDimensions: false,     // stays false for live API (no dimension cards shown)
  unsupportedDomain: null,  // hostname when page is real but not in the news allowlist
  notAnArticle: false,      // true when domain is known but page looks like a homepage/category
  slowWarning: false,       // true after 2 minutes without a response
  overloadedWarning: false, // true when backend reports Claude is overloaded
  analysisProgress: null,   // live progress string from backend stream ('Searching the web...', etc.)
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
      return {
        ...state,
        status: 'unsupported',
        unsupportedDomain: action.payload?.domain ?? null,
        notAnArticle: action.payload?.notAnArticle ?? false
      }

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

    case 'SLOW_WARNING':
      return { ...state, slowWarning: true }

    case 'OVERLOADED_WARNING':
      return { ...state, overloadedWarning: true }

    case 'PROGRESS_UPDATE':
      return { ...state, analysisProgress: action.payload }

    case 'FORCE_ANALYZE':
      return { ...state, notAnArticle: false, status: 'analyzing' }

    case 'ERROR':
      return { ...state, status: 'error', error: action.payload }

    default:
      return state
  }
}

// Helper: send a message through the service worker to the content script.
// Gets the tabId from the side panel's own window context — more reliable than
// letting the service worker guess with currentWindow:true, which can return the
// wrong window if the user has switched focus during a long analysis.
async function sendToContent(message) {
  if (typeof chrome === 'undefined' || !chrome.runtime) return null
  const tabs = await new Promise(r => chrome.tabs.query({ active: true, currentWindow: true }, r))
  const tabId = tabs[0]?.id
  if (!tabId) return null
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ ...message, target: 'content', tabId }, (response) => {
      if (chrome.runtime.lastError) resolve(null)
      else resolve(response)
    })
  })
}

export function useAnalysis() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const pollIntervalRef = useRef(null)
  const slowTimeoutRef = useRef(null)
  const publisherDataRef = useRef(null)
  // Incremented on every startAnalysis call; async callbacks check this before dispatching
  // to discard results from a previous run that arrived late (stale fetch race condition).
  const runIdRef = useRef(0)

  const startAnalysis = useCallback(async (useCache = false, force = false) => {
    // Cancel any in-flight poll interval or slow-warning timeout from a previous run
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (slowTimeoutRef.current) {
      clearTimeout(slowTimeoutRef.current)
      slowTimeoutRef.current = null
    }
    publisherDataRef.current = null

    // Stamp this run — any async callback that sees a different runId is stale and must exit
    const runId = ++runIdRef.current

    dispatch({ type: 'RESET' })
    dispatch({ type: 'START_EXTRACT' })

    // Get article data from the content script
    const articleData = await sendToContent({ type: 'GET_ARTICLE' })
    if (runIdRef.current !== runId) return  // superseded while waiting for content script

    const article = articleData ?? { headline: '', url: '', text: '', sentences: [] }
    dispatch({ type: 'ARTICLE_RECEIVED', payload: article })

    // Only analyzable URLs are http/https pages
    const url = article.url ?? ''
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
      dispatch({ type: 'UNSUPPORTED' })
      return
    }

    // Gate on news allowlist — check built-in list plus user-saved domains
    const userDomains = await getUserDomains()
    if (runIdRef.current !== runId) return  // superseded while reading storage

    if (!isNewsDomain(url, userDomains)) {
      dispatch({ type: 'UNSUPPORTED', payload: { domain: extractHostname(url) } })
      return
    }

    // Gate on article detection — skip on forced analyze or cached results
    if (!force && !article.isLikelyArticle) {
      dispatch({ type: 'UNSUPPORTED', payload: { notAnArticle: true } })
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

    // Warn the user if no response after 2 minutes
    slowTimeoutRef.current = setTimeout(() => {
      if (runIdRef.current === runId) dispatch({ type: 'SLOW_WARNING' })
    }, 120000)

    // Fetch publisher data immediately (fast, cached by backend)
    fetch(`${BACKEND_URL}/publisher?url=${encodeURIComponent(url)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (runIdRef.current !== runId) return  // stale — a newer analysis is running
        if (data.ready && data.data) {
          publisherDataRef.current = data.data
          dispatch({ type: 'SITE_PROFILE_RECEIVED', payload: data.data })
        }
      })
      .catch(() => {
        // Non-fatal: continue without site profile
      })

    // Poll /analyze until ready
    // Returns true if polling should continue, false if done (success or terminal error)
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/analyze?url=${encodeURIComponent(url)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ url, text: article.text, headline: article.headline })
        })
        if (runIdRef.current !== runId) return false  // stale — discard before even parsing

        if (!res.ok) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
          clearTimeout(slowTimeoutRef.current)
          slowTimeoutRef.current = null
          dispatch({ type: 'ERROR', payload: 'The server returned an error. Please try again.' })
          return false
        }

        const data = await res.json()
        if (runIdRef.current !== runId) return false  // stale — discard after parsing

        if (data.error === 'overloaded') {
          // Claude is overloaded — backend will retry on next poll automatically
          dispatch({ type: 'OVERLOADED_WARNING' })
          return true
        }

        if (!data.ready && data.progress) {
          dispatch({ type: 'PROGRESS_UPDATE', payload: data.progress })
        }

        if (data.ready && !data.data) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
          clearTimeout(slowTimeoutRef.current)
          slowTimeoutRef.current = null
          dispatch({ type: 'ERROR', payload: 'The server could not analyze this article. Please try again.' })
          return false
        }

        if (data.ready && data.data) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
          clearTimeout(slowTimeoutRef.current)
          slowTimeoutRef.current = null

          const { overall_tone, overall_factuality, article_category, flags } = data.data.content_analysis

          // Merge publisher data with tone/factuality/category from analyze
          const mergedSiteProfile = {
            ...(publisherDataRef.current ?? {}),
            overall_tone,
            overall_factuality,
            article_category
          }
          const trustScore = computeTrustScoreFromFlags(flags, mergedSiteProfile)

          dispatch({ type: 'SITE_PROFILE_RECEIVED', payload: mergedSiteProfile })
          dispatch({ type: 'FLAGS_RECEIVED', payload: flags })
          dispatch({ type: 'TRUST_SCORE_RECEIVED', payload: trustScore })
          dispatch({ type: 'ANALYSIS_COMPLETE' })

          // Cache result so switching back to this tab skips the API call
          analysisCache.set(url, { siteProfile: mergedSiteProfile, flags, trustScore })
          return false
        }
      } catch {
        // Continue polling on network error
      }
      return true
    }

    // Run immediately; only set up interval if still waiting for results
    const shouldContinue = await poll()
    if (runIdRef.current !== runId) return  // superseded during first poll
    if (shouldContinue) pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
  }, [])

  return { ...state, startAnalysis }
}
