import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  Alert,
  StatusBar as NativeStatusBar,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Image } from 'expo-image'
import { getSyncAuthUser } from '@/lib/auth-cache'
import { openLoginScreen } from '@/lib/navigation'
import {
  ArrowLeft,
  Phone,
  Send,
  ShieldCheck,
  CheckCheck,
  Check,
  Building2,
  ExternalLink,
  Plus,
  Camera,
  Image as ImageIcon,
  DollarSign,
  Calendar,
  X,
  MessageCircle,
  ChevronUp,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { apiResolveContacts } from '@/lib/api'
import { createSafeChannel } from '@/lib/realtime'
import {
  CHAT_PAGE_SIZE,
  createReadReceiptFlusher,
  fetchLatestMessages,
  fetchOlderMessages,
  type ChatMessage,
} from '@/lib/chat'
import { markConversationReadLocally, noteOutgoingMessage } from '@/lib/conversations'
import { setOpenConversation } from '@/lib/notifications'
import { getAvatarUri, getAvatarSource } from '@/lib/avatars'
import { CallModal } from '@/components/CallModal'
import { MediaLightbox } from '@/components/MediaLightbox'
import * as ImageManipulator from 'expo-image-manipulator'
import { thumbImageSource } from '@/lib/image-transform'
import { DraggableBottomSheet } from '@/components/motion'
import { playTapSound, playSuccessSound } from '@/lib/sound'
import { safeBack } from '@/lib/navigation'

/** A single row of the thread — see lib/chat.ts for the paging contract. */
type MessageItem = ChatMessage

interface OtherUser {
  id: string
  first_name: string
  last_name: string
  phone?: string | null
  avatar_url?: string | null
  is_agency?: boolean
  email_verified?: boolean
}

interface ListingPreview {
  id: string
  title: string
  price: number
  city: string
  type: string
  images: string[]
}

const QUICK_REPLIES = [
  'A është prona ende e lirë?',
  'A mund ta vizitoj sot?',
  'A ka fleksibilitet çmimi?',
  'A janë dokumentet në rregull?',
  'A mund të më dërgoni më shumë foto?',
]

export default function ChatConversationScreen() {
  const { id, initialText } = useLocalSearchParams<{ id: string; initialText?: string }>()
  const router = useRouter()
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()

  // Dynamic native status bar contrast & background sync with zero flicker
  const statusBarStyle = theme === 'white' ? 'dark' : 'light'

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        NativeStatusBar.setBackgroundColor(colors.surface, false)
        NativeStatusBar.setBarStyle(theme === 'white' ? 'dark-content' : 'light-content', false)
      }
      return () => {
        if (Platform.OS === 'android') {
          NativeStatusBar.setBackgroundColor(colors.background, false)
          NativeStatusBar.setBarStyle(theme === 'white' ? 'dark-content' : 'light-content', false)
        }
      }
    }, [colors.surface, colors.background, theme])
  )

  const syncUser = getSyncAuthUser()
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => syncUser?.id || null)
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [listing, setListing] = useState<ListingPreview | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [inputText, setInputText] = useState(initialText || '')

  // Re-pushing the route with initialText (e.g. from a listing quick-query) must
  // prefill an already-mounted conversation, not only the first mount.
  useEffect(() => {
    if (initialText) setInputText(initialText)
  }, [initialText])
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [showAttachmentTray, setShowAttachmentTray] = useState(false)

  // ── History paging (audit §4.1) ────────────────────────────────────
  // Only the newest CHAT_PAGE_SIZE messages are ever in memory; older windows
  // are walked backwards on demand from the top of the list.
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  /** `created_at` of the oldest loaded row — the keyset cursor. */
  const cursorRef = useRef<string | null>(null)
  /** Ids already rendered, so the `.lte` cursor probe cannot duplicate rows. */
  const knownIdsRef = useRef<Set<string>>(new Set())
  const loadingOlderRef = useRef(false)

  // Contact Action Sheet State
  const [contactSheetVisible, setContactSheetVisible] = useState(false)

  const flatListRef = useRef<FlatList>(null)
  const isMountedRef = useRef(true)
  const nearBottomRef = useRef(true)
  /**
   * Mirror of currentUserId for the realtime effect, so that effect can depend
   * on `id` alone. Depending on currentUserId rebuilt the channel (leave+join)
   * every time the auth user resolved, which is exactly the listener churn
   * audit §4.4 calls out.
   */
  const currentUserIdRef = useRef<string | null>(currentUserId)
  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  /**
   * One batched read-receipt writer per conversation. Every "there are unread
   * inbound messages here" signal — the initial open and each realtime INSERT —
   * funnels through it and becomes a single coalesced bulk UPDATE.
   */
  const readFlusherRef = useRef<ReturnType<typeof createReadReceiptFlusher> | null>(null)
  useEffect(() => {
    if (!id) return
    const flusher = createReadReceiptFlusher(id, () => currentUserIdRef.current)
    readFlusherRef.current = flusher
    return () => {
      // Persist anything still pending, then release. Losing the final batch
      // would leave a stale unread badge on the list.
      flusher.flush()
      if (readFlusherRef.current === flusher) readFlusherRef.current = null
    }
  }, [id])

  /**
   * Foreground push suppression (audit §4.6): while this thread is the visible
   * conversation, a banner for its own incoming messages is pure noise — the row
   * is already appending live over realtime. Cleared on unmount so pushes for
   * this thread resume the moment the user leaves.
   */
  useEffect(() => {
    if (!id) return
    setOpenConversation(id)
    return () => setOpenConversation(null)
  }, [id])

  const loadConversationData = useCallback(async () => {
    if (!id) return
    try {
      if (isMountedRef.current) setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!isMountedRef.current) return

      if (!user) {
        setLoading(false)
        openLoginScreen(router, { redirectTo: `/messages/${id}` })
        return
      }

      // Stable identity: avoids tearing down/rebuilding the realtime channel
      // once per conversation open when the id was already synced.
      setCurrentUserId((prev) => (prev === user.id ? prev : user.id))

      // 1. Fetch conversation details
      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          listings ( id, title, price, city, type, images )
        `)
        .eq('id', id)
        .single()

      if (!isMountedRef.current) return

      if (convErr) {
        console.warn('Load conversation error:', convErr.message)
        return
      }

      if (convData && isMountedRef.current) {
        const isBuyer = user.id === convData.buyer_id
        const counterpartId: string | undefined = isBuyer
          ? convData.seller_id
          : convData.buyer_id

        let counterpart: any = null
        if (counterpartId) {
          // Identity from profiles_public (RLS-safe for other users); phone
          // resolves through the gated web route (profiles is owner-only).
          const [pubRes, session] = await Promise.all([
            supabase
              .from('profiles_public')
              .select('id, first_name, last_name, avatar_url, email_verified')
              .eq('id', counterpartId)
              .maybeSingle(),
            supabase.auth.getSession(),
          ])
          if (!isMountedRef.current) return
          const pub = pubRes.data
          const contacts = await apiResolveContacts(
            session.data.session?.access_token ?? null,
            `userId=${encodeURIComponent(counterpartId)}`
          )
          if (!isMountedRef.current) return
          const priv = contacts?.phone ? { phone: contacts.phone } : null
          if (pub) {
            counterpart = {
              id: pub.id,
              first_name: pub.first_name,
              last_name: pub.last_name,
              avatar_url: pub.avatar_url,
              email_verified: pub.email_verified,
              phone: priv?.phone ?? null,
            }
          }
        }

        if (counterpart) {
          const fullName = `${counterpart.first_name || ''} ${counterpart.last_name || ''}`.trim()
          const emailVerified = Boolean(counterpart.email_verified)
          // Name-token agency detection only on verified accounts.
          const isAgency =
            emailVerified && /agjenci|real estate|invest|patundshm|group|shpk/i.test(fullName)
          setOtherUser({
            id: counterpart.id,
            first_name: counterpart.first_name || (isBuyer ? 'Shitësi' : 'Blerësi'),
            last_name: counterpart.last_name || '',
            phone: counterpart.phone,
            avatar_url: counterpart.avatar_url,
            is_agency: isAgency,
            email_verified: emailVerified,
          })
        }

        if (convData.listings) {
          const l: any = convData.listings
          setListing({
            id: l.id,
            title: l.title || 'Pronë në Bleje Pronën',
            price: l.price || 0,
            city: l.city || 'Kosovë',
            type: l.type || 'shitje',
            images: Array.isArray(l.images) && l.images.length > 0 ? l.images : [],
          })
        }
      }

      // 2. Fetch ONLY the newest window of history (audit §4.1). This used to be
      //    `select('*').order('created_at')` with no limit — a full download of
      //    the thread on every open, growing without bound with its length.
      const page = await fetchLatestMessages(id, CHAT_PAGE_SIZE)

      if (!isMountedRef.current) return

      knownIdsRef.current = new Set(page.messages.map((m) => m.id))
      cursorRef.current = page.cursor
      setHasMoreHistory(page.hasMore)
      setMessages(page.messages)

      // 3. Clear unread through the batched flusher: ONE coalesced bulk update
      //    per burst, never one write per message (audit §4.3). The badge is
      //    zeroed locally first so the list/tab react without waiting on it.
      markConversationReadLocally(id)
      readFlusherRef.current?.markSeen()
    } catch (err: any) {
      console.warn('Error loading conversation:', err?.message || err)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [id])

  useEffect(() => {
    loadConversationData()

    if (!id) return

    let channel: ReturnType<typeof createSafeChannel> | null = null
    try {
      // ONE channel for this screen carrying every filter it needs (audit §4.4),
      // instead of one channel per concern:
      //   • INSERT → append the new row live
      //   • UPDATE → read receipts, so our own ✓ flips to ✓✓ with no refetch
      // Both are scoped to this conversation server-side.
      channel = createSafeChannel(`chat_${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${id}`,
          },
          (payload) => {
            const newMsg = payload.new as MessageItem
            if (!newMsg?.id) return

            knownIdsRef.current.add(newMsg.id)
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })

            // Our own insert echoes back — nothing to acknowledge.
            if (newMsg.sender_id === currentUserIdRef.current) return

            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
            }
            // Coalesced: a 20-message burst produces ONE bulk `is_read` write
            // 250ms after the last event, not 20 individual updates.
            markConversationReadLocally(id)
            readFlusherRef.current?.markSeen()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${id}`,
          },
          (payload) => {
            const updated = payload.new as Partial<MessageItem> | undefined
            if (!updated?.id) return
            const isRead = !!updated.is_read
            setMessages((prev) => {
              // Returning `prev` unchanged is what stops our own bulk read
              // receipt from re-rendering the list once per row.
              let changed = false
              const next = prev.map((m) => {
                if (m.id !== updated.id || m.is_read === isRead) return m
                changed = true
                return { ...m, is_read: isRead }
              })
              return changed ? next : prev
            })
          }
        )
        .subscribe()
    } catch (err) {
      console.warn('Chat realtime notice:', err)
    }

    return () => {
      // Deterministic teardown — no listener survives navigation away.
      if (channel) supabase.removeChannel(channel)
      channel = null
    }
    // Depends on `id` only: currentUserId is read through a ref so resolving the
    // auth user no longer tears down and rebuilds the channel.
  }, [id, loadConversationData])

  /** Walk one 30-row window backwards from the top of the thread. */
  const loadOlderMessages = useCallback(async () => {
    if (!id || loadingOlderRef.current || !hasMoreHistory || !cursorRef.current) return
    loadingOlderRef.current = true
    setLoadingOlder(true)
    try {
      const page = await fetchOlderMessages(
        id,
        cursorRef.current,
        knownIdsRef.current,
        CHAT_PAGE_SIZE
      )
      if (!isMountedRef.current) return

      if (page.messages.length > 0) {
        for (const m of page.messages) knownIdsRef.current.add(m.id)
        cursorRef.current = page.cursor
        setMessages((prev) => [...page.messages, ...prev])
      } else if (page.cursor && page.cursor !== cursorRef.current) {
        // Whole window was rows we already had — advance the cursor so the next
        // tap continues the walk instead of stalling.
        cursorRef.current = page.cursor
      }
      setHasMoreHistory(page.hasMore && page.messages.length > 0)
    } catch (err: any) {
      console.warn('Load older messages notice:', err?.message || err)
    } finally {
      loadingOlderRef.current = false
      if (isMountedRef.current) setLoadingOlder(false)
    }
  }, [id, hasMoreHistory])

  const sendContent = async (content: string) => {
    if (!id || !currentUserId) return

    setSending(true)
    playTapSound()
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }

    const optimisticId = `temp-${Date.now()}`
    const optimisticMsg: MessageItem = {
      id: optimisticId,
      conversation_id: id,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
    }

    nearBottomRef.current = true
    knownIdsRef.current.add(optimisticId)
    setMessages((prev) => [...prev, optimisticMsg])
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 60)

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: id,
          sender_id: currentUserId,
          content,
          is_read: false,
        })
        .select()
        .single()

      if (error) {
        console.warn('Error sending message:', error.message)
        knownIdsRef.current.delete(optimisticId)
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      } else if (data) {
        knownIdsRef.current.delete(optimisticId)
        knownIdsRef.current.add((data as MessageItem).id)
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? (data as MessageItem) : m))
        )
        // Update the conversation list optimistically so its preview and order
        // reflect the reply immediately; the store's own coalesced reload
        // converges on the server truth a moment later.
        noteOutgoingMessage(id, content, currentUserId)
        supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', id)
          .then(
            () => {},
            (e: unknown) => console.warn('Update convo notice:', e)
          )
      }
    } catch (err: any) {
      console.warn('Send exception:', err?.message || err)
      knownIdsRef.current.delete(optimisticId)
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
    } finally {
      setSending(false)
    }
  }

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim()
    if (!content || !id || !currentUserId || sending) return

    setInputText('')
    await sendContent(content)
  }

  // Uploads a local photo into the sender's own folder of the public listings
  // bucket and sends its public URL, so the recipient renders a reachable image
  // instead of the sender's private file:// path.
  const uploadAndSendPhoto = async (uri: string) => {
    if (!id || !currentUserId || sending) return
    setSending(true)
    try {
      const path = `${currentUserId}/messages/${id}/${Date.now()}.jpg`
      // Compress client-side before upload — a 12MP capture must never go
      // to storage (or JS memory) at full size.
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      )
      const blob = await fetch(manipulated.uri).then((r) => r.blob())
      const { error } = await supabase.storage
        .from('listings')
        .upload(path, blob, { contentType: 'image/jpeg' })
      if (error) {
        Alert.alert('Vërejtje', 'Ngarkimi i fotos dështoi: ' + error.message)
        return
      }
      const { data: urlData } = supabase.storage.from('listings').getPublicUrl(path)
      await sendContent(`[Foto: ${urlData.publicUrl}]`)
    } catch (e: any) {
      console.warn('Photo upload notice:', e?.message || e)
      Alert.alert('Vërejtje', 'Ngarkimi i fotos dështoi. Provoni përsëri.')
    } finally {
      setSending(false)
    }
  }

  // Pick Image from Gallery
  const handlePickImage = async () => {
    setShowAttachmentTray(false)
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Leje e nevojshme', 'Ju lutemi lejoni aksesin tek fotot për të dërguar imazhe.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photoUri = result.assets[0].uri
        await uploadAndSendPhoto(photoUri)
      }
    } catch (e: any) {
      console.warn('Image picker notice:', e?.message || e)
    }
  }

  // Capture Photo with Camera
  const handleTakePhoto = async () => {
    setShowAttachmentTray(false)
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Leje e nevojshme', 'Ju lutemi lejoni aksesin tek kamera për të bërë foto.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photoUri = result.assets[0].uri
        await uploadAndSendPhoto(photoUri)
      }
    } catch (e: any) {
      console.warn('Camera capture notice:', e?.message || e)
    }
  }

  // Send Offer Prompt
  const handleSendOfferPrompt = () => {
    setShowAttachmentTray(false)
    if (listing?.price) {
      const step = listing.price >= 10000 ? 1000 : 50
      const discountedPrice = Math.round((listing.price * 0.95) / step) * step
      handleSendMessage(
        `💶 Ofertë: Dëshiroj të propozoj çmimin prej ${new Intl.NumberFormat('de-DE').format(discountedPrice)} € për këtë pronë. A keni hapësirë për marrëveshje?`
      )
    } else {
      handleSendMessage('💶 Dëshiroj të bëj një ofertë çmimi për këtë pronë. A mund të diskutojmë?')
    }
  }

  // Send Tour Request
  const handleSendTourRequest = () => {
    setShowAttachmentTray(false)
    handleSendMessage(
      '📅 Përshëndetje! Dëshiroj të caktojmë një termin për vizitë në pronë gjatë këtyre ditëve. Në cilën orë jeni të lirë?'
    )
  }

  const formatPrice = (val?: number) => {
    if (!val) return '0 €'
    return new Intl.NumberFormat('de-DE').format(val) + ' €'
  }

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const renderMessageBubble = useCallback(
    ({ item }: { item: MessageItem }) => {
      const isMine = item.sender_id === currentUserId
      const isPhoto = item.content.startsWith('[Foto:')

      const bubbleBg = isMine
        ? theme === 'green'
          ? colors.gold
          : colors.primary
        : colors.surface
      const textColor = isMine
        ? theme === 'green'
          ? '#071C18'
          : '#FFFFFF'
        : colors.textPrimary
      const metaColor = isMine
        ? theme === 'green'
          ? 'rgba(7, 28, 24, 0.75)'
          : 'rgba(255, 255, 255, 0.75)'
        : colors.textMuted

      return (
        <View
          style={[
            styles.bubbleWrapper,
            isMine ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
          ]}
        >
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: bubbleBg,
                borderColor: isMine ? 'transparent' : colors.border,
              },
              isMine ? styles.bubbleMine : styles.bubbleOther,
            ]}
          >
            {isPhoto ? (
              <Pressable
                onPress={() => {
                  setLightboxPhoto(item.content.replace('[Foto:', '').replace(']', '').trim())
                }}
                accessibilityRole="imagebutton"
                accessibilityLabel="Hap foton me madhësi të plotë"
                style={styles.photoBubbleContainer}
              >
                <Image
                  source={{
                    uri: thumbImageSource(item.content.replace('[Foto:', '').replace(']', '').trim()) as string,
                  }}
                  style={styles.bubblePhoto}
                  contentFit="cover"
                  transition={200}
                />
              </Pressable>
            ) : (
              <Text style={[styles.messageText, { color: textColor }]}>{item.content}</Text>
            )}

            <View style={styles.bubbleFooter}>
              <Text style={[styles.timeText, { color: metaColor }]}>
                {formatTime(item.created_at)}
              </Text>
              {isMine && (
                item.is_read ? (
                  <CheckCheck size={14} color={metaColor} strokeWidth={2.4} />
                ) : (
                  <Check size={14} color={metaColor} strokeWidth={2.4} />
                )
              )}
            </View>
          </View>
        </View>
      )
    },
    [currentUserId, theme, colors]
  )

  const counterpartAvatar = getAvatarUri(otherUser?.avatar_url)

  const specularBorder =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.08)'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(255, 255, 255, 0.10)'

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <StatusBar style={statusBarStyle} animated={false} />
      {Platform.OS === 'android' && (
        <NativeStatusBar
          backgroundColor={colors.surface}
          barStyle={theme === 'white' ? 'dark-content' : 'light-content'}
          animated={false}
        />
      )}

      {/* 1. Unified Edge-to-Edge Safe Area & Header */}
      <View
        style={[
          styles.headerWrapper,
          {
            backgroundColor: colors.surface,
            paddingTop: insets.top,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              playTapSound()
              safeBack(router, '/(tabs)/messages')
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Kthehu prapa"
          >
            <ArrowLeft size={19} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.headerProfile}>
            <Image
              source={getAvatarSource(otherUser?.avatar_url)}
              style={styles.headerAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
            />

            <View style={styles.headerInfo}>
              <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>
                {otherUser ? `${otherUser.first_name} ${otherUser.last_name}`.trim() : 'Bisedë'}
              </Text>
              {otherUser?.email_verified ? (
                <View style={styles.verifiedRow}>
                  {otherUser?.is_agency ? (
                    <Building2 size={12} color={colors.primary} strokeWidth={2.4} />
                  ) : (
                    <ShieldCheck size={12} color={colors.primary} strokeWidth={2.4} />
                  )}
                  <Text style={[styles.verifiedText, { color: colors.primary }]}>
                    {otherUser?.is_agency ? 'Agjenci e Konfirmuar' : 'Profil i Konfirmuar'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Real Contact Action Button in Header */}
          <Pressable
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              playTapSound()
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              setContactSheetVisible(true)
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Kontakto në telefon"
          >
            <Phone size={17} color={colors.primary} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {/* 2. Listing Quick Banner */}
      {listing && (
        <View
          style={[
            styles.listingBannerWrapper,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <Pressable
            style={styles.listingBannerContent}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              router.push(`/listings/${listing.id}` as any)
            }}
          >
            <Image
              source={
                listing.images?.[0]
                  ? { uri: listing.images[0] }
                  : require('@/assets/images/logo-icon.png')
              }
              style={styles.listingThumb}
              contentFit="cover"
            />
            <View style={styles.listingDetails}>
              <Text style={[styles.listingTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {listing.title}
              </Text>
              <View style={styles.listingSubRow}>
                <Text
                  style={[
                    styles.listingPrice,
                    { color: theme === 'green' ? colors.gold : colors.primary },
                  ]}
                >
                  {formatPrice(listing.price)}
                </Text>
                <Text style={[styles.listingCity, { color: colors.textMuted }]}>• {listing.city}</Text>
              </View>
            </View>
            <View style={[styles.listingViewPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.listingViewPillText, { color: colors.primary }]}>Shiko</Text>
              <ExternalLink size={12} color={colors.primary} />
            </View>
          </Pressable>
        </View>
      )}

      {/* 3. Messages List Area */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Duke ngarkuar mesazhet...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessageBubble}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent
              nearBottomRef.current =
                contentOffset.y + layoutMeasurement.height >= contentSize.height - 80
            }}
            scrollEventThrottle={200}
            onContentSizeChange={() => {
              if (nearBottomRef.current) flatListRef.current?.scrollToEnd({ animated: false })
            }}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              hasMoreHistory ? (
                <Pressable
                  onPress={() => void loadOlderMessages()}
                  disabled={loadingOlder}
                  accessibilityRole="button"
                  accessibilityLabel="Ngarko mesazhet më të vjetra"
                  style={[styles.loadOlderBtn, { borderColor: colors.border }]}
                >
                  {loadingOlder ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.loadOlderText, { color: colors.primary }]}>
                      Ngarko mesazhet më të vjetra
                    </Text>
                  )}
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Building2 size={26} color={colors.primary} />
                </View>
                <Text style={[styles.emptyChatTitle, { color: colors.textPrimary }]}>
                  Filloni bisedën me shitësin
                </Text>
                <Text style={[styles.emptyChatDesc, { color: colors.textMuted }]}>
                  Bëni pyetje rreth pronës, çmimit, dokumentacionit ose caktoni një takim direkt.
                </Text>
              </View>
            }
          />
        )}

        {/* 4. Quick Replies Carousel */}
        <View style={[styles.quickRepliesContainer, { borderTopColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesList}
          >
            {QUICK_REPLIES.map((text, idx) => (
              <Pressable
                key={idx}
                style={[
                  styles.quickReplyChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => handleSendMessage(text)}
              >
                <Text style={[styles.quickReplyText, { color: colors.textPrimary }]}>{text}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 5. Clean Input Composer Bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Attachment Toggle (+) */}
          <Pressable
            style={[styles.attachBtn, { backgroundColor: colors.surfaceSubtle }]}
            onPress={() => {
              playTapSound()
              if (Platform.OS !== 'web') Haptics.selectionAsync()
              setShowAttachmentTray(true)
            }}
            hitSlop={6}
          >
            <Plus size={20} color={colors.primary} strokeWidth={2.4} />
          </Pressable>

          {/* Text Input */}
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: isInputFocused
                  ? theme === 'green'
                    ? colors.gold
                    : colors.primary
                  : colors.border,
                borderWidth: isInputFocused ? 1.5 : 1,
                color: colors.textPrimary,
              },
            ]}
            placeholder="Shkruaj një mesazh..."
            placeholderTextColor={colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            multiline
            maxLength={1000}
          />

          {/* Send Button */}
          <Pressable
            style={[
              styles.actionBtn,
              {
                backgroundColor: inputText.trim()
                  ? theme === 'green'
                    ? colors.gold
                    : colors.primary
                  : colors.surfaceSubtle,
              },
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || sending}
            hitSlop={8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send
                size={17}
                color={
                  inputText.trim()
                    ? theme === 'green'
                      ? '#071C18'
                      : '#FFFFFF'
                    : colors.textLight
                }
                strokeWidth={2.4}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Sheet Modal */}
      <DraggableBottomSheet
        visible={showAttachmentTray}
        onClose={() => setShowAttachmentTray(false)}
        sheetStyle={{ borderColor: specularBorder }}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
            Dërgo Shtesë në Bisedë
          </Text>
          <Pressable
            onPress={() => setShowAttachmentTray(false)}
            style={styles.closeSheetBtn}
          >
            <X size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.sheetGrid}>
          <Pressable style={styles.sheetOption} onPress={handleTakePhoto}>
            <View style={[styles.sheetOptionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Camera size={22} color="#3B82F6" strokeWidth={2.2} />
            </View>
            <Text style={[styles.sheetOptionLabel, { color: colors.textPrimary }]}>Kamerë</Text>
          </Pressable>

          <Pressable style={styles.sheetOption} onPress={handlePickImage}>
            <View style={[styles.sheetOptionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <ImageIcon size={22} color="#10B981" strokeWidth={2.2} />
            </View>
            <Text style={[styles.sheetOptionLabel, { color: colors.textPrimary }]}>Galeri</Text>
          </Pressable>

          <Pressable style={styles.sheetOption} onPress={handleSendOfferPrompt}>
            <View style={[styles.sheetOptionIcon, { backgroundColor: 'rgba(234, 179, 8, 0.12)' }]}>
              <DollarSign size={22} color="#EAB308" strokeWidth={2.2} />
            </View>
            <Text style={[styles.sheetOptionLabel, { color: colors.textPrimary }]}>Ofertë</Text>
          </Pressable>

          <Pressable style={styles.sheetOption} onPress={handleSendTourRequest}>
            <View style={[styles.sheetOptionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
              <Calendar size={22} color="#A855F7" strokeWidth={2.2} />
            </View>
            <Text style={[styles.sheetOptionLabel, { color: colors.textPrimary }]}>Vizitë</Text>
          </Pressable>
        </View>
      </DraggableBottomSheet>

      {/* Apple iOS 18 Contact Action Sheet */}
      {lightboxPhoto ? (
        <MediaLightbox
          images={[lightboxPhoto]}
          visible={Boolean(lightboxPhoto)}
          initialIndex={0}
          onClose={() => setLightboxPhoto(null)}
        />
      ) : null}

      <CallModal
        visible={contactSheetVisible}
        onClose={() => setContactSheetVisible(false)}
        counterpartName={otherUser ? `${otherUser.first_name} ${otherUser.last_name}`.trim() : 'Bisedë'}
        counterpartAvatar={otherUser?.avatar_url}
        counterpartPhone={otherUser?.phone}
        listingTitle={listing?.title}
        counterpartUserId={otherUser?.id ?? null}
        conversationId={id}
        counterpartEmailVerified={
          typeof otherUser?.email_verified === 'boolean' ? otherUser.email_verified : undefined
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  loadOlderBtn: {
    alignSelf: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadOlderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  screenContainer: {
    flex: 1,
  },
  headerWrapper: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingBannerWrapper: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listingBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  listingThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  listingDetails: {
    flex: 1,
    gap: 2,
  },
  listingTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  listingSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listingPrice: {
    fontSize: 13,
    fontFamily: Fonts.extraBold,
  },
  listingCity: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  listingViewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  listingViewPillText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  chatArea: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  messagesList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyChatTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  emptyChatDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  bubbleWrapper: {
    width: '100%',
    flexDirection: 'row',
  },
  bubbleWrapperRight: {
    justifyContent: 'flex-end',
  },
  bubbleWrapperLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 10,
    fontFamily: Fonts.medium,
  },
  photoBubbleContainer: {
    width: 220,
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 2,
  },
  bubblePhoto: {
    width: '100%',
    height: '100%',
  },
  quickRepliesContainer: {
    borderTopWidth: 1,
    paddingVertical: 8,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  quickRepliesList: {
    paddingHorizontal: 14,
    gap: 8,
  },
  quickReplyChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickReplyText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  attachmentSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  closeSheetBtn: {
    padding: 4,
  },
  sheetGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  sheetOption: {
    alignItems: 'center',
    gap: 8,
  },
  sheetOptionIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
})
