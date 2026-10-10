import { useEffect, useState } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bookmark, BookmarkCheck, Trash2, X, Lock } from 'lucide-react-native'

import { useTheme, useSemantic } from '@/constants/theme'
import {
  fetchSavedSearches,
  createSavedSearch,
  removeSavedSearch,
  type SavedSearchItem,
  type SaveSearchParams,
} from '@/lib/saved-searches'
import { getSyncAuthUser } from '@/lib/auth-cache'
import { openLoginScreen } from '@/lib/navigation'

export interface SavedSearchSnapshot extends SaveSearchParams {
  label: string
}

interface SavedSearchesSheetProps {
  visible: boolean
  onClose: () => void
  current: SavedSearchSnapshot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- expo-router instance
  router: any
}

export function SavedSearchesSheet({ visible, onClose, current, router }: SavedSearchesSheetProps) {
  const { colors } = useTheme()
  const semantic = useSemantic()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<SavedSearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    const user = getSyncAuthUser()
    setAuthed(Boolean(user))
    if (!user) {
      setItems([])
      return
    }
    let mounted = true
    setLoading(true)
    setNotice(null)
    fetchSavedSearches()
      .then((rows) => {
        if (mounted) setItems(rows)
      })
      .catch(() => {
        if (mounted) setNotice('Kërkimet nuk u ngarkuan. Provo përsëri.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [visible])

  const handleSave = async () => {
    setSaving(true)
    const res = await createSavedSearch({ ...current, title: current.label })
    setSaving(false)
    if (res.success && res.savedSearch) {
      setNotice(null)
      setItems((prev) => [res.savedSearch as SavedSearchItem, ...prev])
    } else {
      setNotice(res.error || 'Ruajtja dështoi. Provo përsëri.')
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await removeSavedSearch(id)
    if (ok) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      setNotice('Fshirja dështoi. Provo përsëri.')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Mbyll" />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            paddingBottom: Math.max(16, insets.bottom),
          },
        ]}
      >
        <View style={styles.handleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Kërkimet e ruajtura</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Mbyll">
            <X size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {!authed ? (
          <Pressable
            style={[styles.loginRow, { borderColor: colors.border }]}
            onPress={() => {
              onClose()
              openLoginScreen(router, { redirectTo: '/listings', reason: 'saved-search' })
            }}
            accessibilityRole="button"
          >
            <Lock size={16} color={colors.primary} />
            <Text style={[styles.loginText, { color: colors.primary }]}>
              Kyçuni për të ruajtur kërkimet
            </Text>
          </Pressable>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            Ende s'keni kërkime të ruajtura. Ruani filtrat aktualë për t'u njoftuar kur shtohen
            prona të reja.
          </Text>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
            {items.map((item) => (
              <View key={item.id} style={[styles.row, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <BookmarkCheck size={16} color={colors.primary} />
                <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  {item.title || 'Kërkim pa titull'}
                </Text>
                <Pressable onPress={() => void handleDelete(item.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fshi kërkimin">
                  <Trash2 size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        {notice ? (
          <Text style={[styles.notice, { color: semantic.dangerText }]}>{notice}</Text>
        ) : null}

        {authed && (
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={() => void handleSave()}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Bookmark size={16} color="#FFFFFF" />
                <Text style={[styles.saveBtnText, { color: colors.chipTextActive }]}>Ruaj kërkimin aktual</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '70%',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  center: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  empty: {
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: 12,
  },
  list: {
    maxHeight: 240,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  loginText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    marginTop: 4,
  },
  notice: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
})
