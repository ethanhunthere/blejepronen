import type { MetadataRoute } from 'next'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://blejepronen.com'

const PRIVATE_PATHS = [
  '/admin',
  '/auth',
  '/api/',
  '/mesazhet',
  '/settings',
  '/cilesimet',
  '/posto-prona',
  '/postimet-e-mia',
  '/completo-profilin',
  '/completo-profilin-fast',
  '/completo-profilin-company',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      // AI Crawlers & LLM Search Agents (OpenAI, Anthropic, Google, Perplexity, Apple)
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
        allow: ['/', '/listings', '/pronat', '/tregu', '/en', '/kontakti', '/kushtet', '/privatesia', '/llms.txt'],
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
