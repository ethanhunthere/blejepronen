import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image, type ImageLoadEventData } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Camera, Share2, X } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import Animated, {
  clamp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type DerivedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { Fonts } from '@/constants/theme'
import {
  lightboxImageSource,
  thumbImageSource,
  type ImageSourceish,
} from '@/lib/image-transform'

/* ────────────────────────────────────────────────────────────────────────────
 * Gesture runtime probe
 * ────────────────────────────────────────────────────────────────────────────
 * `react-native-gesture-handler` is installed in node_modules (npm resolves it
 * as an optional peer of expo-router / react-native-screens) but it is *not* a
 * declared dependency of the mobile app, so a freshly prebuilt native project
 * may not autolink its native module. RNGH calls
 * `TurboModuleRegistry.getEnforcing('RNGestureHandlerModule')` while its index
 * module is evaluated, which throws when the native side is absent — a static
 * import would therefore take the whole detail screen down.
 *
 * So we require it defensively, once, and cache the result. When the runtime is
 * available we get the full UI-thread viewer (pinch, double-tap, pan, swipe,
 * swipe-down-to-dismiss). When it is not, we fall back to a native paging
 * ScrollView so photos stay browsable instead of crashing.
 *
 * To permanently enable the gesture path in standalone builds, add
 * `react-native-gesture-handler` to `mobile/package.json` dependencies and
 * re-run prebuild.
 */
type RNGHModule = typeof import('react-native-gesture-handler')

let probedRNGH: RNGHModule | null | undefined

function resolveRNGH(): RNGHModule | null {
  if (probedRNGH !== undefined) return probedRNGH
  try {
    const mod = require('react-native-gesture-handler') as RNGHModule | null
    probedRNGH =
      mod &&
      typeof mod.Gesture?.Pan === 'function' &&
      typeof mod.Gesture?.Pinch === 'function' &&
      typeof mod.Gesture?.Tap === 'function' &&
      mod.GestureDetector != null &&
      mod.GestureHandlerRootView != null
        ? mod
        : null
  } catch {
    probedRNGH = null
  }
  return probedRNGH
}

/* ── Tuning constants ─────────────────────────────────────────────────────── */
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.4
const ZOOM_EPSILON = 1.02
/** px of downward drag before release commits a dismiss. */
const DISMISS_DISTANCE = 110
/** px/s of downward velocity that dismisses regardless of distance. */
const DISMISS_VELOCITY = 800
/** Fraction of the viewport a horizontal fling must cover to change photo. */
const PAGE_THRESHOLD_RATIO = 0.22
/** Rubber-band factor when dragging past the first/last photo. */
const EDGE_DAMPING = 0.32
/** Overshoot allowed while dragging a zoomed photo past its bounds. */
const FOCUS_OVERSCROLL = 0.28

const PAGER_SPRING = { damping: 30, stiffness: 280, mass: 0.75 }
const ZOOM_SPRING = { damping: 24, stiffness: 240, mass: 0.65 }

function clampIndex(index: number, count: number): number {
  'worklet'
  if (count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.round(index)))
}

/** Contain-fit size of an intrinsic image inside the viewport (worklet-safe). */
function fittedSize(iw: number, ih: number, viewW: number, viewH: number) {
  'worklet'
  if (iw <= 0 || ih <= 0) return { w: viewW, h: viewH }
  const s = Math.min(viewW / iw, viewH / ih)
  return { w: iw * s, h: ih * s }
}

/** Largest pan offset that keeps the scaled image covering the viewport axis. */
function maxOffset(fitted: number, viewport: number, scale: number) {
  'worklet'
  return Math.max(0, (fitted * scale - viewport) / 2)
}

/** Clamp with a damped overshoot so drags past the bounds feel rubbery. */
function rubberClamp(value: number, limit: number) {
  'worklet'
  if (limit <= 0) return value * FOCUS_OVERSCROLL
  if (value > limit) return limit + (value - limit) * FOCUS_OVERSCROLL
  if (value < -limit) return -limit + (value + limit) * FOCUS_OVERSCROLL
  return value
}

function selectionHaptic() {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {})
  }
}

export interface MediaLightboxProps {
  /** Photo sources — remote URLs or bundled `require()` ids. */
  images: ImageSourceish[]
  visible: boolean
  initialIndex?: number
  /** Used for accessibility labels ("Foto 1 nga 4 — <title>"). */
  title?: string
  onClose: () => void
  /** Fired whenever the focused photo changes (keeps hero dots in sync). */
  onIndexChange?: (index: number) => void
  onShare?: () => void
}

/**
 * Fullscreen photo viewer.
 *
 * Interaction model (all on the UI thread via Reanimated + gesture-handler):
 *  • horizontal drag / fling → previous / next photo (rubber-banded at the ends)
 *  • vertical drag down → dismiss (backdrop fades with the drag)
 *  • pinch → zoom 1×–4×, anchored under the focal point
 *  • double-tap → zoom 2.4× centred on the tap point, second double-tap → 1×
 *  • single-finger drag while zoomed → pan inside the image bounds
 *  • single tap → hide / show the chrome (header, counter, thumbnails)
 *  • thumbnail tap → animated jump to that photo
 */
export function MediaLightbox({
  images,
  visible,
  initialIndex = 0,
  title,
  onClose,
  onIndexChange,
  onShare,
}: MediaLightboxProps) {
  const rngh = useMemo(resolveRNGH, [])
  const count = images.length

  return (
    <Modal
      visible={visible && count > 0}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <StatusBar barStyle="light-content" />
      {rngh ? (
        <GestureViewer
          rngh={rngh}
          images={images}
          initialIndex={initialIndex}
          title={title}
          onClose={onClose}
          onIndexChange={onIndexChange}
          onShare={onShare}
        />
      ) : (
        <StaticViewer
          images={images}
          initialIndex={initialIndex}
          title={title}
          onClose={onClose}
          onIndexChange={onIndexChange}
          onShare={onShare}
        />
      )}
    </Modal>
  )
}

interface ViewerProps {
  images: ImageSourceish[]
  initialIndex: number
  title?: string
  onClose: () => void
  onIndexChange?: (index: number) => void
  onShare?: () => void
}

/* ────────────────────────────────────────────────────────────────────────────
 * Shared chrome (header, counter, thumbnail strip) — driven by one opacity
 * shared value so both viewers animate it identically.
 * ────────────────────────────────────────────────────────────────────────── */
interface ChromeProps {
  thumbs: ImageSourceish[]
  index: number
  title?: string
  zoomCapable: boolean
  opacity: SharedValue<number> | DerivedValue<number>
  onClose: () => void
  onShare?: () => void
  onSelect: (index: number) => void
}

function LightboxChrome({
  thumbs,
  index,
  title,
  zoomCapable,
  opacity,
  onClose,
  onShare,
  onSelect,
}: ChromeProps) {
  const insets = useSafeAreaInsets()
  const stripRef = useRef<ScrollView>(null)
  const total = thumbs.length

  const chromeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  // Keep the selected thumbnail in view without fighting the user's scroll.
  useEffect(() => {
    if (total <= 1) return
    const x = Math.max(0, index * 70 - 120)
    stripRef.current?.scrollTo({ x, animated: true })
  }, [index, total])

  const counterLabel = `Foto ${index + 1} nga ${total}${title ? ` — ${title}` : ''}`

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, chromeStyle]}
      pointerEvents="box-none"
      accessibilityLabel={counterLabel}
    >
      {/* Header */}
      <View style={[styles.chromeHeader, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.62)', 'rgba(0, 0, 0, 0)']}
          style={styles.chromeGradient}
          pointerEvents="none"
        />
        <Pressable
          hitSlop={10}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Mbyll galerinë"
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        >
          <X size={21} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>

        <View style={styles.counterBadge} pointerEvents="none">
          <Camera size={12} color="rgba(255,255,255,0.85)" strokeWidth={2.2} />
          <Text style={styles.counterText}>
            {index + 1} / {total}
          </Text>
        </View>

        {onShare ? (
          <Pressable
            hitSlop={10}
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel="Shpërndaj pronën"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <Share2 size={18} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      {/* Footer: hint + thumbnails */}
      <View
        style={[styles.chromeFooter, { paddingBottom: Math.max(insets.bottom, 14) }]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.72)']}
          style={styles.chromeGradient}
          pointerEvents="none"
        />
        {zoomCapable ? (
          <Text style={styles.hintText} numberOfLines={1}>
            Prek dy herë ose zmadho me dy gishta · Rrëshqit poshtë për ta mbyllur
          </Text>
        ) : (
          <Text style={styles.hintText} numberOfLines={1}>
            Rrëshqit majtas–djathtas për të ndërruar foton · Poshtë për ta mbyllur
          </Text>
        )}

        {total > 1 && (
          <ScrollView
            ref={stripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbStripContent}
          >
            {thumbs.map((src, i) => {
              const selected = i === index
              return (
                <Pressable
                  key={`thumb-${i}`}
                  onPress={() => onSelect(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Shko te foto ${i + 1}`}
                  style={[styles.thumbItem, selected && styles.thumbItemSelected]}
                >
                  <Image
                    source={src}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={120}
                    accessibilityLabel={`Foto ${i + 1} nga ${total}`}
                  />
                </Pressable>
              )
            })}
          </ScrollView>
        )}
      </View>
    </Animated.View>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * Gesture viewer — the real thing.
 * ────────────────────────────────────────────────────────────────────────── */
function GestureViewer({
  rngh,
  images,
  initialIndex,
  title,
  onClose,
  onIndexChange,
  onShare,
}: ViewerProps & { rngh: RNGHModule }) {
  const { width: W, height: H } = useWindowDimensions()
  const count = images.length

  const [index, setIndex] = useState(() => clampIndex(initialIndex, count))
  const indexRef = useRef(index)

  // Pager / dismiss
  const indexShared = useSharedValue(clampIndex(initialIndex, count))
  const dragX = useSharedValue(0)
  const dragY = useSharedValue(0)
  // Zoom state (applies to the focused photo; reset on page commit)
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const focusX = useSharedValue(0)
  const focusY = useSharedValue(0)
  const savedFocusX = useSharedValue(0)
  const savedFocusY = useSharedValue(0)
  const focalX = useSharedValue(0)
  const focalY = useSharedValue(0)
  // Intrinsic size of the focused photo, used to compute true pan bounds for
  // a contain-fitted image (letterboxed photos must not pan into empty space).
  const intrinsicW = useSharedValue(0)
  const intrinsicH = useSharedValue(0)
  const chromeToggle = useSharedValue(1)
  const appear = useSharedValue(0)

  const fullSources = useMemo(() => images.map((src) => lightboxImageSource(src)), [images])
  const thumbSources = useMemo(() => images.map((src) => thumbImageSource(src)), [images])
  const intrinsic = useRef<{ w: number; h: number }[]>([])

  const applyIntrinsic = useCallback(
    (i: number) => {
      const rec = intrinsic.current[i]
      if (!rec) return
      intrinsicW.value = rec.w
      intrinsicH.value = rec.h
    },
    [intrinsicH, intrinsicW]
  )

  const commitIndex = useCallback(
    (next: number) => {
      const safe = clampIndex(next, count)
      indexRef.current = safe
      setIndex(safe)
      applyIntrinsic(safe)
      selectionHaptic()
      onIndexChange?.(safe)
    },
    [applyIntrinsic, count, onIndexChange]
  )

  const commitIndexRemote = useMemo(() => runOnJS(commitIndex), [commitIndex])
  const closeRemote = useMemo(() => runOnJS(onClose), [onClose])
  const hapticRemote = useMemo(() => runOnJS(selectionHaptic), [])

  // Fade the viewer in on mount — the Modal window itself only fades the
  // window, this gives the photo a subtle settle.
  useEffect(() => {
    appear.value = withTiming(1, { duration: 220 })
    applyIntrinsic(indexRef.current)
  }, [appear, applyIntrinsic])

  /**
   * Animate the strip to `target` and, once it lands, re-index it and zero the
   * drag in the same worklet frame so the eye never sees a jump.
   */
  const settlePager = useCallback(
    (target: number) => {
      'worklet'
      const safe = clampIndex(target, count)
      const delta = (safe - indexShared.value) * W
      if (delta === 0) {
        dragX.value = withSpring(0, PAGER_SPRING)
        return
      }
      dragX.value = withSpring(delta, PAGER_SPRING, (finished) => {
        if (!finished) return
        indexShared.value = safe
        dragX.value = 0
        // The newly focused photo always starts unzoomed.
        scale.value = 1
        savedScale.value = 1
        focusX.value = 0
        focusY.value = 0
        savedFocusX.value = 0
        savedFocusY.value = 0
        commitIndexRemote(safe)
      })
    },
    [W, commitIndexRemote, count, dragX, focusX, focusY, indexShared, savedFocusX, savedFocusY, savedScale, scale]
  )

  const pan = useMemo(
    () =>
      rngh.Gesture.Pan()
        .averageTouches(true)
        .minPointers(1)
        .maxPointers(1)
        .minDistance(4)
        .onBegin(() => {
          'worklet'
          savedScale.value = scale.value
          savedFocusX.value = focusX.value
          savedFocusY.value = focusY.value
        })
        .onUpdate((e) => {
          'worklet'
          if (scale.value > ZOOM_EPSILON) {
            // Zoomed: pan inside the image, never move the pager.
            const fit = fittedSize(intrinsicW.value, intrinsicH.value, W, H)
            const mx = maxOffset(fit.w, W, scale.value)
            const my = maxOffset(fit.h, H, scale.value)
            focusX.value = rubberClamp(savedFocusX.value + e.translationX, mx)
            focusY.value = rubberClamp(savedFocusY.value + e.translationY, my)
            return
          }
          const atStart = indexShared.value <= 0
          const atEnd = indexShared.value >= count - 1
          let dx = e.translationX
          if ((atStart && dx > 0) || (atEnd && dx < 0)) dx *= EDGE_DAMPING
          dragX.value = dx
          // Downward drag dismisses; upward is heavily damped (no pull-to-refresh feel).
          dragY.value = e.translationY > 0 ? e.translationY : e.translationY * EDGE_DAMPING
        })
        .onEnd((e) => {
          'worklet'
          if (scale.value > ZOOM_EPSILON) {
            const fit = fittedSize(intrinsicW.value, intrinsicH.value, W, H)
            const mx = maxOffset(fit.w, W, scale.value)
            const my = maxOffset(fit.h, H, scale.value)
            const cx = clamp(focusX.value, -mx, mx)
            const cy = clamp(focusY.value, -my, my)
            savedFocusX.value = cx
            savedFocusY.value = cy
            focusX.value = withSpring(cx, ZOOM_SPRING)
            focusY.value = withSpring(cy, ZOOM_SPRING)
            return
          }

          if (dragY.value > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
            closeRemote()
            return
          }
          dragY.value = withSpring(0, PAGER_SPRING)

          const projected = e.translationX + e.velocityX * 0.18
          const threshold = W * PAGE_THRESHOLD_RATIO
          let target = indexShared.value
          if (projected <= -threshold) target = indexShared.value + 1
          else if (projected >= threshold) target = indexShared.value - 1
          settlePager(target)
        })
        .onFinalize((_e, success) => {
          'worklet'
          // Cancelled by a pinch taking over (or by an unrelated interruption):
          // release the strip instead of leaving it stranded mid-drag.
          if (success) return
          if (scale.value <= ZOOM_EPSILON) {
            dragX.value = withSpring(0, PAGER_SPRING)
            dragY.value = withSpring(0, PAGER_SPRING)
          }
        }),
    [H, W, closeRemote, count, dragX, dragY, focusX, focusY, intrinsicH, intrinsicW, rngh, savedFocusX, savedFocusY, savedScale, scale, indexShared, settlePager]
  )

  const pinch = useMemo(
    () =>
      rngh.Gesture.Pinch()
        .onBegin((e) => {
          'worklet'
          savedScale.value = scale.value
          savedFocusX.value = focusX.value
          savedFocusY.value = focusY.value
          focalX.value = e.focalX
          focalY.value = e.focalY
          // A second finger cancels the pager drag; bring the strip home.
          dragX.value = withSpring(0, PAGER_SPRING)
          dragY.value = withSpring(0, PAGER_SPRING)
        })
        .onUpdate((e) => {
          'worklet'
          const next = clamp(savedScale.value * e.scale, 1, MAX_SCALE)
          const fit = fittedSize(intrinsicW.value, intrinsicH.value, W, H)
          const mx = maxOffset(fit.w, W, next)
          const my = maxOffset(fit.h, H, next)
          // Pin the content point that sat under the initial focal point.
          const dx = focalX.value - W / 2
          const dy = focalY.value - H / 2
          const base = Math.max(0.01, savedScale.value)
          const cx = (dx - savedFocusX.value) / base
          const cy = (dy - savedFocusY.value) / base
          scale.value = next
          focusX.value = clamp(dx - cx * next, -mx, mx)
          focusY.value = clamp(dy - cy * next, -my, my)
        })
        .onEnd(() => {
          'worklet'
          if (scale.value < ZOOM_EPSILON + 0.02) {
            scale.value = withSpring(1, ZOOM_SPRING)
            focusX.value = withSpring(0, ZOOM_SPRING)
            focusY.value = withSpring(0, ZOOM_SPRING)
            savedScale.value = 1
            savedFocusX.value = 0
            savedFocusY.value = 0
            return
          }
          const fit = fittedSize(intrinsicW.value, intrinsicH.value, W, H)
          const mx = maxOffset(fit.w, W, scale.value)
          const my = maxOffset(fit.h, H, scale.value)
          const cx = clamp(focusX.value, -mx, mx)
          const cy = clamp(focusY.value, -my, my)
          focusX.value = withSpring(cx, ZOOM_SPRING)
          focusY.value = withSpring(cy, ZOOM_SPRING)
          savedScale.value = scale.value
          savedFocusX.value = cx
          savedFocusY.value = cy
        }),
    [H, W, dragX, dragY, focalX, focalY, focusX, focusY, intrinsicH, intrinsicW, rngh, savedFocusX, savedFocusY, savedScale, scale]
  )

  const doubleTap = useMemo(
    () =>
      rngh.Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(260)
        .maxDelay(220)
        .onEnd((e: any) => {
          'worklet'
          const zoomed = scale.value > ZOOM_EPSILON
          const fit = fittedSize(intrinsicW.value, intrinsicH.value, W, H)
          const target = zoomed ? 1 : DOUBLE_TAP_SCALE
          const mx = maxOffset(fit.w, W, target)
          const my = maxOffset(fit.h, H, target)
          const tx = zoomed ? 0 : clamp(-(e.x - W / 2) * (target - 1), -mx, mx)
          const ty = zoomed ? 0 : clamp(-(e.y - H / 2) * (target - 1), -my, my)
          scale.value = withSpring(target, ZOOM_SPRING)
          focusX.value = withSpring(tx, ZOOM_SPRING)
          focusY.value = withSpring(ty, ZOOM_SPRING)
          savedScale.value = target
          savedFocusX.value = tx
          savedFocusY.value = ty
          runOnJS(selectionHaptic)()
        }),
    [H, W, focusX, focusY, intrinsicH, intrinsicW, rngh, savedFocusX, savedFocusY, savedScale, scale]
  )

  const singleTap = useMemo(
    () =>
      rngh.Gesture.Tap()
        .numberOfTaps(1)
        .maxDuration(240)
        .onEnd(() => {
          'worklet'
          chromeToggle.value = withTiming(chromeToggle.value > 0.5 ? 0 : 1, { duration: 170 })
        }),
    [chromeToggle, rngh]
  )

  const composed = useMemo(
    () =>
      rngh.Gesture.Simultaneous(
        rngh.Gesture.Exclusive(doubleTap, singleTap),
        rngh.Gesture.Simultaneous(pan, pinch)
      ),
    [doubleTap, pan, pinch, rngh, singleTap]
  )

  const stripStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -indexShared.value * W + dragX.value },
      { translateY: dragY.value },
    ],
  }))

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: focusX.value }, { translateY: focusY.value }, { scale: scale.value }],
  }))

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: appear.value * interpolate(Math.abs(dragY.value), [0, 260], [1, 0.1], 'clamp'),
  }))

  const chromeOpacity = useDerivedValue(() => {
    const dragFade = interpolate(Math.abs(dragY.value), [0, 200], [1, 0], 'clamp')
    const zoomFade = interpolate(scale.value, [1, 1.35], [1, 0], 'clamp')
    return chromeToggle.value * dragFade * zoomFade
  })

  const handleImageLoad = useCallback(
    (i: number, event: ImageLoadEventData) => {
      const { width: w, height: h } = event.source ?? {}
      if (!w || !h) return
      intrinsic.current[i] = { w, h }
      if (i === indexRef.current) applyIntrinsic(i)
    },
    [applyIntrinsic]
  )

  const handleSelect = useCallback(
    (target: number) => {
      settlePager(clampIndex(target, count))
    },
    [count, settlePager]
  )

  const { GestureHandlerRootView, GestureDetector } = rngh

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <GestureDetector gesture={composed}>
          <Animated.View style={StyleSheet.absoluteFill}>
            <Animated.View
              style={[
                styles.strip,
                { width: W * Math.max(1, count), height: H },
                stripStyle,
              ]}
            >
              {fullSources.map((src, i) => {
                // Only mount the focused photo and its neighbours.
                if (Math.abs(i - index) > 1) return null
                return (
                  <Animated.View
                    key={`slide-${i}`}
                    style={[styles.slide, { width: W, height: H, left: i * W }, zoomStyle]}
                  >
                    <Image
                      source={src}
                      style={styles.slideImage}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      transition={160}
                      priority={i === index ? 'high' : 'normal'}
                      recyclingKey={`lightbox-${i}`}
                      onLoad={(e) => handleImageLoad(i, e)}
                      accessibilityLabel={`Foto ${i + 1} nga ${count}${title ? ` — ${title}` : ''}`}
                    />
                  </Animated.View>
                )
              })}
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>

      <LightboxChrome
        thumbs={thumbSources}
        index={index}
        title={title}
        zoomCapable
        opacity={chromeOpacity}
        onClose={onClose}
        onShare={onShare}
        onSelect={handleSelect}
      />
    </View>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * Fallback viewer — used only when the gesture-handler native module is not
 * linked into the running build. Native paging stays smooth; pinch-zoom is
 * simply unavailable.
 * ────────────────────────────────────────────────────────────────────────── */
function StaticViewer({
  images,
  initialIndex,
  title,
  onClose,
  onIndexChange,
  onShare,
}: ViewerProps) {
  const { width: W, height: H } = useWindowDimensions()
  const count = images.length
  const [index, setIndex] = useState(() => clampIndex(initialIndex, count))
  const indexRef = useRef(index)
  const [chromeOn, setChromeOn] = useState(true)
  const chromeToggle = useSharedValue(1)
  const dragY = useSharedValue(0)

  const fullSources = useMemo(() => images.map((src) => lightboxImageSource(src)), [images])
  const thumbSources = useMemo(() => images.map((src) => thumbImageSource(src)), [images])

  useEffect(() => {
    chromeToggle.value = withTiming(chromeOn ? 1 : 0, { duration: 170 })
  }, [chromeOn, chromeToggle])

  const toggleChrome = useCallback(() => {
    setChromeOn((prev) => !prev)
  }, [])

  const commit = useCallback(
    (next: number) => {
      const safe = clampIndex(next, count)
      if (safe === indexRef.current) return
      indexRef.current = safe
      setIndex(safe)
      onIndexChange?.(safe)
    },
    [count, onIndexChange]
  )

  const handleScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      commit(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, W)))
    },
    [W, commit]
  )

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        return gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.4
      },
      onPanResponderMove: (_, gs) => {
        dragY.value = gs.dy > 0 ? gs.dy : gs.dy * 0.16
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          dragY.value = withTiming(H, { duration: 180 }, () => {
            runOnJS(onClose)()
          })
        } else {
          dragY.value = withSpring(0, PAGER_SPRING)
        }
      },
      onPanResponderTerminate: () => {
        dragY.value = withSpring(0, PAGER_SPRING)
      },
    })
  ).current

  const backdropStyle = useAnimatedStyle(() => {
    const p = Math.max(0, 1 - Math.abs(dragY.value) / (H * 0.45))
    return { opacity: p }
  })

  const slideContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }))

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

      <Animated.View style={[StyleSheet.absoluteFill, slideContainerStyle]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: clampIndex(initialIndex, count) * W, y: 0 }}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
        >
          {fullSources.map((src, i) => (
            <Pressable
              key={`static-slide-${i}`}
              style={{ width: W, height: H }}
              onPress={toggleChrome}
              accessibilityLabel={`Foto ${i + 1} nga ${count}${title ? ` — ${title}` : ''}`}
            >
              <Image
                source={src}
                style={styles.slideImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={160}
                priority={i === index ? 'high' : 'normal'}
                recyclingKey={`lightbox-${i}`}
              />
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      <LightboxChrome
        thumbs={thumbSources}
        index={index}
        title={title}
        zoomCapable={false}
        opacity={chromeToggle}
        onClose={onClose}
        onShare={onShare}
        onSelect={commit}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backdrop: {
    backgroundColor: '#000000',
  },
  strip: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  slide: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  chromeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 26,
  },
  chromeFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 30,
  },
  chromeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 12, 12, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  iconBtnPressed: {
    backgroundColor: 'rgba(10, 12, 12, 0.8)',
    transform: [{ scale: 0.93 }],
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 15,
    backgroundColor: 'rgba(10, 12, 12, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 11.5,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    paddingHorizontal: 28,
    marginBottom: 12,
  },
  thumbStripContent: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  thumbItem: {
    width: 60,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  thumbItemSelected: {
    borderColor: '#FFFFFF',
  },
})

export default MediaLightbox
