/**
 * IndexNow Real-Time Discovery Engine
 * Protocol integration for Bing, Yandex, Seznam, and AI search crawlers.
 * Dispatches instant crawl notifications when listings are created, updated, or marked sold.
 */

const DEFAULT_INDEXNOW_KEY = '6a7e93f2182b4dcbb70129845ef139ac'

export function getIndexNowKey(): string {
  return process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY
}

export async function submitToIndexNow(
  urls: string[]
): Promise<{ ok: boolean; submitted: number; status?: number }> {
  if (!urls || urls.length === 0) {
    return { ok: true, submitted: 0 }
  }

  const key = getIndexNowKey()
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://blejepronen.com'
  let host = 'blejepronen.com'

  try {
    if (!rawSiteUrl.includes('localhost')) {
      host = new URL(rawSiteUrl).host
    }
  } catch {
    host = 'blejepronen.com'
  }

  // Ensure fully qualified URLs starting with https://
  const formattedUrls = urls.map((u) => {
    if (u.startsWith('http://') || u.startsWith('https://')) return u
    const cleanPath = u.startsWith('/') ? u : `/${u}`
    return `https://${host}${cleanPath}`
  })

  // Deduplicate and limit to 10,000 URLs per IndexNow specification
  const uniqueUrls = Array.from(new Set(formattedUrls)).slice(0, 10000)

  try {
    const payload = {
      host,
      key,
      keyLocation: `https://${host}/${key}.txt`,
      urlList: uniqueUrls,
    }

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    })

    const ok = response.status === 200 || response.status === 202
    return { ok, submitted: uniqueUrls.length, status: response.status }
  } catch (error) {
    console.error('[IndexNow] Notification dispatch error:', error)
    return { ok: false, submitted: 0 }
  }
}
