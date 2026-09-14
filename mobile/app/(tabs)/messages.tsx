import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { MessageSquare, Clock, ChevronRight, Building2 } from 'lucide-react-native'
import { BrandColors } from '@/constants/Colors'
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
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch conversations from Supabase
    async function loadConversations() {
      try {
        setLoading(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          // If guest, show clean demo / empty state
          setConversations([])
          return
        }

        const { data, error } = await supabase
          .from('conversations')
          .select('*, listings(id, title, images), buyer:buyer_id(first_name, last_name), seller:seller_id(first_name, last_name)')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order('updated_at', { ascending: false })

        if (error) {
          console.error('Error fetching conversations:', error)
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
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F7F7" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesazhet</Text>
        <Text style={styles.headerSubtitle}>Bisedat me blerësit dhe shitësit</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Duke ngarkuar bisedat...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MessageSquare size={36} color={BrandColors.primary} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>Asnjë mesazh ende</Text>
            <Text style={styles.emptySubtitle}>
              Kur të dërgoni apo pranoni mesazhe rreth pronave, bisedat tuaja do të shfaqen këtu.
            </Text>
            <Pressable
              style={styles.exploreBtn}
              onPress={() => router.push('/listings' as any)}
            >
              <Text style={styles.exploreBtnText}>Eksploro Pronat</Text>
            </Pressable>
          </View>
        ) : (
          conversations.map((item) => (
            <Pressable
              key={item.id}
              style={styles.conversationCard}
              onPress={() => {
                // Navigate to chat detail
              }}
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
                  <Text style={styles.senderName} numberOfLines={1}>
                    {item.seller_name}
                  </Text>
                  <Text style={styles.timeText}>{item.last_time}</Text>
                </View>

                <Text style={styles.propertyTitle} numberOfLines={1}>
                  {item.listing_title}
                </Text>

                <Text style={styles.messagePreview} numberOfLines={1}>
                  {item.last_message}
                </Text>
              </View>

              <ChevronRight size={18} color={BrandColors.textLight} />
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
    backgroundColor: '#F2F7F7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: BrandColors.textMuted,
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
    color: BrandColors.textMuted,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BrandColors.border,
    marginTop: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BrandColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: BrandColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  exploreBtn: {
    marginTop: 8,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  conversationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: BrandColors.border,
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
    backgroundColor: '#F3F4F6',
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
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  timeText: {
    fontSize: 11,
    color: BrandColors.textLight,
  },
  propertyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  messagePreview: {
    fontSize: 13,
    color: BrandColors.textMuted,
  },
})
