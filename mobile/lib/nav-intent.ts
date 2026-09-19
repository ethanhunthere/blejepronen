/**
 * Lightweight navigation intents.
 *
 * Why this exists: expo-router/React Navigation reuses an already-mounted
 * screen instance when you push the same route again. In that case the target
 * screen keeps its previous local state (e.g. the "Shpalljet e Mia" filter
 * would stay on "Të Gjitha" instead of switching to "Të Ruajturat").
 *
 * A query param alone is therefore not reliable for in-app navigation. We pass
 * an explicit intent here as well, and the target screen consumes it on focus.
 * Deep links (?filter=saved) are still honoured for cold starts.
 */

export type ShpalljetFilterIntent = 'all' | 'active' | 'sold' | 'inactive' | 'saved'

let pendingShpalljetFilter: ShpalljetFilterIntent | null = null

export function requestShpalljetFilter(filter: ShpalljetFilterIntent): void {
  pendingShpalljetFilter = filter
}

export function consumeShpalljetFilter(): ShpalljetFilterIntent | null {
  const value = pendingShpalljetFilter
  pendingShpalljetFilter = null
  return value
}
