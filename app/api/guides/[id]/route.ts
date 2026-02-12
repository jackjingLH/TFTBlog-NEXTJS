import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import fs from 'fs/promises';
import path from 'path';

/**
 * 删除攻略
 * DELETE /api/guides/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: '无权限操作' },
        { status: 403 }
      );
    }

    const { id } = params;
    const guidePath = path.join(process.cwd(), 'public', 'guides', id);

    // 检查文件夹是否存在
    try {
      await fs.access(guidePath);
    } catch {
      return NextResponse.json(
        { status: 'error', message: '攻略不存在' },
        { status: 404 }
      );
    }

    // 递归删除文件夹
    await fs.rm(guidePath, { recursive: true, force: true });

    return NextResponse.json({
      status: 'success',
      message: '攻略已删除',
    });
  } catch (error: any) {
    console.error('删除攻略失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '删除攻略失败',
      },
      { status: 500 }
    );
  }
}
