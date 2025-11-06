const log = require('../utils/logger');

/**
 * 统一错误处理中间件
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 错误处理
 */
const notFound = (req, res, next) => {
  // 忽略浏览器自动请求的路径（不记录日志）
  const ignorePaths = [
    '/favicon.ico',
    '/.well-known/',
    '/apple-touch-icon',
    '/browserconfig.xml'
  ];
  
  const shouldIgnore = ignorePaths.some(path => req.originalUrl.includes(path));
  
  if (shouldIgnore) {
    // 直接返回404，不记录日志
    return res.status(404).end();
  }
  
  const error = new AppError(`路径未找到: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // 记录错误日志
  log.error(`错误: ${err.message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    statusCode: err.statusCode || 500,
    stack: err.stack,
  });

  // 默认错误状态码
  const statusCode = err.statusCode || 500;

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      success: false,
      error: err.message,
      stack: err.stack,
      statusCode,
    });
  } else {
    // 生产环境返回简化的错误信息
    if (err.isOperational) {
      res.status(statusCode).json({
        success: false,
        error: err.message,
        statusCode,
      });
    } else {
      // 非操作性错误，返回通用错误信息
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
        statusCode: 500,
      });
    }
  }
};

/**
 * 异步错误捕获包装器
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  notFound,
  errorHandler,
  asyncHandler,
};

