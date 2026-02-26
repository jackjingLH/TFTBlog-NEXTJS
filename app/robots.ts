import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://47.99.202.3'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/login/', '/welcome/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
