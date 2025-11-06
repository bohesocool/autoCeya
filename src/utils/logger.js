const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // 添加额外的元数据
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    // 如果有错误堆栈，添加到日志中
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// 创建 logger 实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// 在非生产环境下，同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          let log = `${timestamp} ${level}: ${message}`;
          if (stack) {
            log += `\n${stack}`;
          }
          return log;
        })
      ),
    })
  );
} else if (process.env.LOG_COLORIZE === 'true') {
  // 生产环境但启用了彩色输出
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    })
  );
} else {
  // 生产环境普通控制台输出
  logger.add(
    new winston.transports.Console({
      format: logFormat,
    })
  );
}

// 封装常用的日志方法
const log = {
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // 测试相关的日志
  testStart: (config) => {
    logger.info('🚀 开始测压测试', {
      mode: config.mode,
      rpm: config.currentRPM,
      model: config.modelName,
      url: config.url,
    });
  },
  
  testStop: (reason, stats) => {
    logger.info('⏹️ 测试已停止', {
      reason,
      totalRequests: stats.totalRequests,
      successRate: stats.successRate,
    });
  },
  
  apiRequest: (status, responseTime, model) => {
    if (status === 'success') {
      logger.debug('✅ API请求成功', { responseTime, model });
    } else {
      logger.warn('❌ API请求失败', { responseTime, model });
    }
  },
  
  rpmIncrease: (newRPM) => {
    logger.info('⬆️ RPM已增加', { newRPM });
  },
};

module.exports = log;

