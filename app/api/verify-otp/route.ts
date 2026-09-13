import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getCookieDomain } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000
const attempts = new Map<string, { count: number; lockedUntil?: number }>()

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase admin environment variables are not configured')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'invalid', message: 'Kodi duhet të ketë saktësisht 6 shifra.' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()
    let userId: string | null = null

    if (email) {
      // Find user by email
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (listError) {
        console.error('List users error in verify-otp:', listError)
        return NextResponse.json({ error: 'server_error', message: 'Gabim në lidhje me serverin.' }, { status: 500 })
      }

      const foundUser = listData.users.find(u => u.email?.toLowerCase() === email)
      if (!foundUser) {
        return NextResponse.json({ error: 'not_found', message: 'Përdoruesi me këtë email nuk u gjet.' }, { status: 404 })
      }
      userId = foundUser.id
    } else {
      // Fall back to current authenticated session
      const supabase = await createServerSupabaseClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return NextResponse.json({ error: 'unauthorized', message: 'Ju lutemi jepni email-in ose kyçuni.' }, { status: 401 })
      }
      userId = user.id
    }

    // Check lockout from previous failed attempts
    const attempt = attempts.get(userId)
    if (attempt?.lockedUntil && Date.now() < attempt.lockedUntil) {
      return NextResponse.json({ error: 'too_many_attempts', message: 'Shumë përpjekje të dështuara. Ju lutemi prisni 15 minuta.' }, { status: 429 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('verification_code, verification_code_expires_at')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'profile_not_found', message: 'Profili nuk u gjet.' }, { status: 404 })
    }

    if (!profile.verification_code_expires_at || new Date(profile.verification_code_expires_at) < new Date()) {
      attempts.delete(userId)
      return NextResponse.json({ error: 'expired', message: 'Kodi ka skaduar. Klikoni "Ridërgo kodin" për një kod të ri.' }, { status: 400 })
    }

    if (profile.verification_code !== code) {
      const nextAttempt = attempt ? { count: attempt.count + 1 } : { count: 1 }
      let locked = false
      if (nextAttempt.count >= MAX_ATTEMPTS) {
        attempts.set(userId, { count: nextAttempt.count, lockedUntil: Date.now() + LOCKOUT_MS })
        locked = true
      } else {
        attempts.set(userId, nextAttempt)
      }

      return NextResponse.json(
        {
          error: 'invalid',
          message: locked
            ? 'Keni tejkaluar numrin maksimal të provave. Ju lutemi prisni 15 minuta.'
            : `Kodi është i gabuar. Keni edhe ${MAX_ATTEMPTS - nextAttempt.count} prova.`,
        },
        { status: 400 }
      )
    }

    // Code is correct -> Clear attempts
    attempts.delete(userId)

    // Update profile: keep email_verified: false until profile is completed by user
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        email_verified: false,
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Verify update error:', updateError)
      return NextResponse.json({ error: 'update_failed', message: 'Dështoi përditësimi i profilit.' }, { status: 500 })
    }

    // Confirm user in Supabase auth so user can authenticate
    const { error: confirmAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (confirmAuthError) {
      console.error('Confirm auth user error:', confirmAuthError)
    }

    const response = NextResponse.json({
      success: true,
      message: 'Email-i u konfirmua me sukses!',
    })

    if (password && email) {
      try {
        const cookieStore = await cookies()
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).hostname
        const cookieDomain = getCookieDomain(host)

        const ssrClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return cookieStore.getAll()
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  const opts = cookieDomain ? { ...options, domain: cookieDomain } : options
                  try {
                    cookieStore.set(name, value, opts)
                  } catch {}
                  response.cookies.set(name, value, opts)
                })
              },
            },
          }
        )

        const { data: signInData, error: signInErr } = await ssrClient.auth.signInWithPassword({
          email,
          password,
        })

        if (!signInErr && signInData?.session) {
          const finalResponse = NextResponse.json(
            {
              success: true,
              session: signInData.session,
              message: 'Email-i u konfirmua me sukses!',
            }
          )
          response.cookies.getAll().forEach((cookie) => {
            finalResponse.cookies.set(cookie)
          })
          return finalResponse
        }
      } catch (authErr) {
        console.warn('Server session creation notice in verify-otp:', authErr)
      }
    }

    return response
  } catch (err) {
    console.error('Verify OTP error:', err)
    return NextResponse.json({ error: 'internal_error', message: 'Gabim i brendshëm i serverit.' }, { status: 500 })
  }
}
