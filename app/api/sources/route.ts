import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Source from '@/models/Source';

/**
 * GET /api/sources
 * 获取所有数据源或指定平台的数据源
 * 查询参数：
 *   - platform: YouTube | Bilibili | Tacter | TFTimes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    await dbConnect();

    const query: any = {};
    if (platform) {
      query.platform = platform;
    }

    const sources = await Source.find(query)
      .sort({ platform: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      status: 'success',
      count: sources.length,
      data: sources,
    });
  } catch (error: any) {
    console.error('获取数据源失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '获取数据源失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sources
 * 新增数据源（需要管理员权限）
 * 请求体：
 * {
 *   platform: 'YouTube' | 'Bilibili' | 'Tacter' | 'TFTimes',
 *   name: string,
 *   youtube?: { type, id, fans?, description? },
 *   bilibili?: { uid, fans? },
 *   tacter?: { username, description? },
 *   tftimes?: { category }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 权限验证
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: '无权限操作' },
        { status: 403 }
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const { platform, name, youtube, bilibili, tacter, tftimes } = body;

    // 3. 基本验证
    if (!platform || !name) {
      return NextResponse.json(
        { status: 'error', message: '缺少必填字段：platform 和 name' },
        { status: 400 }
      );
    }

    // 4. 平台特定验证
    if (platform === 'YouTube') {
      if (!youtube?.id || !youtube?.type) {
        return NextResponse.json(
          { status: 'error', message: 'YouTube 数据源需要提供 youtube.id 和 youtube.type' },
          { status: 400 }
        );
      }
      if (!['user', 'channel'].includes(youtube.type)) {
        return NextResponse.json(
          { status: 'error', message: 'youtube.type 必须是 user 或 channel' },
          { status: 400 }
        );
      }
    }

    if (platform === 'Bilibili') {
      if (!bilibili?.uid) {
        return NextResponse.json(
          { status: 'error', message: 'B站数据源需要提供 bilibili.uid' },
          { status: 400 }
        );
      }
    }

    if (platform === 'Tacter') {
      if (!tacter?.username) {
        return NextResponse.json(
          { status: 'error', message: 'Tacter 数据源需要提供 tacter.username' },
          { status: 400 }
        );
      }
    }

    if (platform === 'TFTimes') {
      if (!tftimes?.category) {
        return NextResponse.json(
          { status: 'error', message: 'TFTimes 数据源需要提供 tftimes.category' },
          { status: 400 }
        );
      }
    }

    // 5. 连接数据库
    await dbConnect();

    // 6. 检查重复
    let existingQuery: any = {};
    if (platform === 'YouTube' && youtube?.id) {
      existingQuery = { 'youtube.id': youtube.id };
    } else if (platform === 'Bilibili' && bilibili?.uid) {
      existingQuery = { 'bilibili.uid': bilibili.uid };
    } else if (platform === 'Tacter' && tacter?.username) {
      existingQuery = { 'tacter.username': tacter.username };
    } else if (platform === 'TFTimes') {
      existingQuery = { platform: 'TFTimes', name: name };
    }

    if (Object.keys(existingQuery).length > 0) {
      const existing = await Source.findOne(existingQuery);
      if (existing) {
        return NextResponse.json(
          { status: 'error', message: '该数据源已存在' },
          { status: 409 }
        );
      }
    }

    // 7. 创建新数据源
    const newSource = await Source.create({
      platform,
      name,
      enabled: true,
      youtube,
      bilibili,
      tacter,
      tftimes,
    });

    return NextResponse.json(
      {
        status: 'success',
        message: '数据源创建成功',
        data: newSource,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('创建数据源失败:', error);

    // 处理 MongoDB 唯一性约束错误
    if (error.code === 11000) {
      return NextResponse.json(
        { status: 'error', message: '该数据源已存在（唯一性冲突）' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '创建数据源失败',
      },
      { status: 500 }
    );
  }
}
