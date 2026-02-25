import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * POST /api/sources/fetch-info
 * 根据平台和ID自动获取用户信息（名称、粉丝数等）
 * 请求体：
 * {
 *   platform: 'Bilibili' | 'Douyin' | 'YouTube' | 'Tacter',
 *   bilibili?: { uid: string },
 *   douyin?: { userId: string },
 *   youtube?: { id: string, type: 'user' | 'channel' },
 *   tacter?: { username: string }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 权限验证
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: '无权限操作' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { platform, bilibili, douyin, youtube, tacter } = body;

    if (!platform) {
      return NextResponse.json(
        { status: 'error', message: '缺少 platform 参数' },
        { status: 400 }
      );
    }

    let userInfo: any = { name: '', fans: '', description: '' };

    // 根据不同平台获取用户信息
    switch (platform) {
      case 'Bilibili':
        if (!bilibili?.uid) {
          return NextResponse.json(
            { status: 'error', message: '缺少 bilibili.uid 参数' },
            { status: 400 }
          );
        }
        userInfo = await fetchBilibiliUserInfo(bilibili.uid);
        break;

      case 'Douyin':
        if (!douyin?.userId) {
          return NextResponse.json(
            { status: 'error', message: '缺少 douyin.userId 参数' },
            { status: 400 }
          );
        }
        userInfo = await fetchDouyinUserInfo(douyin.userId);
        break;

      case 'YouTube':
        if (!youtube?.id) {
          return NextResponse.json(
            { status: 'error', message: '缺少 youtube.id 参数' },
            { status: 400 }
          );
        }
        userInfo = await fetchYouTubeUserInfo(youtube.id, youtube.type || 'user');
        break;

      case 'Tacter':
        if (!tacter?.username) {
          return NextResponse.json(
            { status: 'error', message: '缺少 tacter.username 参数' },
            { status: 400 }
          );
        }
        userInfo = await fetchTacterUserInfo(tacter.username);
        break;

      default:
        return NextResponse.json(
          { status: 'error', message: '不支持的平台' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      status: 'success',
      data: userInfo,
    });
  } catch (error: any) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || '获取用户信息失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 获取 B站 UP主信息（通过 RSSHub）
 */
async function fetchBilibiliUserInfo(uid: string): Promise<any> {
  try {
    // 使用 RSSHub 获取视频列表，从中提取用户信息
    const rsshubUrl = process.env.RSSHUB_URL || 'http://localhost:1200';
    const url = `${rsshubUrl}/bilibili/user/video/${uid}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(30000), // 30秒超时（抖音可能需要更长时间）
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();

    // 检查是否包含风控错误
    if (xmlText.includes('风控校验失败') || xmlText.includes('-352')) {
      throw new Error('B站风控，请稍后重试');
    }

    // 从 RSS 的 channel title 提取 UP主名称
    // 格式通常是: "UP主名称的个人空间" 或 "UP主名称 的视频" 或 "UP主名称 的 bilibili 空间"
    // 先尝试匹配带 CDATA 的格式
    let channelTitleMatch = xmlText.match(/<channel>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    // 如果没匹配到，尝试匹配不带 CDATA 的格式
    if (!channelTitleMatch) {
      channelTitleMatch = xmlText.match(/<channel>[\s\S]*?<title>(.*?)<\/title>/);
    }

    let upName = '';

    if (channelTitleMatch) {
      upName = channelTitleMatch[1]
        .replace(/的个人空间$/, '')
        .replace(/的视频$/, '')
        .replace(/ 的视频$/, '')
        .replace(/ 的 bilibili 空间$/, '')
        .trim();
    }

    // 如果没有提取到名称，使用默认值
    if (!upName) {
      upName = `UP主_${uid}`;
    }

    // 尝试从 RSS 中提取粉丝数（如果有的话）
    const descriptionMatch = xmlText.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
    let fans = '';

    if (descriptionMatch) {
      const desc = descriptionMatch[1];
      // 尝试匹配粉丝数格式: "123万粉丝"
      const fansMatch = desc.match(/([\d.]+万?)粉丝/);
      if (fansMatch) {
        fans = fansMatch[1];
      }
    }

    return {
      name: upName,
      fans,
      description: '',
    };
  } catch (error: any) {
    console.error(`获取 B站用户信息失败 (UID: ${uid}):`, error);
    // 失败时返回默认值
    return {
      name: `UP主_${uid}`,
      fans: '',
      description: '',
    };
  }
}

/**
 * 获取抖音用户信息（通过 RSSHub）
 */
async function fetchDouyinUserInfo(userId: string): Promise<any> {
  try {
    // 使用 RSSHub 获取视频列表，从中提取用户信息
    const rsshubUrl = process.env.RSSHUB_URL || 'http://localhost:1200';
    const url = `${rsshubUrl}/douyin/user/${userId}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(30000), // 30秒超时（抖音可能需要更长时间）
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();

    // 从 RSS 的 channel title 提取用户名称
    // 先尝试匹配带 CDATA 的格式
    let channelTitleMatch = xmlText.match(/<channel>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    // 如果没匹配到，尝试匹配不带 CDATA 的格式
    if (!channelTitleMatch) {
      channelTitleMatch = xmlText.match(/<channel>[\s\S]*?<title>(.*?)<\/title>/);
    }

    let userName = '';

    if (channelTitleMatch) {
      userName = channelTitleMatch[1].trim();
    }

    // 如果没有提取到名称，使用默认值
    if (!userName) {
      userName = `抖音用户_${userId.substring(0, 8)}`;
    }

    return {
      name: userName,
      fans: '',
      description: '',
    };
  } catch (error: any) {
    console.error(`获取抖音用户信息失败 (UserID: ${userId}):`, error);
    // 失败时返回默认值
    return {
      name: `抖音用户_${userId.substring(0, 8)}`,
      fans: '',
      description: '',
    };
  }
}

/**
 * 获取 YouTube 频道信息（通过 RSSHub）
 */
async function fetchYouTubeUserInfo(id: string, type: string): Promise<any> {
  try {
    // 使用 RSSHub 获取视频列表，从中提取频道信息
    const rsshubUrl = process.env.RSSHUB_URL || 'http://localhost:1200';
    // RSSHub 支持两种格式：
    // - /youtube/user/@用户名 或 /youtube/user/用户名
    // - /youtube/channel/频道ID
    const endpoint = type === 'user' ? 'user' : 'channel';
    const cleanId = id.startsWith('@') ? id : (type === 'user' ? `@${id}` : id);
    const url = `${rsshubUrl}/youtube/${endpoint}/${cleanId}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(30000), // 30秒超时
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();

    // 从 RSS 的 channel title 提取频道名称
    // 格式通常是: "频道名称 - YouTube"
    // 先尝试匹配带 CDATA 的格式
    let channelTitleMatch = xmlText.match(/<channel>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    // 如果没匹配到，尝试匹配不带 CDATA 的格式
    if (!channelTitleMatch) {
      channelTitleMatch = xmlText.match(/<channel>[\s\S]*?<title>(.*?)<\/title>/);
    }

    let channelName = '';

    if (channelTitleMatch) {
      channelName = channelTitleMatch[1]
        .replace(/ - YouTube$/, '')
        .trim();
    }

    // 如果没有提取到名称，使用默认值
    if (!channelName) {
      channelName = id.startsWith('@') ? id : `@${id}`;
    }

    return {
      name: channelName,
      fans: '',
      description: '',
    };
  } catch (error: any) {
    console.error(`获取 YouTube 频道信息失败 (ID: ${id}):`, error);
    // 失败时返回默认值
    return {
      name: id.startsWith('@') ? id : `@${id}`,
      fans: '',
      description: '',
    };
  }
}

/**
 * 获取 Tacter 用户信息
 */
async function fetchTacterUserInfo(username: string): Promise<any> {
  try {
    // Tacter 目前没有公开 API，先返回默认值
    return {
      name: username,
      fans: '',
      description: '',
    };
  } catch (error: any) {
    console.error(`获取 Tacter 用户信息失败 (Username: ${username}):`, error);
    return {
      name: username,
      fans: '',
      description: '',
    };
  }
}

/**
 * 格式化数字为易读格式
 */
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

