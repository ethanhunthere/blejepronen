/**
 * Supabase Storage image transformation helpers (web).
 *
 * Listing photos are stored as full-resolution originals (3–5 MP, 150 KB – 2 MB).
 * Even behind `next/image`, the optimizer has to pull that original from
 * Supabase on a cold cache before it can downscale it — slow first paint and
 * avoidable egress. Asking Storage for a pre-sized `/render/image/` variant
 * means the optimizer (and the browser, when `unoptimized` ever applies) only
 * ever touches a small file:
 *
 *   original : https://<ref>.supabase.co/storage/v1/object/public/listings/<path>
 *   transform: https://<ref>.supabase.co/storage/v1/render/image/public/listings/<path>?width=640&height=400&resize=cover&quality=75&format=webp
 *
 * Everything that is not a public Supabase Storage object URL (Unsplash,
 * Google avatars, relative `/public` paths, empty strings) is returned
 * unchanged, so these helpers are safe to wrap around any `src`.
 *
 * Verified against the live project (2026-09-28): the transformation addon is
 * enabled; `width=640&height=400&resize=cover&format=webp&quality=75` returns
 * 28 KB where the original is 143 KB.
 */

export type ImageResizeMode = 'cover' | 'contain' | 'fill'
export type ImageFormat = 'origin' | 'webp' | 'avif'

export interface ImageTransformOptions {
  /** Target width in px. Clamped to Supabase's 1–4096 range. */
  width?: number
  /** Optional target height. Only meaningful together with `resize`. */
  height?: number
  /** How to fit when both width and height are given. Defaults to `cover`. */
  resize?: ImageResizeMode
  /** 20–100. Supabase defaults to 80; cards ship 75. */
  quality?: number
  /** Re-encode format. `webp` is universally supported by our browsers. */
  format?: ImageFormat
}

/** Feed / grid cards. */
export const CARD_IMAGE_WIDTH = 640
/** Default card crop height (≈1.6:1, close to the `aspect-[4/3]` frame). */
export const CARD_IMAGE_HEIGHT = 480
/** Large gallery cells (desktop hero cell, fullscreen viewer). */
export const GALLERY_IMAGE_WIDTH = 1280
/** Small gallery cells (desktop mosaic side tiles). */
export const GALLERY_CELL_WIDTH = 750
/** Thumbnail strips. */
export const THUMB_IMAGE_WIDTH = 200

const MIN_EDGE = 1
const MAX_EDGE = 4096

const PUBLIC_OBJECT_RE =
  /^(https?:\/\/[a-z0-9-]+\.supabase\.co)\/storage\/v1\/object\/public\/([^?#\s]+)(?:[?#][\s\S]*)?$/i

const RENDER_OBJECT_RE =
  /^(https?:\/\/[a-z0-9-]+\.supabase\.co)\/storage\/v1\/render\/image\/public\/([^?#\s]+)(?:[?#][\s\S]*)?$/i

function clampEdge(value: number): number {
  if (!Number.isFinite(value)) return MAX_EDGE
  return Math.max(MIN_EDGE, Math.min(MAX_EDGE, Math.round(value)))
}

function buildQuery(opts: ImageTransformOptions): string {
  const params: string[] = []
  if (opts.width !== undefined) params.push(`width=${clampEdge(opts.width)}`)
  if (opts.height !== undefined) params.push(`height=${clampEdge(opts.height)}`)
  // `resize` is ignored by Storage unless both dimensions are present.
  if (opts.width !== undefined && opts.height !== undefined) {
    params.push(`resize=${opts.resize ?? 'cover'}`)
  }
  if (opts.quality !== undefined) {
    params.push(`quality=${Math.max(20, Math.min(100, Math.round(opts.quality)))}`)
  }
  if (opts.format && opts.format !== 'origin') params.push(`format=${opts.format}`)
  return params.join('&')
}

/** True when `src` points at a Supabase Storage object we may resize. */
export function isTransformableStorageUrl(src: unknown): src is string {
  if (typeof src !== 'string' || src.length === 0) return false
  return PUBLIC_OBJECT_RE.test(src) || RENDER_OBJECT_RE.test(src)
}

/**
 * Rewrite a public Storage object URL into its transformed `/render/image/`
 * equivalent. Anything else is returned verbatim (empty string in, empty
 * string out), so `src={transformStorageImage(cover, {...})}` stays a string.
 */
export function transformStorageImage(
  src: string | null | undefined,
  opts: ImageTransformOptions = {}
): string {
  if (!isTransformableStorageUrl(src)) return src ?? ''

  const match = PUBLIC_OBJECT_RE.exec(src) ?? RENDER_OBJECT_RE.exec(src)
  if (!match) return src

  const [, origin, path] = match
  const query = buildQuery(opts)
  const transformed = `${origin}/storage/v1/render/image/public/${path}`
  return query ? `${transformed}?${query}` : transformed
}

/** Card / grid cover crop (≈28 KB for a typical upload). */
export function cardImageSrc(
  src: string | null | undefined,
  height: number = CARD_IMAGE_HEIGHT
): string {
  return transformStorageImage(src, {
    width: CARD_IMAGE_WIDTH,
    height,
    resize: 'cover',
    quality: 75,
    format: 'webp',
  })
}

/** Big gallery frames — desktop mosaic hero cell and the fullscreen viewer. */
export function galleryImageSrc(src: string | null | undefined): string {
  return transformStorageImage(src, {
    width: GALLERY_IMAGE_WIDTH,
    quality: 82,
    format: 'webp',
  })
}

/** Smaller mosaic cells and single-image mobile frames. */
export function galleryCellSrc(src: string | null | undefined): string {
  return transformStorageImage(src, {
    width: GALLERY_CELL_WIDTH,
    quality: 78,
    format: 'webp',
  })
}

/** Thumbnail strips. */
export function thumbImageSrc(src: string | null | undefined): string {
  return transformStorageImage(src, {
    width: THUMB_IMAGE_WIDTH,
    height: THUMB_IMAGE_WIDTH,
    resize: 'cover',
    quality: 70,
    format: 'webp',
  })
}
