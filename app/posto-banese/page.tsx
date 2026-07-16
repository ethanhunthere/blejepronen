'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { KOSOVO_LOCATIONS } from '@/lib/kosovo-locations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
const MAX_PRICE = 50_000_000
const MAX_TITLE_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 2000
const COMPRESSION_MAX_WIDTH = 1920
const COMPRESSION_MAX_HEIGHT = 1920
const COMPRESSION_QUALITY = 0.85

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip compression for GIFs to preserve animation.
    if (file.type === 'image/gif') {
      return resolve(file)
    }

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > COMPRESSION_MAX_WIDTH || height > COMPRESSION_MAX_HEIGHT) {
        const ratio = Math.min(COMPRESSION_MAX_WIDTH / width, COMPRESSION_MAX_HEIGHT / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return reject(new Error('Shfletuesi nuk mbështet kompresimin e fotove.'))
      }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Kompresimi i fotove dështoi.'))
          }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg') || 'image.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressed)
        },
        'image/jpeg',
        COMPRESSION_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Nuk u ngarkua foto për kompresim.'))
    }

    img.src = objectUrl
  })
}

interface FormData {
  title: string
  description: string
  price: string
  city: string
  neighborhood: string
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
    neighborhood: '',
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
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isSubmittingRef = useRef(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'city' ? { neighborhood: '' } : {})
    }))
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

    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    setUploading(true)
    setUploadProgress(0)
    setError('')

    // --- Step 0: Validate authentication ---
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error during posto-banese submit:', JSON.stringify(authError))
      setError('Sesioni ka skaduar. Ju lutemi ri-regjistrohuni.')
      setUploading(false)
      isSubmittingRef.current = false
      return
    }

    if (!user) {
      console.error('No user session found during posto-banese submit')
      isSubmittingRef.current = false
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
      isSubmittingRef.current = false
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
        isSubmittingRef.current = false
        return
      }
    }

    if (!existingProfile?.email_verified) {
      setUnverified(true)
      setUploading(false)
      isSubmittingRef.current = false
      return
    }

    // --- Step 1: Validate price ---
    const priceNum = Number(formData.price)
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Çmimi duhet të jetë më i madh se 0')
      setUploading(false)
      isSubmittingRef.current = false
      return
    }
    if (priceNum > MAX_PRICE) {
      setError('Çmimi duhet të jetë nën 50,000,000 €')
      setUploading(false)
      isSubmittingRef.current = false
      return
    }

    // --- Step 2: Compress images ---
    const compressedImages: File[] = []
    try {
      for (let i = 0; i < images.length; i++) {
        const compressed = await compressImage(images[i])
        compressedImages.push(compressed)
        setUploadProgress(Math.round(((i + 1) / (images.length * 2)) * 100))
      }
    } catch (compressErr) {
      const message = compressErr instanceof Error ? compressErr.message : 'Gabim i panjohur'
      console.error('Image compression failed:', message)
      setError(`Kompresimi i fotove dështoi: ${message}`)
      setUploading(false)
      setUploadProgress(0)
      isSubmittingRef.current = false
      return
    }

    // --- Step 3: Upload images (tracking paths so we can roll back on failure) ---
    const imageUrls: string[] = []
    const uploadedPaths: string[] = []

    const rollbackUploads = async () => {
      if (uploadedPaths.length === 0) return
      const { error: removeError } = await supabase.storage.from('listings').remove(uploadedPaths)
      if (removeError) {
        console.error('Failed to roll back uploaded images:', JSON.stringify(removeError))
      }
    }

    try {
      for (let i = 0; i < compressedImages.length; i++) {
        const image = compressedImages[i]
        const ext = image.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(path, image, { contentType: image.type })

        if (uploadError) {
          console.error('Image upload error for', image.name, ':', JSON.stringify(uploadError))
          throw new Error(uploadError.message || 'Upload failed')
        }

        uploadedPaths.push(path)

        const { data: { publicUrl } } = supabase.storage
          .from('listings')
          .getPublicUrl(path)

        imageUrls.push(publicUrl)
        setUploadProgress(Math.round(((images.length + i + 1) / (images.length * 2)) * 100))
      }
    } catch (uploadErr) {
      const message = uploadErr instanceof Error ? uploadErr.message : 'Gabim i panjohur'
      console.error('Image upload batch failed:', message)
      await rollbackUploads()
      setError(`Ngarkimi i fotove dështoi: ${message}. Sigurohu që "listings" bucket ekziston në Supabase Storage.`)
      setUploading(false)
      setUploadProgress(0)
      isSubmittingRef.current = false
      return
    }

    // --- Step 4: Insert listing ---
    const { data: listing, error: insertError } = await supabase
      .from('listings')
      .insert({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: priceNum,
        city: formData.city,
        neighborhood: formData.neighborhood || null,
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
      await rollbackUploads()
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
      setUploadProgress(0)
      isSubmittingRef.current = false
      return
    }

    // --- Success ---
    toast.success('Banesa u postua me sukses!')
    router.push(`/listings/${listing.id}`)
  }

  return (
    <div className="min-h-screen bg-[#F2F7F7]">
      <div className="max-w-2xl 2xl:max-w-[2000px] mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Posto banesën tënde</h1>
          <p className="text-gray-500 text-sm">30 ditë falas, pa nevojë për kartë krediti</p>

          <div className="flex items-center gap-2 mt-5" aria-hidden="true">
            {['Lloji', 'Detajet', 'Fotot'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-400 whitespace-nowrap">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-semibold">
                    {i + 1}
                  </span>
                  {label}
                </div>
                {i < 2 && <div className="h-px flex-1 bg-gray-200" />}
              </div>
            ))}
          </div>
        </div>

        {uploading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F2F7F7]/90 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#111827] mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-[#1A1A2E] mb-2">Duke postuar banesën...</h2>
              <p className="text-sm text-gray-500 mb-4">Ju lutemi mos e mbyllni faqen.</p>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#006459] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{uploadProgress}%</p>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {unverified && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              Duhet të verifikoni profilin tuaj para se të postoni banesë. Shkoni te profili juaj dhe klikoni &apos;Verifiko profilin&apos;.
            </AlertDescription>
            <div className="mt-3">
              <Link
                href="/completo-profilin"
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold bg-[#006459] text-white hover:bg-[#005048] transition-colors"
              >
                Verifiko profilin
              </Link>
            </div>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Toggle */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
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
                      ? 'bg-[#006459] text-white border border-[#006459]'
                      : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t === 'shitje' ? '🏠 Shitje' : '🔑 Me qira'}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#1A1A2E]">Informacioni bazë</h2>

            <div>
              <Label htmlFor="title">Titulli i listimit<span className="inline-block w-1 h-1 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                id="title"
                name="title"
                placeholder="p.sh. Banesë 3+1 në qendër të Prishtinës"
                className="mt-1 h-11 bg-white text-[#1A1A2E] placeholder:text-gray-400 border-gray-200 focus:border-[#006459]/50"
                value={formData.title}
                onChange={handleChange}
                maxLength={MAX_TITLE_LENGTH}
                required
              />
              <p className="text-xs text-gray-400 mt-1">{formData.title.length}/{MAX_TITLE_LENGTH} karaktere</p>
            </div>

            <div>
              <Label htmlFor="description">Përshkrimi<span className="inline-block w-1 h-1 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <textarea
                id="description"
                name="description"
                placeholder="Përshkruaj banesën, lagjen, kushtet e shitjes..."
                className="mt-1 w-full min-h-[120px] px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-[#1A1A2E] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006459]/50 resize-none"
                value={formData.description}
                onChange={handleChange}
                maxLength={MAX_DESCRIPTION_LENGTH}
                required
              />
              <p className="text-xs text-gray-400 mt-1">{formData.description.length}/{MAX_DESCRIPTION_LENGTH} karaktere</p>
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
                        ? 'bg-[#111827] border border-[#111827] text-white shadow-lg shadow-[#111827]/20'
                        : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
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
                  Çmimi (€) {formData.type === 'qira' ? '/muaj' : ''}<span className="inline-block w-1 h-1 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="100"
                  placeholder={formData.type === 'shitje' ? '85000' : '400'}
                  className="mt-1 h-11 bg-white text-[#1A1A2E] placeholder:text-gray-400 border-gray-200 focus:border-[#006459]/50"
                  value={formData.price}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="area_m2">Sipërfaqja (m²)<span className="inline-block w-1 h-1 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                <Input
                  id="area_m2"
                  name="area_m2"
                  type="number"
                  min="1"
                  placeholder="75"
                  className="mt-1 h-11 bg-white text-[#1A1A2E] placeholder:text-gray-400 border-gray-200 focus:border-[#006459]/50"
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
                          ? 'bg-[#111827] border border-[#111827] text-white'
                          : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
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
                <Label htmlFor="city">Qyteti<span className="inline-block w-1 h-1 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                <select
                  id="city"
                  name="city"
                  style={{ colorScheme: 'light' }}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-gray-200 text-sm bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#006459]/50"
                  value={formData.city}
                  onChange={handleChange}
                  required
                >
                  <option value="">Zgjedh qytetin</option>
                  {Object.keys(KOSOVO_LOCATIONS).map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="neighborhood">Lagjja / Zona</Label>
                <select
                  id="neighborhood"
                  name="neighborhood"
                  style={{ colorScheme: 'light' }}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-gray-200 text-sm bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#006459]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  disabled={!formData.city}
                >
                  <option value="">
                    {formData.city ? 'Zgjedh lagjen...' : 'Zgjidh qytetin së pari'}
                  </option>
                  {(KOSOVO_LOCATIONS[formData.city] || []).map(neighborhood => (
                    <option key={neighborhood} value={neighborhood}>{neighborhood}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Opsionale - por ndihmon blerësit të gjejnë banesën</p>
              </div>
            </div>

            <div>
              <Label htmlFor="rooms">Numri i dhomave<span className="inline-block w-1 h-1 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <select
                id="rooms"
                name="rooms"
                style={{ colorScheme: 'light' }}
                className="mt-1 w-full h-11 px-3 rounded-lg border border-gray-200 text-sm bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#006459]/50"
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
              <Label htmlFor="address">Rruga dhe numri<span className="inline-block w-1 h-1 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                id="address"
                name="address"
                placeholder="p.sh. Rruga Fehmi Agani"
                className="mt-1 h-11 bg-white text-[#1A1A2E] placeholder:text-gray-400 border-gray-200 focus:border-[#006459]/50"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Extra Details */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
            <h2 className="font-semibold text-[#1A1A2E]">Detaje shtesë</h2>

            {/* Floor */}
            <div>
              <Label className="text-sm font-medium text-gray-600 mb-3 block">Kati</Label>
              <div className="flex flex-wrap gap-2">
                {FLOORS.map(floor => (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, floor: prev.floor === floor ? '' : floor }))}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      formData.floor === floor
                        ? 'bg-[#111827] border border-[#111827] text-white shadow-lg shadow-[#111827]/20'
                        : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {floor}
                  </button>
                ))}
              </div>
            </div>

            {/* Apartment Type */}
            <div>
              <Label className="text-sm font-medium text-gray-600 mb-3 block">Tipologjia</Label>
              <div className="flex flex-wrap gap-2">
                {APARTMENT_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, apartment_type: prev.apartment_type === type ? '' : type }))}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      formData.apartment_type === type
                        ? 'bg-[#111827] border border-[#111827] text-white shadow-lg shadow-[#111827]/20'
                        : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <Label className="text-sm font-medium text-gray-600 mb-3 block">Karakteristikat</Label>
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
                          ? 'bg-[#111827]/10 border border-[#111827]/40 text-[#111827]'
                          : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
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
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-[#1A1A2E] mb-1">Fotot</h2>
            <p className="text-sm text-gray-500 mb-4">Shto deri në 10 foto. Foto e parë do të jetë kryesorja.</p>

            {/* Upload Zone */}
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#111827] bg-gray-50 hover:bg-[#111827]/5 transition-all">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Kliko për të ngarkuar foto</span>
              <span className="text-xs text-gray-400 mt-1">PNG, JPG deri 10MB</span>
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
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img src={preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-[#111827] text-white text-xs text-center py-1">
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
            className="w-full h-12 bg-[#006459] hover:bg-[#005048] text-white text-base font-semibold py-4 rounded-xl cursor-pointer"
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
            <a href="/kushtet" className="underline hover:text-[#111827]">kushtet e shërbimit</a>
          </p>
        </form>
      </div>
    </div>
  )
}
