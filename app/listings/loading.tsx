import { ListingCardSkeleton } from '@/components/ListingCard'

export default function ListingsLoading() {
  return (
    <div className="min-h-screen bg-[#F2F7F7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Search + Filter skeleton */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 h-11 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-11 w-24 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Results count skeleton */}
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
