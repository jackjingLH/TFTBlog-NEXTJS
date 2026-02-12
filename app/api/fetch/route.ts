import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { spawn } from 'child_process';
import path from 'path';

/**
 * 执行数据抓取脚本
 * GET /api/fetch?platforms=TFTimes,YouTube
 * 返回实时日志流
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: '无权限操作' },
        { status: 403 }
      );
    }

    // 获取平台参数
    const { searchParams } = new URL(request.url);
    const platforms = searchParams.get('platforms'); // 如 "TFTimes,YouTube" 或 null（全部）

    // 创建可读流用于实时传输日志
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // 脚本路径
        const scriptPath = path.join(process.cwd(), 'scripts', 'fetch-all.js');

        // 构建命令参数
        const args = platforms ? [scriptPath, platforms] : [scriptPath];

        // 发送开始消息
        const platformsText = platforms || '全部平台';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', message: `开始执行抓取任务 (${platformsText})...\n` })}\n\n`));

        // 使用 spawn 执行 Node.js 脚本
        const childProcess = spawn('node', args, {
          cwd: process.cwd(),
          env: { ...process.env },
        });

        // 捕获标准输出
        childProcess.stdout.on('data', (data) => {
          const message = data.toString();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', message })}\n\n`));
        });

        // 捕获标准错误
        childProcess.stderr.on('data', (data) => {
          const message = data.toString();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', message })}\n\n`));
        });

        // 进程结束
        childProcess.on('close', (code) => {
          const message = code === 0
            ? '✅ 抓取任务完成！\n'
            : `❌ 抓取任务失败，退出码: ${code}\n`;

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', message, code })}\n\n`));
          controller.close();
        });

        // 进程错误
        childProcess.on('error', (error) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: `执行错误: ${error.message}\n` })}\n\n`));
          controller.close();
        });
      },
    });

    // 返回 SSE 流响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('执行抓取任务失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '执行抓取任务失败',
      },
      { status: 500 }
    );
  }
}
