import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * /api/push-token — device push-token registry.
 * ─────────────────────────────────────────────────────────────────────
 * Stores the mobile app's Expo/APNs/FCM tokens on the AUTH USER, in
 * `raw_user_meta_data.push_tokens`. No new table, no migration, and the value
 * is per-user private (only ever returned to its owner).
 *
 * Why it lives behind this route and not in a direct Supabase write from the
 * device: mutating `auth.users.user_metadata` requires the service-role key,
 * which must never ship inside a mobile bundle.
 *
 * Contract
 *   POST   { token, type?, platform? } → register/refresh (idempotent)
 *   DELETE { token }                   → unregister
 *   GET                                → list the caller's own tokens
 *
 * Auth: cookie session (web) OR `Authorization: Bearer <access_token>`
 * (mobile), matching /api/profile/save and /api/account/delete.
 *
 * Shape of `user_metadata.push_tokens` — newest first, max MAX_TOKENS:
 *   [{ token, type, platform, updatedAt }]
 */

const MAX_TOKENS = 5
const MAX_TOKEN_LENGTH = 512
const METADATA_KEY = 'push_tokens'

interface PushTokenEntry {
  token: string
  type: string
  platform: string
  updatedAt: string
}

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase admin environment variables are not configured')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Cookie session first (web), then Bearer access token (mobile). */
async function resolveUser(request: Request, admin: SupabaseClient): Promise<User | null> {
  try {
    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()
    if (user) return user
  } catch {
    // No cookie context — fall through to the Bearer path.
  }

  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim()
    if (!token) return null
    const {
      data: { user },
    } = await admin.auth.getUser(token)
    if (user) return user
  }
  return null
}

function normalizeEntries(value: unknown): PushTokenEntry[] {
  if (!Array.isArray(value)) return []
  const out: PushTokenEntry[] = []
  for (const raw of value) {
    // Accept both the object form and a bare token string (defensive: the key
    // may predate this schema if anything else ever wrote to it).
    if (typeof raw === 'string' && raw.trim()) {
      out.push({ token: raw.trim(), type: 'expo', platform: 'unknown', updatedAt: new Date(0).toISOString() })
      continue
    }
    if (raw && typeof raw === 'object') {
      const entry = raw as Partial<PushTokenEntry>
      if (typeof entry.token === 'string' && entry.token.trim()) {
        out.push({
          token: entry.token.trim(),
          type: typeof entry.type === 'string' ? entry.type : 'expo',
          platform: typeof entry.platform === 'string' ? entry.platform : 'unknown',
          updatedAt:
            typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date(0).toISOString(),
        })
      }
    }
  }
  return out
}

function sameEntry(a: PushTokenEntry, b: PushTokenEntry): boolean {
  return a.token === b.token && a.type === b.type && a.platform === b.platform
}

/**
 * Reads the current metadata, then writes back the FULL merged object. GoTrue
 * merges `user_metadata` shallowly, but writing the whole map keeps the result
 * deterministic regardless of that behaviour and cannot drop sibling keys
 * written by /api/profile/save.
 */
async function writeTokens(
  admin: SupabaseClient,
  userId: string,
  tokens: PushTokenEntry[]
): Promise<{ error: string | null }> {
  const { data: current, error: readError } = await admin.auth.admin.getUserById(userId)
  if (readError) return { error: readError.message }

  const existing = (current?.user?.user_metadata ?? {}) as Record<string, unknown>
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing, [METADATA_KEY]: tokens },
  })
  return { error: error?.message ?? null }
}

async function bodyOf(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

function validateToken(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const token = value.trim()
  if (!token || token.length > MAX_TOKEN_LENGTH) return null
  return token
}

// ─── POST: register / refresh ────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const admin = getAdminClient()
    const user = await resolveUser(request, admin)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'unauthorized', message: 'Sesioni ka skaduar.' },
        { status: 401 }
      )
    }

    const body = await bodyOf(request)
    const token = validateToken(body?.token)
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'invalid_token', message: 'A valid push token is required.' },
        { status: 400 }
      )
    }

    const typeRaw = typeof body?.type === 'string' ? body.type.toLowerCase() : 'expo'
    const type = typeRaw === 'device' ? 'device' : 'expo'
    const platformRaw = typeof body?.platform === 'string' ? body.platform.toLowerCase() : 'unknown'
    const platform = ['ios', 'android', 'web'].includes(platformRaw) ? platformRaw : 'unknown'

    const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>
    const current = normalizeEntries(userMeta[METADATA_KEY])
    const incoming: PushTokenEntry = {
      token,
      type,
      platform,
      updatedAt: new Date().toISOString(),
    }

    // Idempotent fast path: the same device re-registering on every launch must
    // not rewrite auth.users (nor bump updatedAt, which would defeat this check).
    if (current.length > 0 && sameEntry(current[0], incoming)) {
      return NextResponse.json({
        success: true,
        changed: false,
        tokens: current.length,
        message: 'Push token already registered.',
      })
    }

    // Dedupe by token value, then move this device to the front, then cap.
    const next: PushTokenEntry[] = [incoming, ...current.filter((e) => e.token !== token)].slice(
      0,
      MAX_TOKENS
    )

    const { error } = await writeTokens(admin, user.id, next)
    if (error) {
      return NextResponse.json(
        { success: false, error: 'write_failed', message: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      changed: true,
      tokens: next.length,
      message: 'Push token registered.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('POST /api/push-token failed:', message)
    return NextResponse.json(
      {
        success: false,
        error: 'server_error',
        message: 'Push token nuk u ruajt. Provoni përsëri.',
      },
      { status: 500 }
    )
  }
}

// ─── DELETE: unregister ──────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const admin = getAdminClient()
    const user = await resolveUser(request, admin)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'unauthorized', message: 'Sesioni ka skaduar.' },
        { status: 401 }
      )
    }

    const body = await bodyOf(request)
    // A missing token means "remove whatever this call registered" — the client
    // may have lost its local copy on sign-out.
    const token = validateToken(body?.token)

    const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>
    const current = normalizeEntries(userMeta[METADATA_KEY])
    const next = token ? current.filter((e) => e.token !== token) : []

    if (next.length === current.length) {
      return NextResponse.json({
        success: true,
        changed: false,
        tokens: current.length,
        message: 'No matching push token.',
      })
    }

    const { error } = await writeTokens(admin, user.id, next)
    if (error) {
      return NextResponse.json(
        { success: false, error: 'write_failed', message: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      changed: true,
      tokens: next.length,
      message: 'Push token removed.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('DELETE /api/push-token failed:', message)
    return NextResponse.json(
      { success: false, error: 'server_error', message: 'Push token nuk u fshi.' },
      { status: 500 }
    )
  }
}

// ─── GET: the caller's own tokens ────────────────────────────────────
export async function GET(request: Request) {
  try {
    const admin = getAdminClient()
    const user = await resolveUser(request, admin)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'unauthorized', message: 'Sesioni ka skaduar.' },
        { status: 401 }
      )
    }

    const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>
    const tokens = normalizeEntries(userMeta[METADATA_KEY])
    return NextResponse.json({ success: true, tokens })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('GET /api/push-token failed:', message)
    return NextResponse.json(
      { success: false, error: 'server_error', message: 'Push tokens could not be read.' },
      { status: 500 }
    )
  }
}
