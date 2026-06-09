const http = require('http');

const port = Number(process.env.PORT || 3000);

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>铲什么铲 - 网站更新中</title>
  <meta name="description" content="铲什么铲 TFT 内容站正在重建中。">
  <style>
    :root {
      color-scheme: dark;
      --bg: #0f0f23;
      --panel: #16213e;
      --panel-2: #1e1b4b;
      --text: #ffffff;
      --muted: #b4b4c5;
      --soft: #7e7e8f;
      --primary: #7c3aed;
      --primary-light: #a78bfa;
      --accent: #f43f5e;
      --border: #3730a3;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Arial, Helvetica, sans-serif;
      color: var(--text);
      background:
        linear-gradient(rgba(167, 139, 250, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(167, 139, 250, 0.08) 1px, transparent 1px),
        var(--bg);
      background-size: 44px 44px, 44px 44px, auto;
    }

    .shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header,
    footer {
      border-color: rgba(124, 58, 237, 0.35);
      background: rgba(15, 15, 35, 0.88);
      backdrop-filter: blur(12px);
    }

    header {
      border-bottom: 1px solid rgba(124, 58, 237, 0.35);
    }

    nav,
    .footer-inner,
    .hero {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
    }

    nav {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand {
      font-size: 20px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary-light), var(--primary), var(--accent));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .login {
      min-height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
      border-radius: 8px;
      color: #fff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary), #6d28d9);
      box-shadow: 0 0 12px rgba(124, 58, 237, 0.4);
    }

    main {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 64px 0;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
      gap: 48px;
      align-items: center;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border: 1px solid rgba(167, 139, 250, 0.35);
      border-radius: 999px;
      background: rgba(22, 33, 62, 0.7);
      color: var(--primary-light);
      font-size: 14px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 14px rgba(244, 63, 94, 0.85);
    }

    h1 {
      margin: 28px 0 0;
      font-size: clamp(42px, 7vw, 72px);
      line-height: 1.08;
      letter-spacing: 0;
    }

    .copy {
      max-width: 600px;
      margin: 24px 0 0;
      color: var(--muted);
      font-size: 18px;
      line-height: 1.75;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 36px;
    }

    .button {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 20px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 800;
    }

    .button-primary {
      color: #fff;
      background: var(--primary);
      box-shadow: 0 0 18px rgba(124, 58, 237, 0.35);
    }

    .button-secondary {
      color: var(--muted);
      border: 1px solid rgba(55, 48, 163, 0.75);
    }

    .panel {
      position: relative;
      aspect-ratio: 1;
      width: min(100%, 420px);
      margin: 0 auto;
      border: 1px solid rgba(167, 139, 250, 0.25);
      border-radius: 32px;
      background: rgba(22, 33, 62, 0.78);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      padding: 24px;
    }

    .panel-inner {
      height: 100%;
      border: 1px solid rgba(55, 48, 163, 0.65);
      border-radius: 20px;
      background: rgba(15, 15, 35, 0.82);
      padding: 24px;
    }

    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(55, 48, 163, 0.5);
      color: var(--muted);
      font-size: 14px;
      font-weight: 700;
    }

    .pill {
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(244, 63, 94, 0.15);
      color: var(--accent);
      font-size: 12px;
    }

    .tasks {
      margin-top: 28px;
      display: grid;
      gap: 20px;
    }

    .task-row {
      display: grid;
      gap: 8px;
    }

    .task-meta {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: var(--muted);
      font-size: 14px;
    }

    .bar {
      height: 8px;
      border-radius: 999px;
      background: var(--panel-2);
      overflow: hidden;
    }

    .bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--primary), var(--accent));
    }

    .note {
      position: absolute;
      left: 48px;
      right: 48px;
      bottom: 48px;
      padding: 14px 16px;
      border: 1px solid rgba(167, 139, 250, 0.25);
      border-radius: 12px;
      background: rgba(124, 58, 237, 0.1);
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }

    footer {
      border-top: 1px solid transparent;
    }

    .footer-rule {
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--primary), var(--accent), transparent);
      box-shadow: 0 0 8px rgba(124, 58, 237, 0.3);
    }

    .footer-inner {
      min-height: 92px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: var(--soft);
      font-size: 14px;
    }

    .footer-inner a {
      color: inherit;
      text-decoration: none;
    }

    @media (max-width: 800px) {
      main {
        padding: 40px 0;
      }

      .hero {
        grid-template-columns: 1fr;
      }

      .panel {
        max-width: 360px;
      }

      .note {
        left: 32px;
        right: 32px;
        bottom: 32px;
      }

      .footer-inner {
        flex-direction: column;
        justify-content: center;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <nav>
        <div class="brand">铲什么铲</div>
        <a class="login" href="/login">登录</a>
      </nav>
    </header>

    <main>
      <section class="hero">
        <div>
          <div class="badge"><span class="dot"></span>网站更新中</div>
          <h1>铲什么铲正在重建</h1>
          <p class="copy">我们正在整理新版 TFT 攻略内容、页面结构和后台工具。正式上线后，这里会恢复阵容攻略、版本更新和内容管理能力。</p>
          <div class="actions">
            <a class="button button-primary" href="/login">管理后台</a>
            <a class="button button-secondary" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">备案信息</a>
          </div>
        </div>

        <aside class="panel" aria-label="重建进度">
          <div class="panel-inner">
            <div class="panel-head">
              <span>Release Board</span>
              <span class="pill">Rebuild</span>
            </div>
            <div class="tasks">
              <div class="task-row">
                <div class="task-meta"><span>内容结构</span><span>进行中</span></div>
                <div class="bar"><span style="width:72%"></span></div>
              </div>
              <div class="task-row">
                <div class="task-meta"><span>页面体验</span><span>设计中</span></div>
                <div class="bar"><span style="width:54%"></span></div>
              </div>
              <div class="task-row">
                <div class="task-meta"><span>后台工具</span><span>整理中</span></div>
                <div class="bar"><span style="width:38%"></span></div>
              </div>
            </div>
            <div class="note">新版首页会优先展示可浏览、可搜索、可持续维护的 TFT 攻略内容。</div>
          </div>
        </aside>
      </section>
    </main>

    <footer>
      <div class="footer-rule"></div>
      <div class="footer-inner">
        <span>&copy; ${new Date().getFullYear()} 铲什么铲</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">闽ICP备2026003321号</a>
      </div>
    </footer>
  </div>
</body>
</html>`;

const server = http.createServer((request, response) => {
  if (request.url && request.url.startsWith('/health')) {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('ok');
    return;
  }

  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Maintenance page listening on ${port}`);
});
