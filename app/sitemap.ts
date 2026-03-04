import { MetadataRoute } from 'next'
import { getAllGuides } from '@/lib/guides'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.jingcc.cc'

  let guides: ReturnType<typeof getAllGuides> = []
  try {
    guides = getAllGuides()
  } catch {
    // public/guides 目录不存在或读取失败时，sitemap 仍正常返回基础页面
  }

  const guideUrls: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...guideUrls,
  ]
}
