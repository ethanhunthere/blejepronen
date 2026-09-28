/**
 * Global scroll-driven collapse for the floating iOS tab bar.
 *
 * One module-level shared value drives the bar's width. Every tab screen
 * attaches `useTabBarCollapseOnScroll()` to its primary vertical scroller;
 * the scroll handler and the resulting springs run as worklets on the
 * native UI thread — no JS-thread hop, no gesture lag, locked 60/120 fps.
 *
 * Interaction model
 * ─────────────────
 * • Scrolling down past a small delta → bar springs into a slimmer pill
 * • Any upward movement (even ~2pt)   → bar springs back to full width
 * • At/above the top (rubber-band)    → always resting width
 * • Switching tabs                    → always resting width
 */

import { makeMutable, useAnimatedScrollHandler, withSpring } from 'react-native-reanimated'

/** 0 = resting full width · 1 = collapsed slim pill (animates on UI thread) */
export const tabBarCollapse = makeMutable(0)

/** Logical state shared across both threads: 0 = expanded · 1 = collapsed.
 *  Guards transitions so springs are triggered exactly once per change. */
const collapseIntent = makeMutable(0)

/** Last scroll offset (per-gesture baseline) — shared so it survives both threads */
const lastScrollY = makeMutable(0)

/** Instant-feeling expansion — reacts to the slightest upward intent */
const EXPAND_SPRING = { damping: 22, stiffness: 320, mass: 0.55 }

/** Restrained, elegant collapse while scrolling down */
const COLLAPSE_SPRING = { damping: 26, stiffness: 230, mass: 0.7 }

/** Don't collapse while the user is still inside the top zone of the list */
const MIN_OFFSET_TO_COLLAPSE = 80
/** Sustained downward delta (pt) required to collapse */
const DOWN_DELTA = 6
/** Any upward delta beyond this noise floor expands the bar immediately */
const UP_DELTA = -3

/** Spring the bar back to its resting width (called on tab switches, etc.) */
export function expandTabBar() {
  if (collapseIntent.value !== 0) {
    collapseIntent.value = 0
    tabBarCollapse.value = withSpring(0, EXPAND_SPRING)
  }
}

export function useTabBarCollapseOnScroll() {
  return useAnimatedScrollHandler({
    // Re-baseline on every fresh touch so cross-screen scroll positions never
    // register as a huge synthetic delta.
    onBeginDrag: (e) => {
      lastScrollY.value = e.contentOffset.y
    },
    onScroll: (e) => {
      const y = e.contentOffset.y
      const dy = y - lastScrollY.value
      lastScrollY.value = y

      // Top zone / rubber-band → resting width
      if (y <= 0) {
        if (collapseIntent.value !== 0) {
          collapseIntent.value = 0
          tabBarCollapse.value = withSpring(0, EXPAND_SPRING)
        }
        return
      }

      // Bottom overscroll rubber-band: hold the current state so the bounce
      // cannot manufacture a collapse→expand flicker cycle on short screens.
      const contentH = e.contentSize.height
      const layoutH = e.layoutMeasurement.height
      if (contentH > 0 && layoutH > 0 && y >= contentH - layoutH - 2) {
        return
      }

      // The instant the user shows upward intent → expand
      if (dy < UP_DELTA) {
        if (collapseIntent.value !== 0) {
          collapseIntent.value = 0
          tabBarCollapse.value = withSpring(0, EXPAND_SPRING)
        }
        return
      }

      // Sustained downward scrolling → slim pill
      if (dy > DOWN_DELTA && y > MIN_OFFSET_TO_COLLAPSE) {
        if (collapseIntent.value !== 1) {
          collapseIntent.value = 1
          tabBarCollapse.value = withSpring(1, COLLAPSE_SPRING)
        }
      }
    },
  })
}
