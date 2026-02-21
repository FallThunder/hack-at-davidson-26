// Abbreviations that should not be treated as sentence boundaries
const ABBREVIATIONS = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|U\.S|U\.K|a\.m|p\.m|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s/g

export function extractArticle(doc) {
  const headline = extractHeadline(doc)
  const bodyEl = findBodyElement(doc)
  const { text, sentences } = extractSentences(bodyEl)
  return { headline, text, sentences, url: doc.location.href }
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
