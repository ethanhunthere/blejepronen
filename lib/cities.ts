import {
  ALL_CITIES,
  MAJOR_CITIES,
  POPULAR_CITIES,
  KOSOVO_LOCATIONS,
  normalizeCity,
  getNeighborhoods,
  isOfficialKosovoCity,
  type KosovoCity,
} from './kosovo-locations'

/**
 * Complete list of all 38 official municipalities in Kosovo, sorted alphabetically (A-Z).
 */
export const CITIES: string[] = ALL_CITIES

export {
  ALL_CITIES,
  MAJOR_CITIES,
  POPULAR_CITIES,
  KOSOVO_LOCATIONS,
  normalizeCity,
  getNeighborhoods,
  isOfficialKosovoCity,
}

export type City = KosovoCity
