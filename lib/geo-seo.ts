/**
 * Geo and Local SEO Engine for Bleje Pronën.
 * 
 * Provides:
 * 1. Geographic Meta Tag Matrix (geo.region, geo.placename, geo.position, ICBM)
 *    for Kosovo (XK), Albania (AL), and North Macedonia (MK).
 * 2. Multi-Regional Canonical & Hreflang Alternates (sq-XK, sq-AL, sq, en, de-CH, de-DE, x-default).
 * 3. Neighborhood Taxonomies for key metropolitan centers.
 * 4. Semantic Schema.org Structured Data Builders (RealEstateListing, RealEstateAgent, BreadcrumbList).
 * 5. Strict Zero Long Dash and Humanizer compliance.
 */

export const SITE_URL = 'https://blejepronen.com'

export interface CityGeoRecord {
  name: string
  region: 'XK' | 'AL' | 'MK'
  placename: string
  position: string // "latitude;longitude"
  icbm: string     // "latitude, longitude"
  latitude: number
  longitude: number
  countryName: string
}

export const CITY_GEO_MATRIX: Record<string, CityGeoRecord> = {
  // Kosovo (XK)
  'prishtine': {
    name: 'Prishtinë',
    region: 'XK',
    placename: 'Prishtine, Kosove',
    position: '42.6629;21.1655',
    icbm: '42.6629, 21.1655',
    latitude: 42.6629,
    longitude: 21.1655,
    countryName: 'Kosovë',
  },
  'peje': {
    name: 'Pejë',
    region: 'XK',
    placename: 'Peje, Kosove',
    position: '42.6591;20.2883',
    icbm: '42.6591, 20.2883',
    latitude: 42.6591,
    longitude: 20.2883,
    countryName: 'Kosovë',
  },
  'prizren': {
    name: 'Prizren',
    region: 'XK',
    placename: 'Prizren, Kosove',
    position: '42.2153;20.7415',
    icbm: '42.2153, 20.7415',
    latitude: 42.2153,
    longitude: 20.7415,
    countryName: 'Kosovë',
  },
  'fushe-kosove': {
    name: 'Fushë Kosovë',
    region: 'XK',
    placename: 'Fushe Kosove, Kosove',
    position: '42.6344;21.0961',
    icbm: '42.6344, 21.0961',
    latitude: 42.6344,
    longitude: 21.0961,
    countryName: 'Kosovë',
  },
  'ferizaj': {
    name: 'Ferizaj',
    region: 'XK',
    placename: 'Ferizaj, Kosove',
    position: '42.3702;21.1557',
    icbm: '42.3702, 21.1557',
    latitude: 42.3702,
    longitude: 21.1557,
    countryName: 'Kosovë',
  },
  'gjilan': {
    name: 'Gjilan',
    region: 'XK',
    placename: 'Gjilan, Kosove',
    position: '42.4635;21.4694',
    icbm: '42.4635, 21.4694',
    latitude: 42.4635,
    longitude: 21.4694,
    countryName: 'Kosovë',
  },
  'gjakove': {
    name: 'Gjakovë',
    region: 'XK',
    placename: 'Gjakove, Kosove',
    position: '42.3844;20.4285',
    icbm: '42.3844, 20.4285',
    latitude: 42.3844,
    longitude: 20.4285,
    countryName: 'Kosovë',
  },
  'mitrovice': {
    name: 'Mitrovicë',
    region: 'XK',
    placename: 'Mitrovice, Kosove',
    position: '42.8914;20.8660',
    icbm: '42.8914, 20.8660',
    latitude: 42.8914,
    longitude: 20.8660,
    countryName: 'Kosovë',
  },
  'vushtrri': {
    name: 'Vushtrri',
    region: 'XK',
    placename: 'Vushtrri, Kosove',
    position: '42.8236;20.9667',
    icbm: '42.8236, 20.9667',
    latitude: 42.8236,
    longitude: 20.9667,
    countryName: 'Kosovë',
  },
  'podujeve': {
    name: 'Podujevë',
    region: 'XK',
    placename: 'Podujeve, Kosove',
    position: '42.9100;21.1900',
    icbm: '42.9100, 21.1900',
    latitude: 42.9100,
    longitude: 21.1900,
    countryName: 'Kosovë',
  },
  'suhareke': {
    name: 'Suharekë',
    region: 'XK',
    placename: 'Suhareke, Kosove',
    position: '42.3589;20.8250',
    icbm: '42.3589, 20.8250',
    latitude: 42.3589,
    longitude: 20.8250,
    countryName: 'Kosovë',
  },
  'kline': {
    name: 'Klinë',
    region: 'XK',
    placename: 'Kline, Kosove',
    position: '42.6217;20.5778',
    icbm: '42.6217, 20.5778',
    latitude: 42.6217,
    longitude: 20.5778,
    countryName: 'Kosovë',
  },
  'rahovec': {
    name: 'Rahovec',
    region: 'XK',
    placename: 'Rahovec, Kosove',
    position: '42.3994;20.6547',
    icbm: '42.3994, 20.6547',
    latitude: 42.3994,
    longitude: 20.6547,
    countryName: 'Kosovë',
  },
  'decan': {
    name: 'Deçan',
    region: 'XK',
    placename: 'Decan, Kosove',
    position: '42.5403;20.2883',
    icbm: '42.5403, 20.2883',
    latitude: 42.5403,
    longitude: 20.2883,
    countryName: 'Kosovë',
  },

  // Albania (AL)
  'tirane': {
    name: 'Tiranë',
    region: 'AL',
    placename: 'Tirane, Shqiperi',
    position: '41.3275;19.8187',
    icbm: '41.3275, 19.8187',
    latitude: 41.3275,
    longitude: 19.8187,
    countryName: 'Shqipëri',
  },
  'durres': {
    name: 'Durrës',
    region: 'AL',
    placename: 'Durres, Shqiperi',
    position: '41.3230;19.4414',
    icbm: '41.3230, 19.4414',
    latitude: 41.3230,
    longitude: 19.4414,
    countryName: 'Shqipëri',
  },
  'vlore': {
    name: 'Vlorë',
    region: 'AL',
    placename: 'Vlore, Shqiperi',
    position: '40.4659;19.4859',
    icbm: '40.4659, 19.4859',
    latitude: 40.4659,
    longitude: 19.4859,
    countryName: 'Shqipëri',
  },
  'shkoder': {
    name: 'Shkodër',
    region: 'AL',
    placename: 'Shkoder, Shqiperi',
    position: '42.0683;19.5126',
    icbm: '42.0683, 19.5126',
    latitude: 42.0683,
    longitude: 19.5126,
    countryName: 'Shqipëri',
  },
  'sarande': {
    name: 'Sarandë',
    region: 'AL',
    placename: 'Sarande, Shqiperi',
    position: '39.8756;20.0053',
    icbm: '39.8756, 20.0053',
    latitude: 39.8756,
    longitude: 20.0053,
    countryName: 'Shqipëri',
  },

  // North Macedonia (MK)
  'shkup': {
    name: 'Shkup',
    region: 'MK',
    placename: 'Shkup, Maqedoni e Veriut',
    position: '41.9981;21.4254',
    icbm: '41.9981, 21.4254',
    latitude: 41.9981,
    longitude: 21.4254,
    countryName: 'Maqedoni e Veriut',
  },
  'tetove': {
    name: 'Tetovë',
    region: 'MK',
    placename: 'Tetove, Maqedoni e Veriut',
    position: '42.0106;20.9714',
    icbm: '42.0106, 20.9714',
    latitude: 42.0106,
    longitude: 20.9714,
    countryName: 'Maqedoni e Veriut',
  },
  'gostivar': {
    name: 'Gostivar',
    region: 'MK',
    placename: 'Gostivar, Maqedoni e Veriut',
    position: '41.7958;20.9083',
    icbm: '41.7958, 20.9083',
    latitude: 41.7958,
    longitude: 20.9083,
    countryName: 'Maqedoni e Veriut',
  },
}

/**
 * Normalizes city name into a lookup key.
 */
export function normalizeGeoCityKey(rawCity?: string | null): string {
  if (!rawCity) return 'prishtine'
  return rawCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Resolves geo metadata for a given city or falls back to Kosovo central coordinates.
 */
export function getGeoMeta(city?: string | null): Record<string, string> {
  const key = normalizeGeoCityKey(city)
  const entry = CITY_GEO_MATRIX[key] || CITY_GEO_MATRIX['prishtine']

  return {
    'geo.region': entry.region,
    'geo.placename': entry.placename,
    'geo.position': entry.position,
    'ICBM': entry.icbm,
  }
}

/**
 * Generates multi-lingual and multi-regional hreflang alternate links.
 * Strips tracking query parameters (utm_*, gclid, fbclid, session IDs).
 */
export function generateHreflangAlternates(pathname: string) {
  const cleanPath = (pathname || '/').split('?')[0]
  const base = SITE_URL.replace(/\/$/, '')
  const sqUrl = `${base}${cleanPath}`
  const enPath = cleanPath.startsWith('/en') ? cleanPath : `/en${cleanPath === '/' ? '' : cleanPath}`
  const enUrl = `${base}${enPath}`

  return {
    canonical: sqUrl,
    languages: {
      'sq-XK': sqUrl,
      'sq-AL': sqUrl,
      'sq': sqUrl,
      'en': enUrl,
      'de-CH': sqUrl,
      'de-DE': sqUrl,
      'x-default': sqUrl,
    },
  }
}

/**
 * Neighborhood Taxonomies (Lagjet kryesore sipas qyteteve).
 */
export const HIGH_DEMAND_NEIGHBORHOODS: Record<string, string[]> = {
  prishtine: [
    'Dardania',
    'Ulpiana',
    'Mati 1',
    'Bregu i Diellit',
    'Arbëria (Dragodan)',
    'Emshir (Kalabria)',
    'Aktash',
    'Tophane',
    'Taslixhe',
    'Muhaxherët',
    'Veternik',
    'Kodra e Trimave',
    'Vellusha',
    'Pejton',
    'Qendra',
  ],
  tirane: [
    'Blloku',
    'Komuna e Parisit',
    'Astir',
    'Don Bosko',
    'Laprakë',
    'Ali Demi',
    'Sauk',
    'Liqeni Artificial',
    'Fresku',
    'Kombinat',
    '21 Dhjetori',
    'Selitë',
  ],
  peje: [
    'Qendra',
    'Asllan Çeshme',
    'Fidanishte',
    'Karagaq',
    'Jarinë',
    'Zatra',
    'Kapeshnica',
  ],
  prizren: [
    'Shadërvan',
    'Ortakoll',
    'Kurillë',
    'Bazhdarhanë',
    'Arbana',
    'Jeni Mahalle',
  ],
}

/**
 * Clean plain text helper: strips HTML tags, escapes, and artificial markers.
 */
export function sanitizePlainText(text?: string | null): string {
  if (!text) return ''
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u2014\u2015\u2012]/g, ' | ')
    .replace(/[\u2013]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Determines physical Schema.org property type from category / apartment_type.
 */
export function getSchemaPropertyType(apartmentType?: string | null, type?: string | null): string {
  const norm = (apartmentType || '').toLowerCase()
  if (norm.includes('shtepi') || norm.includes('shtëpi') || norm.includes('vile') || norm.includes('vilë')) {
    return 'SingleFamilyResidence'
  }
  if (norm.includes('lokal') || norm.includes('zyre') || norm.includes('biznes') || norm.includes('depo')) {
    return 'CommercialProperty'
  }
  return 'Apartment'
}

/**
 * Maps property features into Schema.org LocationFeatureSpecification items.
 */
export function mapAmenityFeatures(features?: string[] | null) {
  if (!features || !Array.isArray(features)) return []
  const featureMap: Record<string, string> = {
    ashensor: 'Ashensor funksional',
    ngrohje: 'Nxemje qendrore',
    parking: 'Garazh / Vendparkim',
    ballkon: 'Ballkon / Terasë',
    siguri: 'Siguri dhe kamera',
    mobiluar: 'E mobiluar tërësisht',
    kondicioner: 'Kondicioner',
    dokumentacion: 'Me fletë poseduese / Kontratë te noteri',
  }

  return features.map((f) => {
    const key = f.toLowerCase().replace(/ë/g, 'e').replace(/ç/g, 'c').replace(/\s+/g, '')
    const name = featureMap[key] || f
    return {
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    }
  })
}

/**
 * Platform Schema: RealEstateAgent & Organization.
 */
export function buildPlatformSchema() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      '@id': `${SITE_URL}/#organization`,
      name: 'Bleje Pronën',
      url: SITE_URL,
      logo: `${SITE_URL}/logo-white.png`,
      description: 'Platforma kryesore shqipfolëse për blerje, shitje dhe qira pronash direkt nga pronarët.',
      areaServed: ['Kosovë', 'Shqipëri', 'Maqedoni e Veriut'],
      currenciesAccepted: 'EUR',
      priceRange: '€€',
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'blejepronen@gmail.com',
        contactType: 'customer support',
        availableLanguage: ['sq', 'en'],
      },
      sameAs: [
        'https://facebook.com/blejepronen',
        'https://instagram.com/blejepronen',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Bleje Pronën',
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/listings?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ]
}

export interface ListingSchemaInput {
  id: string
  title: string
  description?: string | null
  price?: number | null
  city: string
  neighborhood?: string | null
  address?: string | null
  type?: 'shitje' | 'qira' | string | null
  apartment_type?: string | null
  rooms?: number | null
  area_m2?: number | null
  floor?: string | null
  features?: string[] | null
  images?: string[] | null
  is_active?: boolean | null
  created_at: string
  updated_at?: string | null
  latitude?: number | null
  longitude?: number | null
  seller?: {
    first_name?: string | null
    last_name?: string | null
    isCompany?: boolean
    user_id?: string | null
  } | null
}

/**
 * Builds complete dual-entity RealEstateListing + Property schema with Breadcrumbs.
 */
export function buildListingSchema(listing: ListingSchemaInput) {
  const propertyType = getSchemaPropertyType(listing.apartment_type, listing.type)
  const geoKey = normalizeGeoCityKey(listing.city)
  const defaultGeo = CITY_GEO_MATRIX[geoKey] || CITY_GEO_MATRIX['prishtine']

  const lat = typeof listing.latitude === 'number' ? listing.latitude : defaultGeo.latitude
  const lng = typeof listing.longitude === 'number' ? listing.longitude : defaultGeo.longitude

  const cleanTitle = sanitizePlainText(listing.title)
  const cleanDesc = sanitizePlainText(listing.description) || `${cleanTitle} në ${listing.city}. Shiko çmimin dhe kontakto direkt.`
  const canonicalUrl = `${SITE_URL}/listings/${listing.id}`

  const numericPrice = listing.price && listing.price > 0 ? String(Math.round(listing.price)) : '0'

  const amenities = mapAmenityFeatures(listing.features)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'RealEstateListing',
        '@id': `${canonicalUrl}#listing`,
        name: cleanTitle,
        description: cleanDesc,
        url: canonicalUrl,
        image: listing.images?.[0] || `${SITE_URL}/og-image.png`,
        datePosted: listing.created_at,
        dateModified: listing.updated_at || listing.created_at,
        validFrom: listing.created_at,
        price: numericPrice,
        priceCurrency: 'EUR',
        availability: listing.is_active !== false ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
        offers: {
          '@type': 'Offer',
          price: numericPrice,
          priceCurrency: 'EUR',
          availability: listing.is_active !== false ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
          url: canonicalUrl,
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: listing.city,
          addressRegion: listing.neighborhood || defaultGeo.countryName,
          addressCountry: defaultGeo.region,
          streetAddress: listing.address || listing.city,
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: lat,
          longitude: lng,
        },
        about: {
          '@type': propertyType,
          name: cleanTitle,
          floorSize: {
            '@type': 'QuantitativeValue',
            value: listing.area_m2 || 0,
            unitCode: 'MTK',
          },
          numberOfRooms: listing.rooms || 1,
          numberOfBedrooms: listing.rooms ? Math.max(1, listing.rooms - 1) : 1,
          numberOfBathroomsTotal: 1,
          floorLevel: listing.floor ? `Kati ${listing.floor}` : undefined,
          amenityFeature: amenities.length > 0 ? amenities : undefined,
          address: {
            '@type': 'PostalAddress',
            addressLocality: listing.city,
            addressRegion: listing.neighborhood || defaultGeo.countryName,
            addressCountry: defaultGeo.region,
            streetAddress: listing.address || listing.city,
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: lat,
            longitude: lng,
          },
        },
        ...(listing.seller?.first_name
          ? {
              broker: {
                '@type': listing.seller.isCompany ? 'RealEstateAgent' : 'Person',
                name: [listing.seller.first_name, listing.seller.last_name].filter(Boolean).join(' '),
                url: listing.seller.user_id ? `${SITE_URL}/profili/${listing.seller.user_id}` : undefined,
              },
            }
          : {}),
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          name: 'Bleje Pronën',
          url: SITE_URL,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Ballina',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: listing.city,
            item: `${SITE_URL}/pronat/${normalizeGeoCityKey(listing.city)}/${listing.type === 'qira' ? 'qira' : 'shitje'}`,
          },
          ...(listing.neighborhood
            ? [
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: listing.neighborhood,
                  item: `${SITE_URL}/pronat/${normalizeGeoCityKey(listing.city)}/${listing.type === 'qira' ? 'qira' : 'shitje'}/${normalizeGeoCityKey(listing.neighborhood)}`,
                },
                {
                  '@type': 'ListItem',
                  position: 4,
                  name: cleanTitle,
                  item: canonicalUrl,
                },
              ]
            : [
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: cleanTitle,
                  item: canonicalUrl,
                },
              ]),
        ],
      },
    ],
  }
}
