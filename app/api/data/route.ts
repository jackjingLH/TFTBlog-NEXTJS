import { listDataReferences } from '@/lib/data-reference-store.mjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await listDataReferences({
      type: searchParams.get('type'),
      q: searchParams.get('q'),
    });

    return Response.json(body);
  } catch (error) {
    console.error('Failed to fetch data references:', error);
    return Response.json(
      {
        error: 'data_api_error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
