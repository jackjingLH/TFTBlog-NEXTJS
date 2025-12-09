#!/bin/bash

echo "=== MongoDB进程检查 ==="
ps aux | grep mongod | grep -v grep || echo "MongoDB进程未运行"

echo ""
echo "=== MongoDB端口检查 ==="
netstat -tuln | grep 27017 || echo "端口27017未监听"

echo ""
echo "=== MongoDB日志最后10行 ==="
tail -10 /www/server/mongodb/log/mongodb.log 2>/dev/null || echo "无法读取日志文件"

echo ""
echo "=== 尝试启动MongoDB ==="
mongod --dbpath /www/server/mongodb/data --bind_ip 0.0.0.0 --port 27017 --logpath /www/server/mongodb/log/mongodb.log --fork

echo ""
echo "=== 再次检查进程 ==="
ps aux | grep mongod | grep -v grep || echo "MongoDB进程未运行"
