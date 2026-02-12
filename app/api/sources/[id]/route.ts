import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Source from '@/models/Source';

/**
 * DELETE /api/sources/[id]
 * 删除指定的数据源（需要管理员权限）
 * 禁止删除 TFTimes 平台的数据源
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 权限验证
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: '无权限操作' },
        { status: 403 }
      );
    }

    // 2. 连接数据库
    await dbConnect();

    // 3. 查找数据源
    const source = await Source.findById(params.id);

    if (!source) {
      return NextResponse.json(
        { status: 'error', message: '数据源不存在' },
        { status: 404 }
      );
    }

    // 4. 禁止删除 TFTimes
    if (source.platform === 'TFTimes') {
      return NextResponse.json(
        { status: 'error', message: 'TFTimes 是固定数据源，无法删除' },
        { status: 403 }
      );
    }

    // 5. 删除数据源
    await Source.findByIdAndDelete(params.id);

    return NextResponse.json({
      status: 'success',
      message: '数据源删除成功',
      data: {
        id: params.id,
        name: source.name,
        platform: source.platform,
      },
    });
  } catch (error: any) {
    console.error('删除数据源失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '删除数据源失败',
      },
      { status: 500 }
    );
  }
}
