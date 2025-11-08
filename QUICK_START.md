# 🚀 快速开始指南

本文档提供AutoCeya AI压力测试系统的快速部署和使用指南。

## 📦 1分钟快速部署

### 方式一：Docker部署（推荐⭐）

#### 使用docker run命令

```bash
# 一键启动
docker run -d \
  --name autoceya \
  -p 8998:8998 \
  -e AUTH_SECRET=your_password_here \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  bohesocool/autoceya:latest

# 访问系统
# 浏览器打开: http://localhost:8998
```

#### 使用Docker Compose

```bash
# 1. 创建配置文件
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
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
EOF

# 2. 启动服务
docker-compose up -d

# 3. 访问系统
# 浏览器打开: http://localhost:8998
```

### 方式二：本地部署

```bash
# 1. 克隆项目
git clone https://github.com/bohesocool/autoCeya.git
cd autoCeya

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置你的 AUTH_SECRET

# 4. 启动服务
npm start

# 5. 访问系统
# 浏览器打开: http://localhost:8998
```

---

## 🎯 快速使用指南

### 第一步：登录
使用你在 `AUTH_SECRET` 中设置的密码登录系统。

### 第二步：配置测试
1. 选择AI提供商（Gemini/OpenAI/Claude）
2. 填写测试站点URL
3. 填写模型名称
4. 填写API密钥
5. 输入测试语句
6. 选择测压模式（固定/自动）

### 第三步：开始测试
点击"开始测压"按钮，系统会自动开始测试并实时显示数据。

### 第四步：查看结果
- 实时监控测试进度
- 查看详细统计数据
- 查看历史记录

---

## 🔧 环境变量配置

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `AUTH_SECRET` | 登录密钥 | your_secure_password_here | ✅ 是 |
| `PORT` | 服务端口 | 8998 | ❌ 否 |
| `DEFAULT_SUCCESS_THRESHOLD` | 成功率阈值(%) | 80 | ❌ 否 |
| `DEFAULT_MAX_FAILURES` | 最大连续失败次数 | 10 | ❌ 否 |
| `DEFAULT_RESPONSE_TIME_THRESHOLD` | 响应时间阈值(ms) | 150000 | ❌ 否 |

**配置示例：**

```yaml
# docker-compose.yml
environment:
  - AUTH_SECRET=my_strong_password_123
  - PORT=8998
  - DEFAULT_SUCCESS_THRESHOLD=80
  - DEFAULT_MAX_FAILURES=10
  - DEFAULT_RESPONSE_TIME_THRESHOLD=150000
```

---

## 📝 常用命令

### Docker命令

```bash
# 查看运行状态
docker ps

# 查看日志
docker logs -f autoceya

# 查看最近100行日志
docker logs --tail 100 autoceya

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

# 查看服务状态
docker-compose ps
```

### 本地部署命令

```bash
# 启动服务
npm start

# 开发模式（支持热重载）
npm run dev

# 查看日志
tail -f logs/combined.log
tail -f logs/error.log
```

---

## 🔄 版本更新

### Docker部署更新

```bash
# 方法1：使用docker-compose
docker-compose pull && docker-compose up -d

# 方法2：手动更新
docker pull bohesocool/autoceya:latest
docker stop autoceya
docker rm autoceya
docker run -d --name autoceya -p 8998:8998 bohesocool/autoceya:latest
```

### 本地部署更新

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 重启服务
npm start
```

---

## 🎯 版本选择指南

### 生产环境（推荐固定版本）

```yaml
# 使用固定版本号，避免意外更新
image: bohesocool/autoceya:1.0.0
```

### 开发/测试环境

```yaml
# 使用latest，自动获取最新功能
image: bohesocool/autoceya:latest
```

### 查看所有可用版本
访问: https://hub.docker.com/r/bohesocool/autoceya/tags

---

## ❓ 常见问题

### Q1: 如何修改登录密码？

**方法1：修改docker-compose.yml**
```bash
vim docker-compose.yml
# 修改 AUTH_SECRET 的值，然后重启
docker-compose up -d
```

**方法2：使用环境变量文件**
```bash
echo "AUTH_SECRET=new_password" > .env
docker-compose up -d
```

**方法3：本地部署**
```bash
# 编辑 .env 文件
vim .env
# 修改 AUTH_SECRET=your_new_password
# 重启服务
```

### Q2: 端口冲突怎么办？

**Docker部署：**
```bash
# 修改映射端口（将8998改为其他端口）
docker run -d -p 9000:8998 bohesocool/autoceya:latest

# 或在docker-compose.yml中修改
ports:
  - "9000:8998"  # 外部端口:内部端口
```

**本地部署：**
```bash
# 在 .env 文件中修改
PORT=9000
```

### Q3: 如何查看详细日志？

**Docker部署：**
```bash
# 查看实时日志
docker logs -f autoceya

# 查看最近100行
docker logs --tail 100 autoceya

# 使用docker-compose
docker-compose logs -f

# 进入容器查看日志文件
docker exec -it autoceya sh
cat /app/logs/combined.log
```

**本地部署：**
```bash
# 查看日志文件
tail -f logs/combined.log    # 所有日志
tail -f logs/error.log       # 仅错误日志
```

### Q4: 如何备份数据？

```bash
# 备份数据库
docker cp autoceya:/app/data ./data_backup

# 备份日志
docker cp autoceya:/app/logs ./logs_backup

# 完整备份
docker export autoceya > autoceya_backup.tar
```

### Q5: Docker历史记录不显示？

如果遇到Docker部署后历史记录不显示的问题，请确保：

1. **挂载了data目录**（已在上述配置中包含）
```yaml
volumes:
  - ./data:/app/data
  - ./logs:/app/logs
```

2. **检查目录权限**
```bash
# 创建目录并设置权限
mkdir -p data logs
chmod -R 777 data logs
```

3. **重启容器**
```bash
docker-compose down
docker-compose up -d
```

### Q6: 如何清空历史记录？

**通过Web界面：**
1. 登录系统
2. 进入历史记录页面
3. 点击"清空所有记录"按钮

**通过命令行：**
```bash
# Docker部署
docker exec -it autoceya sh
rm -f /app/data/autoceya.db

# 本地部署
rm -f data/autoceya.db
```

### Q7: 如何自定义配置？

编辑 `docker-compose.yml` 或 `.env` 文件：

```yaml
environment:
  - AUTH_SECRET=my_password
  - DEFAULT_SUCCESS_THRESHOLD=85    # 将成功率阈值改为85%
  - DEFAULT_MAX_FAILURES=5          # 将最大失败次数改为5次
  - DEFAULT_RESPONSE_TIME_THRESHOLD=120000  # 响应超时120秒
```

---

## 🔐 安全建议

1. ✅ **务必修改默认密钥** - 使用强密码
2. ✅ **不要提交 .env 文件** - 包含敏感信息
3. ✅ **使用HTTPS** - 生产环境建议配置SSL
4. ✅ **限制访问IP** - 通过防火墙限制访问
5. ✅ **定期更新** - 保持系统和依赖最新
6. ✅ **数据备份** - 定期备份重要数据

---

## 📚 更多资源

- 📖 [README.md](./README.md) - 完整功能介绍和使用说明
- 🌐 [Docker Hub](https://hub.docker.com/r/bohesocool/autoceya) - 镜像仓库
- 📝 [Swagger API文档](http://localhost:8998/api-docs) - 启动后访问

---

## 📞 获取帮助

遇到问题？

1. 查看 [README.md](./README.md) 获取详细文档
2. 检查日志文件排查问题
3. 提交 Issue 到 GitHub 仓库

---

**Happy Testing! 🎉**
