import type { MetadataRoute } from 'next'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://blejepronen.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/profili',
          '/posto-prona',
          '/postimet-e-mia',
          '/completo-profilin',
          '/completo-profilin-fast',
          '/completo-profilin-company',
          '/api/',
          '/mesazhet',
          '/settings',
          '/cilesimet',
        ],
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
        allow: ['/', '/listings', '/kontakti', '/kushtet', '/privatesia', '/llms.txt'],
        disallow: [
          '/admin',
          '/profili',
          '/posto-prona',
          '/postimet-e-mia',
          '/completo-profilin',
          '/completo-profilin-fast',
          '/completo-profilin-company',
          '/api/',
          '/mesazhet',
          '/settings',
          '/cilesimet',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}

