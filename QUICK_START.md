# 🚀 快速开始指南

## 📦 1分钟快速部署

### 使用Docker Hub镜像（推荐）

```bash
# 一键启动
docker run -d \
  --name autoceya \
  -p 8998:8998 \
  -e AUTH_SECRET=your_password_here \
  bohesocool/autoceya:latest

# 访问系统
# 浏览器打开: http://localhost:8998
```

### 使用Docker Compose

```bash
# 创建配置文件
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  autoceya:
    image: bohesocool/autoceya:latest
    container_name: autoceya
    ports:
      - "8998:8998"
    environment:
      - AUTH_SECRET=your_secure_password_here
    restart: unless-stopped
EOF

# 启动服务
docker-compose up -d

# 访问系统
# 浏览器打开: http://localhost:8998
```

---

## 🔄 版本管理速查

### 开发者发布新版本

```bash
# 1. 提交代码
git add .
git commit -m "feat: 新功能"

# 2. 创建版本标签
git tag v1.0.0

# 3. 推送到GitHub
git push origin main
git push origin v1.0.0

# GitHub Actions会自动构建并推送镜像
# 等待5-10分钟后即可使用
```

### 用户更新到最新版本

```bash
# 拉取最新镜像
docker pull bohesocool/autoceya:latest

# 重启容器
docker-compose down
docker-compose up -d

# 或一条命令
docker-compose pull && docker-compose up -d
```

---

## 📝 常用命令

### Docker命令

```bash
# 查看运行状态
docker ps

# 查看日志
docker logs -f autoceya

# 进入容器
docker exec -it autoceya sh

# 重启容器
docker restart autoceya

# 停止容器
docker stop autoceya

# 删除容器
docker rm -f autoceya
```

### Docker Compose命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 更新并重启
docker-compose pull && docker-compose up -d
```

---

## 🎯 版本选择指南

### 生产环境（推荐）

```yaml
# 使用固定版本号，避免意外更新
image: bohesocool/autoceya:1.0.0
```

### 开发环境

```yaml
# 使用latest，自动获取最新功能
image: bohesocool/autoceya:latest
```

### 测试环境

```yaml
# 使用具体版本或SHA，确保可重现
image: bohesocool/autoceya:1.0.0
# 或
image: bohesocool/autoceya:sha-abc1234
```

---

## 🔧 环境变量配置

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `AUTH_SECRET` | 登录密钥 | your_secure_password_here | ✅ 是 |
| `PORT` | 服务端口 | 8998 | ❌ 否 |
| `DEFAULT_SUCCESS_THRESHOLD` | 成功率阈值(%) | 80 | ❌ 否 |
| `DEFAULT_MAX_FAILURES` | 最大连续失败次数 | 10 | ❌ 否 |
| `DEFAULT_RESPONSE_TIME_THRESHOLD` | 响应时间阈值(ms) | 150000 | ❌ 否 |

---

## 📚 相关文档

- 📖 [README.md](./README.md) - 完整功能介绍
- 📝 [CHANGELOG.md](./CHANGELOG.md) - 版本更新记录
- 🚀 [VERSION_RELEASE.md](./VERSION_RELEASE.md) - 版本发布详细指南
- 🐳 [DOCKER.md](./DOCKER.md) - Docker部署详细说明

---

## ❓ 常见问题

### Q: 如何修改登录密码？

```bash
# 方法1: 修改docker-compose.yml
vim docker-compose.yml
# 修改 AUTH_SECRET 的值

# 方法2: 使用环境变量文件
echo "AUTH_SECRET=new_password" > .env
docker-compose up -d
```

### Q: 如何查看容器日志？

```bash
# 查看实时日志
docker logs -f autoceya

# 查看最近100行
docker logs --tail 100 autoceya

# 使用docker-compose
docker-compose logs -f
```

### Q: 端口冲突怎么办？

```bash
# 修改映射端口（将8998改为其他端口）
docker run -d -p 9000:8998 bohesocool/autoceya:latest

# 或在docker-compose.yml中修改
ports:
  - "9000:8998"  # 外部端口:内部端口
```

### Q: 如何备份数据？

```bash
# 备份日志
docker cp autoceya:/app/logs ./logs_backup

# 导出容器
docker export autoceya > autoceya_backup.tar
```

---

**Need Help?** 提交 Issue: https://github.com/your-repo/issues

**Happy Testing! 🎉**

