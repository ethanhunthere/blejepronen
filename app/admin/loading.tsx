export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-8" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#0A0F2E] rounded-2xl p-5 border border-white/10 text-center">
              <div className="h-9 w-16 bg-white/10 rounded animate-pulse mx-auto mb-2" />
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-[#0A0F2E] rounded-2xl border border-white/10 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-white/10">
            <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="px-6 py-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-full bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Second table skeleton */}
        <div className="bg-[#0A0F2E] rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <div className="h-5 w-28 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="px-6 py-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-full bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
