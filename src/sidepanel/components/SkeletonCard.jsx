export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 motion-safe:animate-pulse">
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

export function SkeletonSiteProfile() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 motion-safe:animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      </div>
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <div className="h-2.5 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-2.5 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <div className="h-2.5 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-2.5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-2.5 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonFlagCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 motion-safe:animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded shrink-0" />
      </div>
      <div className="border-l-2 border-gray-200 dark:border-gray-700 pl-3 mb-2.5 space-y-1.5">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </div>
    </div>
  )
}
