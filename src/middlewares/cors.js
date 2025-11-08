const cors = require('cors');
const log = require('../utils/logger');

/**
 * CORS 配置
 */
const getCorsOptions = () => {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['*'];

  return {
    origin: (origin, callback) => {
      // 允许所有源
      if (allowedOrigins.includes('*')) {
        callback(null, true);
        return;
      }

      // 允许没有 origin 的请求（如移动应用或 Postman）
      if (!origin) {
        callback(null, true);
        return;
      }

      // 检查是否在白名单中
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        log.warn('CORS阻止的请求', { origin });
        callback(new Error('不允许的跨域请求'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24小时
  };
};

// 创建 CORS 中间件
const corsMiddleware = cors(getCorsOptions());

module.exports = corsMiddleware;


