# 🔄 迁移指南 - v1.x 到 v2.0

## 🎉 v2.0 新特性

### 1. **多AI模型支持**
- ✅ Gemini（原有）
- ✅ OpenAI（新增）
- ✅ Claude（新增）

### 2. **代码架构重构**
- ✅ 模块化设计（分层架构）
- ✅ 统一错误处理
- ✅ 专业日志系统（Winston）
- ✅ API 文档（Swagger）

### 3. **安全性增强**
- ✅ CORS 安全策略
- ✅ 请求频率限制
- ✅ 参数验证中间件
- ✅ 非root用户运行（Docker）

### 4. **Docker 优化**
- ✅ 多阶段构建
- ✅ 健康检查
- ✅ 更小的镜像体积

---

## 📋 迁移步骤

### 方式一：全新安装（推荐）

```bash
# 1. 备份旧数据
cp -r data data_backup

# 2. 拉取最新代码
git pull origin main

# 3. 创建 .env 文件
cp .env.example .env
# 编辑 .env 文件，设置你的配置

# 4. 安装新依赖
npm install

# 5. 启动新版本
npm start

# 旧版本仍可通过以下命令运行：
# npm run start:old
```

### 方式二：Docker 部署

```bash
# 1. 停止旧容器
docker-compose down

# 2. 备份数据
docker cp autoceya:/app/data ./data_backup

# 3. 拉取最新镜像
docker-compose pull

# 4. 更新配置（可选）
# 编辑 docker-compose.yml 或 .env

# 5. 启动新容器
docker-compose up -d

# 6. 查看日志
docker-compose logs -f
```

---

## 🔧 配置变更

### 环境变量新增项

```bash
# 日志配置
LOG_LEVEL=info
LOG_COLORIZE=true
LOG_DIR=logs
LOG_RETENTION_DAYS=30

# CORS配置
CORS_ORIGIN=*

# 请求频率限制
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1
```

完整配置请参考 `.env.example`

---

## 🔀 API 变更

### 启动测压接口新增参数

**旧版本：**
```json
{
  "mode": "fixed",
  "rpm": 60,
  "url": "https://api.example.com",
  "modelName": "gemini-pro",
  "apiKey": "your-key"
}
```

**新版本（新增 providerType）：**
```json
{
  "mode": "fixed",
  "rpm": 60,
  "url": "https://api.example.com",
  "modelName": "gemini-pro",
  "apiKey": "your-key",
  "providerType": "gemini"  // ← 新增：必填，可选值: gemini, openai, claude
}
```

### OpenAI 示例

```json
{
  "mode": "fixed",
  "rpm": 60,
  "url": "https://api.openai.com",
  "modelName": "gpt-4",
  "apiKey": "sk-xxx",
  "providerType": "openai",
  "requestType": "non-stream",
  "testPrompt": "Hello, how are you?"
}
```

### Claude 示例

```json
{
  "mode": "fixed",
  "rpm": 60,
  "url": "https://api.anthropic.com",
  "modelName": "claude-3-opus-20240229",
  "apiKey": "sk-ant-xxx",
  "providerType": "claude",
  "requestType": "non-stream",
  "testPrompt": "Hello, how are you?"
}
```

---

## 📊 新增功能

### 1. API 文档

访问 `http://localhost:8998/api-docs` 查看完整的 API 文档（Swagger UI）

### 2. 健康检查

```bash
# 健康检查
curl http://localhost:8998/health

# 系统指标
curl http://localhost:8998/metrics
```

### 3. 结构化日志

日志文件位置：
- `logs/combined.log` - 所有日志
- `logs/error.log` - 错误日志

---

## ⚠️ 注意事项

### 1. 向后兼容性

v2.0 保持了向后兼容，但需要注意：

- **前端需要更新**：添加 AI 提供商选择
- **API 调用需要添加 `providerType` 参数**
- 旧版 `server.js` 仍可使用（`npm run start:old`）

### 2. 数据库兼容

v2.0 使用相同的数据库结构，历史记录完全兼容。

### 3. 配置文件

- 旧配置文件 `config.js` 保留用于向后兼容
- 新代码使用 `src/config/index.js`

---

## 🐛 常见问题

### Q1: 启动后报错找不到模块

**解决方案：**
```bash
# 删除旧依赖
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### Q2: Docker 容器无法启动

**解决方案：**
```bash
# 检查日志
docker-compose logs autoceya

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

### Q3: API 文档无法访问

**解决方案：**

生产环境需要设置环境变量：
```bash
ENABLE_API_DOCS=true
```

### Q4: 日志文件过大

**解决方案：**

日志文件会自动轮转，可以配置保留天数：
```bash
LOG_RETENTION_DAYS=7
```

---

## 📞 获取帮助

如有问题，请：
1. 查看 [README.md](./README.md)
2. 查看 [CHANGELOG.md](./CHANGELOG.md)
3. 提交 [GitHub Issue](https://github.com/bohesocool/autoCeya/issues)

---

## 🎯 性能提升

v2.0 相比 v1.x 的改进：

- 🚀 **代码质量**：模块化架构，易于维护
- 🔒 **安全性**：多层安全防护
- 📊 **可观测性**：完善的日志和监控
- 🐳 **Docker 优化**：镜像体积减小 ~30%
- 📖 **文档完善**：API 文档、健康检查

---

**Happy Upgrading! 🎉**

