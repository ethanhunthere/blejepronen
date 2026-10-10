import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  StyleProp,
  ViewStyle,
  DimensionValue,
  KeyboardAvoidingView,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/constants/theme'
import { useBottomSheetGesture } from '@/lib/bottom-sheet-gesture'

export interface DraggableBottomSheetProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  maxHeight?: DimensionValue
  sheetStyle?: StyleProp<ViewStyle>
  dismissThreshold?: number
  velocityThreshold?: number
  enableBackdropDismiss?: boolean
  showHandle?: boolean
  handleColor?: string
  avoidKeyboard?: boolean
}

/**
 * DraggableBottomSheet
 *
 * Universal Apple/Airbnb-grade bottom sheet wrapper with native 60/120 FPS
 * drag-to-dismiss, dual-responder physics (instant handle response + child button capture),
 * rubber-banding, and proportional backdrop dimming.
 */
export function DraggableBottomSheet({
  visible,
  onClose,
  children,
  maxHeight = '90%',
  sheetStyle,
  dismissThreshold = 55,
  velocityThreshold = 0.28,
  enableBackdropDismiss = true,
  showHandle = true,
  handleColor,
  avoidKeyboard = true,
}: DraggableBottomSheetProps) {
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()

  const [rendered, setRendered] = useState(visible)
  const isClosingRef = useRef(false)

  const isDark = theme === 'green' || theme === 'black'

  const {
    dragY,
    backdropOpacity,
    handlePanHandlers,
    cardPanHandlers,
    animateDismiss,
    animateEntrance,
  } = useBottomSheetGesture({
    dismissDistance: 560,
    dismissThreshold,
    velocityThreshold,
    onDismiss: () => {
      setRendered(false)
      isClosingRef.current = false
      onClose()
    },
    enableHaptics: true,
  })

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    // onDismiss is the single exit path; a callback here would
    // double-fire onClose on every programmatic dismissal.
    animateDismiss()
  }, [animateDismiss, onClose])

  useEffect(() => {
    if (visible) {
      setRendered(true)
      isClosingRef.current = false
      animateEntrance()
    } else if (rendered && !isClosingRef.current) {
      handleClose()
    }
  }, [visible])

  if (!rendered) return null

  const resolvedHandleColor =
    handleColor || (isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.18)')

  const content = (
    <View style={styles.modalRoot}>
      {/* Interpolated Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdropFill,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={enableBackdropDismiss ? handleClose : undefined}
        >
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={isDark ? 30 : 20}
              tint={colors.blurTint}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={StyleSheet.absoluteFill} />
          )}
        </Pressable>
      </Animated.View>

      {/* Action Sheet Card */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            maxHeight,
            paddingBottom: Math.max(insets.bottom + 8, 20),
            transform: [{ translateY: dragY }],
          },
          sheetStyle,
        ]}
        {...cardPanHandlers}
      >
        {/* Grabber Handle Area (Claims immediately on touch down) */}
        {showHandle && (
          <View style={styles.grabberZone} {...handlePanHandlers}>
            <View style={[styles.grabber, { backgroundColor: resolvedHandleColor }]} />
          </View>
        )}

        {children}
      </Animated.View>
    </View>
  )

  return (
    <Modal
      visible={rendered}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
      hardwareAccelerated={true}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1,
    paddingHorizontal: 20,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 16,
    overflow: 'hidden',
  },
  grabberZone: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  grabber: {
    width: 42,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
  },
})
