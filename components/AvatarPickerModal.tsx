'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { X, Check, Upload, User, Loader2 } from 'lucide-react'
import { BLEJE_AVATARS, BlejeAvatar, DEFAULT_AVATAR } from '@/lib/avatars'

interface AvatarPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentAvatarUrl?: string | null
  onSelectAvatar: (avatarUrl: string) => Promise<void>
  onTriggerFileUpload?: () => void
  isUploadingCustom?: boolean
}

const AVATAR_SIZE = 512
const AVATAR_QUALITY = 0.85

type DecodedImage = ImageBitmap | HTMLImageElement

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through to the <img> decoder below
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = document.createElement('img')
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Client-side 1:1 center crop + 512×512 WebP (quality 0.85) compression for
 * avatar uploads. Keeps multi-megabyte camera photos from hitting Supabase
 * Storage raw. JPEG is used as a fallback when the runtime cannot encode WebP;
 * the avatars bucket/DB pipeline stores the public URL only, so both formats
 * are accepted by the upload flow (image/jpeg, image/png, image/webp).
 */
export async function prepareAvatarImage(
  file: File
): Promise<{ blob: Blob; ext: string; contentType: string }> {
  const src = await decodeImage(file)
  try {
    const sw = src.width
    const sh = src.height
    if (!sw || !sh) throw new Error('Fotoja nuk mund të lexohet.')

    const side = Math.min(sw, sh)
    const sx = (sw - side) / 2
    const sy = (sh - side) / 2

    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas-i nuk është i disponueshëm.')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

    const webp = await canvasToBlob(canvas, 'image/webp', AVATAR_QUALITY)
    if (webp) return { blob: webp, ext: 'webp', contentType: 'image/webp' }

    const jpeg = await canvasToBlob(canvas, 'image/jpeg', AVATAR_QUALITY)
    if (jpeg) return { blob: jpeg, ext: 'jpg', contentType: 'image/jpeg' }

    throw new Error('Kompresimi i fotos dështoi.')
  } finally {
    if ('close' in src && typeof src.close === 'function') src.close()
  }
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
      onClick={() => {
        if (!isUploadingCustom) onClose()
      }}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00675B]/10 text-[#00675B] flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" />
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
            disabled={isUploadingCustom}
            aria-label="Mbyll"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
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
                  className={`group relative aspect-square rounded-full overflow-hidden border-2 transition-all duration-200 flex items-center justify-center p-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00675B] ${
                    isSelected
                      ? 'border-[#00675B] ring-2 ring-[#00675B]/30 bg-[#00675B]/5 scale-105 shadow-md'
                      : 'border-gray-200 hover:border-gray-400 hover:scale-105 hover:shadow-sm bg-gray-50'
                  }`}
                >
                  <div className="relative w-full h-full rounded-full overflow-hidden">
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
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#00675B] text-white flex items-center justify-center shadow-sm">
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
                      <Loader2 className="w-4 h-4 animate-spin text-[#00675B]" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer Actions — rendered only if custom file upload is enabled */}
        {onTriggerFileUpload && (
          <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
            {isUploadingCustom && (
              <div
                role="status"
                className="flex-1 min-w-0 inline-flex items-center gap-2 text-xs font-bold text-[#00675B]"
              >
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">Po përpunojmë dhe ngarkojmë foton tuaj...</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                // Keep the modal open: users need progress feedback while the
                // file is picked, cropped and uploaded.
                onTriggerFileUpload()
              }}
              disabled={isUploadingCustom}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 ${
                isUploadingCustom ? '' : 'w-full sm:w-auto'
              }`}
            >
              {isUploadingCustom ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#00675B]" />
              ) : (
                <Upload className="w-4 h-4 text-gray-500" />
              )}
              <span>Ose ngarko foton tënde nga pajisja</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploadingCustom}
              className="hidden sm:inline-flex text-xs text-gray-500 hover:text-gray-800 font-medium cursor-pointer disabled:opacity-50"
            >
              Mbyll
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
