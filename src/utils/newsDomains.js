// Built-in allowlist of known news domains.
// Matching strips a leading "www." and checks if the page hostname equals or is
// a subdomain of any entry (e.g. "opinion.nytimes.com" matches "nytimes.com").
export const NEWS_DOMAINS = [
  // US national print / digital
  'nytimes.com', 'washingtonpost.com', 'wsj.com', 'usatoday.com',
  'latimes.com', 'chicagotribune.com', 'nypost.com', 'newsweek.com',
  'time.com', 'theatlantic.com', 'newyorker.com',

  // TV / broadcast
  'cnn.com', 'foxnews.com', 'msnbc.com', 'nbcnews.com', 'cbsnews.com',
  'abcnews.go.com', 'abc.net.au',

  // Wire services
  'apnews.com', 'reuters.com', 'afp.com',

  // Public media
  'npr.org', 'pbs.org', 'bbc.com', 'bbc.co.uk',

  // Digital-native
  'huffpost.com', 'buzzfeednews.com', 'vox.com', 'axios.com',
  'slate.com', 'salon.com', 'motherjones.com', 'thedailybeast.com',
  'mediaite.com', 'rawstory.com', 'thewrap.com', 'boingboing.net',

  // Business / finance
  'bloomberg.com', 'forbes.com', 'businessinsider.com', 'fortune.com',
  'marketwatch.com', 'cnbc.com', 'ft.com', 'economist.com',

  // Politics
  'politico.com', 'thehill.com', 'realclearpolitics.com', 'fivethirtyeight.com',
  'rollcall.com', 'nationalreview.com', 'weeklystandard.com', 'reason.com',

  // Investigative / nonprofit
  'theintercept.com', 'propublica.org', 'revealnews.org', 'themarshallproject.org',

  // International English
  'theguardian.com', 'independent.co.uk', 'dailymail.co.uk', 'telegraph.co.uk',
  'theage.com.au', 'smh.com.au', 'globeandmail.com', 'cbc.ca', 'aljazeera.com',
  'dw.com', 'france24.com', 'rfi.fr', 'scmp.com',

  // Tech / science news
  'arstechnica.com', 'wired.com', 'techcrunch.com', 'theverge.com',
  'engadget.com', 'scientificamerican.com', 'newscientist.com', 'nature.com',
  'theregister.com', 'zdnet.com',
]

// Returns the bare hostname (no www. prefix) for a given URL, or null if invalid.
export function extractHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

// Returns true if the URL's hostname is in the built-in list or the caller-supplied
// userDomains array. Subdomain matching is included (e.g. "live.bbc.com" → "bbc.com").
export function isNewsDomain(url, userDomains = []) {
  const hostname = extractHostname(url)
  if (!hostname) return false
  const allDomains = [...NEWS_DOMAINS, ...userDomains]
  return allDomains.some(d => hostname === d || hostname.endsWith('.' + d))
}

// Read user-added domains from chrome.storage.local.
export async function getUserDomains() {
  if (typeof chrome === 'undefined' || !chrome.storage) return []
  return new Promise(resolve => {
    chrome.storage.local.get('evidentUserDomains', result => {
      resolve(Array.isArray(result.evidentUserDomains) ? result.evidentUserDomains : [])
    })
  })
}

// Persist a new domain to the user's personal list.
export async function saveUserDomain(domain) {
  if (typeof chrome === 'undefined' || !chrome.storage) return
  const existing = await getUserDomains()
  if (!existing.includes(domain)) {
    await chrome.storage.local.set({ evidentUserDomains: [...existing, domain] })
  }
}

// Remove a domain from the user's personal list.
export async function removeUserDomain(domain) {
  if (typeof chrome === 'undefined' || !chrome.storage) return
  const existing = await getUserDomains()
  await chrome.storage.local.set({ evidentUserDomains: existing.filter(d => d !== domain) })
}
