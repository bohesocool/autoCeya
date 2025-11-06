# 更新日志

## [2.0.0] - 2025-11-07

### 🎉 重大更新

#### 多AI模型支持
- ✅ **Gemini支持**：保持原有完整功能
- ✅ **OpenAI支持**：支持 GPT-3.5、GPT-4 等所有模型
- ✅ **Claude支持**：支持 Claude-3 系列模型
- ✅ **统一接口**：通过 providerType 参数切换不同的AI提供商

#### 代码架构重构
- ✅ **模块化设计**：清晰的分层架构（src/controllers, services, routes, middlewares）
- ✅ **服务层封装**：AIService 支持多模型扩展
- ✅ **控制器分离**：业务逻辑与路由分离
- ✅ **中间件系统**：认证、验证、错误处理、限流等

#### 安全性增强
- ✅ **CORS配置**：可配置的跨域访问控制
- ✅ **请求频率限制**：防止API滥用
- ✅ **参数验证**：严格的输入验证中间件
- ✅ **统一错误处理**：完善的错误捕获机制
- ✅ **非root运行**：Docker 容器安全加固

#### 日志系统升级
- ✅ **Winston日志**：专业的日志管理
- ✅ **分级日志**：error, warn, info, debug
- ✅ **日志轮转**：自动清理旧日志
- ✅ **结构化输出**：便于分析和监控

#### Docker优化
- ✅ **多阶段构建**：减小镜像体积约30%
- ✅ **健康检查**：自动监测容器健康状态
- ✅ **优雅关闭**：正确处理 SIGTERM/SIGINT 信号
- ✅ **安全加固**：使用非root用户运行

#### API文档
- ✅ **Swagger UI**：完整的API文档界面
- ✅ **OpenAPI 3.0**：标准化的API规范
- ✅ **在线测试**：可直接在文档中测试API

#### 监控和运维
- ✅ **健康检查端点**：/health
- ✅ **系统指标端点**：/metrics
- ✅ **完善的日志**：logs/combined.log, logs/error.log

### 📝 API变更

#### 启动测压接口新增参数
```json
{
  "providerType": "gemini|openai|claude"  // 必填：AI提供商类型
}
```

### 📦 新增依赖
- winston: ^3.11.0 - 日志系统
- swagger-jsdoc: ^6.2.8 - API文档生成
- swagger-ui-express: ^5.0.0 - API文档界面

### 📋 新增文件
```
src/
├── config/index.js          # 配置管理
├── controllers/             # 控制器层
│   ├── authController.js
│   ├── testController.js
│   └── historyController.js
├── services/                # 服务层
│   ├── aiService.js         # AI服务（多模型支持）
│   └── stressTestService.js # 测压服务
├── routes/                  # 路由层
│   ├── auth.js
│   ├── test.js
│   ├── history.js
│   └── index.js
├── middlewares/             # 中间件
│   ├── auth.js
│   ├── cors.js
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   └── validator.js
├── utils/                   # 工具类
│   └── logger.js            # 日志工具
└── swagger.js               # Swagger配置
```

### 📚 新增文档
- `.env.example` - 环境变量模板
- `MIGRATION.md` - 迁移指南
- `README-v2.md` - v2.0 使用文档

### ⚠️ 向后兼容
- 保留 `server.js`（旧版）
- 新版使用 `server-new.js`
- 配置文件向后兼容
- 数据库结构不变

### 🔧 配置变更
参考 `.env.example` 获取完整配置列表

---

## [未发布] - 2025-11-05

### ✨ 新增功能

#### 📚 历史测压记录管理系统
- **自动保存测试记录**: 每次测试结束后自动将完整数据保存到SQLite数据库
- **历史记录列表页面**: 
  - 精美的卡片式列表展示
  - 显示测试时间、URL、模型、RPM、成功率等关键信息
  - 支持分页浏览（每页20条）
  - 支持删除单条记录
  - 支持清空所有记录
  - 显示统计汇总（总测试次数、总请求数、平均成功率、总时长）
- **历史记录详情页面**:
  - 完整的测试基本信息展示
  - 统计数据卡片（总请求数、成功率、成功/失败次数、平均响应时间）
  - 交互式趋势曲线图（Chart.js）
  - 错误统计和分类
- **数据持久化**: 使用better-sqlite3本地存储，支持Docker数据卷挂载

#### 📖 文档改进
- README添加docker run单行命令示例
- 更新GitHub仓库链接为正确地址
- 添加历史记录功能完整文档
- 更新API接口说明
- 更新项目结构说明

### 🔧 技术改进
- 新增`database.js`数据库管理模块
- 新增历史记录相关API接口（列表、详情、删除、清空）
- 更新Dockerfile支持SQLite编译
- 更新docker-compose.yml添加数据卷挂载
- 更新.gitignore忽略数据库文件

### 🎨 界面改进
- Dashboard页面添加"历史记录"入口按钮
- 新增`history.html`历史记录列表页面
- 新增`detail.html`历史记录详情页面
- 响应式设计，支持移动端

### 📦 依赖更新
- 新增 better-sqlite3 ^9.2.2

---

## [1.0.0] - 之前版本

### 核心功能
- 双模式测压（固定/自动）
- 智能测试语句模式（固定/随机）
- 配置记忆功能
- 后台持续运行
- 增强的数据可视化
- WebSocket实时通信
- 安全认证机制
