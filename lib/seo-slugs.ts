import { ALL_CITIES } from '@/lib/kosovo-locations'

export const SITE_URL = 'https://blejepronen.com'

/** URL-safe ASCII slug (NFD strip handles ë/ç for Albanian toponyms). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const cityBySlug = new Map<string, string>(ALL_CITIES.map((c) => [slugify(c), c]))

export function cityFromSlug(slug: string): string | null {
  return cityBySlug.get(slug) ?? null
}

export function hoodFromSlug(slug: string): string {
  // Neighborhoods are free-text in the DB; the slug is a lossy projection, so
  // hubs match with ilike on the de-slugged readable form.
  return slug.replace(/-/g, ' ')
}

export type HubType = 'shitje' | 'qira'

export const TYPE_META: Record<
  HubType,
  {
    sq: { noun: string; phrase: string; category: string }
    en: { noun: string; phrase: string; category: string }
  }
> = {
  shitje: {
    sq: { noun: 'shitje', phrase: 'për shitje', category: 'Banesa & prona për shitje' },
    en: { noun: 'sale', phrase: 'for sale', category: 'Properties for sale' },
  },
  qira: {
    sq: { noun: 'qira', phrase: 'me qira', category: 'Banesa & prona me qira' },
    en: { noun: 'rent', phrase: 'for rent', category: 'Properties for rent' },
  },
}

export const fmtInt = (n: number) => new Intl.NumberFormat('de-DE').format(n)
export const fmtPrice = (n: number) => `${fmtInt(n)} €`

export function hubPathSq(city: string, type: HubType, hood?: string): string {
  const base = `/pronat/${slugify(city)}/${type}`
  return hood ? `${base}/${slugify(hood)}` : base
}

export function hubPathEn(city: string, type: HubType, hood?: string): string {
  const base = `/en/property/${slugify(city)}/${type}`
  return hood ? `${base}/${slugify(hood)}` : base
}

export function marketPathSq(city?: string): string {
  return city ? `/tregu/${slugify(city)}` : '/tregu'
}

export function marketPathEn(city?: string): string {
  return city ? `/en/market/${slugify(city)}` : '/en/market'
}

interface HubCopyInput {
  city: string
  type: HubType
  hood?: string
  total: number
  medianPpm2: number | null
}

export function hubTitleSq({ city, type, hood, total }: HubCopyInput): string {
  const t = TYPE_META[type].sq
  const where = hood ? `${hood}, ${city}` : city
  return total > 0
    ? `${t.category} në ${where} — ${total} shpallje aktive | Bleje Pronën`
    : `${t.category} në ${where} | Bleje Pronën`
}

export function hubDescriptionSq({ city, type, hood, total, medianPpm2 }: HubCopyInput): string {
  const t = TYPE_META[type].sq
  const where = hood ? `${hood} të ${city}` : city
  const median = medianPpm2 ? ` Mesatarja e tregut: ${fmtPrice(medianPpm2)}/m².` : ''
  return `${total} pronë aktive ${t.phrase} në ${where}.${median} Foto reale, çmime të verifikuara dhe kontakt direkt me pronarin ose agjencinë në Bleje Pronën.`
}

export function hubTitleEn({ city, type, hood, total }: HubCopyInput): string {
  const t = TYPE_META[type].en
  const where = hood ? `${hood}, ${city}` : city
  return `${t.category} in ${where}, Kosovo — ${total} active listings | Bleje Pronën`
}

export function hubDescriptionEn({ city, type, hood, total, medianPpm2 }: HubCopyInput): string {
  const t = TYPE_META[type].en
  const where = hood ? `${hood} in ${city}` : city
  const median = medianPpm2 ? ` Market average: €${fmtInt(medianPpm2)}/m².` : ''
  return `${total} active properties ${t.phrase} in ${where}, Kosovo.${median} Real photos, transparent pricing and direct owner or agency contact on Bleje Pronën.`
}
