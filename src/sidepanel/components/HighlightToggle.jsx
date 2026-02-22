export function HighlightToggle({ visible, onToggle, disabled }) {
  return (
    <div className="shrink-0 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggle}
        disabled={disabled}
        className={[
          'w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 select-none',
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : visible
            ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            : 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white shadow-sm'
        ].join(' ')}
      >
        {disabled
          ? 'Waiting for analysis…'
          : visible
          ? 'Hide Highlights'
          : 'Show Highlights'}
      </button>
    </div>
  )
}
