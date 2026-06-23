import { NextResponse } from 'next/server';
import { openGuideContentStore } from '@/lib/guide-content-store';

export async function GET() {
  try {
    const store = await openGuideContentStore();
    const guides = await store.listGuides();
    await store.close();

    // Map to API response format
    const response = guides.map(guide => ({
      slug: guide.slug,
      title: guide.title,
      excerpt: guide.excerpt,
      coverUrl: guide.coverUrl,
      source: guide.source,
      updatedAt: guide.updatedAt,
      publishedAt: guide.publishedAt,
      readingMinutes: guide.readingMinutes,
      tags: guide.tags,
      pinned: guide.pinned,
    }));

    return NextResponse.json({ guides: response });
  } catch (error) {
    console.error('Failed to fetch guides:', error);
    return NextResponse.json({ error: 'Failed to fetch guides' }, { status: 500 });
  }
}
