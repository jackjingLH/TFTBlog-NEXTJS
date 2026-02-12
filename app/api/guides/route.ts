import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * 获取攻略列表
 * GET /api/guides
 */
export async function GET(request: NextRequest) {
  try {
    const guidesPath = path.join(process.cwd(), 'public', 'guides');

    // 读取 guides 目录
    const folders = await fs.readdir(guidesPath);

    // 获取每个文件夹的详细信息
    const guides = await Promise.all(
      folders.map(async (folderName) => {
        const folderPath = path.join(guidesPath, folderName);
        const stats = await fs.stat(folderPath);

        // 只处理文件夹
        if (!stats.isDirectory()) {
          return null;
        }

        // 读取文件夹内容
        const files = await fs.readdir(folderPath);

        // 统计图片数量
        const imageCount = files.filter((file) =>
          /\.(png|jpg|jpeg|gif|webp)$/i.test(file)
        ).length;

        // 查找第一张图片作为封面
        const coverImage = files.find((file) =>
          /\.(png|jpg|jpeg|gif|webp)$/i.test(file)
        );

        // 读取标题（从 TFT.md 文件）
        let title = folderName;
        const mdFile = files.find((file) => file === 'TFT.md');
        if (mdFile) {
          try {
            const mdContent = await fs.readFile(
              path.join(folderPath, mdFile),
              'utf-8'
            );
            // 提取第一个 # 标题
            const match = mdContent.match(/^#\s+(.+)$/m);
            if (match) {
              title = match[1];
            }
          } catch {
            // 读取失败，使用文件夹名
          }
        }

        return {
          id: folderName,
          name: folderName,
          title,
          imageCount,
          coverImage: coverImage ? `/guides/${folderName}/${coverImage}` : null,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
        };
      })
    );

    // 过滤掉 null 值并按更新时间排序
    const validGuides = guides
      .filter((guide) => guide !== null)
      .sort((a, b) => b!.updatedAt.getTime() - a!.updatedAt.getTime());

    return NextResponse.json({
      status: 'success',
      count: validGuides.length,
      data: validGuides,
    });
  } catch (error: any) {
    console.error('获取攻略列表失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '获取攻略列表失败',
      },
      { status: 500 }
    );
  }
}
