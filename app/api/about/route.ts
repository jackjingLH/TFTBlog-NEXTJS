import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

/**
 * GET /api/about - 获取关于页面数据
 * @returns 关于页面的详细信息
 */
export async function GET() {
  try {
    // 连接数据库
    const mongoose = await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      return NextResponse.json(
        { status: 'error', message: '数据库连接失败' },
        { status: 500 }
      );
    }

    // 获取关于页面数据
    const aboutCollection = db.collection('about');
    const aboutData = await aboutCollection.findOne({});

    if (!aboutData) {
      return NextResponse.json(
        { status: 'error', message: '未找到关于页面数据' },
        { status: 404 }
      );
    }

    // 返回成功响应
    return NextResponse.json({
      status: 'success',
      data: {
        title: aboutData.title,
        description: aboutData.description,
        content: aboutData.content,
        features: aboutData.features || [],
        stats: aboutData.stats || {},
        updatedAt: aboutData.updatedAt,
      },
    });
  } catch (error) {
    console.error('获取关于页面数据失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: '获取关于页面数据失败',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
