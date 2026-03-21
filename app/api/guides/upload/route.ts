import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { writeFile } from 'fs/promises';

function getEntryParts(entryName: string) {
  return entryName.replace(/\\/g, '/').split('/').filter(Boolean);
}

function getZipBaseName(fileName: string) {
  return path.basename(fileName, path.extname(fileName)).trim();
}

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
      const fileEntries = zipEntries.filter((entry) => !entry.isDirectory);

      if (fileEntries.length === 0) {
        throw new Error('ZIP 文件为空');
      }

      const firstLevelNames = new Set(
        fileEntries.map((entry) => getEntryParts(entry.entryName)[0]).filter(Boolean)
      );
      const hasRootLevelFiles = fileEntries.some(
        (entry) => getEntryParts(entry.entryName).length === 1
      );

      let rootFolder = '';
      let stripRootFolder = false;

      if (firstLevelNames.size === 1 && !hasRootLevelFiles) {
        rootFolder = [...firstLevelNames][0];
        stripRootFolder = true;
      } else if (!hasRootLevelFiles && firstLevelNames.size > 1) {
        throw new Error('ZIP 文件结构不正确，请将单篇攻略放在一个独立文件夹中后再压缩上传');
      } else {
        rootFolder = getZipBaseName(file.name);
      }

      if (!rootFolder) {
        throw new Error('ZIP 文件结构不正确，无法识别攻略目录名');
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

      await fs.mkdir(targetPath, { recursive: true });

      for (const entry of fileEntries) {
        const entryParts = getEntryParts(entry.entryName);
        const relativeParts = stripRootFolder ? entryParts.slice(1) : entryParts;

        if (relativeParts.length === 0) {
          continue;
        }

        const destinationPath = path.resolve(targetPath, ...relativeParts);
        const resolvedTargetPath = path.resolve(targetPath);

        if (
          destinationPath !== resolvedTargetPath &&
          !destinationPath.startsWith(`${resolvedTargetPath}${path.sep}`)
        ) {
          throw new Error(`ZIP 文件包含非法路径: ${entry.entryName}`);
        }

        await fs.mkdir(path.dirname(destinationPath), { recursive: true });
        await fs.writeFile(destinationPath, entry.getData());
      }

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
