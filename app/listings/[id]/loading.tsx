export default function ListingDetailLoading() {
  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link skeleton */}
        <div className="h-5 w-36 bg-white/10 rounded animate-pulse mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Images + Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main image skeleton */}
            <div className="h-80 md:h-96 bg-white/10 rounded-2xl animate-pulse" />

            {/* Gallery skeleton */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-white/10 rounded-xl animate-pulse" />
              ))}
            </div>

            {/* Details skeleton */}
            <div className="bg-[#0A0F2E] rounded-2xl p-6 border border-white/10 space-y-4">
              <div className="h-7 w-3/4 bg-white/10 rounded animate-pulse" />
              <div className="h-5 w-1/2 bg-white/10 rounded animate-pulse" />
              <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/10">
                {[1, 2, 3].map(i => (
                  <div key={i} className="text-center">
                    <div className="h-5 w-5 bg-white/10 rounded animate-pulse mx-auto mb-1" />
                    <div className="h-6 w-12 bg-white/10 rounded animate-pulse mx-auto" />
                  </div>
                ))}
              </div>
              <div className="h-5 w-24 bg-white/10 rounded animate-pulse mb-2" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-4/6 bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Right: Price + Contact skeleton */}
          <div className="space-y-4">
            <div className="bg-[#0A0F2E] rounded-2xl p-6 border border-white/10 space-y-4">
              <div className="h-9 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              <div className="border-t border-white/10 pt-4">
                <div className="h-4 w-16 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
              </div>
              <div className="h-12 w-full bg-white/10 rounded-lg animate-pulse" />
              <div className="h-11 w-full bg-white/10 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
