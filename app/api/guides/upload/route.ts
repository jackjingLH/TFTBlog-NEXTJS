import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { writeFile } from 'fs/promises';

/**
 * 上传攻略 ZIP
 * POST /api/guides/upload
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: '无权限操作' },
        { status: 403 }
      );
    }

    // 获取上传的文件
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { status: 'error', message: '未找到文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { status: 'error', message: '只支持 ZIP 文件' },
        { status: 400 }
      );
    }

    // 将文件保存到临时目录
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = path.join(process.cwd(), 'temp', file.name);

    // 确保 temp 目录存在
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await writeFile(tempPath, buffer);

    try {
      // 解压 ZIP 文件
      const zip = new AdmZip(tempPath);
      const zipEntries = zip.getEntries();

      // 查找根文件夹名称
      let rootFolder = '';
      for (const entry of zipEntries) {
        if (entry.isDirectory) {
          const parts = entry.entryName.split('/').filter(Boolean);
          if (parts.length === 1) {
            rootFolder = parts[0];
            break;
          }
        }
      }

      if (!rootFolder) {
        // 如果没有根文件夹，从第一个文件路径提取
        const firstFile = zipEntries.find((e) => !e.isDirectory);
        if (firstFile) {
          rootFolder = firstFile.entryName.split('/')[0];
        }
      }

      if (!rootFolder) {
        throw new Error('ZIP 文件结构不正确，无法识别攻略文件夹');
      }

      // 目标路径
      const guidesPath = path.join(process.cwd(), 'public', 'guides');
      const targetPath = path.join(guidesPath, rootFolder);

      // 检查文件夹是否已存在
      try {
        await fs.access(targetPath);
        return NextResponse.json(
          { status: 'error', message: `攻略 "${rootFolder}" 已存在` },
          { status: 400 }
        );
      } catch {
        // 文件夹不存在，继续
      }

      // 解压到 guides 目录
      zip.extractAllTo(guidesPath, true);

      return NextResponse.json({
        status: 'success',
        message: '上传成功',
        data: { folderName: rootFolder },
      });
    } finally {
      // 删除临时文件
      try {
        await fs.unlink(tempPath);
      } catch (error) {
        console.error('删除临时文件失败:', error);
      }
    }
  } catch (error: any) {
    console.error('上传攻略失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '上传攻略失败',
      },
      { status: 500 }
    );
  }
}
