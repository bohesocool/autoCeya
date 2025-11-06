const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const config = require('./src/config');
const log = require('./src/utils/logger');
const setupSwagger = require('./src/swagger');
const stressTestService = require('./src/services/stressTestService');

// 导入中间件
const corsMiddleware = require('./src/middlewares/cors');
const { rateLimitMiddleware } = require('./src/middlewares/rateLimiter');
const { notFound, errorHandler } = require('./src/middlewares/errorHandler');

// 导入路由
const apiRoutes = require('./src/routes');

// 创建应用
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ===================================
// 中间件配置
// ===================================

// CORS
app.use(corsMiddleware);

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求频率限制（仅限制控制面板API，不影响测压功能）
app.use('/api/', rateLimitMiddleware);

// 静态文件服务
app.use(express.static('public'));

// 请求日志
app.use((req, res, next) => {
  log.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// ===================================
// API 路由
// ===================================

app.use('/api', apiRoutes);

// ===================================
// Swagger API 文档
// ===================================

// 默认启用API文档，除非明确禁用
if (process.env.DISABLE_API_DOCS !== 'true') {
  try {
    setupSwagger(app);
    log.info('Swagger API 文档已启用: /api-docs');
  } catch (error) {
    log.error('Swagger初始化失败', { error: error.message });
  }
}

// ===================================
// 页面路由
// ===================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

app.get('/detail', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'detail.html'));
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// 系统信息端点
app.get('/metrics', (req, res) => {
  const state = stressTestService.getState();
  res.json({
    isRunning: state.isRunning,
    totalRequests: state.stats.totalRequests,
    successRate: state.stats.successRate,
    currentRPM: state.currentRPM,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// ===================================
// WebSocket 连接处理
// ===================================

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  log.info('新WebSocket连接', { ip: clientIp });
  
  // 添加客户端到服务
  stressTestService.addClient(ws);
  
  // 发送当前状态
  try {
    ws.send(JSON.stringify({
      type: 'stateUpdate',
      data: stressTestService.getState(),
    }));
  } catch (error) {
    log.error('发送状态失败', { error: error.message });
  }

  // 心跳检测
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.ping();
      } catch (error) {
        log.error('心跳发送失败', { error: error.message });
      }
    } else {
      clearInterval(heartbeatInterval);
    }
  }, config.websocket.heartbeatInterval);

  ws.on('pong', () => {
    // 收到心跳响应
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      log.debug('收到WebSocket消息', { type: data.type });
      
      // 处理客户端消息（如果需要）
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      log.error('解析WebSocket消息失败', { error: error.message });
    }
  });

  ws.on('close', () => {
    clearInterval(heartbeatInterval);
    stressTestService.removeClient(ws);
    log.info('WebSocket连接关闭', { ip: clientIp });
  });

  ws.on('error', (error) => {
    log.error('WebSocket错误', { error: error.message, ip: clientIp });
  });
});

// ===================================
// 错误处理
// ===================================

// 404 处理
app.use(notFound);

// 全局错误处理
app.use(errorHandler);

// ===================================
// 启动服务器
// ===================================

server.listen(config.port, () => {
  log.info(`
╔════════════════════════════════════════════╗
║   自动测压系统 - AutoCeya v2.0             ║
║   AI模型压力测试工具（重构版）              ║
╚════════════════════════════════════════════╝

✓ 服务器运行在: http://localhost:${config.port}
✓ WebSocket: ws://localhost:${config.port}
✓ API文档: http://localhost:${config.port}/api-docs
✓ 健康检查: http://localhost:${config.port}/health
✓ 系统指标: http://localhost:${config.port}/metrics

环境: ${config.nodeEnv}
日志级别: ${config.logging.level}

⚠️  请在 .env 文件中设置 AUTH_SECRET 密钥
  `);
});

// 优雅关闭
function gracefulShutdown(signal) {
  log.info(`收到${signal}信号，准备关闭服务器...`);
  
  // 停止接受新连接
  server.close(() => {
    log.info('HTTP服务器已关闭');
  });
  
  // 关闭所有WebSocket连接
  wss.clients.forEach(client => {
    try {
      client.close();
    } catch (error) {
      log.error('关闭WebSocket连接失败', { error: error.message });
    }
  });
  
  // 关闭WebSocket服务器
  wss.close(() => {
    log.info('WebSocket服务器已关闭');
  });
  
  // 设置超时强制退出（5秒后）
  const forceExitTimer = setTimeout(() => {
    log.warn('强制退出（超时）');
    process.exit(1);
  }, 5000);
  
  // 取消超时引用，允许进程正常退出
  forceExitTimer.unref();
  
  // 立即退出
  setTimeout(() => {
    log.info('服务器已安全关闭');
    process.exit(0);
  }, 1000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  log.error('未捕获的异常', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('未处理的Promise拒绝', { reason, promise });
});

module.exports = { app, server };

