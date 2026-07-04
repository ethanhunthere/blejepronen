import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/profili', '/posto-banese'] }],
    sitemap: 'https://blejebanesen.com/sitemap.xml',
  }
}
