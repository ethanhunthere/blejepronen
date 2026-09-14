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
  Star,
  FileText,
  Trees,
  Briefcase,
  Warehouse,
  Check,
  MapPin,
  Maximize2,
  BedDouble,
  Tag,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Eye,
  RotateCcw,
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
    icon: Home,
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

function generateOrEnhanceDescription(
  currentText: string,
  data: FormData,
  cat: CategoryConfig
): string {
  const isSale = data.type === 'shitje'
  const transType = isSale ? 'në shitje' : 'me qira'
  const locationParts = [data.neighborhood, data.city].filter(Boolean)
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : data.city || 'Kosovë'
  const areaStr = data.category === 'toke'
    ? (data.land_ari ? `${data.land_ari} Ari` : (data.area_m2 ? `${data.area_m2} m²` : ''))
    : (data.area_m2 ? `${data.area_m2} m²` : '')
  const priceStr = data.price ? `${Number(data.price).toLocaleString('de-DE')} €` : ''
  const featuresList = data.features && data.features.length > 0 ? data.features : []

  // Case 1: Përdoruesi nuk ka shkruar asgjë -> Gjenero përshkrim të plotë, të pasur dhe profesional
  if (!currentText.trim()) {
    const titleLead = `Ofrohet ${transType} ${cat.label.toLowerCase()} me specifikime komode në ${locationStr}.`

    let specSection = ''
    if (data.category === 'banese') {
      specSection = `Kjo banesë ${data.subtype ? `e tipologjisë ${data.subtype}` : ''} shquhet për organizim praktik të hapësirës dhe ndriçim të shkëlqyer natyral gjatë gjithë ditës.
Organizimi i brendshëm përfshin:
• Sallon të rehatshëm ndenjeje me kuzhinë dhe ambient ngrënieje
• ${data.rooms ? `${data.rooms} dhoma të përshtatshme me kubaturë të rregullt` : 'Dhoma gjumi të qeta'}
• Banjo moderne dhe ballkon funksional
• Pozicionuar në ${data.floor ? `katin ${data.floor}` : 'kat të favorshëm'}${areaStr ? `, me sipërfaqe të përgjithshme prej ${areaStr}` : ''}.`
    } else if (data.category === 'shtepi') {
      specSection = `Kjo shtëpi ${data.subtype ? `(${data.subtype})` : 'familjare'} ofron komoditet maksimal, privatësi dhe ambient të qetë ideal për jetesë të rehatshme.
Pikat kryesore:
• Ndërtim cilësor dhe i mirëorganizuar ${data.floor ? `në ${data.floor} kate` : ''}
• ${data.rooms ? `${data.rooms} dhoma të bollshme me ajrosje dhe dritë natyrale` : 'Dhomë ndenjeje e gjerë dhe dhoma gjumi komode'}
• ${areaStr ? `Sipërfaqe e përgjithshme banimi prej ${areaStr}` : 'Hapësirë e bollshme banimi'}
• Oborr i mirëmbajtur me qasje direkte dhe vend për parkim.`
    } else if (data.category === 'vile') {
      specSection = `Vilë ekskluzive ${transType} në një prej zonave më prestigjioze dhe të qeta të ${locationStr}.
Karakteristikat e pronës:
• Arkitekturë moderne me standarde të larta ndërtimi dhe termoizolimi
• ${areaStr ? `Sipërfaqe banimi prej ${areaStr}` : 'Hapësirë madhështore'} me organizim elegant të ambienteve ditore dhe të fjetjes
• Oborr privat, ambient i rrethuar me privatësi maksimale dhe ambient relaksues
• Zgjedhje e përkryer për ata që vlerësojnë sigurinë, qetësinë dhe komoditetin e nivelit të lartë.`
    } else if (data.category === 'toke') {
      specSection = `Ofrohet ${transType} truall me potencial të lartë zhvillimi dhe investimi në ${locationStr}.
Detajet e parcelës:
• ${areaStr ? `Sipërfaqe totale prej ${areaStr}` : 'Sipërfaqe e favorshme'}
• Terren i rregullt me qasje të drejtpërdrejtë në rrugë
• Infrastrukturë e afërt (rrjeti elektrik, ujësjellësi)
• Dokumentacion i rregullt kadastral me fletë poseduese, i gatshëm për bartje.`
    } else if (data.category === 'lokal') {
      specSection = `Hapësirë moderne afariste ${transType} me pozitë strategjike në ${locationStr}.
Përparësitë kryesore:
• ${areaStr ? `Sipërfaqe shfrytëzuese prej ${areaStr}` : 'Hapësirë e hapur dhe funksionale'}
• Fasada me pamje dhe ekspozim të shkëlqyer nga rruga kryesore
• Ideale për zyra përfaqësie, klinikë, farmaci, showroom, dyqan apo aktivitete të tjera komerciale
• Qasje e lehtë dhe mundësi parkingu për stafin dhe klientët.`
    } else {
      specSection = `Ofrohet ${transType} garazhë / hapësirë depoje e sigurt dhe lehtësisht e qasshme në ${locationStr}.
• ${areaStr ? `Sipërfaqe prej ${areaStr}` : 'Hapësirë e bollshme dhe e mbyllur'}
• Siguri e garantuar dhe mirëmbajtje e vazhdueshme
• E përshtatshme për parkim automjeti apo magazinim mallrash.`
    }

    const featuresBlock = featuresList.length > 0
      ? `\n\nPajisjet dhe përparësitë e pronës:\n${featuresList.map((f) => `• ${f}`).join('\n')}`
      : ''

    const priceBlock = priceStr ? `\n\nÇmimi: ${priceStr}${isSale ? ' (i negociueshëm)' : ' në muaj'}` : ''

    const footerBlock = `\n\nPër informata shtesë, dokumentacion të plotë apo për të caktuar një vizitë në pronë, ju lutemi të na kontaktoni.`

    return `${titleLead}\n\n${specSection}${featuresBlock}${priceBlock}${footerBlock}`.trim()
  }

  // Case 2: Përdoruesi ka shkruar disa fjalë / shënime -> Rregullo, pastro dhe ngrije në stil profesional
  const trimmed = currentText.trim()
  const cleaned = trimmed
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s*([a-zëç])/g, (_m, p1, p2) => `${p1} ${p2.toUpperCase()}`)

  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)

  let enhanced = `Ofrohet ${transType} ${cat.label.toLowerCase()} në ${locationStr}.\n\n`
  enhanced += `Përshkrimi i pronës:\n${capitalized}\n\n`

  const specs: string[] = []
  if (areaStr) specs.push(`• Sipërfaqja: ${areaStr}`)
  if (data.subtype) specs.push(`• Tipologjia: ${data.subtype}`)
  if (cat.hasRooms && data.rooms) specs.push(`• Dhomat: ${data.rooms}`)
  if (cat.hasFloors && data.floor) specs.push(`• Kati / Niveli: Kati ${data.floor}`)
  if (data.condition) {
    const condLabel = cat.conditions.find((c) => c.value === data.condition)?.label || data.condition
    specs.push(`• Gjendja: ${condLabel}`)
  }
  if (priceStr) specs.push(`• Çmimi: ${priceStr}${isSale ? ' (i negociueshëm)' : ' / muaj'}`)

  if (specs.length > 0) {
    enhanced += `Të dhënat kryesore:\n${specs.join('\n')}\n\n`
  }

  if (featuresList.length > 0) {
    enhanced += `Përparësitë & Veçoritë:\n${featuresList.map((f) => `• ${f}`).join('\n')}\n\n`
  }

  enhanced += `Prona disponon dokumentacion të rregullt. Për më shumë informata apo për të caktuar një vizitë në pronë, ju mirëpresim të na kontaktoni.`

  return enhanced.trim()
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
    rooms: '3',
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
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false)
  const [undoDescription, setUndoDescription] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const isSubmittingRef = useRef(false)

  const activeCategory = CATEGORIES[formData.category]

  // Smart Description Generator / Enhancer
  const handleAutoDescription = () => {
    setIsGeneratingDesc(true)
    const current = formData.description || ''
    setUndoDescription(current)

    setTimeout(() => {
      const generated = generateOrEnhanceDescription(current, formData, activeCategory)
      setFormData((prev) => ({ ...prev, description: generated }))
      setIsGeneratingDesc(false)

      if (current.trim().length > 0) {
        toast.success('Përshkrimi u rregullua dhe u formatua profesionalisht!')
      } else {
        toast.success('Përshkrimi profesional u sugjerua me sukses!')
      }
    }, 300)
  }

  const handleUndoDescription = () => {
    if (undoDescription !== null) {
      setFormData((prev) => ({ ...prev, description: undoDescription }))
      setUndoDescription(null)
      toast.info('Përshkrimi i mëparshëm u rikthye.')
    }
  }

  // Update category handler with smart synchronized defaults
  const handleCategorySelect = (catId: PropertyCategory) => {
    const nextCat = CATEGORIES[catId]
    let defaultRooms = '0'
    let defaultFloor = ''
    let defaultSubtype = nextCat.subtypes[0] || ''

    if (catId === 'banese') {
      defaultSubtype = '2+1'
      defaultRooms = '3'
      defaultFloor = '2'
    } else if (catId === 'shtepi') {
      defaultSubtype = 'Shtëpi private'
      defaultRooms = '4'
      defaultFloor = '2'
    } else if (catId === 'vile') {
      defaultSubtype = 'Vilë luksoze'
      defaultRooms = '5'
      defaultFloor = '2'
    } else if (catId === 'toke') {
      defaultSubtype = 'Truall ndërtimi'
      defaultRooms = '0'
      defaultFloor = ''
    } else if (catId === 'lokal') {
      defaultSubtype = 'Lokal afarist rrugor'
      defaultRooms = '1'
      defaultFloor = 'P/D'
    } else if (catId === 'garazh') {
      defaultSubtype = 'Garazhë e mbyllur'
      defaultRooms = '0'
      defaultFloor = 'Bodrum'
    }

    setFormData((prev) => ({
      ...prev,
      category: catId,
      subtype: defaultSubtype,
      rooms: defaultRooms,
      floor: defaultFloor,
      areaUnit: nextCat.areaUnitDefault,
      condition: nextCat.conditions[0]?.value || 'e-re',
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

  // Smart Title Suggester with synchronized category specifications
  const handleSuggestTitle = () => {
    const typeText = formData.type === 'shitje' ? 'në shitje' : 'me qira'
    const locationPart = [formData.neighborhood, formData.city].filter(Boolean).join(', ')

    let specPart = ''
    if (formData.category === 'toke') {
      const areaStr = formData.land_ari ? `${formData.land_ari} Ari` : `${formData.area_m2 || '1000'} m²`
      specPart = `${formData.subtype || 'Truall'} ${areaStr}`
    } else if (formData.category === 'banese') {
      const floorStr = formData.floor ? `(Kati ${formData.floor === 'P/D' ? '0' : formData.floor})` : ''
      const areaStr = formData.area_m2 ? `${formData.area_m2} m²` : ''
      specPart = `${formData.subtype || 'Banesë'} ${areaStr} ${floorStr}`.trim()
    } else if (formData.category === 'shtepi') {
      const floorStr = formData.floor ? `${formData.floor}-katëshe` : ''
      const areaStr = formData.area_m2 ? `${formData.area_m2} m²` : ''
      specPart = `${formData.subtype || 'Shtëpi'} ${floorStr} ${areaStr}`.trim()
    } else if (formData.category === 'vile') {
      const areaStr = formData.area_m2 ? `${formData.area_m2} m²` : ''
      specPart = `${formData.subtype || 'Vilë luksoze'} ${areaStr}`.trim()
    } else if (formData.category === 'lokal') {
      const areaStr = formData.area_m2 ? `${formData.area_m2} m²` : ''
      specPart = `${formData.subtype || 'Lokal afarist'} ${areaStr}`.trim()
    } else if (formData.category === 'garazh') {
      const areaStr = formData.area_m2 ? `${formData.area_m2} m²` : ''
      specPart = `${formData.subtype || 'Garazhë'} ${areaStr}`.trim()
    }

    let suggested = `${activeCategory.titleShort} ${specPart} në ${locationPart} ${typeText}`.replace(/\s+/g, ' ').trim()
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

  // Helper: single-choice feature within a pattern (replaces any previous matching feature)
  const syncSingleChoiceFeature = (pattern: RegExp, value: string) => {
    setFormData((prev) => {
      const filtered = prev.features.filter((f) => !pattern.test(f))
      return {
        ...prev,
        features: value ? [...filtered, value] : filtered,
      }
    })
  }

  // Helper: check if any active feature matches a regex pattern
  const hasFeatureMatching = (pattern: RegExp) => {
    return formData.features.some((f) => pattern.test(f))
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
              <CheckCircle2 className="w-3.5 h-3.5" />
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

                {/* 6 Category Selection Cards - Sleek, Compact & Fully Responsive */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {(Object.keys(CATEGORIES) as PropertyCategory[]).map((catKey) => {
                    const cat = CATEGORIES[catKey]
                    const IconComp = cat.icon
                    const isSelected = formData.category === catKey

                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => handleCategorySelect(catKey)}
                        className={`group relative p-3 sm:p-3.5 rounded-xl sm:rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                          isSelected
                            ? 'bg-[#006459]/[0.05] border-[#006459] shadow-xs ring-1 sm:ring-2 ring-[#006459]/15'
                            : 'bg-white border-gray-200/90 hover:border-gray-300 hover:bg-gray-50/70 hover:shadow-2xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <div
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-[#006459] text-white shadow-2xs'
                                  : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200/80 group-hover:text-gray-900'
                              }`}
                            >
                              <IconComp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider transition-colors ${
                                  isSelected
                                    ? 'bg-[#006459]/10 text-[#006459]'
                                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200/60'
                                }`}
                              >
                                {cat.badge}
                              </span>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-[#006459] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </div>

                          <h3
                            className={`text-xs sm:text-sm font-extrabold leading-tight transition-colors ${
                              isSelected ? 'text-[#006459]' : 'text-[#101828]'
                            }`}
                          >
                            {cat.label}
                          </h3>

                          <p className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-snug line-clamp-2">
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
                          className={`min-h-[46px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border ${
                            isActive
                              ? 'bg-[#006459] text-white border-[#006459] shadow-sm'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                          }`}
                        >
                          <span>{t === 'shitje' ? '🏠 Në Shitje' : '🔑 Me Qira'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* DEDICATED SYNCHRONIZED OPTIONS PANEL FOR SELECTED CATEGORY */}
                <div className="pt-5 border-t border-gray-100/90 space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#006459] bg-[#006459]/10 px-2.5 py-1 rounded-lg">
                      Opsionet e Detajuara · {activeCategory.label}
                    </span>
                    <span className="text-xs text-gray-500 hidden sm:inline-block">
                      Sinkronizohen automatikisht me të dhënat e pronës
                    </span>
                  </div>

                  {/* 1. BANESE / APARTAMENT OPTIONS */}
                  {formData.category === 'banese' && (
                    <div className="space-y-4 pt-1">
                      {/* Tipologjia */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                            Tipologjia e banesës
                          </span>
                          <span className="text-[11px] text-gray-400">Përcakton dhomat automatikisht</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['Studio', '1+1', '2+1', '3+1', '4+1', 'Duplex', 'Penthouse'].map((st) => {
                            const isSel = formData.subtype === st
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => {
                                  let r = formData.rooms
                                  if (st === 'Studio') r = '1'
                                  else if (st === '1+1') r = '2'
                                  else if (st === '2+1') r = '3'
                                  else if (st === '3+1') r = '4'
                                  else if (st === '4+1') r = '5'
                                  setFormData((prev) => ({ ...prev, subtype: st, rooms: r }))
                                }}
                                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer border ${
                                  isSel
                                    ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                }`}
                              >
                                {st}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Kati */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                            Kati
                          </span>
                          <span className="text-[11px] text-gray-400">Zgjidhni katin e ndërtesës</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {['Bodrum', 'P/D', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'].map((fl) => {
                            const isSel = formData.floor === fl
                            const label = fl === 'P/D' ? 'Përdhesë (0)' : fl === 'Bodrum' ? 'Bodrum' : `Kati ${fl}`
                            return (
                              <button
                                key={fl}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, floor: fl }))}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer border ${
                                  isSel
                                    ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Dhoma & Banjot & Ballkoni Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        {/* Numri i dhomave */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Dhomat e gjumit / Dhoma
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['1', '2', '3', '4', '5', '6'].map((r) => {
                              const isSel = formData.rooms === r
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, rooms: r }))}
                                  className={`w-9 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {r}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Banjot */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Banjot
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['1 Banjo', '2 Banjo', '3+ Banjo'].map((b) => {
                              const isSel = formData.features.includes(b)
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => syncSingleChoiceFeature(/Banjo/i, b)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {b}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Ballkoni */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Ballkoni / Tarraca
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Pa ballkon', '1 Ballkon', '2 Ballkone', 'Tarracë'].map((b) => {
                              const isSel = b === 'Pa ballkon' ? !hasFeatureMatching(/Ballkon|Tarracë/i) : formData.features.includes(b)
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => syncSingleChoiceFeature(/Ballkon|Tarracë/i, b === 'Pa ballkon' ? '' : b)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {b}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Orientimi */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Orientimi ndaj diellit
                        </span>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {['Lindje', 'Perëndim', 'Jug', 'Veri', 'Jug-Lindje', 'Jug-Perëndim'].map((o) => {
                            const featStr = `Orientimi ${o}`
                            const isSel = formData.features.includes(featStr)
                            return (
                              <button
                                key={o}
                                type="button"
                                onClick={() => syncSingleChoiceFeature(/Orientimi/i, featStr)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                  isSel
                                    ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {o}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. SHTEPI OPTIONS */}
                  {formData.category === 'shtepi' && (
                    <div className="space-y-4 pt-1">
                      {/* Lloji i shtëpisë */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Lloji i shtëpisë
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {['Shtëpi private', 'Shtëpi me oborr', 'Townhouse (në varg)', 'Shtëpi 2-familjare'].map((st) => {
                            const isSel = formData.subtype === st
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, subtype: st }))}
                                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer border ${
                                  isSel
                                    ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                }`}
                              >
                                {st}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Numri i kateve & Dhomat */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Numri i kateve
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {['1', '2', '3', '4'].map((fl) => {
                              const isSel = formData.floor === fl
                              return (
                                <button
                                  key={fl}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, floor: fl }))}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {fl}-katëshe
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Dhomat totale
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['2', '3', '4', '5', '6', '7', '8'].map((r) => {
                              const isSel = formData.rooms === r
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, rooms: r }))}
                                  className={`w-9 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {r}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Oborri & Parkimi & Banjot */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        {/* Oborri */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Hapësira e oborrit
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Pa oborr', '1-2 Ari oborr', '3-5 Ari oborr', '5-10 Ari oborr', '10+ Ari oborr'].map((o) => {
                              const isSel = o === 'Pa oborr' ? !hasFeatureMatching(/oborr/i) : formData.features.includes(o)
                              return (
                                <button
                                  key={o}
                                  type="button"
                                  onClick={() => syncSingleChoiceFeature(/oborr/i, o === 'Pa oborr' ? '' : o)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {o}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Parkimi */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Parkimi & Garazha
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Vendparkim në oborr', 'Garazhë private', 'Garazhë për 2+ vetura'].map((p) => {
                              const isSel = formData.features.includes(p)
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => syncSingleChoiceFeature(/Garazhë|Vendparkim/i, p)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {p}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Banjot */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Banjot
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['1 Banjo', '2 Banjo', '3 Banjo', '4+ Banjo'].map((b) => {
                              const isSel = formData.features.includes(b)
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => syncSingleChoiceFeature(/Banjo/i, b)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {b}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. VILE OPTIONS */}
                  {formData.category === 'vile' && (
                    <div className="space-y-4 pt-1">
                      {/* Koncepti i vilës */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Koncepti & Lloji i vilës
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {['Vilë luksoze', 'Vilë pushimi / malore', 'Vilë rezidenciale (Gated)', 'Vilë duplex'].map((st) => {
                            const isSel = formData.subtype === st
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, subtype: st }))}
                                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer border ${
                                  isSel
                                    ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                }`}
                              >
                                {st}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Katet & Dhomat */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Numri i kateve
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {['1', '2', '3'].map((fl) => {
                              const isSel = formData.floor === fl
                              return (
                                <button
                                  key={fl}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, floor: fl }))}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {fl}-katëshe
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Dhomat
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['3', '4', '5', '6', '7', '8'].map((r) => {
                              const isSel = formData.rooms === r
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, rooms: r }))}
                                  className={`w-9 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {r}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Pishina & Banjot & Komoditetet */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        {/* Pishina */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Pishina & Relaksi
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Pishinë private', 'Jacuzzi / Spa', 'Sauna', 'Pa pishinë'].map((p) => {
                              const isSel = p === 'Pa pishinë' ? !hasFeatureMatching(/Pishinë|Jacuzzi|Sauna|Spa/i) : formData.features.includes(p)
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => syncSingleChoiceFeature(/Pishinë|Jacuzzi|Sauna|Spa/i, p === 'Pa pishinë' ? '' : p)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {p}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Banjot */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Banjot
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['2 Banjo', '3 Banjo', '4 Banjo', '5+ Banjo'].map((b) => {
                              const isSel = formData.features.includes(b)
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => syncSingleChoiceFeature(/Banjo/i, b)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {b}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Komoditete Premium */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Komoditete Ekskluzive
                        </span>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {['Kopësht', 'Smart Home', 'Siguri 24h', 'Oxhak', 'Garazhë private', 'Panoramë'].map((feat) => {
                            const isSel = formData.features.includes(feat)
                            return (
                              <button
                                key={feat}
                                type="button"
                                onClick={() => toggleFeature(feat)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                                  isSel
                                    ? 'bg-[#006459]/10 text-[#006459] border-[#006459]/40 font-semibold shadow-2xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {isSel && <Check className="w-3 h-3 text-[#006459] stroke-[3]" />}
                                <span>{feat}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. TOKE / TRUALL OPTIONS */}
                  {formData.category === 'toke' && (
                    <div className="space-y-4 pt-1">
                      {/* Destinimi */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Destinimi i truallit
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {['Truall ndërtimi', 'Tokë bujqësore', 'Tokë komerciale / Industriale', 'Parcelë për vilë'].map((st) => {
                            const isSel = formData.subtype === st
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, subtype: st }))}
                                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer border ${
                                  isSel
                                    ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                }`}
                              >
                                {st}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Dokumentacioni & Rruga */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Dokumentacioni */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Dokumentacioni ligjor
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Me Fletë Poseduese (1/1)', 'Leje ndërtimi', 'Në Plan Urbanistik', 'Me Projekt të gatshëm'].map((doc) => {
                              const isSel = formData.features.includes(doc)
                              return (
                                <button
                                  key={doc}
                                  type="button"
                                  onClick={() => {
                                    toggleFeature(doc)
                                    if (doc.includes('Fletë Poseduese')) {
                                      setFormData((prev) => ({ ...prev, condition: 'e-re' }))
                                    }
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                                    isSel
                                      ? 'bg-[#006459]/10 text-[#006459] border-[#006459]/40 font-semibold shadow-2xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {isSel && <Check className="w-3 h-3 text-[#006459] stroke-[3]" />}
                                  <span>{doc}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Rruga & Qasja */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Rruga & Qasja
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Rrugë e asfaltuar', 'Rrugë me zhavorr', 'Qasje në magjistrale'].map((r) => {
                              const isSel = formData.features.includes(r)
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => syncSingleChoiceFeature(/Rrugë|magjistrale/i, r)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {r}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Komunaliet & Relievi */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Komunaliet & Infrastruktura
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Rrymë elektrike', 'Ujësjellës', 'Kanalizim', 'Ndriçim publik', 'E rrethuar'].map((util) => {
                              const isSel = formData.features.includes(util)
                              return (
                                <button
                                  key={util}
                                  type="button"
                                  onClick={() => toggleFeature(util)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                                    isSel
                                      ? 'bg-[#006459]/10 text-[#006459] border-[#006459]/40 font-semibold shadow-2xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {isSel && <Check className="w-3 h-3 text-[#006459] stroke-[3]" />}
                                  <span>{util}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Relievi & Pozita
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Terren i rrafshët', 'Pjerrësi e lehtë', 'Kodrinor me panoramë'].map((rel) => {
                              const isSel = formData.features.includes(rel)
                              return (
                                <button
                                  key={rel}
                                  type="button"
                                  onClick={() => syncSingleChoiceFeature(/Terren|Pjerrësi|Kodrinor/i, rel)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {rel}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. LOKAL / ZYRE OPTIONS */}
                  {formData.category === 'lokal' && (
                    <div className="space-y-4 pt-1">
                      {/* Lloji */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Lloji i ambientit afarist
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {['Lokal afarist rrugor', 'Zyrë biznesi', 'Showroom / Dyqan', 'Hapësirë multifunksionale'].map((st) => {
                            const isSel = formData.subtype === st
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, subtype: st }))}
                                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer border ${
                                  isSel
                                    ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                }`}
                              >
                                {st}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Organizimi & Kati */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Organizimi i hapësirës
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {['Open Space', '2 Hapësira', '3 Hapësira', '4+ Hapësira'].map((o) => {
                              const targetRoom = o === 'Open Space' ? '1' : o.charAt(0)
                              const isSel = formData.rooms === targetRoom
                              return (
                                <button
                                  key={o}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, rooms: targetRoom }))}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {o}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                            Pozicioni / Kati
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Bodrum', 'P/D', '1', '2', '3', '4', '5+'].map((fl) => {
                              const isSel = formData.floor === fl
                              const label = fl === 'P/D' ? 'Përdhesë (0)' : fl === 'Bodrum' ? 'Bodrum' : `Kati ${fl}`
                              return (
                                <button
                                  key={fl}
                                  type="button"
                                  onClick={() => setFormData((prev) => ({ ...prev, floor: fl }))}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                    isSel
                                      ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Përparësitë për biznes */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Përparësitë për biznes
                        </span>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {['Vitrinë xhami', 'Parking', 'Rrymë 3-fazore', 'Nyje sanitare', 'Klimë', 'Qasje nga rruga kryesore', 'Siguri 24h'].map((feat) => {
                            const isSel = formData.features.includes(feat)
                            return (
                              <button
                                key={feat}
                                type="button"
                                onClick={() => toggleFeature(feat)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                                  isSel
                                    ? 'bg-[#006459]/10 text-[#006459] border-[#006459]/40 font-semibold shadow-2xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {isSel && <Check className="w-3 h-3 text-[#006459] stroke-[3]" />}
                                <span>{feat}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. GARAZHE / DEPO OPTIONS */}
                  {formData.category === 'garazh' && (
                    <div className="space-y-4 pt-1">
                      {/* Lloji */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Lloji i vendparkimit / depos
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {['Garazhë e mbyllur', 'Vendparkim nëntokësor', 'Depo / Magazinë', 'Vendparkim i hapur'].map((st) => {
                            const isSel = formData.subtype === st
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, subtype: st }))}
                                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer border ${
                                  isSel
                                    ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                }`}
                              >
                                {st}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Niveli / Lokacioni */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Niveli / Lokacioni
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { val: 'Bodrum', label: 'Kati -1 (Nëntokë)' },
                            { val: 'P/D', label: 'Përdhesë (Niveli 0)' },
                            { val: '1', label: 'Kati 1' },
                          ].map((item) => {
                            const isSel = formData.floor === item.val
                            return (
                              <button
                                key={item.val}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, floor: item.val }))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                                  isSel
                                    ? 'bg-[#006459] text-white border-[#006459] shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {item.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Pajisja & Siguria */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Pajisja & Siguria
                        </span>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {['Qepen me telekomandë', 'Kamera sigurie', 'Prizë për EV', 'Rampë e lehtë hyrëse', 'Ndriçim 24h', 'Ventilacion', 'Siguri 24h'].map((feat) => {
                            const isSel = formData.features.includes(feat)
                            return (
                              <button
                                key={feat}
                                type="button"
                                onClick={() => toggleFeature(feat)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                                  isSel
                                    ? 'bg-[#006459]/10 text-[#006459] border-[#006459]/40 font-semibold shadow-2xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {isSel && <Check className="w-3 h-3 text-[#006459] stroke-[3]" />}
                                <span>{feat}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                      <FileText className="w-3.5 h-3.5" />
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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Përshkrimi i hollësishëm <span className="text-red-500">*</span>
                    </Label>

                    <div className="flex items-center gap-2">
                      {undoDescription !== null && (
                        <button
                          type="button"
                          onClick={handleUndoDescription}
                          className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Kthe tekstin e mëparshëm</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleAutoDescription}
                        disabled={isGeneratingDesc}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 ${
                          formData.description.trim().length > 0
                            ? 'bg-[#C8B882]/25 text-[#006459] hover:bg-[#C8B882]/40 border border-[#C8B882]/50'
                            : 'bg-[#006459]/10 text-[#006459] hover:bg-[#006459] hover:text-white border border-[#006459]/20'
                        }`}
                      >
                        {isGeneratingDesc ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-[#006459]" />
                        )}
                        <span>
                          {isGeneratingDesc
                            ? 'Duke përpunuar...'
                            : formData.description.trim().length > 0
                            ? 'Rregullo & përmirëso përshkrimin'
                            : 'Sugjero përshkrim profesional'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder={activeCategory.descriptionPlaceholder}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    rows={6}
                    className="w-full p-4 rounded-xl border border-gray-200 text-sm sm:text-base bg-white text-[#101828] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006459]/40 focus:border-[#006459] resize-y transition-all leading-relaxed"
                    required
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-1.5 text-xs text-gray-500">
                    <span>
                      {formData.description.trim().length === 0
                        ? 'Kliko "Sugjero përshkrim profesional" për ta plotësuar automatikisht bazuar në të dhënat e pronës.'
                        : 'Kliko "Rregullo & përmirëso përshkrimin" për ta formatuar tekstin tuaj në mënyrë të qartë dhe profesionale.'}
                    </span>
                    <span className="font-mono text-[11px] text-gray-400 self-end sm:self-auto shrink-0">
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
                            <Star className="w-3 h-3 fill-current" />
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
