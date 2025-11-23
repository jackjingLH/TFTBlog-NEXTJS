import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const mongoose = await import('mongoose');
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const posts = await db.collection('posts')
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('posts').countDocuments();

    return NextResponse.json({
      status: 'success',
      count: posts.length,
      total,
      page,
      pageSize: limit,
      data: posts
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    );
  }
}
