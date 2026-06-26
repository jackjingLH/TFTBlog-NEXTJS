import { NextResponse } from 'next/server';
import { openGuideContentStore } from '@/lib/guide-content-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    const store = await openGuideContentStore();
    const allGuides = await store.listGuides();
    await store.close();

    // Calculate pagination
    const total = allGuides.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedGuides = allGuides.slice(offset, offset + limit);

    // Map to API response format
    const response = paginatedGuides.map(guide => ({
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

    return NextResponse.json({
      guides: response,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Failed to fetch guides:', error);
    return NextResponse.json({ error: 'Failed to fetch guides' }, { status: 500 });
  }
}
