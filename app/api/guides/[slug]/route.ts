import { NextResponse } from 'next/server';
import { openGuideContentStore } from '@/lib/guide-content-store';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const store = await openGuideContentStore();
    const guide = await store.findGuideBySlug(params.slug);
    await store.close();

    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    // Map to API response format
    const response = {
      id: guide.id,
      slug: guide.slug,
      title: guide.title,
      excerpt: guide.excerpt,
      contentMarkdown: guide.contentMarkdown,
      coverUrl: guide.coverUrl,
      source: guide.source,
      updatedAt: guide.updatedAt,
      publishedAt: guide.publishedAt,
      readingMinutes: guide.readingMinutes,
      tags: guide.tags,
      status: guide.status,
      createdAt: guide.createdAt,
      modifiedAt: guide.modifiedAt,
    };

    return NextResponse.json({ guide: response });
  } catch (error) {
    console.error('Failed to fetch guide:', error);
    return NextResponse.json({ error: 'Failed to fetch guide' }, { status: 500 });
  }
}
