import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  Building2,
  Home,
  Trees,
  Briefcase,
  Warehouse,
  Sparkles,
  Wand2,
  RotateCcw,
  Camera,
  X,
  Check,
  MapPin,
  Tag,
  Maximize2,
  BedDouble,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { BrandColors } from '@/constants/Colors'
import { supabase } from '@/lib/supabase'
import { CATEGORIES, PropertyCategory } from '@/lib/categories'
import { KOSOVO_LOCATIONS } from '@/lib/kosovo-locations'
import { generateOrEnhanceDescription } from '@/lib/description-helper'

const CATEGORY_KEYS: PropertyCategory[] = ['banese', 'shtepi', 'vile', 'toke', 'lokal', 'garazh']
const CITIES = Object.keys(KOSOVO_LOCATIONS)

export default function PostPropertyScreen() {
  const router = useRouter()

  // Form State
  const [category, setCategory] = useState<PropertyCategory>('banese')
  const [subtype, setSubtype] = useState<string>('2+1')
  const [type, setType] = useState<'shitje' | 'qira'>('shitje')
  const [city, setCity] = useState<string>('Prishtinë')
  const [neighborhood, setNeighborhood] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [area, setArea] = useState<string>('')
  const [rooms, setRooms] = useState<string>('3')
  const [floor, setFloor] = useState<string>('2')
  const [condition, setCondition] = useState<string>('e-re')
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'Parking',
    'Ashensor',
    'Ballkon',
  ])
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [undoDescription, setUndoDescription] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const activeCategory = CATEGORIES[category]

  // Category change with synchronized defaults
  const handleCategorySelect = (catKey: PropertyCategory) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setCategory(catKey)
    const nextCat = CATEGORIES[catKey]
    if (catKey === 'banese') {
      setSubtype('2+1')
      setRooms('3')
      setFloor('2')
    } else if (catKey === 'shtepi') {
      setSubtype(nextCat.subtypes[0] || '')
      setRooms('4')
      setFloor('2 Kate')
    } else {
      setSubtype(nextCat.subtypes[0] || '')
      setRooms(nextCat.hasRooms ? '3' : '0')
      setFloor(nextCat.hasFloors ? (nextCat.floors?.[0] || '1') : '')
    }
  }

  // Smart Description Handler
  const handleSmartDescription = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setUndoDescription(description)

    const enhanced = generateOrEnhanceDescription(
      description,
      {
        category,
        subtype,
        title,
        description,
        price,
        city,
        neighborhood,
        rooms,
        area_m2: area,
        type,
        condition,
        floor,
        features: selectedFeatures,
      },
      activeCategory
    )

    setDescription(enhanced)
    Alert.alert(
      'Sukses',
      description.trim().length > 0
        ? 'Përshkrimi u përmirësua profesionalisht!'
        : 'Përshkrimi profesional u sugjerua me sukses!'
    )
  }

  const handleUndo = () => {
    if (undoDescription !== null) {
      setDescription(undoDescription)
      setUndoDescription(null)
    }
  }

  // Image Picker
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Leje e nevojshme', 'Ju lutemi lejoni aksesin tek fotot.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - images.length,
    })

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((a) => a.uri)
      setImages((prev) => [...prev, ...newUris].slice(0, 10))
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleFeature = (feat: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    )
  }

  // Submit Listing
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Vëmendje', 'Ju lutemi shkruani një titull për pronën.')
      return
    }
    if (!price || isNaN(Number(price))) {
      Alert.alert('Vëmendje', 'Ju lutemi vendosni një çmim të vlefshëm.')
      return
    }
    if (!area || isNaN(Number(area))) {
      Alert.alert('Vëmendje', 'Ju lutemi vendosni sipërfaqen e pronës.')
      return
    }
    if (!description.trim()) {
      Alert.alert('Vëmendje', 'Ju lutemi plotësoni përshkrimin e pronës.')
      return
    }

    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Demo/Fallback user ID if not logged in
      const userId = user?.id || 'guest-user-mobile'

      const { data, error } = await supabase.from('listings').insert([
        {
          user_id: userId,
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          city,
          neighborhood: neighborhood || null,
          address: address.trim() || city,
          rooms: Number(rooms) || 0,
          area_m2: Number(area) || 0,
          type,
          condition,
          floor,
          apartment_type: subtype || activeCategory.titleShort,
          features: selectedFeatures,
          images: images.length > 0 ? images : [],
        },
      ])

      if (error) {
        throw error
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }

      Alert.alert('Urime!', 'Prona juaj u postua me sukses në Bleje Pronën.', [
        { text: 'Në rregull', onPress: () => router.push('/listings' as any) },
      ])
    } catch (err: any) {
      Alert.alert('Gabim', err.message || 'Ndodhi një problem gjatë postimit.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F7F7" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Posto Pronë të Re</Text>
        <Text style={styles.headerSubtitle}>Plotësoni të dhënat e pronës tuaj</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Kategoria e Pronës */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>1. Kategoria e pronës</Text>
          <View style={styles.categoryGrid}>
            {CATEGORY_KEYS.map((catKey) => {
              const cat = CATEGORIES[catKey]
              const isSelected = category === catKey
              return (
                <Pressable
                  key={catKey}
                  style={[styles.catCard, isSelected && styles.catCardSelected]}
                  onPress={() => handleCategorySelect(catKey)}
                >
                  <Text style={[styles.catLabel, isSelected && styles.catLabelSelected]}>
                    {cat.label}
                  </Text>
                  <Text style={styles.catBadge}>{cat.badge}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* SECTION 2: Lloji i Ofertës (Shitje / Qira) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>2. Lloji i ofertës</Text>
          <View style={styles.typeToggle}>
            <Pressable
              style={[styles.typeOption, type === 'shitje' && styles.typeOptionActive]}
              onPress={() => setType('shitje')}
            >
              <Text style={[styles.typeOptionText, type === 'shitje' && styles.typeOptionTextActive]}>
                Në Shitje
              </Text>
            </Pressable>
            <Pressable
              style={[styles.typeOption, type === 'qira' && styles.typeOptionActive]}
              onPress={() => setType('qira')}
            >
              <Text style={[styles.typeOptionText, type === 'qira' && styles.typeOptionTextActive]}>
                Me Qira
              </Text>
            </Pressable>
          </View>
        </View>

        {/* SECTION 3: Lokacioni */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>3. Lokacioni</Text>

          {/* Qyteti */}
          <Text style={styles.inputLabel}>Qyteti *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
            {CITIES.map((c) => {
              const isCSelected = city === c
              return (
                <Pressable
                  key={c}
                  style={[styles.cityChip, isCSelected && styles.cityChipActive]}
                  onPress={() => {
                    setCity(c)
                    setNeighborhood('')
                  }}
                >
                  <Text style={[styles.cityChipText, isCSelected && styles.cityChipTextActive]}>
                    {c}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {/* Lagjja */}
          {city && KOSOVO_LOCATIONS[city]?.length > 0 && (
            <>
              <Text style={styles.inputLabel}>Lagjja në {city}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                {KOSOVO_LOCATIONS[city].map((n) => {
                  const isNSelected = neighborhood === n
                  return (
                    <Pressable
                      key={n}
                      style={[styles.cityChip, isNSelected && styles.cityChipActive]}
                      onPress={() => setNeighborhood(n)}
                    >
                      <Text style={[styles.cityChipText, isNSelected && styles.cityChipTextActive]}>
                        {n}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </>
          )}

          {/* Rruga / Adresa */}
          <Text style={styles.inputLabel}>Rruga ose pika referuese</Text>
          <TextInput
            style={styles.input}
            placeholder="p.sh. Rr. Dëshmorët e Kombit"
            placeholderTextColor={BrandColors.textLight}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* SECTION 4: Të Dhënat & Çmimi */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>4. Çmimi dhe Specifikat</Text>

          {/* Çmimi & Sipërfaqja */}
          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Çmimi (€) *</Text>
              <TextInput
                style={styles.input}
                placeholder="p.sh. 95000"
                placeholderTextColor={BrandColors.textLight}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Sipërfaqja (m²) *</Text>
              <TextInput
                style={styles.input}
                placeholder="p.sh. 85"
                placeholderTextColor={BrandColors.textLight}
                keyboardType="numeric"
                value={area}
                onChangeText={setArea}
              />
            </View>
          </View>

          {/* Dhomat & Kati (nëse aplikohet) */}
          {activeCategory.hasRooms && (
            <View style={styles.fieldBlock}>
              <Text style={styles.inputLabel}>Numri i dhomave</Text>
              <View style={styles.pillGroup}>
                {[1, 2, 3, 4, 5, '6+'].map((r) => {
                  const isRSelected = rooms === String(r)
                  return (
                    <Pressable
                      key={String(r)}
                      style={[styles.pillBtn, isRSelected && styles.pillBtnActive]}
                      onPress={() => setRooms(String(r))}
                    >
                      <Text style={[styles.pillBtnText, isRSelected && styles.pillBtnTextActive]}>
                        {r}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          )}

          {/* Veçoritë */}
          <Text style={styles.inputLabel}>Përparësitë & Veçoritë</Text>
          <View style={styles.featuresWrap}>
            {activeCategory.features.map((feat) => {
              const isFSelected = selectedFeatures.includes(feat)
              return (
                <Pressable
                  key={feat}
                  style={[styles.featureChip, isFSelected && styles.featureChipActive]}
                  onPress={() => toggleFeature(feat)}
                >
                  <Text style={[styles.featureChipText, isFSelected && styles.featureChipTextActive]}>
                    {feat}
                  </Text>
                  {isFSelected && <Check size={12} color="#FFFFFF" />}
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* SECTION 5: Titulli & Përshkrimi Inteligjent */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>5. Titulli dhe Përshkrimi</Text>

          <Text style={styles.inputLabel}>Titulli i shpalljes *</Text>
          <TextInput
            style={styles.input}
            placeholder={activeCategory.titlePlaceholder}
            placeholderTextColor={BrandColors.textLight}
            value={title}
            onChangeText={setTitle}
          />

          {/* Smart Assistant Description Toolbar */}
          <View style={styles.descHeader}>
            <Text style={styles.inputLabel}>Përshkrimi i hollësishëm *</Text>

            <View style={styles.descActions}>
              {undoDescription !== null && (
                <Pressable style={styles.undoBtn} onPress={handleUndo}>
                  <RotateCcw size={12} color={BrandColors.textMuted} />
                  <Text style={styles.undoBtnText}>Kthe</Text>
                </Pressable>
              )}

              <Pressable
                style={[
                  styles.smartBtn,
                  description.trim().length > 0 && styles.smartBtnEnhance,
                ]}
                onPress={handleSmartDescription}
              >
                {description.trim().length > 0 ? (
                  <Wand2 size={13} color={BrandColors.primary} strokeWidth={2.2} />
                ) : (
                  <Sparkles size={13} color={BrandColors.primary} strokeWidth={2.2} />
                )}
                <Text style={styles.smartBtnText}>
                  {description.trim().length > 0
                    ? 'Rregullo & përmirëso'
                    : 'Sugjero përshkrim'}
                </Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            style={styles.textArea}
            placeholder={activeCategory.descriptionPlaceholder}
            placeholderTextColor={BrandColors.textLight}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* SECTION 6: Fotografitë */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>6. Fotografitë e pronës</Text>
          <Text style={styles.helperText}>
            Ngarkoni deri në 10 foto cilësore. Fotoja e parë do të jetë kryesore.
          </Text>

          <View style={styles.imagesGrid}>
            {images.map((uri, idx) => (
              <View key={uri} style={styles.imageThumbContainer}>
                <Image source={{ uri }} style={styles.imageThumb} />
                {idx === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Kryesore</Text>
                  </View>
                )}
                <Pressable
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(idx)}
                >
                  <X size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}

            {images.length < 10 && (
              <Pressable style={styles.uploadBtn} onPress={pickImages}>
                <Camera size={24} color={BrandColors.primary} strokeWidth={2} />
                <Text style={styles.uploadBtnText}>Shto Foto</Text>
                <Text style={styles.uploadBtnCount}>{images.length}/10</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Publiko Pronën Tani</Text>
          )}
        </Pressable>
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
    gap: 16,
    paddingBottom: 48,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BrandColors.border,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  catCardSelected: {
    backgroundColor: 'rgba(0, 100, 89, 0.06)',
    borderColor: BrandColors.primary,
  },
  catLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  catLabelSelected: {
    color: BrandColors.primary,
  },
  catBadge: {
    fontSize: 11,
    color: BrandColors.textMuted,
    marginTop: 2,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 14,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeOptionActive: {
    backgroundColor: BrandColors.primary,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  horizontalChips: {
    flexDirection: 'row',
  },
  cityChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8,
  },
  cityChipActive: {
    backgroundColor: BrandColors.primary,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  cityChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
    gap: 6,
  },
  fieldBlock: {
    gap: 8,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  pillBtn: {
    width: 44,
    height: 38,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtnActive: {
    backgroundColor: BrandColors.primary,
  },
  pillBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  pillBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  featuresWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  featureChipActive: {
    backgroundColor: BrandColors.primary,
  },
  featureChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: BrandColors.textSecondary,
  },
  featureChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  descHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  descActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  undoBtnText: {
    fontSize: 11,
    color: BrandColors.textMuted,
    fontWeight: '600',
  },
  smartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 100, 89, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 100, 89, 0.2)',
  },
  smartBtnEnhance: {
    backgroundColor: 'rgba(200, 184, 130, 0.2)',
    borderColor: 'rgba(200, 184, 130, 0.4)',
  },
  smartBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: BrandColors.textPrimary,
    minHeight: 120,
    lineHeight: 20,
  },
  helperText: {
    fontSize: 12,
    color: BrandColors.textMuted,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  imageThumbContainer: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    width: 96,
    height: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: BrandColors.primary,
    backgroundColor: 'rgba(0, 100, 89, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  uploadBtnCount: {
    fontSize: 10,
    color: BrandColors.textMuted,
  },
  submitButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
})
