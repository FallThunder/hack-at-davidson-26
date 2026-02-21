export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="space-y-2 mt-1">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </div>
    </div>
  )
}
