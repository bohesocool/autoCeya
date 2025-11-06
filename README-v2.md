# AutoCeya v2.0 - 多模型AI压力测试系统 🚀

> **重要更新**：v2.0 版本支持 Gemini、OpenAI、Claude 多种 AI 模型！

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/bohesocool/autoCeya)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org)

## ✨ v2.0 新特性

### 🎯 多AI模型支持
- **Gemini** - Google 的 Gemini 系列模型
- **OpenAI** - GPT-3.5、GPT-4 等模型
- **Claude** - Anthropic 的 Claude 系列模型

### 🏗️ 架构重构
- **模块化设计** - 清晰的分层架构（MVC）
- **统一错误处理** - 完善的错误捕获和处理机制
- **专业日志系统** - 基于 Winston 的结构化日志
- **API 文档** - Swagger/OpenAPI 3.0 文档

### 🔒 安全增强
- **CORS 安全策略** - 可配置的跨域访问控制
- **请求频率限制** - 防止滥用和DDoS攻击
- **参数验证** - 严格的输入验证
- **非root运行** - Docker 容器安全加固

### 🐳 Docker 优化
- **多阶段构建** - 减小镜像体积
- **健康检查** - 自动健康监测
- **优雅关闭** - 正确处理信号

---

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 1. 拉取镜像
docker pull bohesocool/autoceya:latest

# 2. 运行容器
docker run -d \
  -p 8998:8998 \
  -e AUTH_SECRET=your_password \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --name autoceya \
  bohesocool/autoceya:latest
```

或使用 docker-compose：

```yaml
version: '3.8'
services:
  autoceya:
    image: bohesocool/autoceya:latest
    container_name: autoceya
    ports:
      - "8998:8998"
    environment:
      - AUTH_SECRET=your_password
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
```

### 本地部署

```bash
# 1. 克隆项目
git clone https://github.com/bohesocool/autoCeya.git
cd autoCeya

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 4. 启动服务
npm start

# 开发模式（支持热重载）
npm run dev
```

---

## 📖 使用指南

### 1. 访问系统

打开浏览器访问：`http://localhost:8998`

### 2. 测试 Gemini 模型

```javascript
{
  "mode": "fixed",
  "rpm": 60,
  "url": "https://generativelanguage.googleapis.com",
  "modelName": "gemini-1.5-flash",
  "apiKey": "your-gemini-key",
  "providerType": "gemini",
  "requestType": "stream",
  "testPrompt": "你好，请介绍一下自己"
}
```

### 3. 测试 OpenAI 模型

```javascript
{
  "mode": "fixed",
  "rpm": 60,
  "url": "https://api.openai.com",
  "modelName": "gpt-4",
  "apiKey": "sk-your-openai-key",
  "providerType": "openai",
  "requestType": "non-stream",
  "testPrompt": "Hello, introduce yourself"
}
```

### 4. 测试 Claude 模型

```javascript
{
  "mode": "fixed",
  "rpm": 60,
  "url": "https://api.anthropic.com",
  "modelName": "claude-3-opus-20240229",
  "apiKey": "sk-ant-your-claude-key",
  "providerType": "claude",
  "requestType": "non-stream",
  "testPrompt": "Hello, introduce yourself"
}
```

---

## 📚 API 文档

访问 `http://localhost:8998/api-docs` 查看完整的 Swagger API 文档。

### 主要端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/login` | POST | 用户登录 |
| `/api/start` | POST | 启动测压 |
| `/api/stop` | POST | 停止测压 |
| `/api/status` | GET | 获取状态 |
| `/api/history` | GET | 历史记录 |
| `/health` | GET | 健康检查 |
| `/metrics` | GET | 系统指标 |

---

## ⚙️ 配置说明

### 环境变量

参考 `.env.example` 文件：

```bash
# 服务器配置
PORT=8998
AUTH_SECRET=your_secure_password
NODE_ENV=production

# 测压配置
DEFAULT_SUCCESS_THRESHOLD=80
DEFAULT_MAX_FAILURES=10
DEFAULT_RESPONSE_TIME_THRESHOLD=150000

# 日志配置
LOG_LEVEL=info
LOG_DIR=logs

# 安全配置
CORS_ORIGIN=*
RATE_LIMIT_MAX=100
```

---

## 🏗️ 项目结构

```
autoCeya/
├── src/
│   ├── config/           # 配置文件
│   ├── controllers/      # 控制器
│   ├── services/         # 业务逻辑
│   │   ├── aiService.js       # AI 服务（支持多模型）
│   │   └── stressTestService.js # 测压服务
│   ├── routes/           # 路由
│   ├── middlewares/      # 中间件
│   │   ├── auth.js           # 认证
│   │   ├── cors.js           # CORS
│   │   ├── errorHandler.js   # 错误处理
│   │   ├── rateLimiter.js    # 频率限制
│   │   └── validator.js      # 参数验证
│   ├── utils/            # 工具函数
│   │   └── logger.js         # 日志系统
│   └── swagger.js        # API 文档配置
├── public/               # 前端文件
├── data/                 # 数据库
├── logs/                 # 日志文件
├── server-new.js         # 新版服务器（v2.0）
├── server.js             # 旧版服务器（兼容）
├── package.json          # 依赖配置
├── Dockerfile            # Docker 配置
└── .env.example          # 环境变量模板
```

---

## 🔄 从 v1.x 迁移

请参考 [MIGRATION.md](./MIGRATION.md) 获取详细的迁移指南。

---

## 🛠️ 开发

### 添加新的 AI 提供商

1. 在 `src/services/aiService.js` 中创建新的服务类：

```javascript
class NewAIService extends AIServiceBase {
  async sendRequest(prompt) {
    // 实现你的 API 调用逻辑
  }
}
```

2. 在工厂方法中注册：

```javascript
static create(providerType, config) {
  switch (providerType.toLowerCase()) {
    case 'newai':
      return new NewAIService(config);
    // ...
  }
}
```

---

## 📊 性能监控

### 健康检查

```bash
curl http://localhost:8998/health
```

### 系统指标

```bash
curl http://localhost:8998/metrics
```

---

## 🐛 故障排查

### 查看日志

```bash
# 应用日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log

# Docker 日志
docker-compose logs -f
```

### 常见问题

请参考 [MIGRATION.md](./MIGRATION.md) 中的常见问题部分。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

[MIT License](LICENSE)

---

## ⚠️ 免责声明

本工具仅用于测试目的，请勿用于非法用途。使用时请遵守：
1. 确保有权限测试目标 API
2. 遵守 API 提供商的服务条款
3. 不要对他人服务造成损害
4. 合理控制测试强度

---

## 📞 联系方式

- GitHub: https://github.com/bohesocool/autoCeya
- Issues: https://github.com/bohesocool/autoCeya/issues

---

**Enjoy Testing! 🚀**

