'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Upload, X, Loader2 } from 'lucide-react'

const CITIES = ['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë', 'Ferizaj']

const CONDITIONS = [
  { value: 'e-re', label: 'E re' },
  { value: 'e-vjeter', label: 'E vjetër' },
  { value: 'rinovuar', label: 'E rinovuar' },
  { value: 'ka-nevojë-për-rinovim', label: 'Ka nevojë për rinovim' },
]

const FLOORS = ['Bodrum', 'P/D', '1', '2', '3', '4', '5', '6', '7+']

const APARTMENT_TYPES = ['Studio', '1+1', '2+1', '3+1', '4+1', '5+1', 'Vilë', 'Duplex']

const FEATURES = [
  'Parking',
  'Ashensor',
  'Ballkon',
  'Bodrum',
  'Ngrohje qendrore',
  'Klimë',
  'Mobilie',
  'Siguri 24h',
  'Panoramë',
  'Kopësht',
]

const AREA_PRESETS = [
  { label: '30-50', value: 40 },
  { label: '50-80', value: 65 },
  { label: '80-120', value: 100 },
  { label: '120-200', value: 160 },
  { label: '200+', value: 250 },
]

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_PRICE = 10_000_000

interface FormData {
  title: string
  description: string
  price: string
  city: string
  address: string
  rooms: string
  area_m2: string
  type: 'shitje' | 'qira'
  condition: string
  floor: string
  apartment_type: string
  features: string[]
}

export default function PostoBanesePage() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    price: '',
    city: 'Prishtinë',
    address: '',
    rooms: '',
    area_m2: '',
    type: 'shitje',
    condition: 'e-re',
    floor: '',
    apartment_type: '',
    features: []
  })
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 10) {
      setError('Maksimumi 10 foto lejohen.')
      return
    }

    // Validate file type and size
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError('Vetëm foto në format JPEG, PNG, WebP ose GIF lejohen.')
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('Çdo foto duhet të jetë më e vogël se 10MB.')
        return
      }
    }

    const newPreviews = files.map(f => URL.createObjectURL(f))
    setImages(prev => [...prev, ...files])
    setPreviews(prev => [...prev, ...newPreviews])
  }, [images])

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setImages(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setError('')

    // --- Step 0: Validate authentication ---
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error during posto-banese submit:', JSON.stringify(authError))
      setError('Sesioni ka skaduar. Ju lutemi ri-regjistrohuni.')
      setUploading(false)
      return
    }

    if (!user) {
      console.error('No user session found during posto-banese submit')
      router.push('/login')
      return
    }

    setUnverified(false)

    // --- Step 0.5: Ensure profile row exists (FK listings.user_id → profiles.id) ---
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, first_name, email_verified')
      .eq('id', user.id)
      .maybeSingle()

    if (profileCheckError) {
      console.error('Profile check error:', JSON.stringify(profileCheckError))
      setError('Gabim gjatë verifikimit të profilit. Provo përsëri.')
      setUploading(false)
      return
    }

    if (!existingProfile) {
      // Create minimal profile row so the FK constraint passes
      const { error: createProfileErr } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          first_name: user.user_metadata?.given_name || user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Përdorues',
          last_name: user.user_metadata?.family_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        })

      if (createProfileErr) {
        console.error('Failed to create missing profile row:', JSON.stringify(createProfileErr))
        setError('Nuk mund të krijohet profili. Ju lutemi plotësoni profilin së pari.')
        setUploading(false)
        return
      }
    }

    if (!existingProfile?.email_verified) {
      setUnverified(true)
      setUploading(false)
      return
    }

    // --- Step 1: Validate price ---
    const priceNum = Number(formData.price)
    if (isNaN(priceNum) || priceNum <= 0 || priceNum > MAX_PRICE) {
      setError(`Çmimi duhet të jetë mes 1 dhe ${MAX_PRICE.toLocaleString()}€.`)
      setUploading(false)
      return
    }

    // --- Step 2: Upload images ---
    let imageUrls: string[] = []

    try {
      const uploadPromises = images.map(async (image, idx) => {
        const ext = image.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${Date.now()}-${idx}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(path, image, { contentType: image.type })

        if (uploadError) {
          console.error('Image upload error for', image.name, ':', JSON.stringify(uploadError))
          throw new Error(uploadError.message || 'Upload failed')
        }

        const { data: { publicUrl } } = supabase.storage
          .from('listings')
          .getPublicUrl(path)

        return publicUrl
      })

      imageUrls = await Promise.all(uploadPromises)
    } catch (uploadErr) {
      const message = uploadErr instanceof Error ? uploadErr.message : 'Gabim i panjohur'
      console.error('Image upload batch failed:', message)
      setError(`Ngarkimi i fotove dështoi: ${message}. Sigurohu që "listings" bucket ekziston në Supabase Storage.`)
      setUploading(false)
      return
    }

    // --- Step 3: Insert listing ---
    const { data: listing, error: insertError } = await supabase
      .from('listings')
      .insert({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: priceNum,
        city: formData.city,
        address: formData.address.trim(),
        rooms: Number(formData.rooms),
        area_m2: Number(formData.area_m2),
        type: formData.type,
        condition: formData.condition,
        floor: formData.floor || null,
        apartment_type: formData.apartment_type || null,
        features: formData.features,
        images: imageUrls,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Listing insert error:', JSON.stringify(insertError))
      // Map common Supabase errors to Albanian messages
      if (insertError.code === '42501') {
        setError('Nuk keni leje për të postuar. Kontaktoni mbështetjen.')
      } else if (insertError.code === '23503') {
        setError('Profili juaj nuk është kompletuar. Vizitoni /completo-profilin së pari.')
      } else if (insertError.code === '23505') {
        setError('Ky listim ekziston tashmë.')
      } else if (insertError.code === '23502') {
        setError('Disa fusha të detyrueshme mungojnë. Plotësoni të gjitha fushat.')
      } else if (insertError.code === '23514') {
        setError('Të dhëna të pavlefshme. Kontrolloni qytetin ose llojin e listimit.')
      } else {
        setError(`Gabim gjatë ruajtjes së listimit (${insertError.code || 'e panjohur'}). Provo përsëri.`)
      }
      setUploading(false)
      return
    }

    // --- Success ---
    router.push(`/listings/${listing.id}`)
  }

  return (
    <div className="min-h-screen bg-[#0A0F2E]">
      <div className="max-w-2xl 2xl:max-w-[2000px] mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center mb-8">
          <Building2 className="h-7 w-7 text-[#1B4FFF] mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-white">Posto banesën tënde</h1>
            <p className="text-gray-400 text-sm">30 ditë falas, pa nevojë për kartë krediti</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {unverified && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              Duhet të verifikoni profilin tuaj para se të postoni banesë. Shkoni te profili juaj dhe klikoni 'Verifiko profilin'.
            </AlertDescription>
            <div className="mt-3">
              <Link
                href="/completo-profilin"
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold bg-[#1B4FFF] text-white hover:bg-[#1640CC] transition-colors"
              >
                Verifiko profilin
              </Link>
            </div>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Toggle */}
          <div className="bg-[#111936] rounded-2xl p-6 border border-white/10">
            <Label className="text-base font-semibold mb-3 block">Lloji i listimit</Label>
            <div role="radiogroup" aria-label="Lloji i listimit" className="flex gap-3">
              {(['shitje', 'qira'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={formData.type === t}
                  onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                  className={`flex-1 min-h-11 py-3 rounded-xl font-medium transition-all text-sm cursor-pointer ${
                    formData.type === t
                      ? 'bg-[#1B4FFF] text-white shadow-sm'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {t === 'shitje' ? '🏠 Shitje' : '🔑 Me qira'}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-[#111936] rounded-2xl p-6 border border-white/10 space-y-4">
            <h2 className="font-semibold text-white">Informacioni bazë</h2>

            <div>
              <Label htmlFor="title">Titulli i listimit *</Label>
              <Input
                id="title"
                name="title"
                placeholder="p.sh. Banesë 3+1 në qendër të Prishtinës"
                className="mt-1 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Përshkrimi *</Label>
              <textarea
                id="description"
                name="description"
                placeholder="Përshkruaj banesën, lagjen, kushtet e shitjes..."
                className="mt-1 w-full min-h-[120px] px-3 py-2 rounded-lg border border-white/10 text-sm bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#1B4FFF] resize-none"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Gjendja e banesës</Label>
              <div role="radiogroup" aria-label="Gjendja e banesës" className="flex flex-wrap gap-2">
                {CONDITIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={formData.condition === c.value}
                    onClick={() => setFormData(prev => ({ ...prev, condition: c.value }))}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      formData.condition === c.value
                        ? 'bg-[#1B4FFF] border border-[#1B4FFF] text-white shadow-lg shadow-[#1B4FFF]/20'
                        : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">
                  Çmimi (€) {formData.type === 'qira' ? '/muaj' : ''} *
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  placeholder={formData.type === 'shitje' ? '85000' : '400'}
                  className="mt-1 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                  value={formData.price}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="area_m2">Sipërfaqja (m²) *</Label>
                <Input
                  id="area_m2"
                  name="area_m2"
                  type="number"
                  placeholder="75"
                  className="mt-1 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                  value={formData.area_m2}
                  onChange={handleChange}
                  required
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {AREA_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, area_m2: preset.value.toString() }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                        formData.area_m2 === preset.value.toString()
                          ? 'bg-[#1B4FFF] border border-[#1B4FFF] text-white'
                          : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {preset.label} m²
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rooms">Numri i dhomave *</Label>
                <select
                  id="rooms"
                  name="rooms"
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-white/10 text-sm bg-[#111936] text-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
                  value={formData.rooms}
                  onChange={handleChange}
                  required
                >
                  <option value="">Zgjedh</option>
                  {[1,2,3,4,5,6].map(r => (
                    <option key={r} value={r}>{r} dhoma</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="city">Qyteti *</Label>
                <select
                  id="city"
                  name="city"
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-white/10 text-sm bg-[#111936] text-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
                  value={formData.city}
                  onChange={handleChange}
                  required
                >
                  {CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Adresa e saktë *</Label>
              <Input
                id="address"
                name="address"
                placeholder="p.sh. Lagjja Dardania, Rruga Fehmi Agani"
                className="mt-1 h-11 bg-white/10 text-white placeholder:text-white/40 border-white/10"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Extra Details */}
          <div className="bg-[#111936] rounded-2xl p-6 border border-white/10 space-y-6">
            <h2 className="font-semibold text-white">Detaje shtesë</h2>

            {/* Floor */}
            <div>
              <Label className="text-sm font-medium text-gray-300 mb-3 block">Kati</Label>
              <div className="flex flex-wrap gap-2">
                {FLOORS.map(floor => (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, floor: prev.floor === floor ? '' : floor }))}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      formData.floor === floor
                        ? 'bg-[#1B4FFF] border border-[#1B4FFF] text-white shadow-lg shadow-[#1B4FFF]/20'
                        : 'bg-white/5 border border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {floor}
                  </button>
                ))}
              </div>
            </div>

            {/* Apartment Type */}
            <div>
              <Label className="text-sm font-medium text-gray-300 mb-3 block">Tipologjia</Label>
              <div className="flex flex-wrap gap-2">
                {APARTMENT_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, apartment_type: prev.apartment_type === type ? '' : type }))}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      formData.apartment_type === type
                        ? 'bg-[#1B4FFF] border border-[#1B4FFF] text-white shadow-lg shadow-[#1B4FFF]/20'
                        : 'bg-white/5 border border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <Label className="text-sm font-medium text-gray-300 mb-3 block">Karakteristikat</Label>
              <div className="flex flex-wrap gap-2">
                {FEATURES.map(feature => {
                  const selected = formData.features.includes(feature)
                  return (
                    <button
                      key={feature}
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          features: selected
                            ? prev.features.filter(f => f !== feature)
                            : [...prev.features, feature]
                        }))
                      }
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                        selected
                          ? 'bg-[#1B4FFF]/20 border border-[#1B4FFF]/50 text-[#1B4FFF]'
                          : 'bg-white/5 border border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {feature}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-[#111936] rounded-2xl p-6 border border-white/10">
            <h2 className="font-semibold text-white mb-1">Fotot</h2>
            <p className="text-sm text-gray-400 mb-4">Shto deri në 10 foto. Foto e parë do të jetë kryesorja.</p>

            {/* Upload Zone */}
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-[#1B4FFF] hover:bg-white/5 transition-all">
              <Upload className="h-8 w-8 text-gray-500 mb-2" />
              <span className="text-sm text-gray-400">Kliko për të ngarkuar foto</span>
              <span className="text-xs text-gray-500 mt-1">PNG, JPG deri 10MB</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </label>

            {/* Preview Grid */}
            {previews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {previews.map((preview, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-800">
                    <img src={preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-[#1B4FFF] text-white text-xs text-center py-1">
                        Kryesorja
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label={`Hiq foton ${i + 1}`}
                      className="absolute top-2 right-2 h-9 w-9 flex items-center justify-center bg-red-500/20 text-red-400 border border-red-500/30 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-500/30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={uploading}
            className="w-full h-12 bg-[#1B4FFF] hover:bg-[#1640CC] text-white text-base font-semibold py-4 rounded-xl cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Duke ngarkuar...
              </>
            ) : (
              '✓ Posto banesën falas'
            )}
          </Button>

          <p className="text-center text-sm text-gray-500">
            Duke postuar, pranon{' '}
            <a href="/kushtet" className="underline hover:text-[#1B4FFF]">kushtet e shërbimit</a>
          </p>
        </form>
      </div>
    </div>
  )
}
