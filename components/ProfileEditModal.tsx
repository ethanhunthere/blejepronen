'use client'

import { useEffect, useState } from 'react'
import { X, Save, Loader2, User, Building2, Phone, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import FollowButton from '@/components/FollowButton'

export interface ProfileEditValues {
  individualFirstName: string
  individualLastName: string
  individualPhone: string
  individualBio: string
  companyName: string
  companyContactPerson: string
  companyPhone: string
  companyDescription: string
}

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  isCompany: boolean
  values: ProfileEditValues
  onSaved: (next: ProfileEditValues) => void
}

const inputClass =
  'w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00675B]/20 focus:border-[#00675B]'
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1'

/**
 * Lightweight inline profile editor that talks directly to /api/profile/save
 * so "Ndrysho të Dhënat" no longer drags users into the monolithic /settings page.
 * Only the fields the API accepts for the active account type are edited here;
 * everything else (socials, avatar, company extras) stays in /settings.
 */
export default function ProfileEditModal({
  isOpen,
  onClose,
  isCompany,
  values,
  onSaved,
}: ProfileEditModalProps) {
  const [form, setForm] = useState<ProfileEditValues>(values)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setForm(values)
  }, [isOpen, values])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const set = (key: keyof ProfileEditValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSave = async () => {
    const next: ProfileEditValues = {
      individualFirstName: form.individualFirstName.trim(),
      individualLastName: form.individualLastName.trim(),
      individualPhone: form.individualPhone.trim(),
      individualBio: form.individualBio.trim(),
      companyName: form.companyName.trim(),
      companyContactPerson: form.companyContactPerson.trim(),
      companyPhone: form.companyPhone.trim(),
      companyDescription: form.companyDescription.trim(),
    }

    if (isCompany) {
      if (!next.companyName) {
        toast.error('Ju lutemi shkruani emrin e kompanisë.')
        return
      }
    } else {
      if (!next.individualFirstName) {
        toast.error('Ju lutemi shkruani emrin tuaj.')
        return
      }
    }

    const payload = isCompany
      ? {
          isCompany: true,
          accountType: 'company',
          companyName: next.companyName,
          companyContactPerson: next.companyContactPerson,
          companyPhone: next.companyPhone,
          companyDescription: next.companyDescription,
        }
      : {
          isCompany: false,
          accountType: 'individual',
          individualFirstName: next.individualFirstName,
          individualLastName: next.individualLastName,
          individualPhone: next.individualPhone,
          individualBio: next.individualBio,
        }

    setSaving(true)
    try {
      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.message || 'Dështoi ruajtja e të dhënave të profilit.')
      }

      onSaved(next)
      toast.success('Të dhënat e profilit u ruajtën me sukses!')
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ndodhi një gabim gjatë ruajtjes.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-edit-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => !saving && onClose()}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00675B]/10 text-[#00675B] flex items-center justify-center flex-shrink-0">
              {isCompany ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="profile-edit-title" className="text-lg font-bold text-[#101828]">
                Ndrysho të Dhënat
              </h3>
              <p className="text-xs text-gray-500">
                {isCompany ? 'Të dhënat bazë të kompanisë suaj' : 'Emri, përshkrimi dhe kontakti juaj'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Mbyll"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {isCompany ? (
            <>
              <div>
                <label className={labelClass} htmlFor="pem-company-name">
                  Emri i kompanisë *
                </label>
                <input
                  id="pem-company-name"
                  type="text"
                  value={form.companyName}
                  onChange={set('companyName')}
                  placeholder="p.sh. Elite Real Estate"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pem-contact-person">
                  Personi i kontaktit
                </label>
                <input
                  id="pem-contact-person"
                  type="text"
                  value={form.companyContactPerson}
                  onChange={set('companyContactPerson')}
                  placeholder="Emri i personit përgjegjës"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pem-company-phone">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Telefoni i kompanisë
                  </span>
                </label>
                <input
                  id="pem-company-phone"
                  type="tel"
                  value={form.companyPhone}
                  onChange={set('companyPhone')}
                  placeholder="+383 4X XXX XXXX"
                  className={inputClass}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass + ' mb-0'} htmlFor="pem-company-description">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Përshkrimi i kompanisë
                    </span>
                  </label>
                  <span className="text-[11px] text-gray-400">{form.companyDescription.length}/500</span>
                </div>
                <textarea
                  id="pem-company-description"
                  rows={4}
                  maxLength={500}
                  value={form.companyDescription}
                  onChange={set('companyDescription')}
                  placeholder="Shkruani një përshkrim për agjencinë tuaj..."
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00675B]/20 focus:border-[#00675B]"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="pem-first-name">
                    Emri *
                  </label>
                  <input
                    id="pem-first-name"
                    type="text"
                    value={form.individualFirstName}
                    onChange={set('individualFirstName')}
                    placeholder="Emri juaj"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="pem-last-name">
                    Mbiemri
                  </label>
                  <input
                    id="pem-last-name"
                    type="text"
                    value={form.individualLastName}
                    onChange={set('individualLastName')}
                    placeholder="Mbiemri juaj"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="pem-individual-phone">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Telefoni
                  </span>
                </label>
                <input
                  id="pem-individual-phone"
                  type="tel"
                  value={form.individualPhone}
                  onChange={set('individualPhone')}
                  placeholder="+383 4X XXX XXXX"
                  className={inputClass}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass + ' mb-0'} htmlFor="pem-bio">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Bio / Përshkrim
                    </span>
                  </label>
                  <span className="text-[11px] text-gray-400">{form.individualBio.length}/500</span>
                </div>
                <textarea
                  id="pem-bio"
                  rows={4}
                  maxLength={500}
                  value={form.individualBio}
                  onChange={set('individualBio')}
                  placeholder="Një përshkrim i shkurtër për veten ose pronat tuaja..."
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00675B]/20 focus:border-[#00675B]"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Anulo
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00675B] hover:bg-[#004D43] text-white text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Duke ruajtur...' : 'Ruaj ndryshimet'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

interface ProfileFollowButtonProps {
  targetUserId: string
  targetUserName?: string
  initialFollowersCount?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Follow button that never flashes for the viewer's own profile.
 *
 * The public profile page is a cached server component, so it cannot know who
 * is viewing. This gate resolves the viewer from the local Supabase session
 * cache immediately after mount (no network round-trip) and renders nothing
 * while the decision is pending, so owners never see an active "Ndiq" button
 * for ~400ms. Co-located in this module to stay within this section's file
 * scope (components/FollowButton.tsx belongs to another audit section).
 */
export function ProfileFollowButton({
  targetUserId,
  targetUserName,
  initialFollowersCount,
  size,
  className,
}: ProfileFollowButtonProps) {
  const [isSelf, setIsSelf] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true

    const resolve = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        const viewerId = data.session?.user?.id || null
        setIsSelf(Boolean(viewerId) && viewerId === targetUserId)
      } catch {
        if (mounted) setIsSelf(false)
      }
    }

    resolve()
    return () => {
      mounted = false
    }
  }, [targetUserId])

  // Pending or own profile: keep the button hidden (no self-follow flash).
  if (isSelf !== false) return null

  return (
    <FollowButton
      targetUserId={targetUserId}
      targetUserName={targetUserName}
      initialFollowersCount={initialFollowersCount}
      size={size}
      className={className}
    />
  )
}
