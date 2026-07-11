export default function MesazhetLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0A0F2E] flex">
      <aside className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 border-r border-white/8 bg-[#060B1E]">
        <div className="px-4 py-4 border-b border-white/8">
          <div className="h-5 w-24 bg-white/10 rounded animate-pulse mb-3" />
          <div className="h-9 w-full bg-white/5 rounded-xl animate-pulse" />
        </div>
        <div className="p-2 space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-white/10 rounded" />
                <div className="h-3 w-36 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="hidden lg:flex flex-1 items-center justify-center bg-[#0A0F2E]">
        <div className="w-20 h-20 rounded-full bg-white/5 animate-pulse" />
      </main>
    </div>
  )
}
