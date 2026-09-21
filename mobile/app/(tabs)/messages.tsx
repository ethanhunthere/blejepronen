import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import {
  getSyncAuthUser,
  isAuthCacheHydrated,
  subscribeAuthCache,
  isLogoutInProgress,
} from '@/lib/auth-cache'
import {
  MessageSquare,
  ShieldCheck,
  LogIn,
  UserPlus,
  Lock,
  Phone,
  Search,
  X,
  Building2,
  CheckCheck,
  Check,
  MessageCircle,
  Users,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { createSafeChannel } from '@/lib/realtime'
import { getAvatarUri, getAvatarSource } from '@/lib/avatars'
import { CallModal } from '@/components/CallModal'
import { playTapSound } from '@/lib/sound'
import { ConversationFeedSkeleton } from '@/components/ListingSkeleton'

interface ConversationItem {
  id: string
  listing_id: string
  listing_title?: string
  listing_image?: string
  counterpart_id?: string
  counterpart_name?: string
  counterpart_avatar?: string
  counterpart_phone?: string
  is_agency?: boolean
  last_message?: string
  last_time?: string
  unread_count?: number
  is_last_message_mine?: boolean
  is_last_message_read?: boolean
}

type TabMode = 'chats' | 'contacts'
type FilterChip = 'all' | 'unread' | 'agencies' | 'owners'

export default function MessagesScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabMode>('chats')
  const insets = useSafeAreaInsets()
  const syncUser = getSyncAuthUser()
  const [currentUser, setCurrentUser] = useState<any>(() => syncUser)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(() => !isAuthCacheHydrated() && !!syncUser)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<FilterChip>('all')

  useEffect(() => {
    const unsub = subscribeAuthCache((state) => {
      setCurrentUser(state.user)
      if (!state.user) {
        setConversations([])
        setLoading(false)
      }
    })
    return unsub
  }, [])

  // Contact Action Sheet State
  const [contactSheet, setContactSheet] = useState<{
    visible: boolean
    name: string
    avatar?: string | null
    phone?: string | null
    listingTitle?: string | null
    userId?: string | null
    conversationId?: string | null
  }>({
    visible: false,
    name: '',
    avatar: null,
    phone: null,
    listingTitle: null,
  })

  const loadConversations = useCallback(async () => {
    if (isLogoutInProgress()) {
      setConversations([])
      setLoading(false)
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (isLogoutInProgress()) {
        setCurrentUser(null)
        setConversations([])
        return
      }

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
          buyer:buyer_id(id, first_name, last_name, phone, avatar_url),
          seller:seller_id(id, first_name, last_name, phone, avatar_url),
          messages(id, content, sender_id, created_at, is_read)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (isLogoutInProgress()) return

      if (error) {
        console.warn('Conversations notice:', error.message)
      } else if (data) {
        const mapped: ConversationItem[] = data.map((c: any) => {
          const isBuyer = user.id === c.buyer_id
          const counterpart = isBuyer ? c.seller : c.buyer
          const counterpartName = counterpart
            ? `${counterpart.first_name || ''} ${counterpart.last_name || ''}`.trim() || (isBuyer ? 'Shitësi' : 'Blerësi')
            : (isBuyer ? 'Shitësi' : 'Blerësi')

          const isAgency = /agjenci|real estate|invest|patundshm|group|shpk/i.test(counterpartName)

          const sortedMsgs = Array.isArray(c.messages)
            ? c.messages.slice().sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            : []
          const lastMsgObj = sortedMsgs[sortedMsgs.length - 1]
          const lastMsg = lastMsgObj?.content || 'Bisedë e re'
          const isMine = lastMsgObj?.sender_id === user.id
          const isRead = !!lastMsgObj?.is_read

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
            counterpart_id: counterpart?.id,
            counterpart_name: counterpartName,
            counterpart_avatar: counterpart?.avatar_url || '',
            counterpart_phone: counterpart?.phone || '',
            is_agency: isAgency,
            last_message: lastMsg,
            last_time: lastTime,
            unread_count: unreadCount,
            is_last_message_mine: isMine,
            is_last_message_read: isRead,
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
      if (isLogoutInProgress()) {
        setCurrentUser(null)
        setConversations([])
        return
      }
      setCurrentUser(session?.user || null)
      loadConversations()
    })

    let channel: ReturnType<typeof createSafeChannel> | null = null
    try {
      channel = createSafeChannel('conversations_list_watch')
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
    } catch (err) {
      console.warn('Conversations realtime notice:', err)
    }

    return () => {
      authListener?.subscription?.unsubscribe()
      if (channel) supabase.removeChannel(channel)
    }
  }, [loadConversations])

  const onRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setRefreshing(true)
    const startTime = Date.now()

    await loadConversations()

    const elapsed = Date.now() - startTime
    if (elapsed < 600) {
      await new Promise((resolve) => setTimeout(resolve, 600 - elapsed))
    }

    setRefreshing(false)
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        (item.counterpart_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.listing_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.last_message || '').toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchSearch) return false

      if (selectedFilter === 'unread') {
        return (item.unread_count || 0) > 0
      }
      if (selectedFilter === 'agencies') {
        return item.is_agency === true
      }
      if (selectedFilter === 'owners') {
        return item.is_agency === false
      }
      return true
    })
  }, [conversations, searchQuery, selectedFilter])

  // Total unread messages
  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0)
  }, [conversations])

  // Real Contacts extracted strictly from user's genuine conversations
  const contactsList = useMemo(() => {
    const seen = new Set<string>()
    const list: ConversationItem[] = []

    for (const c of conversations) {
      const key = c.counterpart_id || c.counterpart_name || c.id
      if (!seen.has(key)) {
        seen.add(key)
        list.push(c)
      }
    }
    return list
  }, [conversations])

  const openContactSheet = (item: ConversationItem) => {
    playTapSound()
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setContactSheet({
      visible: true,
      name: item.counterpart_name || 'Pronar',
      avatar: item.counterpart_avatar,
      phone: item.counterpart_phone,
      listingTitle: item.listing_title,
      userId: item.counterpart_id ?? null,
      conversationId: item.id,
    })
  }

  const primaryBtnText =
    theme === 'green' ? '#071C18' : theme === 'black' ? '#071A14' : '#FFFFFF'

  const specularBorder = colors.border

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mesazhet</Text>
        </View>

        {/* Apple iOS 18 Segmented Switcher (Bisedat vs Kontaktet) */}
        {currentUser && (
          <View
            style={[
              styles.segmentedContainer,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: specularBorder,
              },
            ]}
          >
            <Pressable
              style={[
                styles.segmentedTab,
                activeTab === 'chats' && [
                  styles.segmentedTabActive,
                  {
                    backgroundColor: colors.surface,
                  },
                ],
              ]}
              onPress={() => {
                if (activeTab !== 'chats') {
                  playTapSound()
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  setActiveTab('chats')
                }
              }}
            >
              <MessageSquare
                size={16}
                color={activeTab === 'chats' ? (theme === 'green' ? colors.gold : colors.primary) : colors.textMuted}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.segmentedTabText,
                  {
                    color: activeTab === 'chats' ? colors.textPrimary : colors.textMuted,
                    fontFamily: activeTab === 'chats' ? Fonts.bold : Fonts.medium,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Bisedat
              </Text>
              {totalUnread > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: theme === 'green' ? colors.gold : colors.primary }]}>
                  <Text style={[styles.tabBadgeText, { color: primaryBtnText }]}>{totalUnread}</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.segmentedTab,
                activeTab === 'contacts' && [
                  styles.segmentedTabActive,
                  {
                    backgroundColor: colors.surface,
                  },
                ],
              ]}
              onPress={() => {
                if (activeTab !== 'contacts') {
                  playTapSound()
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  setActiveTab('contacts')
                }
              }}
            >
              <Users
                size={16}
                color={activeTab === 'contacts' ? (theme === 'green' ? colors.gold : colors.primary) : colors.textMuted}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.segmentedTabText,
                  {
                    color: activeTab === 'contacts' ? colors.textPrimary : colors.textMuted,
                    fontFamily: activeTab === 'contacts' ? Fonts.bold : Fonts.medium,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Kontaktet
              </Text>
              {contactsList.length > 0 && (
                <View style={[styles.tabCountPill, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={[styles.tabCountPillText, { color: colors.textMuted }]}>
                    {contactsList.length}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        )}
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
          <ConversationFeedSkeleton count={5} />
        ) : !currentUser ? (
          /* Unauthenticated Auth Gatekeeper */
          <View
            style={[
              styles.authCard,
              {
                backgroundColor: colors.surface,
                borderColor: specularBorder,
              },
            ]}
          >
            <View style={[styles.authIconCircle, { backgroundColor: colors.primaryLight }]}>
              <MessageSquare size={30} color={colors.primary} strokeWidth={2.2} />
            </View>

            <Text style={[styles.authTitle, { color: colors.textPrimary }]}>
              Mesazhet Tuaja
            </Text>

            <Text style={[styles.authSubtitle, { color: colors.textMuted }]}>
              Kyçuni për të komunikuar drejtpërdrejt me shitësit, blerësit dhe agjencitë.
            </Text>

            <View style={styles.authActionsRow}>
              <Pressable
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push({ pathname: '/modal', params: { initialTab: 'login', reason: 'chat' } })}
              >
                <LogIn size={16} color={primaryBtnText} strokeWidth={2.2} />
                <Text style={[styles.loginBtnText, { color: primaryBtnText }]} numberOfLines={1} adjustsFontSizeToFit>
                  Kyçu
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.registerBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                onPress={() => router.push({ pathname: '/modal', params: { initialTab: 'register', reason: 'chat' } })}
              >
                <UserPlus size={16} color={colors.textPrimary} strokeWidth={2.2} />
                <Text style={[styles.registerBtnText, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  Regjistrohu
                </Text>
              </Pressable>
            </View>
          </View>
        ) : activeTab === 'chats' ? (
          /* ================= CHATS TAB ================= */
          <View style={styles.tabContent}>
            {/* Search Bar */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: specularBorder,
                },
              ]}
            >
              <Search size={18} color={colors.textLight} strokeWidth={2.2} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Kërko biseda ose pronarë..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}
                  style={styles.clearSearchBtn}
                >
                  <X size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Filter Chips */}
            {conversations.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsRow}
              >
                {[
                  { key: 'all', label: 'Të gjitha' },
                  { key: 'unread', label: `Të palexuara (${totalUnread})` },
                  { key: 'agencies', label: 'Agjencitë' },
                  { key: 'owners', label: 'Pronarët' },
                ].map((chip) => {
                  const isSelected = selectedFilter === chip.key
                  return (
                    <Pressable
                      key={chip.key}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isSelected
                            ? theme === 'green'
                              ? colors.gold
                              : colors.primary
                            : colors.surface,
                          borderColor: isSelected
                            ? 'transparent'
                            : colors.border,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setSelectedFilter(chip.key as FilterChip)
                      }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: isSelected ? primaryBtnText : colors.textPrimary,
                            fontFamily: isSelected ? Fonts.bold : Fonts.medium,
                          },
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            )}

            {/* Conversation List or Empty */}
            {filteredConversations.length === 0 ? (
              <View
                style={[
                  styles.emptyContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: specularBorder,
                  },
                ]}
              >
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <MessageSquare size={32} color={colors.primary} strokeWidth={1.8} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {searchQuery ? 'Asnjë bisedë e gjetur' : 'Asnjë bisedë ende'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  {searchQuery
                    ? 'Provoni të kërkoni me një emër tjetër.'
                    : 'Pasi të kontaktoni shitësin e një prone, bisedat tuaja do të ruhen këtu.'}
                </Text>
                {!searchQuery && (
                  <Pressable
                    style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/listings' as any)}
                  >
                    <Text style={[styles.exploreBtnText, { color: primaryBtnText }]}>
                      Eksploro Pronat
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.conversationsList}>
                {filteredConversations.map((item) => {
                  const avatarUri = getAvatarUri(item.counterpart_avatar || item.listing_image)
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.convoCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: specularBorder,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        router.push(`/messages/${item.id}` as any)
                      }}
                    >
                      {/* Avatar */}
                      <View style={styles.avatarWrapper}>
                        <Image
                          source={getAvatarSource(item.counterpart_avatar || item.listing_image)}
                          style={styles.convoAvatar}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          priority="high"
                          transition={0}
                        />
                      </View>

                      {/* Content Details */}
                      <View style={styles.convoMain}>
                        <View style={styles.convoTopRow}>
                          <View style={styles.convoNameRow}>
                            <Text
                              style={[styles.convoName, { color: colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {item.counterpart_name}
                            </Text>
                            {item.is_agency ? (
                              <Building2 size={13} color={colors.primary} strokeWidth={2.4} />
                            ) : (
                              <ShieldCheck size={13} color={colors.primary} strokeWidth={2.4} />
                            )}
                          </View>
                          <Text style={[styles.convoTimeText, { color: colors.textMuted }]}>
                            {item.last_time}
                          </Text>
                        </View>

                        {/* Property title tag */}
                        <Text
                          style={[
                            styles.listingTag,
                            { color: theme === 'green' ? colors.gold : colors.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.listing_title}
                        </Text>

                        {/* Last message preview */}
                        <View style={styles.lastMessageRow}>
                          {item.is_last_message_mine && (
                            <View style={styles.checkWrapper}>
                              {item.is_last_message_read ? (
                                <CheckCheck size={14} color="#38BDF8" strokeWidth={2.4} />
                              ) : (
                                <Check size={14} color={colors.textLight} strokeWidth={2.4} />
                              )}
                            </View>
                          )}
                          <Text
                            style={[
                              styles.lastMessageText,
                              {
                                color:
                                  (item.unread_count || 0) > 0
                                    ? colors.textPrimary
                                    : colors.textMuted,
                                fontFamily:
                                  (item.unread_count || 0) > 0 ? Fonts.bold : Fonts.regular,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {item.last_message}
                          </Text>
                        </View>
                      </View>

                      {/* Right direct quick-action (Contact Sheet button) */}
                      <View style={styles.cardActionsCol}>
                        <Pressable
                          style={[styles.quickCallIconBtn, { backgroundColor: colors.surfaceSubtle }]}
                          onPress={(e) => {
                            e.stopPropagation()
                            openContactSheet(item)
                          }}
                          hitSlop={6}
                        >
                          <Phone size={15} color={colors.primary} strokeWidth={2.2} />
                        </Pressable>

                        {(item.unread_count || 0) > 0 ? (
                          <View
                            style={[
                              styles.unreadBadge,
                              {
                                backgroundColor:
                                  theme === 'green' ? colors.gold : colors.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.unreadBadgeText,
                                {
                                  color: primaryBtnText,
                                },
                              ]}
                            >
                              {item.unread_count}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            )}

            {/* Apple-style Privacy Guarantee */}
            <View style={styles.privacyFooter}>
              <Lock size={13} color={colors.textLight} strokeWidth={2} />
              <Text style={[styles.privacyFooterText, { color: colors.textLight }]}>
                Bisedat tuaja janë të mbrojtura dhe private.
              </Text>
            </View>
          </View>
        ) : (
          /* ================= CONTACTS TAB ================= */
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Kontaktet nga Pronat Tuaja
            </Text>

            {contactsList.length === 0 ? (
              <View
                style={[
                  styles.emptyContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: specularBorder,
                  },
                ]}
              >
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Users size={32} color={colors.primary} strokeWidth={1.8} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  Asnjë kontakt ende
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Personat dhe agjencitë me të cilët bisedoni rreth pronave do të shfaqen këtu për qasje të shpejtë telefonike.
                </Text>
              </View>
            ) : (
              <View style={styles.contactsList}>
                {contactsList.map((contact) => {
                  const avatarUri = getAvatarUri(contact.counterpart_avatar || contact.listing_image)
                  return (
                    <Pressable
                      key={`contact-${contact.id}`}
                      style={[
                        styles.contactCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: specularBorder,
                        },
                      ]}
                      onPress={() => openContactSheet(contact)}
                    >
                      <Image
                        source={getAvatarSource(contact.counterpart_avatar || contact.listing_image)}
                        style={styles.contactAvatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        priority="high"
                        transition={0}
                      />

                      <View style={styles.contactInfoCol}>
                        <View style={styles.contactNameRow}>
                          <Text style={[styles.contactName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {contact.counterpart_name}
                          </Text>
                          {contact.is_agency ? (
                            <Building2 size={13} color={colors.primary} strokeWidth={2.4} />
                          ) : (
                            <ShieldCheck size={13} color={colors.primary} strokeWidth={2.4} />
                          )}
                        </View>

                        {contact.counterpart_phone ? (
                          <Text style={[styles.contactPhoneText, { color: colors.textMuted }]}>
                            {contact.counterpart_phone}
                          </Text>
                        ) : (
                          <Text style={[styles.contactPhoneText, { color: colors.textLight }]}>
                            Komunikim në Chat
                          </Text>
                        )}

                        {contact.listing_title && (
                          <Text
                            style={[
                              styles.contactListingTag,
                              { color: theme === 'green' ? colors.gold : colors.primary },
                            ]}
                            numberOfLines={1}
                          >
                            {contact.listing_title}
                          </Text>
                        )}
                      </View>

                      {/* Direct Call Icon */}
                      <Pressable
                        style={[styles.contactCallBtn, { backgroundColor: colors.primaryLight }]}
                        onPress={(e) => {
                          e.stopPropagation()
                          openContactSheet(contact)
                        }}
                        hitSlop={8}
                      >
                        <Phone size={16} color={colors.primary} strokeWidth={2.2} />
                      </Pressable>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Apple iOS 18 Contact Sheet */}
      <CallModal
        visible={contactSheet.visible}
        onClose={() => setContactSheet((prev) => ({ ...prev, visible: false }))}
        counterpartName={contactSheet.name}
        counterpartAvatar={contactSheet.avatar}
        counterpartPhone={contactSheet.phone}
        listingTitle={contactSheet.listingTitle}
        counterpartUserId={contactSheet.userId}
        conversationId={contactSheet.conversationId}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 12,
    gap: 12,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.6,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 13,
    padding: 3,
    borderWidth: 1,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  segmentedTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentedTabText: {
    fontSize: 13,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
  },
  tabCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  tabCountPillText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 115,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
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
  tabContent: {
    gap: 14,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterChipsRow: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  conversationsList: {
    gap: 9,
  },
  convoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
  },
  convoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  convoMain: {
    flex: 1,
    gap: 2,
  },
  convoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  convoName: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  convoTimeText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  listingTag: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkWrapper: {
    marginTop: 1,
  },
  lastMessageText: {
    fontSize: 12,
    flex: 1,
  },
  cardActionsCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  quickCallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: Fonts.extraBold,
  },
  privacyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  privacyFooterText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  contactsList: {
    gap: 9,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  contactAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  contactInfoCol: {
    flex: 1,
    gap: 2,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactName: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  contactPhoneText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  contactListingTag: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  contactCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 24,
    borderWidth: 0.5,
    marginTop: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  authIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 20,
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
    height: 46,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  registerBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
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
    borderWidth: 0.5,
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 12,
  },
  exploreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  exploreBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
})
