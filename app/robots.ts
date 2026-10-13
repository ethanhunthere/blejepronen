import type { MetadataRoute } from 'next'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://blejepronen.com'

const PRIVATE_PATHS = [
  '/api/',
  '/admin/',
  '/profili/',
  '/mesazhet/',
  '/auth/',
  '/settings/',
  '/cilesimet/',
  '/posto-prona/',
  '/postimet-e-mia/',
  '/completo-profilin/',
  '/completo-profilin-fast/',
  '/completo-profilin-company/',
  '/login/',
  '/register/',
  '/forgot-password/',
  '/reset-password/',
  '/*?*sort=*',
  '/*?*page=*',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      // AI Crawlers and Search Engine Bots
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'Google-Extended',
          'ClaudeBot',
          'Claude-Web',
          'anthropic-ai',
          'PerplexityBot',
          'Applebot-Extended',
          'Bytespider',
          'cohere-ai',
        ],
        allow: [
          '/',
          '/listings',
          '/pronat',
          '/tregu',
          '/en',
          '/kontakti',
          '/kushtet',
          '/privatesia',
          '/llms.txt',
        ],
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/sitemap-index.xml`,
    ],
  }
}
