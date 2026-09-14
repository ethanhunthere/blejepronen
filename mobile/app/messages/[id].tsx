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
  Linking,
  ScrollView,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import {
  ArrowLeft,
  Phone,
  Send,
  ShieldCheck,
  CheckCheck,
  Check,
  Building2,
  ExternalLink,
  Sparkles,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [listing, setListing] = useState<ListingPreview | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

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
        // Determine whether current user is buyer or seller
        const isBuyer = user.id === convData.buyer_id
        const counterpart: any = isBuyer ? convData.seller : convData.buyer
        if (counterpart) {
          setOtherUser({
            id: counterpart.id,
            first_name: counterpart.first_name || (isBuyer ? 'Shitësi' : 'Blerësi'),
            last_name: counterpart.last_name || '',
            phone: counterpart.phone,
            avatar_url: counterpart.avatar_url,
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

    // Subscribe to realtime messages for this conversation
    if (!id) return
    const channel = supabase
      .channel(`chat_${id}`)
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
            // Avoid duplicate if optimistically added
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })

          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          }

          // Mark as read if received from other
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, currentUserId, loadConversationData])

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim()
    if (!content || !id || !currentUserId || sending) return

    setInputText('')
    setSending(true)
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
    }, 80)

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
        // Rollback optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      } else if (data) {
        // Replace temp optimistic message with real message
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? (data as MessageItem) : m))
        )
        // Touch conversation updated_at
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

  const handleCall = () => {
    if (otherUser?.phone) {
      Linking.openURL(`tel:${otherUser.phone}`)
    }
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
    const bubbleBg = isMine
      ? theme === 'green'
        ? colors.gold
        : colors.primary
      : colors.surface
    const textColor = isMine
      ? theme === 'green'
        ? '#003E37'
        : '#FFFFFF'
      : colors.textPrimary
    const metaColor = isMine
      ? theme === 'green'
        ? '#004D40'
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
          <Text style={[styles.messageText, { color: textColor }]}>{item.content}</Text>
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header Bar */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.selectionAsync()
            router.back()
          }}
          hitSlop={12}
        >
          <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.headerProfile}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {otherUser ? (otherUser.first_name[0] || 'U').toUpperCase() : 'U'}
            </Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {otherUser ? `${otherUser.first_name} ${otherUser.last_name}`.trim() : 'Bisedë'}
            </Text>
            <View style={styles.verifiedRow}>
              <ShieldCheck size={12} color={colors.primary} strokeWidth={2.4} />
              <Text style={[styles.verifiedText, { color: colors.primary }]}>Përdorues i Verifikuar</Text>
            </View>
          </View>
        </View>

        {otherUser?.phone ? (
          <Pressable
            style={[styles.callHeaderBtn, { backgroundColor: colors.primaryLight }]}
            onPress={handleCall}
            hitSlop={8}
          >
            <Phone size={18} color={colors.primary} strokeWidth={2.2} />
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
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
          <ExternalLink size={16} color={colors.textLight} />
        </Pressable>
      )}

      {/* 3. Messages List */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Duke ngarkuar mesazhet...</Text>
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
                  <Building2 size={28} color={colors.primary} />
                </View>
                <Text style={[styles.emptyChatTitle, { color: colors.textPrimary }]}>Filloni bisedën</Text>
                <Text style={[styles.emptyChatDesc, { color: colors.textMuted }]}>
                  Dërgoni një pyetje shitësit ose përdorni përgjigjet e shpejta më poshtë.
                </Text>
              </View>
            }
          />
        )}

        {/* 4. Quick Replies Carousel */}
        <View style={[styles.quickRepliesContainer, { borderTopColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesList}>
            {QUICK_REPLIES.map((text, idx) => (
              <Pressable
                key={idx}
                style={[
                  styles.quickReplyChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => handleSendMessage(text)}
              >
                <Sparkles size={12} color={colors.primary} />
                <Text style={[styles.quickReplyText, { color: colors.textPrimary }]}>{text}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 5. Input Composer Bar */}
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
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholder="Shkruaj një mesazh..."
            placeholderTextColor={colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />

          <Pressable
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputText.trim()
                  ? theme === 'green'
                    ? colors.gold
                    : colors.primary
                  : colors.surfaceHighlight,
              },
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send
                size={18}
                color={
                  inputText.trim()
                    ? theme === 'green'
                      ? '#003E37'
                      : '#FFFFFF'
                    : colors.textLight
                }
                strokeWidth={2.4}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: Fonts.extraBold,
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
  callHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  },
  listingThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
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
  chatArea: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
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
    paddingVertical: 10,
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
  emptyMessages: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyChatTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  emptyChatDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  quickRepliesContainer: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickRepliesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickReplyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickReplyText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
