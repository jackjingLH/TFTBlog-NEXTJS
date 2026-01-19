/**
 * 图片代理 API
 *
 * 用于代理B站等网站的图片，绕过防盗链限制
 *
 * 使用方式:
 * /api/image-proxy?url=https://i0.hdslb.com/bfs/archive/xxx.jpg
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 获取图片URL参数
    const imageUrl = request.nextUrl.searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少 url 参数' },
        { status: 400 }
      );
    }

    // 验证URL格式
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch (error) {
      return NextResponse.json(
        { error: '无效的 URL' },
        { status: 400 }
      );
    }

    // 只允许代理特定域名的图片（安全考虑）
    const allowedDomains = [
      'hdslb.com',           // B站
      'bilibili.com',        // B站
      'i0.hdslb.com',        // B站CDN
      'i1.hdslb.com',        // B站CDN
      'i2.hdslb.com',        // B站CDN
      'youtube.com',         // YouTube
      'ytimg.com',           // YouTube
      'ggpht.com',           // YouTube
    ];

    const isAllowed = allowedDomains.some(domain =>
      url.hostname.includes(domain)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: '不允许代理该域名的图片' },
        { status: 403 }
      );
    }

    // 请求图片
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/', // 伪装成从B站请求
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `图片请求失败: ${response.status}` },
        { status: response.status }
      );
    }

    // 获取图片数据
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // 返回图片，添加缓存头
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 缓存1年
        'Access-Control-Allow-Origin': '*', // 允许跨域
      },
    });
  } catch (error) {
    console.error('[Image Proxy] Error:', error);
    return NextResponse.json(
      { error: '代理图片时发生错误' },
      { status: 500 }
    );
  }
}
