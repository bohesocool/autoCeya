const log = require('../utils/logger');

/**
 * 简单的内存存储的请求频率限制器
 * 
 * 注意：此限流器仅用于保护控制面板 API（登录、启动测试等），
 * 不会影响测压功能本身发送给 AI 模型的请求。
 * 测压请求在 stressTestService 中直接发送，可以达到几万 RPM。
 */
class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.max || 100;
    this.windowMs = (options.windowMinutes || 1) * 60 * 1000;
    this.requests = new Map();
    
    // 定期清理过期的记录
    setInterval(() => this.cleanup(), this.windowMs);
  }

  /**
   * 检查请求是否超过限制
   */
  check(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // 过滤掉时间窗口之外的请求
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (validRequests.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: validRequests[0] + this.windowMs,
      };
    }
    
    // 记录新请求
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
      resetTime: now + this.windowMs,
    };
  }

  /**
   * 清理过期的记录
   */
  cleanup() {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(
        timestamp => now - timestamp < this.windowMs
      );
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }

  /**
   * 重置某个标识符的限制
   */
  reset(identifier) {
    this.requests.delete(identifier);
  }
}

// 创建全局限流器实例
const limiter = new RateLimiter({
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW) || 1,
});

/**
 * 请求频率限制中间件
 */
const rateLimitMiddleware = (req, res, next) => {
  // 使用 IP 地址作为标识符
  const identifier = req.ip || req.connection.remoteAddress;
  
  const result = limiter.check(identifier);
  
  // 设置响应头
  res.setHeader('X-RateLimit-Limit', limiter.maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  
  if (!result.allowed) {
    log.warn('请求频率超限', {
      ip: identifier,
      path: req.path,
    });
    
    return res.status(429).json({
      success: false,
      error: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    });
  }
  
  next();
};

module.exports = {
  RateLimiter,
  rateLimitMiddleware,
  limiter,
};

