import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET() {
  try {
    await dbConnect();
    const mongoose = await import('mongoose');
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    const categories = await db.collection('categories')
      .find({})
      .sort({ order: 1 })
      .toArray();

    return NextResponse.json({
      status: 'success',
      count: categories.length,
      data: categories
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    );
  }
}
