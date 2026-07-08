import { ListingCardSkeleton } from '@/components/ListingCard'

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero skeleton */}
      <div className="bg-white border-b border-gray-100 py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="h-6 max-w-xs w-full bg-gray-200 rounded-full animate-pulse mx-auto mb-6" />
            <div className="h-12 max-w-sm w-full bg-gray-200 rounded-xl animate-pulse mx-auto mb-4" />
            <div className="h-12 max-w-xs w-full bg-gray-200 rounded-xl animate-pulse mx-auto mb-10" />
            <div className="h-16 max-w-2xl bg-gray-200 rounded-2xl animate-pulse mx-auto" />
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-9 w-24 bg-gray-200 rounded-full animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 md:gap-16">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="text-center">
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured skeleton */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Latest skeleton */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Static sections rendered even while loading */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-56 bg-gray-200 rounded animate-pulse mx-auto mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse mx-auto mb-4" />
                <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
                <div className="h-4 w-56 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
