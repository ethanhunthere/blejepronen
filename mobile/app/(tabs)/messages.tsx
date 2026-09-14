import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { MessageSquare, ChevronRight } from 'lucide-react-native'
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
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadConversations() {
      try {
        setLoading(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()

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
      }
    }

    loadConversations()
  }, [])

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
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Duke ngarkuar bisedat...
            </Text>
          </View>
        ) : conversations.length === 0 ? (
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
              Kur të dërgoni apo pranoni mesazhe rreth pronave, bisedat tuaja do të shfaqen këtu.
            </Text>
            <Pressable
              style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/listings' as any)}
            >
              <Text
                style={[
                  styles.exploreBtnText,
                  { color: theme === 'green' ? '#003E37' : '#FFFFFF' },
                ]}
              >
                Eksploro Pronat
              </Text>
            </Pressable>
          </View>
        ) : (
          conversations.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.conversationCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => {}}
            >
              <Image
                source={{
                  uri:
                    item.listing_image ||
                    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
                }}
                style={styles.thumbnail}
                contentFit="cover"
              />

              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.senderName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.seller_name}
                  </Text>
                  <Text style={[styles.timeText, { color: colors.textLight }]}>{item.last_time}</Text>
                </View>

                <Text style={[styles.propertyTitle, { color: colors.primary }]} numberOfLines={1}>
                  {item.listing_title}
                </Text>

                <Text style={[styles.messagePreview, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.last_message}
                </Text>
              </View>

              <ChevronRight size={18} color={colors.textLight} />
            </Pressable>
          ))
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  centerContainer: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  exploreBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  exploreBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  conversationCard: {
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#1F2937',
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  timeText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  propertyTitle: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  messagePreview: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
})
