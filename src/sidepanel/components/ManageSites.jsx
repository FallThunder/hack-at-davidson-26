import { useState, useEffect, useCallback, useRef } from 'react'
import { NEWS_DOMAINS, getUserDomains, saveUserDomain, removeUserDomain } from '../../utils/newsDomains.js'

export function ManageSites({ onClose }) {
  const [userDomains, setUserDomains] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')
  const [builtInExpanded, setBuiltInExpanded] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    getUserDomains().then(setUserDomains)
    inputRef.current?.focus()
  }, [])

  const handleAdd = useCallback(async () => {
    const raw = inputValue.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
    if (!raw) return
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw)) {
      setInputError('Enter a valid domain (e.g. example.com)')
      return
    }
    if (NEWS_DOMAINS.includes(raw)) {
      setInputError(`${raw} is already in the built-in list`)
      return
    }
    setInputError('')
    await saveUserDomain(raw)
    const updated = await getUserDomains()
    setUserDomains(updated)
    setInputValue('')
  }, [inputValue])

  const handleRemove = useCallback(async (domain) => {
    await removeUserDomain(domain)
    setUserDomains(prev => prev.filter(d => d !== domain))
  }, [])

  return (
    <div className="absolute inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
        <h2 className="font-semibold text-sm text-gray-900 dark:text-white">Manage News Sites</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Add a domain */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
            Add a site
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => { setInputValue(e.target.value); setInputError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="example.com"
              className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500"
            />
            <button
              onClick={handleAdd}
              className="shrink-0 px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
          {inputError && (
            <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{inputError}</p>
          )}
        </div>

        {/* User-added domains */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
            Your sites{userDomains.length > 0 ? ` (${userDomains.length})` : ''}
          </p>
          {userDomains.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic px-0.5">
              No custom sites added yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {userDomains.map(domain => (
                <div
                  key={domain}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{domain}</span>
                  <button
                    onClick={() => handleRemove(domain)}
                    className="ml-2 shrink-0 p-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label={`Remove ${domain}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Built-in domains (collapsible) */}
        <div>
          <button
            onClick={() => setBuiltInExpanded(e => !e)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-full text-left"
            aria-expanded={builtInExpanded}
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${builtInExpanded ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Built-in sites ({NEWS_DOMAINS.length})
          </button>
          {builtInExpanded && (
            <div className="mt-2 space-y-1">
              {NEWS_DOMAINS.map(domain => (
                <div
                  key={domain}
                  className="px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50"
                >
                  {domain}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
