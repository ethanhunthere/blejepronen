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
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { getSyncAuthUser } from '@/lib/auth-cache'
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
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { createSafeChannel } from '@/lib/realtime'
import { getAvatarUri, getAvatarSource } from '@/lib/avatars'
import { CallModal } from '@/components/CallModal'
import { playTapSound, playSuccessSound } from '@/lib/sound'
import { safeBack } from '@/lib/navigation'

interface MessageItem {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

interface OtherUser {
  id: string
  first_name: string
  last_name: string
  phone?: string | null
  avatar_url?: string | null
  is_agency?: boolean
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
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors, theme } = useTheme()
  const insets = useSafeAreaInsets()

  const syncUser = getSyncAuthUser()
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => syncUser?.id || null)
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [listing, setListing] = useState<ListingPreview | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [inputText, setInputText] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showAttachmentTray, setShowAttachmentTray] = useState(false)

  // Contact Action Sheet State
  const [contactSheetVisible, setContactSheetVisible] = useState(false)

  const flatListRef = useRef<FlatList>(null)

  const loadConversationData = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setCurrentUserId(user.id)

      // 1. Fetch conversation details
      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          listings ( id, title, price, city, type, images ),
          buyer:buyer_id ( id, first_name, last_name, phone, avatar_url ),
          seller:seller_id ( id, first_name, last_name, phone, avatar_url )
        `)
        .eq('id', id)
        .single()

      if (convErr) {
        console.warn('Load conversation error:', convErr.message)
        return
      }

      if (convData) {
        const isBuyer = user.id === convData.buyer_id
        const counterpart: any = isBuyer ? convData.seller : convData.buyer
        if (counterpart) {
          const fullName = `${counterpart.first_name || ''} ${counterpart.last_name || ''}`.trim()
          const isAgency = /agjenci|real estate|invest|patundshm|group|shpk/i.test(fullName)
          setOtherUser({
            id: counterpart.id,
            first_name: counterpart.first_name || (isBuyer ? 'Shitësi' : 'Blerësi'),
            last_name: counterpart.last_name || '',
            phone: counterpart.phone,
            avatar_url: counterpart.avatar_url,
            is_agency: isAgency,
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

      // 2. Fetch messages
      const { data: msgData, error: msgErr } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })

      if (msgErr) {
        console.warn('Fetch messages error:', msgErr.message)
      } else if (msgData) {
        setMessages(msgData)
      }

      // 3. Mark unread messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', id)
        .neq('sender_id', user.id)
    } catch (err: any) {
      console.warn('Error loading conversation:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadConversationData()

    if (!id) return
    let channel: ReturnType<typeof createSafeChannel> | null = null
    try {
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
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })

            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            }

            if (currentUserId && newMsg.sender_id !== currentUserId) {
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMsg.id)
                .then(() => {})
            }
          }
        )
        .subscribe()
    } catch (err) {
      console.warn('Chat realtime notice:', err)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [id, currentUserId, loadConversationData])

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim()
    if (!content || !id || !currentUserId || sending) return

    setInputText('')
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
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      } else if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? (data as MessageItem) : m))
        )
        supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', id)
          .then(() => {})
      }
    } catch (err: any) {
      console.warn('Send exception:', err?.message || err)
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
        await handleSendMessage(`[Foto: ${photoUri}]`)
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
        await handleSendMessage(`[Foto: ${photoUri}]`)
      }
    } catch (e: any) {
      console.warn('Camera capture notice:', e?.message || e)
    }
  }

  // Send Offer Prompt
  const handleSendOfferPrompt = () => {
    setShowAttachmentTray(false)
    if (listing?.price) {
      const discountedPrice = Math.round((listing.price * 0.95) / 1000) * 1000
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

  const renderMessageBubble = ({ item }: { item: MessageItem }) => {
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
            <View style={styles.photoBubbleContainer}>
              <Image
                source={{
                  uri: item.content.replace('[Foto:', '').replace(']', '').trim(),
                }}
                style={styles.bubblePhoto}
                contentFit="cover"
                transition={200}
              />
            </View>
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
  }

  const counterpartAvatar = getAvatarUri(otherUser?.avatar_url)

  const specularBorder =
    theme === 'white'
      ? 'rgba(0, 0, 0, 0.08)'
      : theme === 'green'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(255, 255, 255, 0.10)'

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* 1. Clean Apple iMessage Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            safeBack(router, '/(tabs)/messages')
          }}
          hitSlop={10}
        >
          <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2.2} />
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
            <View style={styles.verifiedRow}>
              {otherUser?.is_agency ? (
                <Building2 size={12} color={colors.primary} strokeWidth={2.4} />
              ) : (
                <ShieldCheck size={12} color={colors.primary} strokeWidth={2.4} />
              )}
              <Text style={[styles.verifiedText, { color: colors.primary }]}>
                {otherUser?.is_agency ? 'Agjenci e Verifikuar' : 'Profil i Verifikuar'}
              </Text>
            </View>
          </View>
        </View>

        {/* Real Contact Action Button in Header */}
        <Pressable
          style={[styles.headerIconBtn, { backgroundColor: colors.surfaceSubtle }]}
          onPress={() => {
            playTapSound()
            if (Platform.OS !== 'web') Haptics.selectionAsync()
            setContactSheetVisible(true)
          }}
          hitSlop={8}
        >
          <Phone size={17} color={colors.primary} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* 2. Listing Quick Banner */}
      {listing && (
        <Pressable
          style={[
            styles.listingBanner,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.selectionAsync()
            router.push(`/listings/${listing.id}` as any)
          }}
        >
          <Image
            source={{
              uri:
                listing.images?.[0] ||
                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
            }}
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
      )}

      {/* 3. Messages List Area */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
      <Modal
        visible={showAttachmentTray}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachmentTray(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAttachmentTray(false)}
        >
          <View
            style={[
              styles.attachmentSheet,
              {
                backgroundColor: colors.surface,
                borderColor: specularBorder,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
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
          </View>
        </Pressable>
      </Modal>

      {/* Apple iOS 18 Contact Action Sheet */}
      <CallModal
        visible={contactSheetVisible}
        onClose={() => setContactSheetVisible(false)}
        counterpartName={otherUser ? `${otherUser.first_name} ${otherUser.last_name}`.trim() : 'Bisedë'}
        counterpartAvatar={otherUser?.avatar_url}
        counterpartPhone={otherUser?.phone}
        listingTitle={listing?.title}
        counterpartUserId={otherUser?.id ?? null}
        conversationId={id}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    padding: 4,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
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
    height: 160,
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
