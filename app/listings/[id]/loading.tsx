export default function ListingDetailLoading() {
  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-5xl 2xl:max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link skeleton */}
        <div className="h-5 w-36 bg-white/10 rounded animate-pulse mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main image skeleton */}
            <div className="h-96 rounded-2xl bg-white/10 animate-pulse" />

            {/* Thumbnail skeletons */}
            <div className="flex gap-3 overflow-x-auto">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 w-20 flex-shrink-0 rounded-lg bg-white/10 animate-pulse" />
              ))}
            </div>

            {/* Title + meta skeleton */}
            <div className="bg-[#111936] rounded-2xl p-6 border border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="h-8 w-3/4 bg-white/10 rounded animate-pulse" />
                <div className="h-6 w-16 bg-white/10 rounded animate-pulse" />
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
                <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-4/6 bg-white/10 rounded animate-pulse" />
              </div>
            </div>

            {/* Stats / features skeleton */}
            <div className="bg-[#111936] rounded-2xl p-6 border border-white/10 space-y-4">
              <div className="h-6 w-40 bg-white/10 rounded animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-5 w-24 bg-white/10 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-1">
            <div className="bg-[#111936] rounded-2xl p-6 border border-white/10 sticky top-24 space-y-4">
              {/* Price */}
              <div className="h-9 w-40 bg-white/10 rounded animate-pulse" />
              {/* Seller label */}
              <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
              {/* Seller name */}
              <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
              {/* Contact buttons */}
              <div className="h-12 w-full bg-white/10 rounded-lg animate-pulse" />
              <div className="h-11 w-full bg-white/10 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
