export type PropertyCategory = 'banese' | 'shtepi' | 'vile' | 'toke' | 'lokal' | 'garazh'

export interface CategoryConfig {
  id: PropertyCategory
  label: string
  titleShort: string
  badge: string
  description: string
  subtypes: string[]
  features: string[]
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

export const CATEGORIES: Record<PropertyCategory, CategoryConfig> = {
  banese: {
    id: 'banese',
    label: 'Banesë',
    titleShort: 'Banesë',
    badge: 'Apartament / Banesë',
    description: 'Banesa në pallate, ndërtime të reja apo ekzistuese.',
    subtypes: ['Garsonierë', '1+1', '2+1', '3+1', '4+1', 'Duplex', 'Penthouse'],
    features: ['Ashensor', 'Ballkon', 'Garazhë / Parking', 'Klimatizim', 'Ngrohje qendrore', 'Mobiluar', 'Kuzhinë e kompletuar', 'Interfon', 'Kamerë sigurie', 'Fletë poseduese'],
    hasRooms: true,
    roomsLabel: 'Numri i dhomave',
    roomOptions: [1, 2, 3, 4, 5, 6],
    hasFloors: true,
    floorLabel: 'Kati',
    floors: ['Përdhesë', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'],
    conditionLabel: 'Gjendja e banesës',
    conditions: [
      { value: 'e-re', label: 'E re / E pabanuar' },
      { value: 'e-renovuar', label: 'E renovuar së fundmi' },
      { value: 'e-mire', label: 'Në gjendje të mirë' },
      { value: 'ne-ndertim', label: 'Në ndërtim e sipër' },
    ],
    titlePlaceholder: 'p.sh. Banesë moderne 2+1 në Dardani me mobilim luksoz',
    descriptionPlaceholder: 'Përshkruani banesën, hapësirat, dritën natyrale, orientimin, afërsinë me shkolla apo transport...',
  },
  shtepi: {
    id: 'shtepi',
    label: 'Shtëpi',
    titleShort: 'Shtëpi',
    badge: 'Shtëpi private',
    description: 'Shtëpi individuale, me oborr ose kopsht familjar.',
    subtypes: ['Shtëpi individuale', 'Shtëpi me 2 kate', 'Shtëpi me 3 kate', 'Shtëpi me oborr të madh'],
    features: ['Oborr privat', 'Garazhë', 'Sistem ngrohjeje', 'Klimatizim', 'Kopsht', 'Bodrum', 'Kamera vëzhguese', 'Dokumentacion i rregullt'],
    hasRooms: true,
    roomsLabel: 'Numri i dhomave të gjumit',
    roomOptions: [2, 3, 4, 5, 6, 7, 8],
    hasFloors: true,
    floorLabel: 'Numri i kateve',
    floors: ['1 Kat', '2 Kate', '3 Kate', '4 Kate'],
    conditionLabel: 'Gjendja e shtëpisë',
    conditions: [
      { value: 'e-re', label: 'E sapondërtuar' },
      { value: 'e-renovuar', label: 'E sapo-renovuar' },
      { value: 'e-mire', label: 'E mirëmbajtur' },
      { value: 'ne-ndertim', label: 'Në përfundim e sipër' },
    ],
    titlePlaceholder: 'p.sh. Shtëpi komode 2-katëshe me oborr në Veternik',
    descriptionPlaceholder: 'Përshkruani ambientin familjar, oborrin, qetësinë, parkingun...',
  },
  vile: {
    id: 'vile',
    label: 'Vilë',
    titleShort: 'Vilë',
    badge: 'Vilë luksoze',
    description: 'Vila rezidenciale në lagje të mbyllura apo zona elitare.',
    subtypes: ['Vilë moderne', 'Vilë në lagje të mbyllur', 'Vilë malore', 'Vilë me pishinë'],
    features: ['Pishinë', 'Smart Home', 'Siguri 24/7', 'Kopsht i peizazhuar', 'Garazhë e dyfishtë', 'Pamje panoramike', 'E mobiluar me stil'],
    hasRooms: true,
    roomsLabel: 'Numri i dhomave',
    roomOptions: [3, 4, 5, 6, 7, 8],
    hasFloors: true,
    floorLabel: 'Numri i niveleve',
    floors: ['2 Nivele', '3 Nivele', '4 Nivele'],
    conditionLabel: 'Standardi i vilës',
    conditions: [
      { value: 'luksoze', label: 'Premium / Luksoze' },
      { value: 'e-re', label: 'E sapondërtuar' },
      { value: 'e-renovuar', label: 'E dizajnuar me arkitekt' },
    ],
    titlePlaceholder: 'p.sh. Vilë luksoze në Marigona Residence me pishinë',
    descriptionPlaceholder: 'Përshkruani specifikat luksoze, arkitekturën, privatësinë, sigurinë...',
  },
  toke: {
    id: 'toke',
    label: 'Truall / Tokë',
    titleShort: 'Tokë',
    badge: 'Tokë & Truall',
    description: 'Truall për ndërtim, tokë bujqësore ose industriale.',
    subtypes: ['Truall për ndërtim', 'Tokë bujqësore', 'Tokë komerciale/industriale', 'Parcelë me leje ndërtimi'],
    features: ['Rrugë e asfaltuar', 'Rrymë elektrike', 'Ujësjellës', 'Kanalizim', 'Me fletë poseduese', 'Qasje në magjistrale'],
    hasRooms: false,
    hasFloors: false,
    conditionLabel: 'Gjendja e parcelës',
    conditions: [
      { value: 'me-infrastrukture', label: 'Me infrastrukturë të plotë' },
      { value: 'me-leje', label: 'Me leje ndërtimi të miratuar' },
      { value: 'e-rregullt', label: 'Kadastër i pastër' },
    ],
    titlePlaceholder: 'p.sh. Truall 10 Ari me infrastrukturë të plotë në Çagllavicë',
    descriptionPlaceholder: 'Përshkruani pozitën, qasjen në rrugë, infrastrukturën...',
  },
  lokal: {
    id: 'lokal',
    label: 'Lokal / Zyrë',
    titleShort: 'Lokal',
    badge: 'Hapësirë Afariste',
    description: 'Lokal komercial, zyra për kompani ose depo.',
    subtypes: ['Lokal me pamje nga rruga', 'Zyra biznesi', 'Hapësirë e hapur (Open Space)', 'Magazinë / Depo'],
    features: ['Fasada me xham', 'Klimatizim', 'Parkim për klientë', 'Sistem alarmi', 'Qasje për furnizim', 'Tualet privat'],
    hasRooms: false,
    hasFloors: true,
    floorLabel: 'Kati / Pozicioni',
    floors: ['Kati përdhesë', 'Kati 1', 'Kati 2', 'Nëntokë / Bodrum'],
    conditionLabel: 'Gjendja e ambientit',
    conditions: [
      { value: 'e-pergatitur', label: 'I përgatitur për biznes' },
      { value: 'e-re', label: 'Objekt i ri' },
      { value: 'e-renovuar', label: 'I sapo-renovuar' },
    ],
    titlePlaceholder: 'p.sh. Lokal afarist 120m² në rrugë kryesore në Qendër',
    descriptionPlaceholder: 'Përshkruani ekspozimin nga rruga, përshtatshmërinë për aktivitete tregtare apo zyra...',
  },
  garazh: {
    id: 'garazh',
    label: 'Garazhë / Depo',
    titleShort: 'Garazhë',
    badge: 'Garazhë & Depo',
    description: 'Vend parkimi i mbyllur, parking nëntokësor ose hapësirë depoje.',
    subtypes: ['Garazhë e mbyllur', 'Parking nëntokësor', 'Depo personale', 'Vend parkimi i hapur'],
    features: ['Derë me telekomandë', 'Ndriçim automatik', 'Kamera sigurie', 'Ventilim', 'Priza elektrike'],
    hasRooms: false,
    hasFloors: false,
    conditionLabel: 'Gjendja',
    conditions: [
      { value: 'e-sigurt', label: 'E sigurt me hyrje elektronike' },
      { value: 'e-re', label: 'Objekt i ri' },
    ],
    titlePlaceholder: 'p.sh. Vend parkimi nëntokësor në katin -1 në Lakrishtë',
    descriptionPlaceholder: 'Përshkruani qasjen, sigurinë dhe përmasat e hapësirës...',
  },
}
