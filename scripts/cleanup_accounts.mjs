import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) {
    env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const keepEmail = 'hereisfrescoid@gmail.com'.toLowerCase()

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('Listing users from Supabase auth...')
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) {
    console.error('Failed to list users:', error)
    return
  }

  const users = data.users || []
  console.log(`Found ${users.length} total user accounts in Supabase auth.`)

  for (const u of users) {
    const email = (u.email || '').toLowerCase().trim()
    console.log(`\nUser: ${email} (ID: ${u.id})`)
    if (email !== keepEmail) {
      console.log(`  Deleting user: ${email}...`)
      try {
        await admin.from('favorites').delete().eq('user_id', u.id)
        await admin.from('messages').delete().eq('sender_id', u.id)
        await admin.from('conversations').delete().or(`buyer_id.eq.${u.id},seller_id.eq.${u.id}`)
        await admin.from('profiles').delete().eq('id', u.id)
      } catch (err) {
        console.warn('  Notice during table cleanup:', err?.message)
      }

      const { error: delError } = await admin.auth.admin.deleteUser(u.id)
      if (delError) {
        console.error(`  Error deleting ${email}:`, delError.message)
      } else {
        console.log(`  ✓ Successfully deleted account: ${email}`)
      }
    } else {
      console.log(`  ★ PRESERVED (KEEPING): ${email}`)
    }
  }

  // Double-check final list
  const { data: finalData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 })
  console.log('\nFinal user accounts remaining:')
  finalData?.users?.forEach(u => {
    console.log(`- ${u.email} (${u.id})`)
  })
}

run()
