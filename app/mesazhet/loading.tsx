export default function MesazhetLoading() {
  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-white/10 mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-white/10 animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-60 animate-pulse rounded bg-white/10" />
              </div>
              <div className="h-4 w-12 animate-pulse rounded bg-white/10 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
