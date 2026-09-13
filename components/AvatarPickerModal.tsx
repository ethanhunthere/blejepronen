'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { X, Check, Upload, Sparkles, Loader2 } from 'lucide-react'
import { BLEJE_AVATARS, BlejeAvatar, DEFAULT_AVATAR } from '@/lib/avatars'

interface AvatarPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentAvatarUrl?: string | null
  onSelectAvatar: (avatarUrl: string) => Promise<void>
  onTriggerFileUpload?: () => void
  isUploadingCustom?: boolean
}

export default function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  onSelectAvatar,
  onTriggerFileUpload,
  isUploadingCustom = false,
}: AvatarPickerModalProps) {
  const [selectedUrl, setSelectedUrl] = useState<string>(currentAvatarUrl || DEFAULT_AVATAR)
  const [savingUrl, setSavingUrl] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSelect = async (avatar: BlejeAvatar) => {
    try {
      setSelectedUrl(avatar.url)
      setSavingUrl(avatar.url)
      await onSelectAvatar(avatar.url)
    } finally {
      setSavingUrl(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006459]/10 text-[#006459] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="avatar-picker-title" className="text-lg font-bold text-[#101828]">
                Zgjidhni Avataron Tuaj
              </h3>
              <p className="text-xs text-gray-500">
                20 avatarë unikë dhe modernë nga Bleje Pronën
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Mbyll"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 sm:gap-4">
            {BLEJE_AVATARS.map((avatar) => {
              const isSelected = selectedUrl === avatar.url || (!selectedUrl && avatar.url === DEFAULT_AVATAR)
              const isCurrentSaving = savingUrl === avatar.url

              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => handleSelect(avatar)}
                  disabled={Boolean(savingUrl) || isUploadingCustom}
                  aria-label={avatar.name}
                  className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 flex items-center justify-center p-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#006459] ${
                    isSelected
                      ? 'border-[#006459] ring-2 ring-[#006459]/30 bg-[#006459]/5 scale-105 shadow-md'
                      : 'border-gray-200 hover:border-gray-400 hover:scale-105 hover:shadow-sm bg-gray-50'
                  }`}
                >
                  <div className="relative w-full h-full rounded-xl overflow-hidden">
                    <Image
                      src={avatar.url}
                      alt={avatar.name}
                      fill
                      sizes="(max-width: 640px) 70px, 90px"
                      className="object-cover transition-transform duration-200 group-hover:scale-110"
                    />
                  </div>

                  {/* Active Checkmark Badge */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#006459] text-white flex items-center justify-center shadow-sm">
                      {isCurrentSaving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3 stroke-[3]" />
                      )}
                    </div>
                  )}

                  {/* Saving spinner for clicked item if not yet marked selected */}
                  {!isSelected && isCurrentSaving && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-[#006459]" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          {onTriggerFileUpload && (
            <button
              type="button"
              onClick={() => {
                onTriggerFileUpload()
                onClose()
              }}
              disabled={isUploadingCustom}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isUploadingCustom ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#006459]" />
              ) : (
                <Upload className="w-4 h-4 text-gray-500" />
              )}
              <span>Ose ngarko foton tënde</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#006459] text-white text-xs font-bold hover:bg-[#005048] transition-colors shadow-sm ml-auto cursor-pointer"
          >
            Përfundo
          </button>
        </div>
      </div>
    </div>
  )
}
