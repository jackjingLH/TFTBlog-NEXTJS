# TFT Blog Next.js 部署指南

本指南介绍如何将项目部署到阿里云 ECS 服务器。

## 前置要求

### 服务器环境
- 阿里云 ECS 服务器（Ubuntu 20.04+ / CentOS 7+）
- Node.js 18+
- MongoDB 数据库
- PM2 进程管理器
- Git

## 部署步骤

### 1. 服务器初始配置

#### 1.1 安装 Node.js
```bash
# 使用 nvm 安装 Node.js（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

#### 1.2 安装 PM2
```bash
npm install -g pm2
```

#### 1.3 安装 MongoDB
```bash
# Ubuntu
sudo apt update
sudo apt install -y mongodb

# 启动 MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### 2. 部署应用

#### 2.1 克隆代码
```bash
# 进入部署目录
cd /var/www

# 克隆仓库
git clone https://github.com/jackjingLH/TFTBlog-NEXTJS.git
cd TFTBlog-NEXTJS
```

#### 2.2 配置环境变量
```bash
# 复制环境变量示例文件
cp .env.production.example .env.production

# 编辑环境变量
nano .env.production
```

修改以下配置：
```
MONGODB_URI=mongodb://localhost:27017/tftblog
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=http://your-server-ip:3000
```

#### 2.3 安装依赖
```bash
npm install
```

#### 2.4 构建项目
```bash
npm run build
```

#### 2.5 启动应用
```bash
# 给部署脚本执行权限
chmod +x deploy.sh

# 首次部署
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置 PM2 开机自启
pm2 startup
```

### 3. 后续更新

当有代码更新时，只需运行部署脚本：

```bash
# 给脚本执行权限（仅首次需要）
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

## 常用命令

### PM2 管理命令
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs tftblog-nextjs

# 实时监控
pm2 monit

# 重启应用
pm2 restart tftblog-nextjs

# 停止应用
pm2 stop tftblog-nextjs

# 删除应用
pm2 delete tftblog-nextjs
```

### 日志查看
```bash
# 查看所有日志
pm2 logs

# 查看错误日志
pm2 logs --err

# 清空日志
pm2 flush
```

## 安全配置

### 4.1 配置防火墙
```bash
# Ubuntu
sudo ufw allow 3000
sudo ufw enable

# CentOS
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 4.2 配置阿里云安全组
1. 登录阿里云控制台
2. 找到 ECS 实例
3. 配置安全组规则
4. 添加入方向规则：允许 3000 端口

## 故障排查

### 应用无法启动
```bash
# 查看错误日志
pm2 logs tftblog-nextjs --err

# 检查端口占用
netstat -tulpn | grep 3000

# 检查 MongoDB 连接
mongo --eval "db.adminCommand('ping')"
```

### 内存不足
```bash
# 查看内存使用
free -h

# 重启应用
pm2 restart tftblog-nextjs
```

## 性能优化

### 启用集群模式
编辑 `ecosystem.config.js`：
```javascript
instances: 'max',  // 使用所有 CPU 核心
exec_mode: 'cluster',
```

### 配置日志轮转
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 访问应用

部署完成后，通过以下地址访问：
- HTTP: `http://your-server-ip:3000`

## 下一步

- 配置域名解析
- 配置 Nginx 反向代理（可选）
- 配置 HTTPS 证书（可选）
- 设置自动备份
