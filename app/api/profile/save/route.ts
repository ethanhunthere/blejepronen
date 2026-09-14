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
    let user: any = null
    try {
      const serverSupabase = await createServerSupabaseClient()
      const {
        data: { user: cookieUser },
      } = await serverSupabase.auth.getUser()
      if (cookieUser) user = cookieUser
    } catch {}

    if (!user) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim()
        const supabaseAdmin = getAdminClient()
        const {
          data: { user: bearerUser },
        } = await supabaseAdmin.auth.getUser(token)
        if (bearerUser) user = bearerUser
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sesioni ka skaduar.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const isCompany = typeof body?.isCompany === 'boolean'
      ? body.isCompany
      : (body?.accountType === 'company' || user.user_metadata?.account_type === 'company')

    const individualFirstName = typeof body?.individualFirstName === 'string'
      ? body.individualFirstName.trim()
      : (!isCompany && typeof body?.firstName === 'string' ? body.firstName.trim() : (user.user_metadata?.individual_first_name || ''))

    const individualLastName = typeof body?.individualLastName === 'string'
      ? body.individualLastName.trim()
      : (!isCompany && typeof body?.lastName === 'string' ? body.lastName.trim() : (user.user_metadata?.individual_last_name || ''))

    const individualPhone = typeof body?.individualPhone === 'string'
      ? body.individualPhone.trim()
      : (!isCompany && typeof body?.phone === 'string' ? body.phone.trim() : (user.user_metadata?.individual_phone || ''))

    const individualEmail = typeof body?.individualEmail === 'string'
      ? body.individualEmail.trim()
      : (user.user_metadata?.individual_email || user.email || '')

    const individualBio = typeof body?.individualBio === 'string'
      ? body.individualBio.trim()
      : (typeof body?.bio === 'string' ? body.bio.trim() : (user.user_metadata?.individual_bio || user.user_metadata?.bio || ''))

    const companyName = typeof body?.companyName === 'string'
      ? body.companyName.trim()
      : (isCompany && typeof body?.firstName === 'string' ? body.firstName.trim() : (user.user_metadata?.company_name || ''))

    const companyContactPerson = typeof body?.companyContactPerson === 'string'
      ? body.companyContactPerson.trim()
      : (isCompany && typeof body?.lastName === 'string' && body.lastName !== 'Kompani' ? body.lastName.trim() : (user.user_metadata?.contact_person || ''))

    const companyPhone = typeof body?.companyPhone === 'string'
      ? body.companyPhone.trim()
      : (isCompany && typeof body?.phone === 'string' ? body.phone.trim() : (user.user_metadata?.company_phone || ''))

    const companyEmail = typeof body?.companyEmail === 'string'
      ? body.companyEmail.trim()
      : (user.user_metadata?.company_email || '')

    if (isCompany) {
      if (!companyName && !body?.firstName) {
        return NextResponse.json(
          { error: 'missing_fields', message: 'Emri i kompanisë është i detyrueshëm.' },
          { status: 400 }
        )
      }
    } else {
      if (!individualFirstName && !body?.firstName) {
        return NextResponse.json(
          { error: 'missing_fields', message: 'Emri dhe mbiemri janë të detyrueshëm.' },
          { status: 400 }
        )
      }
    }

    const rawPhone = isCompany
      ? (companyPhone || body?.phone || individualPhone || '')
      : (individualPhone || body?.phone || '')

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
    // User remains verified permanently if already verified in profile, Google OAuth, or auth email confirmed
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
      emailVerified =
        Boolean(existingProfile?.email_verified) ||
        Boolean(user.email_confirmed_at) ||
        Boolean(user.confirmed_at) ||
        isGoogleUser
    }

    // Never downgrade email verification if user was already verified
    if (existingProfile?.email_verified || user.email_confirmed_at || user.confirmed_at || isGoogleUser) {
      emailVerified = true
    }

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
          is_company: isCompany,

          // Preserved Individual details
          individual_first_name: individualFirstName,
          individual_last_name: individualLastName,
          individual_phone: individualPhone,
          individual_email: individualEmail,
          individual_bio: individualBio,

          // Preserved Company details
          company_name: companyName,
          contact_person: companyContactPerson,
          company_phone: companyPhone,
          company_email: companyEmail,
          company_description: companyDescription,
          founded_year: foundedYear,
          nipt: nipt,
          office_address: officeAddress,
          website: website,

          bio: isCompany ? (companyDescription || user.user_metadata?.bio || '') : (individualBio || user.user_metadata?.bio || ''),
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

    const activeFirstName = isCompany
      ? (companyName || user.user_metadata?.company_name || 'Kompani')
      : (individualFirstName || user.user_metadata?.individual_first_name || 'Përdorues')
    const activeLastName = isCompany
      ? (companyContactPerson || user.user_metadata?.contact_person || 'Kompani')
      : (individualLastName || user.user_metadata?.individual_last_name || '')

    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          first_name: activeFirstName,
          last_name: activeLastName,
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
