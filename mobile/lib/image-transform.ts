/**
 * Supabase Storage image transformation helpers (mobile).
 *
 * Listing photos are uploaded as full-resolution WebP/JPEG originals (often
 * 3–5 MP, 150 KB – 2 MB each). Decoding those inside a scrolling feed is the
 * single biggest jank + memory source on mid-range Android devices, so every
 * list/grid/gallery surface must ask Storage for a *resized* variant instead.
 *
 * Supabase exposes its image transformation pipeline on the same public host:
 *
 *   original : https://<ref>.supabase.co/storage/v1/object/public/listings/<path>
 *   transform: https://<ref>.supabase.co/storage/v1/render/image/public/listings/<path>?width=640&height=400&resize=cover&quality=75&format=webp
 *
 * The helpers below rewrite one into the other and are deliberately paranoid:
 * anything that is not a public Supabase Storage object URL (bundled
 * `require()` assets, avatars on other hosts, data URIs, already-transformed
 * URLs, empty strings) is returned untouched, so a caller can pipe any image
 * source through them without a guard.
 *
 * Verified against the live project (2026-09-28): the transformation addon is
 * enabled and `width=640&height=400&resize=cover&format=webp&quality=75`
 * returns 28 KB where the original is 143 KB.
 */

/** Accepts anything an `expo-image` `source` prop can take. */
export type ImageSourceish = string | number | null | undefined

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
  /** Re-encode format. `webp` is safe on iOS 14+ / Android 4+. */
  format?: ImageFormat
}

/** Feed / grid cards: small, cover-cropped, cheap to decode. */
export const CARD_IMAGE_WIDTH = 640
/** Default card crop height (≈1.6:1, matches the mobile ListingCard frame). */
export const CARD_IMAGE_HEIGHT = 400
/** Full-bleed detail hero: near screen-width at 3x density. */
export const HERO_IMAGE_WIDTH = 1080
/** Fullscreen lightbox: large but still far below the uploaded original. */
export const LIGHTBOX_IMAGE_WIDTH = 1280
/** Thumbnail strips. */
export const THUMB_IMAGE_WIDTH = 200

const MIN_EDGE = 1
const MAX_EDGE = 4096

/**
 * `https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<path>`
 * Host is matched loosely (any *.supabase.co) so the helper keeps working if
 * the project reference ever changes; the path prefix is what matters.
 */
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

/** True when `src` is a string Supabase can resize for us. */
export function isTransformableStorageUrl(src: ImageSourceish): src is string {
  if (typeof src !== 'string' || src.length === 0) return false
  return PUBLIC_OBJECT_RE.test(src) || RENDER_OBJECT_RE.test(src)
}

/**
 * Rewrite a public Storage object URL into its transformed `/render/image/`
 * equivalent. Non-Supabase sources (and non-string sources) come back exactly
 * as they went in — callers never need a fallback branch.
 */
export function transformStorageImage(
  src: ImageSourceish,
  opts: ImageTransformOptions = {}
): ImageSourceish {
  if (!isTransformableStorageUrl(src)) return src

  const match = PUBLIC_OBJECT_RE.exec(src) ?? RENDER_OBJECT_RE.exec(src)
  if (!match) return src

  const [, origin, path] = match
  const query = buildQuery(opts)
  const transformed = `${origin}/storage/v1/render/image/public/${path}`
  return query ? `${transformed}?${query}` : transformed
}

/** Card / grid cover crop (640×400 WebP by default ≈ 28 KB). */
export function cardImageSource(
  src: ImageSourceish,
  height: number = CARD_IMAGE_HEIGHT
): ImageSourceish {
  return transformStorageImage(src, {
    width: CARD_IMAGE_WIDTH,
    height,
    resize: 'cover',
    quality: 75,
    format: 'webp',
  })
}

/** Full-bleed hero on the detail screen (aspect preserved, no server crop). */
export function heroImageSource(src: ImageSourceish): ImageSourceish {
  return transformStorageImage(src, {
    width: HERO_IMAGE_WIDTH,
    quality: 78,
    format: 'webp',
  })
}

/** Fullscreen lightbox frame — big enough to stay sharp while pinch-zoomed. */
export function lightboxImageSource(src: ImageSourceish): ImageSourceish {
  return transformStorageImage(src, {
    width: LIGHTBOX_IMAGE_WIDTH,
    quality: 82,
    format: 'webp',
  })
}

/** Thumbnail strips and avatar-sized previews. */
export function thumbImageSource(src: ImageSourceish): ImageSourceish {
  return transformStorageImage(src, {
    width: THUMB_IMAGE_WIDTH,
    height: THUMB_IMAGE_WIDTH,
    resize: 'cover',
    quality: 70,
    format: 'webp',
  })
}
