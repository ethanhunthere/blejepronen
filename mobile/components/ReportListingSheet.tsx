import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import {
  Flag,
  ShieldAlert,
  Copy,
  MessageSquareWarning,
  Ban,
  X,
  CheckCircle2,
} from 'lucide-react-native'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { API_BASE_URL } from '@/lib/api'
import { playSuccessSound, playTapSound } from '@/lib/sound'
import { useBottomSheetGesture } from '@/lib/bottom-sheet-gesture'

/**
 * ReportListingSheet — "Raporto këtë shpallje" bottom sheet (audit §6).
 *
 * Mobile counterpart of `components/ReportListingDialog.tsx` (web). Same
 * reasons, same payload, same endpoint:
 *
 *   POST {API_BASE_URL}/api/reports
 *   Authorization: Bearer <supabase access token>
 *   { listingId, reason: 'spam'|'fraudulent'|'duplicate'|'offensive'|'other', note? }
 *
 * The server enforces auth, self-report rejection (403), the 5/hour quota (429)
 * and the reason allowlist; this sheet only collects input and renders the
 * server's `message` verbatim so those explanations reach the user unchanged.
 *
 * INTEGRATION (the listing detail screen `mobile/app/listings/[id].tsx` is
 * owned by another workstream):
 *   const [reportOpen, setReportOpen] = useState(false)
 *   <Pressable onPress={() => setReportOpen(true)}>…Raporto…</Pressable>
 *   <ReportListingSheet
 *     isOpen={reportOpen}
 *     onClose={() => setReportOpen(false)}
 *     listingId={listing.id}
 *     listingTitle={listing.title}
 *     listingCity={listing.city}
 *     onRequireAuth={() => openLoginScreen(router, { redirectTo: `/listings/${listing.id}` })}
 *   />
 * Reporting is for OTHERS' listings — hide the trigger when
 * `listing.user_id === currentUser.id` (the route 403s regardless).
 */

export type ReportReason = 'spam' | 'fraudulent' | 'duplicate' | 'offensive' | 'other'

export interface ReportReasonOption {
  value: ReportReason
  label: string
  hint: string
  icon: typeof Flag
  /** Accent colour used for the icon chip when selected. */
  accent: string
}

/** Single source for the reason list (mirrors the web dialog exactly). */
export const REPORT_REASONS: ReportReasonOption[] = [
  {
    value: 'spam',
    label: 'Spam',
    hint: 'Reklamë, përmbajtje e parëndësishme ose e përsëritur qëllimisht.',
    icon: Ban,
    accent: '#F59E0B',
  },
  {
    value: 'fraudulent',
    label: 'Mashtrim / mashtrues',
    hint: 'Kërkon pagesa paraprake, çmim joreal, ose pronë që nuk ekziston.',
    icon: ShieldAlert,
    accent: '#EF4444',
  },
  {
    value: 'duplicate',
    label: 'Shpallje e dyfishtë',
    hint: 'E njëjta pronë është postuar më shumë se një herë.',
    icon: Copy,
    accent: '#6366F1',
  },
  {
    value: 'offensive',
    label: 'Përmbajtje ofenduese',
    hint: 'Gjuhë fyese, diskriminuese ose fotografi të papërshtatshme.',
    icon: MessageSquareWarning,
    accent: '#EC4899',
  },
  {
    value: 'other',
    label: 'Tjetër',
    hint: 'Diçka tjetër që shkel kushtet e përdorimit (kërkohet shënim).',
    icon: Flag,
    accent: '#64748B',
  },
]

const MAX_NOTE_LENGTH = 1000
const MIN_OTHER_NOTE_LENGTH = 5
const REQUEST_TIMEOUT_MS = 12_000

export interface ReportListingSheetProps {
  isOpen: boolean
  onClose: () => void
  listingId: string | null
  listingTitle?: string | null
  listingCity?: string | null
  /** Called after the server accepted the report (duplicates included). */
  onSuccess?: (info: { listingId: string; reason: ReportReason; duplicate: boolean }) => void
  /** Called on 401 so the host screen can route to login and come back. */
  onRequireAuth?: () => void
}

type Phase = 'form' | 'sending' | 'done'

export function ReportListingSheet({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  listingCity,
  onSuccess,
  onRequireAuth,
}: ReportListingSheetProps) {
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()

  const [visible, setVisible] = useState(isOpen)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [note, setNote] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  const isDark = theme === 'green' || theme === 'black'
  const accent = theme === 'green' ? colors.gold : colors.primary
  const dangerColor = '#EF4444'

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
      setVisible(false)
      isClosingRef.current = false
      onClose()
    },
    enableHaptics: true,
  })

  const handleDismiss = useCallback(() => {
    if (phase === 'sending' || isClosingRef.current) return
    isClosingRef.current = true
    // onDismiss is the single exit path; a callback here would
    // double-fire onClose on every programmatic dismissal.
    animateDismiss()
  }, [animateDismiss, onClose, phase])

  // Sync external open/close and reset the form on every open.
  useEffect(() => {
    if (isOpen) {
      setReason(null)
      setNote('')
      setPhase('form')
      setErrorMessage(null)
      setSuccessMessage('')
      setVisible(true)
      isClosingRef.current = false
      animateEntrance()
    } else if (visible && phase !== 'sending' && !isClosingRef.current) {
      handleDismiss()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const noteRequired = reason === 'other'
  const canSubmit =
    phase === 'form' &&
    reason !== null &&
    Boolean(listingId) &&
    (!noteRequired || note.trim().length >= MIN_OTHER_NOTE_LENGTH)

  const handleSubmit = async () => {
    if (!canSubmit || !listingId || !reason) return
    playTapSound()
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    setPhase('sending')
    setErrorMessage(null)

    let token: string | null = null
    try {
      const { data } = await supabase.auth.getSession()
      token = data.session?.access_token ?? null
    } catch {
      token = null
    }

    if (!token) {
      setPhase('form')
      setErrorMessage('Duhet të jeni i kyçur për të raportuar një shpallje.')
      onRequireAuth?.()
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId,
          reason,
          note: note.trim() ? note.trim().slice(0, MAX_NOTE_LENGTH) : undefined,
        }),
      })

      const data = (await res.json().catch(() => null)) as {
        message?: string
        error?: string
        duplicate?: boolean
      } | null

      if (res.status === 401) {
        setPhase('form')
        setErrorMessage(data?.message || 'Sesioni ka skaduar. Ju lutemi kyçuni përsëri.')
        onRequireAuth?.()
        return
      }

      if (!res.ok) {
        setPhase('form')
        setErrorMessage(
          data?.message || 'Raportimi dështoi. Ju lutemi provoni përsëri më vonë.'
        )
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
        return
      }

      setSuccessMessage(
        data?.message || 'Faleminderit. Raportimi u dërgua te ekipi moderues.'
      )
      setPhase('done')
      playSuccessSound()
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      onSuccess?.({ listingId, reason, duplicate: data?.duplicate === true })

      // Let the confirmation read, then dismiss.
      setTimeout(() => {
        handleDismiss()
      }, 1800)
    } catch {
      setPhase('form')
      setErrorMessage('Lidhja me serverin dështoi. Kontrolloni internetin dhe provoni përsëri.')
    } finally {
      clearTimeout(timer)
    }
  }

  if (!visible) return null

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.flex, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdrop} onPress={handleDismiss}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={StyleSheet.absoluteFill} />
            )}
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY: dragY }],
            },
          ]}
          {...cardPanHandlers}
        >
          <View style={styles.grabberZone} {...handlePanHandlers}>
            <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.14)' }]} />
          </View>

          {phase === 'done' ? (
            <View style={styles.doneWrap}>
              <View style={[styles.doneIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <CheckCircle2 size={30} color="#10B981" strokeWidth={2.2} />
              </View>
              <Text style={[styles.doneTitle, { color: colors.textPrimary }]}>
                Raportimi u dërgua
              </Text>
              <Text style={[styles.doneText, { color: colors.textSecondary }]}>
                {successMessage}
              </Text>
              <Pressable
                style={[styles.doneBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}
                onPress={handleDismiss}
              >
                <Text style={[styles.doneBtnText, { color: colors.textPrimary }]}>Mbyll</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.header}>
                <View style={[styles.headerIcon, { backgroundColor: 'rgba(239,68,68,0.10)' }]}>
                  <Flag size={18} color={dangerColor} strokeWidth={2.3} />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    Raporto shpalljen
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {listingTitle ? listingTitle : 'Shpallja'}
                    {listingCity ? ` • ${listingCity}` : ''}
                  </Text>
                </View>
                <Pressable
                  style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                  onPress={handleDismiss}
                  disabled={phase === 'sending'}
                  hitSlop={8}
                >
                  <X size={17} color={colors.textSecondary} strokeWidth={2.4} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  ARSYA E RAPORTIMIT
                </Text>

                {REPORT_REASONS.map((option) => {
                  const Icon = option.icon
                  const active = reason === option.value
                  return (
                    <Pressable
                      key={option.value}
                      disabled={phase === 'sending'}
                      onPress={() => {
                        playTapSound()
                        if (Platform.OS !== 'web') {
                          Haptics.selectionAsync()
                        }
                        setReason(option.value)
                        setErrorMessage(null)
                      }}
                      style={[
                        styles.reasonRow,
                        {
                          backgroundColor: active
                            ? isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#F8FAFC'
                            : colors.surfaceSubtle,
                          borderColor: active ? accent : 'transparent',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.reasonIcon,
                          { backgroundColor: active ? `${option.accent}1F` : 'transparent' },
                        ]}
                      >
                        <Icon
                          size={17}
                          color={active ? option.accent : colors.textMuted}
                          strokeWidth={2.2}
                        />
                      </View>
                      <View style={styles.reasonTextWrap}>
                        <Text style={[styles.reasonLabel, { color: colors.textPrimary }]}>
                          {option.label}
                        </Text>
                        <Text style={[styles.reasonHint, { color: colors.textMuted }]}>
                          {option.hint}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radio,
                          { borderColor: active ? accent : isDark ? 'rgba(255,255,255,0.24)' : '#CBD5E1' },
                        ]}
                      >
                        {active ? <View style={[styles.radioDot, { backgroundColor: accent }]} /> : null}
                      </View>
                    </Pressable>
                  )
                })}

                {/* Note */}
                <Text style={[styles.sectionLabel, styles.noteLabel, { color: colors.textMuted }]}>
                  SHËNIM {noteRequired ? '(I DETYRUESHËM)' : '(OPSIONAL)'}
                </Text>
                <TextInput
                  value={note}
                  onChangeText={(t) => setNote(t.slice(0, MAX_NOTE_LENGTH))}
                  editable={phase !== 'sending'}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder={
                    noteRequired
                      ? 'Përshkruani shkurt çfarë nuk shkon me këtë shpallje…'
                      : 'Shtoni detaje që ndihmojnë moderimin (opsionale)…'
                  }
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.noteInput,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      color: colors.textPrimary,
                      borderColor: noteRequired && note.trim().length > 0 && note.trim().length < MIN_OTHER_NOTE_LENGTH
                        ? dangerColor
                        : 'transparent',
                    },
                  ]}
                />
                <View style={styles.noteFooter}>
                  <Text style={[styles.noteCounter, { color: colors.textMuted }]}>
                    {note.length}/{MAX_NOTE_LENGTH}
                  </Text>
                </View>

                {errorMessage ? (
                  <View style={[styles.errorBox, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <Text style={[styles.footnote, { color: colors.textMuted }]}>
                  Raportet shqyrtohen nga ekipi moderues. Raportimi i rremë i shpalljeve të
                  ligjshme mund të çojë në kufizimin e llogarisë suaj.
                </Text>
              </ScrollView>

              {/* Actions */}
              <View style={[styles.actions, { borderTopColor: colors.border }]}>
                <Pressable
                  style={[styles.cancelBtn, { backgroundColor: colors.surfaceSubtle }]}
                  onPress={handleDismiss}
                  disabled={phase === 'sending'}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Anulo</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: canSubmit ? dangerColor : isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                >
                  {phase === 'sending' ? (
                    <ActivityIndicator size="small" color={canSubmit ? '#FFFFFF' : colors.textMuted} />
                  ) : (
                    <Text
                      style={[
                        styles.submitBtnText,
                        { color: canSubmit ? '#FFFFFF' : colors.textMuted },
                      ]}
                    >
                      Dërgo raportin
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default ReportListingSheet

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  grabberZone: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    paddingBottom: 4,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4.5,
    borderRadius: 999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1, minWidth: 0 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 16.5, letterSpacing: -0.3 },
  headerSubtitle: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 8 },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  noteLabel: { marginTop: 18 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 7,
  },
  reasonIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonTextWrap: { flex: 1, minWidth: 0 },
  reasonLabel: { fontFamily: Fonts.semiBold, fontSize: 13.5, letterSpacing: -0.2 },
  reasonHint: { fontFamily: Fonts.regular, fontSize: 11.5, lineHeight: 15.5, marginTop: 2, opacity: 0.82 },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 9, height: 9, borderRadius: 999 },
  noteInput: {
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: Fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  noteCounter: { fontFamily: Fonts.medium, fontSize: 10.5, fontVariant: ['tabular-nums'] },
  errorBox: {
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { fontFamily: Fonts.medium, fontSize: 12.5, lineHeight: 17, color: '#EF4444' },
  footnote: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
    opacity: 0.85,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    marginTop: 6,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontFamily: Fonts.semiBold, fontSize: 14 },
  submitBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontFamily: Fonts.bold, fontSize: 14, letterSpacing: -0.2 },
  doneWrap: { alignItems: 'center', paddingHorizontal: 26, paddingTop: 18, paddingBottom: 14 },
  doneIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  doneTitle: { fontFamily: Fonts.bold, fontSize: 17, letterSpacing: -0.3 },
  doneText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },
  doneBtn: {
    marginTop: 18,
    height: 44,
    paddingHorizontal: 26,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { fontFamily: Fonts.semiBold, fontSize: 14 },
})
