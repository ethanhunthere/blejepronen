import { ListingCardSkeleton } from '@/components/ListingCard'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Hero skeleton */}
      <div className="min-h-[80vh] md:min-h-[85vh] flex items-center" style={{ background: 'linear-gradient(135deg, #F5F7FA 0%, #EEF2FF 40%, #F0F4FF 70%, #F5F7FA 100%)' }}>
        <div className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center max-w-3xl mx-auto">
            <div className="h-12 max-w-lg w-full bg-gray-200 rounded-xl animate-pulse mx-auto mb-4" />
            <div className="h-6 max-w-md w-full bg-gray-200 rounded-lg animate-pulse mx-auto mb-10" />
            <div className="h-16 max-w-2xl bg-gray-100 rounded-2xl animate-pulse mx-auto" />
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-9 w-24 bg-gray-200 rounded-full animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Listings skeleton */}
      <section className="max-w-[1800px] 2xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12 lg:py-16">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
