import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import {
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  LogIn,
  UserPlus,
  Lock,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

interface ConversationItem {
  id: string
  listing_id: string
  listing_title?: string
  listing_image?: string
  seller_name?: string
  last_message?: string
  last_time?: string
  unread_count?: number
}

export default function MessagesScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadConversations = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setCurrentUser(user || null)

      if (!user) {
        setConversations([])
        return
      }

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          listings(id, title, images),
          buyer:buyer_id(id, first_name, last_name),
          seller:seller_id(id, first_name, last_name),
          messages(id, content, sender_id, created_at, is_read)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (error) {
        console.warn('Conversations notice:', error.message)
      } else if (data) {
        const mapped: ConversationItem[] = data.map((c: any) => {
          const isBuyer = user.id === c.buyer_id
          const counterpart = isBuyer ? c.seller : c.buyer
          const counterpartName = counterpart
            ? `${counterpart.first_name || ''} ${counterpart.last_name || ''}`.trim() || (isBuyer ? 'Shitësi' : 'Blerësi')
            : (isBuyer ? 'Shitësi' : 'Blerësi')

          const sortedMsgs = Array.isArray(c.messages)
            ? c.messages.slice().sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            : []
          const lastMsgObj = sortedMsgs[sortedMsgs.length - 1]
          const lastMsg = lastMsgObj?.content || 'Bisedë e re'

          let lastTime = 'Sot'
          if (lastMsgObj?.created_at) {
            const d = new Date(lastMsgObj.created_at)
            const now = new Date()
            const isToday = d.toDateString() === now.toDateString()
            lastTime = isToday
              ? d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
              : d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })
          }

          const unreadCount = sortedMsgs.filter(
            (m: any) => !m.is_read && m.sender_id !== user.id
          ).length

          return {
            id: c.id,
            listing_id: c.listing_id,
            listing_title: c.listings?.title || 'Pronë në Bleje Pronën',
            listing_image: c.listings?.images?.[0] || '',
            seller_name: counterpartName,
            last_message: lastMsg,
            last_time: lastTime,
            unread_count: unreadCount,
          }
        })
        setConversations(mapped)
      }
    } catch (err: any) {
      console.warn('Conversations catch:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null)
      loadConversations()
    })

    // Realtime listener for incoming messages to refresh preview
    const channel = supabase
      .channel('conversations_list_watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      authListener.subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [loadConversations])

  const onRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setRefreshing(true)
    const startTime = Date.now()

    await loadConversations()

    // Optimized snappy UX duration: 650ms for responsive, crisp refresh
    const elapsed = Date.now() - startTime
    if (elapsed < 650) {
      await new Promise((resolve) => setTimeout(resolve, 650 - elapsed))
    }

    setRefreshing(false)
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  const primaryBtnText =
    theme === 'green' ? '#003E37' : theme === 'black' ? '#071A14' : '#FFFFFF'

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mesazhet</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Bisedat me blerësit dhe shitësit
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          currentUser ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary, colors.gold]}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Duke ngarkuar bisedat...
            </Text>
          </View>
        ) : !currentUser ? (
          /* Unauthenticated Auth Gatekeeper */
          <View
            style={[
              styles.authCard,
              {
                backgroundColor: colors.surface,
                borderColor:
                  theme === 'white'
                    ? 'rgba(0, 0, 0, 0.08)'
                    : theme === 'green'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(255, 255, 255, 0.10)',
              },
            ]}
          >
            <View style={[styles.authIconCircle, { backgroundColor: colors.primaryLight }]}>
              <MessageSquare size={32} color={colors.primary} strokeWidth={2.2} />
            </View>

            <Text style={[styles.authTitle, { color: colors.textPrimary }]}>
              Mesazhet Tuaja
            </Text>

            <Text style={[styles.authSubtitle, { color: colors.textMuted }]}>
              Kyçuni për të biseduar drejtpërdrejt me pronarët dhe blerësit.
            </Text>

            <View style={styles.authActionsRow}>
              <Pressable
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push({ pathname: '/modal', params: { initialTab: 'login' } })}
              >
                <LogIn size={16} color={primaryBtnText} strokeWidth={2.2} />
                <Text style={[styles.loginBtnText, { color: primaryBtnText }]}>Kyçu</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.registerBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                onPress={() => router.push({ pathname: '/modal', params: { initialTab: 'register' } })}
              >
                <UserPlus size={16} color={colors.textPrimary} strokeWidth={2.2} />
                <Text style={[styles.registerBtnText, { color: colors.textPrimary }]}>
                  Regjistrohu
                </Text>
              </Pressable>
            </View>
          </View>
        ) : conversations.length === 0 ? (
          /* Authenticated but no conversations */
          <View
            style={[
              styles.emptyContainer,
              {
                backgroundColor: colors.surface,
                borderColor:
                  theme === 'white'
                    ? 'rgba(0, 0, 0, 0.08)'
                    : theme === 'green'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(255, 255, 255, 0.10)',
              },
            ]}
          >
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
              <MessageSquare size={36} color={colors.primary} strokeWidth={1.8} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Asnjë mesazh ende</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Kur të dërgoni apo pranoni mesazhe rreth pronave, bisedat tuaja do të shfaqen këtu në kohë reale.
            </Text>
            <Pressable
              style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/listings' as any)}
            >
              <Text
                style={[
                  styles.exploreBtnText,
                  { color: primaryBtnText },
                ]}
              >
                Eksploro Pronat
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Conversation List */
          <View style={styles.listContainer}>
            {conversations.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.convoItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      theme === 'white'
                        ? 'rgba(0, 0, 0, 0.08)'
                        : theme === 'green'
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(255, 255, 255, 0.10)',
                  },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  router.push(`/messages/${item.id}` as any)
                }}
              >
                <View style={styles.avatarContainer}>
                  {item.listing_image ? (
                    <Image
                      source={{ uri: item.listing_image }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                      <MessageSquare size={20} color={colors.primary} />
                    </View>
                  )}
                </View>

                <View style={styles.convoContent}>
                  <View style={styles.convoHeader}>
                    <Text
                      style={[styles.convoName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.seller_name}
                    </Text>
                    <Text style={[styles.convoTime, { color: colors.textMuted }]}>
                      {item.last_time}
                    </Text>
                  </View>

                  <Text
                    style={[styles.listingTitleText, { color: colors.primary }]}
                    numberOfLines={1}
                  >
                    {item.listing_title}
                  </Text>

                  <Text
                    style={[
                      styles.lastMessageText,
                      {
                        color: (item.unread_count || 0) > 0 ? colors.textPrimary : colors.textMuted,
                        fontFamily: (item.unread_count || 0) > 0 ? Fonts.bold : Fonts.regular,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.last_message}
                  </Text>
                </View>

                <View style={styles.convoRightCol}>
                  {(item.unread_count || 0) > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: theme === 'green' ? colors.gold : colors.primary }]}>
                      <Text style={[styles.unreadBadgeText, { color: theme === 'green' ? '#003E37' : '#FFFFFF' }]}>
                        {item.unread_count}
                      </Text>
                    </View>
                  )}
                  <ChevronRight size={16} color={colors.textLight} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 115,
  },
  centerContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  authCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 24,
    borderWidth: 0.5,
    marginTop: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  authIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 21,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  authSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  authActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  loginBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  loginBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  registerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 0.5,
    alignItems: 'center',
    marginTop: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  exploreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  exploreBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  listContainer: {
    gap: 10,
    marginTop: 8,
  },
  convoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 16,
    borderWidth: 0.5,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convoContent: {
    flex: 1,
    gap: 2,
  },
  convoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convoName: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    flex: 1,
  },
  convoTime: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  listingTitleText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  lastMessageText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  convoRightCol: {
    alignItems: 'center',
    gap: 6,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
})
