'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { KOSOVO_LOCATIONS } from '@/lib/kosovo-locations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  X,
  Loader2,
  Building2,
  Home,
  Sparkles,
  Trees,
  Briefcase,
  Warehouse,
  Check,
  MapPin,
  Maximize2,
  BedDouble,
  Tag,
  ShieldCheck,
  Wand2,
  ChevronRight,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'

export type PropertyCategory = 'banese' | 'shtepi' | 'vile' | 'toke' | 'lokal' | 'garazh'

interface CategoryConfig {
  id: PropertyCategory
  label: string
  titleShort: string
  badge: string
  icon: typeof Building2
  description: string
  subtypes: string[]
  features: string[]
  areaPresets: { label: string; value: number }[]
  areaUnitDefault: 'm2' | 'ari'
  hasRooms: boolean
  hasFloors: boolean
  floorLabel?: string
  floors?: string[]
  roomsLabel?: string
  roomOptions?: number[]
  conditionLabel: string
  conditions: { value: string; label: string }[]
  titlePlaceholder: string
  descriptionPlaceholder: string
}

const CATEGORIES: Record<PropertyCategory, CategoryConfig> = {
  banese: {
    id: 'banese',
    label: 'Banesë / Apartament',
    titleShort: 'Banesë',
    badge: 'Rezidenciale',
    icon: Building2,
    description: 'Banesa në ndërtesa kolektive, studio, duplex, penthouse',
    subtypes: ['1+1', '2+1', '3+1', 'Studio', '4+1', 'Duplex', 'Penthouse'],
    features: [
      'Ashensor',
      'Ballkon',
      'Ngrohje qendrore',
      'Klimë',
      'Mobiluar',
      'Garazhë nëntokësore',
      'Siguri 24h',
      'Interfon',
      'Panoramë',
      'Kopësht',
      'Bodrum',
      'Ndërtim i ri',
    ],
    areaPresets: [
      { label: '45 m²', value: 45 },
      { label: '65 m²', value: 65 },
      { label: '85 m²', value: 85 },
      { label: '110 m²', value: 110 },
      { label: '140 m²', value: 140 },
    ],
    areaUnitDefault: 'm2',
    hasRooms: true,
    roomsLabel: 'Numri i dhomave',
    roomOptions: [1, 2, 3, 4, 5, 6],
    hasFloors: true,
    floorLabel: 'Kati',
    floors: ['Bodrum', 'P/D', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'],
    conditionLabel: 'Gjendja e banesës',
    conditions: [
      { value: 'e-re', label: 'E re (Ndërtim i ri)' },
      { value: 'rinovuar', label: 'E renovuar plotësisht' },
      { value: 'e-vjeter', label: 'E banueshme' },
      { value: 'ka-nevojë-për-rinovim', label: 'Ka nevojë për rinovim' },
    ],
    titlePlaceholder: 'p.sh. Banesë moderne 2+1 me pamje të hapur në Bregun e Diellit',
    descriptionPlaceholder:
      'Përshkruaj banesën: organizimin e dhomave, orientimin ndaj diellit, afërsinë me shkolla, qendrën apo transportin publik...',
  },
  shtepi: {
    id: 'shtepi',
    label: 'Shtëpi',
    titleShort: 'Shtëpi',
    badge: 'Rezidenciale',
    icon: Home,
    description: 'Shtëpi private, shtëpi me oborr, shtëpi në varg (townhouse)',
    subtypes: ['Shtëpi private', 'Shtëpi me oborr', 'Shtëpi në varg (Townhouse)', 'Shtëpi 2-familjare'],
    features: [
      'Kopësht',
      'Parking',
      'Garazhë private',
      'Oxhak',
      'Pishinë',
      'Ngrohje qendrore',
      'Klimë',
      'Mobiluar',
      'Siguri 24h',
      'Panoramë',
      'Bodrum',
      'Rrethojë e sigurt',
    ],
    areaPresets: [
      { label: '120 m²', value: 120 },
      { label: '180 m²', value: 180 },
      { label: '240 m²', value: 240 },
      { label: '320 m²', value: 320 },
      { label: '450 m²', value: 450 },
    ],
    areaUnitDefault: 'm2',
    hasRooms: true,
    roomsLabel: 'Numri i dhomave',
    roomOptions: [2, 3, 4, 5, 6, 7, 8],
    hasFloors: true,
    floorLabel: 'Numri i kateve',
    floors: ['1', '2', '3', '4'],
    conditionLabel: 'Gjendja e shtëpisë',
    conditions: [
      { value: 'e-re', label: 'E re (Ndërtim i ri)' },
      { value: 'rinovuar', label: 'E renovuar' },
      { value: 'e-vjeter', label: 'E banueshme' },
      { value: 'ka-nevojë-për-rinovim', label: 'Ka nevojë për rinovim' },
    ],
    titlePlaceholder: 'p.sh. Shtëpi familjare 2-katëshe 240 m² me 4 ari oborr në Veternik',
    descriptionPlaceholder:
      'Përshkruaj shtëpinë: numrin e kateve, hapësirën e oborrit, ngrohjen, garazhën dhe qetësinë e lagjes...',
  },
  vile: {
    id: 'vile',
    label: 'Vilë Luksoze',
    titleShort: 'Vilë',
    badge: 'Premium',
    icon: Sparkles,
    description: 'Rezidencë luksoze, vilë pushimi, lagje rezidenciale e mbyllur',
    subtypes: ['Vilë luksoze', 'Vilë pushimi / malore', 'Vilë rezidenciale (Gated)', 'Duplex'],
    features: [
      'Pishinë',
      'Kopësht',
      'Garazhë private',
      'Parking',
      'Oxhak',
      'Siguri 24h',
      'Klimë',
      'Ngrohje qendrore',
      'Mobiluar',
      'Panoramë',
      'Smart Home',
      'Bodrum',
    ],
    areaPresets: [
      { label: '250 m²', value: 250 },
      { label: '350 m²', value: 350 },
      { label: '450 m²', value: 450 },
      { label: '600 m²', value: 600 },
    ],
    areaUnitDefault: 'm2',
    hasRooms: true,
    roomsLabel: 'Numri i dhomave',
    roomOptions: [3, 4, 5, 6, 7, 8],
    hasFloors: true,
    floorLabel: 'Numri i kateve',
    floors: ['1', '2', '3'],
    conditionLabel: 'Gjendja e vilës',
    conditions: [
      { value: 'e-re', label: 'E re / E papërdorur' },
      { value: 'rinovuar', label: 'E mobiluar luksoze' },
    ],
    titlePlaceholder: 'p.sh. Vilë luksoze 350 m² me pishinë dhe kopsht të rregulluar në Marigona',
    descriptionPlaceholder:
      'Përshkruaj vilën: arkitekturën, materialet premium, pishinën, teknologjinë smart home dhe privatësinë e lartë...',
  },
  toke: {
    id: 'toke',
    label: 'Tokë / Truall',
    titleShort: 'Tokë / Truall',
    badge: 'Truall & Parcela',
    icon: Trees,
    description: 'Truall ndërtimi, tokë bujqësore, parcelë industriale apo komerciale',
    subtypes: ['Truall ndërtimi', 'Tokë bujqësore', 'Tokë komerciale / Industriale', 'Parcelë për vilë'],
    features: [
      'Me Fletë Poseduese (1/1)',
      'Leje ndërtimi',
      'Rrugë e asfaltuar',
      'Rrymë elektrike',
      'Ujësjellës',
      'Kanalizim',
      'Ndriçim publik',
      'E rrethuar',
      'Afër rrugës kryesore',
      'Terren i rrafshët',
    ],
    areaPresets: [
      { label: '3 Ari (300 m²)', value: 300 },
      { label: '5 Ari (500 m²)', value: 500 },
      { label: '10 Ari (1,000 m²)', value: 1000 },
      { label: '20 Ari (2,000 m²)', value: 2000 },
      { label: '50 Ari (5,000 m²)', value: 5000 },
    ],
    areaUnitDefault: 'ari',
    hasRooms: false,
    hasFloors: false,
    conditionLabel: 'Dokumentacioni & Terreni',
    conditions: [
      { value: 'e-re', label: 'Me Fletë Poseduese të rregullt' },
      { value: 'rinovuar', label: 'Në Zonë Ndërtimore me Plan' },
      { value: 'e-vjeter', label: 'Terren i rrafshët me qasje' },
      { value: 'ka-nevojë-për-rinovim', label: 'Tokë bujqësore / Investim' },
    ],
    titlePlaceholder: 'p.sh. Truall ndërtimi 10 Ari në Çagllavicë me fletë poseduese dhe rrugë',
    descriptionPlaceholder:
      'Përshkruaj truallin: koeficientin e ndërtimit, infrastrukturën (rrymë, ujë, kanalizim, rrugë të asfaltuar) dhe pozitën...',
  },
  lokal: {
    id: 'lokal',
    label: 'Lokal / Zyrë',
    titleShort: 'Afariste',
    badge: 'Komerciale',
    icon: Briefcase,
    description: 'Hapësirë afariste, zyrë biznesi, showroom, dyqan në rrugë kryesore',
    subtypes: ['Lokal afarist rrugor', 'Zyrë biznesi', 'Showroom / Dyqan', 'Hapësirë multifunksionale'],
    features: [
      'Parking',
      'Klimë',
      'Siguri 24h',
      'Ashensor',
      'Ndërtim i ri',
      'Panoramë',
      'Qasje nga rruga kryesore',
      'Vitrinë xhami',
      'Rrymë 3-fazore',
      'Nyje sanitare',
    ],
    areaPresets: [
      { label: '40 m²', value: 40 },
      { label: '75 m²', value: 75 },
      { label: '120 m²', value: 120 },
      { label: '200 m²', value: 200 },
      { label: '350 m²', value: 350 },
    ],
    areaUnitDefault: 'm2',
    hasRooms: true,
    roomsLabel: 'Ndarjet / Dhomat',
    roomOptions: [1, 2, 3, 4, 5, 6],
    hasFloors: true,
    floorLabel: 'Pozicioni / Kati',
    floors: ['Bodrum', 'P/D', '1', '2', '3', '4', '5+'],
    conditionLabel: 'Gjendja e ambientit',
    conditions: [
      { value: 'e-re', label: 'E re / E gatshme' },
      { value: 'rinovuar', label: 'E renovuar për zyre' },
      { value: 'e-vjeter', label: 'E banueshme / Funksionale' },
      { value: 'ka-nevojë-për-rinovim', label: 'Kërkon përshtatje' },
    ],
    titlePlaceholder: 'p.sh. Lokal afarist 95 m² me vitrinë xhami në rrugë kryesore te Qafa',
    descriptionPlaceholder:
      'Përshkruaj ambientin: fasadën prej xhami, lartësinë e tavanit, frekuentimin dhe përshtatshmërinë për zyre apo dyqan...',
  },
  garazh: {
    id: 'garazh',
    label: 'Garazhë / Depo',
    titleShort: 'Garazhë / Depo',
    badge: 'Parkim & Depo',
    icon: Warehouse,
    description: 'Vendparkim nëntokësor, garazhë e mbyllur me qepen, depo magazinimi',
    subtypes: ['Garazhë e mbyllur', 'Vendparkim nëntokësor', 'Depo / Magazinë'],
    features: [
      'Parking',
      'Siguri 24h',
      'Kamera sigurie',
      'Qepen me telekomandë',
      'Prizë për EV',
      'Ndriçim 24h',
      'Ventilacion',
      'Rampë e lehtë hyrëse',
    ],
    areaPresets: [
      { label: '16 m²', value: 16 },
      { label: '22 m²', value: 22 },
      { label: '40 m²', value: 40 },
      { label: '80 m²', value: 80 },
      { label: '150 m²', value: 150 },
    ],
    areaUnitDefault: 'm2',
    hasRooms: false,
    hasFloors: true,
    floorLabel: 'Niveli / Kati',
    floors: ['Bodrum', 'P/D', '1'],
    conditionLabel: 'Gjendja',
    conditions: [
      { value: 'e-re', label: 'E re me telekomandë' },
      { value: 'rinovuar', label: 'E mirëmbajtur' },
    ],
    titlePlaceholder: 'p.sh. Garazhë e mbyllur 22 m² me telekomandë në katin -1 në Lakrishtë',
    descriptionPlaceholder:
      'Përshkruaj vendndodhjen e garazhës ose depos: sigurinë, qasjen, lartësinë dhe dimensionet...',
  },
}

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
    if (file.type === 'image/gif') {
      return resolve(file)
    }

    const img = new window.Image()
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

const formatPriceDisplay = (val: string) => {
  const num = Number(val)
  if (!val || isNaN(num)) return ''
  return new Intl.NumberFormat('sq-AL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(num)
}

interface FormData {
  category: PropertyCategory
  subtype: string
  title: string
  description: string
  price: string
  city: string
  neighborhood: string
  address: string
  rooms: string
  area_m2: string
  land_ari: string
  areaUnit: 'm2' | 'ari'
  type: 'shitje' | 'qira'
  condition: string
  floor: string
  features: string[]
}

export default function PostoPronaPage() {
  const [formData, setFormData] = useState<FormData>({
    category: 'banese',
    subtype: '2+1',
    title: '',
    description: '',
    price: '',
    city: 'Prishtinë',
    neighborhood: '',
    address: '',
    rooms: '2',
    area_m2: '',
    land_ari: '',
    areaUnit: 'm2',
    type: 'shitje',
    condition: 'e-re',
    floor: '2',
    features: ['Parking', 'Ashensor', 'Ballkon'],
  })

  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isSubmittingRef = useRef(false)

  const activeCategory = CATEGORIES[formData.category]

  // Update category handler with smart defaults
  const handleCategorySelect = (catId: PropertyCategory) => {
    const nextCat = CATEGORIES[catId]
    setFormData((prev) => ({
      ...prev,
      category: catId,
      subtype: nextCat.subtypes[0] || '',
      rooms: nextCat.hasRooms ? String(nextCat.roomOptions?.[0] || '2') : '0',
      floor: nextCat.hasFloors ? (nextCat.floors?.[1] || '1') : '',
      areaUnit: nextCat.areaUnitDefault,
      condition: nextCat.conditions[0]?.value || 'e-re',
      // keep only features applicable or use clean defaults
      features: nextCat.features.slice(0, 3),
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'city' ? { neighborhood: '' } : {}),
    }))
  }

  // Handle Land Ari ↔ m² conversion
  const handleAreaChange = (val: string, unit: 'm2' | 'ari') => {
    if (unit === 'ari') {
      const numAri = parseFloat(val) || 0
      const calcM2 = numAri > 0 ? String(Math.round(numAri * 100)) : ''
      setFormData((prev) => ({
        ...prev,
        land_ari: val,
        area_m2: calcM2,
        areaUnit: 'ari',
      }))
    } else {
      const numM2 = parseFloat(val) || 0
      const calcAri = numM2 > 0 ? (numM2 / 100).toFixed(1).replace(/\.0$/, '') : ''
      setFormData((prev) => ({
        ...prev,
        area_m2: val,
        land_ari: calcAri,
        areaUnit: 'm2',
      }))
    }
  }

  // Smart Title Suggester
  const handleSuggestTitle = () => {
    const typeText = formData.type === 'shitje' ? 'në shitje' : 'me qira'
    const locationPart = [formData.neighborhood, formData.city].filter(Boolean).join(', ')
    const specPart = formData.category === 'toke'
      ? `${formData.land_ari ? `${formData.land_ari} Ari` : `${formData.area_m2 || '10'} m²`}`
      : `${formData.subtype || activeCategory.titleShort}${formData.area_m2 ? ` ${formData.area_m2} m²` : ''}`

    let suggested = `${activeCategory.titleShort} ${specPart} në ${locationPart} ${typeText}`.trim()
    if (suggested.length > MAX_TITLE_LENGTH) {
      suggested = suggested.slice(0, MAX_TITLE_LENGTH)
    }
    setFormData((prev) => ({ ...prev, title: suggested }))
    toast.success('Titulli u sugjerua me sukses!')
  }

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (images.length + files.length > 10) {
        setError('Maksimumi 10 foto lejohen.')
        return
      }

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

      setError('')
      const newPreviews = files.map((f) => URL.createObjectURL(f))
      setImages((prev) => [...prev, ...files])
      setPreviews((prev) => [...prev, ...newPreviews])
    },
    [images]
  )

  const handleDropImages = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (images.length + files.length > 10) {
      setError('Maksimumi 10 foto lejohen.')
      return
    }

    const validFiles: File[] = []
    for (const file of files) {
      if (ALLOWED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE) {
        validFiles.push(file)
      }
    }

    if (validFiles.length > 0) {
      setError('')
      const newPreviews = validFiles.map((f) => URL.createObjectURL(f))
      setImages((prev) => [...prev, ...validFiles])
      setPreviews((prev) => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const makePrimaryImage = (index: number) => {
    if (index === 0) return
    const newImgs = [...images]
    const [pickedImg] = newImgs.splice(index, 1)
    newImgs.unshift(pickedImg)

    const newPrevs = [...previews]
    const [pickedPrev] = newPrevs.splice(index, 1)
    newPrevs.unshift(pickedPrev)

    setImages(newImgs)
    setPreviews(newPrevs)
    toast.info('Fotoja u vendos si kryesore')
  }

  const toggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }))
  }

  // Price per m2 helper
  const pricePerM2 = useMemo(() => {
    const p = parseFloat(formData.price)
    const a = parseFloat(formData.area_m2)
    if (p > 0 && a > 0) {
      return Math.round(p / a)
    }
    return null
  }, [formData.price, formData.area_m2])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    setUploading(true)
    setUploadProgress(0)
    setError('')

    // Step 0: Validate authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error during posto-prona submit:', authError)
      setError('Sesioni ka skaduar. Ju lutemi kyçuni përsëri.')
      setUploading(false)
      isSubmittingRef.current = false
      router.push('/login')
      return
    }

    setUnverified(false)

    // Step 0.5: Verify profile existence
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
      const { error: createProfileErr } = await supabase.from('profiles').insert({
        id: user.id,
        first_name:
          user.user_metadata?.given_name ||
          user.user_metadata?.full_name?.split(' ')[0] ||
          user.email?.split('@')[0] ||
          'Përdorues',
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

    // Step 1: Validate price & numeric values
    const priceNum = Number(formData.price)
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Çmimi duhet të jetë më i madh se 0 €')
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

    const areaNum = Number(formData.area_m2)
    if (isNaN(areaNum) || areaNum <= 0) {
      setError('Sipërfaqja duhet të jetë më e madhe se 0 m²')
      setUploading(false)
      isSubmittingRef.current = false
      return
    }

    // Rooms logic: Land or Garage have 0 rooms to satisfy the DB integer constraint cleanly
    const roomsCount = activeCategory.hasRooms ? Math.max(0, parseInt(formData.rooms, 10) || 1) : 0
    const finalFloor = activeCategory.hasFloors ? (formData.floor || null) : null
    const finalApartmentType = formData.subtype || activeCategory.titleShort

    // Step 2: Compress images concurrently
    let compressedImages: File[] = []
    try {
      compressedImages = await Promise.all(images.map((img) => compressImage(img)))
      setUploadProgress(40)
    } catch (compressErr) {
      const message = compressErr instanceof Error ? compressErr.message : 'Gabim i panjohur'
      console.error('Image compression failed:', message)
      setError(`Kompresimi i fotove dështoi: ${message}`)
      setUploading(false)
      setUploadProgress(0)
      isSubmittingRef.current = false
      return
    }

    // Step 3: Upload images concurrently (with rollback on failure)
    const uploadedPaths: string[] = []
    let completedCount = 0

    const rollbackUploads = async () => {
      if (uploadedPaths.length === 0) return
      const { error: removeError } = await supabase.storage.from('listings').remove(uploadedPaths)
      if (removeError) {
        console.error('Failed to roll back uploaded images:', JSON.stringify(removeError))
      }
    }

    let imageUrls: string[] = []
    try {
      const uploadPromises = compressedImages.map(async (image, i) => {
        const ext = image.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('listings').upload(path, image, {
          contentType: image.type,
          cacheControl: '31536000, immutable',
        })

        if (uploadError) {
          console.error('Image upload error for', image.name, ':', JSON.stringify(uploadError))
          throw new Error(uploadError.message || 'Upload failed')
        }

        uploadedPaths.push(path)

        const {
          data: { publicUrl },
        } = supabase.storage.from('listings').getPublicUrl(path)

        completedCount++
        setUploadProgress(40 + Math.round((completedCount / (compressedImages.length || 1)) * 50))
        return { index: i, url: publicUrl }
      })

      const results = await Promise.all(uploadPromises)
      results.sort((a, b) => a.index - b.index)
      imageUrls = results.map((r) => r.url)
    } catch (uploadErr) {
      const message = uploadErr instanceof Error ? uploadErr.message : 'Gabim i panjohur'
      console.error('Image upload batch failed:', message)
      await rollbackUploads()
      setError(`Ngarkimi i fotove dështoi: ${message}. Sigurohu që "listings" bucket ekziston në Supabase.`)
      setUploading(false)
      setUploadProgress(0)
      isSubmittingRef.current = false
      return
    }

    // Step 4: Insert listing into database
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
        rooms: roomsCount,
        area_m2: areaNum,
        type: formData.type,
        condition: formData.condition,
        floor: finalFloor,
        apartment_type: finalApartmentType,
        features: formData.features,
        images: imageUrls,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Listing insert error:', JSON.stringify(insertError))
      await rollbackUploads()
      if (insertError.code === '42501') {
        setError('Nuk keni leje për të postuar. Kontaktoni mbështetjen.')
      } else if (insertError.code === '23503') {
        setError('Profili juaj nuk është kompletuar. Vizitoni profilin tuaj së pari.')
      } else {
        setError(`Gabim gjatë ruajtjes së listimit (${insertError.code || 'e panjohur'}). Provo përsëri.`)
      }
      setUploading(false)
      setUploadProgress(0)
      isSubmittingRef.current = false
      return
    }

    // Success!
    toast.success('Prona u postua me sukses!')
    router.push(`/listings/${listing.id}`)
  }

  return (
    <div className="min-h-screen bg-[#F2F7F7] pb-24">
      {/* Uploading Screen Overlay */}
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-gray-100 shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#006459]/10 text-[#006459] flex items-center justify-center mx-auto mb-5">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-[#101828] mb-2">Duke publikuar pronën tënde...</h2>
            <p className="text-sm text-gray-500 mb-6">Optimizimi dhe ngarkimi i fotove me cilësi të lartë.</p>
            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[#006459] transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-[#006459]">{uploadProgress}% përfunduar</p>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200/80 pt-8 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#006459]/10 text-[#006459] text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Posto pa pagesë · 30 Ditë Falas
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#101828] tracking-tight">
              Posto pronën tënde me standarde globale
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">
              Arrij blerës dhe qiramarrës seriozë në të gjithë Kosovën dhe diasporë. Plotëso detajet e mëposhtme për një prezantim ekselent.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error and Verification Banners */}
        {error && (
          <Alert variant="destructive" className="mb-6 rounded-2xl border-red-200 bg-red-50 text-red-900 shadow-sm">
            <AlertDescription className="font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {unverified && (
          <Alert className="mb-6 rounded-2xl border-amber-200 bg-amber-50/90 text-amber-950 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-bold text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  Verifikoni profilin para publikimit
                </p>
                <p className="text-xs sm:text-sm text-amber-800/90">
                  Për të ruajtur sigurinë maksimale të platformës, ju nevojitet të verifikoni email-in tuaj në profil.
                </p>
              </div>
              <Link
                href="/profili"
                className="inline-flex items-center justify-center min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#006459] text-white hover:bg-[#005048] transition-all shadow-sm shrink-0"
              >
                Shko te profili për verifikim →
              </Link>
            </div>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Form Fields (8 Cols on Desktop) */}
            <div className="lg:col-span-8 space-y-8">
              {/* SECTION 1: Kategoria & Lloji i transaksionit */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#101828] flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-[#006459]/10 text-[#006459] text-sm font-black flex items-center justify-center">
                      1
                    </span>
                    Çfarë lloj prone po postoni?
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 ml-9.5">
                    Zgjidhni kategorinë e saktë për të hapur fushat dhe specifikat përkatëse.
                  </p>
                </div>

                {/* 6 Rich Category Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {(Object.keys(CATEGORIES) as PropertyCategory[]).map((catKey) => {
                    const cat = CATEGORIES[catKey]
                    const IconComp = cat.icon
                    const isSelected = formData.category === catKey

                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => handleCategorySelect(catKey)}
                        className={`relative p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                          isSelected
                            ? 'bg-[#006459]/5 border-[#006459] shadow-sm ring-1 ring-[#006459]'
                            : 'bg-white border-gray-200/90 hover:border-gray-300 hover:bg-gray-50/70 hover:shadow-xs'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#006459] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                            isSelected ? 'bg-[#006459] text-white' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm sm:text-base font-bold text-[#101828]">{cat.label}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                            {cat.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Transaction Type: Shitje vs Qira */}
                <div className="pt-4 border-t border-gray-100">
                  <Label className="text-sm font-semibold text-[#101828] mb-3 block">
                    Qëllimi i listimit (Transaksioni)
                  </Label>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    {(['shitje', 'qira'] as const).map((t) => {
                      const isActive = formData.type === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, type: t }))}
                          className={`min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border ${
                            isActive
                              ? 'bg-[#006459] text-white border-[#006459] shadow-sm'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <span>{t === 'shitje' ? '🏠 Në Shitje' : '🔑 Me Qira'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Sub-type Selection */}
                {activeCategory.subtypes.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold text-[#101828]">
                        Struktura / Nënkategoria për {activeCategory.titleShort}
                      </Label>
                      <span className="text-xs text-gray-500">Zgjidhni një opsion</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeCategory.subtypes.map((st) => {
                        const isSubSelected = formData.subtype === st
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, subtype: st }))}
                            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer border ${
                              isSubSelected
                                ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {st}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Vendndodhja (Location) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#101828] flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-[#006459]/10 text-[#006459] text-sm font-black flex items-center justify-center">
                      2
                    </span>
                    Vendndodhja e pronës
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 ml-9.5">
                    Të dhënat gjeografike ndihmojnë blerësit e interesuar të lokalizojnë pronën menjëherë.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* City Select */}
                  <div>
                    <Label htmlFor="city" className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">
                      Qyteti <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      style={{ colorScheme: 'light' }}
                      className="w-full h-12 px-3.5 rounded-xl border border-gray-200 text-sm font-medium bg-white text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#006459]/50 transition-all cursor-pointer"
                      required
                    >
                      <option value="">Zgjidhni qytetin</option>
                      {Object.keys(KOSOVO_LOCATIONS).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Neighborhood Select */}
                  <div>
                    <Label htmlFor="neighborhood" className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">
                      Lagjja / Zona
                    </Label>
                    <select
                      id="neighborhood"
                      name="neighborhood"
                      value={formData.neighborhood}
                      onChange={handleChange}
                      disabled={!formData.city}
                      style={{ colorScheme: 'light' }}
                      className="w-full h-12 px-3.5 rounded-xl border border-gray-200 text-sm font-medium bg-white text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#006459]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <option value="">
                        {formData.city ? 'Zgjidhni lagjen...' : 'Zgjidhni qytetin së pari'}
                      </option>
                      {(KOSOVO_LOCATIONS[formData.city] || []).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Street Address */}
                <div>
                  <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">
                    Rruga dhe numri ose pika referuese <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="p.sh. Rruga Fehmi Agani, përballë parkut"
                      className="pl-10 h-12 rounded-xl bg-white border-gray-200 text-[#101828] focus:border-[#006459]"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ndihmon vizitorët të orientohen lehtësisht.
                  </p>
                </div>
              </div>

              {/* SECTION 3: Specifikat e Detajuara & Çmimi */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#101828] flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-[#006459]/10 text-[#006459] text-sm font-black flex items-center justify-center">
                      3
                    </span>
                    Specifikat teknike & Çmimi
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 ml-9.5">
                    Plotësoni përmasat dhe kushtet financiare sipas kategorisë së zgjedhur.
                  </p>
                </div>

                {/* Price Box */}
                <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/70 space-y-3">
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <Label htmlFor="price" className="text-sm font-bold text-[#101828]">
                      Çmimi i kërkuar {formData.type === 'qira' ? '(€ / Muaj)' : '(€ Total)'} <span className="text-red-500">*</span>
                    </Label>
                    {formData.price && (
                      <span className="text-sm font-bold text-[#006459] bg-[#006459]/10 px-2.5 py-0.5 rounded-lg">
                        {formatPriceDisplay(formData.price)} {formData.type === 'qira' ? '/muaj' : ''}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-gray-400">
                      €
                    </span>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="100"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder={formData.type === 'shitje' ? '85000' : '450'}
                      className="pl-9 h-12 text-base font-bold text-[#101828] bg-white border-gray-200 rounded-xl"
                      required
                    />
                  </div>
                  {/* Quick price presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-gray-500 mr-1">Të shpejta:</span>
                    {(formData.type === 'shitje'
                      ? ['45000', '75000', '110000', '160000', '250000', '400000']
                      : ['250', '350', '500', '750', '1200']
                    ).map((pVal) => (
                      <button
                        key={pVal}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, price: pVal }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          formData.price === pVal
                            ? 'bg-[#006459] text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {parseInt(pVal, 10).toLocaleString('sq-AL')} €
                      </button>
                    ))}
                  </div>
                </div>

                {/* Area Input & Ari Converter for Land */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="area_m2" className="text-sm font-bold text-[#101828]">
                      {formData.category === 'toke' ? 'Sipërfaqja e truallit' : 'Sipërfaqja totale (m²)'} <span className="text-red-500">*</span>
                    </Label>

                    {/* Unit Switcher for Land (Ari vs m²) */}
                    {formData.category === 'toke' && (
                      <div className="inline-flex items-center p-0.5 rounded-lg bg-gray-100 border border-gray-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, areaUnit: 'ari' }))}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                            formData.areaUnit === 'ari'
                              ? 'bg-white text-[#006459] shadow-2xs'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          Ari (1 Ari = 100 m²)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, areaUnit: 'm2' }))}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                            formData.areaUnit === 'm2'
                              ? 'bg-white text-[#006459] shadow-2xs'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          Metra Katrorë (m²)
                        </button>
                      </div>
                    )}
                  </div>

                  {formData.category === 'toke' && formData.areaUnit === 'ari' ? (
                    <div>
                      <div className="relative">
                        <Input
                          id="land_ari"
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={formData.land_ari}
                          onChange={(e) => handleAreaChange(e.target.value, 'ari')}
                          placeholder="p.sh. 5 (ari)"
                          className="h-12 text-base font-semibold text-[#101828] bg-white border-gray-200 rounded-xl"
                          required
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">
                          Ari
                        </span>
                      </div>
                      {formData.land_ari && (
                        <p className="text-xs font-semibold text-[#006459] mt-1.5">
                          E barabartë me: {formData.area_m2 || 0} m²
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Input
                          id="area_m2"
                          name="area_m2"
                          type="number"
                          min="1"
                          value={formData.area_m2}
                          onChange={(e) => handleAreaChange(e.target.value, 'm2')}
                          placeholder="p.sh. 85"
                          className="h-12 text-base font-semibold text-[#101828] bg-white border-gray-200 rounded-xl"
                          required
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">
                          m²
                        </span>
                      </div>
                      {formData.category === 'toke' && formData.land_ari && (
                        <p className="text-xs font-semibold text-[#006459] mt-1.5">
                          E barabartë me: {formData.land_ari} Ari
                        </p>
                      )}
                    </div>
                  )}

                  {/* Area Presets */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeCategory.areaPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          if (formData.category === 'toke') {
                            const ariVal = (preset.value / 100).toString()
                            setFormData((prev) => ({
                              ...prev,
                              area_m2: preset.value.toString(),
                              land_ari: ariVal,
                            }))
                          } else {
                            setFormData((prev) => ({ ...prev, area_m2: preset.value.toString() }))
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer border ${
                          formData.area_m2 === preset.value.toString()
                            ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Price per sqm display */}
                  {pricePerM2 && formData.type === 'shitje' && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg mt-1">
                      <Tag className="w-3.5 h-3.5 text-[#006459]" />
                      Çmimi për m²: <span className="text-[#006459] font-bold">{pricePerM2.toLocaleString('sq-AL')} € / m²</span>
                    </div>
                  )}
                </div>

                {/* Rooms and Floors (Tailored per Category) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Rooms if applicable */}
                  {activeCategory.hasRooms && (
                    <div>
                      <Label htmlFor="rooms" className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">
                        {activeCategory.roomsLabel} <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="rooms"
                        name="rooms"
                        value={formData.rooms}
                        onChange={handleChange}
                        style={{ colorScheme: 'light' }}
                        className="w-full h-12 px-3.5 rounded-xl border border-gray-200 text-sm font-medium bg-white text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#006459]/50 transition-all cursor-pointer"
                        required
                      >
                        {(activeCategory.roomOptions || [1, 2, 3, 4, 5, 6]).map((r) => (
                          <option key={r} value={r}>
                            {r} {r === 1 ? 'dhomë / hapësirë' : 'dhoma'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Floors if applicable */}
                  {activeCategory.hasFloors && (
                    <div>
                      <Label htmlFor="floor" className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">
                        {activeCategory.floorLabel || 'Kati'}
                      </Label>
                      <select
                        id="floor"
                        name="floor"
                        value={formData.floor}
                        onChange={handleChange}
                        style={{ colorScheme: 'light' }}
                        className="w-full h-12 px-3.5 rounded-xl border border-gray-200 text-sm font-medium bg-white text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#006459]/50 transition-all cursor-pointer"
                      >
                        {(activeCategory.floors || ['P/D', '1', '2', '3', '4', '5+']).map((fl) => (
                          <option key={fl} value={fl}>
                            {fl === 'P/D' ? 'Përdhesë (Kati 0)' : fl.startsWith('Bodrum') ? fl : `Kati ${fl}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Condition / Status */}
                <div className="pt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2.5 block">
                    {activeCategory.conditionLabel}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {activeCategory.conditions.map((cond) => {
                      const isCondActive = formData.condition === cond.value
                      return (
                        <button
                          key={cond.value}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, condition: cond.value }))}
                          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer border ${
                            isCondActive
                              ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {cond.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Features (Tailored chips) */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-bold text-[#101828]">
                      Karakteristikat e pronës
                    </Label>
                    <span className="text-xs text-gray-500">Zgjidhni gjithçka që vlen</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeCategory.features.map((feat) => {
                      const isFeatActive = formData.features.includes(feat)
                      return (
                        <button
                          key={feat}
                          type="button"
                          onClick={() => toggleFeature(feat)}
                          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer border flex items-center gap-1.5 ${
                            isFeatActive
                              ? 'bg-[#006459]/10 text-[#006459] border-[#006459]/40 font-semibold shadow-2xs'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {isFeatActive && <Check className="w-3.5 h-3.5 text-[#006459] stroke-[3]" />}
                          <span>{feat}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 4: Titulli & Përshkrimi me AI Suggester */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#101828] flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-[#006459]/10 text-[#006459] text-sm font-black flex items-center justify-center">
                      4
                    </span>
                    Titulli & Përshkrimi
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 ml-9.5">
                    Një titull i saktë dhe përshkrim i pasur tërheq 3x më shumë klientë të interesuar.
                  </p>
                </div>

                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Titulli i shpalljes <span className="text-red-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={handleSuggestTitle}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#006459] hover:underline cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Sugjero titull tërheqës
                    </button>
                  </div>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder={activeCategory.titlePlaceholder}
                    maxLength={MAX_TITLE_LENGTH}
                    className="h-12 text-sm sm:text-base font-semibold text-[#101828] bg-white border-gray-200 rounded-xl"
                    required
                  />
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                    <span>Shkruani një titull të qartë dhe informativ</span>
                    <span>
                      {formData.title.length}/{MAX_TITLE_LENGTH}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 block">
                    Përshkrimi i hollësishëm <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder={activeCategory.descriptionPlaceholder}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    rows={5}
                    className="w-full p-4 rounded-xl border border-gray-200 text-sm sm:text-base bg-white text-[#101828] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006459]/50 resize-none transition-all"
                    required
                  />
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                    <span>
                      Këshillë: Përmendni avantazhet kryesore, orientimin, gjendjen e dokumentacionit dhe mundësinë e negociimit.
                    </span>
                    <span>
                      {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Fotografitë (Media & Gallery Uploader) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-bold text-[#101828] flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-[#006459]/10 text-[#006459] text-sm font-black flex items-center justify-center">
                        5
                      </span>
                      Fotografitë e pronës
                    </h2>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {images.length}/10 foto
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 ml-9.5">
                    Ngarkoni deri në 10 fotografi me rezolucion të lartë. Fotoja e parë do të shërbejë si ballinë kryesore.
                  </p>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDropImages}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
                    isDragOver
                      ? 'border-[#006459] bg-[#006459]/5 scale-[0.99]'
                      : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-[#006459]/60'
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#006459]/10 text-[#006459] flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm sm:text-base font-bold text-[#101828]">
                      Kliko për të ngarkuar fotografi ose tërhiqi këtu
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Mbështet JPG, PNG, WebP deri në 10MB secila (kompresohen automatikisht)
                    </p>
                  </label>
                </div>

                {/* Previews Grid */}
                {previews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                    {previews.map((preview, i) => (
                      <div
                        key={preview}
                        className="relative group aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs"
                      >
                        <Image
                          src={preview}
                          alt={`Foto ${i + 1}`}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Primary Badge */}
                        {i === 0 ? (
                          <div className="absolute top-2 left-2 bg-[#006459] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Kryesorja
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => makePrimaryImage(i)}
                            className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm text-[#101828] text-[11px] font-semibold py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-center shadow-xs hover:bg-white cursor-pointer"
                          >
                            Bëje kryesore
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                          title="Hiq foton"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit CTA & Mobile Preview */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="lg:hidden w-full min-h-[44px] py-3 px-4 mb-3 rounded-2xl border border-gray-200 bg-white text-gray-700 text-xs sm:text-sm font-bold hover:bg-gray-50 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <Eye className="w-4 h-4 text-[#006459]" />
                  <span>Shiko pamjen paraprake të shpalljes</span>
                </button>

                <Button
                  type="submit"
                  disabled={uploading}
                  className="w-full h-14 rounded-2xl bg-[#006459] hover:bg-[#005048] text-white text-base font-bold shadow-lg shadow-[#006459]/20 hover:shadow-[#006459]/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Duke ngarkuar ({uploadProgress}%)...
                    </>
                  ) : (
                    <>
                      <span>Publiko pronën falas</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-gray-500 mt-3">
                  Duke klikuar &quot;Publiko pronën falas&quot;, ju pranoni{' '}
                  <Link href="/kushtet" className="text-[#006459] font-medium hover:underline">
                    Kushtet e Shërbimit
                  </Link>{' '}
                  dhe{' '}
                  <Link href="/privatesia" className="text-[#006459] font-medium hover:underline">
                    Politikën e Privatësisë
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* Sticky Live Preview & Summary Sidebar (4 Cols on Desktop) */}
            <div className="lg:col-span-4 sticky top-24 space-y-6">
              {/* Card 1: Live Card Preview */}
              <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#006459]" />
                    Pamja paraprake
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Drejtëpërdrejtë
                  </span>
                </div>

                {/* Simulated Listing Card */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 overflow-hidden shadow-2xs">
                  <div className="relative aspect-[4/3] bg-gray-200">
                    {previews[0] ? (
                      <Image
                        src={previews[0]}
                        alt="Ballina e pronës"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                        <Upload className="w-8 h-8 mb-1 stroke-[1.5]" />
                        <span className="text-xs">Foto kryesore</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-sm text-[#101828] text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                      {formData.type === 'shitje' ? 'Shitje' : 'Me qira'}
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2">
                    <h3 className="text-sm font-bold text-[#101828] line-clamp-2 leading-snug">
                      {formData.title || 'Titulli i listimit tuaj do të shfaqet këtu...'}
                    </h3>

                    <div className="flex items-center text-xs text-gray-500 truncate">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />
                      <span className="truncate">
                        {[formData.neighborhood, formData.city].filter(Boolean).join(', ') || formData.city}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-600 pt-1 border-t border-gray-200/60">
                      {activeCategory.hasRooms && (
                        <div className="flex items-center gap-1">
                          <BedDouble className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formData.rooms || '2'} dhoma</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formData.area_m2 || '85'} m²</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-baseline justify-between">
                      <span className="text-base font-black text-[#006459]">
                        {formatPriceDisplay(formData.price) || '0 €'}
                      </span>
                      {formData.type === 'qira' && <span className="text-xs text-gray-500">/muaj</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Benefits & Trust */}
              <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Pse të zgjidhni BlejePronën?
                </h4>
                <div className="space-y-3 text-xs text-gray-600">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#101828]">30 Ditë Listim Falas</p>
                      <p className="text-gray-500">Testoni shërbimin pa asnjë kartë krediti apo detyrim.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#101828]">Komunikim i Drejtpërdrejtë</p>
                      <p className="text-gray-500">Biseda të shpejta përmes mesazheve ose telefonatave me blerësit.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#101828]">Prezantim i Klasit të Parë</p>
                      <p className="text-gray-500">Format i pasur për banesa, shtëpi, toka dhe ambiente afariste.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      {/* Mobile Live Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 lg:hidden">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-gray-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#006459]" />
                Pamja paraprake
              </span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 overflow-hidden shadow-2xs">
              <div className="relative aspect-[4/3] bg-gray-200">
                {previews[0] ? (
                  <Image src={previews[0]} alt="Ballina e pronës" fill unoptimized className="object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                    <Upload className="w-8 h-8 mb-1 stroke-[1.5]" />
                    <span className="text-xs">Foto kryesore</span>
                  </div>
                )}
                <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-sm text-[#101828] text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  {formData.type === 'shitje' ? 'Shitje' : 'Me qira'}
                </div>
              </div>

              <div className="p-3.5 space-y-2">
                <h3 className="text-sm font-bold text-[#101828] line-clamp-2 leading-snug">
                  {formData.title || 'Titulli i listimit tuaj do të shfaqet këtu...'}
                </h3>

                <div className="flex items-center text-xs text-gray-500 truncate">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />
                  <span className="truncate">
                    {[formData.neighborhood, formData.city].filter(Boolean).join(', ') || formData.city}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-600 pt-1 border-t border-gray-200/60">
                  {activeCategory.hasRooms && (
                    <div className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formData.rooms || '2'} dhoma</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>{formData.area_m2 || '85'} m²</span>
                  </div>
                </div>

                <div className="pt-2 flex items-baseline justify-between">
                  <span className="text-base font-black text-[#006459]">
                    {formatPriceDisplay(formData.price) || '0 €'}
                  </span>
                  {formData.type === 'qira' && <span className="text-xs text-gray-500">/muaj</span>}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="w-full mt-4 h-11 rounded-xl bg-[#006459] text-white font-bold text-xs cursor-pointer"
            >
              Mbyll pamjen paraprake
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
