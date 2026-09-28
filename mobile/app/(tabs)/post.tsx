import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native'
import Animated from 'react-native-reanimated'
import { useTabBarCollapseOnScroll } from '@/lib/tab-bar-scroll'
import { Image } from 'expo-image'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  getSyncAuthUser,
  isAuthCacheHydrated,
  subscribeAuthCache,
} from '@/lib/auth-cache'
import {
  PlusCircle,
  FileText,
  RotateCcw,
  Camera,
  Image as ImageIcon,
  X,
  Check,
  LogIn,
  UserPlus,
  Calculator,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { useTheme, Fonts } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { CATEGORIES, PropertyCategory } from '@/lib/categories'
import {
  ALL_CITIES,
  getNeighborhoods,
} from '@/lib/kosovo-locations'
import {
  generateOrEnhanceDescription,
  generateProfessionalTitle,
  validatePropertyFilters,
} from '@/lib/description-helper'
import { useBanner } from '@/context/BannerContext'
import { openLoginScreen, openRegisterScreen } from '@/lib/navigation'

const CATEGORY_KEYS: PropertyCategory[] = ['banese', 'shtepi', 'vile', 'toke', 'lokal', 'garazh']
const CITIES = ALL_CITIES

export default function PostPropertyScreen() {
  const router = useRouter()
  const { colors, theme } = useTheme()
  const tabBarScrollHandler = useTabBarCollapseOnScroll()

  const specularBorder = colors.border

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
  // Only features that actually exist for the initial category ('banese') are seeded,
  // so the form never ships feature values that aren't rendered/selectable.
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(() =>
    ['Parking', 'Ashensor', 'Ballkon'].filter((f) => CATEGORIES.banese.features.includes(f))
  )
  const [title, setTitle] = useState<string>('')
  const [undoTitle, setUndoTitle] = useState<string | null>(null)
  const [description, setDescription] = useState<string>('')
  const [undoDescription, setUndoDescription] = useState<string | null>(null)
  const { showBanner } = useBanner()
  const [images, setImages] = useState<string[]>([])
  const insets = useSafeAreaInsets()
  const syncUser = getSyncAuthUser()
  const [currentUser, setCurrentUser] = useState<any>(() => syncUser)
  const [authChecking, setAuthChecking] = useState(() => !isAuthCacheHydrated())
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<
    'title' | 'description' | 'price' | 'area' | 'address' | null
  >(null)

  useEffect(() => {
    const unsub = subscribeAuthCache((state) => {
      setCurrentUser(state.user)
      setAuthChecking(false)
    })
    return unsub
  }, [])

  const activeCategory = CATEGORIES[category]

  const handleCategorySelect = (catKey: PropertyCategory) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    setCategory(catKey)
    const nextCat = CATEGORIES[catKey]
    // Drop any selected feature that the new category doesn't offer, so we never
    // submit values that aren't rendered as chips for this category.
    setSelectedFeatures((prev) => prev.filter((f) => nextCat.features.includes(f)))
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

  const handleSmartTitle = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const validation = validatePropertyFilters(
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
      'title'
    )

    if (!validation.canSuggest) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert(
        'Mungojnë të dhënat kryesore',
        `Për të sugjeruar një titull profesional dhe tërheqës, ju lutemi plotësoni fillimisht: ${validation.missingFields.join(', ')}.`
      )
      return
    }

    setUndoTitle(title)
    const suggested = generateProfessionalTitle(
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

    setTitle(suggested)
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    showBanner({
      type: 'success',
      title: 'Titulli u Sugjerua!',
      message: 'Titulli u formulua profesionalisht sipas parametrave të pronës.',
    })
  }

  const handleUndoTitle = () => {
    if (undoTitle !== null) {
      setTitle(undoTitle)
      setUndoTitle(null)
      if (Platform.OS !== 'web') Haptics.selectionAsync()
    }
  }

  const handleSmartDescription = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const validation = validatePropertyFilters(
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
      'description'
    )

    if (!validation.canSuggest) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert(
        'Mungojnë parametrat e pronës',
        `Për të sugjeruar një përshkrim real dhe profesional (pa të dhëna të trilluara), ju lutemi plotësoni fillimisht: ${validation.missingFields.join(', ')}.`
      )
      return
    }

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
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    showBanner({
      type: 'success',
      title: description.trim().length > 0 ? 'Përshkrimi u Përmirësua!' : 'Përshkrimi u Sugjerua!',
      message: 'Përshkrimi u përshtat saktësisht me të dhënat e pronës tuaj.',
    })
  }

  const handleUndo = () => {
    if (undoDescription !== null) {
      setDescription(undoDescription)
      setUndoDescription(null)
      if (Platform.OS !== 'web') Haptics.selectionAsync()
    }
  }

  const pickImagesFromGallery = async () => {
    if (images.length >= 10) {
      Alert.alert('Limiti i fotove', 'Mund të ngarkoni deri në 10 fotografi për çdo pronë.')
      return
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Leje e nevojshme', 'Ju lutemi lejoni aksesin tek fotot në cilësimet e telefonit.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: 10 - images.length,
      base64: false,
      exif: false,
    })

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((a) => a.uri)
      setImages((prev) => {
        const merged = [...prev]
        for (const uri of newUris) {
          if (merged.length >= 10) break
          if (!merged.includes(uri)) merged.push(uri)
        }
        return merged
      })
    }
  }

  const takeImageWithCamera = async () => {
    if (images.length >= 10) {
      Alert.alert('Limiti i fotove', 'Mund të ngarkoni deri në 10 fotografi për çdo pronë.')
      return
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Leje e nevojshme', 'Ju lutemi lejoni aksesin tek kamera në cilësimet e telefonit.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      base64: false,
      exif: false,
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newUri = result.assets[0].uri
      setImages((prev) => (prev.includes(newUri) ? prev : [...prev, newUri].slice(0, 10)))
    }
  }

  const pickImages = pickImagesFromGallery

  const optimizeListingImage = async (uri: string): Promise<string> => {
    try {
      const manip = await manipulateAsync(
        uri,
        [{ resize: { width: 1600 } }], // Keeps aspect ratio, max width 1600px
        { compress: 0.80, format: SaveFormat.JPEG }
      )
      return manip.uri
    } catch {
      return uri
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  /**
   * Best-effort cleanup of Storage objects uploaded during a submission attempt that
   * never made it into the database, so we don't leave orphaned photos behind.
   */
  const discardUploadedPhotos = async (paths: string[]) => {
    if (paths.length === 0) return
    try {
      const { error } = await supabase.storage.from('listings').remove(paths)
      if (error) console.warn('Listing photo cleanup warning:', error.message)
    } catch (cleanupEx: any) {
      console.warn('Listing photo cleanup exception:', cleanupEx?.message || cleanupEx)
    }
  }

  const toggleFeature = (feat: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    )
  }

  // Re-entrancy guard: the Pressable can fire twice before `loading` re-renders.
  const submittingRef = useRef(false)

  const handleSubmit = async () => {
    if (submittingRef.current) return
    if (!title.trim()) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      showBanner({
        type: 'error',
        title: 'Mungon Titulli',
        message: 'Ju lutemi shkruani një titull për pronën.',
      })
      return
    }
    const priceNum = Number(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      showBanner({
        type: 'error',
        title: 'Çmimi i Pavlefshëm',
        message: 'Ju lutemi vendosni një çmim më të madh se 0 €.',
      })
      return
    }
    const areaNum = Number(area)
    if (!area || isNaN(areaNum) || areaNum <= 0) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      showBanner({
        type: 'error',
        title: 'Sipërfaqja Mungon',
        message: 'Ju lutemi vendosni një sipërfaqe më të madhe se 0 m².',
      })
      return
    }
    if (!description.trim()) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      showBanner({
        type: 'error',
        title: 'Përshkrimi Mungon',
        message: 'Ju lutemi plotësoni përshkrimin e pronës.',
      })
      return
    }

    // The rooms pill offers a '6+' label — map it to 6 so we never store 0 rooms.
    const roomsNum = rooms === '6+' ? 6 : Number(rooms) || 0
    // Storage paths uploaded during this attempt, so a failed insert can clean them up.
    const uploadedStoragePaths: string[] = []

    submittingRef.current = true
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        openLoginScreen(router, { redirectTo: '/(tabs)/post', reason: 'post' })
        return
      }

      // Upload local device images to Supabase Storage through a small concurrency pool
      // (hardware-accelerated downsampling), preserving the user's photo order.
      let uploadedImageUrls: string[] = []
      if (images.length > 0) {
        const UPLOAD_CONCURRENCY = 3
        const uploadFailure: { message: string | null } = { message: null }
        const results: Array<string | null> = new Array(images.length).fill(null)
        let cursor = 0

        const uploadWorker = async () => {
          while (cursor < images.length) {
            if (uploadFailure.message) return
            const index = cursor++
            const imgUri = images[index]

            if (imgUri.startsWith('http://') || imgUri.startsWith('https://')) {
              results[index] = imgUri
              continue
            }

            try {
              const optimizedUri = await optimizeListingImage(imgUri)
              const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
              const path = `${user.id}/${filename}`

              const response = await fetch(optimizedUri)
              const arrayBuffer = await response.arrayBuffer()
              const binaryData = new Uint8Array(arrayBuffer)

              const { error: uploadError } = await supabase.storage.from('listings').upload(path, binaryData, {
                contentType: 'image/jpeg',
                cacheControl: '31536000, immutable',
                upsert: true,
              })

              if (uploadError) {
                console.warn('Listing photo upload error:', uploadError.message)
                uploadFailure.message = uploadError.message
                continue
              }

              uploadedStoragePaths.push(path)
              const { data: publicData } = supabase.storage.from('listings').getPublicUrl(path)
              results[index] = publicData.publicUrl
            } catch (uploadEx: any) {
              console.warn('Listing photo upload exception:', uploadEx?.message || uploadEx)
              uploadFailure.message = uploadEx?.message || 'Ngarkimi i fotografisë dështoi.'
            }
          }
        }

        await Promise.all(
          Array.from({ length: Math.min(UPLOAD_CONCURRENCY, images.length) }, () => uploadWorker())
        )

        // A local file:// URI must never reach listings.images — abort before the insert.
        if (uploadFailure.message || results.some((url) => url === null)) {
          await discardUploadedPhotos(uploadedStoragePaths)
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          }
          showBanner({
            type: 'error',
            title: 'Dështoi Ngarkimi i Fotove',
            message:
              'Fotografitë nuk u ngarkuan dot në server. Kontrolloni lidhjen tuaj dhe provoni përsëri.',
          })
          return
        }

        uploadedImageUrls = results.filter((url): url is string => url !== null)
      }

      const { data: insertedListing, error } = await supabase
        .from('listings')
        .insert([
          {
            user_id: user.id,
            title: title.trim(),
            description: description.trim(),
            price: Number(price),
            city,
            neighborhood: neighborhood || null,
            address: address.trim() || city,
            rooms: roomsNum,
            area_m2: Number(area) || 0,
            type,
            condition,
            floor,
            apartment_type: subtype || activeCategory.titleShort,
            features: selectedFeatures,
            images: uploadedImageUrls,
            is_active: true,
          },
        ])
        .select('id')
        .single()

      if (error) throw error

      const newListingId: string | undefined = insertedListing?.id

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }

      // Reset form fields
      setTitle('')
      setDescription('')
      setPrice('')
      setArea('')
      setImages([])
      setNeighborhood('')
      setAddress('')

      showBanner({
        type: 'success',
        title: 'Prona u Publikua!',
        message: 'Prona juaj u postua me sukses në Bleje Pronën.',
      })
      // Land on the freshly published property instead of the generic listings feed
      if (newListingId) {
        router.replace(`/listings/${newListingId}` as any)
      } else {
        router.replace('/listings' as any)
      }
    } catch (err: any) {
      // The insert never landed — discard the photos already pushed to Storage
      await discardUploadedPhotos(uploadedStoragePaths)
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
      showBanner({
        type: 'error',
        title: 'Dështoi Postimi',
        message: err.message || 'Ndodhi një problem gjatë postimit.',
      })
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  // If user is not authenticated, show clean luxury Auth Gatekeeper
  if (!authChecking && !currentUser) {
    const gateBtnText =
      theme === 'green' ? '#071C18' : theme === 'black' ? '#071A14' : '#FFFFFF'

    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Posto Pronë</Text>
        </View>

        <View style={styles.gateWrapper}>
          <View style={[styles.gateCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
            <View style={[styles.gateIconWrap, { backgroundColor: colors.primaryLight }]}>
              <PlusCircle size={32} color={colors.primary} strokeWidth={2.2} />
            </View>

            <Text style={[styles.gateTitle, { color: colors.textPrimary }]}>
              Publiko Pronën Tënde
            </Text>

            <Text style={[styles.gateSubtitle, { color: colors.textMuted }]}>
              Kyçuni ose krijoni llogari për të publikuar shpalljen tuaj.
            </Text>

            <View style={styles.gateActions}>
              <Pressable
                style={[styles.gatePrimaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => openLoginScreen(router, { redirectTo: '/(tabs)/post', reason: 'post' })}
              >
                <LogIn size={18} color={gateBtnText} strokeWidth={2.2} />
                <Text style={[styles.gatePrimaryBtnText, { color: gateBtnText }]}>
                  Kyçu
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.gateSecondaryBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                onPress={() => openRegisterScreen(router, { redirectTo: '/(tabs)/post', reason: 'post' })}
              >
                <UserPlus size={18} color={colors.textPrimary} strokeWidth={2.2} />
                <Text style={[styles.gateSecondaryBtnText, { color: colors.textPrimary }]}>
                  Regjistrohu
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Posto Pronë të Re</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Plotësoni të dhënat e pronës tuaj
        </Text>
      </View>

      <Animated.ScrollView
        onScroll={tabBarScrollHandler}
        scrollEventThrottle={16}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {/* SECTION 1: Kategoria e Pronës */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>1. Kategoria e pronës</Text>
          <View style={styles.categoryGrid}>
            {CATEGORY_KEYS.map((catKey) => {
              const cat = CATEGORIES[catKey]
              const isSelected = category === catKey
              return (
                <Pressable
                  key={catKey}
                  style={[
                    styles.catCard,
                    {
                      backgroundColor: isSelected ? colors.chipActiveBg : colors.surfaceSubtle,
                      borderColor: isSelected ? colors.chipActiveBg : colors.border,
                    },
                  ]}
                  onPress={() => handleCategorySelect(catKey)}
                >
                  <Text
                    style={[
                      styles.catLabel,
                      { color: isSelected ? colors.chipTextActive : colors.textPrimary },
                      isSelected && { fontFamily: Fonts.bold },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {cat.label}
                  </Text>
                  <Text style={[styles.catBadge, { color: isSelected ? colors.chipTextActive : colors.textMuted }]}>
                    {cat.badge}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* SECTION 2: Lloji i Ofertës */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>2. Lloji i ofertës</Text>
          <View style={[styles.typeToggle, { backgroundColor: colors.surfaceSubtle }]}>
            {(['shitje', 'qira'] as const).map((t) => {
              const isAct = type === t
              const label = t === 'shitje' ? 'Në Shitje' : 'Me Qira'
              return (
                <Pressable
                  key={t}
                  style={[
                    styles.typeOption,
                    isAct && {
                      backgroundColor: colors.surface,
                      shadowColor: '#000',
                      shadowOpacity: 0.1,
                    },
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: isAct ? colors.textPrimary : colors.textMuted },
                      isAct && { fontFamily: Fonts.bold },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* SECTION 3: Lokacioni */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>3. Lokacioni</Text>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Qyteti *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
            {CITIES.map((c) => {
              const isCSelected = city === c
              return (
                <Pressable
                  key={c}
                  style={[
                    styles.cityChip,
                    {
                      backgroundColor: isCSelected ? colors.chipActiveBg : colors.surfaceSubtle,
                      borderColor: isCSelected ? colors.chipActiveBg : colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync()
                    setCity(c)
                    setNeighborhood('')
                  }}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      { color: isCSelected ? colors.chipTextActive : colors.textSecondary },
                      isCSelected && { fontFamily: Fonts.bold },
                    ]}
                  >
                    {c}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {city && getNeighborhoods(city).length > 0 && (
            <>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Lagjja në {city}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                {getNeighborhoods(city).map((n) => {
                  const isNSelected = neighborhood === n
                  return (
                    <Pressable
                      key={n}
                      style={[
                        styles.cityChip,
                        {
                          backgroundColor: isNSelected ? colors.chipActiveBg : colors.surfaceSubtle,
                          borderColor: isNSelected ? colors.chipActiveBg : colors.border,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setNeighborhood(n)
                      }}
                      hitSlop={6}
                    >
                      <Text
                        style={[
                          styles.cityChipText,
                          { color: isNSelected ? colors.chipTextActive : colors.textSecondary },
                          isNSelected && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {n}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </>
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rruga ose pika referuese</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.searchBg,
                borderColor:
                  focusedField === 'address'
                    ? theme === 'green'
                      ? colors.gold
                      : colors.primary
                    : colors.searchBorder,
                borderWidth: focusedField === 'address' ? 1.5 : 1,
                color: colors.textPrimary,
              },
            ]}
            placeholder="p.sh. Rr. Dëshmorët e Kombit"
            placeholderTextColor={colors.textLight}
            value={address}
            onChangeText={setAddress}
            onFocus={() => setFocusedField('address')}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {/* SECTION 4: Specifikat & Çmimi */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>4. Çmimi dhe Specifikat</Text>

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Çmimi (€) *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.searchBg,
                    borderColor:
                      focusedField === 'price'
                        ? theme === 'green'
                          ? colors.gold
                          : colors.primary
                        : colors.searchBorder,
                    borderWidth: focusedField === 'price' ? 1.5 : 1,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="p.sh. 95000"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sipërfaqja (m²) *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.searchBg,
                    borderColor:
                      focusedField === 'area'
                        ? theme === 'green'
                          ? colors.gold
                          : colors.primary
                        : colors.searchBorder,
                    borderWidth: focusedField === 'area' ? 1.5 : 1,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="p.sh. 85"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                value={area}
                onChangeText={setArea}
                onFocus={() => setFocusedField('area')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {Number(price) > 0 && Number(area) > 0 && (
            <View style={[styles.pricePerM2Badge, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
              <Calculator size={13} color={colors.badgeText} strokeWidth={2.2} />
              <Text style={[styles.pricePerM2Label, { color: colors.textSecondary }]}>
                Çmimi për m²:
              </Text>
              <Text style={[styles.pricePerM2Value, { color: colors.badgeText }]}>
                {Math.round(Number(price) / Number(area)).toLocaleString('de-DE')} €/m²
              </Text>
            </View>
          )}

          {activeCategory.hasRooms && (
            <View style={styles.fieldBlock}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Numri i dhomave</Text>
              <View style={styles.pillGroup}>
                {[1, 2, 3, 4, 5, '6+'].map((r) => {
                  const isRSelected = rooms === String(r)
                  return (
                    <Pressable
                      key={String(r)}
                      style={[
                        styles.pillBtn,
                        {
                          backgroundColor: isRSelected ? colors.chipActiveBg : colors.surfaceSubtle,
                          borderColor: isRSelected ? colors.chipActiveBg : colors.border,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync()
                        setRooms(String(r))
                      }}
                      hitSlop={6}
                    >
                      <Text
                        style={[
                          styles.pillBtnText,
                          { color: isRSelected ? colors.chipTextActive : colors.textSecondary },
                          isRSelected && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Përparësitë & Veçoritë</Text>
          <View style={styles.featuresWrap}>
            {activeCategory.features.map((feat: string) => {
              const isFSelected = selectedFeatures.includes(feat)
              return (
                <Pressable
                  key={feat}
                  style={[
                    styles.featureChip,
                    {
                      backgroundColor: isFSelected ? colors.chipActiveBg : colors.surfaceSubtle,
                      borderColor: isFSelected ? colors.chipActiveBg : colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync()
                    toggleFeature(feat)
                  }}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      styles.featureChipText,
                      { color: isFSelected ? colors.chipTextActive : colors.textSecondary },
                      isFSelected && { fontFamily: Fonts.bold },
                    ]}
                  >
                    {feat}
                  </Text>
                  {isFSelected && <Check size={12} color={colors.chipTextActive} />}
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* SECTION 5: Titulli & Përshkrimi Inteligjent */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>5. Titulli dhe Përshkrimi</Text>

          {/* Titulli Header me Sugjero Titull */}
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Titulli i shpalljes *</Text>
            <View style={styles.fieldHeaderActions}>
              {undoTitle !== null && (
                <Pressable style={styles.undoBtn} onPress={handleUndoTitle} hitSlop={10}>
                  <RotateCcw size={12} color={colors.textMuted} />
                  <Text style={[styles.undoBtnText, { color: colors.textMuted }]}>Kthe</Text>
                </Pressable>
              )}
              <Pressable
                style={[
                  styles.smartBtn,
                  {
                    backgroundColor: colors.badgeBg,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleSmartTitle}
                hitSlop={8}
              >
                <FileText size={13} color={colors.badgeText} strokeWidth={2.2} />
                <Text style={[styles.smartBtnText, { color: colors.badgeText }]}>
                  Sugjero titull
                </Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.searchBg,
                borderColor:
                  focusedField === 'title'
                    ? theme === 'green'
                      ? colors.gold
                      : colors.primary
                    : colors.searchBorder,
                borderWidth: focusedField === 'title' ? 1.5 : 1,
                color: colors.textPrimary,
              },
            ]}
            placeholder={activeCategory.titlePlaceholder}
            placeholderTextColor={colors.textLight}
            value={title}
            onChangeText={setTitle}
            onFocus={() => setFocusedField('title')}
            onBlur={() => setFocusedField(null)}
          />

          {/* Përshkrimi Header me Sugjero Përshkrim */}
          <View style={[styles.fieldHeaderRow, { marginTop: 14 }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Përshkrimi i hollësishëm *</Text>

            <View style={styles.fieldHeaderActions}>
              {undoDescription !== null && (
                <Pressable style={styles.undoBtn} onPress={handleUndo} hitSlop={10}>
                  <RotateCcw size={12} color={colors.textMuted} />
                  <Text style={[styles.undoBtnText, { color: colors.textMuted }]}>Kthe</Text>
                </Pressable>
              )}

              <Pressable
                style={[
                  styles.smartBtn,
                  {
                    backgroundColor: colors.badgeBg,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleSmartDescription}
                hitSlop={8}
              >
                <FileText size={13} color={colors.badgeText} strokeWidth={2.2} />
                <Text style={[styles.smartBtnText, { color: colors.badgeText }]}>
                  {description.trim().length > 0 ? 'Përmirëso tekstin' : 'Sugjero përshkrim'}
                </Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.searchBg,
                borderColor:
                  focusedField === 'description'
                    ? theme === 'green'
                      ? colors.gold
                      : colors.primary
                    : colors.searchBorder,
                borderWidth: focusedField === 'description' ? 1.5 : 1,
                color: colors.textPrimary,
              },
            ]}
            placeholder={activeCategory.descriptionPlaceholder}
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
            onFocus={() => setFocusedField('description')}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {/* SECTION 6: Fotografitë */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: specularBorder }]}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>6. Fotografitë e pronës</Text>
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            Ngarkoni deri në 10 foto cilësore. Fotoja e parë do të jetë kryesore.
          </Text>

          <View style={styles.imagesGrid}>
            {images.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={styles.imageThumbContainer}>
                <Image source={{ uri }} style={styles.imageThumb} />
                {idx === 0 && (
                  <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.coverBadgeText, { color: theme === 'green' ? '#071C18' : '#FFFFFF' }]}>
                      Kryesore
                    </Text>
                  </View>
                )}
                <Pressable
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(idx)}
                  hitSlop={10}
                >
                  <X size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}

            {images.length < 10 && (
              <View style={styles.uploadButtonsGroup}>
                <Pressable
                  style={[
                    styles.uploadBtnChoice,
                    {
                      borderColor: theme === 'green' ? colors.gold : colors.primary,
                      backgroundColor: colors.badgeBg,
                    },
                  ]}
                  onPress={pickImagesFromGallery}
                  hitSlop={6}
                >
                  <ImageIcon size={22} color={theme === 'green' ? colors.gold : colors.primary} strokeWidth={2.2} />
                  <Text style={[styles.uploadBtnText, { color: theme === 'green' ? colors.gold : colors.primary }]}>
                    Nga Galeria
                  </Text>
                  <Text style={[styles.uploadBtnCount, { color: colors.textMuted }]}>{images.length}/10</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.uploadBtnChoice,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSubtle,
                    },
                  ]}
                  onPress={takeImageWithCamera}
                  hitSlop={6}
                >
                  <Camera size={22} color={colors.textPrimary} strokeWidth={2.2} />
                  <Text style={[styles.uploadBtnText, { color: colors.textPrimary }]}>
                    Bëj Foto
                  </Text>
                  <Text style={[styles.uploadBtnCount, { color: colors.textMuted }]}>Kamera</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            loading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme === 'green' ? '#071C18' : '#FFFFFF'} />
          ) : (
            <Text
              style={[
                styles.submitButtonText,
                { color: theme === 'green' ? '#071C18' : '#FFFFFF' },
              ]}
            >
              Publiko Pronën Tani
            </Text>
          )}
        </Pressable>
      </Animated.ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.5,
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
    padding: 16,
    gap: 18,
    paddingBottom: 120,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  sectionCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 0.5,
    gap: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  catLabel: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  catBadge: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  typeToggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 12,
  },
  typeOptionText: {
    fontSize: 13.5,
    fontFamily: Fonts.medium,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  horizontalChips: {
    flexDirection: 'row',
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8,
  },
  cityChipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14.5,
    fontFamily: Fonts.medium,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
    gap: 6,
  },
  pricePerM2Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  pricePerM2Label: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
  },
  pricePerM2Value: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  fieldBlock: {
    gap: 8,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.medium,
  },
  featuresWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 13,
  },
  featureChipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  fieldHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  descHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  descActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  undoBtnText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  smartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 0.5,
  },
  smartBtnText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 14.5,
    fontFamily: Fonts.regular,
    minHeight: 124,
    lineHeight: 22,
  },
  helperText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  imageThumbContainer: {
    width: 98,
    height: 98,
    borderRadius: 16,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonsGroup: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 6,
  },
  uploadBtnChoice: {
    flex: 1,
    height: 92,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  uploadBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  uploadBtnCount: {
    fontSize: 10.5,
    fontFamily: Fonts.medium,
  },
  submitButton: {
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: Fonts.black,
  },
  gateWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  gateCard: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 28,
    borderWidth: 0.5,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  gateIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gateTitle: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  gateSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  gateActions: {
    width: '100%',
    gap: 12,
  },
  gatePrimaryBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  gatePrimaryBtnText: {
    fontSize: 15.5,
    fontFamily: Fonts.bold,
  },
  gateSecondaryBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gateSecondaryBtnText: {
    fontSize: 15.5,
    fontFamily: Fonts.semiBold,
  },
})
