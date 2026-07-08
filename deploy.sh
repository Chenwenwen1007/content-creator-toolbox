#!/bin/bash
# 一键部署脚本 - 阿里云ECS Docker部署

set -e

echo "====================================="
echo "  🚀 内容创作工具箱 - 一键部署"
echo "====================================="
echo ""

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，正在安装..."
    curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker安装完成"
else
    echo "✅ Docker已安装"
fi

# 检查docker compose是否可用
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ docker compose未安装，正在安装..."
    apt install -y docker-compose-plugin || curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose
    COMPOSE_CMD="docker compose"
    echo "✅ docker compose安装完成"
fi

echo ""
echo "✅ 环境检查完成"
echo ""

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，正在从模板复制..."
    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env
        echo "✅ .env文件已创建"
    else
        echo "❌ 找不到.env.production.example模板文件！"
        exit 1
    fi
else
    echo "✅ .env文件已存在"
fi

echo ""
echo "🔨 开始构建并启动服务..."
echo "⏳ 第一次构建可能需要5-15分钟，请耐心等待..."
echo ""

$COMPOSE_CMD down
$COMPOSE_CMD up -d --build

echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 检查容器状态
echo ""
echo "📦 容器状态："
$COMPOSE_CMD ps

echo ""
echo "====================================="
echo "  🎉 部署完成！"
echo "====================================="
echo ""
echo "🌐 访问地址：http://你的服务器IP:18080"
echo "📚 API文档：http://你的服务器IP:18080/docs"
echo ""
echo "📝 常用命令："
echo "  查看日志：$COMPOSE_CMD logs -f"
echo "  停止服务：$COMPOSE_CMD down"
echo "  重启服务：$COMPOSE_CMD restart"
echo "  更新部署：git pull && $COMPOSE_CMD up -d --build"
echo ""
