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

  // Case 1: Përdoruesi nuk ka shkruar asgjë -> Gjenero përshkrim të plotë profesional
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
• Ndërtim cilësor dhe i mirëorganizuar ${data.floor ? `në ${data.floor}` : ''}
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

    const featuresBlock =
      featuresList.length > 0
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
