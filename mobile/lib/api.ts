import { supabase } from './supabase'

export const API_BASE_URL = 'https://blejepronen.com'

export interface SignupParams {
  email: string
  password: string
  accountType: 'individual' | 'company'
  companyName?: string
  fullName?: string
  phone?: string
}

export interface VerifyOtpParams {
  email: string
  code: string
  password?: string
}

export interface ApiResponse<T = any> {
  success?: boolean
  error?: string
  message?: string
  data?: T
}

/**
 * Register a new user via the backend API.
 * This creates the user, generates a 6-digit verification code,
 * and sends it via Resend email.
 */
export async function apiSignUp(params: SignupParams): Promise<ApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email.trim().toLowerCase(),
        password: params.password,
        accountType: params.accountType,
        companyName:
          params.accountType === 'company'
            ? params.companyName?.trim() || params.fullName?.trim()
            : undefined,
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || 'Gabim gjatë regjistrimit.',
      }
    }

    return {
      success: true,
      message: data.message || 'Kodi i verifikimit u dërgua me sukses.',
    }
  } catch (err: any) {
    console.warn('apiSignUp network exception:', err)
    return {
      success: false,
      error: 'Lidhja me serverin dështoi. Ju lutemi kontrolloni internetin tuaj.',
    }
  }
}

/**
 * Verify the 6-digit email OTP verification code.
 * Upon success, Supabase confirms email_confirm = true.
 */
export async function apiVerifyOtp(params: VerifyOtpParams): Promise<ApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email.trim().toLowerCase(),
        code: params.code.trim(),
        password: params.password,
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.message || data.error || 'Kodi është i gabuar ose ka skaduar.',
      }
    }

    return {
      success: true,
      message: data.message || 'Email-i u konfirmua me sukses!',
    }
  } catch (err: any) {
    console.warn('apiVerifyOtp network exception:', err)
    return {
      success: false,
      error: 'Lidhja me serverin dështoi. Ju lutemi provoni përsëri.',
    }
  }
}

/**
 * Resend a new 6-digit OTP verification code to the given email address.
 */
export async function apiResendCode(email: string): Promise<ApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/resend-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || 'Dështoi ridërgimi i kodit.',
      }
    }

    return {
      success: true,
      message: data.message || `Një kod i ri u dërgua me sukses në ${email}.`,
    }
  } catch (err: any) {
    console.warn('apiResendCode network exception:', err)
    return {
      success: false,
      error: 'Lidhja me serverin dështoi. Ju lutemi provoni përsëri.',
    }
  }
}

/**
 * Permanently delete the user's account and all associated data
 * (listings, favorites, messages, conversations, and auth user).
 */
export async function apiDeleteAccount(accessToken: string): Promise<ApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/account/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.message || data.error || 'Dështoi fshirja e llogarisë.',
      }
    }

    return {
      success: true,
      message: data.message || 'Llogaria juaj u fshi përfundimisht.',
    }
  } catch (err: any) {
    console.warn('apiDeleteAccount network exception:', err)
    return {
      success: false,
      error: 'Lidhja me serverin dështoi gjatë fshirjes së llogarisë.',
    }
  }
}

export interface ProfileSettingsPayload {
  isCompany: boolean
  accountType: 'company' | 'individual'
  firstName?: string
  lastName?: string
  phone?: string
  bio?: string
  city?: string
  avatarUrl?: string
  emailVerified?: boolean

  // Individual fields
  individualFirstName?: string
  individualLastName?: string
  individualPhone?: string
  individualEmail?: string
  individualBio?: string

  // Company fields
  companyName?: string
  companyContactPerson?: string
  companyPhone?: string
  companyEmail?: string
  companyDescription?: string
  foundedYear?: string
  nipt?: string
  officeAddress?: string
  website?: string

  // Socials
  instagram?: string
  facebook?: string
  whatsapp?: string
  tiktok?: string
  linkedin?: string
  youtube?: string
  twitter?: string

  // Notifications (Site + App specific)
  notifications?: {
    messages?: boolean
    inquiries?: boolean
    followers?: boolean
    weeklyReport?: boolean
    newsletter?: boolean
    pushEnabled?: boolean
    pushSound?: boolean
    pushVibrate?: boolean
    priceDropAlerts?: boolean
    newMatchAlerts?: boolean
  }

  // Privacy
  privacy?: {
    showPhone?: boolean
    showSocials?: boolean
    showOnline?: boolean
    allowDirectMsgs?: boolean
    showListingsOnProfile?: boolean
  }

  // App Specific Preferences
  appPreferences?: {
    biometricLock?: boolean
    language?: string
    currency?: string
    highContrast?: boolean
  }
}

/**
 * Save complete profile and settings to the backend.
 * Synchronizes with Web database and Supabase.
 */
export async function apiSaveProfileSettings(
  payload: ProfileSettingsPayload,
  accessToken: string
): Promise<ApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/profile/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.message || data.error || 'Dështoi ruajtja e cilësimeve.',
      }
    }

    return {
      success: true,
      message: 'Cilësimet u ruajtën me sukses!',
    }
  } catch (err: any) {
    console.warn('apiSaveProfileSettings exception:', err)
    return {
      success: false,
      error: 'Lidhja me serverin dështoi gjatë ruajtjes së cilësimeve.',
    }
  }
}

