import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { normalizePhoneNumber } from '@/lib/phone'

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
    const serverSupabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sesioni ka skaduar.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : ''
    const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : ''
    const rawPhone = typeof body?.phone === 'string' ? body.phone.trim() : ''

    const isCompany = typeof body?.isCompany === 'boolean'
      ? body.isCompany
      : (body?.accountType === 'company' || user.user_metadata?.account_type === 'company')

    if (!firstName) {
      return NextResponse.json(
        {
          error: 'missing_fields',
          message: isCompany ? 'Emri i kompanisë është i detyrueshëm.' : 'Emri dhe mbiemri janë të detyrueshëm.',
        },
        { status: 400 }
      )
    }

    if (!isCompany && !lastName) {
      return NextResponse.json(
        {
          error: 'missing_fields',
          message: 'Emri dhe mbiemri janë të detyrueshëm.',
        },
        { status: 400 }
      )
    }

    const finalLastName = isCompany && !lastName ? 'Kompani' : lastName

    let finalPhone = ''
    const supabaseAdmin = getAdminClient()

    if (rawPhone) {
      finalPhone = normalizePhoneNumber(rawPhone)

      // Verify phone uniqueness across other accounts
      const { data: profiles, error: phoneErr } = await supabaseAdmin
        .from('profiles')
        .select('id, phone')
        .neq('id', user.id)
        .neq('phone', '')
        .not('phone', 'is', null)

      if (!phoneErr && profiles) {
        const duplicate = profiles.find((p) => {
          const norm = normalizePhoneNumber(p.phone || '')
          return norm === finalPhone || p.phone === finalPhone || p.phone === rawPhone
        })

        if (duplicate) {
          return NextResponse.json(
            {
              error: 'duplicate_phone',
              message: 'Ky numër telefoni është i regjistruar tashmë në një llogari tjetër.',
            },
            { status: 409 }
          )
        }
      }
    }

    // Determine if email is verified:
    // Only verify if explicitly requested (markEmailVerified), Google OAuth, or already verified in profile
    const isGoogleUser = user.app_metadata?.provider === 'google'
    let emailVerified = false

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('email_verified, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    if (typeof body?.emailVerified === 'boolean') {
      emailVerified = body.emailVerified
    } else {
      emailVerified = Boolean(existingProfile?.email_verified) || isGoogleUser
    }

    const bio = typeof body?.bio === 'string' ? body.bio.trim() : (user.user_metadata?.bio || '')
    const city = typeof body?.city === 'string' ? body.city.trim() : (user.user_metadata?.city || '')
    const nipt = typeof body?.nipt === 'string' ? body.nipt.trim() : (user.user_metadata?.nipt || '')
    const officeAddress = typeof body?.officeAddress === 'string' ? body.officeAddress.trim() : (user.user_metadata?.office_address || '')
    const website = typeof body?.website === 'string' ? body.website.trim() : (user.user_metadata?.website || '')
    const linkedin = typeof body?.linkedin === 'string' ? body.linkedin.trim() : (user.user_metadata?.linkedin || '')
    const youtube = typeof body?.youtube === 'string' ? body.youtube.trim() : (user.user_metadata?.youtube || '')
    const twitter = typeof body?.twitter === 'string' ? body.twitter.trim() : (user.user_metadata?.twitter || '')

    const notifications = body?.notifications && typeof body.notifications === 'object'
      ? body.notifications
      : (user.user_metadata?.notifications || {})

    const privacy = body?.privacy && typeof body.privacy === 'object'
      ? body.privacy
      : (user.user_metadata?.privacy || {})

    const companyDescription = typeof body?.companyDescription === 'string' ? body.companyDescription.trim() : (typeof body?.description === 'string' ? body.description.trim() : (user.user_metadata?.company_description || ''))
    const foundedYear = typeof body?.foundedYear === 'string' || typeof body?.foundedYear === 'number' ? String(body.foundedYear).trim() : (user.user_metadata?.founded_year || '')

    const instagram = typeof body?.instagram === 'string' ? body.instagram.trim() : (typeof body?.socials?.instagram === 'string' ? body.socials.instagram.trim() : (user.user_metadata?.instagram || ''))
    const facebook = typeof body?.facebook === 'string' ? body.facebook.trim() : (typeof body?.socials?.facebook === 'string' ? body.socials.facebook.trim() : (user.user_metadata?.facebook || ''))
    const whatsapp = typeof body?.whatsapp === 'string' ? body.whatsapp.trim() : (typeof body?.socials?.whatsapp === 'string' ? body.socials.whatsapp.trim() : (user.user_metadata?.whatsapp || ''))
    const tiktok = typeof body?.tiktok === 'string' ? body.tiktok.trim() : (typeof body?.socials?.tiktok === 'string' ? body.socials.tiktok.trim() : (user.user_metadata?.tiktok || ''))

    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          account_type: isCompany ? 'company' : 'individual',
          ...(isCompany
            ? {
                company_name: firstName,
                ...(companyDescription ? { company_description: companyDescription } : {}),
                ...(foundedYear ? { founded_year: foundedYear } : {}),
                ...(lastName && lastName !== 'Kompani' ? { contact_person: lastName } : {}),
                ...(nipt ? { nipt } : {}),
                ...(officeAddress ? { office_address: officeAddress } : {}),
                ...(website ? { website } : {}),
              }
            : {
                bio,
              }),
          city,
          onboarding_completed: true,
          ...(finalPhone ? { phone: finalPhone } : {}),
          instagram,
          facebook,
          whatsapp,
          tiktok,
          linkedin,
          youtube,
          twitter,
          notifications,
          privacy,
        },
      })
    } catch (e) {
      console.error('Update user_metadata error in profile save:', e)
    }

    const finalAvatar = body?.avatarUrl || existingProfile?.avatar_url || '/avatars/avatar-1.png'

    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          first_name: firstName,
          last_name: finalLastName,
          phone: finalPhone,
          email_verified: emailVerified,
          avatar_url: finalAvatar,
        },
        { onConflict: 'id' }
      )

    if (upsertError) {
      console.error('Profile upsert error in api/profile/save:', upsertError)
      return NextResponse.json({ error: 'save_failed', message: 'Gabim gjatë ruajtjes së profilit.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailVerified })
  } catch (err) {
    console.error('Profile save API error:', err)
    return NextResponse.json({ error: 'internal_error', message: 'Gabim i brendshëm.' }, { status: 500 })
  }
}
