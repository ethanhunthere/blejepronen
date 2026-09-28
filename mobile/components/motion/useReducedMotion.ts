import { useEffect, useState } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'
import { useReducedMotion as useReanimatedReducedMotion } from 'react-native-reanimated'

/**
 * Single source of truth for "should this component animate?".
 *
 * Three signals are OR-ed together:
 *
 * 1. `react-native-reanimated`'s `useReducedMotion()` — cheap and safe to call
 *    in any component that already uses Reanimated, but it is snapshotted once
 *    at module load, so it never re-renders on a live settings change.
 * 2. `AccessibilityInfo.isReduceMotionEnabled()` + the `reduceMotionChanged`
 *    subscription — the authoritative, *live* native signal on iOS/Android.
 * 3. `matchMedia('(prefers-reduced-motion: reduce)')` — the web equivalent,
 *    because `AccessibilityInfo` reduce-motion is not implemented on
 *    react-native-web.
 *
 * Consumers should treat `true` as "skip the animation, land on the end state
 * immediately". Never use it to hide content: the end state must be the same
 * one the animated path reaches.
 */
export function useReducedMotionEnabled(): boolean {
  const reanimatedReduced = useReanimatedReducedMotion()
  const [systemReduced, setSystemReduced] = useState(false)

  useEffect(() => {
    let isMounted = true

    const apply = (value: boolean) => {
      if (isMounted) setSystemReduced(value)
    }

    // --- Web: matchMedia is the only reliable signal -----------------------
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)')
        apply(query.matches)

        const onChange = (event: MediaQueryListEvent) => apply(event.matches)
        // Safari < 14 only exposes the legacy addListener API.
        if (typeof query.addEventListener === 'function') {
          query.addEventListener('change', onChange)
          return () => {
            isMounted = false
            query.removeEventListener('change', onChange)
          }
        }
        query.addListener?.(onChange)
        return () => {
          isMounted = false
          query.removeListener?.(onChange)
        }
      }

      return () => {
        isMounted = false
      }
    }

    // --- Native: AccessibilityInfo, initial value + live updates -----------
    let subscription: { remove: () => void } | undefined

    AccessibilityInfo.isReduceMotionEnabled()
      .then(apply)
      .catch(() => apply(false))

    try {
      subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', apply)
    } catch {
      subscription = undefined
    }

    return () => {
      isMounted = false
      subscription?.remove()
    }
  }, [])

  return reanimatedReduced || systemReduced
}

export default useReducedMotionEnabled
