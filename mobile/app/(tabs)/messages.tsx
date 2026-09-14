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
        .select('*, listings(id, title, images), buyer:buyer_id(first_name, last_name), seller:seller_id(first_name, last_name)')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (error) {
        console.warn('Conversations notice:', error.message)
      } else if (data) {
        const mapped: ConversationItem[] = data.map((c: any) => ({
          id: c.id,
          listing_id: c.listing_id,
          listing_title: c.listings?.title || 'Pronë në Bleje Pronën',
          listing_image: c.listings?.images?.[0] || '',
          seller_name: `${c.seller?.first_name || 'Shitës'} ${c.seller?.last_name || ''}`.trim(),
          last_message: 'Përshëndetje! A është ende e lirë kjo pronë?',
          last_time: 'Sot',
          unread_count: 0,
        }))
        setConversations(mapped)
      }
    } catch (err: any) {
      console.warn('Conversations catch:', err?.message || err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null)
      loadConversations()
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [loadConversations])

  const onRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setRefreshing(true)
    await loadConversations()
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  const primaryBtnText = theme === 'green' ? '#003E37' : '#FFFFFF'

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
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.authIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Lock size={32} color={colors.primary} strokeWidth={2.2} />
            </View>

            <View style={[styles.authBadge, { backgroundColor: colors.badgeBg }]}>
              <ShieldCheck size={12} color={colors.badgeText} strokeWidth={2.4} />
              <Text style={[styles.authBadgeText, { color: colors.badgeText }]}>
                Komunikim i Sigurt
              </Text>
            </View>

            <Text style={[styles.authTitle, { color: colors.textPrimary }]}>
              Kyçuni për të Parë Bisedat
            </Text>

            <Text style={[styles.authSubtitle, { color: colors.textMuted }]}>
              Komunikoni drejtpërdrejt me pronarët dhe blerësit, merrni njoftime për çmimet dhe ruani të gjitha negociatat tuaja në mënyrë të mbrojtur.
            </Text>

            <View style={styles.authActionsRow}>
              <Pressable
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push({ pathname: '/modal', params: { initialTab: 'login' } })}
              >
                <LogIn size={16} color={primaryBtnText} strokeWidth={2.2} />
                <Text style={[styles.loginBtnText, { color: primaryBtnText }]}>Kyçu në Llogari</Text>
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
                  Krijo Llogari
                </Text>
              </Pressable>
            </View>
          </View>
        ) : conversations.length === 0 ? (
          /* Authenticated but no conversations */
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
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
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  router.push(`/listings/${item.listing_id}` as any)
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
                    style={[styles.lastMessageText, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {item.last_message}
                  </Text>
                </View>

                <ChevronRight size={16} color={colors.textLight} />
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
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
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
    paddingBottom: 40,
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
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 20,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  authIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 16,
    marginBottom: 12,
  },
  authBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  authTitle: {
    fontSize: 19,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  authActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  loginBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
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
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  registerBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
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
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
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
})
