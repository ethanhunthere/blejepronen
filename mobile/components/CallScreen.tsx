import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Fonts } from '@/constants/theme'
import { getAvatarUri, getAvatarSource } from '@/lib/avatars'
import { callEngine, type CallState } from '@/lib/calling'

/**
 * Full-screen in-app call experience (WhatsApp-grade, Apple-calibrated).
 * Rendered once at the root — overlays every screen when a call is active.
 * Always dark (like iOS Phone / WhatsApp calls) regardless of app theme.
 */

const END_REASONS: Record<string, string> = {
  declined: 'Thirrja u refuzua',
  busy: 'Nuk është i lirë aktualisht',
  timeout: 'Nuk u përgjigjet',
  failed: 'Thirrja dështoi',
  hangup: 'Thirrja përfundoi',
  cancelled: 'Thirrja u anulua',
  unsupported: 'Thirrjet kërkojnë versionin e plotë të aplikacionit',
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function CallScreen() {
  const [state, setState] = useState<CallState>(callEngine.getState())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => callEngine.subscribe(setState), [])

  // Call timer
  useEffect(() => {
    if (state.status !== 'connected' || !state.connectedAt) return
    setElapsed(Date.now() - state.connectedAt)
    const iv = setInterval(() => {
      if (state.connectedAt) setElapsed(Date.now() - state.connectedAt)
    }, 1000)
    return () => clearInterval(iv)
  }, [state.status, state.connectedAt])

  const pulse = useRef(new Animated.Value(1)).current
  const ringing = state.status === 'outgoing' || state.status === 'incoming'
  const connecting = state.status === 'connecting'

  // Hairline ripple ring while ringing — no filled glow halo
  useEffect(() => {
    if (!ringing) {
      pulse.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.07,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [ringing, pulse])

  if (state.status === 'idle' || !state.peer) return null

  const { status, role, peer, muted } = state
  const ended = status === 'ended'

  const statusText =
    status === 'outgoing'
      ? 'Po telefonon…'
      : status === 'incoming'
      ? 'Thirrje hyrëse'
      : connecting
      ? 'Po lidhet…'
      : status === 'connected'
      ? formatDuration(elapsed)
      : END_REASONS[state.endedReason ?? 'hangup'] ?? 'Thirrja përfundoi'

  const accept = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    callEngine.acceptIncoming()
  }
  const decline = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    callEngine.endCall()
  }
  const hangup = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    callEngine.endCall()
  }
  const toggleMute = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    callEngine.toggleMute()
  }

  const showIncomingActions = status === 'incoming'
  const showActiveActions = (status === 'outgoing' || status === 'connecting' || status === 'connected')

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <SafeAreaView style={styles.safe}>
        <View style={styles.backdrop}>
          {/* ── Identity ── */}
          <View style={styles.identity}>
            <Animated.View
              style={[
                styles.avatarRing,
                { transform: [{ scale: pulse }], opacity: ringing ? 0.55 : 0 },
              ]}
            />
            <Image
              source={getAvatarSource(peer.avatarUrl)}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
            />
            <Text style={styles.name} numberOfLines={2}>
              {peer.name}
            </Text>
            <Text style={[styles.status, ended && styles.statusEnded]}>{statusText}</Text>
          </View>

          {/* ── Controls ── */}
          <View style={styles.controls}>
            {showIncomingActions && (
              <>
                <Pressable style={[styles.circle, styles.decline]} onPress={decline}>
                  <PhoneOff size={26} color="#FFFFFF" strokeWidth={2.4} />
                </Pressable>
                <Pressable style={[styles.circle, styles.accept]} onPress={accept}>
                  <Phone size={26} color="#FFFFFF" strokeWidth={2.4} />
                </Pressable>
              </>
            )}

            {showActiveActions && !ended && (
              <>
                <Pressable
                  style={[styles.circle, muted && styles.circleActive]}
                  onPress={toggleMute}
                >
                  {muted ? (
                    <MicOff size={24} color={muted ? '#0A0C0B' : '#FFFFFF'} strokeWidth={2.2} />
                  ) : (
                    <Mic size={24} color="#FFFFFF" strokeWidth={2.2} />
                  )}
                </Pressable>
                <Pressable style={[styles.circle, styles.end]} onPress={hangup}>
                  <PhoneOff size={26} color="#FFFFFF" strokeWidth={2.4} />
                </Pressable>
              </>
            )}
          </View>

          <Text style={styles.brand}>Bleje Pronën · Thirrje në aplikacion</Text>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0C0B',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 64 : 44,
    paddingBottom: 28,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: 18,
  },
  avatarRing: {
    position: 'absolute',
    top: -28,
    width: 216,
    height: 216,
    borderRadius: 108,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  name: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: -0.4,
    paddingHorizontal: 24,
  },
  status: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.medium,
    color: 'rgba(255,255,255,0.66)',
    marginTop: -8,
    letterSpacing: 0.1,
  },
  statusEnded: {
    color: 'rgba(255,255,255,0.5)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 56,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  circleActive: {
    backgroundColor: '#FFFFFF',
  },
  decline: {
    backgroundColor: '#EF4444',
  },
  accept: {
    backgroundColor: '#22C55E',
  },
  end: {
    backgroundColor: '#EF4444',
  },
  brand: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Fonts.medium,
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: 0.4,
  },
})

