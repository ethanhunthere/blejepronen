'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import ListingCard from '@/components/ListingCard'
import { User, Phone, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { Listing, Profile } from '@/lib/supabase'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ first_name: '', last_name: '', phone: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id,first_name,last_name,phone,phone_verified,created_at,updated_at')
        .eq('id', user.id)
        .single()

      if (prof) {
        setProfile(prof as Profile)
        setFormData({ first_name: prof.first_name, last_name: prof.last_name, phone: prof.phone || '' })
      }

      const { data: myListings } = await supabase
        .from('listings')
        .select('id,title,price,city,address,type,images,rooms,area_m2,is_featured,is_active,created_at,user_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50)

      setListings((myListings || []) as unknown as Listing[])
      setLoading(false)
    }
    load()
  }, [])

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
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    setSaving(false)
  }

  const handleDeleteListing = async (id: string) => {
    if (!confirm('A jeni të sigurt që doni ta fshini këtë listim?')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('listings').update({ is_active: false }).eq('id', id).eq('user_id', user.id)
    setListings(prev => prev.filter(l => l.id !== id))
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0F2E] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#1B4FFF]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-4xl 2xl:max-w-[2000px] mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-8">Profili im</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Profile Form */}
          <div className="lg:col-span-1">
            <div className="bg-[#111936] rounded-2xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row items-center sm:items-start mb-6">
                <div className="w-14 h-14 bg-[#1B4FFF]/10 rounded-full flex items-center justify-center mr-0 sm:mr-4 mb-3 sm:mb-0">
                  <User className="h-7 w-7 text-[#1B4FFF]" />
                </div>
                <div>
                  <p className="font-semibold text-white">{profile?.first_name} {profile?.last_name}</p>
                  <div className="flex items-center mt-1">
                    {profile?.phone_verified ? (
                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" /> Verifikuar
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                        <XCircle className="h-3 w-3 mr-1" /> Pa verifikim
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {success && (
                <Alert className="mb-4 bg-green-900/20 border-green-800">
                  <AlertDescription className="text-green-300">Profili u ruajt!</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <Label htmlFor="first_name">Emri</Label>
                  <Input
                    id="first_name"
                    className="mt-1 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                    value={formData.first_name}
                    onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Mbiemri</Label>
                  <Input
                    id="last_name"
                    className="mt-1 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                    value={formData.last_name}
                    onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">
                    <Phone className="h-3 w-3 inline mr-1" />
                    Numri i telefonit
                  </Label>
                  <Input
                    id="phone"
                    className="mt-1 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                    placeholder="+383 44 123 456"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-11 bg-[#1B4FFF] hover:bg-[#1640CC] text-white rounded-xl font-semibold cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ruaj ndryshimet'}
                </Button>
              </form>
            </div>
          </div>

          {/* Right: My Listings */}
          <div className="lg:col-span-2">
            <h2 className="font-semibold text-white mb-4">
              Listimet e mia ({listings.length})
            </h2>
            {listings.length === 0 ? (
              <div className="bg-[#111936] rounded-2xl p-10 text-center border border-white/10">
                <p className="text-gray-500 mb-4">Nuk keni listuar asnjë banesë ende.</p>
                <Button
                  onClick={() => router.push('/posto-banese')}
                  className="h-11 w-full sm:w-auto px-5 bg-[#1B4FFF] hover:bg-[#1640CC] text-white rounded-xl font-semibold cursor-pointer"
                >
                  Posto banesën tënde
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listings.map(listing => (
                  <div key={listing.id} className="relative">
                    <ListingCard listing={listing} />
                    <button
                      onClick={() => handleDeleteListing(listing.id)}
                      className="absolute top-3 right-3 h-11 px-3 bg-red-500/20 text-red-400 text-sm border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors z-10 inline-flex items-center justify-center cursor-pointer font-semibold"
                    >
                      Fshi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
