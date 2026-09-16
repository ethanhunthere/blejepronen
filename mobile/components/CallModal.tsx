import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Linking,
  Share,
} from 'react-native'
import { Image } from 'expo-image'
import {
  Phone,
  MessageCircle,
  MessageSquare,
  Copy,
  X,
  ShieldCheck,
  Building2,
  ExternalLink,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { getAvatarUri } from '@/lib/avatars'
import { playTapSound, playSuccessSound } from '@/lib/sound'
import { callEngine } from '@/lib/calling'
import { PhoneCall } from 'lucide-react-native'

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
  isSignedIn = true,
}: CallModalProps) {
  const { colors, theme } = useTheme()

  if (!visible) return null

  const avatarUri = getAvatarUri(counterpartAvatar)
  const isAgency = /agjenci|real estate|invest|patundshm|group|shpk/i.test(counterpartName)

  const cleanPhone = counterpartPhone ? counterpartPhone.replace(/\s+/g, '') : null
  const cleanPhoneDigits = counterpartPhone ? counterpartPhone.replace(/\D/g, '') : null

  const handleInAppCall = () => {
    if (!counterpartUserId) return
    playTapSound()
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    void callEngine.startCall({
      userId: counterpartUserId,
      name: counterpartName,
      avatarUrl: counterpartAvatar ?? null,
      conversationId: conversationId ?? null,
    })
    onClose()
  }

  const handleCellularCall = () => {
    if (!cleanPhone) return
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    Linking.openURL(`tel:${cleanPhone}`)
    onClose()
  }

  const handleWhatsApp = () => {
    if (!cleanPhoneDigits) return
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    Linking.openURL(`https://wa.me/${cleanPhoneDigits}`)
    onClose()
  }

  const handleSMS = () => {
    if (!cleanPhone) return
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    const body = listingTitle
      ? encodeURIComponent(`Përshëndetje! Po ju kontaktoj nga Bleje Pronën lidhur me: ${listingTitle}.`)
      : encodeURIComponent('Përshëndetje! Po ju kontaktoj nga Bleje Pronën.')
    Linking.openURL(`sms:${cleanPhone}${Platform.OS === 'ios' ? '&' : '?'}body=${body}`)
    onClose()
  }

  const handleCopyPhone = async () => {
    if (!counterpartPhone) return
    playSuccessSound()
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
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
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: specularBorder,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Apple iOS Grabber Bar */}
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          {/* Header Row with Close */}
          <View style={styles.topRow}>
            <View style={{ width: 28 }} />
            <Text style={[styles.sheetTitle, { color: colors.textMuted }]}>
              Opsionet e Kontaktit
            </Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <X size={18} color={colors.textLight} />
            </Pressable>
          </View>

          {/* Contact Identity */}
          <View style={styles.identitySection}>
            <View style={[styles.avatarWrap, { borderColor: colors.border }]}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
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
              <View style={[styles.listingTag, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.listingTagText, { color: colors.textSecondary }]} numberOfLines={1}>
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

          {/* Free In-App Call — primary action (works even without a public phone number) */}
          {counterpartUserId && Platform.OS !== 'web' && (
            <Pressable
              style={[
                styles.appCallBtn,
                { backgroundColor: theme === 'green' ? colors.gold : colors.primary },
              ]}
              onPress={handleInAppCall}
            >
              <PhoneCall
                size={19}
                color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                strokeWidth={2.4}
              />
              <View style={styles.appCallTextWrap}>
                <Text
                  style={[
                    styles.appCallLabel,
                    { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
                  ]}
                >
                  Thirr në aplikacion
                </Text>
                <Text
                  style={[styles.appCallSub, { color: theme === 'green' ? 'rgba(0,62,55,0.7)' : 'rgba(255,255,255,0.75)' }]}
                >
                  Falas · Brenda Bleje Pronën
                </Text>
              </View>
            </Pressable>
          )}

          {/* Action Grid (Apple iOS 18 Contact Card Actions) */}
          {cleanPhone ? (
            <View style={styles.actionsGrid}>
              {/* Cellular Phone Call */}
              <Pressable
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                onPress={handleCellularCall}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#10B981' }]}>
                  <Phone size={20} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  Thirr
                </Text>
                <Text style={[styles.actionSub, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>
                  Telefonik
                </Text>
              </Pressable>

              {/* WhatsApp */}
              <Pressable
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                onPress={handleWhatsApp}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#25D366' }]}>
                  <MessageCircle size={20} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  WhatsApp
                </Text>
                <Text style={[styles.actionSub, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>
                  Bisedo
                </Text>
              </Pressable>

              {/* SMS Message */}
              <Pressable
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                onPress={handleSMS}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#3B82F6' }]}>
                  <MessageSquare size={20} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  SMS
                </Text>
                <Text style={[styles.actionSub, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>
                  Mesazh
                </Text>
              </Pressable>

              {/* Copy Phone */}
              <Pressable
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                onPress={handleCopyPhone}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    {
                      backgroundColor:
                        theme === 'green' ? colors.gold : colors.primary,
                    },
                  ]}
                >
                  <Copy
                    size={19}
                    color={theme === 'green' ? '#003E37' : '#FFFFFF'}
                    strokeWidth={2.4}
                  />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  Kopjo
                </Text>
                <Text style={[styles.actionSub, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>
                  Numrin
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.noPhoneCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={[styles.noPhoneTitle, { color: colors.textPrimary }]}>
                Numri nuk është publik
              </Text>
              <Text style={[styles.noPhoneDesc, { color: colors.textMuted }]}>
                Ky përdorues preferon të kontaktohet përmes mesazheve të drejtpërdrejta në platformë.
              </Text>
              <Pressable
                style={[styles.chatBtn, { backgroundColor: colors.primary }]}
                onPress={onClose}
              >
                <Text style={[styles.chatBtnText, { color: theme === 'green' ? '#003E37' : '#FFFFFF' }]}>
                  Vazhdo në Bisedë
                </Text>
              </Pressable>
            </View>
          )}

          {/* Privacy Note */}
          <Text style={[styles.footerNotice, { color: colors.textLight }]}>
            Bleje Pronën lidh drejtpërdrejt palët pa ndërmjetësim apo kosto të fshehura.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    gap: 16,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  appCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  appCallTextWrap: {
    flex: 1,
    gap: 1,
  },
  appCallLabel: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  appCallSub: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    letterSpacing: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  closeBtn: {
    padding: 4,
  },
  identitySection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1.5,
    marginBottom: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  roleBadge: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  listingTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
    maxWidth: '90%',
  },
  listingTagText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  phoneNumberText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  actionSub: {
    fontSize: 10,
    fontFamily: Fonts.regular,
  },
  noPhoneCard: {
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
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
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  chatBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  footerNotice: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
})
