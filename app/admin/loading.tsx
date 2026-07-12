export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
              <div className="h-9 w-16 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="px-6 py-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-full bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Second table skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="px-6 py-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-full bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
