// Abbreviations that should not be treated as sentence boundaries
const ABBREVIATIONS = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|U\.S|U\.K|a\.m|p\.m|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s/g

export function extractArticle(doc) {
  const headline = extractHeadline(doc)
  const bodyEl = findBodyElement(doc)
  const { text, sentences } = extractSentences(bodyEl)
  return { headline, text, sentences, url: doc.location.href, isLikelyArticle: detectIsArticle(doc, text) }
}

// Heuristic: distinguish article pages from homepages, category pages, search pages, etc.
function detectIsArticle(doc, text) {
  // Strong positive: Open Graph type explicitly set to "article"
  const ogType = doc.querySelector('meta[property="og:type"]')?.getAttribute('content')
  if (ogType === 'article') return true

  // Strong positive: article publication timestamp present
  if (doc.querySelector('meta[property="article:published_time"]')) return true

  // URL-based heuristics
  try {
    const { pathname } = new URL(doc.location.href)
    // Bare homepage — no article signals above
    if (pathname === '/' || pathname === '') return false
    // Year in path (most news CMS patterns: /2024/01/15/...)
    if (/\/20\d{2}\//.test(pathname)) return true
    // Long numeric article ID (/story/12345678 or /68123456)
    if (/\/\d{7,}(?:\/|$)/.test(pathname)) return true
    // Explicit .html extension (common on older CMS)
    if (/\.(html?)(?:\?|$)/.test(pathname)) return true
    // Long hyphenated slug in last path segment (≥4 hyphen-separated parts, ≥20 chars)
    const segments = pathname.split('/').filter(Boolean)
    const lastSeg = segments[segments.length - 1] || ''
    if (lastSeg.split('-').length >= 4 && lastSeg.length >= 20) return true
  } catch (_) {}

  // Last resort: substantial body text suggests a real article
  const wordCount = text.trim().split(/\s+/).length
  return wordCount >= 400
}

function extractHeadline(doc) {
  const selectors = [
    'h1',
    '[itemprop="headline"]',
    'meta[property="og:title"]',
    'meta[name="twitter:title"]'
  ]
  for (const selector of selectors) {
    const el = doc.querySelector(selector)
    if (el) {
      const text = el.tagName === 'META' ? el.getAttribute('content') : el.innerText
      if (text?.trim()) return text.trim()
    }
  }
  return doc.title || ''
}

function findBodyElement(doc) {
  const candidates = [
    ...doc.querySelectorAll('article, [role="main"], main, [itemprop="articleBody"], .article-body, .post-content, .entry-content')
  ]

  if (candidates.length === 0) return doc.body

  const scored = candidates.map(el => {
    const text = el.innerText || ''
    const links = el.querySelectorAll('a')
    const linkTextLength = [...links].reduce((n, a) => n + (a.innerText?.length ?? 0), 0)
    const linkDensity = text.length > 0 ? linkTextLength / text.length : 1
    return { el, score: text.length * (1 - linkDensity) }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].el
}

function extractSentences(el) {
  if (!el) return { text: '', sentences: [] }

  const textNodes = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName?.toLowerCase()
      if (['script', 'style', 'noscript', 'nav', 'header', 'footer'].includes(tag)) {
        return NodeFilter.FILTER_REJECT
      }
      return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    }
  })

  let node
  while ((node = walker.nextNode())) {
    textNodes.push(node.textContent.trim())
  }

  const fullText = textNodes.join(' ')
  // Protect abbreviations by replacing their periods temporarily
  const protected_ = fullText.replace(ABBREVIATIONS, (m) => m.replace('.', '\x00'))
  const rawSentences = protected_.split(/(?<=[.!?])\s+(?=[A-Z"'])/g)

  const sentences = rawSentences
    .map(s => s.replace(/\x00/g, '.').trim())
    .filter(s => s.length > 10)
    .map((text, index) => ({ index, text }))

  return { text: fullText, sentences }
}
