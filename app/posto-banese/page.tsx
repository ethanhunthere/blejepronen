'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Upload, X, Loader2 } from 'lucide-react'

const CITIES = ['Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë', 'Ferizaj']

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
    type: 'shitje'
  })
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
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

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Validate price
      const priceNum = Number(formData.price)
      if (isNaN(priceNum) || priceNum <= 0 || priceNum > MAX_PRICE) {
        setError(`Çmimi duhet të jetë mes 1 dhe ${MAX_PRICE.toLocaleString()}€.`)
        setUploading(false)
        return
      }

      // Upload images in parallel
      const uploadPromises = images.map(async (image) => {
        const ext = image.name.split('.').pop()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(path, image, { contentType: image.type })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('listings')
          .getPublicUrl(path)

        return publicUrl
      })

      const imageUrls = await Promise.all(uploadPromises)

      // Insert listing
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
          images: imageUrls
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push(`/listings/${listing.id}`)
    } catch (err) {
      setError('Gabim gjatë postimit. Provo përsëri.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center mb-8">
          <Building2 className="h-7 w-7 text-[#1B4FFF] mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Posto banesën tënde</h1>
            <p className="text-gray-500 text-sm">30 ditë falas, pa nevojë për kartë krediti</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Toggle */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <Label className="text-base font-semibold mb-3 block">Lloji i listimit</Label>
            <div role="radiogroup" aria-label="Lloji i listimit" className="flex gap-3">
              {(['shitje', 'qira'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={formData.type === t}
                  onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all text-sm ${
                    formData.type === t
                      ? 'bg-[#1B4FFF] text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t === 'shitje' ? '🏠 Shitje' : '🔑 Me qira'}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
            <h2 className="font-semibold text-gray-900">Informacioni bazë</h2>

            <div>
              <Label htmlFor="title">Titulli i listimit *</Label>
              <Input
                id="title"
                name="title"
                placeholder="p.sh. Banesë 3+1 në qendër të Prishtinës"
                className="mt-1 h-11"
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
                className="mt-1 w-full min-h-[120px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FFF] resize-none"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">
                  Çmimi (€) {formData.type === 'qira' ? '/muaj' : ''} *
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  placeholder={formData.type === 'shitje' ? '85000' : '400'}
                  className="mt-1 h-11"
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
                  className="mt-1 h-11"
                  value={formData.area_m2}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rooms">Numri i dhomave *</Label>
                <select
                  id="rooms"
                  name="rooms"
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
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
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4FFF]"
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
                className="mt-1 h-11"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-1">Fotot</h2>
            <p className="text-sm text-gray-500 mb-4">Shto deri në 10 foto. Foto e parë do të jetë kryesorja.</p>

            {/* Upload Zone */}
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#1B4FFF] hover:bg-blue-50 transition-all">
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
              <div className="grid grid-cols-3 gap-3 mt-4">
                {previews.map((preview, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
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
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
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
            className="w-full h-13 bg-[#1B4FFF] hover:bg-[#1640CC] text-white text-base font-semibold py-4"
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

          <p className="text-center text-xs text-gray-400">
            Duke postuar, pranon{' '}
            <a href="/kushtet" className="underline hover:text-[#1B4FFF]">kushtet e shërbimit</a>
          </p>
        </form>
      </div>
    </div>
  )
}
