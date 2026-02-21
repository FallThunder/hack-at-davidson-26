import { extractArticle } from '../utils/articleExtractor.js'

// Module-level state
let prismFlags = []
let popover = null
let popoverOpen = false

// Urgency → CSS attribute value
function urgencyAttr(urgency) {
  return `urgency-${Math.min(Math.max(urgency, 1), 5)}`
}

// Build the fire emoji string for urgency level
function fireEmojis(urgency) {
  return '🔥'.repeat(Math.min(urgency, 5))
}

// Create or retrieve the shared popover element
function getPopover() {
  if (popover) return popover
  popover = document.createElement('div')
  popover.id = 'prism-popover'
  document.body.appendChild(popover)

  // Close popover when clicking outside
  document.addEventListener('click', handleDocumentClick, true)

  return popover
}

function showPopover(flagIndex, anchorRect) {
  const flag = prismFlags[flagIndex]
  if (!flag) return

  const el = getPopover()
  const confidencePct = Math.round(flag.confidence * 100)

  const sourcesHtml = flag.sources && flag.sources.length > 0
    ? `<div class="prism-pop-sources">
        <p>Sources:</p>
        ${flag.sources.map(s =>
          `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title} — ${s.publisher}</a>`
        ).join('')}
      </div>`
    : ''

  el.innerHTML = `
    <div class="prism-pop-header">${fireEmojis(flag.urgency)} ${flag.flag} &mdash; ${confidencePct}% confidence</div>
    <blockquote class="prism-pop-excerpt">&ldquo;${flag.excerpt}&rdquo;</blockquote>
    <p class="prism-pop-reasoning">${flag.reasoning}</p>
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
  if (target.closest('.prism-highlight')) return

  // Clicking inside the popover — do nothing
  if (popover && popover.contains(target)) return

  hidePopover()
}

// Apply highlights from flags array
function applyHighlights(highlights) {
  prismFlags = highlights

  highlights.forEach((flag, index) => {
    if (!flag.excerpt) return

    const textNode = findTextNode(document.body, flag.excerpt)
    if (!textNode) return

    try {
      const startOffset = textNode.textContent.indexOf(flag.excerpt)
      if (startOffset === -1) return

      const range = document.createRange()
      range.setStart(textNode, startOffset)
      range.setEnd(textNode, startOffset + flag.excerpt.length)

      const span = document.createElement('span')
      span.className = 'prism-highlight'
      span.setAttribute('data-prism-highlight', urgencyAttr(flag.urgency))
      span.setAttribute('data-prism-flag-index', String(index))

      const tooltip = document.createElement('span')
      tooltip.className = 'prism-tooltip'
      tooltip.textContent = `${flag.flag} — ${Math.round(flag.confidence * 100)}% confidence`
      span.appendChild(tooltip)

      range.surroundContents(span)

      // Click to show popover
      span.addEventListener('click', (event) => {
        event.stopPropagation()
        const flagIdx = parseInt(span.getAttribute('data-prism-flag-index'), 10)
        const rect = span.getBoundingClientRect()
        showPopover(flagIdx, rect)
      })
    } catch {
      // Skip if range spans multiple DOM nodes
    }
  })
}

// Find the first text node that contains the target string
function findTextNode(root, targetText) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    if (node.textContent.includes(targetText)) {
      return node
    }
  }
  return null
}

function toggleHighlights(visible) {
  document.querySelectorAll('[data-prism-highlight]').forEach(el => {
    el.style.display = visible ? '' : 'none'
  })
  if (!visible) hidePopover()
}

function clearHighlights() {
  hidePopover()
  document.querySelectorAll('[data-prism-highlight]').forEach(span => {
    const parent = span.parentNode
    if (!parent) return
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span)
    }
    parent.removeChild(span)
  })
  prismFlags = []
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

  if (message.type === 'CLEAR_HIGHLIGHTS') {
    clearHighlights()
    sendResponse({ success: true })
    return true
  }
})
