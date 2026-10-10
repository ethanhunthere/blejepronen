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
  followUser,
  unfollowUser,
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
  const loadLists = useCallback(async () => {
    if (!visible || !userId) return
    setLoading(true)

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
    }
  }, [visible, userId, onStatsChange])

  useEffect(() => {
    loadLists()
  }, [loadLists])

  // Filter list by search query
  const rawList = activeTab === 'followers' ? followers : following
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return rawList
    const q = searchQuery.toLowerCase().trim()
    return rawList.filter((item) => (item.name || '').toLowerCase().includes(q))
  }, [rawList, searchQuery])

  // Follow / Unfollow inline action
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
    setActionLoadingMap((prev) => ({ ...prev, [targetItem.id]: true }))

    // Optimistic update
    setViewerFollowingSet((prev) => {
      const next = new Set(prev)
      if (isCurrentlyFollowing) {
        next.delete(targetItem.id)
      } else {
        next.add(targetItem.id)
      }
      return next
    })

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      if (isCurrentlyFollowing) {
        const res = await unfollowUser(targetItem.id, token)
        if (!res.success) {
          // Revert optimistic
          setViewerFollowingSet((prev) => {
            const next = new Set(prev)
            next.add(targetItem.id)
            return next
          })
        }
      } else {
        const res = await followUser(targetItem.id, token)
        if (!res.success) {
          // Revert optimistic
          setViewerFollowingSet((prev) => {
            const next = new Set(prev)
            next.delete(targetItem.id)
            return next
          })
        }
      }
    } catch {
      // Revert optimistic on network failure
      setViewerFollowingSet((prev) => {
        const next = new Set(prev)
        if (isCurrentlyFollowing) {
          next.add(targetItem.id)
        } else {
          next.delete(targetItem.id)
        }
        return next
      })
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [targetItem.id]: false }))
    }
  }

  const handleSelectUser = (item: FollowUserItem) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {})
    onClose()
    router.push(`/profili/${item.id}` as any)
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
                  ? 'Ende nuk ka ndiqës'
                  : 'Nuk ndjek asnjë profil ende'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {searchQuery
                  ? `Nuk u gjet asnjë përdorues me termin "${searchQuery}".`
                  : activeTab === 'followers'
                  ? 'Ky profil nuk ka ende ndiqës të regjistruar në platformë.'
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.54)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    maxHeight: '86%',
    minHeight: '52%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
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
