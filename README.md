# AutoCeya - AI模型自动测压系统

🚀 一个专业的AI模型（特别是Gemini）RPM承受能力和稳定性测试工具。

## ✨ 功能特性

### 核心功能
- ✅ **双模式测压**
  - 🎯 **固定测压模式**: 设定固定RPM持续测试，支持设置测试时长
  - 📈 **自动测压模式**: 从起始RPM逐步递增，自动找出承受极限
  
- 🎲 **智能测试语句模式**
  - 📝 **固定语句模式**: 使用相同的测试语句
  - 🎲 **随机语句模式**: 自动随机变化测试语句，避免风控检测
  - 支持超大文本输入（最多200,000字符），适合长上下文测试
  
- 💾 **配置记忆功能**（新功能！）
  - ⚡ **自动保存配置**: 启动测试时自动保存所有配置信息
  - 🔄 **自动加载配置**: 重新打开页面时自动恢复上次的配置
  - 📝 **保存的配置包括**: URL、模型名、API密钥、测试语句、RPM设置等
  - 💻 **本地存储**: 配置保存在浏览器localStorage中，无需服务器存储

- 🔄 **后台持续运行**（新功能！）
  - 🌐 **服务器端测压**: 测压任务在服务器后台运行
  - 🚪 **关闭页面不影响**: 即使关闭浏览器，测压任务继续执行
  - 📊 **状态实时同步**: 重新打开页面立即看到当前测试状态
  - 🔌 **WebSocket自动重连**: 断线后自动重新连接并恢复数据显示
  
- 📊 **增强的数据可视化**（新功能！）
  - 📈 **完整历史数据**: 曲线图显示全部测试历史（最多24小时）
  - 🎯 **智能X轴缩放**: 自动调整时间轴密度，适应不同测试时长
  - 🖱️ **交互式图表**: 支持悬停查看详细数据点信息
  - 📉 **实时更新**: 每分钟自动记录并更新统计曲线
  - 🔍 **详细请求日志**: 每个请求的完整记录，支持状态筛选
  
- 🔒 **安全认证**
  - 密钥登录保护
  - Token认证机制
  - 防止未授权访问

- 🎨 **现代化界面**
  - 响应式设计，支持移动端
  - 实时WebSocket数据推送
  - 美观的渐变色UI
  - Chart.js驱动的专业图表展示

### 智能判定系统

系统会自动判定API承受能力极限，判定条件：
1. ✅ **成功率阈值**: 
   - **自动模式**: 基于本分钟成功率低于80%（可配置）
   - **固定模式**: 基于总体成功率低于80%（可配置）
2. ⚠️ **连续失败**: 连续失败10次以上（可配置）
3. ⏱️ **响应超时**: 平均响应时间超过150秒（可配置，适合思考模型）

## 📦 安装部署

### 环境要求
- Node.js 14.x 或更高版本（普通部署）
- Docker 和 Docker Compose（Docker部署，推荐）

### 方式一：Docker部署（推荐）

**最简单快速的部署方式！**

#### 使用Docker Hub镜像（最快捷）

```bash
# 1. 创建docker-compose.yml文件
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

# 2. 启动容器
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 停止服务
docker-compose down
```

#### 或者克隆项目本地构建

1. **克隆项目**
```bash
git clone <your-repo>
cd autoCeya
```

2. **设置环境变量（可选）**

创建 `.env` 文件或直接修改 `docker-compose.yml`：
```env
AUTH_SECRET=your_secure_password_here
```

3. **启动容器**
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

4. **访问系统**

打开浏览器访问: `http://localhost:8998`

#### 使用特定版本

```yaml
# 生产环境推荐使用固定版本号
services:
  autoceya:
    image: bohesocool/autoceya:1.0.0  # 使用特定版本
```

**查看所有可用版本：** https://hub.docker.com/r/bohesocool/autoceya/tags

### 方式二：普通部署

1. **克隆或下载项目**
```bash
cd autoCeya
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

复制 `.env.example` 文件为 `.env`：
```bash
cp .env.example .env
```

编辑 `.env` 文件，设置你的访问密钥：
```env
# 系统登录密钥（请务必修改！）
AUTH_SECRET=your_secure_password_here

# 服务器端口
PORT=8998

# 测压配置
DEFAULT_SUCCESS_THRESHOLD=80
DEFAULT_MAX_FAILURES=10
DEFAULT_RESPONSE_TIME_THRESHOLD=150000
```

4. **启动服务器**
```bash
# 生产模式
npm start

# 开发模式（支持热重载）
npm run dev
```

5. **访问系统**

打开浏览器访问: `http://localhost:8998`

使用你在 `.env` 中设置的 `AUTH_SECRET` 登录

## 🎯 使用指南

### 1. 登录系统
- 使用配置的密钥登录系统
- 登录后会自动跳转到测压控制台
- 如果之前保存过配置，会自动加载

### 2. 配置测试参数

#### 必填参数
- **测试站点URL**: Gemini API的基础URL
- **模型名称**: 例如 `gemini-pro`、`gemini-1.5-flash` 等
- **API密钥**: 你的Gemini API密钥

#### 选择测试语句模式（新功能！）

**📝 固定语句模式**:
- 每次请求使用相同的测试语句
- 支持超大文本输入（最多200,000字符）
- 适合测试长上下文处理能力
- 输入框带实时字符计数

**🎲 随机语句模式**:
- 避免API风控检测
- 可添加多条基础测试语句
- 系统会自动在基础语句上进行随机变化
- 每次请求使用不同的语句变体

#### 选择测压模式

**固定测压模式**:
- 设定一个固定的RPM值
- 系统会持续以该RPM进行测试
- 适合测试特定负载下的稳定性

**自动测压模式**:
- 设定起始RPM（默认10）
- 系统每分钟自动增加10 RPM
- 持续增加直到达到承受极限
- 自动停止并报告最大承受RPM

### 3. 开始测试

点击"🚀 开始测压"按钮启动测试

**重要特性**:
- ✅ 配置会自动保存，下次使用无需重新输入
- ✅ 测试在服务器后台运行，关闭浏览器不影响测试
- ✅ 可以随时关闭页面，稍后回来查看进度

### 4. 监控数据

实时查看:
- 当前RPM和运行状态
- 总请求数统计
- 总体成功率/失败率
- 本分钟实时成功率/失败率
- 平均响应时间
- 完整的历史趋势曲线图（保留全部测试数据）
- 详细的请求日志（每个请求的状态和耗时）
- 错误分类统计
- 最近错误日志

### 5. 关闭页面后重新打开

当你重新打开页面时：
- ✅ 自动加载之前保存的配置
- ✅ 自动连接到后台运行的测试任务
- ✅ 立即显示当前的测试状态和统计数据
- ✅ 显示完整的历史曲线图

### 6. 停止测试

- 手动点击"⏹ 停止测试"按钮
- 或等待自动测压达到极限自动停止
- 或等待固定模式设定的测试时长结束自动停止

## 📊 配置说明

### 服务器配置 (`.env`)

| 参数 | 说明 | 默认值 |
|------|------|--------|
| AUTH_SECRET | 登录密钥 | your_secure_password_here |
| PORT | 服务器端口 | 8998 |
| DEFAULT_SUCCESS_THRESHOLD | 成功率阈值(%) | 80 |
| DEFAULT_MAX_FAILURES | 最大连续失败次数 | 10 |
| DEFAULT_RESPONSE_TIME_THRESHOLD | 响应时间阈值(ms) | 150000 |

### 自动模式配置 (`config.js`)

```javascript
autoMode: {
  initialRPM: 10,           // 起始RPM
  incrementRPM: 10,         // 每次增加的RPM
  incrementInterval: 60000, // 增长间隔（毫秒）
  maxRPM: 1000             // 最大RPM限制
}
```

## 🔧 技术架构

### 后端技术栈
- **Node.js**: 运行环境
- **Express**: Web框架
- **WebSocket (ws)**: 实时通信
- **Axios**: HTTP客户端
- **dotenv**: 环境变量管理

### 前端技术栈
- **原生HTML5/CSS3**: 界面构建
- **原生JavaScript**: 交互逻辑
- **WebSocket API**: 实时数据接收
- **Fetch API**: HTTP请求

### 项目结构
```
autoCeya/
├── server.js              # 主服务器文件
├── config.js              # 配置文件
├── package.json           # 依赖管理
├── .env.example          # 环境变量模板
├── .gitignore            # Git忽略文件
├── README.md             # 项目文档
└── public/               # 前端静态文件
    ├── login.html        # 登录页面
    └── dashboard.html    # 控制面板
```

## 🔄 版本更新

### 更新到最新版本

```bash
# 拉取最新镜像
docker-compose pull

# 重新创建容器
docker-compose up -d
```

### 查看版本历史

查看 [CHANGELOG.md](./CHANGELOG.md) 了解每个版本的更新内容。

### 发布新版本

开发者请查看 [VERSION_RELEASE.md](./VERSION_RELEASE.md) 了解如何发布新版本。

## 🔐 安全建议

1. ✅ **务必修改默认密钥**: 在 `.env` 中设置强密码
2. ✅ **不要提交 .env 文件**: 已在 `.gitignore` 中排除
3. ✅ **使用HTTPS**: 生产环境建议配置SSL证书
4. ✅ **限制访问IP**: 可通过防火墙限制访问来源
5. ✅ **定期更新依赖**: 运行 `npm audit` 检查安全漏洞
6. ✅ **使用固定版本**: 生产环境使用特定版本号而非`latest`

## 📝 API接口说明

### POST /api/login
登录接口
```json
Request: { "password": "your_password" }
Response: { "success": true, "token": "xxx" }
```

### POST /api/start
启动测压
```json
Request: {
  "mode": "fixed|auto",
  "rpm": 60,
  "url": "https://api.example.com",
  "modelName": "gemini-pro",
  "apiKey": "your-api-key",
  "testPrompt": "测试语句"
}
Response: { "success": true, "message": "测试已启动" }
```

### POST /api/stop
停止测压
```json
Response: { "success": true, "message": "测试已停止" }
```

### GET /api/status
获取当前状态
```json
Response: {
  "isRunning": true,
  "mode": "auto",
  "currentRPM": 60,
  "stats": { ... }
}
```

## 🎨 界面预览

- **登录页面**: 简洁优雅的渐变背景登录界面
- **控制台**: 实时数据展示，支持深色/浅色主题
- **数据面板**: 卡片式布局，关键指标一目了然
- **错误监控**: 详细的错误分类和日志记录

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## ⚠️ 免责声明

本工具仅用于测试目的，请勿用于非法用途。使用本工具进行API测试时，请确保：
1. 你有权限测试目标API
2. 遵守API提供商的服务条款
3. 不要对他人的服务造成损害
4. 合理控制测试强度

## 📞 支持

如有问题，请提交Issue或联系维护者。

---

**Enjoy Testing! 🚀**

