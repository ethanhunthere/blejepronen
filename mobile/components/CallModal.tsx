import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Linking,
  Share,
  Animated,
  Alert,
} from 'react-native'
import { Image } from 'expo-image'
import {
  Phone,
  MessageCircle,
  Copy,
  ShieldCheck,
  Building2,
  PhoneCall,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, Fonts } from '@/constants/theme'
import { getAvatarSource } from '@/lib/avatars'
import { playTapSound, playSuccessSound } from '@/lib/sound'
import { callEngine } from '@/lib/calling'
import { normalizePhoneNumber } from '@/lib/phone'
import { useBottomSheetGesture } from '@/lib/bottom-sheet-gesture'

export interface CallModalProps {
  visible: boolean
  onClose: () => void
  counterpartName: string
  counterpartAvatar?: string | null
  counterpartPhone?: string | null
  listingTitle?: string | null
  initialCallType?: 'audio' | 'video'
  /** Enables the free in-app call option (WebRTC) when known */
  counterpartUserId?: string | null
  conversationId?: string | null
  /** Whether the current user is signed in (in-app calls need auth) */
  isSignedIn?: boolean
}

export function CallModal({
  visible,
  onClose,
  counterpartName,
  counterpartAvatar,
  counterpartPhone,
  listingTitle,
  counterpartUserId,
  conversationId,
}: CallModalProps) {
  const insets = useSafeAreaInsets()
  const { colors, theme } = useTheme()

  const [rendered, setRendered] = useState(visible)
  const [copied, setCopied] = useState(false)
  const isClosingRef = useRef(false)

  const {
    dragY,
    backdropOpacity,
    handlePanHandlers,
    cardPanHandlers,
    animateDismiss,
    animateEntrance,
  } = useBottomSheetGesture({
    dismissDistance: 540,
    dismissThreshold: 55,
    velocityThreshold: 0.28,
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
    animateDismiss(() => {
      setRendered(false)
      isClosingRef.current = false
      onClose()
    })
  }, [animateDismiss, onClose])

  // Synchronize modal presentation lifecycle with zero unmount flicker
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

  const isAgency = /agjenci|real estate|invest|patundshm|group|shpk/i.test(counterpartName)
  const cleanPhone = counterpartPhone ? normalizePhoneNumber(counterpartPhone) : null
  const cleanPhoneDigits = counterpartPhone
    ? normalizePhoneNumber(counterpartPhone).replace(/\D/g, '')
    : null

  // 1. Primary Hero: Free In-App WebRTC Call
  const handleInAppCall = () => {
    if (!counterpartUserId) return
    playTapSound()
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    }
    void callEngine.startCall({
      userId: counterpartUserId,
      name: counterpartName,
      avatarUrl: counterpartAvatar ?? null,
      conversationId: conversationId ?? null,
    })
    handleClose()
  }

  // 2. Secondary: Direct Cellular Phone Call
  const handleCellularCall = () => {
    if (!cleanPhone) return
    playTapSound()
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {})
    }
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Gabim', 'Nuk mund të iniciohet thirrja telefonike.')
    })
    handleClose()
  }

  // 3. Secondary: Direct WhatsApp Chat
  const handleWhatsApp = () => {
    if (!cleanPhoneDigits) return
    playTapSound()
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {})
    }
    Linking.openURL(`https://wa.me/${cleanPhoneDigits}`).catch(() => {
      Alert.alert('Gabim', 'Nuk mund të hapet aplikacioni WhatsApp.')
    })
    handleClose()
  }

  // 4. Subordinate Tertiary: Copy Phone Number to Clipboard / Share
  const handleCopyPhone = async () => {
    if (!counterpartPhone) return
    playSuccessSound()
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    }
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2200)

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(counterpartPhone)
      } else {
        await Share.share({ message: counterpartPhone })
      }
    } catch {
      // Non-blocking
    }
  }

  const specularBorder =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.08)'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(255, 255, 255, 0.10)'

  return (
    <Modal
      visible={rendered}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
      hardwareAccelerated={true}
    >
      <View style={styles.modalRoot}>
        {/* Interpolated Dark Backdrop: Fades smoothly with gesture to prevent black flicker */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdropFill,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Action Sheet Card */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: specularBorder,
              paddingBottom: Math.max(insets.bottom + 12, 24),
              transform: [{ translateY: dragY }],
            },
          ]}
          {...cardPanHandlers}
        >
          {/* Tactile Grabber Handle Area (Claims immediately on touch down) */}
          <View style={styles.grabberZone} {...handlePanHandlers}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          </View>

          {/* Contact Identity Header */}
          <View style={styles.identitySection}>
            <View style={[styles.avatarWrap, { borderColor: colors.border }]}>
              <Image
                source={getAvatarSource(counterpartAvatar)}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                transition={0}
              />
            </View>

            <View style={styles.nameRow}>
              <Text style={[styles.nameText, { color: colors.textPrimary }]} numberOfLines={1}>
                {counterpartName}
              </Text>
              {isAgency ? (
                <Building2 size={16} color={colors.primary} strokeWidth={2.4} />
              ) : (
                <ShieldCheck size={16} color={colors.primary} strokeWidth={2.4} />
              )}
            </View>

            <Text style={[styles.roleBadge, { color: colors.textMuted }]}>
              {isAgency ? 'Agjenci e Verifikuar' : 'Pronar / Blerës i Verifikuar'}
            </Text>

            {listingTitle && (
              <View
                style={[
                  styles.listingTag,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.listingTagText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {listingTitle}
                </Text>
              </View>
            )}

            {counterpartPhone ? (
              <Text style={[styles.phoneNumberText, { color: colors.textPrimary }]}>
                {counterpartPhone}
              </Text>
            ) : null}
          </View>

          {/* 1. HERO ACTION: "Thirr në aplikacion" (Dominant, Branded Primary CTA) */}
          {counterpartUserId && Platform.OS !== 'web' ? (
            <Pressable
              style={({ pressed }) => [
                styles.heroAppCallBtn,
                {
                  backgroundColor: theme === 'green' ? colors.gold : colors.primary,
                },
                pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
              ]}
              onPress={handleInAppCall}
            >
              <View
                style={[
                  styles.heroIconCircle,
                  {
                    backgroundColor:
                      theme === 'green' ? 'rgba(7, 28, 24, 0.14)' : 'rgba(255, 255, 255, 0.22)',
                  },
                ]}
              >
                <PhoneCall
                  size={20}
                  color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                  strokeWidth={2.4}
                />
              </View>

              <View style={styles.heroTextCol}>
                <Text
                  style={[
                    styles.heroTitle,
                    { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                  ]}
                >
                  Thirr në aplikacion
                </Text>
                <Text
                  style={[
                    styles.heroSubtitle,
                    {
                      color:
                        theme === 'green'
                          ? 'rgba(7, 28, 24, 0.78)'
                          : 'rgba(255, 255, 255, 0.85)',
                    },
                  ]}
                >
                  Pa pagesë · Në rrjet (HD Audio)
                </Text>
              </View>

              <View
                style={[
                  styles.heroPill,
                  {
                    backgroundColor:
                      theme === 'green' ? 'rgba(7, 28, 24, 0.16)' : 'rgba(255, 255, 255, 0.24)',
                  },
                ]}
              >
                <Sparkles
                  size={11}
                  color={theme === 'green' ? '#071C18' : '#FFFFFF'}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.heroPillText,
                    { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                  ]}
                >
                  FALAS
                </Text>
              </View>
            </Pressable>
          ) : null}

          {/* 2. SECONDARY ACTIONS: Clean Standard Action Rows (No SMS) */}
          {cleanPhone ? (
            <View
              style={[
                styles.secondaryGroup,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              {/* Row 1: Thirrje celulare */}
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryRow,
                  pressed && { backgroundColor: colors.borderSubtle },
                ]}
                onPress={handleCellularCall}
              >
                <View
                  style={[
                    styles.secondaryIconCircle,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Phone size={17} color={colors.textPrimary} strokeWidth={2.2} />
                </View>
                <View style={styles.secondaryTextCol}>
                  <Text style={[styles.secondaryTitle, { color: colors.textPrimary }]}>
                    Thirrje celulare
                  </Text>
                  <Text style={[styles.secondarySub, { color: colors.textMuted }]}>
                    {cleanPhone}
                  </Text>
                </View>
                <ChevronRight size={17} color={colors.textLight} strokeWidth={2} />
              </Pressable>

              {/* Inset Divider */}
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

              {/* Row 2: WhatsApp */}
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryRow,
                  pressed && { backgroundColor: colors.borderSubtle },
                ]}
                onPress={handleWhatsApp}
              >
                <View
                  style={[
                    styles.secondaryIconCircle,
                    {
                      backgroundColor: 'rgba(37, 211, 102, 0.12)',
                      borderColor: 'rgba(37, 211, 102, 0.25)',
                    },
                  ]}
                >
                  <MessageCircle size={18} color="#25D366" strokeWidth={2.4} />
                </View>
                <View style={styles.secondaryTextCol}>
                  <Text style={[styles.secondaryTitle, { color: colors.textPrimary }]}>
                    WhatsApp
                  </Text>
                  <Text style={[styles.secondarySub, { color: colors.textMuted }]}>
                    Bisedo drejtpërdrejt
                  </Text>
                </View>
                <ChevronRight size={17} color={colors.textLight} strokeWidth={2} />
              </Pressable>
            </View>
          ) : (
            <View
              style={[
                styles.noPhoneCard,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.noPhoneTitle, { color: colors.textPrimary }]}>
                Numri nuk është publik
              </Text>
              <Text style={[styles.noPhoneDesc, { color: colors.textMuted }]}>
                Ky përdorues preferon të kontaktohet përmes mesazheve të drejtpërdrejta në platformë.
              </Text>
              <Pressable
                style={[styles.chatBtn, { backgroundColor: colors.primary }]}
                onPress={handleClose}
              >
                <Text
                  style={[
                    styles.chatBtnText,
                    { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
                  ]}
                >
                  Vazhdo në Bisedë
                </Text>
              </Pressable>
            </View>
          )}

          {/* 3. SUBORDINATE ACTION: Compact, subtle "Kopjo numrin" */}
          {counterpartPhone ? (
            <Pressable
              style={({ pressed }) => [
                styles.tertiaryCopyBtn,
                pressed && { opacity: 0.65 },
              ]}
              onPress={handleCopyPhone}
              hitSlop={8}
            >
              {copied ? (
                <>
                  <Check
                    size={13}
                    color={theme === 'green' ? colors.gold : colors.primary}
                    strokeWidth={2.4}
                  />
                  <Text
                    style={[
                      styles.tertiaryCopyText,
                      { color: theme === 'green' ? colors.gold : colors.primary },
                    ]}
                  >
                    Numri u kopjua në memorje
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={13} color={colors.textMuted} strokeWidth={2} />
                  <Text style={[styles.tertiaryCopyText, { color: colors.textMuted }]}>
                    Kopjo numrin e telefonit
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}

          {/* Privacy Footnote */}
          <Text style={[styles.footerNotice, { color: colors.textLight }]}>
            Bleje Pronën lidh drejtpërdrejt palët pa ndërmjetësim apo kosto të fshehura.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
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
    paddingTop: 8,
    gap: 14,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 16,
  },
  grabberZone: {
    paddingTop: 6,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
  },
  identitySection: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.5,
    marginBottom: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  nameText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  roleBadge: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  listingTag: {
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    marginTop: 2,
    maxWidth: '90%',
  },
  listingTagText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  phoneNumberText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    marginTop: 2,
    letterSpacing: 0.3,
  },

  /* 1. Hero CTA Styles */
  heroAppCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heroIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    flex: 1,
    gap: 1.5,
  },
  heroTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.medium,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  heroPillText: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    letterSpacing: 0.5,
  },

  /* 2. Secondary Group Styles */
  secondaryGroup: {
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  secondaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryTextCol: {
    flex: 1,
    gap: 1,
  },
  secondaryTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  secondarySub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },

  /* 3. Subordinate Tertiary "Kopjo numrin" Styles */
  tertiaryCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    alignSelf: 'center',
  },
  tertiaryCopyText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },

  noPhoneCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    gap: 8,
  },
  noPhoneTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  noPhoneDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 16,
  },
  chatBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  chatBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  footerNotice: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 15,
  },
})
