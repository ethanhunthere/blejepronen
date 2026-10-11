import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Linking,
  Share,
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
  Check,
  X,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, Fonts } from '@/constants/theme'
import { useRouter } from 'expo-router'
import { getAvatarSource } from '@/lib/avatars'
import { playTapSound, playSuccessSound } from '@/lib/sound'
import { callEngine, isCallingSupported } from '@/lib/calling'
import { getSyncAuthUser } from '@/lib/auth-cache'
import { openLoginScreen } from '@/lib/navigation'
import { normalizePhoneNumber } from '@/lib/phone'

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
  counterpartEmailVerified?: boolean
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
  counterpartEmailVerified,
}: CallModalProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, theme } = useTheme()

  const [copied, setCopied] = useState(false)

  // Verified-agency badge: prefer the server flag; otherwise require BOTH a
  // corporate name token AND that the account looks established.
  const looksCorporate = /agjenci|real estate|invest|patundshm|group|shpk/i.test(
    counterpartName || ''
  )
  const isAgency =
    counterpartEmailVerified === true
      ? true
      : counterpartEmailVerified === false
      ? false
      : looksCorporate && (counterpartName || '').trim().length >= 4

  const cleanPhone = counterpartPhone ? normalizePhoneNumber(counterpartPhone) : null
  const cleanPhoneDigits = counterpartPhone
    ? normalizePhoneNumber(counterpartPhone).replace(/\D/g, '')
    : null

  // 1. Primary Hero: In-App WebRTC VoIP Call
  const handleInAppCall = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    }
    playTapSound()

    if (!counterpartUserId) {
      Alert.alert('Vërejtje', 'Përdoruesi nuk është i disponueshëm për thirrje në këtë moment.')
      return
    }

    const currentViewer = getSyncAuthUser()
    if (!currentViewer) {
      onClose()
      openLoginScreen(router, { redirectTo: `/listings/${conversationId || ''}`, reason: 'call' })
      return
    }

    if (!isCallingSupported()) {
      const buttons: any[] = []
      if (cleanPhone) {
        buttons.push({
          text: `Telefono (${cleanPhone})`,
          onPress: () => {
            onClose()
            Linking.openURL(`tel:${cleanPhone}`).catch(() => {})
          },
        })
      }
      if (cleanPhoneDigits) {
        buttons.push({
          text: 'WhatsApp',
          onPress: () => {
            onClose()
            Linking.openURL(`https://wa.me/${cleanPhoneDigits}`).catch(() => {})
          },
        })
      }
      buttons.push({
        text: 'Në rregull',
        style: 'cancel',
      })

      Alert.alert(
        'Thirrjet VoIP në Aplikacion',
        'Thirrjet direkte me internet kërkojnë versionin e plotë të instalimit (App Store / APK). Mund të kontaktoni menjëherë përmes telefonit celular ose WhatsApp.',
        buttons
      )
      return
    }

    onClose()
    void callEngine.startCall({
      userId: counterpartUserId,
      name: counterpartName,
      avatarUrl: counterpartAvatar ?? null,
      conversationId: conversationId ?? null,
    })
  }

  // 2. Secondary: Direct Cellular Phone Call
  const handleCellularCall = () => {
    if (!cleanPhone) return
    playTapSound()
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {})
    }
    onClose()
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Gabim', 'Nuk mund të iniciohet thirrja telefonike.')
    })
  }

  // 3. Secondary: Direct WhatsApp Chat
  const handleWhatsApp = () => {
    if (!cleanPhoneDigits) return
    playTapSound()
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {})
    }
    onClose()
    Linking.openURL(`https://wa.me/${cleanPhoneDigits}`).catch(() => {
      Alert.alert('Gabim', 'Nuk mund të hapet aplikacioni WhatsApp.')
    })
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Semi-transparent Backdrop: Tap to Dismiss */}
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdropFill]}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.selectionAsync().catch(() => {})
            }
            onClose()
          }}
        />

        {/* Action Sheet Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              paddingBottom: Math.max(insets.bottom + 12, 24),
            },
          ]}
        >
          {/* Top Grabber Indicator */}
          <View style={styles.grabberZone}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          </View>

          {/* Contact Identity Header */}
          <View style={styles.identitySection}>
            <View style={[styles.avatarWrap, { borderColor: colors.borderSubtle }]}>
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
              {counterpartEmailVerified === true &&
                (isAgency ? (
                  <Building2 size={16} color={colors.primary} strokeWidth={2.4} />
                ) : (
                  <ShieldCheck size={16} color={colors.primary} strokeWidth={2.4} />
                ))}
            </View>

            <Text style={[styles.roleBadge, { color: colors.textMuted }]}>
              {counterpartEmailVerified === true
                ? isAgency
                  ? 'Agjenci e Konfirmuar'
                  : 'Profil i Konfirmuar'
                : isAgency
                  ? 'Agjenci'
                  : 'Pronar / Blerës'}
            </Text>

            {listingTitle && (
              <View
                style={[
                  styles.listingTag,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
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

          {/* 1. HERO ACTION: "Thirr në aplikacion" (HD Audio VoIP Call) */}
          {counterpartUserId ? (
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
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
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
                  HD Audio · Falas me internet
                </Text>
              </View>
            </Pressable>
          ) : null}

          {/* 2. SECONDARY ACTIONS: Cellular & WhatsApp */}
          {cleanPhone ? (
            <View
              style={[
                styles.secondaryGroup,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
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
                    Telefono
                  </Text>
                  <Text style={[styles.secondarySubtitle, { color: colors.textMuted }]}>
                    {cleanPhone}
                  </Text>
                </View>
              </Pressable>

              {/* Row 2: WhatsApp (nëse ka numër) */}
              {cleanPhoneDigits ? (
                <>
                  <View
                    style={[styles.secondaryDivider, { backgroundColor: colors.borderSubtle }]}
                  />
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
                          backgroundColor: '#25D366',
                          borderColor: 'rgba(37, 211, 102, 0.3)',
                        },
                      ]}
                    >
                      <MessageCircle size={17} color="#FFFFFF" strokeWidth={2.4} />
                    </View>

                    <View style={styles.secondaryTextCol}>
                      <Text style={[styles.secondaryTitle, { color: colors.textPrimary }]}>
                        WhatsApp
                      </Text>
                      <Text style={[styles.secondarySubtitle, { color: colors.textMuted }]}>
                        Bisedë e shpejtë
                      </Text>
                    </View>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}

          {/* 3. TERTIARY ACTION: Kopjo Numrin */}
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
                    size={14}
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
                  <Copy size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={[styles.tertiaryCopyText, { color: colors.textMuted }]}>
                    Kopjo numrin e telefonit
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}

          {/* Cancel Dismiss Button */}
          <Pressable
            style={({ pressed }) => [
              styles.dismissBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
              },
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.selectionAsync().catch(() => {})
              }
              onClose()
            }}
          >
            <Text style={[styles.dismissBtnText, { color: colors.textPrimary }]}>
              Anulo
            </Text>
          </Pressable>
        </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 20,
  },
  grabberZone: {
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  identitySection: {
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    marginBottom: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    maxWidth: '90%',
  },
  nameText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  roleBadge: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  listingTag: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '92%',
  },
  listingTagText: {
    fontSize: 11.5,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  phoneNumberText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  heroAppCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 12,
    marginTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  secondaryGroup: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  secondaryTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.semiBold,
  },
  secondarySubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  secondaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },
  tertiaryCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  tertiaryCopyText: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
  },
  dismissBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  dismissBtnText: {
    fontSize: 14.5,
    fontFamily: Fonts.semiBold,
  },
})
