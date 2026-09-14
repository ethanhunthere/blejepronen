import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Dimensions,
  Animated,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { BlurView } from 'expo-blur'
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  MessageCircle,
  ShieldCheck,
  User,
  Sparkles,
  CheckCircle2,
  Smartphone,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Fonts } from '@/constants/theme'
import { getAvatarUri } from '@/lib/avatars'
import { playTapSound, playDeleteSound, playSuccessSound } from '@/lib/sound'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export interface CallModalProps {
  visible: boolean
  onClose: () => void
  counterpartName: string
  counterpartAvatar?: string | null
  counterpartPhone?: string | null
  listingTitle?: string | null
  initialCallType?: 'audio' | 'video'
}

export function CallModal({
  visible,
  onClose,
  counterpartName,
  counterpartAvatar,
  counterpartPhone,
  listingTitle,
  initialCallType = 'audio',
}: CallModalProps) {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing')
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaker, setIsSpeaker] = useState(true)
  const [isVideo, setIsVideo] = useState(initialCallType === 'video')
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front')

  // Animations for glowing rings
  const pulseAnim = useRef(new Animated.Value(1)).current
  const timerRef = useRef<any>(null)
  const connectTimeoutRef = useRef<any>(null)

  useEffect(() => {
    if (visible) {
      setCallStatus('ringing')
      setCallDuration(0)
      setIsMuted(false)
      setIsSpeaker(true)
      setIsVideo(initialCallType === 'video')
      setCameraFacing('front')

      // Rhythmic pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start()

      // Haptic ring pulse
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }

      // Automatically connect after 2.4 seconds for realism
      connectTimeoutRef.current = setTimeout(() => {
        setCallStatus('connected')
        playSuccessSound()
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }

        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1)
        }, 1000)
      }, 2400)
    } else {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [visible, initialCallType, pulseAnim])

  const handleEndCall = () => {
    playDeleteSound()
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }
    setCallStatus('ended')
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current)
    if (timerRef.current) clearInterval(timerRef.current)

    setTimeout(() => {
      onClose()
    }, 400)
  }

  const handleToggleMute = () => {
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setIsMuted((prev) => !prev)
  }

  const handleToggleSpeaker = () => {
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setIsSpeaker((prev) => !prev)
  }

  const handleToggleVideo = () => {
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setIsVideo((prev) => !prev)
  }

  const handleFlipCamera = () => {
    playTapSound()
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'))
  }

  const handleDirectCellularCall = () => {
    if (counterpartPhone) {
      if (Platform.OS !== 'web') Haptics.selectionAsync()
      const clean = counterpartPhone.replace(/\s+/g, '')
      Linking.openURL(`tel:${clean}`)
    }
  }

  const handleWhatsAppCall = () => {
    if (counterpartPhone) {
      if (Platform.OS !== 'web') Haptics.selectionAsync()
      const clean = counterpartPhone.replace(/\D/g, '')
      Linking.openURL(`whatsapp://send?phone=${clean}`)
    }
  }

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`
  }

  const avatarUri = getAvatarUri(counterpartAvatar)

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleEndCall}
    >
      <View style={styles.callContainer}>
        {/* Blurred background backdrop with subtle emerald hue */}
        <View style={styles.blurBackdrop}>
          <Image
            source={{ uri: avatarUri }}
            style={StyleSheet.absoluteFill}
            blurRadius={40}
            contentFit="cover"
          />
          <View style={styles.darkOverlay} />
        </View>

        {/* Video Camera Simulated Feed */}
        {isVideo ? (
          <View style={styles.videoStreamContainer}>
            <View style={styles.remoteVideoFeed}>
              <Image
                source={{ uri: avatarUri }}
                style={styles.videoAvatarFull}
                contentFit="cover"
              />
              <View style={styles.videoGradientTop} />
              <View style={styles.videoGradientBottom} />
            </View>

            {/* Self-view Picture in Picture (PiP) */}
            <View style={styles.pipView}>
              <View style={styles.pipInner}>
                <Text style={styles.pipLabel}>Ju ({cameraFacing})</Text>
              </View>
            </View>
          </View>
        ) : (
          /* Audio Call Visuals */
          <View style={styles.audioVisualsArea}>
            {/* Animated Pulsing Rings */}
            <View style={styles.avatarWrapOuter}>
              {callStatus === 'ringing' && (
                <Animated.View
                  style={[
                    styles.pulsingRing,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.25],
                        outputRange: [0.6, 0],
                      }),
                    },
                  ]}
                />
              )}
              <View style={styles.avatarCircleWrap}>
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            </View>

            <View style={styles.secureConnectionBadge}>
              <ShieldCheck size={13} color="#10B981" strokeWidth={2.4} />
              <Text style={styles.secureBadgeText}>
                {callStatus === 'connected' ? 'Enkriptim i Sigurt HD Audio' : 'Bleje Pronën Voice'}
              </Text>
            </View>
          </View>
        )}

        {/* Header Metadata */}
        <View style={styles.metaContainer}>
          <Text style={styles.counterpartName} numberOfLines={1}>
            {counterpartName}
          </Text>

          {listingTitle && (
            <Text style={styles.listingRefText} numberOfLines={1}>
              Për: {listingTitle}
            </Text>
          )}

          <Text style={styles.callStatusText}>
            {callStatus === 'ringing'
              ? 'Duke thirrur...'
              : callStatus === 'connected'
              ? formatCallTime(callDuration)
              : 'Thirrja përfundoi'}
          </Text>
        </View>

        {/* Action Controls Toolbar */}
        <View style={styles.controlsArea}>
          {/* Row 1: Primary in-call toggles (WhatsApp / Apple style) */}
          <View style={styles.buttonsGridRow}>
            {/* Mute Button */}
            <Pressable
              style={[
                styles.toolBtn,
                isMuted && styles.toolBtnActive,
              ]}
              onPress={handleToggleMute}
            >
              {isMuted ? (
                <MicOff size={24} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <Mic size={24} color="#FFFFFF" strokeWidth={2.2} />
              )}
              <Text style={styles.toolBtnLabel}>
                {isMuted ? 'I shurdhër' : 'Mikrofoni'}
              </Text>
            </Pressable>

            {/* Video Camera Toggle */}
            <Pressable
              style={[
                styles.toolBtn,
                isVideo && styles.toolBtnActiveVideo,
              ]}
              onPress={handleToggleVideo}
            >
              {isVideo ? (
                <Video size={24} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <VideoOff size={24} color="#FFFFFF" strokeWidth={2.2} />
              )}
              <Text style={styles.toolBtnLabel}>
                {isVideo ? 'Video Aktive' : 'Kamera'}
              </Text>
            </Pressable>

            {/* Speaker Toggle */}
            <Pressable
              style={[
                styles.toolBtn,
                isSpeaker && styles.toolBtnActiveSpeaker,
              ]}
              onPress={handleToggleSpeaker}
            >
              {isSpeaker ? (
                <Volume2 size={24} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <VolumeX size={24} color="#FFFFFF" strokeWidth={2.2} />
              )}
              <Text style={styles.toolBtnLabel}>Altoparlant</Text>
            </Pressable>

            {/* Camera Flip (if video) */}
            {isVideo && (
              <Pressable
                style={styles.toolBtn}
                onPress={handleFlipCamera}
              >
                <RotateCcw size={22} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.toolBtnLabel}>Kthe</Text>
              </Pressable>
            )}
          </View>

          {/* Row 2: Secondary Quick Fallbacks (GSM / WhatsApp) */}
          {counterpartPhone ? (
            <View style={styles.quickFallbackRow}>
              <Pressable
                style={styles.fallbackPill}
                onPress={handleDirectCellularCall}
              >
                <Smartphone size={15} color="#34D399" strokeWidth={2.2} />
                <Text style={styles.fallbackPillText}>Thirr me GSM</Text>
              </Pressable>

              <Pressable
                style={styles.fallbackPill}
                onPress={handleWhatsAppCall}
              >
                <MessageCircle size={15} color="#22C55E" strokeWidth={2.2} />
                <Text style={styles.fallbackPillText}>WhatsApp</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Row 3: End Call Button (Big Apple Red Button) */}
          <View style={styles.endCallContainer}>
            <Pressable
              style={styles.endCallBtn}
              onPress={handleEndCall}
            >
              <PhoneOff size={32} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  callContainer: {
    flex: 1,
    backgroundColor: '#07100E',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    position: 'relative',
  },
  blurBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 15, 12, 0.88)',
  },
  videoStreamContainer: {
    ...StyleSheet.absoluteFill,
  },
  remoteVideoFeed: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoAvatarFull: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  videoGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(5, 15, 12, 0.65)',
  },
  videoGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: 'rgba(5, 15, 12, 0.85)',
  },
  pipView: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 18,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#0F2620',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  pipInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    backgroundColor: '#0A1C17',
  },
  pipLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  audioVisualsArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  avatarWrapOuter: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulsingRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: '#34D399',
  },
  avatarCircleWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: '#0F2620',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  secureConnectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  secureBadgeText: {
    fontSize: 11.5,
    fontFamily: Fonts.semiBold,
    color: '#34D399',
  },
  metaContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 6,
    zIndex: 10,
  },
  counterpartName: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  listingRefText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
  },
  callStatusText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: '#34D399',
    marginTop: 4,
  },
  controlsArea: {
    paddingHorizontal: 24,
    gap: 20,
    zIndex: 10,
  },
  buttonsGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  toolBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toolBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#EF4444',
  },
  toolBtnActiveVideo: {
    backgroundColor: '#059669',
    borderColor: '#34D399',
  },
  toolBtnActiveSpeaker: {
    backgroundColor: 'rgba(52, 211, 153, 0.25)',
    borderColor: '#34D399',
  },
  toolBtnLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    position: 'absolute',
    bottom: -18,
  },
  quickFallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  fallbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  fallbackPillText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  endCallContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
})
