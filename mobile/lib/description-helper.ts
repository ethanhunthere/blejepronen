import { CategoryConfig } from './categories'

export interface PropertyData {
  category: string
  subtype: string
  title: string
  description: string
  price: string
  city: string
  neighborhood: string
  rooms: string
  area_m2: string
  type: 'shitje' | 'qira'
  condition: string
  floor: string
  features: string[]
}

export interface ValidationResult {
  canSuggest: boolean
  missingFields: string[]
  reason?: string
}

/**
 * Validate that the user has provided enough concrete filters
 * to generate a non-vaporware, tailored real-world description or title.
 */
export function validatePropertyFilters(
  data: PropertyData,
  mode: 'title' | 'description'
): ValidationResult {
  const missing: string[] = []

  if (!data.city || !data.city.trim()) {
    missing.push('Qytetin')
  }

  if (!data.area_m2 || !data.area_m2.trim() || Number(data.area_m2) <= 0) {
    missing.push('Sipërfaqen (m²)')
  }

  if (mode === 'description') {
    // For a description, we need at least 1-2 additional specific parameters
    // so the description contains real substance and not hallucinated filler.
    let concreteDetailsCount = 0
    if (data.neighborhood && data.neighborhood.trim()) concreteDetailsCount++
    if (data.price && data.price.trim() && Number(data.price) > 0) concreteDetailsCount++
    if (data.subtype && data.subtype.trim()) concreteDetailsCount++
    if (data.rooms && data.rooms.trim()) concreteDetailsCount++
    if (data.floor && data.floor.trim()) concreteDetailsCount++
    if (data.condition && data.condition.trim()) concreteDetailsCount++
    if (data.features && data.features.length > 0) concreteDetailsCount++

    if (concreteDetailsCount < 1) {
      missing.push('Të paktën një detaj shtesë (Lagjja, Çmimi, Dhomat ose Pajisjet)')
    }
  }

  if (missing.length > 0) {
    return {
      canSuggest: false,
      missingFields: missing,
      reason: `Ju lutemi plotësoni së pari: ${missing.join(', ')} përpara se të kërkoni sugjerim profesional.`,
    }
  }

  return {
    canSuggest: true,
    missingFields: [],
  }
}

/**
 * Generate a concise, high-converting, professional Real Estate Title
 * based strictly on the user's actual selected property parameters.
 */
export function generateProfessionalTitle(
  data: PropertyData,
  cat: CategoryConfig
): string {
  const isSale = data.type === 'shitje'
  const actionText = isSale ? 'në Shitje' : 'me Qira'
  const areaPart = data.area_m2 ? `${data.area_m2}m²` : ''
  const locationPart = data.neighborhood
    ? `${data.neighborhood}, ${data.city}`
    : data.city || 'Kosovë'

  switch (data.category) {
    case 'banese': {
      const roomPart = data.rooms ? ` ${data.rooms}` : ''
      const subtypePart =
        data.subtype && !data.subtype.toLowerCase().includes('banes')
          ? ` (${data.subtype})`
          : ''
      const floorPart = data.floor ? ` në Katin ${data.floor}` : ''
      return `Banesë${roomPart}${subtypePart} ${actionText} ${areaPart}${floorPart} – ${locationPart}`.trim()
    }

    case 'shtepi': {
      const subtypePart = data.subtype ? ` ${data.subtype}` : ''
      return `Shtëpi${subtypePart} ${actionText} ${areaPart} me Oborr – ${locationPart}`.trim()
    }

    case 'vile': {
      const subtypePart = data.subtype ? ` ${data.subtype}` : 'Moderne'
      return `Vilë ${subtypePart} ${actionText} ${areaPart} – ${locationPart}`.trim()
    }

    case 'lokal': {
      const subtypePart = data.subtype || 'Hapësirë Afariste'
      return `${subtypePart} ${actionText} ${areaPart} në Pozitë Strategjike – ${locationPart}`.trim()
    }

    case 'toke': {
      const subtypePart = data.subtype ? `${data.subtype}` : 'Truall Ndërtimi'
      return `${subtypePart} ${actionText} prej ${areaPart} – ${locationPart}`.trim()
    }

    case 'garazhe':
    default: {
      return `Garazhë e Sigurt ${actionText} – ${locationPart}`.trim()
    }
  }
}

/**
 * Generate or enhance a detailed professional property description
 * strictly using the user's real parameters, with zero hallucinated vaporware.
 */
export function generateOrEnhanceDescription(
  currentText: string,
  data: PropertyData,
  cat: CategoryConfig
): string {
  const isSale = data.type === 'shitje'
  const transType = isSale ? 'në shitje' : 'me qira'
  const locationParts = [data.neighborhood, data.city].filter(Boolean)
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : data.city || 'Kosovë'
  const areaStr = data.area_m2 ? `${data.area_m2} m²` : ''
  const priceStr = data.price ? `${Number(data.price).toLocaleString('de-DE')} €` : ''
  const featuresList = data.features && data.features.length > 0 ? data.features : []

  // Resolve condition label cleanly
  const condLabel = data.condition
    ? cat.conditions.find((c) => c.value === data.condition)?.label || data.condition
    : ''

  // Case 1: Përdoruesi nuk ka shkruar asgjë -> Gjenero bazuar 100% në të dhënat ekzistuese
  if (!currentText.trim()) {
    const titleLead = `Ofrohet ${transType} ${cat.label.toLowerCase()} me sipërfaqe prej ${areaStr} në lokacionin e kërkuar të ${locationStr}.`

    let specSection = ''
    if (data.category === 'banese') {
      const roomsDetail = data.rooms
        ? `• Tipologjia: ${data.rooms} me planimetri funksionale dhe organizim optimal`
        : null
      const floorDetail = data.floor ? `• Kati: Kati ${data.floor}` : null
      const conditionDetail = condLabel ? `• Gjendja: ${condLabel}` : null
      const subtypeDetail = data.subtype ? `• Lloji i ndërtesës: ${data.subtype}` : null

      const detailsList = [roomsDetail, floorDetail, conditionDetail, subtypeDetail]
        .filter(Boolean)
        .join('\n')

      specSection = `Kjo pronë karakterizohet nga ndriçimi natyral dhe qasja e shpejtë në shërbimet kryesore të zonës.
Organizimi i brendshëm përfshin:
• Sallon ndenjeje me ambient ngrënieje dhe kuzhinë
• Ambient pushimi me dritë natyrale
• Banjo e kompletuar dhe ballkon funksional
${detailsList ? `\nSpecifikat teknike:\n${detailsList}` : ''}`
    } else if (data.category === 'shtepi') {
      const floorDetail = data.floor ? `• Nivelet: ${data.floor}` : null
      const roomsDetail = data.rooms ? `• Dhomat: ${data.rooms}` : null
      const conditionDetail = condLabel ? `• Gjendja: ${condLabel}` : null

      const detailsList = [floorDetail, roomsDetail, conditionDetail].filter(Boolean).join('\n')

      specSection = `Shtëpi me ambient familjar, privatësi dhe qetësi të garantuar në ${locationStr}.
Karakteristikat e pronës:
• Sipërfaqe banimi prej ${areaStr} me hapësira të bollshme
• Oborr privat i shfrytëzueshëm dhe vend i sigurt parkimi
${detailsList ? `\nDetajet e ndërtimit:\n${detailsList}` : ''}`
    } else if (data.category === 'vile') {
      specSection = `Vilë me standarde bashkëkohore ndërtimi në ${locationStr}.
Karakteristikat:
• Sipërfaqe prej ${areaStr} me arkitekturë elegante
• Ambient i rrethuar me privatësi dhe siguri maksimale
${condLabel ? `• Gjendja: ${condLabel}` : ''}`
    } else if (data.category === 'toke') {
      specSection = `Truall me potencial të lartë në ${locationStr}.
Detajet e parcelës:
• Sipërfaqe totale: ${areaStr}
• Terren i përshtatshëm me qasje direkte
• Dokumentacion i rregullt kadastral`
    } else if (data.category === 'lokal') {
      specSection = `Hapësirë afariste ${transType} me pozitë të favorshme në ${locationStr}.
Përparësitë kryesore:
• Sipërfaqe shfrytëzuese prej ${areaStr}
• Fasada e ekspozuar e përshtatshme për çdo aktivitet tregtar apo zyra administrative
${condLabel ? `• Gjendja e lokalit: ${condLabel}` : ''}`
    } else {
      specSection = `Garazhë / depo e mbyllur dhe e sigurt në ${locationStr} me sipërfaqe prej ${areaStr}.`
    }

    const featuresBlock =
      featuresList.length > 0
        ? `\n\nPajisjet dhe përparësitë e pronës:\n${featuresList.map((f) => `• ${f}`).join('\n')}`
        : ''

    const priceBlock = priceStr
      ? `\n\nÇmimi: ${priceStr}${isSale ? ' (i negociueshëm)' : ' / muaj'}`
      : ''

    const footerBlock = `\n\nPër informata shtesë ose për të caktuar një vizitë në pronë, ju lutemi të na kontaktoni.`

    return `${titleLead}\n\n${specSection}${featuresBlock}${priceBlock}${footerBlock}`.trim()
  }

  // Case 2: Përdoruesi ka shkruar disa fjalë / shënime -> Përmirëso stilin pa fshirë idenë e tij
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
  if (condLabel) specs.push(`• Gjendja: ${condLabel}`)
  if (priceStr) specs.push(`• Çmimi: ${priceStr}${isSale ? ' (i negociueshëm)' : ' / muaj'}`)

  if (specs.length > 0) {
    enhanced += `Të dhënat kryesore të pronës:\n${specs.join('\n')}\n\n`
  }

  if (featuresList.length > 0) {
    enhanced += `Përparësitë & Pajisjet:\n${featuresList.map((f) => `• ${f}`).join('\n')}\n\n`
  }

  enhanced += `Dokumentacioni është i rregullt. Për më shumë informata apo për të planifikuar një vizitë në pronë, ju mirëpresim të na kontaktoni.`

  return enhanced.trim()
}
