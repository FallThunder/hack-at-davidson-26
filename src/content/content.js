import { extractArticle } from '../utils/articleExtractor.js'

// Module-level state
let evidentFlags = []
let popover = null
let popoverOpen = false
let tooltipEl = null

// Normalize curly/smart quotes to straight ASCII equivalents for matching
function normalizeQuotes(str) {
  return str
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
}

// Urgency → CSS attribute value
function urgencyAttr(urgency) {
  return `urgency-${Math.min(Math.max(urgency, 1), 5)}`
}

// Shared tooltip — appended to body so it escapes overflow:hidden containers
function getTooltipEl() {
  if (tooltipEl) return tooltipEl
  tooltipEl = document.createElement('div')
  tooltipEl.className = 'evident-tooltip'
  document.body.appendChild(tooltipEl)
  return tooltipEl
}

function showTooltip(text, anchorRect) {
  const el = getTooltipEl()
  el.textContent = text
  // Move off-screen to measure, then position
  el.style.left = '-9999px'
  el.style.top = '-9999px'
  el.style.visibility = 'visible'
  el.style.opacity = '0'
  requestAnimationFrame(() => {
    const tw = el.offsetWidth
    const th = el.offsetHeight
    const gap = 8
    let left = anchorRect.left + anchorRect.width / 2 - tw / 2
    let top = anchorRect.top - th - gap
    // Clamp horizontally; flip below if too close to top
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8))
    if (top < 8) top = anchorRect.bottom + gap
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.opacity = '1'
  })
}

function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.style.opacity = '0'
    tooltipEl.style.visibility = 'hidden'
  }
}

// Create or retrieve the shared popover element
function getPopover() {
  if (popover) return popover
  popover = document.createElement('div')
  popover.id = 'evident-popover'
  document.body.appendChild(popover)

  // Close popover when clicking outside
  document.addEventListener('click', handleDocumentClick, true)

  return popover
}

function showPopover(flagIndex, anchorRect) {
  const flag = evidentFlags[flagIndex]
  if (!flag) return

  const el = getPopover()
  const confidencePct = Math.round(flag.confidence * 100)

  const sourcesHtml = flag.sources && flag.sources.length > 0
    ? `<div class="evident-pop-sources">
        <p>Sources:</p>
        ${flag.sources.map(s =>
          `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title} — ${s.publisher}</a>`
        ).join('')}
      </div>`
    : ''

  el.innerHTML = `
    <div class="evident-pop-header">${flag.flag} &mdash; ${confidencePct}% confidence</div>
    <blockquote class="evident-pop-excerpt">&ldquo;${flag.excerpt}&rdquo;</blockquote>
    <p class="evident-pop-reasoning">${flag.reasoning}</p>
    ${sourcesHtml}
  `

  // Position: below the anchor; flip above if near bottom of viewport
  const popoverHeight = 240  // estimated max height
  const gap = 8
  let top = anchorRect.bottom + window.scrollY + gap
  let left = anchorRect.left + window.scrollX

  if (anchorRect.bottom + popoverHeight + gap > window.innerHeight) {
    top = anchorRect.top + window.scrollY - popoverHeight - gap
  }

  // Clamp to viewport width
  const maxLeft = window.innerWidth - 348  // 340px + 8px margin
  left = Math.max(8, Math.min(left, maxLeft))

  el.style.top = `${top}px`
  el.style.left = `${left}px`
  el.classList.add('visible')
  popoverOpen = true
}

function hidePopover() {
  if (popover) popover.classList.remove('visible')
  popoverOpen = false
}

function handleDocumentClick(event) {
  if (!popoverOpen) return
  const target = event.target

  // Clicking on a highlight — let the highlight's own click handler run
  if (target.closest('.evident-highlight')) return

  // Clicking inside the popover — do nothing
  if (popover && popover.contains(target)) return

  hidePopover()
}

// Jaccard similarity between two arrays treated as sets
function jaccardSimilarity(wordsA, wordsB) {
  const setA = new Set(wordsA)
  const setB = new Set(wordsB)
  let intersection = 0
  for (const w of setA) if (setB.has(w)) intersection++
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

// Tokenize a string into lowercase alphanumeric words, preserving char offsets
// Returns { words: string[], offsets: number[] } where offsets[i] is the char
// index of words[i] in the cleaned string (length-preserving → same in original)
function tokenize(str) {
  const clean = normalizeQuotes(str).toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const words = []
  const offsets = []
  const re = /\S+/g
  let m
  while ((m = re.exec(clean)) !== null) {
    words.push(m[0])
    offsets.push(m.index)
  }
  return { words, offsets }
}

// Build a character-offset map of all visible text nodes under root.
// Returns { segments: [{node, start, end}], fullText: string }
function buildTextMap(root) {
  const segments = []
  let totalLength = 0
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName?.toLowerCase()
      if (tag === 'script' || tag === 'style' || tag === 'noscript') return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
  })
  let node
  while ((node = walker.nextNode())) {
    const len = node.textContent.length
    if (len === 0) continue
    segments.push({ node, start: totalLength, end: totalLength + len })
    totalLength += len
  }
  return { segments, fullText: segments.map(s => s.node.textContent).join('') }
}

function findNodeAtCharOffset(segments, charOffset) {
  for (const seg of segments) {
    if (charOffset >= seg.start && charOffset <= seg.end) {
      return { node: seg.node, offset: charOffset - seg.start }
    }
  }
  return null
}

// Find best matching position for targetText across ALL text (spanning DOM boundaries).
// Returns { startNode, startOffset, endNode, endOffset } or null.
function findSimilarText(textMap, targetText, threshold = 0.5) {
  const { words: targetWords } = tokenize(targetText)
  const w = targetWords.length
  if (w === 0) return null

  const { words: contentWords, offsets: contentOffsets } = tokenize(textMap.fullText)
  if (contentWords.length < w) return null

  let best = null
  let bestScore = threshold - 0.001

  for (let i = 0; i <= contentWords.length - w; i++) {
    const score = jaccardSimilarity(targetWords, contentWords.slice(i, i + w))
    if (score > bestScore) {
      bestScore = score
      const startChar = contentOffsets[i]
      const endChar = contentOffsets[i + w - 1] + contentWords[i + w - 1].length
      const startInfo = findNodeAtCharOffset(textMap.segments, startChar)
      const endInfo = findNodeAtCharOffset(textMap.segments, endChar)
      if (startInfo && endInfo) {
        best = { startNode: startInfo.node, startOffset: startInfo.offset, endNode: endInfo.node, endOffset: endInfo.offset }
      }
    }
  }
  return best
}

// Split excerpt on ellipsis, match each segment, return the match for the longest segment
function findBestSegment(textMap, excerpt, threshold = 0.5) {
  const segments = excerpt
    .split(/…|\.\.\./)
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).filter(Boolean).length >= 3)

  if (segments.length === 0) return null
  if (segments.length === 1) return findSimilarText(textMap, segments[0], threshold)

  // Try each segment; prefer the longest one that successfully matches
  let best = null
  let bestWordCount = 0
  for (const segment of segments) {
    const match = findSimilarText(textMap, segment, threshold)
    if (!match) continue
    const wordCount = segment.trim().split(/\s+/).length
    if (wordCount > bestWordCount) {
      best = match
      bestWordCount = wordCount
    }
  }
  return best
}

// Urgency → inline background/border values (set via JS for guaranteed cascade priority)
const URGENCY_BG = {
  1: 'rgba(255, 215, 0, 0.45)', 2: 'rgba(255, 215, 0, 0.45)',
  3: 'rgba(255, 140, 0, 0.45)',
  4: 'rgba(255, 68, 68, 0.45)',  5: 'rgba(255, 68, 68, 0.45)'
}
const URGENCY_BORDER = {
  1: '2px solid #ffd700', 2: '2px solid #ffd700',
  3: '2px solid #ff8c00',
  4: '2px solid #ff4444', 5: '2px solid #ff4444'
}

// Apply highlights from flags array.
// For cross-node ranges, each text node fragment gets its own span via
// surroundContents — avoids the block-in-inline problem that extractContents
// causes when container elements (DIV, P, etc.) end up inside the span.
function applyHighlights(highlights) {
  evidentFlags = highlights
  const textMap = buildTextMap(document.body)

  highlights.forEach((flag, index) => {
    if (!flag.excerpt) return

    const match = findBestSegment(textMap, flag.excerpt)
    if (!match) return

    const u = Math.min(Math.max(flag.urgency, 1), 5)
    const tooltipText = `${flag.flag} — ${Math.round(flag.confidence * 100)}% confidence`

    const makeSpan = () => {
      const span = document.createElement('span')
      span.className = 'evident-highlight'
      span.setAttribute('data-evident-highlight', urgencyAttr(flag.urgency))
      span.setAttribute('data-evident-flag-index', String(index))
      span.style.setProperty('background-color', URGENCY_BG[u], 'important')
      span.style.setProperty('border-bottom', URGENCY_BORDER[u], 'important')
      span.addEventListener('mouseenter', () => showTooltip(tooltipText, span.getBoundingClientRect()))
      span.addEventListener('mouseleave', hideTooltip)
      span.addEventListener('click', (event) => {
        event.stopPropagation()
        hideTooltip()
        const flagIdx = parseInt(span.getAttribute('data-evident-flag-index'), 10)
        showPopover(flagIdx, span.getBoundingClientRect())
        chrome.runtime.sendMessage({ type: 'HIGHLIGHT_CLICKED', flagIndex: flagIdx, target: 'sidepanel' })
      })
      return span
    }

    if (match.startNode === match.endNode) {
      try {
        const range = document.createRange()
        range.setStart(match.startNode, match.startOffset)
        range.setEnd(match.endNode, match.endOffset)
        range.surroundContents(makeSpan())
      } catch {
        // skip if DOM manipulation fails (e.g. range straddles element boundary)
      }
    } else {
      // Cross-node: find every text-node segment covered by the match and wrap
      // each one independently. This keeps spans inline-only (no block children)
      // so their background-color always renders correctly.
      const startIdx = textMap.segments.findIndex(s => s.node === match.startNode)
      const endIdx = textMap.segments.findIndex(s => s.node === match.endNode)
      if (startIdx === -1 || endIdx === -1) return

      for (let i = startIdx; i <= endIdx; i++) {
        const seg = textMap.segments[i]
        const startOff = (i === startIdx) ? match.startOffset : 0
        const endOff = (i === endIdx) ? match.endOffset : seg.node.textContent.length
        if (startOff >= endOff) continue
        try {
          const range = document.createRange()
          range.setStart(seg.node, startOff)
          range.setEnd(seg.node, endOff)
          range.surroundContents(makeSpan())
        } catch {
          // skip this fragment
        }
      }
    }
  })
}

function toggleHighlights(visible) {
  document.querySelectorAll('[data-evident-highlight]').forEach(el => {
    el.style.display = visible ? '' : 'none'
  })
  if (!visible) { hidePopover(); hideTooltip() }
}

function scrollToFlag(flagIndex) {
  const span = document.querySelector(`[data-evident-flag-index="${flagIndex}"]`)
  if (!span) return
  span.scrollIntoView({ behavior: 'smooth', block: 'center' })
  span.classList.add('evident-highlight-pulse')
  setTimeout(() => span.classList.remove('evident-highlight-pulse'), 1200)
}

function clearHighlights() {
  hidePopover()
  hideTooltip()
  document.querySelectorAll('[data-evident-highlight]').forEach(span => {
    const parent = span.parentNode
    if (!parent) return
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span)
    }
    parent.removeChild(span)
  })
  evidentFlags = []
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_ARTICLE') {
    try {
      const article = extractArticle(document)
      sendResponse(article)
    } catch {
      sendResponse({ headline: document.title, text: '', sentences: [], url: location.href })
    }
    return true
  }

  if (message.type === 'APPLY_HIGHLIGHTS') {
    applyHighlights(message.highlights || [])
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'TOGGLE_HIGHLIGHTS') {
    toggleHighlights(message.visible)
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'SCROLL_TO_FLAG') {
    scrollToFlag(message.flagIndex)
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'CLEAR_HIGHLIGHTS') {
    clearHighlights()
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'SET_DARK_MODE') {
    document.documentElement.toggleAttribute('data-evident-dark', message.dark)
    sendResponse({ success: true })
    return true
  }
})
