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
} from 'lucide-react-native'

import { useTheme, Fonts } from '@/constants/theme'
import { getAvatarSource } from '@/lib/avatars'
import { supabase } from '@/lib/supabase'
import { getSyncAuthUser } from '@/lib/auth-cache'
import {
  fetchFollowStats,
  toggleFollowUser,
  subscribeSocialGraph,
  getSocialMetrics,
  FollowUserItem,
} from '@/lib/social-graph'
import { openLoginScreen } from '@/lib/navigation'

interface FollowsModalProps {
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

  const currentViewer = getSyncAuthUser()
  const currentViewerId = currentViewer?.id || null

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab)
      setSearchQuery('')
    }
  }, [visible, initialTab])

  // Load followers/following list
  const loadLists = useCallback(async (isPullRefresh = false) => {
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
  }, [visible, userId, onStatsChange])

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
    return rawList.filter((item) => (item.name || '').toLowerCase().includes(q))
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
    const isViewingSelf = userId === currentViewerId
    const isTargetProfileOwner = targetItem.id === userId

    setActionLoadingMap((prev) => ({ ...prev, [targetItem.id]: true }))

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
        setFollowingCount(prevFollowing)
        setFollowersCount(prevFollowers)
        onStatsChange?.(prevFollowers, prevFollowing)
      }
    } catch {
      setFollowingCount(prevFollowing)
      setFollowersCount(prevFollowers)
      onStatsChange?.(prevFollowers, prevFollowing)
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [targetItem.id]: false }))
    }
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
                        ? 'rgba(212, 175, 55, 0.14)'
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
        </View>

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
              pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] },
            ]}
            onPress={(e) => {
              e.stopPropagation()
              handleToggleFollow(item)
            }}
            disabled={isActionLoading}
            hitSlop={8}
          >
            {isActionLoading ? (
              <ActivityIndicator
                size="small"
                color={isFollowingThisUser ? colors.textPrimary : '#FFFFFF'}
              />
            ) : isFollowingThisUser ? (
              <>
                <UserCheck size={13} color={colors.textPrimary} strokeWidth={2.2} />
                <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
                  Ndjekur
                </Text>
              </>
            ) : (
              <>
                <UserPlus size={13} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                  Ndjek
                </Text>
              </>
            )}
          </Pressable>
        )}
      </Pressable>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header Drag Handle */}
          <View style={styles.dragHandleRow}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          </View>

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <Text
              style={[styles.headerTitle, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {userName}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: colors.surfaceSubtle },
                pressed && { opacity: 0.7 },
              ]}
              onPress={onClose}
              hitSlop={12}
            >
              <X size={18} color={colors.textPrimary} strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabBar, { borderBottomColor: colors.borderSubtle }]}>
            <Pressable
              style={[
                styles.tabBtn,
                activeTab === 'followers' && [
                  styles.tabBtnActive,
                  { borderBottomColor: colors.primary },
                ],
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                setActiveTab('followers')
              }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      activeTab === 'followers'
                        ? colors.primary
                        : colors.textSecondary,
                    fontFamily:
                      activeTab === 'followers' ? Fonts.bold : Fonts.medium,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Ndiqësit ({followersCount})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabBtn,
                activeTab === 'following' && [
                  styles.tabBtnActive,
                  { borderBottomColor: colors.primary },
                ],
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
                setActiveTab('following')
              }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color:
                      activeTab === 'following'
                        ? colors.primary
                        : colors.textSecondary,
                    fontFamily:
                      activeTab === 'following' ? Fonts.bold : Fonts.medium,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Duke ndjekur ({followingCount})
              </Text>
            </Pressable>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Search size={16} color={colors.textMuted} strokeWidth={2.2} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Kërko me emër..."
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

          {/* Content List */}
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Duke ngarkuar listën...
              </Text>
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconBox,
                  { backgroundColor: colors.surfaceSubtle },
                ]}
              >
                {searchQuery ? (
                  <UserX size={30} color={colors.textMuted} strokeWidth={1.8} />
                ) : (
                  <Users size={30} color={colors.textMuted} strokeWidth={1.8} />
                )}
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {searchQuery
                  ? 'Asnjë profil nuk përputhet'
                  : activeTab === 'followers'
                  ? 'Ende nuk ka ndjekës'
                  : 'Nuk ndjek asnjë profil ende'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {searchQuery
                  ? `Nuk u gjet asnjë përdorues me termin "${searchQuery}".`
                  : activeTab === 'followers'
                  ? 'Ky profil nuk ka ende ndjekës të regjistruar në platformë.'
                  : 'Ky profil nuk ka filluar ende të ndjekë përdorues apo agjenci të tjera.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredList}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
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
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 580,
    maxHeight: Platform.OS === 'web' ? '86%' : '88%',
    minHeight: Platform.OS === 'web' ? 520 : '58%',
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 20,
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomWidth: 2.5,
  },
  tabBtnText: {
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontFamily: Fonts.regular,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  userNameText: {
    fontSize: 14,
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
    fontSize: 10.5,
    fontFamily: Fonts.bold,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    gap: 5,
    minWidth: 84,
  },
  followBtn: {},
  followingBtn: {},
  actionBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.bold,
  },
  centerLoading: {
    flex: 1,
    minHeight: 200,
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
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 8,
  },
  emptyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
})
