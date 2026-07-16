'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, CheckCircle2, Mail, Phone, Calendar, Loader2, AlertTriangle } from 'lucide-react'
import type { Profile } from '@/lib/supabase'
import { revalidateSellerListings } from '@/app/actions'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [deleteMessage, setDeleteMessage] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({ first_name: '', last_name: '', phone: '' })
  const [userEmail, setUserEmail] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id,first_name,last_name,phone,email_verified,avatar_url,created_at,updated_at')
        .eq('id', user.id)
        .single()

      if (prof) {
        setProfile(prof as Profile)
        setFormData({ first_name: prof.first_name, last_name: prof.last_name, phone: prof.phone || '' })
      }
      setUserEmail(user?.email || '')
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', user.id)

    if (err) { setError('Gabim gjatë ruajtjes.'); setSaving(false); return }
    setProfile(prev => prev ? { ...prev, ...formData } : prev)
    // Bust ISR cache + client router cache so listing pages reflect the new
    // phone / name immediately - even on client-side navigation.
    try {
      await revalidateSellerListings(user.id)
    } catch (e) {
      console.error('Failed to revalidate listing pages after profile update:', e)
    }
    router.refresh()
    setSuccess(true)
    setEditMode(false)
    setTimeout(() => setSuccess(false), 3000)
    setSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Vetëm foto JPEG, PNG ose WebP lejohen.')
        setUploadingAvatar(false)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Fotoja duhet të jetë më e vogël se 5MB.')
        setUploadingAvatar(false)
        return
      }

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}-avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev)
      try {
        await revalidateSellerListings(user.id)
      } catch (e) {
        console.error('Failed to revalidate after avatar upload:', e)
      }
      router.refresh()
    } catch {
      setError('Ngarkimi i fotos dështoi. Provo përsëri.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Të gjitha banesat tuaja do të fshihen gjithashtu. A jeni të sigurt që doni ta fshini llogarinë? Kjo veprim nuk mund të kthehet.')) return
    await supabase.auth.signOut()
    setDeleteMessage('Kontaktoni support-in për të fshirë llogarinë. Ju keni dalë nga llogaria.')
    setTimeout(() => router.push('/'), 3000)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f4f9f8] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#111827]" />
    </div>
  )

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const isVerified = profile?.email_verified === true
  const initials = profile?.first_name ? profile.first_name[0].toUpperCase() : (userEmail ? userEmail[0].toUpperCase() : '?')

  return (
    <div className="min-h-screen bg-[#f4f9f8] py-10">
      <div className="max-w-4xl 2xl:max-w-[2000px] mx-auto px-4 sm:px-6">
        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-8">Profili im</h1>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-700">Profili u ruajt!</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {deleteMessage && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-700">{deleteMessage}</AlertDescription>
          </Alert>
        )}

        {/* Profile Card */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm flex-shrink-0 bg-gray-100">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#111827]/10 flex items-center justify-center">
                  <span className="text-4xl font-semibold text-[#111827]">{initials}</span>
                </div>
              )}
              <button
                type="button"
                aria-label="Ndrysho foton e profilit"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-[#111827] text-white flex items-center justify-center border-2 border-white hover:bg-[#1F2937] transition-colors cursor-pointer"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              {isVerified ? (
                <>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <h2 className="text-xl font-semibold text-[#1A1A2E]">
                      {profile?.first_name} {profile?.last_name}
                    </h2>
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" /> E verifikuar
                    </span>
                  </div>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 text-sm">
                      <Mail className="h-4 w-4" />
                      <span className="text-[#1A1A2E] font-medium">{userEmail}</span>
                    </div>
                    {profile?.phone && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 text-sm">
                        <Phone className="h-4 w-4" />
                        <span className="text-[#1A1A2E] font-medium">{profile.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span className="text-gray-400 text-xs uppercase tracking-wider mr-1">Anëtar që nga</span>
                      <span className="text-[#1A1A2E] font-medium">{memberSince}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 text-sm mb-1">
                    <Mail className="h-4 w-4" />
                    <span className="text-[#1A1A2E] font-medium">{userEmail}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Llogaria juaj nuk është e verifikuar</p>
                </>
              )}
            </div>
          </div>

          {!isVerified && (
            <div className="mt-6 bg-[#111827]/10 border border-[#111827]/30 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#111827]/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-[#111827]" />
                  </div>
                  <p className="text-gray-700 text-sm">
                    Verifikoni llogarinë tuaj për të pasur qasje të plotë në platformë
                  </p>
                </div>
                <Link
                  href="/completo-profilin"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold bg-[#111827] text-white hover:bg-[#1F2937] transition-colors whitespace-nowrap"
                >
                  Verifiko tani →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Edit Form - verified only */}
        {isVerified && (
          <>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-6">
              {!editMode ? (
                <div className="flex items-center justify-between">
                  <h3 className="text-[#1A1A2E] font-semibold text-lg">Të dhënat e profilit</h3>
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-gray-100 text-[#1A1A2E] hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Ndrysho profilin
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-[#1A1A2E] font-semibold text-lg mb-5">Ndrysho të dhënat</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name" className="text-gray-400 text-xs uppercase tracking-wider">Emri</Label>
                        <Input
                          id="first_name"
                          className="mt-1 h-11 bg-white border-gray-200 text-[#1A1A2E] placeholder:text-gray-400 rounded-xl"
                          value={formData.first_name}
                          onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="text-gray-400 text-xs uppercase tracking-wider">Mbiemri</Label>
                        <Input
                          id="last_name"
                          className="mt-1 h-11 bg-white border-gray-200 text-[#1A1A2E] placeholder:text-gray-400 rounded-xl"
                          value={formData.last_name}
                          onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-400 text-xs uppercase tracking-wider">
                        <Phone className="h-3 w-3 inline mr-1" />
                        Numri i telefonit
                      </Label>
                      <Input
                        id="phone"
                        className="mt-1 h-11 bg-white border-gray-200 text-[#1A1A2E] placeholder:text-gray-400 rounded-xl"
                        placeholder="+383 44 123 456"
                        value={formData.phone}
                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="flex-1 h-11 bg-[#111827] hover:bg-[#1F2937] text-white rounded-xl font-semibold cursor-pointer"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ruaj ndryshimet'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(false)
                          if (profile) {
                            setFormData({
                              first_name: profile.first_name,
                              last_name: profile.last_name,
                              phone: profile.phone || '',
                            })
                          }
                        }}
                        className="flex-1 h-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-[#1A1A2E] font-semibold transition-colors cursor-pointer"
                      >
                        Anulo
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Danger Zone */}
            <div className="border border-red-200 bg-red-50 rounded-2xl p-5 mb-6">
              <h3 className="text-[#1A1A2E] font-semibold text-lg mb-2">Zona e rrezikut</h3>
              <p className="text-gray-500 text-sm mb-4">
                Pasi të fshini llogarinë, të gjitha të dhënat tuaja do të humbasin. Ky veprim nuk mund të kthehet.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
              >
                Fshij llogarinë
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
