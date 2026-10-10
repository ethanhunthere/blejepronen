'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, Loader2, RefreshCw } from 'lucide-react'
import { getTelemetrySnapshot, type TelemetrySnapshot } from '@/app/actions'

const POLL_MS = 20_000

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}

/**
 * Live telemetry inspection for the admin dashboard.
 * Polls the service-role-backed server action — `telemetry_events` has RLS
 * with zero policies, so a client-side realtime subscription would receive
 * nothing. Pauses while the tab is hidden.
 */
export default function TelemetryPanel() {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const next = await getTelemetrySnapshot()
      setSnapshot(next)
    } catch (e) {
      console.error('telemetry panel refresh failed:', e)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(() => {
      if (!document.hidden) load()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#00675B]" />
          <h2 className="font-semibold text-[#101828]">Telemetria (24 orët e fundit)</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">përditësohet çdo {POLL_MS / 1000}s</span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00675B] border border-[#00675B]/25 bg-[#00675B]/5 hover:bg-[#00675B]/10 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Përditëso
          </button>
        </div>
      </div>

      <div className="p-6">
        {failed && !loading ? (
          <div className="flex items-center justify-between gap-3 text-sm text-red-600">
            <span>Leximi i telemetrisë dështoi.</span>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-semibold underline cursor-pointer"
            >
              Provo përsëri
            </button>
          </div>
        ) : !snapshot ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#00675B]" />
            Duke lexuar telemetrinë...
          </div>
        ) : !snapshot.available ? (
          <p className="text-sm text-gray-500">
            Tabela <code className="px-1.5 py-0.5 bg-gray-100 rounded">telemetry_events</code> nuk është e
            konfiguruar (mungon shërbimi service-role ose migrimi
            <code className="mx-1 px-1.5 py-0.5 bg-gray-100 rounded">20260928_telemetry.sql</code>).
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-2xl font-bold text-[#101828]">{snapshot.total24h}</p>
                <p className="text-xs text-gray-500 mt-0.5">ngjarje gjithsej</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#101828]">{snapshot.byEvent.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">lloje ngjarjesh</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Sipas ngjarjes</h3>
                {snapshot.byEvent.length === 0 ? (
                  <p className="text-sm text-gray-500">Asnjë ngjarje në 24 orët e fundit.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {snapshot.byEvent.map(row => (
                      <li key={row.event} className="flex items-center justify-between text-sm gap-3">
                        <span className="text-gray-700 font-mono text-[13px] truncate">{row.event}</span>
                        <span className="font-semibold text-[#101828] tabular-nums">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Ngjarjet e fundit</h3>
                {snapshot.latest.length === 0 ? (
                  <p className="text-sm text-gray-500">Asnjë ngjarje e regjistruar.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {snapshot.latest.map(row => (
                      <li key={row.id} className="flex items-center justify-between text-sm gap-3">
                        <span className="text-gray-700 font-mono text-[13px] truncate">{row.event}</span>
                        <span className="text-gray-400 text-xs tabular-nums flex-shrink-0">{formatTime(row.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {snapshot.groupedTotal >= 500 && (
              <p className="text-xs text-gray-400">
                Grupimi mbulon 500 ngjarjet më të fundit; shuma totale është head count-i i saktë i bazës
                ({snapshot.total24h}).
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
