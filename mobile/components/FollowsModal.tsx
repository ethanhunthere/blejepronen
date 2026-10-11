import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import {
  X,
  Search,
  Users,
  ShieldCheck,
  Building2,
  UserCheck,
  UserPlus,
  UserX,
  MoreHorizontal,
  User,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react-native'

import { useTheme, Fonts } from '@/constants/theme'
import { getAvatarSource } from '@/lib/avatars'
import { supabase } from '@/lib/supabase'
import { getSyncAuthUser } from '@/lib/auth-cache'
import {
  fetchFollowStats,
  toggleFollowUser,
  removeFollowerUser,
  subscribeSocialGraph,
  FollowUserItem,
} from '@/lib/social-graph'
import { openLoginScreen } from '@/lib/navigation'

export interface FollowsModalProps {
  visible: boolean
  onClose: () => void
  userId: string
  userName: string
  initialTab?: 'followers' | 'following'
  initialFollowersCount?: number
  initialFollowingCount?: number
  onStatsChange?: (followersCount: number, followingCount: number) => void
}

export function FollowsModal({
  visible,
  onClose,
  userId,
  userName,
  initialTab = 'followers',
  initialFollowersCount = 0,
  initialFollowingCount = 0,
  onStatsChange,
}: FollowsModalProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, theme } = useTheme()

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [followers, setFollowers] = useState<FollowUserItem[]>([])
  const [following, setFollowing] = useState<FollowUserItem[]>([])
  const [viewerFollowingSet, setViewerFollowingSet] = useState<Set<string>>(new Set())
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [followingCount, setFollowingCount] = useState(initialFollowingCount)
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({})

  // Contextual action menu state
  const [selectedUserForMenu, setSelectedUserForMenu] = useState<FollowUserItem | null>(null)

  const currentViewer = getSyncAuthUser()
  const currentViewerId = currentViewer?.id || null
  const isViewingSelf = Boolean(currentViewerId && currentViewerId === userId)

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab)
      setSearchQuery('')
      setSelectedUserForMenu(null)
    }
  }, [visible, initialTab])

  // Load followers/following list
  const loadLists = useCallback(
    async (isPullRefresh = false) => {
      if (!visible || !userId) return
      if (isPullRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token || null

        const stats = await fetchFollowStats(userId, true, token)
        setFollowers(stats.followers || [])
        setFollowing(stats.following || [])
        setFollowersCount(stats.followersCount)
        setFollowingCount(stats.followingCount)

        if (stats.viewerFollowingIds) {
          setViewerFollowingSet(new Set(stats.viewerFollowingIds))
        }

        onStatsChange?.(stats.followersCount, stats.followingCount)
      } catch (err) {
        console.warn('Failed to load follows lists:', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [visible, userId, onStatsChange]
  )

  useEffect(() => {
    loadLists()
  }, [loadLists])

  // Real-time synchronization with global social graph store
  useEffect(() => {
    if (!visible) return
    const unsub = subscribeSocialGraph((evt) => {
      // If target user is the profile whose modal is open
      if (evt.targetUserId === userId) {
        setFollowersCount(evt.targetMetrics.followersCount)
      }
      if (evt.viewerUserId === userId) {
        setFollowingCount(evt.viewerMetrics.followingCount)
      }

      // If current viewer followed/unfollowed a user in this list
      if (currentViewerId && evt.viewerUserId === currentViewerId) {
        setViewerFollowingSet((prev) => {
          const next = new Set(prev)
          if (evt.action === 'follow') {
            next.add(evt.targetUserId)
          } else {
            next.delete(evt.targetUserId)
          }
          return next
        })
      }
    })
    return unsub
  }, [visible, userId, currentViewerId])

  // Filter list by search query
  const rawList = activeTab === 'followers' ? followers : following
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return rawList
    const q = searchQuery.toLowerCase().trim()
    return rawList.filter((item) => {
      const nameMatch = (item.name || '').toLowerCase().includes(q)
      const roleMatch = item.isCompany && 'agjenci'.includes(q)
      return nameMatch || roleMatch
    })
  }, [rawList, searchQuery])

  // Follow / Unfollow inline action with reliable optimistic count updates
  const handleToggleFollow = async (targetItem: FollowUserItem) => {
    if (!currentViewerId) {
      onClose()
      openLoginScreen(router, {
        redirectTo: `/profili/${userId}`,
        reason: 'follow',
      })
      return
    }

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {})
    }

    const isCurrentlyFollowing = viewerFollowingSet.has(targetItem.id)
    const isTargetProfileOwner = targetItem.id === userId

    setActionLoadingMap((prev) => ({ ...prev, [targetItem.id]: true }))

    // Optimistically update viewer following set
    setViewerFollowingSet((prev) => {
      const next = new Set(prev)
      if (isCurrentlyFollowing) {
        next.delete(targetItem.id)
      } else {
        next.add(targetItem.id)
      }
      return next
    })

    // Optimistically update counts
    const prevFollowers = followersCount
    const prevFollowing = followingCount
    const delta = isCurrentlyFollowing ? -1 : 1

    const nextFollowing = isViewingSelf
      ? Math.max(0, followingCount + delta)
      : followingCount
    const nextFollowers = isTargetProfileOwner
      ? Math.max(0, followersCount + delta)
      : followersCount

    setFollowingCount(nextFollowing)
    setFollowersCount(nextFollowers)
    onStatsChange?.(nextFollowers, nextFollowing)

    try {
      const res = await toggleFollowUser(targetItem.id, {
        name: targetItem.name,
      })
      if (!res.success) {
        // Rollback
        setViewerFollowingSet((prev) => {
          const next = new Set(prev)
          if (isCurrentlyFollowing) next.add(targetItem.id)
          else next.delete(targetItem.id)
          return next
        })
        setFollowingCount(prevFollowing)
        setFollowersCount(prevFollowers)
        onStatsChange?.(prevFollowers, prevFollowing)
      }
    } catch {
      // Rollback
      setViewerFollowingSet((prev) => {
        const next = new Set(prev)
        if (isCurrentlyFollowing) next.add(targetItem.id)
        else next.delete(targetItem.id)
        return next
      })
      setFollowingCount(prevFollowing)
      setFollowersCount(prevFollowers)
      onStatsChange?.(prevFollowers, prevFollowing)
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [targetItem.id]: false }))
    }
  }

  // Remove a follower (only available if viewing own profile followers)
  const handleRemoveFollower = async (targetItem: FollowUserItem) => {
    setSelectedUserForMenu(null)

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    }

    // 1. Optimistic list removal on frame zero
    const previousFollowers = followers
    const previousCount = followersCount

    setFollowers((prev) => prev.filter((item) => item.id !== targetItem.id))
    const nextCount = Math.max(0, followersCount - 1)
    setFollowersCount(nextCount)
    onStatsChange?.(nextCount, followingCount)

    try {
      const res = await removeFollowerUser(targetItem.id)
      if (!res.success) {
        // Rollback on failure
        setFollowers(previousFollowers)
        setFollowersCount(previousCount)
        onStatsChange?.(previousCount, followingCount)
        Alert.alert('Gabim', res.error || 'Nuk mund të hiqet ndjekësi.')
      }
    } catch {
      setFollowers(previousFollowers)
      setFollowersCount(previousCount)
      onStatsChange?.(previousCount, followingCount)
      Alert.alert('Gabim', 'Ndodhi një gabim gjatë heqjes së ndjekësit.')
    }
  }

  // Block user action
  const handleBlockUser = (targetItem: FollowUserItem) => {
    setSelectedUserForMenu(null)
    Alert.alert(
      'Blloko Profilin',
      `A jeni të sigurt që dëshironi të bllokoni ${targetItem.name}? Nuk do të mund të shihni më postimet apo njoftimet nga ky përdorues.`,
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Blloko',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
            }
            // Optimistically remove from both lists
            setFollowers((prev) => prev.filter((u) => u.id !== targetItem.id))
            setFollowing((prev) => prev.filter((u) => u.id !== targetItem.id))
            if (viewerFollowingSet.has(targetItem.id)) {
              handleToggleFollow(targetItem)
            }
          },
        },
      ]
    )
  }

  const handleSelectUser = (item: FollowUserItem) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
    onClose()
    router.push({
      pathname: '/profili/[id]',
      params: {
        id: item.id,
        initialName: item.name,
        initialAvatar: item.avatarUrl || '',
        initialIsCompany: item.isCompany ? '1' : '0',
        initialVerified: item.isVerified ? '1' : '0',
      },
    } as any)
  }

  const renderItem = ({ item }: { item: FollowUserItem }) => {
    const isViewer = item.id === currentViewerId
    const isFollowingThisUser = viewerFollowingSet.has(item.id)
    const isActionLoading = actionLoadingMap[item.id]

    return (
      <Pressable
        style={({ pressed }) => [
          styles.userRow,
          {
            backgroundColor: pressed ? colors.surfaceSubtle : colors.surface,
            borderBottomColor: colors.borderSubtle,
          },
        ]}
        onPress={() => handleSelectUser(item)}
      >
        {/* Avatar with optional Verified Badge */}
        <View style={styles.avatarWrap}>
          <Image
            source={getAvatarSource(item.avatarUrl)}
            style={styles.avatarImg}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {item.isVerified && (
            <View
              style={[
                styles.verifiedBadge,
                { backgroundColor: theme === 'green' ? colors.gold : '#10B981' },
              ]}
            >
              <ShieldCheck size={9} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
        </View>

        {/* User Identity Info */}
        <View style={styles.userInfoCol}>
          <View style={styles.userNameRow}>
            <Text
              style={[styles.userNameText, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.isCompany && (
              <View
                style={[
                  styles.companyTag,
                  {
                    backgroundColor:
                      theme === 'green'
                        ? 'rgba(212, 175, 55, 0.12)'
                        : colors.primaryLight,
                  },
                ]}
              >
                <Building2
                  size={10}
                  color={theme === 'green' ? colors.gold : colors.primary}
                  strokeWidth={2.4}
                />
                <Text
                  style={[
                    styles.companyTagText,
                    { color: theme === 'green' ? colors.gold : colors.primary },
                  ]}
                >
                  Agjenci
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.userHandleText, { color: colors.textMuted }]} numberOfLines={1}>
            {item.isCompany ? 'Agjenci imobiliare e certifikuar' : 'Përdorues i regjistruar'}
          </Text>
        </View>

        {/* Action Buttons Column */}
        <View style={styles.rightActionsRow}>
          {!isViewer && (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                isFollowingThisUser
                  ? [
                      styles.followingBtn,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                      },
                    ]
                  : [
                      styles.followBtn,
                      {
                        backgroundColor: colors.primary,
                        borderColor: colors.primaryDark,
                      },
                    ],
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={(e) => {
                e.stopPropagation()
                handleToggleFollow(item)
              }}
              disabled={isActionLoading}
              hitSlop={6}
            >
              {isActionLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isFollowingThisUser ? colors.textPrimary : '#FFFFFF'}
                />
              ) : isFollowingThisUser ? (
                <>
                  <UserCheck size={12.5} color={colors.textPrimary} strokeWidth={2.2} />
                  <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
                    Ndjekur
                  </Text>
                </>
              ) : (
                <>
                  <UserPlus size={12.5} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                    Ndjek
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {/* Contextual 3-Dot Management Button */}
          {!isViewer && (
            <Pressable
              style={({ pressed }) => [
                styles.menuTriggerBtn,
                { backgroundColor: colors.surfaceSubtle },
                pressed && { opacity: 0.65 },
              ]}
              onPress={(e) => {
                e.stopPropagation()
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync().catch(() => {})
                }
                setSelectedUserForMenu(item)
              }}
              hitSlop={8}
            >
              <MoreHorizontal size={17} color={colors.textSecondary} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      </Pressable>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.fullScreenRoot,
          {
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'ios' ? insets.top : Math.max(insets.top, 12),
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flexFill}
        >
          {/* Top Edge-to-Edge Navigation Bar */}
          <View
            style={[
              styles.navHeader,
              {
                borderBottomColor: colors.borderSubtle,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {/* Close Button ("X") */}
            <Pressable
              style={({ pressed }) => [
                styles.navCloseBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                },
                pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                onClose()
              }}
              hitSlop={12}
            >
              <X size={19} color={colors.textPrimary} strokeWidth={2.4} />
            </Pressable>

            {/* Modal Title */}
            <View style={styles.navTitleCenter}>
              <Text
                style={[styles.navTitleText, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {userName || 'Profili'}
              </Text>
              <Text
                style={[styles.navSubtitleText, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {activeTab === 'followers' ? 'Ndjekësit e profilit' : 'Profilet e ndjekura'}
              </Text>
            </View>

            {/* Right Balancer Spacer */}
            <View style={styles.navRightPlaceholder} />
          </View>

          {/* Segmented Dual-Tab Switcher */}
          <View style={[styles.segmentContainer, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.segmentTrack,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              {/* Followers Tab */}
              <Pressable
                style={[
                  styles.segmentTab,
                  activeTab === 'followers' && [
                    styles.segmentTabActive,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ],
                ]}
                onPress={() => {
                  if (activeTab !== 'followers') {
                    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                    setActiveTab('followers')
                  }
                }}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color:
                        activeTab === 'followers'
                          ? colors.textPrimary
                          : colors.textSecondary,
                      fontFamily:
                        activeTab === 'followers' ? Fonts.bold : Fonts.medium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Ndjekësit
                </Text>
                <View
                  style={[
                    styles.countPill,
                    {
                      backgroundColor:
                        activeTab === 'followers'
                          ? theme === 'green'
                            ? 'rgba(0, 103, 91, 0.12)'
                            : colors.primaryLight
                          : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countPillText,
                      {
                        color:
                          activeTab === 'followers'
                            ? colors.primary
                            : colors.textMuted,
                        fontFamily: Fonts.bold,
                      },
                    ]}
                  >
                    {followersCount.toLocaleString('sq-AL')}
                  </Text>
                </View>
              </Pressable>

              {/* Following Tab */}
              <Pressable
                style={[
                  styles.segmentTab,
                  activeTab === 'following' && [
                    styles.segmentTabActive,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ],
                ]}
                onPress={() => {
                  if (activeTab !== 'following') {
                    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                    setActiveTab('following')
                  }
                }}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color:
                        activeTab === 'following'
                          ? colors.textPrimary
                          : colors.textSecondary,
                      fontFamily:
                        activeTab === 'following' ? Fonts.bold : Fonts.medium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Të Ndjekurit
                </Text>
                <View
                  style={[
                    styles.countPill,
                    {
                      backgroundColor:
                        activeTab === 'following'
                          ? theme === 'green'
                            ? 'rgba(0, 103, 91, 0.12)'
                            : colors.primaryLight
                          : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countPillText,
                      {
                        color:
                          activeTab === 'following'
                            ? colors.primary
                            : colors.textMuted,
                        fontFamily: Fonts.bold,
                      },
                    ]}
                  >
                    {followingCount.toLocaleString('sq-AL')}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Integrated Instant Search Bar */}
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Search size={16} color={colors.textMuted} strokeWidth={2.2} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder={
                  activeTab === 'followers'
                    ? 'Kërko ndjekës me emër ose agjenci...'
                    : 'Kërko profilet e ndjekura...'
                }
                placeholderTextColor={colors.placeholder || colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {Boolean(searchQuery) && Platform.OS === 'android' && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={15} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Main User List & States */}
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Duke ngarkuar listën e plotë...
              </Text>
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconBox,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
              >
                {searchQuery ? (
                  <UserX size={32} color={colors.textMuted} strokeWidth={1.8} />
                ) : (
                  <Users size={32} color={colors.textMuted} strokeWidth={1.8} />
                )}
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {searchQuery
                  ? 'Asnjë profil nuk u gjet'
                  : activeTab === 'followers'
                  ? 'Nuk ka ndjekës ende'
                  : 'Nuk ndjek asnjë profil ende'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {searchQuery
                  ? `Nuk u gjet asnjë profil që përputhet me kërkimin "${searchQuery}".`
                  : activeTab === 'followers'
                  ? 'Ky profil nuk ka ende ndjekës aktivë të regjistruar në platformë.'
                  : 'Ky profil nuk ka filluar ende të ndjekë agjenci apo profile të tjera.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredList}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: Math.max(insets.bottom, 24) + 16 },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadLists(true)}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            />
          )}
        </KeyboardAvoidingView>

        {/* High-Craft Contextual Actions Sheet */}
        {selectedUserForMenu && (
          <Modal
            transparent
            animationType="fade"
            visible={Boolean(selectedUserForMenu)}
            onRequestClose={() => setSelectedUserForMenu(null)}
          >
            <Pressable
              style={styles.sheetOverlay}
              onPress={() => setSelectedUserForMenu(null)}
            >
              <View
                style={[
                  styles.sheetContent,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    paddingBottom: Math.max(insets.bottom, 20),
                  },
                ]}
                onStartShouldSetResponder={() => true}
              >
                {/* User Header Preview */}
                <View
                  style={[
                    styles.sheetHeader,
                    { borderBottomColor: colors.borderSubtle },
                  ]}
                >
                  <Image
                    source={getAvatarSource(selectedUserForMenu.avatarUrl)}
                    style={styles.sheetAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.sheetHeaderTextCol}>
                    <Text
                      style={[styles.sheetUserName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {selectedUserForMenu.name}
                    </Text>
                    <Text
                      style={[styles.sheetUserRole, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {selectedUserForMenu.isCompany ? 'Agjenci Imobiliare' : 'Përdorues'}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.sheetCloseBtn}
                    onPress={() => setSelectedUserForMenu(null)}
                    hitSlop={8}
                  >
                    <X size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Actions List */}
                <View style={styles.sheetActionsList}>
                  {/* Action 1: Shiko Profilin */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetActionItem,
                      pressed && { backgroundColor: colors.surfaceSubtle },
                    ]}
                    onPress={() => {
                      const user = selectedUserForMenu
                      setSelectedUserForMenu(null)
                      handleSelectUser(user)
                    }}
                  >
                    <View
                      style={[
                        styles.sheetActionIcon,
                        { backgroundColor: colors.surfaceSubtle },
                      ]}
                    >
                      <User size={18} color={colors.textPrimary} strokeWidth={2.2} />
                    </View>
                    <Text
                      style={[styles.sheetActionLabel, { color: colors.textPrimary }]}
                    >
                      Shiko Profilin
                    </Text>
                    <ArrowRight size={16} color={colors.textMuted} />
                  </Pressable>

                  {/* Action 2: Hiq Ndjekësin (If viewing own followers list) */}
                  {isViewingSelf && activeTab === 'followers' && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.sheetActionItem,
                        pressed && { backgroundColor: colors.surfaceSubtle },
                      ]}
                      onPress={() => handleRemoveFollower(selectedUserForMenu)}
                    >
                      <View
                        style={[
                          styles.sheetActionIcon,
                          { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                        ]}
                      >
                        <UserX size={18} color="#EF4444" strokeWidth={2.2} />
                      </View>
                      <View style={styles.sheetActionTextWrap}>
                        <Text style={[styles.sheetActionLabel, { color: '#EF4444' }]}>
                          Hiq Ndjekësin
                        </Text>
                        <Text
                          style={[
                            styles.sheetActionDesc,
                            { color: colors.textMuted },
                          ]}
                        >
                          Nuk do t'ju ndjekë më dhe nuk do të njoftohet.
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {/* Action 3: Blloko Profilin */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetActionItem,
                      pressed && { backgroundColor: colors.surfaceSubtle },
                    ]}
                    onPress={() => handleBlockUser(selectedUserForMenu)}
                  >
                    <View
                      style={[
                        styles.sheetActionIcon,
                        { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                      ]}
                    >
                      <ShieldAlert size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.sheetActionTextWrap}>
                      <Text style={[styles.sheetActionLabel, { color: '#EF4444' }]}>
                        Blloko
                      </Text>
                      <Text
                        style={[
                          styles.sheetActionDesc,
                          { color: colors.textMuted },
                        ]}
                      >
                        Nuk do të mund të shohë postimet tuaja.
                      </Text>
                    </View>
                  </Pressable>
                </View>

                {/* Cancel Button */}
                <Pressable
                  style={[
                    styles.sheetCancelBtn,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setSelectedUserForMenu(null)}
                >
                  <Text
                    style={[styles.sheetCancelText, { color: colors.textPrimary }]}
                  >
                    Anulo
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fullScreenRoot: {
    flex: 1,
  },
  flexFill: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  navTitleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  navTitleText: {
    fontSize: 16.5,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  navSubtitleText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 1,
    textAlign: 'center',
  },
  navRightPlaceholder: {
    width: 36,
    height: 36,
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  segmentTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
    gap: 6,
  },
  segmentTabActive: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 13.5,
  },
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countPillText: {
    fontSize: 11.5,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    paddingVertical: 0,
  },
  listContent: {
    paddingTop: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userInfoCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  userNameText: {
    fontSize: 14.5,
    fontFamily: Fonts.semiBold,
  },
  companyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  companyTagText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  userHandleText: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 33,
    borderRadius: 16.5,
    borderWidth: 1,
    gap: 5,
    minWidth: 78,
  },
  followBtn: {},
  followingBtn: {},
  actionBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  menuTriggerBtn: {
    width: 33,
    height: 33,
    borderRadius: 16.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLoading: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  emptyState: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  sheetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  sheetHeaderTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sheetUserName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  sheetUserRole: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionsList: {
    paddingVertical: 8,
    gap: 4,
  },
  sheetActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 12,
  },
  sheetActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sheetActionLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  sheetActionDesc: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
  },
  sheetCancelBtn: {
    marginTop: 6,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sheetCancelText: {
    fontSize: 14.5,
    fontFamily: Fonts.semiBold,
  },
})
