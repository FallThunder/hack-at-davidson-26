export function SkeletonCard() {
  return (
    <div aria-hidden="true" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded skeleton-shimmer" />
          <div className="h-3 w-28 rounded skeleton-shimmer" />
        </div>
        <div className="h-6 w-10 rounded-full skeleton-shimmer" />
      </div>
      <div className="space-y-2 mt-1">
        <div className="h-2 rounded w-full skeleton-shimmer" />
        <div className="h-2 rounded w-5/6 skeleton-shimmer" />
        <div className="h-2 rounded w-3/4 skeleton-shimmer" />
      </div>
    </div>
  )
}

export function SkeletonSiteProfile() {
  return (
    <div aria-hidden="true" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 rounded skeleton-shimmer" />
          <div className="h-3 w-20 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-20 rounded-full skeleton-shimmer" />
        </div>
      </div>
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <div className="h-2.5 w-6 rounded skeleton-shimmer" />
          <div className="h-2.5 w-24 rounded skeleton-shimmer" />
          <div className="h-2.5 w-6 rounded skeleton-shimmer" />
        </div>
        <div className="h-2 rounded-full skeleton-shimmer" />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <div className="h-2.5 w-6 rounded skeleton-shimmer" />
          <div className="h-2.5 w-28 rounded skeleton-shimmer" />
          <div className="h-2.5 w-6 rounded skeleton-shimmer" />
        </div>
        <div className="h-2 rounded-full skeleton-shimmer" />
      </div>
    </div>
  )
}

export function SkeletonFlagCard() {
  return (
    <div aria-hidden="true" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="w-2 h-2 rounded-full skeleton-shimmer shrink-0" />
          <div className="h-3 w-32 rounded skeleton-shimmer" />
        </div>
        <div className="h-3 w-20 rounded skeleton-shimmer shrink-0" />
      </div>
      <div className="border-l-2 border-gray-200 dark:border-gray-700 pl-3 mb-2.5 space-y-1.5">
        <div className="h-2 rounded w-full skeleton-shimmer" />
        <div className="h-2 rounded w-4/5 skeleton-shimmer" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2 rounded w-full skeleton-shimmer" />
        <div className="h-2 rounded w-5/6 skeleton-shimmer" />
        <div className="h-2 rounded w-3/4 skeleton-shimmer" />
      </div>
    </div>
  )
}
