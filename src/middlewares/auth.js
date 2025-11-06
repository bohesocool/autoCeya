const { AppError } = require('./errorHandler');
const config = require('../config');
const log = require('../utils/logger');

/**
 * 认证中间件
 */
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    log.warn('未提供认证令牌', { ip: req.ip, path: req.path });
    throw new AppError('未提供认证令牌', 401);
  }

  if (token !== config.authSecret) {
    log.warn('认证失败：令牌无效', { ip: req.ip, path: req.path });
    throw new AppError('认证失败：令牌无效', 401);
  }

  next();
};

/**
 * 可选认证中间件（有token则验证，没有token也放行）
 */
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token && token !== config.authSecret) {
    throw new AppError('认证失败：令牌无效', 401);
  }

  req.isAuthenticated = !!token;
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
};

