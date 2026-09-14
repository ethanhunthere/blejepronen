import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
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
  Phone,
  Video,
  Search,
  X,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Sparkles,
  Building2,
  CheckCheck,
  Check,
  User,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { getAvatarUri } from '@/lib/avatars'
import { CallModal } from '@/components/CallModal'
import { playTapSound } from '@/lib/sound'

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

interface CallLogItem {
  id: string
  name: string
  avatar?: string
  phone?: string
  listing_title?: string
  call_type: 'audio' | 'video'
  direction: 'incoming' | 'outgoing' | 'missed'
  timestamp: string
  duration?: string
}

type TabMode = 'chats' | 'calls'
type FilterChip = 'all' | 'unread' | 'agencies' | 'owners'

const ACTIVE_CONTACTS = [
  {
    id: 'contact-1',
    name: 'Prishtina Real Estate',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
    isAgency: true,
    phone: '+38349100200',
    listingTitle: 'Banesë 92m² në Qendër',
  },
  {
    id: 'contact-2',
    name: 'Valon Krasniqi',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    isAgency: false,
    phone: '+38344123456',
    listingTitle: 'Penthouse në Veternik',
  },
  {
    id: 'contact-3',
    name: 'Dukagjini Invest',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    isAgency: true,
    phone: '+38349888999',
    listingTitle: 'Vilë luksoze në Marigona',
  },
  {
    id: 'contact-4',
    name: 'Drenica Properties',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    isAgency: true,
    phone: '+38344555666',
    listingTitle: 'Lokal 140m² te Rruga B',
  },
  {
    id: 'contact-5',
    name: 'Gentiana Morina',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    isAgency: false,
    phone: '+38349222333',
    listingTitle: 'Banesë 65m² në Dardani',
  },
]

export default function MessagesScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabMode>('chats')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<FilterChip>('all')

  // Call Modal State
  const [callModal, setCallModal] = useState<{
    visible: boolean
    name: string
    avatar?: string | null
    phone?: string | null
    listingTitle?: string | null
    type: 'audio' | 'video'
  }>({
    visible: false,
    name: '',
    avatar: null,
    phone: null,
    listingTitle: null,
    type: 'audio',
  })

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
          buyer:buyer_id(id, first_name, last_name, phone, avatar_url),
          seller:seller_id(id, first_name, last_name, phone, avatar_url),
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
      setCurrentUser(session?.user || null)
      loadConversations()
    })

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

    const elapsed = Date.now() - startTime
    if (elapsed < 650) {
      await new Promise((resolve) => setTimeout(resolve, 650 - elapsed))
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

  // Mocked/Derived Call History
  const callLogs: CallLogItem[] = useMemo(() => {
    const defaultLogs: CallLogItem[] = [
      {
        id: 'call-1',
        name: 'Prishtina Real Estate',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
        phone: '+38349100200',
        listing_title: 'Banesë 92m² në Qendër',
        call_type: 'video',
        direction: 'incoming',
        timestamp: 'Sot, 17:45',
        duration: '4m 12s',
      },
      {
        id: 'call-2',
        name: 'Valon Krasniqi',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        phone: '+38344123456',
        listing_title: 'Penthouse në Veternik',
        call_type: 'audio',
        direction: 'outgoing',
        timestamp: 'Sot, 14:10',
        duration: '2m 30s',
      },
      {
        id: 'call-3',
        name: 'Dukagjini Invest',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
        phone: '+38349888999',
        listing_title: 'Vilë luksoze në Marigona',
        call_type: 'video',
        direction: 'missed',
        timestamp: 'Dje, 19:22',
      },
      {
        id: 'call-4',
        name: 'Gentiana Morina',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
        phone: '+38349222333',
        listing_title: 'Banesë 65m² në Dardani',
        call_type: 'audio',
        direction: 'incoming',
        timestamp: '12 Shtator, 11:05',
        duration: '6m 48s',
      },
    ]

    // Append dynamic conversation contacts as call entries if available
    if (conversations.length > 0) {
      const dynamicCalls: CallLogItem[] = conversations.slice(0, 3).map((c, i) => ({
        id: `dyn-call-${c.id}`,
        name: c.counterpart_name || 'Pronar',
        avatar: c.counterpart_avatar,
        phone: c.counterpart_phone,
        listing_title: c.listing_title,
        call_type: i % 2 === 0 ? 'video' : 'audio',
        direction: i === 0 ? 'incoming' : i === 1 ? 'outgoing' : 'missed',
        timestamp: c.last_time || 'Këtë javë',
        duration: i === 2 ? undefined : `${i + 1}m ${30 + i * 15}s`,
      }))
      return [...dynamicCalls, ...defaultLogs]
    }

    return defaultLogs
  }, [conversations])

  const startCall = (
    name: string,
    type: 'audio' | 'video',
    avatar?: string | null,
    phone?: string | null,
    listingTitle?: string | null
  ) => {
    playTapSound()
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    setCallModal({
      visible: true,
      name,
      avatar,
      phone,
      listingTitle,
      type,
    })
  }

  const primaryBtnText =
    theme === 'green' ? '#003E37' : theme === 'black' ? '#071A14' : '#FFFFFF'

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mesazhet</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Bisedat dhe thirrjet në kohë reale
            </Text>
          </View>

          {currentUser && (
            <View style={styles.headerStatusRow}>
              <View style={[styles.onlineDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.onlineText, { color: '#10B981' }]}>Aktiv</Text>
            </View>
          )}
        </View>

        {/* WhatsApp/iOS 18 Segmented Switcher (Bisedat vs Thirrjet) */}
        {currentUser && (
          <View
            style={[
              styles.segmentedContainer,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor:
                  theme === 'white'
                    ? 'rgba(0,0,0,0.06)'
                    : 'rgba(255,255,255,0.08)',
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
                    shadowColor: '#000',
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
                activeTab === 'calls' && [
                  styles.segmentedTabActive,
                  {
                    backgroundColor: colors.surface,
                    shadowColor: '#000',
                  },
                ],
              ]}
              onPress={() => {
                if (activeTab !== 'calls') {
                  playTapSound()
                  if (Platform.OS !== 'web') Haptics.selectionAsync()
                  setActiveTab('calls')
                }
              }}
            >
              <Phone
                size={16}
                color={activeTab === 'calls' ? (theme === 'green' ? colors.gold : colors.primary) : colors.textMuted}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.segmentedTabText,
                  {
                    color: activeTab === 'calls' ? colors.textPrimary : colors.textMuted,
                    fontFamily: activeTab === 'calls' ? Fonts.bold : Fonts.medium,
                  },
                ]}
              >
                Thirrjet
              </Text>
              <View style={[styles.tabLiveBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Text style={[styles.tabLiveBadgeText, { color: '#10B981' }]}>HD</Text>
              </View>
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
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Duke ngarkuar të dhënat...
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
              Mesazhet dhe Thirrjet
            </Text>

            <Text style={[styles.authSubtitle, { color: colors.textMuted }]}>
              Kyçuni për të biseduar dhe kryer thirrje direkte audio & video me pronarët dhe agjencitë.
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
        ) : activeTab === 'chats' ? (
          /* ================= CHATS TAB ================= */
          <View style={styles.tabContent}>
            {/* Search Bar */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor:
                    theme === 'white'
                      ? 'rgba(0,0,0,0.08)'
                      : 'rgba(255,255,255,0.08)',
                },
              ]}
            >
              <Search size={18} color={colors.textLight} strokeWidth={2.2} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Kërko biseda, pronarë ose agjenci..."
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

            {/* Active Contacts / Stories Rail */}
            <View style={styles.storiesSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Kontaktet & Agjencitë Aktive
                </Text>
                <View style={styles.livePill}>
                  <View style={[styles.liveDotSmall, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.livePillText}>Online Tani</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesList}
              >
                {ACTIVE_CONTACTS.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.storyItem}
                    onPress={() => {
                      startCall(item.name, 'video', item.avatar, item.phone, item.listingTitle)
                    }}
                  >
                    <View style={styles.storyAvatarWrapper}>
                      <Image
                        source={{ uri: item.avatar }}
                        style={styles.storyAvatar}
                        contentFit="cover"
                        transition={200}
                      />
                      <View
                        style={[
                          styles.storyStatusDot,
                          {
                            backgroundColor: '#10B981',
                            borderColor: colors.background,
                          },
                        ]}
                      />
                      {item.isAgency && (
                        <View style={[styles.agencyBadgeSmall, { backgroundColor: colors.primary }]}>
                          <Building2 size={10} color="#FFFFFF" strokeWidth={2.4} />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.storyName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Conversation List or Empty */}
            {filteredConversations.length === 0 ? (
              <View
                style={[
                  styles.emptyContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      theme === 'white'
                        ? 'rgba(0, 0, 0, 0.08)'
                        : 'rgba(255, 255, 255, 0.10)',
                  },
                ]}
              >
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <MessageSquare size={36} color={colors.primary} strokeWidth={1.8} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {searchQuery ? 'Asnjë bisedë e gjetur' : 'Asnjë bisedë ende'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  {searchQuery
                    ? 'Provoni të kërkoni me një emër tjetër ose pastroni filtrat.'
                    : 'Kur të dërgoni apo pranoni mesazhe rreth pronave, bisedat do të shfaqen këtu menjëherë.'}
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
                          borderColor:
                            theme === 'white'
                              ? 'rgba(0, 0, 0, 0.06)'
                              : theme === 'green'
                              ? 'rgba(255, 255, 255, 0.10)'
                              : 'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        router.push(`/messages/${item.id}` as any)
                      }}
                    >
                      {/* Avatar with status and thumbnail */}
                      <View style={styles.avatarWrapper}>
                        <Image
                          source={{ uri: avatarUri }}
                          style={styles.convoAvatar}
                          contentFit="cover"
                          transition={200}
                        />
                        <View
                          style={[
                            styles.avatarOnlineDot,
                            {
                              backgroundColor: '#10B981',
                              borderColor: colors.surface,
                            },
                          ]}
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
                            <ShieldCheck size={14} color={colors.primary} strokeWidth={2.4} />
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

                      {/* Right direct quick-action buttons (Audio Call & Video Call) */}
                      <View style={styles.cardActionsCol}>
                        <View style={styles.quickCallButtonsRow}>
                          <Pressable
                            style={[styles.quickCallIconBtn, { backgroundColor: colors.surfaceSubtle }]}
                            onPress={() => {
                              startCall(
                                item.counterpart_name || 'Bisedë',
                                'audio',
                                item.counterpart_avatar,
                                item.counterpart_phone,
                                item.listing_title
                              )
                            }}
                            hitSlop={6}
                          >
                            <Phone size={15} color={colors.primary} strokeWidth={2.4} />
                          </Pressable>

                          <Pressable
                            style={[styles.quickCallIconBtn, { backgroundColor: colors.surfaceSubtle }]}
                            onPress={() => {
                              startCall(
                                item.counterpart_name || 'Bisedë',
                                'video',
                                item.counterpart_avatar,
                                item.counterpart_phone,
                                item.listing_title
                              )
                            }}
                            hitSlop={6}
                          >
                            <Video size={15} color={colors.primary} strokeWidth={2.4} />
                          </Pressable>
                        </View>

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

            {/* WhatsApp/Signal-style End-to-End Encryption Banner */}
            <View style={styles.privacyFooter}>
              <Lock size={14} color={colors.textLight} strokeWidth={2} />
              <Text style={[styles.privacyFooterText, { color: colors.textLight }]}>
                Bisedat dhe thirrjet tuaja janë të mbrojtura me enkriptim nga skaji në skaj.
              </Text>
            </View>
          </View>
        ) : (
          /* ================= CALLS TAB ================= */
          <View style={styles.tabContent}>
            {/* Quick Call Out Banner */}
            <View
              style={[
                styles.callHeroBanner,
                {
                  backgroundColor: colors.surface,
                  borderColor:
                    theme === 'white'
                      ? 'rgba(0,0,0,0.06)'
                      : 'rgba(255,255,255,0.08)',
                },
              ]}
            >
              <View style={[styles.callHeroIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Sparkles size={24} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={styles.callHeroTextCol}>
                <Text style={[styles.callHeroTitle, { color: colors.textPrimary }]}>
                  Thirrje Audio & Video HD
                </Text>
                <Text style={[styles.callHeroDesc, { color: colors.textMuted }]}>
                  Komunikoni drejtpërdrejt dhe shpejt me agjentët më të vlerësuar.
                </Text>
              </View>
            </View>

            {/* Calls List */}
            <View style={styles.callsListSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>
                Historia e Thirrjeve të Fundit
              </Text>

              <View style={styles.callsList}>
                {callLogs.map((log) => {
                  const isVideo = log.call_type === 'video'
                  const isMissed = log.direction === 'missed'
                  const isOutgoing = log.direction === 'outgoing'

                  return (
                    <View
                      key={log.id}
                      style={[
                        styles.callLogCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor:
                            theme === 'white'
                              ? 'rgba(0,0,0,0.06)'
                              : 'rgba(255,255,255,0.08)',
                        },
                      ]}
                    >
                      {/* Avatar with direction badge */}
                      <View style={styles.callAvatarWrapper}>
                        <Image
                          source={{ uri: log.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80' }}
                          style={styles.callAvatar}
                          contentFit="cover"
                        />
                        <View
                          style={[
                            styles.directionBadge,
                            {
                              backgroundColor: isMissed
                                ? '#EF4444'
                                : isOutgoing
                                ? '#38BDF8'
                                : '#10B981',
                              borderColor: colors.surface,
                            },
                          ]}
                        >
                          {isMissed ? (
                            <PhoneMissed size={9} color="#FFFFFF" strokeWidth={2.6} />
                          ) : isOutgoing ? (
                            <PhoneOutgoing size={9} color="#FFFFFF" strokeWidth={2.6} />
                          ) : (
                            <PhoneIncoming size={9} color="#FFFFFF" strokeWidth={2.6} />
                          )}
                        </View>
                      </View>

                      {/* Info */}
                      <View style={styles.callInfoCol}>
                        <Text
                          style={[
                            styles.callContactName,
                            {
                              color: isMissed ? '#EF4444' : colors.textPrimary,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {log.name}
                        </Text>

                        <View style={styles.callMetaRow}>
                          <Text style={[styles.callMetaText, { color: colors.textMuted }]}>
                            {isVideo ? 'Video Thirrje' : 'Audio Thirrje'} • {log.timestamp}
                          </Text>
                          {log.duration && (
                            <Text style={[styles.callDurationText, { color: colors.textLight }]}>
                              ({log.duration})
                            </Text>
                          )}
                        </View>

                        {log.listing_title && (
                          <Text
                            style={[
                              styles.callListingTag,
                              { color: theme === 'green' ? colors.gold : colors.primary },
                            ]}
                            numberOfLines={1}
                          >
                            {log.listing_title}
                          </Text>
                        )}
                      </View>

                      {/* Callback Actions */}
                      <View style={styles.callBackBtnsRow}>
                        <Pressable
                          style={[
                            styles.callBackBtn,
                            { backgroundColor: colors.surfaceSubtle },
                          ]}
                          onPress={() => startCall(log.name, 'audio', log.avatar, log.phone, log.listing_title)}
                          hitSlop={6}
                        >
                          <Phone size={17} color={colors.primary} strokeWidth={2.2} />
                        </Pressable>

                        <Pressable
                          style={[
                            styles.callBackBtn,
                            { backgroundColor: colors.surfaceSubtle },
                          ]}
                          onPress={() => startCall(log.name, 'video', log.avatar, log.phone, log.listing_title)}
                          hitSlop={6}
                        >
                          <Video size={17} color={colors.primary} strokeWidth={2.2} />
                        </Pressable>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>

            {/* Privacy note */}
            <View style={styles.privacyFooter}>
              <Lock size={14} color={colors.textLight} strokeWidth={2} />
              <Text style={[styles.privacyFooterText, { color: colors.textLight }]}>
                Thirrjet zanore dhe video janë të enkriptuara drejtpërdrejt P2P.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* High-Fidelity WhatsApp/FaceTime Call Modal */}
      <CallModal
        visible={callModal.visible}
        onClose={() => setCallModal((prev) => ({ ...prev, visible: false }))}
        counterpartName={callModal.name}
        counterpartAvatar={callModal.avatar}
        counterpartPhone={callModal.phone}
        listingTitle={callModal.listingTitle}
        initialCallType={callModal.type}
      />
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
    paddingBottom: 12,
    gap: 12,
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
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  onlineText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
    gap: 7,
  },
  segmentedTabActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  tabLiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tabLiveBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.extraBold,
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
  tabContent: {
    gap: 16,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
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
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  storiesSection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  livePillText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: '#10B981',
  },
  storiesList: {
    gap: 14,
    paddingVertical: 4,
  },
  storyItem: {
    alignItems: 'center',
    width: 62,
    gap: 6,
  },
  storyAvatarWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    position: 'relative',
  },
  storyAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  storyStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },
  agencyBadgeSmall: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyName: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  conversationsList: {
    gap: 10,
  },
  convoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  avatarWrapper: {
    position: 'relative',
    width: 52,
    height: 52,
  },
  convoAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },
  convoMain: {
    flex: 1,
    gap: 3,
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
    gap: 8,
  },
  quickCallButtonsRow: {
    flexDirection: 'row',
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
    marginTop: 12,
    paddingHorizontal: 16,
  },
  privacyFooterText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  callHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  callHeroIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callHeroTextCol: {
    flex: 1,
    gap: 2,
  },
  callHeroTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  callHeroDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },
  callsListSection: {
    marginTop: 4,
  },
  callsList: {
    gap: 10,
  },
  callLogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  callAvatarWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  callAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  directionBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  callInfoCol: {
    flex: 1,
    gap: 2,
  },
  callContactName: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callMetaText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  callDurationText: {
    fontSize: 10,
    fontFamily: Fonts.medium,
  },
  callListingTag: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },
  callBackBtnsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  callBackBtn: {
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
})
