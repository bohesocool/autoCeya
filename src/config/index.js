require('dotenv').config();

module.exports = {
  // 服务器配置
  port: process.env.PORT || 8998,
  authSecret: process.env.AUTH_SECRET || 'change_this_password',
  nodeEnv: process.env.NODE_ENV || 'production',
  
  // 测压配置
  stressTest: {
    // 成功率阈值（低于此值判定为承受不住）
    successThreshold: parseInt(process.env.DEFAULT_SUCCESS_THRESHOLD) || 80,
    
    // 最大连续失败次数
    maxConsecutiveFailures: parseInt(process.env.DEFAULT_MAX_FAILURES) || 10,
    
    // 响应时间阈值（毫秒）
    responseTimeThreshold: parseInt(process.env.DEFAULT_RESPONSE_TIME_THRESHOLD) || 150000,
    
    // 自动模式下RPM增长设置
    autoMode: {
      initialRPM: 10,           // 起始RPM
      incrementRPM: 10,         // 每次增加的RPM
      incrementInterval: 60000, // 增长间隔（毫秒）1分钟
      maxRPM: 1000             // 最大RPM限制
    }
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    colorize: process.env.LOG_COLORIZE === 'true',
    dir: process.env.LOG_DIR || 'logs',
    retentionDays: parseInt(process.env.LOG_RETENTION_DAYS) || 30,
  },
  
  // 安全配置
  security: {
    corsOrigin: process.env.CORS_ORIGIN || '*',
    tokenExpiry: parseInt(process.env.TOKEN_EXPIRY) || 86400,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 1,
  },
  
  // WebSocket 配置
  websocket: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
    heartbeatTimeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT) || 5000,
  },
  
  // 数据库配置
  database: {
    path: process.env.DB_PATH || './data/autoceya.db',
    logging: process.env.DB_LOGGING === 'true',
  },
  
  // 历史记录配置
  history: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
    maxRecords: parseInt(process.env.MAX_HISTORY_RECORDS) || 1000,
  },
};

