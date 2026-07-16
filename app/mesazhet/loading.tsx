export default function MesazhetLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f4f9f8] flex">
      <aside className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 border-r border-gray-100 bg-white">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-9 w-full bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="p-2 space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-3 w-36 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="hidden lg:flex flex-1 items-center justify-center bg-[#f4f9f8]">
        <div className="w-20 h-20 rounded-full bg-gray-100 animate-pulse" />
      </main>
    </div>
  )
}
