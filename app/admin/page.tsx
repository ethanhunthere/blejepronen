import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { toggleListingStatus, toggleUserBan, resolveListingReport } from '@/app/actions'
import TelemetryPanel from './telemetry-panel'
import type { Profile, Listing } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

const REPORT_REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  fraudulent: 'Mashtrim / mashtrues',
  duplicate: 'Shpallje e dyfishtë',
  offensive: 'Përmbajtje ofenduese',
  other: 'Tjetër',
}

interface ListingWithSeller extends Listing {
  profiles: { first_name: string; last_name: string } | null
}

interface ReportRow {
  id: number
  listing_id: string
  reporter_id: string
  reason: string
  note: string | null
  created_at: string
}

const TABLE_ROWS = 50

async function fetchBannedMap(admin: SupabaseClient): Promise<Set<string>> {
  const banned = new Set<string>()
  try {
    const perPage = 100
    // Walk auth pages until exhausted (safety cap = 50 pages / 5 000 users) so
    // the Blloko/Çkyç label matches the real auth ban state.
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error || !data?.users?.length) break
      const now = Date.now()
      for (const u of data.users) {
        if (u.banned_until && new Date(u.banned_until).getTime() > now) banned.add(u.id)
      }
      if (data.users.length < perPage) break
    }
  } catch (e) {
    console.error('fetchBannedMap failed:', e)
  }
  return banned
}

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAIL || user.email !== ADMIN_EMAIL) redirect('/')

  // Use service-role client so the admin dashboard can read all rows regardless
  // of RLS policies. Falls back to the normal server client if not configured.
  const adminSupabase = await createAdminSupabaseClient()

  // ---- KPIs: exact database head counts (no limit + length slicing) ----
  const [
    { count: listingsTotal },
    { count: listingsActive },
    { count: profilesTotal },
    { count: reportsOpen },
    listingsRes,
    profilesRes,
    reportsRes,
    bannedSet,
  ] = await Promise.all([
    adminSupabase.from('listings').select('id', { count: 'exact', head: true }),
    adminSupabase.from('listings').select('id', { count: 'exact', head: true }).eq('is_active', true),
    adminSupabase.from('profiles').select('id', { count: 'exact', head: true }),
    adminSupabase.from('listing_reports').select('id', { count: 'exact', head: true }),
    adminSupabase
      .from('listings')
      .select('id,title,price,city,type,is_active,created_at,user_id,profiles(first_name,last_name)')
      .order('created_at', { ascending: false })
      .limit(TABLE_ROWS),
    adminSupabase
      .from('profiles')
      .select('id,first_name,last_name,phone,email_verified,created_at')
      .order('created_at', { ascending: false })
      .limit(TABLE_ROWS),
    adminSupabase
      .from('listing_reports')
      .select('id,listing_id,reporter_id,reason,note,created_at')
      .order('created_at', { ascending: false })
      .limit(TABLE_ROWS),
    fetchBannedMap(adminSupabase),
  ])

  const typedListings = (listingsRes.data || []) as unknown as ListingWithSeller[]
  const typedProfiles = (profilesRes.data || []) as unknown as Profile[]
  const reportRows = (reportsRes.data || []) as unknown as ReportRow[]
  const reportsTableMissing = reportsRes.error?.code === '42P01'

  // Resolve report rows → listing titles / reporter names (no PostgREST embed:
  // FK constraint names may drift, ids never do).
  let listingTitleMap = new Map<string, string>()
  let reporterNameMap = new Map<string, string>()
  if (reportRows.length > 0) {
    const listingIds = [...new Set(reportRows.map((r) => r.listing_id))]
    const reporterIds = [...new Set(reportRows.map((r) => r.reporter_id))]
    const [listingsById, reportersById] = await Promise.all([
      adminSupabase.from('listings').select('id,title').in('id', listingIds),
      adminSupabase.from('profiles').select('id,first_name,last_name').in('id', reporterIds),
    ])
    listingTitleMap = new Map((listingsById.data || []).map((l) => [l.id as string, l.title as string]))
    reporterNameMap = new Map(
      (reportersById.data || []).map((p) => [p.id as string, `${p.first_name} ${p.last_name}`.trim()])
    )
  }

  const total = listingsTotal ?? 0
  const active = listingsActive ?? 0

  const stats = [
    { label: 'Listime totale', value: total },
    { label: 'Listime aktive', value: active },
    { label: 'Listime joaktive', value: total - active },
    { label: 'Përdorues', value: profilesTotal ?? 0 },
    { label: 'Raporte të hapura', value: reportsOpen ?? 0 },
  ]

  return (
    <div className="min-h-screen bg-[#F2F7F7]">
      <div className="w-full px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-[#101828] mb-8">Admin Dashboard</h1>

        {/* Stats — exact head counts from the database */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
              <p className="text-3xl font-bold text-[#101828]">{stat.value}</p>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Listings Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-[#101828]">Të gjitha listimet</h2>
            <span className="text-xs text-gray-500">Të fundit {typedListings.length} nga {total} · shifrat sipër janë të plota</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Titulli</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Shitësi</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Qyteti</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Çmimi</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Statusi</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Veprimet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {typedListings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Asnjë listim.
                    </td>
                  </tr>
                )}
                {typedListings.map(listing => (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 md:px-6 md:py-4 font-medium text-[#101828] max-w-xs truncate">
                      {listing.title}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-gray-600">
                      {listing.profiles?.first_name} {listing.profiles?.last_name}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-gray-600">{listing.city}</td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-[#101828] font-medium">€{listing.price.toLocaleString()}</td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <Badge className={listing.is_active ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'}>
                        {listing.is_active ? 'Aktiv' : 'Joaktiv'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <Link href={`/listings/${listing.id}`} className="text-[#101828] hover:underline text-sm">
                          Shiko →
                        </Link>
                        <form action={toggleListingStatus.bind(null, listing.id, !listing.is_active)} className="inline">
                          <button
                            type="submit"
                            className={`text-sm font-semibold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer ${
                              listing.is_active
                                ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
                                : 'text-[#00675B] border-[#00675B]/25 bg-[#00675B]/5 hover:bg-[#00675B]/10'
                            }`}
                          >
                            {listing.is_active ? 'Çaktivizo' : 'Aktivizo'}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Abuse Reports */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-[#101828]">Raportet e abuzimit</h2>
            <span className="text-xs text-gray-500">
              {reportsTableMissing ? 'Tabela listing_reports s\'është aplikuar ende' : `${reportsOpen ?? reportRows.length} të hapura`}
            </span>
          </div>
          <div className="overflow-x-auto">
            {reportsTableMissing ? (
              <p className="px-6 py-8 text-sm text-gray-500">
                Fjalori i raporteve mungon. Aplikoni migrimin
                <code className="mx-1 px-1.5 py-0.5 bg-gray-100 rounded">20260928_003_host_lifecycle_reports_analytics.sql</code>
                që seksioni të funksionojë.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Arsyeja</th>
                    <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Listimi</th>
                    <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Raportuesi</th>
                    <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Data</th>
                    <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Veprimet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reportRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Asnjë raport i hapur.
                      </td>
                    </tr>
                  )}
                  {reportRows.map(report => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 md:px-6 md:py-4 font-medium text-[#101828]">
                        {REPORT_REASON_LABELS[report.reason] || report.reason}
                        {report.note && (
                          <p className="text-xs text-gray-500 font-normal mt-0.5 max-w-[240px] truncate" title={report.note}>
                            {report.note}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4 text-gray-600 max-w-[220px] truncate">
                        {listingTitleMap.get(report.listing_id) || '—'}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4 text-gray-600">
                        {reporterNameMap.get(report.reporter_id) || '—'}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4 text-gray-600">
                        {new Date(report.created_at).toLocaleDateString('sq-AL')}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <Link href={`/listings/${report.listing_id}`} className="text-[#101828] hover:underline text-sm">
                            Shiko →
                          </Link>
                          <form action={resolveListingReport.bind(null, report.id)} className="inline">
                            <button
                              type="submit"
                              className="text-sm font-semibold rounded-lg px-2.5 py-1 border text-[#00675B] border-[#00675B]/25 bg-[#00675B]/5 hover:bg-[#00675B]/10 transition-colors cursor-pointer"
                            >
                              Mbyll raportin
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-[#101828]">Përdoruesit</h2>
            <span className="text-xs text-gray-500">Të fundit {typedProfiles.length} nga {profilesTotal ?? 0}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Emri</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Telefoni</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Verifikuar</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Regjistruar</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Llogaria</th>
                  <th className="text-left px-3 py-3 md:px-6 md:py-3 text-gray-500 font-medium">Veprimet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {typedProfiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Asnjë përdorues.
                    </td>
                  </tr>
                )}
                {typedProfiles.map(profile => {
                  const isBanned = bannedSet.has(profile.id)
                  return (
                    <tr key={profile.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 md:px-6 md:py-4 font-medium text-[#101828]">
                        {profile.first_name} {profile.last_name}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4 text-gray-600">{profile.phone || '-'}</td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <Badge className={profile.email_verified ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}>
                          {profile.email_verified ? 'Po' : 'Jo'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4 text-gray-600">
                        {new Date(profile.created_at).toLocaleDateString('sq-AL')}
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <Badge className={isBanned ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}>
                          {isBanned ? 'E bllokuar' : 'Aktive'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 md:px-6 md:py-4">
                        <form action={toggleUserBan.bind(null, profile.id)} className="inline">
                          <button
                            type="submit"
                            className={`text-sm font-semibold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer ${
                              isBanned
                                ? 'text-[#00675B] border-[#00675B]/25 bg-[#00675B]/5 hover:bg-[#00675B]/10'
                                : 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
                            }`}
                          >
                            {isBanned ? 'Çkyç llogarinë' : 'Blloko llogarinë'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live telemetry (stream) */}
        <TelemetryPanel />
      </div>
    </div>
  )
}
